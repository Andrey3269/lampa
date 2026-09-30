/*
 * YouTube + отдельный прокси (плагин для Lampa)
 *
 * Что делает:
 *  - добавляет пункт «YouTube» в главное меню (поиск, «В тренде», открытие по ссылке);
 *  - видео берутся через API Invidious-инстанса и играются штатным плеером Lampa;
 *  - в Настройки → YouTube можно указать прокси, который применяется
 *    ТОЛЬКО к запросам этого плагина (API, картинки, потоки). Остальной Lampa не затрагивается.
 *
 * Формат прокси (браузерный JS не умеет HTTP/SOCKS-прокси, нужен URL-прокси / CORS-прокси):
 *   https://proxy.example.com/            -> https://proxy.example.com/https://site/path
 *   https://proxy.example.com/?url=       -> https://proxy.example.com/?url=<url-encoded>
 *   https://proxy.example.com/?u={url}    -> подстановка «как есть»
 *   https://proxy.example.com/?u={eurl}   -> подстановка url-encoded
 *
 * Подключение: Настройки → Расширения → добавить плагин по ссылке на этот файл.
 */
(function () {
    'use strict';

    if (window.ytp_plugin_loaded) return;
    window.ytp_plugin_loaded = true;

    var DEFAULT_INSTANCE = 'https://inv.nadeko.net';

    var ICON = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2C2 8.8 2 12 2 12s0 3.2.4 4.8a2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8c.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8z" fill="currentColor"/>' +
        '<path d="M10 15l5-3-5-3v6z" fill="#000"/></svg>';

    /* ---------- Настройки / прокси ---------- */

    function instance() {
        var v = (Lampa.Storage.get('ytp_instance', DEFAULT_INSTANCE) || DEFAULT_INSTANCE).trim();
        if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
        return v.replace(/\/+$/, '');
    }

    // Оборачивает URL в прокси, если он включён. Используется только внутри этого плагина.
    function proxify(url) {
        if (!Lampa.Storage.field('ytp_proxy_enable')) return url;

        var proxy = (Lampa.Storage.get('ytp_proxy_url', '') || '').trim();
        if (!proxy) return url;

        if (proxy.indexOf('{url}') > -1) return proxy.replace('{url}', url);
        if (proxy.indexOf('{eurl}') > -1) return proxy.replace('{eurl}', encodeURIComponent(url));
        if (/[=?]$/.test(proxy)) return proxy + encodeURIComponent(url);
        return proxy.replace(/\/+$/, '') + '/' + url;
    }

    function absUrl(u) {
        if (!u) return u;
        if (u.indexOf('//') === 0) return 'https:' + u;
        if (u.charAt(0) === '/') return instance() + u;
        return u;
    }

    function api(path, ok, fail) {
        var net = new Lampa.Reguest();
        net.timeout(20000);
        net.silent(proxify(instance() + path), ok, fail || function () {});
        return net;
    }

    function fmtTime(sec) {
        sec = parseInt(sec, 10);
        if (!sec) return '';
        var h = Math.floor(sec / 3600),
            m = Math.floor((sec % 3600) / 60),
            s = sec % 60;
        function p(n) { return n < 10 ? '0' + n : '' + n; }
        return (h ? h + ':' + p(m) : m) + ':' + p(s);
    }

    function videoIdFromText(text) {
        var m = (text || '').match(/(?:[?&]v=|youtu\.be\/|shorts\/|embed\/|live\/)([\w-]{11})/);
        return m ? m[1] : null;
    }

    /* ---------- Воспроизведение ---------- */

    function play(id, title) {
        Lampa.Noty.show('YouTube: загрузка видео…');

        api('/api/v1/videos/' + id + '?local=true', function (d) {
            var streams = (d.formatStreams || []).filter(function (s) { return s && s.url; });
            var quality = {};
            var first = null;

            streams.sort(function (a, b) {
                return (parseInt(b.qualityLabel || b.quality, 10) || 0) - (parseInt(a.qualityLabel || a.quality, 10) || 0);
            });

            streams.forEach(function (s) {
                var label = s.qualityLabel || s.quality || 'auto';
                var u = proxify(absUrl(s.url));
                if (!quality[label]) quality[label] = u;
                if (!first) first = u;
            });

            if (!first && d.hlsUrl) first = proxify(absUrl(d.hlsUrl));

            if (!first) {
                Lampa.Noty.show('YouTube: не найдено доступных потоков');
                return;
            }

            var data = { url: first, title: title || d.title || 'YouTube' };
            if (Object.keys(quality).length > 1) data.quality = quality;

            Lampa.Player.play(data);
            Lampa.Player.playlist([data]);
        }, function () {
            Lampa.Noty.show('YouTube: ошибка запроса (проверьте инстанс и прокси)');
        });
    }

    /* ---------- Компонент ---------- */

    function Component(object) {
        var scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
        var html = $('<div></div>');
        var toolbar = $('<div class="ytp-toolbar"></div>');
        var grid = $('<div class="ytp-grid"></div>');
        var last;
        var net;

        this.create = function () {
            var self = this;

            this.activity.loader(true);

            scroll.minus();
            html.append(scroll.render());
            scroll.append(toolbar);
            scroll.append(grid);

            buildToolbar();
            load(function () {
                self.activity.loader(false);
                self.activity.toggle();
            });

            return this.render();
        };

        function buildToolbar() {
            var btnSearch = $('<div class="ytp-btn selector">Поиск</div>');
            var btnTrend = $('<div class="ytp-btn selector">В тренде</div>');
            var btnLink = $('<div class="ytp-btn selector">По ссылке</div>');

            btnSearch.on('hover:focus', function () { last = btnSearch[0]; scroll.update(btnSearch, true); });
            btnTrend.on('hover:focus', function () { last = btnTrend[0]; scroll.update(btnTrend, true); });
            btnLink.on('hover:focus', function () { last = btnLink[0]; scroll.update(btnLink, true); });

            btnSearch.on('hover:enter', function () {
                askText('Поиск на YouTube', function (q) {
                    Lampa.Activity.push({ url: '', title: 'YouTube: ' + q, component: 'ytp_main', query: q, page: 1 });
                });
            });

            btnTrend.on('hover:enter', function () {
                Lampa.Activity.push({ url: '', title: 'YouTube', component: 'ytp_main', query: '', page: 1 });
            });

            btnLink.on('hover:enter', function () {
                askText('Ссылка на видео YouTube', function (t) {
                    var id = videoIdFromText(t);
                    if (id) play(id, 'YouTube');
                    else Lampa.Noty.show('YouTube: не удалось распознать ссылку');
                });
            });

            toolbar.append(btnSearch).append(btnTrend).append(btnLink);
        }

        function askText(title, cb) {
            Lampa.Input.edit({ free: true, title: title, nosave: true, value: '' }, function (value) {
                Lampa.Controller.toggle('content');
                value = (value || '').trim();
                if (value) cb(value);
            });
        }

        function message(text) {
            grid.empty().append($('<div class="ytp-msg"></div>').text(text));
        }

        function addCard(v) {
            if (!v || !v.videoId) return;

            var el = $(
                '<div class="ytp-card selector">' +
                    '<div class="ytp-card__img"><img alt=""><span class="ytp-card__time"></span></div>' +
                    '<div class="ytp-card__title"></div>' +
                    '<div class="ytp-card__meta"></div>' +
                '</div>'
            );

            el.find('.ytp-card__title').text(v.title || '');
            el.find('.ytp-card__meta').text(v.author || '');
            el.find('.ytp-card__time').text(fmtTime(v.lengthSeconds));
            el.find('img').attr('src', proxify('https://i.ytimg.com/vi/' + v.videoId + '/mqdefault.jpg'));

            el.on('hover:focus', function () {
                last = el[0];
                scroll.update(el, true);
            });

            el.on('hover:enter', function () {
                play(v.videoId, v.title);
            });

            grid.append(el);
        }

        function render(list) {
            grid.empty();

            var count = 0;
            (list || []).forEach(function (v) {
                if (v && v.videoId && (!v.type || v.type === 'video')) {
                    addCard(v);
                    count++;
                }
            });

            if (!count) message('Ничего не найдено');
        }

        function load(done) {
            var q = object.query;
            var path;

            if (q) path = '/api/v1/search?type=video&q=' + encodeURIComponent(q);
            else path = '/api/v1/trending';

            net = api(path, function (data) {
                render(data);
                done();
            }, function () {
                if (!q) {
                    // запасной вариант для инстансов без /trending
                    net = api('/api/v1/popular', function (data) {
                        render(data);
                        done();
                    }, function () {
                        message('Не удалось загрузить список. Проверьте инстанс и прокси в Настройки → YouTube.');
                        done();
                    });
                } else {
                    message('Не удалось выполнить поиск. Проверьте инстанс и прокси в Настройки → YouTube.');
                    done();
                }
            });
        }

        this.start = function () {
            if (Lampa.Activity.active().activity !== this.activity) return;

            Lampa.Controller.add('content', {
                toggle: function () {
                    Lampa.Controller.collectionSet(scroll.render());
                    Lampa.Controller.collectionFocus(last || false, scroll.render());
                },
                left: function () {
                    if (Navigator.canmove('left')) Navigator.move('left');
                    else Lampa.Controller.toggle('menu');
                },
                right: function () { Navigator.move('right'); },
                up: function () {
                    if (Navigator.canmove('up')) Navigator.move('up');
                    else Lampa.Controller.toggle('head');
                },
                down: function () {
                    if (Navigator.canmove('down')) Navigator.move('down');
                },
                back: function () { Lampa.Activity.backward(); }
            });

            Lampa.Controller.toggle('content');
        };

        this.pause = function () {};
        this.stop = function () {};
        this.render = function () { return html; };

        this.destroy = function () {
            if (net) net.clear();
            scroll.destroy();
            html.remove();
        };
    }

    /* ---------- Инициализация ---------- */

    function addStyles() {
        $('body').append('<style>' +
            '.ytp-toolbar{display:flex;padding:1em 1.5em 0}' +
            '.ytp-btn{padding:.7em 1.5em;margin-right:1em;border-radius:.5em;background:rgba(255,255,255,.1);font-size:1.2em}' +
            '.ytp-btn.focus{background:#fff;color:#000}' +
            '.ytp-grid{display:flex;flex-wrap:wrap;padding:1em 1em 2em}' +
            '.ytp-card{width:20%;padding:.6em;box-sizing:border-box}' +
            '.ytp-card__img{position:relative;padding-top:56.25%;background:rgba(255,255,255,.08);border-radius:.6em;overflow:hidden}' +
            '.ytp-card__img img{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover}' +
            '.ytp-card__time{position:absolute;right:.4em;bottom:.4em;background:rgba(0,0,0,.75);padding:.1em .4em;border-radius:.3em;font-size:.9em}' +
            '.ytp-card__title{margin-top:.5em;font-size:1.1em;line-height:1.25;max-height:2.5em;overflow:hidden}' +
            '.ytp-card__meta{opacity:.6;font-size:.9em;margin-top:.2em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
            '.ytp-card.focus .ytp-card__img{box-shadow:0 0 0 .2em #fff}' +
            '.ytp-msg{padding:2em;font-size:1.3em;opacity:.7}' +
            '@media screen and (max-width:900px){.ytp-card{width:33.333%}}' +
            '@media screen and (max-width:600px){.ytp-card{width:50%}}' +
            '</style>');
    }

    function addSettings() {
        Lampa.SettingsApi.addComponent({
            component: 'ytp',
            name: 'YouTube',
            icon: ICON
        });

        Lampa.SettingsApi.addParam({
            component: 'ytp',
            param: { name: 'ytp_proxy_enable', type: 'trigger', default: false },
            field: {
                name: 'Использовать прокси',
                description: 'Прокси применяется только к YouTube (запросы этого плагина)'
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'ytp',
            param: { name: 'ytp_proxy_url', type: 'input', values: '', default: '', placeholder: 'https://proxy.example.com/' },
            field: {
                name: 'Адрес прокси',
                description: 'https://host/ · https://host/?url= · https://host/?u={url} · {eurl} — url-encoded'
            },
            onChange: function () { Lampa.Settings.update(); }
        });

        Lampa.SettingsApi.addParam({
            component: 'ytp',
            param: { name: 'ytp_instance', type: 'input', values: '', default: DEFAULT_INSTANCE, placeholder: DEFAULT_INSTANCE },
            field: {
                name: 'Invidious-инстанс',
                description: 'Сервер с включённым API (список: api.invidious.io)'
            },
            onChange: function () { Lampa.Settings.update(); }
        });

        Lampa.SettingsApi.addParam({
            component: 'ytp',
            param: { name: 'ytp_test', type: 'button' },
            field: { name: 'Проверить соединение', description: 'Запрос к инстансу с учётом прокси' },
            onChange: function () {
                Lampa.Noty.show('YouTube: проверка…');
                api('/api/v1/stats', function () {
                    Lampa.Noty.show('YouTube: соединение работает');
                }, function () {
                    Lampa.Noty.show('YouTube: нет соединения (инстанс/прокси недоступны)');
                });
            }
        });
    }

    function addMenu() {
        var item = $(
            '<li class="menu__item selector">' +
                '<div class="menu__ico">' + ICON + '</div>' +
                '<div class="menu__text">YouTube</div>' +
            '</li>'
        );

        item.on('hover:enter', function () {
            Lampa.Activity.push({ url: '', title: 'YouTube', component: 'ytp_main', query: '', page: 1 });
        });

        $('.menu .menu__list').eq(0).append(item);
    }

    function start() {
        Lampa.Component.add('ytp_main', Component);
        addStyles();
        addSettings();
        addMenu();
    }

    if (window.appready) start();
    else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') start();
        });
    }
})();
