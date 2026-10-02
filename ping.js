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
// Ping источников Z01: показывает задержку рядом с каждым балансером
// ==============================================================
(function () {
    'use strict';

    if (window.lampa_z01_ping_plugin) return;
    window.lampa_z01_ping_plugin = true;

    var PING_TTL = 30000;
    var PING_TIMEOUT = 5000;
    var sourceMap = {};
    var pingCache = {};
    var pingActive = {};
    var paintTimer = null;

    // Та же логика цветов, что и у вашей JS-плашки:
    // зелёный = ok, жёлтый = средний, красный = плохой.
    var COLORS = {
        good: '#34d399',
        goodFocus: '#0b8a5a',
        mid: '#fbbf24',
        midFocus: '#b45309',
        bad: '#f87171',
        badFocus: '#dc2626',
        wait: '#8b8f98'
    };

    function safe(fn) {
        try { return fn(); } catch (e) { return null; }
    }

    function parseJson(value) {
        if (!value) return value;
        if (typeof value !== 'string') return value;
        try { return JSON.parse(value); } catch (e) { return value; }
    }

    function normalizeName(value) {
        return String(value || '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
    }

    function rememberSource(item) {
        if (!item || !item.url || !item.name) return;

        var name = String(item.name).replace(/\s+/g, ' ').trim();
        var key = normalizeName(name);
        var url = String(item.url).trim();
        if (!key || !url) return;

        sourceMap[key] = {
            name: name,
            url: url
        };

        // В некоторых версиях Lampac внутренний ключ отличается от title.
        var shortName = normalizeName(name.split(' ')[0]);
        if (shortName && !sourceMap[shortName]) {
            sourceMap[shortName] = {
                name: name,
                url: url
            };
        }
    }

    function captureSources(data) {
        var json = parseJson(data);
        if (!json) return;

        var list = null;
        if (Array.isArray(json)) {
            list = json;
        } else if (Array.isArray(json.online)) {
            list = json.online;
        } else if (Array.isArray(json.sources)) {
            list = json.sources;
        }

        if (!list) return;
        list.forEach(rememberSource);
    }

    // Получаем URL источников прямо из ответов online.js, не вмешиваясь в его логику.
    function hookRequestMethod(methodName) {
        var Request = window.Lampa && window.Lampa.Reguest;
        if (!Request || !Request.prototype || typeof Request.prototype[methodName] !== 'function') return false;

        var flag = '__lampa_z01_ping_wrapped_' + methodName;
        if (Request.prototype[flag]) return true;
        Request.prototype[flag] = true;

        var original = Request.prototype[methodName];
        Request.prototype[methodName] = function () {
            var args = Array.prototype.slice.call(arguments);
            var successIndex = 1;
            var success = args[successIndex];

            if (typeof success === 'function') {
                args[successIndex] = function () {
                    safe(function () { captureSources(arguments[0]); });
                    return success.apply(this, arguments);
                };
            }

            return original.apply(this, args);
        };

        return true;
    }

    function hookRequests() {
        hookRequestMethod('silent');
        hookRequestMethod('native');
    }

    function sourceForText(text) {
        var key = normalizeName(text);
        if (!key) return null;
        if (sourceMap[key]) return sourceMap[key];

        var found = null;
        Object.keys(sourceMap).some(function (k) {
            if (k === key || k.indexOf(key + ' ') === 0 || key.indexOf(k + ' ') === 0) {
                found = sourceMap[k];
                return true;
            }
            return false;
        });
        return found;
    }

    function probeUrl(url) {
        try {
            var u = new URL(url, window.location.href);
            // Проверяем лёгкий URL сервера, а не сам поисковый endpoint источника.
            var path = u.origin + '/favicon.ico';
            return path + (path.indexOf('?') >= 0 ? '&' : '?') + 'lampa_ping=' + Date.now();
        } catch (e) {
            return null;
        }
    }

    function cacheKey(url) {
        try {
            var u = new URL(url, window.location.href);
            return u.origin;
        } catch (e) {
            return String(url || '');
        }
    }

    function pingSource(source, done) {
        if (!source || !source.url) return done(null);

        var key = cacheKey(source.url);
        var now = Date.now();
        var cached = pingCache[key];

        if (cached && now - cached.time < PING_TTL) {
            done(cached.ms);
            return;
        }

        if (pingActive[key]) {
            pingActive[key].push(done);
            return;
        }

        pingActive[key] = [done];

        var target = probeUrl(source.url);
        if (!target) {
            finishPing(key, null);
            return;
        }

        var finished = false;
        var started = (window.performance && performance.now) ? performance.now() : Date.now();
        var timer = null;

        function finish(ms) {
            if (finished) return;
            finished = true;
            if (timer) clearTimeout(timer);

            if (typeof ms === 'number' && isFinite(ms)) {
                ms = Math.max(1, Math.round(ms));
                pingCache[key] = { time: Date.now(), ms: ms };
                finishPing(key, ms);
            } else {
                finishPing(key, null);
            }
        }

        function elapsed() {
            return ((window.performance && performance.now) ? performance.now() : Date.now()) - started;
        }

        // Основной путь — тот же Lampa.Reguest, который уже используется онлайн-источниками.
        var usedNative = safe(function () {
            if (!window.Lampa || !Lampa.Reguest) return false;
            var request = new Lampa.Reguest();
            if (typeof request.timeout === 'function') request.timeout(PING_TIMEOUT);
            request.native(target, function () {
                finish(elapsed());
            }, function () {
                // Даже HTTP 404 означает, что сервер ответил: нам нужна задержка,
                // поэтому измеряем время до любого ответа, а не только код 200.
                finish(elapsed());
            }, false, { dataType: 'text' });
            return true;
        });

        // Запасной вариант для браузера, если native недоступен.
        if (!usedNative) {
            safe(function () {
                if (typeof fetch !== 'function') return;
                fetch(target, { method: 'GET', mode: 'no-cors', cache: 'no-store' })
                    .then(function () { finish(elapsed()); })
                    .catch(function () { finish(elapsed()); });
            });
        }

        timer = setTimeout(function () { finish(null); }, PING_TIMEOUT + 250);
    }

    function finishPing(key, ms) {
        var callbacks = pingActive[key] || [];
        delete pingActive[key];
        callbacks.forEach(function (cb) {
            safe(function () { cb(ms); });
        });
    }

    function pingColor(ms) {
        if (ms === null) return COLORS.bad;
        if (ms <= 120) return COLORS.good;
        if (ms <= 300) return COLORS.mid;
        return COLORS.bad;
    }

    function pingFocusColor(ms) {
        if (ms === null) return COLORS.badFocus;
        if (ms <= 120) return COLORS.goodFocus;
        if (ms <= 300) return COLORS.midFocus;
        return COLORS.badFocus;
    }

    function setPing($item, ms, loading) {
        var $ping = $item.find('.lampa-z01-ping');
        if (!$ping.length) {
            $ping = $('<span class="lampa-z01-ping" aria-hidden="true"></span>');
            var $title = $item.find('.selectbox-item__title').first();
            if ($title.length) {
                $title.append($ping);
            } else {
                $item.append($ping);
            }
        }

        if (loading) {
            $ping.text('ping …').css('color', COLORS.wait);
            return;
        }

        if (ms === null) {
            $ping.text('ping —').css('color', COLORS.bad);
            $item.attr('data-ping-state', 'bad');
            return;
        }

        $ping.text('ping ' + ms + ' ms').css('color', pingColor(ms));
        $item.attr('data-ping-state', ms <= 120 ? 'good' : ms <= 300 ? 'mid' : 'bad');

        // На выделенном пункте используем более тёмный оттенок, как у JS-плашки.
        if ($item.hasClass('focus')) {
            $ping.css('color', pingFocusColor(ms));
        }
    }

    function titleOfItem($item) {
        var $title = $item.find('.selectbox-item__title').first();
        if ($title.length) return ($title.clone().find('.lampa-z01-ping').remove().end().text() || '').replace(/\s+/g, ' ').trim();

        var clone = $item.clone();
        clone.find('.lampa-z01-ping').remove();
        return (clone.text() || '').replace(/\s+/g, ' ').trim();
    }

    function isSourceSelectbox() {
        var $box = $('body > .selectbox');
        if (!$box.length) return false;

        var title = normalizeName($box.find('.selectbox__title').first().text());
        return title.indexOf('источник') !== -1 || title.indexOf('source') !== -1 || title.indexOf('джерел') !== -1;
    }

    function paintSourcePings() {
        paintTimer = null;
        hookRequests();
        if (!isSourceSelectbox()) return;

        var $items = $('body > .selectbox').find('.selectbox-item');
        $items.each(function () {
            var $item = $(this);
            var source = sourceForText(titleOfItem($item));
            if (!source) return;

            var key = cacheKey(source.url);
            var cached = pingCache[key];

            if (cached && Date.now() - cached.time < PING_TTL) {
                setPing($item, cached.ms, false);
                return;
            }

            setPing($item, null, true);
            pingSource(source, function (ms) {
                // Элемент могли удалить при перелистывании меню. Ищем заново.
                if (!isSourceSelectbox()) return;
                $('body > .selectbox').find('.selectbox-item').each(function () {
                    var $row = $(this);
                    var rowSource = sourceForText(titleOfItem($row));
                    if (rowSource && cacheKey(rowSource.url) === key) {
                        setPing($row, ms, false);
                    }
                });
            });
        });
    }

    function schedulePaint() {
        if (paintTimer) return;
        paintTimer = setTimeout(paintSourcePings, 60);
    }

    function addCSS() {
        if ($('#lampa-z01-ping-style').length) return;
        $('head').append(
            '<style id="lampa-z01-ping-style">' +
            '.selectbox-item .lampa-z01-ping{' +
                'display:inline-flex;align-items:center;justify-content:flex-end;' +
                'margin-left:1em;flex:0 0 auto;white-space:nowrap;' +
                'font-size:.72em;font-weight:500;font-variant-numeric:tabular-nums;' +
                'line-height:1;letter-spacing:0;opacity:1;transition:color .2s ease' +
            '}' +
            '.selectbox-item .selectbox-item__title{display:flex;align-items:center;width:100%}' +
            '.selectbox-item.focus .lampa-z01-ping{font-weight:600}' +
            '.selectbox-item[data-ping-state="good"] .lampa-z01-ping{color:' + COLORS.good + '}' +
            '.selectbox-item[data-ping-state="mid"] .lampa-z01-ping{color:' + COLORS.mid + '}' +
            '.selectbox-item[data-ping-state="bad"] .lampa-z01-ping{color:' + COLORS.bad + '}' +
            '</style>'
        );
    }

    function installObserver() {
        if (!window.MutationObserver || window.lampa_z01_ping_observer) return;
        window.lampa_z01_ping_observer = new MutationObserver(function () {
            if ($('body > .selectbox').length) schedulePaint();
        });
        safe(function () {
            window.lampa_z01_ping_observer.observe(document.body, { childList: true, subtree: true });
        });
    }

    function startPingPlugin() {
        addCSS();
        hookRequests();
        installObserver();

        // Обновляем цвет после перемещения фокуса пультом.
        $(document).on('hover:focus.lampaZ01Ping', '.selectbox-item', function () {
            var $item = $(this);
            var source = sourceForText(titleOfItem($item));
            if (!source) return;
            var cached = pingCache[cacheKey(source.url)];
            if (cached) setPing($item, cached.ms, false);
        });

        // Источник открывается через кнопку фильтра; этого достаточно, чтобы начать измерение сразу.
        $(document).on('hover:enter.lampaZ01Ping click.lampaZ01Ping', '.filter--sort', function () {
            setTimeout(schedulePaint, 80);
            setTimeout(schedulePaint, 300);
        });

        schedulePaint();
    }

    if (window.appready) {
        startPingPlugin();
    } else if (window.Lampa && window.Lampa.Listener) {
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') startPingPlugin();
        });
    }
})();

