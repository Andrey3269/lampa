(function () {
    'use strict';

    if (window.plugins_badge_ready) return;
    window.plugins_badge_ready = true;

    // ===== Список плагинов =====
    var PLUGINS = [
        { name: 'rar',    url: 'https://andrey3269.github.io/lampa/rar.js' },
        { name: 'domen',  url: 'https://andrey3269.github.io/lampa/domen.js' },
        { name: 'lgbt',   url: 'https://andrey3269.github.io/lampa/lgbt.js' },
        { name: 'tv',     url: 'https://andrey3269.github.io/lampa/tv.js' },
        { name: 'player', url: 'https://andrey3269.github.io/lampa/player.js' }
    ];

    var TIMEOUT = 10000;
    var STORAGE_KEY = 'plugins_badge_off';

    // ===== SVG Иконки (Clean Tech) =====
    var ICONS = {
        ok: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>',
        fail: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>',
        warn: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>',
        off: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>',
        retry: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>',
        reload: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5A9.5 9.5 0 0 0 2.5 12a9.5 9.5 0 0 0 9.5 9.5 9.5 9.5 0 0 0 9.5-9.5H19.4a7.4 7.4 0 1 1-2.17-5.24L14.5 9.5h7V2.5l-2.37 2.37A9.46 9.46 0 0 0 12 2.5z"/></svg>'
    };

    function readOff() {
        try {
            var v = Lampa.Storage.get(STORAGE_KEY, '[]');
            if (typeof v === 'string') v = JSON.parse(v);
            return Array.isArray(v) ? v : [];
        } catch (e) { return []; }
    }

    function saveOff() {
        var off = PLUGINS.filter(function (p) { return !p.enabled; })
                         .map(function (p) { return p.name; });
        try { Lampa.Storage.set(STORAGE_KEY, off); } catch (e) {}
    }

    var off_list = readOff();
    PLUGINS.forEach(function (p, i) {
        p.index = i;
        p.status = 'wait';
        p.loaded = false;
        p.enabled = off_list.indexOf(p.name) === -1;
    });

    function loadOne(p, done) {
        p.status = 'loading';
        render();

        var finished = false;
        var script = document.createElement('script');

        function finish(ok) {
            if (finished) return;
            finished = true;
            clearTimeout(timer);
            p.status = ok ? 'ok' : 'fail';
            if (ok) p.loaded = true;
            render();
            if (done) done();
        }

        var timer = setTimeout(function () {
            script.onload = script.onerror = null;
            finish(false);
        }, TIMEOUT);

        script.async = true;
        script.src = p.url + (p.retry ? '?r=' + Date.now() : '');
        script.onload = function () { finish(true); };
        script.onerror = function () { finish(false); };
        document.head.appendChild(script);
    }

    function loadAll(only_failed) {
        var queue = PLUGINS.filter(function (p) {
            if (!p.enabled) return false;
            return only_failed ? p.status === 'fail' : p.status === 'wait';
        });

        (function next() {
            var p = queue.shift();
            if (!p) return;
            if (only_failed) p.retry = true;
            loadOne(p, next);
        })();
    }

    function setEnabled(p, on) {
        if (p.enabled === on) return;
        p.enabled = on;
        saveOff();

        if (on) {
            if (!p.loaded && p.status !== 'loading') {
                p.retry = p.status === 'fail';
                loadOne(p);
            }
        } else if (p.loaded) {
            Lampa.Noty.show('«' + p.name + '» отключится после перезагрузки');
        }
        render();
    }

    function stats() {
        var s = { ok: 0, fail: 0, busy: 0, total: 0 };
        PLUGINS.forEach(function (p) {
            if (!p.enabled) return;
            s.total++;
            if (p.status === 'ok') s.ok++;
            else if (p.status === 'fail') s.fail++;
            else s.busy++;
        });
        return s;
    }

    var badge;

    function render() {
        if (!badge) return;
        var s = stats();
        var state;

        if (s.total === 0) state = 'off';
        else if (s.busy > 0) state = 'loading';
        else if (s.fail === 0) state = 'ok';
        else state = s.ok === 0 ? 'fail' : 'part';

        badge.attr('data-state', state);
        badge.find('.pb__count').text(s.ok + '/' + s.total);

        var dot = badge.find('.plugins-badge__dot');
        if (state === 'ok') dot.html(ICONS.ok);
        else if (state === 'fail') dot.html(ICONS.fail);
        else if (state === 'off') dot.html(ICONS.off);
        else dot.html(ICONS.warn);
    }

    function addStyles() {
        if ($('#plugins-badge-style').length) return;

        $('head').append(
            '<style id="plugins-badge-style">' +
            /* Строгая центрированная обертка */
            '.plugins-badge-wrap { position: absolute; top: 0; left: 50%; transform: translateX(-50%); z-index: 100; display: flex; }' +

            /* Чёлка (iPhone Notch): сплошной цвет, строгие формы, никаких градиентов/размытия */
            '.plugins-badge { display: inline-flex; align-items: center; flex-shrink: 0; padding: 6px 20px; background: #1e1e20; color: #e2e8f0; font-size: 1em; line-height: 1; white-space: nowrap; cursor: pointer; border-radius: 0 0 16px 16px; position: relative; font-weight: 500; transition: background 0.3s; }' +

            /* Инвертированные скругления по бокам */
            '.plugins-badge::before, .plugins-badge::after { content: ""; position: absolute; top: 0; width: 12px; height: 12px; background: transparent; transition: box-shadow 0.3s; }' +
            '.plugins-badge::before { left: -12px; border-top-right-radius: 12px; box-shadow: 6px -6px 0 6px #1e1e20; }' +
            '.plugins-badge::after { right: -12px; border-top-left-radius: 12px; box-shadow: -6px -6px 0 6px #1e1e20; }' +

            /* Внутренние элементы */
            '.plugins-badge__dot { display: flex; align-items: center; justify-content: center; width: 16px; height: 16px; margin-right: 8px; }' +
            '.plugins-badge__dot svg { width: 100%; height: 100%; }' +
            '.plugins-badge__label { opacity: 0.8; margin-right: 6px; }' +
            '.pb__count { opacity: 1; font-weight: 600; }' +

            /* Состояния - строгие сплошные цвета (никакого свечения) */
            '.plugins-badge[data-state="ok"] .plugins-badge__dot { color: #3ddc84; }' +
            '.plugins-badge[data-state="part"] .plugins-badge__dot { color: #ffb300; }' +
            '.plugins-badge[data-state="fail"] .plugins-badge__dot { color: #ff5252; }' +
            '.plugins-badge[data-state="loading"] .plugins-badge__dot { color: #ffb300; animation: pb-blink 1.2s infinite step-start; }' +
            '.plugins-badge[data-state="off"] .plugins-badge__dot { color: #8a8a8a; }' +

            '@keyframes pb-blink { 50% { opacity: 0.2; } }' +

            /* Фокус */
            '.plugins-badge.focus, .plugins-badge:hover { background: #2c2d30; color: #fff; }' +
            '.plugins-badge.focus::before, .plugins-badge:hover::before { box-shadow: 6px -6px 0 6px #2c2d30; }' +
            '.plugins-badge.focus::after, .plugins-badge:hover::after { box-shadow: -6px -6px 0 6px #2c2d30; }' +
            '@media (max-width:700px) { .plugins-badge__label { display: none; } }' +

            /* Иконки в меню Lampa */
            '.selector .title-icon { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; margin-right: 10px; vertical-align: middle; }' +
            '.selector .title-icon svg { width: 18px; height: 18px; }' +
            '</style>'
        );
    }

    function statusText(p) {
        if (!p.enabled) return p.loaded ? 'Отключится после перезагрузки' : 'Отключён';
        if (p.status === 'ok') return 'Подключён';
        if (p.status === 'fail') return 'Ошибка загрузки';
        return 'Загрузка…';
    }

    function showList() {
        var prev = Lampa.Controller.enabled().name;
        var s = stats();

        var items = PLUGINS.map(function (p) {
            var svgIcon = p.enabled ? (p.status === 'ok' ? ICONS.ok : (p.status === 'fail' ? ICONS.fail : ICONS.warn)) : ICONS.off;
            var color = p.enabled ? (p.status === 'ok' ? '#3ddc84' : (p.status === 'fail' ? '#ff5252' : '#ffb300')) : '#8a8a8a';

            return {
                title: '<span class="title-icon" style="color:' + color + '">' + svgIcon + '</span>' + p.name,
                subtitle: statusText(p) + ' · ' + p.url,
                checkbox: true,
                checked: p.enabled,
                index: p.index
            };
        });

        if (s.fail > 0) items.push({ title: '<span class="title-icon" style="color:#e2e8f0">' + ICONS.retry + '</span>Повторить неудачные', action: 'retry' });
        items.push({ title: '<span class="title-icon" style="color:#e2e8f0">' + ICONS.reload + '</span>Перезагрузить приложение', action: 'reload' });

        Lampa.Select.show({
            title: 'Плагины ' + s.ok + '/' + s.total,
            items: items,
            onCheck: function(item) {
                var p = PLUGINS[item.index];
                if (p) setEnabled(p, !!item.checked);
            },
            onSelect: function (item) {
                if (item.action === 'reload') { window.location.reload(); return; }
                Lampa.Controller.toggle(prev);
                if (item.action === 'retry') loadAll(true);
            },
            onBack: function () {
                Lampa.Controller.toggle(prev);
            }
        });
    }

    function insertBadge() {
        var title = $('.head__title').first();
        var actions = $('.head__actions').first();

        if (!title.length && !actions.length) return false;
        if ($('.plugins-badge-wrap').length) return true;

        var wrap = $('<div class="plugins-badge-wrap"></div>');
        badge = $(
            '<div class="plugins-badge selector" data-state="loading">' +
            '<span class="plugins-badge__dot"></span>' +
            '<span class="plugins-badge__label">Плагины</span>' +
            '<span class="pb__count">0/' + PLUGINS.length + '</span>' +
            '</div>'
        );

        wrap.append(badge);
        badge.on('hover:enter click', showList);

        if (title.length) title.after(wrap);
        else actions.before(wrap);

        render();
        return true;
    }

    function start() {
        addStyles();

        var tries = 0;
        var t = setInterval(function () {
            tries++;
            if (insertBadge() || tries > 40) clearInterval(t);
        }, 250);

        loadAll(false);
    }

    if (window.appready) start();
    else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') start();
        });
    }
})();