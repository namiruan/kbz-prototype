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
  /* 보내는 동안에는 버튼 글자를 건드리지 않는다. 주기 세그먼트는 그동안에도
     눌리고, 그 한 번이 render() 를 돌려 '전송 중…'을 지워 버린다 */
  var sending = false;

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

  /* ── 업무범위 ───────────────────────────────────────────────────
     받은 것은 '견적 계산에 영향을 미치는 요소' 다섯 가지다. 전에는 안내문
     네 벌(계약 조합별)의 계약사항을 그대로 옮겼는데, 그쪽은 '무엇을 계약
     하는가' 의 차례였고 이쪽은 '무엇이 값을 움직이는가' 의 차례다.

     always : 계약하면 늘 들어온다. 버튼이 없다는 것이 '고르는 것이
            아니다' 를 말한다. 노무제공자·퇴직공제 업무대행은 지금 이용료
            에 닿지 않지만 계약하면 체크된다고 받았다 — 그래서 여기다.
     say  : 고르는 칸은 '~할 때' 로 맺는다 — 명사로 끊으면 하는 일을
            읊는 것이 되고, 읽는 사람은 '내가 이걸 골라야 하나' 를 스스로
            옮겨 생각해야 한다. ('…합니다' 로 늘이지는 않는다)
     ⚠ 금액은 적지 않는다. 이 화면은 예상견적서라 '이런 것들이 필요하다'
        를 체크하는 자리이고, 얼마가 되는지는 담당자 상담에서 정해진다.
        여기에 '+10%' 를 적어 두면 더해 보는 사람이 생기고, 그 합은
        상담에서 받는 금액과 어긋난다.

     ⚠ 상용근로자는 '신고만 10%' 와 '신고+고지서 20%' 두 층으로 받았다.
        층을 칸 둘로 쪼개 보았으나 한 업무가 둘로 보여 다시 한 칸으로
        합쳤다. 어느 층인지는 담당자 상담에서 가른다 — 여기는 '상용근로자
        신고가 필요한가' 만 묻는다.
     ⚠ 말은 안내문 원본에 맞춘다. '공단' 은 건강·연금공단·근로복지공단에만
        쓰고 퇴직공제에는 쓰지 않는다(건설근로자공제회 소관이다).
     ⚠ 노무제공자는 안내문의 '제공 서비스' 표에 낱낱 업무가 없다 —
        계약사항에 이름만 있다. 이름이 말하는 만큼만 적는다.
     ⚠ 늘 들어오는 셋의 설명은 한 줄에 드는 길이로 줄인다 — 여기는
        '무엇이 기본으로 들어오나' 를 한눈에 보는 자리이지 낱낱을 세는
        자리가 아니다. 낱낱은 상담에서 듣는다. 대신 '근로자 신고' 는
        남긴다: 빼면 기본이 현장 신고만 하는 것처럼 읽힌다. */
  var ROWS = [
    { id:'base',     nm:'기본', always:true,
      say:'4대보험·퇴직공제, 근로자 신고와 증명서 발급' },
    /* ⚠ 기본 아래 소목차로 들여써 봤으나 되돌렸다 — 둘 다 기본의 일부가
       아니라 계약사항에서 기본과 나란한 항목이다. 들여쓰면 기본에 딸려
       오는 것처럼 읽힌다 */
    { id:'worker',   nm:'노무제공자 관리업무', always:true,
      say:'고용·산재 신고' },
    { id:'retire',   nm:'퇴직공제 업무대행', always:true,
      say:'승인·근로내역 신고, 증명서 발급' },

    /* 어느 쪽인지는 여기서 가리지 않는다 — 담당자 상담에서 가려 예산을
       다시 짠다. 그래서 칸을 둘로 세우지도, 세그먼트로 묶지도 않는다.
       한 칸으로 '이 신고가 필요한가' 만 묻는다 */
    { id:'month',    nm:'익월·익익월 신고',
      say:'일한 달의 다음 달이나 두 달 뒤에 신고해야 할 때' },

    /* ⚠ '상용직을 현장에 배치하고' 로 적었다가 되돌렸다 — 원문에 없는
       말이다. 안내문이 말하는 것은 '전입·전근·전보 신고'(272ad401 28행
       · c1684946 29행)뿐이고, '배치' 는 발령 쪽 말이라 신고와 어긋난다.
       전보는 현장→본사·현장→현장도 되므로 '현장에 배치' 로 좁히면 틀린다.
       '고지서' 도 이 안내문에는 없다 — 받은 견적 요소 목록에만 있다 */
    { id:'reg',      nm:'상용근로자 현장별 건강·연금',
      say:'상용직의 전입·전근·전보를 신고할 때' },
    /* 기본에서는 이용사가 직접 하는 일이다 — 안내문의 신고 흐름에
       '김반장 로그인 → 월출역 메뉴에서 근로내용 입력 후, 근로내용전송
       메뉴에서 접수' 로 적혀 있다. 그 입력을 대신한다는 말이다.
       ⚠ '최대 15개 현장' 은 적지 않는다 — 그건 이 업무가 무엇인지가
       아니라 신청 제한이다. 제한은 상담에서 가린다 */
    { id:'attend',   nm:'출역 입력 대행',
      say:'월출역 근로내용 입력까지 맡기고 싶을 때' },
    /* 안내문 네 벌 어디에도 없다 — 계약과 별도인 서비스다 */
    { id:'kiscon',   nm:'키스콘 공사대장 신고',
      say:'도급·하도급 계약과 변경 내용을 통보해야 할 때' }
  ];
  var PICKS = ROWS.filter(function(r){ return !r.always; });

  /* 포함된 상태. 신청 데이터가 그대로 들고 가고, 요금 계산도 여기를 본다 */
  var scope = {};
  ROWS.forEach(function(r){ scope[r.id] = !!r.always; });

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

  /* ── 업무범위 그리기 ───────────────────────────────────────────
     줄은 한 번만 세우고(buildScope), 넣고 빼는 동안에는 상태만 칠한다
     (paintScope). 매번 다시 만들면 방금 누른 버튼에서 초점이 떨어져
     키보드로 오는 사람이 자리를 잃는다 */
  function won(n){ return n.toLocaleString('ko-KR') + '원'; }

  /* 가운뎃점으로 이은 말은 통째로 묶는다. keep-all 은 낱말만 지키고
   가운뎃점에서는 갈라서, 좁은 폭에서 '취득·상실 / ·보수변경'처럼
   다음 줄이 점으로 시작한다 */