// ==============================================================
// Новый скин плеера (переработанный интерфейс проигрывателя)
// ==============================================================
(function () {
    'use strict';

    function startPlugin(){if(Lampa.Platform.screen('mobile')||Lampa.Manifest.app_digital>328)return;$('body').append("\n        <style>\n        .player-video__overlay{display:none;background:-webkit-gradient(linear,left top,left bottom,from(rgba(0,0,0,0.5)),color-stop(53%,rgba(0,0,0,0.3)),to(rgba(11,13,16,0.8)));background:-webkit-linear-gradient(top,rgba(0,0,0,0.5) 0,rgba(0,0,0,0.3) 53%,rgba(11,13,16,0.8) 100%);background:-moz-linear-gradient(top,rgba(0,0,0,0.5) 0,rgba(0,0,0,0.3) 53%,rgba(11,13,16,0.8) 100%);background:-o-linear-gradient(top,rgba(0,0,0,0.5) 0,rgba(0,0,0,0.3) 53%,rgba(11,13,16,0.8) 100%);background:linear-gradient(to bottom,rgba(0,0,0,0.5) 0,rgba(0,0,0,0.3) 53%,rgba(11,13,16,0.8) 100%);position:absolute;top:0;left:0;width:100%;height:100%}.player:not(.iptv) .player-panel,.player:not(.iptv) .player-info,.player:not(.iptv) .player-footer{background:transparent !important;-webkit-backdrop-filter:unset !important;backdrop-filter:unset !important}.player:not(.iptv) .player-panel__body,.player:not(.iptv) .player-info__body,.player:not(.iptv) .player-footer__body{padding:0}.player:not(.iptv) .player-footer__row{padding:0}.player:not(.iptv) .head-backward{display:none !important}.player:not(.iptv) .player-info__body{padding-left:0 !important;position:relative}.player:not(.iptv) .player-info__name{font-size:1.2em;text-shadow:0 0 .2em rgba(0,0,0,0.5)}.player:not(.iptv) .player-info__title{font-size:2.4em;font-weight:600;line-height:1.4;width:60%;text-shadow:0 0 .2em rgba(0,0,0,0.5);overflow:hidden;-o-text-overflow:'.';text-overflow:'.';display:-webkit-box;-webkit-line-clamp:2;line-clamp:2;-webkit-box-orient:vertical}.player:not(.iptv) .player-info__values{text-shadow:0 0 .2em rgba(0,0,0,0.5)}.player:not(.iptv) .player-info__values .value--name span{font-weight:600}.player:not(.iptv) .player-info__time{position:absolute;top:.8em;right:0}.player:not(.iptv) .player-panel .button{padding:.9em;width:3em;height:3em}.player:not(.iptv) .player-panel .button.animate-trigger-enter{-webkit-animation:animation-trigger-enter .2s forwards;-moz-animation:animation-trigger-enter .2s forwards;-o-animation:animation-trigger-enter .2s forwards;animation:animation-trigger-enter .2s forwards}.player:not(.iptv) .player-panel .button>svg{width:1.2em;height:1.2em}.player:not(.iptv) .player-panel .button+.button{margin-left:0}.player:not(.iptv) .player-panel__playpause{margin:0;padding:1em !important}.player:not(.iptv) .player-panel__playpause:not(.focus){background:rgba(255,255,255,0.1)}.player:not(.iptv) .player-panel__quality{-webkit-border-radius:5em !important;border-radius:5em !important;padding:0 1em !important}.player:not(.iptv) .player-panel__timeline{margin-bottom:1em}.player:not(.iptv) .player-panel__timeline:not(.focus) .player-panel__position>div::after{display:none}.player:not(.iptv) .player-panel__line-one{margin-bottom:1em;position:relative;z-index:2;text-shadow:0 0 .2em rgba(0,0,0,0.5)}.player:not(.iptv) .player-panel__box-buttons{-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0;display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;background:rgba(255,255,255,0.1);-webkit-border-radius:4em;border-radius:4em}.player:not(.iptv) .player-panel__box-buttons+.player-panel__box-buttons{margin-left:.5em}.player:not(.iptv) .player-panel__next,.player:not(.iptv) .player-panel__prev{padding:1.1em !important}.player:not(.iptv) .player-panel__next>svg,.player:not(.iptv) .player-panel__prev>svg{width:.8em;height:.8em}.player:not(.iptv) .player-panel__playlist{text-align:center}.player:not(.iptv) .player-panel__playlist>svg{width:1em !important}.player:not(.iptv) .player-video__paused,.player:not(.iptv) .player-video__loader{background-color:rgba(255,255,255,0.1)}.player:not(.iptv) .player-info__values .value--size span{background:rgba(255,255,255,0.1);-webkit-border-radius:1em;border-radius:1em}.player:not(.iptv).player--panel-visible .player-video__overlay{display:block;-webkit-animation:animation-opacity .3s;-moz-animation:animation-opacity .3s;-o-animation:animation-opacity .3s;animation:animation-opacity .3s}.normalization{background:rgba(255,255,255,0.1);-webkit-border-radius:1em;border-radius:1em}.normalization canvas{-webkit-border-radius:1em;border-radius:1em}body.platform--browser .player:not(.iptv) .player-panel__box-buttons,body.platform--browser .player:not(.iptv) .player-panel__playpause:not(.focus),body.platform--browser .player:not(.iptv) .player-info__values .value--size span,body.platform--nw .player:not(.iptv) .player-panel__box-buttons,body.platform--nw .player:not(.iptv) .player-panel__playpause:not(.focus),body.platform--nw .player:not(.iptv) .player-info__values .value--size span,body.glass--style.platform--apple .player:not(.iptv) .player-panel__box-buttons,body.glass--style.platform--apple .player:not(.iptv) .player-panel__playpause:not(.focus),body.glass--style.platform--apple .player:not(.iptv) .player-info__values .value--size span,body.glass--style.platform--apple_tv .player:not(.iptv) .player-panel__box-buttons,body.glass--style.platform--apple_tv .player:not(.iptv) .player-panel__playpause:not(.focus),body.glass--style.platform--apple_tv .player:not(.iptv) .player-info__values .value--size span,body.glass--style.platform--android .player:not(.iptv) .player-panel__box-buttons,body.glass--style.platform--android .player:not(.iptv) .player-panel__playpause:not(.focus),body.glass--style.platform--android .player:not(.iptv) .player-info__values .value--size span{-webkit-backdrop-filter:blur(1em);backdrop-filter:blur(1em)}body.platform--browser .normalization,body.platform--browser .player-video__paused,body.platform--browser .player-video__loader,body.platform--nw .normalization,body.platform--nw .player-video__paused,body.platform--nw .player-video__loader,body.glass--style.platform--apple .normalization,body.glass--style.platform--apple .player-video__paused,body.glass--style.platform--apple .player-video__loader,body.glass--style.platform--apple_tv .normalization,body.glass--style.platform--apple_tv .player-video__paused,body.glass--style.platform--apple_tv .player-video__loader,body.glass--style.platform--android .normalization,body.glass--style.platform--android .player-video__paused,body.glass--style.platform--android .player-video__loader{background-color:rgba(255,255,255,0.1);-webkit-backdrop-filter:blur(1em);backdrop-filter:blur(1em)}\n        </style>\n    ");var render=Lampa.Player.render();var title=$('<div class="player-info__title"></div>');var value=$('<div class="value--name"><span></span></div>');render.find('.player-video__display').after($('<div class="player-video__overlay"></div>'));render.find('.player-panel__center').find('.button:not(.player-panel__playpause)').remove();render.find('.player-panel__timeline').before(render.find('.player-panel__line-one'));render.find('.player-info .player-info__line').before(title);render.find('.value--size').after(value);var box=$('<div class="player-panel__box-buttons"></div>');var right_panel=render.find('.player-panel__right');var left_panel=render.find('.player-panel__left');var right_box_quality=box.clone();var right_box_main=box.clone();var right_box_audio=box.clone();var left_box_main=box.clone();right_panel.append(right_box_audio);right_panel.append(right_box_quality);right_panel.append(right_box_main);right_box_main.append(right_panel.find('.button'));right_box_quality.append(right_panel.find('.player-panel__quality'));right_box_audio.append(right_panel.find('.player-panel__flow'));right_box_audio.append(right_panel.find('.player-panel__subs'));right_box_audio.append(right_panel.find('.player-panel__tracks'));left_panel.prepend(left_box_main);left_box_main.append(left_panel.find('.button'));Lampa.Player.listener.follow('start',function(data){var name=data.title;var head='';if(!data.iptv){if(data.card)head=data.card.title||data.card.name;else if(Lampa.Activity.active().movie){head=Lampa.Activity.active().movie.title||Lampa.Activity.active().movie.name;}}if(!head)head=name;title.text(head).toggleClass('hide',Boolean(data.iptv));render.find('.player-info__name').toggleClass('hide',Boolean(name==head)).toggleClass('hide',true);value.toggleClass('hide',Boolean(name==head)).find('span').text(name);});}if(!window.youtube_player_plugin){window.youtube_player_plugin=true;if(window.appready)startPlugin();else {Lampa.Listener.follow('app',function(e){if(e.type=='ready')startPlugin();});}}

})();