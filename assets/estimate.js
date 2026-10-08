/* ================================================================
   estimate.js — 견적받기 화면이 하는 일은 셋뿐이다.

     1) 상단 3탭을 갈아 끼우고, 단말기 두 탭에 견적 화면을 끼운다 (?type=A·B·C)
     2) 체크리스트를 받아 어느 서비스가 맞는지 답한다
     3) 거르개(고용형태 · 차이만 보기)를 걸고 남은 줄을 센다
     4) 그 상태를 주소로도 받는다 (?type= · ?emp= · ?only=)

   4) 가 있는 까닭: 프로토타입 뷰어가 화면을 그 상태로 바로 열어야 하기 때문이다.
   견적 화면이 ?done=1 · ?hold=1 을 받던 것과 같은 자리다 — 사람이 매번
   같은 버튼을 눌러 준비하게 두지 않는다.

   ⚠ 줄을 숨길 때 display:none 을 직접 주지 않고 hidden 속성을 쓴다.
      보조기술에도 '없는 것'으로 넘어가야 하고, base.css 가 [hidden] 에
      못을 박아 두어 어떤 display 규칙도 이기지 못한다.
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
        /* 지켜보는 것도 documentElement 가 아니라 body 다 — 같은 까닭으로
           documentElement 는 틀 크기를 따라가 내용이 줄어도 꿈쩍하지 않는다 */
        if(window.ResizeObserver){
          new ResizeObserver(function(){ fit(fr); }).observe(d.body);
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
    var note = $('#esPickNote'), go = $('#esPickGo');

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
           그쪽은 세지 않는다. 답을 가른 것은 프리미엄 줄이기 때문이다 */
        why.innerHTML = '고르신 것 가운데 <b>' + prem.length + '가지</b>는 프리미엄이 대신 맡는 일입니다 — '
          + prem.map(function(b){ return b.dataset.feat; }).join(' · ')
          + '. 김반장 3.0이 하는 일도 그대로 포함됩니다.';
      }else if(on.length){
        rec.textContent = '김반장 3.0 추천';
        why.innerHTML = '고르신 <b>' + on.length + '가지</b>는 모두 3.0이 하는 일입니다 — '
          + on.map(function(b){ return b.dataset.feat; }).join(' · ')
          + '. 신고만 직접 하시면 됩니다.';
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
      if(note) note.hidden = !asked;
      if(go){
        go.hidden = !asked;
        go.dataset.plan = mode;
        go.textContent = (mode === 'prem' ? '김반장 프리미엄' : '김반장 3.0') + '으로 견적 받기';
      }
    }

    boxes.forEach(function(b){ b.addEventListener('change', paint); });
  })();

  var cmp = $('#esCmp');
  if(!cmp) return;

  var rows = $$('.es-row', cmp);
  var cats = $$('.es-cat', cmp);
  var countEl = $('#esCount');
  var onlyEl  = $('#esOnlyPrem');
  var segBtns = $$('.es-seg[data-filter="emp"] button');

  var state = { emp:'all', only:false };

  /* ── 거르개 한 번 돌리기 ───────────────────────────────────── */
  function apply(){
    var shown = 0;

    rows.forEach(function(row){
      var emp  = row.dataset.emp || '';          /* '' 이면 일용·상용 둘 다 */
      var tier = row.dataset.tier || '30';       /* '30' = 둘 다 제공 · 'prem' = 프리미엄 전용 */
      var okEmp  = state.emp === 'all' || !emp || emp === state.emp;
      var okTier = !state.only || tier === 'prem';
      var show = okEmp && okTier;
      row.hidden = !show;
      if(show) shown++;
    });

    /* 카테고리가 통째로 비면 지우지 않고 '같다'고 적는다 — 왜 비었는지는 거르개가 정한다 */
    cats.forEach(function(cat){
      var live = $$('.es-row', cat).filter(function(r){ return !r.hidden; }).length;
      cat.classList.toggle('is-empty', live === 0);
      var same = $('.es-cat-same', cat);
      if(same){
        same.textContent = state.only
          ? '이 영역은 김반장 3.0과 프리미엄이 똑같습니다.'
          : '이 고용형태에 해당하는 기능이 없습니다.';
      }
      var n = $('.es-cat-h .n', cat);
      if(n) n.textContent = live + '개';
    });

    say(shown);
  }

  /* ── 몇 개가 남았는지 ──────────────────────────────────────── */
  function say(shown){
    if(!countEl) return;
    var total = rows.length;
    if(state.emp === 'all' && !state.only){
      countEl.innerHTML = '김반장이 제공하는 기능 <b>' + total + '개</b>를 모두 보고 있습니다.';
      return;
    }
    var how = [];
    if(state.emp === 'daily')   how.push('일용직 현장');
    if(state.emp === 'regular') how.push('상용직 중심');
    if(state.only)              how.push('프리미엄 전용');
    countEl.innerHTML = how.join(' · ') + ' — 전체 ' + total + '개 중 <b>' + shown + '개</b>';
  }

  /* ── 손잡이 ───────────────────────────────────────────────── */
  segBtns.forEach(function(b){
    b.addEventListener('click', function(){
      state.emp = b.dataset.emp;
      segBtns.forEach(function(o){ o.setAttribute('aria-pressed', String(o === b)); });
      apply();
    });
  });

  if(onlyEl){
    onlyEl.addEventListener('change', function(){
      state.only = onlyEl.checked;
      apply();
    });
  }

  /* ── 주소로 받은 상태 ─────────────────────────────────────────
     뷰어가 ?type=B 나 ?emp=daily&only=1 처럼 붙여 열면 그 자리에서 시작한다 */
  var qs = new URLSearchParams(location.search);

  var emp = qs.get('emp');
  if(emp === 'daily' || emp === 'regular' || emp === 'all'){
    state.emp = emp;
    segBtns.forEach(function(o){ o.setAttribute('aria-pressed', String(o.dataset.emp === emp)); });
  }
  if(qs.get('only') === '1' && onlyEl){
    state.only = true;
    onlyEl.checked = true;
  }
  apply();
})();
