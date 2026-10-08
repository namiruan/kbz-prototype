/* ================================================================
   estimate.js — 견적받기 화면이 하는 일은 넷뿐이다.

     1) 상단 3탭을 갈아 끼우고, 단말기 두 탭에 견적 화면을 끼운다 (?type=A·B·C)
     2) 끼운 화면 안의 요약 카드를 스크롤에 맞춰 따라 내리게 한다
     3) 체크리스트를 받아 어느 서비스가 맞는지 답한다
     4) 비교표의 묶음 여섯을 여닫는다

   1) 이 주소를 받는 까닭: 프로토타입 뷰어가 화면을 그 상태로 바로 열어야 하기
   때문이다. 견적 화면이 ?done=1 · ?hold=1 을 받던 것과 같은 자리다 — 사람이
   매번 같은 버튼을 눌러 준비하게 두지 않는다.

   ⚠ 2) 는 iframe 안에서 position:sticky 가 설 수 없어서 있다. 안쪽 화면의
      높이가 곧 그 iframe 의 높이라 붙을 바닥이 없다 — 부모가 재서 밀어 준다.
   ================================================================ */
(function(){
  'use strict';

  var $  = function(s,r){ return (r||document).querySelector(s); };
  var $$ = function(s,r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); };

  /* ── 상단 3탭 ───────────────────────────────────────────────
     탭은 '무엇을 팔고 있는지'를 바꾼다. 그래서 고른 탭이 주소에 남아야
     링크로 그 상품을 바로 열 수 있다 — 히스토리는 늘리지 않는다(replaceState).
     패널을 감출 때 hidden 을 쓰는 까닭은 아래 거르개와 같다: 보조기술에도
     '없는 것'으로 넘어가야 한다 */
  (function(){
    var tabs = $$('.es-tab');
    var panels = $$('.es-panel');
    if(!tabs.length) return;

    /* ── 끼운 견적 화면 ────────────────────────────────────────
       B·C 탭은 제 내용이 없고 quote.html · face-quote.html 을 그대로 끼운다.
       같은 출처라 안쪽 문서를 직접 잴 수 있다 — 높이를 맞춰 주지 않으면 틀 안에
       스크롤바가 하나 더 생겨 바깥 스크롤과 싸운다.
       현장을 더하거나 오류 줄이 서거나 완료 화면으로 바뀌면 안쪽 높이가 변하므로,
       한 번 재고 마는 것이 아니라 ResizeObserver 로 계속 따라간다 */
    /* ⚠ documentElement.scrollHeight 로 재면 안 된다. 틀을 1834px 로 늘려 두면
       안쪽 문서의 뷰포트도 1834px 라, 내용이 줄어도 그 값이 아래로 내려가지
       않는다(되먹임 고리 — 완료 화면이 436px 인데 1834px 로 읽힌다).
       body 의 상자는 내용만큼만 크므로 그쪽을 잰다 */
    function fit(fr){
      try{
        var d = fr.contentDocument;
        if(!d || !d.body) return;
        /* CSS 의 min-height 는 '아직 재기 전'을 위한 자리잡기다. 한 번 재고 나면
           그것이 내려갈 높이의 바닥이 되어 완료 화면(436px)을 70vh 로 붙든다 */
        fr.style.minHeight = '0';
        fr.style.height = Math.ceil(d.body.getBoundingClientRect().height) + 'px';
      }catch(e){}
    }

    /* ── 요약 카드가 따라 내려오게 ─────────────────────────────────
       끼운 화면 안의 '총 예상 견적' 카드는 position:sticky 를 달고 있어도
       꿈쩍하지 않는다. 틀을 내용 높이만큼 늘려 두어 안쪽에는 스크롤되는 창이
       아예 없기 때문이다 — sticky 는 넘치는 창이 있어야 붙을 자리가 생긴다.
       그래서 바깥 스크롤을 보고 부모가 직접 밀어 준다. 미는 것은 transform 이라
       안쪽 레이아웃을 건드리지 않고, 따라서 높이를 다시 재게 만들지도 않는다 */
    /* 재는 일과 미는 일을 갈라 둔다. 스크롤 한 프레임마다 안쪽 문서의
       getComputedStyle·offsetTop·getBoundingClientRect 를 읽으면, 그때마다 두
       문서가 레이아웃을 다시 셈한다 — 미는 값은 맞는데 손이 떨린다.
       잴 것은 스크롤로 달라지지 않으니(틀의 문서상 위치, 카드의 제자리, 갈 수
       있는 거리) 미리 재어 두고, 프레임마다는 뺄셈만 한다 */
    var follows = [], stickTop = 0;
    function remeasure(){
      var sy = window.scrollY || window.pageYOffset || 0;
      stickTop = (parseFloat(getComputedStyle(document.body).getPropertyValue('--tabbar-h')) || 0) + 20;
      follows.forEach(function(o){
        var w;
        try{ w = o.fr.contentDocument && o.fr.contentDocument.defaultView; }catch(e){ w = null; }
        /* 숨은 탭은 잴 것이 없고, 한 단으로 포개지는 폭에서는 카드가 폼 아래에
           그냥 눕는다(position:static) — 안쪽 CSS 가 정해 둔 값을 그대로 따른다 */
        o.on = !!w && o.fr.offsetParent !== null
            && w.getComputedStyle(o.pane).position === 'sticky';
        if(!o.on){ o.pane.style.transform = ''; o.pane.style.willChange = ''; o.at = 0; return; }
        o.frTop = o.fr.getBoundingClientRect().top + sy;   /* 문서 기준 */
        o.top0  = o.pane.offsetTop;
        /* 제 파티션이 끝나면 멈춘다 — 폼 기둥의 바닥을 넘어가지 않는다 */
        o.limit = Math.max(0, o.form.offsetTop + o.form.offsetHeight - o.top0 - o.pane.offsetHeight);
        /* 제 겹을 갖게 해 둔다 — 밀 때마다 다시 그리지 않고 합성기가 옮긴다 */
        o.pane.style.willChange = 'transform';
      });
      follow();
    }
    function follow(){
      var sy = window.scrollY || window.pageYOffset || 0;
      for(var i = 0; i < follows.length; i++){
        var o = follows[i];
        if(!o.on) continue;
        var want = Math.round(Math.min(o.limit, Math.max(0, stickTop + sy - o.frTop - o.top0)));
        if(want === o.at) continue;           /* 바뀐 것이 없으면 건드리지 않는다 */
        o.at = want;
        /* translate3d 로 적는다 — 합성기에 맡겨 글자가 다시 그려지지 않게 */
        o.pane.style.transform = want ? 'translate3d(0,' + want + 'px,0)' : '';
      }
    }
    var ticking = false;
    function onScroll(){
      if(ticking) return;
      ticking = true;
      requestAnimationFrame(function(){ ticking = false; follow(); });
    }
    window.addEventListener('scroll', onScroll, { passive:true });
    window.addEventListener('resize', remeasure);

    /* 프로토타입 뷰어는 바깥 화면을 ?_t=... 로 열어 캐시를 지나친다. 그런데 그
       안에 끼우는 화면은 그냥 주소라, 바깥만 새것이고 안쪽은 브라우저가 들고 있던
       옛 파일이 나온다 — 고친 것이 안 고쳐진 것처럼 보인다.
       바깥이 _t 를 달고 열렸으면 안쪽에도 같은 값을 물려준다. 라이브에서는 _t 가
       없으므로 주소가 깨끗한 채로 남는다 */
    function fresh(src){
      var t = (new URLSearchParams(location.search)).get('_t');
      if(!t) return src;
      return src + (src.indexOf('?') < 0 ? '?' : '&') + '_t=' + t;
    }

    /* 체크리스트와 신청 버튼이 고른 유형을, 끼운 폼의 토글에 그대로 옮긴다.
       폼이 아직 안 떴으면 값만 들고 있다가 뜨는 길에 적용한다(applyPlan) */
    var wantPlan = null;
    function applyPlan(){
      if(!wantPlan) return;
      var fr = $('#panel-A .es-frame');
      if(!fr) return;
      try{
        var d = fr.contentDocument;
        var r = d && d.querySelector('input[name=plan][value="' + wantPlan + '"]');
        if(r && !r.checked){ r.checked = true; r.dispatchEvent(new Event('change', { bubbles:true })); }
      }catch(e){}
    }
    window.esSetPlan = function(v){ wantPlan = v; applyPlan(); };

    function mount(type){
      var fr = $('#panel-' + type + ' .es-frame');
      if(!fr || !fr.dataset.src || fr.getAttribute('src')) return;   /* 한 번만 끼운다 */
      fr.addEventListener('load', function(){
        var d;
        try{ d = fr.contentDocument; }catch(e){ return; }
        if(!d) return;
        /* 그 화면은 틀 안이면 is-embedded 를 스스로 단다 — 모달의 닫기 버튼을
           비켜 주려는 표시다. 여기는 닫기 버튼이 없는 자리라 그 사실을 알린다 */
        if(d.body) d.body.classList.add('is-panel');
        /* '메인으로/닫기'는 모달에서 온 버튼이다 — 탭 안에서는 닫을 것이 없다 */
        var home = d.getElementById && d.getElementById('btnHome');
        if(home) home.hidden = true;
        /* A 탭 폼은 계약 유형을 밖에서 정해 준다 — 뜨자마자 그 자리로 맞춘다 */
        if(type === 'A') applyPlan();
        fit(fr);
        var pane = d.getElementById('sumPane'), form = d.getElementById('quoteForm');
        if(pane && form){ follows.push({ fr:fr, pane:pane, form:form, on:false, at:0 }); }
        remeasure();
        /* 지켜보는 것도 documentElement 가 아니라 body 다 — 같은 까닭으로
           documentElement 는 틀 크기를 따라가 내용이 줄어도 꿈쩍하지 않는다 */
        if(window.ResizeObserver){
          new ResizeObserver(function(){ fit(fr); remeasure(); }).observe(d.body);
        }
      });
      fr.setAttribute('src', fresh(fr.dataset.src));
    }

    function show(type, push){
      var hit = tabs.some(function(t){ return t.dataset.type === type; });
      /* 모르는 값이면 A 로 돌리되 주소도 같이 고친다 — ?type=Z 가 주소에 남아
         있으면 공유된 링크가 계속 엉뚱한 값을 실어 나른다 */
      if(!hit){ type = 'A'; push = true; }
      tabs.forEach(function(t){
        var on = t.dataset.type === type;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', String(on));
      });
      panels.forEach(function(pn){ pn.hidden = (pn.id !== 'panel-' + type); });
      mount(type);
      remeasure();         /* 막 보이게 된 틀의 카드도 제자리를 잡는다 */

      /* 좁은 폭에서 탭 줄은 가로로 밀어 보는 띠가 된다. ?type=C 로 바로 들어오면
         고른 탭이 화면 밖에 있어 '지금 어느 탭인지'가 보이지 않으므로, 가운데로
         당겨 온다. 띠가 넘치지 않는 넓은 폭에서는 아무 일도 일어나지 않는다 */
      var row = $('.es-tabs-row'), cur = $('.es-tab.is-active');
      if(row && cur && row.scrollWidth > row.clientWidth){
        row.scrollLeft = cur.offsetLeft - (row.clientWidth - cur.offsetWidth) / 2;
      }
      if(push){
        try{
          var u = new URL(location.href);
          u.searchParams.set('type', type);
          history.replaceState(null, '', u);
        }catch(e){}
        /* 탭을 바꾸면 그 상품의 맨 위부터 보여 준다 — 앞 탭에서 내려온 만큼
           그대로 두면 새 탭의 한가운데로 떨어진다.
           첫 진입(scrollY 0)에는 움직일 것이 없다 */
        /* ⚠ 탭 줄은 sticky 라 제 위치를 물어도 소용없다 — 화면 위에 붙어 있는
           동안 getBoundingClientRect().top 은 0이고 offsetTop 은 지금 스크롤
           위치를 그대로 돌려준다. 둘 다 '붙기 전 자리'가 아니다.
           그래서 고정되지 않은 이웃(머리글)의 아래끝을 재서 쓴다 */
        var hero = $('.es-hero');
        var top = hero ? hero.offsetTop + hero.offsetHeight : 0;
        if(window.scrollY > top){
          var root = document.documentElement, prev = root.style.scrollBehavior;
          root.style.scrollBehavior = 'auto';
          window.scrollTo(0, top);
          root.style.scrollBehavior = prev;
        }
      }
    }

    /* 비교표 머리줄도 따라붙는다. 둘이 겹치지 않으려면 탭바 높이를 알아야 하는데,
       글꼴이 뜨고 폭이 바뀔 때마다 달라지므로 CSS 에 박지 않고 재서 넣는다 */
    function measure(){
      var bar = $('.es-tabs');
      if(bar) document.body.style.setProperty('--tabbar-h', bar.offsetHeight + 'px');
      watchHead();
    }

    /* 머리줄이 제자리인지 붙었는지는 CSS 혼자 알지 못한다 — sticky 에는 '붙었음'
       상태가 없다. 머리줄 바로 위에 높이 0 짜리 눈금을 두고, 그것이 탭바 아래로
       사라지는 순간을 붙은 순간으로 삼는다. 스크롤마다 재지 않으므로 공짜다.
       ⚠ 탭바 높이는 글꼴이 뜨거나 폭이 바뀔 때마다 달라진다. 여백에 그 값을
          박아 두니 값이 바뀌면 보는 눈도 다시 만들어야 한다 */
    var head = $('.es-cmp-head'), sentinel = $('.es-cmp-sentinel'), headIO = null;
    function watchHead(){
      if(!head || !sentinel || !window.IntersectionObserver) return;
      if(headIO) headIO.disconnect();
      var h = parseFloat(getComputedStyle(document.body).getPropertyValue('--tabbar-h')) || 0;
      headIO = new IntersectionObserver(function(es){
        /* ⚠ 눈금은 위로 지나갈 때도, 아직 화면 아래에 있을 때도 똑같이 '안
           보임'이다. 지나간 쪽만 붙은 것이므로 어느 쪽인지 가려야 한다 */
        var e = es[0], rb = e.rootBounds;
        head.classList.toggle('is-stuck',
          !e.isIntersecting && !!rb && e.boundingClientRect.top <= rb.top);
      }, { rootMargin: '-' + (h + 1) + 'px 0px 0px 0px', threshold: 0 });
      headIO.observe(sentinel);
    }

    measure();
    window.addEventListener('resize', measure);
    if(document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

    tabs.forEach(function(t){
      t.addEventListener('click', function(){ show(t.dataset.type, true); });
    });

    /* 신청 버튼은 앵커로 내려가는 일만 브라우저에 맡기고, 유형은 여기서 맞춘다 —
       고른 것을 폼에서 또 고르게 두지 않는다 */
    $$('a[data-plan]').forEach(function(a){
      a.addEventListener('click', function(){ window.esSetPlan(a.dataset.plan); });
    });

    show((new URLSearchParams(location.search)).get('type') || 'A', false);
  })();

  /* ── 어느 쪽이 맞는지 고르기 ─────────────────────────────────
     여섯 줄은 전부 노션 「서비스별 기능 상세」의 🟡(프리미엄 전용) 기능이다.
     그래서 '하나라도 고르면 프리미엄'은 점수를 매겨 정한 셈법이 아니라 사실이다
     — 고른 일을 김반장 3.0 은 아예 하지 않는다.

     묻기도 전에는 어느 쪽도 추천하지 않는다(data-rec="none"). 한 번이라도
     손을 대야 답이 선다 — '아무것도 해당 없음'과 '아직 안 봤음'은 다른 상태다 */
  (function(){
    var pick = $('#esPick');
    if(!pick) return;
    var boxes = $$('.es-pick-item input', pick);
    var rec = $('#esPickRec'), why = $('#esPickWhy');
    var go = $('#esPickGo'), seal = $('#esPickSeal');

    /* 기능 이름 뒤에 붙는 조사는 받침이 가른다 — '…검증은', '…관리는' */
    function eun(w){
      var c = w.charCodeAt(w.length - 1);
      if(c < 0xAC00 || c > 0xD7A3) return '은';
      return (c - 0xAC00) % 28 ? '은' : '는';
    }
    function nameList(on){
      var names = on.map(function(b){ return b.dataset.feat; });
      return '<b>' + names.join(' · ') + '</b>' + eun(names[names.length - 1]);
    }

    function paint(){
      var on   = boxes.filter(function(b){ return b.checked; });
      /* 여섯 줄이 전부 프리미엄 전용이던 때는 '하나라도 고르면 프리미엄'이 곧
         답이었다 — 사실상 '대행 쓰실래요?' 한 문항을 여섯 번 물은 셈이다.
         3.0 이 하는 일도 섞었으니 가름은 개수가 아니라 줄의 소속이다.
         프리미엄 줄이 하나라도 끼면 프리미엄, 3.0 줄만 골랐으면 3.0 */
      var prem = on.filter(function(b){ return b.dataset.tier === 'prem'; });
      var mode = prem.length ? 'prem' : 'c30';
      pick.dataset.rec = mode;

      if(mode === 'prem'){
        rec.textContent = '김반장 프리미엄 추천';
        /* 고른 것은 겪는 일이고, 여기서 그 일을 맡는 기능 이름으로 바꿔 부른다 —
           추천이 어디서 나온 말인지 되짚을 수 있어야 한다. 3.0 줄도 함께 골랐다면
           이름을 부르지 않는다. 답을 가른 것은 프리미엄 줄이기 때문이다.
           ⚠ 몇 가지인지는 세지 않는다. '고르신 1가지는 모두…' 처럼 하나를 두고
              '모두'라고 하면 말이 어긋나고, 세어 봐야 바로 옆에 이름이 적혀 있다.
           ⚠ '3.0 이 하는 일도 그대로 포함됩니다'는 달지 않는다. 같은 페이지의
              FAQ Q1 이 그 물음을 통째로 받고 있고, 답 자리는 고른 일을 누가 맡는지
              한 가지만 말하면 된다.
           ⚠ '대신 맡습니다'도 아니다. 부르는 이름이 이미 '…대행'이라, 대행을
              대신 맡는다는 말이 된다.
           두 가지는 같은 꼴로 적는다 — '이제 …으로 자동화 하세요' / '이제 …에
           맡기세요'. 둘 다 권하는 말이고, 바뀌는 것은 맡기는 이름 하나뿐이라
           무엇이 다른지가 그 자리에서 드러난다 */
        why.innerHTML = nameList(prem) + ' 이제 김반장 프리미엄에 맡기세요.';
      }else if(on.length){
        rec.textContent = '김반장 3.0 추천';
        why.innerHTML = nameList(on) + ' 이제 김반장 3.0으로 자동화 하세요.';
      }else{
        rec.textContent = '김반장 3.0 추천';
        why.innerHTML = '맡길 일이 없으시군요. 출역만 입력하면 근태·급여 계산과 신고서 작성까지 <b>3.0이 자동으로</b> 끝냅니다.';
      }

      /* 답은 위에 끼워 둔 견적신청 폼의 계약 유형까지 돌린다 —
         고른 사람이 같은 것을 두 번 고르지 않게 */
      if(window.esSetPlan) window.esSetPlan(mode);

      /* 폼이 위로 올라갔으니 돌아갈 길을 답 옆에 둔다. 묻기도 전에는 내지
         않는다 — 아직 아무것도 고르지 않은 자리에서 '이 구성으로'는 빈 말이다 */
      var asked = pick.dataset.rec === 'c30' || pick.dataset.rec === 'prem';
      if(seal) seal.hidden = !asked;
      if(go){
        go.hidden = !asked;
        go.dataset.plan = mode;
        /* 화살표에는 글자가 없다. 보이는 이름 대신 읽히는 이름을 갈아 끼운다 */
        go.setAttribute('aria-label',
          (mode === 'prem' ? '김반장 프리미엄' : '김반장 3.0') + '으로 견적 받기');
      }
    }

    boxes.forEach(function(b){ b.addEventListener('change', paint); });

    /* 열 줄은 접은 채로 선다. 여는 손잡이는 제목 아래 알약 하나다.
       접어 두어도 치우지는 않는다 — 흐리게 깔려 무엇을 묻는지 보이고, 아래로
       스르륵 지워진다. 그 모양은 CSS 가 [inert] 를 보고 그린다.
       ⚠ 접힘은 마크업이 들고 있다(inert). 자바스크립트로 접으면 열렸다가
          접히는 깜빡임이 난다 — 비교표 여섯 묶음과 같은 이유다 */
    var toggle = $('#esPickToggle');
    if(toggle){
      /* 열고 닫는 길이는 자바스크립트가 재서 넣는다.
         CSS 의 max-height 한 값으로는 두 쪽이 다 어긋난다. 펼친 높이를 모르니
         넉넉한 값(20000px)을 적어 두게 되는데, 그러면 열 때는 132 → 317 이 60ms
         만에 끝나고 남은 490ms 를 317 → 20000 사이에서 보이지 않게 굴린다.
         닫을 때는 거꾸로 500ms 를 멈춰 있다가 끝에서 탁 닫힌다. 그동안 margin 만
         0.55초를 미끄러지니 한 동작이 둘로 갈라진다.
         실제 높이를 집어넣으면 두 값이 같은 길이를 같은 속도로 간다.
         ⚠ 다 열고 나면 inline 값을 거둔다. 남겨 두면 안에서 글이 한 줄 늘거나
            폭이 바뀌어 높이가 달라질 때 그 자리에서 잘린다.
         ⚠ 닫을 때는 지금 높이를 먼저 박고 한 번 재게 한 뒤에 거둔다. 바로
            거두면 auto 에서 132 로 뛰는 셈이라 전환이 걸리지 않는다 */
      toggle.addEventListener('click', function(){
        var open = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!open));
        if(open){
          pick.style.maxHeight = pick.scrollHeight + 'px';
          void pick.offsetHeight;
          /* ⚠ 속성으로 여닫는다. inert 는 IDL 프로퍼티이기도 해서 둘을 섞으면
                어느 쪽이 참인지 헷갈린다 — CSS 가 보는 것은 속성이다 */
          pick.setAttribute('inert','');
          pick.style.maxHeight = '';
        }else{
          /* ⚠ 지금 높이를 먼저 박고 inert 를 뗀다. 떼는 것이 먼저면 CSS 가
                132px 에서 none 으로 풀려 그 자리에서 다 열려 버린다 */
          pick.style.maxHeight = pick.getBoundingClientRect().height + 'px';
          void pick.offsetHeight;
          pick.removeAttribute('inert');
          pick.style.maxHeight = pick.scrollHeight + 'px';
          var done = function(e){
            if(e.target !== pick || e.propertyName !== 'max-height') return;
            pick.style.maxHeight = '';
            pick.removeEventListener('transitionend', done);
          };
          pick.addEventListener('transitionend', done);
        }
      });
    }
  })();

  /* ── 묶음 여닫기 ───────────────────────────────────────────── */
  /* 제목 줄을 누르면 그 묶음만 접힌다. 접는 자리는 .es-cat 하나이고, 줄은
     CSS 가 숨긴다 — 자바스크립트가 줄마다 손대면 서른세 번 건드리게 된다.
     ⚠ 열림 여부는 aria-expanded 가 들고, 클래스는 보이는 쪽만 맡는다.
        둘 중 하나만 두면 눈이나 귀 한쪽이 거짓을 듣는다 */
  $$('.es-cat-t').forEach(function(t){
    t.addEventListener('click', function(){
      var cat = t.closest('.es-cat');
      var shut = cat.classList.toggle('is-shut');
      t.setAttribute('aria-expanded', String(!shut));
    });
  });

  /* ⚠ 여기 있던 거르개(고용형태 세그먼트 · 프리미엄만 보기)는 걷었다.
        함께 사라진 것들 — 남은 수를 세던 줄(.es-count), 묶음이 통째로 비었을 때
        대신 적던 '똑같습니다' 줄(.es-cat-same), 그리고 ?emp= · ?only= 주소 상태.
        거를 수 없으면 줄이 숨지 않고, 숨지 않으면 셀 것도 빌 것도 없다.
        줄의 [일용]·[상용] 꼬리표와 범례는 남겨 두었다. 거르는 손잡이가 아니라
        그 줄이 어느 현장 것인지 적어 두는 표시이기 때문이다 */
})();
