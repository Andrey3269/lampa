(function () {
  'use strict';

  if (window.lampa_wtch_unified_v5) return;
  window.lampa_wtch_unified_v5 = true;

  var VERSION = '5.0.0';

  // http://wtch.ch/m — это загрузчик WTCH.
  // Сам /m подключает http://wtch.ch/online.js
  var SCRIPT_URL = 'http://wtch.ch/m';

  function safe(fn) {
    try {
      return fn();
    } catch (e) {
      return null;
    }
  }

  // =========================================================
  // 1. CSS
  // =========================================================

  function injectCSS() {
    if (document.getElementById('lampa_wtch_hide_css_v5')) return;

    var style = document.createElement('style');

    style.id = 'lampa_wtch_hide_css_v5';

    style.innerHTML = `
      /* =====================================================
         SHOWY PRO
         ===================================================== */

      .showy-pro-entry-banner {
        display: block !important;
        visibility: hidden !important;
        opacity: 0 !important;

        height: 12px !important;
        min-height: 12px !important;
        max-height: 12px !important;

        margin: 0 0 8px 0 !important;
        padding: 0 !important;

        overflow: hidden !important;
        pointer-events: none !important;
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
         TRAILERS / YOUTUBE
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
  // 2. Удаляем ненужные элементы
  // =========================================================

  function removeUnwantedUI(root) {
    var scope = root || document;

    var selectors = [

      // -----------------------------------------------------
      // Trailers
      // -----------------------------------------------------

      '.view--trailer',
      '[data-action="trailer"]',
      '.trailer-view',
      '.trailer-button',
      '.button--trailer',

      '[data-action="youtube"]',
      '[data-type="trailer"]',
      '[data-type="youtube"]',

      // -----------------------------------------------------
      // Shorts / Shots
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

      '[data-action="torrent"]',
      '[data-action="torrents"]',

      '[data-type="torrent"]',
      '[data-type="torrents"]',

      '.button--torrent',

      '.full-start__button[data-subtitle*="торрент"]',
      '.full-start__button[data-subtitle*="Torrent"]'
    ];

    // -------------------------------------------------------
    // Удаление по классам / атрибутам
    // -------------------------------------------------------

    safe(function () {

      for (var i = 0; i < selectors.length; i++) {

        var nodes =
          scope.querySelectorAll(selectors[i]);

        for (var j = 0; j < nodes.length; j++) {

          try {
            nodes[j].remove();
          } catch (e) {}

        }
      }

    });

    // -------------------------------------------------------
    // Удаление торрент-кнопок по тексту
    // -------------------------------------------------------

    safe(function () {

      var buttons =
        scope.querySelectorAll(
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

    // -------------------------------------------------------
    // Дополнительная очистка трейлеров / Shorts / YouTube
    //
    // Lampa иногда использует другие классы.
    // Поэтому проверяем только full-start кнопки.
    // -------------------------------------------------------

    safe(function () {

      var buttons =
        scope.querySelectorAll(
          '.full-start__button'
        );

      for (var i = 0; i < buttons.length; i++) {

        var button = buttons[i];

        // WTCH-кнопку не трогаем
        if (
          button.classList &&
          button.classList.contains(
            'wtch--button'
          )
        ) {
          continue;
        }

        var text =
          (button.textContent || '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();

        var subtitle =
          (
            button.getAttribute(
              'data-subtitle'
            ) || ''
          ).toLowerCase();

        var value =
          text + ' ' + subtitle;

        if (
          value.indexOf('трейлер') !== -1 ||
          value.indexOf('trailer') !== -1 ||

          value.indexOf('youtube') !== -1 ||

          value.indexOf('shorts') !== -1 ||
          value.indexOf('шорт') !== -1 ||

          value.indexOf('клип') !== -1 ||
          value.indexOf('clips') !== -1
        ) {

          try {
            button.remove();
          } catch (e) {}

        }
      }

    });
  }

  // =========================================================
  // 3. Выключаем torrents
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
        typeof window.Lampa.SettingsApi.addParam ===
          'function'
      ) {

        if (window.lampa_settings) {
          window.lampa_settings.torrents_use = false;
        }

      }

    });
  }

  // =========================================================
  // 4. Запускаем WTCH через его штатный launcher
  // =========================================================

  function launchWTCH(movie) {

    if (!movie || !window.Lampa) {
      return false;
    }

    var plugins = safe(function () {

      return (
        Lampa.Manifest &&
        Lampa.Manifest.plugins
      );

    });

    /*
     * online.js публикует именно этот launcher:
     *
     * Lampa.Manifest.plugins.onContextLauch(...)
     *
     * Используем его напрямую, чтобы кнопка
     * "Смотреть" открывала тот же WTCH-компонент.
     */

    if (
      plugins &&
      plugins.component === 'wtch' &&
      typeof plugins.onContextLauch ===
        'function'
    ) {

      safe(function () {
        plugins.onContextLauch(movie);
      });

      return true;
    }

    return false;
  }

  // =========================================================
  // 5. Ищем кнопку "Смотреть"
  // =========================================================

  function findWatchButton(root) {

    var scope =
      root || document;

    var button = null;

    // Штатные варианты
    var selectors = [
      '.view--play',
      '.view--watch',
      '[data-action="play"]',
      '[data-action="watch"]'
    ];

    for (var i = 0; i < selectors.length; i++) {

      button = safe(function () {
        return scope.querySelector(
          selectors[i]
        );
      });

      if (
        button &&
        !(
          button.classList &&
          button.classList.contains(
            'wtch--button'
          )
        )
      ) {
        return button;
      }
    }

    // Дополнительно ищем по названию
    var buttons = safe(function () {

      return scope.querySelectorAll(
        '.full-start__button'
      );

    });

    if (!buttons) {
      return null;
    }

    for (var j = 0; j < buttons.length; j++) {

      var item = buttons[j];

      if (
        item.classList &&
        item.classList.contains(
          'wtch--button'
        )
      ) {
        continue;
      }

      var text =
        (item.textContent || '')
          .replace(/\s+/g, ' ')
          .trim()
          .toLowerCase();

      if (
        text === 'смотреть' ||
        text === 'смотреть онлайн' ||
        text === 'watch' ||
        text === 'watch online'
      ) {

        return item;

      }
    }

    return null;
  }

  // =========================================================
  // 6. Автозапуск WTCH по "Смотреть"
  // =========================================================

  function installWatchAutostart(
    root,
    movie
  ) {

    if (!root || !movie) {
      return;
    }

    var button =
      findWatchButton(root);

    if (!button) {
      return;
    }

    if (
      button.getAttribute(
        'data-wtch-autostart'
      ) === '1'
    ) {
      return;
    }

    button.setAttribute(
      'data-wtch-autostart',
      '1'
    );

    $(button).on(
      'hover:enter.wtch_autostart',
      function (event) {

        // Не даём штатной кнопке открыть
        // другой плеер.
        safe(function () {

          if (
            event &&
            event.preventDefault
          ) {
            event.preventDefault();
          }

        });

        safe(function () {

          if (
            event &&
            event.stopImmediatePropagation
          ) {
            event.stopImmediatePropagation();
          }

        });

        safe(function () {

          if (
            event &&
            event.stopPropagation
          ) {
            event.stopPropagation();
          }

        });

        // ---------------------------------------------------
        // WTCH уже готов
        // ---------------------------------------------------

        if (
          launchWTCH(movie)
        ) {
          return;
        }

        // ---------------------------------------------------
        // WTCH ещё догружается
        // ---------------------------------------------------

        var tries = 0;

        var timer =
          setInterval(function () {

            tries++;

            if (
              launchWTCH(movie)
            ) {

              clearInterval(timer);

              return;
            }

            if (tries >= 20) {
              clearInterval(timer);
            }

          }, 150);

      }
    );
  }

  // =========================================================
  // 7. Следим за full Lampa
  // =========================================================

  function installUiCleaner() {

    if (
      window.lampa_wtch_ui_cleaner_v5
    ) {
      return;
    }

    window.lampa_wtch_ui_cleaner_v5 =
      true;

    safe(function () {

      if (
        window.Lampa &&
        window.Lampa.Listener
      ) {

        Lampa.Listener.follow(
          'full',
          function (e) {

            if (
              e.type !== 'complite' &&
              e.type !== 'complete'
            ) {
              return;
            }

            var activity =
              e.object &&
              e.object.activity
                ? e.object.activity
                : null;

            var root =
              activity &&
              typeof activity.render ===
                'function'
                ? activity.render()
                : document;

            var movie =
              e.data &&
              e.data.movie
                ? e.data.movie
                : (
                    activity &&
                    activity.card
                      ? activity.card
                      : null
                  );

            // Старое удаление UI
            setTimeout(function () {

              removeUnwantedUI(root);

            }, 50);

            // Повторно после дорисовки
            setTimeout(function () {

              removeUnwantedUI(root);

            }, 250);

            setTimeout(function () {

              removeUnwantedUI(root);

            }, 700);

            // Автозапуск "Смотреть"
            setTimeout(function () {

              installWatchAutostart(
                root,
                movie
              );

            }, 100);

            setTimeout(function () {

              installWatchAutostart(
                root,
                movie
              );

            }, 500);

            setTimeout(function () {

              installWatchAutostart(
                root,
                movie
              );

            }, 1200);

          }
        );

      }

    });
  }

  // =========================================================
  // 8. Загружаем WTCH
  // =========================================================

  function loadWTCH() {

    if (
      window.lampa_wtch_unified_loaded_v5
    ) {
      return;
    }

    window.lampa_wtch_unified_loaded_v5 =
      true;

    var scripts = [
      SCRIPT_URL
    ];

    // -------------------------------------------------------
    // Штатная загрузка Lampa
    // -------------------------------------------------------

    if (
      window.Lampa &&
      window.Lampa.Utils &&
      typeof window.Lampa.Utils.putScriptAsync ===
        'function'
    ) {

      var result = safe(function () {

        Lampa.Utils.putScriptAsync(
          scripts,
          function () {

            window.lampa_wtch_unified_ready_v5 =
              true;

          }
        );

        return true;

      });

      if (result) {
        return;
      }
    }

    // -------------------------------------------------------
    // Fallback
    // -------------------------------------------------------

    var index = 0;

    function next() {

      if (
        index >= scripts.length
      ) {

        window.lampa_wtch_unified_ready_v5 =
          true;

        return;
      }

      var script =
        document.createElement(
          'script'
        );

      script.async = true;

      script.src =
        scripts[index++];

      script.onload =
        next;

      script.onerror =
        next;

      (
        document.head ||
        document.documentElement
      ).appendChild(script);
    }

    next();
  }

  // =========================================================
  // 9. Запуск
  // =========================================================

  function start() {

    injectCSS();

    installUiCleaner();

    disableTorrentSetting();

    loadWTCH();
  }

  // =========================================================
  // 10. Ждём готовности Lampa
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

            if (
              event.type === 'ready'
            ) {

              start();

            }

          }
        );

      }

    });

  }

  // =========================================================
  // Public API
  // =========================================================

  window.lampa_wtch_unified = {

    version:
      VERSION,

    script:
      'http://wtch.ch/m',

    online:
      'http://wtch.ch/online.js',

    showyPro:
      false,

    trailers:
      false,

    youtubeTrailers:
      false,

    shorts:
      false,

    torrents:
      false,

    watchAutostart:
      true

  };

})();