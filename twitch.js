(function () {
    'use strict';

    if (window.plugin_twitch_ready) return;
    window.plugin_twitch_ready = true;

    var STORAGE_KEY = 'twitch_channels';

    var ICON = '<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M11.64 5.93h1.43v4.28h-1.43m3.93-4.28H17v4.28h-1.43M7 2L3.43 5.57v12.86h4.28V22l3.58-3.57h2.85L20.57 12V2m-1.43 9.29l-2.85 2.85h-2.86l-2.5 2.5v-2.5H7.71V3.43h11.43z"/></svg>';

    /* ---------- хранилище избранных каналов ---------- */

    function getChannels() {
        var list = Lampa.Storage.get(STORAGE_KEY, '[]');
        if (typeof list === 'string') {
            try { list = JSON.parse(list); } catch (e) { list = []; }
        }
        return Array.isArray(list) ? list : [];
    }

    function saveChannel(name) {
        var list = getChannels().filter(function (c) { return c !== name; });
        list.unshift(name);
        Lampa.Storage.set(STORAGE_KEY, list.slice(0, 20));
    }

    function removeChannel(name) {
        Lampa.Storage.set(STORAGE_KEY, getChannels().filter(function (c) { return c !== name; }));
    }

    /* ---------- компонент с плеером ---------- */

    function TwitchPlayer(object) {
        var html = $('<div class="twitch-player" style="position:fixed;top:0;left:0;width:100%;height:100%;background:#000;z-index:10;"></div>');

        this.create = function () {
            var parent = location.hostname || 'localhost';
            var src = 'https://player.twitch.tv/?channel=' + encodeURIComponent(object.channel) +
                '&parent=' + encodeURIComponent(parent) +
                '&autoplay=true&muted=false';

            var iframe = $('<iframe allowfullscreen="true" allow="autoplay; fullscreen; picture-in-picture" ' +
                'style="width:100%;height:100%;border:0;"></iframe>');
            iframe.attr('src', src);

            html.append(iframe);

            this.activity.loader(false);
            this.activity.toggle();
        };

        this.start = function () {
            Lampa.Controller.add('twitch_player', {
                toggle: function () {
                    Lampa.Controller.clear();
                },
                back: function () {
                    Lampa.Activity.backward();
                }
            });
            Lampa.Controller.toggle('twitch_player');
        };

        this.pause = function () {};
        this.stop = function () {};
        this.render = function () { return html; };
        this.destroy = function () { html.remove(); };
    }

    /* ---------- действия ---------- */

    function openChannel(name) {
        name = (name || '').trim().replace(/^https?:\/\/(www\.)?twitch\.tv\//i, '').replace(/[\/?#].*$/, '');
        if (!name) return;

        saveChannel(name);

        Lampa.Activity.push({
            url: '',
            title: 'Twitch — ' + name,
            component: 'twitch_player',
            channel: name,
            page: 1
        });
    }

    function openSite() {
        var url = 'https://www.twitch.tv/';
        if (Lampa.Utils && typeof Lampa.Utils.openLink === 'function') Lampa.Utils.openLink(url);
        else window.open(url, '_blank');
    }

    function askChannel(back) {
        Lampa.Input.edit({
            title: 'Название канала Twitch',
            value: '',
            free: true,
            nosave: true
        }, function (value) {
            if (value) openChannel(value);
            else back();
        });
    }

    function showMenu() {
        var enabled = Lampa.Controller.enabled().name;
        var back = function () { Lampa.Controller.toggle(enabled); };

        var items = [
            { title: 'Ввести название канала', action: 'input' }
        ];

        getChannels().forEach(function (c) {
            items.push({ title: c, action: 'channel', channel: c });
        });

        items.push({ title: 'Открыть twitch.tv в браузере', action: 'site' });

        Lampa.Select.show({
            title: 'Twitch',
            items: items,
            onSelect: function (item) {
                if (item.action === 'input') askChannel(back);
                else if (item.action === 'channel') openChannel(item.channel);
                else if (item.action === 'site') { back(); openSite(); }
            },
            onLong: function (item) {
                // долгое нажатие на канал — удалить из списка
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
