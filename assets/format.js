/* ================================================================
   format.js — 번호 칸에 숫자만 받고 하이픈을 저절로 넣는다.

   쓰는 법:
       kbzFormat.bind(document.getElementById('q-phone'), kbzFormat.phone);

   칸 아래 안내나 검사에는 손대지 않는다 — 값은 보이는 그대로 들고 있고,
   보낼 때 숫자만 뽑는 것은 부르는 쪽이 하던 대로 한다(kbzFormat.digits).
   ================================================================ */
(function(){
  'use strict';
  function digits(v){ return String(v==null?'':v).replace(/[^0-9]/g,''); }

  /* 번호의 마디는 앞자리가 정한다 — 한 규칙으로 밀면 02·15xx 가 망가진다.
       010-1234-5678   휴대폰은 3-4-4 로 굳힌다(치는 동안 마디가 안 바뀐다)
       02-123-4567     서울은 국번이 둘
       031-123-4567    그 밖의 지역번호는 3-3-4, 열한 자리면 3-4-4
       1588-1234       15·16·18 로 시작하는 대표번호는 4-4 뿐이다 */
  function phone(v){
    var d=digits(v).slice(0,11);
    if(/^1[5678]/.test(d)){ d=d.slice(0,8);
      return d.length>4 ? d.slice(0,4)+' - '+d.slice(4) : d; }
    if(/^01/.test(d)){
      return d.length>7 ? d.slice(0,3)+' - '+d.slice(3,7)+' - '+d.slice(7)
           : d.length>3 ? d.slice(0,3)+' - '+d.slice(3) : d; }
    if(d.indexOf('02')===0){ d=d.slice(0,10);
      if(d.length<=2) return d;
      if(d.length<=5) return d.slice(0,2)+' - '+d.slice(2);
      if(d.length<=9) return d.slice(0,2)+' - '+d.slice(2,5)+' - '+d.slice(5);
      return d.slice(0,2)+' - '+d.slice(2,6)+' - '+d.slice(6); }
    d=d.slice(0,11);
    if(d.length<=3) return d;
    if(d.length<=6) return d.slice(0,3)+' - '+d.slice(3);
    if(d.length<=10) return d.slice(0,3)+' - '+d.slice(3,6)+' - '+d.slice(6);
    return d.slice(0,3)+' - '+d.slice(3,7)+' - '+d.slice(7);
  }

  /* 치는 동안 서식을 입힌다. 끝에서 치던 중이면 커서를 끝에 붙여 두고,
     중간을 고치는 중이면 건드리지 않는다 — 커서가 튀면 고치다 말게 된다 */
  function bind(el, fn){
    if(!el || el.dataset.kbzFmt) return;
    el.dataset.kbzFmt='1';
    el.addEventListener('input', function(){
      var atEnd = el.selectionStart === el.value.length;
      var v = fn(el.value);
      if(v === el.value) return;
      el.value = v;
      if(atEnd) el.setSelectionRange(v.length, v.length);
    });
  }

  window.kbzFormat={ digits:digits, phone:phone, bind:bind };
})();
