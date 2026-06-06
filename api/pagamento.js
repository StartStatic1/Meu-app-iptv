// api/pagamento.js — Mercado Pago PIX + Auto-cadastro Supabase
// POST /api/pagamento?action=criar_pix   body: { email, plano }
// GET  /api/pagamento?action=verificar&payment_id=xxx&email=xxx&plano=xxx

const MP_TOKEN = process.env.MP_ACCESS_TOKEN;

// Supabase — chave pública funciona pois tabela está sem RLS
const SB_URL = 'https://gkujbjpvphuvrejpvvtz.supabase.co';
const SB_KEY = 'sb_publishable_C9FMCjUyZnlzhINK2KZXWQ_ahpGu0yy';

const PLANOS = {
  mensal:   { valor: 7.99,  titulo: 'StreamFlix Premium — 1 Mês',     dias: 30  },
  vitalicio:{ valor: 60.00, titulo: 'StreamFlix Premium — Vitalício',  dias: null },
};

// ─── helpers ──────────────────────────────────────────────────────────────────
function gerarSenhaAleatoria() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

async function supabaseUpsertVip(email, plano) {
  const p = PLANOS[plano];
  const expira_em = p.dias
    ? new Date(Date.now() + p.dias * 86400000).toISOString()
    : null;

  // Verifica se usuário já existe
  const checkRes = await fetch(
    `${SB_URL}/rest/v1/streamflix_users?email=eq.${encodeURIComponent(email)}&select=email,senha`,
    { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }
  );
  const existing = await checkRes.json();

  if (existing && existing.length > 0) {
    // Já existe → só atualiza status e expiração
    await fetch(
      `${SB_URL}/rest/v1/streamflix_users?email=eq.${encodeURIComponent(email)}`,
      {
        method: 'PATCH',
        headers: {
          apikey: SB_KEY,
          Authorization: `Bearer ${SB_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ status: 'VIP', plano, expira_em }),
      }
    );
    return { senha: existing[0].senha, criado: false };
  } else {
    // Novo usuário → cria com senha aleatória
    const senha = gerarSenhaAleatoria();
    await fetch(`${SB_URL}/rest/v1/streamflix_users`, {
      method: 'POST',
      headers: {
        apikey: SB_KEY,
        Authorization: `Bearer ${SB_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ email, senha, status: 'VIP', plano, expira_em }),
    });
    return { senha, criado: true };
  }
}

// ─── handler ──────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!MP_TOKEN) {
    return res.status(500).json({ error: 'MP_ACCESS_TOKEN não configurado no Vercel.' });
  }

  const { action } = req.query;

  // ── CRIAR PIX ──────────────────────────────────────────────────────────────
  if (action === 'criar_pix') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

    let body;
    try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
    catch(e) { return res.status(400).json({ error: 'Body inválido' }); }

    const { email, plano } = body || {};
    if (!email || !plano || !PLANOS[plano]) {
      return res.status(400).json({ error: 'email e plano obrigatórios (mensal | vitalicio)' });
    }

    const p = PLANOS[plano];

    try {
      const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${MP_TOKEN}`,
          'X-Idempotency-Key': `sf-${plano}-${email}-${Date.now()}`,
        },
        body: JSON.stringify({
          transaction_amount: p.valor,
          description: p.titulo,
          payment_method_id: 'pix',
          payer: {
            email,
            first_name: 'Cliente',
            last_name: 'StreamFlix',
            identification: { type: 'CPF', number: '00000000000' },
          },
        }),
      });

      const mpData = await mpRes.json();
      if (!mpRes.ok || !mpData.id) {
        return res.status(400).json({ error: mpData.message || 'Erro Mercado Pago', details: mpData });
      }

      const pix = mpData.point_of_interaction?.transaction_data;

      return res.status(200).json({
        payment_id: mpData.id,
        qr_code:    pix?.qr_code        || null,
        qr_base64:  pix?.qr_code_base64 || null,
        ticket_url: pix?.ticket_url      || null,
        valor:      p.valor,
        titulo:     p.titulo,
      });

    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // ── VERIFICAR + ATIVAR VIP ─────────────────────────────────────────────────
  if (action === 'verificar') {
    const { payment_id, email, plano } = req.query;
    if (!payment_id || !email || !plano) {
      return res.status(400).json({ error: 'payment_id, email e plano obrigatórios' });
    }

    try {
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${payment_id}`, {
        headers: { Authorization: `Bearer ${MP_TOKEN}` },
      });
      const mpData = await mpRes.json();

      if (mpData.status === 'approved') {
        // Ativa VIP no Supabase automaticamente
        const { senha, criado } = await supabaseUpsertVip(email, plano);
        return res.status(200).json({
          aprovado: true,
          email,
          senha,       // retorna para o app fazer login automático
          criado,      // true = conta nova, false = renovação
        });
      }

      return res.status(200).json({
        aprovado: false,
        status: mpData.status,
      });

    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(400).json({ error: 'action inválida' });
}
