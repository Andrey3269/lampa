(function () {
    'use strict';

    // Не даём плагину подключиться дважды (например, если он попадёт
    // в сборку через несколько источников) — иначе задублируется
    // пункт "Домен" в настройках.
    if (window.lampa_custom_domain_v1) return;
    window.lampa_custom_domain_v1 = true;

    var currentHost = window.location.hostname;
    var targetHost = 'lampa.run';
    var originalHost = 'lampa.mx';

    // Протокол берём от текущей страницы, а не хардкодим http://
    var proto = (window.location.protocol === 'https:') ? 'https:' : 'http:';

    // Безопасный вызов: одна ошибка внутри не должна ронять весь плагин
    function safe(fn) {
        try {
            return fn();
        } catch (e) {
            console.warn('[custom_domain]', e);
            return null;
        }
    }

    // Плоский стиль окон + иконки в пунктах настроек
    var style = document.createElement('style');
    style.innerHTML = `
        /* Текст внутри штатного окна Lampa: без своего фона и рамки,
           чтобы не получалась тёмная «коробка» в окне */
        .flat-domain-modal {
            background: transparent;
            border: none;
            box-shadow: none;
            padding: 0 0 .4em;
            text-align: center;
            line-height: 1.5;
            font-size: 1.15em;
        }
        .flat-domain-modal b {
            color: #fff;
            white-space: nowrap;
        }
        .flat-domain-modal .flat-domain-hint {
            margin-top: .7em;
            font-size: .8em;
            color: rgba(255, 255, 255, .5);
        }
        .domain-param-icon {
            width: 1.3em;
            height: 1.3em;
            margin-right: .55em;
            vertical-align: -0.25em;
            flex-shrink: 0;
        }
        /* Кнопка перезагрузки в шапке, между уведомлениями и настройками.
           Размер/паддинги/margin-left/подсветку фокуса-ховера НЕ трогаем —
           их даёт родной класс .head__action, чтобы кнопка была
           неотличима от остальных иконок шапки (круг при фокусе и т.п.) */
        .head__reload-btn svg {
            display: block;
        }
    `;
    document.head.appendChild(style);

    // Иконки (контурные, цвет берут от текста — currentColor)
    var ICON_GLOBE  = '<circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>';
    var ICON_RELOAD = '<polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>';
    var ICON_TRASH  = '<polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>';

    function svg(paths, size, cls) {
        return '<svg ' + (size ? 'width="' + size + '" height="' + size + '" ' : '') +
               (cls ? 'class="' + cls + '" ' : '') +
               'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
               paths + '</svg>';
    }

    // Ставит иконку перед названием пункта в настройках
    function withIcon(paths) {
        return function (item) {
            safe(function () {
                item.find('.settings-param__name').prepend(svg(paths, null, 'domain-param-icon'));
            });
        };
    }

    function activeController(fallback) {
        return safe(function () {
            return Lampa.Controller.enabled().name;
        }) || fallback || 'settings';
    }

    // Безопасное закрытие окна и возврат фокуса пульту/клавиатуре
    function closeAndRestore(controllerName) {
        safe(function () { Lampa.Modal.close(); });
        safe(function () { Lampa.Controller.toggle(controllerName || 'settings'); });
    }

    // Общее окно "да/нет" — раньше было продублировано для смены домена
    // и для сброса кэша, теперь один вызов на оба случая.
    function confirmModal(options) {
        var prevController = activeController();

        safe(function () {
            Lampa.Modal.open({
                title: options.title,
                html: $('<div class="flat-domain-modal">' + options.text + '</div>'),
                size: 'small',
                onBack: function () { closeAndRestore(prevController); },
                buttons: [
                    { name: 'Отмена', onSelect: function () { closeAndRestore(prevController); } },
                    { name: options.confirmName, onSelect: function () {
                        safe(function () { Lampa.Modal.close(); });
                        options.onConfirm();
                    } }
                ]
            });
        });
    }

    function goToTarget() {
        window.localStorage.setItem('force_lampa_run', 'true');
        window.location.href = proto + '//' + targetHost;
    }

    // Окно переключения домена (без предварительной проверки доступности)
    function openSwitchDomainModal() {
        var isRun = (currentHost === targetHost);

        confirmModal({
            title: isRun ? 'Возврат домена' : 'Смена домена',
            text: isRun
                ? 'Вернуться на <b>' + originalHost + '</b>?<div class="flat-domain-hint">Автоматический переход на ' + targetHost + ' будет отключён</div>'
                : 'Перейти на <b>' + targetHost + '</b>?<div class="flat-domain-hint">При запуске приложение будет открываться на этом домене</div>',
            confirmName: isRun ? 'Вернуться' : 'Включить',
            onConfirm: function () {
                if (isRun) {
                    window.location.href = proto + '//' + originalHost + '/?reset_domain=1';
                } else {
                    goToTarget();
                }
            }
        });
    }

    function openClearCacheModal() {
        confirmModal({
            title: 'Сброс кэша',
            text: 'Очистить кэш приложения?<div class="flat-domain-hint">Настройки и аккаунт сохранятся</div>',
            confirmName: 'Сбросить',
            onConfirm: function () {
                window.localStorage.removeItem('lampa_cache');
                window.location.reload();
            }
        });
    }

    // Кнопка перезагрузки страницы прямо в шапке (между уведомлениями и настройками).
    // Ставим её перед .open--settings — в стандартной шапке Lampa значок
    // уведомлений (.notice--icon) идёт непосредственно перед настройками,
    // так что кнопка окажется между ними.
    function tryAddReloadHeadButton() {
        return !!safe(function () {
            if (document.querySelector('.head__reload-btn')) return true;

            var settingsIcon = document.querySelector('.open--settings');
            if (!settingsIcon) return false;

            var btn = $(
                '<div class="head__action selector head__reload-btn" title="Перезагрузить страницу">' +
                svg(ICON_RELOAD, 24) +
                '</div>'
            );

            btn.on('hover:enter click', function () {
                window.location.reload();
            });

            $(settingsIcon).before(btn);
            return true;
        });
    }

    function initReloadHeadButton() {
        if (tryAddReloadHeadButton()) return;

        // .head ещё может быть не отрисован в момент appready — пробуем
        // ещё немного, затем прекращаем попытки.
        var attempts = 0;
        var timer = setInterval(function () {
            attempts++;
            if (tryAddReloadHeadButton() || attempts >= 40) {
                clearInterval(timer);
            }
        }, 500);
    }

    // 1. ПРИЁМ СИГНАЛА НА ВОЗВРАТ
    if (window.location.search.indexOf('reset_domain=1') !== -1) {
        window.localStorage.removeItem('force_lampa_run');
        var cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.replaceState({path: cleanUrl}, '', cleanUrl);
    }

    // 2. АВТО-ПЕРЕХОД, если он был включён (без фоновой проверки доступности)
    if (currentHost !== targetHost && window.localStorage.getItem('force_lampa_run') === 'true') {
        window.location.replace(proto + '//' + targetHost);
        return;
    }

    function init() {
        var isRun = (currentHost === targetHost);

        safe(function () {
            // Раздел "Домен" в Настройках
            Lampa.SettingsApi.addComponent({
                component: 'custom_domain',
                icon: svg(ICON_GLOBE, 36),
                name: 'Домен'
            });

            // Смена домена
            Lampa.SettingsApi.addParam({
                component: 'custom_domain',
                param: { name: 'switch_domain_btn', type: 'button' },
                field: {
                    name: isRun ? 'Вернуться на ' + originalHost : 'Переключить на ' + targetHost,
                    description: 'Сейчас установлен: ' + currentHost
                },
                onChange: openSwitchDomainModal,
                onRender: withIcon(ICON_GLOBE)
            });

            // Перезагрузка страницы
            Lampa.SettingsApi.addParam({
                component: 'custom_domain',
                param: { name: 'reload_page_btn', type: 'button' },
                field: {
                    name: 'Перезагрузить страницу',
                    description: 'Полностью перезапустить приложение'
                },
                onChange: function () { window.location.reload(); },
                onRender: withIcon(ICON_RELOAD)
            });

            // Сброс кэша
            Lampa.SettingsApi.addParam({
                component: 'custom_domain',
                param: { name: 'clear_app_cache', type: 'button' },
                field: {
                    name: 'Очистить кэш приложения',
                    description: 'Полезно, если после смены домена не грузятся постеры'
                },
                onChange: openClearCacheModal,
                onRender: withIcon(ICON_TRASH)
            });
        });
    }

    if (window.appready) {
        init();
        initReloadHeadButton();
    } else {
        safe(function () {
            Lampa.Listener.follow('app', function (e) {
                if (e.type == 'ready') {
                    init();
                    initReloadHeadButton();
                }
            });
        });
    }

    // Поднимаем раздел "Домен" в самый верх меню настроек (перед Синхронизацией)
    safe(function () {
        Lampa.Settings.listener.follow('open', function (e) {
            if (e.name === 'main') {
                var domainItem = e.body.find('[data-component="custom_domain"]');
                if (domainItem.length) {
                    domainItem.prependTo(domainItem.parent());
                }
            }
        });
    });
})();
