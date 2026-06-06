// api/pagamento.js — Mercado Pago PIX + Auto-cadastro Supabase + Email
// POST /api/pagamento?action=criar_pix   body: { email, plano }
// GET  /api/pagamento?action=verificar&payment_id=xxx&email=xxx&plano=xxx

const MP_TOKEN   = process.env.MP_ACCESS_TOKEN;
const SB_URL     = 'https://gkujbjpvphuvrejpvvtz.supabase.co';
// ⚠️ SEGURANÇA: usar SUPABASE_SERVICE_KEY no Vercel (não a pública)
const SB_KEY     = process.env.SUPABASE_SERVICE_KEY || 'sb_publishable_C9FMCjUyZnlzhINK2KZXWQ_ahpGu0yy';
const RESEND_KEY = process.env.RESEND_API_KEY; // Cadastre grátis em resend.com

const PLANOS = {
  mensal:    { valor: 7.99,  titulo: 'StreamFlix Premium — 1 Mês',    dias: 30   },
  vitalicio: { valor: 60.00, titulo: 'StreamFlix Premium — Vitalício', dias: null },
};

// ─── helpers ──────────────────────────────────────────────────────────────────
function gerarSenhaAleatoria() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

// ─── Envio de email via Resend (grátis até 3.000 emails/mês) ─────────────────
async function enviarEmailBoasVindas(email, senha, plano) {
  if (!RESEND_KEY) {
    console.warn('[StreamFlix] RESEND_API_KEY não configurada — email não enviado.');
    return;
  }
  const planoLabel = plano === 'vitalicio' ? 'Vitalício ♾️' : 'Mensal (30 dias)';
  const htmlEmail = `
<!DOCTYPE html>
<html lang="pt-BR">
<body style="margin:0;padding:0;background:#080b12;font-family:'Segoe UI',sans-serif;">
  <div style="max-width:480px;margin:0 auto;padding:32px 24px;">
    <h1 style="color:#fff;font-size:28px;font-weight:900;margin:0 0 4px;">
      Stream<span style="color:#00e5ff;">Flix</span>
    </h1>
    <p style="color:#6b7280;font-size:12px;margin:0 0 28px;">Seu acesso VIP foi ativado</p>

    <div style="background:#0f1520;border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:24px;margin-bottom:20px;">
      <p style="color:#9ca3af;font-size:13px;margin:0 0 16px;">🎉 Parabéns! Seu plano <strong style="color:#00e5ff;">${planoLabel}</strong> está ativo.</p>

      <div style="background:#141b28;border-radius:10px;padding:16px;margin-bottom:16px;">
        <p style="color:#6b7280;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px;">Seu E-mail de Acesso</p>
        <p style="color:#fff;font-size:15px;font-weight:700;margin:0;">${email}</p>
      </div>

      <div style="background:linear-gradient(135deg,rgba(0,229,255,0.12),rgba(0,85,255,0.08));border:1px solid rgba(0,229,255,0.25);border-radius:10px;padding:16px;">
        <p style="color:#6b7280;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px;">Sua Senha</p>
        <p style="color:#00e5ff;font-size:24px;font-weight:900;margin:0;letter-spacing:3px;">${senha}</p>
      </div>
    </div>

    <a href="https://streamflixofc.vercel.app" 
       style="display:block;text-align:center;background:linear-gradient(135deg,#e50914,#b00610);color:#fff;text-decoration:none;padding:14px;border-radius:10px;font-weight:900;font-size:14px;margin-bottom:20px;">
      Acessar StreamFlix Agora →
    </a>

    <p style="color:#374151;font-size:11px;text-align:center;margin:0;">
      Guarde este email. Você precisará da senha caso troque de celular.<br>
      Dúvidas? <a href="https://t.me/streamflixofc" style="color:#00e5ff;">Fale conosco no Telegram</a>
    </p>
  </div>
</body>
</html>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'StreamFlix <noreply@streamflixofc.com>',
        to: [email],
        subject: '🎉 Seu acesso VIP StreamFlix está pronto!',
        html: htmlEmail,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      console.error('[StreamFlix] Erro Resend:', err);
    } else {
      console.log('[StreamFlix] Email enviado para:', email);
    }
  } catch (e) {
    console.error('[StreamFlix] Falha ao enviar email:', e.message);
  }
}

// ─── Supabase upsert VIP ───────────────────────────────────────────────────────
async function supabaseUpsertVip(email, plano) {
  const p = PLANOS[plano];
  const expira_em = p.dias
    ? new Date(Date.now() + p.dias * 86400000).toISOString()
    : null;

  const headers = {
    apikey: SB_KEY,
    Authorization: `Bearer ${SB_KEY}`,
    'Content-Type': 'application/json',
  };

  // Verifica se usuário já existe
  const checkRes = await fetch(
    `${SB_URL}/rest/v1/streamflix_users?email=eq.${encodeURIComponent(email)}&select=email,senha`,
    { headers }
  );
  const existing = await checkRes.json();

  if (existing && existing.length > 0) {
    // Já existe → só atualiza status e expiração
    await fetch(
      `${SB_URL}/rest/v1/streamflix_users?email=eq.${encodeURIComponent(email)}`,
      {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify({ status: 'VIP', plano, expira_em }),
      }
    );
    return { senha: existing[0].senha, criado: false };
  } else {
    // Novo usuário → cria com senha aleatória
    const senha = gerarSenhaAleatoria();
    await fetch(`${SB_URL}/rest/v1/streamflix_users`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'return=minimal' },
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

  // ── VERIFICAR + ATIVAR VIP ──────────────────────────────────────────────────
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
        const { senha, criado } = await supabaseUpsertVip(email, plano);

        // Envia email de boas-vindas apenas para contas novas
        if (criado) {
          await enviarEmailBoasVindas(email, senha, plano);
        }

        return res.status(200).json({
          aprovado: true,
          email,
          senha,
          criado,
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
