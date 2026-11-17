/**
 * Foundry-Grade 3D Polyhedral Physics Dice Engine (Three.js + 2D Canvas Fallback)
 * Renders tumbling d4, d6, d8, d10, d12, and d20 meshes across the VTT viewport
 * with crisp engraved face numbers (1..N), target-face landing alignment,
 * boundary collisions, crit sparkle particle bursts, and multi-screen SSE sync.
 */

export function renderDice3DOverlayHtml(): string {
  return `
  <!-- FOUNDRY-STYLE 3D DICE OVERLAY CANVAS -->
  <div id="dice-3d-overlay" class="hidden fixed inset-0 pointer-events-none z-[60] flex flex-col items-center justify-end pb-12 sm:pb-16">
    <canvas id="dice-3d-canvas" class="absolute inset-0 w-full h-full pointer-events-none"></canvas>
    <div id="dice-3d-banner" style="background-color: rgba(15, 23, 42, 0.96); color: #f8fafc;" class="hidden relative z-10 px-6 py-4 rounded-3xl border-2 shadow-2xl backdrop-blur-md text-center transition-all duration-300 transform scale-95 opacity-0 max-w-md mx-4">
      <div id="dice-3d-banner-hero" style="color: #fcd34d;" class="text-xs font-bold uppercase tracking-wider"></div>
      <div class="flex items-center justify-center gap-3 my-1">
        <span id="dice-3d-banner-die" style="background-color: rgba(0, 0, 0, 0.45); color: #ffffff;" class="px-2.5 py-1 rounded-xl border border-white/20 text-xs font-mono font-bold"></span>
        <span id="dice-3d-banner-total" style="color: #ffffff;" class="text-4xl sm:text-5xl font-black tracking-tight tabular-nums drop-shadow-lg"></span>
      </div>
      <div id="dice-3d-banner-detail" style="color: #e2e8f0;" class="text-xs font-semibold"></div>
      <div id="dice-3d-banner-badge" class="mt-1.5 inline-block px-3 py-0.5 rounded-full text-xs font-extrabold"></div>
    </div>
  </div>`;
}

