/**
 * Foundry-Style 2D Dynamic Raycast Torch Lighting, Wall Shadow Casting & Vision Engine
 * Computes real-time 2D visibility polygons via ray-segment intersection against
 * dungeon walls, stone pillars, and interactive doorways, compositing flickering
 * point-light halos and hard/soft occlusion shadows over the 10x6 tactical grid.
 */

export function renderLightingControlsHtml(): string {
  return `
  <!-- FOUNDRY DYNAMIC LIGHTING & DOOR CONTROLS BAR -->
  <div id="lighting-controls-bar" class="mt-2 pt-2 border-t border-slate-700/40 flex flex-wrap items-center justify-between gap-2 text-xs">
    <div class="flex flex-wrap items-center gap-1.5">
      <span class="font-bold text-amber-400">🕯️ Dynamic Lighting:</span>
      <button id="btn-light-day" onclick="setAmbientLighting('BRIGHT_DAYLIGHT')" class="px-2.5 py-1 rounded-lg font-semibold border transition">☀️ Daylight</button>
      <button id="btn-light-twilight" onclick="setAmbientLighting('COZY_TWILIGHT')" class="px-2.5 py-1 rounded-lg font-semibold border transition">🌆 Cozy Twilight</button>
      <button id="btn-light-dungeon" onclick="setAmbientLighting('TORCHLIT_DUNGEON')" class="px-2.5 py-1 rounded-lg font-semibold border transition">🕯️ Torchlit Dungeon</button>
    </div>
    <div id="door-toggle-buttons" class="flex flex-wrap items-center gap-1.5"></div>
  </div>`;
}

