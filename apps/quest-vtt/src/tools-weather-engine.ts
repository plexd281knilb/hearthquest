/**
 * Foundry-Style Tabletop Ruler (5ft/sq), Spell AoE Templates (Circle/Cone/Line),
 * and Ambient Weather Particle Layer (Hearth Embers, Forest Fireflies, Starlight Dust).
 */

export function renderTabletopToolsControlsHtml(): string {
  return `
  <!-- FOUNDRY TOOLS, SPELL TEMPLATES & AMBIENT WEATHER BAR -->
  <div id="tabletop-tools-bar" class="mt-2 pt-2 border-t border-slate-700/40 flex flex-wrap items-center justify-between gap-2 text-xs">
    <div class="flex flex-wrap items-center gap-1.5">
      <span class="font-bold text-sky-400">🧰 Tools:</span>
      <button id="tool-btn-move" onclick="setTabletopTool('MOVE')" class="px-2 py-1 rounded-lg font-bold border bg-sky-500 text-slate-950 border-sky-400">👆 Move</button>
      <button id="tool-btn-ruler" onclick="setTabletopTool('RULER')" class="px-2 py-1 rounded-lg font-semibold border bg-slate-800 text-slate-300 border-slate-700">📏 Ruler (5ft)</button>
      <button id="tool-btn-circle" onclick="setTabletopTool('TEMPLATE_CIRCLE')" class="px-2 py-1 rounded-lg font-semibold border bg-slate-800 text-slate-300 border-slate-700">💥 15ft Circle</button>
      <button id="tool-btn-cone" onclick="setTabletopTool('TEMPLATE_CONE')" class="px-2 py-1 rounded-lg font-semibold border bg-slate-800 text-slate-300 border-slate-700">🌬️ 15ft Cone</button>
      <button id="tool-btn-line" onclick="setTabletopTool('TEMPLATE_LINE')" class="px-2 py-1 rounded-lg font-semibold border bg-slate-800 text-slate-300 border-slate-700">⚡ 30ft Line</button>
      <button onclick="clearSpellTemplates()" class="px-2 py-1 rounded-lg font-semibold border bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border-rose-500/40">🧹 Clear</button>
    </div>
    <div class="flex items-center gap-1.5">
      <span class="font-bold text-emerald-400">🌦️ Atmosphere:</span>
      <select id="select-ambient-weather" onchange="setAmbientWeather(this.value)" class="theme-input border rounded-lg px-2 py-1 text-xs">
        <option value="HEARTH_EMBERS">🔥 Hearth Embers</option>
        <option value="FOREST_FIREFLIES">🦋 Forest Fireflies</option>
        <option value="STARLIGHT_DUST">🌠 Starlight Dust</option>
        <option value="NONE">✨ Calm / Off</option>
      </select>
    </div>
  </div>`;
}

