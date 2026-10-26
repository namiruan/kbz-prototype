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

  /* ── 어느 날을 보는가 — 주소의 `d` ──
     하이파이 화면은 **정해진 장면**이라 '아직 안 찍힌 날' 의 장면은 하나
     (w-home)뿐이다. 그 한 장면을 어느 날로도 쓸 수 있게, 날만 주소에
     싣고(`?screen=w-home&d=21`) 날짜가 적히는 자리를 갈아 끼운다 —
     날짜를 누를 때마다 20일로 되돌아가 보이던 까닭이 이것이었다.
     갈아 끼우는 것은 **날이 적히는 자리**뿐이다: 날짜 칸 · 요일 · 띠와
     달의 고른 날 · '오늘'. 찍힌 시각이나 작업내용 같은 그 날의 기록은
     장면이 쥔 것이라 건드리지 않는다(기록이 있는 날은 제 장면이 따로
     있다 — 19일 · 20일).
     2026년 10월 한 달만 쥐고 있다. 1일이 목요일이라 요일은 세어서 낸다 */
  var DOW = ['목', '금', '토', '일', '월', '화', '수'];
  var TODAY = 20;

  function day(scr) {
    var d = parseInt(new URL(location.href).searchParams.get('d'), 10);
    if (!(d >= 1 && d <= 31)) return;
    function two(n) { return (n < 10 ? '0' : '') + n; }

    scr.querySelectorAll('.cal__date').forEach(function (row) {
      var nums = row.querySelectorAll('.cal__num');   /* 연 · 월 · 일 */
      if (nums.length === 3) nums[2].textContent = two(d);
      var dow = row.querySelector('.cal__dow');
      if (dow) dow.textContent = DOW[(d - 1) % 7];
      /* 달을 펴도 보던 날이 이어지게, 누르는 자리에 날을 적어 둔다 */
      if (row.hasAttribute('data-go')) row.setAttribute('data-d', String(d));
    });

    scr.querySelectorAll('.cal__n--on,.cal__n--today').forEach(function (n) {
      n.classList.remove('cal__n--on');
      n.classList.remove('cal__n--today');
    });
    scr.querySelectorAll('.cal__d[data-d="' + d + '"] .cal__n').forEach(function (n) {
      n.classList.add('cal__n--on');
    });
    /* 오늘이 아닌 날을 보는 동안에는 오늘이 점선 테로 남는다 */
    if (d !== TODAY) {
      scr.querySelectorAll('.cal__d[data-d="' + TODAY + '"] .cal__n').forEach(function (n) {
        n.classList.add('cal__n--today');
      });
    }

    /* 휠의 '일' 칸도 그 날에서 시작한다 */
    var dc = scr.querySelector('.wheel__c[data-wheel="일"]');
    if (dc) dc.setAttribute('data-pick', String(d));

    /* '오늘' 은 되돌아가는 길이라, 오늘을 보는 동안에는 갈 데가 없다 */
    scr.querySelectorAll('.pill--today').forEach(function (b) {
      b.disabled = (d === TODAY);
      if (b.disabled) b.removeAttribute('data-go');
      else if (!b.hasAttribute('data-go')) b.setAttribute('data-go', 'w-home-done');
    });
  }

  /* ── 년·월·일 휠 ──
     기기의 고르개는 꼴이 기기마다 달라(아이폰은 휠 · 안드로이드는 달력)
     직접 만든다. 굴리는 일은 브라우저가 하고(scroll-snap), 여기서 하는
     일은 셋뿐이다 — 처음에 고른 값을 가운데에 세우고, 쥐지 않은 값에
     멎으면 제자리로 되돌리고, 날이 바뀌면 그 날의 화면으로 넘긴다.
     ⚠ 굴러가는 **동안**은 아무것도 하지 않는다. 손이 멎고 한 박자(160ms)
       지나야 셈한다 — 굴리는 중에 화면을 넘기면 끝까지 굴릴 수가 없다. */
  var WHEEL_H = 35;

  function wheel(scr) {
    scr.querySelectorAll('.wheel__c').forEach(function (c) {
      var items = c.querySelectorAll('.wheel__i');
      var pick = c.getAttribute('data-pick');
      var at = 0;
      items.forEach(function (it, n) { if (it.dataset.v === pick) at = n; });
      c.scrollTop = at * WHEEL_H;

      var idle;
      c.addEventListener('scroll', function () {
        clearTimeout(idle);
        idle = setTimeout(function () { stop(c, items); }, 160);
      }, { passive: true });
    });
  }

  function stop(c, items) {
    var n = Math.round(c.scrollTop / WHEEL_H);
    if (n < 0) n = 0;
    if (n > items.length - 1) n = items.length - 1;
    var it = items[n];

    /* 쥐지 않은 해·달이면 제자리로 되돌린다 */
    if (it.classList.contains('wheel__i--off')) {
      var back = 0;
      items.forEach(function (x, i) { if (x.dataset.v === c.getAttribute('data-pick')) back = i; });
      c.scrollTo({ top: back * WHEEL_H, behavior: 'smooth' });
      return;
    }

    if (c.getAttribute('data-wheel') !== '일') return;
    var d = parseInt(it.dataset.v, 10);
    if (String(d) === c.getAttribute('data-pick')) return;

    /* 그 날에 제 장면이 있으면 그리로, 없으면 아직 안 찍힌 날의 장면으로 */
    var hit = document.querySelector('.cal__d[data-d="' + d + '"][data-go]');
    var u = new URL(location.href);
    u.searchParams.set('screen', hit ? hit.dataset.go : 'w-home');
    u.searchParams.set('d', String(d));
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
