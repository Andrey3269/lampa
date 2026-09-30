(function () {
    'use strict';

    if (window.plugins_badge_ready) return;
    window.plugins_badge_ready = true;

    // ===== Список плагинов для автозагрузки =====
    var PLUGINS = [
        { name: 'rar',    url: 'https://andrey3269.github.io/lampa/rar.js' },
        { name: 'domen',  url: 'https://andrey3269.github.io/lampa/domen.js' },
        { name: 'lgbt',   url: 'https://andrey3269.github.io/lampa/lgbt.js' },
        { name: 'tv',     url: 'https://andrey3269.github.io/lampa/tv.js' },
        { name: 'player', url: 'https://andrey3269.github.io/lampa/player.js' }
    ];

    var TIMEOUT = 10000; // мс на один плагин

    // статусы: wait | loading | ok | fail
    PLUGINS.forEach(function (p) { p.status = 'wait'; });

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
            render();
            done();
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
            return only_failed ? p.status === 'fail' : true;
        });

        (function next() {
            var p = queue.shift();
            if (!p) return;
            if (only_failed) p.retry = true;
            loadOne(p, next);
        })();
    }

    // ===== Статистика =====
    function stats() {
        var ok = 0, fail = 0, busy = 0;
        PLUGINS.forEach(function (p) {
            if (p.status === 'ok') ok++;
            else if (p.status === 'fail') fail++;
            else busy++;
        });
        return { ok: ok, fail: fail, busy: busy, total: PLUGINS.length };
    }

    // ===== Плашка =====
    var badge;

    function render() {
        if (!badge) return;
        var s = stats();
        var state = 'loading';

        if (s.busy === 0) {
            state = s.fail === 0 ? 'ok' : (s.ok === 0 ? 'fail' : 'part');
        }

        badge.attr('data-state', state);
        badge.find('.pb__count').text(s.ok + '/' + s.total);
    }

    function addStyles() {
        if ($('#plugins-badge-style').length) return;

        $('head').append(
            '<style id="plugins-badge-style">' +
            '.plugins-badge{display:inline-flex;align-items:center;flex-shrink:0;' +
            'margin:0 1.2em;padding:.35em .9em;border-radius:2em;' +
            'background:rgba(255,255,255,.08);color:#fff;font-size:1.05em;' +
            'line-height:1;white-space:nowrap;cursor:pointer;transition:background .2s,color .2s}' +
            '.plugins-badge__dot{width:.6em;height:.6em;border-radius:50%;margin-right:.6em;' +
            'background:#aaa;transition:background .3s,box-shadow .3s}' +
            '.plugins-badge__label{opacity:.85;margin-right:.6em}' +
            '.pb__count{font-weight:600}' +
            '.plugins-badge[data-state="ok"] .plugins-badge__dot{background:#3ddc84;box-shadow:0 0 .5em #3ddc84}' +
            '.plugins-badge[data-state="part"] .plugins-badge__dot{background:#ffb300;box-shadow:0 0 .5em #ffb300}' +
            '.plugins-badge[data-state="fail"] .plugins-badge__dot{background:#ff5252;box-shadow:0 0 .5em #ff5252}' +
            '.plugins-badge[data-state="loading"] .plugins-badge__dot{background:#ffb300;animation:pb-blink 1s infinite}' +
            '@keyframes pb-blink{50%{opacity:.3}}' +
            '.plugins-badge.focus,.plugins-badge:hover{background:#fff;color:#000}' +
            '@media (max-width:700px){.plugins-badge__label{display:none}.plugins-badge{margin:0 .6em}}' +
            '</style>'
        );
    }

    function icon(status) {
        if (status === 'ok') return '🟢';
        if (status === 'fail') return '🔴';
        return '🟡';
    }

    function showList() {
        var prev = Lampa.Controller.enabled().name;
        var s = stats();

        var items = PLUGINS.map(function (p) {
            return { title: icon(p.status) + '  ' + p.name, subtitle: p.url, disabled: true };
        });

        if (s.fail > 0) {
            items.push({ title: '🔄  Повторить неудачные', retry: true });
        }

        Lampa.Select.show({
            title: 'Плагины ' + s.ok + '/' + s.total,
            items: items,
            onSelect: function (item) {
                Lampa.Controller.toggle(prev);
                if (item.retry) loadAll(true);
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

        // Плашка может появиться не сразу — пробуем несколько раз
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
