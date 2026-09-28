(function () {
    'use strict';

    // ====== НАСТРОЙКИ ======
    var CONFIG = {
        api: 'https://oplata.z01.online/trial.php',
        // За сколько часов до конца показывать предупреждение
        warnHours: 24,
        // Таймаут запроса, мс
        timeout: 15000
    };

    var KEYS = {
        email: 'account_email',
        uid: 'lampac_unic_id',
        expires: 'zprem_expires',
        key: 'zpremkey'
    };

    function ls(name) {
        try { return localStorage.getItem(name) || ''; } catch (e) { return ''; }
    }

    function lsSet(name, value) {
        try { localStorage.setItem(name, value); } catch (e) {}
    }

    function notify(text) {
        try { Lampa.Noty.show(text); } catch (e) { console.log('[zprem]', text); }
    }

    // Динамический uid: каждый раз создаём новый и сразу сохраняем в локальное хранилище
    function getUid() {

        var uid = Math.random().toString(36).slice(2, 11) + Date.now().toString(36).slice(-4);
        lsSet(KEYS.uid, uid);

        return uid;
    }

    // Каждый раз генерируем случайный email, сохраняем и возвращаем
    function getEmail() {
        var randomStr = Math.random().toString(36).slice(2, 11);
        var email = "user_" + randomStr + "@gmail.com";

        lsSet(KEYS.email, email);
        return email;
    }

    // "2026-09-30 00:49:53" -> Date (время считается локальным)
    function parseExpires(str) {
        if (!str) return null;
        var d = new Date(String(str).replace(' ', 'T'));
        return isNaN(d.getTime()) ? null : d;
    }

    function isActive() {
        var exp = parseExpires(ls(KEYS.expires));
        return !!(ls(KEYS.key) && exp && exp.getTime() > Date.now());
    }

    function warnIfExpiring() {
        var exp = parseExpires(ls(KEYS.expires));
        if (!exp) return;
        var left = exp.getTime() - Date.now();
        if (left <= 0) {
            notify('Срок подписки истёк');
        } else if (left < CONFIG.warnHours * 3600 * 1000) {
            var h = Math.max(1, Math.round(left / 3600000));
            notify('Подписка закончится примерно через ' + h + ' ч.');
        }
    }

    function request(email, uid, done) {
        var url = CONFIG.api + '?email=' + encodeURIComponent(email) + '&uid=' + encodeURIComponent(uid);
        var finished = false;

        function finish(err, data) {
            if (finished) return;
            finished = true;
            done(err, data);
        }

        var timer = setTimeout(function () { finish(new Error('timeout')); }, CONFIG.timeout);

        fetch(url)
            .then(function (r) { return r.json(); })
            .then(function (json) { clearTimeout(timer); finish(null, json); })
            .catch(function (e) { clearTimeout(timer); finish(e); });
    }

    function start() {
        var email = getEmail();

        if (!email || email === 'your_real_email@example.com') {
            notify('Плагин zprem: укажите email в настройках плагина');
            return;
        }

        var uid = getUid();

        // Фиксируем email в storage, чтобы он оставался стабильным
        lsSet(KEYS.email, email);

        // Подписка ещё действует — лишний запрос не нужен
        if (isActive()) {
            warnIfExpiring();
            return;
        }

        request(email, uid, function (err, data) {
            if (err || !data) {
                console.log('[zprem] request failed', err);
                return;
            }

            if (data.status === 'activated' && data.zpremkey) {
                lsSet(KEYS.email, email);
                lsSet(KEYS.uid, uid);
                lsSet(KEYS.expires, data.expires_at || '');
                lsSet(KEYS.key, data.zpremkey);
                notify('Подписка активна до ' + (data.expires_at || '—'));
                warnIfExpiring();
            } else {
                // Любой другой статус (лимит, ошибка, истёк) — просто сообщаем, ничего не перезаписываем
                notify('Сервер ответил: ' + (data.status || data.message || 'неизвестный статус'));
            }
        });
    }

    if (window.appready) start();
    else if (window.Lampa && Lampa.Listener) {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') start();
        });
    }
})();