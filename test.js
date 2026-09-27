(function () {
  'use strict';

  if (window.lampa_wtch_unified_v1) return;
  window.lampa_wtch_unified_v1 = true;

  var VERSION = '1.4.3';

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
  // 2.5. WTCH вместо стандартной кнопки «Смотреть»
  // =========================================================

  function getButtonText(node) {
    return safe(function () {
      return (node.textContent || '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
    }) || '';
  }

  function isWtchButton(node) {
    return /\bwtch\b/i.test(getButtonText(node));
  }

  function isWatchButton(node) {
    var text = getButtonText(node);
    return text === 'смотреть' || text === 'watch';
  }

  function findWtchButton(root) {
    var scope = root || document;

    var marked = safe(function () {
      return scope.querySelector('[data-lampa-wtch-button="1"]');
    });

    if (marked) return marked;

    var nodes = safe(function () {
      return scope.querySelectorAll(
        '.full-start__button, .button, .selector, button, [role="button"]'
      );
    }) || [];

    for (var i = 0; i < nodes.length; i++) {
      if (isWtchButton(nodes[i])) return nodes[i];
    }

    return null;
  }

  function findNativeWatchButton(wtchButton, root) {
    var candidates = [];
    var scope = root || document;

    var container = safe(function () {
      return wtchButton.closest(
        '.full-start-new__buttons, .full-start__buttons, ' +
        '.full-start__buttons-line, .full-start__actions, .full-start'
      );
    });

    if (!container) container = scope;

    safe(function () {
      var nodes = container.querySelectorAll(
        '.full-start__button, .button, .selector, button, [role="button"]'
      );

      for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];

        if (
          node !== wtchButton &&
          node.getAttribute('data-lampa-wtch-native-hidden') !== '1' &&
          isWatchButton(node)
        ) {
          candidates.push(node);
        }
      }
    });

    for (var j = 0; j < candidates.length; j++) {
      if (candidates[j].querySelector('svg')) return candidates[j];
    }

    return candidates[0] || null;
  }

  function setWtchText(button) {
    if (!button) return;

    safe(function () {
      var walker = document.createTreeWalker(
        button,
        NodeFilter.SHOW_TEXT,
        null
      );

      var textNodes = [];
      var current;

      while ((current = walker.nextNode())) {
        if (
          current.parentElement &&
          !current.parentElement.closest('svg') &&
          /\bwtch\b/i.test(current.nodeValue || '')
        ) {
          textNodes.push(current);
        }
      }

      for (var i = 0; i < textNodes.length; i++) {
        textNodes[i].nodeValue = textNodes[i].nodeValue.replace(
          /wtch/ig,
          'Смотреть'
        );
      }
    });

    // Резерв для тем, где текст лежит внутри span/div.
    safe(function () {
      var labels = button.querySelectorAll(
        'span, div, b, strong, em, small'
      );

      for (var i = 0; i < labels.length; i++) {
        if (
          !labels[i].querySelector('svg') &&
          /\bwtch\b/i.test((labels[i].textContent || '').trim())
        ) {
          labels[i].textContent = 'Смотреть';
          break;
        }
      }
    });
  }

  function focusWtchButton(button, root) {
    if (!button) return false;

    var focused = false;

    // Главный способ для Lampa.
    safe(function () {
      if (typeof Navigator !== 'undefined' && Navigator.focused) {
        Navigator.focused(button);
        focused = true;
      }
    });

    // Запасной способ для сборок, где Navigator ещё не готов.
    if (!focused) {
      safe(function () {
        if (
          window.Lampa &&
          Lampa.Controller &&
          typeof Lampa.Controller.collectionFocus === 'function'
        ) {
          Lampa.Controller.collectionFocus(button, root || document);
          focused = true;
        }
      });
    }

    // В крайнем случае хотя бы ставим визуальный focus.
    if (!focused) {
      safe(function () {
        button.classList.add('focus');
        focused = true;
      });
    }

    return focused;
  }

  function removeNativeWatchButton(nativeButton) {
    if (!nativeButton) return;

    safe(function () {
      nativeButton.classList.remove('focus');
      nativeButton.classList.remove('selected');
      nativeButton.removeAttribute('tabindex');
      nativeButton.setAttribute('aria-hidden', 'true');
      nativeButton.setAttribute(
        'data-lampa-wtch-native-hidden',
        '1'
      );

      // Полностью удаляем старую кнопку из DOM,
      // чтобы Navigator Lampa не держал её текущим selector.
      nativeButton.remove();
    });
  }

  function replaceWtchButton(root, focusNow) {
    var scope = root || document;

    safe(function () {
      var wtchButton = findWtchButton(scope);
      if (!wtchButton) return;

      wtchButton.setAttribute(
        'data-lampa-wtch-button',
        '1'
      );

      wtchButton.classList.add('selector');

      var nativeButton = findNativeWatchButton(
        wtchButton,
        scope
      );

      if (nativeButton) {
        var nativeSvg = nativeButton.querySelector('svg');

        // Берём SVG штатной кнопки «Смотреть».
        if (nativeSvg) {
          var oldSvg = wtchButton.querySelector('svg');

          if (oldSvg) {
            oldSvg.replaceWith(
              nativeSvg.cloneNode(true)
            );
          } else {
            wtchButton.insertBefore(
              nativeSvg.cloneNode(true),
              wtchButton.firstChild
            );
          }
        }

        removeNativeWatchButton(nativeButton);
      }

      setWtchText(wtchButton);

      wtchButton.setAttribute(
        'data-lampa-wtch-watch-replaced',
        '1'
      );

      if (focusNow) {
        focusWtchButton(
          wtchButton,
          scope
        );
      }
    });
  }

  // =========================================================
  // 2.6. Исправление первоначального автофокуса
  // =========================================================

  var wtchInitialFocusCancelled = false;
  var wtchInitialFocusTimer = null;

  function cancelWtchInitialFocus() {
    wtchInitialFocusCancelled = true;

    if (wtchInitialFocusTimer) {
      clearTimeout(wtchInitialFocusTimer);
      wtchInitialFocusTimer = null;
    }
  }

  function installWtchFocusCancel() {
    if (
      window.lampa_wtch_focus_cancel_installed
    ) {
      return;
    }

    window.lampa_wtch_focus_cancel_installed = true;

    // Как только пользователь сам нажал кнопку/стрелку,
    // прекращаем принудительный начальный фокус.
    safe(function () {
      document.addEventListener(
        'keydown',
        function () {
          cancelWtchInitialFocus();
        },
        true
      );
    });

    safe(function () {
      document.addEventListener(
        'click',
        function () {
          cancelWtchInitialFocus();
        },
        true
      );
    });
  }

  function scheduleWtchInitialFocus(root) {
    var scope = root || document;

    installWtchFocusCancel();

    wtchInitialFocusCancelled = false;

    // Lampa может поменять focus спустя несколько десятков
    // или сотен миллисекунд после открытия карточки.
    var delays = [
      0,
      30,
      80,
      150,
      250,
      400,
      650
    ];

    delays.forEach(function (delay) {
      setTimeout(function () {
        safe(function () {
          if (wtchInitialFocusCancelled) return;

          var wtch = findWtchButton(scope);

          // WTCH может загрузиться позже самой карточки.
          if (!wtch) return;

          replaceWtchButton(
            scope,
            false
          );

          wtch = findWtchButton(scope);

          if (!wtch) return;

          // ВАЖНО:
          // ставим начальный focus на WTCH независимо от того,
          // куда Lampa уже успела поставить старый focus.
          focusWtchButton(
            wtch,
            scope
          );
        });
      }, delay);
    });

    wtchInitialFocusTimer = setTimeout(
      function () {
        wtchInitialFocusTimer = null;
      },
      700
    );
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
  // 3.5. Отключаем баннер Showy PRO
  // =========================================================

  function installShowyProGuards() {
    if (
      window.lampa_wtch_showy_guard_installed
    ) {
      return;
    }

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

          ensureInlinePro: function (
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

          version:
            'disabled-by-guard'
        };
      }
    });
  }

  // =========================================================
  // 4. Следим за изменением интерфейса Lampa
  // =========================================================

  function installUiCleaner() {
    if (
      window.lampa_wtch_unified_ui_cleaner
    ) {
      return;
    }

    window.lampa_wtch_unified_ui_cleaner =
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
                      typeof e.object
                        .activity
                        .render ===
                        'function'
                    ) {
                      root =
                        e.object.activity.render();
                    }
                  });

                  removeUnwantedUI(
                    root
                  );

                  replaceWtchButton(
                    root,
                    false
                  );

                  replaceWtchButton(
                    document,
                    false
                  );

                  // Перехватываем начальный focus
                  // после построения коллекции.
                  scheduleWtchInitialFocus(
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

    // MutationObserver нужен потому, что WTCH может
    // догрузиться уже после появления карточки.
    if (
      window.MutationObserver &&
      !window
        .lampa_wtch_unified_observer
    ) {
      window
        .lampa_wtch_unified_observer =
        new MutationObserver(
          function () {
            removeUnwantedUI(
              document
            );

            replaceWtchButton(
              document,
              false
            );

            safe(function () {
              var wtch =
                findWtchButton(
                  document
                );

              if (
                wtch &&
                !wtch.getAttribute(
                  'data-lampa-wtch-focus-scheduled'
                )
              ) {
                wtch.setAttribute(
                  'data-lampa-wtch-focus-scheduled',
                  '1'
                );

                scheduleWtchInitialFocus(
                  document
                );
              }
            });
          }
        );

      safe(function () {
        window
          .lampa_wtch_unified_observer
          .observe(
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
          Lampa.Manifest.app_digital >
            328
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
          'body.platform--browser .player:not(.iptv) .player-panel__box-buttons,body.platform--browser .player:not(.iptv) .player-panel__playpause:not(.focus),body.platform--browser .player:not(.iptv) .player-info__values .value--size span,body.platform--nw .player:not(.iptv) .player-panel__box-buttons,body.platform--nw .player:not(.iptv) .player-panel__playpause:not(.focus),body.platform--nw .player:not(.iptv) .player-info__values .value--size span,body.glass--style.platform--apple .player:not(.iptv) .player-panel__box-buttons,body.glass--style.platform--apple .player:not(.iptv) .player-panel__playpause:not(.focus),body.glass--style.platform--apple .player:not(.iptv) .player-info__values .value--size span,body.glass--style.platform--apple_tv .player:not(.iptv) .player-panel__box-buttons,body.glass--style.platform--apple_tv .player:not(.iptv) .player-panel__playpause:not(.focus),body.glass--style.platform--apple_tv .player:not(.iptv) .player-info__values .value--size span,body.glass--style.platform--android .player:not(.iptv) .player-panel__box-buttons,body.glass--style.platform--android .player:not(.iptv) .player-panel__playpause:not(.focus),body.glass--style.platform--android .player:not(.iptv) .player-info__values .value--size span{-webkit-backdrop-filter:blur(1em);backdrop-filter:blur(1em)}' +
          'body.platform--browser .normalization,body.platform--browser .player-video__paused,body.platform--browser .player-video__loader,body.platform--nw .normalization,body.platform--nw .player-video__paused,body.platform--nw .player-video__loader,body.glass--style.platform--apple .normalization,body.glass--style.platform--apple .player-video__paused,body.glass--style.platform--apple .player-video__loader,body.glass--style.platform--apple_tv .normalization,body.glass--style.platform--apple_tv .player-video__paused,body.glass--style.platform--apple_tv .player-video__loader,body.glass--style.platform--android .normalization,body.glass--style.platform--android .player-video__paused,body.glass--style.platform--android .player-video__loader{background-color:rgba(255,255,255,0.1);-webkit-backdrop-filter:blur(1em);backdrop-filter:blur(1em)}';

        document.head.appendChild(
          style
        );
      }

      var render =
        $(Lampa.Player.render());

      var title =
        $('<div class="player-info__title"></div>');

      var value =
        $('<div class="value--name"><span></span></div>');

      render
        .find('.player-video__display')
        .after(
          $('<div class="player-video__overlay"></div>')
        );

      render
        .find('.player-panel__center')
        .find(
          '.button:not(.player-panel__playpause)'
        )
        .remove();

      render
        .find('.player-panel__timeline')
        .before(
          render.find(
            '.player-panel__line-one'
          )
        );

      render
        .find('.player-info .player-info__line')
        .before(title);

      render
        .find('.value--size')
        .after(value);

      var box =
        $('<div class="player-panel__box-buttons"></div>');

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
          var name = data.title;
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

          if (!head) head = name;

          title
            .text(head)
            .toggleClass(
              'hide',
              Boolean(data.iptv)
            );

          render
            .find('.player-info__name')
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
  // 5. Загружаем WTCH
  // =========================================================

  function loadWTCH() {
    if (
      window.lampa_wtch_unified_loaded
    ) {
      return;
    }

    window.lampa_wtch_unified_loaded =
      true;

    // http://wtch.ch/m — уже сам JS.
    var scripts = [
      SCRIPT_URL
    ];

    // Предпочтительный способ для Lampa
    if (
      window.Lampa &&
      window.Lampa.Utils &&
      typeof
        window.Lampa.Utils.putScriptAsync ===
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

      if (result) return;
    }

    // Резервная загрузка обычным <script>
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
  // 6. Запуск плагина
  // =========================================================

  installShowyProGuards();

  loadWTCH();

  function start() {
    injectCSS();

    installUiCleaner();

    disableTorrentSetting();

    replaceWtchButton(
      document,
      false
    );

    scheduleWtchInitialFocus(
      document
    );

    installPlayerSkin();
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
            if (
              event.type ===
              'ready'
            ) {
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