function glue(t){
  return t.replace(/\S*·\S*/g, function(m){ return '<span class="nb">' + m + '</span>'; });
}
  /* 좁은 폭에서 설명을 여닫는 물음표 — 계약 유형 카드의 것과 같은 그림이다.
     넓은 폭에서는 CSS 가 치운다(display:none 이라 탭 차례에서도 빠진다) */
  var HELP_SVG = '<svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="currentColor" opacity=".2"/><path transform="translate(4.792 4.804) scale(.5997)" fill="currentColor" d="M13 18.0C13.6 18.0 14 18.4 14 19.0V21.0C14 21.6 13.6 22.0 13 22.0H11C10.4 22.0 10 21.6 10 21.0V19.0C10 18.4 10.4 18.0 11 18.0H13ZM11.7 2.0C14.3 1.9 17.3 2.9 18.4 6.0C18.9 7.5 18.8 8.8 18.2 10.0C17.6 11.0 16.7 11.8 15.9 12.3C15 12.8 14.2 13.1 13.6 13.4C13.5 13.4 13.5 13.4 13.5 13.4V16.5H10.5V12.5C10.5 12.1 10.7 11.7 10.8 11.6C10.9 11.4 11.1 11.3 11.2 11.2C11.3 11.1 11.5 11.0 11.6 10.9C11.9 10.8 12.2 10.7 12.4 10.6C13 10.3 13.7 10.1 14.3 9.7C14.9 9.3 15.3 8.9 15.6 8.5C15.7 8.2 15.8 7.7 15.6 7.0C15.1 5.6 13.7 4.9 11.8 5.0C10.9 5.0 10.1 5.2 9.4 5.5C8.8 5.9 8.5 6.2 8.4 6.5C8.3 6.9 8.3 7.2 8.4 7.4C8.4 7.7 8.6 7.9 8.8 8.2L6.2 9.8C6.1 9.6 5.7 9.0 5.5 8.3C5.3 7.5 5.2 6.6 5.6 5.5C6.0 4.3 7.0 3.4 8.1 2.9C9.2 2.3 10.5 2.0 11.7 2.0Z"/></svg>';

  /* 고르는 자리와 설명이 한 덩이다. 표를 따로 두었더니 고른 자리와 그
     결과가 떨어져 있어 눈이 오르내려야 했다. 이제 칸마다 제가 하는 일을
     들고 있다. 늘 들어오는 칸도 같은 꼴이되 버튼이 없다 */
  function buildScope(){
    var box = $('#scopeList'); if(!box) return;

    function rung(r){
      return '<div class="pq-rung' + (r.always ? ' is-base' : '') + '"'
        +     (r.always ? '' : ' data-pick="' + r.id + '"') + '>'
        +   '<div class="hd">'
        +     '<span class="tx">' + glue(r.nm)
        /* 물음표는 고르는 칸에만 단다 — 늘 들어오는 것을 물음표 뒤에 두면
           '기본인데 왜 눌러야 보이나' 가 된다. 좁은 폭에서도 그대로 편다 */
        +       (r.always ? ''
              : '<button type="button" class="pq-help" aria-expanded="false"'
                + ' aria-controls="say-' + r.id + '"'
                + ' aria-label="' + r.nm + ' 설명 보기">' + HELP_SVG + '</button>')
        +       '<span class="ones" id="say-' + r.id + '">' + glue(r.say) + '</span>'
        +     '</span>'
        +     (r.always ? ''
              : '<button type="button" class="pq-add" aria-pressed="false">'
                + '+ 추가</button>')
        +   '</div>'
        + '</div>';
    }

    box.innerHTML =
        '<div class="pq-ladder">'
      +   ROWS.filter(function(r){ return r.always; }).map(rung).join('')
      + '</div>'
      /* 늘 들어오는 것과 고르는 것 사이를 한 칸 띄운다 — 버튼이 있고 없고
         만으로는 좁은 폭에서 경계가 보이지 않았다 */
      + '<div class="pq-ladder pq-ladder-pick">' + PICKS.map(rung).join('') + '</div>';

    box.addEventListener('click', function(e){
      /* 물음표가 먼저다 — '+ 추가' 와 같은 칸 안에 있어 아래 분기로 새면
         설명을 펴려다 업무가 담긴다 */
      var help = e.target.closest('.pq-help');
      if(help){
        var row = help.closest('.pq-rung');
        var open = row.classList.toggle('is-tip');
        help.setAttribute('aria-expanded', String(open));
        return;
      }
      var btn = e.target.closest('.pq-add'); if(!btn) return;
      var id = btn.closest('[data-pick]').dataset.pick;
      scope[id] = !scope[id];
      paintScope();
      render();                    /* 포함한 것이 금액에 닿을 자리 */
    });
  }

  function paintScope(){
    var box = $('#scopeList'); if(!box) return;

    PICKS.forEach(function(p){
      var row = box.querySelector('[data-pick="' + p.id + '"]');
      if(!row) return;
      var on = !!scope[p.id];

      var btn = row.querySelector('.pq-add');
      btn.textContent = on ? '✓ 추가됨' : '+ 추가';
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      /* 버튼 글자가 '추가' 뿐이라 어느 업무인지 들리지 않는다 */
      btn.setAttribute('aria-label', p.nm + (on ? ' 추가됨' : ' 추가'));
      row.classList.toggle('is-on', on);
    });
  }

  function resetScope(){
    PICKS.forEach(function(p){ scope[p.id] = false; });
    paintScope();
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
    /* TODO 포함된 업무가 금액을 바꾼다면 여기서 scope 를 읽는다. 지금은
       PICKS 의 price 가 모두 null 이고 받은 요금 규칙도 없어, 상태만
       들고 있고 총액에는 더하지 않는다 — 금액은 지어내지 않는다.
       예: PICKS.filter(function(p){ return scope[p.id] && p.price; }) */
    /* 칸은 만 원으로 받고, 구간은 원으로 가른다 — 요금표가 억 단위라 바꿔 둔다 */
    var sales = Number(String($('#q-sales').value||'').replace(/[^0-9]/g,'')) * MAN;
    var t     = tierFor(sales);
    var disc  = $('#sumDisc'), fold = $('#sumMid'), save = $('#sumSave');
    var total = $('#sumTotal'), basis = $('#sumBasis'), items = $('#sumItems');

    var year = yearly5();

    /* ① 총액 자리 — 고른 주기의 단위로 적는다 */
    total.classList.remove('none');
    if(!t){
      /* 넣은 것이 없을 때는 0원이다 — 단말기 두 화면이 쓰는 표기 그대로다.
         '—'는 '값이 없다'는 말이고 0원은 '아직 더해진 것이 없다'는 말인데,
         아래 '연 매출액을 넣으시면 보여 드립니다'가 이미 왜 비었는지 말하고
         있어, 같은 자리에서 둘이 같은 말을 할 까닭이 없다 */
      total.textContent = '0원';
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
      /* 근거 줄은 비워 둔다. 프리미엄에 '김반장 3.0 이용료 포함'을 적어
         두었는데, 펼친 내역의 '김반장 3.0 이용료 … 무료' 행이 같은 말을
         금액까지 들고 한다. 접혀 있을 때만 세우는 길도 있었지만, 펼치면
         사라지는 줄은 자리만 흔들 뿐 따로 알려 주는 것이 없다 */
      basis.textContent = '';
    }

    /* ② 할인 블록 — 연납을 골랐을 때만. 월납인데 '할인 전'을 띄우면 깎이지도
       않은 금액이 깎인 것처럼 읽힌다. 3.0 이용료가 안 붙는다는 말은 펼친 내역의
       '무료' 줄이 하니 여기서 또 하지 않는다 — 깎이는 것이 둘인 것처럼 읽힌다 */
    var showYear = t && t !== 'over' && year;
    $('#sumYear').hidden   = !showYear;
    $('#sumWasRow').hidden = !showYear;
    disc.classList.toggle('on', !!showYear);
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
      }else{
        body += line('김반장 3.0 이용료', '월정액', mo);
      }
    }

    items.innerHTML = body;
    /* 넣은 값은 되비치지 않는다 — 바로 왼쪽 폼에 그대로 적혀 있어, 옮겨 적으면
       같은 말을 두 번 하는 셈이다. 그래서 펼칠 것은 금액이 어떻게 나왔는지뿐이고,
       금액이 서지 않았으면 펼칠 것도 없으니 토글을 끈다 — 눌러도 허탕이다 */
    var hasDetail = !!(t && t !== 'over');
    fold.classList.toggle('no-detail', !hasDetail);
    /* 접힘이 기본이다 — 단말기 두 견적과 같다. 펼 것이 없어지면 닫기까지 한다.
       손잡이만 끄고 열린 채로 두면 빈 상자가 선 자리에 구분선만 남는다 */
    if(!hasDetail) fold.open = false;

    /* ④ 신청 버튼 — 금액이 서지 않으면 신청도 서지 않는다. 단말기 두 화면이
       '단말기를 선택해 주세요'·'기간을 입력해 주세요'로 막아 두는 그 자리다.
       여기서 금액을 세우는 칸은 연 매출액 하나뿐이다 — 구간을 가르는 것이
       그것이고, 나머지 칸은 담당자가 산정할 때 보는 값이라 비어 있어도 견적은
       선다. 비어 있는 채로 눌러 봐야 '연 매출액을 입력해 주세요' 오류를 받고
       같은 칸으로 되돌아올 뿐이라, 누르기 전에 막는 편이 한 걸음 짧다.
       ⚠ 막는 칸은 연 매출액 하나지만 버튼은 칸 이름을 대지 않는다. 신청이
          서려면 아래 신청자 정보도 다 있어야 해서, 한 칸만 부르면 그것만
          채우면 되는 줄로 읽힌다. 어느 칸인지는 눌렀을 때 그 칸 밑에
          오류 문구가 말한다.
       ⚠ 4000억 이상('담당자 산정')은 막지 않는다. 금액이 '—'인 것과 '요금표
          밖'인 것은 다르다 — 뒤쪽은 넣을 것을 다 넣은 상태다 */
    /* ⚠ 전송 중에는 버튼을 통째로 두고 본다. 글자만 지키고 disabled 를 밖에
          두었더니, 보내는 사이 주기를 한 번 누르면 render() 가 돌며 버튼이
          되살아났다 — 같은 신청을 두 번 보낼 수 있는 자리다 */
    if(!sending){
      btnSubmit.disabled = !t;
      /* 버튼이 왜 막혀 있는지를 버튼 자신이 알려준다 */
      btnSubmit.textContent = t ? '견적신청하기' : '필수 정보를 입력해 주세요';
    }
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
    sending = false;
    render();
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
    /* 업무범위는 폼 칸이 아니라 버튼이라 FormData 에 잡히지 않는다.
       프리미엄에서만 묻는 자리이므로 3.0 이면 싣지 않는다 */
    if(plan() === 'prem') payload.scope = JSON.parse(JSON.stringify(scope));

    sending = true;
    btnSubmit.disabled = true;
    btnSubmit.textContent = '전송 중…';
    if(!QUOTE_API){
      /* ?hold=1 — '전송 중'에서 멈춰 세운다. 0.6초면 지나가 버리는 화면이다 */
      if(!/(^|[?&])hold=1(&|$)/.test(location.search)) setTimeout(done, 600);
      return;
    }
    fetch(QUOTE_API, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) })
      .then(done)
      .catch(function(){ sending = false; render(); });
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
    resetScope();          /* 포함 버튼은 폼 칸이 아니라 reset 이 못 되돌린다 */
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
  buildScope();
  paintScope();
  syncPlan();

  /* ── 물음표 말풍선 ──────────────────────────────────────────
     데스크톱은 hover 로 뜨지만 손가락에는 hover 가 없다. 물음표를 눌러 여닫되,
     label 안에 있는 단추라 그대로 두면 누르는 순간 그 유형이 골라진다 — 막는다 */
  /* ⚠ '.pq-help' 로 긁으면 업무범위 칸의 물음표까지 들어온다 — 그쪽은 유형
     카드가 없어 closest('.pq-type') 가 null 이고, 누르는 순간 터진다.
     업무범위 쪽은 buildScope 의 델리게이트가 맡는다 */
  var helps = Array.prototype.slice.call(document.querySelectorAll('.pq-type .pq-help'));
  function closeTips(except){
    document.querySelectorAll('.pq-type.is-tip').forEach(function(t){
      if(t === except) return;
      t.classList.remove('is-tip');
      var h = t.querySelector('.pq-help');
      if(h) h.setAttribute('aria-expanded','false');
    });
  }
  helps.forEach(function(h){
    h.addEventListener('click', function(e){
      e.preventDefault(); e.stopPropagation();
      var card = h.closest('.pq-type');
      var on = card.classList.toggle('is-tip');
      h.setAttribute('aria-expanded', String(on));
      closeTips(on ? card : null);
    });
  });
  /* 바깥을 누르거나 Esc 를 누르면 닫는다 */
  document.addEventListener('click', function(){ closeTips(null); });
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape') closeTips(null); });

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
