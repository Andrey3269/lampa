(function () {
    'use strict';

    if (window.LampaTVModeReady) return;
    window.LampaTVModeReady = true;

    // Изолированный namespace
    window.Lampa.TVMode = {
        debug: false,
        activeRow: 0,
        activeItems: {}, // Сохранение позиции скролла: { rowId: colId }
        lastScreen: null
    };

    const log = (...args) => { if (Lampa.TVMode.debug) console.log('[TV Mode]', ...args); };

    // =========================================================================
    // 1. НАСТРОЙКИ (Включение / Отключение)
    // =========================================================================
    Lampa.SettingsApi.addParam({
        component: 'interface',
        param: 'lampa_tv_mode',
        values: { false: 'Обычный режим', true: 'TV Mode' },
        default: false,
        name: 'Режим интерфейса'
    });

    // =========================================================================
    // 2. CSS СТИЛИ (Современный TV UI)
    // =========================================================================
    const injectCSS = () => {
        if (document.getElementById('lampa_tv_mode_css')) return;
        const style = document.createElement('style');
        style.id = 'lampa_tv_mode_css';
        style.innerHTML = `
            /* Изолированный контейнер для TV */
            .lampa-tv-app {
                position: absolute; top: 0; left: 0; right: 0; bottom: 0;
                background: #0f0f11; color: #fff; z-index: 1000;
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                display: flex; flex-direction: row; overflow: hidden;
            }

            /* Sidebar */
            .lampa-tv-sidebar {
                width: 80px; background: #161618; border-right: 1px solid #222;
                display: flex; flex-direction: column; align-items: center; padding-top: 2em;
                transition: width 0.2s ease; z-index: 10;
            }
            .lampa-tv-sidebar.open { width: 250px; align-items: flex-start; padding-left: 20px; }
            .lampa-tv-sidebar .tv-nav-item {
                padding: 15px; margin: 10px 0; border-radius: 12px;
                opacity: 0.6; transition: all 0.2s; white-space: nowrap; overflow: hidden;
            }
            .lampa-tv-sidebar .tv-nav-item.focus { opacity: 1; background: #fff; color: #000; transform: scale(1.05); }

            /* Контент */
            .lampa-tv-content {
                flex: 1; padding: 40px; overflow-y: auto; overflow-x: hidden;
                scrollbar-width: none; /* Firefox */
            }
            .lampa-tv-content::-webkit-scrollbar { display: none; }

            .tv-row-title { font-size: 1.4em; font-weight: 600; margin: 20px 0 15px 10px; color: #eee; }
            .tv-row { display: flex; flex-direction: row; gap: 20px; overflow-x: visible; margin-bottom: 30px; }

            /* Карточки */
            .tv-card {
                width: 200px; height: 300px; background: #1c1c1e; border-radius: 12px;
                position: relative; transition: transform 0.2s ease, box-shadow 0.2s ease, border 0.2s ease;
                opacity: 0.85; border: 2px solid transparent; flex-shrink: 0;
            }
            .tv-card img { width: 100%; height: 100%; object-fit: cover; border-radius: 10px; }
            .tv-card.focus {
                opacity: 1; transform: scale(1.05);
                border: 2px solid #e50914; box-shadow: 0 10px 20px rgba(0,0,0,0.5); z-index: 5;
            }

            /* Экран фильма (Movie View) */
            .tv-movie-view { display: flex; flex-direction: row; height: 100%; }
            .tv-movie-poster { width: 300px; height: 450px; border-radius: 15px; margin-right: 50px; box-shadow: 0 15px 30px rgba(0,0,0,0.7); }
            .tv-movie-info { flex: 1; display: flex; flex-direction: column; justify-content: center; }
            .tv-movie-title { font-size: 3em; font-weight: bold; margin-bottom: 10px; }
            .tv-movie-meta { font-size: 1.2em; color: #aaa; margin-bottom: 30px; }
            .tv-movie-btn {
                background: #222; padding: 15px 30px; border-radius: 8px; font-size: 1.2em;
                margin-right: 15px; display: inline-block; transition: all 0.2s; border: 2px solid transparent;
            }
            .tv-movie-btn.focus { background: #e50914; color: #fff; transform: scale(1.05); border: 2px solid #fff; }
        `;
        document.head.appendChild(style);
    };

    // =========================================================================
    // 3. КОНТРОЛЛЕР НАВИГАЦИИ (Focus System)
    // =========================================================================
    const initController = () => {
        Lampa.Controller.add('tv_home', {
            toggle: function () {
                Lampa.Controller.collectionSet(this.render());
                Lampa.Controller.collectionFocus(false, this.render());
                this.updateFocus();
            },
            up: function () {
                if (Lampa.TVMode.activeRow > 0) {
                    Lampa.TVMode.activeRow--;
                    this.updateFocus();
                }
            },
            down: function () {
                if (Lampa.TVMode.activeRow < $('.tv-row').length - 1) {
                    Lampa.TVMode.activeRow++;
                    this.updateFocus();
                }
            },
            left: function () {
                let rowId = Lampa.TVMode.activeRow;
                let colId = Lampa.TVMode.activeItems[rowId] || 0;
                if (colId > 0) {
                    Lampa.TVMode.activeItems[rowId] = colId - 1;
                    this.updateFocus();
                } else {
                    // Открытие Sidebar
                    Lampa.Controller.toggle('tv_sidebar');
                }
            },
            right: function () {
                let rowId = Lampa.TVMode.activeRow;
                let colId = Lampa.TVMode.activeItems[rowId] || 0;
                let maxCols = $('.tv-row').eq(rowId).find('.tv-card').length;
                if (colId < maxCols - 1) {
                    Lampa.TVMode.activeItems[rowId] = colId + 1;
                    this.updateFocus();
                }
            },
            enter: function () {
                let activeElem = $('.tv-card.focus');
                if (activeElem.length) activeElem.trigger('hover:enter');
            },
            back: function () {
                Lampa.Activity.backward();
            },
            updateFocus: function () {
                $('.tv-card').removeClass('focus');
                let rowId = Lampa.TVMode.activeRow;
                let colId = Lampa.TVMode.activeItems[rowId] || 0;
                let row = $('.tv-row').eq(rowId);
                let target = row.find('.tv-card').eq(colId);

                if (target.length) {
                    target.addClass('focus');
                    // Автоматическая прокрутка с центрированием
                    target[0].scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                }
            },
            render: function () {
                return $('.lampa-tv-content');
            }
        });
    };

    // =========================================================================
    // 4. КОМПОНЕНТЫ (Главная и Карточка фильма)
    // =========================================================================
    function TVHomeComponent(object) {
        this.create = function () {
            this.html = $('<div class="lampa-tv-app"></div>');

            // Sidebar
            this.sidebar = $('<div class="lampa-tv-sidebar"><div class="tv-nav-item">🏠</div><div class="tv-nav-item">🎬</div><div class="tv-nav-item">⚙</div></div>');
            this.html.append(this.sidebar);

            // Content API (Mocking Lampa.Api for demo, in prod use real data)
            this.content = $('<div class="lampa-tv-content"></div>');

            // Рендер рядов
            const categories = ['ПРОДОЛЖИТЬ ПРОСМОТР', 'ПОПУЛЯРНОЕ', 'НОВЫЕ ФИЛЬМЫ'];
            categories.forEach((title, rowIdx) => {
                this.content.append(`<div class="tv-row-title">${title}</div>`);
                let row = $('<div class="tv-row"></div>');
                for (let i = 0; i < 8; i++) {
                    let card = $(`<div class="tv-card"><img src="https://via.placeholder.com/200x300/1c1c1e/fff?text=Poster+${i+1}"></div>`);
                    card.on('hover:enter', () => {
                        log(`Opening card ${i+1} in row ${rowIdx}`);
                        Lampa.TVMode.lastScreen = 'home';
                        Lampa.Activity.push({ component: 'tv_full', title: 'Джентльмены', id: i });
                    });
                    row.append(card);
                }
                this.content.append(row);
            });

            this.html.append(this.content);
        };

        this.render = function () { return this.html; };
        this.destroy = function () { this.html.remove(); };
    }

    function TVFullComponent(object) {
        this.create = function () {
            this.html = $('<div class="lampa-tv-app"><div class="lampa-tv-content tv-movie-view"></div></div>');
            let view = this.html.find('.tv-movie-view');

            view.append('<img class="tv-movie-poster" src="https://via.placeholder.com/300x450/1c1c1e/fff?text=Джентльмены">');

            let info = $('<div class="tv-movie-info"></div>');
            info.append(`<div class="tv-movie-title">${object.title || 'Название фильма'}</div>`);
            info.append('<div class="tv-movie-meta">2024 · Crime · Drama · ★ 8.1</div>');

            let btnPlay = $('<div class="tv-movie-btn focus">▶ СМОТРЕТЬ</div>');
            let btnFav = $('<div class="tv-movie-btn">☆ В ИЗБРАННОЕ</div>');

            btnPlay.on('hover:enter', () => {
                // ИНТЕГРАЦИЯ С Z01: Мы триггерим оригинальный Lampa Activity Flow
                // Плагины источников (как Z01) будут реагировать на вызов плеера
                log('Triggering player / sources');
                // Фейк-объект для совместимости с Lampa API
                Lampa.Listener.send('full', { type: 'build', object: this });
                // Если Z01 перехватывает клики, можно добавить скрытую кнопку .full-start__button
                // и программно нажимать её здесь.
            });

            info.append($('<div></div>').append(btnPlay).append(btnFav));
            view.append(info);

            // Локальный контроллер для экрана фильма
            Lampa.Controller.add('tv_full', {
                toggle: function () { $('.tv-movie-btn').removeClass('focus'); btnPlay.addClass('focus'); },
                left: function () { btnPlay.addClass('focus'); btnFav.removeClass('focus'); },
                right: function () { btnFav.addClass('focus'); btnPlay.removeClass('focus'); },
                enter: function () { this.html.find('.tv-movie-btn.focus').trigger('hover:enter'); }.bind(this),
                back: function () { Lampa.Activity.backward(); }
            });
        };

        this.render = function () { return this.html; };
        this.destroy = function () { this.html.remove(); delete Lampa.Controller.controllers['tv_full']; };
    }

    // =========================================================================
    // 5. ИНИЦИАЛИЗАЦИЯ И ПЕРЕХВАТ РОУТИНГА
    // =========================================================================
    const bootstrap = () => {
        injectCSS();
        initController();

        Lampa.Component.add('tv_home', TVHomeComponent);
        Lampa.Component.add('tv_full', TVFullComponent);

        // Перехватываем смену экранов
        const origPush = Lampa.Activity.push;
        Lampa.Activity.push = function (params) {
            if (Lampa.Storage.get('lampa_tv_mode')) {
                log('Intercepting push:', params.component);
                if (params.component === 'main') params.component = 'tv_home';
                if (params.component === 'full') params.component = 'tv_full';
            }
            return origPush.apply(this, arguments);
        };

        // Восстановление фокуса при возврате
        Lampa.Listener.follow('activity', function (e) {
            if (Lampa.Storage.get('lampa_tv_mode') && e.type === 'start') {
                if (e.component === 'tv_home') {
                    Lampa.Controller.toggle('tv_home');
                } else if (e.component === 'tv_full') {
                    Lampa.Controller.toggle('tv_full');
                }
            }
        });
    };

    // Запуск плагина по готовности
    if (window.appready) bootstrap();
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') bootstrap(); });

})();