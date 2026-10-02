(function () {
  'use strict';

  if (window.lampa_z01_unified_v1) return;
  window.lampa_z01_unified_v1 = true;

  var VERSION = '1.1.1';
  var HOST = 'http://prem.z01.online/';

  // Вспомогательная функция из вашего старого кода для безопасного выполнения
  function safe(fn) {
    try { return fn(); } catch (e) { return null; }
  }

  // 1. Блокируем отображение через CSS (расширенный список селекторов)
  function injectCSS() {
    if (document.getElementById('lampa_z01_hide_css')) return;
    var style = document.createElement('style');
    style.id = 'lampa_z01_hide_css';
    style.innerHTML = `
      .view--trailer, [data-action="trailer"],
      .shots-view-button, .view--shots, .shots-view, [data-action="shots"], [data-action="shorts"],
      .view--torrent, .view--torrents, .torrent-view, .torrent-view-button, .torrent-button,
      [data-action="torrent"], [data-action="torrents"], [data-type="torrent"], [data-type="torrents"],
      .button--torrent,
      .full-start__button[data-subtitle*="торрент"], .full-start__button[data-subtitle*="Torrent"] {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  // 2. Физически удаляем кнопки из кода (взято из вашего старого скрипта)
  function removeUnwantedUI(root) {
    var scope = root || document;

    var selectors = [
      '.view--trailer', '[data-action="trailer"]',
      '.shots-view-button', '.view--shots', '.shots-view', '[data-action="shots"]', '[data-action="shorts"]',
      '.view--torrent', '.view--torrents', '.torrent-view', '.torrent-view-button', '.torrent-button',
      '[data-action="torrent"]', '[data-action="torrents"]', '[data-type="torrent"]', '[data-type="torrents"]',
      '.button--torrent',
      '.full-start__button[data-subtitle*="торрент"]', '.full-start__button[data-subtitle*="Torrent"]'
    ];

    // Удаление по классам и атрибутам
    safe(function() {
      selectors.forEach(function (selector) {
         var nodes = scope.querySelectorAll(selector);
         for (var i = 0; i < nodes.length; i++) {
             nodes[i].remove();
         }
      });
    });

    // Умное удаление по тексту (на случай если классы нестандартные)
    safe(function () {
      var buttons = scope.querySelectorAll('.full-start__button, .selector');
      for (var i = 0; i < buttons.length; i++) {
        var text = (buttons[i].textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
        if (text === 'торренты' || text === 'torrents' || text === 'torrent') {
          buttons[i].remove();
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
    torrents: false
  };
})();

// ==============================================================
// Новый скин плеера (переработанный интерфейс проигрывателя)
// ==============================================================
(function () {
    'use strict';

    function startPlugin(){if(Lampa.Platform.screen('mobile')||Lampa.Manifest.app_digital>328)return;$('body').append("\n        <style>\n        .player-video__overlay{display:none;background:-webkit-gradient(linear,left top,left bottom,from(rgba(0,0,0,0.5)),color-stop(53%,rgba(0,0,0,0.3)),to(rgba(11,13,16,0.8)));background:-webkit-linear-gradient(top,rgba(0,0,0,0.5) 0,rgba(0,0,0,0.3) 53%,rgba(11,13,16,0.8) 100%);background:-moz-linear-gradient(top,rgba(0,0,0,0.5) 0,rgba(0,0,0,0.3) 53%,rgba(11,13,16,0.8) 100%);background:-o-linear-gradient(top,rgba(0,0,0,0.5) 0,rgba(0,0,0,0.3) 53%,rgba(11,13,16,0.8) 100%);background:linear-gradient(to bottom,rgba(0,0,0,0.5) 0,rgba(0,0,0,0.3) 53%,rgba(11,13,16,0.8) 100%);position:absolute;top:0;left:0;width:100%;height:100%}.player:not(.iptv) .player-panel,.player:not(.iptv) .player-info,.player:not(.iptv) .player-footer{background:transparent !important;-webkit-backdrop-filter:unset !important;backdrop-filter:unset !important}.player:not(.iptv) .player-panel__body,.player:not(.iptv) .player-info__body,.player:not(.iptv) .player-footer__body{padding:0}.player:not(.iptv) .player-footer__row{padding:0}.player:not(.iptv) .head-backward{display:none !important}.player:not(.iptv) .player-info__body{padding-left:0 !important;position:relative}.player:not(.iptv) .player-info__name{font-size:1.2em;text-shadow:0 0 .2em rgba(0,0,0,0.5)}.player:not(.iptv) .player-info__title{font-size:2.4em;font-weight:600;line-height:1.4;width:60%;text-shadow:0 0 .2em rgba(0,0,0,0.5);overflow:hidden;-o-text-overflow:'.';text-overflow:'.';display:-webkit-box;-webkit-line-clamp:2;line-clamp:2;-webkit-box-orient:vertical}.player:not(.iptv) .player-info__values{text-shadow:0 0 .2em rgba(0,0,0,0.5)}.player:not(.iptv) .player-info__values .value--name span{font-weight:600}.player:not(.iptv) .player-info__time{position:absolute;top:.8em;right:0}.player:not(.iptv) .player-panel .button{padding:.9em;width:3em;height:3em}.player:not(.iptv) .player-panel .button.animate-trigger-enter{-webkit-animation:animation-trigger-enter .2s forwards;-moz-animation:animation-trigger-enter .2s forwards;-o-animation:animation-trigger-enter .2s forwards;animation:animation-trigger-enter .2s forwards}.player:not(.iptv) .player-panel .button>svg{width:1.2em;height:1.2em}.player:not(.iptv) .player-panel .button+.button{margin-left:0}.player:not(.iptv) .player-panel__playpause{margin:0;padding:1em !important}.player:not(.iptv) .player-panel__playpause:not(.focus){background:rgba(255,255,255,0.1)}.player:not(.iptv) .player-panel__quality{-webkit-border-radius:5em !important;border-radius:5em !important;padding:0 1em !important}.player:not(.iptv) .player-panel__timeline{margin-bottom:1em}.player:not(.iptv) .player-panel__timeline:not(.focus) .player-panel__position>div::after{display:none}.player:not(.iptv) .player-panel__line-one{margin-bottom:1em;position:relative;z-index:2;text-shadow:0 0 .2em rgba(0,0,0,0.5)}.player:not(.iptv) .player-panel__box-buttons{-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0;display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;background:rgba(255,255,255,0.1);-webkit-border-radius:4em;border-radius:4em}.player:not(.iptv) .player-panel__box-buttons+.player-panel__box-buttons{margin-left:.5em}.player:not(.iptv) .player-panel__next,.player:not(.iptv) .player-panel__prev{padding:1.1em !important}.player:not(.iptv) .player-panel__next>svg,.player:not(.iptv) .player-panel__prev>svg{width:.8em;height:.8em}.player:not(.iptv) .player-panel__playlist{text-align:center}.player:not(.iptv) .player-panel__playlist>svg{width:1em !important}.player:not(.iptv) .player-video__paused,.player:not(.iptv) .player-video__loader{background-color:rgba(255,255,255,0.1)}.player:not(.iptv) .player-info__values .value--size span{background:rgba(255,255,255,0.1);-webkit-border-radius:1em;border-radius:1em}.player:not(.iptv).player--panel-visible .player-video__overlay{display:block;-webkit-animation:animation-opacity .3s;-moz-animation:animation-opacity .3s;-o-animation:animation-opacity .3s;animation:animation-opacity .3s}.normalization{background:rgba(255,255,255,0.1);-webkit-border-radius:1em;border-radius:1em}.normalization canvas{-webkit-border-radius:1em;border-radius:1em}body.platform--browser .player:not(.iptv) .player-panel__box-buttons,body.platform--browser .player:not(.iptv) .player-panel__playpause:not(.focus),body.platform--browser .player:not(.iptv) .player-info__values .value--size span,body.platform--nw .player:not(.iptv) .player-panel__box-buttons,body.platform--nw .player:not(.iptv) .player-panel__playpause:not(.focus),body.platform--nw .player:not(.iptv) .player-info__values .value--size span,body.glass--style.platform--apple .player:not(.iptv) .player-panel__box-buttons,body.glass--style.platform--apple .player:not(.iptv) .player-panel__playpause:not(.focus),body.glass--style.platform--apple .player:not(.iptv) .player-info__values .value--size span,body.glass--style.platform--apple_tv .player:not(.iptv) .player-panel__box-buttons,body.glass--style.platform--apple_tv .player:not(.iptv) .player-panel__playpause:not(.focus),body.glass--style.platform--apple_tv .player:not(.iptv) .player-info__values .value--size span,body.glass--style.platform--android .player:not(.iptv) .player-panel__box-buttons,body.glass--style.platform--android .player:not(.iptv) .player-panel__playpause:not(.focus),body.glass--style.platform--android .player:not(.iptv) .player-info__values .value--size span{-webkit-backdrop-filter:blur(1em);backdrop-filter:blur(1em)}body.platform--browser .normalization,body.platform--browser .player-video__paused,body.platform--browser .player-video__loader,body.platform--nw .normalization,body.platform--nw .player-video__paused,body.platform--nw .player-video__loader,body.glass--style.platform--apple .normalization,body.glass--style.platform--apple .player-video__paused,body.glass--style.platform--apple .player-video__loader,body.glass--style.platform--apple_tv .normalization,body.glass--style.platform--apple_tv .player-video__paused,body.glass--style.platform--apple_tv .player-video__loader,body.glass--style.platform--android .normalization,body.glass--style.platform--android .player-video__paused,body.glass--style.platform--android .player-video__loader{background-color:rgba(255,255,255,0.1);-webkit-backdrop-filter:blur(1em);backdrop-filter:blur(1em)}\n        </style>\n    ");var render=Lampa.Player.render();var title=$('<div class="player-info__title"></div>');var value=$('<div class="value--name"><span></span></div>');render.find('.player-video__display').after($('<div class="player-video__overlay"></div>'));render.find('.player-panel__center').find('.button:not(.player-panel__playpause)').remove();render.find('.player-panel__timeline').before(render.find('.player-panel__line-one'));render.find('.player-info .player-info__line').before(title);render.find('.value--size').after(value);var box=$('<div class="player-panel__box-buttons"></div>');var right_panel=render.find('.player-panel__right');var left_panel=render.find('.player-panel__left');var right_box_quality=box.clone();var right_box_main=box.clone();var right_box_audio=box.clone();var left_box_main=box.clone();right_panel.append(right_box_audio);right_panel.append(right_box_quality);right_panel.append(right_box_main);right_box_main.append(right_panel.find('.button'));right_box_quality.append(right_panel.find('.player-panel__quality'));right_box_audio.append(right_panel.find('.player-panel__flow'));right_box_audio.append(right_panel.find('.player-panel__subs'));right_box_audio.append(right_panel.find('.player-panel__tracks'));left_panel.prepend(left_box_main);left_box_main.append(left_panel.find('.button'));Lampa.Player.listener.follow('start',function(data){var name=data.title;var head='';if(!data.iptv){if(data.card)head=data.card.title||data.card.name;else if(Lampa.Activity.active().movie){head=Lampa.Activity.active().movie.title||Lampa.Activity.active().movie.name;}}if(!head)head=name;title.text(head).toggleClass('hide',Boolean(data.iptv));render.find('.player-info__name').toggleClass('hide',Boolean(name==head)).toggleClass('hide',true);value.toggleClass('hide',Boolean(name==head)).find('span').text(name);});}if(!window.youtube_player_plugin){window.youtube_player_plugin=true;if(window.appready)startPlugin();else {Lampa.Listener.follow('app',function(e){if(e.type=='ready')startPlugin();});}}

})();
(function () {
  'use strict';

  if (window.lampa_tv_mode_plugin) return;
  window.lampa_tv_mode_plugin = true;

  var VERSION = '1.0.0';
  var STORAGE = {
    mode: 'lampa_tv_mode',
    lastScreen: 'lampa_tv_last_screen',
    lastFocus: 'lampa_tv_last_focus'
  };

  var CSS_ID = 'lampa-tv-mode-css';
  var HEAD_ID = 'lampa-tv-head-button';
  var active = false;
  var observer = null;
  var bindingsInstalled = false;

  function safe(fn, fallback) {
    try {
      var value = fn();
      return value === undefined ? fallback : value;
    } catch (e) {
      return fallback;
    }
  }

  function getStorage(key, fallback) {
    var value = safe(function () {
      if (window.Lampa && Lampa.Storage && typeof Lampa.Storage.get === 'function') {
        return Lampa.Storage.get(key, fallback);
      }
      return window.localStorage ? localStorage.getItem(key) : fallback;
    }, fallback);

    if (value === undefined || value === null || value === '') return fallback;

    if (value === 'true') return true;
    if (value === 'false') return false;

    return value;
  }

  function setStorage(key, value) {
    safe(function () {
      if (window.Lampa && Lampa.Storage && typeof Lampa.Storage.set === 'function') {
        Lampa.Storage.set(key, value);
      } else if (window.localStorage) {
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
      }
    });
  }

  function isMobile() {
    return !!safe(function () {
      return Lampa.Platform && typeof Lampa.Platform.screen === 'function' && Lampa.Platform.screen('mobile');
    }, false);
  }

  function isTvDevice() {
    return !!safe(function () {
      return Lampa.Platform && typeof Lampa.Platform.tvbox === 'function' && Lampa.Platform.tvbox();
    }, false);
  }

  function shouldAllow() {
    return !isMobile();
  }

  function escapeHtml(text) {
    return String(text == null ? '' : text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function injectCSS() {
    if (document.getElementById(CSS_ID)) return;

    var style = document.createElement('style');
    style.id = CSS_ID;
    style.type = 'text/css';
    style.textContent = `
/* ==========================================================
   Lampa TV Mode
   Solid dark TV UI, large cards, stronger focus, native Lampa nav
   ========================================================== */

html.lampa-tv-enabled,
body.lampa-tv-enabled {
  --ltv-gap: clamp(1rem, 1.35vw, 1.8rem);
  --ltv-side: clamp(4.8rem, 6vw, 6.8rem);
  --ltv-card-w: clamp(10.2rem, 12.2vw, 15.6rem);
  --ltv-card-radius: clamp(.5rem, .65vw, .85rem);
}

body.lampa-tv-enabled {
  background: #08090b !important;
  overflow-x: hidden !important;
}

/* ----------------------------------------------------------
   Global typography / touch & focus areas
   ---------------------------------------------------------- */
body.lampa-tv-enabled .selector {
  -webkit-tap-highlight-color: transparent;
}

body.lampa-tv-enabled .selector.focus {
  z-index: 5;
}

/* ----------------------------------------------------------
   Main content shell
   ---------------------------------------------------------- */
body.lampa-tv-enabled .wrap__content {
  padding-left: clamp(.7rem, 1.2vw, 1.5rem) !important;
  padding-right: clamp(.7rem, 1.2vw, 1.5rem) !important;
}

body.lampa-tv-enabled .main,
body.lampa-tv-enabled .category,
body.lampa-tv-enabled .bookmarks,
body.lampa-tv-enabled .explorer,
body.lampa-tv-enabled .search {
  padding-bottom: 4vh !important;
}

/* ----------------------------------------------------------
   Existing Lampa horizontal rows -> TV spacing
   Lampa 3.x uses ItemsLine / line-based content; these selectors
   intentionally cover several generations without replacing DOM.
   ---------------------------------------------------------- */
body.lampa-tv-enabled .items-line,
body.lampa-tv-enabled .items-line__body,
body.lampa-tv-enabled .items__line,
body.lampa-tv-enabled .items__line-body,
body.lampa-tv-enabled [class*="items-line"] {
  scroll-behavior: smooth;
}

body.lampa-tv-enabled .items-line,
body.lampa-tv-enabled .items__line {
  margin-bottom: clamp(1.25rem, 2vw, 2.5rem) !important;
}

body.lampa-tv-enabled .items-line__body,
body.lampa-tv-enabled .items__line-body {
  gap: clamp(.65rem, 1vw, 1.2rem) !important;
}

/* Card size */
body.lampa-tv-enabled .card {
  width: var(--ltv-card-w) !important;
  min-width: var(--ltv-card-w) !important;
  max-width: var(--ltv-card-w) !important;
  margin-right: 0 !important;
  margin-bottom: .3rem !important;
  transition: transform .18s ease, opacity .18s ease !important;
}

body.lampa-tv-enabled .card__view,
body.lampa-tv-enabled .card__img {
  border-radius: var(--ltv-card-radius) !important;
}

body.lampa-tv-enabled .card:not(.focus) {
  opacity: .88;
}

body.lampa-tv-enabled .card.focus {
  opacity: 1 !important;
  transform: scale(1.045);
}

body.lampa-tv-enabled .card.focus .card__view {
  outline: clamp(2px, .18vw, 4px) solid rgba(255,255,255,.9);
  outline-offset: clamp(2px, .18vw, 4px);
}

body.lampa-tv-enabled .card.focus .card__title,
body.lampa-tv-enabled .card.focus .card__title span {
  color: #fff !important;
}

/* Bigger poster titles */
body.lampa-tv-enabled .card__title {
  font-size: clamp(.82rem, 1.08vw, 1.15rem) !important;
  line-height: 1.25 !important;
}

body.lampa-tv-enabled .card__year {
  font-size: clamp(.72rem, .86vw, .95rem) !important;
}

/* Wide/promo cards stay wide instead of inheriting poster width */
body.lampa-tv-enabled .card--wide {
  width: clamp(20rem, 29vw, 39rem) !important;
  min-width: clamp(20rem, 29vw, 39rem) !important;
  max-width: clamp(20rem, 29vw, 39rem) !important;
}

/* ----------------------------------------------------------
   Section titles
   ---------------------------------------------------------- */
body.lampa-tv-enabled .items-line__title,
body.lampa-tv-enabled .items__title,
body.lampa-tv-enabled .items-line > .items-line__title,
body.lampa-tv-enabled [class*="items-line"] h2,
body.lampa-tv-enabled [class*="items-line"] .title {
  font-size: clamp(1.05rem, 1.55vw, 1.65rem) !important;
  font-weight: 700 !important;
  letter-spacing: -.01em;
  margin-bottom: .55rem !important;
}

/* ----------------------------------------------------------
   Native Lampa sidebar -> TV sidebar
   ---------------------------------------------------------- */
body.lampa-tv-enabled .wrap__left,
body.lampa-tv-enabled .menu {
  width: clamp(18rem, 20vw, 23rem) !important;
}

body.lampa-tv-enabled .menu__item {
  min-height: clamp(3.35rem, 4.6vw, 4.8rem) !important;
  margin-bottom: .18rem !important;
  padding: .5rem .85rem !important;
  border-radius: .7rem !important;
}

body.lampa-tv-enabled .menu__ico {
  width: clamp(1.65rem, 2vw, 2.2rem) !important;
  height: clamp(1.65rem, 2vw, 2.2rem) !important;
  margin-right: .75rem !important;
}

body.lampa-tv-enabled .menu__text {
  font-size: clamp(1rem, 1.3vw, 1.35rem) !important;
}

body.lampa-tv-enabled .menu__item.focus,
body.lampa-tv-enabled .menu__item.traverse,
body.lampa-tv-enabled .menu__item.hover {
  background: rgba(255,255,255,.10) !important;
}

body.lampa-tv-enabled .menu__item.focus .menu__text,
body.lampa-tv-enabled .menu__item.focus .menu__ico {
  color: #fff !important;
}

/* Keep the TV sidebar solid; no glassmorphism */
body.lampa-tv-enabled .wrap__left,
body.lampa-tv-enabled .wrap__left:before,
body.lampa-tv-enabled .menu {
  background: #0d0f12 !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

/* ----------------------------------------------------------
   Header / TV-safe icon sizes
   ---------------------------------------------------------- */
body.lampa-tv-enabled .head__body,
body.lampa-tv-enabled .head__left,
body.lampa-tv-enabled .head__right {
  min-height: clamp(3.25rem, 4.6vw, 4.8rem) !important;
}

body.lampa-tv-enabled .head__action,
body.lampa-tv-enabled .head__button {
  min-width: clamp(3rem, 4vw, 4.3rem) !important;
  min-height: clamp(3rem, 4vw, 4.3rem) !important;
}

/* ----------------------------------------------------------
   Full movie / series screen
   ---------------------------------------------------------- */
body.lampa-tv-enabled .full-start,
body.lampa-tv-enabled .full-start-new {
  min-height: 100vh !important;
}

body.lampa-tv-enabled .full-start__body,
body.lampa-tv-enabled .full-start-new__body {
  padding-left: clamp(2rem, 4vw, 5rem) !important;
  padding-right: clamp(2rem, 4vw, 5rem) !important;
}

body.lampa-tv-enabled .full-start__img,
body.lampa-tv-enabled .full-start__poster,
body.lampa-tv-enabled .full-start-new__img,
body.lampa-tv-enabled .full-start-new__poster {
  border-radius: clamp(.5rem, .75vw, 1rem) !important;
}

body.lampa-tv-enabled .full-start__title,
body.lampa-tv-enabled .full-start__name,
body.lampa-tv-enabled .full-start-new__title,
body.lampa-tv-enabled .full-start-new__name {
  font-size: clamp(2rem, 3.2vw, 4rem) !important;
  line-height: 1.02 !important;
  font-weight: 700 !important;
}

body.lampa-tv-enabled .full-start__descr,
body.lampa-tv-enabled .full-start__description,
body.lampa-tv-enabled .full-start-new__descr,
body.lampa-tv-enabled .full-start-new__description {
  font-size: clamp(1rem, 1.25vw, 1.35rem) !important;
  line-height: 1.5 !important;
  max-width: 72ch !important;
}

body.lampa-tv-enabled .full-start__buttons,
body.lampa-tv-enabled .full-start-new__buttons {
  gap: .65rem !important;
}

body.lampa-tv-enabled .full-start__button,
body.lampa-tv-enabled .full-start-new__button {
  min-height: clamp(3rem, 4vw, 4.3rem) !important;
  padding: .75rem 1.2rem !important;
  border-radius: .75rem !important;
  font-size: clamp(.95rem, 1.1vw, 1.25rem) !important;
}

body.lampa-tv-enabled .full-start__button.focus,
body.lampa-tv-enabled .full-start-new__button.focus {
  outline: 2px solid rgba(255,255,255,.9) !important;
  outline-offset: 3px;
  background: rgba(255,255,255,.12) !important;
}

/* Make the existing source/online buttons TV-friendly */
body.lampa-tv-enabled .view--online.full-start__button,
body.lampa-tv-enabled .view--online.full-start-new__button {
  min-width: clamp(10rem, 13vw, 14rem) !important;
}

/* ----------------------------------------------------------
   Settings / modal / select boxes
   ---------------------------------------------------------- */
body.lampa-tv-enabled .settings-param,
body.lampa-tv-enabled .selectbox-item,
body.lampa-tv-enabled .modal__body .selector {
  min-height: clamp(3rem, 4vw, 4.25rem) !important;
  font-size: clamp(.95rem, 1.2vw, 1.25rem) !important;
}

body.lampa-tv-enabled .settings-param.focus,
body.lampa-tv-enabled .selectbox-item.focus {
  background: rgba(255,255,255,.11) !important;
}

/* ----------------------------------------------------------
   Player: keep the user's existing player skin untouched as much
   as possible; only enlarge TV focus areas around it.
   ---------------------------------------------------------- */
body.lampa-tv-enabled .player .button {
  min-width: 3.2em !important;
  min-height: 3.2em !important;
}

/* ----------------------------------------------------------
   TV-only helper badge
   ---------------------------------------------------------- */
.lampa-tv-badge {
  position: fixed;
  right: 1.25rem;
  top: .9rem;
  z-index: 99998;
  display: none;
  padding: .35rem .65rem;
  border-radius: .55rem;
  background: #15181c;
  color: rgba(255,255,255,.65);
  font-size: .72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .08em;
  pointer-events: none;
}

body.lampa-tv-enabled .lampa-tv-badge {
  display: block;
}

/* ----------------------------------------------------------
   Reduce motion switch for weak TVs
   ---------------------------------------------------------- */
body.lampa-tv-reduced-motion * {
  scroll-behavior: auto !important;
  transition-duration: .05ms !important;
  animation-duration: .05ms !important;
  animation-iteration-count: 1 !important;
}

@media (max-width: 1000px) {
  body.lampa-tv-enabled .card {
    width: 9.8rem !important;
    min-width: 9.8rem !important;
    max-width: 9.8rem !important;
  }

  body.lampa-tv-enabled .card--wide {
    width: 18rem !important;
    min-width: 18rem !important;
    max-width: 18rem !important;
  }
}

@media (min-width: 2500px) {
  body.lampa-tv-enabled .card {
    width: 14.5rem !important;
    min-width: 14.5rem !important;
    max-width: 14.5rem !important;
  }
}
`;

    document.head.appendChild(style);
  }

  function ensureBadge() {
    if (document.getElementById('lampa-tv-badge')) return;
    var badge = document.createElement('div');
    badge.id = 'lampa-tv-badge';
    badge.className = 'lampa-tv-badge';
    badge.textContent = 'TV Mode';
    document.body.appendChild(badge);
  }

  function notify(text) {
    safe(function () {
      if (Lampa.Noty && typeof Lampa.Noty.show === 'function') {
        Lampa.Noty.show(text);
        return;
      }
      if (Lampa.Notifier && typeof Lampa.Notifier.show === 'function') {
        Lampa.Notifier.show({ title: 'Lampa TV', text: text, time: 2000 });
      }
    });
  }

  function toggleMenu() {
    safe(function () {
      if (Lampa.Controller && typeof Lampa.Controller.toggle === 'function') {
        Lampa.Controller.toggle('menu');
      }
    });
  }

  function installHeadButton() {
    if (document.getElementById(HEAD_ID)) return;
    if (!window.Lampa || !Lampa.Head || typeof Lampa.Head.addIcon !== 'function') return;

    var icon = '\n      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg">\n        <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.8"/>\n        <path d="M7 9h.01M11 9h.01M15 9h2M7 13h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>\n      </svg>';

    var button = safe(function () {
      return Lampa.Head.addIcon(icon, function () {
        toggleMenu();
      });
    }, null);

    if (button && button.addClass) {
      button.addClass('lampa-tv-head-button');
      button.attr('id', HEAD_ID);
      button.attr('title', 'TV меню');
    } else if (button && button.length) {
      button.attr('id', HEAD_ID);
    }
  }

  function addMenuButton() {
    if (!Lampa.Menu || typeof Lampa.Menu.addButton !== 'function') return;
    if (window.lampa_tv_menu_button_added) return;
    window.lampa_tv_menu_button_added = true;

    var icon = '\n      <svg viewBox="0 0 24 24" width="36" height="36" fill="none" xmlns="http://www.w3.org/2000/svg">\n        <rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" stroke-width="1.8"/>\n        <path d="M7 8h10M7 12h7M7 16h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>\n      </svg>';

    var button = safe(function () {
      return Lampa.Menu.addButton(icon, 'TV Mode', function () {
        setMode(!active, true);
      });
    }, null);

    if (button && button.addClass) button.addClass('lampa-tv-menu-button');
  }

  function addSettings() {
    if (!Lampa.SettingsApi || typeof Lampa.SettingsApi.addComponent !== 'function' || typeof Lampa.SettingsApi.addParam !== 'function') {
      return;
    }

    if (window.lampa_tv_settings_added) return;
    window.lampa_tv_settings_added = true;

    safe(function () {
      Lampa.SettingsApi.addComponent({
        component: 'lampa_tv',
        name: 'Lampa TV',
        icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M8 9h8M8 13h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
      });

      Lampa.SettingsApi.addParam({
        component: 'lampa_tv',
        param: {
          name: STORAGE.mode,
          type: 'toggle',
          values: false,
          default: !!getStorage(STORAGE.mode, false)
        },
        field: {
          name: 'TV Mode',
          description: 'Крупный интерфейс, TV-фокус, большие карточки и навигация пультом'
        },
        onChange: function (value) {
          var enabled = value === true || value === 'true' || value === 1 || value === '1';
          setMode(enabled, true);
        }
      });

      Lampa.SettingsApi.addParam({
        component: 'lampa_tv',
        param: {
          name: 'lampa_tv_reduced_motion',
          type: 'toggle',
          values: false,
          default: false
        },
        field: {
          name: 'Слабый телевизор',
          description: 'Минимум анимаций и более лёгкий режим'
        },
        onChange: function (value) {
          var enabled = value === true || value === 'true' || value === 1 || value === '1';
          document.body.classList.toggle('lampa-tv-reduced-motion', enabled);
        }
      });
    });
  }

  function rememberFocus() {
    if (!active) return;
    var focused = document.querySelector('.focus.card, .card.focus, .selector.focus');
    if (!focused) return;

    var key = focused.getAttribute('data-id') || focused.getAttribute('data-tmdb') || focused.textContent || '';
    key = String(key).replace(/\s+/g, ' ').trim().slice(0, 160);
    if (key) setStorage(STORAGE.lastFocus, key);
  }

  function installFocusHooks() {
    if (bindingsInstalled) return;
    bindingsInstalled = true;

    if (window.jQuery) {
      $(document).on('hover:focus.lampaTv', '.card, .selector', function () {
        if (!active) return;
        try {
          this.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        } catch (e) {}
        rememberFocus();
      });

    }

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) setTimeout(rememberFocus, 100);
    }, false);
  }

  function markTVState() {
    if (!document.body) return;
    document.documentElement.classList.toggle('lampa-tv-enabled', active);
    document.body.classList.toggle('lampa-tv-enabled', active);

    if (active) {
      ensureBadge();
      installHeadButton();
      setTimeout(rememberFocus, 120);
    }
  }

  function setMode(value, tellUser) {
    if (!shouldAllow()) {
      if (value) notify('TV Mode недоступен на мобильном режиме');
      return;
    }

    active = !!value;
    setStorage(STORAGE.mode, active);
    markTVState();

    if (tellUser) {
      notify(active ? 'TV Mode включён' : 'TV Mode выключен');
    }
  }

  function scanForDynamicChanges() {
    if (!window.MutationObserver || observer) return;

    observer = new MutationObserver(function () {
      if (!active) return;
      if (!document.body.classList.contains('lampa-tv-enabled')) markTVState();
    });

    safe(function () {
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }

  function followFull() {
    if (!Lampa.Listener || typeof Lampa.Listener.follow !== 'function') return;

    safe(function () {
      Lampa.Listener.follow('full', function (e) {
        if (!active || !e || (e.type !== 'complite' && e.type !== 'complete')) return;
        setTimeout(function () {
          markTVState();
          var root = safe(function () {
            return e.object && e.object.activity && e.object.activity.render ? e.object.activity.render() : null;
          }, null);

          if (!root || !root.find) return;

          // Make the native full-screen buttons easy to target with a remote.
          root.find('.full-start__button, .full-start-new__button, .selector').each(function () {
            this.classList.add('lampa-tv-target');
          });
        }, 80);
      });
    });
  }

  function addManifest() {
    safe(function () {
      if (!Lampa.Manifest) Lampa.Manifest = {};
      var manifest = {
        type: 'other',
        version: VERSION,
        name: 'Lampa TV Mode',
        description: 'TV-friendly interface with large cards, focus navigation and TV sidebar',
        component: 'lampa_tv'
      };

      if (Array.isArray(Lampa.Manifest.plugins)) {
        var exists = Lampa.Manifest.plugins.some(function (p) { return p && p.component === manifest.component; });
        if (!exists) Lampa.Manifest.plugins.push(manifest);
      } else if (typeof Lampa.Manifest.plugins === 'object' && Lampa.Manifest.plugins) {
        Lampa.Manifest.plugins[manifest.component] = manifest;
      } else {
        Lampa.Manifest.plugins = {};
        Lampa.Manifest.plugins[manifest.component] = manifest;
      }
    });
  }

  function bootstrap() {
    if (typeof window.Lampa === 'undefined') {
      setTimeout(bootstrap, 250);
      return;
    }

    try {
      injectCSS();
      addManifest();
      addSettings();
      addMenuButton();
      installHeadButton();
      installFocusHooks();
      scanForDynamicChanges();
      followFull();

      active = !!getStorage(STORAGE.mode, false);
      markTVState();

      // On TVs we do not force-enable the mode. The user can enable it once
      // from Settings/Menu and the preference persists.
      if (isTvDevice() && getStorage(STORAGE.mode, false) === undefined) {
        setMode(false, false);
      }

      console.log('[Lampa TV] started', {
        version: VERSION,
        tvDevice: isTvDevice(),
        enabled: active,
        appDigital: safe(function () { return Lampa.Manifest.app_digital; }, 'unknown')
      });
    } catch (e) {
      console.log('[Lampa TV] start error:', e && (e.stack || e.message || e));
    }
  }

  window.LampaTV = {
    version: VERSION,
    enabled: function () { return active; },
    set: function (value) { setMode(!!value, true); },
    toggle: function () { setMode(!active, true); },
    refresh: function () { markTVState(); }
  };

  if (window.appready) bootstrap();
  else if (window.Lampa && Lampa.Listener && Lampa.Listener.follow) {
    Lampa.Listener.follow('app', function (e) {
      if (e && e.type === 'ready') bootstrap();
    });
  } else {
    bootstrap();
  }
})();
