(function () {
  'use strict';

  if (window.lampa_wtch_unified_v1) return;
  window.lampa_wtch_unified_v1 = true;

  var VERSION = '1.5.0';

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
  // WTCH строит экран через встроенный в саму Lampa класс
  // Lampa.Filter. Он рисует две кнопки: "Фильтр" (открывает список
  // "Сброс / Озвучка / Сезон", класс кнопки — .filter--filter) и
  // "Источник" (список балансеров, класс кнопки — .filter--sort,
  // подписан через Lampa.Lang.translate('lampac_balanser')).
  // Внутри "Фильтра" пункты "Сезон" и "Озвучка" — это вложенные
  // списки: выбор строки открывает ещё один список поверх текущего.
  //
  // Здесь в каждый из трёх списков (верхний "Фильтр", вложенный
  // "Сезон", вложенный "Озвучка") добавляется быстрый переход в
  // соседние разделы — без выхода на экран и без повторного поиска
  // нужной кнопки пультом. Переход в "Источник" — прямой клик по
  // кнопке .filter--sort (как в примере для lampac_z). Переход
  // между "Сезон" и "Озвучка" — кнопка .filter--filter открывает
  // верхний список, а плагин сразу же выбирает в нём нужную строку.
  //
  // Всё завязано на точные названия из online.js WTCH, поэтому
  // работает прицельно только на экране этого источника (component
  // === 'wtch') и ничего не трогает в остальной Lampa.

  function installQuickFilterNav() {
    if (window.lampa_wtch_quickfilter_installed) return;
    window.lampa_wtch_quickfilter_installed = true;

    if (
      !window.Lampa ||
      !window.Lampa.Controller ||
      !window.Lampa.Controller.listener ||
      !window.Lampa.Template ||
      !window.Lampa.Lang ||
      typeof window.$ === 'undefined'
    ) {
      return;
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

    // Находим кнопки "Источник" (.filter--sort) и "Фильтр" —
    // последнюю ищем по остаточному принципу среди кнопок фильтра,
    // исключая уже известные .filter--sort и .filter--search,
    // на случай если явного класса .filter--filter не найдётся.
    function qfFindButtons(root) {
      var scope = root || document;
      var result = {};

      var sortBtn = safe(function () { return scope.querySelector('.filter--sort'); });

      var filterBtn = safe(function () { return scope.querySelector('.filter--filter'); });

      if (!filterBtn) {
        filterBtn = safe(function () {
          var candidates = scope.querySelectorAll('.simple-button--filter, [data-action="filter"]');
          for (var i = 0; i < candidates.length; i++) {
            var el = candidates[i];
            if (el.classList.contains('filter--sort')) continue;
            if (el.classList.contains('filter--search')) continue;
            return el;
          }
          return null;
        });
      }

      if (sortBtn && !sortBtn.classList.contains('hide') && sortBtn.offsetParent !== null) {
        result.source = sortBtn;
      }
      if (filterBtn && !filterBtn.classList.contains('hide') && filterBtn.offsetParent !== null) {
        result.filter = filterBtn;
      }

      return result;
    }

    // Текущее выбранное значение кнопки (например, название
    // балансера) — в разметке Lampa.Filter лежит в <div>, подпись
    // категории — в <span>. Если структура окажется иной, просто
    // используем весь текст кнопки.
    function qfButtonValue(el) {
      var text = safe(function () { return $(el).find('div').first().text(); }) || '';
      text = text.replace(/\s+/g, ' ').trim();
      if (!text) text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      return text;
    }

    function qfBuildItem(title, subtitle, onEnter) {
      var $item = Lampa.Template.get('selectbox_item', {
        title: title,
        subtitle: subtitle || ''
      });

      $item.addClass('qf-item');
      $item.on('hover:enter', onEnter);

      return $item;
    }

    // Открывает верхний список "Фильтр" и сразу выбирает в нём
    // вложенный пункт по названию (Сезон / Озвучка).
    function qfOpenFilterSubcategory(filterBtn, label) {
      $(filterBtn).trigger('hover:enter');

      setTimeout(function () {
        safe(function () {
          var $sb = $('body > .selectbox');
          if (!$sb.length) return;

          var needle = String(label || '').toLowerCase();
          if (!needle) return;

          var $target = $sb.find('.selectbox-item').filter(function () {
            return $(this).text().toLowerCase().indexOf(needle) !== -1;
          }).first();

          if ($target.length) $target.trigger('hover:enter');
        });
      }, 0);
    }

    function qfInject($selectbox, items) {
      if (!items.length) return;

      var $list = $selectbox.find('.scroll__body').first();
      if (!$list.length) return;
      if ($list.find('.qf-item').length) return;

      qfInjectStyle();

      var $group = $();
      for (var i = 0; i < items.length; i++) $group = $group.add(items[i]);
      $group = $group.add('<div class="qf-divider"></div>');

      var $anchor = $list.find('.selectbox-item').first();

      if ($anchor.length) $anchor.before($group);
      else $list.prepend($group);

      Lampa.Controller.collectionSet($list);
    }

    Lampa.Controller.listener.follow('toggle', function (event) {
      if (event.name !== 'select') return;

      safe(function () {
        var active = Lampa.Activity.active();
        if (!active || active.component !== 'wtch') return;

        var root = document;
        if (active.activity && typeof active.activity.render === 'function') {
          var rendered = active.activity.render();
          if (rendered && rendered[0]) root = rendered[0];
        }

        var buttons = qfFindButtons(root);
        if (!buttons.source && !buttons.filter) return;

        var $selectbox = $('body > .selectbox');
        if ($selectbox.length !== 1) return;

        var $sbTitle = $selectbox.find('.selectbox__title');
        var titleText = ($sbTitle.length ? $sbTitle.text() : '').toLowerCase().trim();

        var titleFilter = String(Lampa.Lang.translate('title_filter') || '').toLowerCase();
        var titleVoice = String(Lampa.Lang.translate('torrent_parser_voice') || '').toLowerCase();
        var titleSeason = String(Lampa.Lang.translate('torrent_serial_season') || '').toLowerCase();
        var labelSource = Lampa.Lang.translate('settings_rest_source') || 'Источник';

        var items = [];

        function addSourceItem() {
          if (!buttons.source) return;
          items.push(qfBuildItem(labelSource, qfButtonValue(buttons.source), function () {
            $(buttons.source).trigger('hover:enter');
          }));
        }

        if (titleText && titleFilter && titleText.indexOf(titleFilter) !== -1) {
          // Открыт верхний список "Фильтр" — добавляем быстрый
          // переход к источнику (Сезон/Озвучка тут и так уже видны).
          addSourceItem();
        } else if (titleText && titleVoice && titleText.indexOf(titleVoice) !== -1) {
          // Открыт вложенный список "Озвучка".
          if (buttons.filter) {
            items.push(qfBuildItem(Lampa.Lang.translate('torrent_serial_season'), '', function () {
              qfOpenFilterSubcategory(buttons.filter, Lampa.Lang.translate('torrent_serial_season'));
            }));
          }
          addSourceItem();
        } else if (titleText && titleSeason && titleText.indexOf(titleSeason) !== -1) {
          // Открыт вложенный список "Сезон".
          if (buttons.filter) {
            items.push(qfBuildItem(Lampa.Lang.translate('torrent_parser_voice'), '', function () {
              qfOpenFilterSubcategory(buttons.filter, Lampa.Lang.translate('torrent_parser_voice'));
            }));
          }
          addSourceItem();
        }

        if (items.length) qfInject($selectbox, items);
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