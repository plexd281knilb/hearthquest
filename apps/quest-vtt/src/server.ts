import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { URL } from "node:url";
import { generateGmCoPilotWhisper } from "@hearthquest/quest-ai-bridge";
import { AgeGroupPreset, HEARTHQUEST_ASSETS, RoomSessionState, RulesTier, getBuildMetadata } from "@hearthquest/shared-types";
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
  updateRoomMapProps,
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
  getVttAccountCount,
  listVttAccountsForAdmin,
  loginOrRegisterGoogleAccount,
  loginVttAccount,
  registerVttAccount,
  setVttAccountRoleByAdmin,
  signRoomGuestToken,
  updateVttAccountPreferences,
  verifyRoomInviteSig,
  verifyVttLicenseKey,
} from "./auth-store";
import {
  createGoogleOAuthStartParams,
  exchangeGoogleAuthorizationCode,
  getGoogleAuthConfig,
  renderGoogleSetupGuideHtml,
  verifyGoogleIdToken,
  verifyGoogleOAuthTransactionCookie,
} from "./google-auth";
import {
  clearTtsAudioCache,
  getPublicTtsConfig,
  probeLocalTtsHealth,
  saveTtsSettings,
  synthesizeSpeechWithFallback,
} from "./tts-engine";
import { renderVttAppHtml, renderVttLoginGateHtml } from "./ui-template";

export {
  activateLicenseOnVttAccount,
  authorizeRoomAccess,
  computeRoomInviteSig,
  createGoogleOAuthStartParams,
  ensureAccountSessionRoom,
  evaluateVttSessionProgressionGate,
  exchangeGoogleAuthorizationCode,
  getGoogleAuthConfig,
  getVttAccountByToken,
  getVttAccountCount,
  listVttAccountsForAdmin,
  loginOrRegisterGoogleAccount,
  loginVttAccount,
  registerVttAccount,
  setVttAccountRoleByAdmin,
  signRoomGuestToken,
  updateVttAccountPreferences,
  verifyGoogleIdToken,
  verifyGoogleOAuthTransactionCookie,
  verifyRoomInviteSig,
  verifyVttLicenseKey,
};

