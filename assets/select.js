/* ================================================================
   select.js — 고르는 칸. 네 화면이 한 벌을 나눠 쓴다(select.css 와 한 쌍).

   쓰는 법: 칸을 감싼 상자(.f-in 또는 .field) 안의 <select> 를 넘긴다.
       document.querySelectorAll('.field select').forEach(kbzSelect);
   콤보박스로 열려면 그 select 에 data-combo 를 달아 둔다.

   값은 어느 쪽이든 **원래 select 가 그대로 들고 있다** — 그래서 폼 전송·검사·
   저장·복원 쪽 코드는 이 부품을 몰라도 된다.
   ================================================================ */
(function(){
'use strict';
var $ =function(s,r){return (r||document).querySelector(s);};
var $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));};
/* 칸을 감싼 상자의 이름 — 이용후기는 .f-in, 견적은 .field 로 부른다 */
var BOX='.f-in,.field';

/* =========================================================
   고르는 칸 — 네이티브 목록은 OS 가 그려서 칸 위로 겹쳐 뜨고 색도 OS 를 따른다.
   그래서 목록은 직접 그리되, 칸의 성격에 따라 두 가지로 연다.

   · 콤보박스(data-combo) — 계약 현장·업종명처럼 사람이 답을 미리 떠올릴 수
     있는 칸. 트리거가 곧 검색창이라 바로 쳐서 좁힌다.
     (김반장 3.0 · components/molecules/combobox.md)
   · 드롭다운 — 만족도·기능처럼 어떤 말이 있는지 겪어 보지 않은 칸.
     칠 말을 떠올릴 수 없는데 검색창을 내밀면 빈 칸 앞에서 멈춘다.
     목록을 펼쳐 읽고 고르게 둔다.

   값은 어느 쪽이든 원래 select 가 그대로 들고 있으므로 저장·복원·검사는
   손대지 않는다.
   ========================================================= */
