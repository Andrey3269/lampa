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
            // если скрипт уже работал в этой сессии — просто возвращаем в счётчик
            if (!p.loaded && p.status !== 'loading') {
                p.retry = p.status === 'fail';
                loadOne(p);
            }
        } else if (p.loaded) {
            Lampa.Noty.show('«' + p.name + '» отключится после перезагрузки');
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

    // ===== Плашка =====
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
    }

    function addStyles() {
        if ($('#plugins-badge-style').length) return;

        $('head').append(
            '<style id="plugins-badge-style">' +
            // без фона — как остальные элементы шапки
            '.plugins-badge{display:inline-flex;align-items:center;flex-shrink:0;' +
            'margin:0 .4em;padding:.35em .7em;border-radius:1em;background:none;' +
            'color:inherit;font-size:1em;line-height:1;white-space:nowrap;cursor:pointer}' +
            '.plugins-badge__dot{width:.5em;height:.5em;border-radius:50%;margin-right:.55em;' +
            'background:#8a8a8a;transition:background .3s,box-shadow .3s}' +
            '.plugins-badge__label{opacity:.7;margin-right:.45em}' +
            '.pb__count{opacity:.95}' +
            '.plugins-badge[data-state="ok"] .plugins-badge__dot{background:#3ddc84;box-shadow:0 0 .4em rgba(61,220,132,.7)}' +
            '.plugins-badge[data-state="part"] .plugins-badge__dot{background:#ffb300;box-shadow:0 0 .4em rgba(255,179,0,.7)}' +
            '.plugins-badge[data-state="fail"] .plugins-badge__dot{background:#ff5252;box-shadow:0 0 .4em rgba(255,82,82,.7)}' +
            '.plugins-badge[data-state="loading"] .plugins-badge__dot{background:#ffb300;animation:pb-blink 1s infinite}' +
            '@keyframes pb-blink{50%{opacity:.3}}' +
            // фокус — как у кнопок шапки Lampa
            '.plugins-badge.focus,.plugins-badge:hover{background:#fff;color:#000}' +
            '.plugins-badge.focus .plugins-badge__label,.plugins-badge:hover .plugins-badge__label{opacity:.8}' +
            '@media (max-width:700px){.plugins-badge__label{display:none}}' +
            '</style>'
        );
    }

    function icon(p) {
        if (!p.enabled) return '⚪';
        if (p.status === 'ok') return '🟢';
        if (p.status === 'fail') return '🔴';
        return '🟡';
    }

    function statusText(p) {
        if (!p.enabled) return p.loaded ? 'Отключится после перезагрузки' : 'Отключён';
        if (p.status === 'ok') return 'Подключён';
        if (p.status === 'fail') return 'Ошибка загрузки';
        return 'Загрузка…';
    }

    // ===== Меню =====
    function showList() {
        var prev = Lampa.Controller.enabled().name;
        var s = stats();

        var items = PLUGINS.map(function (p) {
            return {
                title: icon(p) + '  ' + p.name,
                subtitle: statusText(p) + ' · ' + p.url,
                checkbox: true,
                checked: p.enabled,
                index: p.index
            };
        });

        if (s.fail > 0) items.push({ title: '🔄  Повторить неудачные', action: 'retry' });
        items.push({ title: '♻️  Перезагрузить приложение', action: 'reload' });

        function onCheck(item) {
            var p = PLUGINS[item.index];
            if (p) setEnabled(p, !!item.checked);
        }

        Lampa.Select.show({
            title: 'Плагины ' + s.ok + '/' + s.total,
            items: items,
            onCheck: onCheck,
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
        if ($('.plugins-badge').length) return true;

        badge = $(
            '<div class="plugins-badge selector" data-state="loading">' +
            '<span class="plugins-badge__dot"></span>' +
            '<span class="plugins-badge__label">Плагины</span>' +
            '<span class="pb__count">0/' + PLUGINS.length + '</span>' +
            '</div>'
        );

        badge.on('hover:enter click', showList);

        if (title.length) title.after(badge);
        else actions.before(badge);

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