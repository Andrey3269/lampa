(function () {
    'use strict';

    function init() {
        // Жесткий плоский стиль без glassmorphism
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

        // 1. Создаем отдельный раздел в левом меню настроек
        Lampa.SettingsApi.addComponent({
            component: 'custom_domain',
            icon: '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>',
            name: 'Домен'
        });

        // 2. Добавляем кнопку переключения в наш новый раздел
        Lampa.SettingsApi.addParam({
            component: 'custom_domain',
            param: {
                name: 'switch_domain_run',
                type: 'button'
            },
            field: {
                name: 'Переключить на lampa.run'
            },
            onChange: function () {
                Lampa.Modal.open({
                    title: 'Смена домена',
                    html: $('<div class="flat-domain-modal">Вы уверены, что хотите переключить приложение на <b>lampa.run</b>?</div>'),
                    size: 'small',
                    buttons: [
                        {
                            name: 'Отмена',
                            onSelect: function () {
                                Lampa.Modal.close();
                            }
                        },
                        {
                            name: 'Переключить',
                            onSelect: function () {
                                window.location.href = 'https://lampa.run';
                            }
                        }
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
})();