export function renderToolsAndWeatherEngineScript(): string {
  return `
    /* ==========================================================
       2D. TABLETOP RULER, SPELL AOE TEMPLATES & WEATHER PARTICLES
       ========================================================== */
    const ToolsWeatherEngine = {
      canvas: null,
      ctx: null,
      initialized: false,
      internalWidth: 800,
      internalHeight: 480,
      activeTool: "MOVE",
      isDragging: false,
      dragStart: null,
      dragCurrent: null,
      tokenDrag: null,
      justDraggedUntil: 0,
      particles: [],

      init() {
        if (this.initialized) return;
        this.canvas = document.getElementById("vtt-tools-canvas");
        if (!this.canvas) return;
        this.initialized = true;
        this.canvas.width = this.internalWidth;
        this.canvas.height = this.internalHeight;
        this.ctx = this.canvas.getContext("2d");

        // Seed 34 ambient atmosphere particles
        this.particles = [];
        for (let i = 0; i < 34; i++) {
          this.particles.push({
            x: Math.random() * this.internalWidth,
            y: Math.random() * this.internalHeight,
            r: 1.5 + Math.random() * 2.8,
            vx: (Math.random() - 0.5) * 18,
            vy: -10 - Math.random() * 18,
            phase: Math.random() * Math.PI * 2,
          });
        }

        const toGridCoord = (e) => {
          const rect = this.canvas.getBoundingClientRect();
          const cols = (typeof state !== "undefined" && state.gridCols) || 10;
          const rows = (typeof state !== "undefined" && state.gridRows) || 6;
          const gx = Math.max(0, Math.min(cols, ((e.clientX - rect.left) / Math.max(1, rect.width)) * cols));
          const gy = Math.max(0, Math.min(rows, ((e.clientY - rect.top) / Math.max(1, rect.height)) * rows));
          return { x: gx, y: gy };
        };

        this.canvas.addEventListener("pointerdown", (e) => {
          if (this.activeTool === "MOVE") return;
          this.isDragging = true;
          this.dragStart = toGridCoord(e);
          this.dragCurrent = this.dragStart;
          if (this.canvas.setPointerCapture) {
            try { this.canvas.setPointerCapture(e.pointerId); } catch {}
          }
        });

        this.canvas.addEventListener("pointermove", (e) => {
          if (!this.isDragging) return;
          this.dragCurrent = toGridCoord(e);
        });

        this.canvas.addEventListener("pointerup", async (e) => {
          if (!this.isDragging) return;
          this.isDragging = false;
          const endPos = toGridCoord(e);
          const startPos = this.dragStart || endPos;
          this.dragCurrent = endPos;

          if (this.activeTool === "TEMPLATE_CIRCLE" || this.activeTool === "TEMPLATE_CONE" || this.activeTool === "TEMPLATE_LINE") {
            const shape = this.activeTool.replace("TEMPLATE_", "");
            const color = shape === "CIRCLE" ? "#f97316" : shape === "CONE" ? "#38bdf8" : "#a855f7";
            const radiusSquares = shape === "LINE" ? 6 : 3;
            const label = shape === "CIRCLE" ? "15ft Circle Burst" : shape === "CONE" ? "15ft Cone" : "30ft Line";

            let tx = endPos.x;
            let ty = endPos.y;
            if (Math.hypot(tx - startPos.x, ty - startPos.y) < 0.2) {
              tx = startPos.x + 1.5;
              ty = startPos.y;
            }

            if (typeof apiPost === "function" && typeof state !== "undefined") {
              await apiPost("/api/room/tools", {
                roomCode: state.roomCode,
                addTemplate: {
                  shape,
                  label,
                  originX: Number(startPos.x.toFixed(2)),
                  originY: Number(startPos.y.toFixed(2)),
                  targetX: Number(tx.toFixed(2)),
                  targetY: Number(ty.toFixed(2)),
                  radiusSquares,
                  color,
                  casterName: (typeof selectedHeroId !== "undefined" ? selectedHeroId : "Hero")
                }
              });
            }
            this.dragStart = null;
            this.dragCurrent = null;
          }
        });

        this.startLoop();
        this.bindGlobalTokenDragListeners();
      },

      getClientTokenSpeedFt(tok) {
        const hero = tok && tok.characterId && typeof state !== "undefined"
          ? (state.heroes || []).find(h => h.id === tok.characterId)
          : null;
        if (hero && hero.attributes5e && hero.attributes5e.speedFt) return hero.attributes5e.speedFt;
        if (tok && tok.speedFt) return tok.speedFt;
        const arch = ((hero && hero.archetype) || (tok && tok.name) || "").toLowerCase();
        if (arch.includes("rogue") || arch.includes("ranger") || arch.includes("scout")) return 35;
        if (arch.includes("knight") || arch.includes("paladin") || arch.includes("dwarf")) return 25;
        return 30;
      },

      getClientTokenMoveBudget(tok) {
        const speedFt = this.getClientTokenSpeedFt(tok);
        const combat = typeof state !== "undefined" ? state.combat : null;
        if (combat && combat.isActive && combat.enforceTurnMovement !== false && combat.entries && combat.entries.length > 0) {
          const active = combat.entries[combat.activeTurnIndex];
          const isTurn = active && (active.tokenId === tok.id || (tok.characterId && active.characterId === tok.characterId));
          if (!isTurn) {
            return {
              maxSq: 0,
              budgetFt: 0,
              blockedReason: "⏳ Not " + (tok.name || "Hero").split(" ")[0] + "'s turn!",
            };
          }
          const remFt = typeof active.movementRemainingFt === "number" ? active.movementRemainingFt : (active.speedFt || speedFt);
          return {
            maxSq: Math.max(0, Math.floor(remFt / 5)),
            budgetFt: remFt,
            blockedReason: remFt < 5 ? "🦶 0 ft left this turn!" : "",
          };
        }
        return {
          maxSq: Math.max(1, Math.floor(speedFt / 5)),
          budgetFt: speedFt,
          blockedReason: "",
        };
      },

      segIntersectClient(ax, ay, bx, by, cx, cy, dx, dy) {
        const eps = 1e-9;
        const rX = bx - ax, rY = by - ay;
        const sX = dx - cx, sY = dy - cy;
        const denom = rX * sY - rY * sX;
        if (Math.abs(denom) < eps) return false;
        const qpx = cx - ax, qpy = cy - ay;
        const t = (qpx * sY - qpy * sX) / denom;
        const u = (qpx * rY - qpy * rX) / denom;
        return t >= -eps && t <= 1 + eps && u >= -eps && u <= 1 + eps;
      },

      findStepBlockerClient(fx, fy, tx, ty) {
        if (typeof state === "undefined" || !state.walls) return null;
        if (fx === tx && fy === ty) return null;
        const ax = fx + 0.5, ay = fy + 0.5;
        const bx = tx + 0.5, by = ty + 0.5;
        for (let i = 0; i < state.walls.length; i++) {
          const w = state.walls[i];
          if (!w.isDoor && w.id && w.id.indexOf("pillar-") === 0) continue;
          if (w.isDoor && w.isOpen && !w.isLocked) continue;
          if (this.segIntersectClient(ax, ay, bx, by, w.x1, w.y1, w.x2, w.y2)) return w;
        }
        return null;
      },

      computeFoundryDragPath(tok, hoverX, hoverY, maxSq) {
        const cols = (typeof state !== "undefined" && state.gridCols) || 10;
        const rows = (typeof state !== "undefined" && state.gridRows) || 6;
        const sx = tok.gridX, sy = tok.gridY;
        const tx = Math.max(0, Math.min(cols - 1, hoverX));
        const ty = Math.max(0, Math.min(rows - 1, hoverY));
        const canEnter = (x, y) => {
          if (typeof displayMode !== "undefined" && displayMode === "GM_COMMAND") return true;
          const z = (state.zones || []).find(zz => x >= zz.gridX && x < zz.gridX + zz.width && y >= zz.gridY && y < zz.gridY + zz.height);
          return !z || z.isRevealed;
        };

        if (maxSq <= 0 || (sx === tx && sy === ty)) {
          return {
            path: [{ x: sx, y: sy }],
            snappedX: sx,
            snappedY: sy,
            usedSq: 0,
            clampedBySpeed: false,
            wallBlockedNearTarget: null,
          };
        }

        // 8-way BFS on tile grid respecting walls/doors and preference for straight visual step
        const dirs = [
          [1, 0], [-1, 0], [0, 1], [0, -1],
          [1, 1], [1, -1], [-1, 1], [-1, -1],
        ];
        const key = (x, y) => x + "," + y;
        const visited = new Set([key(sx, sy)]);
        const parent = new Map();
        const queue = [{ x: sx, y: sy, d: 0 }];
        let closestNode = { x: sx, y: sy, d: 0 };
        let closestDist = Math.hypot(tx - sx, ty - sy);
        let reached = null;

        while (queue.length > 0) {
          const cur = queue.shift();
          if (cur.x === tx && cur.y === ty) {
            reached = cur;
            break;
          }
          // Sort neighbors slightly by distance to cursor for crisp natural Foundry diagonals
          const sortedDirs = dirs.slice().sort((a, b) => {
            const da = Math.hypot((cur.x + a[0]) - tx, (cur.y + a[1]) - ty);
            const db = Math.hypot((cur.x + b[0]) - tx, (cur.y + b[1]) - ty);
            return da - db;
          });
          for (let i = 0; i < sortedDirs.length; i++) {
            const nx = cur.x + sortedDirs[i][0];
            const ny = cur.y + sortedDirs[i][1];
            if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
            const k = key(nx, ny);
            if (visited.has(k)) continue;
            if (!canEnter(nx, ny)) continue;
            if (this.findStepBlockerClient(cur.x, cur.y, nx, ny)) continue;
            visited.add(k);
            parent.set(k, { x: cur.x, y: cur.y });
            const nextNode = { x: nx, y: ny, d: cur.d + 1 };
            queue.push(nextNode);
            const distToTarget = Math.hypot(tx - nx, ty - ny);
            if (distToTarget < closestDist) {
              closestDist = distToTarget;
              closestNode = nextNode;
            }
          }
        }

        const endNode = reached || closestNode;
        const fullPath = [];
        let trace = { x: endNode.x, y: endNode.y };
        while (trace) {
          fullPath.unshift(trace);
          trace = parent.get(key(trace.x, trace.y));
        }
        const clampedBySpeed = (fullPath.length - 1) > maxSq;
        const clampedPath = fullPath.slice(0, maxSq + 1);
        const last = clampedPath[clampedPath.length - 1] || { x: sx, y: sy };
        const directWallHit = !reached && (tx !== last.x || ty !== last.y)
          ? this.findStepBlockerClient(last.x, last.y, tx, ty)
          : null;

        return {
          path: clampedPath,
          snappedX: last.x,
          snappedY: last.y,
          usedSq: Math.max(0, clampedPath.length - 1),
          clampedBySpeed,
          wallBlockedNearTarget: directWallHit,
        };
      },

      beginTokenDrag(tok, e) {
        if (!e || e.button > 0) return;
        if (this.activeTool !== "MOVE") return;
        if (typeof isCreatorPropStampMode !== "undefined" && isCreatorPropStampMode) return;
        const canDrag = (typeof displayMode !== "undefined" && displayMode === "GM_COMMAND") ||
          tok.type === "HERO" || Boolean(tok.characterId);
        if (!canDrag) return;
        const budget = this.getClientTokenMoveBudget(tok);
        this.tokenDrag = {
          tokenId: tok.id,
          token: tok,
          startX: tok.gridX,
          startY: tok.gridY,
          clientStartX: e.clientX,
          clientStartY: e.clientY,
          hoverX: tok.gridX,
          hoverY: tok.gridY,
          startedDrag: false,
          budget,
          pathInfo: {
            path: [{ x: tok.gridX, y: tok.gridY }],
            snappedX: tok.gridX,
            snappedY: tok.gridY,
            usedSq: 0,
            clampedBySpeed: false,
            wallBlockedNearTarget: null,
          },
        };
      },

      bindGlobalTokenDragListeners() {
        if (this._globalDragBound) return;
        this._globalDragBound = true;

        const clientToTile = (ev) => {
          const targetEl = this.canvas || document.getElementById("vtt-grid");
          if (!targetEl) return null;
          const rect = targetEl.getBoundingClientRect();
          const cols = (typeof state !== "undefined" && state.gridCols) || 10;
          const rows = (typeof state !== "undefined" && state.gridRows) || 6;
          const gx = Math.floor(((ev.clientX - rect.left) / Math.max(1, rect.width)) * cols);
          const gy = Math.floor(((ev.clientY - rect.top) / Math.max(1, rect.height)) * rows);
          return {
            x: Math.max(0, Math.min(cols - 1, gx)),
            y: Math.max(0, Math.min(rows - 1, gy)),
          };
        };

        window.addEventListener("pointermove", (e) => {
          if (!this.tokenDrag) return;
          const distPx = Math.hypot(e.clientX - this.tokenDrag.clientStartX, e.clientY - this.tokenDrag.clientStartY);
          if (!this.tokenDrag.startedDrag) {
            if (distPx < 6) return;
            this.tokenDrag.startedDrag = true;
            if (this.tokenDrag.token.characterId && typeof selectedHeroId !== "undefined") {
              selectedHeroId = this.tokenDrag.token.characterId;
            }
            if (typeof selectedTokenId !== "undefined") {
              selectedTokenId = this.tokenDrag.token.id;
            }
          }
          if (e.cancelable) e.preventDefault();
          const tile = clientToTile(e);
          if (!tile) return;
          if (tile.x !== this.tokenDrag.hoverX || tile.y !== this.tokenDrag.hoverY || !this.tokenDrag.pathInfo) {
            this.tokenDrag.hoverX = tile.x;
            this.tokenDrag.hoverY = tile.y;
            this.tokenDrag.pathInfo = this.computeFoundryDragPath(
              this.tokenDrag.token,
              tile.x,
              tile.y,
              this.tokenDrag.budget.maxSq
            );
          }
        }, { passive: false });

        window.addEventListener("pointercancel", () => {
          this.tokenDrag = null;
        });

        window.addEventListener("pointerup", async () => {
          if (!this.tokenDrag) return;
          const drag = this.tokenDrag;
          this.tokenDrag = null;
          if (!drag.startedDrag) return;

          this.justDraggedUntil = Date.now() + 260;
          const pInfo = drag.pathInfo;
          if (drag.budget.maxSq <= 0 && drag.budget.blockedReason) {
            if (typeof showMoveBlockedBanner === "function") {
              showMoveBlockedBanner(drag.budget.blockedReason);
            }
            return;
          }
          if (!pInfo || (pInfo.snappedX === drag.startX && pInfo.snappedY === drag.startY)) {
            if (pInfo && pInfo.wallBlockedNearTarget && typeof showMoveBlockedBanner === "function") {
              const blk = pInfo.wallBlockedNearTarget;
              showMoveBlockedBanner(
                blk.isDoor
                  ? (blk.isLocked ? "🔒 Locked door! Click door to pick lock." : "🚪 Closed door! Click door icon to swing it open.")
                  : "🧱 Wall blocks direct path.",
                blk.isDoor ? blk.id : undefined,
                Boolean(blk.isLocked)
              );
            }
            return;
          }
          if (typeof commitDraggedTokenMove === "function") {
            await commitDraggedTokenMove(drag.tokenId, pInfo.snappedX, pInfo.snappedY, pInfo.path);
          }
        });
      },

      setTool(toolName) {
        this.activeTool = toolName;
        this.isDragging = false;
        this.dragStart = null;
        this.dragCurrent = null;
        if (this.canvas) {
          this.canvas.style.pointerEvents = toolName === "MOVE" ? "none" : "auto";
          this.canvas.style.cursor = toolName === "MOVE" ? "default" : "crosshair";
        }
      },

      drawSpellTemplate(ctx, tpl, cellW, cellH) {
        const ox = tpl.originX * cellW;
        const oy = tpl.originY * cellH;
        const tx = tpl.targetX * cellW;
        const ty = tpl.targetY * cellH;
        const angle = Math.atan2(ty - oy, tx - ox);
        const radiusPx = (tpl.radiusSquares || 3) * cellW;
        const color = tpl.color || "#f97316";

        ctx.save();
        ctx.fillStyle = color + "44";
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 4]);

        ctx.beginPath();
        if (tpl.shape === "CIRCLE") {
          ctx.arc(ox, oy, radiusPx, 0, Math.PI * 2);
        } else if (tpl.shape === "CONE") {
          const halfSpread = Math.PI / 6; // 60-degree 5e cone
          ctx.moveTo(ox, oy);
          ctx.arc(ox, oy, radiusPx, angle - halfSpread, angle + halfSpread);
          ctx.closePath();
        } else {
          // 30ft Line beam (length = 6 squares, width = 1 square)
          const lenPx = Math.max(cellW * 2, Math.min(cellW * 6, Math.hypot(tx - ox, ty - oy) || cellW * 6));
          ctx.translate(ox, oy);
          ctx.rotate(angle);
          ctx.rect(0, -cellH * 0.45, lenPx, cellH * 0.9);
        }
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Template Label Pill
        ctx.save();
        ctx.font = "bold 11px system-ui, sans-serif";
        const text = tpl.label || tpl.shape;
        const metrics = ctx.measureText(text);
        const pw = metrics.width + 12;
        ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
        ctx.fillRect(ox - pw / 2, oy - 22, pw, 18);
        ctx.fillStyle = "#fde047";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, ox, oy - 13);
        ctx.restore();
      },

      drawRuler(ctx, startPt, endPt, cellW, cellH) {
        const x1 = startPt.x * cellW;
        const y1 = startPt.y * cellH;
        const x2 = endPt.x * cellW;
        const y2 = endPt.y * cellH;
        const squares = Math.hypot(endPt.x - startPt.x, endPt.y - startPt.y);
        const feet = Math.round(squares * 5);

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 4;
        ctx.setLineDash([8, 6]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = "#fbbf24";
        ctx.beginPath();
        ctx.arc(x1, y1, 6, 0, Math.PI * 2);
        ctx.arc(x2, y2, 6, 0, Math.PI * 2);
        ctx.fill();

        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        const label = feet + " ft (" + squares.toFixed(1) + " sq)";
        ctx.font = "bold 13px system-ui, sans-serif";
        const tw = ctx.measureText(label).width + 16;
        ctx.fillStyle = "rgba(2, 6, 23, 0.92)";
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 2;
        this.traceRoundedRect(ctx, midX - tw / 2, midY - 14, tw, 26, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#fef08a";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, midX, midY - 1);
        ctx.restore();
      },

      traceRoundedRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(x, y, w, h, r);
          return;
        }
        const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + w, y, x + w, y + h, radius);
        ctx.arcTo(x + w, y + h, x, y + h, radius);
        ctx.arcTo(x, y + h, x, y, radius);
        ctx.arcTo(x, y, x + w, y, radius);
        ctx.closePath();
      },

      drawTokenDragPreview(ctx, cellW, cellH) {
        const drag = this.tokenDrag;
        if (!drag || !drag.startedDrag || !drag.pathInfo) return;
        const info = drag.pathInfo;
        const pts = info.path || [];
        if (pts.length === 0) return;

        const isBlockedTurn = drag.budget.maxSq <= 0;
        const mainColor = isBlockedTurn ? "#f43f5e" : info.clampedBySpeed ? "#fbbf24" : "#34d399";
        const fillTint = isBlockedTurn
          ? "rgba(244, 63, 94, 0.24)"
          : info.clampedBySpeed
          ? "rgba(251, 191, 36, 0.22)"
          : "rgba(52, 211, 153, 0.22)";

        const destX = info.snappedX * cellW;
        const destY = info.snappedY * cellH;
        const destCx = (info.snappedX + 0.5) * cellW;
        const destCy = (info.snappedY + 0.5) * cellH;

        ctx.save();

        // 1. Tile-Locked Destination Highlight & Ghost Landing Silhouette
        ctx.fillStyle = fillTint;
        ctx.fillRect(destX + 3, destY + 3, cellW - 6, cellH - 6);
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 2.6;
        ctx.strokeRect(destX + 3, destY + 3, cellW - 6, cellH - 6);

        // Ghost Token Ring inside target tile showing exact landing position
        if (!isBlockedTurn && (info.snappedX !== drag.startX || info.snappedY !== drag.startY)) {
          ctx.beginPath();
          ctx.arc(destCx, destCy, Math.min(cellW, cellH) * 0.31, 0, Math.PI * 2);
          ctx.fillStyle = (drag.token.color || "#f59e0b") + "55";
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 3]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // 2. Tile-Locked Step Path + Intermediate Waypoint Dots + Directional Arrowhead
        if (pts.length >= 2) {
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.beginPath();
          for (let i = 0; i < pts.length; i++) {
            const px = (pts[i].x + 0.5) * cellW;
            const py = (pts[i].y + 0.5) * cellH;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          // Outer dark casing
          ctx.strokeStyle = "rgba(2, 6, 23, 0.78)";
          ctx.lineWidth = 8.5;
          ctx.stroke();
          // Bright inner path beam
          ctx.strokeStyle = mainColor;
          ctx.lineWidth = 4.2;
          ctx.stroke();

          // Step-by-step tile center pips
          for (let i = 0; i < pts.length - 1; i++) {
            const px = (pts[i].x + 0.5) * cellW;
            const py = (pts[i].y + 0.5) * cellH;
            ctx.fillStyle = i === 0 ? "#fde047" : "#ecfdf5";
            ctx.beginPath();
            ctx.arc(px, py, i === 0 ? 4.5 : 3.2, 0, Math.PI * 2);
            ctx.fill();
          }

          // Directional Foundry Arrowhead entering target tile center
          const prev = pts[pts.length - 2];
          const last = pts[pts.length - 1];
          const ang = Math.atan2((last.y - prev.y) * cellH, (last.x - prev.x) * cellW);
          const tipX = (last.x + 0.5) * cellW - Math.cos(ang) * 4;
          const tipY = (last.y + 0.5) * cellH - Math.sin(ang) * 4;
          const arrowLen = 14;
          ctx.fillStyle = mainColor;
          ctx.strokeStyle = "#020617";
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(tipX, tipY);
          ctx.lineTo(tipX - Math.cos(ang - 0.52) * arrowLen, tipY - Math.sin(ang - 0.52) * arrowLen);
          ctx.lineTo(tipX - Math.cos(ang + 0.52) * arrowLen, tipY - Math.sin(ang + 0.52) * arrowLen);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }

        // 3. Floating Distance & Speed Pill ("15 ft / 30 ft" or "30 ft MAX" or "Not Turn")
        const usedFt = info.usedSq * 5;
        const maxFt = drag.budget.budgetFt || 30;
        const badgeText = isBlockedTurn
          ? (drag.budget.blockedReason || "⏳ Not your turn")
          : info.clampedBySpeed
          ? usedFt + " ft MAX (" + drag.budget.maxSq + " sq)"
          : usedFt + " / " + maxFt + " ft";
        ctx.font = "bold 12px system-ui, sans-serif";
        const tw = ctx.measureText(badgeText).width + 16;
        const bx = Math.max(tw * 0.5 + 6, Math.min(this.internalWidth - tw * 0.5 - 6, destCx));
        const by = destY > 36 ? destY - 14 : destY + cellH + 14;

        ctx.fillStyle = "rgba(2, 6, 23, 0.92)";
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 2;
        this.traceRoundedRect(ctx, bx - tw / 2, by - 12, tw, 24, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isBlockedTurn ? "#fda4af" : info.clampedBySpeed ? "#fde68a" : "#6ee7b7";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(badgeText, bx, by);
        ctx.restore();
      },

      renderFrame(now) {
        if (!this.ctx || typeof state === "undefined") return;
        const ctx = this.ctx;
        const w = this.internalWidth;
        const h = this.internalHeight;
        const cols = state.gridCols || 10;
        const rows = state.gridRows || 6;
        const cellW = w / cols;
        const cellH = h / rows;
        const t = (now || 0) / 1000;

        ctx.clearRect(0, 0, w, h);

        // 1. Render persisted Spell AoE Templates
        const templates = state.spellTemplates || [];
        for (let i = 0; i < templates.length; i++) {
          this.drawSpellTemplate(ctx, templates[i], cellW, cellH);
        }

        // 1b. Render Foundry Token Drag Tile-Locked Path & Arrow Preview
        this.drawTokenDragPreview(ctx, cellW, cellH);

        // 2. Render active drag preview (Ruler or Template)
        if (this.dragStart && this.dragCurrent) {
          if (this.activeTool === "RULER") {
            this.drawRuler(ctx, this.dragStart, this.dragCurrent, cellW, cellH);
          } else if (this.activeTool.indexOf("TEMPLATE_") === 0) {
            const shape = this.activeTool.replace("TEMPLATE_", "");
            this.drawSpellTemplate(ctx, {
              shape,
              label: "Aiming " + shape + "...",
              originX: this.dragStart.x,
              originY: this.dragStart.y,
              targetX: this.dragCurrent.x,
              targetY: this.dragCurrent.y,
              radiusSquares: shape === "LINE" ? 6 : 3,
              color: "#fef08a"
            }, cellW, cellH);
          }
        }

        // 3. Render Ambient Atmosphere Weather Particles
        const weather = state.ambientWeather || "HEARTH_EMBERS";
        if (weather !== "NONE") {
          ctx.save();
          for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            if (weather === "HEARTH_EMBERS") {
              p.y += p.vy * 0.016;
              p.x += Math.sin(t * 2 + p.phase) * 0.4;
              if (p.y < -5) { p.y = h + 5; p.x = Math.random() * w; }
              ctx.fillStyle = "rgba(251, 146, 60, " + (0.45 + Math.sin(t * 5 + p.phase) * 0.35) + ")";
            } else if (weather === "FOREST_FIREFLIES") {
              p.x += Math.sin(t * 1.4 + p.phase) * 0.55;
              p.y += Math.cos(t * 1.1 + p.phase) * 0.45;
              if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
              if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
              ctx.fillStyle = "rgba(163, 230, 53, " + (0.4 + Math.sin(t * 3 + p.phase) * 0.45) + ")";
            } else {
              // STARLIGHT_DUST
              p.x += p.vx * 0.014;
              p.y += Math.sin(t * 0.9 + p.phase) * 0.35;
              if (p.x < -5) p.x = w + 5; if (p.x > w + 5) p.x = -5;
              ctx.fillStyle = "rgba(167, 139, 250, " + (0.45 + Math.sin(t * 4 + p.phase) * 0.4) + ")";
            }
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      },

      startLoop() {
        const tick = (now) => {
          this.renderFrame(now);
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    };
  `;
}
