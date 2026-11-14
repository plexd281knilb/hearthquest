import http from "node:http";
import { createStarterFamilySession } from "@hearthquest/srd-rules";
import { generateGmCoPilotWhisper, probeRtx3080Health } from "./index";

const PORT = Number(process.env.PORT || 8000);

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === "/api/health" && req.method === "GET") {
    const health = await probeRtx3080Health();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, service: "quest-ai-bridge", ...health }));
    return;
  }

  if (req.url === "/api/copilot/whisper" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", async () => {
      try {
        const parsed = JSON.parse(body || "{}");
        const session = parsed.session || createStarterFamilySession();
        const whisper = await generateGmCoPilotWhisper({
          question: parsed.question || "Can we bribe the goblin with a cookie?",
          session,
        });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, whisper }));
      } catch (err: any) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: err?.message || "Invalid request" }));
      }
    });
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: false, error: "Route not found" }));
});

if (process.env.NODE_ENV !== "test") {
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[quest-ai-bridge] RTX 3080 & Cloud Failover Router listening on http://0.0.0.0:${PORT}`);
  });
}

export { server };
