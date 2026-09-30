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
    var STORAGE_KEY = 'plugins_badge_off'; // имена отключённых плагинов
    var CTRL = 'plugins_badge_panel';      // имя контроллера панели

    // ===== SVG-иконки (24×24, линейные, цвет берут из currentColor) =====
    var PATHS = {
        cube:  '<path d="M12 3 4 7.5v9l8 4.5 8-4.5v-9L12 3Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>',
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

    // ===== Хранилище отключённых =====
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

    // статусы: wait | loading | ok | fail
    var off_list = readOff();
    PLUGINS.forEach(function (p, i) {
        p.index = i;
        p.status = 'wait';
        p.loaded = false;
        p.enabled = off_list.indexOf(p.name) === -1;
    });

    // ===== Загрузка =====
    function loadOne(p, done) {
        // уже работает, грузится или выключен — пропускаем
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

        // при повторе сразу показываем всю очередь как «загрузка»
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

        // если скрипт уже работал в этой сессии — просто возвращаем в счётчик
        if (on && !p.loaded && p.status !== 'loading') {
            p.retry = p.status === 'fail';
            loadOne(p);
            return;
        }
        render();
    }

    // ===== Статистика (считаем только включённые) =====
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

    // есть выключенные плагины, которые ещё работают до перезагрузки
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
        ok:      { text: 'Подключён' },
        fail:    { text: 'Ошибка загрузки' },
        loading: { text: 'Загрузка…' },
        off:     { text: 'Отключён' },
        pending: { text: 'Отключится после перезагрузки' }
    };

    function subtitle(state) {
        if (state === 'loading') return 'Загрузка…';
        if (state === 'fail') return 'Не удалось загрузить плагины';
        if (state === 'part') return 'Часть плагинов не загрузилась';
        if (needsReload()) return 'Изменения вступят в силу после перезагрузки';
        if (state === 'off') return 'Все плагины отключены';
        return 'Все плагины подключены';
    }

    // ===== Плашка в шапке =====
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

    // ===== Стили =====
    var CSS = [
        // --- цвета состояний плашки в шапке
        '.plugins-badge{--pb:#8b8f98;--pb-f:#6b7280}',
        '.plugins-badge[data-state="ok"]{--pb:#34d399;--pb-f:#0b8a5a}',
        '.plugins-badge[data-state="part"],.plugins-badge[data-state="loading"]{--pb:#fbbf24;--pb-f:#b45309}',
        '.plugins-badge[data-state="fail"]{--pb:#f87171;--pb-f:#dc2626}',

        // --- плашка в шапке
        '.plugins-badge{display:inline-flex;align-items:center;flex-shrink:0;margin:0 .4em;padding:.4em .8em;' +
            'border-radius:1em;background:none;color:inherit;font-size:1em;line-height:1;white-space:nowrap;cursor:pointer;' +
            'transition:background .2s,color .2s}',
        '.plugins-badge .pb-ico{display:inline-flex;width:1.25em;height:1.25em;margin-right:.5em;color:var(--pb);transition:color .3s}',
        '.plugins-badge .pb-ico .pb-i{width:100%;height:100%}',
        '.plugins-badge[data-state="loading"] .pb-ico{animation:pb-blink 1s infinite}',
        '.plugins-badge__label{opacity:.7;margin-right:.45em}',
        '.pb__count{opacity:.95;font-variant-numeric:tabular-nums}',
        '.plugins-badge.focus,.plugins-badge:hover{background:#fff;color:#000}',
        '.plugins-badge.focus .plugins-badge__label,.plugins-badge:hover .plugins-badge__label{opacity:.8}',
        '.plugins-badge.focus .pb-ico,.plugins-badge:hover .pb-ico{color:var(--pb-f)}',
        '@media (max-width:700px){.plugins-badge__label{display:none}}',

        // --- панель: как штатные «Настройки» Lampa — плоская, на всю высоту справа, без затемнения
        '.pb-overlay{position:fixed;left:0;top:0;right:0;bottom:0;z-index:2000;opacity:0;pointer-events:none;' +
            'transition:opacity .2s ease;color:#fff;font-family:inherit;-webkit-tap-highlight-color:transparent}',
        '.pb-overlay.pb-in{opacity:1;pointer-events:auto}',
        '.pb-backdrop{position:absolute;left:0;top:0;right:0;bottom:0;background:transparent}',
        '.pb-sheet{position:absolute;top:0;right:0;bottom:0;width:35em;max-width:100%;display:flex;flex-direction:column;' +
            'box-sizing:border-box;overflow:hidden;background:#262626;' +
            'padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);' +
            'transform:translate3d(100%,0,0);transition:transform .2s ease}',
        '.pb-overlay.pb-in .pb-sheet{transform:none}',
        '@media (max-width:700px){.pb-sheet{width:100%;font-size:clamp(13px,1em,18px)}}',

        // --- шапка: крупный тонкий заголовок, как «Настройки»
        '.pb-i{display:block;flex-shrink:0}',
        '.pb-head{display:flex;align-items:center;flex-shrink:0;padding:1.4em 1.5em .8em}',
        '.pb-head__text{flex:1 1 auto;min-width:0}',
        '.pb-head__title{font-size:2.4em;font-weight:300;line-height:1.15}',
        '.pb-head__sub{margin-top:.5em;font-size:1em;line-height:1.25;opacity:.5}',
        '.pb-head__count{flex-shrink:0;margin:0 .6em;font-size:1.2em;opacity:.5;font-variant-numeric:tabular-nums}',
        '.pb-close{display:flex;align-items:center;justify-content:center;flex-shrink:0;width:2.6em;height:2.6em;border-radius:50%;cursor:pointer}',
        '.pb-close .pb-i{width:1.3em;height:1.3em}',

        // --- список: строки на всю ширину, серый фокус
        '.pb-list{flex:1 1 auto;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;' +
            'padding:.5em 0;scroll-behavior:smooth}',
        '.pb-list::-webkit-scrollbar{display:none}',
        '.pb-row,.pb-act{display:flex;align-items:center;padding:1em 1.5em;cursor:pointer;background:none}',
        '.pb-row{--c:#7d7d7d}',
        '.pb-row[data-st="ok"]{--c:#4bbc16}',
        '.pb-row[data-st="loading"],.pb-row[data-st="pending"]{--c:#f5b400}',
        '.pb-row[data-st="fail"]{--c:#e04848}',
        '.pb-row__ico,.pb-act .pb-i{width:2.2em;height:2.2em;margin-right:1em}',
        '.pb-row__ico{display:flex;align-items:center;justify-content:center;transition:opacity .2s}',
        '.pb-row__ico .pb-i{width:100%;height:100%}',
        '.pb-row__body{flex:1 1 auto;min-width:0;transition:opacity .2s}',
        '.pb-row__name{font-size:1.4em;line-height:1.2}',
        '.pb-chip{display:flex;align-items:center;margin-top:.35em;font-size:1em;line-height:1.25;color:rgba(255,255,255,.75)}',
        '.pb-dot{flex-shrink:0;width:.6em;height:.6em;margin-right:.55em;border-radius:50%;background:var(--c)}',
        '.pb-row[data-st="loading"] .pb-dot{animation:pb-blink 1s infinite}',
        '.pb-row__url{margin-top:.3em;font-size:.85em;line-height:1.2;opacity:.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
        '.pb-row:not(.is-on) .pb-row__ico,.pb-row:not(.is-on) .pb-row__body{opacity:.45}',
        '.pb-row.focus,.pb-act.focus,.pb-close.focus{background:rgba(255,255,255,.1)}',

        // --- нижние действия — обычные строки
        '.pb-foot{flex-shrink:0;padding:0 0 .5em}',
        '.pb-act{font-size:1.4em;line-height:1.2}',
        '.pb-act .pb-i{width:1.57em;height:1.57em;margin-right:.71em}',
        '.pb-act.is-hot{color:#f5b400}',
        '.pb-hide{display:none!important}',

        // --- анимации
        '@keyframes pb-blink{50%{opacity:.35}}'
    ];

    function addStyles() {
        if ($('#plugins-badge-style').length) return;
        $('head').append('<style id="plugins-badge-style">' + CSS.join('') + '</style>');
    }

    // ===== Панель со списком плагинов =====
    var panel = null;        // корневой элемент панели (пока открыта)
    var panel_prev = null;   // контроллер, который был до открытия
    var panel_last = null;   // последний элемент в фокусе

    // защита от двойного срабатывания (hover:enter + click)
    function onPress(el, fn) {
        var last = 0;
        el.on('hover:enter click', function (e) {
            var now = Date.now();
            if (now - last < 350) return;
            last = now;
            fn.call(this, e);
        });
    }

    // прокрутка списка так, чтобы элемент в фокусе был виден целиком
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
                '<div class="pb-row__ico">' + svg('cube') + '</div>' +
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
                        '<div class="pb-head__text">' +
                            '<div class="pb-head__title">Плагины</div>' +
                            '<div class="pb-head__sub"></div>' +
                        '</div>' +
                        '<div class="pb-head__count"></div>' +
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

    // обновление панели «на лету» (статусы меняются, пока она открыта)
    function updatePanel(s, state) {
        if (!panel) return;

        panel.find('.pb-head__count').text(s.ok + '/' + s.total);
        panel.find('.pb-head__sub').text(subtitle(state));

        PLUGINS.forEach(function (p) {
            var row = panel.find('.pb-row[data-index="' + p.index + '"]');
            var st = rowState(p);

            if (row.attr('data-st') !== st) {
                var c = CHIP[st];
                row.attr('data-st', st);
                row.find('.pb-chip').html('<span class="pb-dot"></span><span>' + c.text + '</span>');
            }

            row.toggleClass('is-on', p.enabled);
            row.attr('aria-checked', p.enabled ? 'true' : 'false');
        });

        // кнопка «Повторить» появляется только при ошибках
        var retry = panel.find('.pb-act--retry');
        var had = retry.hasClass('selector');
        var need = s.fail > 0;

        retry.toggleClass('selector', need).toggleClass('pb-hide', !need);
        panel.find('.pb-act--reload').toggleClass('is-hot', needsReload());

        if (had !== need) refocus();
    }

    // пересобрать список кнопок для пульта и вернуть фокус
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

        // следующий кадр — запускаем анимацию появления
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
        setTimeout(function () { el.remove(); }, 250);
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

    // ===== Вставка плашки в шапку =====
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