// ===================== ESTADO GLOBAL =====================
let heroItems = [];
let heroIndex = 0;
let heroInterval = null;
let currentTmdbId = null;
let currentItemType = 'movie'; 
let currentSeason = 1;
let currentEpisode = 1;
let currentStreamData = {};
let trailerKeyAtivo = null;
let meuSupabase = null;
let timeoutBusca = null;
let timeoutBuscaTV = null;
let searchType = 'all';
let selectedGenre = null;
let bancoFilmes = null;
let bancoSeries = null;
let bancoTV = null;
let iptvCarregado = { filmes: false, series: false, tv: false };
let adsInjetados = false;
let currentEpisodeData = {};
let nextEpTimer = null;
let touchStartY = 0;
let touchStartX = 0;
let noScrollCount = 0;
let fromPopState = false;
let embedAberto = false;

// Streaming state
let streamingProviderId = 8;
let streamingProviderName = 'Netflix';
let streamingProviderColor = '#e50914';
let streamingType = 'movie';
let streamingGenre = null;
let timeoutBuscaStreaming = null;

// ===================== NO-SCROLL =====================
function addNoScroll() {
    noScrollCount++;
    document.body.classList.add('no-scroll');
    document.documentElement.classList.add('no-scroll');
}
function removeNoScroll() {
    noScrollCount = Math.max(0, noScrollCount - 1);
    if(noScrollCount === 0) {
        document.body.classList.remove('no-scroll');
        document.documentElement.classList.remove('no-scroll');
    }
}
function forceRemoveNoScroll() {
    noScrollCount = 0;
    document.body.classList.remove('no-scroll');
    document.documentElement.classList.remove('no-scroll');
    embedAberto = false;
}

