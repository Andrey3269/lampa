(function () {
    'use strict';

    if (window.plugin_twitch_ready) return;
    window.plugin_twitch_ready = true;

    var KEY_CHANNELS = 'twitch_channels';
    var KEY_PARENT = 'twitch_parent';
    var KEY_MODE = 'twitch_mode'; // 'embed' | 'browser'

    var ICON = '<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M11.64 5.93h1.43v4.28h-1.43m3.93-4.28H17v4.28h-1.43M7 2L3.43 5.57v12.86h4.28V22l3.58-3.57h2.85L20.57 12V2m-1.43 9.29l-2.85 2.85h-2.86l-2.5 2.5v-2.5H7.71V3.43h11.43z"/></svg>';

    /* ---------- хранилище ---------- */

    function getChannels() {
        var list = Lampa.Storage.get(KEY_CHANNELS, '[]');
        if (typeof list === 'string') {
            try { list = JSON.parse(list); } catch (e) { list = []; }
        }
        return Array.isArray(list) ? list : [];
    }

    function saveChannel(name) {
        var list = getChannels().filter(function (c) { return c !== name; });
        list.unshift(name);
        Lampa.Storage.set(KEY_CHANNELS, list.slice(0, 20));
    }

    function removeChannel(name) {
        Lampa.Storage.set(KEY_CHANNELS, getChannels().filter(function (c) { return c !== name; }));
    }

    function getMode() {
        return Lampa.Storage.get(KEY_MODE, 'embed') === 'browser' ? 'browser' : 'embed';
    }

    function getCustomParent() {
        var v = Lampa.Storage.get(KEY_PARENT, '');
        return typeof v === 'string' ? v : '';
    }

    /* ---------- домены для параметра parent ---------- */

    function getParents() {
        var list = [];

        function add(host) {
            host = (host || '').trim().replace(/^https?:\/\//i, '').replace(/[\/:?#].*$/, '');
            if (host && list.indexOf(host) === -1) list.push(host);
        }

        // 1. домен, указанный вручную
        getCustomParent().split(/[\s,;]+/).forEach(add);

        // 2. текущий домен страницы
        add(location.hostname);

        // 3. домены внешних страниц, если Lampa открыта внутри iframe
        try {
            if (location.ancestorOrigins) {
                for (var i = 0; i < location.ancestorOrigins.length; i++) {
                    add(new URL(location.ancestorOrigins[i]).hostname);
                }
            }
        } catch (e) {}

        try {
            if (document.referrer) add(new URL(document.referrer).hostname);
        } catch (e) {}

        if (!list.length) add('localhost');

        return list.slice(0, 10); // Twitch принимает до 10 parent
    }

    /* ---------- компонент с плеером ---------- */

    function TwitchPlayer(object) {
        var html = $('<div class="twitch-player" style="position:fixed;top:0;left:0;width:100%;height:100%;background:#000;z-index:10;"></div>');

        this.create = function () {
            var src = 'https://player.twitch.tv/?channel=' + encodeURIComponent(object.channel) +
                getParents().map(function (p) { return '&parent=' + encodeURIComponent(p); }).join('') +
                '&autoplay=true&muted=false';

            var iframe = $('<iframe allowfullscreen="true" allow="autoplay; fullscreen; picture-in-picture" ' +
                'style="width:100%;height:100%;border:0;"></iframe>');
            iframe.attr('src', src);

            var hint = $('<div style="position:absolute;top:1em;left:50%;transform:translateX(-50%);' +
                'padding:.6em 1.2em;background:rgba(0,0,0,.75);color:#fff;border-radius:.5em;font-size:1.1em;' +
                'pointer-events:none;transition:opacity .5s;">' +
                'Не грузится? Назад → «Режим» → браузер, либо укажите домен (parent)</div>');
            setTimeout(function () { hint.css('opacity', 0); }, 6000);

            html.append(iframe).append(hint);

            this.activity.loader(false);
            this.activity.toggle();
        };

        this.start = function () {
            Lampa.Controller.add('twitch_player', {
                toggle: function () { Lampa.Controller.clear(); },
                back: function () { Lampa.Activity.backward(); }
            });
            Lampa.Controller.toggle('twitch_player');
        };

        this.pause = function () {};
        this.stop = function () {};
        this.render = function () { return html; };
        this.destroy = function () { html.remove(); };
    }

    /* ---------- действия ---------- */

    function openLink(url) {
        if (Lampa.Utils && typeof Lampa.Utils.openLink === 'function') Lampa.Utils.openLink(url);
        else window.open(url, '_blank');
    }

    function cleanName(name) {
        return (name || '').trim()
            .replace(/^https?:\/\/(www\.)?twitch\.tv\//i, '')
            .replace(/[\/?#].*$/, '');
    }

    function openChannel(name) {
        name = cleanName(name);
        if (!name) return;

        saveChannel(name);

        if (getMode() === 'browser') {
            openLink('https://www.twitch.tv/' + encodeURIComponent(name));
            return;
        }

        Lampa.Activity.push({
            url: '',
            title: 'Twitch — ' + name,
            component: 'twitch_player',
            channel: name,
            page: 1
        });
    }

    function askInput(title, value, cb, back) {
        Lampa.Input.edit({
            title: title,
            value: value || '',
            free: true,
            nosave: true
        }, function (v) {
            if (typeof v === 'string') cb(v);
            else back();
        });
    }

    function showMenu() {
        var enabled = Lampa.Controller.enabled().name;
        var back = function () { Lampa.Controller.toggle(enabled); };
        var mode = getMode();
        var parent = getCustomParent();

        var items = [
            { title: 'Ввести название канала', action: 'input' }
        ];

        getChannels().forEach(function (c) {
            items.push({ title: c, action: 'channel', channel: c });
        });

        items.push({ title: 'Режим: ' + (mode === 'embed' ? 'встроенный плеер' : 'браузер'), action: 'mode' });
        items.push({ title: 'Домен (parent): ' + (parent || 'авто'), action: 'parent' });
        items.push({ title: 'Открыть twitch.tv в браузере', action: 'site' });

        Lampa.Select.show({
            title: 'Twitch',
            items: items,
            onSelect: function (item) {
                switch (item.action) {
                    case 'input':
                        askInput('Название канала Twitch', '', function (v) {
                            if (cleanName(v)) openChannel(v); else back();
                        }, back);
                        break;
                    case 'channel':
                        openChannel(item.channel);
                        break;
                    case 'mode':
                        Lampa.Storage.set(KEY_MODE, mode === 'embed' ? 'browser' : 'embed');
                        Lampa.Select.close();
                        showMenu();
                        break;
                    case 'parent':
                        askInput('Домен, где открыта Lampa (пусто = авто)', parent, function (v) {
                            Lampa.Storage.set(KEY_PARENT, v.trim());
                            showMenu();
                        }, back);
                        break;
                    case 'site':
                        back();
                        openLink('https://www.twitch.tv/');
                        break;
                }
            },
            onLong: function (item) {
                if (item.action === 'channel') {
                    removeChannel(item.channel);
                    Lampa.Noty.show('Канал удалён: ' + item.channel);
                    Lampa.Select.close();
                    showMenu();
                }
            },
            onBack: back
        });
    }

    /* ---------- запуск ---------- */

    function startPlugin() {
        Lampa.Component.add('twitch_player', TwitchPlayer);

        var button = $(
            '<li class="menu__item selector" data-action="twitch">' +
                '<div class="menu__ico">' + ICON + '</div>' +
                '<div class="menu__text">Twitch</div>' +
            '</li>'
        );

        button.on('hover:enter', showMenu);

        $('.menu .menu__list').eq(0).append(button);
    }

    if (window.appready) startPlugin();
    else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') startPlugin();
        });
    }
})();