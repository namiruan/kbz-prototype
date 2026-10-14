/* ================================================================
   estimate.js — 견적받기 화면이 하는 일은 넷뿐이다.

     1) 상단 3탭을 갈아 끼우고, 단말기 두 탭에 견적 화면을 끼운다 (?type=program·ecard·face)
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
    var narrow = window.matchMedia ? window.matchMedia('(max-width:640px)') : null;

    function floatSync(){
      /* ⚠ 접혀 있는 동안에는 붙이지 않는다. 접힘 상자는 overflow:hidden 으로
            답 바를 가려 두는데, position:fixed 는 그 클립을 빠져나간다.
            게다가 그 상자에 걸린 filter:blur() 가 fixed 의 기준 상자가 되어,
            화면 아래가 아니라 접힌 띠 안쪽 바닥에 흐릿한 카드로 갇혀 섰다.
            목록을 아직 펴지도 않은 사람에게 '해당하는 것을 골라 보세요'를
            내미는 꼴이라, 손잡이를 누르기 전에는 없는 것이 맞다 */
      if(!dock || !out || !list || !narrow || !narrow.matches || pick.hasAttribute('inert')){
        document.body.classList.remove('es-pick-float');
        if(dock) dock.style.minHeight = '';
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
      var on = seen && !home;
      document.body.classList.toggle('es-pick-float', on);
      dock.style.minHeight = on ? (out.offsetHeight + 'px') : '';
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
