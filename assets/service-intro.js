/* ================================================================
   service-intro.js — 서비스 소개페이지 두 장이 나눠 쓰는 동작.

   라이브(kbz.co.kr)의 소개페이지 인라인 스크립트를 옮겼다. 거기서는
   jQuery 를 쓰지만 이 저장소는 jQuery 를 들이지 않아 그대로 다시 썼다.

   옮기며 고친 것 하나: 후기 캐러셀의 한 칸이 라이브에서는 320(패널 폭)으로
   박혀 있는데, 패널 사이에 20px 틈이 있어 한 칸 넘길 때마다 20px 씩
   어긋난다. 여기서는 패널과 틈을 실제로 재서 옮긴다.
   ================================================================ */
(function () {
  'use strict';

  /* ── 끊김 없이 흐르는 띠 — 같은 내용을 한 벌 더 붙여 두고 절반만 움직인다 ── */
  function loop(track) {
    if (!track) return;
    var copy = track.cloneNode(true);
    while (copy.firstChild) track.appendChild(copy.firstChild);
  }
  loop(document.querySelector('.slide-track'));
  loop(document.querySelector('.rolling-track'));

  /* ── 후기 캐러셀 ─────────────────────────────────────────────── */
  (function () {
    var track = document.querySelector('.panel-track');
    var prev = document.querySelector('.arrow-btn.prev');
    var next = document.querySelector('.arrow-btn.next');
    if (!track || !prev || !next || track.children.length < 2) return;

    var moving = false;

    function step() {
      var panel = track.firstElementChild;
      var gap = parseFloat(getComputedStyle(track).columnGap || 0) || 0;
      return panel.getBoundingClientRect().width + gap;
    }

    function place(px) {
      track.style.transition = 'none';
      track.style.transform = 'translateX(' + px + 'px)';
      void track.offsetHeight;              /* 자리를 먼저 잡고 나서 애니메이션한다 */
    }

    function slideTo(px) {
      return new Promise(function (done) {
        track.style.transition = 'transform 300ms ease';
        track.style.transform = 'translateX(' + px + 'px)';
        var end = function () { track.removeEventListener('transitionend', end); done(); };
        track.addEventListener('transitionend', end, { once: true });
        setTimeout(end, 400);               /* transitionend 가 안 오는 경우를 받친다 */
      });
    }

    /* 맨 뒤 패널을 앞으로 당겨 두고 한 칸 왼쪽에서 시작한다 — 양쪽으로 돌 수 있게 */
    track.insertBefore(track.lastElementChild, track.firstElementChild);
    place(-step());

    function moveNext() {
      if (moving) return;
      moving = true;
      var s = step();
      slideTo(-(s * 2)).then(function () {
        track.appendChild(track.firstElementChild);
        place(-step());
        moving = false;
      });
    }

    function movePrev() {
      if (moving) return;
      moving = true;
      var s = step();
      track.insertBefore(track.lastElementChild, track.firstElementChild);
      place(-(s * 2));
      slideTo(-step()).then(function () { moving = false; });
    }

    next.addEventListener('click', moveNext);
    prev.addEventListener('click', movePrev);

    var startX = 0, endX = 0;
    track.addEventListener('touchstart', function (e) { startX = endX = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchmove', function (e) { endX = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend', function () {
      var diff = endX - startX;
      if (Math.abs(diff) > 50) (diff < 0 ? moveNext : movePrev)();
      startX = endX = 0;
    });

    /* 폭이 바뀌면 한 칸의 크기도 바뀐다 — 제자리를 다시 잡는다 */
    addEventListener('resize', function () { if (!moving) place(-step()); });
  })();

  /* ── FAQ ─────────────────────────────────────────────────────── */
  document.querySelectorAll('.drop').forEach(function (drop) {
    var title = drop.querySelector('.drop-title');
    var content = drop.querySelector('.drop-content');
    if (!title || !content) return;
    title.addEventListener('click', function () {
      var open = content.classList.toggle('show');
      drop.setAttribute('aria-expanded', open ? 'true' : 'false');
      title.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });

  /* ── 짙은 구역의 큰 사진 — 화면에 들어올 때 올라온다 ───────────── */
  (function () {
    var area = document.querySelector('.partition-5-img-area');
    if (!area) return;
    if (!('IntersectionObserver' in window)) { area.classList.add('active'); return; }
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { area.classList.toggle('active', e.isIntersecting); });
    }, { threshold: 0.2 }).observe(area);
  })();

  /* ── 바닥 버튼 — 같은 일을 하는 CTA 구역이 올라오면 비켜 준다 ──── */
  (function () {
    var floating = document.querySelector('.floating-buttons');
    var cta = document.querySelector('.partition-5');
    if (!floating || !cta) return;
    var tick = function () {
      var top = cta.getBoundingClientRect().top + scrollY;
      var overlap = scrollY + innerHeight - top;
      var progress = overlap <= 0 ? 0 : Math.min(overlap / cta.offsetHeight, 1);
      floating.style.transform = 'translateY(' + progress * 100 + '%)';
    };
    addEventListener('scroll', tick, { passive: true });
    addEventListener('resize', tick);
    tick();
  })();
})();
