(function () {
  'use strict';

  if (window.lampa_wtch_unified_v1) return;
  window.lampa_wtch_unified_v1 = true;

  var VERSION = '1.3.1';

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

      /* WTCH скрыта визуально,
         но остаётся в DOM и сохраняет обработчики */
      .wtch--button.lampa-wtch-proxy-hidden {
        display: none !important;
      }
    `;

    document.head.appendChild(style);
  }

  // =========================================================
  // 2. Физически удаляем ненужные элементы
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
  // 2.5. WTCH -> прокси через кнопку "Смотреть"
  // =========================================================

  var WTCH_DEBUG = true;

  function wtchLog() {
    if (!WTCH_DEBUG || !window.console) return;

    try {
      console.log.apply(
        console,
        ['[wtch-fix]'].concat(
          Array.prototype.slice.call(arguments)
        )
      );
    } catch (e) {}
  }

  // ---------------------------------------------------------
  // Получаем актуальную WTCH кнопку
  // ---------------------------------------------------------

  function getCurrentWtchButton() {
    return safe(function () {
      var buttons = document.querySelectorAll(
        '.wtch--button'
      );

      return buttons.length
        ? buttons[0]
        : null;
    });
  }

  // ---------------------------------------------------------
  // Запускаем родное действие WTCH
  // ---------------------------------------------------------

  function triggerWtchButton(wtchBtn) {
    // Если WTCH уже была заменена Lampa после перерисовки,
    // получаем новую кнопку из DOM.
    if (
      !wtchBtn ||
      !document.documentElement.contains(wtchBtn)
    ) {
      wtchBtn = getCurrentWtchButton();
    }

    if (!wtchBtn) {
      wtchLog('WTCH button not found');
      return false;
    }

    return safe(function () {
      wtchLog('trigger WTCH button');

      // Lampa использует hover:enter для выбора элементов
      // с пульта / клавиатуры / навигации.
      if (window.$) {
        var $btn = window.$(wtchBtn);

        try {
          $btn.trigger('hover:enter');
          return true;
        } catch (e) {}

        // Запасной вариант.
        try {
          $btn.trigger('click');
          return true;
        } catch (e) {}
      }

      // Обычный DOM click.
      if (
        typeof wtchBtn.click === 'function'
      ) {
        wtchBtn.click();
        return true;
      }

      return false;
    }) || false;
  }

  // ---------------------------------------------------------
  // Скрываем WTCH, но не удаляем её
  // ---------------------------------------------------------

  function hideWtchButton(wtchBtn) {
    if (!wtchBtn) return;

    safe(function () {
      wtchBtn.classList.add(
        'lampa-wtch-proxy-hidden'
      );

      wtchBtn.setAttribute(
        'aria-hidden',
        'true'
      );
    });
  }

  // ---------------------------------------------------------
  // Привязываем "Смотреть" к WTCH
  // ---------------------------------------------------------

  function bindWtchProxy(
    playBtn,
    wtchBtn
  ) {
    if (!playBtn || !wtchBtn) return;

    safe(function () {
      // Уже привязана.
      if (
        playBtn.dataset.wtchProxyBound === '1'
      ) {
        return;
      }

      playBtn.dataset.wtchProxyBound = '1';

      // -----------------------------------------------------
      // Обычный клик / тап
      // -----------------------------------------------------

      playBtn.addEventListener(
        'click',
        function (event) {

          event.preventDefault();
          event.stopImmediatePropagation();

          triggerWtchButton(
            getCurrentWtchButton()
          );

        },
        true
      );

      // -----------------------------------------------------
      // Enter / Space
      // -----------------------------------------------------

      playBtn.addEventListener(
        'keydown',
        function (event) {

          var key = event.key;

          if (
            key === 'Enter' ||
            key === ' ' ||
            key === 'Spacebar'
          ) {

            event.preventDefault();
            event.stopImmediatePropagation();

            triggerWtchButton(
              getCurrentWtchButton()
            );
          }

        },
        true
      );

      // -----------------------------------------------------
      // Родное событие Lampa hover:enter
      // -----------------------------------------------------

      if (window.$) {

        var $play =
          window.$(playBtn);

        $play.off(
          'hover:enter.wtchProxy'
        );

        $play.on(
          'hover:enter.wtchProxy',
          function (event) {

            if (
              event &&
              event.preventDefault
            ) {
              event.preventDefault();
            }

            triggerWtchButton(
              getCurrentWtchButton()
            );
          }
        );
      }

      wtchLog(
        'WTCH proxy bound to Смотреть'
      );
    });
  }

  // =========================================================
  // 3. Защита кнопки "Смотреть"
  // =========================================================
  //
  // .full-start__button.selector.button--play
  //
  // Запрещаем:
  //
  // .hide
  // style="display:none"
  //
  // Lampa может добавлять их повторно,
  // поэтому следим MutationObserver.

  function protectPlayButton(root) {
    var scope = root || document;

    safe(function () {

      var playButtons =
        scope.querySelectorAll(
          '.full-start__button.selector.button--play'
        );

      for (
        var i = 0;
        i < playButtons.length;
        i++
      ) {

        var button =
          playButtons[i];

        // -----------------------------------------------
        // Запрещаем класс hide
        // -----------------------------------------------

        if (
          button.classList &&
          button.classList.contains('hide')
        ) {

          button.classList.remove(
            'hide'
          );

          wtchLog(
            'removed .hide from .full-start__button.selector.button--play'
          );
        }

        // -----------------------------------------------
        // Запрещаем display:none
        // -----------------------------------------------

        if (
          button.style &&
          button.style.display === 'none'
        ) {

          button.style.removeProperty(
            'display'
          );

          wtchLog(
            'removed inline display:none from .full-start__button.selector.button--play'
          );
        }
      }
    });
  }

  // =========================================================
  // 4. Связываем "Смотреть" и WTCH
  // =========================================================

  function preferWtchButton(root) {

    var scope =
      root || document;

    safe(function () {

      var playButtons =
        scope.querySelectorAll(
          '.full-start__button.selector.button--play'
        );

      var wtchButtons =
        scope.querySelectorAll(
          '.wtch--button'
        );

      wtchLog(
        'button--play count =',
        playButtons.length,
        ', wtch--button count =',
        wtchButtons.length
      );

      // "Смотреть" должна быть видимой.
      protectPlayButton(scope);

      // WTCH прячем,
      // но НЕ удаляем из DOM.
      for (
        var j = 0;
        j < wtchButtons.length;
        j++
      ) {
        hideWtchButton(
          wtchButtons[j]
        );
      }

      // Первый WTCH обработчик является
      // источником действия для "Смотреть".
      if (wtchButtons.length) {

        for (
          var i = 0;
          i < playButtons.length;
          i++
        ) {

          bindWtchProxy(
            playButtons[i],
            wtchButtons[0]
          );
        }
      }
    });
  }

  // =========================================================
  // 5. Отключаем торренты
  // =========================================================

  function disableTorrentSetting() {

    safe(function () {

      if (window.lampa_settings) {
        window.lampa_settings.torrents_use =
          false;
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
          window.lampa_settings.torrents_use =
            false;
        }

      }

    });
  }

  // =========================================================
  // 6. Отключаем Showy PRO
  // =========================================================

  function installShowyProGuards() {

    if (
      window.lampa_wtch_showy_guard_installed
    ) {
      return;
    }

    window.lampa_wtch_showy_guard_installed =
      true;

    safe(function () {

      if (!window.ShowyMarketingRuntime) {

        window.ShowyMarketingRuntime = {

          start: function () {},

          context: function () {},

          trackLinkResolved:
            function () {},

          createWtchInvoice:
            function () {
              return false;
            },

          registerSourceAdapter:
            function () {
              return false;
            },

          sourceBase:
            function (base) {
              return base;
            },

          rewriteSourceUrl:
            function (url) {
              return url;
            },

          ensureInlinePro:
            function (
              pro,
              success
            ) {

              if (
                typeof success ===
                'function'
              ) {

                success({
                  base: '',
                  verified: false,
                  changed: false
                });

              }
            },

          isInlineProActive:
            function () {
              return false;
            }
        };
      }
    });

    safe(function () {

      if (
        !window.ShowyProEntryBanner
      ) {

        window.ShowyProEntryBanner = {

          attach: function () {

            return {

              mount:
                function () {},

              destroy:
                function () {},

              ensure:
                function () {}
            };
          },

          version:
            'disabled-by-guard'
        };
      }
    });
  }

  // =========================================================
  // 7. Следим за интерфейсом Lampa
  // =========================================================

  function installUiCleaner() {

    if (
      window.lampa_wtch_unified_ui_cleaner
    ) {
      return;
    }

    window.lampa_wtch_unified_ui_cleaner =
      true;

    // -------------------------------------------------------
    // Lampa full
    // -------------------------------------------------------

    safe(function () {

      if (
        window.Lampa &&
        window.Lampa.Listener
      ) {

        Lampa.Listener.follow(
          'full',
          function (e) {

            if (
              e.type === 'complite' ||
              e.type === 'complete'
            ) {

              setTimeout(
                function () {

                  var root =
                    document;

                  safe(function () {

                    if (
                      e.object &&
                      e.object.activity &&
                      typeof e.object.activity.render ===
                        'function'
                    ) {

                      root =
                        e.object.activity.render();
                    }

                  });

                  removeUnwantedUI(
                    root
                  );

                  // Возвращаем "Смотреть".
                  protectPlayButton(
                    root
                  );

                  // Прячем WTCH
                  // и связываем с "Смотреть".
                  preferWtchButton(
                    root
                  );

                },
                50
              );
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
      !window.lampa_wtch_unified_observer
    ) {

      window.lampa_wtch_unified_observer =
        new MutationObserver(
          function () {

            removeUnwantedUI(
              document
            );

            // Возвращаем видимость "Смотреть".
            protectPlayButton(
              document
            );

            // Прячем WTCH и восстанавливаем
            // связь с "Смотреть".
            preferWtchButton(
              document
            );
          }
        );

      safe(function () {

        window.lampa_wtch_unified_observer.observe(
          document.documentElement,
          {
            childList: true,
            subtree: true,

            attributes: true,

            // Следим и за class, и за style.
            attributeFilter: [
              'class',
              'style'
            ]
          }
        );

      });
    }
  }

  // =========================================================
  // 8. Редизайн плеера
  // =========================================================

  function installPlayerSkin() {

    if (
      window.lampa_wtch_player_skin_installed
    ) {
      return;
    }

    window.lampa_wtch_player_skin_installed =
      true;

    safe(function () {

      if (
        !window.Lampa ||
        !window.Lampa.Player ||
        !window.Lampa.Platform ||
        typeof window.$ ===
          'undefined'
      ) {
        return;
      }

      if (
        Lampa.Platform.screen(
          'mobile'
        ) ||
        (
          Lampa.Manifest &&
          Lampa.Manifest.app_digital > 328
        )
      ) {
        return;
      }

      if (
        !document.getElementById(
          'lampa_wtch_player_skin_css'
        )
      ) {

        var style =
          document.createElement(
            'style'
          );

        style.id =
          'lampa_wtch_player_skin_css';

        style.innerHTML =
          '.player-video__overlay{display:none;background:-webkit-gradient(linear,left top,left bottom,from(rgba(0,0,0,0.5)),color-stop(53%,rgba(0,0,0,0.3)),to(rgba(11,13,16,0.8)));background:-webkit-linear-gradient(top,rgba(0,0,0,0.5) 0,rgba(0,0,0,0.3) 53%,rgba(11,13,16,0.8) 100%);background:-moz-linear-gradient(top,rgba(0,0,0,0.5) 0,rgba(0,0,0,0.3) 53%,rgba(11,13,16,0.8) 100%);background:-o-linear-gradient(top,rgba(0,0,0,0.5) 0,rgba(0,0,0,0.3) 53%,rgba(11,13,16,0.8) 100%);background:linear-gradient(to bottom,rgba(0,0,0,0.5) 0,rgba(0,0,0,0.3) 53%,rgba(11,13,16,0.8) 100%);position:absolute;top:0;left:0;width:100%;height:100%}' +

          '.player:not(.iptv) .player-panel,.player:not(.iptv) .player-info,.player:not(.iptv) .player-footer{background:transparent !important;-webkit-backdrop-filter:unset !important;backdrop-filter:unset !important}' +

          '.player:not(.iptv) .player-panel__body,.player:not(.iptv) .player-info__body,.player:not(.iptv) .player-footer__body{padding:0}' +

          '.player:not(.iptv) .player-footer__row{padding:0}' +

          '.player:not(.iptv) .head-backward{display:none !important}' +

          '.player:not(.iptv) .player-info__body{padding-left:0 !important;position:relative}' +

          '.player:not(.iptv) .player-info__name{font-size:1.2em;text-shadow:0 0 .2em rgba(0,0,0,0.5)}' +

          '.player:not(.iptv) .player-info__title{font-size:2.4em;font-weight:600;line-height:1.4;width:60%;text-shadow:0 0 .2em rgba(0,0,0,0.5);overflow:hidden;-o-text-overflow:\'.\';text-overflow:\'.\';display:-webkit-box;-webkit-line-clamp:2;line-clamp:2;-webkit-box-orient:vertical}' +

          '.player:not(.iptv) .player-info__values{text-shadow:0 0 .2em rgba(0,0,0,0.5)}' +

          '.player:not(.iptv) .player-info__values .value--name span{font-weight:600}' +

          '.player:not(.iptv) .player-info__time{position:absolute;top:.8em;right:0}' +

          '.player:not(.iptv) .player-panel .button{padding:.9em;width:3em;height:3em}' +

          '.player:not(.iptv) .player-panel .button.animate-trigger-enter{-webkit-animation:animation-trigger-enter .2s forwards;-moz-animation:animation-trigger-enter .2s forwards;-o-animation:animation-trigger-enter .2s forwards;animation:animation-trigger-enter .2s forwards}' +

          '.player:not(.iptv) .player-panel .button>svg{width:1.2em;height:1.2em}' +

          '.player:not(.iptv) .player-panel .button+.button{margin-left:0}' +

          '.player:not(.iptv) .player-panel__playpause{margin:0;padding:1em !important}' +

          '.player:not(.iptv) .player-panel__playpause:not(.focus){background:rgba(255,255,255,0.1)}' +

          '.player:not(.iptv) .player-panel__quality{-webkit-border-radius:5em !important;border-radius:5em !important;padding:0 1em !important}' +

          '.player:not(.iptv) .player-panel__timeline{margin-bottom:1em}' +

          '.player:not(.iptv) .player-panel__timeline:not(.focus) .player-panel__position>div::after{display:none}' +

          '.player:not(.iptv) .player-panel__line-one{margin-bottom:1em;position:relative;z-index:2;text-shadow:0 0 .2em rgba(0,0,0,0.5)}' +

          '.player:not(.iptv) .player-panel__box-buttons{-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0;display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;background:rgba(255,255,255,0.1);-webkit-border-radius:4em;border-radius:4em}' +

          '.player:not(.iptv) .player-panel__box-buttons+.player-panel__box-buttons{margin-left:.5em}' +

          '.player:not(.iptv) .player-panel__next,.player:not(.iptv) .player-panel__prev{padding:1.1em !important}' +

          '.player:not(.iptv) .player-panel__next>svg,.player:not(.iptv) .player-panel__prev>svg{width:.8em;height:.8em}' +

          '.player:not(.iptv) .player-panel__playlist{text-align:center}' +

          '.player:not(.iptv) .player-panel__playlist>svg{width:1em !important}' +

          '.player:not(.iptv) .player-video__paused,.player:not(.iptv) .player-video__loader{background-color:rgba(255,255,255,0.1)}' +

          '.player:not(.iptv) .player-info__values .value--size span{background:rgba(255,255,255,0.1);-webkit-border-radius:1em;border-radius:1em}' +

          '.player:not(.iptv).player--panel-visible .player-video__overlay{display:block;-webkit-animation:animation-opacity .3s;-moz-animation:animation-opacity .3s;-o-animation:animation-opacity .3s;animation:animation-opacity .3s}' +

          '.normalization{background:rgba(255,255,255,0.1);-webkit-border-radius:1em;border-radius:1em}' +

          '.normalization canvas{-webkit-border-radius:1em;border-radius:1em}' +

          'body.platform--browser .player:not(.iptv) .player-panel__box-buttons,body.platform--browser .player:not(.iptv) .player-panel__playpause:not(.focus),body.platform--browser .player:not(.iptv) .player-info__values .value--size span,' +

          'body.platform--nw .player:not(.iptv) .player-panel__box-buttons,body.platform--nw .player:not(.iptv) .player-panel__playpause:not(.focus),body.platform--nw .player:not(.iptv) .player-info__values .value--size span,' +

          'body.glass--style.platform--apple .player:not(.iptv) .player-panel__box-buttons,body.glass--style.platform--apple .player:not(.iptv) .player-panel__playpause:not(.focus),body.glass--style.platform--apple .player:not(.iptv) .player-info__values .value--size span,' +

          'body.glass--style.platform--apple_tv .player:not(.iptv) .player-panel__box-buttons,body.glass--style.platform--apple_tv .player:not(.iptv) .player-panel__playpause:not(.focus),body.glass--style.platform--apple_tv .player:not(.iptv) .player-info__values .value--size span,' +

          'body.glass--style.platform--android .player:not(.iptv) .player-panel__box-buttons,body.glass--style.platform--android .player:not(.iptv) .player-panel__playpause:not(.focus),body.glass--style.platform--android .player:not(.iptv) .player-info__values .value--size span{-webkit-backdrop-filter:blur(1em);backdrop-filter:blur(1em)}' +

          'body.platform--browser .normalization,body.platform--browser .player-video__paused,body.platform--browser .player-video__loader,' +

          'body.platform--nw .normalization,body.platform--nw .player-video__paused,body.platform--nw .player-video__loader,' +

          'body.glass--style.platform--apple .normalization,body.glass--style.platform--apple .player-video__paused,body.glass--style.platform--apple .player-video__loader,' +

          'body.glass--style.platform--apple_tv .normalization,body.glass--style.platform--apple_tv .player-video__paused,body.glass--style.platform--apple_tv .player-video__loader,' +

          'body.glass--style.platform--android .normalization,body.glass--style.platform--android .player-video__paused,body.glass--style.platform--android .player-video__loader{background-color:rgba(255,255,255,0.1);-webkit-backdrop-filter:blur(1em);backdrop-filter:blur(1em)}';

        document.head.appendChild(
          style
        );
      }

      var render =
        $(Lampa.Player.render());

      var title =
        $(
          '<div class="player-info__title"></div>'
        );

      var value =
        $(
          '<div class="value--name"><span></span></div>'
        );

      render
        .find(
          '.player-video__display'
        )
        .after(
          $(
            '<div class="player-video__overlay"></div>'
          )
        );

      render
        .find(
          '.player-panel__center'
        )
        .find(
          '.button:not(.player-panel__playpause)'
        )
        .remove();

      render
        .find(
          '.player-panel__timeline'
        )
        .before(
          render.find(
            '.player-panel__line-one'
          )
        );

      render
        .find(
          '.player-info .player-info__line'
        )
        .before(
          title
        );

      render
        .find('.value--size')
        .after(
          value
        );

      var box =
        $(
          '<div class="player-panel__box-buttons"></div>'
        );

      var right_panel =
        render.find(
          '.player-panel__right'
        );

      var left_panel =
        render.find(
          '.player-panel__left'
        );

      var right_box_quality =
        box.clone();

      var right_box_main =
        box.clone();

      var right_box_audio =
        box.clone();

      var left_box_main =
        box.clone();

      right_panel.append(
        right_box_audio
      );

      right_panel.append(
        right_box_quality
      );

      right_panel.append(
        right_box_main
      );

      right_box_main.append(
        right_panel.find(
          '.button'
        )
      );

      right_box_quality.append(
        right_panel.find(
          '.player-panel__quality'
        )
      );

      right_box_audio.append(
        right_panel.find(
          '.player-panel__flow'
        )
      );

      right_box_audio.append(
        right_panel.find(
          '.player-panel__subs'
        )
      );

      right_box_audio.append(
        right_panel.find(
          '.player-panel__tracks'
        )
      );

      left_panel.prepend(
        left_box_main
      );

      left_box_main.append(
        left_panel.find(
          '.button'
        )
      );

      Lampa.Player.listener.follow(
        'start',
        function (data) {

          var name =
            data.title;

          var head = '';

          if (!data.iptv) {

            if (data.card) {

              head =
                data.card.title ||
                data.card.name;

            } else if (
              Lampa.Activity.active().movie
            ) {

              head =
                Lampa.Activity.active().movie.title ||
                Lampa.Activity.active().movie.name;
            }
          }

          if (!head) {
            head = name;
          }

          title
            .text(head)
            .toggleClass(
              'hide',
              Boolean(data.iptv)
            );

          render
            .find(
              '.player-info__name'
            )
            .toggleClass(
              'hide',
              true
            );

          value
            .toggleClass(
              'hide',
              Boolean(
                name == head
              )
            )
            .find('span')
            .text(name);
        }
      );
    });
  }

  // =========================================================
  // 9. Загружаем WTCH
  // =========================================================

  function loadWTCH() {

    if (
      window.lampa_wtch_unified_loaded
    ) {
      return;
    }

    window.lampa_wtch_unified_loaded =
      true;

    // http://wtch.ch/m — сам JS.
    var scripts = [
      SCRIPT_URL
    ];

    // Предпочтительный способ Lampa.
    if (
      window.Lampa &&
      window.Lampa.Utils &&
      typeof Lampa.Utils.putScriptAsync ===
        'function'
    ) {

      var result = safe(
        function () {

          Lampa.Utils.putScriptAsync(
            scripts,
            function () {

              window.lampa_wtch_unified_ready =
                true;

            }
          );

          return true;
        }
      );

      if (result) {
        return;
      }
    }

    // Запасной вариант.
    var index = 0;

    function next() {

      if (
        index >= scripts.length
      ) {

        window.lampa_wtch_unified_ready =
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

      script.onload = next;

      script.onerror = next;

      (
        document.head ||
        document.documentElement
      ).appendChild(
        script
      );
    }

    next();
  }

  // =========================================================
  // 10. Запуск
  // =========================================================

  installShowyProGuards();

  loadWTCH();

  function start() {

    injectCSS();

    installUiCleaner();

    disableTorrentSetting();

    installPlayerSkin();

    // Если функция существует — запускаем.
    if (
      typeof installWtchForwarding ===
      'function'
    ) {
      installWtchForwarding();
    }
  }

  // =========================================================
  // 11. Ждём готовность Lampa
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
  // 12. Информация о плагине
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