/* =============================================================
   SPIDER MODELS — modelos 3D procedurales estilo Spider-Verse
   ---------------------------------------------------------------
   · Anatomía modelada con superficies de revolución (torso esculpido,
     bíceps, antebrazos, muslos, gemelos).
   · Manos articuladas con 5 dedos (puño, mano abierta, gesto "thwip").
   · Sombreado "toon" de 4 tonos + contraluz de color + trama halftone
     en las sombras + contorno de tinta. Todo generado en el shader.
   · Trajes con texturas dibujadas en tiempo real (telaraña, collage punk…).

   Uso:  const kit = SpiderModels.create(THREE);
         const fig = kit.build(personaje);
   ============================================================= */
(function () {
    'use strict';

    function create(THREE) {

        /* ---------- Uniforms compartidos por todos los materiales ---------- */
        const shared = {
            uRim:      { value: new THREE.Color('#00e5ff') },
            uLightDir: { value: new THREE.Vector3(0.4, 0.7, 0.6).normalize() },
            uDot:      { value: 1 },
        };

        const ramp = new THREE.DataTexture(new Uint8Array([45, 115, 190, 255]), 4, 1, THREE.RedFormat);
        ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
        ramp.needsUpdate = true;

        const HALFTONE = `
            #include <dithering_fragment>
            vec3 nV = normalize(normal);
            float rimF = 1.0 - clamp(dot(nV, normalize(vViewPosition)), 0.0, 1.0);
            gl_FragColor.rgb += uRim * smoothstep(0.6, 0.66, rimF) * 0.6;
            float ndl = dot(nV, uLightDir);
            float shadowAmt = 1.0 - smoothstep(-0.2, 0.25, ndl);
            vec2 cell = mod(gl_FragCoord.xy, 5.0 * uDot) - 2.5 * uDot;
            float dotm = 1.0 - smoothstep(1.0 * uDot, 1.5 * uDot, length(cell));
            gl_FragColor.rgb *= 1.0 - 0.5 * dotm * shadowAmt;
        `;

        function toon({ color = '#ffffff', map = null, side = THREE.FrontSide } = {}) {
            const m = new THREE.MeshToonMaterial({
                color: map ? '#ffffff' : color, map, side, gradientMap: ramp,
            });
            m.onBeforeCompile = (sh) => {
                sh.uniforms.uRim = shared.uRim;
                sh.uniforms.uLightDir = shared.uLightDir;
                sh.uniforms.uDot = shared.uDot;
                sh.fragmentShader = 'uniform vec3 uRim;\nuniform vec3 uLightDir;\nuniform float uDot;\n'
                    + sh.fragmentShader.replace('#include <dithering_fragment>', HALFTONE);
            };
            m.customProgramCacheKey = () => 'sv-toon';
            return m;
        }

        /* Contorno de tinta: casco invertido desplazado por la normal */
        const outlineCache = {};
        function outlineMat(th) {
            if (outlineCache[th]) return outlineCache[th];
            const m = new THREE.MeshBasicMaterial({ color: 0x050508, side: THREE.BackSide });
            m.onBeforeCompile = (sh) => {
                sh.vertexShader = sh.vertexShader.replace(
                    '#include <begin_vertex>',
                    `vec3 transformed = position + normal * ${th.toFixed(4)};`
                );
            };
            m.customProgramCacheKey = () => 'sv-outline-' + th;
            outlineCache[th] = m;
            return m;
        }

        function part(geo, mat, th = 0.009) {
            const mesh = new THREE.Mesh(geo, mat);
            if (th > 0) mesh.add(new THREE.Mesh(geo, outlineMat(th)));
            return mesh;
        }

        /* ---------- Texturas del traje ---------- */
        function rng(seed) {
            return () => {
                seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
                let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
                t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
                return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
            };
        }

        function drawWeb(g, S, color, alpha = 1) {
            g.save();
            g.globalAlpha = alpha;
            g.strokeStyle = color;
            g.lineWidth = 4;
            g.lineCap = 'round';
            const cols = 16, rows = 13, cw = S / cols, rh = S / rows;
            for (let i = 0; i <= cols; i++) {
                g.beginPath(); g.moveTo(i * cw, 0); g.lineTo(i * cw, S); g.stroke();
            }
            for (let r = 1; r <= rows; r++) {
                for (let i = 0; i < cols; i++) {
                    g.beginPath();
                    g.moveTo(i * cw, r * rh);
                    g.quadraticCurveTo(i * cw + cw / 2, r * rh - rh * 0.3, (i + 1) * cw, r * rh);
                    g.stroke();
                }
            }
            g.restore();
        }

        const texCache = new Map();
        function suitTexture(spec) {
            const key = JSON.stringify(spec);
            if (texCache.has(key)) return texCache.get(key);

            const S = 1024;
            const cv = document.createElement('canvas');
            cv.width = cv.height = S;
            const g = cv.getContext('2d');
            const rand = rng(spec.seed || 7);

            g.fillStyle = spec.base;
            g.fillRect(0, 0, S, S);

            if (spec.pattern === 'punk') {
                const cols = ['#d7263d', '#1e3fae', '#f1ece0', '#0d0d0d', '#ffd23f', '#d7263d'];
                for (let i = 0; i < 80; i++) {
                    g.save();
                    g.translate(rand() * S, rand() * S);
                    g.rotate((rand() - 0.5) * 0.9);
                    const w = 60 + rand() * 230, h = 40 + rand() * 170;
                    g.fillStyle = cols[Math.floor(rand() * cols.length)];
                    g.fillRect(-w / 2, -h / 2, w, h);
                    if (rand() < 0.35) {
                        g.strokeStyle = 'rgba(0,0,0,.85)';
                        g.lineWidth = 7;
                        for (let k = -w / 2; k < w / 2; k += 20) {
                            g.beginPath(); g.moveTo(k, -h / 2); g.lineTo(k + 12, h / 2); g.stroke();
                        }
                    }
                    if (rand() < 0.25) {
                        g.fillStyle = 'rgba(0,0,0,.8)';
                        for (let y = -h / 2 + 8; y < h / 2 - 6; y += 12) g.fillRect(-w / 2 + 8, y, w * (0.4 + rand() * 0.5), 4);
                    }
                    g.restore();
                }
            }

            if (spec.web) drawWeb(g, S, spec.web, spec.webAlpha ?? 1);

            if (spec.sides) {
                const top = (spec.sidesTop ?? 0.3) * S;
                g.fillStyle = spec.sides;
                [[0.16, 0.34], [0.66, 0.84]].forEach(([a, b]) => g.fillRect(a * S, top, (b - a) * S, S - top));
                if (spec.trim) {
                    g.fillStyle = spec.trim;
                    [0.16, 0.34, 0.66, 0.84].forEach((a) => g.fillRect(a * S - 7, top, 14, S - top));
                }
            }

            const tex = new THREE.CanvasTexture(cv);
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            tex.anisotropy = 8;
            texCache.set(key, tex);
            return tex;
        }

        function suitMat(spec) {
            const plain = !spec.web && !spec.sides && !spec.pattern;
            return plain ? toon({ color: spec.base }) : toon({ map: suitTexture(spec) });
        }

        function emblemTexture(color) {
            const cv = document.createElement('canvas');
            cv.width = cv.height = 512;
            const g = cv.getContext('2d');
            g.scale(512 / 200, 512 / 200);
            g.strokeStyle = g.fillStyle = color;
            g.lineWidth = 8;
            g.lineCap = 'round';
            [
                [92, 92, 62, 66, 58, 24], [108, 92, 138, 66, 142, 24],
                [90, 102, 56, 96, 30, 64], [110, 102, 144, 96, 170, 64],
                [90, 116, 54, 124, 34, 162], [110, 116, 146, 124, 166, 162],
                [94, 128, 72, 150, 66, 192], [106, 128, 128, 150, 134, 192],
            ].forEach(([x0, y0, cx, cy, x1, y1]) => {
                g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(cx, cy, x1, y1); g.stroke();
            });
            g.beginPath(); g.ellipse(100, 114, 16, 31, 0, 0, Math.PI * 2); g.fill();
            g.beginPath(); g.arc(100, 76, 13, 0, Math.PI * 2); g.fill();
            const tex = new THREE.CanvasTexture(cv);
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.anisotropy = 8;
            return tex;
        }

        /* ---------- Geometría ---------- */
        const V2 = (r, y) => new THREE.Vector2(r, y);

        // Superficie de revolución con la costura en la espalda (phiStart = PI)
        function lathe(points, seg = 40, phiStart = Math.PI, phiLen = Math.PI * 2) {
            return new THREE.LatheGeometry(points.map(([r, y]) => V2(r, y)), seg, phiStart, phiLen);
        }

        // Extremidad con perfil muscular. keys: [[t, radio]] t=0 arriba, t=1 abajo
        function limbGeo(L, keys) {
            const rAt = (t) => {
                for (let i = 0; i < keys.length - 1; i++) {
                    const [t0, r0] = keys[i], [t1, r1] = keys[i + 1];
                    if (t >= t0 && t <= t1) {
                        const k = (t - t0) / (t1 - t0);
                        return r0 + (r1 - r0) * k * k * (3 - 2 * k);
                    }
                }
                return keys[keys.length - 1][1];
            };
            const rb = keys[keys.length - 1][1], rt = keys[0][1];
            const pts = [];
            for (let i = 0; i <= 6; i++) {
                const a = (i / 6) * Math.PI / 2;
                pts.push([rb * Math.sin(a), -L - rb * 0.6 * Math.cos(a)]);
            }
            const N = 24;
            for (let i = N - 1; i >= 1; i--) { const t = i / N; pts.push([rAt(t), -L * t]); }
            for (let i = 0; i <= 6; i++) {
                const a = (i / 6) * Math.PI / 2;
                pts.push([rt * Math.cos(a), rt * 0.6 * Math.sin(a)]);
            }
            return lathe(pts, 32);
        }

        function ellip(rx, ry, rz, ws = 28, hs = 20) {
            return new THREE.SphereGeometry(1, ws, hs).scale(rx, ry, rz);
        }

        function capsule(r, len) {
            return new THREE.CapsuleGeometry(r, len, 4, 10).translate(0, -len / 2 - r * 0.4, 0);
        }

        const gauss = (v, m, s) => Math.exp(-((v - m) ** 2) / (2 * s * s));

        const TORSO = [
            [0, -0.08], [0.17, -0.075], [0.212, -0.03], [0.222, 0.05], [0.203, 0.16],
            [0.214, 0.26], [0.248, 0.36], [0.288, 0.46], [0.314, 0.55], [0.31, 0.61],
            [0.272, 0.66], [0.17, 0.705], [0.09, 0.722], [0, 0.726],
        ];

        // Esculpe pecho, abdomen y espalda sobre el torso torneado
        function sculpt(geo, zScale = 0.68) {
            const p = geo.attributes.position;
            for (let i = 0; i < p.count; i++) {
                const x = p.getX(i), y = p.getY(i);
                let z = p.getZ(i) * zScale;
                if (z > 0) {
                    z *= 1 + 0.16 * gauss(y, 0.5, 0.09) + 0.06 * gauss(Math.abs(x), 0.1, 0.07) * gauss(y, 0.53, 0.06)
                           + 0.05 * gauss(y, 0.24, 0.08);
                } else {
                    z *= 1 + 0.1 * gauss(y, 0.5, 0.12);
                }
                p.setZ(i, z);
                p.setX(i, x * (1 + 0.05 * gauss(y, 0.42, 0.1)));
            }
            geo.computeVertexNormals();
            return geo;
        }

        // Lente del ojo: forma angular clásica
        const lensGeo = (() => {
            const s = new THREE.Shape();
            s.moveTo(0.015, 0.0);
            s.quadraticCurveTo(0.045, 0.08, 0.128, 0.062);
            s.quadraticCurveTo(0.148, 0.0, 0.112, -0.048);
            s.quadraticCurveTo(0.05, -0.064, 0.015, 0.0);
            const geo = new THREE.ExtrudeGeometry(s, {
                depth: 0.012, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.004, bevelSegments: 3, curveSegments: 24,
            });
            geo.center();
            return geo;
        })();

        /* ---------- Poses ---------- */
        const HANDS = {
            open:    [0.08, 0.1, 0.12, 0.14, 0.05],
            relaxed: [0.45, 0.55, 0.62, 0.72, 0.3],
            fist:    [1.5, 1.6, 1.6, 1.5, 0.95],
            thwip:   [0.04, 1.6, 1.6, 0.04, 0.1],
        };

        const POSES = {
            thwip: {
                rArm: [-1.55, 0.15, -0.12], rElbow: -0.05, rHand: 'thwip',
                lArm: [0.15, 0, 0.35], lElbow: -0.8, lHand: 'fist',
                lLeg: [0.1, 0.16], rLeg: [-0.12, -0.16], rKnee: 0.15, lean: 0.06, twist: -0.25, hy: 0.2,
            },
        };

        function flatten(p) {
            const o = {};
            const lA = p.lArm || [0, 0, 0.15], rA = p.rArm || [0, 0, -0.15];
            const lL = p.lLeg || [0, 0.05], rL = p.rLeg || [0, -0.05];
            o.lAx = lA[0]; o.lAy = lA[1]; o.lAz = lA[2];
            o.rAx = rA[0]; o.rAy = rA[1]; o.rAz = rA[2];
            o.lE = p.lElbow ?? -0.25; o.rE = p.rElbow ?? -0.25;
            o.lLx = lL[0]; o.lLz = lL[1]; o.rLx = rL[0]; o.rLz = rL[1];
            o.lK = p.lKnee ?? 0.05; o.rK = p.rKnee ?? 0.05;
            o.lean = p.lean ?? 0; o.twist = p.twist ?? 0; o.crouch = p.crouch ?? 0;
            o.hx = p.hx ?? 0; o.hy = p.hy ?? 0; o.hz = p.hz ?? 0;
            const lh = HANDS[p.lHand || 'relaxed'], rh = HANDS[p.rHand || 'relaxed'];
            lh.forEach((v, i) => { o['lf' + i] = v; });
            rh.forEach((v, i) => { o['rf' + i] = v; });
            return o;
        }

        /* ---------- Construcción del personaje ---------- */
        const BODY_Y = 0.96;

        function buildHand(side, mat) {
            const g = new THREE.Group();
            const palm = part(ellip(0.03, 0.056, 0.05), mat, 0.005);
            palm.position.y = -0.05;
            g.add(palm);

            const fingers = [];
            const zs = [0.032, 0.011, -0.011, -0.031];
            const lens = [0.032, 0.036, 0.033, 0.026];
            zs.forEach((z, i) => {
                const f = new THREE.Group();
                f.position.set(0, -0.096, z);
                g.add(f);
                f.add(part(capsule(0.0125, lens[i]), mat, 0.004));
                const mid = new THREE.Group();
                mid.position.y = -lens[i] - 0.012;
                f.add(mid);
                mid.add(part(capsule(0.0115, lens[i] * 0.85), mat, 0.004));
                fingers.push([f, mid]);
            });

            const thumb = new THREE.Group();
            thumb.position.set(-side * 0.012, -0.04, 0.045);
            g.add(thumb);
            thumb.add(part(capsule(0.013, 0.03), mat, 0.004));
            const tMid = new THREE.Group();
            tMid.position.y = -0.045;
            thumb.add(tMid);
            tMid.add(part(capsule(0.012, 0.024), mat, 0.004));

            return { group: g, fingers, thumb, tMid, side };
        }

        function poseHand(h, c) {
            h.fingers.forEach(([f, mid], i) => {
                f.rotation.z = -h.side * c[i];
                mid.rotation.z = -h.side * c[i] * 1.1;
            });
            h.thumb.rotation.set(-0.55 - c[4] * 0.3, 0, -h.side * (0.35 + c[4] * 0.7));
            h.tMid.rotation.z = -h.side * c[4] * 0.8;
        }

        function build(c) {
            const s = c.suit;
            const M = {};
            ['head', 'torso', 'arms', 'hands', 'legs', 'shins', 'feet'].forEach((k) => { M[k] = suitMat(s[k]); });

            const root = new THREE.Group();
            const pelvis = new THREE.Group();
            pelvis.position.y = BODY_Y;
            root.add(pelvis);

            const chest = new THREE.Group();
            pelvis.add(chest);

            // Torso esculpido + cadera
            chest.add(part(sculpt(lathe(TORSO, 56)), M.torso));
            const hips = part(ellip(0.21, 0.12, 0.14), M.legs);
            hips.position.y = -0.04;
            pelvis.add(hips);

            // Trapecios: suavizan la línea entre cuello y hombros
            const traps = part(ellip(0.25, 0.075, 0.12), M.torso);
            traps.position.set(0, 0.655, -0.02);
            chest.add(traps);

            // Emblemas pecho / espalda (plano curvado)
            function emblem(color, size, y, z, back) {
                const geo = new THREE.PlaneGeometry(size, size, 10, 10);
                const p = geo.attributes.position;
                for (let i = 0; i < p.count; i++) p.setZ(i, -(p.getX(i) ** 2) * 1.6);
                const mat = new THREE.MeshBasicMaterial({
                    map: emblemTexture(color), transparent: true, alphaTest: 0.35,
                    polygonOffset: true, polygonOffsetFactor: -2,
                });
                const mesh = new THREE.Mesh(geo, mat);
                mesh.position.set(0, y, z);
                if (back) mesh.rotation.y = Math.PI;
                chest.add(mesh);
            }
            emblem(s.emblem.color, s.emblem.size, s.emblem.y ?? 0.47, 0.238, false);
            if (s.emblem.back) emblem(s.emblem.back, s.emblem.size * 1.25, 0.45, -0.222, true);

            // Cuello
            const neck = part(lathe([[0, -0.02], [0.1, -0.01], [0.088, 0.07], [0.082, 0.15], [0, 0.16]], 24), M.head);
            neck.position.y = 0.69;
            chest.add(neck);

            // Cabeza
            const head = new THREE.Group();
            head.position.y = 1.02;
            head.scale.setScalar(0.82);
            chest.add(head);

            const HEAD = [
                [0, -0.27], [0.07, -0.265], [0.13, -0.24], [0.17, -0.19], [0.2, -0.12],
                [0.225, -0.03], [0.235, 0.06], [0.23, 0.14], [0.205, 0.21], [0.16, 0.26],
                [0.09, 0.292], [0, 0.302],
            ];
            const skullGeo = lathe(HEAD, 48);
            skullGeo.scale(0.96, 1, 1.04);
            head.add(part(skullGeo, M.head, 0.008));

            // Ojos: lente + borde de tinta grueso
            const rimMat = new THREE.MeshBasicMaterial({ color: 0x050508 });
            const lensMat = new THREE.MeshBasicMaterial({ color: s.eyes });
            [-1, 1].forEach((side) => {
                const eye = new THREE.Group();
                eye.position.set(side * 0.09, 0.045, 0.214);
                eye.rotation.set(-0.1, side * 0.42, side * 0.08);
                eye.scale.x = side;
                head.add(eye);
                const rim = new THREE.Mesh(lensGeo, rimMat);
                rim.scale.set(1.28, 1.34, 0.6);
                rim.position.z = -0.003;
                eye.add(rim);
                const lens = new THREE.Mesh(lensGeo, lensMat);
                lens.position.z = 0.003;
                eye.add(lens);
            });

            // Brazos
            const rig = { pelvis, chest, head, hands: {} };
            [['l', 1], ['r', -1]].forEach(([k, side]) => {
                const shoulder = new THREE.Group();
                shoulder.position.set(side * 0.35, 0.6, -0.005);
                chest.add(shoulder);
                shoulder.add(part(ellip(0.108, 0.1, 0.1), M.torso));
                shoulder.add(part(limbGeo(0.3, [[0, 0.086], [0.35, 0.082], [0.62, 0.07], [1, 0.058]]), M.arms));

                const elbow = new THREE.Group();
                elbow.position.y = -0.32;
                shoulder.add(elbow);
                elbow.add(part(limbGeo(0.27, [[0, 0.06], [0.25, 0.067], [0.6, 0.055], [1, 0.043]]), M.arms));

                const wrist = new THREE.Group();
                wrist.position.y = -0.29;
                elbow.add(wrist);
                const hand = buildHand(side, M.hands);
                wrist.add(hand.group);

                const hip = new THREE.Group();
                hip.position.set(side * 0.11, -0.03, 0);
                pelvis.add(hip);
                hip.add(part(limbGeo(0.42, [[0, 0.116], [0.3, 0.108], [0.72, 0.086], [1, 0.072]]), M.legs));

                const knee = new THREE.Group();
                knee.position.y = -0.445;
                hip.add(knee);
                knee.add(part(limbGeo(0.4, [[0, 0.074], [0.28, 0.085], [0.65, 0.062], [1, 0.05]]), M.shins));

                const ankle = new THREE.Group();
                ankle.position.y = -0.425;
                knee.add(ankle);
                const foot = part(ellip(0.064, 0.052, 0.13), M.feet);
                foot.position.set(0, -0.02, 0.055);
                ankle.add(foot);

                rig[k] = { shoulder, elbow, wrist, hip, knee, ankle };
                rig.hands[k] = hand;
            });

            /* ----- Accesorios por personaje ----- */
            const extras = s.extras || [];

            if (extras.includes('hood')) {
                const hoodGeo = new THREE.SphereGeometry(0.272, 48, 28, Math.PI * 0.84, Math.PI * 1.32, 0, Math.PI * 0.68);
                hoodGeo.scale(1, 1.14, 1.1);
                const hood = part(hoodGeo, toon({ color: s.hood.outside }), 0.008);
                hood.add(new THREE.Mesh(hoodGeo, toon({ color: s.hood.inside, side: THREE.BackSide })));
                hood.position.set(0, 0.03, -0.02);
                hood.rotation.x = -0.12;
                head.add(hood);
            }

            if (extras.includes('mohawk')) {
                const hairMat = toon({ color: '#121212' });
                for (let i = 0; i < 7; i++) {
                    const a = -0.55 + i * 0.37;
                    const h = 0.2 - Math.abs(i - 2.5) * 0.022;
                    const cone = part(new THREE.ConeGeometry(0.045, h, 10).translate(0, h / 2, 0), hairMat, 0.006);
                    cone.position.set(0, 0.02 + 0.27 * Math.cos(a), -0.27 * Math.sin(a));
                    cone.rotation.x = -a;
                    head.add(cone);
                }
            }

            if (extras.includes('vest')) {
                const vestPts = TORSO.filter(([, y]) => y > 0.08 && y < 0.7).map(([r, y]) => [r * 1.08 + 0.012, y]);
                vestPts.unshift([0.235, 0.06]);
                const vestGeo = sculpt(lathe(vestPts, 56, 0.5, Math.PI * 2 - 1.0), 0.72);
                const vest = part(vestGeo, toon({ color: s.vest, side: THREE.DoubleSide }), 0.007);
                chest.add(vest);
                const metal = toon({ color: '#c9ccd6' });
                [-1, 1].forEach((side) => {
                    for (let i = 0; i < 3; i++) {
                        const spike = part(new THREE.ConeGeometry(0.02, 0.09, 8).translate(0, 0.045, 0), metal, 0.004);
                        spike.position.set(side * (0.22 + i * 0.045), 0.665 - i * 0.012, 0.02 - i * 0.01);
                        spike.rotation.z = -side * (0.35 + i * 0.25);
                        chest.add(spike);
                    }
                });
            }

            if (extras.includes('belt')) {
                const gold = toon({ color: s.gold });
                const belt = part(new THREE.TorusGeometry(0.218, 0.022, 10, 48).rotateX(Math.PI / 2).scale(1, 1, 0.75), gold, 0.005);
                belt.position.y = 0.03;
                chest.add(belt);
            }

            if (extras.includes('wristbands')) {
                const gold = toon({ color: s.gold });
                ['l', 'r'].forEach((k) => {
                    const band = part(new THREE.TorusGeometry(0.048, 0.013, 8, 24).rotateX(Math.PI / 2), gold, 0.004);
                    band.position.y = -0.23;
                    rig[k].elbow.add(band);
                });
            }

            /* ----- Animación ----- */
            let target = flatten(c.poses.reposo);
            const state = { ...target };
            let lastTick = -1;

            function setPose(p, instant = false) {
                target = flatten(p);
                if (instant) Object.assign(state, target);
            }

            function apply(t) {
                const br = Math.sin(t * 2.2), sw = Math.sin(t * 1.1);
                const L = rig.l, R = rig.r;
                L.shoulder.rotation.set(state.lAx + br * 0.03, state.lAy, state.lAz + br * 0.02);
                R.shoulder.rotation.set(state.rAx - br * 0.03, state.rAy, state.rAz - br * 0.02);
                L.elbow.rotation.x = state.lE;
                R.elbow.rotation.x = state.rE;
                L.hip.rotation.set(state.lLx, 0, state.lLz);
                R.hip.rotation.set(state.rLx, 0, state.rLz);
                L.knee.rotation.x = state.lK;
                R.knee.rotation.x = state.rK;
                L.ankle.rotation.set(-(state.lLx + state.lK) * 0.9, 0, -state.lLz * 0.8);
                R.ankle.rotation.set(-(state.rLx + state.rK) * 0.9, 0, -state.rLz * 0.8);
                chest.rotation.set(state.lean, state.twist + sw * 0.03, sw * 0.02);
                chest.scale.set(1 + br * 0.006, 1, 1 + br * 0.01);
                pelvis.position.y = BODY_Y + state.crouch + br * 0.006;
                head.rotation.set(state.hx, state.hy + sw * 0.1, state.hz);
                poseHand(rig.hands.l, [state.lf0, state.lf1, state.lf2, state.lf3, state.lf4]);
                poseHand(rig.hands.r, [state.rf0, state.rf1, state.rf2, state.rf3, state.rf4]);
            }

            // tick: tiempo cuantizado a 12 fps (animación "a dos")
            function update(tick) {
                if (tick !== lastTick) {
                    lastTick = tick;
                    for (const key in target) state[key] += (target[key] - state[key]) * 0.38;
                }
                apply(tick);
            }

            apply(0);

            return { root, rig, setPose, update };
        }

        return { build, shared, POSES };
    }

    window.SpiderModels = { create };
})();
