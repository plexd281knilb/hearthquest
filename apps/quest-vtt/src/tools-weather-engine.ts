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
        ctx.beginPath();
        ctx.roundRect(midX - tw / 2, midY - 14, tw, 26, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#fef08a";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, midX, midY - 1);
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
