/* ================================================================
   plan-picker.js — 체크리스트를 받아 어느 서비스가 맞는지 답한다.

   견적받기(estimate.js)에 있던 것을 떼어 낸 것이다. 바깥에서 쓰던 것은
   $ · $$ 둘뿐이라 여기서 다시 세운다.

   ⚠ 답 바의 화살표가 고른 유형을 폼 토글에 옮기던 길은 끊겼다. 그것은
      estimate.js 의 탭 코드(window.esSetPlan)가 들고 있던 것이고, 화면이
      갈리면서 같이 갈렸다. 지금은 견적 폼으로 보내기만 한다.
   ================================================================ */
(function(){
  'use strict';

  var $  = function(s,r){ return (r||document).querySelector(s); };
  var $$ = function(s,r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); };

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
        /* 골랐다가 모두 푼 자리다. '맡길 일이 없으시군요'라고 적었던 때는 읽는
           사람의 사정을 우리가 단정하는 말이 되었다 — 체크를 푼 것은 '해당 없다'
           는 뜻이지 '맡길 일이 없다'는 뜻이 아니다.
           ⚠ 굵은 글씨를 쓰지 않는다. 다른 두 답에서 굵은 것은 **고른 줄의
              이름**이라, 고른 것이 없는 자리에 굵게 적으면 어딘가에서 고른
              것처럼 읽힌다. 잠깐 '근태·급여 계산과 신고서 작성'을 굵게 적었다가
              그 까닭으로 되돌렸다.
           ⚠ '출역만 입력하면'을 앞에 달았더니 390px 에서 넉 줄이 되어 답 바가
              152px 로 불었다. 그 말은 바로 아래 비교표가 줄마다 하고 있다.
           ⚠ '…김반장 3.0으로 충분합니다'로 닫았던 때는 끌어당기는 힘이 없었다.
              '충분하다'는 모자라지 않다는 말이지 가질 까닭이 되는 말이 아니다 —
              고른 것이 없는 사람에게는 '안 사도 되겠네'로 읽힌다.
              고른 줄이 없어도 현장을 하는 이상 매달 돌아오는 일이 있다. 그 일을
              먼저 적고 3.0 이 그것을 끝낸다고 적으면, 체크와 상관없이 쓸 까닭이
              선다. 읽는 사람의 사정을 넘겨짚지 않으면서('맡길 일이 없으시군요'가
              그 덫이었다) 건설 현장이라는 사실 하나에만 기댄다.
           ⚠ 3.0 은 '자동화', 프리미엄은 '맡기다' — 이 페이지가 내내 지키는 가름
              이라 맺음도 바로 위 줄과 같은 '자동화 하세요'로 닫는다.
           ⚠ 이름은 적지 않는다. 바로 왼쪽 제목이 이미 '김반장 3.0 추천'이라,
              한 바 안에서 같은 이름이 두 번 선다.
           ⚠ 두 문장으로 적으면 390px 에서 넉 줄이 되어 답 바가 152px 로 분다
              (도장과 화살표가 떠 있어 글이 설 폭이 좁다). 한 문장으로 묶어
              석 줄에 맞췄다 — 바로 위 '고른 것이 있을 때' 줄과 같은 높이다 */
        why.innerHTML = '공사현장마다 매달 돌아오는 출역·급여·신고, 자동화 하세요.';
      }

      /* 한 화면에 견적신청 폼이 함께 있으면 그 계약 유형까지 돌린다 —
         고른 사람이 같은 것을 두 번 고르지 않게. 이 화면에는 폼이 없어
         그냥 지나간다. 홍보 페이지에서 폼과 한자리에 서면 다시 선다 */
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

      /* 체크하면 답 배너가 생기거나 글이 길어져 목록이 자란다. 여는 상자가
         인라인 max-height 를 들고 있는 동안에는 그만큼 잘리므로 알려 준다 */
      if(window.esPickGrew) window.esPickGrew();
      floatSync();
    }

    /* ── 좁은 폭에서 답을 바닥에 붙인다 ────────────────────────────
       390px 에서 이 구역은 1129~1241px 이고 화면은 844px 이다. 답 바는 열 줄
       아래에 있으니 어느 줄을 체크하든 답이 화면 밖이었다 — 고른 보람이 한
       번도 눈에 닿지 않았다.
       붙이는 조건은 둘이다. 이 구역을 보고 있을 것, 그리고 답이 제자리에
       아직 보이지 않을 것. 아래로 내려가 제자리가 화면에 들어오면 떼어 낸다 —
       같은 바가 둘로 보이거나, 빈 자리를 옆에 두고 떠 있는 꼴이 된다.
       ⚠ 띄우면 흐름에서 빠져 목록이 그만큼 위로 당겨진다. 감싼 상자가 그
          높이를 들고 있게 해 출렁이지 않게 한다. 높이는 띄운 뒤에 잰다 —
          붙은 바는 화면 폭을 쓰므로 제자리(330px)보다 넓고, 그만큼 글이
          덜 접혀 키가 다르다 */
    var dock = $('#esPickDock'), out = $('.es-pick-out'), list = $('.es-pick-list');
    var narrow = window.matchMedia ? window.matchMedia('(max-width:820px)') : null;

    function floatSync(){
      /* ⚠ 접혀 있는 동안에는 붙이지 않는다. 접힘 상자는 overflow:hidden 으로
            답 바를 가려 두는데, position:fixed 는 그 클립을 빠져나간다.
            게다가 그 상자에 걸린 filter:blur() 가 fixed 의 기준 상자가 되어,
            화면 아래가 아니라 접힌 띠 안쪽 바닥에 흐릿한 카드로 갇혀 섰다.
            목록을 아직 펴지도 않은 사람에게 '해당하는 것을 골라 보세요'를
            내미는 꼴이라, 손잡이를 누르기 전에는 없는 것이 맞다 */
      if(!dock || !out || !list || !narrow){
        document.body.classList.remove('es-pick-float', 'es-pick-leaving');
        return;
      }
      /* 접어서 떼는 것이면 아래로 미끄러뜨린다 — 목록이 접히며 사라지는 것과
         같은 방향이다. 폭이 넓어져 떼는 것이면 움직임 없이 끈다 — 창을 끄는
         손짓에 카드가 따라 미끄러지면 그것대로 군더더기다 */
      if(!narrow.matches || pick.hasAttribute('inert')){
        setFloat(false, narrow.matches);
        return;
      }
      /* ⚠ 기준은 구역이 아니라 목록이다. 구역(.es-plans)에는 눈썹·제목·손잡이가
            먼저 서 있어 머리만 400px 가까이 된다. 그 머리가 화면에 걸친 것만으로
            붙이면, 열 줄은 아직 화면 아래에 있는데 답 카드가 제목 위에 떠 있는
            꼴이 된다 — 보는 사람에게는 체크리스트가 나오기도 전에 뜬 것이다.
            펴 둔 목록이 화면에 한 줄이라도 걸쳐 있을 때부터 붙인다 */
      var sr = list.getBoundingClientRect();
      var dr = dock.getBoundingClientRect();
      var seen = sr.top < window.innerHeight && sr.bottom > 0;   /* 구역을 보고 있다 */
      /* ⚠ 제자리로 돌려놓는 때를 '빈 자리가 화면에 다 들어왔을 때'로 잡으면
            한 걸음 늦다. 390px 에서 재 보면 빈 자리가 다 들어오는 순간에도
            바는 아직 12px 위에 떠 있어, 제자리와 떠 있는 자리가 어긋난 채로
            한 번 더 그려진다.
            그래서 둘로 본다. 빈 자리의 윗변이 떠 있는 바의 윗변까지 올라왔거나,
            빈 자리가 통째로 화면에 들어왔으면 내려놓는다.
            그 자리에서 둘의 높이가 겹치므로, 보는 눈에는 떠 있던 바가 그대로
            제자리에 내려앉은 것처럼 보이고 가리는 구간도 18px 로 줄어든다 */
      var home = dr.top <= window.innerHeight - out.offsetHeight - 12
              || dr.bottom <= window.innerHeight;
      /* 떼는 까닭이 '제자리가 올라왔다'면 그 자리에 내려앉히고(미끄러뜨리지
         않는다), '목록이 화면에서 벗어났다'면 아래로 미끄러뜨린다 */
      setFloat(seen && !home, !home);
    }

    /* 붙이고 떼는 일을 한 군데로 모은다. 떼는 길이 둘이기 때문이다.
       ⚠ 제자리(dock)가 올라와서 떼는 것이라면 그 자리에 그대로 내려앉혀야 한다 —
          빈 자리와 떠 있는 바가 같은 높이에 겹쳐 있으므로, 클래스만 거두면
          움직임 없이 자연스럽게 바뀐다. 여기서 아래로 미끄러뜨리면 내려갔다가
          제자리에 다시 나타나는 꼴이 된다.
       ⚠ 목록이 화면에서 벗어나거나 접혀서 떼는 것이라면 아래로 미끄러뜨린다.
          그때는 돌아갈 제자리가 화면에 없으니 그냥 사라지는 편이 맞다 */
    var floatOn = false, leaveTimer = null;
    function setFloat(on, slideOut){
      if(on === floatOn){
        if(on) dock.style.minHeight = out.offsetHeight + 'px';
        return;
      }
      floatOn = on;
      clearTimeout(leaveTimer);
      document.body.classList.remove('es-pick-leaving');
      if(on){
        document.body.classList.add('es-pick-float');
        dock.style.minHeight = out.offsetHeight + 'px';
        return;
      }
      if(!slideOut){
        document.body.classList.remove('es-pick-float');
        dock.style.minHeight = '';
        return;
      }
      document.body.classList.add('es-pick-leaving');
      leaveTimer = setTimeout(function(){
        document.body.classList.remove('es-pick-float', 'es-pick-leaving');
        dock.style.minHeight = '';
      }, 200);
    }

    var floatWait = false;
    function floatTick(){
      if(floatWait) return;
      floatWait = true;
      window.requestAnimationFrame(function(){ floatWait = false; floatSync(); });
    }
    window.addEventListener('scroll', floatTick, { passive:true });
    window.addEventListener('resize', floatTick);
    if(narrow){
      /* 폭이 바뀌면 붙일지 말지가 통째로 달라진다 */
      if(narrow.addEventListener) narrow.addEventListener('change', floatSync);
      else if(narrow.addListener) narrow.addListener(floatSync);
    }
    floatSync();

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
      /* 여는 동안에만 인라인 max-height 가 살아 있다. 그 사이에 내용이 바뀌면
         (체크 → 추천 배너) 목표 높이도 따라 바꿔야 한다 — paint() 가 부른다 */
      var opening = false, openTimer = null;
      function unlock(){
        opening = false;
        clearTimeout(openTimer);
        pick.style.maxHeight = '';
        pick.removeEventListener('transitionend', done);
        pick.removeEventListener('transitioncancel', done);
        floatSync();   /* 다 펴지고 나야 답 바의 제자리가 정해진다 */
      }
      function done(e){
        if(e.target !== pick || e.propertyName !== 'max-height') return;
        unlock();
      }
      /* 바깥에서 목록을 통째로 걷었을 때 — 떠 있던 답 바를 내려놓아야 한다 */
      window.esPickRecheck = floatSync;
      window.esPickGrew = function(){
        if(toggle.getAttribute('aria-expanded') !== 'true') return;
        if(opening) pick.style.maxHeight = pick.scrollHeight + 'px';
        else if(pick.style.maxHeight) pick.style.maxHeight = '';
      };
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
          opening = false;
          clearTimeout(openTimer);
        }else{
          /* ⚠ 지금 높이를 먼저 박고 inert 를 뗀다. 떼는 것이 먼저면 CSS 가
                132px 에서 none 으로 풀려 그 자리에서 다 열려 버린다 */
          pick.style.maxHeight = pick.getBoundingClientRect().height + 'px';
          void pick.offsetHeight;
          pick.removeAttribute('inert');
          opening = true;
          pick.style.maxHeight = pick.scrollHeight + 'px';
          /* ⚠ 열고 나면 반드시 인라인 값을 거둔다. 이 상자는 overflow:hidden 이라,
                남아 있는 max-height 는 그 뒤에 자라는 것(체크하면 나타나는 추천
                배너)을 통째로 잘라 버린다. 전환이 끝났다는 소식은 믿을 게 못 된다 —
                중간에 취소되거나(transitioncancel), 화면 밖이거나 탭이 가려져
                아예 오지 않을 수 있다. 그래서 세 갈래로 거둔다:
                끝나면, 취소되면, 그리고 아무 소식 없어도 전환 시간이 지나면 */
          openTimer = setTimeout(unlock, 700);
          pick.addEventListener('transitionend', done);
          pick.addEventListener('transitioncancel', done);
        }
        /* ⚠ 여닫자마자 한 번 본다. floatSync 는 스크롤·창 크기·체크에만
              매달려 있었는데, 펼치는 일은 그 셋 가운데 어느 것도 아니다.
              그래서 손잡이를 눌러 열 줄이 펴지고 답 바가 화면 아래로 밀려나도
              붙지 않은 채로 있었다 — 스크롤을 한 번 건드려야 그제서야 붙었다.
              여는 동안에는 높이가 변하므로 끝난 뒤(unlock)에 한 번 더 본다 */
        floatSync();
      });
    }
  })();
})();
