/* ================================================================
   estimate.js — 견적받기 화면이 하는 일은 셋뿐이다.

     1) 상단 3탭을 갈아 끼운다 (?type=A·B·C)
     2) 거르개(고용형태 · 차이만 보기)를 걸고 남은 줄을 센다
     3) 그 상태를 주소로도 받는다 (?type= · ?emp= · ?only=)

   3) 이 있는 까닭: 프로토타입 뷰어가 화면을 그 상태로 바로 열어야 하기 때문이다.
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

    tabs.forEach(function(t){
      t.addEventListener('click', function(){ show(t.dataset.type, true); });
    });

    show((new URLSearchParams(location.search)).get('type') || 'A', false);
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
