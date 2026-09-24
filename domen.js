(function () {
    'use strict';

    function init() {
        // Добавляем строгий плоский стиль для модального окна
        var style = document.createElement('style');
        style.innerHTML = `
            .flat-domain-modal {
                background: #141414 !important;
                border: 1px solid #333 !important;
                border-radius: 0px !important;
                padding: 20px;
                text-align: center;
                /* НИКАКОГО glassmorphism и glow */
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

        // Добавляем кнопку в раздел "Остальное" (rest)
        Lampa.SettingsApi.addParam({
            component: 'rest',
            param: {
                name: 'switch_domain_run',
                type: 'button'
            },
            field: {
                name: 'Переключить домен на lampa.run'
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
                                // Для Tizen-виджетов это обновит текущий хост
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