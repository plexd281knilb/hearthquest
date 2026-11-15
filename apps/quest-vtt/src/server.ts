import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { URL } from "node:url";
import { generateGmCoPilotWhisper } from "@hearthquest/quest-ai-bridge";
import { RoomSessionState, getBuildMetadata } from "@hearthquest/shared-types";
import {
  addCustomHeroToRoom,
  advanceRoomStoryNode,
  attemptInteractDoor,
  attemptMoveRoomToken,
  FAMILY_CAMPAIGNS,
  forgeActorAndTokenInRoom,
  generateJoinQrSvg,
  generateOneShotInRoom,
  getCustomTokensDir,
  getOrCreateRoom,
  hasRoomInStore,
  listCustomTokenAssets,
  moveRoomToken,
  openRoomLootChest,
  regenerateRoomProceduralMap,
  spawnCustomTokenInRoom,
  submitHeroSkillRoll,
  submitPlayerActionRoll,
  submitQuickPolyhedralRoll,
  switchRoomCampaign,
  toggleRoomBedtimeFreeze,
  toggleRoomZoneFog,
  triggerRoomRpPrompt,
  updateRoomAtmosphere,
  updateRoomCombat,
  updateRoomLighting,
  updateRoomSettings,
  updateRoomToolsAndWeather,
} from "./room-store";
import {
  activateLicenseOnVttAccount,
  authorizeRoomAccess,
  computeRoomInviteSig,
  ensureAccountSessionRoom,
  evaluateVttSessionProgressionGate,
  getVttAccountByToken,
  loginVttAccount,
  registerVttAccount,
  signRoomGuestToken,
  updateVttAccountPreferences,
  verifyRoomInviteSig,
  verifyVttLicenseKey,
} from "./auth-store";
import { renderVttAppHtml, renderVttLoginGateHtml } from "./ui-template";

export {
  activateLicenseOnVttAccount,
  authorizeRoomAccess,
  computeRoomInviteSig,
  ensureAccountSessionRoom,
  evaluateVttSessionProgressionGate,
  getVttAccountByToken,
  loginVttAccount,
  registerVttAccount,
  signRoomGuestToken,
  updateVttAccountPreferences,
  verifyRoomInviteSig,
  verifyVttLicenseKey,
};

function extractCookie(req: http.IncomingMessage, cookieName: string): string {
  const cookieHeader = String(req.headers.cookie || "");
  for (const part of cookieHeader.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === cookieName) {
      return decodeURIComponent(rest.join("="));
    }
  }
  return "";
}

function extractSessionToken(req: http.IncomingMessage, body?: any): string {
  const authHeader = String(req.headers.authorization || "");
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }
  if (body?.authToken) {
    return String(body.authToken).trim();
  }
  return extractCookie(req, "hq_vtt_session");
}

function extractGuestToken(req: http.IncomingMessage, body?: any, parsedUrl?: URL): string {
  const header = req.headers["x-hearthquest-guest"];
  if (typeof header === "string" && header.trim()) {
    return header.trim();
  }
  if (body?.guestToken) {
    return String(body.guestToken).trim();
  }
  const queryGuest = parsedUrl?.searchParams.get("guest");
  if (queryGuest) {
    return queryGuest.trim();
  }
  return extractCookie(req, "hq_vtt_guest");
}

const PLAYER_ALLOWED_ROOM_POSTS = new Set([
  "/api/room/move-token",
  "/api/room/door-interact",
  "/api/room/skill-roll",
  "/api/room/roll",
  "/api/room/quick-roll",
  "/api/room/open-chest",
  "/api/room/rp-prompt",
  "/api/room/add-hero",
]);

const PORT = Number(process.env.PORT_VTT || process.env.PORT || 3000);

const sseSubscribers = new Map<string, Set<http.ServerResponse>>();

function broadcastRoomUpdate(room: RoomSessionState): void {
  const subs = sseSubscribers.get(room.roomCode);
  if (!subs || subs.size === 0) return;
  const payload = `data: ${JSON.stringify(room)}\n\n`;
  for (const client of subs) {
    try {
      client.write(payload);
    } catch {
      subs.delete(client);
    }
  }
}

function readJsonBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(raw || "{}"));
      } catch (err) {
        reject(err);
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const pathname = parsedUrl.pathname;

  if (pathname === "/" && req.method === "GET") {
    const requestedRoom = (parsedUrl.searchParams.get("room") || "").trim().toUpperCase().slice(0, 4);
    const modeParam = (parsedUrl.searchParams.get("mode") || "").trim().toUpperCase();
    const inviteSig = (parsedUrl.searchParams.get("invite") || "").trim();
    const isInviteMode =
      Boolean(requestedRoom) &&
      (modeParam === "KID" || modeParam === "PLAYER_CONTROLLER" || modeParam === "TV" || modeParam === "TABLE_TV_DISPLAY");

    const account = getVttAccountByToken(extractSessionToken(req));
    const isAccountOwnRoom =
      Boolean(account) &&
      Boolean(requestedRoom) &&
      (requestedRoom === account!.trialRoomCode ||
        (hasRoomInStore(requestedRoom) && getOrCreateRoom(requestedRoom).householdId === account!.id));

    if (
      isInviteMode &&
      hasRoomInStore(requestedRoom) &&
      (isAccountOwnRoom || verifyRoomInviteSig(requestedRoom, inviteSig))
    ) {
      const guestMode =
        modeParam === "TV" || modeParam === "TABLE_TV_DISPLAY"
          ? "TABLE_TV_DISPLAY"
          : "PLAYER_CONTROLLER";
      const guestToken = signRoomGuestToken(requestedRoom, guestMode);
      const room = getOrCreateRoom(requestedRoom);
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Set-Cookie": `hq_vtt_guest=${encodeURIComponent(guestToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`,
      });
      res.end(renderVttAppHtml(room, { guestToken }));
      return;
    }

    if (account) {
      const room = ensureAccountSessionRoom(account);
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(renderVttAppHtml(room));
      return;
    }

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(renderVttLoginGateHtml());
    return;
  }

  if (pathname.startsWith("/assets/") && req.method === "GET") {
    const relativeAsset = pathname.replace(/^\/assets\//, "");
    const safePath = path.normalize(relativeAsset).replace(/^(\.\.[\/\\])+/, "");
    const candidatePaths = [
      path.resolve(__dirname, "..", "..", "..", "assets", safePath),
      path.resolve(process.cwd(), "assets", safePath),
    ];

    for (const filePath of candidatePaths) {
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const contentType =
          ext === ".svg"
            ? "image/svg+xml"
            : ext === ".png"
            ? "image/png"
            : ext === ".jpg" || ext === ".jpeg"
            ? "image/jpeg"
            : ext === ".webp"
            ? "image/webp"
            : "application/octet-stream";
        res.writeHead(200, {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=86400",
        });
        res.end(fs.readFileSync(filePath));
        return;
      }
    }
  }

  if (pathname === "/favicon.svg" && req.method === "GET") {
    const candidatePaths = [
      path.resolve(__dirname, "..", "..", "..", "assets", "hearthquest-icon.svg"),
      path.resolve(process.cwd(), "assets", "hearthquest-icon.svg"),
    ];
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        res.writeHead(200, { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" });
        res.end(fs.readFileSync(p));
        return;
      }
    }
  }

  if ((pathname === "/favicon.ico" || pathname === "/favicon.png") && req.method === "GET") {
    const candidatePaths = [
      path.resolve(__dirname, "..", "..", "..", "assets", "hearthquest-icon.png"),
      path.resolve(process.cwd(), "assets", "hearthquest-icon.png"),
    ];
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        res.writeHead(200, { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" });
        res.end(fs.readFileSync(p));
        return;
      }
    }
  }

  if (pathname.startsWith("/custom-tokens/") && req.method === "GET") {
    const filename = decodeURIComponent(pathname.replace(/^\/custom-tokens\//, ""));
    const safeName = path.basename(filename);
    const customDir = getCustomTokensDir();
    const filePath = path.join(customDir, safeName);
    if (filePath.startsWith(customDir) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType =
        ext === ".svg"
          ? "image/svg+xml"
          : ext === ".png"
          ? "image/png"
          : ext === ".jpg" || ext === ".jpeg"
          ? "image/jpeg"
          : ext === ".webp"
          ? "image/webp"
          : "application/octet-stream";
      res.writeHead(200, { "Content-Type": contentType, "Cache-Control": "public, max-age=3600" });
      res.end(fs.readFileSync(filePath));
      return;
    }
  }

  if (pathname === "/api/custom-tokens" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        ok: true,
        directory: getCustomTokensDir(),
        tokens: listCustomTokenAssets(),
      })
    );
    return;
  }

  if (pathname === "/api/health" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        ok: true,
        service: "quest-vtt",
        build: getBuildMetadata(),
        activeRoomsCount: 1,
      })
    );
    return;
  }

  if (pathname === "/api/room/qr" && req.method === "GET") {
    const requestedRoom = (
      parsedUrl.searchParams.get("room") ||
      parsedUrl.searchParams.get("roomCode") ||
      ""
    )
      .toUpperCase()
      .slice(0, 4);
    const inviteParam = (parsedUrl.searchParams.get("invite") || "").trim();
    const auth = authorizeRoomAccess({
      requestedRoomCode: requestedRoom,
      account: getVttAccountByToken(extractSessionToken(req)),
      guestToken: extractGuestToken(req, undefined, parsedUrl),
      requireGmOwner: false,
    });
    const roomCode = auth.authorized ? auth.resolvedRoomCode : requestedRoom;
    const allowedBySig = Boolean(roomCode) && verifyRoomInviteSig(roomCode, inviteParam);
    if (!auth.authorized && !allowedBySig) {
      res.writeHead(auth.status, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: false,
          error: auth.error || "Sign in required to generate room QR.",
        })
      );
      return;
    }

    const explicitOrigin = (parsedUrl.searchParams.get("origin") || "").trim();
    const forwardedProto = String(req.headers["x-forwarded-proto"] || "")
      .split(",")[0]
      .trim();
    const proto = forwardedProto || "http";
    const hostHeader = String(req.headers.host || `127.0.0.1:${PORT}`).trim();
    const origin =
      explicitOrigin && /^https?:\/\/[^/\s]+$/i.test(explicitOrigin)
        ? explicitOrigin
        : `${proto}://${hostHeader}`;
    const inviteSig = computeRoomInviteSig(roomCode);
    const joinUrl = `${origin}/?room=${roomCode}&mode=kid&invite=${inviteSig}`;
    const svg = generateJoinQrSvg(roomCode, joinUrl);
    res.writeHead(200, {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(svg);
    return;
  }

  if (pathname === "/api/room/stream" && req.method === "GET") {
    const requestedRoom = (parsedUrl.searchParams.get("roomCode") || "")
      .toUpperCase()
      .slice(0, 4);
    const auth = authorizeRoomAccess({
      requestedRoomCode: requestedRoom,
      account: getVttAccountByToken(extractSessionToken(req)),
      guestToken: extractGuestToken(req, undefined, parsedUrl),
      requireGmOwner: false,
    });
    if (!auth.authorized) {
      res.writeHead(auth.status, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: auth.error }));
      return;
    }
    const roomCode = auth.resolvedRoomCode;
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    if (!sseSubscribers.has(roomCode)) {
      sseSubscribers.set(roomCode, new Set());
    }
    sseSubscribers.get(roomCode)!.add(res);

    const room = getOrCreateRoom(roomCode);
    res.write(`data: ${JSON.stringify(room)}\n\n`);

    req.on("close", () => {
      sseSubscribers.get(roomCode)?.delete(res);
    });
    return;
  }

  if (pathname === "/api/auth/me" && req.method === "GET") {
    const account = getVttAccountByToken(extractSessionToken(req));
    const room = account ? ensureAccountSessionRoom(account) : null;
    const inviteSig = room ? computeRoomInviteSig(room.roomCode) : null;
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, account, room, inviteSig }));
    return;
  }

  if (pathname === "/api/auth/register" && req.method === "POST") {
    try {
      const body = await readJsonBody(req);
      const { account, token, room } = registerVttAccount({
        familyName: body.familyName || "Adventuring Family",
        email: body.email || "",
        password: body.password || "",
        preferredRulesTier: body.preferredRulesTier,
        preferredAgeGroup: body.preferredAgeGroup,
      });
      const inviteSig = computeRoomInviteSig(room.roomCode);
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Set-Cookie": `hq_vtt_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=1209600`,
      });
      res.end(JSON.stringify({ ok: true, account, token, room, inviteSig }));
    } catch (err: any) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: err?.message || "Registration failed" }));
    }
    return;
  }

  if (pathname === "/api/auth/login" && req.method === "POST") {
    try {
      const body = await readJsonBody(req);
      const { account, token, room } = loginVttAccount({
        email: body.email || "",
        password: body.password || "",
      });
      const inviteSig = computeRoomInviteSig(room.roomCode);
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Set-Cookie": `hq_vtt_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=1209600`,
      });
      res.end(JSON.stringify({ ok: true, account, token, room, inviteSig }));
    } catch (err: any) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: err?.message || "Invalid login credentials" }));
    }
    return;
  }

  if (pathname === "/api/auth/logout" && req.method === "POST") {
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Set-Cookie": [
        "hq_vtt_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
        "hq_vtt_guest=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
      ],
    });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (pathname === "/api/auth/activate-license" && req.method === "POST") {
    try {
      const body = await readJsonBody(req);
      const token = extractSessionToken(req, body);
      const account = getVttAccountByToken(token);
      if (!account) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "Sign in or create a Demo Account first." }));
        return;
      }
      const updated = activateLicenseOnVttAccount({
        accountId: account.id,
        licenseKey: body.licenseKey || "",
      });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, account: updated }));
    } catch (err: any) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: err?.message || "Activation failed" }));
    }
    return;
  }

  if (pathname === "/api/auth/preferences" && req.method === "POST") {
    try {
      const body = await readJsonBody(req);
      const token = extractSessionToken(req, body);
      const account = getVttAccountByToken(token);
      if (!account) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "Sign in or create an account first." }));
        return;
      }
      const prefAuth = authorizeRoomAccess({
        requestedRoomCode: body.roomCode || account.trialRoomCode,
        account,
        requireGmOwner: true,
      });
      if (!prefAuth.authorized) {
        res.writeHead(prefAuth.status, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: prefAuth.error }));
        return;
      }
      const result = updateVttAccountPreferences({
        accountId: account.id,
        preferredRulesTier: body.preferredRulesTier || account.preferredRulesTier,
        preferredAgeGroup: body.preferredAgeGroup || account.preferredAgeGroup,
        roomCode: prefAuth.resolvedRoomCode,
        regenerateRoom: body.regenerateRoom !== false,
      });
      const inviteSig = computeRoomInviteSig(result.room.roomCode);
      broadcastRoomUpdate(result.room);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: true,
          account: result.account,
          room: result.room,
          inviteSig,
        })
      );
    } catch (err: any) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: false,
          error: err?.message || "Failed to update account preferences",
        })
      );
    }
    return;
  }

  // Enforce authentication & strict per-user room isolation across ALL /api/room/* mutations
  let authedBody: any = null;
  if (pathname.startsWith("/api/room/") && req.method === "POST") {
    authedBody = await readJsonBody(req);
    const auth = authorizeRoomAccess({
      requestedRoomCode: authedBody.roomCode,
      account: getVttAccountByToken(extractSessionToken(req, authedBody)),
      guestToken: extractGuestToken(req, authedBody, parsedUrl),
      requireGmOwner: !PLAYER_ALLOWED_ROOM_POSTS.has(pathname),
    });
    if (!auth.authorized) {
      res.writeHead(auth.status, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: false,
          authRequired: auth.status === 401,
          error: auth.error,
        })
      );
      return;
    }
    authedBody.roomCode = auth.resolvedRoomCode;
  }

  if (pathname === "/api/room/move-token" && req.method === "POST") {
    const body = authedBody;
    const result = attemptMoveRoomToken({
      roomCode: body.roomCode,
      tokenId: body.tokenId,
      deltaX: body.deltaX,
      deltaY: body.deltaY,
      targetX: body.targetX,
      targetY: body.targetY,
      ignoreWalls: Boolean(body.ignoreWalls),
    });
    if (result.moved) {
      broadcastRoomUpdate(result.room);
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        ok: result.moved,
        moved: result.moved,
        blockedMessage: result.blockedMessage,
        blockedByWallId: result.blockedByWallId,
        blockedByDoorId: result.blockedByDoorId,
        isLockedDoor: result.isLockedDoor,
        room: result.room,
      })
    );
    return;
  }

  if ((pathname === "/api/room/toggle-zone" || pathname === "/api/room/zone-fog") && req.method === "POST") {
    const body = authedBody;
    const room = toggleRoomZoneFog({
      roomCode: body.roomCode,
      zoneId: body.zoneId,
    });
    broadcastRoomUpdate(room);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, room }));
    return;
  }

  if (pathname === "/api/room/rp-prompt" && req.method === "POST") {
    const body = authedBody;
    const room = triggerRoomRpPrompt({
      roomCode: body.roomCode,
      promptId: body.promptId,
      dismiss: Boolean(body.dismiss),
      playerReply: body.playerReply,
    });
    broadcastRoomUpdate(room);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, room }));
    return;
  }

  if ((pathname === "/api/room/advance-story" || pathname === "/api/room/story-branch") && req.method === "POST") {
    const body = authedBody;
    const roomCode = body.roomCode;
    const existingRoom = getOrCreateRoom(roomCode);
    const account = getVttAccountByToken(extractSessionToken(req, body));
    const gate = evaluateVttSessionProgressionGate({
      room: existingRoom,
      targetNodeId: body.targetNodeId,
      account,
      overrideLicenseKey: body.licenseKey,
    });
    if (!gate.allowed) {
      res.writeHead(402, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: false,
          paywallRequired: true,
          activeTier: gate.activeTier,
          error: gate.reason,
        })
      );
      return;
    }
    const room = advanceRoomStoryNode({
      roomCode,
      targetNodeId: body.targetNodeId,
      consequenceTag: body.consequenceTag,
    });
    broadcastRoomUpdate(room);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, room }));
    return;
  }

  if (pathname === "/api/room/settings" && req.method === "POST") {
    const body = authedBody;
    const room = updateRoomSettings({
      roomCode: body.roomCode,
      rulesTier: body.rulesTier,
      contentRating: body.contentRating,
      diceInputMode: body.diceInputMode,
    });
    broadcastRoomUpdate(room);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, room }));
    return;
  }

  if (pathname === "/api/room/lighting" && req.method === "POST") {
    const body = authedBody;
    const room = updateRoomLighting({
      roomCode: body.roomCode,
      ambientLightMode: body.ambientLightMode,
      toggleDoorId: body.toggleDoorId,
      toggleLockDoorId: body.toggleLockDoorId,
      lockDc: typeof body.lockDc === "number" ? body.lockDc : undefined,
    });
    broadcastRoomUpdate(room);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, room }));
    return;
  }

  if (pathname === "/api/room/door-interact" && req.method === "POST") {
    const body = authedBody;
    const result = attemptInteractDoor({
      roomCode: body.roomCode,
      doorId: body.doorId,
      characterId: body.characterId,
      rawRollOverride:
        typeof body.rawRollOverride === "number" ? body.rawRollOverride : undefined,
    });
    broadcastRoomUpdate(result.room);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, ...result }));
    return;
  }

  if (pathname === "/api/room/tools" && req.method === "POST") {
    const body = authedBody;
    const room = updateRoomToolsAndWeather({
      roomCode: body.roomCode,
      ambientWeather: body.ambientWeather,
      addTemplate: body.addTemplate,
      clearTemplates: Boolean(body.clearTemplates),
    });
    broadcastRoomUpdate(room);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, room }));
    return;
  }

  if (pathname === "/api/room/spawn-custom-token" && req.method === "POST") {
    const body = authedBody;
    const room = spawnCustomTokenInRoom({
      roomCode: body.roomCode,
      name: body.name || "Custom Token",
      assetUrl: body.assetUrl || "/assets/tokens/heroes/knight-shield.svg",
      type: body.type || "NPC",
      gridX: body.gridX,
      gridY: body.gridY,
    });
    broadcastRoomUpdate(room);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, room }));
    return;
  }

  if (pathname === "/api/room/combat" && req.method === "POST") {
    const body = authedBody;
    const room = updateRoomCombat({
      roomCode: body.roomCode,
      action: body.action || "ROLL_INITIATIVE",
    });
    broadcastRoomUpdate(room);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, room }));
    return;
  }

  if (pathname === "/api/room/skill-roll" && req.method === "POST") {
    const body = authedBody;
    const result = submitHeroSkillRoll({
      roomCode: body.roomCode,
      characterId: body.characterId,
      skillId: body.skillId || "perception",
    });
    broadcastRoomUpdate(result.room);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, roll: result.roll, room: result.room }));
    return;
  }

  if (pathname === "/api/room/atmosphere" && req.method === "POST") {
    const body = authedBody;
    const room = updateRoomAtmosphere({
      roomCode: body.roomCode,
      ambientSoundscape: body.ambientSoundscape,
      sceneBackdrop: body.sceneBackdrop,
    });
    broadcastRoomUpdate(room);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, room }));
    return;
  }

  if (pathname === "/api/room/forge-actor" && req.method === "POST") {
    const body = authedBody;
    const forged = forgeActorAndTokenInRoom({
      roomCode: body.roomCode,
      actorType: body.actorType === "MONSTER" ? "MONSTER" : "HERO",
      name: body.name || "Forged Actor",
      archetype: body.archetype,
      bezelStyle: body.bezelStyle,
      emblem: body.emblem,
      primaryColor: body.primaryColor,
      accentColor: body.accentColor,
      hp: body.hp,
      armorClass: body.armorClass,
      lightRadius: body.lightRadius,
      gridX: body.gridX,
      gridY: body.gridY,
      str: body.str,
      dex: body.dex,
      con: body.con,
      int: body.int,
      wis: body.wis,
      cha: body.cha,
      proficientSkills: body.proficientSkills,
    });
    broadcastRoomUpdate(forged.room);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        ok: true,
        tokenAssetUrl: forged.tokenAssetUrl,
        room: forged.room,
      })
    );
    return;
  }

  if (pathname === "/api/room/roll" && req.method === "POST") {
    const body = authedBody;
    const { room, roll } = submitPlayerActionRoll({
      roomCode: body.roomCode,
      characterId: body.characterId,
      cardId: body.cardId,
      source: body.source || "DIGITAL_3D_ROLLER",
      physicalRollValue: body.physicalRollValue,
    });
    broadcastRoomUpdate(room);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, room, roll }));
    return;
  }

  if (pathname === "/api/room/quick-roll" && req.method === "POST") {
    const body = authedBody;
    const { room, roll } = submitQuickPolyhedralRoll({
      roomCode: body.roomCode,
      dieType: body.dieType || "d20",
      characterId: body.characterId,
    });
    broadcastRoomUpdate(room);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, room, roll }));
    return;
  }

  if (pathname === "/api/room/bedtime" && req.method === "POST") {
    const body = authedBody;
    const room = toggleRoomBedtimeFreeze(body.roomCode);
    broadcastRoomUpdate(room);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, room }));
    return;
  }

  if (pathname === "/api/room/add-hero" && req.method === "POST") {
    const body = authedBody;
    const room = addCustomHeroToRoom({
      roomCode: body.roomCode,
      name: body.name,
      playerName: body.playerName,
      playerAge: body.playerAge,
      archetype: body.archetype,
      companionPet: body.companionPet,
      avatarEmoji: body.avatarEmoji,
    });
    broadcastRoomUpdate(room);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, room }));
    return;
  }

  if (pathname === "/api/room/copilot" && req.method === "POST") {
    const body = authedBody;
    const room = getOrCreateRoom(body.roomCode);
    const whisper = await generateGmCoPilotWhisper({
      question: body.question || "What happens next?",
      session: room,
    });
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, room, whisper }));
    return;
  }

  if (pathname === "/api/room/switch-campaign" && req.method === "POST") {
    const body = authedBody;
    const room = switchRoomCampaign({
      roomCode: body.roomCode,
      campaignId: body.campaignId || FAMILY_CAMPAIGNS[0].id,
    });
    broadcastRoomUpdate(room);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, room, campaigns: FAMILY_CAMPAIGNS }));
    return;
  }

  if (pathname === "/api/room/procedural-map" && req.method === "POST") {
    const body = authedBody;
    const room = regenerateRoomProceduralMap({
      roomCode: body.roomCode,
      theme: body.theme,
    });
    broadcastRoomUpdate(room);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, room }));
    return;
  }

  if (pathname === "/api/room/generate-oneshot" && req.method === "POST") {
    const body = authedBody;
    const generated = generateOneShotInRoom(body.roomCode);
    broadcastRoomUpdate(generated.room);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        ok: true,
        room: generated.room,
        loreEntry: generated.loreEntry,
        partyLevel: generated.partyLevel,
      })
    );
    return;
  }

  if (pathname === "/api/room/open-chest" && req.method === "POST") {
    const body = authedBody;
    const { room, rewardedItem } = openRoomLootChest({
      roomCode: body.roomCode,
      tokenId: body.tokenId,
      characterId: body.characterId,
    });
    broadcastRoomUpdate(room);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, room, rewardedItem }));
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: false, error: "Route not found" }));
});

if (process.env.NODE_ENV !== "test") {
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[quest-vtt] Family Tabletop Server listening on http://0.0.0.0:${PORT}`);
  });
}

export { server };
