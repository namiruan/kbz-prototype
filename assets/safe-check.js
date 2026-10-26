/* safe-check.js — 수를 읽어 늘어놓기만 한다. 고치는 것은 없다. */
(function () {
  'use strict';

  /* env() 는 js 가 바로 읽지 못한다 — 재는 상자를 하나 만들어 그 높이로 묻는다 */
  function env(name) {
    var d = document.createElement('div');
    d.style.cssText = 'position:fixed;top:-9999px;height:env(' + name + ',0px)';
    document.body.appendChild(d);
    var v = d.getBoundingClientRect().height;
    d.remove();
    return Math.round(v);
  }

  function unit(u) {
    var d = document.createElement('div');
    d.style.cssText = 'position:fixed;top:-9999px;height:100' + u;
    document.body.appendChild(d);
    var v = d.getBoundingClientRect().height;
    d.remove();
    return Math.round(v);
  }

  var standalone = (window.navigator.standalone === true) ||
    (window.matchMedia && window.matchMedia('(display-mode:standalone)').matches);
  var pin = document.querySelector('.bar--pin').getBoundingClientRect();
  var vv = window.visualViewport;

  var rows = [
    ['홈 화면에서 연 창인가', standalone ? '예' : '아니오', standalone],
    ['navigator.standalone', String(window.navigator.standalone), window.navigator.standalone === true],
    ['display-mode:standalone', String(!!(window.matchMedia &&
      window.matchMedia('(display-mode:standalone)').matches)), null],
    ['기기 화면 높이 screen.height', screen.height + ' pt', null],
    ['창 높이 innerHeight', window.innerHeight + ' pt', null],
    ['visualViewport.height', vv ? Math.round(vv.height) + ' pt' : '없음', null],
    ['100svh', unit('svh') + ' px', null],
    ['100dvh', unit('dvh') + ' px', null],
    ['100lvh', unit('lvh') + ' px', null],
    ['env(safe-area-inset-top)', env('safe-area-inset-top') + ' px', null],
    ['env(safe-area-inset-bottom)', env('safe-area-inset-bottom') + ' px',
      env('safe-area-inset-bottom') > 0],
    ['창의 윗변 screenY', String(window.screenY), null],
    ['창 밖에 남는 높이', (screen.height - window.innerHeight) + ' pt', null],
    ['그중 아래쪽', Math.max(0, screen.height - window.innerHeight -
      (window.screenY || 0)) + ' pt', null],
    ['초록 바의 아랫변', Math.round(pin.bottom) + ' px', null],
    ['창 높이와 같은가', Math.round(pin.bottom) === window.innerHeight ? '예' : '아니오',
      Math.round(pin.bottom) === window.innerHeight],
    ['devicePixelRatio', String(window.devicePixelRatio), null]
  ];

  var out = document.getElementById('out');
  rows.forEach(function (r) {
    var dt = document.createElement('dt'); dt.textContent = r[0];
    var dd = document.createElement('dd'); dd.textContent = r[1];
    if (r[2] === true) dd.className = 'yes';
    if (r[2] === false) dd.className = 'no';
    out.appendChild(dt); out.appendChild(dd);
  });
})();
