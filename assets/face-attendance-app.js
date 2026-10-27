/* face-attendance-app.js — 어느 화면을 보여 줄지만 정한다.

   한 문서에 화면을 모두 담아 두고 주소의 ?screen= 이 가리키는 한 장만 켠다.
   화면마다 파일을 두면 앱 셸(내비게이션 바 · 바닥 바 · 토큰)이 열세 벌로
   갈라져, 한 줄을 고칠 때마다 열세 곳을 같이 고쳐야 한다.

   ⚠ 이 파일이 하는 일은 이것뿐이다. 화면 안의 동작(탭 전환 · 촬영 · 인증)은
     앱(Flutter)이 하는 일이라 여기서 흉내 내지 않는다 — 흉내 내면 프로토타입이
     실제로 되는 범위를 읽는 사람이 가늠할 수 없게 된다. */
(function () {
  'use strict';

  /* ── 홈 화면에서 연 창인가 ──
     css 의 `@media (display-mode:standalone)` 만으로는 모자란다. 아이폰이
     그 물음을 알아듣게 된 것이 한참 뒤(사파리 16.4)라, 그 전 기기에서는
     블록이 통째로 꺼진 채 지나간다 — 머리줄은 env() 로 고쳐져 내려왔는데
     바닥 바만 변에서 떠 있던 까닭이 이것이다.
     아이폰은 navigator.standalone 으로 오래전부터 답해 왔으므로 둘 다
     묻고, 답이 나오면 문서에 표를 붙인다. css 는 그 표를 본다. */
  var app = (window.navigator.standalone === true) ||
            (window.matchMedia && window.matchMedia('(display-mode:standalone)').matches);
  if (app) document.documentElement.classList.add('is-app');

  function pick() {
    var want = new URL(location.href).searchParams.get('screen');
    var all = document.querySelectorAll('.scr');
    if (!all.length) return;

    var hit = want && document.querySelector('.scr[data-screen="' + want + '"]');
    /* 모르는 이름이 오면 첫 화면으로 — 빈 문서를 내놓으면 주소를 잘못 적은 것인지
       화면이 깨진 것인지 가릴 수 없다 */
    if (!hit) hit = all[0];

    /* 덜어 내기 전에 베낀다 — 뒤에 깔 화면도 덜어 낼 것들 가운데 하나다 */
    behind(hit);

    /* 고른 한 장만 남기고 나머지는 문서에서 **덜어 낸다**. 숨기기만 하면 화면설명의
       앵커(`@{선택자}`)가 깨진다 — 프로토타입 셸은 `document.querySelector` 로 첫 번째
       것을 짚는데, 그 첫 번째가 숨은 다른 화면 안에 있으면 하이라이트가 보이지 않는다.
       (실측: 앵커 40개 중 11개가 엉뚱한 화면을 짚고 있었다) */
    all.forEach(function (s) { if (s !== hit) s.remove(); });
    hit.classList.add('is-on');
    stow(hit);
    link(hit);
    clock(hit);
    day(hit);
    roll(hit);
    wheel(hit);
    swipe(hit);
    document.title = (hit.dataset.title || '안면 출퇴근') + ' · 김반장';
  }

  /* ── 화면 밖에 남는 띠의 색 ──
     홈 화면에서 연 창은 기기 화면보다 짧다(아이폰 16 Pro: 화면 874 ·
     창 812). 남는 자리는 창 밖이라 어느 요소도 칠하지 못하고, 거기 깔리는
     것은 **문서의 바탕색**이다. 그래서 켜진 화면의 윗단 색에 맞춘다.

     ⚠ 이 일만은 **문서가 그려지기 전에** 끝나야 한다. 기기는 그 색을
       첫 그림에서 한 번 집어 가고, 그 뒤에 바꾸면 띠에 반영되지 않는다 —
       카메라 화면의 띠가 계속 옅은 파랑(기본값)이던 까닭이 이것이다.
       그래서 화면을 들여다보지 않고 **주소에 적힌 이름**으로 고른다
       (DOM 은 아직 없다). 이 파일이 defer 없이 실리는 까닭도 같다.
     ⚠ 화면을 새로 만들면 여기에도 한 줄 보탠다 — 빠지면 그 화면의 띠는
       기본값(화면 바탕)이 된다.
     색은 css 가 쥔다(--ap-edge) — 여기서는 어느 쪽인지만 표로 붙인다. */
  var EDGE = [
    ['cam',  /^[wm]-cam/],        /* 카메라 — 사진의 윗단 */
    ['shot', /^[wm]-shot$/],      /* 촬영 확인 — 사진 위에 덮인 창 */
    ['dim',  /^w-(map|face)$/],   /* 뜬 창 뒤의 어두운 자리 */
    ['nav',  /^(w-(work|reg|cal)|m-)/] /* 흰 머리줄 · 펴진 달 */
  ];

  function edge() {
    var want = new URL(location.href).searchParams.get('screen') || '';
    var root = document.documentElement;
    for (var i = 0; i < EDGE.length; i++) {
      if (EDGE[i][1].test(want)) { root.classList.add('edge--' + EDGE[i][0]); break; }
    }

    /* 기기가 띠를 문서 바탕이 아니라 theme-color 로 칠하는 수도 있어,
       같은 색을 그쪽에도 옮겨 적는다. css 에서 읽어 옮길 뿐이라 값은
       한 곳에 그대로 있다 */
    var c = getComputedStyle(root).getPropertyValue('--ap-edge').trim();
    if (!c) return;
    var m = document.querySelector('meta[name="theme-color"]');
    if (!m) {
      m = document.createElement('meta');
      m.setAttribute('name', 'theme-color');
      (document.head || root).appendChild(m);
    }
    m.setAttribute('content', c);
  }
  edge();

  /* ── 달력 — 어느 날, 어느 달이든 ──
     하이파이 화면은 **정해진 장면**이라 '아직 안 찍힌 날' 의 장면은 하나
     (w-home)뿐이다. 그 한 장면을 어느 날로도 쓸 수 있게, 보는 날을 주소에
     싣고(`?screen=w-home&d=2026-10-21`) 날이 적히는 자리를 갈아 끼운다 —
     날짜를 누를 때마다 20일로 되돌아가 보이던 까닭이 이것이었다.
     갈아 끼우는 것은 **날이 적히는 자리**뿐이다: 날짜 칸 · 요일 · 띠와
     달의 고른 날 · '오늘' · 휠. 찍힌 시각이나 작업내용 같은 그 날의
     기록은 장면이 쥔 것이라 건드리지 않는다(기록이 있는 날은 제 장면이
     따로 있다 — 10월 19일 · 20일).

     마크업이 쥔 달은 2026년 10월 하나다. **다른 달은 여기서 그린다** —
     띠도 달도 같은 칸(.cal__d)이라 한 자리에서 낸다. 기록이 없는 달이라
     점도 제 장면도 없고, 눌러 가면 '아직 안 찍힌 날' 이다. */
  var BASE = { y: 2026, m: 10 };
  var TODAY = { y: 2026, m: 10, d: 20 };
  var WDAY = ['일', '월', '화', '수', '목', '금', '토'];

  function two(n) { return (n < 10 ? '0' : '') + n; }
  function iso(y, m, d) { return y + '-' + two(m) + '-' + two(d); }
  function inMonth(y, m) { return new Date(y, m, 0).getDate(); }
  /* 오늘보다 뒤인 날은 고를 수 없다 — 아직 오지 않은 날에는 찍을 것도
     볼 것도 없다. 달에서도 띠에서도 휠에서도 같다 */
  function ahead(y, m, d) {
    return (y * 10000 + m * 100 + d) > (TODAY.y * 10000 + TODAY.m * 100 + TODAY.d);
  }

  /* 주소가 말한 날. 아무 말이 없으면 없다고 답한다 — 그때는 마크업이
     쥔 날이 그 화면의 날이다(지난 날 보기는 19일을 쥐고 있다).
     앞날을 가리키면 오늘로 내려앉는다 */
  function seeing() {
    var v = new URL(location.href).searchParams.get('d');
    if (!v) return null;
    var p = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
    if (!p) return null;
    var y = +p[1], m = +p[2], d = +p[3];
    var now = { y: TODAY.y, m: TODAY.m, d: TODAY.d };
    if (m < 1 || m > 12 || d < 1 || d > inMonth(y, m)) return now;
    if (ahead(y, m, d)) return now;
    return { y: y, m: m, d: d };
  }

  /* 이 화면이 보고 있는 날. 주소가 말하면 그 날이고, 말이 없으면 마크업이
     고른 날(.cal__n--on)이다 — 휠과 닫는 길은 주소에 날이 적혀 있든
     없든 그 날을 알아야 한다 */
  function shown(scr) {
    var v = seeing();
    if (v) return v;
    var on = scr.querySelector('.cal__n--on');
    var c = on && on.closest('.cal__d');
    var p = c && /^(\d{4})-(\d{2})-(\d{2})$/.exec(c.getAttribute('data-d') || '');
    return p ? { y: +p[1], m: +p[2], d: +p[3] } : { y: TODAY.y, m: TODAY.m, d: TODAY.d };
  }

  /* 한 달치 칸을 낸다. 일요일에서 시작해 주 단위로 떨어지고, 달 밖의
     날도 자리를 지킨다(고를 수는 없다) — 달 격자와 띠가 같은 칸을 같은
     차례로 쥐어야 요일 줄이 두 꼴에서 같은 자리에 온다.
     `wd` 가 참이면 칸마다 요일을 얹는다(띠), 거짓이면 숫자만(달 격자 —
     요일은 위에 한 줄로 따로 선다) */
  function fill(box, y, m, sel, wd) {
    var lead = new Date(y, m - 1, 1).getDay();
    var n = inMonth(y, m), back = inMonth(y, m === 1 ? 12 : m - 1);
    var rows = Math.ceil((lead + n) / 7), out = [];

    for (var i = 0; i < rows * 7; i++) {
      var k = i - lead + 1, cur = k >= 1 && k <= n;
      var num = cur ? k : (k < 1 ? back + k : k - n);
      var w = WDAY[i % 7];
      var head = wd ? '<div class="cal__w' +
        (w === '일' ? ' cal__w--sun' : w === '토' ? ' cal__w--sat' : '') + '">' + w + '</div>' : '';
      var on = cur && iso(y, m, num) === sel ? ' cal__n--on' : '';
      var today = (cur && y === TODAY.y && m === TODAY.m && num === TODAY.d && !on) ? ' cal__n--today' : '';
      out.push(cur && !ahead(y, m, num)
        ? '<button class="cal__d" type="button" data-d="' + iso(y, m, num) + '" data-go="w-home">' +
          head + '<div class="cal__n' + on + today + '"><b>' + num + '</b></div></button>'
        : '<button class="cal__d" type="button" disabled>' +
          head + '<div class="cal__n cal__n--off"><b>' + num + '</b></div></button>');
    }
    box.innerHTML = out.join('');
  }

  function day(scr) {
    var v = seeing();
    if (v) rewrite(scr, v);
    limits(scr, shown(scr));
  }

  /* 주소가 말한 날로 **날이 적히는 자리**를 갈아 끼운다 */
  function rewrite(scr, v) {
    var sel = iso(v.y, v.m, v.d);
    var other = !(v.y === BASE.y && v.m === BASE.m);

    /* 마크업이 쥔 달이 아니면 띠와 달을 다시 그린다 */
    if (other) {
      scr.querySelectorAll('.cal__week').forEach(function (b) { fill(b, v.y, v.m, sel, true); });
      scr.querySelectorAll('.calm__g').forEach(function (b) { fill(b, v.y, v.m, sel, false); });
    }

    scr.querySelectorAll('.cal__date').forEach(function (row) {
      var nums = row.querySelectorAll('.cal__num');   /* 연 · 월 · 일 */
      if (nums.length === 3) {
        nums[0].textContent = String(v.y);
        nums[1].textContent = two(v.m);
        nums[2].textContent = two(v.d);
      }
      var dow = row.querySelector('.cal__dow');
      if (dow) dow.textContent = WDAY[new Date(v.y, v.m - 1, v.d).getDay()];
      /* 달을 펴도 보던 날이 이어지게, 누르는 자리에 날을 적어 둔다 */
      if (row.hasAttribute('data-go')) row.setAttribute('data-d', sel);
    });

    if (!other) {
      scr.querySelectorAll('.cal__n--on,.cal__n--today').forEach(function (n) {
        n.classList.remove('cal__n--on');
        n.classList.remove('cal__n--today');
      });
      scr.querySelectorAll('.cal__d[data-d="' + sel + '"] .cal__n').forEach(function (n) {
        n.classList.add('cal__n--on');
      });
      /* 오늘이 아닌 날을 보는 동안에는 오늘이 점선 테로 남는다 */
      if (sel !== iso(TODAY.y, TODAY.m, TODAY.d)) {
        scr.querySelectorAll('.cal__d[data-d="' + iso(TODAY.y, TODAY.m, TODAY.d) + '"] .cal__n')
          .forEach(function (n) { n.classList.add('cal__n--today'); });
      }
    }

  }

  /* 휠과 닫는 길은 보고 있는 날에 맞춘다 — 주소가 말하지 않아도 */
  function limits(scr, v) {
    var sel = iso(v.y, v.m, v.d);

    /* 달을 닫는 길(꺾쇠 · 어두운 자리)은 **보던 날짜를 들고 간다**.
       들고 가지 않으면 휠로 날짜를 바꿔 놓고 닫는 순간 오늘로 되돌아간다.
       갈 곳도 그 날의 것이다 — 기록이 있는 날이면 그 장면으로 */
    var home = 'w-home';
    var cell = scr.querySelector('.cal__d[data-d="' + sel + '"][data-go]');
    if (cell) home = cell.dataset.go;
    scr.querySelectorAll('[data-keep]').forEach(function (b) {
      b.setAttribute('data-go', home);
      b.setAttribute('data-d', sel);
    });

    /* 휠도 그 날에서 시작한다. 짧은 달이면 없는 날은 덜어 낸다 */
    var w = { '연': v.y, '월': v.m, '일': v.d };
    scr.querySelectorAll('.wheel__c').forEach(function (c) {
      var kind = c.getAttribute('data-wheel');
      c.querySelectorAll('.wheel__i').forEach(function (it) {
        var n = +it.dataset.v;
        /* 그 칸을 그 값으로 바꿨을 때 앞날이 되면 덜어 낸다. 짧은 달의
           없는 날(11월 31일)도 같이 걸러진다 */
        it.hidden = kind === '연' ? ahead(n, v.m, 1)
                  : kind === '월' ? ahead(v.y, n, 1)
                  : (n > inMonth(v.y, v.m) || ahead(v.y, v.m, n));
      });
      c.setAttribute('data-pick', String(w[kind]));
    });

    /* '오늘' 은 되돌아가는 길이라, 오늘을 보는 동안에는 갈 데가 없다 */
    scr.querySelectorAll('.pill--today').forEach(function (b) {
      b.disabled = (sel === iso(TODAY.y, TODAY.m, TODAY.d));
      if (b.disabled) b.removeAttribute('data-go');
      else if (!b.hasAttribute('data-go')) b.setAttribute('data-go', 'w-home-done');
    });
  }

  /* ── 달을 옆으로 밀어 바꾼다 ──
     달 격자를 좌우로 밀면 앞뒤 달로 간다(시안 596:4064 의 주석 — '캘린더
     좌우 스와이프 시 이전·이후 달로 이동'). 고르고 있던 날은 그대로 들고
     간다: 짧은 달이면 그 달의 마지막 날로 내려앉는다.
     한 번에 60 이상 가로로 움직였고 세로보다 가로가 더 움직였을 때만
     민 것으로 친다 — 아래로 읽어 내려가다 손끝이 비뚤어진 것까지 민 것으로
     받으면 달이 제멋대로 넘어간다 */
  function swipe(scr) {
    var box = scr.querySelector('.calm__g');
    if (!box) return;
    var x0 = 0, y0 = 0, on = false;

    box.addEventListener('touchstart', function (e) {
      var t = e.changedTouches[0];
      x0 = t.clientX; y0 = t.clientY; on = true;
    }, { passive: true });

    box.addEventListener('touchend', function (e) {
      if (!on) return;
      on = false;
      var t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0;
      if (Math.abs(dx) < 60 || Math.abs(dx) <= Math.abs(dy)) return;
      move(scr, dx < 0 ? 1 : -1);
    }, { passive: true });

    /* 손가락이 없는 자리(브라우저)에서는 끌어서 민다 */
    box.addEventListener('mousedown', function (e) { x0 = e.clientX; y0 = e.clientY; on = true; });
    box.addEventListener('mouseup', function (e) {
      if (!on) return;
      on = false;
      var dx = e.clientX - x0, dy = e.clientY - y0;
      if (Math.abs(dx) < 60 || Math.abs(dx) <= Math.abs(dy)) return;
      move(scr, dx < 0 ? 1 : -1);
    });
  }

  /* 달을 n 만큼 옮긴다 — **보던 화면은 그대로**다. 달을 편 채로 있어야
     앞뒤 달을 이어 넘겨볼 수 있다. 고르고 있던 날은 들고 가되 짧은 달
     이면 그 달의 마지막 날로 내려앉는다(시안 596:4064 의 주석) */
  function move(scr, n) {
    var v = shown(scr);
    var t = new Date(v.y, v.m - 1 + n, 1);
    var y = t.getFullYear(), m = t.getMonth() + 1;
    if (ahead(y, m, 1)) return;        /* 아직 오지 않은 달로는 넘어가지 않는다 */
    var d = Math.min(v.d, inMonth(y, m));
    if (ahead(y, m, d)) d = TODAY.d;   /* 이 달이면 오늘까지 */
    var u = new URL(location.href);
    u.searchParams.set('d', iso(y, m, d));
    location.href = u.toString();
  }

  /* ── 휠로 갈아 끼운 바로 다음 화면 ──
     휠을 굴려 날짜가 바뀌면 화면이 다시 그려진다. 그때마다 달이 내려오고
     어두운 자리가 덮이는 몸짓을 되풀이하면, 값을 하나 고칠 때마다 화면이
     통째로 들썩인다 — 고친 것은 날짜 하나뿐인데.
     그래서 들어오는 몸짓은 끄고 **고른 자리가 한 번 깜빡인다**(css 의
     .is-applied). 표는 화면을 건너야 해서 세션에 적어 두고, 읽자마자
     지운다 — 다음에 그냥 열었을 때까지 따라오면 안 된다 */
  function applied() {
    try { sessionStorage.setItem('ap-applied', '1'); } catch (e) {}
  }

  (function () {
    var yes;
    try { yes = sessionStorage.getItem('ap-applied'); sessionStorage.removeItem('ap-applied'); }
    catch (e) { yes = null; }
    if (yes) document.documentElement.classList.add('is-applied');
  })();

  /* ── 년·월·일 휠 ──
     기기의 고르개는 꼴이 기기마다 달라(아이폰은 휠 · 안드로이드는 달력)
     직접 만든다. 굴리는 일은 브라우저가 하고(scroll-snap), 여기서 하는
     일은 셋뿐이다 — 처음에 고른 값을 가운데에 세우고, 쥐지 않은 값에
     멎으면 제자리로 되돌리고, 날이 바뀌면 그 날의 화면으로 넘긴다.
     ⚠ 굴러가는 **동안**은 아무것도 하지 않는다. 손이 멎고 한 박자(160ms)
       지나야 셈한다 — 굴리는 중에 화면을 넘기면 끝까지 굴릴 수가 없다. */
  var WHEEL_H = 44;   /* 칸 하나의 키 — css 의 .wheel__i 와 같아야 한다 */

  function wheel(scr) {
    scr.querySelectorAll('.wheel__c').forEach(function (c) {
      var items = c.querySelectorAll('.wheel__i');
      var pick = c.getAttribute('data-pick');
      var at = 0;
      items.forEach(function (it, n) { if (it.dataset.v === pick) at = n; });
      c.scrollTop = at * WHEEL_H;

      /* 첫 자리는 **몸짓 없이** 잡는다. 전환을 켜 둔 채로 표를 붙이면
         화면이 열릴 때마다(날짜를 갈아 끼운 바로 뒤가 그렇다) 고른 값이
         작은 데서 커지는 꼴이 된다 — 굴린 것이 아니라 그냥 그 자리였다.
         두 번 기다리는 것은, 한 번으로는 브라우저가 첫 꼴을 그리기 전에
         표가 붙어 전환이 되살아나기 때문이다 */
      c.classList.add('is-set');
      mark(c, items);
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { c.classList.remove('is-set'); });
      });

      var idle;
      c.addEventListener('scroll', function () {
        mark(c, items);                 /* 굴러가는 동안에도 가운데는 표시한다 */
        clearTimeout(idle);
        idle = setTimeout(function () { stop(c, items); }, 160);
      }, { passive: true });
    });
  }

  /* 가운데에 든 값에 표를 붙인다 — 크고 짙은 꼴은 css 가 쥔다(--on) */
  function mark(c, items) {
    var n = Math.round(c.scrollTop / WHEEL_H);
    items.forEach(function (it, i) { it.classList.toggle('wheel__i--on', i === n); });
  }

  function stop(c, items) {
    var n = Math.round(c.scrollTop / WHEEL_H);
    if (n < 0) n = 0;
    if (n > items.length - 1) n = items.length - 1;
    var it = items[n];
    if (it.hidden) return;

    var v = String(it.dataset.v);
    if (v === c.getAttribute('data-pick')) return;

    /* 어느 칸을 굴렸든 **달력이 그 날짜로 바뀐다**(시안 21:2807 의 주석).
       달을 편 채로 있어야 고른 날이 달의 어디인지가 보인다 — 그래서
       화면은 지금 보던 그대로 두고 날짜만 갈아 끼운다 */
    var now = shown(c.closest('.scr'));
    var kind = c.getAttribute('data-wheel');
    var y = kind === '연' ? +v : now.y;
    var m = kind === '월' ? +v : now.m;
    var d = kind === '일' ? +v : now.d;
    d = Math.min(d, inMonth(y, m));

    var u = new URL(location.href);
    u.searchParams.set('d', iso(y, m, d));
    applied();
    location.href = u.toString();
  }

  /* ── 날짜 띠를 고른 날이 보이는 자리에 둔다 ──
     띠에는 한 달이 다 들어 있어 폰에서는 일곱 날만 보인다. 그대로 두면
     맨 앞(1일)이 보이는데, 이 화면이 말하는 때는 **고른 날**이라 그 날이
     가운데 오게 밀어 둔다. 옆으로 밀면 나머지 날이 나온다.
     한 달이 다 들어가는 넓은 폭에서는 밀 것이 없어 아무 일도 않는다.
     (화면 안의 동작을 흉내 내는 것이 아니라, 띠를 **어디서부터 보여
     줄지**를 정하는 일이다 — 머리말이 말한 이 파일의 몫 그대로다) */
  function roll(scr) {
    scr.querySelectorAll('.cal__week').forEach(function (w) {
      var on = w.querySelector('.cal__n--on');
      var cell = on && on.closest('.cal__d');
      if (!cell) { w.scrollLeft = w.scrollWidth - w.clientWidth; return; }
      /* 고른 날이 **든 주**를 통째로 보여 준다 — 그 날만 가운데 두면
         일요일에서 시작하지 않아, 달을 폈을 때의 요일 줄과 어긋난다 */
      var all = w.querySelectorAll('.cal__d');
      var i = Array.prototype.indexOf.call(all, cell);
      var head = all[i - (i % 7)];
      /* 굴린 자리를 **재서** 옮긴다 — offsetLeft 는 띠가 아니라 자리를
         잡아 둔 조상(.scr)에서 재는 값이라 띠의 굴림 값과 다르다 */
      w.scrollLeft += head.getBoundingClientRect().left - w.getBoundingClientRect().left;
    });
  }

  /* ── 과녁 위의 시계 ──
     이것은 **흉내 내는 동작이 아니라 기기의 시계**다. 촬영·인증처럼 앱이
     하는 일은 여기서 흉내 내지 않지만(머리말), 지금 몇 시인지는 앱의
     일이 아니라 시계의 일이고 화면 어디서도 그것을 멈춰 둘 까닭이 없다 —
     멈춘 수가 1초마다 바뀌는 자리에 박혀 있으면 화면이 죽은 것으로 보인다.
     고쳐 쓰는 것은 그 수가 든 칸 하나뿐이다(아이콘은 건드리지 않는다). */
  function clock(scr) {
    var els = scr.querySelectorAll('.cta__now');
    if (!els.length) return;
    function two(n) { return (n < 10 ? '0' : '') + n; }
    function tick() {
      var d = new Date();
      var t = two(d.getHours()) + ':' + two(d.getMinutes()) + ':' + two(d.getSeconds());
      els.forEach(function (e) { if (e.textContent !== t) e.textContent = t; });
    }
    tick();
    setInterval(tick, 1000);
  }

  /* ── 화면과 화면 사이 — `data-go` ──
     누르면 어느 화면으로 가는지를 마크업이 적어 둔다(data-go="w-work").
     이것은 **화면 안의 동작이 아니라 어느 화면을 보여 줄지**라, 머리말이
     말한 이 파일의 몫 그대로다 — 촬영이 되는 것을 흉내 내는 것이 아니라,
     촬영을 누른 다음 장면을 넘겨 주는 것이다.

     주소를 갈아 끼워 **다시 그린다**. 남겨 두고 숨기는 길도 있지만,
     그러면 한 장만 남기고 덜어 내는 규칙이 깨져 화면설명의 앵커가
     엉뚱한 화면을 짚는다(pick() 의 ⚠). 주소의 다른 값(proto-frame · w)은
     그대로 둔다 — 틀 안에서 눌러도 폭이 이어져야 한다.

     `data-go-self` 가 붙은 것은 **제 몸을 바로 눌렀을 때만** 간다. 창
     뒤의 어두운 자리(.dim)가 그렇다 — 창 안을 누른 것까지 '닫기' 로
     받으면 아무것도 못 누른다. */
  function link(hit) {
    hit.addEventListener('click', function (e) {
      var go = e.target.closest ? e.target.closest('[data-go]') : null;
      if (!go || !hit.contains(go)) return;
      if (go.hasAttribute('data-go-self') && e.target !== go) return;
      if (go.disabled) return;
      e.preventDefault();
      var u = new URL(location.href);
      u.searchParams.set('screen', go.dataset.go);
      /* 누른 것이 날을 쥐고 있으면 실어 보내고, 아니면 지운다 — 지우지
         않으면 다른 화면에 갔다 돌아올 때 지난 날이 따라온다 */
      if (go.hasAttribute('data-d')) u.searchParams.set('d', go.getAttribute('data-d'));
      else u.searchParams.delete('d');
      var url = u.toString();

      /* 시트가 떠 있는 화면에서 떠날 때는 **내려가는 것을 보여 주고** 간다.
         바로 주소를 갈면 시트가 사라진 뒤에야 다음 화면이 그려져, 올라올
         때는 밀려 올라오고 닫힐 때는 툭 꺼지는 짝이 안 맞는 꼴이 된다.
         기다리는 길이는 css 가 정한 --ap-dur-sheet-out 을 그대로 읽는다 —
         두 곳에 적으면 한쪽만 고쳐져 따로 늙는다. */
      /* `data-go-now` 는 **내려가는 몸짓을 건너뛴다**. 내려가는 그림은
         '여기서 나간다' 는 말이라 닫기(✕)와 뒤의 어두운 자리 몫이다 —
         시트가 권하는 일을 눌러 앞으로 갈 때까지 접히고 나면, 다음
         화면으로 가는 길이 한 번 물러섰다 다시 나아가는 꼴이 된다 */
      var sheet = go.hasAttribute('data-go-now') ? null : hit.querySelector('.dim--sheet');
      var slow = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;
      if (!sheet || slow) { location.href = url; return; }

      sheet.classList.add('is-off');
      var ms = parseFloat(getComputedStyle(hit).getPropertyValue('--ap-dur-sheet-out')) || 240;
      setTimeout(function () { location.href = url; }, ms);
    });
  }

  /* 떠 있는 창(촬영 확인)은 뒤에 그 창을 띄운 화면을 둔다. 그 화면을 여기
     옮겨 적지 않고 켜기 직전에 **베껴** 온다 — 같은 마크업을 두 곳에 적으면
     한쪽만 고쳐져 따로 늙는다. 어느 화면 위인지는 `data-behind` 가 말한다.
     화면 안의 동작을 흉내 내는 것이 아니라, 한 장의 화면을 짜 맞추는 일이다. */
  function behind(hit) {
    var name = hit.dataset.behind;
    var src = name && document.querySelector('.scr[data-screen="' + name + '"]');
    if (!src) return;

    var back = src.cloneNode(true);
    /* 베낀 쪽은 더 이상 '화면'이 아니다 — 이름을 지워 골라지지 않게 하고,
       읽는 기계와 탭 이동에서 뺀다. id 가 겹치면 라벨이 엉뚱한 칸을 가리킨다 */
    back.removeAttribute('data-screen');
    back.removeAttribute('data-title');
    back.removeAttribute('data-behind');
    back.setAttribute('aria-hidden', 'true');
    back.setAttribute('inert', '');
    back.className = src.className + ' is-on behind';
    back.querySelectorAll('[id]').forEach(function (n) { n.removeAttribute('id'); });
    hit.insertBefore(back, hit.firstChild);
  }

  /* 위의 탭과 아래의 버튼은 아래로 읽어 내려가는 동안 비켜 있다가, 스크롤이
     멎으면 돌아온다. 이것은 앱의 일(촬영·인증)이 아니라 **화면이 스크롤에
     보이는 모습**이라, 보여 주려면 여기서 붙였다 뗄 수밖에 없다 — 올려
     읽으면 기다리지 않고 바로 돌아온다. 읽던 것을 가리는 쪽이 늘 더 나쁘다 */
  function stow(scr) {
    var sc = scr.querySelector('.body');
    if (!sc) return;

    var act = scr.querySelector('.act');
    if (!act) return;

    /* 바닥 탭이 있는 화면에서는 바가 그 위에 줄 서 있어야 하므로 띄우지
       않는다 — 띄우지 않으면 내려가 봐야 빈 띠만 남으니 비키지도 않는다 */
    if (scr.querySelector('.tabbar')) return;

    /* 바를 목록 위로 띄우고, 목록 아래에 그 높이만큼 여백을 둔다. 여백은
       한 번 정하고 바뀌지 않으므로 굴러가는 상자의 크기도 바뀌지 않는다 */
    scr.style.setProperty('--ap-act-h', act.offsetHeight + 'px');
    scr.classList.add('has-float-act');

    var parts = [act];
    var room = 16;

    /* 탭이 접히고 펴지는 동안에도 스크롤 이벤트가 온다 — 자리가 줄고 늘어
       스크롤 값이 밀리기 때문이다. 그것을 손가락이 낸 것으로 치면, 접히며
       민 값이 '더 내려 읽었다'가 되어 다시 접고, 펴지며 민 값이 또 접게
       만든다. 내가 낸 움직임이 끝날 때까지(260ms) 못 본 척한다 */
    var gone = false, deaf = 0;
    function away(yes) {
      if (yes === gone) return;
      gone = yes;
      deaf = Date.now() + 260;
      parts.forEach(function (n) { n.classList.toggle('is-away', yes); });
    }

    var last = sc.scrollTop, idle;
    sc.addEventListener('scroll', function () {
      var now = sc.scrollTop, moved = now - last;
      last = now;

      /* 멎었는지 재는 시계는 **어떤 스크롤에도** 다시 감는다. 귀를 닫은
         동안에도 손가락은 움직이고 있다 — 여기서 감지 않으면, 접자마자
         걸어 둔 시계가 귀를 닫은 사이에 끝나 버려 읽어 내려가는 중인데도
         바가 돌아왔다가 다시 접힌다(깜빡인다) */
      clearTimeout(idle);
      idle = setTimeout(function () { away(false); }, 220);

      if (Date.now() < deaf) return;

      /* 4px 는 손가락이 멎은 채로 생기는 떨림을 걸러 내는 문턱이다 */
      var left = sc.scrollHeight - sc.clientHeight - now;
      if (moved > 4 && left > room) away(true);
      else if (moved < -4) away(false);
    }, { passive: true });
  }

  /* 아이콘은 스프라이트를 주입해 쓴다 (시스템 규약: 원격 절대 URL) */
  function sprite() {
    fetch('https://namiruan.github.io/kbz_3.0_ui_stytem/icons/sprite.svg')
      .then(function (r) { return r.text(); })
      .then(function (svg) {
        var d = document.createElement('div');
        d.setAttribute('aria-hidden', 'true');
        d.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
        d.innerHTML = svg;
        document.body.insertBefore(d, document.body.firstChild);
      }).catch(function () {});
  }

  function boot() { pick(); sprite(); }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
