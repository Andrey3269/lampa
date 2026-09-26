(function () {
  'use strict';

  // =========================================================
  // Защита от повторной загрузки
  // =========================================================

  if (window.lampa_wtch_unified_v4) return;
  window.lampa_wtch_unified_v4 = true;

  var VERSION = '4.0.0';

  // http://wtch.ch/m — это загрузчик WTCH
  // Он сам подключает http://wtch.ch/online.js
  var SCRIPT_URL = 'http://wtch.ch/m';

  // =========================================================
  // Безопасный вызов
  // =========================================================

  function safe(fn) {
    try {
      return fn();
    } catch (e) {
      return null;
    }
  }

  // =========================================================
  // CSS
  // =========================================================

  function injectCSS() {

    if (document.getElementById('lampa_wtch_hide_css_v4')) {
      return;
    }

    var style = document.createElement('style');

    style.id = 'lampa_wtch_hide_css_v4';

    style.innerHTML = `
      /* =====================================================
         SHOWY PRO
         ===================================================== */

      /*
       * Сам рекламный блок оставляем как маленький spacer,
       * чтобы найденные фильмы не залезали на кнопки/контент.
       */

      .showy-pro-entry-banner {
        display: block !important;
        visibility: hidden !important;
        height: 12px !important;
        min-height: 12px !important;
        max-height: 12px !important;
        margin: 0 0 8px 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
        pointer-events: none !important;
        opacity: 0 !important;
      }

      .showy-pro-entry-banner__content,
      .showy-pro-entry-banner__meta,
      .showy-pro-entry-banner__tag,
      .showy-pro-entry-banner__title,
      .showy-pro-entry-banner__benefit,
      .showy-pro-entry-banner__compare,
      .showy-pro-entry-banner__chip,
      .showy-pro-entry-banner__arrow,
      .showy-pro-entry-banner__mobile-link,
      .showy-pro-entry-banner__qr-wrap,
      .showy-pro-entry-banner__qr {
        display: none !important;
        visibility: hidden !important;
      }


      /* =====================================================
         TRAILERS
         ===================================================== */

      .view--trailer,
      .trailer-view,
      .trailer-button,
      .button--trailer,
      [data-action="trailer"],
      [data-action="youtube"],
      [data-type="trailer"],
      [data-type="youtube"] {
        display: none !important;
      }


      /* =====================================================
         SHORTS / SHOTS
         ===================================================== */

      .shots-view-button,
      .view--shots,
      .shots-view,
      .shorts-view,
      .short-view,
      [data-action="shots"],
      [data-action="shorts"] {
        display: none !important;
      }


      /* =====================================================
         TORRENTS
         ===================================================== */

      .view--torrent,
      .view--torrents,
      .torrent-view,
      .torrent-view-button,
      .torrent-button,
      .button--torrent,
      [data-action="torrent"],
      [data-action="torrents"],
      [data-type="torrent"],
      [data-type="torrents"],
      .full-start__button[data-subtitle*="торрент"],
      .full-start__button[data-subtitle*="Torrent"] {
        display: none !important;
      }
    `;

    (
      document.head ||
      document.documentElement
    ).appendChild(style);
  }

  // =========================================================
  // Удаление ненужных элементов
  //
  // ВАЖНО:
  // Здесь НЕТ MutationObserver.
  // Очистка выполняется только при открытии full-страницы.
  // =========================================================

  function removeUnwantedUI(root) {

    var scope = root || document;

    var selectors = [

      // -----------------------------------------------------
      // Showy PRO
      // -----------------------------------------------------

      '.showy-pro-entry-banner',

      // -----------------------------------------------------
      // YouTube / trailers
      // -----------------------------------------------------

      '.view--trailer',
      '.trailer-view',
      '.trailer-button',
      '.button--trailer',
      '[data-action="trailer"]',
      '[data-action="youtube"]',
      '[data-type="trailer"]',
      '[data-type="youtube"]',

      // -----------------------------------------------------
      // Shorts / shots
      // -----------------------------------------------------

      '.shots-view-button',
      '.view--shots',
      '.shots-view',
      '.shorts-view',
      '.short-view',
      '[data-action="shots"]',
      '[data-action="shorts"]',

      // -----------------------------------------------------
      // Torrents
      // -----------------------------------------------------

      '.view--torrent',
      '.view--torrents',
      '.torrent-view',
      '.torrent-view-button',
      '.torrent-button',
      '.button--torrent',

      '[data-action="torrent"]',
      '[data-action="torrents"]',

      '[data-type="torrent"]',
      '[data-type="torrents"]',

      '.full-start__button[data-subtitle*="торрент"]',
      '.full-start__button[data-subtitle*="Torrent"]'
    ];

    safe(function () {

      for (var i = 0; i < selectors.length; i++) {

        var nodes = scope.querySelectorAll(
          selectors[i]
        );

        for (var j = 0; j < nodes.length; j++) {

          try {
            nodes[j].remove();
          } catch (e) {}

        }
      }

    });

    // -------------------------------------------------------
    // Старый smart-фильтр торрент-кнопок
    // -------------------------------------------------------

    safe(function () {

      var buttons = scope.querySelectorAll(
        '.full-start__button, .selector'
      );

      for (var i = 0; i < buttons.length; i++) {

        var text =
          (buttons[i].textContent || '')
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
  // Отключение torrents
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
  // Поиск кнопки WTCH
  // =========================================================

  function findWTCHButton(root) {

    var scope = root || document;

    var selectors = [
      '.wtch--button',
      '.view--online',
      '[data-subtitle*="WTCH"]',
      '[data-subtitle*="wtch"]'
    ];

    for (var i = 0; i < selectors.length; i++) {

      var button =
        scope.querySelector(selectors[i]);

      if (button) {
        return button;
      }
    }

    return null;
  }

  // =========================================================
  // Автозапуск WTCH через кнопку "Смотреть"
  // =========================================================

  function installWatchAutostart(activity, movie) {

    var root =
      activity &&
      typeof activity.render === 'function'
        ? activity.render()
        : document;

    if (!root) return;

    var watchSelectors = [
      '.view--play',
      '.view--watch',
      '[data-action="play"]',
      '[data-action="watch"]',
      '.full-start__button[data-action="play"]',
      '.full-start__button[data-action="watch"]'
    ];

    var watchButton = null;

    for (var i = 0; i < watchSelectors.length; i++) {

      safe(function () {

        if (!watchButton) {
          watchButton =
            root.querySelector(
              watchSelectors[i]
            );
        }

      });

      if (watchButton) break;
    }

    if (!watchButton) return;

    if (watchButton.getAttribute(
      'data-wtch-autostart'
    ) === '1') {
      return;
    }

    watchButton.setAttribute(
      'data-wtch-autostart',
      '1'
    );

    $(watchButton).on(
      'hover:enter.wtch_autostart',
      function () {

        // Небольшая задержка, чтобы WTCH успел
        // создать свою кнопку/component.
        setTimeout(function () {

          var button =
            findWTCHButton(
              root
            );

          if (!button) {
            button =
              findWTCHButton(
                document
              );
          }

          if (!button) return;

          safe(function () {

            $(button).trigger(
              'hover:enter'
            );

          });

        }, 80);

      }
    );
  }

  // =========================================================
  // Следим только за Lampa full
  // =========================================================

  function installUiCleaner() {

    if (window.lampa_wtch_ui_cleaner_v4) {
      return;
    }

    window.lampa_wtch_ui_cleaner_v4 = true;

    safe(function () {

      if (
        window.Lampa &&
        window.Lampa.Listener
      ) {

        Lampa.Listener.follow(
          'full',
          function (event) {

            if (
              event.type === 'complite' ||
              event.type === 'complete'
            ) {

              setTimeout(function () {

                var activity =
                  event.object &&
                  event.object.activity
                    ? event.object.activity
                    : null;

                var root =
                  activity &&
                  typeof activity.render === 'function'
                    ? activity.render()
                    : document;

                removeUnwantedUI(root);

                /*
                 * Один раз после создания WTCH-кнопки
                 * ставим автозапуск с "Смотреть".
                 */
                installWatchAutostart(
                  activity,
                  event.data &&
                  event.data.movie
                    ? event.data.movie
                    : null
                );

              }, 50);

            }

          }
        );

      }

    });
  }

  // =========================================================
  // Загрузка WTCH
  // =========================================================

  function loadWTCH() {

    if (window.lampa_wtch_loaded_v4) {
      return;
    }

    window.lampa_wtch_loaded_v4 = true;

    // -------------------------------------------------------
    // Lampa.Utils
    // -------------------------------------------------------

    if (
      window.Lampa &&
      window.Lampa.Utils &&
      typeof window.Lampa.Utils.putScriptAsync ===
        'function'
    ) {

      var loaded = safe(function () {

        Lampa.Utils.putScriptAsync(
          [SCRIPT_URL],
          function () {

            window.lampa_wtch_ready_v4 =
              true;

          }
        );

        return true;

      });

      if (loaded) {
        return;
      }
    }

    // -------------------------------------------------------
    // Fallback <script>
    // -------------------------------------------------------

    var script =
      document.createElement('script');

    script.async = true;
    script.src = SCRIPT_URL;

    script.onload = function () {

      window.lampa_wtch_ready_v4 =
        true;

    };

    script.onerror = function () {

      window.lampa_wtch_ready_v4 =
        false;

    };

    (
      document.head ||
      document.documentElement
    ).appendChild(script);
  }

  // =========================================================
  // Запуск
  // =========================================================

  function start() {

    injectCSS();

    installUiCleaner();

    disableTorrentSetting();

    loadWTCH();
  }

  // =========================================================
  // Ждём Lampa
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
  // Информация о плагине
  // =========================================================

  window.lampa_wtch_unified = {

    version: VERSION,

    script:
      'http://wtch.ch/m',

    online:
      'http://wtch.ch/online.js',

    showyPro:
      false,

    trailers:
      false,

    shorts:
      false,

    torrents:
      false,

    watchAutostart:
      true

  };

})();