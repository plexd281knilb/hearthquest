import http from "node:http";
import { URL } from "node:url";
import { generateGmCoPilotWhisper } from "@hearthquest/quest-ai-bridge";
import { RoomSessionState, getBuildMetadata } from "@hearthquest/shared-types";
import {
  addCustomHeroToRoom,
  advanceRoomStoryNode,
  FAMILY_CAMPAIGNS,
  generateJoinQrSvg,
  getOrCreateRoom,
  moveRoomToken,
  regenerateRoomProceduralMap,
  submitPlayerActionRoll,
  switchRoomCampaign,
  toggleRoomBedtimeFreeze,
  toggleRoomZoneFog,
  updateRoomSettings,
} from "./room-store";
import { renderVttAppHtml } from "./ui-template";

const PORT = Number(process.env.PORT || 3000);

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
    const roomCode = parsedUrl.searchParams.get("room") || "DRGN";
    const room = getOrCreateRoom(roomCode);
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(renderVttAppHtml(room));
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
    const roomCode = (
      parsedUrl.searchParams.get("room") ||
      parsedUrl.searchParams.get("roomCode") ||
      "DRGN"
    ).toUpperCase();
    const joinUrl = `/?room=${roomCode}&mode=kid`;
    const svg = generateJoinQrSvg(roomCode, joinUrl);
    res.writeHead(200, { "Content-Type": "image/svg+xml; charset=utf-8" });
    res.end(svg);
    return;
  }

  if (pathname === "/api/room/stream" && req.method === "GET") {
    const roomCode = (parsedUrl.searchParams.get("roomCode") || "DRGN").toUpperCase();
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

  if (pathname === "/api/room/move-token" && req.method === "POST") {
    const body = await readJsonBody(req);
    const room = moveRoomToken({
      roomCode: body.roomCode || "DRGN",
      tokenId: body.tokenId,
      deltaX: body.deltaX,
      deltaY: body.deltaY,
      targetX: body.targetX,
      targetY: body.targetY,
    });
    broadcastRoomUpdate(room);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, room }));
    return;
  }

  if (pathname === "/api/room/toggle-zone" && req.method === "POST") {
    const body = await readJsonBody(req);
    const room = toggleRoomZoneFog({
      roomCode: body.roomCode || "DRGN",
      zoneId: body.zoneId,
    });
    broadcastRoomUpdate(room);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, room }));
    return;
  }

  if (pathname === "/api/room/advance-story" && req.method === "POST") {
    const body = await readJsonBody(req);
    const room = advanceRoomStoryNode({
      roomCode: body.roomCode || "DRGN",
      targetNodeId: body.targetNodeId,
      consequenceTag: body.consequenceTag,
    });
    broadcastRoomUpdate(room);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, room }));
    return;
  }

  if (pathname === "/api/room/settings" && req.method === "POST") {
    const body = await readJsonBody(req);
    const room = updateRoomSettings({
      roomCode: body.roomCode || "DRGN",
      rulesTier: body.rulesTier,
      contentRating: body.contentRating,
      diceInputMode: body.diceInputMode,
    });
    broadcastRoomUpdate(room);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, room }));
    return;
  }

  if (pathname === "/api/room/roll" && req.method === "POST") {
    const body = await readJsonBody(req);
    const { room, roll } = submitPlayerActionRoll({
      roomCode: body.roomCode || "DRGN",
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

  if (pathname === "/api/room/bedtime" && req.method === "POST") {
    const body = await readJsonBody(req);
    const room = toggleRoomBedtimeFreeze(body.roomCode || "DRGN");
    broadcastRoomUpdate(room);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, room }));
    return;
  }

  if (pathname === "/api/room/add-hero" && req.method === "POST") {
    const body = await readJsonBody(req);
    const room = addCustomHeroToRoom({
      roomCode: body.roomCode || "DRGN",
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
    const body = await readJsonBody(req);
    const room = getOrCreateRoom(body.roomCode || "DRGN");
    const whisper = await generateGmCoPilotWhisper({
      question: body.question || "What happens next?",
      session: room,
    });
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, room, whisper }));
    return;
  }

  if (pathname === "/api/room/switch-campaign" && req.method === "POST") {
    const body = await readJsonBody(req);
    const room = switchRoomCampaign({
      roomCode: body.roomCode || "DRGN",
      campaignId: body.campaignId || FAMILY_CAMPAIGNS[0].id,
    });
    broadcastRoomUpdate(room);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, room, campaigns: FAMILY_CAMPAIGNS }));
    return;
  }

  if (pathname === "/api/room/procedural-map" && req.method === "POST") {
    const body = await readJsonBody(req);
    const room = regenerateRoomProceduralMap({
      roomCode: body.roomCode || "DRGN",
      theme: body.theme,
    });
    broadcastRoomUpdate(room);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, room }));
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
