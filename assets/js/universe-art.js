/* =============================================================
   UNIVERSE ART — ilustraciones vectoriales originales (SVG)
   ---------------------------------------------------------------
   Cada universo se dibuja como vector a 1600×1000, así que se ve
   nítido a cualquier nivel de zoom y en pantallas 4K/Retina.
   Si en spider-data.js indicas "image", se usa tu imagen en su lugar.
   ============================================================= */
(function () {
    'use strict';

    const W = 1600, H = 1000;
    const f = (n) => (Math.round(n * 10) / 10).toString();
    const lerp = (a, b, t) => a + (b - a) * t;

    function rng(seed) {
        return () => {
            seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
            let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    /* ---------- Piezas comunes ---------- */
    function grad(id, stops, vertical = true) {
        const s = stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('');
        return vertical
            ? `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${s}</linearGradient>`
            : `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0">${s}</linearGradient>`;
    }

    function windows(id, cw, ch, ww, wh, color, dark) {
        const cells = [[1, 0], [3, 1], [0, 2], [4, 2], [2, 1], [4, 0], [1, 3], [3, 3]];
        return `<pattern id="${id}" width="${cw}" height="${ch}" patternUnits="userSpaceOnUse">
                    <rect x="${(cw - ww) / 2}" y="${(ch - wh) / 2}" width="${ww}" height="${wh}" fill="${color}"/>
                </pattern>
                <pattern id="${id}-off" width="${cw * 5}" height="${ch * 4}" patternUnits="userSpaceOnUse">
                    ${cells.map(([x, y]) => `<rect x="${x * cw}" y="${y * ch}" width="${cw}" height="${ch}" fill="${dark}"/>`).join('')}
                </pattern>`;
    }

    function halftone(id, size, r, color) {
        return `<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse">
                    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="${color}"/>
                </pattern>`;
    }

    function roof(type, x, top, w, fill) {
        switch (type) {
            case 'antenna':
                return `<rect x="${f(x + w / 2 - 2)}" y="${f(top - 70)}" width="4" height="70" fill="${fill}"/>`;
            case 'step':
                return `<rect x="${f(x + w * 0.18)}" y="${f(top - 34)}" width="${f(w * 0.64)}" height="35" fill="${fill}"/>`;
            case 'spire':
                return `<polygon points="${f(x + w * 0.3)},${f(top)} ${f(x + w / 2)},${f(top - w * 1.3)} ${f(x + w * 0.7)},${f(top)}" fill="${fill}"/>`;
            case 'water': {
                const cx = x + w * 0.35;
                return `<g fill="${fill}"><rect x="${f(cx - 14)}" y="${f(top - 28)}" width="3" height="28"/><rect x="${f(cx + 11)}" y="${f(top - 28)}" width="3" height="28"/>
                        <rect x="${f(cx - 18)}" y="${f(top - 70)}" width="36" height="44" rx="3"/><polygon points="${f(cx - 21)},${f(top - 68)} ${f(cx)},${f(top - 92)} ${f(cx + 21)},${f(top - 68)}"/></g>`;
            }
            case 'dome': {
                const a = x + w * 0.12, b = x + w * 0.88, cx = x + w / 2, dw = b - a;
                return `<g fill="${fill}"><path d="M${f(a)} ${f(top)} Q${f(a - dw * 0.08)} ${f(top - dw * 0.55)} ${f(cx)} ${f(top - dw * 0.95)} Q${f(b + dw * 0.08)} ${f(top - dw * 0.55)} ${f(b)} ${f(top)} Z"/>
                        <rect x="${f(cx - 2)}" y="${f(top - dw * 0.95 - 26)}" width="4" height="28"/></g>`;
            }
            case 'chimney':
                return `<g fill="${fill}"><rect x="${f(x + w * 0.2)}" y="${f(top - 30)}" width="14" height="31"/><rect x="${f(x + w * 0.62)}" y="${f(top - 22)}" width="12" height="23"/></g>`;
            case 'slant':
                return `<polygon points="${f(x)},${f(top)} ${f(x + w)},${f(top - w * 0.45)} ${f(x + w)},${f(top)}" fill="${fill}"/>`;
            default:
                return '';
        }
    }

    // Devuelve { sil, win }: siluetas y ventanas por separado
    function city(r, o) {
        let x = o.x0 ?? -30, sil = '', win = '';
        while (x < (o.x1 ?? W + 30)) {
            const w = lerp(o.minW, o.maxW, r());
            const h = lerp(o.minH, o.maxH, r());
            const top = o.base - h;
            sil += `<rect x="${f(x)}" y="${f(top)}" width="${f(w + 1)}" height="${f(h + 600)}"/>`;
            if (o.roofs && r() < (o.roofChance ?? 0.6)) sil += roof(o.roofs[Math.floor(r() * o.roofs.length)], x, top, w, 'currentColor');
            if (o.win && w > 44) {
                const box = `x="${f(x + 9)}" y="${f(top + 16)}" width="${f(w - 18)}" height="${f(Math.max(0, H - top))}"`;
                win += `<rect ${box} fill="url(#${o.win})" opacity="${o.winOp ?? 1}"/><rect ${box} fill="url(#${o.win}-off)"/>`;
            }
            x += w + (o.gap ? r() * o.gap : 0);
        }
        return { sil, win };
    }

    // Silueta de un Spider colgando de su telaraña
    function swinger(x, y, angle, scale, color, ropeColor = '#ffffff', rope = 900) {
        const body = `
            <g fill="none" stroke="${color}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">
                <path d="M0 0 L4 36"/>
                <path d="M6 40 L16 84"/>
                <path d="M10 46 L32 58 L48 50"/>
                <path d="M16 84 L8 112 L22 134"/>
                <path d="M16 84 L40 104 L36 130"/>
            </g>
            <circle cx="15" cy="28" r="11" fill="${color}"/>
            <path d="M6 40 L16 84 L22 80 L14 42 Z" fill="${color}"/>`;
        return `<g transform="translate(${x} ${y}) rotate(${angle}) scale(${scale})">
                    <line x1="0" y1="0" x2="0" y2="${-rope}" stroke="${ropeColor}" stroke-width="${f(3 / scale)}"/>
                    ${body}
                </g>`;
    }

    function misprintSwinger(x, y, angle, scale, color, rope) {
        return `<g style="mix-blend-mode:screen" opacity=".9">${swinger(x - 7, y, angle, scale, '#00e5ff', 'transparent', rope)}${swinger(x + 7, y, angle, scale, '#ff1744', 'transparent', rope)}</g>`
            + swinger(x, y, angle, scale, color, '#ffffff', rope);
    }

    function wrap(id, label, defs, body) {
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${label}">
                    <defs>${defs}</defs>${body}</svg>`;
    }

    /* =========================================================
       ESCENAS
       ========================================================= */
    const SCENES = {

        /* ---------- EARTH-616: Nueva York clásica al atardecer ---------- */
        'earth-616'() {
            const p = 'u616', r = rng(616);
            const far = city(r, { base: 760, minW: 60, maxW: 140, minH: 120, maxH: 320, roofs: ['antenna', 'step', 'spire'] });
            const mid = city(r, { base: 860, minW: 80, maxW: 170, minH: 150, maxH: 400, roofs: ['step', 'antenna', 'water'], win: `${p}-w`, winOp: 0.75 });
            const near = city(r, { base: 1000, minW: 110, maxW: 220, minH: 130, maxH: 290, roofs: ['water', 'step', 'chimney'], win: `${p}-w`, gap: 10 });
            const defs = grad(`${p}-sky`, [[0, '#0a1a4f'], [0.5, '#3a5fcf'], [0.78, '#ff8f6b'], [1, '#ffc27a']])
                + windows(`${p}-w`, 18, 26, 8, 12, '#ffd56b', '#1d2b6b')
                + halftone(`${p}-ht`, 14, 3.4, '#ff6b3d')
                + halftone(`${p}-ht2`, 12, 2.4, '#0a1033')
                + `<radialGradient id="${p}-fade"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient>
                   <mask id="${p}-m"><rect width="${W}" height="${H}" fill="url(#${p}-fade)"/></mask>
                   <linearGradient id="${p}-tl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".45" stop-color="#000"/></linearGradient>
                   <mask id="${p}-m2"><rect width="${W}" height="${H}" fill="url(#${p}-tl)"/></mask>`;
            const clouds = [[240, 230, 1.2], [700, 160, 0.9], [1350, 260, 1.1], [1000, 380, 0.7]].map(([x, y, s]) =>
                `<g transform="translate(${x} ${y}) scale(${s})" fill="#ff9e7a" opacity=".55"><ellipse cx="0" cy="0" rx="120" ry="26"/><ellipse cx="-40" cy="-16" rx="60" ry="30"/><ellipse cx="34" cy="-22" rx="70" ry="36"/></g>`).join('');
            const empire = `<g fill="#1d2b6b">
                    <rect x="440" y="440" width="170" height="600"/><rect x="465" y="380" width="120" height="70"/>
                    <rect x="490" y="330" width="70" height="60"/><rect x="505" y="290" width="40" height="50"/>
                    <polygon points="515,290 525,150 535,290"/></g>
                    <rect x="450" y="460" width="150" height="540" fill="url(#${p}-w)" opacity=".7"/>`;
            return wrap(p, 'Skyline de Nueva York al atardecer con Spider-Man balanceándose', defs, `
                <rect width="${W}" height="${H}" fill="url(#${p}-sky)"/>
                <circle cx="1180" cy="640" r="270" fill="#ffb35c"/>
                <circle cx="1180" cy="640" r="270" fill="url(#${p}-ht)" mask="url(#${p}-m)"/>
                ${clouds}
                <g color="#4a5fb0" fill="#4a5fb0" opacity=".85">${far.sil}</g>
                ${empire}
                <g color="#1d2b6b" fill="#1d2b6b">${mid.sil}</g>${mid.win}
                <g color="#0a0f2e" fill="#0a0f2e">${near.sil}</g>${near.win}
                ${swinger(1080, 250, -24, 1.6, '#0a0a12', '#ffffff', 600)}
                <rect width="${W}" height="${H}" fill="url(#${p}-ht2)" mask="url(#${p}-m2)" opacity=".6"/>`);
        },

        /* ---------- EARTH-1610: Brooklyn grafiti + glitch ---------- */
        'earth-1610'() {
            const p = 'u1610', r = rng(1610);
            const mid = city(r, { base: 860, minW: 70, maxW: 150, minH: 140, maxH: 360, roofs: ['water', 'step', 'antenna'], win: `${p}-w`, winOp: 0.6 });
            const near = city(r, { base: 1000, minW: 120, maxW: 230, minH: 120, maxH: 260, roofs: ['water', 'chimney'], win: `${p}-w2`, gap: 6 });
            const defs = grad(`${p}-sky`, [[0, '#12002b'], [0.45, '#4b0a6b'], [0.8, '#ff2d75'], [1, '#ff9a3c']])
                + windows(`${p}-w`, 16, 24, 7, 11, '#ff5fd2', '#2a0b3d')
                + windows(`${p}-w2`, 18, 26, 8, 12, '#ffe14d', '#0b0412')
                + halftone(`${p}-ht`, 12, 3, '#ff2fb3')
                + `<filter id="${p}-spray" x="-20%" y="-20%" width="140%" height="140%">
                       <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3"/>
                       <feDisplacementMap in="SourceGraphic" scale="40"/>
                   </filter>
                   <radialGradient id="${p}-b1"><stop offset="0" stop-color="#ff2fb3" stop-opacity=".9"/><stop offset="1" stop-color="#ff2fb3" stop-opacity="0"/></radialGradient>
                   <radialGradient id="${p}-b2"><stop offset="0" stop-color="#00e5ff" stop-opacity=".8"/><stop offset="1" stop-color="#00e5ff" stop-opacity="0"/></radialGradient>
                   <radialGradient id="${p}-b3"><stop offset="0" stop-color="#ffe600" stop-opacity=".7"/><stop offset="1" stop-color="#ffe600" stop-opacity="0"/></radialGradient>
                   <linearGradient id="${p}-v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".6" stop-color="#000"/></linearGradient>
                   <mask id="${p}-m"><rect width="${W}" height="${H}" fill="url(#${p}-v)"/></mask>`;
            const blobs = `<g filter="url(#${p}-spray)">
                    <circle cx="1250" cy="260" r="330" fill="url(#${p}-b1)"/>
                    <circle cx="900" cy="140" r="260" fill="url(#${p}-b2)"/>
                    <circle cx="1450" cy="560" r="240" fill="url(#${p}-b3)"/></g>`;
            const moon = `<g style="mix-blend-mode:screen"><circle cx="318" cy="250" r="150" fill="#00e5ff" opacity=".8"/><circle cx="342" cy="250" r="150" fill="#ff1744" opacity=".8"/></g>
                          <circle cx="330" cy="250" r="150" fill="#ffe1f0"/>`;
            // Puente con torres góticas y cables
            const tower = (x) => `<path fill-rule="evenodd" fill="#1b0526" d="M${x} 860 V360 H${x + 80} V860 Z M${x + 18} 600 V500 Q${x + 40} 470 ${x + 62} 500 V600 Z M${x + 18} 760 V660 Q${x + 40} 630 ${x + 62} 660 V760 Z"/>`;
            let cables = '';
            for (let i = 0; i < 4; i++) cables += `<path d="M${-40} ${420 + i * 18} Q 220 ${650 + i * 10} 460 ${380 + i * 6} Q 640 ${640 + i * 10} 860 ${430 + i * 14}" stroke="#ff9ad8" stroke-width="2.5" fill="none" opacity=".8"/>`;
            for (let x = 0; x < 860; x += 22) cables += `<line x1="${x}" y1="${560 + Math.abs(Math.sin(x / 140)) * 40}" x2="${x}" y2="760" stroke="#ff9ad8" stroke-width="1.2" opacity=".55"/>`;
            const deck = `<rect x="-40" y="760" width="940" height="22" fill="#1b0526"/>`;
            const glitch = Array.from({ length: 9 }, () => {
                const y = r() * 900, h = 2 + r() * 10, x = r() * 1200;
                return `<rect x="${f(x)}" y="${f(y)}" width="${f(150 + r() * 400)}" height="${f(h)}" fill="${r() < 0.5 ? '#00e5ff' : '#ff2fb3'}" opacity=".55"/>`;
            }).join('');
            return wrap(p, 'Brooklyn de noche con grafiti, el puente y Spider-Man con efecto glitch', defs, `
                <rect width="${W}" height="${H}" fill="url(#${p}-sky)"/>
                ${blobs}
                <rect width="${W}" height="${H}" fill="url(#${p}-ht)" mask="url(#${p}-m)" opacity=".35"/>
                ${moon}
                ${cables}${tower(140)}${tower(600)}${deck}
                <g color="#2a0b3d" fill="#2a0b3d">${mid.sil}</g>${mid.win}
                <g style="mix-blend-mode:screen" opacity=".85">
                    <g color="#00e5ff" fill="#00e5ff" transform="translate(-9 0)">${near.sil}</g>
                    <g color="#ff1744" fill="#ff1744" transform="translate(9 0)">${near.sil}</g>
                </g>
                <g color="#0b0412" fill="#0b0412">${near.sil}</g>${near.win}
                <g font-family="'Permanent Marker', cursive" transform="rotate(-7 1150 930)">
                    <text x="1010" y="950" font-size="130" fill="#ff2fb3" stroke="#000" stroke-width="6" paint-order="stroke">1610</text>
                    <rect x="1050" y="955" width="6" height="40" fill="#ff2fb3"/><rect x="1150" y="955" width="6" height="26" fill="#ff2fb3"/><rect x="1250" y="955" width="6" height="34" fill="#ff2fb3"/>
                </g>
                <text x="120" y="955" font-family="'Permanent Marker', cursive" font-size="64" fill="#00e5ff" transform="rotate(4 120 955)" stroke="#000" stroke-width="4" paint-order="stroke">BKLYN</text>
                ${misprintSwinger(1180, 230, 18, 1.5, '#0b0412', 700)}
                ${glitch}`);
        },

        /* ---------- EARTH-65: acuarela pastel ---------- */
        'earth-65'() {
            const p = 'u65', r = rng(65);
            const mid = city(r, { base: 880, minW: 70, maxW: 150, minH: 150, maxH: 380, roofs: ['water', 'step', 'spire'] });
            const near = city(r, { base: 1000, minW: 110, maxW: 210, minH: 120, maxH: 250, roofs: ['water', 'chimney'], gap: 14 });
            const defs = `
                <filter id="${p}-wc" x="-20%" y="-20%" width="140%" height="140%">
                    <feTurbulence type="fractalNoise" baseFrequency=".012" numOctaves="3" seed="4" result="n"/>
                    <feDisplacementMap in="SourceGraphic" in2="n" scale="70" result="d"/>
                    <feGaussianBlur in="d" stdDeviation="4"/>
                </filter>
                <filter id="${p}-sketch" x="-5%" y="-5%" width="110%" height="110%">
                    <feTurbulence type="fractalNoise" baseFrequency=".04" numOctaves="2" seed="9" result="n"/>
                    <feDisplacementMap in="SourceGraphic" in2="n" scale="5"/>
                </filter>
                <filter id="${p}-paper"><feTurbulence type="fractalNoise" baseFrequency=".75" numOctaves="3" seed="2"/>
                    <feColorMatrix values="0 0 0 0 .4  0 0 0 0 .3  0 0 0 0 .4  0 0 0 .12 0"/></filter>
                ${halftone(`${p}-ht`, 13, 3, '#ff5fa2')}
                <linearGradient id="${p}-d" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".4" stop-color="#000"/></linearGradient>
                <mask id="${p}-m"><rect width="${W}" height="${H}" fill="url(#${p}-d)"/></mask>`;
            const washes = [
                [380, 300, 560, 340, '#ff8cc6'], [1200, 240, 600, 320, '#7fe3ec'], [900, 720, 640, 300, '#ffe58f'],
                [260, 820, 460, 260, '#c7b3ff'], [1450, 760, 380, 260, '#ff8cc6'],
            ].map(([cx, cy, rx, ry, c]) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${c}" opacity=".6" style="mix-blend-mode:multiply"/>`).join('');
            const splats = Array.from({ length: 40 }, () =>
                `<circle cx="${f(r() * W)}" cy="${f(r() * H)}" r="${f(2 + r() * 12)}" fill="${['#ff5fa2', '#21c7c0', '#b48cff'][Math.floor(r() * 3)]}" opacity="${f(0.3 + r() * 0.5)}"/>`).join('');
            return wrap(p, 'Nueva York en acuarela pastel con Spider-Woman', defs, `
                <rect width="${W}" height="${H}" fill="#fdf3ee"/>
                <g filter="url(#${p}-wc)">${washes}</g>
                <circle cx="1240" cy="300" r="160" fill="#fff6c9" opacity=".9" filter="url(#${p}-wc)"/>
                <g filter="url(#${p}-sketch)">
                    <g color="#e3d4ff" fill="#e3d4ff" stroke="#6b4c9a" stroke-width="3" opacity=".85">${mid.sil}</g>
                    <g color="#ffffff" fill="#ffffff" stroke="#3a2a5a" stroke-width="4" opacity=".9">${near.sil}</g>
                </g>
                ${splats}
                <rect width="${W}" height="${H}" fill="url(#${p}-ht)" mask="url(#${p}-m)" opacity=".5"/>
                ${swinger(1010, 210, 16, 1.55, '#2b2340', '#3a2a5a', 600)}
                <circle cx="1028" cy="250" r="22" fill="#ff5fa2" opacity=".85" transform="rotate(16 1010 210)"/>
                <rect width="${W}" height="${H}" filter="url(#${p}-paper)"/>`);
        },

        /* ---------- EARTH-928: Nueva York 2099 ---------- */
        'earth-928'() {
            const p = 'u928', r = rng(928);
            const far = city(r, { base: 860, minW: 40, maxW: 90, minH: 380, maxH: 720, roofs: ['spire', 'antenna'], roofChance: 0.8, gap: 30 });
            const mid = city(r, { base: 900, minW: 70, maxW: 140, minH: 220, maxH: 520, roofs: ['slant', 'spire', 'antenna'], win: `${p}-w`, winOp: 0.8, gap: 20 });
            const near = city(r, { base: 1000, minW: 120, maxW: 240, minH: 60, maxH: 150, roofs: ['slant', 'step'], win: `${p}-w2`, gap: 260 });
            const defs = grad(`${p}-sky`, [[0, '#02041a'], [0.45, '#0a1f66'], [0.75, '#6b2bd9'], [1, '#ff7a3d']])
                + windows(`${p}-w`, 14, 20, 9, 4, '#3ff0ff', '#0d1442')
                + windows(`${p}-w2`, 16, 22, 10, 4, '#ff6ad5', '#070a24')
                + `<filter id="${p}-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                   <pattern id="${p}-scan" width="4" height="6" patternUnits="userSpaceOnUse"><rect width="4" height="2" fill="#000" opacity=".28"/></pattern>
                   <linearGradient id="${p}-trail" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".9"/></linearGradient>
                   <mask id="${p}-sunm"><rect width="${W}" height="${H}" fill="#fff"/>${Array.from({ length: 8 }, (_, i) => `<rect x="0" y="${640 + i * 26}" width="${W}" height="${4 + i * 2}" fill="#000"/>`).join('')}</mask>`;
            const sun = `<circle cx="800" cy="700" r="270" fill="#ff7a3d" mask="url(#${p}-sunm)" opacity=".95"/>`;
            const mega = `<g><polygon points="690,1000 700,260 760,120 820,260 830,1000" fill="#0b1238"/>
                    <polyline points="700,1000 700,260 760,120 820,260 820,1000" fill="none" stroke="#3ff0ff" stroke-width="3" filter="url(#${p}-glow)"/>
                    ${[300, 440, 580].map((y, i) => `<ellipse cx="760" cy="${y}" rx="${170 - i * 10}" ry="24" fill="none" stroke="${i === 1 ? '#ff4dd2' : '#3ff0ff'}" stroke-width="3" opacity=".85" filter="url(#${p}-glow)"/>`).join('')}
                    <text x="760" y="215" text-anchor="middle" font-family="Bangers, sans-serif" font-size="42" fill="#3ff0ff" filter="url(#${p}-glow)">2099</text></g>`;
            const cars = Array.from({ length: 16 }, () => {
                const x = r() * W, y = 180 + r() * 520, c = r() < 0.5 ? '#ff4d6d' : '#3ff0ff', len = 80 + r() * 160;
                return `<g><rect x="${f(x - len)}" y="${f(y + 3)}" width="${f(len)}" height="3" fill="url(#${p}-trail)" opacity=".7"/>
                        <rect x="${f(x)}" y="${f(y)}" width="22" height="9" rx="4.5" fill="${c}" filter="url(#${p}-glow)"/></g>`;
            }).join('');
            let grid = '';
            for (let i = -12; i <= 12; i++) grid += `<line x1="${800 + i * 30}" y1="920" x2="${800 + i * 170}" y2="${H}" stroke="#ff3df0" stroke-width="1.5" opacity=".5"/>`;
            for (let i = 0; i < 5; i++) grid += `<line x1="0" y1="${925 + i * i * 4 + i * 6}" x2="${W}" y2="${925 + i * i * 4 + i * 6}" stroke="#ff3df0" stroke-width="1.5" opacity=".45"/>`;
            return wrap(p, 'Nueva York futurista del año 2099 con torres de neón y coches voladores', defs, `
                <rect width="${W}" height="${H}" fill="url(#${p}-sky)"/>
                ${sun}
                <g color="#1a2a7a" fill="#1a2a7a" opacity=".85">${far.sil}</g>
                ${mega}
                <g color="#0d1442" fill="#0d1442">${mid.sil}</g>${mid.win}
                ${cars}
                <rect x="0" y="900" width="${W}" height="100" fill="#070a24"/>
                ${grid}
                <g color="#070a24" fill="#070a24">${near.sil}</g>${near.win}
                ${swinger(1260, 260, -18, 1.5, '#05051a', '#9ff8ff', 600)}
                <rect width="${W}" height="${H}" fill="url(#${p}-scan)"/>`);
        },

        /* ---------- EARTH-138: Londres punk, collage fotocopiado ---------- */
        'earth-138'() {
            const p = 'u138', r = rng(138);
            const near = city(r, { base: 1000, minW: 90, maxW: 190, minH: 140, maxH: 300, roofs: ['chimney', 'chimney', 'slant'], roofChance: 0.9, gap: 4 });
            const defs = `
                <filter id="${p}-torn" x="-5%" y="-5%" width="110%" height="110%">
                    <feTurbulence type="fractalNoise" baseFrequency=".06" numOctaves="3" seed="7"/>
                    <feDisplacementMap in="SourceGraphic" scale="22"/>
                </filter>
                <filter id="${p}-xerox" x="0" y="0" width="100%" height="100%">
                    <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="5"/>
                    <feColorMatrix type="saturate" values="0"/>
                    <feComponentTransfer><feFuncA type="discrete" tableValues="0 0 0 0 .55 .9"/></feComponentTransfer>
                    <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .45 0"/>
                </filter>
                ${halftone(`${p}-ht`, 22, 7, '#111')}
                <radialGradient id="${p}-rg" cx="85%" cy="15%" r="60%"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient>
                <mask id="${p}-m"><rect width="${W}" height="${H}" fill="url(#${p}-rg)"/></mask>`;
            let news = '';
            for (let c = 0; c < 6; c++) for (let l = 0; l < 34; l++) {
                news += `<rect x="${40 + c * 260}" y="${60 + l * 26}" width="${f(160 + r() * 70)}" height="8" fill="#8f8775" opacity=".45"/>`;
            }
            const letters = 'SPIDER-PUNK'.split('').map((ch, i) => {
                const x = 400 + i * 70, y = 120 + (r() - 0.5) * 30, rot = (r() - 0.5) * 22;
                const bg = ['#d7263d', '#111', '#f5f0e1', '#1f3fae', '#ffd23f'][Math.floor(r() * 5)];
                const fg = bg === '#f5f0e1' || bg === '#ffd23f' ? '#111' : '#f5f0e1';
                const font = i % 2 ? "Bangers, sans-serif" : "'Permanent Marker', cursive";
                return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)})"><rect x="-32" y="-52" width="66" height="78" fill="${bg}" stroke="#111" stroke-width="3"/>
                        <text x="1" y="12" text-anchor="middle" font-family="${font}" font-size="62" fill="${fg}">${ch}</text></g>`;
            }).join('');
            const bigBen = `<g fill="#0d0d0d">
                    <rect x="1170" y="380" width="120" height="640"/><rect x="1160" y="330" width="140" height="60"/>
                    <polygon points="1160,330 1230,150 1300,330"/><rect x="1226" y="90" width="8" height="70"/></g>
                    <circle cx="1230" cy="440" r="46" fill="#f5f0e1" stroke="#0d0d0d" stroke-width="6"/>
                    <line x1="1230" y1="440" x2="1230" y2="408" stroke="#0d0d0d" stroke-width="6" stroke-linecap="round"/>
                    <line x1="1230" y1="440" x2="1254" y2="452" stroke="#0d0d0d" stroke-width="5" stroke-linecap="round"/>`;
            return wrap(p, 'Londres punk en estilo collage con la torre del reloj y Spider-Punk', defs, `
                <rect width="${W}" height="${H}" fill="#ece4cf"/>
                ${news}
                <polygon points="-50,620 1650,300 1650,560 -50,900" fill="#d7263d" filter="url(#${p}-torn)"/>
                <polygon points="900,-20 1650,-20 1650,360" fill="#1f3fae" filter="url(#${p}-torn)"/>
                <polygon points="-40,-20 500,-20 -40,400" fill="#111" opacity=".92" filter="url(#${p}-torn)"/>
                <rect width="${W}" height="${H}" fill="url(#${p}-ht)" mask="url(#${p}-m)" opacity=".75"/>
                ${bigBen}
                <g color="#0d0d0d" fill="#0d0d0d">${near.sil}</g>
                <g style="mix-blend-mode:multiply">${swinger(560 + 8, 300, 22, 1.6, '#d7263d', 'transparent', 700)}</g>
                ${swinger(560, 300, 22, 1.6, '#111', '#111', 700)}
                ${letters}
                <rect width="${W}" height="${H}" filter="url(#${p}-xerox)"/>`);
        },

        /* ---------- EARTH-50101: Mumbattan ---------- */
        'earth-50101'() {
            const p = 'u501', r = rng(50101);
            const far = city(r, { base: 780, minW: 80, maxW: 150, minH: 90, maxH: 240, roofs: ['dome', 'dome', 'spire', 'step'], roofChance: 0.85 });
            const mid = city(r, { base: 880, minW: 80, maxW: 160, minH: 160, maxH: 420, roofs: ['antenna', 'step', 'dome'], win: `${p}-w`, winOp: 0.85 });
            const near = city(r, { base: 1000, minW: 110, maxW: 220, minH: 120, maxH: 250, roofs: ['dome', 'water', 'step'], win: `${p}-w2`, gap: 8 });
            const defs = grad(`${p}-sky`, [[0, '#ff3d6e'], [0.42, '#ff8a3d'], [0.78, '#ffd46b'], [1, '#fff0b3']])
                + windows(`${p}-w`, 18, 26, 8, 12, '#ffe7a3', '#8a1f4a')
                + windows(`${p}-w2`, 18, 26, 8, 12, '#ffcf5a', '#3b0a2a')
                + halftone(`${p}-ht`, 14, 3.4, '#ff8a00')
                + `<radialGradient id="${p}-f"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient>
                   <mask id="${p}-m"><rect width="${W}" height="${H}" fill="url(#${p}-f)"/></mask>`;
            const kites = Array.from({ length: 11 }, () => {
                const x = 80 + r() * 1440, y = 80 + r() * 380, s = 0.6 + r() * 0.8, rot = (r() - 0.5) * 40;
                const c = ['#1e5bd8', '#d81f2a', '#21c7c0', '#7b2cff', '#ffe600'][Math.floor(r() * 5)];
                return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${f(s)})">
                        <polygon points="0,-40 28,0 0,46 -28,0" fill="${c}" stroke="#3b0a2a" stroke-width="3"/>
                        <line x1="0" y1="-40" x2="0" y2="46" stroke="#3b0a2a" stroke-width="2"/><line x1="-28" y1="0" x2="28" y2="0" stroke="#3b0a2a" stroke-width="2"/>
                        <path d="M0 46 q 12 30 -6 60 q -14 30 6 70" stroke="#3b0a2a" stroke-width="2" fill="none"/></g>`;
            }).join('');
            const garland = (x1, y1, x2, y2, sag) => {
                let s = `<path d="M${x1} ${y1} Q ${(x1 + x2) / 2} ${(y1 + y2) / 2 + sag} ${x2} ${y2}" stroke="#3b0a2a" stroke-width="2" fill="none"/>`;
                for (let i = 0; i <= 20; i++) {
                    const t = i / 20, x = (1 - t) ** 2 * x1 + 2 * (1 - t) * t * ((x1 + x2) / 2) + t * t * x2;
                    const y = (1 - t) ** 2 * y1 + 2 * (1 - t) * t * ((y1 + y2) / 2 + sag) + t * t * y2;
                    s += `<circle cx="${f(x)}" cy="${f(y)}" r="8" fill="${i % 2 ? '#ff8a00' : '#ffd000'}" stroke="#a34700" stroke-width="1.5"/>`;
                }
                return s;
            };
            const gate = `<g fill="#b8325a"><path fill-rule="evenodd" d="M200 880 V600 H460 V880 Z M290 880 V720 Q330 660 370 720 V880 Z"/>
                    ${[205, 265, 395, 455].map((x) => `<rect x="${x - 12}" y="540" width="24" height="70"/><path d="M${x - 16} 545 Q${x} 505 ${x + 16} 545 Z"/>`).join('')}
                    <path d="M290 600 Q330 520 370 600 Z"/></g>`;
            return wrap(p, 'Mumbattan al amanecer con cúpulas, cometas y guirnaldas', defs, `
                <rect width="${W}" height="${H}" fill="url(#${p}-sky)"/>
                <circle cx="1150" cy="520" r="210" fill="#fff4c2"/>
                <circle cx="1150" cy="520" r="210" fill="url(#${p}-ht)" mask="url(#${p}-m)"/>
                ${kites}
                <g color="#ff7a59" fill="#ff7a59" opacity=".8">${far.sil}</g>
                ${gate}
                <g color="#8a1f4a" fill="#8a1f4a">${mid.sil}</g>${mid.win}
                ${garland(-20, 600, 520, 640, 110)}${garland(980, 560, 1640, 620, 120)}
                <g color="#3b0a2a" fill="#3b0a2a">${near.sil}</g>${near.win}
                ${swinger(960, 230, -14, 1.55, '#2a0a20', '#ffffff', 600)}`);
        },
    };

    window.UniverseArt = {
        render(id) {
            return SCENES[id] ? SCENES[id]() : '';
        },
    };
})();
