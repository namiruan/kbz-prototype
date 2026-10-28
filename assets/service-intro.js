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

  /* ── 견적신청 모달 ──────────────────────────────────────────
     index.html 이 쓰던 것과 같다. 링크의 href 는 그대로 두므로 이 스크립트가
     죽어도 견적 화면으로 이동은 된다. ─────────────────────────────── */
  (function () {
    var dlg = document.getElementById('quoteModal');
    if (!dlg || typeof dlg.showModal !== 'function') return;
    var frame = document.getElementById('quoteFrame');
    var xBtn = document.getElementById('quoteModalClose');
    var opener = null, loaded = '';
    var PAGES = ['quote.html', 'face-quote.html'];   /* 모달로 띄우는 견적 화면 */

    function open(e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;  /* 새 탭으로 열려는 것은 막지 않는다 */
      e.preventDefault();
      opener = e.currentTarget;
      var page = opener.getAttribute('href');
      if (loaded !== page) { frame.src = page; loaded = page; }
      dlg.showModal();
      fit();                          /* 완료 화면인 채로 닫았다 다시 열 수도 있다 */
      document.body.style.overflow = 'hidden';
    }
    function close() { dlg.close(); }

    /* 완료 화면은 내용이 몇 줄뿐이라 기본 크기로 두면 빈 상자가 된다.
       같은 출처이므로 안쪽을 재서 모달을 내용에 맞춘다. 폼일 때는 CSS 기본값. */
    function fit() {
      var d;
      try { d = frame.contentDocument; } catch (err) { return; }
      var card = d && d.getElementById('doneCard');
      var main = d && d.querySelector('.q-main');
      var on = !!(card && main && card.classList.contains('on'));
      dlg.classList.toggle('is-fit', on);
      if (!on) { dlg.style.width = dlg.style.height = ''; return; }
      var h = Math.ceil(main.getBoundingClientRect().bottom + (d.defaultView.scrollY || 0));
      if (window.matchMedia('(max-width:640px)').matches) {
        dlg.style.width = '';
        dlg.style.height = 'min(' + h + 'px, calc(100dvh - 32px))';
        return;
      }
      var r = card.getBoundingClientRect();
      var w = Math.ceil(r.width + r.left * 2);                     /* 좌우 여백을 같게 */
      dlg.style.width = 'min(' + w + 'px, calc(100vw - 40px))';
      dlg.style.height = 'min(' + h + 'px, 88vh, 900px)';
    }
    addEventListener('resize', fit);

    PAGES.forEach(function (page) {
      Array.prototype.forEach.call(document.querySelectorAll('a[href="' + page + '"]'), function (a) {
        a.addEventListener('click', open);
      });
    });
    xBtn.addEventListener('click', close);

    /* 넓은 화면의 완료 화면에서 '닫기'를 누르면 iframe 이 이 신호를 보낸다 */
    addEventListener('message', function (e) {
      if (e.source === frame.contentWindow && e.data && e.data.kbz === 'close') close();
    });

    dlg.addEventListener('close', function () {
      document.body.style.overflow = '';
      if (opener) { opener.focus(); opener = null; }
    });

    /* 배경 클릭으로 닫기 — dialog 는 배경까지 자기 영역이라 좌표로 판단한다 */
    dlg.addEventListener('click', function (e) {
      var r = dlg.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close();
    });

    /* iframe 안에서 누른 Esc 는 부모 문서에 닿지 않는다. 같은 출처이므로 직접 건다. */
    frame.addEventListener('load', function () {
      try {
        frame.contentDocument.addEventListener('keydown', function (e) {
          if (e.key === 'Escape') { e.preventDefault(); close(); }
        });
        var card = frame.contentDocument.getElementById('doneCard');
        if (card && window.MutationObserver) {
          new MutationObserver(fit).observe(card, { attributes: true, attributeFilter: ['class'] });
        }
        fit();
      } catch (err) {}
    });
  })();

  /* ── partition-2 짧은 루프 데모 ─────────────────────────────
     index.html 의 .ui-demo 와 같은 짜임이되 훨씬 짧게 줄였다. 한 칸이
     대여섯 걸음, 한 바퀴 5초 안쪽이다. 보일 때만 돌고 벗어나면 멈춘다 —
     화면 밖에서 타이머가 도는 것을 막는다.

     동작 줄이기를 켠 사람에게는 돌리지 않고 끝난 모습만 세워 둔다.
     여기 데모는 본문을 돕는 그림이지 본문 자체가 아니라서다 ─────── */
  (function () {
    var demos = [].slice.call(document.querySelectorAll('[data-p2d]'));
    if (!demos.length) return;
    var reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;

    /* 근로내역 대조 — 단말기가 찍은 것과 현장이 손으로 적은 출역기록
       사이를 돋보기가 오간다. 그뿐이다. 무엇이 잘못됐다고도, 무엇이
       만들어졌다고도 말하지 않는다 — 글이 말하는 것이 '맞춰 본다' 까지다 */
    function match(root) {
      var scan = root.querySelector('.p2d-scan');
      var dev = root.querySelector('.p2d-dev .body');
      var doc = root.querySelector('.p2d-doc .sheet');
      var lens = root.querySelector('.lens');
      var timers = [], on = false, cur = dev;
      function T(ms, fn) { timers.push(setTimeout(fn, ms)); }
      function clear() { timers.forEach(clearTimeout); timers = []; }
      /* 자리를 재서 옮긴다 — 좌표를 박아 두지 않아 폭이 바뀌어도 맞는다 */
      function moveTo(el, jump) {
        cur = el;
        if (jump) lens.style.transition = 'none';
        var r = el.getBoundingClientRect(), s = scan.getBoundingClientRect();
        lens.style.left = (r.left - s.left + r.width / 2) + 'px';
        lens.style.top = (r.top - s.top + r.height / 2) + 'px';
        if (jump) { void lens.offsetWidth; lens.style.transition = ''; }
      }
      /* 폭이 바뀌면 재 둔 자리가 어긋난다 — 그 자리로 다시 잡는다 */
      addEventListener('resize', function () { if (on) moveTo(cur, true); });
      function step() { moveTo(cur === dev ? doc : dev); T(1400, step); }
      return {
        play: function () {
          if (on) return;
          on = true;
          moveTo(dev, true);
          scan.classList.add('scanning');
          if (reduce) { moveTo(doc); return; }   /* 움직이지 않고 한 자리에 둔다 */
          T(900, step);
        },
        stop: function () { on = false; clear(); scan.classList.remove('scanning'); }
      };
    }

    /* 건설공사 신고 — 기한 고리가 도는 동안 업무 셋이 차례로 끝난다.
       고리는 끝까지 차지 않는다. 기한을 넘기지 않았다는 뜻이다 */
    function due(root) {
      var box = root.querySelector('.p2d-due');
      var items = [].slice.call(root.querySelectorAll('.dl-list li'));
      var timers = [], on = false;
      function T(ms, fn) { timers.push(setTimeout(fn, ms)); }
      function clear() { timers.forEach(clearTimeout); timers = []; }
      function reset() { clear(); box.classList.remove('running'); items.forEach(function (i) { i.classList.remove('on'); }); }
      function settle() { box.classList.add('running'); items.forEach(function (i) { i.classList.add('on'); }); }
      function run() {
        reset();
        T(300, function () { box.classList.add('running'); });
        items.forEach(function (it, i) { T(800 + i * 750, function () { it.classList.add('on'); }); });
        T(5200, run);
      }
      return {
        play: function () { if (on) return; on = true; if (reduce) settle(); else run(); },
        stop: function () { on = false; clear(); }
      };
    }

    /* 고지서 검증 — 체크가 붙기 전에는 납부로 가는 길도 돈도 흐리다.
       검증을 거쳐야 넘어간다는 순서가 이 칸의 내용이다 */
    function pay(root) {
      var box = root.querySelector('.p2d-pay');
      var timers = [], on = false;
      function T(ms, fn) { timers.push(setTimeout(fn, ms)); }
      function clear() { timers.forEach(clearTimeout); timers = []; }
      function reset() { clear(); box.classList.remove('ok', 'paid'); }
      function settle() { box.classList.add('ok', 'paid'); }
      function run() {
        reset();
        T(700, function () { box.classList.add('ok'); });    /* 검증 */
        T(1500, function () { box.classList.add('paid'); }); /* 그제서야 납부 */
        T(4400, run);
      }
      return {
        play: function () { if (on) return; on = true; if (reduce) settle(); else run(); },
        stop: function () { on = false; clear(); }
      };
    }

    var make = { match: match, due: due, pay: pay };
    var list = [];
    demos.forEach(function (el) {
      var f = make[el.getAttribute('data-p2d')];
      if (f) list.push({ el: el, ctl: f(el) });
    });
    if (!('IntersectionObserver' in window)) { list.forEach(function (d) { d.ctl.play(); }); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var d = list.filter(function (x) { return x.el === e.target; })[0];
        if (d) (e.isIntersecting ? d.ctl.play() : d.ctl.stop());
      });
    }, { threshold: 0.3 });
    list.forEach(function (d) { io.observe(d.el); });
  })();
})();
