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

  /* ── 창은 확대하지 않는다 ──
     앱 셸이라, 핀치로 창을 키우면 틀(100svh)은 그대로인 채 보이는 자리만
     좁아진다 — 시트가 화면 바닥에서 떨어지고 그 아래로 문서 바탕이
     드러난다. 실제 앱에서는 일어나지 않는 일이다.
     막는 자리가 둘인 것은 기기마다 확대가 일어나는 층이 다르기 때문이다:
     안드로이드(크롬)는 css 의 touch-action 이 잡고, 아이폰(사파리)은
     그것을 듣지 않아 **제스처 이벤트**를 막아야 한다.
     ⚠ 지도 안에서도 막는다 — 지도의 확대는 창을 키우는 것이 아니라 지도가
       제 그림을 키우는 일이라(zoom), 브라우저까지 끼어들면 둘이 겹친다.
     ⚠ 데스크톱 브라우저의 확대(ctrl + 휠 · ctrl + +)는 그대로 둔다 —
       글씨를 키워 읽는 길까지 막을 까닭은 없다 */
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (t) {
    document.addEventListener(t, function (e) { e.preventDefault(); }, { passive: false });
  });
  document.addEventListener('touchmove', function (e) {
    if (e.touches.length > 1) e.preventDefault();
  }, { passive: false });

  /* ── 끈 뒤에 따라오는 눌림 한 번 ──
     끌던 손가락은 끌던 것 **밖에서** 떨어진다. 그때 눌린 것으로 치는 자리는
     누른 데와 뗀 데의 공통 조상 — 시트 위에서는 어두운 자리다. 그대로 두면
     지도를 끌려다 시트가 닫힌다. 그 한 번만 삼킨다.
     ⚠ setTimeout(0) 으로 걷으면 안 된다 — 눌림은 손을 뗀 **다음 차례**에
       오므로 0 짜리 시계가 먼저 돌아 표가 걷힌다 */
  function swallow() {
    var kill = function (ev) {
      ev.stopPropagation(); ev.preventDefault();
      document.removeEventListener('click', kill, true);
    };
    document.addEventListener('click', kill, true);
    setTimeout(function () { document.removeEventListener('click', kill, true); }, 300);
  }

  /* pick() 이 덜어 낸 화면을 이름으로 쥐고 있는 선반. 문서 밖이다 */
  var SHELF = {};

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
    all.forEach(function (s) {
      if (s === hit) return;
      /* 문서에서는 덜어 내되 **손에는 쥔다**(SHELF). 같은 문서에서 띄우는
         길(soft)이 여기서 꺼내 쓴다. 문서 밖에 있는 동안은
         document.querySelector 가 찾지 못하므로 앵커는 그대로 안전하다 */
      if (s.dataset.screen) SHELF[s.dataset.screen] = s;
      /* ⚠ autofocus 를 떼어 둔다. 선반에서 꺼내 다시 꽂을 때(soft) 브라우저가
         그 표를 다시 집어 초점을 옮기고, 그 바람에 본문이 그 칸까지 되감긴다 —
         탭을 눌렀을 뿐인데 읽던 자리가 맨 위로 날아갔다. 처음 선 화면의
         초점은 js 가 준다(seek) */
      s.querySelectorAll('[autofocus]').forEach(function (n) { n.removeAttribute('autofocus'); });
      s.remove();
    });
    hit.classList.add('is-on');
    stow(hit);
    link(hit);
    clock(hit);
    stamp(hit);
    regshot(hit);
    tally(hit);
    gate(hit);
    grow(hit);
    zoom(hit);
    wait(hit);
    note(hit);
    terms(hit);
    day(hit);
    roll(hit);
    wheel(hit);
    swipe(hit);
    deck(hit);
    seek(hit);
    pad(hit);
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
    /* 카메라 위로 시트가 올라온 자리 — 윗단이 카메라 그대로가 아니라
       어두운 막이 한 겹 덮인 값이다. 'cam' 보다 **앞에** 둔다: 뒤에 두면
       /^[wm]-cam/ 이 먼저 집어 간다 */
    /* ⚠ 끝을 못 박지 않는다($) — 이름이 길어진 갈래가 생기면 바로 아래
       'cam' 이 집어 가, 막이 덮인 자리에 카메라 그대로의 윗단(#3c4043)이
       깔린다 */
    ['camdim', /^m-cam-(new|fail)/],
    ['cam',  /^[wm]-cam/],        /* 카메라 — 사진의 윗단 */
    ['shot', /^[wm]-shot$/],      /* 촬영 확인 — 사진 위에 덮인 창 */
    ['dim',  /^w-(map|face|away)$/], /* 뜬 창 뒤의 어두운 자리 */
    /* 같은 막이지만 뒤가 **흰 폼**이라 한 단 밝다 — 'nav' 보다 앞에 둔다 */
    ['dimform', /^(m-dup-|m-worker-del|m-workers-filter-sta)/],
    /* 윗단은 'dimform' 과 같은 색이다 — 따로 둔 것은 **창 밖 아래쪽**이
       달라서다(css 의 ⚠). 자판이 뜨면 그 자리가 드러난다 */
    ['dimfind', /^(m-verify-find|m-workers-filter-job)/],
    ['nav',  /^(w-(work|reg|cal)|m-)/] /* 흰 머리줄 · 펴진 달 */
  ];

  function edge() {
    var want = new URL(location.href).searchParams.get('screen') || '';
    var root = document.documentElement;
    /* 같은 문서에서 화면을 갈아 띄우면(soft) 두 번째로 불린다 — 앞 띠를
       걷지 않으면 둘이 겹쳐, 먼저 적힌 쪽이 그대로 남는다 */
    Array.prototype.slice.call(root.classList).forEach(function (c) {
      if (c.indexOf('edge--') === 0) root.classList.remove(c);
    });
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

  /* ── 달력 — 기기의 오늘을 가운데 두고 ──
     하이파이 화면은 **정해진 장면**이라 '아직 안 찍힌 날' 의 장면은 하나
     (w-home)뿐이다. 그 한 장면을 어느 날로도 쓸 수 있게, 보는 날을 주소에
     싣고(`?screen=w-home&d=2026-10-27`) 날이 적히는 자리를 갈아 끼운다.

     **날은 기기에 묻는다.** 오늘은 기기의 오늘이고, 기록이 걸린 날은
     오늘과 어제다 — 날짜를 박아 두면 하루만 지나도 '오늘' 이 지난 날이
     되어, 화면이 멈춰 있는 것으로 보인다(과녁 위의 시계를 기기에 묻는
     것과 같은 까닭이다).
     그래서 달력의 칸은 마크업이 아니라 여기서 그린다 — 띠도 달도 같은
     칸(.cal__d)이라 한 자리에서 낸다.

     화면마다 제 날과 제 기록이 있다(마크업의 data-day · data-rec):
       data-day   today     이 화면이 보는 날은 오늘이다
                  yesterday 어제다 — 익일 퇴근의 '다음 날' 이 쓴다
                  day2      이틀 전이다 — 익일 퇴근의 근무일이 쓴다
                  day3      사흘 전이다 — 익일 퇴근의 근무일이 쓴다
                  day4      나흘 전이다 — 지난 날 보기가 쓴다

     ⚠ **오늘은 언제나 '출근 전' 이다.** 어느 화면에서 오늘 칸을 눌러도
       아직 아무것도 찍히지 않은 홈이 선다 — 하루가 흘러가는 모습(출근
       완료 → 작업내용 → 퇴근 완료)은 어제 하루에 모아 두었다. 그래야
       '지금 앱을 열면 무엇이 보이는가' 가 한 가지로 선다
       data-now   이 이야기의 '오늘'. 적지 않으면 기기의 오늘이다. 익일
                  퇴근은 아직 다음 날 새벽에 서 있어, 그 뒤의 날은 아직
                  오지 않은 날로 막는다
       data-rec   none      쥔 날에 아직 찍힌 것이 없다(점 없음)
                  open      출근만 찍혔다(경고색 점)
                  done      하루가 닫혔다(브랜드 점)
       data-rec-today · -yday · -day2 · -day3 — 쥐지 않은 날의 기록
       data-go-today · -yday · -day2 · -day3 — 그 날 칸을 누르면 갈 화면.
                  한 날에 걸린 이야기가 시나리오마다 달라서, 길도 화면이
                  쥔다(적지 않으면 예사 하루로 간다)

     ⚠ **시나리오끼리 날을 겹쳐 쓰지 않는다.** 같은 날에 서로 다른 기록이
       걸리면 넘겨 볼 때 어느 이야기였는지 섞인다. 한 이야기의 여러 순간
       (출근 전 → 출근 완료 → 퇴근 완료)만 같은 날을 쓴다.
       기록이 걸린 날은 셋이다 — 이틀 전 · 어제 · 오늘 */
  var NOW = new Date();
  var TODAY = { y: NOW.getFullYear(), m: NOW.getMonth() + 1, d: NOW.getDate() };
  var YDAY = (function () {
    var t = new Date(TODAY.y, TODAY.m - 1, TODAY.d - 1);
    return { y: t.getFullYear(), m: t.getMonth() + 1, d: t.getDate() };
  })();
  var DAY2 = (function () {
    var t = new Date(TODAY.y, TODAY.m - 1, TODAY.d - 2);
    return { y: t.getFullYear(), m: t.getMonth() + 1, d: t.getDate() };
  })();
  var DAY3 = (function () {
    var t = new Date(TODAY.y, TODAY.m - 1, TODAY.d - 3);
    return { y: t.getFullYear(), m: t.getMonth() + 1, d: t.getDate() };
  })();
  var DAY4 = (function () {
    var t = new Date(TODAY.y, TODAY.m - 1, TODAY.d - 4);
    return { y: t.getFullYear(), m: t.getMonth() + 1, d: t.getDate() };
  })();
  /* 기록이 걸릴 수 있는 날들 — 오늘부터 거슬러 넷. 이름은 마크업의
     data-day 값이자 data-rec-* · data-go-* 의 꼬리다 */
  var DAYS = [TODAY, YDAY, DAY2, DAY3, DAY4];
  var KEY = ['today', 'yday', 'day2', 'day3', 'day4'];
  var SAY = { today: 0, yesterday: 1, yday: 1, day2: 2, day3: 3, day4: 4 };
  function nth(y, m, d) {
    var n = y * 10000 + m * 100 + d;
    for (var i = 0; i < DAYS.length; i++) if (num(DAYS[i]) === n) return i;
    return -1;
  }
  var WDAY = ['일', '월', '화', '수', '목', '금', '토'];

  function two(n) { return (n < 10 ? '0' : '') + n; }
  function iso(y, m, d) { return y + '-' + two(m) + '-' + two(d); }
  function inMonth(y, m) { return new Date(y, m, 0).getDate(); }
  function num(v) { return v.y * 10000 + v.m * 100 + v.d; }
  /* 오늘보다 뒤인 날은 고를 수 없다 — 아직 오지 않은 날에는 찍을 것도
     볼 것도 없다. 달에서도 띠에서도 휠에서도 같다 */
  function ahead(y, m, d, now) { return (y * 10000 + m * 100 + d) > num(now || TODAY); }
  /* **이 이야기의 오늘.** 기기의 오늘이 아니라 화면이 쥔 날이다(data-now).
     익일 퇴근을 보는 중이면 그 이야기는 아직 26일 새벽에 서 있어, 27일은
     아직 오지 않은 날이다 — 고를 수 있게 두면 그 뒤에 출근을 찍은 화면이
     나와서 앞뒤가 뒤집힌다. 적지 않으면 기기의 오늘이다 */
  function nowOf(scr) { return DAYS[SAY[scr.getAttribute('data-now')] || 0]; }

  /* 그 날이 쥔 장면과 점. 오늘과 어제만 제 장면이 있다.
     `rec`(data-rec)은 **이 화면이 쥔 날**의 기록이다 — 그 날이 어제면
     어제의 점이 그것을 따른다(익일 퇴근: 어제 출근하고 퇴근이 아직
     없으면 어제가 경고색이다). 오늘을 보는 화면에서는 어제가 쥔 날이
     아니므로 하루가 끝난 점(파랑)으로 둔다 */
  function role(y, m, d, mk) {
    var i = nth(y, m, d);
    if (i < 0) return { go: 'w-home', dot: null };
    var mine = mk.sel === iso(y, m, d);
    /* 쥔 날이면 그 날의 기록(data-rec), 아니면 화면이 그 날을 두고 따로
       적어 둔 것(data-rec-오늘|어제|…). 아무 말이 없으면 없다 */
    var k = mine ? mk.rec : mk.recAt(i);
    var dot = k === 'open' ? 'open' : k === 'done' ? 'on' : null;
    /* **가는 곳도 화면마다 다르다.** 한 날에 걸린 이야기가 시나리오마다
       달라서다 — 익일 퇴근을 보는 중이면 그 날은 '퇴근이 남은 근무일'
       이고, 예사 하루를 보는 중이면 그냥 지나간 날이다. 마크업이 말하지
       않으면 예사 하루로 둔다 */
    var go = mk.goAt(i) || (i === 0 ? 'w-home-done' : 'w-home-past');
    /* 지난 날은 아무 말이 없으면 **하루가 끝난 날**로 둔다 — 찍고 나서
       지나간 것이 예사다. 오늘은 그렇지 않다(아직 찍을 것이 남았다) */
    return { go: go, dot: i === 0 ? dot : (k ? dot : 'on') };
  }

  /* 이 화면이 어느 날에 무슨 기록을 쥐었는지 — 달 격자와 띠가 같은 것을 본다 */
  function marks(scr, sel) {
    return { sel: sel,
             now: nowOf(scr),
             rec: scr.getAttribute('data-rec') || 'none',
             recAt: function (i) { return scr.getAttribute('data-rec-' + KEY[i]); },
             goAt: function (i) { return scr.getAttribute('data-go-' + KEY[i]); } };
  }

  /* 주소가 말한 날. 아무 말이 없으면 없다고 답한다 — 그때는 화면이 제
     날(data-day)을 쥔다. 앞날을 가리키면 오늘로 내려앉는다 */
  function seeing(now) {
    var v = new URL(location.href).searchParams.get('d');
    if (!v) return null;
    var p = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
    if (!p) return null;
    var y = +p[1], m = +p[2], d = +p[3];
    if (m < 1 || m > 12 || d < 1 || d > inMonth(y, m)) return null;
    if (ahead(y, m, d, now)) return now || TODAY;
    return { y: y, m: m, d: d };
  }

  function shown(scr) {
    var i = SAY[scr.getAttribute('data-day')];
    return seeing(nowOf(scr)) || DAYS[i || 0];
  }

  /* 한 달치 칸을 낸다. 일요일에서 시작해 주 단위로 떨어지고, 달 밖의
     날도 자리를 지킨다(고를 수는 없다) — 달 격자와 띠가 같은 칸을 같은
     차례로 쥐어야 요일 줄이 두 꼴에서 같은 자리에 온다.
     `wd` 가 참이면 칸마다 요일을 얹는다(띠), 거짓이면 숫자만(달 격자 —
     요일은 위에 한 줄로 따로 선다) */
  function fill(box, v, wd, mk) {
    var sel = mk.sel;
    var y = v.y, m = v.m;
    var lead = new Date(y, m - 1, 1).getDay();
    var n = inMonth(y, m), back = inMonth(y, m === 1 ? 12 : m - 1);
    var rows = Math.ceil((lead + n) / 7), out = [];

    for (var i = 0; i < rows * 7; i++) {
      var k = i - lead + 1, cur = k >= 1 && k <= n;
      var d = cur ? k : (k < 1 ? back + k : k - n);
      var w = WDAY[i % 7];
      var head = wd ? '<div class="cal__w' +
        (w === '일' ? ' cal__w--sun' : w === '토' ? ' cal__w--sat' : '') + '">' + w + '</div>' : '';

      if (!cur || ahead(y, m, d, mk.now)) {
        out.push('<button class="cal__d" type="button" disabled>' +
          head + '<div class="cal__n cal__n--off"><b>' + d + '</b></div></button>');
        continue;
      }
      var r = role(y, m, d, mk);
      var on = iso(y, m, d) === sel ? ' cal__n--on' : '';
      var today = (!on && y === mk.now.y && m === mk.now.m && d === mk.now.d) ? ' cal__n--today' : '';
      var open = r.dot === 'open' ? ' cal__n--open' : '';
      out.push('<button class="cal__d" type="button" data-d="' + iso(y, m, d) + '" data-go="' + r.go + '">' +
        head + '<div class="cal__n' + on + today + open + '"><b>' + d + '</b>' +
        (r.dot ? '<i></i>' : '') + '</div></button>');
    }
    box.innerHTML = out.join('');
  }

  /* 휠의 칸도 여기서 낸다 — 앞날은 **아예 나오지 않는다** */
  function cols(scr, v) {
    scr.querySelectorAll('.wheel__c').forEach(function (c) {
      var kind = c.getAttribute('data-wheel'), out = [], i;
      var now = nowOf(scr);
      if (kind === '연') {
        for (i = now.y - 4; i <= now.y; i++) out.push([i, i + '년']);
      } else if (kind === '월') {
        for (i = 1; i <= 12; i++) if (!ahead(v.y, i, 1, now)) out.push([i, i + '월']);
      } else {
        for (i = 1; i <= inMonth(v.y, v.m); i++) if (!ahead(v.y, v.m, i, now)) out.push([i, i + '일']);
      }
      c.innerHTML = out.map(function (it) {
        return '<span class="wheel__i" data-v="' + it[0] + '">' + it[1] + '</span>';
      }).join('');
      c.setAttribute('data-pick', String(kind === '연' ? v.y : kind === '월' ? v.m : v.d));
    });
  }

  function day(scr) {
    var v = shown(scr), sel = iso(v.y, v.m, v.d);
    var mk = marks(scr, sel);

    scr.querySelectorAll('.cal__week').forEach(function (b) { fill(b, v, true, mk); });
    scr.querySelectorAll('.calm__g').forEach(function (b) { fill(b, v, false, mk); });

    /* 이력 조회의 날짜도 같은 날을 가리킨다 — 목록에서 고른 날을 열고
       들어온 자리라, 둘이 다른 날을 적으면 같은 날인지 되짚어야 한다 */
    scr.querySelectorAll('.stmp__d').forEach(function (e) {
      e.innerHTML = v.y + '. ' + two(v.m) + '. ' + two(v.d) +
        '<b>(' + WDAY[new Date(v.y, v.m - 1, v.d).getDay()] + ')</b>';
    });

    scr.querySelectorAll('.cal__date').forEach(function (row) {
      /* 근로자 앱의 머리줄은 연 · 월만 쥔다(날은 띠와 달이 고른다).
         현장소장 앱의 이력 줄은 하루치 목록이라 날까지 적는다 */
      var nums = row.querySelectorAll('.cal__num');   /* 연 · 월 [· 일] */
      if (nums.length >= 2) {
        nums[0].textContent = String(v.y);
        nums[1].textContent = two(v.m);
        if (nums[2]) nums[2].textContent = two(v.d);
      }
      var dow = row.querySelector('.cal__dow');
      if (dow) dow.textContent = WDAY[new Date(v.y, v.m - 1, v.d).getDay()];
      /* 달을 펴도 보던 날이 이어지게, 누르는 자리에 날을 적어 둔다 */
      if (row.hasAttribute('data-go')) row.setAttribute('data-d', sel);
    });

    cols(scr, v);

    /* 달을 닫는 길(꺾쇠 · 어두운 자리)은 **보던 날짜를 들고 간다**.
       들고 가지 않으면 휠로 날짜를 바꿔 놓고 닫는 순간 오늘로 되돌아간다.
       갈 곳도 그 날의 것이다 — 기록이 있는 날이면 그 장면으로 */
    var home = role(v.y, v.m, v.d, mk).go;
    scr.querySelectorAll('[data-keep]').forEach(function (b) {
      b.setAttribute('data-go', home);
      b.setAttribute('data-d', sel);
    });

    /* '오늘' 은 되돌아가는 길이라, 오늘을 보는 동안에는 갈 데가 없다 */
    scr.querySelectorAll('.pill--today').forEach(function (b) {
      var n = mk.now;
      b.disabled = (sel === iso(n.y, n.m, n.d));
      if (b.disabled) b.removeAttribute('data-go');
      else if (!b.hasAttribute('data-go')) {
        b.setAttribute('data-go', role(n.y, n.m, n.d, mk).go);
      }
    });
  }

  /* ── 달을 옆으로 밀어 바꾼다 ──
     달 격자를 좌우로 밀면 앞뒤 달로 간다(시안 596:4064 의 주석 — '캘린더
     좌우 스와이프 시 이전·이후 달로 이동'). 고르고 있던 날은 그대로 들고
     간다: 짧은 달이면 그 달의 마지막 날로 내려앉는다.

     **미는 동안 달이 손끝을 따라온다.** 문턱을 넘자마자 갈아 끼우면,
     민 사람은 달이 바뀌는 것을 보지 못하고 바뀌어 있는 것만 본다 —
     눈에는 깜빡인 것으로 남는다. 그래서 손이 가는 만큼 달이 따라가고,
     **손을 떼었을 때** 반쯤 넘어왔으면 마저 넘어가고 아니면 제자리로
     돌아온다. 끝까지 밀지 않으면 아무 일도 일어나지 않는다.

     갈 수 없는 쪽(앞날)은 뻑뻑하게 따라온다 — 움직이기는 하되 네 몫의
     한 자밖에 가지 않고 놓으면 돌아온다. 막힌 것을 글로 띄우지 않고
     손에 쥐여 주는 셈이다.

     ⚠ 세로보다 가로가 더 움직였을 때만 민 것으로 친다. 아래로 읽어
       내려가다 손끝이 비뚤어진 것까지 받으면 달이 제멋대로 넘어간다 */
  var MON_TAKE = 0.3;    /* 넘어가는 문턱 — 달 너비의 이만큼 */
  var DECK_FLICK = 0.4; /* 떨쳤다고 보는 빠르기 — px/ms */
  var MON_HOLD = 0.25;   /* 갈 수 없는 쪽이 따라오는 몫 */
  var MON_GAP  = 16;     /* 미리 세워 둔 달과의 틈 */
  var MON_AXIS = 6;      /* 이만큼 움직여야 가로인지 세로인지 가른다 */

  function swipe(scr) {
    var g = scr.querySelector('.calm__g');
    if (!g) return;
    var wrap = g.parentNode;                  /* .calm — 달을 담은 자리 */
    var x0 = 0, y0 = 0, dx = 0, axis = null, on = false;
    var peek = null, dir = 0, ate = false, until = 0, acc = 0, rest;
    var grow = 0;                             /* 들어올 달이 더 가진 키 */

    function wide() { return g.getBoundingClientRect().width; }

    /* n 달 뒤(앞)의 날 — 고르고 있던 날을 들고 가되 짧은 달이면 마지막
       날로, 이 달이면 오늘로 내려앉는다. 미리 세우는 달과 넘어간 뒤의
       달이 **같은 셈**을 써야 넘어가는 순간에 날짜가 튀지 않는다 */
    function next(n) {
      var v = shown(scr), t = new Date(v.y, v.m - 1 + n, 1);
      var y = t.getFullYear(), m = t.getMonth() + 1;
      var now = nowOf(scr);
      if (ahead(y, m, 1, now)) return null;     /* 아직 오지 않은 달 */
      var d = Math.min(v.d, inMonth(y, m));
      if (ahead(y, m, d, now)) d = now.d;
      return { y: y, m: m, d: d };
    }

    /* 들어올 달을 옆에 미리 세운다 — 밀면서 **무엇이 들어오는지** 보여야
       끝까지 밀지 말지를 정할 수 있다.
       ⚠ 진짜 격자 **뒤에** 세운다. 화면설명의 앵커는 첫 `.calm__g` 를
         짚는데 앞에 세우면 미리 세운 쪽을 짚는다(규칙 15).
       ⚠ 손을 떼면 지운다. 화면을 집어 보는 눈(앵커 · 찍는 기계)에
         남아 있어서는 안 되는 것은, 미는 동안에만 있는 달이기 때문이다 */
    function stand(n) {
      if (dir === n) return;
      clear();
      dir = n;
      var t = next(n);
      if (!t) return;                           /* 갈 수 없는 쪽엔 세울 달이 없다 */
      peek = document.createElement('div');
      peek.className = 'calm__g calm__g--peek';
      peek.setAttribute('aria-hidden', 'true');
      peek.style.top = g.offsetTop + 'px';
      peek.style.left = n > 0 ? 'calc(100% + ' + MON_GAP + 'px)'
                               : 'calc(-100% - ' + MON_GAP + 'px)';
      fill(peek, t, false, marks(scr, iso(t.y, t.m, t.d)));
      wrap.appendChild(peek);
      /* 달마다 줄 수가 다르다(다섯 줄 · 여섯 줄). 들어올 달이 한 줄 더
         가졌으면 **바탕도 같이 따라 자라야** 한다 — 바탕이 제자리에
         있으면 들어온 달의 마지막 줄이 바탕 밖, 어두운 자리 위에 선다.
         미리 세운 달은 띄워 둔 것이라 자리를 넓히지 못하므로, 그 차이를
         담은 자리(.calm)의 아래 여백으로 준다 */
      grow = peek.offsetHeight - g.offsetHeight;
    }
    function clear() {
      if (peek) peek.parentNode.removeChild(peek);
      peek = null; dir = 0; grow = 0;
      wrap.style.marginBottom = '';
    }

    function put(x) {
      var t = x ? 'translateX(' + x + 'px)' : '';
      g.style.transform = t;
      if (peek) peek.style.transform = t;
      /* 바탕은 **민 만큼** 자란다 — 밀기 시작하자마자 한 줄 몫이 열리면
         아직 오지도 않은 달 때문에 바탕이 들썩인 꼴이 된다 */
      wrap.style.marginBottom = grow
        ? (grow * Math.min(1, Math.abs(x) / wide())) + 'px' : '';
    }

    function pull(ax, ay) {
      if (axis === null) {
        if (Math.abs(ax) < MON_AXIS && Math.abs(ay) < MON_AXIS) return false;
        axis = Math.abs(ax) > Math.abs(ay) ? 'x' : 'y';
      }
      if (axis !== 'x') return false;
      var n = ax < 0 ? 1 : -1;
      stand(n);
      dx = peek ? ax : ax * MON_HOLD;           /* 갈 수 없는 쪽은 뻑뻑하다 */
      put(dx);
      return true;
    }

    /* 손을 뗀다 — 반쯤 넘어왔으면 마저 보내고, 아니면 제자리로 */
    function drop() {
      if (!on) return;
      on = false;
      until = Date.now() + 400;                 /* 쓸고 난 뒤의 관성은 받지 않는다 */
      acc = 0;
      ate = (axis === 'x' && Math.abs(dx) > MON_AXIS);   /* 민 끝의 클릭은 삼킨다 */
      var w = wide();
      var go = !!peek && Math.abs(dx) >= w * MON_TAKE;
      var n = dx < 0 ? 1 : -1;
      var to = go ? (n > 0 ? -(w + MON_GAP) : (w + MON_GAP)) : 0;
      axis = null;
      slide(to, function () {
        if (go) hop(scr, n);
        clear();
        g.classList.remove('is-slide');
        wrap.classList.remove('is-slide');
        put(0);
        dx = 0;
      });
    }

    /* 마저 가는 길(또는 돌아오는 길). 전환이 끝나면 한 번만 부른다 —
       갈 거리가 0 이면 전환이 아예 일어나지 않으므로 받침을 둔다 */
    function slide(to, done) {
      g.classList.add('is-slide');
      wrap.classList.add('is-slide');
      if (peek) peek.classList.add('is-slide');
      var over = false;
      function fin() {
        if (over) return;
        over = true;
        g.removeEventListener('transitionend', fin);
        done();
      }
      g.addEventListener('transitionend', fin);
      setTimeout(fin, 400);
      requestAnimationFrame(function () { put(to); });
    }

    function grab(x, y) { x0 = x; y0 = y; on = true; axis = null; dx = 0; ate = false; }

    g.addEventListener('touchstart', function (e) {
      var t = e.changedTouches[0];
      grab(t.clientX, t.clientY);
    }, { passive: true });

    g.addEventListener('touchmove', function (e) {
      if (!on) return;
      var t = e.changedTouches[0];
      /* 가로로 미는 동안에는 화면이 따라 굴러가지 않게 막는다 */
      if (pull(t.clientX - x0, t.clientY - y0) && e.cancelable) e.preventDefault();
    }, { passive: false });

    g.addEventListener('touchend', drop, { passive: true });
    g.addEventListener('touchcancel', drop, { passive: true });

    /* 손가락이 없는 자리(브라우저)에서는 끌어서 민다. 받는 자리를 문서에
       두는 것은, 끌다가 격자 밖으로 나가도 끌던 것이 이어져야 하기 때문이다 */
    g.addEventListener('mousedown', function (e) {
      grab(e.clientX, e.clientY);
      e.preventDefault();                       /* 글자가 잡히는 것을 막는다 */
    });
    document.addEventListener('mousemove', function (e) { if (on) pull(e.clientX - x0, e.clientY - y0); });
    document.addEventListener('mouseup', drop);

    /* 민 끝에서 손을 뗀 자리가 날짜 칸이면 그 날로 넘어가 버린다 —
       민 것과 누른 것은 다른 일이라 **민 뒤의 한 번**은 삼킨다 */
    g.addEventListener('click', function (e) {
      if (!ate) return;
      ate = false;
      e.preventDefault();
      e.stopPropagation();
    }, true);

    /* 트랙패드는 **끌지 않고 쓴다** — 두 손가락 가로 쓸기는 끄는 몸짓이
       아니라 굴리는 몸짓(wheel)이라 위의 어느 줄에도 걸리지 않는다.
       주간 띠는 브라우저가 굴려 주지만(가로 스크롤) 달 격자는 굴릴 것이
       없어, 여기서 받아 끄는 것과 같은 길로 보낸다.
       ⚠ 받아서 막지 않으면 브라우저가 **뒤로 가기**로 가져간다. */
    g.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      if (Date.now() < until) return;
      if (!on) { on = true; axis = 'x'; acc = 0; dx = 0; }
      acc -= e.deltaX;                          /* 쓰는 쪽과 달이 가는 쪽은 반대다 */
      pull(acc, 0);
      clearTimeout(rest);
      rest = setTimeout(drop, 120);             /* 손이 멎으면 뗀 것으로 본다 */
    }, { passive: false });
  }

  /* ── 달을 n 만큼 갈아 끼운다 ──
     **보던 화면은 그대로**다 — 달을 편 채로 있어야 앞뒤 달을 이어 넘겨
     볼 수 있다. 주소를 새로 열지 않고 바꿔 끼우는 것은(replaceState),
     여는 순간 화면이 통째로 다시 그려져 깜빡이기 때문이다. 바뀌는 것은
     달 하나인데 화면 전체가 새로 서면 그것이 눈에 남는다.
     주소를 고쳐 두는 까닭은 둘이다 — 이 화면이 날을 주소에서 읽고(shown),
     주소를 복사해 가면 그 달이 열려야 한다.
     뒤로 가기 목록에는 쌓지 않는다. 달을 다섯 번 넘겼다고 뒤로 가기를
     다섯 번 눌러야 하는 것은 민 사람이 바란 일이 아니다 */
  /* ── 출근·퇴근 모드 ──
     카드 줄을 민다. 달 넘기기(swipe)와 같은 결이다 — 손끝을 따라가다가,
     틀 폭의 30% 를 넘겨야 넘어가고, 갈 데가 없는 쪽은 0.25 만 따라온다.
     달과 다른 것은 **미리 세울 것이 없다**는 점이다: 카드 두 장이 이미
     한 줄에 나란히 있어, 미는 동안 들어올 장이 그대로 보인다 */
  function deck(scr) {
    var box = scr.querySelector('.deck');
    if (!box) return;
    var tray = box.querySelector('.deck__t');
    var btns = [].slice.call(scr.querySelectorAll('.mode__b'));
    var n = tray.children.length;
    var at = scr.getAttribute('data-mode') === 'out' ? 1 : 0;
    var x0 = 0, y0 = 0, dx = 0, axis = null, on = false, ate = false;
    var acc = 0, rest;
    var px = 0, pt = 0, vx = 0;          /* 마지막 걸음의 빠르기(px/ms) */
    var shook = false;                   /* 한 몸짓에 한 번만 흔든다 */

    function wide() { return box.getBoundingClientRect().width || 1; }
    /* 카드 사이의 틈만큼 더 밀어야 다음 장이 틀에 꼭 맞게 선다 */
    function gap() {
      return parseFloat(getComputedStyle(tray).columnGap) || 0;
    }
    function to(i) { return 'calc(' + (-i * 100) + '% - ' + (i * gap()) + 'px)'; }

    /* 줄을 제자리에 놓고, 토글과 화면의 표를 맞춘다 */
    /* 토글의 알은 카드가 움직이는 **비율만큼** 따라간다 — 손을 뗀 뒤에
       옮기면 카드보다 한 박자 늦게 가는 것처럼 보인다 */
    function slide(p) {
      scr.style.setProperty('--ap-mode-at', p);
      var near = Math.round(p);
      btns.forEach(function (b, i) {
        b.classList.toggle('is-on', i === near);
        b.setAttribute('aria-pressed', i === at ? 'true' : 'false');
      });
    }
    function put() {
      tray.style.setProperty('--ap-at', to(at));
      tray.style.setProperty('--ap-kick', '0px');
      scr.classList.remove('is-grab');
      slide(at);
      scr.setAttribute('data-mode', at ? 'out' : 'in');
    }
    function go(i) {
      if (i < 0 || i >= n || i === at) return false;
      at = i; put(); return true;
    }

    /* 손끝을 따라간다. 막힌 쪽은 덜 따라와 '여기가 끝' 이라고 말한다 */
    function pull(mx, my) {
      if (!on) return false;
      if (!axis) {
        if (Math.abs(mx) < 6 && Math.abs(my) < 6) return false;
        axis = Math.abs(mx) > Math.abs(my) ? 'x' : 'y';
      }
      if (axis !== 'x') return false;
      /* 한 틀 폭 넘게는 따라가지 않는다 — 끝까지 밀면 두 장 다 화면 밖으로
         나가, 아무것도 없는 자리를 끌고 있게 된다 */
      var lim = tray.children[0].offsetWidth + gap();
      dx = Math.max(-lim, Math.min(lim, mx));
      var now = Date.now();
      if (now > pt) { vx = (dx - px) / (now - pt); px = dx; pt = now; }
      if (Math.abs(dx) > 4) ate = true;         /* 민 뒤의 클릭 한 번은 삼킨다 */
      var want = at + (dx < 0 ? 1 : -1);
      if (want < 0 || want >= n) {              /* 갈 데가 없다 */
        if (!shook && Math.abs(dx) > 10) { shook = true; shake(); }
        return true;                            /* 막되, 화면은 굴리지 않는다 */
      }
      tray.classList.add('is-grab');
      tray.style.setProperty('--ap-at', to(at));
      tray.style.setProperty('--ap-kick', dx + 'px');
      scr.classList.add('is-grab');
      slide(Math.max(0, Math.min(n - 1, at - dx / lim)));
      return true;
    }
    /* 갈 데가 없는 쪽 — 밀리지 않고 제자리에서 좌우로 짧게 흔든다.
       한 몸짓에 한 번만 흔든다: 미는 내내 떨고 있으면 말이 아니라 소음이다.
       애니메이션을 다시 걸려면 한 번 떼었다 붙여야 한다 */
    function shake() {
      tray.classList.remove('is-shake');
      void tray.offsetWidth;
      tray.classList.add('is-shake');
    }
    tray.addEventListener('animationend', function () { tray.classList.remove('is-shake'); });

    function drop() {
      if (!on) return;
      on = false;
      /* 전환을 되살린 **뒤에** 끌린 자리를 한 번 못 박는다. 같은 프레임에
         값까지 바꾸면 브라우저가 전환을 한 박자 늦게 시작해, 카드가 잠깐
         멎었다 가는 것처럼 보인다 */
      tray.classList.remove('is-grab');
      void tray.offsetWidth;
      if (axis === 'x') {
        var want = at + (dx < 0 ? 1 : -1);
        /* 멀리 밀었거나, 짧아도 빠르게 떨쳤으면(플릭) 넘어간다 — 세게
           밀어야만 넘어가면 손이 가볍게 쓸고 지나갈 수가 없다 */
        var far = Math.abs(dx) > wide() * 0.3 ||
                  (Math.abs(vx) > DECK_FLICK && (vx < 0) === (dx < 0));
        if (want < 0 || want >= n) {
          put();                                /* 밀린 적이 없으니 제자리다 */
        } else {
          if (far) go(want);
          put();                                /* 문턱을 못 넘겼으면 제자리로 */
        }
      } else {
        put();
      }
      axis = null; dx = 0; acc = 0;
    }
    function grab(x, y) {
      x0 = x; y0 = y; on = true; axis = null; dx = 0; ate = false;
      px = 0; pt = Date.now(); vx = 0; shook = false;
    }

    btns.forEach(function (b, i) {
      b.addEventListener('click', function () { go(i); });
    });

    box.addEventListener('touchstart', function (e) {
      var t = e.changedTouches[0]; grab(t.clientX, t.clientY);
    }, { passive: true });
    box.addEventListener('touchmove', function (e) {
      var t = e.changedTouches[0];
      if (pull(t.clientX - x0, t.clientY - y0) && e.cancelable) e.preventDefault();
    }, { passive: false });
    box.addEventListener('touchend', drop, { passive: true });
    box.addEventListener('touchcancel', drop, { passive: true });

    /* 손가락이 없는 자리에서는 끌어서 민다. 받는 자리를 문서에 두는 것은,
       끌다가 틀 밖으로 나가도 끌던 것이 이어져야 하기 때문이다 */
    box.addEventListener('mousedown', function (e) {
      grab(e.clientX, e.clientY);
      e.preventDefault();
    });
    document.addEventListener('mousemove', function (e) { if (on) pull(e.clientX - x0, e.clientY - y0); });
    document.addEventListener('mouseup', drop);

    /* 민 끝에서 손을 뗀 자리가 카드면 카메라가 열려 버린다 — 민 것과
       누른 것은 다른 일이다 */
    box.addEventListener('click', function (e) {
      if (ate) {
        ate = false;
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      /* 옆에 비치는 카드를 누르면 그리로 넘어간다 — 눌린 것이 지금 카드가
         아닌데 카메라가 열리면, 보이지도 않던 쪽의 인증이 시작된다 */
      var card = e.target.closest && e.target.closest('.deck .cta');
      if (!card) return;
      var i = [].indexOf.call(tray.children, card);
      if (i < 0 || i === at) return;
      e.preventDefault();
      e.stopPropagation();
      go(i);
    }, true);

    /* 트랙패드의 두 손가락 가로 쓸기는 끄는 몸짓이 아니라 굴리는 몸짓이라
       위의 어느 줄에도 걸리지 않는다. 받아서 끄는 것과 같은 길로 보낸다 —
       막지 않으면 브라우저가 뒤로 가기로 가져간다 */
    box.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      if (!on) { on = true; axis = 'x'; acc = 0; dx = 0; ate = false; }
      acc -= e.deltaX;
      pull(acc, 0);
      clearTimeout(rest);
      rest = setTimeout(drop, 120);             /* 손이 멎으면 뗀 것으로 본다 */
    }, { passive: false });

    put();
  }

  function hop(scr, n) {
    var v = shown(scr), t = new Date(v.y, v.m - 1 + n, 1);
    var y = t.getFullYear(), m = t.getMonth() + 1;
    var now = nowOf(scr);
    if (ahead(y, m, 1, now)) return;
    var d = Math.min(v.d, inMonth(y, m));
    if (ahead(y, m, d, now)) d = now.d;
    var u = new URL(location.href);
    u.searchParams.set('d', iso(y, m, d));
    try { history.replaceState(null, '', u.toString()); }
    catch (e) { location.href = u.toString(); return; }
    day(scr);     /* 달 · 띠 · 머리줄의 날짜 · 휠의 칸 · 닫는 길 */
    roll(scr);    /* 띠를 고른 주로 */
    wheel(scr);   /* 휠을 고른 값으로 — 받는 자리는 다시 달지 않는다 */
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
      place(c);
      /* 받는 자리는 **한 번만** 단다. 달을 갈아 끼우면 칸은 다시 나지만
         칸을 담은 기둥은 그대로라, 여기서 또 달면 굴릴 때마다 두 번씩
         셈한다 */
      if (c.getAttribute('data-on')) return;
      c.setAttribute('data-on', '1');

      var idle;
      c.addEventListener('scroll', function () {
        /* 칸은 달이 바뀔 때마다 새로 난다 — 그때그때 다시 집는다 */
        var items = c.querySelectorAll('.wheel__i');
        mark(c, items);                 /* 굴러가는 동안에도 가운데는 표시한다 */
        clearTimeout(idle);
        idle = setTimeout(function () { stop(c, items); }, 160);
      }, { passive: true });
    });
  }

  /* 고른 값을 가운데에 세운다.
     첫 자리는 **몸짓 없이** 잡는다. 전환을 켜 둔 채로 표를 붙이면 화면이
     열릴 때마다(날짜를 갈아 끼운 바로 뒤가 그렇다) 고른 값이 작은 데서
     커지는 꼴이 된다 — 굴린 것이 아니라 그냥 그 자리였다.
     두 번 기다리는 것은, 한 번으로는 브라우저가 첫 꼴을 그리기 전에 표가
     붙어 전환이 되살아나기 때문이다 */
  function place(c) {
    var items = c.querySelectorAll('.wheel__i');
    var pick = c.getAttribute('data-pick');
    var at = 0;
    items.forEach(function (it, n) { if (it.dataset.v === pick) at = n; });
    c.classList.add('is-set');
    c.scrollTop = at * WHEEL_H;
    mark(c, items);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { c.classList.remove('is-set'); });
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
    if (!it) return;

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

  /* ── 작업내용 글칸 ──
     **진짜 입력칸이다.** 자판을 그림으로 그려 두었더니 '여기에 적는다'
     는 것만 보여 주고 적을 수는 없었다 — 자판은 기기가 제 설정대로
     띄우는 것이라, 칸을 진짜로 두면 그 기기의 자판이 올라온다.
     여기서 하는 일은 글자 수를 세는 것 하나뿐이다(칸이 500 에서 끊는다) */
  function note(scr) {
    var t = scr.querySelector('.ta'), n = scr.querySelector('.ta__c b');
    if (!t || !n) return;
    function count() { n.textContent = String(t.value.length); }
    t.addEventListener('input', count);
    count();
  }

  /* ── 약관 펼치기 ──
     누르면 그 줄 **바로 아래로** 본문이 펼쳐진다. 다른 화면으로 넘기면
     동의하던 자리를 잃고, 돌아와서 어디까지 읽었는지 다시 찾아야 한다 */
  function terms(scr) {
    scr.querySelectorAll('.agr[aria-controls]').forEach(function (b) {
      var d = scr.querySelector('#' + b.getAttribute('aria-controls'));
      if (!d) return;
      b.addEventListener('click', function () {
        var open = b.getAttribute('aria-expanded') === 'true';
        b.setAttribute('aria-expanded', open ? 'false' : 'true');
        d.hidden = open;
      });
    });
  }

  /* ── 과녁 위의 시계 ──
     이것은 **흉내 내는 동작이 아니라 기기의 시계**다. 촬영·인증처럼 앱이
     하는 일은 여기서 흉내 내지 않지만(머리말), 지금 몇 시인지는 앱의
     일이 아니라 시계의 일이고 화면 어디서도 그것을 멈춰 둘 까닭이 없다 —
     멈춘 수가 1초마다 바뀌는 자리에 박혀 있으면 화면이 죽은 것으로 보인다.
     고쳐 쓰는 것은 그 수가 든 칸 하나뿐이다(아이콘은 건드리지 않는다). */
  /* ── 이력 조회의 출근·퇴근 고르기 ──
     카드를 누르면 그 쪽 사진이 아래에 선다. 찍히지 않은 쪽은 보여 줄
     사진이 없으므로 고를 수 없다 */
  /* ── 센 수가 곧 거르개다 ──
     출근과 퇴근을 따로 세어 적고, 누르면 그쪽만 남긴다. 수는 **줄을 세어**
     적는다 — 마크업에 박아 두면 줄을 고칠 때마다 따로 늙는다.
     둘 다 켜진 데서 하나를 누르면 그것만, 켜진 하나를 다시 누르면 둘 다로
     돌아온다 — 끄고 켜는 길이 하나라 '무엇만 볼까' 한 번으로 끝난다 */
  /* ── 몇 초 뒤에 저절로 넘어가는지 ──
     바닥 버튼이 차오르는 길이는 css 가 쥐고 있다(--ap-ready-wait). 그 값을
     **읽어서** 세므로 글과 바가 어긋날 수 없다 — 두 곳에 적으면 한쪽만
     고쳐져 글이 거짓말을 한다.
     1 에서 멎는다. 실제 앱은 0 이 되는 참에 카메라를 열어 '0초 후' 를
     보여 줄 일이 없는데, 이 화면은 넘어가지 않으므로 마지막 한 초에
     머문다.
     움직임을 줄여 달라고 한 기기에서는 세지 않는다 — 줄어드는 숫자도
     움직임이고, 그 기기에서는 차오르는 면도 걷어 둔다 */
  function wait(scr) {
    var box = scr.querySelector('.cam__auto__n');
    if (!box) return;
    var slow = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;
    var raw = getComputedStyle(scr.querySelector('.cam--ready') || scr)
                .getPropertyValue('--ap-ready-wait').trim();
    var sec = parseFloat(raw) || 4;
    if (/ms$/.test(raw)) sec = sec / 1000;
    sec = Math.max(1, Math.round(sec));
    box.textContent = sec;
    if (slow) return;

    var left = sec;
    var id = setInterval(function () {
      left -= 1;
      if (left <= 1) { left = 1; clearInterval(id); }
      box.textContent = left;
    }, 1000);
  }

  function tally(scr) {
    /* ⚠ **무엇을 세는지 적어 둔 알약만** 집는다(data-at). 같은 알약을 쓰되
       세지 않는 자리가 있다 — 필터 시트의 재직·퇴사·차단이 그렇다. 통째로
       집으면 셀 줄이 없는 그 화면에서 적어 둔 수가 0 으로 덮인다(실측). */
    var chips = [].slice.call(scr.querySelectorAll('.cnt[data-at]'));
    if (!chips.length) return;
    var rows = [].slice.call(scr.querySelectorAll('.log'));

    function at(row) { return row.querySelector('.log__t--in') ? 'in' : 'out'; }

    /* 켜지는 것은 **늘 하나**다. 알약이 둘뿐이던 때에는 하나를 걸러 둔 뒤
       둘 다로 돌아오려면 켜진 알약을 다시 눌러야 했는데, 눌러 보기 전에는
       알 수 없는 규칙이라 되돌리는 길이 화면에 없었다. '전체' 가 그 길이다 */
    function sync() {
      var on = chips.filter(function (c) { return c.classList.contains('is-on'); })[0];
      var k = on ? on.getAttribute('data-at') : 'all';
      rows.forEach(function (r) { r.hidden = k !== 'all' && at(r) !== k; });
      chips.forEach(function (c) {
        c.setAttribute('aria-pressed', c === on ? 'true' : 'false');
      });
    }

    chips.forEach(function (c) {
      var k = c.getAttribute('data-at');
      var n = k === 'all' ? rows.length
                          : rows.filter(function (r) { return at(r) === k; }).length;
      var box = c.querySelector('.cnt__n');
      if (box) box.textContent = n;

      c.addEventListener('click', function () {
        chips.forEach(function (x) { x.classList.toggle('is-on', x === c); });
        sync();
      });
    });
    sync();
  }

  function stamp(scr) {
    var cards = [].slice.call(scr.querySelectorAll('.stmp .tcard'));
    if (!cards.length) return;
    cards.forEach(function (c) {
      if (c.querySelector('.tcard__v--none')) {
        c.disabled = true;
        c.setAttribute('aria-disabled', 'true');
        return;
      }
      c.addEventListener('click', function () {
        scr.setAttribute('data-at', c.getAttribute('data-at'));
        cards.forEach(function (o) {
          o.classList.toggle('is-on', o === c);
          o.setAttribute('aria-pressed', o === c ? 'true' : 'false');
        });
      });
      c.setAttribute('aria-pressed', c.classList.contains('is-on') ? 'true' : 'false');
    });
  }

  /* ── 등록된 얼굴로 덮기 ──
     이력에서 따지는 것은 '이 얼굴이 등록된 그 사람인가' 다. 맨 처음 등록한
     얼굴을 작은 사진으로 늘 띄워 두고, 눌러 더 크게 볼 수 있게 한다.
     둘이 **자리를 맞바꾸지** 않는 것은 그러면 두 보기가 대등해 보이기
     때문이다 — 이력의 주인공은 그날 찍힌 얼굴이고 등록 사진은 그것을
     가리는 자다. 덮은 자리에 작은 사진 대신 **돌아가는 길**이 서면, 지금이
     잠깐 들른 자리라는 것이 꼴로 드러난다.
     출퇴근 카드를 고르면 덮은 것이 걷힌다 — 카드를 고르는 일은 '그때 찍힌
     얼굴을 보자' 는 말인데, 덮인 채면 눌러도 그림이 그대로라 고르는 일이
     먹히지 않은 것으로 읽힌다 */
  function regshot(scr) {
    var open = scr.querySelector('.photo__ref');
    var back = scr.querySelector('.photo__back');
    if (!open || !back) return;

    function paint(on) { scr.classList.toggle('is-reg', on); }

    open.addEventListener('click', function () { paint(true); });
    back.addEventListener('click', function () { paint(false); });
    scr.querySelectorAll('.stmp .tcard').forEach(function (c) {
      c.addEventListener('click', function () { paint(false); });
    });
    paint(false);
  }

  /* ── 출근이 열리는 시각 ──
     현장이 문을 여는 시각이 있고, 그 전에는 과녁이 잠긴다. 그 시각을
     마크업에 못 박아 두면 **기기의 지금**을 보여 주는 과녁의 시계와
     어긋난다 — 07:00 이라고 적어 두고 오후에 열면 '아직 전' 이라는 말
     옆에서 시계가 15:20 을 가리킨다.
     그래서 지금에서 한 뼘(20분) 뒤로 잡고 10분 단위로 올린다. 언제 열어도
     '아직 멀지 않은 뒤' 가 된다 */
  function gate(scr) {
    var box = scr.querySelector('.tip__at');
    if (!box) return;
    function two(n) { return (n < 10 ? '0' : '') + n; }
    var d = new Date(Date.now() + 20 * 60000);
    d.setMinutes(Math.ceil(d.getMinutes() / 10) * 10, 0, 0);
    box.textContent = two(d.getHours()) + ':' + two(d.getMinutes());
  }

  /* ── 지도를 더 보고 싶을 때 ──
     시트가 쥔 키는 한 자리뿐이라, 범위와 내 위치가 멀면 둘이 한 칸에
     욱여넣어진다. 위로 쓸어 올리면 지도가 한 칸 길어진다.
     자리는 둘이다(기본 · 펴짐) — 그 사이 아무 데나 멎게 두면 다음에 열었을
     때 어디에 서 있을지 사람이 셈해야 한다. 끄는 동안에는 손끝을 따라오고,
     손을 떼면 간 거리로 가른다(셋 중 하나를 넘겼는가).
     **눌러도 펴진다.** 끄는 몸짓 하나에만 매어 두면 손이 닿지 않는 길이
     된다 — 손잡이는 버튼이고 aria-expanded 로 지금 자리를 말한다.
     두 자리의 키는 css 가 쥔다(.sheet--grow). js 는 그 값을 **재어** 쓴다 —
     min()·svh 로 적힌 값이라 글자를 읽어서는 px 를 알 수 없다 */
  function grow(scr) {
    var sheet = scr.querySelector('.sheet--grow');
    if (!sheet) return;
    var map = sheet.querySelector('.zone__m');
    var grip = sheet.querySelector('.sheet__grip');
    if (!map || !grip) return;

    /* 두 자리의 키는 css 가 쥔다. 여기서는 **재어** 쓴다 — min()·svh 로
       적힌 값이라 글자를 읽어서는 px 를 알 수 없다 */
    /* ⚠ 재는 동안에는 **흐름을 끈다**(is-grab). 키에 transition 이 걸려
       있어, 표를 붙이자마자 키를 물으면 아직 떠나지 않은 **처음 값**이
       돌아온다 — 둘이 같은 수로 나와 길이 통째로 막혔었다 */
    sheet.classList.add('is-grab');
    var base = map.offsetHeight;
    sheet.classList.add('is-tall');
    var tall = map.offsetHeight;
    sheet.classList.remove('is-tall');
    sheet.classList.remove('is-grab');
    if (tall <= base) return;

    var on = false, y0 = 0, h0 = 0, moved = false;

    function rest(up) {
      map.style.height = '';
      sheet.classList.toggle('is-tall', up);
      grip.setAttribute('aria-expanded', up ? 'true' : 'false');
    }
    function start(y) {
      on = true; moved = false; y0 = y; h0 = map.offsetHeight;
      sheet.classList.add('is-grab');
    }
    function pull(y) {
      if (!on) return;
      var dy = y0 - y;
      if (Math.abs(dy) > 4) moved = true;
      map.style.height = Math.max(base, Math.min(tall, h0 + dy)) + 'px';
    }
    function drop() {
      if (!on) return;
      on = false;
      sheet.classList.remove('is-grab');
      if (!moved) return;
      rest(map.offsetHeight - base > (tall - base) / 3);
      swallow();
    }

    /* ── 끄는 자리는 손잡이 하나가 아니다 ──
       20 짜리 줄만 받으면 손가락이 자꾸 빗나간다 — 헤더까지 받아 76 으로
       넓힌다. 눈에 보이는 손잡이는 그대로 둔다: **쓸 수 있다는 말**을
       하는 것은 여전히 그 막대다.
       ⚠ 닫기(✕)에서 시작한 몸짓은 받지 않는다 — 닫으려던 것이지 늘리려던
         것이 아니다 */
    var grab = [grip];
    var head = sheet.querySelector('.sheet__h');
    if (head) grab.push(head);
    function mine(e) {
      var t = e.target;
      return !(t && t.closest && t.closest('.sheet__x'));
    }

    /* 끄는 길은 달 넘기기(deck)와 같은 짜임이다 — 손가락은 제 자리에서
       받고, 쥐는 동안의 움직임과 떼는 일은 문서가 받는다. 손이 틀 밖으로
       나가도 따라오게 하려면 그 수밖에 없다.
       손가락 쪽은 문서까지 갈 것이 없다 — 닿은 자리를 떠나도 touchmove 는
       **처음 닿은 요소**로 계속 온다 */
    grab.forEach(function (g) {
      g.addEventListener('touchstart', function (e) {
        if (mine(e)) start(e.touches[0].clientY);
      }, { passive: true });
      g.addEventListener('touchmove', function (e) { pull(e.touches[0].clientY); }, { passive: true });
      g.addEventListener('touchend', drop, { passive: true });
      g.addEventListener('touchcancel', drop, { passive: true });
      g.addEventListener('mousedown', function (e) {
        if (!mine(e)) return;
        e.preventDefault(); start(e.clientY);
      });
    });
    document.addEventListener('mousemove', function (e) { pull(e.clientY); });
    document.addEventListener('mouseup', drop);

    /* 끌지 않고 누르기만 해도 펴진다 — 끄는 몸짓 하나에만 매어 두면 손이
       닿지 않는 길이 된다 */
    grip.addEventListener('click', function () {
      rest(!sheet.classList.contains('is-tall'));
    });
  }


  /* ── 지도 안에서만 키운다 ──
     창의 확대는 막아 두었다(맨 위). 그러면 지도까지 같이 막히므로, 키우는
     일은 지도가 제 손으로 한다 — 창이 아니라 **그림**을 키우는 것이라
     배너와 '새로고침' 은 크기가 그대로 남는다.
     값만 여기서 적고(--ap-zone-k · x · y) 모양은 css 가 그린다(.zone__v).

     ⚠ 자리표시자 지도라, 키운다고 더 자세한 그림이 나오지는 않는다.
       받은 지도와 반경은 앱이 쥔다. */
  function zoom(scr) {
    var map = scr.querySelector('.zone__m');
    var view = map && map.querySelector('.zone__v');
    if (!view) return;

    var MIN = 1, MAX = 4, STEP = 2;
    var k = MIN, x = 0, y = 0;
    /* 손가락이 닿던 때의 값 — 움직이는 동안 **그때를 기준으로 다시 센다**.
       한 걸음씩 더해 가면 손을 오래 둘수록 어긋난 만큼이 쌓인다 */
    var k0 = MIN, x0 = 0, y0 = 0, d0 = 1, mx = 0, my = 0;
    var two = false, one = false, held = false, moved = false, wt = 0;

    function clamp(v) { return Math.max(MIN, Math.min(MAX, v)); }
    function gap(a, b) {
      return Math.sqrt(Math.pow(b.clientX - a.clientX, 2) + Math.pow(b.clientY - a.clientY, 2));
    }
    function live(on) { map.classList.toggle('is-live', on); }

    /* 키운 그림이 칸보다 작아질 수는 없다 — 끌어도 변 밖이 비치지 않게,
       움직일 수 있는 만큼을 칸과 배율로 잰다 */
    function paint() {
      var r = map.getBoundingClientRect();
      var wx = r.width * (k - 1) / 2, wy = r.height * (k - 1) / 2;
      x = Math.max(-wx, Math.min(wx, x));
      y = Math.max(-wy, Math.min(wy, y));
      view.style.setProperty('--ap-zone-k', String(k));
      view.style.setProperty('--ap-zone-x', x + 'px');
      view.style.setProperty('--ap-zone-y', y + 'px');
      map.classList.toggle('is-zoom', k > MIN);
    }

    /* **집은 자리가 그대로 있게** 키운다 — 칸 가운데만 보고 키우면 보려던
       것이 손가락 밖으로 밀려난다 */
    function toward(px, py, nk, fk, fx, fy) {
      var r = map.getBoundingClientRect();
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      var f = nk / fk;
      x = (px - cx) - f * ((mx - cx) - fx);
      y = (py - cy) - f * ((my - cy) - fy);
      k = nk;
      paint();
    }

    function rest() {
      if (!two && !one && !held) return;
      two = one = held = false;
      live(false);
      map.classList.remove('is-drag');
    }

    /* ── 두 손가락 ── */
    map.addEventListener('touchstart', function (e) {
      if (e.touches.length > 1) {
        var a = e.touches[0], b = e.touches[1];
        two = true; one = false;
        d0 = gap(a, b) || 1;
        mx = (a.clientX + b.clientX) / 2; my = (a.clientY + b.clientY) / 2;
        k0 = k; x0 = x; y0 = y;
        live(true); map.classList.add('is-drag');
      } else if (k > MIN) {
        one = true; two = false; moved = false;
        mx = e.touches[0].clientX; my = e.touches[0].clientY;
        x0 = x; y0 = y;
        live(true); map.classList.add('is-drag');
      }
    }, { passive: true });

    map.addEventListener('touchmove', function (e) {
      if (two && e.touches.length > 1) {
        var a = e.touches[0], b = e.touches[1];
        toward((a.clientX + b.clientX) / 2, (a.clientY + b.clientY) / 2,
               clamp(k0 * (gap(a, b) / d0)), k0, x0, y0);
      } else if (one && e.touches.length === 1) {
        x = x0 + (e.touches[0].clientX - mx);
        y = y0 + (e.touches[0].clientY - my);
        paint();
      }
    }, { passive: true });

    /* 둘 중 하나만 떼면 **끄는 몸짓으로 넘긴다** — 남은 손가락이 멎어
       버리면 키우다 만 자리에서 손이 묶인다 */
    map.addEventListener('touchend', function (e) {
      if (!e.touches.length) { rest(); return; }
      if (e.touches.length === 1 && k > MIN) {
        two = false; one = true;
        mx = e.touches[0].clientX; my = e.touches[0].clientY;
        x0 = x; y0 = y;
      }
    }, { passive: true });
    map.addEventListener('touchcancel', rest, { passive: true });

    /* ── 마우스로 끌기 — 키운 뒤에만 ──
       쥐는 동안의 움직임과 떼는 일은 문서가 받는다(시트 손잡이와 같은
       짜임). 손이 칸 밖으로 나가도 따라오게 하려면 그 수밖에 없다 */
    map.addEventListener('mousedown', function (e) {
      if (k <= MIN) return;
      e.preventDefault();
      held = true; moved = false;
      mx = e.clientX; my = e.clientY; x0 = x; y0 = y;
      live(true); map.classList.add('is-drag');
    });
    document.addEventListener('mousemove', function (e) {
      if (!held) return;
      if (Math.abs(e.clientX - mx) > 4 || Math.abs(e.clientY - my) > 4) moved = true;
      x = x0 + (e.clientX - mx);
      y = y0 + (e.clientY - my);
      paint();
    });
    document.addEventListener('mouseup', function () {
      if (!held) return;
      rest();
      if (moved) swallow();
    });

    /* 트랙패드로 오므렸다 벌리는 몸짓은 ctrl 을 쥔 휠로 온다. 그냥 휠은
       건드리지 않는다 — 읽어 내리는 길이다 */
    map.addEventListener('wheel', function (e) {
      if (!e.ctrlKey) return;
      e.preventDefault();
      live(true);
      clearTimeout(wt);
      wt = setTimeout(function () { live(false); }, 120);
      mx = e.clientX; my = e.clientY;
      toward(e.clientX, e.clientY, clamp(k * Math.exp(-e.deltaY / 100)), k, x, y);
    }, { passive: false });

    /* 손가락도 트랙패드도 없는 자리를 위해 — 더블클릭은 한 단계씩이다.
       끝까지 키운 다음 한 번 더 누르면 처음으로 돌아온다: 되돌아올 길이
       없으면 키우고 나서 갇힌다 */
    map.addEventListener('dblclick', function (e) {
      mx = e.clientX; my = e.clientY;
      toward(e.clientX, e.clientY, k >= MAX ? MIN : clamp(k * STEP), k, x, y);
    });

    /* 시트를 펴면 칸이 길어진다 — 움직일 수 있는 만큼이 달라지므로 다시 잰다 */
    map.addEventListener('transitionend', function (e) {
      if (e.propertyName === 'height') paint();
    });

    paint();
  }

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

  /* ── 근로자 선택하기 — 올라올 때부터 적을 자리에 서 있다 ──
     이 시트는 **적어서 찾는 자리**라, 올라온 뒤 한 번 더 눌러야 적을 수
     있으면 한 걸음이 는다. 그래서 켜지자마자 칸에 초점을 준다.

     ⚠ 기기 자판을 **막지 않는다**. 작업내용 작성의 글칸(.ta)과 같이,
       폰에서도 눌러 적는 칸이다. 자판 그림(.dim--kb .kb)은 그 자리를
       미리 세워 둔 것이고, 기기 자판이 올라오면 같은 자리를 덮는다.
     ⚠ 초점을 줘도 **기기 자판은 올라오지 않는다**. 브라우저가 사람이
       누르지 않은 초점으로는 올려 주지 않기 때문이고, 주소를 갈아 켜는
       이 프로토타입에서는 앞 화면의 누름이 여기까지 이어지지 않는다 —
       폰에서는 칸을 한 번 눌러야 기기 자판이 선다. 그림을 세워 두는
       까닭이 이것이다. */
  function seek(hit) {
    /* 폼에서 처음 채울 칸 — 시트가 아니라 화면이라 거를 목록도 막도 없다.
       자판 그림은 화면 발치에 서 있고(.scr > .kb), 기기 자판은 칸을 한 번
       눌러야 올라온다(위 ⚠ 와 같은 까닭) */
    var aim = hit.querySelector('.inp__in[autofocus]');
    if (aim) {
      try { aim.focus({ preventScroll: true }); } catch (e) { aim.focus(); }
      return;
    }

    var inp = hit.querySelector('.dim--kb .inp__in');
    if (!inp) return;

    oskb(hit);
    sift(hit, inp);

    /* preventScroll — 초점을 주느라 시트가 밀려 올라가면 머리줄이 잘린다 */
    try { inp.focus({ preventScroll: true }); } catch (e) { inp.focus(); }
  }

  /* ── 적는 대로 목록을 거른다 — 초성만 쳐도 걸린다 ──
     현장소장은 이름을 끝까지 적지 않는다. 'ㅎㄱㄷ' 세 번이면 홍길동이
     걸려야, 자판 뒤에 가린 목록을 덜 뒤진다.

     한글 글자는 초성 19 · 중성 21 · 종성 28 이 곱해져 한 칸씩 줄지어
     있다(가 = 0xAC00). 그래서 **(코드 - 가) / 588** 이 곧 초성의 자리다 —
     표를 따로 들지 않아도 글자에서 바로 뽑아낼 수 있다.

     ⚠ 자모와 글자를 **섞어** 받는다. 적는 중에는 '홍ㄱ' 처럼 아직 완성되지
       않은 꼴이 오는데, 자모는 그 자리 글자의 초성과 맞추고 글자는 글자끼리
       맞추면 두 경우가 한 길로 풀린다.
     ⚠ 이름 가운데부터도 걸린다('길동' · 'van'). 앞에서만 맞추면 성을
       모르는 이름을 못 찾는다. 로마자는 대소문자를 가리지 않는다. */
  var CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';

  function sift(hit, inp) {
    var list = hit.querySelector('.find__list');
    if (!list) return;

    /* 두 시트가 같은 거르기를 쓴다 — 근로자 줄(.card--go)과 직종 줄(.optr).
       이름이 드는 자리도 줄마다 다르다(.card__nm · .optr__t) */
    var rows = Array.prototype.slice.call(list.querySelectorAll('.card--go,.optr'));
    var none = list.querySelector('.find__none');

    function cho(ch) {
      var c = ch.charCodeAt(0);
      if (c < 0xAC00 || c > 0xD7A3) return '';
      return CHO.charAt(Math.floor((c - 0xAC00) / 588));
    }

    function match(name, q) {
      name = name.toLowerCase();
      q = q.toLowerCase();
      for (var i = 0; i + q.length <= name.length; i++) {
        var ok = true;
        for (var j = 0; j < q.length; j++) {
          var a = name.charAt(i + j), bq = q.charAt(j);
          if (a === bq) continue;
          if (CHO.indexOf(bq) >= 0 && cho(a) === bq) continue;
          ok = false; break;
        }
        if (ok) return true;
      }
      return false;
    }

    function run() {
      /* 띄어쓰기는 떼고 본다 — 'ㅎ ㄱㄷ' 처럼 눌려도 같은 뜻이다 */
      var q = inp.value.replace(/\s+/g, '');
      var left = 0;
      rows.forEach(function (row) {
        var nm = row.querySelector('.card__nm,.optr__t');
        /* is-off 는 걸린 근무상태에 하나도 없는 직종이다(sync). 적은 것과
           상관없이 내내 덜어 둔다 — 적는 동안만 돌아오면 안 된다 */
        var on = !row.classList.contains('is-off') &&
          (!q || (nm && match(nm.textContent.replace(/\s+/g, ''), q)));
        row.hidden = !on;
        if (on) left++;
      });
      if (none) none.hidden = left > 0;
      list.scrollTop = 0;
    }

    inp.addEventListener('input', run);
    /* 한글을 짜는 동안(IME)에는 기기마다 input 이 오는 때가 달라, 짜는
       중의 알림도 함께 받는다 — 두 번 돌아도 하는 일이 같아 탈이 없다 */
    inp.addEventListener('compositionupdate', run);
    inp.addEventListener('compositionend', run);
    run();
  }

  /* ── 기기 자판이 올라오면 시트를 그 위로 띄운다 ──
     화면(.scr)은 100svh 로 못 박혀 있다 — 자판이 떠도 줄지 않는 길이다.
     시트는 그 바닥에 붙으므로, 띄우지 않으면 자판 뒤로 숨는다.

     얼마나 덮였는지는 **상자 자신에게 묻는다** — 시트가 든 자리(.dim)의
     바닥이 '보이는 창' 의 바닥보다 얼마나 아래인가, 그것이 곧 가려진
     만큼이다. 둘 다 레이아웃 창을 기준으로 재는 값이라 바로 뺄 수 있다.

     ⚠ innerHeight 로 재지 않는다. 사파리에서 innerHeight 는 주소줄이
       걷힌 큰 창이고, 상자는 100svh(주소줄이 선 작은 창)다 — 섞어 재면
       주소줄 높이만큼 **더 띄워**, 시트가 자판 위에 붕 뜬 채 짜부라진다
       (실측: 420 짜리 시트가 259 로 눌렸다).
     ⚠ 레이아웃 창 자체가 주는 브라우저(크롬 interactive-widget=
       resizes-content)에서는 상자도 함께 줄어 가려진 것이 0 으로 나온다 —
       줄어든 창이 이미 시트를 올려 둔 자리라, 더 띄울 것이 없다. */
  function oskb(hit) {
    var dim = hit.querySelector('.dim--kb');
    var vv = window.visualViewport;
    if (!dim || !vv) return;

    function see() {
      /* 여백은 상자 **안쪽**에 드는 것이라 바닥은 움직이지 않는다 —
         재고 띄우는 일이 서로를 밀지 않는다 */
      var cover = Math.max(0, Math.round(dim.getBoundingClientRect().bottom - (vv.offsetTop + vv.height)));
      dim.style.setProperty('--ap-oskb', cover + 'px');
      dim.classList.toggle('is-oskb', cover > 120);
    }

    vv.addEventListener('resize', see);
    vv.addEventListener('scroll', see);
    see();
  }

  /* ── 기기 자판이 올라온 뒤의 본문 ──
     창(레이아웃 뷰포트)은 자판이 떠도 줄지 않는다(meta 의 기본값) — 자판은
     보이는 자리만 덮는다. 그래서 **덮인 만큼 본문 발치를 늘이고**, 적던 칸을
     다시 가운데로 끌어온다. 그러지 않으면 누른 칸이 자판 뒤로 들어간다.
     ⚠ 늘이는 것은 안쪽 여백이라 바닥은 움직이지 않는다 — 재고 늘이는 일이
       서로를 밀지 않는다(시트의 oskb 와 같은 셈이다) */
  function pad(scr) {
    var bd = scr.querySelector('.body');
    var vv = window.visualViewport;
    if (!bd || !vv || bd.dataset.pad) return;
    bd.dataset.pad = '1';

    function see() {
      /* 자판 높이는 **창과 보이는 자리의 차**다 — 창은 자판이 떠도 줄지 않는다.
         120 아래는 자판이 아니라 주소줄이 접히고 펴지는 만큼이다 */
      var kb = Math.max(0, Math.round(window.innerHeight - (vv.height + vv.offsetTop)));
      bd.style.paddingBottom = kb > 120 ? 'calc(var(--ap-p6) + ' + kb + 'px)' : '';
    }
    /* 자판이 서는 데 한 박자 걸린다 — 창이 줄고 난 뒤에 재야 한다 */
    function soon() { setTimeout(see, 60); setTimeout(near, 320); }
    function near() {
      see();
      var el = document.activeElement;
      if (!el || !bd.contains(el)) return;
      var box = el.closest('.fld,.idf,.fld__sub') || el;
      box.scrollIntoView({ block: 'center' });
    }

    vv.addEventListener('resize', soon);
    vv.addEventListener('scroll', see);
    bd.addEventListener('focusin', soon);
    see();
  }

  /* ── 같은 문서에서 띄운다 — `data-go-soft` ──
     보통은 주소를 갈아 **다시 그린다**(link 의 설명). 그런데 그러면 새
     문서가 되어, 누른 손짓이 거기까지 이어지지 않는다. 브라우저는 사람이
     누르지 않은 초점으로는 기기 자판을 올려 주지 않으므로, 근로자 선택하기는
     올라와 놓고도 자판 없이 선 꼴이 됐다.

     그래서 이 한 자리만 **문서를 갈지 않고** 띄운다. 누름이 아직 살아 있는
     그 자리에서 초점을 주면 기기 자판이 바로 선다. 그러려면 insert 부터
     focus 까지가 모두 **그 click 처리 안에서, 기다림 없이** 끝나야 한다 —
     setTimeout 하나만 끼어도 누름은 만료된다.

     ⚠ 문서에 선 화면은 **여전히 한 장**이다. 앞 화면은 behind() 가 베껴
       뒤에 깔고, 원래 것은 덜어 내 선반에 돌려 둔다 — pick() 의 ⚠ 가
       말하는 규칙을 깨지 않는다.
     ⚠ 주소도 함께 간다(pushState). 그래야 새로고침·공유가 같은 자리를
       열고, 뒤로 가기가 앞 화면으로 돌아온다 — 돌아올 때는 문서를 다시
       읽는다(popstate). */
  function soft(name, same) {
    var next = SHELF[name];
    var now = document.querySelector('.scr[data-screen]');
    if (!next || !now || !now.parentNode) return false;

    /* `same` 은 **같은 화면의 다른 꼴**로 갈아 끼우는 길이다(탭 · 라디오).
       주소를 갈아 다시 그리면 본문이 맨 위로 되감겨, 아래쪽에서 탭을 누른
       사람이 제자리를 잃는다. 뒤에 깔 화면도 없고(시트가 아니다) 읽던
       자리만 그대로 옮긴다 */
    var keep = 0, oldbd = now.querySelector('.body');
    if (same && oldbd) keep = oldbd.scrollTop;

    if (!same) {
      /* 시트는 **지금 걸린 것을 켠 채로** 올라온다 — 고치러 올라온 자리라,
         무엇이 걸려 있는지부터 보여야 어디를 누를지가 정해진다. 걸린 것은
         목록 쪽이 알고 있다(data-key · data-job).
         뒤를 깔기 전이다 — 깔고 나면 베낀 목록도 함께 뒤져 엉뚱한 칩을 켠다 */
      sync(next, now);

      /* 뒤에 깔 화면을 베끼는 일은 덜어 내기 전이다 — 지금 선 화면이 아직
         문서에 있어야 behind() 가 그것을 찾는다 */
      behind(next, now.dataset.screen);
    }

    SHELF[now.dataset.screen] = now;
    now.parentNode.insertBefore(next, now);
    now.remove();
    next.classList.add('is-on');

    var u = new URL(location.href);
    u.searchParams.set('screen', name);
    history.pushState({ screen: name }, '', u.toString());

    edge();
    document.title = (next.dataset.title || '안면 출퇴근') + ' · 김반장';

    /* 새로 선 화면이 쓰는 것만 맨다 — 여기 오는 것은 찾는 시트뿐이고,
       그 시트가 쓰는 것은 누르면 갈 자리(link)와 적을 자리(seek)다 */
    link(next);
    if (same) {
      var newbd = next.querySelector('.body');
      /* 한 번으로는 모자란다 — 갈아 끼운 바로 그 순간에는 새 본문의 높이가
         아직 잡히지 않아, 굴릴 수 있는 끝까지만 가고 멎는다 */
      if (newbd) {
        newbd.scrollTop = keep;
        requestAnimationFrame(function () { newbd.scrollTop = keep; });
      }
      pad(next);
    } else {
      seek(next);
    }
    return true;
  }

  /* 뒤로 가기로 돌아올 때는 **문서를 다시 읽는다**. pushState 로 간 자리는
     주소만 바뀐 것이라, 그냥 두면 주소는 앞 화면인데 그려진 것은 시트인
     어긋난 꼴이 된다 */
  window.addEventListener('popstate', function () { location.reload(); });

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

      /* 문서를 갈지 않고 띄우는 자리 — 누름이 살아 있는 동안 끝내야 하므로
         주소를 갈기 전에, 여기서 바로 한다 */
      if (go.hasAttribute('data-go-soft') && soft(go.dataset.go)) return;
      /* 같은 화면의 다른 꼴 — 읽던 자리를 그대로 두고 갈아 끼운다 */
      if (go.hasAttribute('data-go-swap') && soft(go.dataset.go, true)) return;

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
  function behind(hit, over) {
    /* 같은 문서에서 띄울 때는(soft) **그 시트를 연 화면**이 뒤에 깔린다 —
       시트 하나가 여러 목록 위에서 올라오므로(재직 · 퇴사 · 차단 · 직종),
       마크업에 적어 둔 한 장을 늘 깔면 뒤가 엉뚱한 목록이 된다.
       주소로 바로 연 자리에는 연 화면이 없으니 `data-behind` 가 받는다 */
    var name = over || hit.dataset.behind;
    /* 선반도 함께 뒤진다 — 같은 문서에서 띄울 때(soft) 뒤에 깔 화면이 이미
       덜어내진 자리일 수 있다(고른 뒤 화면에서 다시 찾는 시트를 열 때가
       그렇다). 어느 쪽이든 베껴 쓰므로 원본은 건드리지 않는다 */
    var src = name && (document.querySelector('.scr[data-screen="' + name + '"]') || SHELF[name]);
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

  /* ── 걸린 필터를 시트에 옮긴다 ──
     축마다 시트가 따로라, 한 시트에는 둘 가운데 하나만 들어 있다 — 없는
     쪽은 그냥 비어 돈다.

     두 축은 **서로 매이지 않는다**. 근무상태를 걸어도 직종은 풀리지 않고,
     둘은 따로도 함께도 걸린다. 그래서 어느 자리로 갈지는 **두 축에서 이름을
     지어** 정한다(dest) — 사람이 하나라도 있는 조합마다 목록 화면이 한 장씩
     있다(m-workers-live-mok 꼴).

     옆의 수는 **다른 축이 걸린 채로 센 수**다. 재직 기준 수를 퇴사 목록 위에
     그대로 띄우면, 둘을 함께 건 적도 없는 사람 수가 적힌다. 줄마다 네 수를
     들고 있고(근무상태 줄은 data-n-all · -mok · -chul · -bot, 직종 줄은
     data-n-all · -live · -left · -ban), 한 명도 없는 줄은 줄째 덜어 낸다 —
     갈 자리가 없는 조합이 눌리지 않는다. */
  function dest(key, slug) {
    return 'm-workers' + (key && key !== 'all' ? '-' + key : '') + (slug ? '-' + slug : '');
  }
  var SLUG = { '형틀목공': 'mok', '철근공': 'chul', '보통인부': 'bot' };

  function sync(sheet, from) {
    var now = from.dataset.screen || '';
    var key = from.dataset.key || 'all';
    var slug = SLUG[from.dataset.job || ''] || '';

    /* 닫고 돌아갈 자리는 **올라온 그 목록**이다 — 마크업에 적힌 한 자리로
       늘 돌려보내면, 퇴사 목록에서 닫았는데 재직 목록이 선다 */
    if (now) sheet.querySelectorAll('[data-back]').forEach(function (n) { n.dataset.go = now; });

    /* 근무상태 줄 — 지금 걸린 **직종 안에서** 센다 */
    sheet.querySelectorAll('.fsta .optr').forEach(function (r) {
      var k = r.dataset.key || 'all';
      r.classList.toggle('is-on', k === key);
      r.dataset.go = k === key && now ? now : dest(k, slug);
      nset(r, r.dataset['n' + cap(slug || 'all')]);
    });

    /* 직종 줄 — 지금 걸린 **근무상태 안에서** 센다. 맨 위는 직종을 푸는
       줄이라 slug 가 없다 */
    sheet.querySelectorAll('.find__list .optr').forEach(function (r) {
      var g = r.dataset.slug || '';
      r.classList.toggle('is-on', g === slug);
      r.dataset.go = g === slug && now ? now : dest(key, g);
      nset(r, r.dataset['n' + cap(key)]);
    });
  }

  function cap(k) { return k.charAt(0).toUpperCase() + k.slice(1); }

  /* 줄 옆의 수를 적고, 0 이면 줄째 덜어 낸다. is-off 는 그 조합에 사람이
     하나도 없다는 표다 — 적는 동안에도 돌아오지 않도록 sift 가 본다.
     ⚠ 이름을 fill 로 두었더니 달력이 쓰는 fill(302줄)을 덮어, 근로자 앱의
       달력이 통째로 비었다. 이 파일은 한 겹 안에 모두 들어 있다 */
  function nset(r, n) {
    if (n === undefined || n === '') return;
    var cell = r.querySelector('.sel__n');
    if (cell) cell.textContent = n;
    r.classList.toggle('is-off', n === '0');
    r.hidden = n === '0';
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
