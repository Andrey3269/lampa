(function () {
    'use strict';

    var currentHost = window.location.hostname;
    var targetHost = 'lampa.run';
    var originalHost = 'lampa.mx';

    // 1. ПРИЕМ ДАННЫХ (АККАУНТ И НАСТРОЙКИ) ПРИ ПЕРЕХОДЕ
    var transferMatch = window.location.search.match(/transfer_data=([^&]+)/);
    if (transferMatch) {
        try {
            // Расшифровываем данные и записываем в память нового домена
            var decodedData = JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(transferMatch[1])))));
            for (var key in decodedData) {
                window.localStorage.setItem(key, decodedData[key]);
            }

            // Если мы вернулись на mx, сбрасываем флаг авто-перехода
            if (window.location.search.indexOf('reset_domain=1') !== -1) {
                window.localStorage.removeItem('force_lampa_run');
            }

            // Очищаем адресную строку и перезагружаем страницу для применения аккаунта
            var cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
            window.history.replaceState({path: cleanUrl}, '', cleanUrl);
            window.location.reload();
            return;
        } catch(e) {}
    }

    // 2. ПРИЕМ СИГНАЛА НА ВОЗВРАТ (Резервный блок, если данные не передавались)
    if (window.location.search.indexOf('reset_domain=1') !== -1 && !transferMatch) {
        window.localStorage.removeItem('force_lampa_run');
        var cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.replaceState({path: cleanUrl}, '', cleanUrl);
    }

    // 3. АВТО-РЕДИРЕКТ (Срабатывает только при обычных запусках)
    if (currentHost !== targetHost && window.localStorage.getItem('force_lampa_run') === 'true') {
        window.location.href = 'http://' + targetHost;
        return;
    }

    // Функция сбора и шифрования данных для переноса
    function getTransferData() {
        var keysToTransfer = ['account', 'lampa_settings', 'cub_profile', 'plugins'];
        var transferData = {};
        keysToTransfer.forEach(function(k) {
            var val = window.localStorage.getItem(k);
            if (val) transferData[k] = val;
        });
        // Кодируем в Base64 для безопасной передачи через URL
        return encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(transferData)))));
    }

    function init() {
        // Жесткий плоский UI
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
        `;
        document.head.appendChild(style);

        // Создаем раздел "Домен"
        Lampa.SettingsApi.addComponent({
            component: 'custom_domain',
            icon: '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>',
            name: 'Домен'
        });

        var isRun = (currentHost === targetHost);

        // Кнопка переключения с переносом данных
        Lampa.SettingsApi.addParam({
            component: 'custom_domain',
            param: { name: 'switch_domain_btn', type: 'button' },
            field: {
                name: isRun ? 'Вернуться на lampa.mx' : 'Переключить на lampa.run',
                description: 'Сейчас установлен: ' + currentHost
            },
            onChange: function () {
                Lampa.Modal.open({
                    title: isRun ? 'Возврат домена' : 'Смена домена',
                    html: $('<div class="flat-domain-modal">' +
                           (isRun ? 'Отключить авто-переход, вернуться на <b>lampa.mx</b> и перенести текущий аккаунт?' : 'Включить автоматический переход, сменить домен на <b>lampa.run</b> и перенести ваш аккаунт?')
                           + '</div>'),
                    size: 'small',
                    buttons: [
                        {
                            name: 'Отмена',
                            onSelect: function () { Lampa.Modal.close(); }
                        },
                        {
                            name: isRun ? 'Вернуться' : 'Включить',
                            onSelect: function () {
                                var dataString = getTransferData();
                                if (isRun) {
                                    window.location.href = 'http://' + originalHost + '/?reset_domain=1&transfer_data=' + dataString;
                                } else {
                                    window.localStorage.setItem('force_lampa_run', 'true');
                                    window.location.href = 'http://' + targetHost + '/?transfer_data=' + dataString;
                                }
                            }
                        }
                    ]
                });
            }
        });

        // Кнопка сброса кэша
        Lampa.SettingsApi.addParam({
            component: 'custom_domain',
            param: { name: 'clear_app_cache', type: 'button' },
            field: {
                name: 'Очистить кэш приложения',
                description: 'Полезно, если после смены домена не грузятся постеры'
            },
            onChange: function () {
                Lampa.Modal.open({
                    title: 'Сброс кэша',
                    html: $('<div class="flat-domain-modal">Вы уверены? Это очистит временные файлы. Ваши настройки и аккаунт сохранятся.</div>'),
                    size: 'small',
                    buttons: [
                        { name: 'Отмена', onSelect: function () { Lampa.Modal.close(); } },
                        { name: 'Сбросить', onSelect: function () {
                            window.localStorage.removeItem('lampa_cache');
                            window.location.reload();
                        }}
                    ]
                });
            }
        });
    }

    if (window.appready) {
        init();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type == 'ready') init();
        });
    }

    // Поднимаем раздел "Домен" в самый верх меню настроек
    Lampa.Settings.listener.follow('open', function (e) {
        if (e.name === 'main') {
            var domainItem = e.body.find('[data-component="custom_domain"]');
            if (domainItem.length) {
                domainItem.prependTo(domainItem.parent());
            }
        }
    });
})();