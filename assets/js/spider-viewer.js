/* =============================================================
   SPIDER VIEWER — escena 3D reutilizable (portada y personajes)
   ============================================================= */
(function () {
    'use strict';

    function create(o) {
        const { THREE, OrbitControls, GLTFLoader, canvas, stage, characters } = o;
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        let renderer;
        try {
            renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: !!o.snapshots });
        } catch (err) {
            stage.classList.add('no-webgl', 'ready');
            return null;
        }

        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
        const HOME = { pos: new THREE.Vector3(0.9, 1.45, o.distance || 5.6), target: new THREE.Vector3(0, 1.08, 0) };
        camera.position.copy(HOME.pos);

        const controls = new OrbitControls(camera, canvas);
        controls.target.copy(HOME.target);
        controls.enablePan = false;
        controls.enableDamping = true;
        controls.minDistance = 2.4;
        controls.maxDistance = 8;
        controls.minPolarAngle = Math.PI * 0.18;
        controls.maxPolarAngle = Math.PI * 0.58;
        controls.autoRotate = !reduce;
        controls.autoRotateSpeed = 1.1;
        controls.update();

        /* Luces */
        scene.add(new THREE.AmbientLight(0xffffff, 0.55));
        const key = new THREE.DirectionalLight(0xffffff, 2.6);
        key.position.set(2.5, 5, 4);
        scene.add(key);
        const rim = new THREE.DirectionalLight(0xff1744, 3.2);
        rim.position.set(-4, 3, -4);
        scene.add(rim);
        const fill = new THREE.DirectionalLight(0x00e5ff, 1.0);
        fill.position.set(-4, 1, 3);
        scene.add(fill);

        /* Portal bajo los pies */
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xff1744, side: THREE.DoubleSide });
        const ring = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.07, 96), ringMat);
        ring.rotation.x = -Math.PI / 2;
        scene.add(ring);

        const ring2Mat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
        const ring2 = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.225, 6), ring2Mat);
        ring2.rotation.x = -Math.PI / 2;
        scene.add(ring2);

        const ticks = new THREE.Group();
        for (let i = 0; i < 24; i++) {
            const tick = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.12), ringMat);
            const a = (i / 24) * Math.PI * 2;
            tick.position.set(Math.cos(a) * 1.35, 0.002, Math.sin(a) * 1.35);
            tick.rotation.set(-Math.PI / 2, 0, -a + Math.PI / 2);
            ticks.add(tick);
        }
        scene.add(ticks);

        const shadow = new THREE.Mesh(
            new THREE.CircleGeometry(0.6, 48),
            new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55 })
        );
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.y = 0.004;
        scene.add(shadow);

        /* Partículas dimensionales */
        const COUNT = 320;
        const positions = new Float32Array(COUNT * 3);
        const speeds = new Float32Array(COUNT);
        for (let i = 0; i < COUNT; i++) {
            const a = Math.random() * Math.PI * 2;
            const r = 0.9 + Math.random() * 2;
            positions[i * 3] = Math.cos(a) * r;
            positions[i * 3 + 1] = Math.random() * 3.2;
            positions[i * 3 + 2] = Math.sin(a) * r;
            speeds[i] = 0.15 + Math.random() * 0.55;
        }
        const pGeo = new THREE.BufferGeometry();
        pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const pMat = new THREE.PointsMaterial({ color: 0xff1744, size: 0.04, transparent: true, opacity: 0.85 });
        scene.add(new THREE.Points(pGeo, pMat));

        /* Telaraña disparada (pose thwip) */
        const webGeo = new THREE.CylinderGeometry(0.012, 0.012, 1, 8).translate(0, 0.5, 0);
        const webMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true });
        const web = new THREE.Mesh(webGeo, webMat);
        web.visible = false;
        scene.add(web);
        let webStart = -1;

        /* Personajes */
        const kit = window.SpiderModels.create(THREE);
        const byId = Object.fromEntries(characters.map((c) => [c.id, c]));
        const figs = {};
        let current = null;
        let poseName = 'reposo';
        let switchStart = -10;
        const clock = new THREE.Clock();

        function poseFor(c, name) {
            return name === 'thwip' ? kit.POSES.thwip : (c.poses[name] || c.poses.reposo);
        }

        function loadGlb(c, fig) {
            if (!c.glb || !GLTFLoader) return;
            new GLTFLoader().load(c.glb, (gltf) => {
                const model = gltf.scene;
                const box = new THREE.Box3().setFromObject(model);
                const size = box.getSize(new THREE.Vector3());
                model.scale.setScalar(2.05 / size.y);
                const box2 = new THREE.Box3().setFromObject(model);
                const center = box2.getCenter(new THREE.Vector3());
                model.position.set(-center.x, -box2.min.y, -center.z);
                fig.rig.pelvis.visible = false;
                fig.root.add(model);
                fig.glb = model;
                if (gltf.animations.length) {
                    fig.mixer = new THREE.AnimationMixer(model);
                    fig.mixer.clipAction(gltf.animations[0]).play();
                }
            }, undefined, (err) => console.warn('No se pudo cargar ' + c.glb + '. Se usa el modelo procedural.', err));
        }

        function figure(id) {
            if (!figs[id]) {
                const c = byId[id];
                const fig = kit.build(c);
                fig.root.visible = false;
                scene.add(fig.root);
                figs[id] = fig;
                loadGlb(c, fig);
            }
            return figs[id];
        }

        function setCharacter(id) {
            if (current === id || !byId[id]) return;
            current = id;
            Object.values(figs).forEach((f) => { f.root.visible = false; });
            const c = byId[id];
            const fig = figure(id);
            fig.root.visible = true;
            fig.setPose(poseFor(c, poseName), true);

            ringMat.color.set(c.accent);
            ring2Mat.color.set(c.accent2);
            pMat.color.set(c.accent);
            rim.color.set(c.accent);
            fill.color.set(c.accent2);
            kit.shared.uRim.value.set(c.accent2);

            switchStart = clock.getElapsedTime();
            webStart = -1;
            web.visible = false;

            stage.classList.remove('glitching');
            void stage.offsetWidth;
            stage.classList.add('glitching');
        }

        function setPose(name) {
            poseName = name;
            if (!current) return;
            figs[current].setPose(poseFor(byId[current], name), reduce);
            webStart = name === 'thwip' ? clock.getElapsedTime() + 0.5 : -1;
            if (name !== 'thwip') web.visible = false;
        }

        function resetView() {
            camera.position.copy(HOME.pos);
            controls.target.copy(HOME.target);
            controls.update();
        }

        function snapshot() {
            renderer.render(scene, camera);
            const w = canvas.width, h = canvas.height;
            const out = document.createElement('canvas');
            out.width = w; out.height = h;
            const g = out.getContext('2d');
            const c = byId[current];
            g.fillStyle = '#07070f';
            g.fillRect(0, 0, w, h);
            const grd = g.createRadialGradient(w / 2, h * 0.7, 10, w / 2, h * 0.7, h * 0.9);
            grd.addColorStop(0, c.accent);
            grd.addColorStop(1, 'rgba(7,7,15,0)');
            g.globalAlpha = 0.6;
            g.fillStyle = grd;
            g.fillRect(0, 0, w, h);
            g.globalAlpha = 0.12;
            g.fillStyle = '#ffffff';
            const step = 10 * renderer.getPixelRatio();
            for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) g.fillRect(x, y, 2, 2);
            g.globalAlpha = 1;
            g.drawImage(canvas, 0, 0);
            const fs = Math.round(h * 0.07);
            g.font = `${fs}px Bangers, Impact, sans-serif`;
            g.fillStyle = c.accent2; g.fillText(c.name, fs * 0.6 - 4, h - fs * 0.6);
            g.fillStyle = c.accent;  g.fillText(c.name, fs * 0.6 + 4, h - fs * 0.6);
            g.fillStyle = '#ffffff'; g.fillText(c.name, fs * 0.6, h - fs * 0.6);
            return out.toDataURL('image/png');
        }

        /* Tamaño y visibilidad */
        function resize() {
            const w = stage.clientWidth, h = stage.clientHeight;
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            kit.shared.uDot.value = renderer.getPixelRatio();
        }
        new ResizeObserver(resize).observe(stage);
        resize();

        let onScreen = true;
        new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; }).observe(stage);

        const easeOutBack = (x) => 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2);
        const tmpV = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0), DOWN = new THREE.Vector3(0, -1, 0);

        renderer.setAnimationLoop(() => {
            if (!onScreen || !current) return;
            const dt = clock.getDelta();
            const t = clock.elapsedTime;
            const tick = reduce ? 0 : Math.floor(t * 12) / 12;   // animación "a dos" (12 fps)
            const fig = figs[current];

            fig.update(tick);
            if (fig.mixer) fig.mixer.update(dt);

            const k = Math.min((t - switchStart) / 0.7, 1);
            const s = reduce ? 1 : 0.55 + 0.45 * easeOutBack(k);
            fig.root.scale.setScalar(s);
            fig.root.rotation.y = reduce ? 0 : Math.PI * 2 * (1 - k) * (1 - k);
            fig.root.position.y = reduce ? 0 : Math.sin(k * Math.PI) * 0.35;

            ring.rotation.z = tick * 0.5;
            ring2.rotation.z = -tick * 0.3;
            ticks.rotation.y = tick * 0.2;

            // Telaraña: sale de la mano derecha en la dirección del antebrazo
            if (webStart > 0 && t > webStart && !fig.glb) {
                const e = t - webStart;
                const hand = fig.rig.hands.r.group;
                hand.getWorldPosition(tmpV);
                fig.rig.r.elbow.getWorldQuaternion(tmpQ);
                const dir = DOWN.clone().applyQuaternion(tmpQ);
                web.position.copy(tmpV).addScaledVector(dir, 0.1);
                web.quaternion.setFromUnitVectors(UP, dir);
                web.scale.set(1, Math.min(e / 0.22, 1) * 4, 1);
                webMat.opacity = e < 1.1 ? 1 : Math.max(0, 1 - (e - 1.1) / 0.4);
                web.visible = webMat.opacity > 0;
                if (e > 1.6) { webStart = reduce ? -1 : t + 1.4; }
            }

            if (!reduce) {
                for (let i = 0; i < COUNT; i++) {
                    positions[i * 3 + 1] += speeds[i] * Math.min(dt, 0.05);
                    if (positions[i * 3 + 1] > 3.2) positions[i * 3 + 1] = 0;
                }
                pGeo.attributes.position.needsUpdate = true;
            }

            kit.shared.uLightDir.value.copy(key.position).normalize().transformDirection(camera.matrixWorldInverse);

            controls.update();
            renderer.render(scene, camera);
        });

        stage.classList.add('ready');

        return {
            setCharacter,
            setPose,
            resetView,
            snapshot,
            setAutoRotate(on) { controls.autoRotate = on; },
            get autoRotate() { return controls.autoRotate; },
            get current() { return current; },
        };
    }

    window.SpiderViewer = { create };
})();
