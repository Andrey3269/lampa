(function () {
  'use strict';

  if (window.lampa_wtch_unified_v1) return;
  window.lampa_wtch_unified_v1 = true;

  var VERSION = '1.3.0';

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
  // 4.7. Z01 SOURCE CENTER — полноценная TV-навигация
  //
  // Использует родной современный интерфейс z01.online: реальные
  // источники, сезоны, озвучки и серии остаются под управлением
  // z01. Мы меняем только представление и добавляем отдельную
  // верхнюю навигацию + память выбранных параметров.
  // =========================================================

  function installSourceCenter() {
    if (window.lampa_wtch_source_center_installed) return;
    window.lampa_wtch_source_center_installed = true;

    var MEMORY_KEY = 'lampa_wtch_source_center_memory';
    var qualityObserver = null;
    var scanTimer = null;

    function storageGet(key, fallback) {
      return safe(function () {
        if (window.Lampa && Lampa.Storage && typeof Lampa.Storage.get === 'function') {
          var value = Lampa.Storage.get(key);
          return value === undefined || value === null ? fallback : value;
        }
        return fallback;
      }) || fallback;
    }

    function storageSet(key, value) {
      safe(function () {
        if (window.Lampa && Lampa.Storage && typeof Lampa.Storage.set === 'function') {
          Lampa.Storage.set(key, value);
        }
      });
    }

    function activeMovie() {
      return safe(function () {
        var activity = Lampa.Activity && Lampa.Activity.active && Lampa.Activity.active();
        return activity && activity.movie ? activity.movie : null;
      });
    }

    function movieKey(movie) {
      if (!movie) return '';
      var value = movie.id || movie.kinopoisk_id || movie.imdb_id || movie.original_title || movie.original_name || movie.title || movie.name;
      return String(value || '').replace(/[^a-zA-Z0-9_:\-.]/g, '_').slice(0, 180);
    }

    function isLampac() {
      return !!safe(function () {
        var activity = Lampa.Activity && Lampa.Activity.active && Lampa.Activity.active();
        return activity && String(activity.component || '').toLowerCase() === 'lampac_z';
      });
    }

    function getMemory(movie) {
      var all = storageGet(MEMORY_KEY, {});
      if (!all || typeof all !== 'object') all = {};
      return all[movieKey(movie)] || {};
    }

    function saveMemory(movie, patch) {
      if (!movie) return;
      var all = storageGet(MEMORY_KEY, {});
      if (!all || typeof all !== 'object') all = {};
      var key = movieKey(movie);
      all[key] = all[key] || {};
      Object.keys(patch || {}).forEach(function (name) {
        if (patch[name] !== undefined && patch[name] !== null && patch[name] !== '') {
          all[key][name] = patch[name];
        }
      });
      storageSet(MEMORY_KEY, all);
    }

    function textOf(node) {
      return ($(node).text() || '').replace(/\s+/g, ' ').trim();
    }

    function qualityFromText(text) {
      text = String(text || '');
      if (/2160\s*p?|4k|uhd/i.test(text)) return '4K';
      if (/1440\s*p?/i.test(text)) return 'QHD';
      if (/1080\s*p?|fhd/i.test(text)) return 'FHD';
      if (/720\s*p?|\bhd\b/i.test(text)) return 'HD';
      if (/576\s*p?|480\s*p?|360\s*p?/i.test(text)) return 'SD';
      return '';
    }

    function seasonNumber(text) {
      var m = String(text || '').match(/\d+/);
      return m ? parseInt(m[0], 10) : 0;
    }

    function currentSource(movie) {
      var value = storageGet('online_balanser', '');
      if (value) return String(value);
      var memory = getMemory(movie);
      return memory.source || '';
    }

    function currentQuality(movie) {
      var memory = getMemory(movie);
      if (memory.quality) return memory.quality;

      var map = storageGet('z01_source_quality', {});
      var source = currentSource(movie);
      if (map && source && map[source]) return map[source];

      return '';
    }

    function getCurrentMo() {
      var found = null;
      $('.mo').each(function () {
        if ($(this).is(':visible')) found = $(this);
      });
      return found;
    }

    function getSegment(mo, key) {
      return mo ? mo.find('.mo-seg[data-mo-focus="' + key + '"]').first() : $();
    }

    function getEpisodeTarget(mo) {
      if (!mo || !mo.length) return $();
      var item = mo.find('.mo-tile.focus, .mo-line.focus, .mo-tile, .mo-line').first();
      return item;
    }

    function triggerSegment(mo, key) {
      var segment = getSegment(mo, key);
      if (!segment.length) return false;
      segment.trigger('hover:enter');
      return true;
    }

    function focusEpisode(mo) {
      var item = getEpisodeTarget(mo);
      if (!item.length) return false;
      safe(function () {
        if (Lampa.Controller && typeof Lampa.Controller.collectionFocus === 'function') {
          Lampa.Controller.collectionFocus(item[0], mo.closest('.scroll').find('.scroll__body')[0] || document.body);
        }
      });
      item.trigger('hover:focus');
      return true;
    }

    function focusFlowItem(item) {
      safe(function () {
        if (Lampa.Controller && typeof Lampa.Controller.collectionFocus === 'function') {
          var root = item.closest('.wtch-source-center')[0] || document.body;
          var scroll = root;
          Lampa.Controller.collectionFocus(item[0], scroll);
        }
      });
    }

    function updateFlow(mo) {
      if (!mo || !mo.length) return;

      var root = mo.find('.wtch-source-center').first();
      if (!root.length) return;

      var movie = activeMovie();
      var memory = getMemory(movie);
      var source = currentSource(movie);
      var quality = currentQuality(movie);

      var sourceSeg = getSegment(mo, 'source');
      var seasonSeg = getSegment(mo, 'season');
      var voiceSeg = getSegment(mo, 'voice');

      var sourceValue = sourceSeg.find('.mo-seg__value').text().trim();
      var seasonValue = seasonSeg.find('.mo-seg__value').text().trim();
      var voiceValue = voiceSeg.find('.mo-seg__value').text().trim();

      if (!sourceValue && source) sourceValue = source;
      if (!seasonValue && memory.season) seasonValue = 'Сезон ' + memory.season;
      if (!voiceValue && memory.voice) voiceValue = memory.voice;
      if (!quality) quality = memory.quality || '';

      var episodes = mo.find('.mo-tile, .mo-line').length;
      var activeEpisode = mo.find('.mo-tile.focus, .mo-line.focus').first();
      var episodeValue = activeEpisode.length ? textOf(activeEpisode.find('.mo-tile__title, .mo-line__title').first()) : '';

      var values = {
        source: sourceValue || 'Автовыбор',
        season: seasonValue || 'Автовыбор',
        voice: voiceValue || 'Автовыбор',
        episode: episodeValue || (episodes ? episodes + ' доступно' : 'Ожидание списка'),
        quality: quality || 'Автовыбор'
      };

      Object.keys(values).forEach(function (key) {
        root.find('[data-wtch-flow-value="' + key + '"]').text(values[key]);
      });

      root.find('[data-wtch-flow-step]').each(function () {
        var step = $(this).attr('data-wtch-flow-step');
        var available = true;
        if (step === 'source') available = sourceSeg.length > 0;
        if (step === 'season') available = seasonSeg.length > 0;
        if (step === 'voice') available = voiceSeg.length > 0;
        if (step === 'episode') available = episodes > 0;
        if (step === 'quality') available = !!$('.player-panel__quality:visible').length || !!values.quality;
        $(this).toggleClass('wtch-source-center__step--disabled', !available);
      });

      root.find('.wtch-source-center__quality-note').text(
        quality ? 'Запомнено для этого источника' : 'Качество выбирается в плеере'
      );
    }

    function buildFlow(mo) {
      if (!mo || !mo.length) return;
      if (mo.find('.wtch-source-center').length) {
        updateFlow(mo);
        return;
      }

      mo.addClass('wtch-source-center-host');

      var flow = $(
        '<div class="wtch-source-center">' +
          '<div class="wtch-source-center__top">' +
            '<div class="wtch-source-center__eyebrow">Z01 ONLINE</div>' +
            '<div class="wtch-source-center__title">Выбор просмотра</div>' +
            '<div class="wtch-source-center__hint">Источник → сезон → озвучка → серия → качество</div>' +
          '</div>' +
          '<div class="wtch-source-center__steps">' +
            '<div class="wtch-source-center__step selector" data-wtch-flow-step="source"><span class="wtch-source-center__num">1</span><span class="wtch-source-center__body"><span class="wtch-source-center__name">Источник</span><span class="wtch-source-center__value" data-wtch-flow-value="source">Автовыбор</span></span></div>' +
            '<div class="wtch-source-center__step selector" data-wtch-flow-step="season"><span class="wtch-source-center__num">2</span><span class="wtch-source-center__body"><span class="wtch-source-center__name">Сезон</span><span class="wtch-source-center__value" data-wtch-flow-value="season">Автовыбор</span></span></div>' +
            '<div class="wtch-source-center__step selector" data-wtch-flow-step="voice"><span class="wtch-source-center__num">3</span><span class="wtch-source-center__body"><span class="wtch-source-center__name">Озвучка</span><span class="wtch-source-center__value" data-wtch-flow-value="voice">Автовыбор</span></span></div>' +
            '<div class="wtch-source-center__step selector" data-wtch-flow-step="episode"><span class="wtch-source-center__num">4</span><span class="wtch-source-center__body"><span class="wtch-source-center__name">Серия</span><span class="wtch-source-center__value" data-wtch-flow-value="episode">Ожидание списка</span></span></div>' +
            '<div class="wtch-source-center__step selector" data-wtch-flow-step="quality"><span class="wtch-source-center__num">5</span><span class="wtch-source-center__body"><span class="wtch-source-center__name">Качество</span><span class="wtch-source-center__value" data-wtch-flow-value="quality">Автовыбор</span><span class="wtch-source-center__quality-note"></span></span></div>' +
          '</div>' +
        '</div>'
      );

      mo.prepend(flow);

      function enterStep(step) {
        if (step === 'source' || step === 'season' || step === 'voice') {
          if (!triggerSegment(mo, step)) {
            Lampa.Noty && Lampa.Noty.show && Lampa.Noty.show('Этот раздел сейчас недоступен');
          }
          return;
        }

        if (step === 'episode') {
          if (!focusEpisode(mo)) {
            Lampa.Noty && Lampa.Noty.show && Lampa.Noty.show('Серии появятся после выбора источника и озвучки');
          }
          return;
        }

        if (step === 'quality') {
          var qualityButton = $('.player-panel__quality:visible').first();
          if (qualityButton.length) {
            qualityButton.trigger('hover:enter');
          } else {
            var movie = activeMovie();
            var q = currentQuality(movie);
            if (q && Lampa.Noty && Lampa.Noty.show) Lampa.Noty.show('Последнее качество: ' + q + '. Откройте плеер для его смены.');
            else if (Lampa.Noty && Lampa.Noty.show) Lampa.Noty.show('Качество выбирается после запуска видео');
          }
        }
      }

      flow.find('[data-wtch-flow-step]').each(function () {
        var item = $(this);
        item.on('hover:enter', function () {
          if (item.hasClass('wtch-source-center__step--disabled')) return;
          enterStep(item.attr('data-wtch-flow-step'));
        });
        item.on('hover:focus', function () {
          item.addClass('wtch-source-center__step--focus');
        });
        item.on('hover:focusout', function () {
          item.removeClass('wtch-source-center__step--focus');
        });
      });

      updateFlow(mo);

      safe(function () {
        if (Lampa.Controller && typeof Lampa.Controller.collectionSet === 'function') {
          var body = mo.closest('.scroll').find('.scroll__body')[0] || document.body;
          Lampa.Controller.collectionSet(body);
        }
      });
    }

    function rememberVisibleState(mo) {
      if (!mo || !mo.length || !isLampac()) return;
      var movie = activeMovie();
      if (!movie) return;

      var source = getSegment(mo, 'source').find('.mo-seg__value').text().trim();
      var season = getSegment(mo, 'season').find('.mo-seg__value').text().trim();
      var voice = getSegment(mo, 'voice').find('.mo-seg__value').text().trim();

      if (source) saveMemory(movie, { source: source });
      if (season) saveMemory(movie, { season: seasonNumber(season) || season });
      if (voice) saveMemory(movie, { voice: voice });
    }

    function observeQuality() {
      if (qualityObserver || !window.MutationObserver) return;

      qualityObserver = new MutationObserver(function () {
        var button = $('.player-panel__quality:visible').first();
        if (!button.length) return;

        var quality = qualityFromText(textOf(button));
        if (!quality) return;

        var movie = activeMovie();
        if (!movie) return;

        var source = currentSource(movie);
        saveMemory(movie, { quality: quality, source: source || undefined });

        if (source) {
          var map = storageGet('z01_source_quality', {});
          if (!map || typeof map !== 'object') map = {};
          var rank = { SD: 1, HD: 2, FHD: 3, QHD: 4, '4K': 5 };
          if (!map[source] || (rank[quality] || 0) > (rank[map[source]] || 0)) {
            map[source] = quality;
            storageSet('z01_source_quality', map);
          }
        }
      });

      qualityObserver.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true
      });
    }

    function scan() {
      clearTimeout(scanTimer);
      scanTimer = setTimeout(function () {
        var mo = getCurrentMo();
        if (!mo || !isLampac()) return;
        buildFlow(mo);
        updateFlow(mo);
        rememberVisibleState(mo);
      }, 45);
    }

    safe(function () {
      if (!document.getElementById('lampa_wtch_source_center_css')) {
        var style = document.createElement('style');
        style.id = 'lampa_wtch_source_center_css';
        style.textContent = `
/* =========================================================
   WTCH / Z01 SOURCE CENTER — TV FIRST
   ========================================================= */

.wtch-source-center-host {
  --wtch-bg: #0f1012;
  --wtch-panel: #17191d;
  --wtch-panel-2: #202329;
  --wtch-focus: #ffffff;
  --wtch-text: #f3f4f6;
  --wtch-muted: #8e949e;
  --wtch-line: rgba(255,255,255,.08);
  --wtch-accent: #aeb4bd;
}

.wtch-source-center {
  width: 100%;
  margin: 0 0 1.15em;
  padding: 1.15em;
  background: #15171a;
  border: 1px solid var(--wtch-line);
  border-radius: 18px;
  box-sizing: border-box;
}

.wtch-source-center__top {
  margin-bottom: .85em;
}

.wtch-source-center__eyebrow {
  font-size: .72em;
  font-weight: 800;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: #777d86;
}

.wtch-source-center__title {
  margin-top: .18em;
  font-size: 1.6em;
  line-height: 1.18;
  font-weight: 750;
  color: #f5f6f7;
}

.wtch-source-center__hint {
  margin-top: .35em;
  font-size: .86em;
  color: #858b94;
}

.wtch-source-center__steps {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: .55em;
}

.wtch-source-center__step {
  position: relative;
  min-height: 4.1em;
  display: flex;
  align-items: center;
  gap: .7em;
  padding: .65em .75em;
  background: #1c1f23;
  border: 1px solid transparent;
  border-radius: 12px;
  box-sizing: border-box;
}

.wtch-source-center__step--focus,
.wtch-source-center__step.focus {
  background: #f3f4f5;
  color: #0d0e10;
  border-color: #fff;
}

.wtch-source-center__step--disabled {
  opacity: .38;
}

.wtch-source-center__num {
  flex: 0 0 auto;
  width: 1.7em;
  height: 1.7em;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  background: #2b2f35;
  color: #d9dce0;
  font-size: .76em;
  font-weight: 800;
}

.wtch-source-center__step--focus .wtch-source-center__num,
.wtch-source-center__step.focus .wtch-source-center__num {
  background: #121316;
  color: #fff;
}

.wtch-source-center__body {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.wtch-source-center__name {
  font-size: .68em;
  line-height: 1.1;
  text-transform: uppercase;
  letter-spacing: .04em;
  color: #7f858e;
}

.wtch-source-center__step--focus .wtch-source-center__name,
.wtch-source-center__step.focus .wtch-source-center__name {
  color: #5d6269;
}

.wtch-source-center__value {
  margin-top: .16em;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: .9em;
  line-height: 1.2;
  font-weight: 680;
}

.wtch-source-center__quality-note {
  margin-top: .14em;
  font-size: .6em;
  color: #777d86;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Основная z01-панель */
.wtch-source-center-host .mo-panel {
  gap: .55em;
  margin-bottom: 1em;
}

.wtch-source-center-host .mo-seg {
  flex: 1 1 15em;
  min-width: 14em;
  max-width: none;
  min-height: 4.2em;
  margin: 0;
  padding: .72em 2.5em .72em 1em;
  background: #191b1f;
  border: 1px solid transparent;
  border-radius: 12px;
}

.wtch-source-center-host .mo-seg.focus {
  background: #f3f4f5;
  color: #0e0f11;
  border-color: #fff;
}

.wtch-source-center-host .mo-seg--open {
  background: #282c32;
}

.wtch-source-center-host .mo-seg__name {
  font-size: .68em;
  opacity: .6;
  font-weight: 700;
}

.wtch-source-center-host .mo-seg__value {
  margin-top: .14em;
  font-size: 1.05em;
  font-weight: 720;
}

.wtch-source-center-host .mo-grid {
  margin: 0 -.3em 1em;
}

.wtch-source-center-host .mo-opt {
  width: 25%;
}

.wtch-source-center-host .mo-opt__in {
  min-height: 4.25em;
  padding: .78em .85em;
  background: #191b1f;
  border: 1px solid transparent;
  border-radius: 12px;
}

.wtch-source-center-host .mo-opt.focus .mo-opt__in {
  background: #f3f4f5;
  color: #0e0f11;
  border-color: #fff;
}

.wtch-source-center-host .mo-opt--active .mo-opt__in {
  box-shadow: inset 0 0 0 2px #888f99;
}

.wtch-source-center-host .mo-opt.focus.mo-opt--active .mo-opt__in {
  box-shadow: none;
}

.wtch-source-center-host .mo-opt__label {
  font-size: .95em;
  font-weight: 680;
}

.wtch-source-center-host .mo-opt__note {
  margin-top: .22em;
  font-size: .75em;
  color: #7f858e;
}

.wtch-source-center-host .mo-opt.focus .mo-opt__note {
  color: #62676f;
}

.wtch-source-center-host .mo-opt__tag {
  background: #30343a;
  border-radius: 6px;
  padding: .16em .42em;
  font-size: .65em;
  font-weight: 800;
}

/* Серии */
.wtch-source-center-host .mo-tiles {
  margin: 0 -.35em;
}

.wtch-source-center-host .mo-tile {
  width: 25%;
  padding: 0 .35em .8em;
}

.wtch-source-center-host .mo-tile__art {
  border-radius: 11px;
  background: #1b1d21;
}

.wtch-source-center-host .mo-tile.focus .mo-tile__art {
  box-shadow: 0 0 0 .2em #fff;
}

.wtch-source-center-host .mo-tile--current .mo-tile__art {
  box-shadow: 0 0 0 .16em #8c929a;
}

.wtch-source-center-host .mo-tile__body {
  padding: .45em .12em 0;
}

.wtch-source-center-host .mo-tile__title {
  font-size: .96em;
  font-weight: 650;
}

.wtch-source-center-host .mo-tile__meta {
  color: #777d86;
}

/* Список серий на узком ТВ */
.wtch-source-center-host .mo-line {
  min-height: 4.6em;
  padding: .65em .85em;
  background: #191b1f;
  border-radius: 11px;
  border: 1px solid transparent;
}

.wtch-source-center-host .mo-line.focus {
  background: #f3f4f5;
  color: #0d0e10;
  border-color: #fff;
}

/* Заголовок фильма */
.wtch-source-center-host .mo-head {
  padding: 0 0 .9em;
}

.wtch-source-center-host .mo-head__title {
  font-size: 1.7em;
  font-weight: 750;
}

.wtch-source-center-host .mo-head__note {
  margin-top: .25em;
  color: #9298a1;
}

@media screen and (max-width: 1100px) {
  .wtch-source-center__steps {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .wtch-source-center-host .mo-opt {
    width: 33.333%;
  }
  .wtch-source-center-host .mo-tile {
    width: 33.333%;
  }
}

@media screen and (max-width: 720px) {
  .wtch-source-center__steps {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .wtch-source-center-host .mo-opt,
  .wtch-source-center-host .mo-tile {
    width: 50%;
  }
}

@media screen and (max-width: 480px) {
  .wtch-source-center__steps {
    grid-template-columns: 1fr;
  }
  .wtch-source-center-host .mo-opt,
  .wtch-source-center-host .mo-tile {
    width: 100%;
  }
}
        `;
        document.head.appendChild(style);
      }
    });

    observeQuality();

    safe(function () {
      if (window.Lampa && Lampa.Listener) {
        Lampa.Listener.follow('full', function (event) {
          if (event.type === 'complite' || event.type === 'complete' || event.type === 'start') {
            scan();
          }
        });
      }

      if (Lampa.Controller && Lampa.Controller.listener) {
        Lampa.Controller.listener.follow('toggle', function (event) {
          if (event && event.name === 'select') scan();
          if (event && event.name === 'content') scan();
        });
      }
    });

    safe(function () {
      if (window.MutationObserver) {
        var observer = new MutationObserver(function (mutations) {
          var relevant = false;
          for (var i = 0; i < mutations.length; i++) {
            if (mutations[i].addedNodes && mutations[i].addedNodes.length) {
              relevant = true;
              break;
            }
          }
          if (relevant) scan();
        });
        observer.observe(document.body, { childList: true, subtree: true });
      }
    });

    // Первая попытка после старта приложения.
    setTimeout(scan, 800);
    setTimeout(scan, 1800);
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

    installSourceCenter();
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

    player_skin: true

  };

})();