(function () {
    'use strict';

    // 1. Настройки доменов
    var currentHost = window.location.hostname;
    var targetHost = 'lampa.run';

    // 2. АВТО-РЕДИРЕКТ: Если мы на старом домене, но ранее нажали "переключить навсегда"
    if (currentHost !== targetHost && window.localStorage.getItem('force_lampa_run') === 'true') {
        window.location.href = 'http://' + targetHost;
        return; // Останавливаем дальнейшую загрузку старого домена
    }

    function init() {
        // Строгий плоский UI
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

        // Создаем раздел в меню
        Lampa.SettingsApi.addComponent({
            component: 'custom_domain',
            icon: '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>',
            name: 'Домен'
        });

        // Кнопка включения авто-редиректа
        if (currentHost !== targetHost) {
            Lampa.SettingsApi.addParam({
                component: 'custom_domain',
                param: { name: 'switch_domain_run', type: 'button' },
                field: { name: 'Переключить на lampa.run (Навсегда)' },
                onChange: function () {
                    Lampa.Modal.open({
                        title: 'Смена домена',
                        html: $('<div class="flat-domain-modal">Включить автоматический переход на <b>lampa.run</b>?<br><br><small style="color:#aaa;">При каждом входе ТВ будет сам переключать вас на новый адрес.</small></div>'),
                        size: 'small',
                        buttons: [
                            {
                                name: 'Отмена',
                                onSelect: function () { Lampa.Modal.close(); }
                            },
                            {
                                name: 'Включить',
                                onSelect: function () {
                                    // Записываем флаг в память телевизора НАВСЕГДА
                                    window.localStorage.setItem('force_lampa_run', 'true');
                                    window.location.href = 'http://' + targetHost;
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