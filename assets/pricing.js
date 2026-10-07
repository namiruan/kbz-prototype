/* ================================================================
   pricing.js — 요금안내 화면이 하는 일은 둘뿐이다.

     1) 거르개(고용형태 · 차이만 보기)를 걸고 남은 줄을 센다
     2) 거르개 상태를 주소로도 받는다 (?emp= · ?only=)

   2) 가 있는 까닭: 프로토타입 뷰어가 화면을 그 상태로 바로 열어야 하기 때문이다.
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

  var cmp = $('#prCmp');
  if(!cmp) return;

  var rows = $$('.pr-row', cmp);
  var cats = $$('.pr-cat', cmp);
  var countEl = $('#prCount');
  var onlyEl  = $('#prOnlyPrem');
  var segBtns = $$('.pr-seg[data-filter="emp"] button');

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
      var live = $$('.pr-row', cat).filter(function(r){ return !r.hidden; }).length;
      cat.classList.toggle('is-empty', live === 0);
      var same = $('.pr-cat-same', cat);
      if(same){
        same.textContent = state.only
          ? '이 영역은 김반장 3.0과 프리미엄이 똑같습니다.'
          : '이 고용형태에 해당하는 기능이 없습니다.';
      }
      var n = $('.pr-cat-h .n', cat);
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
     뷰어가 ?emp=daily&only=1 처럼 붙여 열면 그 자리에서 시작한다 */
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
