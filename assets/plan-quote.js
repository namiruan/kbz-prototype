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
  var EOK = 100000000;                      /* 1억 */
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

  /* ── 요약 — 넣은 값을 되비친다 ───────────────────────────────── */
  function won(v){
    var n = String(v||'').replace(/[^0-9]/g,'');
    return n ? Number(n).toLocaleString('ko-KR') + '원' : '';
  }
  function num(v, unit){
    var n = String(v||'').replace(/[^0-9]/g,'');
    return n ? Number(n).toLocaleString('ko-KR') + unit : '';
  }
  /* ── 요약 ──────────────────────────────────────────────────────
     퇴직공제 전자카드 견적과 같은 짜임이다 — 할인 블록 → 접히는 총액 →
     펼치면 계산 내역. 다른 것은 총액 자리에 서는 숫자뿐: 저쪽은 확정 금액이고
     이쪽은 '최소 얼마부터'다. 구간 요금은 정해져 있지만 실제 청구에는 계약
     조건과 그때의 정책이 더 붙어, 여기서 끝까지 계산해 버리면 받아 본 견적서와
     어긋난다 — 그 어긋남이 신뢰를 깎는다. */
  function money(v){ return Number(v).toLocaleString('ko-KR') + '원'; }
  function num(v, unit){
    var n = String(v||'').replace(/[^0-9]/g,'');
    return n ? Number(n).toLocaleString('ko-KR') + unit : '';
  }
  function line(nm, amt){
    return '<div class="q-sum-line"><span class="nm">' + nm + '</span>'
         + '<span class="amt">' + amt + '</span></div>';
  }

  function render(){
    var prem  = plan() === 'prem';
    var sales = Number(String($('#q-sales').value||'').replace(/[^0-9]/g,''));
    var t     = tierFor(sales);
    var disc  = $('#sumDisc'), fold = $('#sumMid');
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
      total.innerHTML = (year ? '연 ' + money(yearly(t.month)) : '월 ' + money(t.month))
                      + '<small>부터</small>';
      /* 몇 구간인지는 적지 않는다. 구간 번호도 매출 범위도 안에서 쓰는 가름이지,
         고르는 사람이 알아야 할 것은 '얼마부터'다. 프리미엄만 이 금액이 무엇의
         금액인지 밝혀야 해서 한 줄이 남는다 */
      basis.textContent = prem ? '김반장 3.0 요금 기준' : '';
    }

    /* ② 할인 블록 — 연납을 골랐을 때만. 할인이 붙지 않는데 '할인 전'을 띄우면
       깎인 것처럼 읽힌다. 프리미엄에도 띄우는 까닭은 여기 선 숫자가 3.0 요금이고,
       그 5% 는 3.0 요금표에 적힌 것이기 때문이다 */
    var showDisc = t && t !== 'over' && year;
    disc.classList.toggle('on', !!showDisc);
    if(showDisc) $('#sumWas').textContent = money(t.month * 12);

    /* ③ 펼친 내역 — 금액이 어떻게 나왔는지, 그리고 넣으신 값 */
    var body = '';
    if(t && t !== 'over'){
      /* 고르지 않은 쪽도 함께 적는다 — 바꿔 보지 않고도 얼마가 차이 나는지 보이게 */
      body += line('월정액', money(t.month));
      body += line('연납 <small>5% 할인</small>', money(yearly(t.month)));
      if(prem) body += '<p class="pq-add">프리미엄은 이 금액을 포함하고, 신고 대행 범위(현장 수 · 인원 수 · 대행 항목)에 따라 더해집니다.</p>';
    }

    var rows = [['연 매출액', sales ? money(sales) : '']];
    if(prem){
      rows.push(['연 노무비',      num($('#q-labor').value, '원')]);
      rows.push(['연 현장 수',     num($('#q-sites-y').value, '곳')]);
      rows.push(['월평균 현장 수', num($('#q-sites-m').value, '곳')]);
      rows.push(['현장당 인원',    num($('#q-head').value, '명')]);
      ['use_license','use_kiscon','use_regular'].forEach(function(n,i){
        var on = $('input[name='+n+']:checked');
        if(on && on.value === 'Y') rows.push([['종합면허','키스콘','상용근로자 관리'][i], '사용']);
      });
    }
    rows = rows.filter(function(r){ return r[1]; });
    body += '<div class="pq-recap-h">넣으신 값</div>';
    body += rows.length
      ? rows.map(function(r){ return line(r[0], r[1]); }).join('')
      : '<p class="pq-none">사업장 규모를 넣으시면 여기에 다시 보여 드립니다.</p>';

    items.innerHTML = body;
    /* 펼칠 것이 '넣으신 값' 안내 한 줄뿐이면 토글을 끈다 — 눌러도 허탕이다 */
    fold.classList.toggle('no-detail', !t || t === 'over' ? !rows.length : false);
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
  ['#q-sales','#q-labor'].forEach(function(sel){
    var el = $(sel);
    if(el) el.addEventListener('input', function(){
      var n = el.value.replace(/[^0-9]/g,'');
      el.value = n ? Number(n).toLocaleString('ko-KR') : '';
    });
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
    set('#q-sales','3,000,000,000');
    if(plan() === 'prem'){ set('#q-labor','900,000,000'); set('#q-sites-y','12'); set('#q-sites-m','4'); set('#q-head','18'); }
    set('#q-biz','220 - 81 - 62517');
    set('#q-company','한강건설(주)');
    set('#q-manager','김현장');
    set('#q-phone','010-1234-5678');
    set('#q-email','test@example.com');
    $('#agree').checked = true;
    btnSubmit.click();
  }
})();
