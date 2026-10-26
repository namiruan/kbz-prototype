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
    edge(hit);
    document.title = (hit.dataset.title || '안면 출퇴근') + ' · 김반장';
  }

  /* ── 화면 밖에 남는 띠의 색 ──
     홈 화면에서 연 창은 기기 화면보다 짧고(아이폰 16 Pro: 화면 874 ·
     창 812), 남는 자리는 창 밖이라 어느 요소도 칠하지 못한다. 거기
     깔리는 것은 **문서의 바탕색**이라, 켜진 화면의 윗단 색에 맞춘다.

     ⚠ 어느 색인지는 css 가 쥔다(--ap-edge). 여기서는 **어느 화면인가**
       만 표로 붙인다 — 색을 여기 적으면 css 와 두 곳으로 갈라진다.
       차례가 있다: 창이 떠 있으면 그 창이 윗단이고, 아니면 카메라,
       그다음이 머리줄이다(css 의 차례와 같다).
     theme-color 에도 같은 색을 적어 둔다 — 기기가 띠를 문서 바탕이
     아니라 이 값으로 칠하는 수도 있다. 읽어서 옮길 뿐이라 값은 한 곳
     (css)에 그대로 있다. */
  function edge(scr) {
    var name = scr.querySelector('.confirm') ? 'shot' :
               scr.querySelector('.dim--sheet') ? 'dim' :
               scr.querySelector('.cam') ? 'cam' :
               scr.querySelector('.nav') ? 'nav' : '';
    var root = document.documentElement;
    if (name) root.classList.add('edge--' + name);

    var c = getComputedStyle(root).getPropertyValue('--ap-edge').trim();
    if (!c) return;
    var m = document.querySelector('meta[name="theme-color"]');
    if (!m) {
      m = document.createElement('meta');
      m.setAttribute('name', 'theme-color');
      document.head.appendChild(m);
    }
    m.setAttribute('content', c);
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
