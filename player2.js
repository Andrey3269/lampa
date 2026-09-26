(function () {
  'use strict';

  // =========================================================
  // Защита от повторной загрузки
  // =========================================================

  if (window.lampa_wtch_unified_v2) return;
  window.lampa_wtch_unified_v2 = true;

  var VERSION = '2.0.0';

  // ВАЖНО:
  // Это именно загрузчик WTCH.
  // Он сам внутри подключает:
  // http://wtch.ch/online.js
  //
  // Ничего к /m не добавляем.
  var WTCH_SCRIPT = 'http://wtch.ch/m';

  // =========================================================
  // Безопасный запуск
  // =========================================================

  function safe(fn) {
    try {
      return fn();
    } catch (e) {
      return null;
    }
  }

  // =========================================================
  // 1. CSS-фильтры
  // =========================================================

  function injectCSS() {
    if (document.getElementById('lampa_wtch_hide_css_v2')) return;

    var style = document.createElement('style');

    style.id = 'lampa_wtch_hide_css_v2';
    style.type = 'text/css';

    style.innerHTML = [

      // -----------------------------------------------------
      // Showy PRO banner
      // -----------------------------------------------------

      '.showy-pro-entry-banner,',
      '.showy-pro-entry-banner__content,',
      '.showy-pro-entry-banner__meta,',
      '.showy-pro-entry-banner__tag,',
      '.showy-pro-entry-banner__title,',
      '.showy-pro-entry-banner__benefit,',
      '.showy-pro-entry-banner__compare,',
      '.showy-pro-entry-banner__chip,',
      '.showy-pro-entry-banner__arrow,',
      '.showy-pro-entry-banner__mobile-link,',
      '.showy-pro-entry-banner__qr-wrap,',
      '.showy-pro-entry-banner__qr {',
      '  display: none !important;',
      '}',

      // -----------------------------------------------------
      // Trailers
      // -----------------------------------------------------

      '.view--trailer,',
      '[data-action="trailer"],',

      // -----------------------------------------------------
      // Shorts / Shots
      // -----------------------------------------------------

      '.shots-view-button,',
      '.view--shots,',
      '.shots-view,',
      '[data-action="shots"],',
      '[data-action="shorts"],',

      // -----------------------------------------------------
      // Torrents
      // -----------------------------------------------------

      '.view--torrent,',
      '.view--torrents,',
      '.torrent-view,',
      '.torrent-view-button,',
      '.torrent-button,',
      '[data-action="torrent"],',
      '[data-action="torrents"],',
      '[data-type="torrent"],',
      '[data-type="torrents"],',
      '.button--torrent,',

      '.full-start__button[data-subtitle*="торрент"],',
      '.full-start__button[data-subtitle*="Torrent"] {',
      '  display: none !important;',
      '}'

    ].join('\n');

    document.head.appendChild(style);
  }

  // =========================================================
  // 2. Список элементов для удаления
  // =========================================================

  function removeUnwantedUI(root) {
    var scope = root || document;

    var selectors = [

      // -----------------------------------------------------
      // Showy PRO
      // -----------------------------------------------------

      '.showy-pro-entry-banner',

      '.showy-pro-entry-banner__content',
      '.showy-pro-entry-banner__meta',
      '.showy-pro-entry-banner__tag',
      '.showy-pro-entry-banner__title',
      '.showy-pro-entry-banner__benefit',
      '.showy-pro-entry-banner__compare',
      '.showy-pro-entry-banner__chip',
      '.showy-pro-entry-banner__arrow',
      '.showy-pro-entry-banner__mobile-link',
      '.showy-pro-entry-banner__qr-wrap',

      // -----------------------------------------------------
      // Trailers
      // -----------------------------------------------------

      '.view--trailer',
      '[data-action="trailer"]',

      // -----------------------------------------------------
      // Shorts / Shots
      // -----------------------------------------------------

      '.shots-view-button',
      '.view--shots',
      '.shots-view',
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

      '[data-action="torrent"]',
      '[data-action="torrents"]',

      '[data-type="torrent"]',
      '[data-type="torrents"]',

      '.button--torrent',

      '.full-start__button[data-subtitle*="торрент"]',
      '.full-start__button[data-subtitle*="Torrent"]'
    ];

    safe(function () {
      for (var i = 0; i < selectors.length; i++) {

        var nodes = scope.querySelectorAll(selectors[i]);

        for (var j = 0; j < nodes.length; j++) {
          try {
            nodes[j].remove();
          } catch (e) {}
        }
      }
    });

    // =======================================================
    // Дополнительное удаление кнопок торрентами по тексту
    // =======================================================

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
          text === 'torrent' ||
          text === 'torrents'
        ) {
          buttons[i].remove();
        }
      }

    });
  }

  // =========================================================
  // 3. Отдельная очистка Showy PRO
  // =========================================================

  function removeShowyProBanner() {

    safe(function () {

      var banners = document.querySelectorAll(
        '.showy-pro-entry-banner'
      );

      for (var i = 0; i < banners.length; i++) {

        try {
          banners[i].remove();
        } catch (e) {}

      }

    });
  }

  // =========================================================
  // 4. Отключение torrents
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
  // 5. Очистка UI Lampa
  // =========================================================

  function installUiCleaner() {

    if (window.lampa_wtch_ui_cleaner_v2) return;

    window.lampa_wtch_ui_cleaner_v2 = true;

    // -------------------------------------------------------
    // События Lampa
    // -------------------------------------------------------

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

                var root = document;

                safe(function () {

                  if (
                    event.object &&
                    event.object.activity &&
                    typeof event.object.activity.render === 'function'
                  ) {

                    root =
                      event.object.activity.render();
                  }

                });

                removeUnwantedUI(root);
                removeShowyProBanner();

              }, 20);

              setTimeout(function () {

                removeUnwantedUI(document);
                removeShowyProBanner();

              }, 150);

              setTimeout(function () {

                removeUnwantedUI(document);
                removeShowyProBanner();

              }, 500);
            }

          }
        );

      }

    });

    // -------------------------------------------------------
    // MutationObserver
    // -------------------------------------------------------

    if (
      window.MutationObserver &&
      !window.lampa_wtch_unified_observer_v2
    ) {

      var observer =
        new MutationObserver(
          function () {

            removeUnwantedUI(document);
            removeShowyProBanner();

          }
        );

      window.lampa_wtch_unified_observer_v2 =
        observer;

      safe(function () {

        observer.observe(
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
  // 6. Загрузка WTCH
  // =========================================================

  function loadWTCH() {

    if (window.lampa_wtch_loaded_v2) return;

    window.lampa_wtch_loaded_v2 = true;

    // -------------------------------------------------------
    // Основной способ через Lampa
    // -------------------------------------------------------

    if (
      window.Lampa &&
      window.Lampa.Utils &&
      typeof window.Lampa.Utils.putScriptAsync === 'function'
    ) {

      var loaded = safe(function () {

        Lampa.Utils.putScriptAsync(
          [WTCH_SCRIPT],
          function () {

            window.lampa_wtch_ready_v2 = true;

            // WTCH может создать баннер сразу
            setTimeout(function () {
              removeUnwantedUI(document);
              removeShowyProBanner();
            }, 0);

            setTimeout(function () {
              removeUnwantedUI(document);
              removeShowyProBanner();
            }, 300);

          }
        );

        return true;

      });

      if (loaded) return;
    }

    // -------------------------------------------------------
    // Резервная загрузка через <script>
    // -------------------------------------------------------

    var script =
      document.createElement('script');

    script.async = true;
    script.src = WTCH_SCRIPT;

    script.onload = function () {

      window.lampa_wtch_ready_v2 = true;

      setTimeout(function () {
        removeUnwantedUI(document);
        removeShowyProBanner();
      }, 0);

      setTimeout(function () {
        removeUnwantedUI(document);
        removeShowyProBanner();
      }, 300);

    };

    script.onerror = function () {

      window.lampa_wtch_ready_v2 = false;

    };

    (
      document.head ||
      document.documentElement
    ).appendChild(script);
  }

  // =========================================================
  // 7. Повторная очистка несколько раз после запуска
  // =========================================================

  function startCleanupLoop() {

    var delays = [
      0,
      100,
      300,
      700,
      1500,
      3000,
      5000
    ];

    for (var i = 0; i < delays.length; i++) {

      (function (delay) {

        setTimeout(function () {

          removeUnwantedUI(document);
          removeShowyProBanner();

        }, delay);

      })(delays[i]);

    }

  }

  // =========================================================
  // 8. Основной запуск
  // =========================================================

  function start() {

    // Сначала CSS,
    // чтобы Showy PRO не успел нормально отобразиться.
    injectCSS();

    // Затем очистка интерфейса.
    installUiCleaner();

    // Отключаем torrents.
    disableTorrentSetting();

    // Загружаем WTCH.
    loadWTCH();

    // Дополнительная очистка после загрузки.
    startCleanupLoop();
  }

  // =========================================================
  // 9. Ожидание Lampa
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

    // Резервный запуск,
    // если событие ready уже было пропущено.

    setTimeout(function () {

      if (!window.lampa_wtch_started_v2) {

        window.lampa_wtch_started_v2 = true;

        start();

      }

    }, 1500);

  }

  // =========================================================
  // 10. Информация о плагине
  // =========================================================

  window.lampa_wtch_unified = {

    version: VERSION,

    wtchLoader: WTCH_SCRIPT,

    wtchOnline:
      'http://wtch.ch/online.js',

    showyProBanner: false,

    trailers: false,

    shots: false,

    torrents: false

  };

})();