// ===================== SISTEMA DE PAGAMENTO STREAMFLIX v3 =====================
// Correções aplicadas:
//   1. Bug polling duplo → guard por payment_id
//   2. Modal de senha pós-pagamento (não mais toast de 3s)
//   3. Trial configurável (TRIAL_HORAS)
//   4. Envio de email via api/pagamento (server-side)

const TRIAL_HORAS = 72;          // ← mude para 1 para testar bloqueio em 1 hora
const TRIAL_KEY   = 'sf_trial_v2';
const PAG_KEY     = 'sf_pag_v2';
const VIP_CACHE   = 'sf_vip_cache';

// ── TRIAL ─────────────────────────────────────────────────────────────────────
function iniciarTrial() {
  if (isVipLocal()) return;
  if (!localStorage.getItem(TRIAL_KEY)) {
    localStorage.setItem(TRIAL_KEY, JSON.stringify({ inicio: Date.now() }));
  }
}

function trialExpirou() {
  if (isVipLocal()) return false;
  const t = _getJson(TRIAL_KEY);
  if (!t?.inicio) return false;
  const horasPassadas = (Date.now() - t.inicio) / 3600000;
  return horasPassadas >= TRIAL_HORAS;
}

function horasRestantesTrial() {
  const t = _getJson(TRIAL_KEY);
  if (!t?.inicio) return TRIAL_HORAS;
  const passadas = (Date.now() - t.inicio) / 3600000;
  return Math.max(0, TRIAL_HORAS - passadas);
}

// ── VIP LOCAL ─────────────────────────────────────────────────────────────────
function isVipLocal() {
  if (localStorage.getItem('streamflix_vip') === 'true') return true;
  const c = _getJson(VIP_CACHE);
  if (!c) return false;
  if (!c.expira_em) return true; // vitalício
  return new Date(c.expira_em) > new Date();
}

function getVipCache() { return _getJson(VIP_CACHE); }

function salvarVipCache(data) {
  localStorage.setItem(VIP_CACHE, JSON.stringify(data));
  localStorage.setItem('streamflix_vip', 'true');
}

function limparVipCache() {
  localStorage.removeItem(VIP_CACHE);
  localStorage.removeItem('streamflix_vip');
}

// ── VERIFICAÇÃO ONLINE (ao abrir o app) ───────────────────────────────────────
async function verificarVipOnline() {
  const cache = getVipCache();
  if (!cache?.email || !cache?.senha) return;
  try {
    const supa = getSupabase();
    const { data } = await supa
      .from('streamflix_users')
      .select('status, expira_em, plano')
      .eq('email', cache.email)
      .eq('senha', cache.senha)
      .single();

    if (!data || data.status !== 'VIP') {
      limparVipCache(); location.reload(); return;
    }
    if (data.expira_em && new Date(data.expira_em) < new Date()) {
      localStorage.removeItem('streamflix_vip');
      localStorage.setItem(VIP_CACHE, JSON.stringify({ ...cache, expira_em: data.expira_em, expirado: true }));
      mostrarToast('Seu plano expirou. Renove para continuar!');
      setTimeout(() => abrirModalPagamento(true), 1500);
      return;
    }
    salvarVipCache({ ...cache, expira_em: data.expira_em, plano: data.plano });
  } catch(e) { /* falha silenciosa */ }
}

// ── VERIFICAÇÃO GERAL ─────────────────────────────────────────────────────────
async function verificarPagamentoOuTrial() {
  iniciarTrial();

  // Retoma polling pendente — mas apenas se não tiver polling já ativo
  const pend = _getJson(PAG_KEY);
  if (pend?.payment_id && !_pollingId) {
    iniciarPolling(pend.payment_id, pend.email, pend.plano);
  }

  if (isVipLocal()) {
    verificarVipOnline();
    mostrarBannerTrialOuVip();
    return;
  }

  mostrarBannerTrialOuVip();

  if (trialExpirou()) {
    setTimeout(() => abrirModalPagamento(true), 800);
  }
}

