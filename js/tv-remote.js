/**
 * StreamFlix — Navegação por Controle Remoto
 * Compatível com: Fire TV Stick, TV Box Android, Smart TV WebView
 *
 * Detecção de TV: User-Agent explícito OU forceTV manual.
 * NÃO usa pointer/hover ou innerWidth — esses falseiam em mobile.
 *
 * Para testar no browser:
 *   localStorage.setItem('forceTV','1'); location.reload();
 * Para desativar:
 *   localStorage.removeItem('forceTV'); location.reload();
 */

(function () {
  'use strict';

  // ─── DETECÇÃO DE TV ──────────────────────────────────────────────────────────
  // Só UAs explícitos de TV/Fire TV/Android TV.
  // NÃO usa pointer:coarse (falso em celular) nem innerWidth (falso em landscape).
  const TV_UA = /Android.*TV|FireTV|AFTM|AFTN|AFTS|AFTB|AFTR|AFTEUF|AFT[A-Z]|Silk\/|AmazonWebAppPlatform/i;
  const isTV  = TV_UA.test(navigator.userAgent);
  const FORCE_TV = localStorage.getItem('forceTV') === '1';

  if (!isTV && !FORCE_TV) return;

  console.log('[TV Remote] Modo TV ativado — UA:', navigator.userAgent.substring(0, 80));
  document.documentElement.classList.add('tv-mode');

  // ─── SELETORES FOCÁVEIS ───────────────────────────────────────────────────────
  const FOCUSABLE = [
    '.card-movie',
    '.nav-item',
    '.streaming-chip',
    '.genre-chip',
    '.iptv-tab',
    '.meus-tab',
    '.streaming-type-btn',
    '.type-btn',
    '.server-btn',
    '.menu-list-item',
    '.menu-grid-item',
    '.tv-canal-item',
    '.tv-cat-pill',
    '.estreia-card',
    '.hero-info-btn',
    '.hero-trailer-btn',
    '.dp-play-btn',
    '.sec-btn',
    '.sheet-btn',
    'button',
    'input',
    '[onclick]',
    '[tabindex]',
  ].join(', ');

  // ─── ESTADO ───────────────────────────────────────────────────────────────────
  let currentFocus = null;
  let navActive    = true;

  // ─── TORNAR ELEMENTOS FOCÁVEIS ───────────────────────────────────────────────
  function makeFocusable(root) {
    (root || document).querySelectorAll(FOCUSABLE).forEach(el => {
      if (!el.hasAttribute('tabindex') && el.tagName !== 'INPUT' && el.tagName !== 'BUTTON') {
        el.setAttribute('tabindex', '0');
      }
    });
  }

  const domObserver = new MutationObserver(() => makeFocusable());
  domObserver.observe(document.body, { childList: true, subtree: true });
  makeFocusable();

  // ─── PEGAR FOCÁVEIS VISÍVEIS ─────────────────────────────────────────────────
  function getFocusables() {
    return Array.from(document.querySelectorAll(FOCUSABLE)).filter(el => {
      if (el.offsetParent === null) return false;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return false;
      const s = window.getComputedStyle(el);
      return s.visibility !== 'hidden' && s.opacity !== '0';
    });
  }

  // ─── FOCAR ELEMENTO ──────────────────────────────────────────────────────────
  function setFocus(el) {
    if (!el) return;
    if (currentFocus && document.contains(currentFocus)) {
      currentFocus.classList.remove('tv-focused');
    }
    currentFocus = el;
    el.classList.add('tv-focused');
    el.focus({ preventScroll: true });
    scrollSmart(el);
  }

  function scrollSmart(el) {
    const rect   = el.getBoundingClientRect();
    const margin = 100;
    if (rect.top < margin) {
      window.scrollBy({ top: rect.top - margin, behavior: 'smooth' });
    } else if (rect.bottom > window.innerHeight - margin) {
      window.scrollBy({ top: rect.bottom - window.innerHeight + margin, behavior: 'smooth' });
    }
    // Scroll horizontal em carrosséis
    const carousel = el.closest(
      '.carousel, .tv-cats-scroll, .streaming-chips, .genre-chips, .meus-tabs, .iptv-tabs, .streaming-genre-chips'
    );
    if (carousel) {
      const cR = carousel.getBoundingClientRect();
      const eR = el.getBoundingClientRect();
      if (eR.left < cR.left + 10) {
        carousel.scrollBy({ left: eR.left - cR.left - 20, behavior: 'smooth' });
      } else if (eR.right > cR.right - 10) {
        carousel.scrollBy({ left: eR.right - cR.right + 20, behavior: 'smooth' });
      }
    }
  }

  // ─── NAVEGAÇÃO DIRECIONAL ─────────────────────────────────────────────────────
  function center(el) {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  function findNearest(dir) {
    const els = getFocusables();
    if (!currentFocus || !els.length) return els[0] || null;

    const from = center(currentFocus);
    let best = null, bestScore = Infinity;

    els.forEach(el => {
      if (el === currentFocus) return;
      const to = center(el);
      const dx = to.x - from.x;
      const dy = to.y - from.y;

      let inDir = false, primary = 0, secondary = 0;
      switch (dir) {
        case 'up':    inDir = dy < -5;  primary = -dy; secondary = Math.abs(dx); break;
        case 'down':  inDir = dy > 5;   primary =  dy; secondary = Math.abs(dx); break;
        case 'left':  inDir = dx < -5;  primary = -dx; secondary = Math.abs(dy); break;
        case 'right': inDir = dx > 5;   primary =  dx; secondary = Math.abs(dy); break;
      }
      if (!inDir) return;

      const score = primary + secondary * 2.5;
      if (score < bestScore) { bestScore = score; best = el; }
    });

    return best;
  }

  // ─── KEYCODES ────────────────────────────────────────────────────────────────
  // Fire TV: UP=38 DOWN=40 LEFT=37 RIGHT=39 ENTER=13 BACK=8/27/10009
  // Alguns Fire TV antigos mandam keyCode 10009 pro botão Voltar
  const KEYS = {
    UP:         [38, 'ArrowUp'],
    DOWN:       [40, 'ArrowDown'],
    LEFT:       [37, 'ArrowLeft'],
    RIGHT:      [39, 'ArrowRight'],
    ENTER:      [13, 'Enter'],
    BACK:       [8, 27, 10009, 'Backspace', 'Escape', 'GoBack'],
    PLAY_PAUSE: [179, 'MediaPlayPause'],
    REWIND:     [227, 'MediaRewind'],
    FASTFWD:    [228, 'MediaFastForward'],
  };

  function matchKey(e, group) {
    return KEYS[group].includes(e.keyCode) || KEYS[group].includes(e.key);
  }

  // ─── HANDLER PRINCIPAL ───────────────────────────────────────────────────────
  document.addEventListener('keydown', function (e) {
    if (!navActive) return;

    // Em campo de texto: só intercepta Escape/Voltar para desfocar
    if (document.activeElement && document.activeElement.tagName === 'INPUT') {
      if (matchKey(e, 'BACK')) {
        document.activeElement.blur();
        e.preventDefault();
        if (currentFocus && currentFocus !== document.activeElement) setFocus(currentFocus);
      }
      return;
    }

    // Inicializa foco se nenhum
    if (!currentFocus || !document.contains(currentFocus)) {
      const first = getFocusables()[0];
      if (first) setFocus(first);
      return;
    }

    if      (matchKey(e, 'UP'))    { e.preventDefault(); const t = findNearest('up');    if (t) setFocus(t); }
    else if (matchKey(e, 'DOWN'))  { e.preventDefault(); const t = findNearest('down');  if (t) setFocus(t); }
    else if (matchKey(e, 'LEFT'))  { e.preventDefault(); const t = findNearest('left');  if (t) setFocus(t); }
    else if (matchKey(e, 'RIGHT')) { e.preventDefault(); const t = findNearest('right'); if (t) setFocus(t); }
    else if (matchKey(e, 'ENTER')) { e.preventDefault(); if (currentFocus) currentFocus.click(); }
    else if (matchKey(e, 'BACK'))  { e.preventDefault(); handleBack(); }
  });

  // ─── BOTÃO VOLTAR ─────────────────────────────────────────────────────────────
  function handleBack() {
    const modals = [
      { id: 'embedModal',      fn: () => typeof fecharEmbedWeb   === 'function' && fecharEmbedWeb() },
      { id: 'trailerModal',    fn: () => typeof fecharTrailer    === 'function' && fecharTrailer() },
      { id: 'actorModal',      fn: () => typeof history !== 'undefined' && history.back() },
      { id: 'detailsPage',     fn: () => typeof history !== 'undefined' && history.back() },
      { id: 'serverModal',     fn: () => typeof fecharMenuServidores === 'function' && fecharMenuServidores() },
      { id: 'vipModal',        fn: () => typeof fecharModalVip   === 'function' && fecharModalVip() },
      { id: 'pagamentoModal',  fn: () => typeof fecharModalPagamento === 'function' && fecharModalPagamento() },
      { id: 'avatarModal',     fn: () => typeof fecharAvatarModal === 'function' && fecharAvatarModal() },
      { id: 'menuPrincipal',   fn: () => typeof fecharMenuPrincipal === 'function' && fecharMenuPrincipal() },
      { id: 'bottomSheet',     fn: () => typeof fecharSheetTV   === 'function' && fecharSheetTV() },
    ];

    for (const m of modals) {
      const el = document.getElementById(m.id);
      if (el && (el.style.display === 'flex' || el.style.display === 'block' || el.classList.contains('active'))) {
        m.fn();
        return;
      }
    }

    // Voltar pra home se não estiver nela
    if (typeof mudarAba === 'function') {
      const homeNav = document.getElementById('nav-home');
      if (homeNav && !homeNav.classList.contains('active')) {
        mudarAba('view-home', homeNav);
        setTimeout(() => focusFirst(), 300);
        return;
      }
    }
  }

  // ─── FOCO NO PRIMEIRO ELEMENTO AO TROCAR ABA ─────────────────────────────────
  function focusFirst(container) {
    const scope   = container || document;
    const actives = scope.querySelectorAll('.view.active, .details-page.active');
    const searchIn = actives.length ? actives[actives.length - 1] : document.body;
    const first = Array.from(searchIn.querySelectorAll(FOCUSABLE)).find(el => {
      if (el.offsetParent === null) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    if (first) setFocus(first);
  }

  // Wrapa mudarAba para resetar foco ao trocar de aba
  function wrapMudarAba() {
    if (typeof window.mudarAba !== 'function') return;
    const orig = window.mudarAba;
    window.mudarAba = function (...args) {
      orig(...args);
      setTimeout(() => focusFirst(), 200);
    };
  }
  wrapMudarAba();
  window.addEventListener('load', wrapMudarAba);

  // Observa modais para focar quando abrem
  function watchModal(id, delay) {
    const el = document.getElementById(id);
    if (!el) return;
    new MutationObserver(() => {
      const vis = el.style.display === 'flex' || el.style.display === 'block' || el.classList.contains('active');
      if (vis) setTimeout(() => focusFirst(el), delay || 300);
    }).observe(el, { attributes: true, attributeFilter: ['style', 'class'] });
  }

  ['serverModal','vipModal','pagamentoModal','embedModal','avatarModal','menuPrincipal','bottomSheet']
    .forEach(id => watchModal(id));

  // Ao abrir detailsPage: foca btnPlayFilme primeiro
  (function () {
    const dp = document.getElementById('detailsPage');
    if (!dp) return;
    new MutationObserver(() => {
      if (!dp.classList.contains('active')) return;
      setTimeout(() => {
        const btn = document.getElementById('btnPlayFilme');
        if (btn && btn.style.display !== 'none') { setFocus(btn); return; }
        const first = Array.from(dp.querySelectorAll(FOCUSABLE)).find(el => {
          const r = el.getBoundingClientRect();
          return el.offsetParent !== null && r.width > 0 && r.height > 0;
        });
        if (first) setFocus(first);
      }, 400);
    }).observe(dp, { attributes: true, attributeFilter: ['class'] });
  })();

  // ─── INICIALIZAR FOCO NA CARGA ────────────────────────────────────────────────
  window.addEventListener('load', () => {
    setTimeout(() => { makeFocusable(); focusFirst(); }, 1500);
  });

  // ─── API PÚBLICA ──────────────────────────────────────────────────────────────
  window.TVRemote = {
    setFocus,
    focusFirst,
    makeFocusable,
    disable: () => { navActive = false; },
    enable:  () => { navActive = true;  },
  };

})();