function getRequestOrigin(req: http.IncomingMessage): string {
  const protoHeader = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const proto = protoHeader === "https" ? "https" : "http";
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || `localhost:${PORT}`);
  return `${proto}://${host}`;
}

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

    const googleConfig = getGoogleAuthConfig(getRequestOrigin(req));
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      renderVttLoginGateHtml({
        isFirstAccountSetup: getVttAccountCount() === 0,
        googleConfigured: googleConfig.configured,
        oauthError: parsedUrl.searchParams.get("oauthError") || undefined,
      })
    );
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
        confirmPassword: body.confirmPassword !== undefined ? String(body.confirmPassword) : "",
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

  if (pathname === "/api/auth/google/status" && req.method === "GET") {
    const config = getGoogleAuthConfig(getRequestOrigin(req));
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, ...config, isFirstAccountSetup: getVttAccountCount() === 0 }));
    return;
  }

  if (pathname === "/api/auth/google/start" && req.method === "GET") {
    const origin = getRequestOrigin(req);
    const config = getGoogleAuthConfig(origin);
    if (!config.configured) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(
        renderGoogleSetupGuideHtml({
          config,
          isFirstAccountSetup: getVttAccountCount() === 0,
        })
      );
      return;
    }

    const rulesParam = parsedUrl.searchParams.get("preferredRulesTier") as RulesTier | null;
    const ageParam = parsedUrl.searchParams.get("preferredAgeGroup") as AgeGroupPreset | null;
    const { authUrl, cookieToken } = createGoogleOAuthStartParams({
      requestOrigin: origin,
      preferredRulesTier: rulesParam || undefined,
      preferredAgeGroup: ageParam || undefined,
    });
    res.writeHead(302, {
      Location: authUrl,
      "Set-Cookie": `hq_google_oauth=${encodeURIComponent(cookieToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`,
    });
    res.end();
    return;
  }

  if (pathname === "/api/auth/google/callback" && req.method === "GET") {
    const oauthErr = parsedUrl.searchParams.get("error");
    if (oauthErr) {
      res.writeHead(302, { Location: `/?oauthError=${encodeURIComponent(oauthErr)}` });
      res.end();
      return;
    }
    try {
      const code = parsedUrl.searchParams.get("code") || "";
      const state = parsedUrl.searchParams.get("state") || "";
      if (!code || !state) {
        throw new Error("Missing authorization code or state parameter.");
      }
      const cookieVal = extractCookie(req, "hq_google_oauth");
      const tx = verifyGoogleOAuthTransactionCookie(cookieVal, state);
      const identity = await exchangeGoogleAuthorizationCode({
        code,
        codeVerifier: tx.codeVerifier,
        redirectUri: tx.redirectUri,
        expectedNonce: tx.nonce,
      });
      const { token } = loginOrRegisterGoogleAccount({
        googleSub: identity.sub,
        email: identity.email,
        familyName: identity.name,
        avatarUrl: identity.avatarUrl,
        preferredRulesTier: tx.preferredRulesTier,
        preferredAgeGroup: tx.preferredAgeGroup,
      });
      res.writeHead(302, {
        Location: "/",
        "Set-Cookie": [
          `hq_vtt_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=1209600`,
          "hq_google_oauth=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
        ],
      });
      res.end();
    } catch (err: any) {
      res.writeHead(302, {
        Location: `/?oauthError=${encodeURIComponent(err?.message || "Google sign-in failed")}`,
        "Set-Cookie": "hq_google_oauth=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
      });
      res.end();
    }
    return;
  }

  if (pathname === "/api/auth/google/token" && req.method === "POST") {
    try {
      const body = await readJsonBody(req);
      const identity = await verifyGoogleIdToken({
        idToken: body.idToken || body.credential || "",
      });
      const { account, token, room, isNewAccount } = loginOrRegisterGoogleAccount({
        googleSub: identity.sub,
        email: identity.email,
        familyName: body.familyName || identity.name,
        avatarUrl: identity.avatarUrl,
        preferredRulesTier: body.preferredRulesTier,
        preferredAgeGroup: body.preferredAgeGroup,
      });
      const inviteSig = computeRoomInviteSig(room.roomCode);
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Set-Cookie": `hq_vtt_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=1209600`,
      });
      res.end(JSON.stringify({ ok: true, account, token, room, inviteSig, isNewAccount }));
    } catch (err: any) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: err?.message || "Invalid Google ID token" }));
    }
    return;
  }

  if (pathname === "/api/auth/google/sandbox-login" && req.method === "POST") {
    const config = getGoogleAuthConfig(getRequestOrigin(req));
    if (!config.sandboxAvailable) {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: false,
          error: "Local Google sandbox is disabled because live Google OAuth credentials are configured.",
        })
      );
      return;
    }
    try {
      const body = await readJsonBody(req);
      const email = String(body.email || "").trim().toLowerCase();
      if (!email || !email.includes("@")) {
        throw new Error("Please enter a valid Google email address.");
      }
      const sub = `sandbox_google_${Buffer.from(email, "utf8").toString("hex").slice(0, 24)}`;
      const { account, token, room, isNewAccount } = loginOrRegisterGoogleAccount({
        googleSub: sub,
        email,
        familyName: body.name || email.split("@")[0],
        preferredRulesTier: body.preferredRulesTier,
        preferredAgeGroup: body.preferredAgeGroup,
      });
      const inviteSig = computeRoomInviteSig(room.roomCode);
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Set-Cookie": `hq_vtt_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=1209600`,
      });
      res.end(JSON.stringify({ ok: true, account, token, room, inviteSig, isNewAccount }));
    } catch (err: any) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: err?.message || "Sandbox Google sign-in failed" }));
    }
    return;
  }

  if (pathname === "/api/vtt-admin/accounts" && req.method === "GET") {
    const account = getVttAccountByToken(extractSessionToken(req));
    if (!account) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "Sign in required." }));
      return;
    }
    if (account.role !== "ADMIN") {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "Admin role required." }));
      return;
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        ok: true,
        accounts: listVttAccountsForAdmin(),
        googleConfig: getGoogleAuthConfig(getRequestOrigin(req)),
      })
    );
    return;
  }

  if (pathname === "/api/vtt-admin/accounts/role" && req.method === "POST") {
    const body = await readJsonBody(req);
    const account = getVttAccountByToken(extractSessionToken(req, body));
    if (!account) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "Sign in required." }));
      return;
    }
    if (account.role !== "ADMIN") {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "Admin role required." }));
      return;
    }
    try {
      const nextRole = body.role === "ADMIN" ? "ADMIN" : "USER";
      const updated = setVttAccountRoleByAdmin({
        targetAccountId: String(body.accountId || ""),
        nextRole,
      });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, account: updated }));
    } catch (err: any) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: err?.message || "Role update failed" }));
    }
    return;
  }

  if (pathname === "/api/vtt-admin/send-adventure" && req.method === "POST") {
    const body = await readJsonBody(req);
    const account = getVttAccountByToken(extractSessionToken(req, body));
    if (!account) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "Sign in required." }));
      return;
    }
    if (account.role !== "ADMIN") {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "Creator/Admin role required to send maps or adventures." }));
      return;
    }
    try {
      const targetRoomCode = String(body.targetRoomCode || "")
        .trim()
        .toUpperCase()
        .slice(0, 4);
      if (!targetRoomCode) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "Target user room code is required." }));
        return;
      }
      const mode = String(body.mode || "CAMPAIGN").toUpperCase();
      if (mode === "CAMPAIGN") {
        const room = switchRoomCampaign({
          roomCode: targetRoomCode,
          campaignId: body.campaignId || FAMILY_CAMPAIGNS[0].id,
        });
        broadcastRoomUpdate(room);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            ok: true,
            mode,
            room,
            message: `Dispatched campaign '${room.campaignTitle || room.campaignId}' to Room ${room.roomCode}.`,
          })
        );
        return;
      }
      if (mode === "PROCEDURAL_MAP") {
        const room = regenerateRoomProceduralMap({
          roomCode: targetRoomCode,
          theme: body.theme,
        });
        broadcastRoomUpdate(room);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            ok: true,
            mode,
            room,
            message: `Dispatched new static map layout to Room ${room.roomCode}.`,
          })
        );
        return;
      }
      if (mode === "ONE_SHOT") {
        const generated = generateOneShotInRoom(targetRoomCode);
        broadcastRoomUpdate(generated.room);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            ok: true,
            mode,
            room: generated.room,
            loreEntry: generated.loreEntry,
            partyLevel: generated.partyLevel,
            message: `Dispatched Level ${generated.partyLevel || 1} One-Shot '${generated.loreEntry.title}' to Room ${generated.room.roomCode}.`,
          })
        );
        return;
      }
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "Unsupported dispatch mode." }));
    } catch (err: any) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: err?.message || "Failed to send adventure" }));
    }
    return;
  }

  if (pathname === "/api/tts/status" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, config: getPublicTtsConfig() }));
    return;
  }

  if (pathname === "/api/tts/speak" && req.method === "POST") {
    try {
      const body = await readJsonBody(req);
      const token = extractSessionToken(req, body);
      const guestToken = extractGuestToken(req, body);
      const account = getVttAccountByToken(token);
      if (!account && !guestToken) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "Sign in or join with a valid room invite to stream TTS audio." }));
        return;
      }
      const result = await synthesizeSpeechWithFallback({
        text: String(body.text || ""),
        speakerRole: body.speakerRole,
        modeOverride: body.modeOverride,
      });
      if (!result.fallbackToBrowser && result.audioBuffer) {
        res.writeHead(200, {
          "Content-Type": result.contentType || "audio/mpeg",
          "Cache-Control": "private, max-age=300",
          "X-HearthQuest-TTS-Provider": result.provider,
          "X-HearthQuest-TTS-Cache-Hit": result.cacheHit ? "1" : "0",
        });
        res.end(result.audioBuffer);
        return;
      }
      res.writeHead(200, {
        "Content-Type": "application/json",
        "X-HearthQuest-TTS-Provider": "browser-natural",
      });
      res.end(
        JSON.stringify({
          ok: true,
          provider: "browser-natural",
          fallbackToBrowser: true,
          attemptedProviders: result.attemptedProviders,
          voiceProfile: result.voiceProfile,
          fallbackReason: result.fallbackReason,
        })
      );
    } catch (err: any) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: true,
          provider: "browser-natural",
          fallbackToBrowser: true,
          fallbackReason: err?.message || "Server TTS failed; falling back to browser speech.",
        })
      );
    }
    return;
  }

  if (pathname === "/api/vtt-admin/tts-settings" && req.method === "GET") {
    const token = extractSessionToken(req);
    const account = getVttAccountByToken(token);
    if (!account || account.role !== "ADMIN") {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "Admin role required to inspect TTS configuration." }));
      return;
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, config: getPublicTtsConfig() }));
    return;
  }

  if (pathname === "/api/vtt-admin/tts-settings" && req.method === "POST") {
    try {
      const body = await readJsonBody(req);
      const token = extractSessionToken(req, body);
      const account = getVttAccountByToken(token);
      if (!account || account.role !== "ADMIN") {
        res.writeHead(403, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "Admin role required to modify TTS server settings." }));
        return;
      }
      if (body.action === "TEST_LOCAL") {
        const probe = await probeLocalTtsHealth(body.localTtsUrl);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, probe, config: getPublicTtsConfig() }));
        return;
      }
      if (body.action === "CLEAR_CACHE") {
        const cleared = clearTtsAudioCache();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, cleared, config: getPublicTtsConfig() }));
        return;
      }
      saveTtsSettings({
        preferredMode: body.preferredMode,
        localTtsUrl: body.localTtsUrl,
        localTtsModel: body.localTtsModel,
        cloudProvider: body.cloudProvider,
        cloudApiKey: body.cloudApiKey,
        clearCloudKey: Boolean(body.clearCloudKey),
        cloudModel: body.cloudModel,
        cacheEnabled: typeof body.cacheEnabled === "boolean" ? body.cacheEnabled : undefined,
        narratorSpeed: typeof body.narratorSpeed === "number" ? body.narratorSpeed : undefined,
        roleVoices: body.roleVoices,
      });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, config: getPublicTtsConfig() }));
    } catch (err: any) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: err?.message || "Failed to save TTS settings" }));
    }
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
  let requestAccountForRoomPost: ReturnType<typeof getVttAccountByToken> = null;
  if (pathname.startsWith("/api/room/") && req.method === "POST") {
    authedBody = await readJsonBody(req);
    requestAccountForRoomPost = getVttAccountByToken(extractSessionToken(req, authedBody));
    const auth = authorizeRoomAccess({
      requestedRoomCode: authedBody.roomCode,
      account: requestAccountForRoomPost,
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
    const CREATOR_ONLY_ROOM_POSTS = new Set([
      "/api/room/switch-campaign",
      "/api/room/procedural-map",
      "/api/room/generate-oneshot",
      "/api/room/map-props",
    ]);
    if (CREATOR_ONLY_ROOM_POSTS.has(pathname) && requestAccountForRoomPost?.role !== "ADMIN") {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: false,
          error:
            "Creator/Admin access required — session maps and campaigns are static for players and dispatched by your HearthQuest Creator.",
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

  if (pathname === "/api/room/map-props" && req.method === "POST") {
    const body = authedBody;
    const out = updateRoomMapProps({
      roomCode: body.roomCode,
      action: body.action || "STAMP",
      propKey: body.propKey,
      propId: body.propId,
      gridX: typeof body.gridX === "number" ? body.gridX : undefined,
      gridY: typeof body.gridY === "number" ? body.gridY : undefined,
      rotationDeg: typeof body.rotationDeg === "number" ? body.rotationDeg : undefined,
      groundTileTheme: body.groundTileTheme,
      zoneId: body.zoneId,
    });
    broadcastRoomUpdate(out.room);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, room: out.room, addedProp: out.addedProp }));
    return;
  }

  if (pathname === "/api/room/settings" && req.method === "POST") {
    const body = authedBody;
    const room = updateRoomSettings({
      roomCode: body.roomCode,
      rulesTier: body.rulesTier,
      contentRating: body.contentRating,
      diceInputMode: body.diceInputMode,
      difficulty: body.difficulty,
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
    const isAdmin = requestAccountForRoomPost?.role === "ADMIN";
    const requestedType = body.type || "NPC";
    if (!isAdmin && requestedType !== "HERO") {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: false,
          error: "Users can only add custom tokens for their hero characters.",
        })
      );
      return;
    }
    const room = spawnCustomTokenInRoom({
      roomCode: body.roomCode,
      name: body.name || "Custom Hero Token",
      assetUrl: body.assetUrl || "/assets/tokens/heroes/knight-shield.svg",
      type: requestedType,
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
      enforceTurnMovement:
        typeof body.enforceTurnMovement === "boolean" ? body.enforceTurnMovement : undefined,
      entryId: typeof body.entryId === "string" ? body.entryId : undefined,
      initiative: typeof body.initiative === "number" ? body.initiative : undefined,
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
    const isAdmin = requestAccountForRoomPost?.role === "ADMIN";
    const actorType = body.actorType === "MONSTER" ? "MONSTER" : "HERO";
    if (!isAdmin && actorType !== "HERO") {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: false,
          error:
            "Players can only create or customize tokens for their hero characters. Monster/Boss tokens are created by Admin.",
        })
      );
      return;
    }
    const forged = forgeActorAndTokenInRoom({
      roomCode: body.roomCode,
      actorType,
      targetHeroId: typeof body.targetHeroId === "string" ? body.targetHeroId : undefined,
      customImageDataUrl:
        typeof body.customImageDataUrl === "string" ? body.customImageDataUrl : undefined,
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
