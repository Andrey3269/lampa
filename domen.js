(function () {
    'use strict';

    var currentHost = window.location.hostname;
    var targetHost = 'lampa.run';
    var originalHost = 'lampa.mx';

    // Протокол берём от текущей страницы, а не хардкодим http://
    var proto = (window.location.protocol === 'https:') ? 'https:' : 'http:';

    // Плоский стиль окон + иконки в пунктах настроек
    var style = document.createElement('style');
    style.innerHTML = `
        .flat-domain-modal {
            background: #141414 !important;
            border: 1px solid #333 !important;
            border-radius: 0px !important;
            padding: 20px;
            text-align: center;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            box-shadow: none !important;
            text-shadow: none !important;
        }
        .flat-domain-modal .modal__title,
        .flat-domain-modal .modal__body {
            background: transparent !important;
        }
        .domain-param-icon {
            width: 1.3em;
            height: 1.3em;
            margin-right: .55em;
            vertical-align: -0.25em;
            flex-shrink: 0;
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
            try {
                item.find('.settings-param__name').prepend(svg(paths, null, 'domain-param-icon'));
            } catch (e) {
                console.warn('[custom_domain] icon render failed', e);
            }
        };
    }

    // Безопасное закрытие окна и возврат фокуса пульту/клавиатуре.
    // Controller.toggle вызываем синхронно — так же делает сама Lampa.
    function closeAndRestore(controllerName) {
        Lampa.Modal.close();
        try {
            if (window.Lampa && window.Lampa.Controller) {
                Lampa.Controller.toggle(controllerName || 'settings');
            }
        } catch (e) {
            console.warn('[custom_domain] controller toggle failed', e);
        }
    }

    function goToTarget() {
        window.localStorage.setItem('force_lampa_run', 'true');
        window.location.href = proto + '//' + targetHost;
    }

    // Окно переключения домена (без предварительной проверки доступности)
    function openSwitchDomainModal() {
        var isRun = (currentHost === targetHost);
        var prevController = (window.Lampa && window.Lampa.Controller && Lampa.Controller.enabled()) ? Lampa.Controller.enabled().name : 'settings';

        Lampa.Modal.open({
            title: isRun ? 'Возврат домена' : 'Смена домена',
            html: $('<div class="flat-domain-modal">' +
                   (isRun ? 'Отключить авто-переход и вернуться на <b>' + originalHost + '</b>?' : 'Включить автоматический переход и сменить домен на <b>' + targetHost + '</b>?')
                   + '</div>'),
            size: 'small',
            onBack: function () { closeAndRestore(prevController); },
            buttons: [
                {
                    name: 'Отмена',
                    onSelect: function () { closeAndRestore(prevController); }
                },
                {
                    name: isRun ? 'Вернуться' : 'Включить',
                    onSelect: function () {
                        Lampa.Modal.close();
                        if (isRun) {
                            window.location.href = proto + '//' + originalHost + '/?reset_domain=1';
                        } else {
                            goToTarget();
                        }
                    }
                }
            ]
        });
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
        // Раздел "Домен" в Настройках
        Lampa.SettingsApi.addComponent({
            component: 'custom_domain',
            icon: svg(ICON_GLOBE, 36),
            name: 'Домен'
        });

        var isRun = (currentHost === targetHost);

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
            onChange: function () {
                var prevController = (window.Lampa && window.Lampa.Controller && Lampa.Controller.enabled()) ? Lampa.Controller.enabled().name : 'settings';

                Lampa.Modal.open({
                    title: 'Сброс кэша',
                    html: $('<div class="flat-domain-modal">Вы уверены? Это очистит временные файлы. Ваши настройки и аккаунт сохранятся.</div>'),
                    size: 'small',
                    onBack: function () { closeAndRestore(prevController); },
                    buttons: [
                        { name: 'Отмена', onSelect: function () { closeAndRestore(prevController); } },
                        { name: 'Сбросить', onSelect: function () {
                            window.localStorage.removeItem('lampa_cache');
                            window.location.reload();
                        }}
                    ]
                });
            },
            onRender: withIcon(ICON_TRASH)
        });
    }

    if (window.appready) {
        init();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type == 'ready') init();
        });
    }

    // Поднимаем раздел "Домен" в самый верх меню настроек (перед Синхронизацией)
    Lampa.Settings.listener.follow('open', function (e) {
        if (e.name === 'main') {
            var domainItem = e.body.find('[data-component="custom_domain"]');
            if (domainItem.length) {
                domainItem.prependTo(domainItem.parent());
            }
        }
    });
})();