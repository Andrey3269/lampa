(function () {
  'use strict';

  if (window.lampa_wtch_unified_v1) return;
  window.lampa_wtch_unified_v1 = true;

  var VERSION = '2.0.0';

  // =========================================================
  // WTCH
  // =========================================================

  var SCRIPT_URL = 'http://wtch.ch/m';

  // =========================================================
  // Безопасный вызов
  // =========================================================

  function safe(fn) {
    try {
      return fn();
    } catch (e) {
      return null;
    }
  }

  // =========================================================
  // ТВ-СКИН ВЫБОРА ИСТОЧНИКОВ / СЕЗОНОВ / ОЗВУЧЕК
  // =========================================================

  function installSourcePickerSkin() {
    if (window.lampa_wtch_source_picker_skin) return;

    window.lampa_wtch_source_picker_skin = true;

    safe(function () {
      if (
        window.Lampa &&
        Lampa.Lang &&
        typeof Lampa.Lang.add === 'function'
      ) {
        Lampa.Lang.add({
          lampa_wtch_source: {
            ru: 'Источник',
            uk: 'Джерело',
            en: 'Source'
          },

          lampa_wtch_season: {
            ru: 'Сезон',
            uk: 'Сезон',
            en: 'Season'
          },

          lampa_wtch_voice: {
            ru: 'Озвучка',
            uk: 'Озвучення',
            en: 'Voice'
          },

          lampa_wtch_quality: {
            ru: 'Качество',
            uk: 'Якість',
            en: 'Quality'
          },

          lampa_wtch_dub: {
            ru: 'Дубляж',
            uk: 'Дубляж',
            en: 'Dub'
          },

          lampa_wtch_mvo: {
            ru: 'Многоголосая',
            uk: 'Багатоголосе',
            en: 'Multi-voice'
          },

          lampa_wtch_dvo: {
            ru: 'Двухголосая',
            uk: 'Двоголосе',
            en: 'Two-voice'
          },

          lampa_wtch_avo: {
            ru: 'Авторская',
            uk: 'Авторське',
            en: 'Author'
          },

          lampa_wtch_orig: {
            ru: 'Оригинал',
            uk: 'Оригінал',
            en: 'Original'
          },

          lampa_wtch_sub: {
            ru: 'Субтитры',
            uk: 'Субтитри',
            en: 'Subtitles'
          },

          lampa_wtch_other: {
            ru: 'Другое',
            uk: 'Інше',
            en: 'Other'
          },

          lampa_wtch_available: {
            ru: 'Доступно',
            uk: 'Доступно',
            en: 'Available'
          },

          lampa_wtch_selected: {
            ru: 'Выбрано',
            uk: 'Обрано',
            en: 'Selected'
          }
        });
      }
    });

    // =======================================================
    // Локализация
    // =======================================================

    function lang(key, fallback) {
      return safe(function () {
        return Lampa.Lang.translate(key);
      }) || fallback;
    }

    // =======================================================
    // Определение качества
    // =======================================================

    function shortQuality(text) {
      text = String(text || '');

      if (/2160\s*p?|4k|uhd/i.test(text)) return '4K';
      if (/1440\s*p?/i.test(text)) return 'QHD';
      if (/1080\s*p?|fhd/i.test(text)) return 'FHD';
      if (/720\s*p?|\bhd\b/i.test(text)) return 'HD';
      if (/576\s*p?|480\s*p?|360\s*p?/i.test(text)) return 'SD';

      return '';
    }

    function qualityRank(text) {
      text = String(text || '');

      if (/2160\s*p?|4k|uhd/i.test(text)) return 50;
      if (/1440\s*p?/i.test(text)) return 40;
      if (/1080\s*p?|fhd/i.test(text)) return 30;
      if (/720\s*p?|\bhd\b/i.test(text)) return 20;
      if (/576\s*p?|480\s*p?|360\s*p?/i.test(text)) return 10;

      return 0;
    }

    // =======================================================
    // Определение типа озвучки
    // =======================================================

    function voiceKind(text) {
      text = String(text || '');

      if (
        /дубляж|дублирован|\bdub\b|\bdubbing\b/i.test(text)
      ) {
        return 'dub';
      }

      if (
        /многоголос|\bmvo\b|\bpmvo\b/i.test(text)
      ) {
        return 'mvo';
      }

      if (
        /двухголос|\bdvo\b/i.test(text)
      ) {
        return 'dvo';
      }

      if (
        /авторск|одноголос|\bavo\b|\bvo\b/i.test(text)
      ) {
        return 'avo';
      }

      if (
        /оригинал|original|\beng\b|\bua\b|\bukr\b/i.test(text)
      ) {
        return 'orig';
      }

      if (
        /субтитр|subtitle|\bsubs?\b/i.test(text)
      ) {
        return 'sub';
      }

      // Популярные студии многоголосой озвучки

      if (
        /lostfilm|лостфильм|tvshows|newstudio|newcomers|baibako|байбако|alexfilm|jaskier|coldfilm|колдфильм|hdrezka|rezkastudio|red head sound|sunshine|amedia|zakadry|закадры|linefilm|le-production|profix|selena/i.test(text)
      ) {
        return 'mvo';
      }

      // Двухголосые

      if (
        /кубик в кубе|kubik|viruseproject|вирус|green ?tea|paradox/i.test(text)
      ) {
        return 'dvo';
      }

      // Авторские

      if (
        /яроцк|гаврилов|володарск|сербин|горчаков|михал[её]в|живов|пучков|гоблин|кураж|дольск|есарев|карповск|визгунов/i.test(text)
      ) {
        return 'avo';
      }

      return 'other';
    }

    function voiceKindTitle(key) {
      var map = {
        dub: ['lampa_wtch_dub', 'Дубляж'],
        mvo: ['lampa_wtch_mvo', 'Многоголосая'],
        dvo: ['lampa_wtch_dvo', 'Двухголосая'],
        avo: ['lampa_wtch_avo', 'Авторская'],
        orig: ['lampa_wtch_orig', 'Оригинал'],
        sub: ['lampa_wtch_sub', 'Субтитры'],
        other: ['lampa_wtch_other', 'Другое']
      };

      var item = map[key] || map.other;

      return lang(item[0], item[1]);
    }

    // =======================================================
    // Определение типа Select
    // =======================================================

    function isSourceTitle(text) {
      return /источник|source|балансер|balanser|провайдер|provider/i.test(
        String(text || '')
      );
    }

    function isSeasonTitle(text) {
      return /сезон|season/i.test(
        String(text || '')
      );
    }

    function isVoiceTitle(text) {
      return /озвуч|голос|перевод|voice|translation|audio|дубляж|subtitles/i.test(
        String(text || '')
      );
    }

    // =======================================================
    // Получение текста элемента
    // =======================================================

    function getVisibleText($item) {
      if (!$item || !$item.length) return '';

      var title = '';
      var subtitle = '';

      safe(function () {
        title = (
          $item.find(
            '.selectbox-item__title, .selectbox-item__name, .selectbox-item__text'
          ).first().text() || ''
        ).trim();
      });

      safe(function () {
        subtitle = (
          $item.find(
            '.selectbox-item__subtitle, .selectbox-item__description'
          ).first().text() || ''
        ).trim();
      });

      if (!title) {
        title = (
          $item.children('div').first().text() ||
          $item.text() ||
          ''
        ).trim();
      }

      return [title, subtitle]
        .join(' · ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    function getSelectTitle($box) {
      return (
        $box.find('.selectbox__title').first().text() || ''
      )
        .replace(/\s+/g, ' ')
        .trim();
    }

    function guessSelectType($box) {
      var title = getSelectTitle($box);

      if (isSourceTitle(title)) return 'source';
      if (isSeasonTitle(title)) return 'season';
      if (isVoiceTitle(title)) return 'voice';

      var bodyText = ($box.text() || '').slice(0, 2500);

      if (isSourceTitle(bodyText)) return 'source';

      if (
        isSeasonTitle(bodyText) &&
        !isVoiceTitle(bodyText)
      ) {
        return 'season';
      }

      if (isVoiceTitle(bodyText)) return 'voice';

      return 'generic';
    }

    // =======================================================
    // Бейдж
    // =======================================================

    function addBadge($item, text, className) {
      if (!text) return;

      var badge = $item.find('.lampa-wtch-item-badge');

      if (badge.length) {
        badge
          .text(text)
          .attr(
            'class',
            'lampa-wtch-item-badge ' + (className || '')
          );

        return;
      }

      badge = $('<span class="lampa-wtch-item-badge"></span>');

      badge.text(text);

      if (className) {
        badge.addClass(className);
      }

      var target = $item.find(
        '.selectbox-item__title, .selectbox-item__name, .selectbox-item__text'
      ).first();

      if (!target.length) {
        target = $item.children('div').first();
      }

      if (target.length) {
        target.prepend(badge);
      } else {
        $item.prepend(badge);
      }
    }

    // =======================================================
    // Дополнительная информация
    // =======================================================

    function addMeta($item, text) {
      if (!text) return;

      var meta = $item.find('.lampa-wtch-item-meta');

      if (!meta.length) {
        meta = $('<div class="lampa-wtch-item-meta"></div>');
        $item.append(meta);
      }

      meta.text(text);
    }

    // =======================================================
    // Оформление одного элемента
    // =======================================================

    function decorateSelectItem($item, type) {
      if (!$item || !$item.length) return;

      var text = getVisibleText($item);

      var quality = shortQuality(text);

      $item.addClass(
        'lampa-wtch-picker-item'
      );

      $item.attr(
        'data-lampa-wtch-kind',
        type
      );

      // -----------------------------------------------------
      // Источник
      // -----------------------------------------------------

      if (type === 'source') {
        if (
          /vip|premium|премиум/i.test(text)
        ) {
          addBadge(
            $item,
            'VIP',
            'lampa-wtch-item-badge--vip'
          );

          addMeta(
            $item,
            quality
              ? quality + ' · Premium'
              : 'Premium'
          );
        } else if (quality) {
          addBadge(
            $item,
            quality,
            'lampa-wtch-item-badge--quality'
          );

          addMeta(
            $item,
            lang(
              'lampa_wtch_available',
              'Доступно'
            )
          );
        } else {
          addMeta(
            $item,
            lang(
              'lampa_wtch_available',
              'Доступно'
            )
          );
        }
      }

      // -----------------------------------------------------
      // Озвучка
      // -----------------------------------------------------

      else if (type === 'voice') {
        var kind = voiceKind(text);

        addBadge(
          $item,
          voiceKindTitle(kind),
          'lampa-wtch-item-badge--voice'
        );

        if (quality) {
          addMeta(
            $item,
            quality
          );
        }
      }

      // -----------------------------------------------------
      // Сезон
      // -----------------------------------------------------

      else if (type === 'season') {
        var number = String(text).match(/\d+/);

        if (number) {
          addBadge(
            $item,
            'S' + parseInt(number[0], 10),
            'lampa-wtch-item-badge--season'
          );
        }
      }

      // -----------------------------------------------------
      // Generic
      // -----------------------------------------------------

      else {
        if (quality) {
          addBadge(
            $item,
            quality,
            'lampa-wtch-item-badge--quality'
          );
        }
      }
    }

    // =======================================================
    // Сортировка источников
    // =======================================================

    function sortSourceItems($box) {
      var list = $box.find(
        '.selectbox-item'
      );

      if (list.length < 2) return;

      var items = list.get();

      items.sort(function (a, b) {
        var at = getVisibleText($(a));
        var bt = getVisibleText($(b));

        var aq = qualityRank(at);
        var bq = qualityRank(bt);

        if (aq !== bq) {
          return bq - aq;
        }

        var avip = /vip|premium|премиум/i.test(at);
        var bvip = /vip|premium|премиум/i.test(bt);

        if (avip !== bvip) {
          return avip ? -1 : 1;
        }

        return at.localeCompare(bt);
      });

      $.each(items, function (_, item) {
        $box.find(
          '.selectbox-items, .selectbox__items, .selectbox__content'
        ).first().append(item);
      });
    }

    // =======================================================
    // Оформление SelectBox
    // =======================================================

    function decorateSelect($box) {
      if (!$box || !$box.length) return;

      var type = guessSelectType($box);

      $box.attr(
        'data-lampa-wtch-picker',
        type
      );

      $box.addClass(
        'lampa-wtch-picker'
      );

      if (type === 'source') {
        $box.addClass(
          'lampa-wtch-picker--source'
        );
      }

      if (type === 'season') {
        $box.addClass(
          'lampa-wtch-picker--season'
        );
      }

      if (type === 'voice') {
        $box.addClass(
          'lampa-wtch-picker--voice'
        );
      }

      var items = $box.find(
        '.selectbox-item'
      );

      items.each(function () {
        decorateSelectItem(
          $(this),
          type
        );
      });

      if (type === 'source') {
        sortSourceItems($box);
      }
    }

    // =======================================================
    // Поиск SelectBox
    // =======================================================

    function scanPickers(root) {
      safe(function () {
        var $root = root
          ? $(root)
          : $(document.body);

        $root
          .find('.selectbox')
          .each(function () {
            decorateSelect($(this));
          });
      });
    }

    // =======================================================
    // CSS
    // =======================================================

    safe(function () {
      if (
        document.getElementById(
          'lampa-wtch-tv-picker-style'
        )
      ) {
        return;
      }

      var style = document.createElement(
        'style'
      );

      style.id =
        'lampa-wtch-tv-picker-style';

      style.textContent = `

/* =========================================================
   LAMPA WTCH TV SOURCE PICKER
   ========================================================= */

.lampa-wtch-picker {
  --wtch-bg: #111214;
  --wtch-panel: #181a1e;
  --wtch-panel-2: #202328;
  --wtch-text: #f3f4f6;
  --wtch-muted: #9298a2;
  --wtch-line: rgba(255,255,255,.08);
  --wtch-focus: #ffffff;

  background:
    #111214 !important;

  color:
    var(--wtch-text) !important;

  border-radius:
    18px !important;

  overflow:
    hidden !important;

  box-shadow:
    0 18px 55px rgba(0,0,0,.55) !important;
}

/* ---------------------------------------------------------
   Заголовок
   --------------------------------------------------------- */

.lampa-wtch-picker .selectbox__title {
  font-size:
    1.25em !important;

  font-weight:
    700 !important;

  color:
    #fff !important;

  padding:
    1.05em 1.25em .7em !important;
}

/* ---------------------------------------------------------
   Контейнер элементов
   --------------------------------------------------------- */

.lampa-wtch-picker .selectbox-items,
.lampa-wtch-picker .selectbox__items,
.lampa-wtch-picker .selectbox__content {
  padding:
    .7em !important;
}

/* ---------------------------------------------------------
   Элемент
   --------------------------------------------------------- */

.lampa-wtch-picker .selectbox-item {
  position:
    relative !important;

  min-height:
    4.6em !important;

  margin:
    .35em 0 !important;

  padding:
    .8em 1em !important;

  background:
    #191b1f !important;

  border:
    1px solid transparent !important;

  border-radius:
    14px !important;

  color:
    #f1f2f4 !important;

  transition:
    background .12s ease,
    border-color .12s ease !important;
}

/* ---------------------------------------------------------
   Неактивный
   --------------------------------------------------------- */

.lampa-wtch-picker .selectbox-item:not(.focus) {
  opacity:
    1 !important;
}

/* ---------------------------------------------------------
   Focus для телевизора
   --------------------------------------------------------- */

.lampa-wtch-picker .selectbox-item.focus {
  background:
    #30343b !important;

  border-color:
    rgba(255,255,255,.95) !important;

  color:
    #fff !important;

  box-shadow:
    0 0 0 2px rgba(255,255,255,.12) inset !important;
}

/* ---------------------------------------------------------
   Hover
   --------------------------------------------------------- */

.lampa-wtch-picker .selectbox-item:hover {
  background:
    #272a30 !important;
}

/* ---------------------------------------------------------
   Название
   --------------------------------------------------------- */

.lampa-wtch-picker .selectbox-item__title,
.lampa-wtch-picker .selectbox-item__name,
.lampa-wtch-picker .selectbox-item__text {
  display:
    block !important;

  font-size:
    1.05em !important;

  font-weight:
    650 !important;

  line-height:
    1.35 !important;

  color:
    inherit !important;
}

/* ---------------------------------------------------------
   Badge
   --------------------------------------------------------- */

.lampa-wtch-item-badge {
  display:
    inline-flex !important;

  align-items:
    center !important;

  justify-content:
    center !important;

  vertical-align:
    middle !important;

  min-width:
    2.5em !important;

  height:
    1.65em !important;

  padding:
    0 .55em !important;

  margin-right:
    .55em !important;

  border-radius:
    6px !important;

  font-size:
    .68em !important;

  font-weight:
    800 !important;

  letter-spacing:
    .02em !important;

  background:
    #34383f !important;

  color:
    #fff !important;
}

.lampa-wtch-item-badge--quality {
  background:
    #30343a !important;
}

.lampa-wtch-item-badge--vip {
  background:
    #454545 !important;

  color:
    #fff !important;
}

.lampa-wtch-item-badge--season {
  min-width:
    3em !important;

  background:
    #30343a !important;
}

.lampa-wtch-item-badge--voice {
  background:
    #2c3036 !important;
}

/* ---------------------------------------------------------
   Meta
   --------------------------------------------------------- */

.lampa-wtch-item-meta {
  margin-top:
    .28em !important;

  color:
    #858b95 !important;

  font-size:
    .72em !important;

  line-height:
    1.2 !important;

  white-space:
    nowrap !important;

  overflow:
    hidden !important;

  text-overflow:
    ellipsis !important;
}

.lampa-wtch-picker .selectbox-item.focus
.lampa-wtch-item-meta {
  color:
    #b9bec6 !important;
}

/* ---------------------------------------------------------
   SOURCE GRID
   --------------------------------------------------------- */

.lampa-wtch-picker--source
.selectbox-items,
.lampa-wtch-picker--source
.selectbox__items,
.lampa-wtch-picker--source
.selectbox__content {
  display:
    grid !important;

  grid-template-columns:
    repeat(2, minmax(0, 1fr)) !important;

  gap:
    .55em !important;
}

.lampa-wtch-picker--source
.selectbox-item {
  margin:
    0 !important;

  min-height:
    5em !important;
}

/* ---------------------------------------------------------
   SEASON GRID
   --------------------------------------------------------- */

.lampa-wtch-picker--season
.selectbox-items,
.lampa-wtch-picker--season
.selectbox__items,
.lampa-wtch-picker--season
.selectbox__content {
  display:
    grid !important;

  grid-template-columns:
    repeat(4, minmax(0, 1fr)) !important;

  gap:
    .55em !important;
}

.lampa-wtch-picker--season
.selectbox-item {
  margin:
    0 !important;

  min-height:
    4em !important;

  text-align:
    center !important;
}

/* ---------------------------------------------------------
   VOICE GRID
   --------------------------------------------------------- */

.lampa-wtch-picker--voice
.selectbox-items,
.lampa-wtch-picker--voice
.selectbox__items,
.lampa-wtch-picker--voice
.selectbox__content {
  display:
    grid !important;

  grid-template-columns:
    repeat(2, minmax(0, 1fr)) !important;

  gap:
    .55em !important;
}

.lampa-wtch-picker--voice
.selectbox-item {
  margin:
    0 !important;

  min-height:
    4.8em !important;
}

/* ---------------------------------------------------------
   Маленькие экраны
   --------------------------------------------------------- */

@media screen and (max-width: 900px) {

  .lampa-wtch-picker--source
  .selectbox-items,
  .lampa-wtch-picker--source
  .selectbox__items,
  .lampa-wtch-picker--source
  .selectbox__content,

  .lampa-wtch-picker--voice
  .selectbox-items,
  .lampa-wtch-picker--voice
  .selectbox__items,
  .lampa-wtch-picker--voice
  .selectbox__content {
    grid-template-columns:
      1fr !important;
  }

  .lampa-wtch-picker--season
  .selectbox-items,
  .lampa-wtch-picker--season
  .selectbox__items,
  .lampa-wtch-picker--season
  .selectbox__content {
    grid-template-columns:
      repeat(3, minmax(0, 1fr)) !important;
  }

}

/* ---------------------------------------------------------
   Очень маленькие экраны
   --------------------------------------------------------- */

@media screen and (max-width: 600px) {

  .lampa-wtch-picker--season
  .selectbox-items,
  .lampa-wtch-picker--season
  .selectbox__items,
  .lampa-wtch-picker--season
  .selectbox__content {
    grid-template-columns:
      repeat(2, minmax(0, 1fr)) !important;
  }

}

/* ---------------------------------------------------------
   Убираем старую перегруженную подсветку
   --------------------------------------------------------- */

.lampa-wtch-picker .selectbox-item.focus::before,
.lampa-wtch-picker .selectbox-item.focus::after {
  display:
    none !important;
}

/* ---------------------------------------------------------
   Скролл
   --------------------------------------------------------- */

.lampa-wtch-picker ::-webkit-scrollbar {
  width:
    8px !important;

  height:
    8px !important;
}

.lampa-wtch-picker ::-webkit-scrollbar-track {
  background:
    #111214 !important;
}

.lampa-wtch-picker ::-webkit-scrollbar-thumb {
  background:
    #41454c !important;

  border-radius:
    20px !important;
}

.lampa-wtch-picker ::-webkit-scrollbar-thumb:hover {
  background:
    #565b63 !important;
}

      `;

      document.head.appendChild(style);
    });

    // =======================================================
    // Наблюдение за динамически создаваемыми SelectBox
    // =======================================================

    safe(function () {
      if (!window.MutationObserver) return;

      var observer =
        new MutationObserver(function (mutations) {
          var needScan = false;

          mutations.forEach(function (mutation) {
            if (
              mutation.type === 'childList' &&
              mutation.addedNodes &&
              mutation.addedNodes.length
            ) {
              needScan = true;
            }
          });

          if (needScan) {
            setTimeout(function () {
              scanPickers(document.body);
            }, 30);
          }
        });

      observer.observe(
        document.body,
        {
          childList: true,
          subtree: true
        }
      );
    });

    // =======================================================
    // Первоначальный запуск
    // =======================================================

    setTimeout(function () {
      scanPickers(document.body);
    }, 250);

    setTimeout(function () {
      scanPickers(document.body);
    }, 1000);
  }

  // =========================================================
  // 2. Убираем трейлеры / Shorts / лишние элементы
  // =========================================================

  function installUiCleaner() {
    if (window.lampa_wtch_ui_cleaner) return;

    window.lampa_wtch_ui_cleaner = true;

    function clean(root) {
      safe(function () {
        var $root = root
          ? $(root)
          : $(document.body);

        // ---------------------------------------------------
        // YouTube
        // ---------------------------------------------------

        $root
          .find(
            '[class*="youtube"], [class*="youtube"] *'
          )
          .each(function () {
            var $el = $(this);

            var text = (
              $el.text() || ''
            ).trim();

            if (
              /youtube|shorts/i.test(
                text
              )
            ) {
              $el.addClass(
                'lampa-wtch-hidden'
              );
            }
          });

        // ---------------------------------------------------
        // Shorts
        // ---------------------------------------------------

        $root
          .find(
            '[class*="short"], [data-short]'
          )
          .addClass(
            'lampa-wtch-hidden'
          );

        // ---------------------------------------------------
        // Torrent
        // ---------------------------------------------------

        $root
          .find(
            '[class*="torrent"], [data-torrent]'
          )
          .addClass(
            'lampa-wtch-hidden'
          );
      });
    }

    safe(function () {
      var style =
        document.getElementById(
          'lampa-wtch-cleaner-style'
        );

      if (!style) {
        style = document.createElement(
          'style'
        );

        style.id =
          'lampa-wtch-cleaner-style';

        style.textContent = `
          .lampa-wtch-hidden {
            display: none !important;
          }
        `;

        document.head.appendChild(style);
      }
    });

    clean(document.body);

    safe(function () {
      if (!window.MutationObserver) return;

      var observer =
        new MutationObserver(function () {
          clean(document.body);
        });

      observer.observe(
        document.body,
        {
          childList: true,
          subtree: true
        }
      );
    });
  }

  // =========================================================
  // 3. Защита от торрент-настроек
  // =========================================================

  function disableTorrentSetting() {
    if (window.lampa_wtch_torrent_guard) return;

    window.lampa_wtch_torrent_guard = true;

    safe(function () {
      var style =
        document.getElementById(
          'lampa-wtch-torrent-style'
        );

      if (!style) {
        style = document.createElement(
          'style'
        );

        style.id =
          'lampa-wtch-torrent-style';

        style.textContent = `
          [data-component="torrent"],
          .settings-param[data-name*="torrent"],
          .menu__item[data-subtitle*="torrent"] {
            display: none !important;
          }
        `;

        document.head.appendChild(style);
      }
    });
  }

  // =========================================================
  // 4. Дополнительные UI guards
  // =========================================================

  function installShowyProGuards() {
    if (window.lampa_wtch_showy_guards) return;

    window.lampa_wtch_showy_guards = true;

    safe(function () {
      var style =
        document.getElementById(
          'lampa-wtch-guards'
        );

      if (!style) {
        style = document.createElement(
          'style'
        );

        style.id =
          'lampa-wtch-guards';

        style.textContent = `
          .lampa-wtch-hidden {
            display: none !important;
          }
        `;

        document.head.appendChild(style);
      }
    });
  }

  // =========================================================
  // 5. Скин самого видеоплеера
  // =========================================================

  function installPlayerSkin() {
    if (window.lampa_wtch_player_skin) return;

    window.lampa_wtch_player_skin = true;

    safe(function () {
      if (
        !window.Lampa ||
        !Lampa.Player ||
        !Lampa.Player.render
      ) {
        return;
      }

      if (
        document.getElementById(
          'lampa-wtch-player-style'
        )
      ) {
        return;
      }

      var style =
        document.createElement(
          'style'
        );

      style.id =
        'lampa-wtch-player-style';

      style.textContent = `

/* =========================================================
   WTCH PLAYER SKIN
   ========================================================= */

.player:not(.iptv) {
  background:
    #08090b !important;
}

.player:not(.iptv) .player-video {
  background:
    #08090b !important;
}

.player:not(.iptv) .player-info {
  background:
    linear-gradient(
      to bottom,
      rgba(0,0,0,.82),
      rgba(0,0,0,0)
    ) !important;
}

.player:not(.iptv) .player-info__body {
  padding-left:
    0 !important;

  position:
    relative;
}

.player:not(.iptv) .player-info__name {
  font-size:
    1.2em;

  text-shadow:
    0 0 .2em rgba(0,0,0,.5);
}

.player:not(.iptv) .player-info__title {
  font-size:
    2.4em;

  font-weight:
    600;

  line-height:
    1.4;

  width:
    60%;

  text-shadow:
    0 0 .2em rgba(0,0,0,.5);

  overflow:
    hidden;

  text-overflow:
    '.';

  display:
    -webkit-box;

  -webkit-line-clamp:
    2;

  line-clamp:
    2;

  -webkit-box-orient:
    vertical;
}

.player:not(.iptv) .player-info__values {
  text-shadow:
    0 0 .2em rgba(0,0,0,.5);
}

.player:not(.iptv)
.player-info__values
.value--name
span {
  font-weight:
    600;
}

.player:not(.iptv) .player-info__time {
  position:
    absolute;

  top:
    .8em;

  right:
    0;
}

.player:not(.iptv)
.player-panel
.button {
  padding:
    .9em;

  width:
    3em;

  height:
    3em;
}

.player:not(.iptv)
.player-panel
.button
> svg {
  width:
    1.2em;

  height:
    1.2em;
}

.player:not(.iptv)
.player-panel__playpause {
  margin:
    0;

  padding:
    1em !important;
}

.player:not(.iptv)
.player-panel__playpause:not(.focus) {
  background:
    rgba(255,255,255,.1);
}

.player:not(.iptv)
.player-panel__quality {
  border-radius:
    5em !important;

  padding:
    0 1em !important;
}

.player:not(.iptv)
.player-panel__timeline {
  margin-bottom:
    1em;
}

.player:not(.iptv)
.player-panel__timeline
.player-panel__position
> div::after {
  display:
    none;
}

.player:not(.iptv)
.player-panel__line-one {
  margin-bottom:
    1em;

  position:
    relative;

  z-index:
    2;

  text-shadow:
    0 0 .2em rgba(0,0,0,.5);
}

.player:not(.iptv)
.player-panel__box-buttons {
  flex-shrink:
    0;

  display:
    flex;

  background:
    rgba(255,255,255,.1);

  border-radius:
    4em;
}

.player:not(.iptv)
.player-panel__box-buttons
+ .player-panel__box-buttons {
  margin-left:
    .5em;
}

.player:not(.iptv)
.player-panel__next,
.player:not(.iptv)
.player-panel__prev {
  padding:
    1.1em !important;
}

.player:not(.iptv)
.player-panel__next
> svg,
.player:not(.iptv)
.player-panel__prev
> svg {
  width:
    .8em;

  height:
    .8em;
}

.player:not(.iptv)
.player-panel__playlist {
  text-align:
    center;
}

.player:not(.iptv)
.player-panel__playlist
> svg {
  width:
    1em !important;
}

.player:not(.iptv)
.player-video__paused,
.player:not(.iptv)
.player-video__loader {
  background-color:
    rgba(255,255,255,.1);
}

.player:not(.iptv)
.player-info__values
.value--size
span {
  background:
    rgba(255,255,255,.1);

  border-radius:
    1em;
}

.normalization {
  background:
    rgba(255,255,255,.1);

  border-radius:
    1em;
}

.normalization canvas {
  border-radius:
    1em;
}

`;

      document.head.appendChild(style);

      // =====================================================
      // Создание собственного render
      // =====================================================

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

      // =====================================================
      // Player start
      // =====================================================

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
              Lampa.Activity &&
              Lampa.Activity.active &&
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
            .find('.player-info__name')
            .toggleClass(
              'hide',
              true
            );

          value
            .toggleClass(
              'hide',
              Boolean(name == head)
            )
            .find('span')
            .text(name);
        }
      );
    });
  }

  // =========================================================
  // 6. Загрузка WTCH
  // =========================================================

  function loadWTCH() {
    if (
      window.lampa_wtch_unified_loaded
    ) {
      return;
    }

    window.lampa_wtch_unified_loaded =
      true;

    var scripts = [
      SCRIPT_URL
    ];

    // -------------------------------------------------------
    // Lampa Utils
    // -------------------------------------------------------

    if (
      window.Lampa &&
      window.Lampa.Utils &&
      typeof Lampa.Utils.putScriptAsync ===
        'function'
    ) {
      var result = safe(function () {
        Lampa.Utils.putScriptAsync(
          scripts,
          function () {
            window.lampa_wtch_unified_ready =
              true;
          }
        );

        return true;
      });

      if (result) {
        return;
      }
    }

    // -------------------------------------------------------
    // Обычный script fallback
    // -------------------------------------------------------

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

      script.async =
        true;

      script.src =
        scripts[index++];

      script.onload =
        next;

      script.onerror =
        next;

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
  // 7. Запуск
  // =========================================================

  installShowyProGuards();

  loadWTCH();

  function start() {
    installUiCleaner();

    disableTorrentSetting();

    installSourcePickerSkin();

    installPlayerSkin();
  }

  // =========================================================
  // 8. Ожидание готовности Lampa
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
  // 9. Информация о плагине
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