// ===================== SUPABASE / VIP =====================
function getSupabase() {
    if(!window.supabase) return null;
    if(!meuSupabase) {
        meuSupabase = window.supabase.createClient('https://gkujbjpvphuvrejpvvtz.supabase.co', 'sb_publishable_C9FMCjUyZnlzhINK2KZXWQ_ahpGu0yy');
    }
    return meuSupabase;
}
function isVip() {
    if (typeof isVipLocal === 'function') return isVipLocal();
    return localStorage.getItem('streamflix_vip') === 'true';
}
// ─── AVATARES DISPONÍVEIS ────────────────────────────────────────────────────
// Avatares estilo personagem usando DiceBear API (gratuito, sem bloqueio)
const AVATAR_ESTILOS = [
    // Anime / Cartoon
    { id: 'av1',  url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=StreamFlix1&backgroundColor=b6e3f4&clothingColor=3c4f5c&eyebrowType=raisedExcited&eyeType=happy&mouthType=smile' },
    { id: 'av2',  url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=StreamFlix2&backgroundColor=d1d4f9&hairColor=2c1b18&eyeType=wink&mouthType=twinkle' },
    { id: 'av3',  url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=StreamFlix3&backgroundColor=ffd5dc&accessoriesType=kurt&eyebrowType=raised&mouthType=smile' },
    { id: 'av4',  url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=StreamFlix4&backgroundColor=c0aede&eyeType=hearts&mouthType=tongue' },
    { id: 'av5',  url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=StreamFlix5&backgroundColor=b6e3f4&topType=longHairStraight&hairColor=4a312c' },
    { id: 'av6',  url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=StreamFlix6&backgroundColor=ffdbb4&topType=shortHairShortFlat&eyeType=side' },
    // Pixel Art
    { id: 'av7',  url: 'https://api.dicebear.com/9.x/pixel-art/svg?seed=hero1&backgroundColor=1a1a2e&clothing=shirt1' },
    { id: 'av8',  url: 'https://api.dicebear.com/9.x/pixel-art/svg?seed=hero2&backgroundColor=16213e&hair=short01' },
    { id: 'av9',  url: 'https://api.dicebear.com/9.x/pixel-art/svg?seed=hero3&backgroundColor=0f3460' },
    { id: 'av10', url: 'https://api.dicebear.com/9.x/pixel-art/svg?seed=hero4&backgroundColor=533483' },
    // Lorelei (ilustração)
    { id: 'av11', url: 'https://api.dicebear.com/9.x/lorelei/svg?seed=cat1&backgroundColor=0d0d0d&freckles=true' },
    { id: 'av12', url: 'https://api.dicebear.com/9.x/lorelei/svg?seed=wolf1&backgroundColor=111111' },
    { id: 'av13', url: 'https://api.dicebear.com/9.x/lorelei/svg?seed=dragon1&backgroundColor=0a0a0a' },
    { id: 'av14', url: 'https://api.dicebear.com/9.x/lorelei/svg?seed=ninja1&backgroundColor=0d0d0d' },
    // Fun characters
    { id: 'av15', url: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=ghost&backgroundColor=1a1a2e' },
    { id: 'av16', url: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=robot&backgroundColor=16213e' },
    { id: 'av17', url: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=alien&backgroundColor=0f3460' },
    { id: 'av18', url: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=wizard&backgroundColor=1a0a2e' },
    // Bottts (robôs)
    { id: 'av19', url: 'https://api.dicebear.com/9.x/bottts/svg?seed=r2d2&backgroundColor=1e1e2e' },
    { id: 'av20', url: 'https://api.dicebear.com/9.x/bottts/svg?seed=hal9000&backgroundColor=0d1117' },
    { id: 'av21', url: 'https://api.dicebear.com/9.x/bottts/svg?seed=wall-e&backgroundColor=1a1a1a' },
    { id: 'av22', url: 'https://api.dicebear.com/9.x/bottts/svg?seed=terminator&backgroundColor=0a0a0a' },
    // Anime style (Adventurer)
    { id: 'av23', url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=sasuke&backgroundColor=16213e&eyes=variant08' },
    { id: 'av24', url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=naruto&backgroundColor=1a0a00&hair=long01' },
    { id: 'av25', url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=zoro&backgroundColor=001a0a' },
];
const AVATAR_KEY = 'sf_avatar_v2';
const AVATAR_DEFAULT = AVATAR_ESTILOS[0].url;

function getAvatarAtual() { return localStorage.getItem(AVATAR_KEY) || AVATAR_DEFAULT; }
function salvarAvatar(url) { localStorage.setItem(AVATAR_KEY, url); }

// ─── ABRIR MODAL VIP/PERFIL ───────────────────────────────────────────────────
function abrirModalVip() {
    const modal = document.getElementById('vipModal');
    modal.style.display = 'flex';
    addNoScroll();
    history.pushState({ view: 'vip', modal: true }, null, '');
    if (isVip()) {
        mostrarStepPerfil();
    } else {
        mostrarStepLogin();
    }
}

function fecharModalVip(fromPS = false) {
    document.getElementById('vipModal').style.display = 'none';
    removeNoScroll();
    if(!fromPS && history.state && history.state.view === 'vip') { fromPopState = true; history.back(); }
}

function mostrarStepLogin() {
    document.getElementById('vip-step-login').style.display = 'block';
    document.getElementById('vip-step-perfil').style.display = 'none';
}

function mostrarStepPerfil() {
    document.getElementById('vip-step-login').style.display = 'none';
    document.getElementById('vip-step-perfil').style.display = 'block';
    renderPerfilVip();
}

function renderPerfilVip() {
    const cache = (typeof getVipCache === 'function') ? getVipCache() : null;
    const avatar = getAvatarAtual();

    // Avatar
    const avatarEl = document.getElementById('perfilAvatarEmoji');
    if (avatarEl) avatarEl.innerHTML = `<img src="${avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;

    // Nome (email sem domínio)
    const nomeEl = document.getElementById('perfilNome');
    if (nomeEl && cache?.email) {
        nomeEl.textContent = cache.email.split('@')[0];
    }

    // Tag de plano
    const tagEl = document.getElementById('perfilPlanoTag');
    if (tagEl && cache) {
        const isVit = cache.plano === 'vitalicio' || !cache.expira_em;
        tagEl.innerHTML = isVit
            ? `<span style="background:rgba(255,215,0,0.15);color:gold;font-size:10px;font-weight:800;padding:3px 10px;border-radius:20px;border:1px solid rgba(255,215,0,0.3);">♾️ Vitalício</span>`
            : `<span style="background:rgba(0,229,255,0.1);color:var(--accent);font-size:10px;font-weight:800;padding:3px 10px;border-radius:20px;border:1px solid rgba(0,229,255,0.25);">👑 Mensal</span>`;
    }

    // Card de status/dias
    const statusValor = document.getElementById('perfilStatusValor');
    const statusSub = document.getElementById('perfilStatusSub');
    const statusIcon = document.getElementById('perfilStatusIcon');
    const statusLabel = document.getElementById('perfilStatusLabel');

    if (cache) {
        if (!cache.expira_em || cache.plano === 'vitalicio') {
            if (statusIcon) statusIcon.textContent = '♾️';
            if (statusLabel) statusLabel.textContent = 'Plano';
            if (statusValor) statusValor.textContent = 'Vitalício';
            if (statusSub) statusSub.textContent = 'Acesso para sempre • sem renovação';
        } else {
            const expira = new Date(cache.expira_em);
            const hoje = new Date();
            const dias = Math.max(0, Math.ceil((expira - hoje) / 86400000));
            if (statusIcon) statusIcon.textContent = dias > 7 ? '✅' : dias > 0 ? '⚠️' : '❌';
            if (statusLabel) statusLabel.textContent = 'Dias restantes';
            if (statusValor) {
                statusValor.textContent = dias > 0 ? `${dias} dias` : 'Expirado';
                statusValor.style.color = dias > 7 ? '#fff' : dias > 0 ? '#fbbf24' : '#ff5252';
            }
            if (statusSub) {
                const d = expira.toLocaleDateString('pt-BR');
                statusSub.textContent = dias > 0 ? `Renova em ${d}` : `Expirou em ${d}`;
            }
        }
    }

    // Atualiza avatar no menu
    atualizarMenuAvatar();
}

// ─── AVATAR ───────────────────────────────────────────────────────────────────
function abrirEscolhaAvatar() {
    const modal = document.getElementById('avatarModal');
    if (!modal) return;
    const grid = document.getElementById('avatarGrid');
    const atual = getAvatarAtual();
    // Categorias de avatares
    const categorias = [
        { nome: '😄 Cartoon', range: [0,5] },
        { nome: '🎮 Pixel', range: [6,9] },
        { nome: '🎨 Ilustração', range: [10,13] },
        { nome: '😜 Fun', range: [14,17] },
        { nome: '🤖 Robô', range: [18,21] },
        { nome: '⚔️ Anime', range: [22,24] },
    ];
    let html = '';
    categorias.forEach(cat => {
        html += `<div style="grid-column:span 4;font-size:11px;font-weight:700;color:#888;padding:4px 0 2px;letter-spacing:1px;">${cat.nome}</div>`;
        for(let i = cat.range[0]; i <= cat.range[1]; i++) {
            const av = AVATAR_ESTILOS[i];
            const ativo = av.url === atual;
            html += `<div onclick="escolherAvatar('${av.url}')" style="width:60px;height:60px;border-radius:14px;overflow:hidden;cursor:pointer;border:2px solid ${ativo?'var(--accent)':'transparent'};background:rgba(255,255,255,0.04);transition:0.15s;display:flex;align-items:center;justify-content:center;">
                <img src="${av.url}" style="width:54px;height:54px;border-radius:10px;" loading="lazy">
            </div>`;
        }
    });
    grid.innerHTML = html;
    modal.style.display = 'flex';
}

function fecharAvatarModal() {
    const modal = document.getElementById('avatarModal');
    if (modal) modal.style.display = 'none';
}

function escolherAvatar(url) {
    salvarAvatar(url);
    const el = document.getElementById('perfilAvatarEmoji');
    if (el) el.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    atualizarMenuAvatar();
    fecharAvatarModal();
    if (typeof mostrarToast === 'function') mostrarToast('Avatar atualizado!');
}

function atualizarMenuAvatar() {
    const avatar = getAvatarAtual();
    const menuAv = document.getElementById('menu-avatar-emoji');
    if (menuAv) menuAv.innerHTML = `<img src="${avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
}

// ─── SAIR ─────────────────────────────────────────────────────────────────────
function sairContaVip() {
    if (!confirm('Deseja sair da sua conta VIP?')) return;
    if (typeof limparVipCache === 'function') limparVipCache();
    localStorage.removeItem('streamflix_vip');
    fecharModalVip();
    verificarStatusVip();
    if (typeof mostrarBannerTrialOuVip === 'function') mostrarBannerTrialOuVip();
    if (typeof mostrarToast === 'function') mostrarToast('Você saiu da conta VIP.');
}

// ─── TOGGLE SENHA ─────────────────────────────────────────────────────────────
function toggleSenhaVip() {
    const input = document.getElementById('vipSenha');
    const icon = document.getElementById('iconSenhaVip');
    if (!input) return;
    if (input.type === 'password') {
        input.type = 'text';
        if (icon) { icon.classList.remove('fa-eye'); icon.classList.add('fa-eye-slash'); }
    } else {
        input.type = 'password';
        if (icon) { icon.classList.remove('fa-eye-slash'); icon.classList.add('fa-eye'); }
    }
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
async function fazerLoginVip() {
    const email = document.getElementById('vipEmail').value.trim();
    const senha = document.getElementById('vipSenha').value.trim();
    const btn = document.getElementById('btnLoginBtn');
    const msg = document.getElementById('vipMsg');
    if(!email || !senha) { msg.innerText = 'Preencha os campos.'; msg.style.display = 'block'; return; }
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...'; btn.disabled = true; msg.style.display = 'none';
    try {
        const supa = getSupabase();
        if(!supa) throw new Error('Serviço indisponível. Tente novamente.');
        const { data, error } = await supa.from('streamflix_users').select('*').eq('email', email).eq('senha', senha);
        if(error) throw error;
        if(data && data.length > 0) {
            const user = data[0];
            if(user.status === 'VIP') {
                if(user.expira_em && new Date(user.expira_em) < new Date()) {
                    msg.innerText = 'Seu plano expirou. Renove para continuar.';
                    msg.style.display = 'block'; return;
                }
                if(typeof salvarVipCache === 'function') {
                    salvarVipCache({ email, senha, plano: user.plano || 'mensal', expira_em: user.expira_em || null });
                }
                desativarTodosAds();
                verificarStatusVip();
                mostrarStepPerfil();
                if (typeof mostrarToast === 'function') mostrarToast('✅ Bem-vindo VIP!');
            } else { msg.innerText = 'Sua conta não tem status VIP.'; msg.style.display = 'block'; }
        } else { msg.innerText = 'E-mail ou senha incorretos.'; msg.style.display = 'block'; }
    } catch(e) { msg.innerText = e.message; msg.style.display = 'block'; }
    finally { btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar na Conta VIP'; btn.disabled = false; }
}

// ─── STATUS VIP (header + menu) ───────────────────────────────────────────────
function verificarStatusVip() {
    const menuVipStatus = document.getElementById('menuVipStatus');
    const cache = (typeof getVipCache === 'function') ? getVipCache() : null;

    if (menuVipStatus) {
        if (isVip() && cache) {
            const isVit = cache.plano === 'vitalicio' || !cache.expira_em;
            if (isVit) {
                menuVipStatus.innerHTML = '<i class="fas fa-crown" style="color:gold"></i> VIP Vitalício ♾️';
            } else {
                const dias = cache.expira_em
                    ? Math.max(0, Math.ceil((new Date(cache.expira_em) - new Date()) / 86400000))
                    : null;
                menuVipStatus.innerHTML = `<i class="fas fa-crown" style="color:gold"></i> VIP — ${dias !== null ? dias + ' dias restantes' : 'Ativo'}`;
            }
        } else {
            menuVipStatus.innerHTML = '<i class="fas fa-gem" style="color:var(--accent)"></i> Gratuito';
        }
    }

    // Avatar no menu
    atualizarMenuAvatar();

    // Botão header
    let btnHeader = document.getElementById('btnHeaderAssinar');
    if (!btnHeader) {
        btnHeader = document.createElement('button');
        btnHeader.id = 'btnHeaderAssinar';
        btnHeader.style.cssText = 'border:none;border-radius:20px;padding:6px 14px;font-size:11px;font-weight:900;cursor:pointer;letter-spacing:0.5px;margin-left:8px;display:inline-flex;align-items:center;gap:4px;';
        const header = document.getElementById('mainHeader');
        if (header) header.appendChild(btnHeader);
    }
    if (isVip()) {
        btnHeader.style.background = 'linear-gradient(90deg,#b8860b,#ffd700)';
        btnHeader.style.color = '#000';
        btnHeader.innerHTML = '<i class="fas fa-crown" style="color:#000;"></i> VIP';
        btnHeader.onclick = () => abrirModalVip();
    } else {
        btnHeader.style.background = 'linear-gradient(90deg,#e50914,#b00610)';
        btnHeader.style.color = '#fff';
        btnHeader.innerHTML = '<i class="fas fa-crown" style="color:gold;"></i> Assinar';
        btnHeader.onclick = () => abrirModalPagamento(true);
    }
}

// ===================== ADS =====================
function desativarTodosAds() {
    const scripts = document.querySelectorAll('script');
    scripts.forEach(s => {
        const src = s.src || '';
        if(src.includes('5gvci.com') || src.includes('al5sm.com') || src.includes('tag.min.js') || src.includes('omg10.com')) s.remove();
    });
    localStorage.setItem('streamflix_vip', 'true');
    localStorage.setItem('push_accepted', 'false');
    const pushPrompt = document.getElementById('pushPromptModal');
    if(pushPrompt) pushPrompt.style.display = 'none';
    mostrarToast("VIP Ativado! Anúncios removidos.");
    setTimeout(() => location.reload(), 1500);
}
function injetarAnuncios() {
    if(isVip()) return; 
    if(adsInjetados) return;
    if(localStorage.getItem('push_accepted') !== 'true') {
        setTimeout(() => { const prompt = document.getElementById('pushPromptModal'); if(prompt) prompt.style.display = 'block'; }, 2500);
    } else { ativarTodosAds(); }
}
function aceitarPush() {
    document.getElementById('pushPromptModal').style.display = 'none';
    localStorage.setItem('push_accepted', 'true');
    ativarTodosAds();
    mostrarToast("Notificações ativadas!");
}
function ativarTodosAds() {
    if(isVip() || adsInjetados) return;
    adsInjetados = true;
    const s1 = document.createElement('script'); s1.src = 'https://5gvci.com/act/files/tag.min.js?z=11081861'; s1.setAttribute('data-cfasync','false'); s1.async = true; document.head.appendChild(s1);
    const s2 = document.createElement('script'); s2.src = 'https://5gvci.com/act/files/tag.min.js?z=11081853'; s2.setAttribute('data-cfasync','false'); s2.async = true; document.head.appendChild(s2);
    const s3 = document.createElement('script'); s3.dataset.zone = '11081852'; s3.src = 'https://al5sm.com/tag.min.js'; s3.async = true; document.head.appendChild(s3);
}
function dispararDirectLink() {
    if(isVip()) return;
    let a = document.createElement('a'); a.href = 'https://omg10.com/4/11081875'; a.target = '_blank'; a.rel = 'noopener noreferrer';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

// ===================== UTILS =====================
function mostrarToast(msg) {
    let t = document.getElementById('toast-msg'); if(!t) return;
    t.innerText = msg; t.style.opacity = '1'; t.style.transform = 'translateY(0)';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(10px)'; }, 3500);
}
function esc(str) {
    if(!str) return '';
    return str.toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function getWatchedList() { try { return JSON.parse(localStorage.getItem('streamflix_watched_v2')) || {}; } catch(e) { return {}; } }
function saveWatchedList(list) { localStorage.setItem('streamflix_watched_v2', JSON.stringify(list)); }
function getFavList() { try { return JSON.parse(localStorage.getItem('streamflix_favs')) || {}; } catch(e) { return {}; } }
function saveFavList(list) { localStorage.setItem('streamflix_favs', JSON.stringify(list)); }
function limparNomePasta(nome) { return nome.replace(/Filmes\s*\|\s*/i,'').replace(/Séries\s*\|\s*/i,'').trim(); }
function pastaValida(nome) { const proibidos=['JOGOS','REALITY','XXX','RELIGIOSO','ADULTO','+18','24H','CÂMERA','RADIO','OSCAR','TESTE']; return !proibidos.some(p=>(nome||'').toUpperCase().includes(p)); }
function pastaTVValida(nome) { const proibidos=['JOGOS','REALITY','XXX','RELIGIOSO','ADULTO','+18','24H','RADIO','CÂMERA']; return !proibidos.some(p=>(nome||'').toUpperCase().includes(p)); }

function processarTitulo(nomeBruto, nomePasta) {
    let nomeLimpo = nomeBruto || "Sem Título";
    const tags = [];
    const pU = nomePasta ? nomePasta.toUpperCase() : '';
    if(pU.includes('4K')||/4K|UHD|2160p/i.test(nomeLimpo)) tags.push('4K');
    if(/FHD|1080p/i.test(nomeLimpo)) tags.push('FHD');
    if(/HD|720p/i.test(nomeLimpo)) tags.push('HD');
    if(pU.includes('LEGENDADO')||/\[LEG\]|\(LEG\)/i.test(nomeLimpo)) tags.push('LEG');
    else if(pU.includes('DUBLADO')||/\[DUB\]|\(DUB\)/i.test(nomeLimpo)) tags.push('DUB');
    nomeLimpo = nomeLimpo.replace(/(4K|UHD|2160p|FHD|1080p|HD|720p)/ig,'').replace(/\[(DUB|LEG|VOD).*?\]/ig,'').replace(/\((DUB|LEG).*?\)/ig,'').replace(/\|.*?\|/g,'').replace(/-\s*$/,'').replace(/\s+/g,' ').trim(); 
    if(nomeLimpo.length < 2) nomeLimpo = nomeBruto.substring(0,20);
    return { limpo: nomeLimpo, tagsStr: tags.join(',') };
}
function processarTV(nomeBruto) {
    let nomeLimpo = nomeBruto || "Canal";
    const tags = [];
    if(/FHDR/i.test(nomeLimpo)) tags.push('FHDR');
    else if(/FHD/i.test(nomeLimpo)) tags.push('FHD');
    else if(/HD/i.test(nomeLimpo)) tags.push('HD');
    else if(/4K/i.test(nomeLimpo)) tags.push('4K');
    else if(/SD/i.test(nomeLimpo)) tags.push('SD');
    const estado = nomeLimpo.match(/\b(SP|RJ|MG|RS|PR|SC|BA|PE|CE|DF|GO|MT|MS|AM|AC|PA|RR|RO|AP|TO|PI|MA|PB|AL|SE|RN)\b/i);
    if(estado && !tags.includes(estado[0].toUpperCase())) tags.push(estado[0].toUpperCase());
    nomeLimpo = nomeLimpo.replace(/\[(FHDR|FHD|HD|4K|SD)\]/ig,'').replace(/\((FHDR|FHD|HD|4K|SD)\)/ig,'').replace(/\b(FHDR|FHD|HD|4K|SD)\b/ig,'').replace(/^[\s\|\-]+|[\s\|\-]+$/g,'').replace(/\s+/g,' ').trim();
    if(!nomeLimpo||nomeLimpo.length<2) nomeLimpo = nomeBruto.replace(/\[.*?\]|\(.*?\)/g,'').replace(/[>\-\|*•]/g,'').trim();
    return { limpo: nomeLimpo, tagsStr: tags.join(',') };
}
function gerarHTMLBadges(tagsStr) {
    if(!tagsStr) return '';
    let html = '';
    tagsStr.split(',').forEach(t => {
        let cor='#000', bg='#fff';
        if(t==='4K'){cor='#fff';bg='#ff1744';}
        if(t==='FHDR'){cor='#fff';bg='#d50000';}
        if(t==='FHD'){cor='#000';bg='#00e5ff';}
        if(t==='HD'){cor='#000';bg='#76ff03';}
        if(t==='DUB'){cor='#000';bg='#00e676';}
        if(t==='LEG'){cor='#fff';bg='#b388ff';}
        if(t.length===2){cor='#fff';bg='#ff9100';}
        html += `<span style="background:${bg};color:${cor};font-size:8px;font-weight:900;padding:3px 5px;border-radius:4px;box-shadow:0 2px 5px rgba(0,0,0,0.5);">${t}</span>`;
    });
    return html;
}

// ===================== TMDB API =====================
async function tmdbFetchWithKey(endpoint, apiKey) {
    const connector = endpoint.includes('?') ? '&' : '?';
    const url = `https://api.themoviedb.org/3${endpoint}${connector}api_key=${apiKey}&language=pt-BR`;
    const res = await fetch(url, { cache: 'no-store' });
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
}
async function tmdbFetch(endpoint) {
    try {
        return await tmdbFetchWithKey(endpoint, TMDB_API_KEY);
    } catch(e) {
        try {
            return await tmdbFetchWithKey(endpoint, TMDB_API_KEY_FALLBACK);
        } catch(e2) {
            return { results: [] };
        }
    }
}
function getTrending(type='movie', page=1) { return tmdbFetch(`/trending/${type}/week?page=${page}`); }
function getDetails(id, type='movie') { return tmdbFetch(`/${type}/${id}?append_to_response=credits,videos,recommendations`); }
function searchTMDB(query, type='', page=1) {
    let url = `/search/multi?query=${encodeURIComponent(query)}&page=${page}`;
    if(type && type !== 'all') url = `/search/${type}?query=${encodeURIComponent(query)}&page=${page}`;
    return tmdbFetch(url);
}
function getDiscover(type='movie', genreId='', page=1, extraParams='') {
    return tmdbFetch(`/discover/${type}?with_genres=${genreId}&sort_by=popularity.desc&page=${page}${extraParams}`);
}
function getUpcoming(page=1) { return tmdbFetch(`/movie/upcoming?page=${page}`); }
function getTrendingBR(type) { return tmdbFetch(`/trending/${type}/day`); }
function getStreamingContent(providerId, type='movie', genreId='', page=1) {
    const extra = `&with_watch_providers=${providerId}&watch_region=BR`;
    return tmdbFetch(`/discover/${type}?sort_by=popularity.desc&page=${page}${genreId?'&with_genres='+genreId:''}${extra}`);
}
function getUpcomingMovies(page=1) {
    return tmdbFetch(`/movie/upcoming?page=${page}&region=BR`);
}

// ===================== RENDER CARDS =====================
function renderCard(item, type, badge='') {
    const tmdbType = item.media_type || type;
    const realType = tmdbType === 'tv' ? 'tv' : 'movie';
    const title = item.title || item.name || 'Sem Título';
    const img = item.poster_path ? `${TMDB_IMG}/w342${item.poster_path}` : '';
    const nota = item.vote_average ? `<span style="position:absolute;bottom:5px;left:5px;background:rgba(0,0,0,0.75);color:gold;font-size:10px;font-weight:900;padding:3px 6px;border-radius:4px;z-index:2;"><i class="fas fa-star"></i> ${item.vote_average.toFixed(1)}</span>` : '';
    const favs = getFavList();
    const isFav = favs[item.id] ? 'active' : '';
    const favBtn = `<div class="card-fav-btn ${isFav}" onclick="event.stopPropagation();toggleFavCard(${item.id},'${realType}','${esc(title)}','${esc(img)}')"><i class="fas fa-heart"></i></div>`;
    const badgeHtml = badge ? `<span class="stream-badge" style="background:${badge.color};color:#fff;">${badge.label}</span>` : '';
    const imgTag = img
        ? `<img src="${img}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='block';">`
        : '';
    const fallbackStyle = img ? 'display:none' : 'display:block';
    return `<div class="card-movie" onclick="abrirDetalhesTMDB(${item.id},'${realType}')">${nota}${favBtn}${badgeHtml}${imgTag}<div class="titulo-fallback" style="${fallbackStyle}">${esc(title)}</div></div>`;
}

function toggleFavCard(id, type, title, img) {
    const list = getFavList();
    if(list[id]) {
        delete list[id];
        mostrarToast("Removido dos favoritos.");
    } else {
        list[id] = { id, type, title, img };
        mostrarToast("❤️ Adicionado aos favoritos!");
    }
    saveFavList(list);
    // Atualiza todos os corações deste item na tela
    document.querySelectorAll('.card-fav-btn').forEach(btn => {
        const card = btn.closest('.card-movie');
        if(card && card.onclick && card.onclick.toString().includes(String(id))) {
            btn.classList.toggle('active', !!list[id]);
        }
    });
    // Atualiza aba Meus se estiver ativa
    if(document.getElementById('view-meus').classList.contains('active')) {
        renderAbaFavs();
    }
}

function renderCarousel(title, items, type, icon='fa-film') {
    if(!items||items.length===0) return '';
    let cards = items.map(i=>renderCard(i,type)).join('');
    return `<div class="section-header"><div class="section-title"><i class="fas ${icon}"></i> ${esc(title)}</div></div><div class="carousel">${cards}</div>`;
}
function renderGrid(items, type) {
    if(!items||items.length===0) return '<p class="loading-text" style="grid-column:span 3;">Nenhum resultado.</p>';
    return items.map(i=>renderCard(i,type)).join('');
}
function renderTop10Carousel(title, items, type) {
    if(!items||items.length===0) return '';
    const cards = items.slice(0,10).map((item,idx) => {
        const tmdbType = item.media_type||type;
        const realType = tmdbType==='tv'?'tv':'movie';
        const img = item.poster_path ? TMDB_IMG+'/w300'+item.poster_path : 'https://placehold.co/220x330/111111/444444?text=Sem+Capa';
        return `<div class="card-movie top10-card" onclick="abrirDetalhesTMDB(${item.id},'${realType}')"><span class="top10-number">${idx+1}</span><img src="${img}" loading="lazy" onerror="this.style.display='none';"></div>`;
    }).join('');
    return `<div class="section-header"><div class="section-title"><i class="fas fa-fire" style="color:#ff4500;"></i> ${esc(title)}</div></div><div class="carousel top10-carousel">${cards}</div>`;
}

// ===================== SPLASH SCREEN =====================
function esconderSplash() {
    setTimeout(() => {
        const splash = document.getElementById('splashScreen');
        if(splash) splash.classList.add('hide');
        setTimeout(() => { if(splash) splash.remove(); }, 600);
    }, 2000);
}

// ===================== APP INIT =====================
async function initApp() {
    esconderSplash();

    // Protegidos: erro aqui nunca trava o app
    try { verificarStatusVip(); } catch(e) { console.warn('verificarStatusVip:', e); }
    try { verificarPagamentoOuTrial(); } catch(e) { console.warn('verificarPagamentoOuTrial:', e); }
    try { injetarAnuncios(); } catch(e) {}
    try { renderGenreChips(); } catch(e) {}
    try { renderStreamingGenreChips(); } catch(e) {}
    try { iniciarAbaMeus(); } catch(e) {}
    try {
        const continueHtml = renderContinueWatching();
        const continueSection = document.getElementById('section-continuar');
        if(continueSection && continueHtml) continueSection.innerHTML = continueHtml;
        else if(continueSection && !continueHtml) continueSection.style.display = 'none';
    } catch(e) {}

    try {
        const [trendingM, trendingS, upcoming, top10BR] = await Promise.all([
            getTrending('movie',1), getTrending('tv',1), getUpcoming(1), getTrendingBR('movie')
        ]);

        const filmes = trendingM.results ? trendingM.results.slice(0,10) : [];
        const series = trendingS.results ? trendingS.results.slice(0,10) : [];
        const lancamentos = upcoming.results ? upcoming.results.slice(0,10) : [];
        const top10 = top10BR.results ? top10BR.results.slice(0,10) : [];

        heroItems = await Promise.all(filmes.slice(0,5).map(f=>getDetails(f.id,'movie')));

        document.getElementById('loading-state').style.display = 'none';
        document.getElementById('conteudo-real').style.display = 'block';

        if(heroItems.length>0) iniciarHeroSlider();

        const contSec = document.getElementById('section-continuar');
        const continueHtmlFinal = renderContinueWatching();
        if(contSec) {
            if(continueHtmlFinal) { contSec.innerHTML = continueHtmlFinal; contSec.style.display = 'block'; }
            else contSec.style.display = 'none';
        }

        let html = '';
        if(top10.length>0) html += renderTop10Carousel('Top 10 Hoje', top10, 'movie');
        if(filmes.length>5) html += renderCarousel('Filmes em Alta', filmes.slice(5), 'movie', 'fa-fire');
        if(series.length>0) html += renderCarousel('Séries em Alta', series, 'tv', 'fa-tv');
        if(lancamentos.length>0) html += renderCarousel('Lançamentos', lancamentos, 'movie', 'fa-star');

        // Seções novas — carregam em paralelo
        const [classicos, trash, acao, terror] = await Promise.all([
            getDiscover('movie', '', 1, '&vote_average.gte=7.5&primary_release_date.lte=2000-12-31&sort_by=vote_average.desc'),
            getDiscover('movie', '27,35', 1, '&primary_release_date.lte=1999-12-31&primary_release_date.gte=1970-01-01'),
            getDiscover('movie', '28', 1),
            getDiscover('movie', '27', 1)
        ]);

        if(classicos.results && classicos.results.length > 0)
            html += renderCarousel('🎬 Clássicos do Cinema', classicos.results.slice(0,10), 'movie', 'fa-film');
        if(trash.results && trash.results.length > 0)
            html += renderCarousel('💀 Trash & Cult (70-90s)', trash.results.slice(0,10), 'movie', 'fa-skull');
        if(acao.results && acao.results.length > 0)
            html += renderCarousel('Ação', acao.results.slice(0,10), 'movie', 'fa-fist-raised');
        if(terror.results && terror.results.length > 0)
            html += renderCarousel('Terror', terror.results.slice(0,10), 'movie', 'fa-ghost');

        document.getElementById('conteudo-dinamico').innerHTML = html;

        // Carrega estreias após home pronta
        carregarEstreias();

    } catch(e) {
        document.getElementById('loading-state').innerHTML = "<div class='loading-text'>Erro de conexão. Tente novamente.</div>";
    }
}

// ===================== HERO SLIDER =====================
function iniciarHeroSlider() {
    atualizarHero();
    if(heroInterval) clearInterval(heroInterval);
    heroInterval = setInterval(() => { heroIndex = (heroIndex+1)%heroItems.length; atualizarHero(); }, 5000);
}
function atualizarHero() {
    const f = heroItems[heroIndex]; if(!f) return;
    const title = f.title||f.name||'Carregando...';
    const backdrop = f.backdrop_path ? `${TMDB_IMG}/w1280${f.backdrop_path}` : (f.poster_path ? `${TMDB_IMG}/w780${f.poster_path}` : '');
    const tags = [];
    if(f.vote_average) tags.push(`<i class="fas fa-star" style="color:gold;"></i> ${f.vote_average.toFixed(1)}`);
    if(f.release_date) tags.push(f.release_date.substring(0,4));
    else if(f.first_air_date) tags.push(f.first_air_date.substring(0,4));
    tags.push(f.first_air_date ? 'SÉRIE' : 'FILME');
    document.getElementById('heroBanner').style.backgroundImage = `url('${backdrop}')`;
    document.getElementById('heroTitle').innerText = title;
    document.getElementById('heroTags').innerHTML = tags.join(' <span style="color:#555;">|</span> ');
    const synopsisEl = document.getElementById('heroSynopsis');
    if(synopsisEl) synopsisEl.innerText = f.overview || "Sinopse não disponível.";
}
function abrirHeroDetalhes() {
    const f = heroItems[heroIndex]; if(!f) return;
    abrirDetalhesTMDB(f.id, f.first_air_date ? 'tv' : 'movie');
}
async function abrirHeroTrailer() {
    const f = heroItems[heroIndex]; if(!f) return;
    const btn = document.getElementById('heroTrailerBtn');
    const txtOriginal = btn.innerHTML;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;
    try {
        if(f.videos&&f.videos.results) {
            const trailer = f.videos.results.find(v=>v.site==='YouTube'&&(v.type==='Trailer'||v.type==='Teaser'));
            if(trailer) { trailerKeyAtivo = trailer.key; abrirTrailer(); }
            else mostrarToast("Trailer não encontrado.");
        } else mostrarToast("Trailer não encontrado.");
    } catch(e) { mostrarToast("Erro ao buscar trailer."); }
    finally { btn.innerHTML = txtOriginal; }
}

// ===================== ABA STREAMING =====================
async function selecionarStreaming(providerId, name, color) {
    streamingProviderId = providerId;
    streamingProviderName = name;
    streamingProviderColor = color;
    streamingGenre = null;

    // Atualiza chips
    document.querySelectorAll('.streaming-chip').forEach(c => c.classList.remove('active'));
    const chip = document.getElementById('chip-' + providerId);
    if(chip) chip.classList.add('active');

    // Limpa busca
    const inp = document.getElementById('inputBuscaStreaming');
    if(inp) inp.value = '';

    await carregarStreaming();
}

async function carregarStreaming(page=1) {
    const container = document.getElementById('resultados-streaming');
    if(!container) return;
    container.innerHTML = `<div class="loading-text" style="grid-column:span 3; margin-top:30px;"><i class="fas fa-spinner fa-spin"></i> Carregando ${streamingProviderName}...</div>`;
    
    try {
        const data = await getStreamingContent(streamingProviderId, streamingType, streamingGenre||'', page);
        const items = data.results || [];
        if(items.length === 0) {
            container.innerHTML = `<p class="loading-text" style="grid-column:span 3;">Nenhum conteúdo encontrado para ${streamingProviderName}.</p>`;
            return;
        }
        container.innerHTML = renderGrid(items, streamingType);
    } catch(e) {
        container.innerHTML = `<p class="loading-text" style="grid-column:span 3;">Erro ao carregar.</p>`;
    }
}

function setStreamingType(type) {
    streamingType = type;
    document.querySelectorAll('.streaming-type-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('stype-' + type).classList.add('active');
    streamingGenre = null;
    renderStreamingGenreChips();
    carregarStreaming();
}

function renderStreamingGenreChips() {
    const container = document.getElementById('streamingGenreChips');
    if(!container) return;
    const genres = streamingType === 'tv' ? TMDB_GENRES.tv : TMDB_GENRES.movie;
    let html = `<div class="genre-chip ${!streamingGenre?'active':''}" onclick="filtrarStreamingGenero(null)">Todos</div>`;
    genres.forEach(g => {
        html += `<div class="genre-chip ${streamingGenre==g.id?'active':''}" onclick="filtrarStreamingGenero(${g.id})">${esc(g.name)}</div>`;
    });
    container.innerHTML = html;
}

function filtrarStreamingGenero(genreId) {
    streamingGenre = genreId;
    renderStreamingGenreChips();
    carregarStreaming();
}

async function buscarNoStreaming() {
    clearTimeout(timeoutBuscaStreaming);
    const query = document.getElementById('inputBuscaStreaming').value.trim();
    const container = document.getElementById('resultados-streaming');
    if(query.length < 3) { carregarStreaming(); return; }
    container.innerHTML = `<div class="loading-text" style="grid-column:span 3;"><i class="fas fa-spinner fa-spin"></i> Buscando...</div>`;
    timeoutBuscaStreaming = setTimeout(async () => {
        try {
            const d = await searchTMDB(query, streamingType === 'tv' ? 'tv' : 'movie', 1);
            const items = d.results || [];
            container.innerHTML = items.length > 0 ? renderGrid(items, streamingType) : `<p class="loading-text" style="grid-column:span 3;">Nenhum resultado.</p>`;
        } catch(e) { container.innerHTML = `<p class="loading-text" style="grid-column:span 3;">Erro.</p>`; }
    }, 600);
}

// ===================== CALENDÁRIO DE ESTREIAS =====================
async function carregarEstreias() {
    // Chamado após home carregar — popula aba Meus > Estreias
    try {
        const data = await getUpcomingMovies(1);
        const items = (data.results || []).filter(m => m.release_date && new Date(m.release_date) > new Date()).slice(0, 15);
        
        // Popular o container da aba Meus > Estreias
        const listaContainer = document.getElementById('conteudo-estreias-lista');
        if (!items.length) {
            if(listaContainer) listaContainer.innerHTML = `<p class="loading-text" style="margin-top:30px;"><i class="fas fa-calendar-alt" style="color:#e040fb;font-size:30px;display:block;margin-bottom:10px;"></i>Nenhuma estreia disponível.</p>`;
            return;
        }

        let html = '';
        items.forEach(movie => {
            const poster = movie.poster_path ? `${TMDB_IMG}/w200${movie.poster_path}` : 'https://placehold.co/100x150/111111/444444?text=?';
            const date = new Date(movie.release_date + 'T00:00:00');
            const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
            const nota = movie.vote_average ? `⭐ ${movie.vote_average.toFixed(1)}` : '';
            const genres = (movie.genre_ids || []).slice(0,2).map(id => {
                const g = TMDB_GENRES.movie.find(x => x.id === id);
                return g ? g.name : '';
            }).filter(Boolean).join(' · ');
            html += `<div class="estreia-card" onclick="abrirDetalhesTMDB(${movie.id},'movie')">
                <img class="estreia-poster" src="${poster}" loading="lazy" onerror="this.src='https://placehold.co/50x75/111111/444444?text=?'">
                <div class="estreia-info">
                    <div class="estreia-title">${esc(movie.title)}</div>
                    <div class="estreia-date"><i class="fas fa-calendar"></i> ${dateStr}</div>
                    <div class="estreia-meta">${nota}${nota&&genres?' · ':''}${genres}</div>
                </div>
            </div>`;
        });

        if(listaContainer) listaContainer.innerHTML = html;
    } catch(e) { /* silencioso */ }
}

// ===================== ABA MEUS =====================
function iniciarAbaMeus() {
    renderAbaFavs();
    renderAbaVistos();
}

function mudarMeusTab(tab) {
    document.querySelectorAll('.meus-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.meus-content').forEach(c => c.classList.remove('active'));
    document.getElementById('meus-tab-' + tab).classList.add('active');
    document.getElementById('meus-' + tab).classList.add('active');
    if (tab === 'estreias') {
        const lista = document.getElementById('conteudo-estreias-lista');
        if (lista && lista.querySelector('.fa-spinner')) carregarEstreias();
    }
}

function renderAbaFavs() {
    const container = document.getElementById('conteudo-favs');
    if(!container) return;
    const list = getFavList();
    const items = Object.values(list).reverse();
    if(items.length === 0) {
        container.innerHTML = `<p class="loading-text" style="grid-column:span 3; margin-top:30px;"><i class="fas fa-heart" style="color:#ff4081;font-size:30px;display:block;margin-bottom:10px;"></i>Nenhum favorito ainda.<br><span style="font-size:11px;">Toque no ❤️ nos cards.</span></p>`;
        return;
    }
    container.innerHTML = items.map(item => {
        const img = item.img || 'https://placehold.co/220x330/111111/444444?text=Sem+Capa';
        return `<div class="card-movie" onclick="abrirDetalhesTMDB(${item.id},'${item.type||'movie'}')">
            <div class="card-fav-btn active" onclick="event.stopPropagation();toggleFavCard(${item.id},'${item.type||'movie'}','${esc(item.title)}','${esc(img)}')"><i class="fas fa-heart"></i></div>
            <img src="${img}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='block';">
            <div class="titulo-fallback" style="display:none">${esc(item.title)}</div>
        </div>`;
    }).join('');
}

function renderAbaVistos() {
    const container = document.getElementById('conteudo-vistos');
    if(!container) return;
    const list = getWatchedList();
    const items = Object.values(list).reverse();
    if(items.length === 0) {
        container.innerHTML = `<p class="loading-text" style="grid-column:span 3; margin-top:30px;"><i class="fas fa-check-circle" style="color:#00e676;font-size:30px;display:block;margin-bottom:10px;"></i>Nenhum assistido ainda.</p>`;
        return;
    }
    container.innerHTML = items.map(item => {
        const img = item.img || 'https://placehold.co/220x330/111111/444444?text=Sem+Capa';
        return `<div class="card-movie" onclick="abrirDetalhesTMDB(${item.id},'${item.type||'movie'}')">
            <div class="continue-remove" onclick="event.stopPropagation();removerDoHistorico(event,'${item.id}')"><i class="fas fa-times"></i></div>
            <img src="${img}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='block';">
            <div class="titulo-fallback" style="display:none">${esc(item.title)}</div>
        </div>`;
    }).join('');
}

// ===================== BUSCA GLOBAL =====================
function renderGenreChips() {
    const container = document.getElementById('genreChips'); if(!container) return;
    const genres = searchType==='tv' ? TMDB_GENRES.tv : TMDB_GENRES.movie;
    let html = `<div class="genre-chip ${!selectedGenre?'active':''}" onclick="filtrarGenero(null)">Todos</div>`;
    genres.forEach(g => {
        html += `<div class="genre-chip ${selectedGenre==g.id?'active':''}" onclick="filtrarGenero(${g.id})">${esc(g.name)}</div>`;
    });
    container.innerHTML = html;
}
function setSearchType(type) {
    searchType = type;
    document.querySelectorAll('.type-btn').forEach(b=>b.classList.remove('active'));
    const typeBtn = document.getElementById('type-'+type);
    if(typeBtn) typeBtn.classList.add('active');
    selectedGenre = null; renderGenreChips();
    const query = document.getElementById('inputBuscaGlobal').value.trim();
    if(query.length>=3||selectedGenre) pesquisarGlobal();
}
function filtrarGenero(genreId) { selectedGenre=genreId; renderGenreChips(); pesquisarGlobal(); }
async function pesquisarGlobal() {
    clearTimeout(timeoutBusca);
    const queryEl = document.getElementById('inputBuscaGlobal');
    const query = queryEl ? queryEl.value.trim() : '';
    const container = document.getElementById('resultados-global');
    if(query.length<3&&!selectedGenre) {
        if(container) container.innerHTML = `<p class="loading-text" style="grid-column:span 3;margin-top:40px;">Digite pelo menos 3 letras ou escolha um gênero.</p>`;
        return;
    }
    if(container) container.innerHTML = `<div class="loading-text" style="grid-column:span 3;"><i class="fas fa-spinner fa-spin"></i> Buscando...</div>`;
    timeoutBusca = setTimeout(async () => {
        try {
            let items = [];
            if(selectedGenre) {
                const type = searchType==='all'?'movie':searchType;
                const d = await getDiscover(type, selectedGenre, 1);
                items = d.results||[];
                if(searchType==='all') { const d2=await getDiscover('tv',selectedGenre,1); items=items.concat(d2.results||[]); }
            } else {
                const type = searchType==='all'?'':searchType;
                const d = await searchTMDB(query, type, 1);
                items = d.results||[];
            }
            if(container) container.innerHTML = renderGrid(items, searchType==='all'?'movie':searchType);
        } catch(e) { if(container) container.innerHTML = `<p class="loading-text" style="grid-column:span 3;">Erro na busca.</p>`; }
    }, 600);
}

// ===================== DETALHES TMDB =====================
async function abrirDetalhesTMDB(tmdbId, type) {
    currentTmdbId = tmdbId;
    currentItemType = type;
    currentSeason = 1;
    currentEpisode = 1;

    const btnPlayFilme = document.getElementById('btnPlayFilme');
    if(btnPlayFilme) {
        btnPlayFilme.disabled = false;
        btnPlayFilme.innerHTML = '<i class="fas fa-play"></i> <span>Assistir</span>';
        btnPlayFilme.style.pointerEvents = 'auto';
        btnPlayFilme.style.display = 'flex';
        btnPlayFilme.onclick = () => abrirMenuServidoresDetalhes();
    }

    document.getElementById('dpTitle').innerText = 'Carregando...';
    document.getElementById('dpTmdbMeta').innerHTML = '';
    document.getElementById('dpDirector').innerText = '';
    document.getElementById('dpSynopsis').innerText = 'Aguarde...';
    document.getElementById('dpCastContainer').style.display = 'none';
    document.getElementById('dpEpisodes').style.display = 'none';
    document.getElementById('dpSimilarContainer').style.display = 'none';
    document.getElementById('btnTrailer').style.display = 'none';
    trailerKeyAtivo = null;

    document.getElementById('detailsPage').classList.add('active');
    addNoScroll();
    history.pushState({ view: 'details', modal: true }, null, "");

    try {
        const details = await getDetails(tmdbId, type);
        const title = details.title||details.name||'Sem Título';
        const backdrop = details.backdrop_path ? `${TMDB_IMG}/original${details.backdrop_path}` : (details.poster_path ? `${TMDB_IMG}/w780${details.poster_path}` : 'https://placehold.co/800x600/111111/444444?text=Sem+Imagem');
        const poster = details.poster_path ? `${TMDB_IMG}/w300${details.poster_path}` : 'https://placehold.co/300x450/111111/444444?text=Sem+Capa';

        document.getElementById('dpTitle').innerText = title;
        document.getElementById('dpPoster').style.backgroundImage = `url('${backdrop}')`;

        const ano = (details.release_date||details.first_air_date||"").substring(0,4);
        const nota = details.vote_average ? details.vote_average.toFixed(1) : "";
        const generos = details.genres ? details.genres.map(g=>g.name).slice(0,3).join(', ') : "";
        const duracao = details.runtime ? `${details.runtime} min` : (details.episode_run_time&&details.episode_run_time[0] ? `${details.episode_run_time[0]} min/ep` : "");
        document.getElementById('dpTmdbMeta').innerHTML = `<i class="fas fa-star" style="color:gold;"></i> ${nota} &nbsp;&bull;&nbsp; ${ano} &nbsp;&bull;&nbsp; ${generos} ${duracao?'&nbsp;&bull;&nbsp;'+duracao:''}`;

        if(details.credits&&details.credits.crew) {
            const dir = details.credits.crew.find(c=>c.job==='Director'||c.job==='Creator');
            if(dir) document.getElementById('dpDirector').innerText = `Dirigido/Criado por ${dir.name}`;
        }

        let synopsis = details.overview;
        if(!synopsis || synopsis.length < 20) {
            try {
                const enData = await tmdbFetchWithKey(`/${type}/${tmdbId}`, TMDB_API_KEY);
                synopsis = enData.overview || synopsis;
            } catch(e) {}
        }
        document.getElementById('dpSynopsis').innerText = synopsis || "Sinopse indisponível.";

        if(details.videos&&details.videos.results) {
            const trailer = details.videos.results.find(v=>v.site==='YouTube'&&(v.type==='Trailer'||v.type==='Teaser'));
            if(trailer) { trailerKeyAtivo = trailer.key; document.getElementById('btnTrailer').style.display = 'flex'; }
        }

        if(details.credits&&details.credits.cast&&details.credits.cast.length>0) {
            let htmlCast = '';
            details.credits.cast.slice(0,15).forEach(ator => {
                const foto = ator.profile_path ? `${TMDB_IMG}/w200${ator.profile_path}` : 'https://placehold.co/150x150/333333/888888?text=Ator';
                htmlCast += `<div class="cast-item" onclick="abrirAtor(${ator.id})"><img src="${foto}" class="cast-img" loading="lazy"><div class="cast-name">${esc(ator.name)}</div><div class="cast-char">${esc(ator.character)}</div></div>`;
            });
            document.getElementById('dpCast').innerHTML = htmlCast;
            document.getElementById('dpCastContainer').style.display = 'block';
        }

        if(details.recommendations&&details.recommendations.results&&details.recommendations.results.length>0) {
            let htmlSim = '';
            details.recommendations.results.slice(0,10).forEach(rec => { htmlSim += renderCard(rec, rec.media_type||type); });
            document.getElementById('dpSimilar').innerHTML = htmlSim;
            document.getElementById('dpSimilarContainer').style.display = 'block';
        }

        if(type==='tv'&&details.seasons) {
            document.getElementById('dpEpisodes').style.display = 'block';
            if(btnPlayFilme) btnPlayFilme.style.display = 'none';
            renderEpisodesComNomes(tmdbId, details, title, poster);
        }

        const btnWatched = document.getElementById('btnWatched');
        const list = getWatchedList();
        if(list[tmdbId]) btnWatched.classList.add('active'); else btnWatched.classList.remove('active');

        const btnFav = document.getElementById('btnFav');
        if(btnFav) {
            const listFav = getFavList();
            if(listFav[tmdbId]) btnFav.classList.add('active'); else btnFav.classList.remove('active');
        }

        currentStreamData = { id: tmdbId, title: title, img: poster, type: type };

    } catch(err) { document.getElementById('dpSynopsis').innerText = "Erro ao carregar detalhes."; }
}

// ===================== MENUS E REPRODUÇÃO =====================
function abrirMenuServidoresDetalhes() {
    if(document.activeElement) document.activeElement.blur();
    const btnNativo = document.getElementById('btnServerNativo');
    if(btnNativo) {
        btnNativo.onclick = () => {
            fecharMenuServidores();
            buscarEReproduzirNativo(currentStreamData.title, currentItemType);
        };
    }
    document.getElementById('serverModal').classList.add('active');
    const overlay = document.getElementById('sheetOverlay');
    if(overlay) { overlay.style.zIndex = "3600"; overlay.classList.add('active'); }
    addNoScroll();
    history.pushState({ view: 'servers', modal: true }, null, "");
}

async function buscarEReproduzirNativo(title, type) {
    mostrarToast("Procurando no CDN...");
    try {
        let action = type==='tv' ? 'get_series' : 'get_vod_streams';
        const res = await fetch(`/api/iptv?action=${action}`);
        const data = await res.json();
        const termo = title.toLowerCase();
        const matches = data.filter(item => (item.name||'').toLowerCase().includes(termo));
        if(matches.length>0) {
            let match = matches.find(m=>!/(4k|uhd|2160p)/i.test((m.name||'').toLowerCase()));
            if(!match) match = matches[0];
            const isVod = type!=='tv';
            const streamId = isVod ? match.stream_id : match.series_id;
            const ext = match.container_extension||'mp4';
            if(isVod) {
                dispararPlayer(streamId, 'vod', ext, title);
            } else {
                const r = await fetch(`/api/iptv?action=get_series_info&series_id=${streamId}`);
                const d = await r.json();
                if(d.episodes&&d.episodes['1']&&d.episodes['1'][0]) {
                    const ep = d.episodes['1'][0];
                    dispararPlayer(ep.id, 'episode', ep.container_extension||'mp4', title);
                } else mostrarToast("Episódios não encontrados.");
            }
        } else {
            mostrarToast("Não disponível no CDN. Tente Web.");
            setTimeout(() => {
                document.getElementById('serverModal').classList.add('active');
                const overlay = document.getElementById('sheetOverlay');
                if(overlay) { overlay.style.zIndex="3600"; overlay.classList.add('active'); }
            }, 1500);
        }
    } catch(e) { mostrarToast("Erro CDN: "+e.message); }
}

function abrirPlayerWeb(servidor) {
    if(!currentTmdbId) return;

    document.getElementById('serverModal').classList.remove('active');
    const overlay = document.getElementById('sheetOverlay');
    if(overlay) { overlay.classList.remove('active'); setTimeout(()=>overlay.style.zIndex="",300); }

    localStorage.setItem('streamflix_last_server', servidor);

    const modal = document.getElementById('embedModal');
    const frame = document.getElementById('embedFrame');
    
    let finalUrl = getEmbedUrl(servidor, currentTmdbId, currentItemType, currentSeason, currentEpisode);
    if(!finalUrl) { mostrarToast("Servidor indisponível."); return; }

    salvarProgresso(currentTmdbId, currentItemType, currentStreamData.title||'', currentStreamData.img||'', currentSeason, currentEpisode);
    dispararDirectLink();

    if(nextEpTimer) clearTimeout(nextEpTimer);
    const overlayExist = document.getElementById('nextEpOverlay');
    if(overlayExist) overlayExist.remove();

    frame.src = finalUrl;
    
    setTimeout(() => {
        modal.style.display = 'flex';
        embedAberto = true;
        addNoScroll();
        
        if(history.state&&history.state.view==='servers') {
            history.replaceState({ view: 'embed', modal: true }, null, "");
        } else {
            history.pushState({ view: 'embed', modal: true }, null, "");
        }
        
        if(currentItemType==='tv') {
            const nextSeason = currentSeason;
            const nextEp = currentEpisode+1;
            const tmdbId = currentTmdbId;
            nextEpTimer = setTimeout(() => {
                mostrarOverlayProximoEp(tmdbId, nextSeason, nextEp, currentStreamData.title||'', currentStreamData.img||'');
            }, 20*60*1000);
        }

        try { 
            if(screen.orientation&&screen.orientation.lock) screen.orientation.lock('landscape').catch(()=>{});
            if(document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(()=>{});
        } catch(e) {}
    }, 100);
}

function reproduzirEpisodioTMDB(tmdbId, season, episode) {
    currentSeason = season;
    currentEpisode = episode;
    abrirMenuServidoresDetalhes();
}

function toggleEpWatchedTMDB(event, epId, title, thumb) {
    event.stopPropagation();
    const list = getWatchedList(); const el = event.currentTarget;
    if(list[epId]) { delete list[epId]; el.classList.remove('active'); }
    else { list[epId] = { id: epId, title: title, img: thumb, type: 'episode', ext: 'mp4' }; el.classList.add('active'); }
    saveWatchedList(list);
}
function toggleWatchedGlobal() {
    if(!currentStreamData.id) return;
    const list = getWatchedList(); const btn = document.getElementById('btnWatched');
    if(list[currentStreamData.id]) { delete list[currentStreamData.id]; btn.classList.remove('active'); }
    else { list[currentStreamData.id] = currentStreamData; btn.classList.add('active'); }
    saveWatchedList(list);
    renderAbaVistos();
}
function toggleFavGlobal() {
    if(!currentStreamData.id) return;
    const list = getFavList(); const btn = document.getElementById('btnFav');
    if(list[currentStreamData.id]) { delete list[currentStreamData.id]; btn.classList.remove('active'); mostrarToast("Removido."); }
    else { list[currentStreamData.id] = currentStreamData; btn.classList.add('active'); mostrarToast("❤️ Adicionado!"); }
    saveFavList(list);
    renderAbaFavs();
}

function carregarHistorico() {
    renderAbaFavs();
    renderAbaVistos();
}

function removerDoHistorico(event, id) {
    event.stopPropagation();
    const list = getWatchedList(); delete list[id]; saveWatchedList(list);
    renderAbaVistos();
}

// ===================== ATOR =====================
async function abrirAtor(atorId) {
    const modal = document.getElementById('actorModal');
    document.getElementById('actorName').innerText = "Carregando...";
    document.getElementById('actorBio').innerText = "";
    document.getElementById('actorCredits').innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    modal.classList.add('active');
    addNoScroll();
    history.pushState({ view: 'actor', modal: true }, null, "");
    try {
        const pRes = await fetch(`https://api.themoviedb.org/3/person/${atorId}?api_key=${TMDB_API_KEY}&language=pt-BR`);
        const pData = await pRes.json();
        document.getElementById('actorName').innerText = pData.name;
        document.getElementById('actorImg').src = pData.profile_path ? `${TMDB_IMG}/w300${pData.profile_path}` : 'https://placehold.co/150x150/333333/888888?text=Ator';
        let idade = "";
        if(pData.birthday) {
            const nasc = new Date(pData.birthday);
            const ageDifMs = Date.now()-nasc.getTime();
            const ageDate = new Date(ageDifMs);
            const anos = Math.abs(ageDate.getUTCFullYear()-1970);
            const falecido = pData.deathday ? ` • Falecido em ${pData.deathday}` : ` • ${anos} anos`;
            idade = falecido;
        }
        document.getElementById('actorMeta').innerText = pData.birthday ? `Nascido em ${pData.birthday}${idade}` : "";
        document.getElementById('actorPlace').innerText = pData.place_of_birth || "";

        let bio = pData.biography;
        if(!bio || bio.length < 50) {
            try {
                const enRes = await fetch(`https://api.themoviedb.org/3/person/${atorId}?api_key=${TMDB_API_KEY}`);
                const enData = await enRes.json();
                if(enData.biography && enData.biography.length > (bio||'').length) bio = enData.biography + ' [EN]';
            } catch(e) {}
        }
        if((!bio || bio.length < 100) && pData.imdb_id) {
            try {
                const wmRes = await fetch(`https://api.watchmode.com/v1/person/${pData.imdb_id}/?apiKey=${WATCHMODE_API_KEY}`);
                if(wmRes.ok) {
                    const wmData = await wmRes.json();
                    if(wmData.bio && wmData.bio.length > (bio||'').length) bio = wmData.bio;
                }
            } catch(e) {}
        }
        document.getElementById('actorBio').innerText = bio || "Biografia indisponível.";

        const cRes = await fetch(`https://api.themoviedb.org/3/person/${atorId}/combined_credits?api_key=${TMDB_API_KEY}&language=pt-BR`);
        const cData = await cRes.json();
        if(cData.cast&&cData.cast.length>0) {
            const obras = cData.cast.sort((a,b)=>b.popularity-a.popularity).slice(0,20);
            document.getElementById('actorCredits').innerHTML = renderGrid(obras, 'movie');
        } else { document.getElementById('actorCredits').innerHTML = "Nenhuma obra encontrada."; }
    } catch(e) { document.getElementById('actorBio').innerText = "Erro ao carregar dados."; }
}

// ===================== TRAILER / EMBED =====================
function abrirTrailer() {
    if(!trailerKeyAtivo) return;
    const frame = document.getElementById('trailerFrame');
    frame.src = `https://www.youtube.com/embed/${trailerKeyAtivo}?autoplay=1&rel=0`;
    document.getElementById('trailerModal').style.display = 'flex';
    addNoScroll();
    history.pushState({ view: 'trailer', modal: true }, null, "");
}
function fecharTrailer(fromPS=false) {
    const frame = document.getElementById('trailerFrame');
    frame.src = 'about:blank';
    document.getElementById('trailerModal').style.display = 'none';
    removeNoScroll();
    if(!fromPS&&history.state&&history.state.view==='trailer') { fromPopState=true; history.back(); }
}
function fecharMenuServidores(fromPS=false) {
    document.getElementById('serverModal').classList.remove('active');
    const overlay = document.getElementById('sheetOverlay');
    if(overlay) { overlay.classList.remove('active'); setTimeout(()=>overlay.style.zIndex="",300); }
    removeNoScroll();
    if(!fromPS&&history.state&&history.state.view==='servers') { fromPopState=true; history.back(); }
}
function fecharEmbedWeb(fromPS=false) {
    const frame = document.getElementById('embedFrame');
    frame.src = 'about:blank';
    frame.removeAttribute('src');
    document.getElementById('embedModal').style.display = 'none';
    embedAberto = false;
    forceRemoveNoScroll();
    if(nextEpTimer) { clearTimeout(nextEpTimer); nextEpTimer = null; }
    const nextOverlay = document.getElementById('nextEpOverlay');
    if(nextOverlay) nextOverlay.remove();
    try { if(screen.orientation&&screen.orientation.unlock) screen.orientation.unlock(); } catch(e) {}
    try { if(document.exitFullscreen) document.exitFullscreen().catch(()=>{}); } catch(e) {}
    if(!fromPS&&history.state&&history.state.view==='embed') { fromPopState=true; history.back(); }
}
function fecharDetalhes(fromPS=false) { 
    document.getElementById('detailsPage').classList.remove('active'); 
    removeNoScroll();
    if(!fromPS&&history.state&&history.state.view==='details') { fromPopState=true; history.back(); }
}
function fecharAtor(fromPS=false) { 
    document.getElementById('actorModal').classList.remove('active'); 
    removeNoScroll();
    if(!fromPS&&history.state&&history.state.view==='actor') { fromPopState=true; history.back(); }
}
function abrirSheetTV(titulo, streamId, tagsStr) {
    const btnPlayTV = document.getElementById('btnPlayTV');
    if(btnPlayTV) {
        btnPlayTV.disabled = false;
        btnPlayTV.innerHTML = '<i class="fas fa-play"></i> Assistir Agora';
        btnPlayTV.onclick = () => dispararPlayer(streamId, 'live', '', titulo);
    }
    document.getElementById('tvTitle').innerText = titulo;
    document.getElementById('tvBadges').innerHTML = gerarHTMLBadges(tagsStr);
    document.getElementById('sheetOverlay').classList.add('active');
    document.getElementById('bottomSheet').classList.add('active');
    addNoScroll();
    history.pushState({ view: 'sheet', modal: true }, null, "");
}
function fecharSheetTV(fromPS=false) { 
    document.getElementById('sheetOverlay').classList.remove('active'); 
    document.getElementById('bottomSheet').classList.remove('active'); 
    removeNoScroll();
    if(!fromPS&&history.state&&history.state.view==='sheet') { fromPopState=true; history.back(); }
}
function fecharTodosOverlays() { fecharMenuServidores(); fecharSheetTV(); fecharMenuPrincipal(); }

async function dispararPlayer(id, tipo, ext, titulo) {
    const btn = (tipo==='live') ? document.getElementById('btnPlayTV') : document.getElementById('btnPlayFilme');
    if(btn) { btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Conectando...`; btn.disabled = true; }
    try {
        // Canais ao vivo IPTV: usa BetterFlix player integrado (sem bloqueio CORS/HLS)
        if(tipo==='live') {
            const iframe = document.getElementById('embedFrame');
            const modal = document.getElementById('embedModal');
            iframe.removeAttribute('srcdoc');
            iframe.src = '';
            iframe.src = `https://betterflix.click/api/player?id=${encodeURIComponent(id)}&type=channel`;
            modal.style.display = 'flex';
            addNoScroll();
            history.pushState({ view: 'embed', modal: true }, null, '');
            return;
        }

        let urlFinal = "";
        if(tipo==='vod') {
            const res = await fetch(`/api/iptv?action=get_movie_url&stream_id=${id}&extension=${ext||'mp4'}`);
            const data = await res.json(); urlFinal = data.url;
        } else if(tipo==='episode') {
            const res = await fetch(`/api/iptv?action=get_series_url&stream_id=${id}&extension=${ext||'mp4'}`);
            const data = await res.json(); urlFinal = data.url;
        }
        if(!urlFinal) throw new Error("Link não retornado.");
        if(window.AndroidApp&&window.AndroidApp.abrirVideoNativo) {
            window.AndroidApp.abrirVideoNativo(urlFinal);
        } else {
            const urlLimpa = urlFinal.replace(/^https?:\/\//,'');
            window.location.href = `intent://${urlLimpa}#Intent;scheme=http;type=video/*;action=android.intent.action.VIEW;end;`;
        }
    } catch(e) { mostrarToast("Erro: "+e.message); }
    finally { setTimeout(()=>{ if(btn) { btn.innerHTML=`<i class="fas fa-play"></i> Assistir`; btn.disabled=false; } },1000); }
}

// ===================== NAVEGAÇÃO =====================
function abrirMenuPrincipal() {
    document.getElementById('menuOverlay').classList.add('active');
    document.getElementById('menuPrincipal').classList.add('active');
    addNoScroll();
    history.pushState({ view: 'menu', modal: true }, null, "");
}
function fecharMenuPrincipal(fromPS=false) {
    document.getElementById('menuOverlay').classList.remove('active');
    document.getElementById('menuPrincipal').classList.remove('active');
    removeNoScroll();
    if(!fromPS&&history.state&&history.state.view==='menu') { fromPopState=true; history.back(); }
}
function acionarMenu(acao) {
    document.getElementById('menuOverlay').classList.remove('active');
    document.getElementById('menuPrincipal').classList.remove('active');
    removeNoScroll();
    if(history.state&&history.state.view==='menu') { fromPopState=true; history.back(); }
    setTimeout(() => {
        if(acao==='iptv') entrarModoIPTV();
        else if(acao==='buscar') mudarAba('view-buscar', null);
        else if(acao==='vip') abrirModalVip();
    }, 100);
}

function mudarAba(idView, btn, originHistory=false) {
    if(idView!=='view-home'&&heroInterval) { clearInterval(heroInterval); heroInterval=null; }
    else if(idView==='view-home'&&!heroInterval&&heroItems.length>0) iniciarHeroSlider();

    document.querySelectorAll('.nav-item').forEach(b=>b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    else { const autoBtn=document.getElementById('nav-'+idView.replace('view-','')); if(autoBtn) autoBtn.classList.add('active'); }

    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
    document.getElementById(idView).classList.add('active');

    const mainHeader = document.getElementById('mainHeader');
    if(mainHeader) mainHeader.style.display = idView==='view-home' ? 'flex' : 'none';

    forceRemoveNoScroll();

    if(!originHistory&&idView!=='view-home') history.pushState({ view: idView }, null, "");
    
    // Ações por aba
    if(idView==='view-buscar') setTimeout(()=>{ const el=document.getElementById('inputBuscaGlobal'); if(el) el.focus(); },300);
    if(idView==='view-meus') { renderAbaFavs(); renderAbaVistos(); }
    if(idView==='view-streaming') {
        // Carrega streaming se for a primeira vez
        const container = document.getElementById('resultados-streaming');
        if(container && container.innerHTML.includes('Carregando')) carregarStreaming();
    }
    if(idView==='view-tv') {
        iniciarTVAoVivo();
    }
}

function entrarModoIPTV() {
    if(heroInterval) { clearInterval(heroInterval); heroInterval=null; }
    document.getElementById('view-iptv').classList.add('active');
    document.querySelectorAll('.view').forEach(v=>{ if(v.id!=='view-iptv') v.classList.remove('active'); });
    document.querySelectorAll('.nav-item').forEach(b=>b.classList.remove('active'));
    const navIptv = document.getElementById('nav-iptv');
    if(navIptv) navIptv.classList.add('active');
    const mainHeader = document.getElementById('mainHeader');
    if(mainHeader) mainHeader.style.display = 'none';
    history.pushState({ view: 'view-iptv' }, null, '');
    carregarIPTFilmes();
}
function mudarAbaIPTV(contentId, tabEl) {
    document.querySelectorAll('.iptv-tab').forEach(t=>t.classList.remove('active'));
    document.querySelectorAll('.iptv-content').forEach(c=>c.classList.remove('active'));
    tabEl.classList.add('active');
    document.getElementById(contentId).classList.add('active');
    if(contentId==='iptv-filmes'&&!iptvCarregado.filmes) carregarIPTFilmes();
    if(contentId==='iptv-series'&&!iptvCarregado.series) carregarIPTSeries();
    if(contentId==='iptv-tv') iniciarIPTVCanais();
}

async function carregarIPTFilmes() {
    iptvCarregado.filmes=true;
    const div = document.getElementById('conteudo-iptv-filmes');
    div.innerHTML = '<p class="loading-text"><i class="fas fa-spinner fa-spin"></i> Carregando...</p>';
    try {
        const res = await fetch('/api/iptv?action=get_vod_categories');
        const cats = await res.json();
        const validas = cats.filter(c=>pastaValida(c.category_name));
        let html = '';
        validas.forEach(cat => {
            html += `<div class="category-item" onclick="abrirGradeIPTV('vod','${cat.category_id}','${esc(limparNomePasta(cat.category_name))}')" ><div style="display:flex;align-items:center;gap:15px;"><i class="fas fa-film category-icon"></i><span class="category-name">${limparNomePasta(cat.category_name)}</span></div><i class="fas fa-chevron-right" style="color:var(--text-muted);font-size:12px;"></i></div>`;
        });
        div.innerHTML = html||'<p class="loading-text">Nenhuma categoria.</p>';
    } catch(e) { div.innerHTML = '<p class="loading-text">Erro ao carregar.</p>'; }
}
async function carregarIPTSeries() {
    iptvCarregado.series=true;
    const div = document.getElementById('conteudo-iptv-series');
    div.innerHTML = '<p class="loading-text"><i class="fas fa-spinner fa-spin"></i> Carregando...</p>';
    try {
        const res = await fetch('/api/iptv?action=get_series_categories');
        const cats = await res.json();
        const validas = cats.filter(c=>pastaValida(c.category_name));
        let html = '';
        validas.forEach(cat => {
            html += `<div class="category-item" onclick="abrirGradeIPTV('series','${cat.category_id}','${esc(limparNomePasta(cat.category_name))}')" ><div style="display:flex;align-items:center;gap:15px;"><i class="fas fa-tv category-icon"></i><span class="category-name">${limparNomePasta(cat.category_name)}</span></div><i class="fas fa-chevron-right" style="color:var(--text-muted);font-size:12px;"></i></div>`;
        });
        div.innerHTML = html||'<p class="loading-text">Nenhuma categoria.</p>';
    } catch(e) { div.innerHTML = '<p class="loading-text">Erro ao carregar.</p>'; }
}
async function carregarIPTTV() {
    iptvCarregado.tv=true;
    const div = document.getElementById('conteudo-iptv-tv');
    div.innerHTML = '<p class="loading-text"><i class="fas fa-spinner fa-spin"></i> Carregando...</p>';
    try {
        const res = await fetch('/api/iptv?action=get_live_categories');
        const cats = await res.json();
        const validas = cats.filter(c=>pastaTVValida(c.category_name));
        let html = '';
        validas.forEach(cat => {
            html += `<div class="category-item" onclick="abrirGradeIPTV('live','${cat.category_id}','${esc(limparNomePasta(cat.category_name))}')" ><div style="display:flex;align-items:center;gap:15px;"><i class="fas fa-broadcast-tower category-icon"></i><span class="category-name">${limparNomePasta(cat.category_name)}</span></div><i class="fas fa-chevron-right" style="color:var(--text-muted);font-size:12px;"></i></div>`;
        });
        div.innerHTML = html||'<p class="loading-text">Nenhuma categoria.</p>';
    } catch(e) { div.innerHTML = '<p class="loading-text">Erro ao carregar.</p>'; }
}

async function abrirGradeIPTV(tipo, catId, nomePasta) {
    document.getElementById('titulo-grade').innerText = nomePasta;
    const container = document.getElementById('conteudo-grade');
    container.innerHTML = `<div class="loading-text" style="grid-column:span 3;"><i class="fas fa-spinner fa-spin"></i> Carregando...</div>`;
    mudarAba('view-grade', null);
    try {
        let action = tipo==='vod'?'get_vod_streams':tipo==='series'?'get_series':'get_live_streams';
        const res = await fetch(`/api/iptv?action=${action}&category_id=${catId}`);
        const lista = await res.json();
        let html = '';
        lista.forEach(item => {
            if(tipo==='live') {
                const fmtd = processarTV(item.name);
                const capa = item.stream_icon;
                html += `<div class="card-movie card-tv" style="height:110px;" onclick="abrirSheetTV('${esc(fmtd.limpo)}','${item.stream_id}','${esc(fmtd.tagsStr)}')"><div class="card-badges">${gerarHTMLBadges(fmtd.tagsStr)}</div>${capa?`<img src="${capa}" loading="lazy" onerror="this.src='https://placehold.co/100x50/333333/666666?text=TV'">`:``}<div class="titulo-tv">${fmtd.limpo}</div></div>`;
            } else {
                const fmtd = processarTitulo(item.name, nomePasta);
                const capa = item.stream_icon||item.cover;
                html += `<div class="card-movie" onclick="abrirDetalhesIPTV('${esc(fmtd.limpo)}','${esc(nomePasta)}','${esc(capa)}','${tipo==='vod'?item.stream_id:item.series_id}','${tipo}','${item.container_extension||'mp4'}','${esc(fmtd.tagsStr)}')"><div class="card-badges">${gerarHTMLBadges(fmtd.tagsStr)}</div>${capa?`<img src="${capa}" loading="lazy" onerror="this.src='https://placehold.co/220x330/111111/444444?text=Sem+Capa';">`:`<img src="https://placehold.co/220x330/111111/444444?text=Sem+Capa"><div class="titulo-fallback">${fmtd.limpo}</div>`}</div>`;
            }
        });
        container.innerHTML = html||`<p class="loading-text" style="grid-column:span 3;">Pasta vazia.</p>`;
    } catch(e) { container.innerHTML = `<p class="loading-text" style="grid-column:span 3;">Erro.</p>`; }
}

async function abrirDetalhesIPTV(titulo, cat, urlCapa, id, tipo, ext, tagsStr) {
    const btnPlayFilme = document.getElementById('btnPlayFilme');
    if(btnPlayFilme) {
        btnPlayFilme.disabled=false;
        btnPlayFilme.innerHTML='<i class="fas fa-play"></i> <span>Assistir</span>';
        btnPlayFilme.style.pointerEvents='auto';
        btnPlayFilme.style.display='flex';
        btnPlayFilme.onclick=()=>dispararPlayer(id, tipo, ext, titulo);
    }
    document.getElementById('dpTitle').innerText = titulo;
    document.getElementById('dpMeta').innerHTML = gerarHTMLBadges(tagsStr)+`<span style="color:var(--text-muted);margin-left:5px;">${cat}</span>`;
    const capa = urlCapa||'https://placehold.co/800x600/111111/444444?text=Sem+Imagem';
    document.getElementById('dpPoster').style.backgroundImage = `url('${capa}')`;
    document.getElementById('dpTmdbMeta').innerHTML=''; document.getElementById('dpDirector').innerText='';
    document.getElementById('dpSynopsis').innerText='Conteúdo do catálogo IPTV direto.';
    document.getElementById('dpCastContainer').style.display='none'; document.getElementById('dpSimilarContainer').style.display='none';
    document.getElementById('btnTrailer').style.display='none'; document.getElementById('dpEpisodes').style.display='none';
    currentTmdbId=null; currentItemType=tipo==='series'?'tv':'movie';
    currentStreamData={ id:id, title:titulo, img:capa, type:tipo, ext:ext };
    if(tipo==='series'&&btnPlayFilme) btnPlayFilme.style.display='none';
    document.getElementById('detailsPage').classList.add('active');
    addNoScroll();
    history.pushState({ view:'details', modal:true }, null, "");
}

let timeoutBuscaTVIPTV = null;
async function pesquisarTV() {
    clearTimeout(timeoutBuscaTVIPTV);
    const inputTv = document.getElementById('inputBuscaIPTVTV'); if(!inputTv) return;
    const query = inputTv.value.toLowerCase();
    const divPastas = document.getElementById('conteudo-iptv-tv');
    const divResultados = document.getElementById('resultados-iptv-tv');
    if(query.length<3) { divPastas.style.display='block'; divResultados.style.display='none'; return; }
    divPastas.style.display='none'; divResultados.style.display='grid';
    divResultados.innerHTML=`<div class="loading-text" style="grid-column:span 3;"><i class="fas fa-spinner fa-spin"></i> Buscando...</div>`;
    timeoutBuscaTVIPTV = setTimeout(async () => {
        if(!bancoTV) { try { const res=await fetch('/api/iptv?action=get_live_streams'); bancoTV=await res.json(); } catch(e) { return; } }
        const resultados = bancoTV.filter(c=>c.name&&c.name.toLowerCase().includes(query)).slice(0,50);
        if(resultados.length===0) { divResultados.innerHTML=`<p class="loading-text" style="grid-column:span 3;">Nenhum canal.</p>`; return; }
        let html="";
        resultados.forEach(item => {
            const fmtd=processarTV(item.name); const capa=item.stream_icon;
            html+=`<div class="card-movie card-tv" style="height:110px;" onclick="abrirSheetTV('${esc(fmtd.limpo)}','${item.stream_id}','${esc(fmtd.tagsStr)}')"><div class="card-badges">${gerarHTMLBadges(fmtd.tagsStr)}</div>${capa?`<img src="${capa}" loading="lazy" onerror="this.src='https://placehold.co/100x50/333333/666666?text=TV'">`:``}<div class="titulo-tv">${fmtd.limpo}</div></div>`;
        });
        divResultados.innerHTML=html;
    }, 800);
}

// ===================== GESTOS =====================
function handleTouchStart(e) { touchStartY=e.changedTouches[0].screenY; touchStartX=e.changedTouches[0].screenX; }
function handleTouchEnd(e) {
    const touchEndY=e.changedTouches[0].screenY;
    const touchEndX=e.changedTouches[0].screenX;
    const deltaY=touchEndY-touchStartY;
    const deltaX=touchEndX-touchStartX;
    if(deltaY>80&&Math.abs(deltaX)<100) {
        const trailer=document.getElementById('trailerModal');
        const embed=document.getElementById('embedModal');
        const menu=document.getElementById('menuPrincipal');
        const sheetTv=document.getElementById('bottomSheet');
        const serverModal=document.getElementById('serverModal');
        if(trailer&&trailer.style.display==='flex') fecharTrailer();
        if(embed&&embed.style.display==='flex') fecharEmbedWeb();
        if(menu&&menu.classList.contains('active')) fecharMenuPrincipal();
        if(sheetTv&&sheetTv.classList.contains('active')) fecharSheetTV();
        if(serverModal&&serverModal.classList.contains('active')) fecharMenuServidores();
    }
}

// ===================== POPSTATE =====================
window.addEventListener('popstate', function(event) {
    if(fromPopState) { fromPopState=false; return; }
    const modais = [
        { id:'adBlockModal', check:(el)=>el&&el.style.display==='flex', close:()=>fecharAdBlock() },
        { id:'pagamentoModal', check:(el)=>el&&el.style.display==='flex', close:()=>window._fecharModalPagamento&&window._fecharModalPagamento(true) },
        { id:'embedModal', check:(el)=>el&&el.style.display==='flex', close:()=>fecharEmbedWeb(true) },
        { id:'trailerModal', check:(el)=>el&&el.style.display==='flex', close:()=>fecharTrailer(true) },
        { id:'serverModal', check:(el)=>el&&el.classList.contains('active'), close:()=>fecharMenuServidores(true) },
        { id:'actorModal', check:(el)=>el&&el.classList.contains('active'), close:()=>fecharAtor(true) },
        { id:'detailsPage', check:(el)=>el&&el.classList.contains('active'), close:()=>fecharDetalhes(true) },
        { id:'bottomSheet', check:(el)=>el&&el.classList.contains('active'), close:()=>fecharSheetTV(true) },
        { id:'menuPrincipal', check:(el)=>el&&el.classList.contains('active'), close:()=>fecharMenuPrincipal(true) },
        { id:'vipModal', check:(el)=>el&&el.style.display==='flex', close:()=>fecharModalVip(true) }
    ];
    for(let modal of modais) {
        const el = document.getElementById(modal.id);
        if(el&&modal.check(el)) { modal.close(); return; }
    }
    if(document.getElementById('view-iptv').classList.contains('active')) {
        document.getElementById('view-iptv').classList.remove('active');
        const mainHeader=document.getElementById('mainHeader'); if(mainHeader) mainHeader.style.display='flex';
        mudarAba('view-home', document.getElementById('nav-home'), true); return;
    }
    if(document.getElementById('view-grade').classList.contains('active')) {
        document.getElementById('view-grade').classList.remove('active');
        document.getElementById('view-iptv').classList.add('active'); return;
    }
    const activeViews = ['view-buscar','view-streaming','view-meus'];
    if(activeViews.some(v=>document.getElementById(v).classList.contains('active'))) {
        mudarAba('view-home', document.getElementById('nav-home'), true); return;
    }
    if(document.getElementById('view-home').classList.contains('active')) return;
    mudarAba('view-home', document.getElementById('nav-home'), true);
});

document.addEventListener('backbutton', function(e) { e.preventDefault(); history.back(); }, false);

window.onload = () => {
    history.replaceState({ view: 'view-home' }, null, "");
    initApp();
    document.addEventListener('contextmenu', event=>event.preventDefault());
    document.addEventListener('visibilitychange', () => {
        if(!document.hidden && !embedAberto) {
            const embedEl = document.getElementById('embedModal');
            if(embedEl && embedEl.style.display !== 'flex') forceRemoveNoScroll();
        }
    });
};

function fecharAdBlock() {
    const el = document.getElementById('adBlockModal');
    if(el) { el.style.display = 'none'; removeNoScroll(); }
}

// ===================== CONTINUAR ASSISTINDO =====================
function getContinueList() { try { return JSON.parse(localStorage.getItem('streamflix_continue_v1'))||{}; } catch(e) { return {}; } }
function saveContinueList(list) { localStorage.setItem('streamflix_continue_v1', JSON.stringify(list)); }
function salvarProgresso(tmdbId, type, title, img, season, episode) {
    if(!tmdbId) return;
    const list = getContinueList();
    const key = type==='tv' ? String(tmdbId)+'_s'+season+'_e'+episode : String(tmdbId);
    list[key] = { id:tmdbId, type, title, img, season:season||null, episode:episode||null, savedAt:Date.now() };
    const sorted = Object.entries(list).sort((a,b)=>b[1].savedAt-a[1].savedAt).slice(0,20);
    saveContinueList(Object.fromEntries(sorted));
}
function removerContinue(key) {
    const list = getContinueList(); delete list[key]; saveContinueList(list);
    const el = document.getElementById('section-continuar');
    if(el) { const novo=renderContinueWatching(); if(novo) el.innerHTML=novo; else el.remove(); }
}
function renderContinueWatching() {
    const list = getContinueList();
    const items = Object.values(list).sort((a,b)=>b.savedAt-a.savedAt);
    if(items.length===0) return '';
    let cards = items.map(item => {
        const label = (item.type==='tv'&&item.season)
            ? 'S'+String(item.season).padStart(2,'0')+'E'+String(item.episode).padStart(2,'0')
            : 'Filme';
        const removeKey = (item.type==='tv'&&item.season)
            ? item.id+'_s'+item.season+'_e'+item.episode
            : String(item.id);
        return '<div class="card-movie continue-card" onclick="abrirDetalhesTMDB('+item.id+',\''+item.type+'\')">'
            +'<img src="'+item.img+'" loading="lazy" onerror="this.style.display=\'none\';">'
            +'<div class="continue-badge">'+label+'</div>'
            +'<div class="continue-remove" onclick="event.stopPropagation();removerContinue(\''+removeKey+'\')"><i class="fas fa-times"></i></div>'
            +'</div>';
    }).join('');
    return '<div class="section-header"><div class="section-title"><i class="fas fa-play-circle" style="color:#ff0055;"></i> Continuar Assistindo</div></div>'
        +'<div class="carousel">'+cards+'</div>';
}

// ===================== PRÓXIMO EPISÓDIO =====================
function mostrarOverlayProximoEp(tmdbId, season, episode, seriesTitle, poster) {
    var existing = document.getElementById('nextEpOverlay');
    if(existing) existing.remove();
    if(nextEpTimer) clearTimeout(nextEpTimer);
    var overlay = document.createElement('div');
    overlay.id = 'nextEpOverlay';
    overlay.style.cssText = 'position:absolute;bottom:20px;right:15px;z-index:4600;background:rgba(0,0,0,0.9);border:1px solid rgba(255,255,255,0.15);border-radius:12px;padding:14px 18px;max-width:220px;backdrop-filter:blur(8px);';
    overlay.innerHTML = '<div style="font-size:10px;color:#aaa;margin-bottom:4px;text-transform:uppercase;font-weight:700;">A seguir</div>'
        +'<div style="font-size:13px;color:#fff;font-weight:800;margin-bottom:10px;">'
        +'S'+String(season).padStart(2,'0')+'E'+String(episode).padStart(2,'0')
        +'</div>'
        +'<div style="display:flex;gap:8px;">'
        +'<button onclick="reproduzirProximoEpBtn('+tmdbId+','+season+','+episode+')" style="flex:1;background:var(--accent);color:#000;border:none;border-radius:8px;padding:9px;font-weight:800;font-size:12px;cursor:pointer;"><i class="fas fa-forward"></i> Próximo</button>'
        +'<button onclick="document.getElementById(\'nextEpOverlay\').remove()" style="background:rgba(255,255,255,0.1);color:#fff;border:1px solid rgba(255,255,255,0.2);border-radius:8px;padding:9px 12px;font-size:12px;cursor:pointer;">✕</button>'
        +'</div>';
    var embedModal = document.getElementById('embedModal');
    if(embedModal) embedModal.appendChild(overlay);
}
function reproduzirProximoEpBtn(tmdbId, season, episode) {
    var overlay = document.getElementById('nextEpOverlay'); if(overlay) overlay.remove();
    currentSeason=season; currentEpisode=episode;
    var frame = document.getElementById('embedFrame');
    var servidor = localStorage.getItem('streamflix_last_server')||'embedmovies';
    var url = getEmbedUrl(servidor, tmdbId, 'tv', season, episode);
    if(url&&frame) {
        frame.src = url;
        salvarProgresso(tmdbId, 'tv', currentStreamData.title||'', currentStreamData.img||'', season, episode);
    }
}

// ===================== EPISÓDIOS =====================
async function getSeasonDetails(tmdbId, seasonNumber) {
    var cacheKey = tmdbId+'_s'+seasonNumber;
    if(currentEpisodeData[cacheKey]) return currentEpisodeData[cacheKey];
    try {
        var data = await tmdbFetch('/tv/'+tmdbId+'/season/'+seasonNumber);
        if(data.episodes) currentEpisodeData[cacheKey]=data.episodes;
        return data.episodes||[];
    } catch(e) { return []; }
}
async function renderEpisodesComNomes(tmdbId, details, title, poster) {
    var watchedList=getWatchedList(); var continueList=getContinueList();
    var container=document.getElementById('dpEpisodes'); if(!container) return;
    var skelHtml='';
    details.seasons.forEach(function(season) {
        if(season.season_number===0) return;
        skelHtml+='<h3 class="season-title">'+esc(season.name)+'</h3>';
        skelHtml+='<div class="ep-carousel" id="ep-season-'+season.season_number+'">';
        for(var i=0;i<Math.min(season.episode_count||1,4);i++) {
            skelHtml+='<div class="ep-card"><div class="ep-thumb" style="background:#1e2130;"></div><div class="ep-info-text"><div style="height:9px;background:#2a2d3e;border-radius:3px;margin-bottom:5px;width:60%;"></div><div style="height:8px;background:#242736;border-radius:3px;width:80%;"></div></div></div>';
        }
        skelHtml+='</div>';
    });
    container.innerHTML=skelHtml;
    for(var s=0;s<details.seasons.length;s++) {
        var season=details.seasons[s]; if(season.season_number===0) continue;
        var episodesData=await getSeasonDetails(tmdbId,season.season_number);
        var epContainer=document.getElementById('ep-season-'+season.season_number); if(!epContainer) continue;
        var html=''; var count=season.episode_count||1;
        for(var ep=1;ep<=count;ep++) {
            var epId=tmdbId+'_s'+season.season_number+'_e'+ep;
            var isWatched=watchedList[epId]?'active':''; var isContinue=continueList[epId]?'ep-continue':'';
            var epData=episodesData.find(function(e){ return e.episode_number===ep; });
            var epName=epData?esc(epData.name):('Episódio '+ep);
            var epThumb=(epData&&epData.still_path)?TMDB_IMG+'/w300'+epData.still_path:(season.poster_path?TMDB_IMG+'/w300'+season.poster_path:poster);
            html+='<div class="ep-card '+isContinue+'" onclick="reproduzirEpisodioTMDB('+tmdbId+','+season.season_number+','+ep+')">'
                +'<div class="ep-watched-btn '+isWatched+'" onclick="event.stopPropagation();toggleEpWatchedTMDB(event,\''+epId+'\',\''+esc(title)+' S'+season.season_number+'E'+ep+'\',\''+esc(poster)+'\')"><i class="fas fa-check"></i></div>'
                +'<div class="ep-thumb" style="background-image:url(\''+epThumb+'\');"><i class="fas fa-play-circle"></i></div>'
                +'<div class="ep-info-text">'
                +'<div class="ep-number">S'+String(season.season_number).padStart(2,'0')+'E'+String(ep).padStart(2,'0')+'</div>'
                +'<div class="ep-name">'+epName+'</div>'
                +'</div></div>';
        }
        epContainer.innerHTML=html;
    }
}

// ===================== COMPARTILHAR =====================
function compartilharConteudo(title, overview, tmdbId, type) {
    var url='https://www.themoviedb.org/'+type+'/'+tmdbId;
    var text=title+(overview?' — '+overview.substring(0,100)+'...':'');
    if(navigator.share) { navigator.share({title:title,text:text,url:url}).catch(()=>{}); }
    else { navigator.clipboard.writeText(url).then(()=>mostrarToast('Link copiado!')).catch(()=>mostrarToast('Não foi possível compartilhar.')); }
}

// ===================== EMBED URLs =====================
function getEmbedUrl(servidor, tmdbId, type, season, episode) {
    switch(servidor) {
        case 'betterflix':
            return type==='movie'
                ? `https://betterflix.click/api/player?id=${tmdbId}&type=movie`
                : `https://betterflix.click/api/player?id=${tmdbId}&type=tv&season=${season}&episode=${episode}`;
        case 'embedmovies':
            return type==='movie'
                ? `https://myembed.biz/filme/${tmdbId}`
                : `https://myembed.biz/serie/${tmdbId}/${season}/${episode}`;
        case 'embedplayapi':
            return type==='movie'
                ? `https://embedplayapi.top/embed/${tmdbId}`
                : `https://embedplayapi.top/embed/${tmdbId}/${season}/${episode}`;
        case 'superflix':
            return type==='movie'
                ? `https://superflixapi.fit/filme/${tmdbId}`
                : `https://superflixapi.fit/serie/${tmdbId}/${season}/${episode}`;
        case 'megaembed':
            return type==='movie'
                ? `https://megaembedapi.site/embed/${tmdbId}`
                : `https://megaembedapi.site/embed/${tmdbId}/${season}/${episode}`;
        default:
            return '';
    }
}