export function renderDice3DEngineScript(): string {
  return `
    /* ==========================================================
       2B. FOUNDRY 3D PHYSICS DICE ENGINE (Three.js + Fallback)
       ========================================================== */
    const Dice3DEngine = {
      scene: null,
      camera: null,
      renderer: null,
      activeMesh: null,
      activeEdges: null,
      particles: [],
      animFrame: null,
      hideTimeout: null,
      useWebGL: false,
      initialized: false,

      init() {
        if (this.initialized) return;
        this.initialized = true;
        const canvas = document.getElementById("dice-3d-canvas");
        if (!canvas) return;

        if (typeof window.THREE !== "undefined") {
          try {
            const THREE = window.THREE;
            this.scene = new THREE.Scene();
            this.camera = new THREE.PerspectiveCamera(
              42,
              window.innerWidth / Math.max(1, window.innerHeight),
              0.1,
              100
            );
            this.camera.position.set(0, 2.2, 11.5);
            this.camera.lookAt(0, -0.3, 0);

            this.renderer = new THREE.WebGLRenderer({
              canvas,
              alpha: true,
              antialias: true,
            });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

            const ambient = new THREE.AmbientLight(0xffffff, 0.9);
            this.scene.add(ambient);

            const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.5);
            keyLight.position.set(6, 12, 8);
            this.scene.add(keyLight);

            const rimLight = new THREE.PointLight(0xf59e0b, 2.2, 25);
            rimLight.position.set(-5, 4, 4);
            this.scene.add(rimLight);

            window.addEventListener("resize", () => {
              if (!this.renderer || !this.camera) return;
              this.camera.aspect = window.innerWidth / Math.max(1, window.innerHeight);
              this.camera.updateProjectionMatrix();
              this.renderer.setSize(window.innerWidth, window.innerHeight);
            });

            this.useWebGL = true;
          } catch (err) {
            this.useWebGL = false;
          }
        }
      },

      createD10Geometry() {
        const THREE = window.THREE;
        // Clean 10-sided pentagonal bipyramid (5 upper + 5 lower crisp planar faces)
        const vertices = [];
        const indices = [];
        const sides = 5;
        const radius = 1.2;
        const h = 1.32;

        // Top pole (0) and Bottom pole (1)
        vertices.push(0, h, 0);
        vertices.push(0, -h, 0);

        for (let i = 0; i < sides; i++) {
          const angle = (i * 2 * Math.PI) / sides;
          vertices.push(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
        }

        for (let i = 0; i < sides; i++) {
          const curr = 2 + i;
          const next = 2 + ((i + 1) % sides);
          indices.push(0, next, curr);
          indices.push(1, curr, next);
        }

        const geom = new THREE.BufferGeometry();
        geom.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
        geom.setIndex(indices);
        geom.computeVertexNormals();
        return geom;
      },

      createDieGeometry(dieType) {
        const THREE = window.THREE;
        switch (dieType) {
          case "d4":
            return new THREE.TetrahedronGeometry(1.3);
          case "d6":
            return new THREE.BoxGeometry(1.45, 1.45, 1.45);
          case "d8":
            return new THREE.OctahedronGeometry(1.3);
          case "d10":
            return this.createD10Geometry();
          case "d12":
            return new THREE.DodecahedronGeometry(1.18);
          case "d20":
          default:
            return new THREE.IcosahedronGeometry(1.3);
        }
      },

      createNumberTexture(numValue, isTargetFace, isCrit) {
        const THREE = window.THREE;
        const canvas = document.createElement("canvas");
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext("2d");

        ctx.clearRect(0, 0, 256, 256);

        // Subtle recessed circular medallion on target or crits for legibility
        if (isTargetFace && isCrit) {
          ctx.beginPath();
          ctx.arc(128, 128, 92, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(250, 204, 21, 0.25)";
          ctx.fill();
        }

        const label = String(numValue);
        ctx.font = label.length >= 2 ? "900 112px system-ui, sans-serif" : "900 132px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Strong dark outline so engraved numerals pop against any color die
        ctx.lineJoin = "round";
        ctx.lineWidth = 18;
        ctx.strokeStyle = "rgba(9, 13, 22, 0.92)";
        ctx.strokeText(label, 128, 128);

        ctx.fillStyle = isTargetFace && isCrit ? "#fef08a" : "#ffffff";
        ctx.fillText(label, 128, 128);

        // Standard polyhedral 6. / 9. orientation underline bar
        if (numValue === 6 || numValue === 9) {
          ctx.fillStyle = isTargetFace && isCrit ? "#fef08a" : "#ffffff";
          ctx.strokeStyle = "rgba(9, 13, 22, 0.92)";
          ctx.lineWidth = 8;
          ctx.strokeRect(102, 198, 52, 10);
          ctx.fillRect(102, 198, 52, 10);
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.anisotropy = 4;
        texture.needsUpdate = true;
        return texture;
      },

      extractDistinctFacePlanes(geometry) {
        const THREE = window.THREE;
        const nonIndexed = geometry.index ? geometry.toNonIndexed() : geometry;
        const pos = nonIndexed.getAttribute("position");
        const groups = [];

        const a = new THREE.Vector3();
        const b = new THREE.Vector3();
        const c = new THREE.Vector3();
        const ab = new THREE.Vector3();
        const ac = new THREE.Vector3();

        for (let i = 0; i < pos.count; i += 3) {
          a.fromBufferAttribute(pos, i);
          b.fromBufferAttribute(pos, i + 1);
          c.fromBufferAttribute(pos, i + 2);

          ab.subVectors(b, a);
          ac.subVectors(c, a);
          const normal = new THREE.Vector3().crossVectors(ab, ac).normalize();
          const triCenter = new THREE.Vector3().add(a).add(b).add(c).divideScalar(3);

          // Group coplanar triangles (e.g. 2 triangles per face on d6, 3 per face on d12)
          let matched = null;
          for (const g of groups) {
            if (g.normal.dot(normal) > 0.985) {
              matched = g;
              break;
            }
          }

          if (matched) {
            matched.centers.push(triCenter);
          } else {
            groups.push({ normal, centers: [triCenter] });
          }
        }

        return groups.map((g) => {
          const avg = new THREE.Vector3();
          for (const pt of g.centers) avg.add(pt);
          avg.divideScalar(g.centers.length);
          // Ensure normal points outward from origin
          if (avg.dot(g.normal) < 0) {
            g.normal.negate();
          }
          return { center: avg, normal: g.normal };
        });
      },

      attachFaceNumbers(mesh, geometry, dieType, rawRoll, isCrit) {
        const THREE = window.THREE;
        const faces = this.extractDistinctFacePlanes(geometry);
        if (!faces || faces.length === 0) return null;

        const maxVal = faces.length;
        const targetValue = Math.max(1, Math.min(maxVal, Number(rawRoll) || maxVal));

        // Build full 1..N number pool so targetValue sits on face 0 and others fill remaining faces
        const numbers = [targetValue];
        for (let v = 1; v <= maxVal; v++) {
          if (v !== targetValue) numbers.push(v);
        }

        const sizeMap = {
          d4: 0.68,
          d6: 1.0,
          d8: 0.7,
          d10: 0.66,
          d12: 0.72,
          d20: 0.52,
        };
        const decalSize = sizeMap[dieType] || 0.58;
        const decalGeom = new THREE.PlaneGeometry(decalSize, decalSize);

        let targetLocalQuat = null;
        for (let i = 0; i < faces.length; i++) {
          const face = faces[i];
          const numVal = numbers[i % numbers.length];
          const texture = this.createNumberTexture(numVal, i === 0, !!isCrit);
          const decalMat = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -2,
          });
          const decal = new THREE.Mesh(decalGeom, decalMat);
          if (Math.abs(face.normal.y) > 0.9) {
            decal.up.set(0, 0, 1);
          }
          decal.position.copy(face.center).addScaledVector(face.normal, 0.022);
          decal.lookAt(face.center.clone().addScaledVector(face.normal, 2.0));
          mesh.add(decal);
          if (i === 0) {
            targetLocalQuat = decal.quaternion.clone();
          }
        }

        return targetLocalQuat;
      },

      clearScene() {
        if (this.animFrame) {
          cancelAnimationFrame(this.animFrame);
          this.animFrame = null;
        }
        if (this.hideTimeout) {
          clearTimeout(this.hideTimeout);
          this.hideTimeout = null;
        }
        if (this.useWebGL && this.scene) {
          if (this.activeMesh) {
            this.scene.remove(this.activeMesh);
            this.activeMesh.traverse((obj) => {
              if (obj.geometry) obj.geometry.dispose();
              if (obj.material) {
                if (obj.material.map) obj.material.map.dispose();
                obj.material.dispose();
              }
            });
            this.activeMesh = null;
          }
          for (const p of this.particles) {
            this.scene.remove(p.mesh);
            p.mesh.geometry.dispose();
            p.mesh.material.dispose();
          }
          this.particles = [];
        }
      },

      spawnParticles(origin, isCrit, colorHex) {
        if (!this.useWebGL || !this.scene) return;
        const THREE = window.THREE;
        const count = isCrit ? 38 : 18;
        const palette = isCrit
          ? [0xfef08a, 0xf59e0b, 0x38bdf8, 0xf472b6, 0x34d399]
          : [new THREE.Color(colorHex || "#f59e0b").getHex(), 0xfef08a, 0xffffff];

        for (let i = 0; i < count; i++) {
          const geom = new THREE.OctahedronGeometry(isCrit ? 0.13 : 0.09);
          const mat = new THREE.MeshBasicMaterial({
            color: palette[i % palette.length],
            transparent: true,
            opacity: 1,
          });
          const mesh = new THREE.Mesh(geom, mat);
          mesh.position.copy(origin);
          const angle = Math.random() * Math.PI * 2;
          const speed = (isCrit ? 4.5 : 2.8) + Math.random() * 5.0;
          const vy = 3.5 + Math.random() * 6.5;
          this.scene.add(mesh);
          this.particles.push({
            mesh,
            vx: Math.cos(angle) * speed,
            vy,
            vz: Math.sin(angle) * speed,
            life: 1.0,
          });
        }
      },

      showBanner(opts) {
        const banner = document.getElementById("dice-3d-banner");
        const heroEl = document.getElementById("dice-3d-banner-hero");
        const dieEl = document.getElementById("dice-3d-banner-die");
        const totalEl = document.getElementById("dice-3d-banner-total");
        const detailEl = document.getElementById("dice-3d-banner-detail");
        const badgeEl = document.getElementById("dice-3d-banner-badge");
        if (!banner) return;

        heroEl.innerText = (opts.heroName || "Hero") + " • " + (opts.actionTitle || "Roll");
        dieEl.innerText = (opts.die || "d20").toUpperCase();
        totalEl.innerText = String(opts.total ?? opts.rawRoll ?? "?");

        const modVal = Number(opts.modifier || 0);
        const modText = modVal > 0 ? " + " + modVal + " bonus" : modVal < 0 ? " " + modVal : "";
        detailEl.innerText = "Natural Roll: " + opts.rawRoll + modText;

        if (opts.isCrit) {
          banner.className =
            "relative z-10 px-6 py-4 rounded-3xl border-2 border-amber-300 bg-gradient-to-br from-amber-950/95 via-stone-900/95 to-amber-900/95 shadow-2xl backdrop-blur-md text-center transition-all duration-300 transform scale-100 opacity-100 max-w-md mx-4";
          badgeEl.className =
            "mt-1.5 inline-block px-3 py-0.5 rounded-full text-xs font-extrabold bg-amber-400 text-slate-950 animate-pulse";
          badgeEl.innerText = "✨ CRITICAL HEROIC ROLL!";
        } else if (opts.succeeded === false) {
          banner.className =
            "relative z-10 px-6 py-4 rounded-3xl border-2 border-amber-500/70 bg-slate-900/95 shadow-2xl backdrop-blur-md text-center transition-all duration-300 transform scale-100 opacity-100 max-w-md mx-4";
          badgeEl.className =
            "mt-1.5 inline-block px-3 py-0.5 rounded-full text-xs font-extrabold bg-amber-500/30 text-amber-200 border border-amber-400/40";
          badgeEl.style.color = "#fde68a";
          badgeEl.innerText = "😄 Fail Forward! Silly Twist!";
        } else {
          banner.className =
            "relative z-10 px-6 py-4 rounded-3xl border-2 border-emerald-400 bg-slate-900/95 shadow-2xl backdrop-blur-md text-center transition-all duration-300 transform scale-100 opacity-100 max-w-md mx-4";
          badgeEl.className =
            "mt-1.5 inline-block px-3 py-0.5 rounded-full text-xs font-extrabold bg-emerald-500 text-slate-950";
          badgeEl.style.color = "#020617";
          badgeEl.innerText = opts.succeeded === true ? "✅ HEROIC SUCCESS!" : "🎲 ROLLED!";
        }

        banner.classList.remove("hidden");
      },

      hideOverlayLater(delayMs) {
        this.hideTimeout = setTimeout(() => {
          const overlay = document.getElementById("dice-3d-overlay");
          const banner = document.getElementById("dice-3d-banner");
          if (banner) {
            banner.classList.add("opacity-0", "scale-95");
            banner.classList.add("hidden");
          }
          if (overlay) {
            overlay.classList.add("hidden");
          }
          this.clearScene();
        }, delayMs || 2600);
      },

      rollDie(opts) {
        this.init();
        this.clearScene();

        const overlay = document.getElementById("dice-3d-overlay");
        const banner = document.getElementById("dice-3d-banner");
        if (overlay) overlay.classList.remove("hidden");
        if (banner) {
          banner.classList.add("hidden", "opacity-0", "scale-95");
        }

        if (typeof AudioEngine !== "undefined") {
          AudioEngine.playDiceRoll();
        }

        if (!this.useWebGL || !this.scene || !this.renderer) {
          this.run2DFallbackRoll(opts);
          return;
        }

        const THREE = window.THREE;
        const dieType = opts.die || "d20";
        const geometry = this.createDieGeometry(dieType);
        const baseColor = new THREE.Color(opts.color || "#f59e0b");
        const material = new THREE.MeshStandardMaterial({
          color: baseColor,
          metalness: 0.35,
          roughness: 0.24,
          emissive: baseColor.clone().multiplyScalar(0.16),
        });

        const mesh = new THREE.Mesh(geometry, material);
        const edgesGeom = new THREE.EdgesGeometry(geometry);
        const edgesMat = new THREE.LineBasicMaterial({
          color: opts.isCrit ? 0xfef08a : 0xffffff,
          linewidth: 2,
        });
        const wireframe = new THREE.LineSegments(edgesGeom, edgesMat);
        mesh.add(wireframe);

        // Stamp crisp engraved numbers (1..N) onto every face, with opts.rawRoll on face 0
        const targetLocalQuat = this.attachFaceNumbers(
          mesh,
          geometry,
          dieType,
          opts.rawRoll,
          opts.isCrit
        );

        // Launch from left or right edge
        const fromLeft = Math.random() < 0.5;
        mesh.position.set(fromLeft ? -4.5 : 4.5, 2.6, 1.4);
        this.scene.add(mesh);
        this.activeMesh = mesh;

        let vx = fromLeft ? 5.2 + Math.random() * 2.2 : -(5.2 + Math.random() * 2.2);
        let vy = 4.2 + Math.random() * 1.8;
        let vz = -1.6 + (Math.random() - 0.5) * 1.6;
        let rx = (Math.random() - 0.5) * 14;
        let ry = (Math.random() - 0.5) * 14;
        let rz = (Math.random() - 0.5) * 14;

        const floorY = -1.1;
        let settled = false;
        let targetQuat = null;
        let lastTime = performance.now();
        const startTime = lastTime;

        const animate = (now) => {
          const dt = Math.min(0.05, (now - lastTime) / 1000);
          lastTime = now;
          const elapsed = (now - startTime) / 1000;

          if (this.activeMesh) {
            if (!settled) {
              vy -= 32 * dt;
              this.activeMesh.position.x += vx * dt;
              this.activeMesh.position.y += vy * dt;
              this.activeMesh.position.z += vz * dt;

              // Wall bounds
              if (this.activeMesh.position.x > 4.4) {
                this.activeMesh.position.x = 4.4;
                vx = -Math.abs(vx) * 0.7;
              } else if (this.activeMesh.position.x < -4.4) {
                this.activeMesh.position.x = -4.4;
                vx = Math.abs(vx) * 0.7;
              }
              if (this.activeMesh.position.z > 2.2) {
                this.activeMesh.position.z = 2.2;
                vz = -Math.abs(vz) * 0.7;
              } else if (this.activeMesh.position.z < -2.2) {
                this.activeMesh.position.z = -2.2;
                vz = Math.abs(vz) * 0.7;
              }

              // Floor bounce
              if (this.activeMesh.position.y <= floorY) {
                this.activeMesh.position.y = floorY;
                vy = Math.abs(vy) * 0.52;
                vx *= 0.78;
                vz *= 0.78;
                rx *= 0.74;
                ry *= 0.74;
                rz *= 0.74;
              }

              this.activeMesh.rotation.x += rx * dt;
              this.activeMesh.rotation.y += ry * dt;
              this.activeMesh.rotation.z += rz * dt;

              if (elapsed > 1.05) {
                settled = true;
                this.activeMesh.position.y = floorY + 0.45;
                if (targetLocalQuat) {
                  const m = new THREE.Matrix4().lookAt(
                    this.camera.position,
                    this.activeMesh.position,
                    new THREE.Vector3(0, 1, 0)
                  );
                  const camFacingQuat = new THREE.Quaternion().setFromRotationMatrix(m);
                  targetQuat = camFacingQuat.multiply(targetLocalQuat.clone().invert());
                }
                if (opts.isCrit || opts.succeeded !== false) {
                  this.spawnParticles(this.activeMesh.position, !!opts.isCrit, opts.color);
                }
                this.showBanner(opts);
                if (typeof AudioEngine !== "undefined") {
                  if (opts.succeeded === false) {
                    AudioEngine.playFailForwardBoing();
                  } else {
                    AudioEngine.playSuccessChime();
                  }
                }
                this.hideOverlayLater(2600);
              }
            } else {
              // Smoothly rotate settled die so the exact rolled face aims straight at the player
              if (targetQuat) {
                this.activeMesh.quaternion.slerp(targetQuat, Math.min(1, dt * 8));
              }
              this.activeMesh.position.x += (0 - this.activeMesh.position.x) * Math.min(1, dt * 5);
              this.activeMesh.position.y = floorY + 0.6 + Math.sin(elapsed * 4.5) * 0.08;
            }
          }

          // Update particles
          for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.vy -= 18 * dt;
            p.mesh.position.x += p.vx * dt;
            p.mesh.position.y += p.vy * dt;
            p.mesh.position.z += p.vz * dt;
            p.mesh.rotation.x += 5 * dt;
            p.mesh.rotation.y += 6 * dt;
            p.life -= dt * 1.1;
            p.mesh.material.opacity = Math.max(0, p.life);
            if (p.life <= 0) {
              this.scene.remove(p.mesh);
              p.mesh.geometry.dispose();
              p.mesh.material.dispose();
              this.particles.splice(i, 1);
            }
          }

          this.renderer.render(this.scene, this.camera);
          this.animFrame = requestAnimationFrame(animate);
        };

        this.animFrame = requestAnimationFrame(animate);
      },

      run2DFallbackRoll(opts) {
        const canvas = document.getElementById("dice-3d-canvas");
        if (!canvas) {
          this.showBanner(opts);
          this.hideOverlayLater(2600);
          return;
        }
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const ctx = canvas.getContext("2d");
        const start = performance.now();
        let shown = false;

        const die = opts.die || "d20";
        const maxFace = die === "d4" ? 4 : die === "d6" ? 6 : die === "d8" ? 8 : die === "d10" ? 10 : die === "d12" ? 12 : 20;
        const sides = die === "d4" ? 3 : die === "d6" ? 4 : die === "d8" ? 4 : die === "d12" ? 5 : 6;

        const drawFrame = (now) => {
          const t = (now - start) / 1000;
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const cx = canvas.width * (0.2 + Math.min(0.3, t * 0.3));
          const bounce = Math.abs(Math.sin(t * 7.5)) * Math.max(0, 1 - t) * 140;
          const cy = canvas.height * 0.5 - bounce;
          const radius = 62;
          const angle = t < 1.0 ? t * 11 : Math.sin(t * 2) * 0.1;

          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(angle);
          ctx.beginPath();
          for (let i = 0; i < sides; i++) {
            const a = (i * 2 * Math.PI) / sides;
            const px = Math.cos(a) * radius;
            const py = Math.sin(a) * radius;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fillStyle = opts.color || "#f59e0b";
          ctx.fill();
          ctx.lineWidth = 4;
          ctx.strokeStyle = opts.isCrit ? "#fef08a" : "#ffffff";
          ctx.stroke();

          // Render tumbling face numbers before settling, then lock on opts.rawRoll
          const faceNum = t < 1.0
            ? ((Math.floor(t * 14) % maxFace) + 1)
            : (opts.rawRoll ?? maxFace);
          ctx.font = "900 34px system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.lineWidth = 6;
          ctx.strokeStyle = "rgba(9, 13, 22, 0.9)";
          ctx.strokeText(String(faceNum), 0, 2);
          ctx.fillStyle = opts.isCrit ? "#fef08a" : "#ffffff";
          ctx.fillText(String(faceNum), 0, 2);
          ctx.restore();

          if (t >= 1.0 && !shown) {
            shown = true;
            this.showBanner(opts);
            this.hideOverlayLater(2500);
          }
          this.animFrame = requestAnimationFrame(drawFrame);
        };
        this.animFrame = requestAnimationFrame(drawFrame);
      }
    };
  `;
}