// ── BANNER DE TRIAL NO TOPO ───────────────────────────────────────────────────
function mostrarBannerTrialOuVip() {
  // Remove banner existente
  const old = document.getElementById('trial-banner');
  if (old) old.remove();

  if (isVipLocal()) {
    // Mostra badge VIP no menu
    const cache = getVipCache();
    const menuStatus = document.getElementById('menuVipStatus');
    if (menuStatus && cache) {
      const planoLabel = cache.plano === 'vitalicio'
        ? '♾️ VIP Vitalício'
        : `👑 VIP — expira em ${_diasRestantes(cache.expira_em)} dias`;
      menuStatus.innerHTML = `<i class="fas fa-crown" style="color:gold"></i> ${planoLabel}`;
    }
    return;
  }

  // Calcula horas restantes
  const horas = horasRestantesTrial();
  if (horas <= 0) return; // já expirou, modal vai abrir

  const banner = document.createElement('div');
  banner.id = 'trial-banner';
  const horasInt = Math.floor(horas);
  const minutos  = Math.floor((horas - horasInt) * 60);
  const tempoStr = horasInt > 0 ? `${horasInt}h${minutos > 0 ? minutos + 'min' : ''}` : `${minutos}min`;

  banner.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; z-index: 3000;
    background: linear-gradient(90deg, #e50914, #ff5722);
    color: #fff; text-align: center;
    padding: 7px 12px; font-size: 12px; font-weight: 700;
    display: flex; align-items: center; justify-content: center; gap: 10px;
    box-shadow: 0 2px 10px rgba(229,9,20,0.5);
  `;
  banner.innerHTML = `
    <span id="trial-tempo">⏰ Acesso grátis: <strong>${tempoStr} restantes</strong></span>
    <button onclick="abrirModalPagamento(true); event.stopPropagation();"
      style="background:#fff;color:#e50914;border:none;border-radius:20px;
             padding:4px 12px;font-size:11px;font-weight:900;cursor:pointer;flex-shrink:0;">
      Assinar VIP
    </button>
  `;

  // Empurra o header para baixo
  document.body.prepend(banner);
  const header = document.getElementById('mainHeader');
  if (header) header.style.top = '36px';

  // ✅ Atualiza o tempo restante a cada minuto em tempo real
  if (window._trialBannerInterval) clearInterval(window._trialBannerInterval);
  window._trialBannerInterval = setInterval(() => {
    const elTempo = document.getElementById('trial-tempo');
    if (!elTempo) { clearInterval(window._trialBannerInterval); return; }
    const h = horasRestantesTrial();
    if (h <= 0) { clearInterval(window._trialBannerInterval); mostrarBannerTrialOuVip(); return; }
    const hInt = Math.floor(h);
    const min  = Math.floor((h - hInt) * 60);
    const str  = hInt > 0 ? `${hInt}h${min > 0 ? min + 'min' : ''}` : `${min}min`;
    elTempo.innerHTML = `⏰ Acesso grátis: <strong>${str} restantes</strong>`;
  }, 60000); // atualiza a cada 1 minuto
}

// ── MODAL DE PAGAMENTO ────────────────────────────────────────────────────────
function abrirModalPagamento(forcar = false) {
  if (isVipLocal() && !_getJson(VIP_CACHE)?.expirado) return;
  const cache = getVipCache();
  if (cache?.email) {
    const emailInput = document.getElementById('pag-email');
    if (emailInput) emailInput.value = cache.email;
  }
  mostrarStep('step-planos');
  const modal = document.getElementById('pagamentoModal');
  if (modal) { modal.style.display = 'flex'; addNoScroll(); }
  history.pushState({ view: 'pagamento', modal: true }, null, '');
}

function fecharModalPagamento(fromPS = false) {
  if (trialExpirou() && !isVipLocal()) {
    mostrarToast('Assine para continuar usando o StreamFlix!');
    return;
  }
  _fecharModal(fromPS);
}

function _fecharModal(fromPS = false) {
  const modal = document.getElementById('pagamentoModal');
  if (modal) modal.style.display = 'none';
  removeNoScroll();
  if (!fromPS && history.state?.view === 'pagamento') { fromPopState = true; history.back(); }
}

function mostrarStep(stepId) {
  ['step-planos', 'step-pix', 'step-sucesso', 'step-cartao'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = id === stepId ? 'block' : 'none';
  });
}

// ── SELECIONAR PLANO ──────────────────────────────────────────────────────────
let _emailAtual = '';
let _planoAtual = '';

let _metodoAtual = 'pix'; // 'pix' ou 'cartao'

async function selecionarPlano(plano, metodo = 'pix') {
  const email = document.getElementById('pag-email')?.value?.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    document.getElementById('pag-email-erro').style.display = 'block';
    document.getElementById('pag-email').focus();
    return;
  }
  document.getElementById('pag-email-erro').style.display = 'none';

  _emailAtual = email;
  _planoAtual = plano;
  _metodoAtual = metodo;

  if (metodo === 'cartao') {
    // Abre step de cartão
    mostrarStep('step-cartao');
    document.getElementById('cartao-titulo').innerText =
      plano === 'mensal' ? 'R$ 7,99 — Plano Mensal' : 'R$ 60,00 — Plano Vitalício';
    return;
  }

  // PIX: fluxo original
  const btnId = plano === 'mensal' ? 'btnPagarMensalPix' : 'btnPagarVitalicioPix';
  const btn = document.getElementById(btnId);
  const originalHtml = btn ? btn.innerHTML : '';
  if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando PIX...'; btn.disabled = true; }

  try {
    const res = await fetch('/api/pagamento?action=criar_pix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, plano }),
    });
    const data = await res.json();
    if (!res.ok || !data.payment_id) throw new Error(data.error || 'Falha ao gerar PIX');

    localStorage.setItem(PAG_KEY, JSON.stringify({ payment_id: data.payment_id, email, plano }));
    exibirPix(data);
    iniciarPolling(data.payment_id, email, plano);

  } catch(e) {
    mostrarToast('Erro: ' + e.message);
    if (btn) { btn.innerHTML = originalHtml; btn.disabled = false; }
  }
}

// ── CARTÃO DE CRÉDITO ────────────────────────────────────────────────────────
async function processarCartao() {
  const numero  = document.getElementById('cartao-numero')?.value?.replace(/\s/g,'');
  const nome    = document.getElementById('cartao-nome')?.value?.trim();
  const validade= document.getElementById('cartao-validade')?.value?.trim();
  const cvv     = document.getElementById('cartao-cvv')?.value?.trim();
  const cpf     = document.getElementById('cartao-cpf')?.value?.replace(/\D/g,'');

  if (!numero || numero.length < 15) return mostrarToast('Número do cartão inválido');
  if (!nome)    return mostrarToast('Nome do titular obrigatório');
  if (!validade || !/^\d{2}\/\d{2}$/.test(validade)) return mostrarToast('Validade inválida (MM/AA)');
  if (!cvv || cvv.length < 3) return mostrarToast('CVV inválido');
  if (!cpf || cpf.length !== 11) return mostrarToast('CPF inválido (apenas números)');

  const [mes, ano] = validade.split('/');
  const btn = document.getElementById('btnPagarCartao');
  const originalHtml = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
  btn.disabled = true;

  try {
    const res = await fetch('/api/pagamento?action=criar_cartao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: _emailAtual,
        plano: _planoAtual,
        card_number: numero,
        cardholder_name: nome,
        expiration_month: mes,
        expiration_year: '20' + ano,
        security_code: cvv,
        cpf,
      }),
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Erro no pagamento');

    if (data.aprovado) {
      onAprovado(data);
    } else if (data.status === 'in_process') {
      mostrarToast('⏳ Pagamento em análise! Você receberá o acesso em breve por email.');
      // Polling para verificar aprovação posterior
      localStorage.setItem(PAG_KEY, JSON.stringify({ payment_id: data.payment_id, email: _emailAtual, plano: _planoAtual }));
      iniciarPolling(data.payment_id, _emailAtual, _planoAtual);
      mostrarStep('step-pix');
      setPixStatus('waiting', '⏳ Pagamento em análise pelo banco...');
      document.getElementById('pix-qr').style.display = 'none';
      document.getElementById('pix-code-wrap').style.display = 'none';
      document.getElementById('pix-ticket').style.display = 'none';
    } else {
      throw new Error(data.mensagem || 'Pagamento recusado pelo banco');
    }
  } catch(e) {
    mostrarToast('❌ ' + e.message);
    btn.innerHTML = originalHtml;
    btn.disabled = false;
  }
}

// Formatar número do cartão com espaços
function formatarCartao(input) {
  let v = input.value.replace(/\D/g,'').slice(0,16);
  input.value = v.replace(/(\d{4})(?=\d)/g,'$1 ');
}

function formatarValidade(input) {
  let v = input.value.replace(/\D/g,'').slice(0,4);
  if (v.length >= 2) v = v.slice(0,2) + '/' + v.slice(2);
  input.value = v;
}

function formatarCPF(input) {
  let v = input.value.replace(/\D/g,'').slice(0,11);
  input.value = v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
                 .replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3')
                 .replace(/(\d{3})(\d{1,3})/, '$1.$2');
}

// ── EXIBIR PIX ────────────────────────────────────────────────────────────────
function exibirPix(data) {
  mostrarStep('step-pix');
  document.getElementById('pix-titulo').innerText = data.titulo;
  if (data.qr_base64) {
    document.getElementById('pix-qr').src = 'data:image/png;base64,' + data.qr_base64;
    document.getElementById('pix-qr').style.display = 'block';
  }
  if (data.qr_code) {
    document.getElementById('pix-code').value = data.qr_code;
    document.getElementById('pix-code-wrap').style.display = 'flex';
  }
  if (data.ticket_url) {
    const a = document.getElementById('pix-ticket');
    a.href = data.ticket_url;
    a.style.display = 'inline-flex';
  }
  setPixStatus('waiting', '⏳ Aguardando pagamento...');
}

function setPixStatus(type, msg) {
  const el = document.getElementById('pix-status');
  if (!el) return;
  el.innerText = msg;
  el.style.color = type === 'ok' ? '#00e676' : type === 'err' ? '#ff5252' : '#aaa';
}

function copiarPix() {
  const v = document.getElementById('pix-code')?.value;
  if (!v) return;
  navigator.clipboard.writeText(v)
    .then(() => mostrarToast('✅ Código PIX copiado!'))
    .catch(() => { document.getElementById('pix-code').select(); document.execCommand('copy'); mostrarToast('✅ Copiado!'); });
}

function voltarPlanos() {
  if (_pollingId) { clearInterval(_pollingId); _pollingId = null; _currentPaymentId = null; }
  localStorage.removeItem(PAG_KEY);
  mostrarStep('step-planos');
}

// ── POLLING — CORRIGIDO (guard por payment_id) ────────────────────────────────
let _pollingId        = null;
let _currentPaymentId = null; // ← FIX: evita polling duplo
let _tentativas       = 0;

function iniciarPolling(paymentId, email, plano) {
  // FIX: se já tem polling para este mesmo payment_id, não duplica
  if (_pollingId && _currentPaymentId === paymentId) return;

  if (_pollingId) clearInterval(_pollingId);
  _currentPaymentId = paymentId;
  _tentativas = 0;

  _pollingId = setInterval(async () => {
    _tentativas++;
    if (_tentativas > 72) { // 6 minutos
      clearInterval(_pollingId); _pollingId = null; _currentPaymentId = null;
      setPixStatus('err', '⏰ Tempo esgotado. Gere um novo PIX.');
      localStorage.removeItem(PAG_KEY);
      return;
    }
    try {
      const res = await fetch(`/api/pagamento?action=verificar&payment_id=${paymentId}&email=${encodeURIComponent(email)}&plano=${plano}`);
      const data = await res.json();
      if (data.aprovado) {
        clearInterval(_pollingId); _pollingId = null; _currentPaymentId = null;
        localStorage.removeItem(PAG_KEY);
        onAprovado(data);
      } else if (data.status === 'rejected' || data.status === 'cancelled') {
        clearInterval(_pollingId); _pollingId = null; _currentPaymentId = null;
        localStorage.removeItem(PAG_KEY);
        setPixStatus('err', '❌ Pagamento recusado. Tente novamente.');
      }
    } catch(e) { /* continua */ }
  }, 5000);
}

// ── APROVADO → MODAL DE SUCESSO (não mais toast de 3s) ───────────────────────
function onAprovado(data) {
  setPixStatus('ok', '✅ Pagamento confirmado! Ativando acesso...');

  salvarVipCache({
    email:     data.email,
    senha:     data.senha,
    plano:     _planoAtual,
    expira_em: _planoAtual === 'vitalicio' ? null : new Date(Date.now() + 30*86400000).toISOString(),
    criado:    data.criado,
  });

  // Pequena pausa para o usuário ver o status, depois exibe tela de sucesso
  setTimeout(() => {
    mostrarStep('step-sucesso');
    _preencherTelaSuccesso(data);
  }, 1000);
}

function _preencherTelaSuccesso(data) {
  const elEmail = document.getElementById('sucesso-email');
  const elSenha = document.getElementById('sucesso-senha');
  const elPlano = document.getElementById('sucesso-plano');
  if (elEmail) elEmail.innerText = data.email;
  if (elSenha) elSenha.innerText = data.senha;
  if (elPlano) {
    elPlano.innerText = _planoAtual === 'vitalicio'
      ? '♾️ Plano Vitalício — nunca expira'
      : '📅 Plano Mensal — válido por 30 dias';
  }
}

function copiarSenhaVip() {
  const senha = document.getElementById('sucesso-senha')?.innerText;
  if (!senha) return;
  navigator.clipboard.writeText(senha)
    .then(() => mostrarToast('✅ Senha copiada!'))
    .catch(() => mostrarToast('Senha: ' + senha));
}

function concluirAtivacao() {
  _fecharModal();

  // Remove scripts de anúncios
  document.querySelectorAll('script').forEach(s => {
    if (['5gvci.com','al5sm.com','tag.min.js','omg10.com'].some(d => s.src.includes(d))) s.remove();
  });

  // Remove banner de trial
  const banner = document.getElementById('trial-banner');
  if (banner) banner.remove();
  const header = document.getElementById('mainHeader');
  if (header) header.style.top = '';

  // ✅ LOGIN AUTOMÁTICO: ativa VIP direto sem pedir senha manual
  if (typeof desativarTodosAds === 'function') {
    desativarTodosAds();
  } else {
    // Fallback: garante que o localStorage está marcado e recarrega
    localStorage.setItem('streamflix_vip', 'true');
    setTimeout(() => location.reload(), 500);
  }
}

// ── RECUPERAR SENHA ───────────────────────────────────────────────────────────
function abrirRecuperarSenha() {
  const email = document.getElementById('vipEmail')?.value?.trim();
  const msg = document.getElementById('vipMsg');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    if (msg) { msg.innerText = 'Digite seu e-mail primeiro.'; msg.style.display = 'block'; }
    return;
  }
  // Redireciona para Telegram com mensagem pré-preenchida
  const texto = encodeURIComponent(`Olá! Preciso recuperar minha senha StreamFlix. E-mail: ${email}`);
  window.open(`https://t.me/streamflixofc?text=${texto}`, '_blank');
}

// ── UTILS ─────────────────────────────────────────────────────────────────────
function _getJson(key) { try { return JSON.parse(localStorage.getItem(key)); } catch(e) { return null; } }

function _diasRestantes(expira_em) {
  if (!expira_em) return '∞';
  const diff = new Date(expira_em) - new Date();
  return Math.max(0, Math.ceil(diff / 86400000));
}

// Expõe para popstate no app.js
window._fecharModalPagamento = (fromPS) => _fecharModal(fromPS);