var SEL_OPEN=null, SEL_UID=0;
function selClose(){
  if(!SEL_OPEN) return;
  var w=SEL_OPEN; SEL_OPEN=null;
  w.removeAttribute('data-open');
  $('.sel-pop',w).hidden=true;
  w.__aria.setAttribute('aria-expanded','false');
  if(w.__sync) w.__sync();
}
function selOpen(wrap){
  if(SEL_OPEN===wrap) return;
  selClose();
  SEL_OPEN=wrap;
  wrap.setAttribute('data-open','');
  $('.sel-pop',wrap).hidden=false;
  wrap.__aria.setAttribute('aria-expanded','true');
  if(wrap.__open) wrap.__open();
}
function enhanceSelect(sel){
  /* 두 번 걸어도 한 번만 — 줄이 늘어나는 화면에서는 같은 칸을 다시 만날 수 있다 */
  if(sel.dataset.kbz) return;
  sel.dataset.kbz='1';
  var COMBO = sel.dataset.combo!=null;
  var box=sel.closest(BOX), wrap=document.createElement('div');
  wrap.className='rw-sel';
  box.parentNode.insertBefore(wrap, box);
  wrap.appendChild(box);

  var pid='sel-pop-'+(++SEL_UID);
  var lb=document.querySelector('label[for="'+sel.id+'"]');
  var inp=null, txt=null, aria;
  if(COMBO){
    inp=document.createElement('input');
    inp.type='text'; inp.className='sel-in'; inp.autocomplete='off'; inp.id=sel.id+'-in';
    inp.setAttribute('role','combobox');
    inp.setAttribute('aria-haspopup','listbox');
    inp.setAttribute('aria-expanded','false');
    inp.setAttribute('aria-autocomplete','list');
    inp.setAttribute('aria-controls',pid);
    box.insertBefore(inp, sel.nextSibling);
    /* 라벨은 눈에 보이는 칸을 가리킨다 — 라벨을 눌러도 여기로 들어온다 */
    if(lb) lb.setAttribute('for', inp.id);
    var ph=$('option[disabled]',sel);
    inp.placeholder = sel.dataset.ph || (ph ? ph.textContent : '');
    /* 고른 값을 지우는 × — 값이 있을 때만 나온다 (규격의 combobox--has-value).
       쳐서 좁히다 처음부터 다시 보고 싶을 때 칸을 직접 비우지 않아도 된다 */
    var clr=document.createElement('button');
    clr.type='button'; clr.className='sel-clr'; clr.tabIndex=-1;
    clr.setAttribute('aria-label', (lb ? lb.textContent.trim() : '') + ' 지우기');
    clr.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    var caret=$('.caret,.f-caret',box);
    box.insertBefore(clr, caret || null);
    aria=inp;
  }else{
    txt=document.createElement('span'); txt.className='sel-txt';
    box.insertBefore(txt, sel.nextSibling);
    box.tabIndex=0;
    box.setAttribute('role','combobox');
    box.setAttribute('aria-haspopup','listbox');
    box.setAttribute('aria-expanded','false');
    box.setAttribute('aria-controls',pid);
    if(lb) box.setAttribute('aria-labelledby', lb.id || (lb.id='lb-'+sel.id));
    aria=box;
  }
  sel.tabIndex=-1; sel.setAttribute('aria-hidden','true');
  wrap.__aria=aria;

  var pop=document.createElement('ul'); pop.className='sel-pop'; pop.hidden=true;
  pop.id=pid; pop.setAttribute('role','listbox');
  var none=null;
  if(COMBO){
    /* 찾은 것이 없다는 말은 읽어 주는 쪽에도 넘긴다 */
    none=document.createElement('li'); none.className='sel-none';
    none.setAttribute('role','presentation'); none.setAttribute('aria-live','polite');
    none.textContent='검색 결과가 없습니다.'; none.hidden=true;
  }
  var order=[];                                  /* 처음 차례 — 되돌려 세울 때 쓴다 */
  /* select 의 option 을 그대로 옮겨 적는다. 목록이 통째로 바뀌는 칸(업종명)이
     있으므로 다시 부를 수 있게 함수로 둔다 */
  function build(){
    pop.innerHTML='';
    $$('option',sel).forEach(function(o,i){
      if(o.disabled) return;                     /* '고르세요' 는 목록에 넣지 않는다 */
      var li=document.createElement('li');
      li.setAttribute('role','option'); li.tabIndex=-1; li.dataset.i=i; li.textContent=o.textContent;
      pop.appendChild(li);
    });
    if(none) pop.appendChild(none);
    order=$$('li[role="option"]',pop);
  }
  build();
  wrap.appendChild(pop);

  function label(){ var o=sel.options[sel.selectedIndex]; return (o && !o.disabled) ? o.textContent : ''; }
  function sync(){
    if(COMBO) inp.value=label(); else txt.textContent=label();
    wrap.classList.toggle('is-ph', !sel.value);
    wrap.classList.toggle('has-val', !!sel.value);
    order.forEach(function(li){
      li.setAttribute('aria-selected', +li.dataset.i===sel.selectedIndex ? 'true':'false');
      li.classList.remove('on');
    });
  }
  function filter(k){
    k=(k||'').trim().toLowerCase();
    var hit=0;
    order.forEach(function(li){
      var on=!k || li.textContent.toLowerCase().indexOf(k)>=0;
      li.hidden=!on; if(on) hit++;
    });
    if(none) none.hidden = hit>0;
  }
  wrap.__sync=sync;
  wrap.__rebuild=function(){ build(); sync(); };
  wrap.__open=function(){
    if(!COMBO){
      var cur0=$('li[aria-selected="true"]',pop);
      if(cur0) cur0.scrollIntoView({block:'nearest'});
      return;
    }
    inp.value=''; wrap.classList.add('is-ph'); filter('');
    /* 고른 줄을 맨 위로 — 나머지는 처음 차례를 지킨다 */
    var cur=null;
    order.forEach(function(li){ if(li.getAttribute('aria-selected')==='true') cur=li; });
    if(cur) pop.insertBefore(cur, pop.firstChild);
    order.forEach(function(li){ if(li!==cur) pop.insertBefore(li, none); });
    pop.appendChild(none);
    pop.scrollTop=0;
  };
  function vis(){ return $$('li[role="option"]',pop).filter(function(l){ return !l.hidden; }); }
  function pick(li){
    sel.selectedIndex=+li.dataset.i;
    sel.dispatchEvent(new Event('change',{bubbles:true}));
    selClose();
    if(COMBO) inp.focus(); else box.focus();
  }

  sel.addEventListener('change',function(){ sync(); box.classList.remove('is-err'); });
  sync();

  if(COMBO){
    inp.addEventListener('focus',function(){ if(!sel.disabled) selOpen(wrap); });
    inp.addEventListener('blur',function(){ if(SEL_OPEN===wrap) selClose(); });
    inp.addEventListener('input',function(){
      if(SEL_OPEN!==wrap) selOpen(wrap);
      wrap.classList.remove('is-ph'); filter(inp.value);
    });
    /* 화살표나 칸의 빈 자리를 눌러도 열린다. 열린 채로 다시 누르면 닫는다.
       이미 포커스가 있는 칸을 다시 누르면 focus 가 오지 않으므로 여기서 직접 연다.
       × 는 제 일이 따로 있으니 여기서 가로채지 않는다 */
    box.addEventListener('mousedown',function(e){
      if(sel.disabled){ e.preventDefault(); return; }
      if(e.target.closest('.sel-clr')){ e.preventDefault(); return; }
      if(SEL_OPEN===wrap){ e.preventDefault(); selClose(); return; }
      if(e.target!==inp) e.preventDefault();
      inp.focus(); selOpen(wrap);
    });
    /* 지우면 고른 값이 없던 때로 돌아가고, 고르라는 뜻으로 목록을 연 채 둔다 */
    clr.addEventListener('click',function(){
      if(sel.disabled) return;
      sel.selectedIndex = ph ? ph.index : -1;
      sel.dispatchEvent(new Event('change',{bubbles:true}));
      inp.value=''; wrap.classList.add('is-ph'); filter('');
      inp.focus(); selOpen(wrap); wrap.__open();
    });
  }else{
    box.addEventListener('click',function(){
      if(sel.disabled) return;
      if(SEL_OPEN===wrap) selClose(); else selOpen(wrap);
    });
    box.addEventListener('keydown',function(e){
      if(e.key==='Enter'||e.key===' '||e.key==='ArrowDown'){ e.preventDefault(); selOpen(wrap); }
    });
  }
  /* blur 보다 먼저 고르기 위해 누름을 막는다 — 막지 않으면 목록이 닫힌 뒤에 클릭이 온다 */
  pop.addEventListener('mousedown',function(e){ e.preventDefault(); });
  pop.addEventListener('click',function(e){
    var li=e.target.closest('li');
    if(!li || li.getAttribute('role')!=='option') return;
    pick(li);
  });
  wrap.addEventListener('keydown',function(e){
    if(e.key==='Escape'){ if(SEL_OPEN===wrap){ e.preventDefault(); selClose(); aria.focus(); } return; }
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){
      e.preventDefault();
      if(SEL_OPEN!==wrap){ selOpen(wrap); return; }
      var ls=vis(); if(!ls.length) return;
      var cur=ls.indexOf($('li.on',pop));
      var n=(cur<0 ? (e.key==='ArrowDown'?0:ls.length-1)
                   : cur+(e.key==='ArrowDown'?1:-1)+ls.length)%ls.length;
      ls.forEach(function(l){ l.classList.remove('on'); });
      ls[n].classList.add('on'); ls[n].scrollIntoView({block:'nearest'});
    }else if(e.key==='Enter'){
      if(SEL_OPEN!==wrap) return;
      e.preventDefault();
      var on=$('li.on',pop) || vis()[0];
      if(on) pick(on); else selClose();
    }
  });
}

/* 밖을 누르면 닫는다 — 한 번만 달아 둔다 */
document.addEventListener('mousedown',function(e){ if(!e.target.closest('.rw-sel')) selClose(); });
window.kbzSelect=enhanceSelect;
})();
