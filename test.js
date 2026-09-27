(function () {
    'use strict';

    if (window.lampa_wtch_unified_v1) return;
    window.lampa_wtch_unified_v1 = true;

    var VERSION = '1.4.0';

    // =========================================================
    // WTCH
    // =========================================================

    var SCRIPT_URL = 'http://wtch.ch/m';

    // =========================================================
    // ВСПОМОГАТЕЛЬНЫЕ
    // =========================================================

    function safe(fn) {
        try {
            return fn();
        } catch (e) {
            return null;
        }
    }

    // =========================================================
    // HIDE ДЛЯ РОДНОЙ КНОПКИ "СМОТРЕТЬ"
    // =========================================================

    function hideWatchButton(root) {
        var scope = root || document;

        safe(function () {
            var buttons = scope.querySelectorAll(
                '.full-start__button.selector.button--play'
            );

            for (var i = 0; i < buttons.length; i++) {
                buttons[i].classList.add('hide');
            }
        });
    }

    // =========================================================
    // СТИЛИ
    // =========================================================

    function injectCSS() {
        if (document.getElementById('lampa_wtch_hide_css')) return;

        var style = document.createElement('style');

        style.id = 'lampa_wtch_hide_css';

        style.innerHTML = `
            .view--trailer,
            [data-action="trailer"],

            .shots-view-button,
            .view--shots,
            .shots-view,
            [data-action="shots"],
            [data-action="shorts"],

            .view--torrent,
            .view--torrents,
            .torrent-view,
            .torrent-view-button,
            .torrent-button,

            [data-action="torrent"],
            [data-action="torrents"],
            [data-type="torrent"],
            [data-type="torrents"],

            .button--torrent,

            .full-start__button[data-subtitle*="торрент"],
            .full-start__button[data-subtitle*="Torrent"] {
                display: none !important;
            }
        `;

        document.head.appendChild(style);
    }

    // =========================================================
    // УДАЛЕНИЕ НЕНУЖНЫХ ЭЛЕМЕНТОВ
    // =========================================================

    function removeUnwantedUI(root) {
        var scope = root || document;

        // Родную кнопку "Смотреть" НЕ удаляем.
        // Просто добавляем ей стандартный Lampa-класс hide.
        hideWatchButton(scope);

        var selectors = [
            '.view--trailer',
            '[data-action="trailer"]',

            '.shots-view-button',
            '.view--shots',
            '.shots-view',
            '[data-action="shots"]',
            '[data-action="shorts"]',

            '.view--torrent',
            '.view--torrents',
            '.torrent-view',
            '.torrent-view-button',
            '.torrent-button',

            '[data-action="torrent"]',
            '[data-action="torrents"]',
            '[data-type="torrent"]',
            '[data-type="torrents"]',

            '.button--torrent',

            '.full-start__button[data-subtitle*="торрент"]',
            '.full-start__button[data-subtitle*="Torrent"]'
        ];

        safe(function () {
            selectors.forEach(function (selector) {
                var nodes = scope.querySelectorAll(selector);

                for (var i = 0; i < nodes.length; i++) {
                    nodes[i].remove();
                }
            });
        });

        // Дополнительная очистка по названию
        safe(function () {
            var buttons = scope.querySelectorAll(
                '.full-start__button, .selector'
            );

            for (var i = 0; i < buttons.length; i++) {
                var text = (buttons[i].textContent || '')
                    .replace(/\s+/g, ' ')
                    .trim()
                    .toLowerCase();

                if (
                    text === 'торренты' ||
                    text === 'torrents' ||
                    text === 'torrent'
                ) {
                    buttons[i].remove();
                }
            }
        });
    }

    // =========================================================
    // AUTOFOCUS WTCH
    // =========================================================

    var WTCH_DEBUG = true;

    function wtchLog() {
        if (!WTCH_DEBUG || !window.console) return;

        try {
            console.log.apply(
                console,
                ['[wtch-fix]'].concat(
                    Array.prototype.slice.call(arguments)
                )
            );
        } catch (e) {}
    }

    function findWtchButton(root) {
        var wtchBtn = null;

        safe(function () {
            var scope = root || document;

            if (
                scope &&
                typeof scope.querySelector === 'function'
            ) {
                wtchBtn = scope.querySelector(
                    '.wtch--button'
                );
            }
        });

        if (!wtchBtn) {
            safe(function () {
                wtchBtn = document.querySelector(
                    '.wtch--button'
                );
            });
        }

        return wtchBtn;
    }

    function focusWtchButton(root, attempt) {
        attempt = attempt || 0;

        safe(function () {
            var wtchBtn = findWtchButton(root);

            if (!wtchBtn) {
                if (attempt < 15) {
                    setTimeout(function () {
                        focusWtchButton(
                            root,
                            attempt + 1
                        );
                    }, 100);
                } else {
                    wtchLog(
                        'WTCH button not found'
                    );
                }

                return;
            }

            wtchLog(
                'WTCH found:',
                wtchBtn
            );

            // =============================================
            // Убираем focus со всех остальных кнопок
            // =============================================

            safe(function () {
                var focused = document.querySelectorAll(
                    '.full-start__buttons .focus, ' +
                    '.full-start-new__buttons .focus'
                );

                for (var i = 0; i < focused.length; i++) {
                    if (focused[i] !== wtchBtn) {
                        focused[i].classList.remove(
                            'focus'
                        );
                    }
                }
            });

            // =============================================
            // Настоящий Lampa focus
            // =============================================

            if (
                typeof Navigator !== 'undefined' &&
                Navigator &&
                typeof Navigator.focused === 'function'
            ) {
                Navigator.focused(wtchBtn);

                wtchLog(
                    'Navigator.focused()'
                );
            } else if (
                window.Lampa &&
                Lampa.Controller &&
                typeof Lampa.Controller
                    .collectionFocus === 'function'
            ) {
                Lampa.Controller.collectionFocus(
                    wtchBtn,
                    root || document
                );

                wtchLog(
                    'collectionFocus()'
                );
            }

            // =============================================
            // Визуальный fallback
            // =============================================

            wtchBtn.classList.add('focus');

            // =============================================
            // Сообщаем Lampa о фокусе
            // =============================================

            safe(function () {
                if (window.$) {
                    window
                        .$(wtchBtn)
                        .trigger('hover:focus');
                }
            });
        });
    }

    function autoFocusWtch(root) {
        // Первый запуск
        setTimeout(function () {
            focusWtchButton(root, 0);
        }, 50);

        // После отрисовки WTCH
        setTimeout(function () {
            focusWtchButton(root, 0);
        }, 250);

        // Дополнительный fallback
        setTimeout(function () {
            focusWtchButton(root, 0);
        }, 600);

        setTimeout(function () {
            focusWtchButton(root, 0);
        }, 1000);
    }

    // =========================================================
    // TORRENTS OFF
    // =========================================================

    function disableTorrentSetting() {
        safe(function () {
            if (window.lampa_settings) {
                window.lampa_settings.torrents_use = false;
            }
        });

        safe(function () {
            if (
                window.Lampa &&
                window.Lampa.SettingsApi &&
                typeof window.Lampa.SettingsApi
                    .addParam === 'function'
            ) {
                if (window.lampa_settings) {
                    window.lampa_settings.torrents_use = false;
                }
            }
        });
    }

    // =========================================================
    // SHOWY PRO GUARD
    // =========================================================

    function installShowyProGuards() {
        if (
            window.lampa_wtch_showy_guard_installed
        ) {
            return;
        }

        window.lampa_wtch_showy_guard_installed = true;

        safe(function () {
            if (!window.ShowyMarketingRuntime) {
                window.ShowyMarketingRuntime = {
                    start: function () {},
                    context: function () {},
                    trackLinkResolved: function () {},

                    createWtchInvoice:
                        function () {
                            return false;
                        },

                    registerSourceAdapter:
                        function () {
                            return false;
                        },

                    sourceBase: function (base) {
                        return base;
                    },

                    rewriteSourceUrl:
                        function (url) {
                            return url;
                        },

                    ensureInlinePro:
                        function (pro, success) {
                            if (
                                typeof success ===
                                'function'
                            ) {
                                success({
                                    base: '',
                                    verified: false,
                                    changed: false
                                });
                            }
                        },

                    isInlineProActive:
                        function () {
                            return false;
                        }
                };
            }
        });

        safe(function () {
            if (!window.ShowyProEntryBanner) {
                window.ShowyProEntryBanner = {
                    attach: function () {
                        return {
                            mount: function () {},
                            destroy: function () {},
                            ensure: function () {}
                        };
                    },

                    version:
                        'disabled-by-guard'
                };
            }
        });
    }

    // =========================================================
    // СЛЕЖЕНИЕ ЗА ИНТЕРФЕЙСОМ LAMPA
    // =========================================================

    function installUiCleaner() {
        if (
            window.lampa_wtch_unified_ui_cleaner
        ) {
            return;
        }

        window.lampa_wtch_unified_ui_cleaner =
            true;

        // =============================================
        // Listener Lampa FULL
        // =============================================

        safe(function () {
            if (
                window.Lampa &&
                window.Lampa.Listener
            ) {
                Lampa.Listener.follow(
                    'full',
                    function (e) {

                        if (
                            e.type === 'complite' ||
                            e.type === 'complete'
                        ) {
                            setTimeout(
                                function () {

                                    var root =
                                        document;

                                    safe(function () {
                                        if (
                                            e.object &&
                                            e.object.activity &&
                                            typeof e.object
                                                .activity
                                                .render ===
                                                'function'
                                        ) {
                                            root =
                                                e.object
                                                    .activity
                                                    .render();
                                        }
                                    });

                                    // Скрываем Смотреть
                                    hideWatchButton(root);

                                    // Удаляем ненужное
                                    removeUnwantedUI(
                                        root
                                    );

                                    // Фокус WTCH
                                    autoFocusWtch(
                                        root
                                    );

                                },
                                50
                            );
                        }
                    }
                );
            }
        });

        // =============================================
        // MutationObserver
        // =============================================

        if (
            window.MutationObserver &&
            !window.lampa_wtch_unified_observer
        ) {
            window.lampa_wtch_unified_observer =
                new MutationObserver(
                    function () {

                        hideWatchButton(
                            document
                        );

                        removeUnwantedUI(
                            document
                        );
                    }
                );

            safe(function () {
                window
                    .lampa_wtch_unified_observer
                    .observe(
                        document.documentElement,
                        {
                            childList: true,
                            subtree: true
                        }
                    );
            });
        }
    }

    // =========================================================
    // PLAYER SKIN
    // =========================================================

    function installPlayerSkin() {
        if (
            window.lampa_wtch_player_skin_installed
        ) {
            return;
        }

        window.lampa_wtch_player_skin_installed =
            true;

        safe(function () {
            if (
                !window.Lampa ||
                !window.Lampa.Player ||
                !window.Lampa.Platform ||
                typeof window.$ === 'undefined'
            ) {
                return;
            }

            if (
                Lampa.Platform.screen('mobile') ||
                (
                    Lampa.Manifest &&
                    Lampa.Manifest.app_digital > 328
                )
            ) {
                return;
            }

            if (
                !document.getElementById(
                    'lampa_wtch_player_skin_css'
                )
            ) {
                var style =
                    document.createElement(
                        'style'
                    );

                style.id =
                    'lampa_wtch_player_skin_css';

                style.innerHTML = `
                    .player-video__overlay {
                        display: none;
                        background: linear-gradient(
                            to bottom,
                            rgba(0,0,0,0.5) 0,
                            rgba(0,0,0,0.3) 53%,
                            rgba(11,13,16,0.8) 100%
                        );
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                    }

                    .player:not(.iptv)
                    .player-panel,

                    .player:not(.iptv)
                    .player-info,

                    .player:not(.iptv)
                    .player-footer {
                        background: transparent !important;
                        backdrop-filter: unset !important;
                    }

                    .player:not(.iptv)
                    .player-panel__body,

                    .player:not(.iptv)
                    .player-info__body,

                    .player:not(.iptv)
                    .player-footer__body {
                        padding: 0;
                    }

                    .player:not(.iptv)
                    .player-info__title {
                        font-size: 2.4em;
                        font-weight: 600;
                        line-height: 1.4;
                        width: 60%;
                        text-shadow: 0 0 .2em rgba(0,0,0,.5);
                        overflow: hidden;
                        display: -webkit-box;
                        -webkit-line-clamp: 2;
                        -webkit-box-orient: vertical;
                    }

                    .player:not(.iptv)
                    .player-panel
                    .button {
                        padding: .9em;
                        width: 3em;
                        height: 3em;
                    }

                    .player:not(.iptv)
                    .player-panel
                    .button > svg {
                        width: 1.2em;
                        height: 1.2em;
                    }

                    .player:not(.iptv)
                    .player-panel__playpause {
                        margin: 0;
                        padding: 1em !important;
                    }

                    .player:not(.iptv)
                    .player-panel__quality {
                        border-radius: 5em !important;
                        padding: 0 1em !important;
                    }

                    .player:not(.iptv)
                    .player-panel__timeline {
                        margin-bottom: 1em;
                    }

                    .player:not(.iptv)
                    .player-panel__box-buttons {
                        flex-shrink: 0;
                        display: flex;
                        background: rgba(255,255,255,.1);
                        border-radius: 4em;
                    }

                    .player:not(.iptv)
                    .player-panel__box-buttons
                    + .player-panel__box-buttons {
                        margin-left: .5em;
                    }

                    .player:not(.iptv)
                    .player-info__values
                    .value--size span {
                        background: rgba(255,255,255,.1);
                        border-radius: 1em;
                    }

                    .player:not(.iptv)
                    .player-info__time {
                        position: absolute;
                        top: .8em;
                        right: 0;
                    }

                    .player:not(.iptv)
                    .player-panel__next,

                    .player:not(.iptv)
                    .player-panel__prev {
                        padding: 1.1em !important;
                    }

                    .player:not(.iptv)
                    .player-panel__next > svg,

                    .player:not(.iptv)
                    .player-panel__prev > svg {
                        width: .8em;
                        height: .8em;
                    }
                `;

                document.head.appendChild(
                    style
                );
            }

            var render =
                $(Lampa.Player.render());

            var title =
                $('<div class="player-info__title"></div>');

            var value =
                $('<div class="value--name"><span></span></div>');

            render
                .find('.player-video__display')
                .after(
                    $('<div class="player-video__overlay"></div>')
                );

            render
                .find('.player-panel__center')
                .find(
                    '.button:not(.player-panel__playpause)'
                )
                .remove();

            render
                .find('.player-panel__timeline')
                .before(
                    render.find(
                        '.player-panel__line-one'
                    )
                );

            render
                .find(
                    '.player-info .player-info__line'
                )
                .before(title);

            render
                .find('.value--size')
                .after(value);

            var box =
                $(
                    '<div class="player-panel__box-buttons"></div>'
                );

            var right_panel =
                render.find(
                    '.player-panel__right'
                );

            var left_panel =
                render.find(
                    '.player-panel__left'
                );

            var right_box_quality =
                box.clone();

            var right_box_main =
                box.clone();

            var right_box_audio =
                box.clone();

            var left_box_main =
                box.clone();

            right_panel.append(
                right_box_audio
            );

            right_panel.append(
                right_box_quality
            );

            right_panel.append(
                right_box_main
            );

            right_box_main.append(
                right_panel.find(
                    '.button'
                )
            );

            right_box_quality.append(
                right_panel.find(
                    '.player-panel__quality'
                )
            );

            right_box_audio.append(
                right_panel.find(
                    '.player-panel__flow'
                )
            );

            right_box_audio.append(
                right_panel.find(
                    '.player-panel__subs'
                )
            );

            right_box_audio.append(
                right_panel.find(
                    '.player-panel__tracks'
                )
            );

            left_panel.prepend(
                left_box_main
            );

            left_box_main.append(
                left_panel.find(
                    '.button'
                )
            );

            Lampa.Player.listener.follow(
                'start',
                function (data) {

                    var name =
                        data.title;

                    var head = '';

                    if (!data.iptv) {

                        if (data.card) {
                            head =
                                data.card.title ||
                                data.card.name;
                        } else if (
                            Lampa.Activity.active()
                                .movie
                        ) {
                            head =
                                Lampa.Activity
                                    .active()
                                    .movie
                                    .title ||
                                Lampa.Activity
                                    .active()
                                    .movie
                                    .name;
                        }

                    }

                    if (!head) {
                        head = name;
                    }

                    title
                        .text(head)
                        .toggleClass(
                            'hide',
                            Boolean(
                                data.iptv
                            )
                        );

                    render
                        .find(
                            '.player-info__name'
                        )
                        .toggleClass(
                            'hide',
                            true
                        );

                    value
                        .toggleClass(
                            'hide',
                            Boolean(
                                name == head
                            )
                        )
                        .find('span')
                        .text(name);
                }
            );
        });
    }

    // =========================================================
    // ЗАГРУЗКА WTCH
    // =========================================================

    function loadWTCH() {
        if (
            window.lampa_wtch_unified_loaded
        ) {
            return;
        }

        window.lampa_wtch_unified_loaded =
            true;

        var scripts = [
            SCRIPT_URL
        ];

        // Lampa
        if (
            window.Lampa &&
            window.Lampa.Utils &&
            typeof window.Lampa.Utils
                .putScriptAsync === 'function'
        ) {
            var result = safe(function () {

                Lampa.Utils.putScriptAsync(
                    scripts,
                    function () {
                        window
                            .lampa_wtch_unified_ready =
                            true;

                        // После загрузки WTCH
                        setTimeout(function () {
                            autoFocusWtch(
                                document
                            );
                        }, 300);
                    }
                );

                return true;
            });

            if (result) {
                return;
            }
        }

        // Обычный script fallback
        var index = 0;

        function next() {

            if (index >= scripts.length) {

                window
                    .lampa_wtch_unified_ready =
                    true;

                setTimeout(function () {
                    autoFocusWtch(
                        document
                    );
                }, 300);

                return;
            }

            var script =
                document.createElement(
                    'script'
                );

            script.async = true;

            script.src =
                scripts[index++];

            script.onload = next;
            script.onerror = next;

            (
                document.head ||
                document.documentElement
            ).appendChild(script);
        }

        next();
    }

    // =========================================================
    // СТАРТ
    // =========================================================

    function start() {

        injectCSS();

        installShowyProGuards();

        installUiCleaner();

        disableTorrentSetting();

        installPlayerSkin();

        loadWTCH();

        // Первый проход
        hideWatchButton(
            document
        );

        removeUnwantedUI(
            document
        );
    }

    // =========================================================
    // ЖДЁМ LAMPA
    // =========================================================

    if (window.appready) {

        start();

    } else {

        safe(function () {

            if (
                window.Lampa &&
                window.Lampa.Listener
            ) {

                Lampa.Listener.follow(
                    'app',
                    function (event) {

                        if (
                            event.type === 'ready'
                        ) {
                            start();
                        }

                    }
                );

            }

        });

    }

    // =========================================================
    // PUBLIC INFO
    // =========================================================

    window.lampa_wtch_unified = {

        version: VERSION,

        script: SCRIPT_URL,

        trailers: false,

        shots: false,

        torrents: false,

        player_skin: true

    };

})();