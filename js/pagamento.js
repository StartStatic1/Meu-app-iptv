// ===================== SISTEMA DE PAGAMENTO STREAMFLIX v2 =====================
// Trial 3 dias → tela de planos → email → PIX → polling → VIP automático no Supabase

const TRIAL_DIAS = 3;
const TRIAL_KEY  = 'sf_trial_v2';
const PAG_KEY    = 'sf_pag_v2';
const VIP_CACHE  = 'sf_vip_cache'; // { email, senha, expira_em, plano }

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
  return (Date.now() - t.inicio) / 86400000 >= TRIAL_DIAS;
}

// ── VIP LOCAL (cache Supabase) ────────────────────────────────────────────────
function isVipLocal() {
  // Mantém compatibilidade com sistema antigo
  if (localStorage.getItem('streamflix_vip') === 'true') return true;
  const c = _getJson(VIP_CACHE);
  if (!c) return false;
  // Vitalício: expira_em null
  if (!c.expira_em) return true;
  // Mensal: verifica data
  return new Date(c.expira_em) > new Date();
}

function getVipCache() { return _getJson(VIP_CACHE); }

function salvarVipCache(data) {
  localStorage.setItem(VIP_CACHE, JSON.stringify(data));
  localStorage.setItem('streamflix_vip', 'true'); // compatibilidade
}

function limparVipCache() {
  localStorage.removeItem(VIP_CACHE);
  localStorage.removeItem('streamflix_vip');
}

// ── VERIFICAÇÃO NO SUPABASE (ao abrir o app) ──────────────────────────────────
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
      // Removido manualmente por você no Supabase
      limparVipCache();
      location.reload();
      return;
    }

    // Verifica expiração
    if (data.expira_em && new Date(data.expira_em) < new Date()) {
      // Plano expirado → remove VIP local, mantém email/senha para renovar
      localStorage.removeItem('streamflix_vip');
      localStorage.setItem(VIP_CACHE, JSON.stringify({
        ...cache,
        expira_em: data.expira_em,
        expirado: true,
      }));
      mostrarToast('Seu plano expirou. Renove para continuar!');
      setTimeout(() => abrirModalPagamento(true), 1500);
      return;
    }

    // Atualiza cache com dados frescos do servidor
    salvarVipCache({ ...cache, expira_em: data.expira_em, plano: data.plano });

  } catch(e) { /* falha silenciosa — usa cache local */ }
}

// ── VERIFICAÇÃO GERAL (chamada no initApp) ────────────────────────────────────
async function verificarPagamentoOuTrial() {
  iniciarTrial();

  // Retoma polling se tinha pagamento pendente
  const pend = _getJson(PAG_KEY);
  if (pend?.payment_id) {
    iniciarPolling(pend.payment_id, pend.email, pend.plano);
  }

  // Verifica VIP online em background
  if (isVipLocal()) {
    verificarVipOnline();
    return;
  }

  // Trial expirou → bloqueia
  if (trialExpirou()) {
    setTimeout(() => abrirModalPagamento(true), 800);
  }
}

// ── MODAL DE PAGAMENTO ────────────────────────────────────────────────────────
function abrirModalPagamento(forcar = false) {
  if (isVipLocal() && !_getJson(VIP_CACHE)?.expirado) return;

  // Pré-preenche email se já tem conta
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
  ['step-planos','step-pix'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = id === stepId ? 'block' : 'none';
  });
}

// ── SELECIONAR PLANO + VALIDAR EMAIL ─────────────────────────────────────────
let _emailAtual = '';
let _planoAtual = '';

async function selecionarPlano(plano) {
  const email = document.getElementById('pag-email')?.value?.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    document.getElementById('pag-email-erro').style.display = 'block';
    document.getElementById('pag-email').focus();
    return;
  }
  document.getElementById('pag-email-erro').style.display = 'none';

  _emailAtual = email;
  _planoAtual = plano;

  const btnId = plano === 'mensal' ? 'btnPagarMensal' : 'btnPagarVitalicio';
  const btn = document.getElementById(btnId);
  const originalHtml = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando PIX...';
  btn.disabled = true;

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
    btn.innerHTML = originalHtml;
    btn.disabled = false;
  }
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
  if (_pollingId) { clearInterval(_pollingId); _pollingId = null; }
  localStorage.removeItem(PAG_KEY);
  mostrarStep('step-planos');
}

// ── POLLING ───────────────────────────────────────────────────────────────────
let _pollingId   = null;
let _tentativas  = 0;

function iniciarPolling(paymentId, email, plano) {
  if (_pollingId) clearInterval(_pollingId);
  _tentativas = 0;

  _pollingId = setInterval(async () => {
    _tentativas++;
    if (_tentativas > 72) { // 6 minutos
      clearInterval(_pollingId); _pollingId = null;
      setPixStatus('err', '⏰ Tempo esgotado. Gere um novo PIX.');
      localStorage.removeItem(PAG_KEY);
      return;
    }

    try {
      const res = await fetch(`/api/pagamento?action=verificar&payment_id=${paymentId}&email=${encodeURIComponent(email)}&plano=${plano}`);
      const data = await res.json();

      if (data.aprovado) {
        clearInterval(_pollingId); _pollingId = null;
        localStorage.removeItem(PAG_KEY);
        onAprovado(data);
      } else if (data.status === 'rejected' || data.status === 'cancelled') {
        clearInterval(_pollingId); _pollingId = null;
        localStorage.removeItem(PAG_KEY);
        setPixStatus('err', '❌ Pagamento recusado. Tente novamente.');
      }
    } catch(e) { /* continua */ }
  }, 5000);
}

// ── APROVADO → ATIVA VIP ──────────────────────────────────────────────────────
function onAprovado(data) {
  setPixStatus('ok', '✅ Pagamento confirmado! Ativando acesso...');

  // Salva credenciais localmente
  salvarVipCache({
    email:     data.email,
    senha:     data.senha,
    plano:     _planoAtual,
    expira_em: _planoAtual === 'vitalicio' ? null : new Date(Date.now() + 30*86400000).toISOString(),
    criado:    data.criado,
  });

  const msg = data.criado
    ? `🎉 VIP ativado! Sua senha de acesso: ${data.senha}`
    : '🎉 Plano renovado com sucesso!';

  setTimeout(() => {
    _fecharModal();
    mostrarToast(msg);
    // Remove ads
    document.querySelectorAll('script').forEach(s => {
      if (['5gvci.com','al5sm.com','tag.min.js','omg10.com'].some(d => s.src.includes(d))) s.remove();
    });
    setTimeout(() => location.reload(), 2000);
  }, 1200);
}

// ── UTILS ─────────────────────────────────────────────────────────────────────
function _getJson(key) { try { return JSON.parse(localStorage.getItem(key)); } catch(e) { return null; } }

// Expõe para popstate no app.js
window._fecharModalPagamento = (fromPS) => _fecharModal(fromPS);
