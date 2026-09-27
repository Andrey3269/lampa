(function () {
  'use strict';

  if (window.lampa_wtch_unified_v1) return;
  window.lampa_wtch_unified_v1 = true;

  var VERSION = '1.4.0';

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
  // Экран поиска озвучек (компонент "lampac_z") сам по себе уже умеет
  // рисовать два вида интерфейса — современный, на "плитках" (классы
  // mo-head / mo-panel / mo-seg / mo-grid / mo-opt / mo-tiles / mo-tile /
  // mo-line), и классический, через стандартный Lampa selectbox. Ниже —
  // единая ТВ-тема поверх обоих режимов: крупные капсулы-переключатели
  // "Источник / Сезон / Серии / Озвучка", более крупный текст для чтения
  // с дивана и чёткая, контрастная подсветка фокуса под управление пультом.
  //
  // Стиль специально перекликается с редизайном самого плеера (п. 4.5):
  // те же полупрозрачные "капсулы", тот же акцентный цвет подсветки.
  //
  // Правила помечены !important, потому что стиль самого экрана
  // (Z01UI.css) подключается своим скриптом и порядок добавления двух
  // независимых плагинов в документ заранее не известен — так наша
  // тема гарантированно перекрывает исходную вне зависимости от того,
  // что было подключено раньше.

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
        /* ===== Капсулы-переключатели: Источник / Сезон / Серии / Озвучка ===== */
        .mo-panel { margin-bottom: 1.6em !important; }

        .mo-seg {
          min-width: 13em !important;
          padding: .85em 2.6em .85em 1.3em !important;
          border-radius: 2.4em !important;
          background: rgba(255,255,255,.1) !important;
          -webkit-backdrop-filter: blur(1em);
          backdrop-filter: blur(1em);
          transition: transform .15s ease, box-shadow .15s ease, background .15s ease;
        }
        .mo-seg__name { font-size: .78em !important; opacity: .55 !important; }
        .mo-seg__value { font-size: 1.25em !important; font-weight: 500 !important; }
        .mo-seg__arrow { right: 1.1em !important; border-top-width: .5em !important; }

        .mo-seg.focus {
          background: #fff !important;
          color: #0b0d10 !important;
          transform: scale(1.06);
          box-shadow: 0 0 0 .16em #7cc4ff, 0 .5em 1.4em rgba(0,0,0,.4) !important;
        }
        .mo-seg--open {
          background: rgba(124,196,255,.25) !important;
          box-shadow: inset 0 0 0 .14em #7cc4ff !important;
        }
        .mo-seg--open.focus {
          box-shadow: inset 0 0 0 .14em #7cc4ff, 0 0 0 .16em #7cc4ff, 0 .5em 1.4em rgba(0,0,0,.4) !important;
        }

        /* ===== Развёрнутый список: источники / сезоны / озвучки ===== */
        .mo-grid { margin-bottom: 1.8em !important; }

        .mo-opt__in {
          min-height: 3.6em !important;
          padding: .8em 1.1em !important;
          border-radius: 1em !important;
          background: rgba(255,255,255,.08) !important;
          transition: transform .15s ease, box-shadow .15s ease, background .15s ease;
        }
        .mo-opt__label { font-size: 1.1em !important; }
        .mo-opt__tag {
          border-radius: .5em !important;
          background: rgba(124,196,255,.28) !important;
          color: #dff0ff !important;
        }
        .mo-opt.focus .mo-opt__in {
          background: #fff !important;
          color: #0b0d10 !important;
          transform: scale(1.045);
          box-shadow: 0 0 0 .16em #7cc4ff, 0 .6em 1.6em rgba(0,0,0,.45) !important;
        }
        .mo-opt.focus .mo-opt__tag { background: rgba(0,0,0,.14) !important; color: inherit !important; }
        .mo-opt--active .mo-opt__in { box-shadow: inset 0 0 0 .16em #7cc4ff !important; }
        .mo-opt--active.focus .mo-opt__in {
          box-shadow: inset 0 0 0 .16em #7cc4ff, 0 0 0 .16em #7cc4ff, 0 .6em 1.6em rgba(0,0,0,.45) !important;
        }

        /* ===== Плитки серий ===== */
        .mo-tile__art {
          border-radius: .6em !important;
          transition: transform .15s ease, box-shadow .15s ease;
        }
        .mo-tile__num {
          font-size: 1.1em !important;
          background: rgba(124,196,255,.9) !important;
          color: #0b0d10 !important;
          border-radius: .4em !important;
        }
        .mo-tile__tag { background: rgba(0,0,0,.65) !important; }
        .mo-tile__title { font-size: 1.1em !important; }
        .mo-tile.focus .mo-tile__art {
          transform: scale(1.045);
          box-shadow: 0 0 0 .2em #fff, 0 0 0 .38em #7cc4ff, 0 .7em 1.8em rgba(0,0,0,.5) !important;
          position: relative;
          z-index: 2;
        }
        .mo-tile--current .mo-tile__art { box-shadow: 0 0 0 .16em #7cc4ff !important; }
        .mo-tile.focus.mo-tile--current .mo-tile__art {
          box-shadow: 0 0 0 .2em #fff, 0 0 0 .38em #7cc4ff, 0 .7em 1.8em rgba(0,0,0,.5) !important;
        }

        /* ===== Строки источников / переводов ===== */
        .mo-line {
          padding: .9em 1.3em .9em .8em !important;
          border-radius: .6em !important;
          transition: transform .15s ease, box-shadow .15s ease, background .15s ease;
        }
        .mo-line__title { font-size: 1.2em !important; }
        .mo-line__tag { border-radius: .5em !important; background: rgba(124,196,255,.28) !important; }
        .mo-line--current {
          background: rgba(124,196,255,.12) !important;
          box-shadow: inset .2em 0 0 #7cc4ff !important;
        }
        .mo-line.focus {
          transform: scale(1.02);
          box-shadow: 0 0 0 .14em #7cc4ff, 0 .5em 1.4em rgba(0,0,0,.4) !important;
        }
        .mo-line.focus .mo-line__tag { background: rgba(0,0,0,.14) !important; }

        /* ===== Шапка "сейчас смотрим" ===== */
        .mo-head__art { width: 5.4em !important; height: 7.8em !important; border-radius: .5em !important; }
        .mo-head__title { font-size: 1.9em !important; }
        .mo-head__bar { height: .3em !important; }
        .mo-head__fill { background: linear-gradient(90deg, #7cc4ff, #a6d8ff) !important; }

        /* ===== Загрузка / служебные экраны ===== */
        .mo-wait__fill { background: linear-gradient(90deg, #7cc4ff, #a6d8ff) !important; }
        .mo-act {
          border-radius: 2.4em !important;
          transition: transform .15s ease, box-shadow .15s ease;
        }
        .mo-act.focus {
          transform: scale(1.06);
          box-shadow: 0 0 0 .14em #7cc4ff !important;
        }

        /* ===== Классический режим: тот же selectbox для источника / сезона / озвучки ===== */
        /* Класс "wtch-source-select" навешивается только на экране lampac_z, */
        /* остальные меню приложения (настройки и т.д.) не затрагиваются.   */
        .wtch-source-select.selectbox { border-radius: 1em !important; }
        .wtch-source-select .selectbox__title { font-size: 1.3em !important; font-weight: 600 !important; }
        .wtch-source-select .selectbox-item {
          min-height: 3.4em !important;
          padding: .8em 1.2em !important;
          border-radius: .8em !important;
          margin-bottom: .3em !important;
          transition: transform .15s ease, box-shadow .15s ease, background .15s ease;
        }
        .wtch-source-select .selectbox-item.focus {
          background: #fff !important;
          color: #0b0d10 !important;
          transform: scale(1.03);
          box-shadow: 0 0 0 .14em #7cc4ff, 0 .5em 1.2em rgba(0,0,0,.4) !important;
        }
      `;

      document.head.appendChild(style);
    });
  }

  // =========================================================
  // 4.7. Быстрый выбор источника в классическом режиме
  // =========================================================
  //
  // На экране lampac_z кнопка смены источника ("filter--sort") в
  // классическом режиме спрятана — до неё в оригинале можно добраться
  // только окольным путём. Модуль на основе z01.lampac-src-filter.js
  // добавляет её отдельным пунктом прямо в стандартное меню фильтра,
  // а заодно помечает выезжающее меню классом для темы из п. 4.6.

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

        var active = safe(function () {
          return Lampa.Activity.active();
        });

        if (!active || String(active.component).toLowerCase() !== 'lampac_z') return;

        // Метим меню экрана lampac_z своим классом — тема из installSourceSkin()
        // применяется только к нему и не трогает остальные меню приложения.
        $('body > .selectbox').addClass('wtch-source-select');

        var $filterTitle = $('.selectbox__title');

        if ($filterTitle.length !== 1 || $filterTitle.text() !== Lampa.Lang.translate('title_filter')) {
          return;
        }

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

    source_filter_shortcut: true

  };

})();