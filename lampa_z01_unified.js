(function () {
  'use strict';

  if (window.lampa_z01_unified_v1) return;
  window.lampa_z01_unified_v1 = true;

  var VERSION = '1.1.3';
  var HOST = 'http://z01.online/';

  function safe(fn) {
    try { return fn(); } catch (e) { return null; }
  }

  // 1. Блокируем отображение через CSS
  function injectCSS() {
    if (document.getElementById('lampa_z01_hide_css')) return;
    var style = document.createElement('style');
    style.id = 'lampa_z01_hide_css';
    style.innerHTML = `
      /* Торренты и Трейлеры */
      .view--trailer, [data-action="trailer"],
      .shots-view-button, .view--shots, .shots-view, [data-action="shots"], [data-action="shorts"],
      .view--torrent, .view--torrents, .torrent-view, .torrent-view-button, .torrent-button,
      [data-action="torrent"], [data-action="torrents"], [data-type="torrent"], [data-type="torrents"],
      .button--torrent,
      .full-start__button[data-subtitle*="торрент"], .full-start__button[data-subtitle*="Torrent"],
      /* Реклама, прероллы, подписки и баннеры CUB */
      .cub-box, .notice--cub, .cub-premium, .ad-server, .button--subscribe,
      .black-friday__button, .womens_day__button, .christmas__button,
      .ad-preroll, .ad-preroll__bg {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  // 2. Физически удаляем мусор из DOM
  function removeUnwantedUI(root) {
    var scope = root || document;

    var selectors = [
      '.view--trailer', '[data-action="trailer"]',
      '.shots-view-button', '.view--shots', '.shots-view', '[data-action="shots"]', '[data-action="shorts"]',
      '.view--torrent', '.view--torrents', '.torrent-view', '.torrent-view-button', '.torrent-button',
      '[data-action="torrent"]', '[data-action="torrents"]', '[data-type="torrent"]', '[data-type="torrents"]',
      '.button--torrent', '.full-start__button[data-subtitle*="торрент"]', '.full-start__button[data-subtitle*="Torrent"]',
      '.ad-server', '.button--subscribe', '.ad-preroll', '.ad-preroll__bg'
    ];

    // Удаление по классам
    safe(function() {
      selectors.forEach(function (selector) {
         var nodes = scope.querySelectorAll(selector);
         for (var i = 0; i < nodes.length; i++) {
             nodes[i].remove();
         }
      });
    });

    // Умное удаление по тексту (Торренты + CUB Premium)
    safe(function () {
      var elements = scope.querySelectorAll('.full-start__button, .selector, .settings-folder, .notice');
      for (var i = 0; i < elements.length; i++) {
        var text = (elements[i].textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();

        if (text === 'торренты' || text === 'torrents' || text === 'torrent') {
          elements[i].remove();
        }

        if (text.indexOf('cub premium') !== -1 || text.indexOf('cub премиум') !== -1) {
          elements[i].remove();
        }
      }
    });
  }

  // 3. Отключаем торренты в настройках самой Лампы
  function disableTorrentSetting() {
    safe(function () {
      if (window.lampa_settings) window.lampa_settings.torrents_use = false;
    });
    safe(function () {
      if (window.Lampa && window.Lampa.SettingsApi && typeof window.Lampa.SettingsApi.addParam === 'function') {
        if (window.lampa_settings) window.lampa_settings.torrents_use = false;
      }
    });
  }

  // 4. Следим за интерфейсом и чистим его при перерисовке
  function installUiCleaner() {
    if (window.lampa_z01_unified_ui_cleaner) return;
    window.lampa_z01_unified_ui_cleaner = true;

    safe(function() {
        if (window.Lampa && window.Lampa.Listener) {
          Lampa.Listener.follow('full', function (e) {
            if (e.type === 'complite' || e.type === 'complete') {
              setTimeout(function () {
                removeUnwantedUI(e.object && e.object.activity ? e.object.activity.render() : document);
              }, 50);
            }
          });
        }
    });

    if (window.MutationObserver && !window.lampa_z01_unified_observer) {
      window.lampa_z01_unified_observer = new MutationObserver(function () {
        removeUnwantedUI(document);
      });
      safe(function() {
        window.lampa_z01_unified_observer.observe(document.documentElement, { childList: true, subtree: true });
      });
    }
  }

  // 5. Загружаем основной балансер
  function loadZ01() {
    if (window.lampa_z01_unified_loaded) return;
    window.lampa_z01_unified_loaded = true;

    var scripts = [HOST + 'online.js', HOST + 'lampac-src-filter.js'];

    if (window.Lampa && window.Lampa.Utils && typeof window.Lampa.Utils.putScriptAsync === 'function') {
      var res = safe(function () {
        Lampa.Utils.putScriptAsync(scripts, function () { window.lampa_z01_unified_ready = true; });
        return true;
      });
      if (res) return;
    }

    var index = 0;
    function next() {
      if (index >= scripts.length) {
        window.lampa_z01_unified_ready = true;
        return;
      }
      var script = document.createElement('script');
      script.async = true;
      script.src = scripts[index++];
      script.onload = next;
      script.onerror = next;
      (document.head || document.documentElement).appendChild(script);
    }
    next();
  }

  // Запуск
  function start() {
    injectCSS();
    installUiCleaner();
    loadZ01();
    disableTorrentSetting();

    // Дополнительная зачистка при старте приложения (для стартовых уведомлений и прероллов CUB)
    setTimeout(function() { removeUnwantedUI(document); }, 500);
    setTimeout(function() { removeUnwantedUI(document); }, 2000);
  }

  if (window.appready) {
    start();
  } else {
    safe(function() {
        if (window.Lampa && window.Lampa.Listener) {
          Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') start();
          });
        }
    });
  }

  window.lampa_z01_unified = {
    version: VERSION,
    online: HOST + 'online.js',
    sourceFilter: HOST + 'lampac-src-filter.js',
    trailers: false,
    shots: false,
    torrents: false,
    cubAds: false
  };
})();