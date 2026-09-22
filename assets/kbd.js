/* 화면 키보드 — assets/kbd.css 와 한 쌍이다. 자세한 글은 그 파일 머리말에 있다 */
(function(){
  'use strict';
  function editable(el){
    if(!el||el.disabled||el.readOnly) return false;
    if(el.tagName==='TEXTAREA') return true;
    if(el.tagName!=='INPUT') return false;
    return !/^(checkbox|radio|button|submit|reset|hidden|file|range|color)$/i
      .test(el.getAttribute('type')||'text');
  }

  function inModal(el){
    var m=el.closest('.rw-modal,.lg-modal');
    return !!(m && !m.hidden);
  }
  /* 누른 칸을 **맨 위로** 올린다 — 키보드가 아래를 먹으니 남는 자리를 전부 위에 준다.
     칸 하나가 아니라 라벨·버튼·안내 줄이 함께 있는 덩어리째 올린다: 무슨 칸인지,
     다음에 누를 것이 무엇인지가 같이 보여야 그 자리에서 손이 이어진다.
     모달은 스스로 남은 칸 가운데로 다시 서므로 건드리지 않는다 */
  function blockOf(el){
    var w=el.closest('.rw-withbtn')||el.closest('.f-in')||el, p=w.parentElement;
    return (p && p.querySelector('.rw-lb, label')) ? p : w;
  }
  function toTop(el){
    if(!el || inModal(el)) return;
    var d=Math.round(blockOf(el).getBoundingClientRect().top-12);
    if(d) window.scrollBy(0, d);
  }

  /* ── (1) 진짜 키보드 ──
     iOS·안드로이드는 키보드가 올라오면 visualViewport 를 그만큼 줄인다.
     가려진 높이가 손가락 하나보다 크고 칸에 들어있으면 키보드다.
     바닥에 붙은 것은 브라우저가 이미 키보드 위로 올려 주므로,
     자리를 다시 잡지 않고 막대만 내린다 */
  (function(){
    var vv=window.visualViewport;
    /* 손끝으로 쓰는 기기다 — 칸에 들어가면 키보드가 올라온다고 본다.
       **틀(iframe) 안에서는 visualViewport 가 줄지 않는다.** 키보드는 맨 바깥 창의 일이라
       안쪽 문서는 그 줄어듦을 못 본다 — 시나리오 브라우저로 열면 늘 이 경우다.
       그래서 이 기기에서는 가려진 높이를 묻지 않고 **칸에 들어갔는지**만 본다 */
    var coarse=window.matchMedia && window.matchMedia('(pointer:coarse)').matches;
    if(!coarse && !vv) return;
    function look(){
      /* 흉내 낸 판이 켜져 있으면 그쪽이 말한다 */
      if(document.body.classList.contains('kbd-on')) return;
      var up=editable(document.activeElement);
      if(up && !coarse){
        /* 마우스로 쓰는 기기에서는 화면이 실제로 줄어든 것만 키보드로 본다 */
        var hid=Math.round(window.innerHeight - vv.height - vv.offsetTop);
        up = vv.scale<=1.01 && hid>120;
      }
      document.body.classList.toggle('kbd-real', up);
      return up;
    }
    /* 키보드가 자리를 잡고 브라우저가 제 몫을 굴린 뒤라야 우리가 정한 자리가
       마지막으로 남는다. 이미 올라와 있을 때(칸에서 칸으로)는 기다릴 것이 없다 */
    function lift(el, wait){
      setTimeout(function(){
        if(document.activeElement===el && document.body.classList.contains('kbd-real')) toTop(el);
      }, wait);
    }
    if(vv){ vv.addEventListener('resize', look); vv.addEventListener('scroll', look); }
    document.addEventListener('focusin', function(e){
      var was=document.body.classList.contains('kbd-real');
      if(look() && editable(e.target)) lift(e.target, was?120:320);
    });
    document.addEventListener('focusout', function(){ setTimeout(look, 80); });
  })();

  /* ── (2) 흉내 낸 판 ──
     주소가 부르지 않으면 켜지 않는다 — 시나리오 브라우저(prototype.html)가 붙여 준다.
     화면을 직접 열어 보는 사람은 ?kbd=1 을 붙이면 된다 */
  var p=new URLSearchParams(location.search).get('kbd');
  var on=parseInt(p,10); if(!(on>0)) return;
  /* 진짜 키보드가 올라오는 기기에서는 켜지 않는다 — 두 개가 겹친다 */
  if(window.matchMedia && window.matchMedia('(pointer:coarse)').matches) return;

  var kbd=document.getElementById('kbd'), keys=document.getElementById('kbdKeys');
  /* 아이폰 세로 기준 실측값에 맞춘다 — 글자판은 자동완성 줄까지, 숫자판은 그보다 낮다 */
  var H={ko:319, num:254};
  if(on>1) H={ko:on, num:on};   /* ?kbd=<px> — 높이를 직접 준다 */

  var KO=[['ㅂ','ㅈ','ㄷ','ㄱ','ㅅ','ㅛ','ㅕ','ㅑ','ㅐ','ㅔ'],
          ['ㅁ','ㄴ','ㅇ','ㄹ','ㅎ','ㅗ','ㅓ','ㅏ','ㅣ'],
          ['⇧','ㅋ','ㅌ','ㅊ','ㅍ','ㅠ','ㅜ','ㅡ','⌫'],
          ['!#1','한/영','space','.','완료']];
  var NUM=[['1','2','3'],['4','5','6'],['7','8','9'],['완료','0','⌫']];

  function keyEl(t,kind){
    var b=document.createElement(t==='완료'?'button':'span'),
        fn=/^(⇧|⌫|!#1|한\/영|완료|space)$/.test(t);
    if(t==='완료'){ b.type='button'; b.dataset.k='done'; b.setAttribute('aria-label','키보드 내리기'); }
    else b.setAttribute('aria-hidden','true');
    b.className='kbd-k'+(fn?' fn':'')+(t==='space'?' sp':'')+(t===''?' blank':'')
      +((kind==='ko'&&(t==='⇧'||t==='⌫'))?' w15':'');
    b.textContent = t==='space' ? '' : t;
    return b;
  }
  function draw(kind){
    keys.className='kbd-keys'+(kind==='num'?' kbd-num':'');
    keys.textContent='';
    (kind==='num'?NUM:KO).forEach(function(r){
      var row=document.createElement('div'); row.className='kbd-row';
      r.forEach(function(t){ row.appendChild(keyEl(t,kind)); });
      keys.appendChild(row);
    });
  }

  var shown=false, kind='';
  function kindOf(el){
    var t=(el.getAttribute('type')||'').toLowerCase(),
        m=(el.getAttribute('inputmode')||'').toLowerCase();
    return (t==='tel'||t==='number'||m==='numeric'||m==='tel'||m==='decimal') ? 'num' : 'ko';
  }
  var typable=editable;
  /* 칸에 들어설 때 브라우저가 스스로 화면을 굴린다(html{scroll-behavior:smooth}).
     키보드가 올라오며 문서 높이가 바뀌는 순간과 겹치면 엉뚱한 데까지 흘러가므로,
     잠깐 자리를 붙들어 그 미끄러짐을 끊고 **우리가 정한 자리로만** 옮긴다 */
  function settleAt(y, el){
    var html=document.documentElement, prev=html.style.scrollBehavior;
    html.style.scrollBehavior='auto';
    var t=Date.now();
    (function step(){
      if(Math.round(window.scrollY)!==y) window.scrollTo(0,y);
      if(Date.now()-t<260) return requestAnimationFrame(step);
      toTop(el);
      /* 브라우저가 뒤늦게 한 번 더 굴리는 일이 있어 한 번 더 맞춘다 */
      setTimeout(function(){ if(shown && document.activeElement===el) toTop(el); }, 450);
      html.style.scrollBehavior=prev;
    })();
  }
  function show(el){
    var k=kindOf(el);
    var h=Math.min(H[k], Math.round(window.innerHeight*0.6));
    if(!shown || k!==kind){ kind=k; draw(k); }
    document.documentElement.style.setProperty('--kbd', h+'px');
    kbd.hidden=false; document.body.classList.add('kbd-on'); shown=true;
    tell(h);
    settleAt(Math.round(window.scrollY), el);
  }
  function hide(){
    if(!shown) return;
    shown=false; kbd.hidden=true;
    document.body.classList.remove('kbd-on');
    document.documentElement.style.setProperty('--kbd','0px');
    tell(0);
  }
  /* 높이와 남은 화면은 **크롬의 크기 표시줄**이 말한다 — 재는 자가 둘일 까닭이 없다.
     시나리오 브라우저가 이 말을 받아 그 줄 끝에 붙인다 */
  function tell(h){
    if(window.parent===window) return;
    try{ window.parent.postMessage({kbz:'kbd', h:h, rest:h?window.innerHeight-h:0}, '*'); }catch(e){}
  }

  /* 넓은 화면에서는 켜지 않는다 — 진짜 키보드가 화면을 먹는 건 모바일 폭의 일이다 */
  function mobile(){ return window.innerWidth<=500; }

  document.addEventListener('focusin', function(e){
    if(!mobile() || !typable(e.target)) { hide(); return; }
    show(e.target);
  });
  document.addEventListener('focusout', function(){
    setTimeout(function(){
      var a=document.activeElement;
      if(!mobile() || !typable(a)) hide();
    }, 0);
  });
  /* 키보드를 눌러도 칸의 포커스가 풀리지 않게 한다 — 풀리면 제가 저를 내린다 */
  kbd.addEventListener('mousedown', function(e){ e.preventDefault(); });
  /* 「완료」 로 내린다 — 진짜 자판에도 그 자리에 있다 */
  kbd.addEventListener('click', function(e){
    if(!e.target.closest('[data-k="done"]')) return;
    if(document.activeElement && document.activeElement.blur) document.activeElement.blur();
    hide();
  });
  window.addEventListener('resize', function(){
    if(!shown) return;
    if(!mobile()) return hide();
    show(document.activeElement);
  });
})();