export function renderLighting2DEngineScript(): string {
  return `
    /* ==========================================================
       2C. FOUNDRY 2D RAYCAST DYNAMIC LIGHTING & SHADOW ENGINE
       ========================================================== */
    const Lighting2DEngine = {
      canvas: null,
      ctx: null,
      maskCanvas: null,
      maskCtx: null,
      animFrame: null,
      initialized: false,
      internalWidth: 800,
      internalHeight: 480,

      init() {
        if (this.initialized) return;
        this.canvas = document.getElementById("vtt-lighting-canvas");
        if (!this.canvas) return;
        this.initialized = true;
        this.canvas.width = this.internalWidth;
        this.canvas.height = this.internalHeight;
        this.ctx = this.canvas.getContext("2d");

        this.maskCanvas = document.createElement("canvas");
        this.maskCanvas.width = this.internalWidth;
        this.maskCanvas.height = this.internalHeight;
        this.maskCtx = this.maskCanvas.getContext("2d");

        this.startLoop();
      },

      intersectRaySegment(ox, oy, dx, dy, x1, y1, x2, y2) {
        const sx = x2 - x1;
        const sy = y2 - y1;
        const denom = dx * sy - dy * sx;
        if (Math.abs(denom) < 1e-9) return null;
        const qpx = x1 - ox;
        const qpy = y1 - oy;
        const t = (qpx * sy - qpy * sx) / denom;
        const u = (qpx * dy - qpy * dx) / denom;
        if (t >= 0 && u >= -1e-5 && u <= 1.00001) {
          return { x: ox + t * dx, y: oy + t * dy, t };
        }
        return null;
      },

      computeVisibilityPolygon(ox, oy, maxRadius, walls) {
        const activeWalls = (walls || []).filter(w => w.blocksVision && !w.isOpen);
        const angles = [];
        const radialSamples = 48;

        for (let i = 0; i < radialSamples; i++) {
          angles.push((i * 2 * Math.PI) / radialSamples - Math.PI);
        }

        for (let i = 0; i < activeWalls.length; i++) {
          const w = activeWalls[i];
          const a1 = Math.atan2(w.y1 - oy, w.x1 - ox);
          const a2 = Math.atan2(w.y2 - oy, w.x2 - ox);
          angles.push(a1 - 0.00025, a1, a1 + 0.00025);
          angles.push(a2 - 0.00025, a2, a2 + 0.00025);
        }

        const pts = [];
        for (let i = 0; i < angles.length; i++) {
          const angle = angles[i];
          const dx = Math.cos(angle);
          const dy = Math.sin(angle);
          let minT = maxRadius;
          let hitX = ox + dx * maxRadius;
          let hitY = oy + dy * maxRadius;

          for (let j = 0; j < activeWalls.length; j++) {
            const w = activeWalls[j];
            const hit = this.intersectRaySegment(ox, oy, dx, dy, w.x1, w.y1, w.x2, w.y2);
            if (hit && hit.t < minT) {
              minT = hit.t;
              hitX = hit.x;
              hitY = hit.y;
            }
          }
          pts.push({ x: hitX, y: hitY, angle });
        }

        pts.sort((a, b) => a.angle - b.angle);
        return pts;
      },

      hexToRgb(hex) {
        const clean = (hex || "#fbbf24").replace("#", "");
        const num = parseInt(clean.length === 3 ? clean.replace(/(.)/g, "$1$1") : clean, 16);
        return {
          r: (num >> 16) & 255,
          g: (num >> 8) & 255,
          b: num & 255
        };
      },

      renderFrame(now) {
        if (!this.ctx || !this.maskCtx || typeof state === "undefined") return;
        const w = this.internalWidth;
        const h = this.internalHeight;
        const cols = state.gridCols || 10;
        const rows = state.gridRows || 6;
        const cellW = w / cols;
        const cellH = h / rows;
        const t = (now || 0) / 1000;

        const mode = state.ambientLightMode || "COZY_TWILIGHT";
        let baseDarkness = 0.0;
        if (mode === "COZY_TWILIGHT") {
          baseDarkness = displayMode === "GM_COMMAND" ? 0.42 : 0.56;
        } else if (mode === "TORCHLIT_DUNGEON") {
          baseDarkness = displayMode === "GM_COMMAND" ? 0.68 : 0.86;
        }

        const ctx = this.ctx;
        const maskCtx = this.maskCtx;
        ctx.clearRect(0, 0, w, h);

        const walls = state.walls || [];
        const lightSources = (state.tokens || []).filter(tok => {
          if (tok.isHiddenFromPlayers && displayMode !== "GM_COMMAND") return false;
          const zone = (state.zones || []).find(
            z => tok.gridX >= z.gridX && tok.gridX < z.gridX + z.width && tok.gridY >= z.gridY && tok.gridY < z.gridY + z.height
          );
          if (zone && !zone.isRevealed && displayMode !== "GM_COMMAND") return false;
          return (tok.lightRadius && tok.lightRadius > 0) || tok.type === "HERO" || tok.type === "PROP";
        });

        // 1. Build Darkness Occlusion Mask punctured by Raycast Visibility Polygons
        if (baseDarkness > 0.01) {
          maskCtx.globalCompositeOperation = "source-over";
          maskCtx.clearRect(0, 0, w, h);
          maskCtx.fillStyle = "rgba(4, 7, 20, " + baseDarkness + ")";
          maskCtx.fillRect(0, 0, w, h);

          maskCtx.globalCompositeOperation = "destination-out";

          for (let i = 0; i < lightSources.length; i++) {
            const src = lightSources[i];
            const ox = src.gridX + 0.5;
            const oy = src.gridY + 0.5;
            const flicker = 1 + Math.sin(t * 6.5 + i * 1.7) * 0.035 + Math.cos(t * 13.2 + i) * 0.02;
            const baseR = src.lightRadius || (src.type === "HERO" ? 3.8 : 2.6);
            const radiusGrid = baseR * flicker;

            const poly = this.computeVisibilityPolygon(ox, oy, radiusGrid, walls);
            if (poly.length < 3) continue;

            maskCtx.save();
            maskCtx.beginPath();
            for (let p = 0; p < poly.length; p++) {
              const px = poly[p].x * cellW;
              const py = poly[p].y * cellH;
              if (p === 0) maskCtx.moveTo(px, py);
              else maskCtx.lineTo(px, py);
            }
            maskCtx.closePath();
            maskCtx.clip();

            const cx = ox * cellW;
            const cy = oy * cellH;
            const rPx = radiusGrid * cellW;
            const grad = maskCtx.createRadialGradient(cx, cy, rPx * 0.08, cx, cy, rPx);
            grad.addColorStop(0, "rgba(0, 0, 0, 1)");
            grad.addColorStop(0.55, "rgba(0, 0, 0, 0.9)");
            grad.addColorStop(1, "rgba(0, 0, 0, 0)");

            maskCtx.fillStyle = grad;
            maskCtx.fillRect(cx - rPx, cy - rPx, rPx * 2, rPx * 2);
            maskCtx.restore();
          }

          ctx.drawImage(this.maskCanvas, 0, 0);
        }

        // 2. Additive Warm Torchlight & Starlight Color Cast clipped to Visibility Polygons
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        for (let i = 0; i < lightSources.length; i++) {
          const src = lightSources[i];
          const ox = src.gridX + 0.5;
          const oy = src.gridY + 0.5;
          const flicker = 1 + Math.sin(t * 6.5 + i * 1.7) * 0.035 + Math.cos(t * 13.2 + i) * 0.02;
          const baseR = src.lightRadius || (src.type === "HERO" ? 3.8 : 2.6);
          const radiusGrid = baseR * flicker;

          const poly = this.computeVisibilityPolygon(ox, oy, radiusGrid, walls);
          if (poly.length < 3) continue;

          ctx.save();
          ctx.beginPath();
          for (let p = 0; p < poly.length; p++) {
            const px = poly[p].x * cellW;
            const py = poly[p].y * cellH;
            if (p === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.clip();

          const cx = ox * cellW;
          const cy = oy * cellH;
          const rPx = radiusGrid * cellW;
          const rgb = this.hexToRgb(src.lightColor || src.color || "#fbbf24");
          const glowAlpha = mode === "BRIGHT_DAYLIGHT" ? 0.14 : 0.28;
          const tintGrad = ctx.createRadialGradient(cx, cy, 4, cx, cy, rPx);
          tintGrad.addColorStop(0, "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + "," + glowAlpha + ")");
          tintGrad.addColorStop(0.6, "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + "," + (glowAlpha * 0.45) + ")");
          tintGrad.addColorStop(1, "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + ",0)");

          ctx.fillStyle = tintGrad;
          ctx.fillRect(cx - rPx, cy - rPx, rPx * 2, rPx * 2);
          ctx.restore();
        }
        ctx.restore();

        // 3. Draw Foundry Architectural Masonry Walls, Stone Pillars & Hinged Interactive Doors
        ctx.save();
        const wallPillars = [];
        for (let i = 0; i < walls.length; i++) {
          const wSeg = walls[i];
          // Skip outer border edges so they don't double-stroke the container border
          if (wSeg.id && wSeg.id.indexOf("wall-border-") === 0) continue;

          const x1 = wSeg.x1 * cellW;
          const y1 = wSeg.y1 * cellH;
          const x2 = wSeg.x2 * cellW;
          const y2 = wSeg.y2 * cellH;
          const dx = x2 - x1;
          const dy = y2 - y1;
          const segLen = Math.hypot(dx, dy);
          if (segLen < 1) continue;
          const ux = dx / segLen;
          const uy = dy / segLen;
          const nx = -uy;
          const ny = ux;

          if (wSeg.isDoor) {
            if (wSeg.isOpen) {
              // Subtle emerald open doorway threshold line
              ctx.save();
              ctx.strokeStyle = "rgba(52, 211, 153, 0.55)";
              ctx.lineWidth = 3;
              ctx.setLineDash([5, 5]);
              ctx.beginPath();
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
              ctx.stroke();
              ctx.setLineDash([]);

              // Architectural swing arc & pivoted open oak door leaf
              const baseAngle = Math.atan2(dy, dx);
              const leafLen = Math.min(segLen * 0.88, Math.max(24, segLen - 4));
              const openAngle = baseAngle + 1.12;
              const lx = x1 + Math.cos(openAngle) * leafLen;
              const ly = y1 + Math.sin(openAngle) * leafLen;

              ctx.strokeStyle = "rgba(110, 231, 183, 0.42)";
              ctx.lineWidth = 1.6;
              ctx.setLineDash([3, 4]);
              ctx.beginPath();
              ctx.arc(x1, y1, leafLen, baseAngle, openAngle);
              ctx.stroke();
              ctx.setLineDash([]);

              // Pivoted door timber leaf
              ctx.lineCap = "round";
              ctx.strokeStyle = "#451a03";
              ctx.lineWidth = 7;
              ctx.beginPath();
              ctx.moveTo(x1, y1);
              ctx.lineTo(lx, ly);
              ctx.stroke();

              ctx.strokeStyle = "#34d399";
              ctx.lineWidth = 3.5;
              ctx.beginPath();
              ctx.moveTo(x1, y1);
              ctx.lineTo(lx, ly);
              ctx.stroke();
              ctx.restore();
            } else {
              // Closed oak door leaf with drop shadow, timber panel & brass keyhole medallion
              ctx.save();
              ctx.shadowColor = "rgba(2, 6, 23, 0.78)";
              ctx.shadowBlur = 7;
              ctx.shadowOffsetX = 1.5;
              ctx.shadowOffsetY = 2;
              ctx.lineCap = "butt";

              ctx.strokeStyle = "#451a03";
              ctx.lineWidth = 10;
              ctx.beginPath();
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
              ctx.stroke();

              ctx.shadowColor = "transparent";
              ctx.strokeStyle = "#d97706";
              ctx.lineWidth = 5.5;
              ctx.beginPath();
              ctx.moveTo(x1 + ux * 3, y1 + uy * 3);
              ctx.lineTo(x2 - ux * 3, y2 - uy * 3);
              ctx.stroke();

              // Specular oak bevel
              ctx.strokeStyle = "rgba(254, 240, 138, 0.6)";
              ctx.lineWidth = 1.4;
              ctx.beginPath();
              ctx.moveTo(x1 + ux * 4 - nx * 1.3, y1 + uy * 4 - ny * 1.3);
              ctx.lineTo(x2 - ux * 4 - nx * 1.3, y2 - uy * 4 - ny * 1.3);
              ctx.stroke();

              // Glowing brass lockplate & handle in doorway center
              const mx = (x1 + x2) * 0.5;
              const my = (y1 + y2) * 0.5;
              ctx.fillStyle = "#451a03";
              ctx.beginPath();
              ctx.arc(mx, my, 6.2, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = "#fde047";
              ctx.beginPath();
              ctx.arc(mx, my, 3.6, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = "#ffffff";
              ctx.beginPath();
              ctx.arc(mx - 1, my - 1, 1.2, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
            }

            // Heavy oak/brass door jamb posts at doorway endpoints
            const jambEnds = [
              { px: x1, py: y1 },
              { px: x2, py: y2 },
            ];
            for (let j = 0; j < jambEnds.length; j++) {
              ctx.fillStyle = "#291204";
              ctx.beginPath();
              ctx.arc(jambEnds[j].px, jambEnds[j].py, 5.5, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = wSeg.isOpen ? "#34d399" : "#f59e0b";
              ctx.beginPath();
              ctx.arc(jambEnds[j].px, jambEnds[j].py, 2.6, 0, Math.PI * 2);
              ctx.fill();
            }
          } else {
            // Multi-pass Foundry dressed ashlar stone wall
            ctx.save();
            ctx.lineCap = "round";
            ctx.shadowColor = "rgba(2, 6, 23, 0.82)";
            ctx.shadowBlur = 9;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 3;

            // Outer iron-slate stone casing
            ctx.strokeStyle = "#1e293b";
            ctx.lineWidth = 10.5;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();

            // Sculpted stone ashlar core gradient
            ctx.shadowColor = "transparent";
            const wallGrad = ctx.createLinearGradient(x1, y1, x2, y2);
            wallGrad.addColorStop(0, "#64748b");
            wallGrad.addColorStop(0.5, "#94a3b8");
            wallGrad.addColorStop(1, "#64748b");
            ctx.strokeStyle = wallGrad;
            ctx.lineWidth = 6.2;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();

            // Dressed stone block mortar seam ticks along wall segment
            const tickStep = 20;
            ctx.strokeStyle = "rgba(15, 23, 42, 0.72)";
            ctx.lineWidth = 1.5;
            ctx.lineCap = "butt";
            for (let d = tickStep; d < segLen - 8; d += tickStep) {
              const tx = x1 + ux * d;
              const ty = y1 + uy * d;
              ctx.beginPath();
              ctx.moveTo(tx - nx * 3.1, ty - ny * 3.1);
              ctx.lineTo(tx + nx * 3.1, ty + ny * 3.1);
              ctx.stroke();
            }

            // Specular top-edge highlight bevel
            ctx.strokeStyle = "rgba(248, 250, 252, 0.42)";
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(x1 - nx * 1.4, y1 - ny * 1.4);
            ctx.lineTo(x2 - nx * 1.4, y2 - ny * 1.4);
            ctx.stroke();
            ctx.restore();

            wallPillars.push({ px: x1, py: y1 });
            wallPillars.push({ px: x2, py: y2 });
          }
        }

        // Sculpted stone corner pillar caps at wall intersections/endpoints
        for (let p = 0; p < wallPillars.length; p++) {
          const cap = wallPillars[p];
          ctx.fillStyle = "#0f172a";
          ctx.beginPath();
          ctx.arc(cap.px, cap.py, 6.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "#94a3b8";
          ctx.beginPath();
          ctx.arc(cap.px, cap.py, 4.2, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "#cbd5e1";
          ctx.beginPath();
          ctx.arc(cap.px - 0.8, cap.py - 0.8, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      },

      startLoop() {
        const tick = (now) => {
          this.renderFrame(now);
          this.animFrame = requestAnimationFrame(tick);
        };
        this.animFrame = requestAnimationFrame(tick);
      }
    };
  `;
}
