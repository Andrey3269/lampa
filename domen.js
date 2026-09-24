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

    // Универсальная функция для безопасного закрытия окна и возврата фокуса пульту/клавиатуре
    function closeAndRestore(controllerName) {
        Lampa.Modal.close();
        setTimeout(function() {
            if (window.Lampa && window.Lampa.Controller) {
                Lampa.Controller.toggle(controllerName || 'settings');
            }
        }, 50); // Минимальная задержка для того, чтобы Lampa успела очистить DOM
    }

    // Главная функция проверки домена и редиректа
    function checkAndRedirect(isAuto) {
        var loader = null;
        var prevController = (window.Lampa && window.Lampa.Controller && Lampa.Controller.enabled()) ? Lampa.Controller.enabled().name : 'settings';

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
                onBack: function() { closeAndRestore(prevController); }, // Позволяет прервать проверку кнопкой Назад/Esc
                buttons: []
            });
        }

        var img = new Image();
        var timer = setTimeout(function() {
            img.src = '';
            handleFail();
        }, 4000); // Даем 4 секунды на попытку

        function handleFail() {
            clearTimeout(timer);
            if (isAuto && loader && loader.parentNode) {
                loader.parentNode.removeChild(loader);
            }

            // Если домен не ответил, показываем окно с выбором
            var waitLampa = setInterval(function() {
                if (window.appready && window.Lampa && window.Lampa.Modal && window.Lampa.Controller) {
                    clearInterval(waitLampa);
                    var fallbackController = isAuto ? 'main' : 'settings';

                    Lampa.Modal.open({
                        title: 'Внимание',
                        html: $('<div class="flat-domain-modal">Не удалось автоматически проверить <b>' + targetHost + '</b>.<br><br>Возможно, телевизор заблокировал фоновую проверку, но сайт работает.<br><br>Что сделать?</div>'),
                        size: 'small',
                        onBack: function() { closeAndRestore(fallbackController); }, // ЖЕЛЕЗНАЯ ЗАЩИТА ESCAPE / НАЗАД
                        buttons: [
                            {
                                name: 'Отмена (Остаться тут)',
                                onSelect: function () {
                                    window.localStorage.removeItem('force_lampa_run');
                                    closeAndRestore(fallbackController);
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
                }
            }, 500);
        }

        img.onload = function() {
            clearTimeout(timer);
            window.localStorage.setItem('force_lampa_run', 'true');
            window.location.href = 'http://' + targetHost;
        };

        img.onerror = function() {
            handleFail();
        };

        // Ищем файл логотипа, который 100% есть в Lampa
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
            icon: '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>',
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
                var prevController = (window.Lampa && window.Lampa.Controller && Lampa.Controller.enabled()) ? Lampa.Controller.enabled().name : 'settings';

                Lampa.Modal.open({
                    title: isRun ? 'Возврат домена' : 'Смена домена',
                    html: $('<div class="flat-domain-modal">' +
                           (isRun ? 'Отключить авто-переход и вернуться на <b>lampa.mx</b>?' : 'Включить автоматический переход и сменить домен на <b>lampa.run</b>?')
                           + '</div>'),
                    size: 'small',
                    onBack: function() { closeAndRestore(prevController); }, // ЖЕЛЕЗНАЯ ЗАЩИТА ESCAPE / НАЗАД
                    buttons: [
                        {
                            name: 'Отмена',
                            onSelect: function () { closeAndRestore(prevController); }
                        },
                        {
                            name: isRun ? 'Вернуться' : 'Включить',
                            onSelect: function () {
                                if (isRun) {
                                    window.location.href = 'http://' + originalHost + '/?reset_domain=1';
                                } else {
                                    checkAndRedirect(false);
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
                var prevController = (window.Lampa && window.Lampa.Controller && Lampa.Controller.enabled()) ? Lampa.Controller.enabled().name : 'settings';

                Lampa.Modal.open({
                    title: 'Сброс кэша',
                    html: $('<div class="flat-domain-modal">Вы уверены? Это очистит временные файлы. Ваши настройки и аккаунт сохранятся.</div>'),
                    size: 'small',
                    onBack: function() { closeAndRestore(prevController); }, // ЖЕЛЕЗНАЯ ЗАЩИТА ESCAPE / НАЗАД
                    buttons: [
                        { name: 'Отмена', onSelect: function () { closeAndRestore(prevController); } },
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