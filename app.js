/* Переходы между экранами и ввод пароля.
   Логики банка тут нет — это учебный дубль интерфейса. */
(function () {
  'use strict';

  /* Фон документа идёт за экраном: на заставке красный, дальше цвет
     страницы. Им же iOS красит строку состояния и поля вокруг кадра. */
  var theme = document.querySelector('meta[name="theme-color"]');
  var paintChrome = function (id) {
    var red = id === 's-splash' || id === 's-brands';
    document.documentElement.classList.toggle('is-splash', red);
    if (theme) theme.setAttribute('content', red ? '#ff0040' : '#f4f5f7');
  };
  paintChrome('s-splash');

  var show = function (id) {
    paintChrome(id);
    document.querySelectorAll('.screen').forEach(function (s) {
      s.classList.toggle('is-on', s.id === id);
    });
    /* Экран реквизитов всегда открывается раскрытым, каким бы путём на него
       ни попали — переворотом, обычной ссылкой или напрямую. При перевороте
       уведомление ждёт приземления, поэтому здесь его не трогаем. */
    if (id === 's-card') openCreds();
    /* История каждый раз открывается за сегодня, а не с прошлым выбором */
    if (id === 's-history' && resetDays) resetDays();
  };

  /* Заставка сама уступает место второй, вторая — экрану пароля.
     Клик пропускает ожидание: смотреть заставку по третьему разу незачем. */
  /* Один и тот же обработчик и на таймер, и на клик, и он снимает себя сам.
     Иначе слушатель клика остаётся висеть на документе после того, как
     заставка ушла по таймеру, и первое же нажатие на любом экране
     возвращает на неё. */
  var step = function (next, ms) {
    var go = function () {
      clearTimeout(t);
      document.removeEventListener('click', go);
      show(next);
    };
    var t = setTimeout(go, ms);
    document.addEventListener('click', go);
  };
  /* Заставка держится ровно столько, сколько длится моргание, плюс глоток
     воздуха на паузу перед переходом. Отсчёт и само моргание начинаем с
     одного момента — когда страница отрисована, иначе анимация проходит
     в невидимости, а таймер уже тикает. */
  var PULSE = 1000, BREATHS = 1;
  /* Второй экран уходит не растворением, а разлётом знака: он вырастает
     до размеров кадра, кадр от этого белеет, и на белом подставляется
     экран пароля — у него фон тот же, поэтому стык не виден. */
  var BOOM = 620;
  var boom = function () {
    var s2 = document.getElementById('s-brands');
    if (s2.classList.contains('is-boom')) return;
    s2.classList.add('is-boom');
    setTimeout(function () {
      show('s-pin');
      /* Возвращаем знак в исходное, когда экран уже не виден: иначе при
         повторном показе заставки он остался бы растянутым. */
      setTimeout(function () { s2.classList.remove('is-boom'); }, 500);
    }, BOOM);
  };

  var start = function () {
    document.body.classList.add('is-ready');
    step('s-brands', PULSE * BREATHS + 300);
    setTimeout(function () {
      if (!document.getElementById('s-brands').classList.contains('is-on')) return;
      /* Снимаем слушатель по той же причине, что и выше */
      var go = function () {
        clearTimeout(t);
        document.removeEventListener('click', go);
        boom();
      };
      var t = setTimeout(go, 1600);
      document.addEventListener('click', go);
    }, PULSE * BREATHS + 400);
  };
  if (document.readyState === 'complete') requestAnimationFrame(start);
  else addEventListener('load', function () { requestAnimationFrame(start); });

  /* ── Кадр вписывается в экран телефона ──
     Всё внутри разложено по координатам 390×844, поэтому на телефоне кадр
     не растягиваем, а масштабируем целиком. Коэффициент считаем здесь:
     в CSS деление длины на число даёт длину, а scale() ждёт число. */
  var fit = function () {
    var box = document.querySelector('.phone');
    var root = document.documentElement;
    if (!box) return;
    if (innerWidth > 480) {
      box.style.transform = '';
      box.style.height = '';
      root.style.removeProperty('--lift');
      return;
    }
    /* По ширине тянем ровно в экран, а высоту кадру даём настоящую — тогда
       полей по краям не остаётся. Внутри всё, что привязано к низу (панель,
       подвал заставки), встаёт само. */
    var s = innerWidth / 390;
    var h = Math.round(innerHeight / s);
    box.style.height = h + 'px';
    box.style.transform = 'scale(' + s + ')';
    /* Клавиатура пароля разложена по координатам кадра 844: сдвигаем её
       на разницу, чтобы она осталась на том же расстоянии от низа. */
    root.style.setProperty('--lift', (h - 844) + 'px');
  };
  fit();
  addEventListener('resize', fit);
  addEventListener('orientationchange', fit);

  /* ── Переходы по кнопкам с data-go ──
     Одно правило на все экраны: у кнопки или ссылки написано, куда вести. */
  document.addEventListener('click', function (e) {
    var go = e.target.closest && e.target.closest('[data-go]');
    if (!go) return;
    e.preventDefault();

    /* Уходим из шторки на экран — снимаем её сразу, без выезда вниз:
       иначе она едет поверх уже другого экрана. */
    var from = go.closest('.sheet');
    if (from) sheet(from, false, true);

    /* Ведут не только на экраны: возврат с квитанции — на чек, а чек
       теперь шторка. Поднимаем экран, под которым её открывали. */
    var to = document.getElementById(go.dataset.go);
    if (to && to.classList.contains('sheet')) {
      if (to.dataset.under) show(to.dataset.under);
      sheet(to, true);
      return;
    }
    show(go.dataset.go);
  });

  /* ── Строка операции открывает чек ──
     Чек выезжает шторкой поверх истории, а не подменяет экран. */
  document.addEventListener('click', function (e) {
    var row = e.target.closest && e.target.closest('.hx[data-open]');
    if (!row) return;
    sheet(document.getElementById(row.dataset.open), true);
  });

  /* ── Карта раскрывается в реквизиты ──
     Пластик не гаснет вместе с экраном: над экранами летит его копия,
     которая дорастает до тёмной плашки на следующем. Разворот идёт от
     левого края, поэтому карта будто открывается вправо. Настоящая плашка
     ждёт под копией и проявляется, когда та встала на место. */
  var morphing = false;

  /* Перехватываем на погружении и глушим событие: у карты остался и обычный
     data-go — он нужен как запас, если этот файл почему-то не доехал до
     браузера. Пока доехал, до него дело не доходит и экран не переключается
     дважды. */
  document.addEventListener('click', function (e) {
    var tile = e.target.closest && e.target.closest('[data-open-card]');
    if (!tile) return;
    e.preventDefault();
    e.stopPropagation();
    if (morphing) return;

    var to = tile.dataset.openCard;
    var screen = document.getElementById(to);
    var target = screen && screen.querySelector('.creds');
    var phone = document.querySelector('.phone');
    if (!target || !phone) { show(to); return; }

    /* Изнанка летящей карты должна быть закрытой — раскрытие ставит
       таймер в show(), уже после того как копия снята. */
    resetCreds();

    morphing = true;
    /* Плашку меряем, пока её экран ещё скрыт: visibility: hidden
       размеры не съедает, поэтому координаты уже верные. */
    var p = phone.getBoundingClientRect();
    var from = tile.getBoundingClientRect();
    var till = target.getBoundingClientRect();

    /* Летит не копия плитки, а двусторонняя карта: лицо — пластик,
       изнанка — плашка реквизитов. На середине поворота они меняются
       местами сами, потому что обратная сторона скрыта до разворота. */
    var fly = document.createElement('div');
    fly.className = 'cardfly';
    var face = function (cls, src) {
      var f = document.createElement('span');
      f.className = 'cardfly__face ' + cls;
      var img = document.createElement('img');
      img.src = src; img.alt = '';
      f.appendChild(img);
      return f;
    };
    fly.appendChild(face('cardfly__front', tile.querySelector('img').getAttribute('src')));
    /* Изнанка — живая копия плашки реквизитов: она собрана слоями, а не
       картинкой, поэтому клонируем её целиком и растягиваем на грань. */
    var back = document.createElement('span');
    back.className = 'cardfly__face cardfly__back';
    var copy = target.cloneNode(true);
    back.appendChild(copy);
    fly.appendChild(back);
    fly.style.left = (from.left - p.left) + 'px';
    fly.style.top = (from.top - p.top) + 'px';
    fly.style.width = from.width + 'px';
    fly.style.height = from.height + 'px';
    phone.appendChild(fly);
    /* Сколько лететь — спрашиваем у стилей, а не держим второе число в коде:
       при «уменьшении движения» длительность там другая. */
    var dur = parseFloat(getComputedStyle(fly).transitionDuration) * 1000 || 420;

    tile.classList.add('is-lifted');
    screen.classList.add('is-morphing');
    show(to);

    /* Два кадра: в первом копия должна успеть отрисоваться на месте
       пластика, иначе переход начнётся уже из конечных размеров. */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        fly.classList.add('is-open');
        fly.style.left = (till.left - p.left) + 'px';
        fly.style.top = (till.top - p.top) + 'px';
        fly.style.width = till.width + 'px';
        fly.style.height = till.height + 'px';
      });
    });

    setTimeout(function () {
      screen.classList.remove('is-morphing');
      fly.remove();
      tile.classList.remove('is-lifted');
      morphing = false;
    }, dur + 20);
  }, true);

  /* ── Глаз открывает реквизиты ──
     На карточке напечатаны звёздочки, настоящие номер и срок лежат поверх
     них и до нажатия спрятаны. Второе нажатие снова прячет. */
  var warnTimer;

  /* Как открывается экран реквизитов:
     карта прилетает с закрытым номером, и через секунду после нажатия
     разом появляются номер, предупреждение и тёплая подсветка. Крестик
     убирает предупреждение с подсветкой, номер остаётся. */
  var REVEAL_AFTER = 1000;

  var eyeState = function (screen, on) {
    var btn = screen.querySelector('[data-reveal]');
    if (!btn) return;
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', on
      ? 'Kart məlumatlarını gizlət'
      : 'Kart məlumatlarını göstər');
  };

  /* Каждый заход начинается с закрытой карты: иначе на втором открытии
     номер и уведомление уже висят и показывать нечего. */
  var resetCreds = function () {
    var screen = document.getElementById('s-card');
    var card = screen && screen.querySelector('.creds');
    if (!card) return;
    clearTimeout(warnTimer);
    card.classList.remove('is-shown');
    screen.classList.remove('is-revealed');
    var warn = screen.querySelector('.warn');
    if (warn) warn.hidden = true;
    eyeState(screen, false);
  };

  var revealCreds = function () {
    var screen = document.getElementById('s-card');
    var card = screen && screen.querySelector('.creds');
    if (!card) return;
    card.classList.add('is-shown');
    screen.classList.add('is-revealed');
    var warn = screen.querySelector('.warn');
    if (warn) warn.hidden = false;
    eyeState(screen, true);
  };

  /* Отсчёт идёт от нажатия, а не от конца переворота: так пауза одинаковая
     и когда карта прилетела, и когда на экран зашли ссылкой. */
  var openCreds = function () {
    resetCreds();
    clearTimeout(warnTimer);
    warnTimer = setTimeout(revealCreds, REVEAL_AFTER);
  };

  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-reveal]');
    if (!btn) return;
    var card = document.querySelector('#s-card .creds');
    if (!card) return;
    /* Глаз показывает и прячет всё разом — так же, как это приходит само
       через секунду после открытия экрана. Отложенное раскрытие снимаем:
       иначе оно сработает поверх ручного нажатия. */
    clearTimeout(warnTimer);
    if (card.classList.contains('is-shown')) resetCreds();
    else revealCreds();
  });

  /* Крестик убирает предупреждение вместе с тёплой подсветкой, а реквизиты
     остаются открытыми: закрывают их глазом. */
  document.addEventListener('click', function (e) {
    var x = e.target.closest && e.target.closest('[data-warn-close]');
    if (!x) return;
    clearTimeout(warnTimer);
    var warn = x.closest('.warn');
    if (warn) warn.hidden = true;
    var screen = document.getElementById('s-card');
    if (screen) screen.classList.remove('is-revealed');
  });

  /* Копирование реквизитов: значок ненадолго зеленеет, чтобы нажатие
     не осталось без ответа. */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-copy]');
    if (!btn) return;
    var done = function () {
      btn.classList.add('is-done');
      setTimeout(function () { btn.classList.remove('is-done'); }, 1200);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(btn.dataset.copy).then(done, function () {});
    }
  });

  /* ── Календарь: выбор периода ──
     Панель выезжает снизу. Первое нажатие ставит начало, второе — конец;
     если второй день раньше первого, меняем их местами. */
  var MONTH = 'sentyabr';
  /* Сегодня — последний день, по которому есть операции. Считаем по разметке,
     чтобы при добавлении дня ничего не править руками. */
  /* Приложение считает, что сегодня 18 сентября: по этому числу закрыт
     календарь и по нему же «Bütün ayı seç» берёт период. */
  var TODAY = 18;
  var picked = false;
  /* История открывается целиком — весь месяц по сегодняшний день */
  var from = 1, to = TODAY;

  /* Суммы в плашках считаем по видимым строкам, а не держим отдельно:
     иначе при смене периода они разойдутся со списком. */
  var money = function (v) {
    var s = Math.abs(v).toFixed(2).replace('.', ',');
    if (s.slice(-3) === ',00') s = s.slice(0, -3);
    return s.replace(/\B(?=(\d{3})+(?!\d))/, '\u00a0') + ' ₼';
  };

  var applyRange = function (a, b) {
    var out = 0, inc = 0, shown = 0;
    document.querySelectorAll('#s-history .hxday').forEach(function (g) {
      var n = +g.dataset.day;
      var on = n >= a && n <= b;
      g.hidden = !on;
      if (!on) return;
      g.querySelectorAll('.hx').forEach(function (row) {
        var v = parseFloat(row.dataset.amt) || 0;
        if (v < 0) out -= v; else inc += v;
        shown++;
      });
    });
    var pills = document.querySelectorAll('#s-history .chip__val');
    if (pills[0]) pills[0].innerHTML = money(out).replace(/,(\d\d)/, ',<small>$1</small>');
    if (pills[1]) pills[1].innerHTML = money(inc).replace(/,(\d\d)/, ',<small>$1</small>');
    var empty = document.querySelector('.hx__empty');
    if (empty) empty.hidden = shown > 0;

  };

  var paintDays = function () {
    var a = Math.min(from, to === null ? from : to);
    var b = Math.max(from, to === null ? from : to);
    document.querySelectorAll('[data-cal] .cal__day').forEach(function (d) {
      var n = +d.dataset.day;
      d.classList.toggle('is-start', picked && n === a);
      d.classList.toggle('is-end', picked && n === b);
      d.classList.toggle('is-in', picked && n > a && n < b);
    });
    var label = document.querySelector('[data-range]');
    /* Пока период не выбирали, в пилюле просто месяц — даты появляются
       только после выбора в календаре. */
    if (label) label.textContent = picked
      ? (a === b ? a : a + '–' + b) + ' ' + MONTH
      : MONTH.charAt(0).toUpperCase() + MONTH.slice(1);
    applyRange(a, b);
  };
  var resetDays = function () { picked = false; from = 1; to = TODAY; paintDays(); };
  paintDays();

  var sheet = function (el, open, instant) {
    if (open) {
      /* Запоминаем, поверх какого экрана открылись: с чека можно уйти на
         квитанцию, и по возврату надо поднять и экран, и саму шторку. */
      var on = document.querySelector('.screen.is-on');
      if (on) el.dataset.under = on.id;
      el.hidden = false;
      /* Кадр нужен, чтобы панель поехала снизу, а не появилась на месте */
      requestAnimationFrame(function () { el.classList.add('is-open'); });
    } else {
      el.classList.remove('is-open');
      if (instant) { el.hidden = true; return; }
      setTimeout(function () { el.hidden = true; }, 320);
    }
  };

  document.addEventListener('click', function (e) {
    var open = e.target.closest && e.target.closest('[data-sheet]');
    if (open) { sheet(document.getElementById(open.dataset.sheet), true); return; }

    var close = e.target.closest && e.target.closest('[data-sheet-close]');
    if (close) { sheet(close.closest('.sheet'), false); return; }

    var day = e.target.closest && e.target.closest('[data-cal] .cal__day');
    if (day) {
      var n = +day.dataset.day;
      if (to === null) { to = n; } else { from = n; to = null; }
      picked = true;
      paintDays();
      return;
    }

    var all = e.target.closest && e.target.closest('[data-month-all]');
    if (all) { picked = true; from = 1; to = TODAY; paintDays(); }
  });

  /* ── Шторка уводится вниз ──
     Панель идёт за пальцем; увели больше чем на 80 — закрываем, меньше —
     возвращаем на место. Колесо вниз закрывает сразу: на десктопе жеста
     нет, а «прокрутить вниз» просят то же самое.
     Так ведут себя те шторки, у которых наверху нарисована полоска-ручка:
     баннер на главной и чек операции. */
  ['s-bonus', 's-receipt'].forEach(function (id) {
    var box = document.getElementById(id);
    if (!box) return;
    var panel = box.querySelector('.sheet__body');
    var start = null, shift = 0, dragging = false;

    var release = function () {
      if (start === null) return;
      box.classList.remove('is-dragging');
      panel.style.transform = '';
      if (shift > 80) sheet(box, false);
      start = null;
      shift = 0;
      dragging = false;
    };

    panel.addEventListener('pointerdown', function (e) {
      start = e.clientY;
      shift = 0;
    });
    panel.addEventListener('pointermove', function (e) {
      if (start === null) return;
      /* Вверх панель не тянется — ей некуда, она и так у верхней границы */
      shift = Math.max(0, e.clientY - start);
      /* Указатель забираем себе только когда палец правда пошёл вниз:
         при захвате сразу по нажатию click уходит с кнопки на панель,
         и «Ok» перестаёт закрывать баннер. */
      if (!dragging && shift > 6) {
        dragging = true;
        box.classList.add('is-dragging');
        panel.setPointerCapture(e.pointerId);
      }
      if (dragging) panel.style.transform = 'translateY(' + shift + 'px)';
    });
    panel.addEventListener('pointerup', release);
    panel.addEventListener('pointercancel', release);
    /* Если браузер сам отобрал указатель — тоже отпускаем. Иначе протяжка
       остаётся незакрытой, и панель замирает там, где её бросили. */
    panel.addEventListener('lostpointercapture', release);

    box.addEventListener('wheel', function (e) {
      if (e.deltaY > 0) sheet(box, false);
    }, { passive: true });
  });

  /* ── Пароль ──
     Четыре кружка заполняются по нажатию, на четвёртой цифре пускаем
     на главный. Проверки кода нет: любой из четырёх цифр подходит. */
  var pin = '';
  var dots = document.querySelectorAll('#pin-dots i');

  var keypad = document.getElementById('keypad');
  var paint = function () {
    dots.forEach(function (d, i) { d.classList.toggle('is-filled', i < pin.length); });
    /* Кнопка стирания живёт, только пока есть введённые цифры */
    keypad.classList.toggle('has-pin', pin.length > 0);
  };

  keypad.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    var key = b.dataset.key;
    if (key === 'del') {
      pin = pin.slice(0, -1);
      paint();
      return;
    }
    if (!key || pin.length >= 4) return;
    pin += key;
    paint();
    if (pin.length === 4) {
      /* Небольшая задержка, чтобы четвёртый кружок успел залиться —
         иначе экран сменяется раньше, чем виден ответ на нажатие. */
      setTimeout(function () {
        show('s-main');
        pin = '';
        paint();
        /* Баннер выезжает следом за главной, а не вместе с ней: два
           движения разом смазывают друг друга. */
        setTimeout(function () {
          sheet(document.getElementById('s-bonus'), true);
        }, 320);
      }, 260);
    }
  });
})();
