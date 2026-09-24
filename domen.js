(function () {
    'use strict';

    var currentHost = window.location.hostname;
    var targetHost = 'lampa.run';
    var originalHost = 'lampa.mx';

    // 1. ПРИЕМ СИГНАЛА НА ВОЗВРАТ
    if (window.location.search.indexOf('reset_domain=1') !== -1) {
        window.localStorage.removeItem('force_lampa_run');

        // Очищаем адресную строку
        var cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.replaceState({path: cleanUrl}, '', cleanUrl);
    }

    // 2. АВТО-РЕДИРЕКТ
    if (currentHost !== targetHost && window.localStorage.getItem('force_lampa_run') === 'true') {
        window.location.href = 'https://' + targetHost;
        return;
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

        // 3. ОПРЕДЕЛЯЕМ КНОПКУ
        if (currentHost !== targetHost) {
            // МЫ НА LAMPA.MX
            Lampa.SettingsApi.addParam({
                component: 'custom_domain',
                param: { name: 'switch_domain_run', type: 'button' },
                field: {
                    name: 'Переключить на lampa.run',
                    description: 'Сейчас установлен: ' + currentHost
                },
                onChange: function () {
                    Lampa.Modal.open({
                        title: 'Смена домена',
                        html: $('<div class="flat-domain-modal">Включить автоматический переход на <b>lampa.run</b>?</div>'),
                        size: 'small',
                        buttons: [
                            {
                                name: 'Отмена',
                                onSelect: function () { Lampa.Modal.close(); }
                            },
                            {
                                name: 'Включить',
                                onSelect: function () {
                                    window.localStorage.setItem('force_lampa_run', 'true');
                                    window.location.href = 'https://' + targetHost;
                                }
                            }
                        ]
                    });
                }
            });
        } else {
            // МЫ НА LAMPA.RUN
            Lampa.SettingsApi.addParam({
                component: 'custom_domain',
                param: { name: 'switch_domain_mx', type: 'button' },
                field: {
                    name: 'Вернуться на lampa.mx',
                    description: 'Сейчас установлен: ' + currentHost
                },
                onChange: function () {
                    Lampa.Modal.open({
                        title: 'Возврат домена',
                        html: $('<div class="flat-domain-modal">Отключить авто-переход и вернуться на <b>lampa.mx</b>?</div>'),
                        size: 'small',
                        buttons: [
                            {
                                name: 'Отмена',
                                onSelect: function () { Lampa.Modal.close(); }
                            },
                            {
                                name: 'Вернуться',
                                onSelect: function () {
                                    window.location.href = 'https://' + originalHost + '/?reset_domain=1';
                                }
                            }
                        ]
                    });
                }
            });
        }
    }

    if (window.appready) {
        init();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type == 'ready') init();
        });
    }
})();