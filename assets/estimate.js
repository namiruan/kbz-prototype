/* ================================================================
   estimate.js — 견적받기 화면이 하는 일은 셋뿐이다.

     1) 상단 3탭을 갈아 끼우고, 단말기 두 탭에 견적 화면을 끼운다 (?type=program·ecard·face)
     2) 끼운 화면 안의 요약 카드를 스크롤에 맞춰 따라 내리게 한다
     3) 비교표의 묶음 여섯을 여닫는다

   「어떤 서비스가 맞을까」 체크리스트는 여기 있었는데 홍보 페이지로 옮기기로
   해서 plan-picker.js 로 갈라 두었다.

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
       끼운 화면 안의 '이용요금(예상)' 카드는 position:sticky 를 달고 있어도
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
      var fr = $('#panel-program .es-frame');
      if(!fr) return;
      try{
        var d = fr.contentDocument;
        var r = d && d.querySelector('input[name=plan][value="' + wantPlan + '"]');
        if(r && !r.checked){ r.checked = true; r.dispatchEvent(new Event('change', { bubbles:true })); }
      }catch(e){}
    }
    window.esSetPlan = function(v){ wantPlan = v; applyPlan(); };

    /* ── 누른 칸을 탭 줄 바로 아래로 ──────────────────────────────
       끼운 폼의 kbd.js 는 패널 안에서 비켜선다(그쪽 머리말에 까닭이 있다) —
       안쪽 창에는 굴릴 자리가 없고 70vh 의 vh 도 화면이 아니라 틀의 높이라,
       제가 굴리면 누른 칸이 되레 화면 밖으로 밀려 나갔다.
       그래서 올리는 일은 굴릴 창을 가진 쪽, 곧 여기가 맡는다.

       브라우저는 '키보드에 안 가리면' 거기서 멈춘다. 그 자리는 대개 화면
       아래쪽이고, 그 아래는 키보드가 먹고 있어 다음 칸도 오류 줄도 함께
       보이지 않는다. 칸 하나가 아니라 라벨까지 한 덩어리(.f-item)로 잡아
       탭 줄 바로 아래에 세우면, 무슨 칸인지와 다음에 누를 것이 같이 보인다.

       손끝으로 쓰는 기기에서만 한다 — 마우스로 칸을 누를 때 화면이 움직이면
       그건 거드는 것이 아니라 놀라게 하는 것이다 */
    var coarse = window.matchMedia && window.matchMedia('(pointer:coarse)').matches;
    /* 칸에 들어가 있는 동안은 탭 줄을 숨기지 않는다 — '탭 줄 바로 아래'에
       세워 놓고 그 줄이 사라지면 칸 위에 빈 띠만 남는다. 글을 쓰는 중에
       돌아갈 길을 치우는 것도 될 일이 아니다 */
    var typing = false;
    function typable(el){
      if(!el || el.disabled || el.readOnly) return false;
      if(el.tagName === 'TEXTAREA') return true;
      if(el.tagName !== 'INPUT') return false;
      return !/^(checkbox|radio|button|submit|reset|hidden|file|range|color)$/i
        .test(el.getAttribute('type') || 'text');
    }
    function liftTo(fr, el){
      var block = (el.closest && el.closest('.f-item')) || el;
      var want = (parseFloat(getComputedStyle(document.body)
                  .getPropertyValue('--tabbar-h')) || 0) + 10;
      var now = fr.getBoundingClientRect().top + block.getBoundingClientRect().top;
      var d = Math.round(now - want);
      if(!d) return;
      /* 탭 줄이 숨어 있으면 '탭 줄 아래'라는 자리가 성립하지 않는다 — 돌려놓는다 */
      document.body.classList.remove('tabs-away');
      var html = document.documentElement, prev = html.style.scrollBehavior;
      html.style.scrollBehavior = 'auto';   /* 부드럽게 흐르면 키보드와 겹쳐 흔들린다 */
      window.scrollBy(0, d);
      html.style.scrollBehavior = prev;
    }
    function lifts(fr, d){
      if(!coarse) return;
      var up = false;
      d.addEventListener('focusin', function(e){
        var el = e.target;
        if(!typable(el)) return;
        var was = up; up = true; typing = true;
        /* 키보드가 올라서고 브라우저가 제 몫을 굴린 뒤라야 우리 자리가 마지막으로
           남는다. 칸에서 칸으로 옮길 때는 이미 올라와 있어 기다릴 것이 적다 */
        setTimeout(function(){
          if(d.activeElement === el) liftTo(fr, el);
        }, was ? 140 : 340);
        /* 브라우저가 뒤늦게 한 번 더 굴리는 일이 있어 한 번 더 맞춘다 */
        setTimeout(function(){
          if(d.activeElement === el) liftTo(fr, el);
        }, was ? 420 : 620);
      });
      d.addEventListener('focusout', function(){
        setTimeout(function(){
          if(!typable(d.activeElement)){ up = false; typing = false; }
        }, 80);
      });
    }

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
        if(type === 'program') applyPlan();
        fit(fr);
        var pane = d.getElementById('sumPane'), form = d.getElementById('quoteForm');
        if(pane && form){ follows.push({ fr:fr, pane:pane, form:form, on:false, at:0 }); }
        remeasure();
        lifts(fr, d);      /* 누른 칸을 탭 줄 바로 아래로 — 바깥이 굴린다 */
        /* 지켜보는 것도 documentElement 가 아니라 body 다 — 같은 까닭으로
           documentElement 는 틀 크기를 따라가 내용이 줄어도 꿈쩍하지 않는다 */
        if(window.ResizeObserver){
          new ResizeObserver(function(){ fit(fr); remeasure(); }).observe(d.body);
        }
      });
      fr.setAttribute('src', fresh(fr.dataset.src));
    }

    /* 탭 이름은 주소에 그대로 실린다 — ?type=ecard 는 읽는 것만으로 어느
       화면인지 알 수 있지만 ?type=B 는 이 코드를 읽어야 안다.
       ⚠ A·B·C 로 나눠 쓰던 때의 링크가 이미 돌아다니므로 받아는 준다.
          받되 주소는 새 이름으로 고쳐 둔다 — 그래야 다음에 복사되는 링크부터
          제 이름을 달고 나간다 */
    var WAS = { A:'program', B:'ecard', C:'face' };

    function show(type, push){
      if(WAS[type]){ type = WAS[type]; push = true; }
      var hit = tabs.some(function(t){ return t.dataset.type === type; });
      /* 모르는 값이면 첫 탭으로 돌리되 주소도 같이 고친다 — ?type=Z 가 주소에
         남아 있으면 공유된 링크가 계속 엉뚱한 값을 실어 나른다 */
      if(!hit){ type = 'program'; push = true; }
      tabs.forEach(function(t){
        var on = t.dataset.type === type;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', String(on));
      });
      panels.forEach(function(pn){ pn.hidden = (pn.id !== 'panel-' + type); });
      faq(type);           /* 이 탭에서 걸리는 물음만 세운다 */
      help(type);          /* 바닥의 묻는 방법도 이 탭의 말로 바꾼다 */
      mount(type);
      remeasure();         /* 막 보이게 된 틀의 카드도 제자리를 잡는다 */
      /* 비교표가 없는 탭으로 옮겼으면 탭 줄이 비켜 있을 까닭도 사라진다 —
         보는 눈이 다시 말해 줄 때까지 기다리지 않고 그 자리에서 돌려놓는다 */
      tabsFollow();

      /* 좁은 폭에서 탭 줄은 가로로 밀어 보는 띠가 된다. ?type=face 로 바로 들어오면
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

    /* ── 바닥의 '다른 도움이 필요하신가요' — 탭을 따라 말이 바뀐다 ──
       둘 다 같은 말을 하면 '각 탭에 맞는'이 아니라 한 벌을 두 번 쓰는 것이다.
       바뀌는 것은 소개서 칸의 받을 거리뿐이다.
       ⚠ 전화는 탭을 타지 않는다 — 번호는 회사가 하나만 들고 있다 */
    /* ⚠ href 가 받는 주소다. 아직 없어 제자리(#help)를 가리켜 둔다 —
          받으면 이 표에 꽂는 것으로 끝난다.
       소개서는 신청하는 것이 아니라 바로 받는 것이고, 탭마다 받을 것이 다르다.
       3.0 과 프리미엄은 쓰는 사람이 고를 수 있어야 하므로 둘로 나눠 세운다 */
    var DOCS = {
      program:[ ['김반장 3.0 소개서 다운로드',   '#help'],
                ['김반장 프리미엄 소개서 다운로드','#help'] ],
      ecard  :[ ['퇴직공제 전자카드 단말기 소개서 다운로드','#help'] ],
      face   :[ ['안면인식 출퇴근관리 소개서 다운로드','#help'] ]
    };
    var DL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"'
           + ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
           + '<path d="M12 4v10M8 10.5l4 4 4-4M5 19h14"/></svg>';
    function help(type){
      var list = DOCS[type], box = $('#helpDocs');
      if(!list || !box) return;
      box.innerHTML = list.map(function(x){
        return '<a class="go" href="' + x[1] + '" download>' + x[0] + DL + '</a>';
      }).join('');
    }

    /* ── FAQ — 이 탭에서 걸리는 물음만 세운다 ─────────────────────
       구역은 탭 밖에 있어 세 탭에 그대로 보이지만, 묻는 사람은 탭마다 다르다.
       줄마다 적어 둔 data-tab 으로 거른다.
       ⚠ display 가 아니라 hidden 이다. 다른 탭의 물음은 '접어 둔 것'이 아니라
          이 탭에 해당하지 않는 것이라, 눈으로 읽지 않는 사람에게도 없어야 한다.
       ⚠ 처음 펴 둘 줄도 탭마다 다시 고른다. 첫 줄에 open 을 박아 두면 그 줄이
          숨는 탭에서는 다섯 줄이 모두 닫힌 채로 서서, 답이 있는지조차 안 보인다.
          이미 펴 본 줄이 그 탭에 남아 있으면 그대로 둔다 — 탭을 다녀왔다고
          읽던 자리를 접지 않는다 */
    var faqRows = $$('.faq details');
    function faq(type){
      var seen = [];
      faqRows.forEach(function(d){
        /* ⚠ indexOf 로 견주면 안 된다 — 한 글자(A·B·C)일 때는 맞았지만
              이름이 길어지면 'card' 가 'ecard' 안에 들어 있어 엉뚱한 줄이 선다.
              여러 탭에 걸치는 줄은 data-tab 에 빈칸으로 늘어놓는다 */
        var on = (d.dataset.tab || '').split(/\s+/).indexOf(type) > -1;
        d.hidden = !on;
        if(on) seen.push(d); else d.open = false;
      });
      if(seen.length && !seen.some(function(d){ return d.open; })) seen[0].open = true;
    }

    /* 비교표 머리줄도 따라붙는다. 둘이 겹치지 않으려면 탭바 높이를 알아야 하는데,
       글꼴이 뜨고 폭이 바뀔 때마다 달라지므로 CSS 에 박지 않고 재서 넣는다 */
    function measure(){
      var bar = $('.es-tabs');
      if(bar) document.body.style.setProperty('--tabbar-h', bar.offsetHeight + 'px');
      watchHead();
      edges();
    }

    /* 좁은 폭에서 탭 줄은 가로로 밀린다. 잘린 탭은 잘려 보이기만 할 뿐 밀라고
       말해 주지 않으므로, 남은 쪽 끝에만 띠와 화살표를 세운다 */
    var tabsBarEl = $('.es-tabs'), tabsRow = $('.es-tabs-row');
    function edges(){
      if(!tabsBarEl || !tabsRow) return;
      var over = tabsRow.scrollWidth - tabsRow.clientWidth;
      tabsBarEl.classList.toggle('can-l', over > 1 && tabsRow.scrollLeft > 1);
      tabsBarEl.classList.toggle('can-r', over > 1 && tabsRow.scrollLeft < over - 1);
    }
    if(tabsRow) tabsRow.addEventListener('scroll', edges, { passive: true });

    /* 화살표를 누르면 그 쪽으로 밀되, 아무 데나 멈추지 않고 다음 탭이 왼쪽
       끝(또는 오른쪽 끝)에 와 서도록 끌어 준다 — 띠에 반쯤 걸친 채 멈추면
       누르고도 여전히 잘려 보인다 */
    /* ⚠ offsetLeft 는 offsetParent 기준이라 .inner 의 좌우 여백만큼 어긋난다 —
       줄 안에서의 자리는 rect 로 재서 스크롤 좌표와 같은 자로 맞춘다 */
    function spot(el){
      var r = tabsRow.getBoundingClientRect(), t = el.getBoundingClientRect();
      var l = t.left - r.left + tabsRow.scrollLeft;
      return { l: l, r: l + t.width };
    }
    function glide(dir){
      if(!tabsRow) return;
      var pad = 12, view = tabsRow.clientWidth, at = tabsRow.scrollLeft, to = null;
      var list = tabs.slice();
      if(dir > 0){
        for(var i = 0; i < list.length; i++){
          var e = spot(list[i]);
          if(e.r > at + view + 1){ to = e.r - view + pad; break; }
        }
        if(to === null) to = tabsRow.scrollWidth;
      }else{
        for(var j = list.length - 1; j >= 0; j--){
          var b = spot(list[j]);
          if(b.l < at - 1){ to = b.l - pad; break; }
        }
        if(to === null) to = 0;
      }
      var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      tabsRow.scrollTo({ left: Math.max(0, to), behavior: still ? 'auto' : 'smooth' });
    }
    $$('.es-tabs-edge').forEach(function(btn){
      btn.addEventListener('click', function(){ glide(btn.classList.contains('r') ? 1 : -1); });
    });

    /* 머리줄이 제자리인지 붙었는지는 CSS 혼자 알지 못한다 — sticky 에는 '붙었음'
       상태가 없다. 머리줄 바로 위에 높이 0 짜리 눈금을 두고, 그것이 탭바 아래로
       사라지는 순간을 붙은 순간으로 삼는다. 스크롤마다 재지 않으므로 공짜다.
       ⚠ 탭바 높이는 글꼴이 뜨거나 폭이 바뀔 때마다 달라진다. 여백에 그 값을
          박아 두니 값이 바뀌면 보는 눈도 다시 만들어야 한다 */
    var head = $('.es-cmp-head'), sentinel = $('.es-cmp-sentinel'), headIO = null;
    /* ⚠ 눈금과 비교표는 A 패널 안에 있다. B·C 탭에서 그 패널이 hidden 이면 눈금의
       상자가 0,0,0,0 으로 접히는데, 아래 판정이 '위로 지나갔다'를 top <= rootBounds.top
       으로 보므로 0 <= 53 이 늘 참이 된다 — 보는 눈이 '머리줄이 붙었다'고 말하고,
       탭 줄은 그 말을 믿고 길을 비킨다. 비교표가 아예 없는 탭에서 조금만 내려도
       탭 줄이 제목 위로 47px 올라앉던 것이 이것이다(실측: 사이 40px → -8px).
       그려지고 있지 않으면 물을 것도 없다 */
    function headLive(){ return !!(sentinel && sentinel.offsetParent); }
    function watchHead(){
      if(!head || !sentinel || !window.IntersectionObserver) return;
      if(headIO) headIO.disconnect();
      var h = parseFloat(getComputedStyle(document.body).getPropertyValue('--tabbar-h')) || 0;
      headIO = new IntersectionObserver(function(es){
        /* ⚠ 눈금은 위로 지나갈 때도, 아직 화면 아래에 있을 때도 똑같이 '안
           보임'이다. 지나간 쪽만 붙은 것이므로 어느 쪽인지 가려야 한다 */
        var e = es[0], rb = e.rootBounds;
        head.classList.toggle('is-stuck',
          headLive() && !e.isIntersecting && !!rb && e.boundingClientRect.top <= rb.top);
        nowCat();
      }, { rootMargin: '-' + (h + 1) + 'px 0px 0px 0px', threshold: 0 });
      headIO.observe(sentinel);
    }

    /* 붙어 있는 동안 머리줄이 '지금 어느 묶음인지'를 들고 있는다. 묶음 제목은
       화면 위로 지나가 버리는데 표는 스물두 줄이라, 중간쯤에서 보고 있는 줄이
       공사 이야기인지 급여 이야기인지 알 길이 없었다.
       ⚠ 재는 자리는 머리줄의 아랫변이다. 그 선 바로 아래가 지금 읽는 첫 줄이라,
          묶음이 바뀌는 순간과 이름이 바뀌는 순간이 맞는다.
       ⚠ 묶음과 묶음 사이의 빈 자리에서는 지나온 이름을 들고 있는다. 비우면
          묶음이 갈릴 때마다 이름이 한 번씩 깜빡인다 */
    var cats = $$('.es-cat'), nowEl = $('.es-cmp-head .now');
    function nowCat(){
      if(!head || !nowEl) return;
      var name = '';
      if(headLive() && head.classList.contains('is-stuck')){
        var line = head.getBoundingClientRect().bottom + 1;
        for(var i = 0; i < cats.length; i++){
          var r = cats[i].getBoundingClientRect();
          if(r.top > line) break;                 /* 아직 닿지 않은 묶음 */
          name = cats[i].getAttribute('aria-label') || '';
          if(r.bottom > line) break;              /* 이 묶음 안이다 */
        }
      }
      if(nowEl.textContent !== name) nowEl.textContent = name;
    }

    /* 머리줄이 붙으면 화면 위쪽을 탭 줄과 둘이 나눠 쓴다. 비교표는 길어서 그
       자리가 아깝다 — 내려갈 때는 탭 줄을 치우고, 올릴 때 돌려준다.
       ⚠ 머리줄이 붙어 있지 않은 동안에는 건드리지 않는다. 표를 벗어난 곳에서
          탭이 사라지면 어느 서비스를 보고 있는지 알 길이 없다 */
    var lastY = window.pageYOffset || 0, waiting = false;
    function tabsFollow(){
      var y = window.pageYOffset || 0;
      if(typing){ document.body.classList.remove('tabs-away'); lastY = y; return; }
      /* 보는 눈이 꺼져 있는 동안(탭을 막 옮겨 A 패널이 숨은 직후)에는 is-stuck 이
         지난 탭의 값으로 남아 있을 수 있다 — 여기서도 한 번 더 묻는다 */
      if(!head || !headLive() || !head.classList.contains('is-stuck')){
        document.body.classList.remove('tabs-away');
        /* 그려지지 않는 동안 is-stuck 이 지난 탭의 값으로 남으면, 클래스가
           사실과 다른 말을 하게 된다 — 읽는 쪽이 늘어날수록 비싸지는 거짓말이다 */
        if(head && !headLive()){ head.classList.remove('is-stuck'); nowCat(); }
        lastY = y; return;
      }
      /* 몇 px 짜리 떨림으로 띠가 깜빡이지 않게 문턱을 둔다 */
      if(Math.abs(y - lastY) < 8) return;
      document.body.classList.toggle('tabs-away', y > lastY);
      lastY = y;
    }
    window.addEventListener('scroll', function(){
      if(waiting) return;
      waiting = true;
      window.requestAnimationFrame(function(){ waiting = false; tabsFollow(); nowCat(); });
    }, { passive: true });
    /* 키보드로 탭에 닿으면 숨은 채로 초점만 가 있는 일이 없게 돌려놓는다 */
    var tabsBar = $('.es-tabs');
    if(tabsBar) tabsBar.addEventListener('focusin', function(){
      document.body.classList.remove('tabs-away');
    });

    measure();
    window.addEventListener('resize', measure);
    if(document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

    tabs.forEach(function(t){
      t.addEventListener('click', function(){ show(t.dataset.type, true); });
    });

    /* ?type=face 로 들어오면 고른 탭이 화면 밖에 잘려 있을 수 있다 — 끌어다 보여 준다 */
    function revealActive(){
      var on = $('.es-tab.is-active');
      if(on && tabsRow && tabsRow.scrollWidth > tabsRow.clientWidth + 1){
        var e = spot(on);
        if(e.l < tabsRow.scrollLeft) tabsRow.scrollLeft = Math.max(0, e.l - 12);
        else if(e.r > tabsRow.scrollLeft + tabsRow.clientWidth) tabsRow.scrollLeft = e.r - tabsRow.clientWidth + 12;
      }
      edges();
    }

    /* 신청 버튼은 앵커로 내려가는 일만 브라우저에 맡기고, 유형은 여기서 맞춘다 —
       고른 것을 폼에서 또 고르게 두지 않는다 */
    $$('a[data-plan]').forEach(function(a){
      a.addEventListener('click', function(){ window.esSetPlan(a.dataset.plan); });
    });

    show((new URLSearchParams(location.search)).get('type') || 'program', false);
    revealActive();
  })();

  /* ── 줄 설명 물음표 ────────────────────────────────────────
     좁은 폭에서는 설명을 접고 이름만 세운다. 그래도 '이게 무슨 기능이냐'는
     물음은 남으므로, 이름 옆 물음표로 그 줄만 펴 본다.
     ⚠ 단추는 마크업이 아니라 여기서 만든다. 스물한 줄에 같은 조각을 손으로
        넣어 두면 줄을 더하거나 뺄 때마다 빠뜨릴 자리가 늘어난다 */
  /* 물음표는 디자인 시스템의 icon-help 글리프다(원 없는 물음표 하나). 그 위에
     원 면색을 깔아 배지로 세운다 — 글리프는 viewBox 한가운데(12,12)에 서 있고
     높이가 20.01 이라, 지름 24 원 안에서 12 가 되게 .5997 로 줄여 되맞춘다.
     원은 글자색의 20% 틴트다. 색 하나로 둘이 따라오고, 면이 바탕에 가깝게 앉아
     이름 옆에서 제 몫만 한다.
     ⚠ 스프라이트를 쓰지 않고 길을 적어 둔다. 이 화면들은 디자인 시스템을 싣지
        않아 <use href="#icon-help"> 가 가리킬 데가 없다 */
  var WHY = '<svg aria-hidden="true" viewBox="0 0 24 24">'
    + '<circle cx="12" cy="12" r="12" fill="currentColor" opacity=".2"/>'
    + '<path transform="translate(4.792 4.804) scale(.5997)" fill="currentColor" d="M13 18.0C13.6 18.0 14 18.4 14 19.0V21.0C14 21.6 13.6 22.0 13 22.0H11C10.4 22.0 10 21.6 10 21.0V19.0C10 18.4 10.4 18.0 11 18.0H13ZM11.7 2.0C14.3 1.9 17.3 2.9 18.4 6.0C18.9 7.5 18.8 8.8 18.2 10.0C17.6 11.0 16.7 11.8 15.9 12.3C15 12.8 14.2 13.1 13.6 13.4C13.5 13.4 13.5 13.4 13.5 13.4V16.5H10.5V12.5C10.5 12.1 10.7 11.7 10.8 11.6C10.9 11.4 11.1 11.3 11.2 11.2C11.3 11.1 11.5 11.0 11.6 10.9C11.9 10.8 12.2 10.7 12.4 10.6C13 10.3 13.7 10.1 14.3 9.7C14.9 9.3 15.3 8.9 15.6 8.5C15.7 8.2 15.8 7.7 15.6 7.0C15.1 5.6 13.7 4.9 11.8 5.0C10.9 5.0 10.1 5.2 9.4 5.5C8.8 5.9 8.5 6.2 8.4 6.5C8.3 6.9 8.3 7.2 8.4 7.4C8.4 7.7 8.6 7.9 8.8 8.2L6.2 9.8C6.1 9.6 5.7 9.0 5.5 8.3C5.3 7.5 5.2 6.6 5.6 5.5C6.0 4.3 7.0 3.4 8.1 2.9C9.2 2.3 10.5 2.0 11.7 2.0Z"/></svg>';
  $$('.es-row .task').forEach(function(task){
    var name = task.querySelector('b'), desc = task.querySelector('small');
    if(!name || !desc) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'es-why';
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', name.textContent.trim() + ' 설명 보기');
    btn.innerHTML = WHY;
    name.appendChild(btn);
    btn.addEventListener('click', function(){
      var on = task.classList.toggle('is-why');
      btn.setAttribute('aria-expanded', String(on));
    });
  });

  /* ── 묶음 여닫기 ───────────────────────────────────────────── */
  /* 제목 줄을 누르면 그 묶음만 접힌다. 접는 자리는 .es-cat 하나이고, 줄은
     CSS 가 숨긴다 — 자바스크립트가 줄마다 손대면 서른한 번 건드리게 된다.
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
