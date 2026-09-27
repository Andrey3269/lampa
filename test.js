(function () {
  'use strict';

  if (window.lampa_wtch_unified_v2) return;
  window.lampa_wtch_unified_v2 = true;

  var VERSION = '2.0.0 (Z01 UI Edition)';
  var SCRIPT_URL = 'http://wtch.ch/m'; // Базовый скрипт, поверх которого накладывается новый UI

  function safe(fn) {
    try {
      return fn();
    } catch (e) {
      return null;
    }
  }

  // =========================================================
  // 1. Z01 UI: Стили для телевизора (капсулы, сетка, фокус)
  // =========================================================
  function injectCSS() {
    if (document.getElementById('lampa_wtch_hide_css')) return;

    var style = document.createElement('style');
    style.id = 'lampa_wtch_hide_css';

    // Скрываем старые элементы и добавляем новые стили из Z01
    style.innerHTML = `
      /* Скрытие старых торрентов и трейлеров */
      .view--trailer, [data-action="trailer"],
      .shots-view-button, .view--shots, .shots-view, [data-action="shots"], [data-action="shorts"],
      .view--torrent, .view--torrents, .torrent-view, .torrent-view-button, .torrent-button,
      [data-action="torrent"], [data-action="torrents"], [data-type="torrent"], [data-type="torrents"],
      .button--torrent, .full-start__button[data-subtitle*="торрент"], .full-start__button[data-subtitle*="Torrent"] {
        display: none !important;
      }

      /* Z01 UI: Базовый контейнер */
      .mo { padding: 0 0 3em 0; }
      .mo * { -webkit-box-sizing: border-box; box-sizing: border-box; }

      /* Z01 UI: Панель выбора (Источники / Сезоны / Озвучка) */
      .mo-panel { display: flex; flex-wrap: wrap; margin: 0 0 1.3em 0; }
      .mo-seg { position: relative; min-width: 11em; max-width: 24em; padding: .6em 2.2em .6em 1em; margin: 0 .8em .6em 0; background: rgba(255,255,255,.08); border-radius: .4em; line-height: 1.25; transition: background 0.2s, transform 0.2s; }
      .mo-seg__name { font-size: .8em; letter-spacing: .06em; text-transform: uppercase; opacity: .5; }
      .mo-seg__value { font-size: 1.25em; font-weight: 600; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
      .mo-seg__arrow { position: absolute; right: .9em; top: 50%; margin-top: -.2em; width: 0; height: 0; border-left: .5em solid transparent; border-right: .5em solid transparent; border-top: .5em solid rgba(255,255,255,.55); }

      /* Фокус для телевизора */
      .mo-seg.focus { background: #fff; color: #000; transform: scale(1.05); }
      .mo-seg.focus .mo-seg__name { opacity: .7; }
      .mo-seg.focus .mo-seg__arrow { border-top-color: rgba(0,0,0,.8); }
      .mo-seg--open { background: rgba(124,196,255,.22); }

      /* Z01 UI: Раскрытая сетка (Плитки выбора) */
      .mo-grid { display: flex; flex-wrap: wrap; margin: 0 -.3em 1.4em -.3em; width: 100%; }
      .mo-opt { width: 25%; padding: 0 .3em .6em .3em; }
      .mo-opt__in { position: relative; padding: .8em 1em; min-height: 3.5em; background: rgba(255,255,255,.07); border-radius: .4em; line-height: 1.3; overflow: hidden; transition: background 0.2s; }
      .mo-opt__label { display: block; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: 1.1em; }
      .mo-opt__note { display: block; font-size: .85em; opacity: .5; margin-top: .2em; }
      .mo-opt.focus .mo-opt__in { background: #fff; color: #000; box-shadow: 0 0 0 .2em #7cc4ff; }
      .mo-opt--active .mo-opt__in { box-shadow: inset 0 0 0 .15em #7cc4ff; }

      @media screen and (max-width: 1300px) { .mo-opt { width: 33.333%; } }
      @media screen and (max-width: 900px) { .mo-opt { width: 50%; } }
    `;

    document.head.appendChild(style);
  }

  // =========================================================
  // 2. Инъекция Z01 UI поверх стандартных фильтров Lampa
  // =========================================================
  function installModernTVUI() {
    if (window.lampa_wtch_tv_ui_installed) return;
    window.lampa_wtch_tv_ui_installed = true;

    safe(function () {
      if (window.Lampa && window.Lampa.Listener) {
        Lampa.Listener.follow('full', function (e) {
          if (e.type === 'complite' || e.type === 'complete') {
            setTimeout(function () {
              var root = document;
              safe(function () {
                if (e.object && e.object.activity && typeof e.object.activity.render === 'function') {
                  root = e.object.activity.render();
                }
              });

              // Ищем стандартные фильтры
              var filterWrap = $(root).find('.torrent-filter');
              if (filterWrap.length && !$(root).find('.mo-panel').length) {
                // Создаем новую панель Z01 UI
                var z01Panel = $('<div class="mo"><div class="mo-panel"></div><div class="mo-grid" style="display:none;"></div></div>');
                var bar = z01Panel.find('.mo-panel');
                var grid = z01Panel.find('.mo-grid');

                // Переносим Источник
                var srcBtn = filterWrap.find('.filter--sort');
                if (srcBtn.length) {
                  var srcTitle = srcBtn.find('span').text() || Lampa.Lang.translate('settings_rest_source');
                  var segSrc = $('<div class="mo-seg selector" data-type="source"><div class="mo-seg__name">Источник</div><div class="mo-seg__value">' + srcTitle + '</div><div class="mo-seg__arrow"></div></div>');

                  segSrc.on('hover:enter', function() {
                    srcBtn.trigger('hover:enter');
                  });
                  bar.append(segSrc);
                }

                // Переносим Сезон и Озвучку (обычно находятся внутри .filter--filter)
                var filters = filterWrap.find('.filter--filter');
                if (filters.length) {
                  var segVoice = $('<div class="mo-seg selector" data-type="filter"><div class="mo-seg__name">Выбор</div><div class="mo-seg__value">Сезон / Озвучка</div><div class="mo-seg__arrow"></div></div>');

                  segVoice.on('hover:enter', function() {
                    filters.trigger('hover:enter');
                  });
                  bar.append(segVoice);
                }

                // Скрываем старую панель и вставляем новую красивую TV панель
                filterWrap.css('display', 'none');
                filterWrap.after(z01Panel);
              }
            }, 300);
          }
        });
      }
    });
  }

  // =========================================================
  // 3. Отключаем баннеры и чистим лишнее (из твоего кода)
  // =========================================================
  function installShowyProGuards() {
    if (window.lampa_wtch_showy_guard_installed) return;
    window.lampa_wtch_showy_guard_installed = true;

    safe(function () {
      if (!window.ShowyMarketingRuntime) {
        window.ShowyMarketingRuntime = {
          start: function () {}, context: function () {}, trackLinkResolved: function () {},
          createWtchInvoice: function () { return false; }, registerSourceAdapter: function () { return false; },
          sourceBase: function (base) { return base; }, rewriteSourceUrl: function (url) { return url; },
          ensureInlinePro: function (pro, success) { if (typeof success === 'function') success({ base: '', verified: false, changed: false }); },
          isInlineProActive: function () { return false; }
        };
      }
      if (!window.ShowyProEntryBanner) {
        window.ShowyProEntryBanner = { attach: function () { return { mount: function () {}, destroy: function () {}, ensure: function () {} }; }, version: 'disabled-by-guard' };
      }
    });
  }

  function disableTorrentSetting() {
    safe(function () { if (window.lampa_settings) window.lampa_settings.torrents_use = false; });
  }

  function removeUnwantedUI(root) {
    var scope = root || document;
    var selectors = ['.view--trailer', '[data-action="trailer"]', '.shots-view-button', '.view--shots', '.shots-view', '[data-action="shots"]', '[data-action="shorts"]', '.view--torrent', '.view--torrents', '.torrent-view', '.torrent-view-button', '.torrent-button', '[data-action="torrent"]', '[data-action="torrents"]', '[data-type="torrent"]', '[data-type="torrents"]', '.button--torrent', '.full-start__button[data-subtitle*="торрент"]', '.full-start__button[data-subtitle*="Torrent"]'];
    safe(function () { selectors.forEach(function (selector) { var nodes = scope.querySelectorAll(selector); for (var i = 0; i < nodes.length; i++) nodes[i].remove(); }); });
  }

  function installUiCleaner() {
    if (window.lampa_wtch_unified_ui_cleaner) return;
    window.lampa_wtch_unified_ui_cleaner = true;

    safe(function () {
      if (window.Lampa && window.Lampa.Listener) {
        Lampa.Listener.follow('full', function (e) {
          if (e.type === 'complite' || e.type === 'complete') {
            setTimeout(function () {
              var root = document;
              safe(function () { if (e.object && e.object.activity && typeof e.object.activity.render === 'function') root = e.object.activity.render(); });
              removeUnwantedUI(root);
            }, 50);
          }
        });
      }
    });
  }

  // =========================================================
  // 4. Скин Плеера (Твой оригинальный код)
  // =========================================================
  function installPlayerSkin() {
    if (window.lampa_wtch_player_skin_installed) return;
    window.lampa_wtch_player_skin_installed = true;

    safe(function () {
      if (!window.Lampa || !window.Lampa.Player || !window.Lampa.Platform || typeof window.$ === 'undefined') return;
      if (Lampa.Platform.screen('mobile') || (Lampa.Manifest && Lampa.Manifest.app_digital > 328)) return;

      if (!document.getElementById('lampa_wtch_player_skin_css')) {
        var style = document.createElement('style');
        style.id = 'lampa_wtch_player_skin_css';
        style.innerHTML = '.player-video__overlay{display:none;background:-webkit-gradient(linear,left top,left bottom,from(rgba(0,0,0,0.5)),color-stop(53%,rgba(0,0,0,0.3)),to(rgba(11,13,16,0.8)));background:-webkit-linear-gradient(top,rgba(0,0,0,0.5) 0,rgba(0,0,0,0.3) 53%,rgba(11,13,16,0.8) 100%);background:linear-gradient(to bottom,rgba(0,0,0,0.5) 0,rgba(0,0,0,0.3) 53%,rgba(11,13,16,0.8) 100%);position:absolute;top:0;left:0;width:100%;height:100%}.player:not(.iptv) .player-panel,.player:not(.iptv) .player-info,.player:not(.iptv) .player-footer{background:transparent !important;backdrop-filter:unset !important}.player:not(.iptv) .player-panel__body,.player:not(.iptv) .player-info__body,.player:not(.iptv) .player-footer__body{padding:0}.player:not(.iptv) .player-footer__row{padding:0}.player:not(.iptv) .head-backward{display:none !important}.player:not(.iptv) .player-info__body{padding-left:0 !important;position:relative}.player:not(.iptv) .player-info__name{font-size:1.2em;text-shadow:0 0 .2em rgba(0,0,0,0.5)}.player:not(.iptv) .player-info__title{font-size:2.4em;font-weight:600;line-height:1.4;width:60%;text-shadow:0 0 .2em rgba(0,0,0,0.5);overflow:hidden;text-overflow:\'.\';display:-webkit-box;-webkit-line-clamp:2;line-clamp:2;-webkit-box-orient:vertical}.player:not(.iptv) .player-info__time{position:absolute;top:.8em;right:0}.player:not(.iptv) .player-panel .button{padding:.9em;width:3em;height:3em}.player:not(.iptv) .player-panel__playpause{margin:0;padding:1em !important}.player:not(.iptv) .player-panel__playpause:not(.focus){background:rgba(255,255,255,0.1)}.player:not(.iptv) .player-panel__quality{border-radius:5em !important;padding:0 1em !important}.player:not(.iptv) .player-panel__timeline{margin-bottom:1em}.player:not(.iptv) .player-panel__box-buttons{flex-shrink:0;display:flex;background:rgba(255,255,255,0.1);border-radius:4em}.player:not(.iptv) .player-panel__box-buttons+.player-panel__box-buttons{margin-left:.5em}.player:not(.iptv).player--panel-visible .player-video__overlay{display:block;animation:animation-opacity .3s}';
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

      right_panel.append(right_box_audio).append(right_box_quality).append(right_box_main);
      right_box_main.append(right_panel.find('.button'));
      right_box_quality.append(right_panel.find('.player-panel__quality'));
      right_box_audio.append(right_panel.find('.player-panel__flow')).append(right_panel.find('.player-panel__subs')).append(right_panel.find('.player-panel__tracks'));
      left_panel.prepend(left_box_main);
      left_box_main.append(left_panel.find('.button'));

      Lampa.Player.listener.follow('start', function (data) {
        var head = (data.card ? (data.card.title || data.card.name) : false) || (Lampa.Activity.active().movie ? (Lampa.Activity.active().movie.title || Lampa.Activity.active().movie.name) : data.title);
        title.text(head).toggleClass('hide', Boolean(data.iptv));
        render.find('.player-info__name').toggleClass('hide', true);
        value.toggleClass('hide', Boolean(data.title == head)).find('span').text(data.title);
      });
    });
  }

  // =========================================================
  // 5. Загрузка основы (WTCH)
  // =========================================================
  function loadWTCH() {
    if (window.lampa_wtch_unified_loaded) return;
    window.lampa_wtch_unified_loaded = true;

    var scripts = [SCRIPT_URL];

    if (window.Lampa && window.Lampa.Utils && typeof window.Lampa.Utils.putScriptAsync === 'function') {
      safe(function () { Lampa.Utils.putScriptAsync(scripts, function () { window.lampa_wtch_unified_ready = true; }); });
      return;
    }

    var script = document.createElement('script');
    script.async = true;
    script.src = scripts[0];
    script.onload = function() { window.lampa_wtch_unified_ready = true; };
    (document.head || document.documentElement).appendChild(script);
  }

  // =========================================================
  // 6. Инициализация
  // =========================================================
  function start() {
    injectCSS();
    installUiCleaner();
    disableTorrentSetting();
    installPlayerSkin();
    installModernTVUI(); // <-- Инъекция Z01 UI
  }

  installShowyProGuards();
  loadWTCH();

  if (window.appready) {
    start();
  } else {
    safe(function () {
      if (window.Lampa && window.Lampa.Listener) {
        Lampa.Listener.follow('app', function (event) {
          if (event.type === 'ready') start();
        });
      }
    });
  }

  window.lampa_wtch_unified = {
    version: VERSION,
    script: SCRIPT_URL,
    player_skin: true,
    modern_tv_ui: true
  };

})();