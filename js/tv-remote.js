/**
 * StreamFlix — Módulo de Navegação por Controle Remoto
 * Compatível com: Fire TV Stick, TV Box Android, Smart TV WebView
 * 
 * Como funciona:
 *  - Intercepta teclas do D-Pad (setas + Enter + Voltar)
 *  - Gerencia foco visual entre elementos interativos
 *  - Suporta carrosséis horizontais e grids verticais
 *  - Ativa/desativa automaticamente (detecta se é TV)
 */

(function () {
  'use strict';

  // ─── DETECÇÃO DE TV ──────────────────────────────────────────────────────────
  // Só ativa navegação por controle se for TV/Fire TV/Android TV
  const isTV = /Android.*TV|FireTV|AFTM|AFTN|AFTS|AFTB|AFTR|AFT|Silk/i.test(navigator.userAgent)
    || window.innerWidth >= 1920;

  // Para forçar modo TV manualmente (debug no celular): localStorage.setItem('forceTV','1')
  const FORCE_TV = localStorage.getItem('forceTV') === '1';

  if (!isTV && !FORCE_TV) return;

  console.log('[TV Remote] Modo TV ativado');
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
  let navActive = true;

  // ─── TORNAR ELEMENTOS FOCÁVEIS ───────────────────────────────────────────────
  function makeFocusable(root = document) {
    root.querySelectorAll(FOCUSABLE).forEach(el => {
      if (!el.hasAttribute('tabindex') && el.tagName !== 'INPUT' && el.tagName !== 'BUTTON') {
        el.setAttribute('tabindex', '0');
      }
    });
  }

  // Observa mudanças no DOM (cards carregados depois do fetch)
  const observer = new MutationObserver(() => makeFocusable());
  observer.observe(document.body, { childList: true, subtree: true });
  makeFocusable();

  // ─── PEGAR TODOS OS FOCÁVEIS VISÍVEIS ────────────────────────────────────────
  function getFocusables() {
    return Array.from(document.querySelectorAll(FOCUSABLE)).filter(el => {
      if (el.offsetParent === null) return false; // display:none ou pai oculto
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return false;
      const style = window.getComputedStyle(el);
      if (style.visibility === 'hidden' || style.opacity === '0') return false;
      return true;
    });
  }

  // ─── FOCAR ELEMENTO ──────────────────────────────────────────────────────────
  function setFocus(el) {
    if (!el) return;
    if (currentFocus) currentFocus.classList.remove('tv-focused');
    currentFocus = el;
    el.classList.add('tv-focused');
    el.focus({ preventScroll: true });
    scrollIntoViewSmart(el);
  }

  function scrollIntoViewSmart(el) {
    const rect = el.getBoundingClientRect();
    const margin = 80;
    if (rect.top < margin) {
      window.scrollBy({ top: rect.top - margin, behavior: 'smooth' });
    } else if (rect.bottom > window.innerHeight - margin) {
      window.scrollBy({ top: rect.bottom - window.innerHeight + margin, behavior: 'smooth' });
    }
    // Scroll horizontal em carrosséis
    const carousel = el.closest('.carousel, .tv-cats-scroll, .streaming-chips, .genre-chips, .meus-tabs, .iptv-tabs, .streaming-genre-chips');
    if (carousel) {
      const cRect = carousel.getBoundingClientRect();
      const eRect = el.getBoundingClientRect();
      if (eRect.left < cRect.left) {
        carousel.scrollBy({ left: eRect.left - cRect.left - 20, behavior: 'smooth' });
      } else if (eRect.right > cRect.right) {
        carousel.scrollBy({ left: eRect.right - cRect.right + 20, behavior: 'smooth' });
      }
    }
  }

  // ─── NAVEGAÇÃO DIRECIONAL ─────────────────────────────────────────────────────
  function getCenter(el) {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  function findNearest(direction) {
    const els = getFocusables();
    if (!currentFocus || !els.length) return els[0] || null;

    const from = getCenter(currentFocus);
    let best = null;
    let bestScore = Infinity;

    els.forEach(el => {
      if (el === currentFocus) return;
      const to = getCenter(el);
      const dx = to.x - from.x;
      const dy = to.y - from.y;

      let inDirection = false;
      let primary = 0;
      let secondary = 0;

      switch (direction) {
        case 'up':
          inDirection = dy < -5;
          primary = -dy;
          secondary = Math.abs(dx);
          break;
        case 'down':
          inDirection = dy > 5;
          primary = dy;
          secondary = Math.abs(dx);
          break;
        case 'left':
          inDirection = dx < -5;
          primary = -dx;
          secondary = Math.abs(dy);
          break;
        case 'right':
          inDirection = dx > 5;
          primary = dx;
          secondary = Math.abs(dy);
          break;
      }

      if (!inDirection) return;

      // Score: favorece elemento mais próximo na direção correta
      // Penaliza desvio lateral
      const score = primary + secondary * 2.5;
      if (score < bestScore) {
        bestScore = score;
        best = el;
      }
    });

    return best;
  }

  // ─── KEYCODES (Fire TV / Android TV / teclado padrão) ────────────────────────
  const KEYS = {
    UP:     [38, 'ArrowUp'],
    DOWN:   [40, 'ArrowDown'],
    LEFT:   [37, 'ArrowLeft'],
    RIGHT:  [39, 'ArrowRight'],
    ENTER:  [13, 'Enter', ' '],
    BACK:   [8, 27, 10009, 'Backspace', 'Escape', 'GoBack'],
    // Fire TV media keys
    PLAY_PAUSE: [179, 'MediaPlayPause'],
    REWIND:     [227, 'MediaRewind'],
    FASTFWD:    [228, 'MediaFastForward'],
    MENU:       [18, 'Alt', 82],  // Menu key
  };

  function matchKey(e, group) {
    return KEYS[group].includes(e.keyCode) || KEYS[group].includes(e.key);
  }

  // ─── HANDLER PRINCIPAL ───────────────────────────────────────────────────────
  document.addEventListener('keydown', function (e) {
    if (!navActive) return;

    // Se estiver num input de texto, não interceptar setas/enter
    if (document.activeElement && document.activeElement.tagName === 'INPUT') {
      if (matchKey(e, 'BACK')) {
        document.activeElement.blur();
        e.preventDefault();
        // Volta o foco pro elemento que estava antes
        if (currentFocus && currentFocus !== document.activeElement) {
          setFocus(currentFocus);
        }
      }
      return;
    }

    // ── Inicializar foco se nenhum ──
    if (!currentFocus || !document.contains(currentFocus)) {
      const first = getFocusables()[0];
      if (first) setFocus(first);
      return;
    }

    if (matchKey(e, 'UP')) {
      e.preventDefault();
      const target = findNearest('up');
      if (target) setFocus(target);

    } else if (matchKey(e, 'DOWN')) {
      e.preventDefault();
      const target = findNearest('down');
      if (target) setFocus(target);

    } else if (matchKey(e, 'LEFT')) {
      e.preventDefault();
      const target = findNearest('left');
      if (target) setFocus(target);

    } else if (matchKey(e, 'RIGHT')) {
      e.preventDefault();
      const target = findNearest('right');
      if (target) setFocus(target);

    } else if (matchKey(e, 'ENTER')) {
      e.preventDefault();
      if (currentFocus) {
        currentFocus.click();
      }

    } else if (matchKey(e, 'BACK')) {
      e.preventDefault();
      handleBack();
    }
  });

  // ─── BOTÃO VOLTAR ─────────────────────────────────────────────────────────────
  function handleBack() {
    // Fechar modais em ordem de prioridade
    const modals = [
      { el: document.getElementById('embedModal'),    fn: () => typeof fecharEmbedWeb === 'function' && fecharEmbedWeb() },
      { el: document.getElementById('trailerModal'),  fn: () => typeof fecharTrailer === 'function' && fecharTrailer() },
      { el: document.getElementById('actorModal'),    fn: () => typeof history !== 'undefined' && history.back() },
      { el: document.getElementById('detailsPage'),   fn: () => typeof history !== 'undefined' && history.back() },
      { el: document.getElementById('serverModal'),   fn: () => typeof fecharMenuServidores === 'function' && fecharMenuServidores() },
      { el: document.getElementById('vipModal'),      fn: () => typeof fecharModalVip === 'function' && fecharModalVip() },
      { el: document.getElementById('pagamentoModal'),fn: () => typeof fecharModalPagamento === 'function' && fecharModalPagamento() },
      { el: document.getElementById('avatarModal'),   fn: () => typeof fecharAvatarModal === 'function' && fecharAvatarModal() },
      { el: document.getElementById('menuPrincipal'), fn: () => typeof fecharMenuPrincipal === 'function' && fecharMenuPrincipal() },
      { el: document.getElementById('bottomSheet'),   fn: () => typeof fecharSheetTV === 'function' && fecharSheetTV() },
    ];

    for (const m of modals) {
      if (m.el && (m.el.style.display === 'flex' || m.el.classList.contains('active') || m.el.style.display === 'block')) {
        m.fn();
        return;
      }
    }

    // Voltar aba anterior se não estiver na home
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
  function focusFirst(container = null) {
    const scope = container || document;
    const actives = scope.querySelectorAll('.view.active, .details-page.active');
    let searchIn = actives.length ? actives[actives.length - 1] : document.body;
    const first = Array.from(searchIn.querySelectorAll(FOCUSABLE)).find(el => {
      if (el.offsetParent === null) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    if (first) setFocus(first);
  }

  // Intercepta mudarAba para resetar foco
  const _origMudarAba = window.mudarAba;
  if (typeof _origMudarAba === 'function') {
    window.mudarAba = function (...args) {
      _origMudarAba(...args);
      setTimeout(() => focusFirst(), 200);
    };
  } else {
    // Aguarda o app.js carregar
    window.addEventListener('load', () => {
      if (typeof mudarAba === 'function') {
        const orig = mudarAba;
        window.mudarAba = function (...args) {
          orig(...args);
          setTimeout(() => focusFirst(), 200);
        };
      }
    });
  }

  // Ao abrir modais, foca primeiro elemento deles
  function watchModal(id, delay = 300) {
    const el = document.getElementById(id);
    if (!el) return;
    const mo = new MutationObserver(() => {
      const visible = el.style.display === 'flex' || el.style.display === 'block' || el.classList.contains('active');
      if (visible) setTimeout(() => focusFirst(el), delay);
    });
    mo.observe(el, { attributes: true, attributeFilter: ['style', 'class'] });
  }

  ['serverModal', 'vipModal', 'pagamentoModal', 'embedModal', 'avatarModal', 'menuPrincipal', 'bottomSheet'].forEach(id => watchModal(id));

  // ─── INICIALIZAR FOCO NA CARGA ────────────────────────────────────────────────
  window.addEventListener('load', () => {
    setTimeout(() => {
      makeFocusable();
      focusFirst();
    }, 1500); // aguarda splash
  });

  // ─── API PÚBLICA ──────────────────────────────────────────────────────────────
  window.TVRemote = {
    setFocus,
    focusFirst,
    makeFocusable,
    disable: () => { navActive = false; },
    enable:  () => { navActive = true; },
  };

})();
