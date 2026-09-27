(function () {
    'use strict';

    if (window.lampa_wtch_tv_source_v3) return;
    window.lampa_wtch_tv_source_v3 = true;

    var VERSION = '3.0.0';
    var SCRIPT_URL = 'http://wtch.ch/m';
    var MEMORY_KEY = 'lampa_wtch_tv_memory';

    function safe(fn, fallback) {
        try {
            return fn();
        } catch (e) {
            return fallback;
        }
    }

    function storageGet(key, fallback) {
        return safe(function () {
            return Lampa.Storage.get(key, fallback);
        }, fallback);
    }

    function storageSet(key, value) {
        safe(function () {
            Lampa.Storage.set(key, value);
        });
    }

    function movie() {
        return safe(function () {
            var a = Lampa.Activity.active();
            return a && a.movie ? a.movie : null;
        }, null);
    }

    function movieKey() {
        var m = movie();

        if (!m) return '';

        return String(
            m.id ||
            m.kinopoisk_id ||
            m.imdb_id ||
            m.original_name ||
            m.original_title ||
            m.name ||
            m.title ||
            ''
        ).replace(
            /[^a-zA-Z0-9_.:-]/g,
            '_'
        );
    }

    function memory() {
        var all = storageGet(
            MEMORY_KEY,
            {}
        );

        var key = movieKey();

        return all && all[key]
            ? all[key]
            : {};
    }

    function remember(patch) {
        var key = movieKey();

        if (!key) return;

        var all = storageGet(
            MEMORY_KEY,
            {}
        );

        if (!all || typeof all !== 'object') {
            all = {};
        }

        all[key] = all[key] || {};

        Object.keys(
            patch || {}
        ).forEach(function (name) {
            if (
                patch[name] !== undefined &&
                patch[name] !== null &&
                patch[name] !== ''
            ) {
                all[key][name] = patch[name];
            }
        });

        storageSet(
            MEMORY_KEY,
            all
        );
    }

    // =========================================================
    // Получаем настоящее состояние Z01
    //
    // online_balanser
    // online_last_balanser
    // online_choice_<source>
    //
    // Это именно те ключи, которые использует wtch.ch.online.js.
    // =========================================================

    function z01Choice() {
        var m = movie();

        if (!m) return {};

        var source = storageGet(
            'online_balanser',
            ''
        );

        var last = safe(function () {
            return Lampa.Storage.cache(
                'online_last_balanser',
                3000,
                {}
            );
        }, {});

        if (
            m.id &&
            last &&
            last[m.id]
        ) {
            source = last[m.id];
        }

        var choice = {};

        if (source) {
            choice = safe(function () {
                var data = Lampa.Storage.cache(
                    'online_choice_' + source,
                    3000,
                    {}
                );

                return data && data[m.id]
                    ? data[m.id]
                    : {};
            }, {});
        }

        return {
            source: source || '',
            season: choice.season,
            voice: choice.voice,
            voice_name: choice.voice_name || '',
            voice_url: choice.voice_url || ''
        };
    }

    // =========================================================
    // Определение качества
    // =========================================================

    function qualityOf(text) {
        text = String(text || '');

        if (
            /2160\s*p?|4k|uhd/i.test(text)
        ) {
            return '4K';
        }

        if (
            /1440\s*p?/i.test(text)
        ) {
            return 'QHD';
        }

        if (
            /1080\s*p?|fhd/i.test(text)
        ) {
            return 'FHD';
        }

        if (
            /720\s*p?|\bhd\b/i.test(text)
        ) {
            return 'HD';
        }

        if (
            /576\s*p?|480\s*p?|360\s*p?/i.test(text)
        ) {
            return 'SD';
        }

        return '';
    }

    // =========================================================
    // Определение типа озвучки
    // =========================================================

    function voiceKind(text) {
        text = String(text || '');

        if (
            /дубляж|дублирован|\bdub\b|dubbing/i.test(text)
        ) {
            return 'Дубляж';
        }

        if (
            /многоголос|\bmvo\b|\bpmvo\b/i.test(text)
        ) {
            return 'Многоголосая';
        }

        if (
            /двухголос|\bdvo\b/i.test(text)
        ) {
            return 'Двухголосая';
        }

        if (
            /авторск|одноголос|\bavo\b/i.test(text)
        ) {
            return 'Авторская';
        }

        if (
            /оригинал|original/i.test(text)
        ) {
            return 'Оригинал';
        }

        if (
            /субтитр|subtitle|\bsubs?\b/i.test(text)
        ) {
            return 'Субтитры';
        }

        return 'Озвучка';
    }

    // =========================================================
    // Убираем трейлеры / Shorts / торренты
    // =========================================================

    function hideUnwantedCSS() {
        if (
            document.getElementById(
                'lampa_wtch_tv_hide'
            )
        ) {
            return;
        }

        var style =
            document.createElement(
                'style'
            );

        style.id =
            'lampa_wtch_tv_hide';

        style.textContent = `
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

        document.head.appendChild(
            style
        );
    }

    function cleanUI(root) {
        var scope =
            root || document;

        safe(function () {

            scope
                .querySelectorAll(
                    '.full-start__button, .selector'
                )
                .forEach(function (node) {

                    var text =
                        (
                            node.textContent ||
                            ''
                        )
                        .replace(/\s+/g, ' ')
                        .trim()
                        .toLowerCase();

                    if (
                        text === 'торренты' ||
                        text === 'torrent' ||
                        text === 'torrents'
                    ) {
                        node.remove();
                    }

                });

        });
    }

    // =========================================================
    // Убираем Showy PRO popup/banner
    // =========================================================

    function guardShowy() {

        safe(function () {

            if (
                !window.ShowyMarketingRuntime
            ) {

                window.ShowyMarketingRuntime = {

                    start: function () {},

                    context: function () {},

                    trackLinkResolved:
                        function () {},

                    createWtchInvoice:
                        function () {
                            return false;
                        },

                    registerSourceAdapter:
                        function () {
                            return false;
                        },

                    sourceBase:
                        function (base) {
                            return base;
                        },

                    rewriteSourceUrl:
                        function (url) {
                            return url;
                        },

                    ensureInlinePro:
                        function (pro, done) {

                            if (
                                typeof done ===
                                'function'
                            ) {
                                done({
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

            if (
                !window.ShowyProEntryBanner
            ) {

                window.ShowyProEntryBanner = {

                    attach: function () {

                        return {
                            mount: function () {},
                            destroy: function () {},
                            ensure: function () {}
                        };

                    }

                };

            }

        });

    }

    // =========================================================
    // Скин самого видеоплеера
    // =========================================================

    function playerSkin() {

        if (
            document.getElementById(
                'lampa_wtch_tv_player_css'
            )
        ) {
            return;
        }

        var style =
            document.createElement(
                'style'
            );

        style.id =
            'lampa_wtch_tv_player_css';

        style.textContent = `

            .player:not(.iptv) {
                background:
                    #08090b !important;
            }

            .player:not(.iptv) .player-video,
            .player:not(.iptv) .player-video video {
                background:
                    #08090b !important;
            }

            .player:not(.iptv) .player-panel,
            .player:not(.iptv) .player-info,
            .player:not(.iptv) .player-footer {
                background:
                    transparent !important;
            }

            .player:not(.iptv)
            .player-panel
            .button {
                width:
                    3em;

                height:
                    3em;

                padding:
                    .9em;
            }

            .player:not(.iptv)
            .player-panel__playpause {
                padding:
                    1em !important;
            }

            .player:not(.iptv)
            .player-panel__quality {
                border-radius:
                    5em !important;

                padding:
                    0 1em !important;
            }

            .player:not(.iptv)
            .player-panel__box-buttons {
                display:
                    flex;

                flex-shrink:
                    0;

                background:
                    rgba(255,255,255,.09);

                border-radius:
                    4em;
            }

            .player:not(.iptv)
            .player-panel__box-buttons
            + .player-panel__box-buttons {
                margin-left:
                    .45em;
            }

            .player:not(.iptv)
            .player-info__title {
                font-size:
                    2.15em;

                font-weight:
                    700;

                line-height:
                    1.25;

                max-width:
                    65%;

                text-shadow:
                    0 2px 12px rgba(0,0,0,.55);
            }

            .player:not(.iptv)
            .player-info__values {
                text-shadow:
                    0 2px 12px rgba(0,0,0,.55);
            }

        `;

        document.head.appendChild(
            style
        );

    }

    // =========================================================
    // ОСНОВНОЙ TV SOURCE CENTER
    // =========================================================

    function injectPickerCSS() {

        if (
            document.getElementById(
                'lampa_wtch_tv_picker_css'
            )
        ) {
            return;
        }

        var style =
            document.createElement(
                'style'
            );

        style.id =
            'lampa_wtch_tv_picker_css';

        style.textContent = `

            /* =================================================
               Основное окно
               ================================================= */

            .wtch-tv-select {
                min-width:
                    min(82vw, 76em) !important;

                max-width:
                    92vw !important;

                background:
                    #111214 !important;

                border-radius:
                    18px !important;

                overflow:
                    hidden !important;

                color:
                    #f4f5f6 !important;
            }

            .wtch-tv-select
            .selectbox__title {
                padding-bottom:
                    .6em !important;

                font-size:
                    1.28em !important;

                font-weight:
                    760 !important;
            }


            /* =================================================
               Верхняя панель Source Center
               ================================================= */

            .wtch-tv-header {

                margin:
                    0 .8em .65em;

                padding:
                    .95em;

                border:
                    1px solid rgba(255,255,255,.08);

                border-radius:
                    14px;

                background:
                    #181a1e;

            }

            .wtch-tv-header__eyebrow {

                font-size:
                    .65em;

                letter-spacing:
                    .13em;

                text-transform:
                    uppercase;

                font-weight:
                    850;

                color:
                    #747a82;

            }

            .wtch-tv-header__title {

                margin-top:
                    .12em;

                font-size:
                    1.55em;

                line-height:
                    1.1;

                font-weight:
                    780;

            }

            .wtch-tv-header__route {

                margin-top:
                    .3em;

                font-size:
                    .76em;

                color:
                    #858b94;

            }


            /* =================================================
               Статусные карточки
               ================================================= */

            .wtch-tv-status {

                display:
                    grid;

                grid-template-columns:
                    repeat(5, minmax(0, 1fr));

                gap:
                    .4em;

                margin-top:
                    .8em;

            }

            .wtch-tv-status__item {

                min-height:
                    3.65em;

                display:
                    flex;

                align-items:
                    center;

                gap:
                    .55em;

                padding:
                    .5em .6em;

                border-radius:
                    11px;

                background:
                    #202329;

                border:
                    1px solid transparent;

            }

            .wtch-tv-status__item.focus {

                background:
                    #f3f4f5;

                color:
                    #111214;

                border-color:
                    #fff;

            }

            .wtch-tv-status__num {

                width:
                    1.7em;

                height:
                    1.7em;

                flex:
                    0 0 auto;

                display:
                    flex;

                align-items:
                    center;

                justify-content:
                    center;

                border-radius:
                    6px;

                background:
                    #30343a;

                color:
                    #fff;

                font-size:
                    .72em;

                font-weight:
                    850;

            }

            .wtch-tv-status__item.focus
            .wtch-tv-status__num {

                background:
                    #111214;

            }

            .wtch-tv-status__body {

                min-width:
                    0;

            }

            .wtch-tv-status__label {

                font-size:
                    .62em;

                color:
                    #7e848d;

                text-transform:
                    uppercase;

                font-weight:
                    750;

            }

            .wtch-tv-status__item.focus
            .wtch-tv-status__label {

                color:
                    #646a71;

            }

            .wtch-tv-status__value {

                margin-top:
                    .12em;

                overflow:
                    hidden;

                white-space:
                    nowrap;

                text-overflow:
                    ellipsis;

                font-size:
                    .8em;

                font-weight:
                    700;

            }

            .wtch-tv-header__hint {

                margin-top:
                    .65em;

                color:
                    #727982;

                font-size:
                    .66em;

            }


            /* =================================================
               Обычные пункты
               ================================================= */

            .wtch-tv-select
            .selectbox-items,

            .wtch-tv-select
            .selectbox__items,

            .wtch-tv-select
            .selectbox__content {

                padding:
                    .65em !important;

            }

            .wtch-tv-select
            .selectbox-item.wtch-tv-item {

                min-height:
                    4.6em !important;

                margin:
                    .25em 0 !important;

                padding:
                    .75em .9em !important;

                border:
                    1px solid transparent !important;

                border-radius:
                    12px !important;

                background:
                    #1a1d21 !important;

                color:
                    #f2f3f4 !important;

            }

            .wtch-tv-select
            .selectbox-item.wtch-tv-item.focus {

                background:
                    #f3f4f5 !important;

                color:
                    #111214 !important;

                border-color:
                    #fff !important;

            }

            .wtch-tv-select
            .selectbox-item.wtch-tv-item
            .selectbox-item__title,

            .wtch-tv-select
            .selectbox-item.wtch-tv-item
            .selectbox-item__name,

            .wtch-tv-select
            .selectbox-item.wtch-tv-item
            .selectbox-item__text {

                color:
                    inherit !important;

                font-size:
                    1.02em !important;

                line-height:
                    1.3 !important;

                font-weight:
                    700 !important;

            }


            /* =================================================
               Badge
               ================================================= */

            .wtch-tv-badge {

                display:
                    inline-flex !important;

                align-items:
                    center !important;

                justify-content:
                    center !important;

                min-width:
                    2.5em !important;

                height:
                    1.55em !important;

                padding:
                    0 .48em !important;

                margin-right:
                    .5em !important;

                border-radius:
                    6px !important;

                vertical-align:
                    middle !important;

                background:
                    #33373e !important;

                color:
                    #fff !important;

                font-size:
                    .67em !important;

                font-weight:
                    850 !important;

            }


            /* =================================================
               Дополнительная информация
               ================================================= */

            .wtch-tv-meta {

                margin-top:
                    .23em;

                color:
                    #7f858e;

                font-size:
                    .67em;

                white-space:
                    nowrap;

                overflow:
                    hidden;

                text-overflow:
                    ellipsis;

            }

            .wtch-tv-select
            .selectbox-item.focus
            .wtch-tv-meta {

                color:
                    #60656d;

            }


            /* =================================================
               Источники
               ================================================= */

            .wtch-tv-select--source
            .selectbox-items,

            .wtch-tv-select--source
            .selectbox__items,

            .wtch-tv-select--source
            .selectbox__content {

                display:
                    grid !important;

                grid-template-columns:
                    repeat(2, minmax(0,1fr));

                gap:
                    .45em;

            }

            .wtch-tv-select--source
            .selectbox-item.wtch-tv-item {

                margin:
                    0 !important;

                min-height:
                    5em !important;

            }


            /* =================================================
               Озвучки
               ================================================= */

            .wtch-tv-select--voice
            .selectbox-items,

            .wtch-tv-select--voice
            .selectbox__items,

            .wtch-tv-select--voice
            .selectbox__content {

                display:
                    grid !important;

                grid-template-columns:
                    repeat(2, minmax(0,1fr));

                gap:
                    .45em;

            }

            .wtch-tv-select--voice
            .selectbox-item.wtch-tv-item {

                margin:
                    0 !important;

                min-height:
                    4.7em !important;

            }


            /* =================================================
               Сезоны
               ================================================= */

            .wtch-tv-select--season
            .selectbox-items,

            .wtch-tv-select--season
            .selectbox__items,

            .wtch-tv-select--season
            .selectbox__content {

                display:
                    grid !important;

                grid-template-columns:
                    repeat(4, minmax(0,1fr));

                gap:
                    .45em;

            }

            .wtch-tv-select--season
            .selectbox-item.wtch-tv-item {

                margin:
                    0 !important;

                min-height:
                    4em !important;

                text-align:
                    center !important;

            }


            /* =================================================
               Качество
               ================================================= */

            .wtch-tv-select--quality
            .selectbox-items,

            .wtch-tv-select--quality
            .selectbox__items,

            .wtch-tv-select--quality
            .selectbox__content {

                display:
                    grid !important;

                grid-template-columns:
                    repeat(5, minmax(0,1fr));

                gap:
                    .45em;

            }

            .wtch-tv-select--quality
            .selectbox-item.wtch-tv-item {

                margin:
                    0 !important;

                min-height:
                    4em !important;

                text-align:
                    center !important;

            }


            /* =================================================
               Вернуться к сериям
               ================================================= */

            .wtch-tv-back {

                display:
                    flex;

                align-items:
                    center;

                gap:
                    .65em;

                min-height:
                    3.8em;

                margin:
                    .2em 0 .5em;

                padding:
                    .65em .8em;

                border-radius:
                    11px;

                background:
                    #191b1f;

                border:
                    1px solid transparent;

            }

            .wtch-tv-back.focus {

                background:
                    #f3f4f5;

                color:
                    #111214;

                border-color:
                    #fff;

            }

            .wtch-tv-back__icon {

                width:
                    1.65em;

                height:
                    1.65em;

                display:
                    flex;

                align-items:
                    center;

                justify-content:
                    center;

                border-radius:
                    6px;

                background:
                    #30343a;

                color:
                    #fff;

            }

            .wtch-tv-back b,
            .wtch-tv-back small {

                display:
                    block;

            }

            .wtch-tv-back b {

                font-size:
                    .86em;

            }

            .wtch-tv-back small {

                margin-top:
                    .12em;

                font-size:
                    .64em;

                color:
                    #7f858e;

            }


            /* =================================================
               Адаптив
               ================================================= */

            @media (max-width:1100px) {

                .wtch-tv-status {

                    grid-template-columns:
                        repeat(3,minmax(0,1fr));

                }

                .wtch-tv-select--season
                .selectbox-items,

                .wtch-tv-select--season
                .selectbox__items,

                .wtch-tv-select--season
                .selectbox__content {

                    grid-template-columns:
                        repeat(3,minmax(0,1fr));

                }

                .wtch-tv-select--quality
                .selectbox-items,

                .wtch-tv-select--quality
                .selectbox__items,

                .wtch-tv-select--quality
                .selectbox__content {

                    grid-template-columns:
                        repeat(3,minmax(0,1fr));

                }

            }


            @media (max-width:720px) {

                .wtch-tv-status {

                    grid-template-columns:
                        repeat(2,minmax(0,1fr));

                }

                .wtch-tv-select--source
                .selectbox-items,

                .wtch-tv-select--source
                .selectbox__items,

                .wtch-tv-select--source
                .selectbox__content,

                .wtch-tv-select--voice
                .selectbox-items,

                .wtch-tv-select--voice
                .selectbox__items,

                .wtch-tv-select--voice
                .selectbox__content {

                    grid-template-columns:
                        1fr;

                }

                .wtch-tv-select--season
                .selectbox-items,

                .wtch-tv-select--season
                .selectbox__items,

                .wtch-tv-select--season
                .selectbox__content,

                .wtch-tv-select--quality
                .selectbox-items,

                .wtch-tv-select--quality
                .selectbox__items,

                .wtch-tv-select--quality
                .selectbox__content {

                    grid-template-columns:
                        repeat(2,minmax(0,1fr));

                }

            }

        `;

        document.head.appendChild(
            style
        );
    }

    // =========================================================
    // Реальные кнопки WTCH
    // =========================================================

    function sourceButton() {
        return $(
            '.filter--sort'
        ).first();
    }

    function filterButton() {
        return $(
            '.filter--filter'
        ).first();
    }

    function currentSourceLabel() {

        var b =
            sourceButton();

        if (!b.length) return '';

        return (
            b.find('span').first().text() ||
            b.text() ||
            ''
        )
            .replace(/\s+/g, ' ')
            .trim();
    }

    function currentFilterLabel() {

        var b =
            filterButton();

        if (!b.length) return '';

        return (
            b.find('span').first().text() ||
            b.text() ||
            ''
        )
            .replace(/\s+/g, ' ')
            .trim();
    }

    // =========================================================
    // Определяем какой SelectBox открыт
    // =========================================================

    function pickerMode($select) {

        var title = (
            $select
                .find(
                    '.selectbox__title'
                )
                .first()
                .text() ||
            ''
        )
            .replace(/\s+/g, ' ')
            .trim();

        var text = (
            $select.text() ||
            ''
        )
            .replace(/\s+/g, ' ')
            .trim();

        // Главный фильтр.
        if (
            /фильтр|filter/i.test(
                title
            )
        ) {
            return 'filter';
        }

        if (
            /reset|сброс/i.test(text) &&
            /сезон|season|озвуч|voice/i.test(text)
        ) {
            return 'filter';
        }

        // Сезон
        if (
            /сезон|season/i.test(
                title
            )
        ) {
            return 'season';
        }

        // Озвучка
        if (
            /озвуч|voice|перевод|аудио/i.test(
                title
            )
        ) {
            return 'voice';
        }

        // Качество
        if (
            /качество|quality/i.test(
                title
            )
        ) {
            return 'quality';
        }

        // Источник
        if (
            /источник|source|провайдер|балансер|balanser/i.test(
                title
            )
        ) {
            return 'source';
        }

        // Некоторые версии Lampa используют
        // нейтральный заголовок.
        if (
            /сезон|season/i.test(text) &&
            /озвуч|voice/i.test(text)
        ) {
            return 'filter';
        }

        if (
            /4k|2160|1080|720|fhd|hd/i.test(text) &&
            !/сезон|season|источник|source/i.test(title)
        ) {
            return 'quality';
        }

        if (
            /rezka|filmix|z01/i.test(text) &&
            sourceButton().length
        ) {
            return 'source';
        }

        return 'unknown';
    }

    // =========================================================
    // Badge
    // =========================================================

    function makeBadge(
        $item,
        value
    ) {

        if (!value) return;

        if (
            $item.find(
                '.wtch-tv-badge'
            ).length
        ) {

            $item
                .find(
                    '.wtch-tv-badge'
                )
                .first()
                .text(value);

            return;
        }

        var badge = $(
            '<span class="wtch-tv-badge"></span>'
        )
            .text(value);

        var target =
            $item.find(
                '.selectbox-item__title,' +
                '.selectbox-item__name,' +
                '.selectbox-item__text'
            )
            .first();

        if (!target.length) {
            target =
                $item.children().first();
        }

        if (target.length) {
            target.prepend(
                badge
            );
        } else {
            $item.prepend(
                badge
            );
        }

    }

    // =========================================================
    // Оформляем конкретные пункты
    // =========================================================

    function decorateItems(
        $select,
        mode
    ) {

        $select
            .find(
                '.selectbox-item'
            )
            .each(function () {

                var item =
                    $(this);

                item.addClass(
                    'wtch-tv-item'
                );

                var text =
                    (
                        item.text() ||
                        ''
                    )
                        .replace(
                            /\s+/g,
                            ' '
                        )
                        .trim();

                item
                    .find(
                        '.wtch-tv-meta'
                    )
                    .remove();

                var q =
                    qualityOf(text);

                // -------------------------------------------------
                // SOURCE
                // -------------------------------------------------

                if (
                    mode === 'source'
                ) {

                    makeBadge(
                        item,
                        q ||
                        (
                            /vip|premium|премиум/i.test(text)
                                ? 'VIP'
                                : ''
                        )
                    );

                    item.append(
                        $('<div class="wtch-tv-meta"></div>')
                            .text(
                                /filmix|rezka/i.test(text)
                                    ? 'Онлайн • источник'
                                    : 'Онлайн'
                            )
                    );

                }

                // -------------------------------------------------
                // VOICE
                // -------------------------------------------------

                else if (
                    mode === 'voice'
                ) {

                    makeBadge(
                        item,
                        voiceKind(text)
                    );

                    item.append(
                        $('<div class="wtch-tv-meta"></div>')
                            .text(
                                q ||
                                'Нажмите OK для выбора'
                            )
                    );

                }

                // -------------------------------------------------
                // SEASON
                // -------------------------------------------------

                else if (
                    mode === 'season'
                ) {

                    var n =
                        text.match(
                            /\d+/
                        );

                    if (n) {

                        makeBadge(
                            item,
                            'S' +
                            parseInt(
                                n[0],
                                10
                            )
                        );

                    }

                }

                // -------------------------------------------------
                // QUALITY
                // -------------------------------------------------

                else if (
                    mode === 'quality'
                ) {

                    makeBadge(
                        item,
                        q || text
                    );

                }

            });

    }

    function valueOrFallback(
        value,
        fallback
    ) {
        return value ||
            fallback;
    }

    // =========================================================
    // Карточка статуса
    // =========================================================

    function addStatusItem(
        $row,
        num,
        label,
        value,
        action
    ) {

        var item = $(`

            <div
                class="wtch-tv-status__item selector"
                data-wtch-action="${action}"
            >

                <span
                    class="wtch-tv-status__num"
                >
                    ${num}
                </span>

                <span
                    class="wtch-tv-status__body"
                >

                    <span
                        class="wtch-tv-status__label"
                    ></span>

                    <span
                        class="wtch-tv-status__value"
                    ></span>

                </span>

            </div>

        `);

        item
            .find(
                '.wtch-tv-status__label'
            )
            .text(label);

        item
            .find(
                '.wtch-tv-status__value'
            )
            .text(value);

        $row.append(
            item
        );

        return item;
    }

    // =========================================================
    // Закрыть меню и вернуться к сериям
    // =========================================================

    function closeToEpisodes() {

        safe(function () {

            if (
                Lampa.Select &&
                Lampa.Select.close
            ) {
                Lampa.Select.close();
            }

            if (
                Lampa.Controller &&
                Lampa.Controller.toggle
            ) {
                Lampa.Controller.toggle(
                    'content'
                );
            }

        });

        setTimeout(
            function () {

                safe(function () {

                    var item = $(
                        '.online-prestige__full.focus,' +
                        '.online-prestige__file.focus,' +
                        '.online-prestige__folder.focus'
                    )
                        .first();

                    if (!item.length) {

                        item = $(
                            '.online-prestige__full,' +
                            '.online-prestige__file,' +
                            '.online-prestige__folder'
                        )
                            .first();

                    }

                    if (
                        item.length &&
                        Lampa.Controller &&
                        Lampa.Controller.collectionFocus
                    ) {

                        Lampa.Controller.collectionFocus(
                            item[0],
                            item.closest(
                                '.scroll'
                            )
                                .find(
                                    '.scroll__body'
                                )[0] ||
                            document.body
                        );

                    }

                });

            },
            70
        );

    }

    // =========================================================
    // Открытие настоящих Z01 меню
    // =========================================================

    function openSource() {

        var b =
            sourceButton();

        if (
            b.length
        ) {
            b.trigger(
                'hover:enter'
            );
        }

    }

    function openFilter() {

        var b =
            filterButton();

        if (
            b.length
        ) {
            b.trigger(
                'hover:enter'
            );
        }

    }

    function openQuality() {

        var b =
            $(
                '.player-panel__quality:visible'
            )
                .first();

        if (
            b.length
        ) {

            b.trigger(
                'hover:enter'
            );

        } else if (
            Lampa.Noty &&
            Lampa.Noty.show
        ) {

            Lampa.Noty.show(
                'Качество доступно после запуска видео'
            );

        }

    }

    // =========================================================
    // Верхняя панель выбора
    // =========================================================

    function addHeader(
        $select
    ) {

        if (
            $select.find(
                '.wtch-tv-header'
            ).length
        ) {
            return;
        }

        var state =
            z01Choice();

        var mem =
            memory();

        var source =
            currentSourceLabel() ||
            state.source ||
            'Автовыбор';

        var season =
            state.season !== undefined
                ? 'Сезон ' +
                  (
                      parseInt(
                          state.season,
                          10
                      ) + 1
                  )
                : (
                    mem.season ||
                    'Автовыбор'
                );

        var voice =
            state.voice_name ||
            mem.voice ||
            'Автовыбор';

        var quality =
            mem.quality ||
            qualityOf(
                $(
                    '.player-panel__quality:visible'
                )
                    .first()
                    .text()
            ) ||
            'Плеер';

        var header = $(`

            <div
                class="wtch-tv-header"
            >

                <div
                    class="wtch-tv-header__eyebrow"
                >
                    Z01 ONLINE
                </div>

                <div
                    class="wtch-tv-header__title"
                >
                    Центр выбора
                </div>

                <div
                    class="wtch-tv-header__route"
                >
                    Источник → сезон → озвучка → серия → качество
                </div>

                <div
                    class="wtch-tv-status"
                ></div>

                <div
                    class="wtch-tv-header__hint"
                >
                    OK — открыть раздел · стрелки — перемещение · Back — назад
                </div>

            </div>

        `);

        var row =
            header.find(
                '.wtch-tv-status'
            );

        addStatusItem(
            row,
            1,
            'Источник',
            valueOrFallback(
                source,
                'Автовыбор'
            ),
            'source'
        );

        addStatusItem(
            row,
            2,
            'Сезон',
            valueOrFallback(
                season,
                'Автовыбор'
            ),
            'filter'
        );

        addStatusItem(
            row,
            3,
            'Озвучка',
            valueOrFallback(
                voice,
                'Автовыбор'
            ),
            'filter'
        );

        addStatusItem(
            row,
            4,
            'Серия',
            'Продолжить список',
            'episodes'
        );

        addStatusItem(
            row,
            5,
            'Качество',
            quality,
            'quality'
        );

        // -----------------------------------------------------
        // Пульт
        // -----------------------------------------------------

        header.on(
            'hover:enter',
            '.wtch-tv-status__item',
            function () {

                var action =
                    $(this).attr(
                        'data-wtch-action'
                    );

                if (
                    action ===
                    'source'
                ) {
                    openSource();
                }

                if (
                    action ===
                    'filter'
                ) {
                    openFilter();
                }

                if (
                    action ===
                    'episodes'
                ) {
                    closeToEpisodes();
                }

                if (
                    action ===
                    'quality'
                ) {
                    openQuality();
                }

            }
        );

        header.on(
            'hover:focus',
            '.wtch-tv-status__item',
            function () {

                $(this).addClass(
                    'focus'
                );

            }
        );

        header.on(
            'hover:focusout',
            '.wtch-tv-status__item',
            function () {

                $(this).removeClass(
                    'focus'
                );

            }
        );

        // -----------------------------------------------------
        // Вставляем внутрь scroll body,
        // чтобы Lampa Controller увидел selector.
        // -----------------------------------------------------

        var target =
            $select
                .find(
                    '.scroll__body'
                )
                .first();

        if (!target.length) {

            target =
                $select.find(
                    '.selectbox-items,' +
                    '.selectbox__items,' +
                    '.selectbox__content'
                )
                    .first();

        }

        if (
            target.length
        ) {

            target.prepend(
                header
            );

        } else {

            $select
                .find(
                    '.selectbox__title'
                )
                .after(
                    header
                );

        }

        // -----------------------------------------------------
        // Повторно собираем focus-коллекцию
        // -----------------------------------------------------

        safe(function () {

            if (
                Lampa.Controller &&
                Lampa.Controller.collectionSet &&
                target.length
            ) {

                Lampa.Controller.collectionSet(
                    target[0]
                );

            }

        });

    }

    // =========================================================
    // Кнопка возврата к сериям
    // =========================================================

    function addBackButton(
        $select
    ) {

        if (
            $select.find(
                '.wtch-tv-back'
            ).length
        ) {
            return;
        }

        var back = $(`

            <div
                class="wtch-tv-back selector"
            >

                <span
                    class="wtch-tv-back__icon"
                >
                    ‹
                </span>

                <span>

                    <b>
                        Вернуться к сериям
                    </b>

                    <small>
                        Закрыть меню выбора
                    </small>

                </span>

            </div>

        `);

        back.on(
            'hover:enter',
            closeToEpisodes
        );

        back.on(
            'hover:focus',
            function () {
                back.addClass(
                    'focus'
                );
            }
        );

        back.on(
            'hover:focusout',
            function () {
                back.removeClass(
                    'focus'
                );
            }
        );

        var target =
            $select
                .find(
                    '.scroll__body'
                )
                .first();

        if (!target.length) {

            target =
                $select.find(
                    '.selectbox-items,' +
                    '.selectbox__items,' +
                    '.selectbox__content'
                )
                    .first();

        }

        if (
            target.length
        ) {
            target.prepend(
                back
            );
        }

        safe(function () {

            if (
                Lampa.Controller &&
                Lampa.Controller.collectionSet &&
                target.length
            ) {

                Lampa.Controller.collectionSet(
                    target[0]
                );

            }

        });

    }

    // =========================================================
    // Запоминаем качество
    // =========================================================

    function rememberQualityFromPicker(
        $select
    ) {

        $select
            .find(
                '.selectbox-item'
            )
            .off(
                'wtch-quality-memory'
            )
            .on(
                'hover:enter.wtch-quality-memory',
                function () {

                    var value =
                        qualityOf(
                            $(this).text()
                        );

                    if (value) {

                        remember({
                            quality:
                                value
                        });

                    }

                }
            );

    }

    // =========================================================
    // Обработка SelectBox
    // =========================================================

    function decoratePicker(
        $select
    ) {

        if (
            !$select ||
            !$select.length
        ) {
            return;
        }

        var mode =
            pickerMode(
                $select
            );

        $select.addClass(
            'wtch-tv-select'
        );

        if (
            mode !==
            'unknown'
        ) {

            $select.addClass(
                'wtch-tv-select--' +
                mode
            );

        }

        // Главный фильтр
        if (
            mode ===
            'filter'
        ) {

            addHeader(
                $select
            );

            addBackButton(
                $select
            );

        }

        decorateItems(
            $select,
            mode
        );

        if (
            mode ===
            'quality'
        ) {

            rememberQualityFromPicker(
                $select
            );

        }

    }

    // =========================================================
    // Сканирование открытого selectbox
    // =========================================================

    function scan() {

        setTimeout(
            function () {

                var box =
                    $(
                        '.selectbox:visible'
                    )
                        .last();

                if (
                    box.length
                ) {

                    decoratePicker(
                        box
                    );

                }

            },
            25
        );

    }

    // =========================================================
    // Следим за качеством в плеере
    // =========================================================

    function qualityMemoryHooks() {

        safe(function () {

            if (
                !window.MutationObserver
            ) {
                return;
            }

            new MutationObserver(
                function () {

                    var q =
                        qualityOf(
                            $(
                                '.player-panel__quality:visible'
                            )
                                .first()
                                .text()
                        );

                    if (q) {

                        remember({
                            quality:
                                q
                        });

                    }

                }
            ).observe(
                document.body,
                {
                    childList:
                        true,

                    subtree:
                        true,

                    characterData:
                        true
                }
            );

        });

    }

    // =========================================================
    // Установка Source Center
    // =========================================================

    function installSourceCenter() {

        injectPickerCSS();

        // -----------------------------------------------------
        // Lampa Controller
        // -----------------------------------------------------

        safe(function () {

            if (
                Lampa.Controller &&
                Lampa.Controller.listener
            ) {

                Lampa.Controller.listener.follow(
                    'toggle',
                    function (event) {

                        if (
                            event &&
                            event.name ===
                            'select'
                        ) {

                            scan();

                        }

                    }
                );

            }

        });

        // -----------------------------------------------------
        // MutationObserver
        // -----------------------------------------------------

        safe(function () {

            if (
                window.MutationObserver
            ) {

                var observer =
                    new MutationObserver(
                        function (mutations) {

                            for (
                                var i = 0;
                                i < mutations.length;
                                i++
                            ) {

                                if (
                                    mutations[i]
                                        .addedNodes &&
                                    mutations[i]
                                        .addedNodes.length
                                ) {

                                    scan();

                                    break;

                                }

                            }

                        }
                    );

                observer.observe(
                    document.body,
                    {
                        childList:
                            true,

                        subtree:
                            true
                    }
                );

            }

        });

        qualityMemoryHooks();

        scan();

        setTimeout(
            scan,
            250
        );

        setTimeout(
            scan,
            800
        );

        setTimeout(
            scan,
            1600
        );

    }

    // =========================================================
    // Загружаем настоящий WTCH
    // =========================================================

    function loadWTCH() {

        if (
            window.lampa_wtch_tv_loaded
        ) {
            return;
        }

        window.lampa_wtch_tv_loaded =
            true;

        // ВАЖНО:
        //
        // http://wtch.ch/m
        //
        // это уже JS-скрипт.
        //
        // Никаких:
        // /online.js
        // /m/online.js
        // сюда не добавляем.

        if (
            window.Lampa &&
            Lampa.Utils &&
            typeof Lampa.Utils.putScriptAsync ===
                'function'
        ) {

            safe(function () {

                Lampa.Utils.putScriptAsync(
                    [
                        SCRIPT_URL
                    ],
                    function () {

                        window.lampa_wtch_tv_ready =
                            true;

                    }
                );

            });

            return;
        }

        // -----------------------------------------------------
        // fallback
        // -----------------------------------------------------

        var script =
            document.createElement(
                'script'
            );

        script.async =
            true;

        script.src =
            SCRIPT_URL;

        script.onload =
            function () {

                window.lampa_wtch_tv_ready =
                    true;

            };

        (
            document.head ||
            document.documentElement
        )
            .appendChild(
                script
            );

    }

    // =========================================================
    // Запуск
    // =========================================================

    function start() {

        hideUnwantedCSS();

        cleanUI(
            document
        );

        guardShowy();

        playerSkin();

        installSourceCenter();

        safe(function () {

            if (
                window.Lampa &&
                Lampa.Listener
            ) {

                Lampa.Listener.follow(
                    'full',
                    function (e) {

                        if (
                            e.type ===
                                'complite' ||
                            e.type ===
                                'complete'
                        ) {

                            setTimeout(
                                function () {

                                    cleanUI(
                                        document
                                    );

                                },
                                80
                            );

                            scan();

                        }

                    }
                );

            }

        });

    }

    // =========================================================
    // Запускаем guard и WTCH
    // =========================================================

    guardShowy();

    loadWTCH();

    // =========================================================
    // Ждём Lampa
    // =========================================================

    if (
        window.appready
    ) {

        start();

    } else {

        safe(function () {

            if (
                Lampa &&
                Lampa.Listener
            ) {

                Lampa.Listener.follow(
                    'app',
                    function (event) {

                        if (
                            event.type ===
                            'ready'
                        ) {

                            start();

                        }

                    }
                );

            }

        });

    }

    // =========================================================
    // Информация о плагине
    // =========================================================

    window.lampa_wtch_unified = {

        version:
            VERSION,

        script:
            SCRIPT_URL,

        trailers:
            false,

        shots:
            false,

        torrents:
            false,

        player_skin:
            true,

        source_center:
            true

    };

})();