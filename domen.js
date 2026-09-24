(function () {
    'use strict';

    var currentHost = window.location.hostname;
    var targetHost = 'lampa.run';
    var originalHost = 'lampa.mx';

    // Внедряем строгий плоский стиль (никакого glassmorphism и glow)
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
        .flat-loader-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: #141414; z-index: 99999;
            display: flex; align-items: center; justify-content: center;
            color: #fff; font-size: 1.5em; font-family: sans-serif; text-align: center;
        }
    `;
    document.head.appendChild(style);

    // Функция показа окна при ошибке проверки (с возможностью принудительного перехода)
    function showFailModal() {
        // Ждем, пока Lampa полностью загрузится, чтобы контроллер пульта не завис
        var waitLampa = setInterval(function() {
            if (window.appready && window.Lampa && window.Lampa.Modal) {
                clearInterval(waitLampa);

                // Закрываем любые текущие окна и даем паузу 300мс, чтобы Lampa освободила контроллер
                Lampa.Modal.close();
                setTimeout(function() {
                    Lampa.Modal.open({
                        title: 'Внимание',
                        html: $('<div class="flat-domain-modal">Не удалось автоматически проверить <b>' + targetHost + '</b>.<br><br>Возможно, телевизор заблокировал фоновую проверку, но сайт работает.<br><br>Что сделать?</div>'),
                        size: 'small',
                        buttons: [
                            {
                                name: 'Отмена (Остаться тут)',
                                onSelect: function () {
                                    window.localStorage.removeItem('force_lampa_run');
                                    Lampa.Modal.close();
                                }
                            },
                            {
                                name: 'Перейти принудительно',
                                onSelect: function () {
                                    window.localStorage.setItem('force_lampa_run', 'true');
                                    window.location.href = 'http://' + targetHost;
                                }
                            }
                        ]
                    });
                }, 300);
            }
        }, 500);
    }

    // Главная функция проверки домена и редиректа
    function checkAndRedirect(isAuto) {
        var loader = null;

        if (isAuto) {
            loader = document.createElement('div');
            loader.className = 'flat-loader-overlay';
            loader.innerHTML = 'Проверка доступности ' + targetHost + '...';
            document.documentElement.appendChild(loader);
        } else {
            Lampa.Modal.open({
                title: 'Проверка...',
                html: $('<div class="flat-domain-modal">Проверяем доступность <b>' + targetHost + '</b>... Пожалуйста, подождите.</div>'),
                size: 'small',
                buttons: []
            });
        }

        var img = new Image();
        // Даем 4 секунды на попытку
        var timer = setTimeout(function() {
            img.src = '';
            handleFail();
        }, 4000);

        function handleFail() {
            clearTimeout(timer);
            if (isAuto && loader && loader.parentNode) {
                loader.parentNode.removeChild(loader);
            }
            showFailModal();
        }

        img.onload = function() {
            clearTimeout(timer);
            window.localStorage.setItem('force_lampa_run', 'true');
            window.location.href = 'http://' + targetHost;
        };

        img.onerror = function() {
            handleFail();
        };

        // Запрашиваем файл логотипа, который 100% есть в любой сборке Lampa
        img.src = 'http://' + targetHost + '/img/logo.svg?_=' + Date.now();
    }

    // 1. ПРИЕМ СИГНАЛА НА ВОЗВРАТ
    if (window.location.search.indexOf('reset_domain=1') !== -1) {
        window.localStorage.removeItem('force_lampa_run');
        var cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.replaceState({path: cleanUrl}, '', cleanUrl);
    }

    // 2. АВТО-РЕДИРЕКТ (С ПРОВЕРКОЙ)
    if (currentHost !== targetHost && window.localStorage.getItem('force_lampa_run') === 'true') {
        checkAndRedirect(true);
    }

    function init() {
        // Создаем раздел "Домен"
        Lampa.SettingsApi.addComponent({
            component: 'custom_domain',
            icon: '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>',
            name: 'Домен'
        });

        var isRun = (currentHost === targetHost);

        // Кнопка переключения
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
                           (isRun ? 'Отключить авто-переход и вернуться на <b>lampa.mx</b>?' : 'Включить автоматический переход и сменить домен на <b>lampa.run</b>?')
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
                                Lampa.Modal.close();
                                // Даем время закрыться окну, чтобы не завис контроллер
                                setTimeout(function() {
                                    if (isRun) {
                                        window.location.href = 'http://' + originalHost + '/?reset_domain=1';
                                    } else {
                                        checkAndRedirect(false);
                                    }
                                }, 300);
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