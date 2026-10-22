/* face-attendance-app.js — 어느 화면을 보여 줄지만 정한다.

   한 문서에 화면을 모두 담아 두고 주소의 ?screen= 이 가리키는 한 장만 켠다.
   화면마다 파일을 두면 앱 셸(내비게이션 바 · 바닥 바 · 토큰)이 열세 벌로
   갈라져, 한 줄을 고칠 때마다 열세 곳을 같이 고쳐야 한다.

   ⚠ 이 파일이 하는 일은 이것뿐이다. 화면 안의 동작(탭 전환 · 촬영 · 인증)은
     앱(Flutter)이 하는 일이라 여기서 흉내 내지 않는다 — 흉내 내면 프로토타입이
     실제로 되는 범위를 읽는 사람이 가늠할 수 없게 된다. */
(function () {
  'use strict';

  function pick() {
    var want = new URL(location.href).searchParams.get('screen');
    var all = document.querySelectorAll('.scr');
    if (!all.length) return;

    var hit = want && document.querySelector('.scr[data-screen="' + want + '"]');
    /* 모르는 이름이 오면 첫 화면으로 — 빈 문서를 내놓으면 주소를 잘못 적은 것인지
       화면이 깨진 것인지 가릴 수 없다 */
    if (!hit) hit = all[0];

    /* 덜어 내기 전에 베낀다 — 뒤에 깔 화면도 덜어 낼 것들 가운데 하나다 */
    behind(hit);

    /* 고른 한 장만 남기고 나머지는 문서에서 **덜어 낸다**. 숨기기만 하면 화면설명의
       앵커(`@{선택자}`)가 깨진다 — 프로토타입 셸은 `document.querySelector` 로 첫 번째
       것을 짚는데, 그 첫 번째가 숨은 다른 화면 안에 있으면 하이라이트가 보이지 않는다.
       (실측: 앵커 40개 중 11개가 엉뚱한 화면을 짚고 있었다) */
    all.forEach(function (s) { if (s !== hit) s.remove(); });
    hit.classList.add('is-on');
    document.title = (hit.dataset.title || '안면 출퇴근') + ' · 김반장';
  }

  /* 떠 있는 창(촬영 확인)은 뒤에 그 창을 띄운 화면을 둔다. 그 화면을 여기
     옮겨 적지 않고 켜기 직전에 **베껴** 온다 — 같은 마크업을 두 곳에 적으면
     한쪽만 고쳐져 따로 늙는다. 어느 화면 위인지는 `data-behind` 가 말한다.
     화면 안의 동작을 흉내 내는 것이 아니라, 한 장의 화면을 짜 맞추는 일이다. */
  function behind(hit) {
    var name = hit.dataset.behind;
    var src = name && document.querySelector('.scr[data-screen="' + name + '"]');
    if (!src) return;

    var back = src.cloneNode(true);
    /* 베낀 쪽은 더 이상 '화면'이 아니다 — 이름을 지워 골라지지 않게 하고,
       읽는 기계와 탭 이동에서 뺀다. id 가 겹치면 라벨이 엉뚱한 칸을 가리킨다 */
    back.removeAttribute('data-screen');
    back.removeAttribute('data-title');
    back.removeAttribute('data-behind');
    back.setAttribute('aria-hidden', 'true');
    back.setAttribute('inert', '');
    back.className = src.className + ' is-on behind';
    back.querySelectorAll('[id]').forEach(function (n) { n.removeAttribute('id'); });
    hit.insertBefore(back, hit.firstChild);
  }

  /* 아이콘은 스프라이트를 주입해 쓴다 (시스템 규약: 원격 절대 URL) */
  function sprite() {
    fetch('https://namiruan.github.io/kbz_3.0_ui_stytem/icons/sprite.svg')
      .then(function (r) { return r.text(); })
      .then(function (svg) {
        var d = document.createElement('div');
        d.setAttribute('aria-hidden', 'true');
        d.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
        d.innerHTML = svg;
        document.body.insertBefore(d, document.body.firstChild);
      }).catch(function () {});
  }

  function boot() { pick(); sprite(); }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
