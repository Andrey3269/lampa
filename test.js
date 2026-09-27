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
  // 4.6. Быстрый переключатель Источник / Сезон / Озвучка
  // =========================================================
  //
  // Идея подсмотрена в плагине-примере для компонента lampac_z:
  // находясь внутри любого всплывающего списка (например "Фильтр"
  // или "Озвучка"), можно одним нажатием перейти в любой другой
  // список выбора, не возвращаясь на экран и не разыскивая нужную
  // кнопку среди остальных.
  //
  // Отличие от примера: здесь это сделано универсально — плагин
  // сам находит на экране кнопки "Источник", "Сезон" и "Озвучка"
  // по их подписи, без привязки к имени компонента и к точным
  // CSS-классам конкретного онлайн-кинотеатра. Поэтому переключатель
  // должен одинаково работать и в WTCH, и в большинстве других
  // источников с похожим интерфейсом. Если конкретная кнопка не
  // находится — соответствующий пункт быстрого меню просто не
  // появляется, остальной интерфейс не ломается.
  //
  // Если после установки какой-то из трёх пунктов не подхватился —
  // скорее всего, у WTCH другая подпись на кнопке. Тогда достаточно
  // дописать нужное слово в массив QF_KEYWORDS ниже.

  function installQuickFilterNav() {
    if (window.lampa_wtch_quickfilter_installed) return;
    window.lampa_wtch_quickfilter_installed = true;

    if (
      !window.Lampa ||
      !window.Lampa.Controller ||
      !window.Lampa.Controller.listener ||
      !window.Lampa.Template ||
      typeof window.$ === 'undefined'
    ) {
      return;
    }

    // Какие категории показывать в быстром меню.
    // При желании можно включить качество/субтитры, поставив true.
    var QF_ENABLED = {
      source: true,
      season: true,
      voice: true,
      quality: false,
      subtitles: false
    };

    var QF_LABEL = {
      source: 'Источник',
      season: 'Сезон',
      voice: 'Озвучка',
      quality: 'Качество',
      subtitles: 'Субтитры'
    };

    var QF_ICON = {
      source: '🌐',
      season: '🎬',
      voice: '🎙',
      quality: '💎',
      subtitles: '💬'
    };

    // Ключевые слова для распознавания кнопок по их тексту.
    // Можно дописывать свои варианты через запятую.
    var QF_KEYWORDS = {
      source: ['источник', 'балансер', 'провайдер', 'source', 'provider', 'balancer'],
      season: ['сезон', 'season'],
      voice: ['озвучка', 'перевод', 'дубляж', 'войсовер', 'voice', 'dub', 'translat'],
      quality: ['качество', 'quality'],
      subtitles: ['субтитры', 'subtitles', 'subs']
    };

    var QF_ORDER = ['source', 'season', 'voice', 'quality', 'subtitles'];

    function qfDetect(text) {
      var t = (text || '').toLowerCase();

      for (var i = 0; i < QF_ORDER.length; i++) {
        var key = QF_ORDER[i];

        if (!QF_ENABLED[key]) continue;

        var words = QF_KEYWORDS[key];

        for (var j = 0; j < words.length; j++) {
          if (t.indexOf(words[j]) !== -1) return key;
        }
      }

      return null;
    }

    // Ищем на экране кнопки-фильтры и раскладываем их по категориям.
    function qfFindButtons(root) {
      var scope = root || document;
      var found = {};

      var nodes = safe(function () {
        return scope.querySelectorAll(
          '.simple-button--filter, .full-start__button, [data-action="filter"], .simple-button.selector'
        );
      }) || [];

      for (var i = 0; i < nodes.length; i++) {
        var el = nodes[i];

        if (!el || el.classList.contains('hide')) continue;
        if (el.offsetParent === null) continue;

        var label = (el.textContent || '').replace(/\s+/g, ' ').trim();

        if (!label) continue;

        var cat = qfDetect(label);

        if (cat && !found[cat]) {
          found[cat] = { el: el, label: label };
        }
      }

      return found;
    }

    function qfInjectStyle() {
      if (document.getElementById('lampa_wtch_quickfilter_css')) return;

      var style = document.createElement('style');
      style.id = 'lampa_wtch_quickfilter_css';

      style.innerHTML =
        '.selectbox-item.qf-item{border-left:.2em solid rgba(255,255,255,0.35)}' +
        '.selectbox-item.qf-item.focus{border-left-color:currentColor}' +
        '.qf-divider{height:1px;margin:.5em 1.2em;background:rgba(255,255,255,0.14);pointer-events:none}';

      document.head.appendChild(style);
    }

    Lampa.Controller.listener.follow('toggle', function (event) {
      if (event.name !== 'select') return;

      safe(function () {
        var active = Lampa.Activity.active();

        if (!active) return;

        var root = document;

        if (active.activity && typeof active.activity.render === 'function') {
          var rendered = active.activity.render();
          if (rendered && rendered[0]) root = rendered[0];
        }

        var buttons = qfFindButtons(root);
        var keys = Object.keys(buttons);

        // Нет смысла показывать переключатель, если найдена только
        // одна категория (переключаться некуда).
        if (keys.length < 2) return;

        var $selectbox = $('body > .selectbox');

        if ($selectbox.length !== 1) return;
        if ($selectbox.find('.qf-item').length) return;

        var $sbTitle = $selectbox.find('.selectbox__title');
        var titleText = $sbTitle.length ? $sbTitle.text().trim() : '';
        var currentCat = qfDetect(titleText);

        var $list = $selectbox.find('.scroll__body').first();

        if (!$list.length) return;

        var toAdd = [];

        for (var i = 0; i < QF_ORDER.length; i++) {
          var key = QF_ORDER[i];

          // Не добавляем пункт, ведущий в тот же список, который
          // уже открыт.
          if (key === currentCat) continue;

          if (buttons[key]) toAdd.push(key);
        }

        if (!toAdd.length) return;

        qfInjectStyle();

        var $group = $();

        for (var n = 0; n < toAdd.length; n++) {
          var k = toAdd[n];
          var btn = buttons[k];

          var $item = Lampa.Template.get('selectbox_item', {
            title: QF_ICON[k] + ' ' + QF_LABEL[k],
            subtitle: btn.label
          });

          $item.addClass('qf-item');

          $item.on('hover:enter', (function (targetEl) {
            return function () {
              $(targetEl).trigger('hover:enter');
            };
          })(btn.el));

          $group = $group.add($item);
        }

        $group = $group.add('<div class="qf-divider"></div>');

        var $anchor = $list.find('.selectbox-item').first();

        if ($anchor.length) {
          $anchor.before($group);
        } else {
          $list.prepend($group);
        }

        Lampa.Controller.collectionSet($list);
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

    installQuickFilterNav();
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

    quick_filter_nav: true

  };

})();