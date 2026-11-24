/* Interfaz común: menú móvil + animaciones de entrada */
(function () {
    'use strict';

    const toggle = document.querySelector('.menu-toggle');
    const menu = document.getElementById('menu');

    if (toggle && menu) {
        toggle.addEventListener('click', () => {
            const open = toggle.getAttribute('aria-expanded') === 'true';
            toggle.setAttribute('aria-expanded', String(!open));
            toggle.setAttribute('aria-label', open ? 'Abrir menú' : 'Cerrar menú');
            menu.classList.toggle('open', !open);
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && menu.classList.contains('open')) { toggle.click(); toggle.focus(); }
        });
    }

    const els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
        els.forEach((el) => el.classList.add('is-visible'));
        return;
    }
    const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                io.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12 });
    els.forEach((el) => io.observe(el));
})();
