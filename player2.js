(function () {
  'use strict';

  if (window.lampa_wtch_unified_v3) return;
  window.lampa_wtch_unified_v3 = true;

  var VERSION = '3.0.0';

  // =========================================================
  // WTCH loader
  // =========================================================

  // Это именно:
  // http://wtch.ch/m
  //
  // Сам /m уже загружает:
  // http://wtch.ch/online.js
  //
  // Ничего к URL не добавляем.
  var WTCH_SCRIPT = 'http://wtch.ch/m';

  // =========================================================
  // Safe
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
  // Ничего из DOM здесь не удаляем.
  // Только скрываем ненужные элементы.
  // =========================================================

  function injectCSS() {

    if (document.getElementById('lampa_wtch_hide_css_v3')) {
      return;
    }

    var style = document.createElement('style');

    style.id = 'lampa_wtch_hide_css_v3';

    style.innerHTML = `
      /* =====================================================
         SHOWY PRO
         ===================================================== */

      .showy-pro-entry-banner,
      .showy-pro-entry-banner__content {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }


      /* =====================================================
         TRAILERS
         ===================================================== */

      .view--trailer,
      [data-action="trailer"] {
        display: none !important;
      }


      /* =====================================================
         SHOTS / SHORTS
         ===================================================== */

      .shots-view-button,
      .view--shots,
      .shots-view,
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

    (
      document.head ||
      document.documentElement
    ).appendChild(style);
  }

  // =========================================================
  // Дополнительное отключение torrents
  // Оставляем как было в исходном коде.
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
  // Загрузка WTCH
  // =========================================================

  function loadWTCH() {

    if (window.lampa_wtch_unified_loaded_v3) {
      return;
    }

    window.lampa_wtch_unified_loaded_v3 = true;

    // -------------------------------------------------------
    // Основной способ Lampa
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

            window.lampa_wtch_unified_ready_v3 = true;

          }
        );

        return true;

      });

      if (loaded) {
        return;
      }
    }

    // -------------------------------------------------------
    // Резервный способ
    // -------------------------------------------------------

    var script = document.createElement('script');

    script.async = true;
    script.src = WTCH_SCRIPT;

    script.onload = function () {
      window.lampa_wtch_unified_ready_v3 = true;
    };

    script.onerror = function () {
      window.lampa_wtch_unified_ready_v3 = false;
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

    // Сначала ставим CSS,
    // чтобы Showy PRO сразу был скрыт.
    injectCSS();

    // Оставляем оригинальную настройку.
    disableTorrentSetting();

    // Затем запускаем WTCH.
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
  // Информация
  // =========================================================

  window.lampa_wtch_unified = {

    version: VERSION,

    loader:
      'http://wtch.ch/m',

    online:
      'http://wtch.ch/online.js',

    showyProBanner:
      false,

    trailers:
      false,

    shots:
      false,

    torrents:
      false
  };

})();