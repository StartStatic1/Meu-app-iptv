// ===================== SUPABASE / VIP =====================
function getSupabase() {
    if(!meuSupabase) {
        meuSupabase = window.supabase.createClient('https://gkujbjpvphuvrejpvvtz.supabase.co', 'sb_publishable_C9FMCjUyZnlzhINK2KZXWQ_ahpGu0yy');
    }
    return meuSupabase;
}

function isVip() { return localStorage.getItem('streamflix_vip') === 'true'; }

function abrirModalVip() {
    document.getElementById('vipModal').style.display = 'flex';
    addNoScroll();
    history.pushState({ view: 'vip', modal: true }, null, "");
}

function fecharModalVip(fromPopState = false) {
    document.getElementById('vipModal').style.display = 'none';
    removeNoScroll();
    if(!fromPopState && history.state && history.state.view === 'vip') { fromPopState = true; history.back(); }
}

async function fazerLoginVip() {
    const email = document.getElementById('vipEmail').value.trim();
    const senha = document.getElementById('vipSenha').value.trim();
    const btn = document.getElementById('btnLoginBtn');
    const msg = document.getElementById('vipMsg');

    if(!email || !senha) { msg.innerText = "Preencha os campos."; msg.style.display = 'block'; return; }
    btn.innerText = "Verificando..."; btn.disabled = true; msg.style.display = 'none';

    try {
        const supa = getSupabase();
        const { data, error } = await supa.from('streamflix_users').select('*').eq('email', email).eq('senha', senha);
        if(error) throw error;
        if(data && data.length > 0) {
            if(data[0].status === 'VIP') {
                localStorage.setItem('streamflix_vip_email', email);
                localStorage.setItem('streamflix_vip_senha', senha);
                desativarTodosAds();
            } else { msg.innerText = "Sua conta nao tem status VIP."; msg.style.display = 'block'; }
        } else { msg.innerText = "E-mail ou senha incorretos."; msg.style.display = 'block'; }
    } catch(e) { msg.innerText = e.message; msg.style.display = 'block'; }
    finally { btn.innerText = "Entrar na Conta VIP"; btn.disabled = false; }
}

async function verificarStatusVip() {
    const btnVip = document.getElementById('btnOpenVip');
    const menuVipStatus = document.getElementById('menuVipStatus');

    let isVipReal = false;
    const emailSalvo = localStorage.getItem('streamflix_vip_email');
    const senhaSalva = localStorage.getItem('streamflix_vip_senha');

    if(emailSalvo && senhaSalva) {
        try {
            const supa = getSupabase();
            const { data } = await supa.from('streamflix_users').select('*').eq('email', emailSalvo).eq('senha', senhaSalva);
            if(data && data.length > 0 && data[0].status === 'VIP') {
                isVipReal = true;
                localStorage.setItem('streamflix_vip', 'true');
            } else {
                localStorage.removeItem('streamflix_vip');
            }
        } catch(e) {
            isVipReal = isVip();
        }
    } else {
        isVipReal = isVip();
    }

    if(btnVip) btnVip.style.display = isVipReal ? 'none' : 'block';
    if(menuVipStatus) {
        if(isVipReal) {
            menuVipStatus.innerHTML = '<i class="fas fa-crown" style="color:gold"></i> VIP Ativo';
        } else {
            menuVipStatus.innerHTML = '<i class="fas fa-gem" style="color:var(--accent)"></i> Gratuito';
        }
    }
}
