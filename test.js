(function () {
  'use strict';

  if (window.lampa_wtch_unified_v1) return;
  window.lampa_wtch_unified_v1 = true;

  var VERSION = '1.7.0';

  // Это сам JS-скрипт WTCH.
  // Ничего к URL не добавляем.
  var SCRIPT_URL = 'http://wtch.ch/m';

  // =========================================================
  // Вспомогательная функция
  // =========================================================

  function safe(fn) {
    try {
      return fn();
    } catch (e) {
      return null;
    }
  }

  // =========================================================
  // 1. Скрываем ненужные элементы интерфейса
  // =========================================================

  function injectCSS() {
    if (document.getElementById('lampa_wtch_hide_css')) return;

    var style = document.createElement('style');

    style.id = 'lampa_wtch_hide_css';

    style.innerHTML = `
      .view--trailer,
      [data-action="trailer"],

      .shots-view-button,
      .view--shots,
      .shots-view,
      [data-action="shots"],
      [data-action="shorts"],

      .view--torrent,
      .view--torrents,
      .torrent-view,
      .torrent-view-button,
      .torrent-button,

      [data-action="torrent"],
      [data-action="torrents"],
      [data-type="torrent"],
      [data-type="torrents"],

      .button--torrent,

      .full-start__button[data-subtitle*="торрент"],
      .full-start__button[data-subtitle*="Torrent"] {
        display: none !important;
      }
    `;

    document.head.appendChild(style);
  }

  // =========================================================
  // 2. Физически удаляем элементы
  // =========================================================

  function removeUnwantedUI(root) {
    var scope = root || document;

    var selectors = [
      '.view--trailer',
      '[data-action="trailer"]',

      '.shots-view-button',
      '.view--shots',
      '.shots-view',
      '[data-action="shots"]',
      '[data-action="shorts"]',

      '.view--torrent',
      '.view--torrents',
      '.torrent-view',
      '.torrent-view-button',
      '.torrent-button',

      '[data-action="torrent"]',
      '[data-action="torrents"]',
      '[data-type="torrent"]',
      '[data-type="torrents"]',

      '.button--torrent',

      '.full-start__button[data-subtitle*="торрент"]',
      '.full-start__button[data-subtitle*="Torrent"]'
    ];

    safe(function () {
      selectors.forEach(function (selector) {
        var nodes = scope.querySelectorAll(selector);

        for (var i = 0; i < nodes.length; i++) {
          nodes[i].remove();
        }
      });
    });

    // Дополнительная очистка по названию кнопки
    safe(function () {
      var buttons = scope.querySelectorAll(
        '.full-start__button, .selector'
      );

      for (var i = 0; i < buttons.length; i++) {
        var text = (buttons[i].textContent || '')
          .replace(/\s+/g, ' ')
          .trim()
          .toLowerCase();

        if (
          text === 'торренты' ||
          text === 'torrents' ||
          text === 'torrent'
        ) {
          buttons[i].remove();
        }
      }
    });
  }

  // =========================================================
  // 3. Выключаем торренты
  // =========================================================

  function disableTorrentSetting() {
    safe(function () {
      if (window.lampa_settings) {
        window.lampa_settings.torrents_use = false;
      }
    });

    safe(function () {
      if (
        window.Lampa &&
        window.Lampa.SettingsApi &&
        typeof window.Lampa.SettingsApi.addParam === 'function'
      ) {
        if (window.lampa_settings) {
          window.lampa_settings.torrents_use = false;
        }
      }
    });
  }

  // =========================================================
  // 3.5. Отключаем баннер Showy PRO и всплывающие предложения
  //      подписки (ShowyMarketingRuntime / ShowyProEntryBanner)
  // =========================================================

  function installShowyProGuards() {
    if (window.lampa_wtch_showy_guard_installed) return;
    window.lampa_wtch_showy_guard_installed = true;

    safe(function () {
      if (!window.ShowyMarketingRuntime) {
        window.ShowyMarketingRuntime = {
          start: function () {},
          context: function () {},
          trackLinkResolved: function () {},
          createWtchInvoice: function () {
            return false;
          },
          registerSourceAdapter: function () {
            return false;
          },
          sourceBase: function (base) {
            return base;
          },
          rewriteSourceUrl: function (url) {
            return url;
          },
          ensureInlinePro: function (pro, success) {
            if (typeof success === 'function') {
              success({ base: '', verified: false, changed: false });
            }
          },
          isInlineProActive: function () {
            return false;
          }
        };
      }
    });

    safe(function () {
      if (!window.ShowyProEntryBanner) {
        window.ShowyProEntryBanner = {
          attach: function () {
            return {
              mount: function () {},
              destroy: function () {},
              ensure: function () {}
            };
          },
          version: 'disabled-by-guard'
        };
      }
    });
  }

  // =========================================================
  // 4. Следим за изменением интерфейса Lampa
  // =========================================================

  function installUiCleaner() {
    if (window.lampa_wtch_unified_ui_cleaner) return;

    window.lampa_wtch_unified_ui_cleaner = true;

    safe(function () {
      if (
        window.Lampa &&
        window.Lampa.Listener
      ) {
        Lampa.Listener.follow('full', function (e) {

          if (
            e.type === 'complite' ||
            e.type === 'complete'
          ) {
            setTimeout(function () {

              var root = document;

              safe(function () {
                if (
                  e.object &&
                  e.object.activity &&
                  typeof e.object.activity.render === 'function'
                ) {
                  root = e.object.activity.render();
                }
              });

              removeUnwantedUI(root);

            }, 50);
          }
        });
      }
    });

    // MutationObserver
    if (
      window.MutationObserver &&
      !window.lampa_wtch_unified_observer
    ) {
      window.lampa_wtch_unified_observer =
        new MutationObserver(function () {
          removeUnwantedUI(document);
        });

      safe(function () {
        window.lampa_wtch_unified_observer.observe(
          document.documentElement,
          {
            childList: true,
            subtree: true
          }
        );
      });
    }
  }

  // =========================================================
  // 4.5. Встроенный редизайн плеера
  // =========================================================
  //
  // Тёмный градиент поверх видео, перегруппировка кнопок панели
  // управления в компактные "капсулы" и укрупнённый заголовок ролика.
  // Как и в исходном скине: не трогаем IPTV-плеер (.player.iptv) и
  // пропускаем мобильную платформу / уже обновлённые сборки приложения
  // (app_digital > 328), где такой вид может быть уже встроен нативно.

  function installPlayerSkin() {
    if (window.lampa_wtch_player_skin_installed) return;
    window.lampa_wtch_player_skin_installed = true;

    safe(function () {
      if (
        !window.Lampa ||
        !window.Lampa.Player ||
        !window.Lampa.Platform ||
        typeof window.$ === 'undefined'
      ) {
        return;
      }

      if (
        Lampa.Platform.screen('mobile') ||
        (Lampa.Manifest && Lampa.Manifest.app_digital > 328)
      ) {
        return;
      }

      if (!document.getElementById('lampa_wtch_player_skin_css')) {
        var style = document.createElement('style');
        style.id = 'lampa_wtch_player_skin_css';
        style.innerHTML = '.player-video__overlay{display:none;background:-webkit-gradient(linear,left top,left bottom,from(rgba(0,0,0,0.5)),color-stop(53%,rgba(0,0,0,0.3)),to(rgba(11,13,16,0.8)));background:-webkit-linear-gradient(top,rgba(0,0,0,0.5) 0,rgba(0,0,0,0.3) 53%,rgba(11,13,16,0.8) 100%);background:-moz-linear-gradient(top,rgba(0,0,0,0.5) 0,rgba(0,0,0,0.3) 53%,rgba(11,13,16,0.8) 100%);background:-o-linear-gradient(top,rgba(0,0,0,0.5) 0,rgba(0,0,0,0.3) 53%,rgba(11,13,16,0.8) 100%);background:linear-gradient(to bottom,rgba(0,0,0,0.5) 0,rgba(0,0,0,0.3) 53%,rgba(11,13,16,0.8) 100%);position:absolute;top:0;left:0;width:100%;height:100%}.player:not(.iptv) .player-panel,.player:not(.iptv) .player-info,.player:not(.iptv) .player-footer{background:transparent !important;-webkit-backdrop-filter:unset !important;backdrop-filter:unset !important}.player:not(.iptv) .player-panel__body,.player:not(.iptv) .player-info__body,.player:not(.iptv) .player-footer__body{padding:0}.player:not(.iptv) .player-footer__row{padding:0}.player:not(.iptv) .head-backward{display:none !important}.player:not(.iptv) .player-info__body{padding-left:0 !important;position:relative}.player:not(.iptv) .player-info__name{font-size:1.2em;text-shadow:0 0 .2em rgba(0,0,0,0.5)}.player:not(.iptv) .player-info__title{font-size:2.4em;font-weight:600;line-height:1.4;width:60%;text-shadow:0 0 .2em rgba(0,0,0,0.5);overflow:hidden;-o-text-overflow:\'.\';text-overflow:\'.\';display:-webkit-box;-webkit-line-clamp:2;line-clamp:2;-webkit-box-orient:vertical}.player:not(.iptv) .player-info__values{text-shadow:0 0 .2em rgba(0,0,0,0.5)}.player:not(.iptv) .player-info__values .value--name span{font-weight:600}.player:not(.iptv) .player-info__time{position:absolute;top:.8em;right:0}.player:not(.iptv) .player-panel .button{padding:.9em;width:3em;height:3em}.player:not(.iptv) .player-panel .button.animate-trigger-enter{-webkit-animation:animation-trigger-enter .2s forwards;-moz-animation:animation-trigger-enter .2s forwards;-o-animation:animation-trigger-enter .2s forwards;animation:animation-trigger-enter .2s forwards}.player:not(.iptv) .player-panel .button>svg{width:1.2em;height:1.2em}.player:not(.iptv) .player-panel .button+.button{margin-left:0}.player:not(.iptv) .player-panel__playpause{margin:0;padding:1em !important}.player:not(.iptv) .player-panel__playpause:not(.focus){background:rgba(255,255,255,0.1)}.player:not(.iptv) .player-panel__quality{-webkit-border-radius:5em !important;border-radius:5em !important;padding:0 1em !important}.player:not(.iptv) .player-panel__timeline{margin-bottom:1em}.player:not(.iptv) .player-panel__timeline:not(.focus) .player-panel__position>div::after{display:none}.player:not(.iptv) .player-panel__line-one{margin-bottom:1em;position:relative;z-index:2;text-shadow:0 0 .2em rgba(0,0,0,0.5)}.player:not(.iptv) .player-panel__box-buttons{-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0;display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;background:rgba(255,255,255,0.1);-webkit-border-radius:4em;border-radius:4em}.player:not(.iptv) .player-panel__box-buttons+.player-panel__box-buttons{margin-left:.5em}.player:not(.iptv) .player-panel__next,.player:not(.iptv) .player-panel__prev{padding:1.1em !important}.player:not(.iptv) .player-panel__next>svg,.player:not(.iptv) .player-panel__prev>svg{width:.8em;height:.8em}.player:not(.iptv) .player-panel__playlist{text-align:center}.player:not(.iptv) .player-panel__playlist>svg{width:1em !important}.player:not(.iptv) .player-video__paused,.player:not(.iptv) .player-video__loader{background-color:rgba(255,255,255,0.1)}.player:not(.iptv) .player-info__values .value--size span{background:rgba(255,255,255,0.1);-webkit-border-radius:1em;border-radius:1em}.player:not(.iptv).player--panel-visible .player-video__overlay{display:block;-webkit-animation:animation-opacity .3s;-moz-animation:animation-opacity .3s;-o-animation:animation-opacity .3s;animation:animation-opacity .3s}.normalization{background:rgba(255,255,255,0.1);-webkit-border-radius:1em;border-radius:1em}.normalization canvas{-webkit-border-radius:1em;border-radius:1em}body.platform--browser .player:not(.iptv) .player-panel__box-buttons,body.platform--browser .player:not(.iptv) .player-panel__playpause:not(.focus),body.platform--browser .player:not(.iptv) .player-info__values .value--size span,body.platform--nw .player:not(.iptv) .player-panel__box-buttons,body.platform--nw .player:not(.iptv) .player-panel__playpause:not(.focus),body.platform--nw .player:not(.iptv) .player-info__values .value--size span,body.glass--style.platform--apple .player:not(.iptv) .player-panel__box-buttons,body.glass--style.platform--apple .player:not(.iptv) .player-panel__playpause:not(.focus),body.glass--style.platform--apple .player:not(.iptv) .player-info__values .value--size span,body.glass--style.platform--apple_tv .player:not(.iptv) .player-panel__box-buttons,body.glass--style.platform--apple_tv .player:not(.iptv) .player-panel__playpause:not(.focus),body.glass--style.platform--apple_tv .player:not(.iptv) .player-info__values .value--size span,body.glass--style.platform--android .player:not(.iptv) .player-panel__box-buttons,body.glass--style.platform--android .player:not(.iptv) .player-panel__playpause:not(.focus),body.glass--style.platform--android .player:not(.iptv) .player-info__values .value--size span{-webkit-backdrop-filter:blur(1em);backdrop-filter:blur(1em)}body.platform--browser .normalization,body.platform--browser .player-video__paused,body.platform--browser .player-video__loader,body.platform--nw .normalization,body.platform--nw .player-video__paused,body.platform--nw .player-video__loader,body.glass--style.platform--apple .normalization,body.glass--style.platform--apple .player-video__paused,body.glass--style.platform--apple .player-video__loader,body.glass--style.platform--apple_tv .normalization,body.glass--style.platform--apple_tv .player-video__paused,body.glass--style.platform--apple_tv .player-video__loader,body.glass--style.platform--android .normalization,body.glass--style.platform--android .player-video__paused,body.glass--style.platform--android .player-video__loader{background-color:rgba(255,255,255,0.1);-webkit-backdrop-filter:blur(1em);backdrop-filter:blur(1em)}';
        document.head.appendChild(style);
      }

      var render = $(Lampa.Player.render());
      var title = $('<div class="player-info__title"></div>');
      var value = $('<div class="value--name"><span></span></div>');

      render.find('.player-video__display').after($('<div class="player-video__overlay"></div>'));
      render.find('.player-panel__center').find('.button:not(.player-panel__playpause)').remove();
      render.find('.player-panel__timeline').before(render.find('.player-panel__line-one'));
      render.find('.player-info .player-info__line').before(title);
      render.find('.value--size').after(value);

      var box = $('<div class="player-panel__box-buttons"></div>');
      var right_panel = render.find('.player-panel__right');
      var left_panel = render.find('.player-panel__left');

      var right_box_quality = box.clone();
      var right_box_main = box.clone();
      var right_box_audio = box.clone();
      var left_box_main = box.clone();

      right_panel.append(right_box_audio);
      right_panel.append(right_box_quality);
      right_panel.append(right_box_main);

      right_box_main.append(right_panel.find('.button'));
      right_box_quality.append(right_panel.find('.player-panel__quality'));
      right_box_audio.append(right_panel.find('.player-panel__flow'));
      right_box_audio.append(right_panel.find('.player-panel__subs'));
      right_box_audio.append(right_panel.find('.player-panel__tracks'));

      left_panel.prepend(left_box_main);
      left_box_main.append(left_panel.find('.button'));

      Lampa.Player.listener.follow('start', function (data) {
        var name = data.title;
        var head = '';

        if (!data.iptv) {
          if (data.card) {
            head = data.card.title || data.card.name;
          } else if (Lampa.Activity.active().movie) {
            head = Lampa.Activity.active().movie.title || Lampa.Activity.active().movie.name;
          }
        }

        if (!head) head = name;

        title.text(head).toggleClass('hide', Boolean(data.iptv));

        render.find('.player-info__name').toggleClass('hide', true);

        value.toggleClass('hide', Boolean(name == head)).find('span').text(name);
      });
    });
  }

  // =========================================================
  // 4.6. Скин экрана выбора источника / сезона / серии / озвучки
  // =========================================================
  //
  // ВАЖНО: реальный скрипт поиска озвучек, который грузит этот плагин
  // (SCRIPT_URL = http://wtch.ch/m), регистрирует компонент с именем
  // "wtch" и рисует список классическими карточками ".online-prestige"
  // + стандартным Lampa selectbox для источника/сезона/озвучки. Никакого
  // "плиточного" интерфейса (классы mo-seg/mo-tile и т.п. из Z01UI) в
  // нём нет — это была особенность другого скрипта (z01.online), а не
  // того, что реально подключено. Поэтому прошлая версия темы целилась
  // в несуществующие классы и визуально ничего не меняла.
  //
  // Ниже — тема под РЕАЛЬНУЮ разметку wtch: карточки серий/сезонов
  // покрупнее и с акцентной подсветкой фокуса, тот же стиль для
  // selectbox'а источника/сезона/озвучки (см. installSourceFilterShortcut
  // ниже — он же навешивает класс "wtch-source-select" только на экране
  // этого плагина, остальные меню приложения не трогаются).
  //
  // Правила помечены !important: стиль самого скрипта wtch тоже
  // подключается собственным <style> при старте плагина, и порядок
  // добавления двух независимых скриптов в документ заранее не известен —
  // так наша тема гарантированно перекрывает исходную в любом случае.

  function installSourceSkin() {
    if (window.lampa_wtch_source_skin_installed) return;
    window.lampa_wtch_source_skin_installed = true;

    safe(function () {
      if (
        !window.Lampa ||
        !window.Lampa.Platform ||
        typeof window.$ === 'undefined'
      ) {
        return;
      }

      // Тема рассчитана на экран телевизора — на телефоне не трогаем.
      if (Lampa.Platform.screen('mobile')) return;

      if (document.getElementById('lampa_wtch_source_skin_css')) return;

      var style = document.createElement('style');
      style.id = 'lampa_wtch_source_skin_css';

      style.innerHTML = `
        /* ===== Карточки серий / сезонов (.online-prestige) ===== */
        .online-prestige {
          border-radius: .7em !important;
          background-color: rgba(255,255,255,.06) !important;
          transition: transform .15s ease, box-shadow .15s ease, background .15s ease;
        }
        .online-prestige__img,
        .online-prestige__img > img {
          border-radius: .6em !important;
        }
        .online-prestige__title {
          font-size: 1.35em !important;
        }
        .online-prestige__time,
        .online-prestige__quality {
          font-size: .95em !important;
          opacity: .7;
        }
        /* У скрипта фокус нарисован через ::after с белой рамкой —
           оставляем этот приём (чтобы не спорить с их же анимацией),
           просто делаем рамку акцентной и добавляем лёгкое увеличение. */
        .online-prestige.focus {
          background-color: rgba(124,196,255,.12) !important;
          transform: scale(1.02);
          transition: transform .15s ease;
        }
        .online-prestige.focus::after {
          border-color: #7cc4ff !important;
          border-width: .2em !important;
          border-radius: .7em !important;
          box-shadow: 0 .6em 1.6em rgba(0,0,0,.45);
        }
        .online-prestige-watched {
          border-radius: .7em !important;
          background-color: rgba(255,255,255,.05) !important;
        }
        .online-empty__button {
          border-radius: 2.4em !important;
          padding: .7em 1.6em !important;
          font-size: 1.1em !important;
          transition: transform .15s ease, box-shadow .15s ease;
        }
        .online-empty__button.focus {
          transform: scale(1.06);
          box-shadow: 0 0 0 .16em #7cc4ff !important;
        }

        /* ===== Панель фильтра (кнопки Источник / Фильтр / Поиск) ===== */
        .torrent-filter .simple-button--filter {
          border-radius: 2.4em !important;
          padding: .8em 1.4em !important;
          font-size: 1.05em !important;
          transition: transform .15s ease, box-shadow .15s ease;
        }
        .torrent-filter .simple-button--filter.focus {
          transform: scale(1.05);
          box-shadow: 0 0 0 .16em #7cc4ff !important;
        }
        /* Родные кнопки "Источник" и "Фильтр" дублируют нашу панель
           быстрого доступа снизу — прячем их визуально, как только
           панель построена (класс навешивается в installSourceQuickBar).
           Поиск (лупа + тег запроса) не трогаем — своей замены у него нет. */
        .torrent-filter.wtch-native-hide .filter--sort,
        .torrent-filter.wtch-native-hide .simple-button--filter:not(.filter--sort):not(.filter--search) {
          display: none !important;
        }

        /* ============================================================
           Наша панель быстрого доступа (см. installSourceQuickBar)
           ============================================================ */
        .wtch-quickbar {
          display: -webkit-box; display: -webkit-flex; display: flex;
          -webkit-flex-wrap: wrap; flex-wrap: wrap;
          margin: 0 0 1.4em 0;
        }
        .wtch-quickbar__item {
          display: -webkit-box; display: -webkit-flex; display: flex;
          -webkit-box-align: center; -webkit-align-items: center; align-items: center;
          min-width: 9.5em;
          padding: .7em 1.3em;
          margin: 0 .6em .6em 0;
          border-radius: 2.6em;
          background: rgba(255,255,255,.08);
          border: 1px solid rgba(255,255,255,.09);
          -webkit-backdrop-filter: blur(1em);
          backdrop-filter: blur(1em);
          cursor: pointer;
          transition: transform .15s ease, box-shadow .15s ease, background .15s ease, border-color .15s ease;
        }
        .wtch-quickbar__item.hide { display: none !important; }
        .wtch-quickbar__item:hover {
          background: rgba(255,255,255,.14);
          border-color: rgba(255,255,255,.18);
        }
        .wtch-quickbar__icon {
          display: -webkit-box; display: -webkit-flex; display: flex;
          -webkit-box-align: center; -webkit-align-items: center; align-items: center;
          -webkit-box-pack: center; -webkit-justify-content: center; justify-content: center;
          width: 2.1em; height: 2.1em;
          margin-right: .7em;
          -webkit-flex-shrink: 0; flex-shrink: 0;
          border-radius: 50%;
          background: rgba(255,255,255,.08);
          opacity: .9;
        }
        .wtch-quickbar__icon svg { width: 1.15em; height: 1.15em; display: block; }
        .wtch-quickbar__text {
          display: -webkit-box; display: -webkit-flex; display: flex;
          -webkit-box-orient: vertical; -webkit-flex-direction: column; flex-direction: column;
          overflow: hidden;
        }
        .wtch-quickbar__label {
          font-size: 1.05em;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .wtch-quickbar__value {
          font-size: .82em;
          font-weight: 400;
          opacity: .6;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 12em;
          margin-top: .1em;
        }
        .wtch-quickbar__value:empty { display: none; }
        .wtch-quickbar__item.focus {
          background: #fff; color: #0b0d10;
          border-color: transparent;
          transform: scale(1.06);
          box-shadow: 0 0 0 .16em #7cc4ff, 0 .5em 1.4em rgba(0,0,0,.4);
        }
        .wtch-quickbar__item.focus .wtch-quickbar__icon {
          background: rgba(11,13,16,.1);
        }
        .wtch-quickbar__item.focus .wtch-quickbar__value {
          opacity: .55;
        }

        /* ============================================================
           Классический selectbox для источника / сезона / озвучки /
           общего экрана "Фильтр".
           Класс "wtch-source-select" навешивается только пока активен
           экран поиска озвучек — остальные меню приложения не трогаются.
           ============================================================ */
        .wtch-source-select.selectbox {
          border-radius: 1.1em !important;
          overflow: hidden;
          box-shadow: -1.5em 0 3em rgba(0,0,0,.5);
        }
        .wtch-source-select .selectbox__title {
          font-size: 1.25em !important;
          font-weight: 700 !important;
          padding-bottom: .6em !important;
          margin-bottom: .4em !important;
          border-bottom: 1px solid rgba(255,255,255,.08);
        }
        .wtch-source-select .selectbox-item {
          min-height: 3.3em !important;
          padding: .75em 1.1em !important;
          border-radius: .7em !important;
          margin-bottom: .25em !important;
          transition: transform .12s ease, box-shadow .12s ease, background .12s ease;
        }
        .wtch-source-select .selectbox-item:hover {
          background: rgba(255,255,255,.06) !important;
        }
        .wtch-source-select .selectbox-item.focus {
          background: #fff !important;
          color: #0b0d10 !important;
          transform: scale(1.02);
          box-shadow: 0 0 0 .14em #7cc4ff, 0 .5em 1.2em rgba(0,0,0,.4) !important;
        }
        .wtch-source-select .selectbox-item__title {
          font-size: 1.03em !important;
          font-weight: 500 !important;
        }
        .wtch-source-select .selectbox-item__subtitle {
          font-size: .85em !important;
          opacity: .6;
          margin-top: .15em !important;
        }
        .wtch-source-select .selectbox-item.focus .selectbox-item__subtitle {
          opacity: .55;
        }
        .wtch-source-select .selectbox-item__checkbox {
          -webkit-flex-shrink: 0; flex-shrink: 0;
          opacity: .85;
        }
        .wtch-source-select .scroll__body::-webkit-scrollbar { width: .4em; }
        .wtch-source-select .scroll__body::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,.18);
          border-radius: 1em;
        }
      `;

      document.head.appendChild(style);
    });
  }

  // =========================================================
  // 4.7. Быстрый выбор источника в классическом режиме
  // =========================================================
  //
  // Кнопка смены источника у wtch не спрятана (в отличие от z01), но
  // модуль всё равно оставлен: он безопасен (просто ничего не делает,
  // если кнопка уже видна) и добавляет пункт "Источник" прямо в меню
  // фильтра — плюс помечает открывшееся меню классом для темы из 4.6,
  // когда активен экран поиска озвучек (компонент "wtch" или "lampac_z" —
  // поддерживаем оба на случай, если вы когда-нибудь подключите второй
  // скрипт).

  var WTCH_SOURCE_COMPONENTS = ['wtch', 'lampac_z'];

  function isSourceComponentActive() {
    var active = safe(function () {
      return Lampa.Activity.active();
    });

    if (!active || !active.component) return false;

    return WTCH_SOURCE_COMPONENTS.indexOf(String(active.component).toLowerCase()) !== -1;
  }

  // =========================================================
  // 4.65. Общие помощники экрана wtch
  // =========================================================
  //
  // Используются и в installSourceFilterShortcut, и в installSourceQuickBar:
  // текущий корень активности, кнопки фильтра, признак "это сериал" и
  // кэш того, есть ли у текущего источника выбор сезона/перевода вообще
  // (разные источники отдают разный набор — у части нет переключения
  // перевода, и тогда соответствующую кнопку панели быстрого доступа
  // показывать незачем).

  function wtchActiveRoot() {
    return safe(function () {
      return Lampa.Activity.active().activity.render();
    }) || $(document);
  }

  function wtchFindFilterButtons(root) {
    var $bar = $(root).find('.torrent-filter');
    if (!$bar.length) return null;

    var $sort = $bar.find('.filter--sort');
    var $search = $bar.find('.filter--search');
    var $group = $bar.find('.simple-button--filter').not($sort).not($search).first();

    if (!$sort.length && !$group.length) return null;

    return { bar: $bar, sort: $sort, group: $group };
  }

  // Сериал это или фильм: у сериалов TMDB-карточка содержит
  // number_of_seasons / first_air_date / name вместо title у фильмов.
  function wtchIsSeries() {
    return Boolean(safe(function () {
      var movie = Lampa.Activity.active().movie;
      if (!movie) return false;

      return Boolean(
        movie.number_of_seasons ||
        movie.first_air_date ||
        (movie.name && !movie.title)
      );
    }));
  }

  function wtchCurrentSourceKey() {
    return String(safe(function () {
      var btns = wtchFindFilterButtons(wtchActiveRoot());
      return btns && btns.sort.length ? $('div', btns.sort).text().trim() : '';
    }) || 'unknown');
  }

  var wtchCapabilityCache = {};
  var wtchOnCapabilityUpdate = null;

  function wtchGetCapabilities() {
    return wtchCapabilityCache[wtchCurrentSourceKey()] || null;
  }

  function wtchSetCapabilities(caps) {
    wtchCapabilityCache[wtchCurrentSourceKey()] = caps;
    if (typeof wtchOnCapabilityUpdate === 'function') safe(wtchOnCapabilityUpdate);
  }

  function installSourceFilterShortcut() {
    if (window.lampa_wtch_source_shortcut_installed) return;
    window.lampa_wtch_source_shortcut_installed = true;

    safe(function () {
      if (
        !window.Lampa ||
        !window.Lampa.Controller ||
        !window.Lampa.Controller.listener ||
        typeof window.$ === 'undefined'
      ) {
        return;
      }

      Lampa.Controller.listener.follow('toggle', function (event) {
        if (event.name !== 'select') return;
        if (!isSourceComponentActive()) return;

        // Метим меню экрана wtch своим классом — тема из installSourceSkin()
        // применяется только к нему и не трогает остальные меню приложения.
        $('body > .selectbox').addClass('wtch-source-select');

        var $filterTitle = $('.selectbox__title');

        if ($filterTitle.length !== 1 || $filterTitle.text() !== Lampa.Lang.translate('title_filter')) {
          return;
        }

        // Пока открыт общий экран "Фильтр" — смотрим, какие пункты в нём
        // реально есть у текущего источника (сезона или перевода может
        // не быть вовсе), и запоминаем это для панели быстрого доступа.
        safe(function () {
          var seasonWanted = Lampa.Lang.translate('torrent_serial_season');
          var voiceWanted = Lampa.Lang.translate('torrent_parser_voice');
          var hasSeason = false;
          var hasVoice = false;

          $('.selectbox-item').each(function () {
            var text = $(this).text();
            if (seasonWanted && text.indexOf(seasonWanted) !== -1) hasSeason = true;
            if (voiceWanted && text.indexOf(voiceWanted) !== -1) hasVoice = true;
          });

          wtchSetCapabilities({ season: hasSeason, voice: hasVoice });
        });

        var $sourceBtn = $('.simple-button--filter.filter--sort');

        if ($sourceBtn.length !== 1 || $sourceBtn.hasClass('hide')) {
          return;
        }

        // Не дублируем пункт, если toggle сработал повторно на том же меню.
        if ($('.selectbox-item[data-wtch-source-shortcut]').length) return;

        var $selectBoxItem = Lampa.Template.get('selectbox_item', {
          title: Lampa.Lang.translate('settings_rest_source'),
          subtitle: $('div', $sourceBtn).text()
        });

        $selectBoxItem.attr('data-wtch-source-shortcut', '1');

        $selectBoxItem.on('hover:enter', function () {
          $sourceBtn.trigger('hover:enter');
        });

        $('.selectbox-item').first().after($selectBoxItem);
        Lampa.Controller.collectionSet($('body > .selectbox').find('.scroll__body'));
      });
    });
  }

  // =========================================================
  // 4.8. Панель быстрого доступа: Источник → Сезон → Озвучка
  // =========================================================
  //
  // Отдельная строка крупных "капсул" сверху экрана поиска озвучек —
  // по одной на Источник, Сезон и Озвучку. Каждая капсула сразу
  // открывает нужный шаг, без блуждания по вложенным меню:
  //  - "Источник" — нажимает родную кнопку filter--sort (список
  //                 источников/балансеров) и вторым, приглушённым
  //                 рядком показывает, какой источник выбран сейчас;
  //  - "Сезон"    — открывает меню фильтра и сразу проваливается в
  //                 группу "Сезон". Кнопка показывается только для
  //                 сериалов (см. wtchIsSeries) — у фильмов сезонов
  //                 не бывает, и кнопка там просто не нужна;
  //  - "Озвучка"  — то же самое для группы "Перевод". Кнопка
  //                 показывается, только если у текущего источника
  //                 вообще есть выбор перевода — это выясняется при
  //                 первом открытии экрана "Фильтр" и кэшируется
  //                 (см. wtchCapabilityCache / installSourceFilterShortcut),
  //                 чтобы не показывать кнопку, которая ни к чему не
  //                 приведёт, и не открывать вместо неё случайный
  //                 экран "Фильтр".
  //
  // Отдельной кнопки "Качество" здесь больше нет: у плеера Lampa уже
  // есть собственная настройка качества по умолчанию, дублировать её
  // тут незачем.
  //
  // Выбор источника/сезона/озвучки запоминает сам скрипт wtch (по
  // фильму и источнику) — здесь это не дублируется.
  //
  // Технически модуль не трогает внутренности wtch (они не экспортированы
  // наружу) — он просто нажимает те же самые кнопки, что нажали бы вы
  // сами, через стандартный DOM/Controller API Lampa. Если разработчик
  // wtch когда-нибудь переименует кнопки, модуль тихо перестанет
  // добавлять панель, ничего не сломав.

  function installSourceQuickBar() {
    if (window.lampa_wtch_quickbar_installed) return;
    window.lampa_wtch_quickbar_installed = true;

    safe(function () {
      if (
        !window.Lampa ||
        !window.Lampa.Activity ||
        !window.Lampa.Platform ||
        typeof window.$ === 'undefined' ||
        !window.MutationObserver
      ) {
        return;
      }

      if (Lampa.Platform.screen('mobile')) return;

      var ICONS = {
        source: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M4 7h13M17 7l-3-3M17 7l-3 3" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 17H7M7 17l3 3M7 17l3-3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        season: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4" stroke-linecap="round"/></svg>',
        voice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3" stroke-linecap="round"/></svg>'
      };

      function openSource() {
        var btns = wtchFindFilterButtons(wtchActiveRoot());
        if (btns && btns.sort.length) btns.sort.trigger('hover:enter');
      }

      function currentSourceLabel() {
        return String(safe(function () {
          var btns = wtchFindFilterButtons(wtchActiveRoot());
          return btns && btns.sort.length ? $('div', btns.sort).text().trim() : '';
        }) || '');
      }

      // Вместо тихого тоста или зависшего "чужого" экрана — понятное
      // окно в том же стиле, что и остальные меню этого экрана: что
      // именно недоступно у текущего источника + кнопка быстрого
      // перехода к списку источников.
      function showUnavailableWindow(title, reasonText) {
        var sourceLabel = currentSourceLabel();

        safe(function () {
          Lampa.Select.show({
            title: title,
            items: [
              {
                title: (Lampa.Lang.translate('settings_rest_source') || 'Источник') + ': ' + (sourceLabel || '—'),
                subtitle: reasonText,
                wtch_role: 'info'
              },
              {
                title: 'Сменить источник',
                wtch_role: 'change_source'
              }
            ],
            onSelect: function (item) {
              Lampa.Select.close();

              if (item.wtch_role === 'change_source') {
                setTimeout(openSource, 10);
              }
            },
            onBack: function () {
              Lampa.Controller.toggle('content');
            }
          });
        });
      }

      function openFilterGroup(translateKey, title, reasonText) {
        var btns = wtchFindFilterButtons(wtchActiveRoot());
        if (!btns || !btns.group.length) {
          showUnavailableWindow(title, reasonText);
          return;
        }

        btns.group.trigger('hover:enter');

        setTimeout(function () {
          var wanted = Lampa.Lang.translate(translateKey);
          var $target = $('.selectbox-item').filter(function () {
            return $(this).text().indexOf(wanted) !== -1;
          }).first();

          if ($target.length) {
            $target.trigger('hover:enter');
            return;
          }

          // У этого источника такого пункта нет — не оставляем открытым
          // "чужой" экран фильтра (это и выглядело как зависание), а
          // закрываем его и сразу показываем понятное окно вместо него.
          safe(function () {
            if (Lampa.Select && typeof Lampa.Select.close === 'function') Lampa.Select.close();
          });

          setTimeout(function () {
            showUnavailableWindow(title, reasonText);
          }, 60);
        }, 40);
      }

      function openSeason() {
        openFilterGroup(
          'torrent_serial_season',
          Lampa.Lang.translate('torrent_serial_season') || 'Сезон',
          'У этого источника нет других сезонов'
        );
      }

      function openVoice() {
        openFilterGroup(
          'torrent_parser_voice',
          Lampa.Lang.translate('torrent_parser_voice') || 'Перевод',
          'У этого источника нет других переводов'
        );
      }

      function buildItem(kind, label, action) {
        var $item = $(
          '<div class="wtch-quickbar__item selector" data-wtch-kind="' + kind + '">' +
            '<span class="wtch-quickbar__icon">' + ICONS[kind] + '</span>' +
            '<span class="wtch-quickbar__text">' +
              '<span class="wtch-quickbar__label"></span>' +
              '<span class="wtch-quickbar__value"></span>' +
            '</span>' +
          '</div>'
        );

        $item.find('.wtch-quickbar__label').text(label);
        $item.on('hover:enter', action);

        return $item;
      }

      // Обновляет только подписи и видимость кнопок в уже построенной
      // панели — вызывается при каждом тике наблюдателя, поэтому здесь
      // критично не писать в DOM, если значение и так не изменилось:
      // .text() физически пересоздаёт текстовый узел даже когда строка
      // та же самая, а это childList-мутация — ровно то, что слушает
      // MutationObserver ниже. Без проверки на равенство это превращается
      // в бесконечный цикл "запись → мутация → снова запись", который и
      // подвешивал интерфейс на этом экране.
      function updateBar($wrap) {
        if (!$wrap || !$wrap.length) return;

        var caps = wtchGetCapabilities();
        var isSeries = wtchIsSeries();

        // Пока реальные возможности источника ещё не известны (экран
        // "Фильтр" ни разу не открывался в этом сеансе для этого
        // источника) — не прячем кнопку заранее: лучше один раз показать
        // лишнюю, чем не показать нужную. Как только кэш заполнится,
        // панель сама подстроится.
        var showSeason = isSeries && (!caps || caps.season !== false);
        var showVoice = !caps || caps.voice !== false;

        var $seasonItem = $wrap.find('[data-wtch-kind="season"]');
        var $voiceItem = $wrap.find('[data-wtch-kind="voice"]');

        if ($seasonItem.hasClass('hide') === showSeason) $seasonItem.toggleClass('hide', !showSeason);
        if ($voiceItem.hasClass('hide') === showVoice) $voiceItem.toggleClass('hide', !showVoice);

        var $value = $wrap.find('[data-wtch-kind="source"] .wtch-quickbar__value');
        var newLabel = currentSourceLabel();

        if ($value.text() !== newLabel) $value.text(newLabel);
      }

      function buildBar($bar) {
        // Родные кнопки "Источник"/"Фильтр" больше не нужны на виду —
        // ими управляет панель ниже (сами кнопки остаются в DOM и
        // по-прежнему нажимаются программно, просто визуально скрыты).
        $bar.addClass('wtch-native-hide');

        var $existing = $bar.parent().find('.wtch-quickbar');

        if ($existing.length) {
          updateBar($existing);
          return;
        }

        var $wrap = $('<div class="wtch-quickbar"></div>');

        $wrap.append(buildItem('source', Lampa.Lang.translate('settings_rest_source') || 'Источник', openSource));
        $wrap.append(buildItem('season', Lampa.Lang.translate('torrent_serial_season') || 'Сезон', openSeason));
        $wrap.append(buildItem('voice', Lampa.Lang.translate('torrent_parser_voice') || 'Озвучка', openVoice));

        $bar.after($wrap);

        updateBar($wrap);
      }

      // Как только installSourceFilterShortcut() узнаёт реальные
      // возможности источника (открыв экран "Фильтр"), сразу подстраиваем
      // уже построенную панель — не нужно ждать следующей мутации DOM.
      wtchOnCapabilityUpdate = function () {
        if (!isSourceComponentActive()) return;
        updateBar($(wtchActiveRoot()).find('.wtch-quickbar'));
      };

      // Наблюдатель слушает весь документ (иначе не поймать момент, когда
      // wtch дорисует свою панель), а это может быть очень "шумно" —
      // тротлим тело обработчика, чтобы не гонять buildBar/updateBar на
      // каждую мельчайшую мутацию где угодно в приложении.
      var lastObserverRun = 0;

      var observer = new MutationObserver(function () {
        var now = Date.now();
        if (now - lastObserverRun < 150) return;
        lastObserverRun = now;

        if (!isSourceComponentActive()) return;

        var root = wtchActiveRoot();
        var btns = wtchFindFilterButtons(root);

        if (!btns) return;

        buildBar(btns.bar);
      });

      safe(function () {
        observer.observe(document.documentElement, {
          childList: true,
          subtree: true
        });
      });
    });
  }

  // =========================================================
  // 5. Загружаем WTCH
  // =========================================================

  function loadWTCH() {
    if (window.lampa_wtch_unified_loaded) return;

    window.lampa_wtch_unified_loaded = true;

    // ВАЖНО:
    // http://wtch.ch/m — это уже сам JS.
    // Не добавляем /online.js
    // Не добавляем /m/online.js
    var scripts = [
      SCRIPT_URL
    ];

    // Предпочтительный способ для Lampa
    if (
      window.Lampa &&
      window.Lampa.Utils &&
      typeof window.Lampa.Utils.putScriptAsync === 'function'
    ) {
      var result = safe(function () {

        Lampa.Utils.putScriptAsync(
          scripts,
          function () {
            window.lampa_wtch_unified_ready = true;
          }
        );

        return true;
      });

      if (result) return;
    }

    // Резервная загрузка обычным <script>
    var index = 0;

    function next() {

      if (index >= scripts.length) {
        window.lampa_wtch_unified_ready = true;
        return;
      }

      var script = document.createElement('script');

      script.async = true;
      script.src = scripts[index++];

      script.onload = next;
      script.onerror = next;

      (
        document.head ||
        document.documentElement
      ).appendChild(script);
    }

    next();
  }

  // =========================================================
  // 6. Запуск плагина
  // =========================================================

  installShowyProGuards();
  loadWTCH();

  function start() {

    injectCSS();

    installUiCleaner();

    disableTorrentSetting();

    installPlayerSkin();

    installSourceSkin();

    installSourceFilterShortcut();

    installSourceQuickBar();
  }

  // =========================================================
  // 7. Ждём загрузки Lampa
  // =========================================================

  if (window.appready) {

    start();

  } else {

    safe(function () {

      if (
        window.Lampa &&
        window.Lampa.Listener
      ) {

        Lampa.Listener.follow(
          'app',
          function (event) {

            if (event.type === 'ready') {
              start();
            }

          }
        );

      }

    });

  }

  // =========================================================
  // 8. Информация о плагине
  // =========================================================

  window.lampa_wtch_unified = {

    version: VERSION,

    script: SCRIPT_URL,

    trailers: false,

    shots: false,

    torrents: false,

    player_skin: true,

    source_ui_skin: true,

    source_filter_shortcut: true,

    source_quickbar: true

  };

})();