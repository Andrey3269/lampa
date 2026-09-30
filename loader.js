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
    var CTRL = 'plugins_badge_panel';

    // ===== SVG-иконки =====
    var PATHS = {
        cube:  '<path d="M12 3 4 7.5v9l8 4.5 8-4.5v-9L12 3Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>',
        ok:    '<circle cx="12" cy="12" r="9.2"/><path d="m8.2 12.4 2.6 2.6 5-5.4"/>',
        fail:  '<circle cx="12" cy="12" r="9.2"/><path d="M12 7.6v5.2M12 16.4h.01"/>',
        load:  '<circle cx="12" cy="12" r="9.2" opacity=".22"/><path d="M21.2 12A9.2 9.2 0 0 0 12 2.8"/>',
        off:   '<circle cx="12" cy="12" r="9.2" stroke-dasharray="3.4 3.02"/><path d="M8.6 12h6.8"/>',
        power: '<path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><path d="M12 2v10"/>',
        retry: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>' +
               '<path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
        close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>'
    };

    function svg(name, cls) {
        return '<svg class="pb-i' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" ' +
               'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ' +
               'aria-hidden="true" focusable="false">' + PATHS[name] + '</svg>';
    }

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
        if (!p.enabled || p.loaded || p.status === 'loading') {
            if (done) done();
            return;
        }

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

        if (only_failed) {
            queue.forEach(function (p) { p.status = 'wait'; p.retry = true; });
            render();
        }

        (function next() {
            var p = queue.shift();
            if (!p) return;
            loadOne(p, next);
        })();
    }

    function setEnabled(p, on) {
        if (p.enabled === on) return;
        p.enabled = on;
        saveOff();

        if (on && !p.loaded && p.status !== 'loading') {
            p.retry = p.status === 'fail';
            loadOne(p);
            return;
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

    function stateOf(s) {
        if (s.total === 0) return 'off';
        if (s.busy > 0) return 'loading';
        if (s.fail === 0) return 'ok';
        return s.ok === 0 ? 'fail' : 'part';
    }

    function needsReload() {
        return PLUGINS.some(function (p) { return !p.enabled && p.loaded; });
    }

    function rowState(p) {
        if (!p.enabled) return p.loaded ? 'pending' : 'off';
        if (p.status === 'ok') return 'ok';
        if (p.status === 'fail') return 'fail';
        return 'loading';
    }

    var CHIP = {
        ok:      { icon: 'ok',    text: 'Подключён' },
        fail:    { icon: 'fail',  text: 'Ошибка загрузки' },
        loading: { icon: 'load',  text: 'Загрузка…' },
        off:     { icon: 'off',   text: 'Отключён' },
        pending: { icon: 'power', text: 'Отключится после перезагрузки' }
    };

    function subtitle(state) {
        if (state === 'loading') return 'Загрузка…';
        if (state === 'fail') return 'Не удалось загрузить плагины';
        if (state === 'part') return 'Часть плагинов не загрузилась';
        if (needsReload()) return 'Изменения вступят в силу после перезагрузки';
        if (state === 'off') return 'Все плагины отключены';
        return 'Все плагины подключены';
    }

    var badge;

    function render() {
        var s = stats();
        var state = stateOf(s);

        if (badge) {
            badge.attr('data-state', state);
            badge.find('.pb__count').text(s.ok + '/' + s.total);
        }
        if (panel) updatePanel(s, state);
    }

    // ===== Стили (Clean Tech UI: сплошные цвета, геометрия, без стекла) =====
    var CSS = [
        '.plugins-badge,.pb-pill{--pb:#8a8a8a;--pb-f:#6b7280}',
        '.plugins-badge[data-state="ok"],.pb-pill[data-state="ok"]{--pb:#3ddc84;--pb-f:#0b8a5a}',
        '.plugins-badge[data-state="part"],.pb-pill[data-state="part"]{--pb:#ffb300;--pb-f:#b45309}',
        '.plugins-badge[data-state="loading"],.pb-pill[data-state="loading"]{--pb:#ffb300;--pb-f:#b45309}',
        '.plugins-badge[data-state="fail"],.pb-pill[data-state="fail"]{--pb:#ff5252;--pb-f:#dc2626}',

        '.plugins-badge{display:inline-flex;align-items:center;flex-shrink:0;margin:0 .4em;padding:.4em .8em;' +
            'border-radius:8px;background:none;color:inherit;font-size:1em;line-height:1;white-space:nowrap;cursor:pointer;' +
            'transition:background .2s,color .2s}',
        '.plugins-badge .pb-ico{display:inline-flex;width:1.25em;height:1.25em;margin-right:.5em;color:var(--pb);transition:color .3s}',
        '.plugins-badge .pb-ico .pb-i{width:100%;height:100%}',
        '.plugins-badge[data-state="loading"] .pb-ico{animation:pb-blink 1s infinite step-start}',
        '.plugins-badge__label{opacity:.7;margin-right:.45em}',
        '.pb__count{opacity:.95;font-variant-numeric:tabular-nums}',
        '.plugins-badge.focus,.plugins-badge:hover{background:#e2e8f0;color:#111}',
        '.plugins-badge.focus .pb-ico,.plugins-badge:hover .pb-ico{color:var(--pb-f)}',
        '@media (max-width:700px){.plugins-badge__label{display:none}}',

        '.pb-overlay{position:fixed;left:0;top:0;right:0;bottom:0;z-index:2000;opacity:0;pointer-events:none;' +
            'transition:opacity .22s ease;color:#e2e8f0;font-family:inherit;-webkit-tap-highlight-color:transparent}',
        '.pb-overlay.pb-in{opacity:1;pointer-events:auto}',
        '.pb-backdrop{position:absolute;left:0;top:0;right:0;bottom:0;background:rgba(18,18,20,0.92)}',

        '.pb-sheet{position:absolute;left:.6em;right:.6em;bottom:.6em;max-height:calc(100% - 3.6em);' +
            'display:flex;flex-direction:column;box-sizing:border-box;overflow:hidden;border-radius:12px;' +
            'background:#1b1c20;' +
            'transform:translateY(1.6em);transition:transform .3s cubic-bezier(.2,.85,.25,1)}',
        '.pb-overlay.pb-in .pb-sheet{transform:none}',

        '@supports (bottom:max(1px,env(safe-area-inset-bottom))){' +
            '.pb-sheet{left:max(.6em,env(safe-area-inset-left));right:max(.6em,env(safe-area-inset-right));' +
            'bottom:max(.6em,env(safe-area-inset-bottom));' +
            'max-height:calc(100% - max(1em,env(safe-area-inset-top)) - max(.6em,env(safe-area-inset-bottom)) - .6em)}}',
        '@media (max-width:700px){.pb-sheet{font-size:clamp(13px,1em,18px)}}',
        '@media (min-width:701px){.pb-sheet{left:auto;top:.8em;right:.8em;bottom:.8em;width:30em;max-width:92%;' +
            'max-height:none;transform:translateX(2.4em)}}',
        '@supports (bottom:max(1px,env(safe-area-inset-bottom))){@media (min-width:701px){' +
            '.pb-sheet{left:auto;top:max(.8em,env(safe-area-inset-top));right:max(.8em,env(safe-area-inset-right));' +
            'bottom:max(.8em,env(safe-area-inset-bottom));max-height:none}}}',

        '.pb-i{display:block;flex-shrink:0}',
        '.pb-head{display:flex;align-items:center;flex-shrink:0;padding:1.1em 1em 1em 1.2em;border-bottom:1px solid #2c2d30}',
        '.pb-head__ico{display:flex;align-items:center;justify-content:center;flex-shrink:0;width:2.7em;height:2.7em;' +
            'margin-right:.9em;border-radius:8px;background:#2c2d30}',
        '.pb-head__ico .pb-i{width:1.5em;height:1.5em}',
        '.pb-head__text{flex:1 1 auto;min-width:0}',
        '.pb-head__title{font-size:1.35em;font-weight:600;line-height:1.15;letter-spacing:-.01em}',
        '.pb-head__sub{margin-top:.3em;font-size:.8em;line-height:1.25;opacity:.6}',
        '.pb-pill{display:flex;align-items:center;flex-shrink:0;margin:0 .7em;padding:.45em .8em;border-radius:8px;' +
            'background:#2c2d30;font-size:.95em;font-weight:600;line-height:1;font-variant-numeric:tabular-nums}',
        '.pb-pill__dot{width:.55em;height:.55em;margin-right:.55em;border-radius:50%;background:var(--pb)}',
        '.pb-close{display:flex;align-items:center;justify-content:center;flex-shrink:0;width:2.5em;height:2.5em;border-radius:8px;' +
            'background:#2c2d30;cursor:pointer;transition:background .18s,color .18s}',
        '.pb-close .pb-i{width:1.15em;height:1.15em}',
        '.pb-close.focus{background:#e2e8f0;color:#111}',

        '.pb-list{flex:1 1 auto;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;' +
            'padding:.4em .8em .5em;scroll-behavior:smooth}',
        '.pb-list::-webkit-scrollbar{display:none}',
        '.pb-row{--c:#8a8a8a;--c-f:#6b7280;display:flex;align-items:center;margin:.4em 0;padding:.8em .9em;border-radius:8px;' +
            'background:#242528;cursor:pointer;transition:background .18s,color .18s}',
        '.pb-row[data-st="ok"]{--c:#3ddc84;--c-f:#0b8a5a}',
        '.pb-row[data-st="loading"],.pb-row[data-st="pending"]{--c:#ffb300;--c-f:#b45309}',
        '.pb-row[data-st="fail"]{--c:#ff5252;--c-f:#dc2626}',
        '.pb-row__tile{display:flex;align-items:center;justify-content:center;flex-shrink:0;width:2.7em;height:2.7em;' +
            'margin-right:.9em;border-radius:8px;background:#2c2d30;color:var(--c);transition:background .18s,color .18s}',
        '.pb-row__tile .pb-i{width:1.45em;height:1.45em}',
        '.pb-row__body{flex:1 1 auto;min-width:0}',
        '.pb-row__name{font-size:1.08em;font-weight:600;line-height:1.2;transition:opacity .2s}',
        '.pb-row:not(.is-on) .pb-row__name{opacity:.55}',
        '.pb-chip{display:flex;align-items:center;margin-top:.3em;font-size:.8em;line-height:1.25;color:var(--c)}',
        '.pb-chip .pb-i{width:1.15em;height:1.15em;margin-right:.45em}',
        '.pb-row__url{margin-top:.3em;font-size:.72em;line-height:1.2;opacity:.5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',

        '.pb-switch{position:relative;flex-shrink:0;width:2.9em;height:1.65em;margin-left:.8em;border-radius:12px;' +
            'background:#3a3b40;transition:background .2s}',
        '.pb-switch:after{content:"";position:absolute;left:.17em;top:.17em;width:1.31em;height:1.31em;border-radius:50%;' +
            'background:#e2e8f0;transition:transform .22s cubic-bezier(.3,.9,.3,1)}',
        '.pb-row.is-on .pb-switch{background:#3ddc84}',
        '.pb-row.is-on .pb-switch:after{transform:translateX(1.25em)}',

        '.pb-row.focus{background:#e2e8f0;color:#111}',
        '.pb-row.focus .pb-row__tile{background:#cbd5e1;color:var(--c-f)}',
        '.pb-row.focus .pb-chip{color:var(--c-f)}',
        '.pb-row.focus .pb-switch{background:#cbd5e1}',
        '.pb-row.focus.is-on .pb-switch{background:#10b981}',

        '.pb-foot{display:flex;flex-shrink:0;padding:.8em .7em;border-top:1px solid #2c2d30}',
        '.pb-act{display:flex;align-items:center;justify-content:center;flex:1 1 0;min-width:0;margin:0 .3em;padding:.85em .8em;' +
            'border-radius:8px;background:#2c2d30;font-size:.95em;font-weight:600;line-height:1.2;text-align:center;' +
            'cursor:pointer;transition:background .18s,color .18s}',
        '.pb-act .pb-i{width:1.25em;height:1.25em;margin-right:.55em}',
        '.pb-act.focus{background:#e2e8f0;color:#111}',
        '.pb-act.is-hot{background:#ffb300;color:#1c1400}',
        '.pb-act.is-hot.focus{background:#eab308;color:#111}',
        '.pb-hide{display:none!important}',

        '.pb-spin{animation:pb-rot .9s linear infinite}',
        '@keyframes pb-rot{to{transform:rotate(360deg)}}',
        '@keyframes pb-blink{50%{opacity:.25}}'
    ];

    function addStyles() {
        if ($('#plugins-badge-style').length) return;
        $('head').append('<style id="plugins-badge-style">' + CSS.join('') + '</style>');
    }

    var panel = null;
    var panel_prev = null;
    var panel_last = null;

    function onPress(el, fn) {
        var last = 0;
        el.on('hover:enter click', function (e) {
            var now = Date.now();
            if (now - last < 350) return;
            last = now;
            fn.call(this, e);
        });
    }

    function ensureVisible(list, el) {
        var lr = list.getBoundingClientRect();
        var er = el.getBoundingClientRect();
        var pad = 10;
        if (er.top < lr.top + pad) list.scrollTop -= (lr.top + pad - er.top);
        else if (er.bottom > lr.bottom - pad) list.scrollTop += (er.bottom - (lr.bottom - pad));
    }

    function buildRow(p) {
        var row = $(
            '<div class="pb-row selector" role="switch" data-index="' + p.index + '">' +
                '<div class="pb-row__tile">' + svg('cube') + '</div>' +
                '<div class="pb-row__body">' +
                    '<div class="pb-row__name"></div>' +
                    '<div class="pb-chip"></div>' +
                    '<div class="pb-row__url"></div>' +
                '</div>' +
                '<div class="pb-switch"></div>' +
            '</div>'
        );

        row.find('.pb-row__name').text(p.name);
        row.find('.pb-row__url').text(p.url.replace(/^https?:\/\//, ''));

        onPress(row, function () { setEnabled(p, !p.enabled); });

        row.on('hover:focus', function () {
            panel_last = this;
            var list = panel && panel.find('.pb-list')[0];
            if (list) ensureVisible(list, this);
        });

        return row;
    }

    function buildPanel() {
        var html = $(
            '<div class="pb-overlay">' +
                '<div class="pb-backdrop"></div>' +
                '<div class="pb-sheet">' +
                    '<div class="pb-head">' +
                        '<div class="pb-head__ico">' + svg('cube') + '</div>' +
                        '<div class="pb-head__text">' +
                            '<div class="pb-head__title">Плагины</div>' +
                            '<div class="pb-head__sub"></div>' +
                        '</div>' +
                        '<div class="pb-pill" data-state="loading">' +
                            '<span class="pb-pill__dot"></span><span class="pb-pill__count"></span>' +
                        '</div>' +
                        '<div class="pb-close selector">' + svg('close') + '</div>' +
                    '</div>' +
                    '<div class="pb-list"></div>' +
                    '<div class="pb-foot">' +
                        '<div class="pb-act pb-act--retry pb-hide">' + svg('retry') + '<span>Повторить</span></div>' +
                        '<div class="pb-act pb-act--reload selector">' + svg('power') + '<span>Перезагрузить</span></div>' +
                    '</div>' +
                '</div>' +
            '</div>'
        );

        var list = html.find('.pb-list');
        PLUGINS.forEach(function (p) { list.append(buildRow(p)); });

        html.find('.pb-backdrop').on('click', closePanel);
        onPress(html.find('.pb-close'), closePanel);
        onPress(html.find('.pb-act--retry'), function () { loadAll(true); });
        onPress(html.find('.pb-act--reload'), function () { window.location.reload(); });

        html.find('.pb-close, .pb-act').on('hover:focus', function () { panel_last = this; });

        return html;
    }

    function updatePanel(s, state) {
        if (!panel) return;

        panel.find('.pb-pill').attr('data-state', state);
        panel.find('.pb-pill__count').text(s.ok + '/' + s.total);
        panel.find('.pb-head__sub').text(subtitle(state));

        PLUGINS.forEach(function (p) {
            var row = panel.find('.pb-row[data-index="' + p.index + '"]');
            var st = rowState(p);

            if (row.attr('data-st') !== st) {
                var c = CHIP[st];
                row.attr('data-st', st);
                row.find('.pb-chip').html(svg(c.icon, st === 'loading' ? 'pb-spin' : '') + '<span>' + c.text + '</span>');
            }

            row.toggleClass('is-on', p.enabled);
            row.attr('aria-checked', p.enabled ? 'true' : 'false');
        });

        var retry = panel.find('.pb-act--retry');
        var had = retry.hasClass('selector');
        var need = s.fail > 0;

        retry.toggleClass('selector', need).toggleClass('pb-hide', !need);
        panel.find('.pb-act--reload').toggleClass('is-hot', needsReload());

        if (had !== need) refocus();
    }

    function refocus() {
        if (!panel) return;
        if (Lampa.Controller.enabled().name !== CTRL) return;

        var el = panel_last;
        if (!el || !el.offsetParent || !$(el).hasClass('selector')) {
            el = panel.find('.pb-act--reload')[0];
        }

        Lampa.Controller.collectionSet(panel);
        Lampa.Controller.collectionFocus(el || false, panel);
    }

    function openPanel() {
        if (panel) return;

        panel_prev = Lampa.Controller.enabled().name;
        panel_last = null;
        panel = buildPanel();

        $('body').append(panel);
        render();

        setTimeout(function () { if (panel) panel.addClass('pb-in'); }, 20);

        Lampa.Controller.toggle(CTRL);
    }

    function closePanel() {
        if (!panel) return;

        var el = panel;
        panel = null;
        panel_last = null;

        el.removeClass('pb-in');
        Lampa.Controller.toggle(panel_prev || 'content');
        setTimeout(function () { el.remove(); }, 300);
    }

    function registerController() {
        Lampa.Controller.add(CTRL, {
            toggle: function () {
                if (!panel) return;
                Lampa.Controller.collectionSet(panel);
                Lampa.Controller.collectionFocus(panel_last || panel.find('.pb-row')[0] || false, panel);
            },
            up:    function () { Navigator.move('up'); },
            down:  function () { Navigator.move('down'); },
            left:  function () { Navigator.move('left'); },
            right: function () { Navigator.move('right'); },
            enter: function () {
                var el = panel && panel.find('.selector.focus')[0];
                if (el) $(el).trigger('hover:enter');
            },
            back: closePanel
        });
    }

    function insertBadge() {
        var title = $('.head__title').first();
        var actions = $('.head__actions').first();

        if (!title.length && !actions.length) return false;
        if ($('.plugins-badge').length) return true;

        badge = $(
            '<div class="plugins-badge selector" data-state="loading">' +
            '<span class="pb-ico">' + svg('cube') + '</span>' +
            '<span class="plugins-badge__label">Плагины</span>' +
            '<span class="pb__count">0/' + PLUGINS.length + '</span>' +
            '</div>'
        );

        onPress(badge, openPanel);

        if (title.length) title.after(badge);
        else actions.before(badge);

        render();
        return true;
    }

    function start() {
        addStyles();
        registerController();

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