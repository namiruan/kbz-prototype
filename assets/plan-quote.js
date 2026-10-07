/* ================================================================
   plan-quote.js — 김반장 3.0 · 프리미엄 견적신청.

   단말기 두 화면(quote.html · face-quote.html)과 흐름이 같다. 다른 것은 하나뿐:
   그 둘은 요율표가 있어 그 자리에서 금액을 계산하지만, 이 화면은 금액을 적지
   않는다. 사업장 규모로 갈리는 산식이 여기에 없기 때문이다. 요약 자리는 숫자
   대신 넣은 값을 되비친다.

   ⚠ 산식이 들어오면 recap() 을 금액 줄로 바꾸면 된다. 검증·제출·완료는 그대로다.

   주소로 받는 것
     ?plan=c30|prem   계약 유형을 그 자리에서 시작한다(견적받기 화면의 체크리스트가 쓴다)
     ?done=1 ?hold=1  단말기 견적과 같은 자리표 — 화면 하나 보자고 폼을 매번 채우지 않는다
   ================================================================ */
(function(){
  'use strict';

  var $  = function(s,r){ return (r||document).querySelector(s); };
  var $$ = function(s,r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); };

  /* 견적서 발송 API. 비어 있으면(프로토타입) 실제 전송 없이 완료 화면만 띄운다 */
  var QUOTE_API = '';

  var form      = $('#quoteForm');
  var btnSubmit = $('#btnSubmit');

  /* ── 김반장 3.0 구간별 요금 ───────────────────────────────────
     건설공사실적(또는 매출액)이 구간을 정하고, 구간이 월정액을 정한다.
     연납은 월정액 × 12 에서 5% 를 뺀다.

     ⚠ 받은 요금표의 4구간 할인가가 117만원으로 적혀 있는데, 다른 아홉 구간이
        모두 따르는 규칙(월정액 × 12 × 0.95)으로는 171만원이다. 자릿수가 뒤집힌
        것으로 보여 월정액을 원본으로 삼아 계산한다 — 구간끼리 어긋나지 않게.
        표가 맞다면 TIERS 의 4구간에 year 를 따로 박으면 된다.
     ⚠ 10구간(4000억) 위로는 표가 없다. 지어내지 않고 '담당자가 산정'으로 넘긴다. */
  var EOK = 100000000;                      /* 1억 (원) */
  var MAN = 10000;                          /* 칸이 받는 단위 — 만 원 */
  var TIERS = [
    { n: 1,  max:   15, month:  50000 },
    { n: 2,  max:   30, month:  80000 },
    { n: 3,  max:   50, month: 100000 },
    { n: 4,  max:  100, month: 150000 },
    { n: 5,  max:  300, month: 200000 },
    { n: 6,  max:  600, month: 300000 },
    { n: 7,  max:  900, month: 400000 },
    { n: 8,  max: 1200, month: 500000 },
    { n: 9,  max: 2000, month: 600000 },
    { n: 10, max: 4000, month: 800000 }
  ];
  var YEAR_OFF = 0.05;                      /* 연납 할인 */

  function tierFor(sales){
    if(!(sales > 0)) return null;
    var eok = sales / EOK;
    for(var i = 0; i < TIERS.length; i++) if(eok < TIERS[i].max) return TIERS[i];
    return 'over';                          /* 4000억 이상 — 표 밖이다 */
  }
  function yearly(month){ return Math.round(month * 12 * (1 - YEAR_OFF)); }


  /* ── 번호 ────────────────────────────────────────────────────
     ⚠ 아래 셋은 quote.html 안에 있는 것과 글자까지 같다. 저 화면들이 제 <script>
        안에 들고 있어 가져다 쓸 수 없어 옮겨 적었다. 셋 다 고칠 일이 생기면
        quote.html · face-quote.html 과 같이 고쳐야 한다 — 합치려면 format.js 로
        옮기는 것이 맞고, 그때 세 화면을 함께 바꾸면 된다 */
  var digits = kbzFormat.digits;
  function formatBizNo(v){
    var d = digits(v).slice(0,10);
    if(d.length > 5) return d.slice(0,3)+' - '+d.slice(3,5)+' - '+d.slice(5);
    if(d.length > 3) return d.slice(0,3)+' - '+d.slice(3);
    return d;
  }
  function validPhone(v){
    var d = digits(v);
    return /^0\d{8,10}$/.test(d) || /^1\d{7}$/.test(d);
  }
  function validBizNo(v){
    var d = digits(v);
    if(d.length !== 10) return false;
    if(/^0+$/.test(d)) return false;      /* 검증식만 보면 0000000000도 통과한다 */
    var w = [1,3,7,1,3,7,1,3,5], sum = 0;
    for(var i = 0; i < 9; i++) sum += parseInt(d.charAt(i),10) * w[i];
    sum += Math.floor(parseInt(d.charAt(8),10) * 5 / 10);
    return (10 - sum % 10) % 10 === parseInt(d.charAt(9),10);
  }

  /* ── 유형 ─────────────────────────────────────────────────── */
  function plan(){
    var on = $('input[name=plan]:checked');
    return on ? on.value : 'c30';
  }
  /* 고른 주기가 총액의 단위를 정한다. 둘을 한 화면에 같이 띄워 두면 어느 쪽이
     내 금액인지 흐려지므로, 한 번에 하나만 세운다 */
  function yearly5(){ return $('input[name=pay_cycle]:checked').value === 'year'; }

  /* 프리미엄에서만 묻는 칸을 여닫는다. hidden 을 쓰는 까닭은 보조기술에도
     '없는 것'으로 넘어가야 하기 때문이다 — 묻지도 않는 칸을 읽어 주면 안 된다.
     숨길 때 required 도 같이 거둔다. 안 그러면 보이지 않는 칸 때문에 막힌다 */
  function syncPlan(){
    var prem = plan() === 'prem';
    $$('.prem-only').forEach(function(el){ el.hidden = !prem; });
    var sitesY = $('#q-sites-y');
    if(sitesY) prem ? sitesY.setAttribute('required','') : sitesY.removeAttribute('required');
    render();
  }

  /* ── 요약 ──────────────────────────────────────────────────────
     퇴직공제 전자카드 견적과 같은 짜임이다 — 할인 블록 → 접히는 총액 →
     펼치면 계산 내역. 다른 것은 총액 자리에 서는 숫자뿐: 저쪽은 확정 금액이고
     이쪽은 '최소 얼마부터'다. 구간 요금은 정해져 있지만 실제 청구에는 계약
     조건과 그때의 정책이 더 붙어, 여기서 끝까지 계산해 버리면 받아 본 견적서와
     어긋난다 — 그 어긋남이 신뢰를 깎는다. */
  function money(v){ return Number(v).toLocaleString('ko-KR') + '원'; }
  /* 만 단위로 넣은 수를 사람이 말하는 단위로 되읽는다 — 700000 → '70억 원',
     12345 → '1억 2,345만 원'. 자릿수를 세지 않고도 맞게 넣었는지 보이게 */
  function readMan(man){
    if(!(man > 0)) return '';
    var eok = Math.floor(man / 10000), rest = man % 10000, s = '';
    if(eok)  s += eok.toLocaleString('ko-KR') + '억';
    if(rest) s += (s ? ' ' : '') + rest.toLocaleString('ko-KR') + '만';
    return s + ' 원';
  }
  /* 단말기 두 견적과 같은 세 칸이다 — 무엇(nm) · 어떻게 나온 금액인지(qty) ·
     얼마(amt). 면제된 줄은 지우지 않고 '무료'로 남긴다. 원래 얼마짜리인지
     옆에 서 있어야 아낀 것이 보인다 — 안면인식 견적의 설치비가 쓰는 방식이다 */
  function line(nm, how, amt, free){
    return '<div class="q-sum-line"><span class="nm">' + nm + '</span>'
         + '<span class="qty">' + (how || '') + '</span>'
         + '<span class="amt' + (free ? ' free' : '') + '">'
         + (free ? '무료' : amt) + '</span></div>';
  }

  function render(){
    var prem  = plan() === 'prem';
    /* 칸은 만 원으로 받고, 구간은 원으로 가른다 — 요금표가 억 단위라 바꿔 둔다 */
    var sales = Number(String($('#q-sales').value||'').replace(/[^0-9]/g,'')) * MAN;
    var t     = tierFor(sales);
    var disc  = $('#sumDisc'), fold = $('#sumMid'), save = $('#sumSave');
    var total = $('#sumTotal'), basis = $('#sumBasis'), items = $('#sumItems');

    var year = yearly5();

    /* ① 총액 자리 — 고른 주기의 단위로 적는다 */
    total.classList.remove('none');
    if(!t){
      total.textContent = '—';
      basis.textContent = '연 매출액을 넣으시면 보여 드립니다';
    }else if(t === 'over'){
      total.textContent = '담당자 산정';
      total.classList.add('none');
      basis.textContent = '4000억 이상은 요금표에 없습니다';
    }else{
      /* 끝의 물결은 '여기서부터 올라간다'는 표시다. 말로 적으면 금액 뒤에 설명이
         한 덩이 더 붙은 꼴이라, 기호 하나로 줄여 숫자에 붙인다 */
      total.innerHTML = (year ? '연 ' + money(yearly(t.month)) : '월 ' + money(t.month))
                      + '<small>~</small>';
      /* 몇 구간인지는 적지 않는다. 구간 번호도 매출 범위도 안에서 쓰는 가름이지,
         고르는 사람이 알아야 할 것은 '얼마부터'다. 프리미엄만 한 줄이 남는데,
         바로 위에 '3.0 할인 100%'가 서 있어 '3.0 요금 기준'이라고 적으면
         깎인다던 것이 기준이 되는 꼴이다. 그래서 기준 대신 포함을 적는다 */
      basis.textContent = prem ? '김반장 3.0 이용료 포함' : '';
    }

    /* ② 할인 블록 — 깎이는 것이 둘이고 뜨는 조건이 다르다.
       3.0 할인은 프리미엄을 고르면 붙는다. 프리미엄은 3.0 전 기능을 그대로
       쓰면서 3.0 이용료를 따로 내지 않으니, 그 몫이 100% 깎인 셈이다.
       연납 할인은 주기를 바꿔야 붙는다 — 월납인데 '할인 전'을 띄우면 깎이지도
       않은 금액이 깎인 것처럼 읽힌다. '할인 전'은 그래서 연납 줄에만 따라붙는다 */
    var okAmt    = t && t !== 'over';
    var showPrem = okAmt && prem;
    var showYear = okAmt && year;
    $('#sumPrem').hidden    = !showPrem;
    $('#sumYear').hidden    = !showYear;
    $('#sumWasRow').hidden  = !showYear;
    disc.classList.toggle('on', !!(showPrem || showYear));
    if(showYear){
      $('#sumWas').textContent = money(t.month * 12);
    }

    /* ②-b 월납을 고른 사람에게만 — 바꾸면 얼마가 남는지. 고른 뒤에 알려 봐야 늦다.
       할인 블록에는 비율만 남겼으니, 돈으로 옮긴 말은 여기 한 곳에서만 한다 */
    var showSave = t && t !== 'over' && !year;
    save.hidden = !showSave;
    if(showSave){
      save.innerHTML = '연납 시 <b>'
        + money(t.month * 12 - yearly(t.month)) + '</b> 절약!';
    }

    /* ③ 펼친 내역 — 금액이 어떻게 나왔는지 */
    var body = '';
    if(t && t !== 'over'){
      /* 줄은 주기와 무관하게 월정액으로 적는다 — 단말기 견적도 소계는 월 단위로
         적고 총액만 계약 기간치다. 깎는 몫도 여기 적지 않는다. 바로 위 할인
         블록이 '연납 할인 5% · 할인 전'으로 이미 말하고 있어, 같은 뺄셈을 두 번
         적게 된다 */
      var mo = money(t.month);
      if(prem){
        body += line('프리미엄 이용료', '월정액', mo);
        /* 프리미엄을 골라도 3.0 줄을 지우지 않는다. 따로 계약했다면 얼마였는지가
           옆에 서 있어야 '포함'이 말이 아니라 돈으로 읽힌다 */
        body += line('김반장 3.0 이용료', '월 ' + mo, '', true);
        body += '<p class="pq-add">신고 대행 범위(현장 수 · 인원 수 · 대행 항목)에 따라 더해집니다.</p>';
      }else{
        body += line('김반장 3.0 이용료', '월정액', mo);
      }
    }

    items.innerHTML = body;
    /* 넣은 값은 되비치지 않는다 — 바로 왼쪽 폼에 그대로 적혀 있어, 옮겨 적으면
       같은 말을 두 번 하는 셈이다. 그래서 펼칠 것은 금액이 어떻게 나왔는지뿐이고,
       금액이 서지 않았으면 펼칠 것도 없으니 토글을 끈다 — 눌러도 허탕이다 */
    fold.classList.toggle('no-detail', !(t && t !== 'over'));
  }

  /* ── 오류 표시 — 단말기 견적과 같은 부품이다 ─────────────────── */
  var errSeq = 0;
  function clearErrs(){
    $$('.field.is-err').forEach(function(f){ f.classList.remove('is-err'); });
    $$('[aria-invalid]').forEach(function(i){
      i.removeAttribute('aria-invalid');
      if(i.dataset.describedby){ i.setAttribute('aria-describedby', i.dataset.describedby); delete i.dataset.describedby; }
      else i.removeAttribute('aria-describedby');
    });
    $$('.f-msg').forEach(function(m){ m.remove(); });
    $('.q-agree').classList.remove('is-err');
  }
  function say(anchor, msg){
    if(!anchor) return null;
    if(anchor.parentNode && anchor.parentNode.classList.contains('rw-sel')) anchor = anchor.parentNode;
    var box = document.createElement('div');
    box.className = 'f-msg';
    var p = document.createElement('p');
    p.className = 'note danger';
    p.id = 'ferr-' + (++errSeq);
    p.textContent = msg;
    box.appendChild(p);
    anchor.insertAdjacentElement('afterend', box);
    return p;
  }
  function fieldErr(el, msg){
    if(!el) return;
    var box = el.closest('.field');
    if(!box) return;
    box.classList.add('is-err');
    var m = say(box, msg);
    if(!m) return;
    el.setAttribute('aria-invalid','true');
    var prev = el.getAttribute('aria-describedby');
    if(prev) el.dataset.describedby = prev;
    el.setAttribute('aria-describedby', (prev ? prev+' ' : '') + m.id);
  }

  /* ── 검증 — 숨어 있는 칸은 묻지 않는다 ──────────────────────── */
  function validate(){
    var bad = 0;
    clearErrs();
    function need(sel, msg){
      var el = form.querySelector(sel);
      if(!el || el.closest('[hidden]')) return null;
      if(!String(el.value).trim()){ bad++; fieldErr(el, msg); return null; }
      return el;
    }
    need('#q-sales', '연 매출액을 입력해 주세요.');
    if(plan() === 'prem') need('#q-sites-y', '연 현장 수를 입력해 주세요.');

    var biz = need('#q-biz', '사업자등록번호를 입력해 주세요.');
    if(biz && !validBizNo(biz.value)){ bad++; fieldErr(biz, '사업자등록번호를 다시 확인해 주세요.'); }
    need('#q-company', '사업장명을 입력해 주세요.');
    need('#q-manager', '담당자명을 입력해 주세요.');
    var phone = need('#q-phone', '연락처를 입력해 주세요.');
    if(phone && !validPhone(phone.value)){ bad++; fieldErr(phone, '연락처를 다시 확인해 주세요.'); }
    var email = need('#q-email', '이메일을 입력해 주세요.');
    if(email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())){
      bad++; fieldErr(email, '이메일 형식을 확인해 주세요.');
    }
    if(!$('#agree').checked){
      bad++;
      /* 체크 표시와 글자가 빨개지므로 따로 적지 않는다 — 단말기 견적과 같은 자리다 */
      $('#agree').setAttribute('aria-invalid','true');
      $('.q-agree').classList.add('is-err');
    }
    return bad;
  }

  /* ── 제출 ─────────────────────────────────────────────────── */
  function receiptNo(){
    var d = new Date(), p = function(n){ return String(n).padStart(2,'0'); };
    return 'P' + d.getFullYear() + p(d.getMonth()+1) + p(d.getDate()) + '-'
         + String(Math.floor(Math.random()*9000)+1000);
  }
  function done(){
    document.body.classList.add('is-done');
    /* 보낸 뒤에는 폼도 요약도 볼 일이 없다 — 단말기 견적 두 화면과 같다.
       이 둘을 빠뜨리면 완료 화면인데 아래로 폼이 그대로 남는다 */
    form.hidden = true;
    $('#sumPane').style.display = 'none';
    $('#doneEmail').textContent = $('#q-email').value.trim() || '—';
    $('#doneCard').classList.add('on');
    $('#heroLine').textContent = '예상 견적서가 전송됐어요!';
    $('#heroLine').classList.add('sent');
    btnSubmit.disabled = false;
    btnSubmit.textContent = '견적신청하기';
  }

  form.addEventListener('submit', function(e){
    e.preventDefault();
    if(validate()){
      var first = form.querySelector('.field.is-err input');
      var target = first ? (first.closest('.f-item') || first) : $('.q-agree');
      if(target) target.scrollIntoView({ behavior:'smooth', block:'center' });
      if(first) first.focus({ preventScroll:true });
      return;
    }
    var fd = new FormData(form);
    var payload = { receipt_no:receiptNo(), requested_at:new Date().toISOString(), plan:plan() };
    fd.forEach(function(v,k){ payload[k] = v; });

    btnSubmit.disabled = true;
    btnSubmit.textContent = '전송 중…';
    if(!QUOTE_API){
      /* ?hold=1 — '전송 중'에서 멈춰 세운다. 0.6초면 지나가 버리는 화면이다 */
      if(!/(^|[?&])hold=1(&|$)/.test(location.search)) setTimeout(done, 600);
      return;
    }
    fetch(QUOTE_API, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) })
      .then(done)
      .catch(function(){ btnSubmit.disabled = false; btnSubmit.textContent = '견적신청하기'; });
  });

  /* ── 다시 신청하기 ───────────────────────────────────────────── */
  $('#btnAgain').addEventListener('click', function(){
    document.body.classList.remove('is-done');
    form.hidden = false;
    $('#sumPane').style.display = '';
    $('#doneCard').classList.remove('on');
    $('#heroLine').textContent = '맞춤 견적을 받아보세요';
    $('#heroLine').classList.remove('sent');
    form.reset();
    moneySyncs.forEach(function(f){ f(); });
    clearErrs();
    syncPlan();
    window.scrollTo({ top:0, behavior:'smooth' });
  });

  /* 틀 안에서 열렸으면 '메인으로'가 아니라 '닫기'다 — 단말기 견적과 같은 규칙 */
  if(window.self !== window.top){
    var home = $('#btnHome');
    if(home){ home.textContent = '닫기'; home.removeAttribute('href'); }
  }

  /* ── 개인정보 모달 ───────────────────────────────────────────── */
  var dlg = $('#privacyModal');
  if(dlg && dlg.showModal){
    $('#privacyOpen').addEventListener('click', function(){ dlg.showModal(); });
    $$('[data-close]', dlg).forEach(function(b){ b.addEventListener('click', function(){ dlg.close(); }); });
    $('#agreeFromModal').addEventListener('click', function(){
      $('#agree').checked = true;
      $('#agree').dispatchEvent(new Event('change', { bubbles:true }));
      dlg.close();
    });
  }

  /* ── 손잡이 ──────────────────────────────────────────────────── */
  $$('input[name=plan]').forEach(function(r){ r.addEventListener('change', syncPlan); });
  $$('input[name=pay_cycle]').forEach(function(r){ r.addEventListener('change', render); });
  form.addEventListener('input', render);
  form.addEventListener('change', render);
  /* 금액 칸은 치는 대로 세 자리마다 쉼표가 붙는다 — 0이 몇 개인지 세지 않게 */
  /* reset() 은 input 을 쏘지 않아 되읽는 줄이 남는다 — 다시 신청할 때 같이 턴다 */
  var moneySyncs = [];
  [['#q-sales','#salesEcho'], ['#q-labor','#laborEcho']].forEach(function(pair){
    var el = $(pair[0]), echo = $(pair[1]);
    if(!el) return;
    var sync = function(){
      var n = el.value.replace(/[^0-9]/g,'');
      el.value = n ? Number(n).toLocaleString('ko-KR') : '';
      if(echo){
        var tx = readMan(Number(n));
        echo.textContent = tx;
        echo.hidden = !tx;
      }
    };
    el.addEventListener('input', sync);
    moneySyncs.push(sync);
    sync();
  });
  /* 번호 칸은 숫자만 받고 하이픈을 저절로 넣는다 — assets/format.js */
  kbzFormat.bind($('#q-biz'), formatBizNo);
  kbzFormat.bind($('#q-phone'), kbzFormat.phone);

  /* ── 주소로 받은 상태 ────────────────────────────────────────── */
  var qs = new URLSearchParams(location.search);
  var want = qs.get('plan');
  if(want === 'prem' || want === 'c30'){
    var r = $('input[name=plan][value="'+want+'"]');
    if(r) r.checked = true;
  }
  syncPlan();

  /* ── 프로토타입 미리보기 — 실제 연동 시 이 블록을 지운다 ───────── */
  if(/(^|[?&])(done|hold)=1(&|$)/.test(location.search)){
    var set = function(sel,v){
      var el = $(sel); if(!el) return;
      el.value = v;
      el.dispatchEvent(new Event('input',{bubbles:true}));
      el.dispatchEvent(new Event('change',{bubbles:true}));
    };
    set('#q-sales','300,000');
    if(plan() === 'prem'){ set('#q-labor','90,000'); set('#q-sites-y','12'); set('#q-sites-m','4'); set('#q-head','18'); }
    set('#q-biz','220 - 81 - 62517');
    set('#q-company','한강건설(주)');
    set('#q-manager','김현장');
    set('#q-phone','010-1234-5678');
    set('#q-email','test@example.com');
    $('#agree').checked = true;
    btnSubmit.click();
  }
})();
