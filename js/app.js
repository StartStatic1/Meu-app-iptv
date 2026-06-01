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
let animeCarregado = false;
let doramaCarregado = false;
let currentEmbedServer = null;
let miniPlayerData = null;
let tmdbKeyAtiva = TMDB_API_KEY;

let touchStartY = 0;
let touchStartX = 0;

// ===================== SUPABASE / VIP =====================
function getSupabase() {
    if(!meuSupabase) {
        meuSupabase = window.supabase.createClient('https://gkujbjpvphuvrejpvvtz.supabase.co', 'sb_publishable_C9FMCjUyZnlzhINK2KZXWQ_ahpGu0yy');
    }
    return meuSupabase;
}
function abrirModalVip() {
    document.getElementById('vipModal').style.display = 'flex';
    document.body.classList.add('no-scroll');
    history.pushState({ view: 'vip', modal: true }, null, "");
}
function fecharModalVip() {
    document.getElementById('vipModal').style.display = 'none';
    document.body.classList.remove('no-scroll');
    if(history.state && history.state.view === 'vip') history.back();
}
function abrirTelegramVip() {
    let a = document.createElement('a');
    a.href = 'https://t.me/streamflixofc';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
                localStorage.setItem('streamflix_vip', 'true');
                mostrarToast("Bem-vindo! Anúncios desativados.");
                setTimeout(() => location.reload(), 1500);
            } else { msg.innerText = "Sua conta não tem status VIP."; msg.style.display = 'block'; }
        } else { msg.innerText = "E-mail ou senha incorretos."; msg.style.display = 'block'; }
    } catch(e) { msg.innerText = e.message; msg.style.display = 'block'; }
    finally { btn.innerText = "Entrar na Conta VIP"; btn.disabled = false; }
}
function verificarStatusVip() {
    const isVip = localStorage.getItem('streamflix_vip') === 'true';
    const btnVip = document.getElementById('btnOpenVip');
    if(btnVip) btnVip.style.display = isVip ? 'none' : 'block';
}

// ===================== ANUNCIOS =====================
function injetarAnuncios() {
    if(localStorage.getItem('streamflix_vip') === 'true') return;
    if(localStorage.getItem('push_accepted') !== 'true') {
        setTimeout(() => { const prompt = document.getElementById('pushPromptModal'); if(prompt) prompt.style.display = 'block'; }, 3000);
    } else {
        injetarOnClick();
    }
}
function aceitarPush() {
    document.getElementById('pushPromptModal').style.display = 'none';
    localStorage.setItem('push_accepted', 'true');
    injetarOnClick();
    mostrarToast("Notificações ativadas!");
}
function injetarOnClick() {
    if (document.getElementById('script-onclick-monetag')) return;
    const s = document.createElement('script');
    s.id = 'script-onclick-monetag';
    s.async = true;
    s.setAttribute('data-zone', '11081852');
    s.src = 'https://al5sm.com/tag.min.js';
    document.head.appendChild(s);
}
function dispararDirectLink() {
    const isVip = localStorage.getItem('streamflix_vip') === 'true';
    if(!isVip) {
        let a = document.createElement('a');
        a.href = 'https://omg10.com/4/11081875';
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}

// ===================== UTILS =====================
function mostrarToast(msg) {
    let t = document.getElementById('toast-msg'); if(!t) return;
    t.innerText = msg; t.style.opacity = '1';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.style.opacity = '0'; }, 3500);
}
function esc(str) { return (str || '').toString().replace(/\\/g, '\\').replace(/'/g, "\'").replace(/"/g, '&quot;'); }
function getWatchedList() { try { return JSON.parse(localStorage.getItem('streamflix_watched_v2')) || {}; } catch(e) { return {}; } }
function saveWatchedList(list) { localStorage.setItem('streamflix_watched_v2', JSON.stringify(list)); }
function getFavList() { try { return JSON.parse(localStorage.getItem('streamflix_favs')) || {}; } catch(e) { return {}; } }
function saveFavList(list) { localStorage.setItem('streamflix_favs', JSON.stringify(list)); }

function getProgressList() {
    try { return JSON.parse(localStorage.getItem('streamflix_progress_v2')) || {}; }
    catch(e) { return {}; }
}
function saveProgressList(list) { localStorage.setItem('streamflix_progress_v2', JSON.stringify(list)); }

function salvarProgresso(id, title, img, type, season, episode, percent) {
    const list = getProgressList();
    if(percent >= 95) { delete list[id]; saveProgressList(list); return; }
    list[id] = { id, title, img, type, season: season||1, episode: episode||1, percent, updated: Date.now() };
    saveProgressList(list);
}

function limparNomePasta(nome) { return nome.replace(/Filmes\s*\|\s*/i, '').replace(/Séries\s*\|\s*/i, '').trim(); }
function pastaValida(nome) { const proibidos = ['JOGOS','REALITY','XXX','RELIGIOSO','ADULTO','+18','24H','CÂMERA','RADIO','OSCAR','TESTE']; return !proibidos.some(p => (nome||'').toUpperCase().includes(p)); }
function pastaTVValida(nome) { const proibidos = ['JOGOS','REALITY','XXX','RELIGIOSO','ADULTO','+18','24H','RADIO','CÂMERA']; return !proibidos.some(p => (nome||'').toUpperCase().includes(p)); }

function processarTitulo(nomeBruto, nomePasta) {
    let nomeLimpo = nomeBruto || "Sem Título";
    const tags = [];
    const pU = nomePasta ? nomePasta.toUpperCase() : '';
    if(pU.includes('4K') || /4K|UHD|2160p/i.test(nomeLimpo)) tags.push('4K');
    if(/FHD|1080p/i.test(nomeLimpo)) tags.push('FHD');
    if(/HD|720p/i.test(nomeLimpo)) tags.push('HD');
    if(pU.includes('LEGENDADO') || /\[LEG\]|\(LEG\)/i.test(nomeLimpo)) tags.push('LEG');
    else if(pU.includes('DUBLADO') || /\[DUB\]|\(DUB\)/i.test(nomeLimpo)) tags.push('DUB');
    nomeLimpo = nomeLimpo.replace(/(4K|UHD|2160p|FHD|1080p|HD|720p)/ig, '').replace(/\[(DUB|LEG|VOD).*?\]/ig, '').replace(/\((DUB|LEG).*?\)/ig, '').replace(/\|.*?\|/g, '').replace(/-\s*$/, '').replace(/\s+/g, ' ').trim();
    if(nomeLimpo.length < 2) nomeLimpo = nomeBruto.substring(0, 20);
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
    nomeLimpo = nomeLimpo.replace(/\[(FHDR|FHD|HD|4K|SD)\]/ig, '').replace(/\((FHDR|FHD|HD|4K|SD)\)/ig, '').replace(/\b(FHDR|FHD|HD|4K|SD)\b/ig, '').replace(/^[\s\|\-]+|[\s\|\-]+$/g, '').replace(/\s+/g, ' ').trim();
    if (!nomeLimpo || nomeLimpo.length < 2) nomeLimpo = nomeBruto.replace(/\[.*?\]|\(.*?\)/g, '').replace(/[>-\|*•]/g, '').trim();
    return { limpo: nomeLimpo, tagsStr: tags.join(',') };
}

function gerarHTMLBadges(tagsStr) {
    if(!tagsStr) return '';
    let html = '';
    tagsStr.split(',').forEach(t => {
        let cor = '#000', bg = '#fff';
        if(t==='4K') { cor='#fff'; bg='#ff1744'; }
        if(t==='FHDR') { cor='#fff'; bg='#d50000'; }
        if(t==='FHD') { cor='#000'; bg='#00e5ff'; }
        if(t==='HD') { cor='#000'; bg='#76ff03'; }
        if(t==='DUB') { cor='#000'; bg='#00e676'; }
        if(t==='LEG') { cor='#fff'; bg='#b388ff'; }
        if(t.length === 2) { cor='#fff'; bg='#ff9100'; }
        html += `<span style="background:${bg}; color:${cor}; font-size:8px; font-weight:900; padding:3px 5px; border-radius:4px; box-shadow: 0 2px 5px rgba(0,0,0,0.5);">${t}</span>`;
    });
    return html;
}

// ===================== TMDB COM FALLBACK =====================
async function tmdbFetch(endpoint) {
    const cacheKey = 'tmdb_' + endpoint.replace(/\?/g,'_').replace(/&/g,'_').replace(/=/g,'_');
    const cached = localStorage.getItem(cacheKey);
    if(cached) {
        try {
            const { data, ts } = JSON.parse(cached);
            const ttl = endpoint.includes('trending') ? 3600000 : endpoint.includes('search') ? 600000 : 86400000;
            if((Date.now() - ts) < ttl) return data;
        } catch(e){}
    }
    try {
        const res = await fetch(`https://api.themoviedb.org/3${endpoint}&api_key=${TMDB_API_KEY}&language=pt-BR`);
        if(res.ok) {
            const data = await res.json();
            localStorage.setItem(cacheKey, JSON.stringify({ data, ts: Date.now() }));
            tmdbKeyAtiva = TMDB_API_KEY;
            return data;
        }
        if(res.status === 429 || res.status === 401) throw new Error('TMDB primary failed');
    } catch(e) {}
    try {
        const res = await fetch(`https://api.themoviedb.org/3${endpoint}&api_key=${TMDB_API_KEY_FALLBACK}&language=pt-BR`);
        if(res.ok) {
            const data = await res.json();
            localStorage.setItem(cacheKey, JSON.stringify({ data, ts: Date.now() }));
            tmdbKeyAtiva = TMDB_API_KEY_FALLBACK;
            return data;
        }
    } catch(e) {}
    return { results: [] };
}
function getTrending(type='movie', page=1) { return tmdbFetch(`/trending/${type}/week?page=${page}`); }
function getDetails(id, type='movie') { return tmdbFetch(`/${type}/${id}?append_to_response=credits,videos,recommendations`); }
function searchTMDB(query, type='', page=1) {
    let url = `/search/multi?query=${encodeURIComponent(query)}&page=${page}`;
    if(type && type !== 'all') url = `/search/${type}?query=${encodeURIComponent(query)}&page=${page}`;
    return tmdbFetch(url);
}
function getDiscover(type='movie', genreId='', page=1) { return tmdbFetch(`/discover/${type}?with_genres=${genreId}&sort_by=popularity.desc&page=${page}`); }
function getUpcoming(page=1) { return tmdbFetch(`/movie/upcoming?page=${page}`); }

function renderCard(item, type) {
    const tmdbType = item.media_type || type;
    const realType = tmdbType === 'tv' ? 'tv' : 'movie';
    const title = item.title || item.name || 'Sem Título';
    const img = item.poster_path ? `${TMDB_IMG}/w300${item.poster_path}` : 'https://via.placeholder.com/220x330/111/fff';
    const nota = item.vote_average ? `<span style="position:absolute; top:5px; right:5px; background:rgba(0,0,0,0.7); color:gold; font-size:10px; font-weight:900; padding:3px 6px; border-radius:4px;"><i class="fas fa-star"></i> ${item.vote_average.toFixed(1)}</span>` : '';
    return `
    <div class="card-movie" onclick="abrirDetalhesTMDB(${item.id}, '${realType}')">
        ${nota}
        <img src="${img}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='block';">
        <div class="titulo-fallback" style="display:none">${esc(title)}</div>
    </div>`;
}
function renderCarousel(title, items, type) {
    if(!items || items.length === 0) return '';
    let cards = items.map(i => renderCard(i, type)).join('');
    return `<div class="section-header"><div class="section-title"><i class="fas fa-film"></i> ${esc(title)}</div></div><div class="carousel">${cards}</div>`;
}
function renderGrid(items, type) {
    if(!items || items.length === 0) return '<p class="loading-text" style="grid-column:span 3;">Nenhum resultado.</p>';
    return items.map(i => renderCard(i, type)).join('');
}

// ===================== CONTINUAR ASSISTINDO =====================
function carregarContinuarAssistindo() {
    const list = getProgressList();
    const items = Object.values(list).sort((a,b) => b.updated - a.updated).slice(0, 10);
    const section = document.getElementById('continuar-assistindo-section');
    const carousel = document.getElementById('continuarAssistindoCarousel');
    if(!section || !carousel) return;
    if(items.length === 0) { section.style.display = 'none'; return; }
    let html = '';
    items.forEach(item => {
        const epLabel = item.type === 'tv' ? `S${String(item.season).padStart(2,'0')}E${String(item.episode).padStart(2,'0')}` : 'Filme';
        html += `
        <div class="continue-card" onclick="abrirDetalhesTMDB(${item.id}, '${item.type}'); setTimeout(()=>{if(${item.season}>1||${item.episode}>1)reproduzirEpisodioTMDB(${item.id},${item.season},${item.episode});},500);">
            <div class="continue-badge">${epLabel}</div>
            <img src="${item.img}" loading="lazy">
            <div class="continue-progress-bg"><div class="continue-progress-bar" style="width:${item.percent}%"></div></div>
            <div class="continue-info">
                <div class="continue-title">${esc(item.title)}</div>
                <div class="continue-meta">${item.percent.toFixed(0)}% assistido</div>
            </div>
        </div>`;
    });
    carousel.innerHTML = html;
    section.style.display = 'block';
}

function verificarProgressoDetalhes(tmdbId, type) {
    const list = getProgressList();
    const btn = document.getElementById('btnRetomar');
    if(!btn) return;
    if(list[tmdbId]) {
        const p = list[tmdbId];
        const epText = p.type === 'tv' ? `Retomar S${String(p.season).padStart(2,'0')}E${String(p.episode).padStart(2,'0')}` : `Retomar (${p.percent.toFixed(0)}%)`;
        btn.querySelector('span').innerText = epText;
        btn.style.display = 'flex';
        btn.onclick = () => {
            if(p.type === 'tv' && (p.season > 1 || p.episode > 1)) {
                currentSeason = p.season;
                currentEpisode = p.episode;
            }
            abrirMenuServidoresDetalhes();
        };
    } else {
        btn.style.display = 'none';
    }
}

function retomarAssistindo() {
    const list = getProgressList();
    if(list[currentTmdbId || currentStreamData?.id]) {
        const p = list[currentTmdbId || currentStreamData.id];
        if(p.type === 'tv') { currentSeason = p.season; currentEpisode = p.episode; }
    }
    abrirMenuServidoresDetalhes();
}

// ===================== MINI PLAYER =====================
function mostrarMiniPlayer(title, img, type, season, episode) {
    const mp = document.getElementById('miniPlayer');
    const mpImg = document.getElementById('miniPlayerImg');
    if(!mp || !mpImg) return;
    miniPlayerData = { title, img, type, season, episode };
    mpImg.src = img || 'https://via.placeholder.com/160x90/111/fff';
    mp.classList.add('active');
    setTimeout(() => { if(mp.classList.contains('active')) mp.classList.remove('active'); }, 30000);
}
function fecharMiniPlayer() {
    document.getElementById('miniPlayer').classList.remove('active');
    miniPlayerData = null;
}
function retomarDoMiniPlayer() {
    if(!miniPlayerData) return;
    if(miniPlayerData.type === 'tv') {
        currentSeason = miniPlayerData.season || 1;
        currentEpisode = miniPlayerData.episode || 1;
    }
    if(currentEmbedServer) abrirPlayerWeb(currentEmbedServer);
    else abrirMenuServidoresDetalhes();
}

// ===================== EMBED FULLSCREEN =====================
function toggleEmbedFullscreen() {
    const modal = document.getElementById('embedModal');
    const btn = document.getElementById('btnFullscreenEmbed');
    if(!modal) return;
    if(document.fullscreenElement) {
        document.exitFullscreen().catch(()=>{});
        if(btn) btn.innerHTML = '<i class="fas fa-expand"></i>';
    } else {
        modal.requestFullscreen().catch(()=>{});
        if(btn) btn.innerHTML = '<i class="fas fa-compress"></i>';
    }
}
document.addEventListener('fullscreenchange', () => {
    const btn = document.getElementById('btnFullscreenEmbed');
    if(!btn) return;
    if(document.fullscreenElement) btn.innerHTML = '<i class="fas fa-compress"></i>';
    else btn.innerHTML = '<i class="fas fa-expand"></i>';
});

// ===================== APP INIT =====================
async function initApp() {
    verificarStatusVip();
    injetarAnuncios();
    renderGenreChips();
    carregarContinuarAssistindo();
    try {
        const [trendingM, trendingS, upcoming] = await Promise.all([
            getTrending('movie', 1), getTrending('tv', 1), getUpcoming(1)
        ]);
        const filmes = trendingM.results ? trendingM.results.slice(0, 10) : [];
        const series = trendingS.results ? trendingS.results.slice(0, 10) : [];
        const lancamentos = upcoming.results ? upcoming.results.slice(0, 10) : [];
        heroItems = await Promise.all(filmes.slice(0, 5).map(f => getDetails(f.id, 'movie')));
        const loadingState = document.getElementById('loading-state');
        if(loadingState) loadingState.style.display = 'none';
        const conteudoReal = document.getElementById('conteudo-real');
        if(conteudoReal) conteudoReal.style.display = 'block';
        if(heroItems.length > 0) iniciarHeroSlider();
        let html = '';
        if(filmes.length > 5) html += renderCarousel('Filmes em Alta', filmes.slice(5), 'movie');
        if(series.length > 0) html += renderCarousel('Séries em Alta', series, 'tv');
        if(lancamentos.length > 0) html += renderCarousel('Lançamentos', lancamentos, 'movie');
        const generosDestaque = [
            {id:28,name:'Ação',type:'movie'},{id:27,name:'Terror',type:'movie'},
            {id:35,name:'Comédia',type:'movie'},{id:878,name:'Ficção Científica',type:'movie'}
        ];
        for(let g of generosDestaque) {
            const d = await getDiscover(g.type, g.id, 1);
            if(d.results && d.results.length > 0) html += renderCarousel(g.name, d.results.slice(0, 10), g.type);
        }
        const conteudoDinamico = document.getElementById('conteudo-dinamico');
        if(conteudoDinamico) conteudoDinamico.innerHTML = html;
    } catch(e) {
        const loadingState = document.getElementById('loading-state');
        if(loadingState) loadingState.innerHTML = "<div class='loading-text'>Erro de conexão. Tente novamente.</div>";
    }
}

function iniciarHeroSlider() {
    atualizarHero();
    if(heroInterval) clearInterval(heroInterval);
    heroInterval = setInterval(() => { heroIndex = (heroIndex + 1) % heroItems.length; atualizarHero(); }, 5000);
}

function atualizarHero() {
    const f = heroItems[heroIndex]; if(!f) return;
    const title = f.title || f.name || 'Carregando...';
    const backdrop = f.backdrop_path ? `${TMDB_IMG}/w1280${f.backdrop_path}` : (f.poster_path ? `${TMDB_IMG}/w780${f.poster_path}` : '');
    const tags = [];
    if(f.vote_average) tags.push(`<i class="fas fa-star" style="color:gold;"></i> ${f.vote_average.toFixed(1)}`);
    if(f.release_date) tags.push(f.release_date.substring(0,4));
    else if(f.first_air_date) tags.push(f.first_air_date.substring(0,4));
    if(f.media_type === 'tv' || f.first_air_date) tags.push('SÉRIE'); else tags.push('FILME');
    document.getElementById('heroBanner').style.backgroundImage = `url('${backdrop}')`;
    document.getElementById('heroTitle').innerText = title;
    document.getElementById('heroTags').innerHTML = tags.join(' <span style="color:#555;">|</span> ');
    const synopsisEl = document.getElementById('heroSynopsis');
    if(synopsisEl) synopsisEl.innerText = f.overview ? f.overview : "Sinopse não disponível.";
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
        if(f.videos && f.videos.results) {
            const trailer = f.videos.results.find(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'));
            if(trailer) {
                trailerKeyAtivo = trailer.key;
                abrirTrailer();
            } else { mostrarToast("Trailer não encontrado."); }
        } else { mostrarToast("Trailer não encontrado."); }
    } catch(e) { mostrarToast("Erro ao buscar trailer."); }
    finally { btn.innerHTML = txtOriginal; }
}

// ===================== BUSCA =====================
function renderGenreChips() {
    const container = document.getElementById('genreChips');
    if(!container) return;
    const genres = searchType === 'tv' ? TMDB_GENRES.tv : TMDB_GENRES.movie;
    let html = `<div class="genre-chip ${!selectedGenre ? 'active' : ''}" onclick="filtrarGenero(null)">Todos</div>`;
    genres.forEach(g => {
        html += `<div class="genre-chip ${selectedGenre == g.id ? 'active' : ''}" onclick="filtrarGenero(${g.id})">${esc(g.name)}</div>`;
    });
    container.innerHTML = html;
}
function setSearchType(type) {
    searchType = type;
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
    const typeBtn = document.getElementById('type-' + type);
    if(typeBtn) typeBtn.classList.add('active');
    selectedGenre = null;
    renderGenreChips();
    const query = document.getElementById('inputBuscaGlobal').value.trim();
    if(query.length >= 3 || selectedGenre) pesquisarGlobal();
}
function filtrarGenero(genreId) {
    selectedGenre = genreId;
    renderGenreChips();
    pesquisarGlobal();
}
async function pesquisarGlobal() {
    clearTimeout(timeoutBusca);
    const queryEl = document.getElementById('inputBuscaGlobal');
    const query = queryEl ? queryEl.value.trim() : '';
    const container = document.getElementById('resultados-global');
    if(query.length < 3 && !selectedGenre) {
        if(container) container.innerHTML = `<p class="loading-text" style="grid-column: span 3; margin-top: 40px;">Digite pelo menos 3 letras ou escolha um gênero.</p>`;
        return;
    }
    if(container) container.innerHTML = `<div class="loading-text" style="grid-column: span 3;"><i class="fas fa-spinner fa-spin"></i> Buscando...</div>`;
    timeoutBusca = setTimeout(async () => {
        try {
            let items = [];
            if(selectedGenre) {
                const type = searchType === 'all' ? 'movie' : searchType;
                const d = await getDiscover(type, selectedGenre, 1);
                items = d.results || [];
                if(searchType === 'all') {
                    const d2 = await getDiscover('tv', selectedGenre, 1);
                    items = items.concat(d2.results || []);
                }
            } else {
                const type = searchType === 'all' ? '' : searchType;
                const d = await searchTMDB(query, type, 1);
                items = d.results || [];
            }
            if(container) container.innerHTML = renderGrid(items, searchType === 'all' ? 'movie' : searchType);
        } catch(e) { if(container) container.innerHTML = `<p class="loading-text" style="grid-column:span 3;">Erro na busca.</p>`; }
    }, 600);
}

// ===================== DETALHES TMDB =====================
async function abrirDetalhesTMDB(tmdbId, type) {
    currentTmdbId = tmdbId;
    currentItemType = type;
    currentSeason = 1;
    currentEpisode = 1;
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
    document.body.classList.add('no-scroll');
    history.pushState({ view: 'details', modal: true }, null, "");
    try {
        const details = await getDetails(tmdbId, type);
        const title = details.title || details.name || 'Sem Título';
        const backdrop = details.backdrop_path ? `${TMDB_IMG}/original${details.backdrop_path}` : (details.poster_path ? `${TMDB_IMG}/w780${details.poster_path}` : 'https://via.placeholder.com/800x600/111/fff');
        const poster = details.poster_path ? `${TMDB_IMG}/w300${details.poster_path}` : 'https://via.placeholder.com/300x450/111/fff';
        document.getElementById('dpTitle').innerText = title;
        document.getElementById('dpPoster').style.backgroundImage = `url('${backdrop}')`;
        const ano = (details.release_date || details.first_air_date || "").substring(0,4);
        const nota = details.vote_average ? details.vote_average.toFixed(1) : "";
        const generos = details.genres ? details.genres.map(g=>g.name).slice(0,3).join(', ') : "";
        const duracao = details.runtime ? `${details.runtime} min` : (details.episode_run_time && details.episode_run_time[0] ? `${details.episode_run_time[0]} min/ep` : "");
        document.getElementById('dpTmdbMeta').innerHTML = `<i class="fas fa-star" style="color:gold;"></i> ${nota} &nbsp;&bull;&nbsp; ${ano} &nbsp;&bull;&nbsp; ${generos} ${duracao ? '&nbsp;&bull;&nbsp; '+duracao : ''}`;
        if(details.credits && details.credits.crew) {
            const dir = details.credits.crew.find(c => c.job === 'Director' || c.job === 'Creator');
            if(dir) document.getElementById('dpDirector').innerText = `Dirigido/Criado por ${dir.name}`;
        }
        document.getElementById('dpSynopsis').innerText = details.overview || "Sinopse indisponível.";
        if(details.videos && details.videos.results) {
            const trailer = details.videos.results.find(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'));
            if(trailer) { trailerKeyAtivo = trailer.key; document.getElementById('btnTrailer').style.display = 'flex'; }
        }
        if(details.credits && details.credits.cast && details.credits.cast.length > 0) {
            let htmlCast = '';
            details.credits.cast.slice(0, 15).forEach(ator => {
                const foto = ator.profile_path ? `${TMDB_IMG}/w200${ator.profile_path}` : 'https://via.placeholder.com/150x150/333/fff?text=Ator';
                htmlCast += `
                <div class="cast-item" onclick="abrirAtor(${ator.id})">
                    <img src="${foto}" class="cast-img" loading="lazy">
                    <div class="cast-name">${esc(ator.name)}</div>
                    <div class="cast-char">${esc(ator.character)}</div>
                </div>`;
            });
            document.getElementById('dpCast').innerHTML = htmlCast;
            document.getElementById('dpCastContainer').style.display = 'block';
        }
        if(details.recommendations && details.recommendations.results && details.recommendations.results.length > 0) {
            let htmlSim = '';
            details.recommendations.results.slice(0, 10).forEach(rec => { htmlSim += renderCard(rec, rec.media_type || type); });
            document.getElementById('dpSimilar').innerHTML = htmlSim;
            document.getElementById('dpSimilarContainer').style.display = 'block';
        }
        if(type === 'tv' && details.seasons) {
            document.getElementById('dpEpisodes').style.display = 'block';
            let htmlEps = '';
            const watchedList = getWatchedList();
            details.seasons.forEach(season => {
                if(season.season_number === 0) return;
                htmlEps += `<h3 class="season-title">${esc(season.name)}</h3><div class="ep-carousel">`;
                for(let ep = 1; ep <= (season.episode_count || 1); ep++) {
                    const epId = `${tmdbId}_s${season.season_number}_e${ep}`;
                    const isWatched = watchedList[epId] ? 'active' : '';
                    htmlEps += `
                    <div class="ep-card" onclick="reproduzirEpisodioTMDB(${tmdbId}, ${season.season_number}, ${ep})">
                        <div class="ep-watched-btn ${isWatched}" onclick="event.stopPropagation(); toggleEpWatchedTMDB(event, '${epId}', '${esc(title)} S${season.season_number}E${ep}', '${poster}')"><i class="fas fa-check"></i></div>
                        <div class="ep-thumb" style="background-image:url('${season.poster_path ? TMDB_IMG+'/w300'+season.poster_path : poster}');"><i class="fas fa-play-circle"></i></div>
                        <div class="ep-info-text"><div class="ep-number">S${String(season.season_number).padStart(2,'0')}E${String(ep).padStart(2,'0')}</div><div class="ep-name">Episódio ${ep}</div></div>
                    </div>`;
                }
                htmlEps += `</div>`;
            });
            document.getElementById('dpEpisodes').innerHTML = htmlEps;
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
        verificarProgressoDetalhes(tmdbId, type);
    } catch(err) { document.getElementById('dpSynopsis').innerText = "Erro ao carregar detalhes."; }
}

// ===================== MENUS E REPRODUCAO =====================
function abrirMenuServidoresDetalhes() {
    const btnNativo = document.getElementById('btnServerNativo');
    if (btnNativo) {
        btnNativo.onclick = () => {
            fecharMenuServidores();
            buscarEReproduzirNativo(currentStreamData.title, currentItemType);
        };
    }
    document.getElementById('serverModal').classList.add('active');
    document.getElementById('sheetOverlay').classList.add('active');
    history.pushState({ view: 'servers', modal: true }, null, "");
}

async function buscarEReproduzirNativo(title, type) {
    mostrarToast("Procurando no CDN...");
    try {
        let action = type === 'tv' ? 'get_series' : 'get_vod_streams';
        const res = await fetch(`/api/iptv?action=${action}`);
        const data = await res.json();
        const termo = title.toLowerCase();
        const match = data.find(item => (item.name || '').toLowerCase().includes(termo));
        if(match) {
            const isVod = type !== 'tv';
            const streamId = isVod ? match.stream_id : match.series_id;
            const ext = match.container_extension || 'mp4';
            if(isVod) {
                dispararPlayer(streamId, 'vod', ext, title);
            } else {
                const r = await fetch(`/api/iptv?action=get_series_info&series_id=${streamId}`);
                const d = await r.json();
                if(d.episodes && d.episodes['1'] && d.episodes['1'][0]) {
                    const ep = d.episodes['1'][0];
                    dispararPlayer(ep.id, 'episode', ep.container_extension||'mp4', title);
                } else { mostrarToast("Episódios não encontrados."); }
            }
        } else {
            mostrarToast("Não disponível no CDN. Tente Web.");
            setTimeout(() => {
                document.getElementById('serverModal').classList.add('active');
                document.getElementById('sheetOverlay').classList.add('active');
            }, 1500);
        }
    } catch(e) { mostrarToast("Erro CDN: " + e.message); }
}

function abrirPlayerWeb(servidor) {
    if(!currentTmdbId) return;
    currentEmbedServer = servidor;
    fecharMenuServidores();
    const modal = document.getElementById('embedModal');
    const frame = document.getElementById('embedFrame');
    let finalUrl = "";
    if(servidor === 'betterflix') {
        if(currentItemType === 'movie') finalUrl = `https://betterflix.click/api/player?id=${currentTmdbId}&type=movie`;
        else finalUrl = `https://betterflix.click/api/player?id=${currentTmdbId}&type=tv&season=${currentSeason}&episode=${currentEpisode}`;
    } else if(servidor === 'embedmovies') {
        if(currentItemType === 'movie') finalUrl = `https://myembed.biz/filme/${currentTmdbId}`;
        else finalUrl = `https://myembed.biz/serie/${currentTmdbId}/${currentSeason}/${currentEpisode}`;
    } else if(servidor === 'embedplayapi') {
        if(currentItemType === 'movie') finalUrl = `https://embedplayapi.top/embed/${currentTmdbId}`;
        else finalUrl = `https://embedplayapi.top/embed/${currentTmdbId}/${currentSeason}/${currentEpisode}`;
    } else if(servidor === 'megaembed') {
        if(currentItemType === 'movie') finalUrl = `https://megaembedapi.site/embed/${currentTmdbId}`;
        else finalUrl = `https://megaembedapi.site/embed/${currentTmdbId}/${currentSeason}/${currentEpisode}`;
    }
    dispararDirectLink();
    if(screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(()=>{});
    }
    setTimeout(() => {
        frame.src = finalUrl;
        modal.style.display = 'flex';
        modal.classList.add('active-embed');
        document.body.classList.add('no-scroll');
        history.pushState({ view: 'embed', modal: true }, null, "");
    }, 800);
}

function fecharEmbedWeb() {
    const modal = document.getElementById('embedModal');
    const frame = document.getElementById('embedFrame');
    if(currentStreamData && currentStreamData.id) {
        salvarProgresso(currentStreamData.id, currentStreamData.title, currentStreamData.img, currentItemType, currentSeason, currentEpisode, 35);
        mostrarMiniPlayer(currentStreamData.title, currentStreamData.img, currentItemType, currentSeason, currentEpisode);
    }
    if(screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock().catch(()=>{});
    }
    modal.style.display = 'none';
    modal.classList.remove('active-embed');
    frame.src = '';
    document.body.classList.remove('no-scroll');
    if(history.state && history.state.view === 'embed') history.back();
}

function reproduzirEpisodioTMDB(tmdbId, season, episode) {
    currentSeason = season;
    currentEpisode = episode;
    abrirMenuServidoresDetalhes();
}

function toggleEpWatchedTMDB(event, epId, title, thumb) {
    event.stopPropagation();
    const list = getWatchedList();
    const el = event.currentTarget;
    if(list[epId]) { delete list[epId]; el.classList.remove('active'); }
    else { list[epId] = { id: epId, title: title, img: thumb, type: 'episode', ext: 'mp4' }; el.classList.add('active'); }
    saveWatchedList(list);
}
function toggleWatchedGlobal() {
    if(!currentStreamData.id) return;
    const list = getWatchedList();
    const btn = document.getElementById('btnWatched');
    if(list[currentStreamData.id]) { delete list[currentStreamData.id]; btn.classList.remove('active'); }
    else { list[currentStreamData.id] = currentStreamData; btn.classList.add('active'); }
    saveWatchedList(list);
    if(document.getElementById('view-historico').classList.contains('active')) carregarHistorico();
}
function toggleFavGlobal() {
    if(!currentStreamData.id) return;
    const list = getFavList();
    const btn = document.getElementById('btnFav');
    if(list[currentStreamData.id]) { delete list[currentStreamData.id]; btn.classList.remove('active'); mostrarToast("Removido.");}
    else { list[currentStreamData.id] = currentStreamData; btn.classList.add('active'); mostrarToast("Adicionado!");}
    saveFavList(list);
    if(document.getElementById('view-historico').classList.contains('active')) carregarHistorico();
}

function carregarHistorico() {
    const listVistos = getWatchedList();
    const listFavs = getFavList();
    const itemsVistos = Object.values(listVistos).reverse();
    const itemsFavs = Object.values(listFavs).reverse();
    let html = "";
    if(itemsFavs.length > 0) {
        html += `<h3 style="color:#fff; padding-left:15px; margin-top:0;"><i class="fas fa-heart" style="color:#e91e63;"></i> Favoritos</h3>`;
        itemsFavs.forEach(item => {
            html += `<div class="card-history" onclick="abrirDetalhesTMDB(${item.id}, '${item.type}')">
                <img src="${item.img}" style="width:100%; height:75%; object-fit:cover; margin:0;">
                <div class="titulo-tv" style="padding:5px; height:25%; display:flex; align-items:center; justify-content:center;">${item.title}</div>
            </div>`;
        });
    }
    if(itemsVistos.length > 0) {
        html += `<h3 style="color:#fff; padding-left:15px; grid-column:span 3; margin-top:20px;"><i class="fas fa-check" style="color:#00e676;"></i> Assistidos</h3>`;
        itemsVistos.forEach(item => {
            html += `<div class="card-history" onclick="abrirDetalhesTMDB(${item.id}, '${item.type}')">
                <div class="ep-watched-btn active" style="top:5px; left:5px; position:absolute;" onclick="event.stopPropagation(); removerDoHistorico(event, '${item.id}')"><i class="fas fa-times"></i></div>
                <img src="${item.img}" style="width:100%; height:75%; object-fit:cover; margin:0;">
                <div class="titulo-tv" style="padding:5px; height:25%; display:flex; align-items:center; justify-content:center;">${item.title}</div>
            </div>`;
        });
    }
    if(html === "") html = `<p class="loading-text" style="grid-column: span 3; margin-top:30px;">Ainda não marcou nada.</p>`;
    const container = document.getElementById('conteudo-historico');
    if(container) container.innerHTML = html;
}
function removerDoHistorico(event, id) {
    event.stopPropagation();
    const list = getWatchedList(); delete list[id]; saveWatchedList(list);
    carregarHistorico();
}

async function abrirAtor(atorId) {
    const modal = document.getElementById('actorModal');
    document.getElementById('actorName').innerText = "Carregando...";
    document.getElementById('actorBio').innerText = "";
    document.getElementById('actorCredits').innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    modal.classList.add('active');
    document.body.classList.add('no-scroll');
    history.pushState({ view: 'actor', modal: true }, null, "");
    try {
        const key = tmdbKeyAtiva || TMDB_API_KEY;
        const pRes = await fetch(`https://api.themoviedb.org/3/person/${atorId}?api_key=${key}&language=pt-BR`);
        const pData = await pRes.json();
        document.getElementById('actorName').innerText = pData.name;
        document.getElementById('actorImg').src = pData.profile_path ? `${TMDB_IMG}/w300${pData.profile_path}` : 'https://via.placeholder.com/150';
        let idade = "";
        if(pData.birthday) { const nasc = new Date(pData.birthday); const ageDifMs = Date.now() - nasc.getTime(); const ageDate = new Date(ageDifMs); idade = ` • ${Math.abs(ageDate.getUTCFullYear() - 1970)} anos`; }
        document.getElementById('actorMeta').innerText = pData.birthday ? `${pData.birthday}${idade}` : "";
        document.getElementById('actorPlace').innerText = pData.place_of_birth || "";
        let bio = pData.biography || "";
        if(!bio || bio.length < 50) {
            try {
                const wmRes = await fetch(`https://api.watchmode.com/v1/person/${atorId}/?api_key=${WATCHMODE_API_KEY}`);
                if(wmRes.ok) {
                    const wmData = await wmRes.json();
                    if(wmData.bio && wmData.bio.length > bio.length) bio = wmData.bio;
                }
            } catch(wme) {}
        }
        document.getElementById('actorBio').innerText = bio || "Biografia indisponível.";
        const cRes = await fetch(`https://api.themoviedb.org/3/person/${atorId}/combined_credits?api_key=${key}&language=pt-BR`);
        const cData = await cRes.json();
        if(cData.cast && cData.cast.length > 0) {
            const obras = cData.cast.sort((a,b) => b.popularity - a.popularity).slice(0, 30);
            document.getElementById('actorCredits').innerHTML = renderGrid(obras, 'movie');
        } else { document.getElementById('actorCredits').innerHTML = "Nenhuma obra encontrada."; }
    } catch(e) { document.getElementById('actorBio').innerText = "Erro ao carregar dados."; }
}

function abrirTrailer() {
    if(!trailerKeyAtivo) return;
    document.getElementById('trailerFrame').src = `https://www.youtube.com/embed/${trailerKeyAtivo}?autoplay=1&rel=0`;
    document.getElementById('trailerModal').style.display = 'flex';
    document.body.classList.add('no-scroll');
    history.pushState({ view: 'trailer', modal: true }, null, "");
}
function fecharTrailer() {
    document.getElementById('trailerModal').style.display = 'none';
    document.getElementById('trailerFrame').src = '';
    document.body.classList.remove('no-scroll');
    if(history.state && history.state.view === 'trailer') history.back();
}
function fecharMenuServidores() {
    document.getElementById('serverModal').classList.remove('active');
    const overlay = document.getElementById('sheetOverlay');
    if(overlay) overlay.classList.remove('active');
}
function fecharDetalhes() {
    document.getElementById('detailsPage').classList.remove('active');
    document.body.classList.remove('no-scroll');
    if(history.state && history.state.view === 'details') history.back();
}
function fecharAtor() {
    document.getElementById('actorModal').classList.remove('active');
    document.body.classList.remove('no-scroll');
    if(history.state && history.state.view === 'actor') history.back();
}

function abrirSheetTV(titulo, streamId, tagsStr) {
    document.getElementById('tvTitle').innerText = titulo;
    document.getElementById('tvBadges').innerHTML = gerarHTMLBadges(tagsStr);
    const btn = document.getElementById('btnPlayTV');
    if(btn) btn.onclick = () => dispararPlayer(streamId, 'live', '', titulo);
    document.getElementById('sheetOverlay').classList.add('active');
    document.getElementById('bottomSheet').classList.add('active');
    history.pushState({ view: 'sheet', modal: true }, null, "");
}
function fecharSheetTV() {
    document.getElementById('sheetOverlay').classList.remove('active');
    document.getElementById('bottomSheet').classList.remove('active');
    if(history.state && history.state.view === 'sheet') history.back();
}

function fecharTodosOverlays() {
    fecharMenuServidores();
    fecharSheetTV();
    fecharMenuPrincipal();
}

async function dispararPlayer(id, tipo, ext, titulo) {
    const btn = (tipo === 'live') ? document.getElementById('btnPlayTV') : null;
    if(btn) { btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Conectando...`; btn.disabled = true; }
    try {
        let urlFinal = "";
        if(tipo === 'vod') {
            const res = await fetch(`/api/iptv?action=get_movie_url&stream_id=${id}&extension=${ext||'mp4'}`);
            const data = await res.json(); urlFinal = data.url;
        } else if(tipo === 'live') {
            const res = await fetch(`/api/iptv?action=get_live_url&stream_id=${id}`);
            const data = await res.json(); urlFinal = data.url;
        } else if(tipo === 'episode') {
            const res = await fetch(`/api/iptv?action=get_series_url&stream_id=${id}&extension=${ext||'mp4'}`);
            const data = await res.json(); urlFinal = data.url;
        }
        if(!urlFinal) throw new Error("Link não retornado.");
        const urlLimpa = urlFinal.replace(/^https?:\/\//, '');
        const intentUrl = `intent://${urlLimpa}#Intent;scheme=http;type=video/*;action=android.intent.action.VIEW;end;`;
        const a = document.createElement('a');
        a.href = intentUrl;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } catch(e) { mostrarToast("Erro: " + e.message); }
    finally { if(btn) { btn.innerHTML = `<i class="fas fa-play"></i> Assistir Agora`; btn.disabled = false; } }
}

// ===================== NAVEGACAO E MENU =====================
function abrirMenuPrincipal() {
    document.getElementById('menuOverlay').classList.add('active');
    document.getElementById('menuPrincipal').classList.add('active');
}
function fecharMenuPrincipal() {
    document.getElementById('menuOverlay').classList.remove('active');
    document.getElementById('menuPrincipal').classList.remove('active');
}

function mudarAba(idView, btn, originHistory = false) {
    if(idView !== 'view-home' && heroInterval) { clearInterval(heroInterval); heroInterval = null; }
    else if(idView === 'view-home' && !heroInterval && heroItems.length > 0) { iniciarHeroSlider(); }
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    else { const autoBtn = document.getElementById('nav-' + idView.replace('view-','')); if(autoBtn) autoBtn.classList.add('active'); }
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(idView).classList.add('active');
    const mainHeader = document.getElementById('mainHeader');
    if(mainHeader) {
        if(idView === 'view-home') mainHeader.style.display = 'flex';
        else mainHeader.style.display = 'none';
    }
    if(!originHistory && idView !== 'view-home') history.pushState({ view: idView }, null, "");
    if(idView === 'view-historico') carregarHistorico();
    if(idView === 'view-buscar') { setTimeout(() => document.getElementById('inputBuscaGlobal').focus(), 300); }
}

function entrarModoIPTV() {
    document.getElementById('view-iptv').classList.add('active');
    document.querySelectorAll('.view').forEach(v => { if(v.id !== 'view-iptv') v.classList.remove('active'); });
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    const mainHeader = document.getElementById('mainHeader');
    if(mainHeader) mainHeader.style.display = 'none';
    history.pushState({ view: 'view-iptv' }, null, "");
    carregarIPTFilmes();
}
function mudarAbaIPTV(contentId, tabEl) {
    document.querySelectorAll('.iptv-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.iptv-content').forEach(c => c.classList.remove('active'));
    tabEl.classList.add('active');
    document.getElementById(contentId).classList.add('active');
    if(contentId === 'iptv-filmes' && !iptvCarregado.filmes) carregarIPTFilmes();
    if(contentId === 'iptv-series' && !iptvCarregado.series) carregarIPTSeries();
    if(contentId === 'iptv-tv' && !iptvCarregado.tv) carregarIPTTV();
}

// ===================== IPTV =====================
async function carregarIPTFilmes() {
    iptvCarregado.filmes = true;
    const div = document.getElementById('conteudo-iptv-filmes');
    div.innerHTML = '<p class="loading-text"><i class="fas fa-spinner fa-spin"></i> Carregando...</p>';
    try {
        const res = await fetch('/api/iptv?action=get_vod_categories');
        const cats = await res.json();
        const validas = cats.filter(c => pastaValida(c.category_name));
        let html = '';
        validas.forEach(cat => {
            html += `<div class="category-item" onclick="abrirGradeIPTV('vod', '${cat.category_id}', '${esc(limparNomePasta(cat.category_name))}')">
                <div style="display:flex; align-items:center; gap:15px;"><i class="fas fa-film category-icon"></i><span class="category-name">${limparNomePasta(cat.category_name)}</span></div>
                <i class="fas fa-chevron-right" style="color: var(--text-muted); font-size: 12px;"></i></div>`;
        });
        div.innerHTML = html || '<p class="loading-text">Nenhuma categoria.</p>';
    } catch(e) { div.innerHTML = '<p class="loading-text">Erro ao carregar.</p>'; }
}
async function carregarIPTSeries() {
    iptvCarregado.series = true;
    const div = document.getElementById('conteudo-iptv-series');
    div.innerHTML = '<p class="loading-text"><i class="fas fa-spinner fa-spin"></i> Carregando...</p>';
    try {
        const res = await fetch('/api/iptv?action=get_series_categories');
        const cats = await res.json();
        const validas = cats.filter(c => pastaValida(c.category_name));
        let html = '';
        validas.forEach(cat => {
            html += `<div class="category-item" onclick="abrirGradeIPTV('series', '${cat.category_id}', '${esc(limparNomePasta(cat.category_name))}')">
                <div style="display:flex; align-items:center; gap:15px;"><i class="fas fa-tv category-icon"></i><span class="category-name">${limparNomePasta(cat.category_name)}</span></div>
                <i class="fas fa-chevron-right" style="color: var(--text-muted); font-size: 12px;"></i></div>`;
        });
        div.innerHTML = html || '<p class="loading-text">Nenhuma categoria.</p>';
    } catch(e) { div.innerHTML = '<p class="loading-text">Erro ao carregar.</p>'; }
}
async function carregarIPTTV() {
    iptvCarregado.tv = true;
    const div = document.getElementById('conteudo-iptv-tv');
    div.innerHTML = '<p class="loading-text"><i class="fas fa-spinner fa-spin"></i> Carregando...</p>';
    try {
        const res = await fetch('/api/iptv?action=get_live_categories');
        const cats = await res.json();
        const validas = cats.filter(c => pastaTVValida(c.category_name));
        let html = '';
        validas.forEach(cat => {
            html += `<div class="category-item" onclick="abrirGradeIPTV('live', '${cat.category_id}', '${esc(limparNomePasta(cat.category_name))}')">
                <div style="display:flex; align-items:center; gap:15px;"><i class="fas fa-broadcast-tower category-icon"></i><span class="category-name">${limparNomePasta(cat.category_name)}</span></div>
                <i class="fas fa-chevron-right" style="color: var(--text-muted); font-size: 12px;"></i></div>`;
        });
        div.innerHTML = html || '<p class="loading-text">Nenhuma categoria.</p>';
    } catch(e) { div.innerHTML = '<p class="loading-text">Erro ao carregar.</p>'; }
}

async function abrirGradeIPTV(tipo, catId, nomePasta) {
    document.getElementById('titulo-grade').innerText = nomePasta;
    const container = document.getElementById('conteudo-grade');
    container.innerHTML = `<div class="loading-text" style="grid-column: span 3;"><i class="fas fa-spinner fa-spin"></i> Carregando...</div>`;
    mudarAba('view-grade', null);
    try {
        let action = tipo === 'vod' ? 'get_vod_streams' : tipo === 'series' ? 'get_series' : 'get_live_streams';
        const res = await fetch(`/api/iptv?action=${action}&category_id=${catId}`);
        const lista = await res.json();
        let html = '';
        lista.forEach(item => {
            if(tipo === 'live') {
                const fmtd = processarTV(item.name);
                const capa = item.stream_icon;
                html += `<div class="card-movie card-tv" style="height: 110px;" onclick="abrirSheetTV('${esc(fmtd.limpo)}', '${item.stream_id}', '${esc(fmtd.tagsStr)}')">
                    <div class="card-badges">${gerarHTMLBadges(fmtd.tagsStr)}</div>
                    ${capa ? `<img src="${capa}" loading="lazy" onerror="this.src='https://via.placeholder.com/100x50/333/fff?text=TV'">` : `<i class="fas fa-tv" style="font-size:24px; color:#555; margin-bottom:5px;"></i>`}
                    <div class="titulo-tv">${fmtd.limpo}</div></div>`;
            } else {
                const fmtd = processarTitulo(item.name, nomePasta);
                const capa = item.stream_icon || item.cover;
                html += `<div class="card-movie" onclick="abrirDetalhesIPTV('${esc(fmtd.limpo)}', '${esc(nomePasta)}', '${esc(capa)}', '${tipo==='vod'?item.stream_id:item.series_id}', '${tipo}', '${item.container_extension||'mp4'}', '${esc(fmtd.tagsStr)}')">
                    <div class="card-badges">${gerarHTMLBadges(fmtd.tagsStr)}</div>
                    ${capa ? `<img src="${capa}" loading="lazy" onerror="this.src='https://via.placeholder.com/220x330/111/fff';">` : `<img src="https://via.placeholder.com/220x330/111/fff"><div class="titulo-fallback">${fmtd.limpo}</div>`}
                </div>`;
            }
        });
        container.innerHTML = html || `<p class="loading-text" style="grid-column: span 3;">Pasta vazia.</p>`;
    } catch(e) { container.innerHTML = `<p class="loading-text" style="grid-column: span 3;">Erro.</p>`; }
}

async function abrirDetalhesIPTV(titulo, cat, urlCapa, id, tipo, ext, tagsStr) {
    document.getElementById('dpTitle').innerText = titulo;
    document.getElementById('dpMeta').innerHTML = gerarHTMLBadges(tagsStr) + `<span style="color:var(--text-muted); margin-left:5px;">${cat}</span>`;
    const capa = urlCapa || 'https://via.placeholder.com/800x600/111/fff';
    document.getElementById('dpPoster').style.backgroundImage = `url('${capa}')`;
    document.getElementById('dpTmdbMeta').innerHTML = ''; document.getElementById('dpDirector').innerText = '';
    document.getElementById('dpSynopsis').innerText = 'Conteúdo do catálogo IPTV direto.';
    document.getElementById('dpCastContainer').style.display = 'none'; document.getElementById('dpSimilarContainer').style.display = 'none';
    document.getElementById('btnTrailer').style.display = 'none'; document.getElementById('dpEpisodes').style.display = 'none';
    currentTmdbId = null; currentItemType = tipo === 'series' ? 'tv' : 'movie';
    currentStreamData = { id: id, title: titulo, img: capa, type: tipo, ext: ext };
    const btnPlay = document.getElementById('btnPlayFilme');
    btnPlay.style.display = 'flex';
    btnPlay.onclick = () => dispararPlayer(id, tipo, ext, titulo);
    document.getElementById('detailsPage').classList.add('active');
    document.body.classList.add('no-scroll');
    history.pushState({ view: 'details', modal: true }, null, "");
}

let timeoutBuscaTVIPTV = null;
async function pesquisarTV() {
    clearTimeout(timeoutBuscaTVIPTV);
    const inputTv = document.getElementById('inputBuscaIPTVTV');
    if(!inputTv) return;
    const query = inputTv.value.toLowerCase();
    const divPastas = document.getElementById('conteudo-iptv-tv');
    const divResultados = document.getElementById('resultados-iptv-tv');
    if(query.length < 3) { divPastas.style.display = 'block'; divResultados.style.display = 'none'; return; }
    divPastas.style.display = 'none'; divResultados.style.display = 'grid';
    divResultados.innerHTML = `<div class="loading-text" style="grid-column: span 3;"><i class="fas fa-spinner fa-spin"></i> Buscando...</div>`;
    timeoutBuscaTVIPTV = setTimeout(async () => {
        if(!bancoTV) { try { const res = await fetch('/api/iptv?action=get_live_streams'); bancoTV = await res.json(); } catch(e) { return; } }
        const resultados = bancoTV.filter(c => c.name && c.name.toLowerCase().includes(query)).slice(0, 50);
        if(resultados.length === 0) { divResultados.innerHTML = `<p class="loading-text" style="grid-column:span 3;">Nenhum canal.</p>`; return; }
        let html = "";
        resultados.forEach(item => {
            const fmtd = processarTV(item.name); const capa = item.stream_icon;
            html += `<div class="card-movie card-tv" style="height: 110px;" onclick="abrirSheetTV('${esc(fmtd.limpo)}', '${item.stream_id}', '${esc(fmtd.tagsStr)}')">
                <div class="card-badges">${gerarHTMLBadges(fmtd.tagsStr)}</div>
                ${capa ? `<img src="${capa}" loading="lazy" onerror="this.src='https://via.placeholder.com/100x50/333/fff?text=TV'">` : `<i class="fas fa-tv" style="font-size:24px; color:#555; margin-bottom:5px;"></i>`}
                <div class="titulo-tv">${fmtd.limpo}</div></div>`;
        });
        divResultados.innerHTML = html;
    }, 800);
}

// ===================== ANIME (Jikan API) =====================
function entrarModoAnime() {
    document.getElementById('view-anime').classList.add('active');
    document.querySelectorAll('.view').forEach(v => { if(v.id !== 'view-anime') v.classList.remove('active'); });
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    const mainHeader = document.getElementById('mainHeader');
    if(mainHeader) mainHeader.style.display = 'none';
    history.pushState({ view: 'view-anime' }, null, "");
    if(!animeCarregado) carregarAnimeDestaques();
}

function renderAnimeTabs() {
    const container = document.getElementById('animeTabs');
    if(!container) return;
    let html = '<div class="anime-tab active" onclick="mudarAbaAnime('anime-destaques', this)"><i class="fas fa-fire"></i> Destaques</div>';
    ANIME_GENRES.slice(0, 8).forEach(g => {
        html += '<div class="anime-tab" onclick="filtrarAnimeGenero('+g.id+', ''+esc(g.name)+'', this)">'+esc(g.name)+'</div>';
    });
    container.innerHTML = html;
}

async function carregarAnimeDestaques() {
    animeCarregado = true;
    renderAnimeTabs();
    const div = document.getElementById('conteudo-anime-destaques');
    div.innerHTML = '<div class="loading-text"><i class="fas fa-spinner fa-spin"></i> Carregando...</div>';
    try {
        const res = await fetch('https://api.jikan.moe/v4/top/anime?limit=15');
        const data = await res.json();
        if(data.data) {
            div.innerHTML = renderAnimeCarousel('Top Animes', data.data);
            const airing = await fetch('https://api.jikan.moe/v4/seasons/now?limit=10');
            const airingData = await airing.json();
            if(airingData.data) {
                div.innerHTML += renderAnimeCarousel('Em Exibição', airingData.data);
            }
        }
    } catch(e) { div.innerHTML = '<p class="loading-text">Erro ao carregar animes.</p>'; }
}

function renderAnimeCarousel(title, items) {
    if(!items || items.length === 0) return '';
    let cards = items.map(i => {
        const img = i.images?.jpg?.image_url || i.images?.webp?.image_url || 'https://via.placeholder.com/110x165/111/fff';
        const score = i.score ? '<span class="anime-score"><i class="fas fa-star"></i> '+i.score+'</span>' : '';
        const tipo = i.type ? '<span class="anime-type">'+i.type+'</span>' : '';
        return '<div class="card-anime" onclick="abrirDetalhesAnime('+i.mal_id+')">'+score+tipo+'<img src="'+img+'" loading="lazy"><div class="anime-title-overlay">'+esc(i.title)+'</div></div>';
    }).join('');
    return '<div class="section-header"><div class="section-title"><i class="fas fa-dragon"></i> '+esc(title)+'</div></div><div class="carousel">'+cards+'</div>';
}

function renderAnimeGrid(items) {
    if(!items || items.length === 0) return '<p class="loading-text" style="grid-column:span 3;">Nenhum resultado.</p>';
    return items.map(i => {
        const img = i.images?.jpg?.image_url || 'https://via.placeholder.com/110x165/111/fff';
        const score = i.score ? '<span class="anime-score"><i class="fas fa-star"></i> '+i.score+'</span>' : '';
        return '<div class="card-anime" style="flex:unset;width:100%;height:160px;" onclick="abrirDetalhesAnime('+i.mal_id+')">'+score+'<img src="'+img+'" loading="lazy"><div class="anime-title-overlay">'+esc(i.title)+'</div></div>';
    }).join('');
}

function mudarAbaAnime(contentId, tabEl) {
    document.querySelectorAll('.anime-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.anime-content').forEach(c => c.classList.remove('active'));
    if(tabEl) tabEl.classList.add('active');
    document.getElementById(contentId).classList.add('active');
}

let timeoutBuscaAnime = null;
async function pesquisarAnime() {
    clearTimeout(timeoutBuscaAnime);
    const query = document.getElementById('inputBuscaAnime').value.trim();
    const divDestaques = document.getElementById('anime-destaques');
    const divResultados = document.getElementById('anime-resultados');
    const divConteudo = document.getElementById('conteudo-anime-resultados');
    if(query.length < 3) {
        divDestaques.classList.add('active');
        divResultados.classList.remove('active');
        return;
    }
    divDestaques.classList.remove('active');
    divResultados.classList.add('active');
    divConteudo.innerHTML = '<div class="loading-text"><i class="fas fa-spinner fa-spin"></i> Buscando...</div>';
    timeoutBuscaAnime = setTimeout(async () => {
        try {
            const res = await fetch('https://api.jikan.moe/v4/anime?q='+encodeURIComponent(query)+'&limit=24');
            const data = await res.json();
            divConteudo.innerHTML = '<div class="grid-container">'+renderAnimeGrid(data.data)+'</div>';
        } catch(e) { divConteudo.innerHTML = '<p class="loading-text">Erro na busca.</p>'; }
    }, 600);
}

async function filtrarAnimeGenero(genreId, genreName, tabEl) {
    mudarAbaAnime('anime-resultados', tabEl);
    const divConteudo = document.getElementById('conteudo-anime-resultados');
    divConteudo.innerHTML = '<div class="loading-text"><i class="fas fa-spinner fa-spin"></i> Carregando...</div>';
    try {
        const res = await fetch('https://api.jikan.moe/v4/anime?genres='+genreId+'&order_by=popularity&limit=24');
        const data = await res.json();
        divConteudo.innerHTML = '<div class="section-header"><div class="section-title">'+esc(genreName)+'</div></div><div class="grid-container">'+renderAnimeGrid(data.data)+'</div>';
    } catch(e) { divConteudo.innerHTML = '<p class="loading-text">Erro.</p>'; }
}

async function abrirDetalhesAnime(malId) {
    mostrarToast("Carregando anime...");
    try {
        const res = await fetch('https://api.jikan.moe/v4/anime/'+malId+'/full');
        const data = await res.json();
        const anime = data.data;
        if(!anime) { mostrarToast("Anime não encontrado."); return; }
        const title = anime.title || anime.title_english || 'Anime';
        const img = anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || '';
        const synopsis = anime.synopsis || 'Sinopse indisponível.';
        const score = anime.score || 0;
        const year = anime.year || (anime.aired?.from ? anime.aired.from.substring(0,4) : '');
        const genres = anime.genres?.map(g=>g.name).join(', ') || '';
        document.getElementById('dpTitle').innerText = title;
        document.getElementById('dpPoster').style.backgroundImage = "url('"+img+"')";
        document.getElementById('dpTmdbMeta').innerHTML = '<i class="fas fa-star" style="color:gold;"></i> '+score+' &nbsp;&bull;&nbsp; '+year+' &nbsp;&bull;&nbsp; '+genres;
        document.getElementById('dpDirector').innerText = 'Estúdio: '+(anime.studios?.map(s=>s.name).join(', ') || 'N/A');
        document.getElementById('dpSynopsis').innerText = synopsis;
        document.getElementById('dpCastContainer').style.display = 'none';
        document.getElementById('dpSimilarContainer').style.display = 'none';
        document.getElementById('btnTrailer').style.display = 'none';
        document.getElementById('dpEpisodes').style.display = 'none';
        currentTmdbId = null;
        currentItemType = 'movie';
        currentStreamData = { id: 'anime_'+malId, title: title, img: img, type: 'movie' };
        const btnPlay = document.getElementById('btnPlayFilme');
        btnPlay.style.display = 'flex';
        btnPlay.onclick = () => {
            mostrarToast("Buscando anime nos servidores...");
            fecharMenuServidores();
            const modal = document.getElementById('embedModal');
            const frame = document.getElementById('embedFrame');
            frame.src = 'https://embedplayapi.top/embed/'+encodeURIComponent(title);
            modal.style.display = 'flex';
            modal.classList.add('active-embed');
            document.body.classList.add('no-scroll');
            history.pushState({ view: 'embed', modal: true }, null, "");
        };
        document.getElementById('detailsPage').classList.add('active');
        document.body.classList.add('no-scroll');
        history.pushState({ view: 'details', modal: true }, null, "");
    } catch(e) { mostrarToast("Erro ao carregar anime."); }
}

// ===================== DORAMA (TMDB Discover) =====================
function entrarModoDorama() {
    document.getElementById('view-dorama').classList.add('active');
    document.querySelectorAll('.view').forEach(v => { if(v.id !== 'view-dorama') v.classList.remove('active'); });
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    const mainHeader = document.getElementById('mainHeader');
    if(mainHeader) mainHeader.style.display = 'none';
    history.pushState({ view: 'view-dorama' }, null, "");
    if(!doramaCarregado) carregarDoramaDestaques();
}

function renderDoramaTabs() {
    const container = document.getElementById('doramaTabs');
    if(!container) return;
    let html = '<div class="dorama-tab active" onclick="mudarAbaDorama('dorama-destaques', this)"><i class="fas fa-fire"></i> Destaques</div>';
    DORAMA_COUNTRIES.forEach(c => {
        html += '<div class="dorama-tab" onclick="filtrarDoramaPais(''+c.code+'', ''+esc(c.name)+'', this)">'+esc(c.name)+'</div>';
    });
    container.innerHTML = html;
}

async function carregarDoramaDestaques() {
    doramaCarregado = true;
    renderDoramaTabs();
    const div = document.getElementById('conteudo-dorama-destaques');
    div.innerHTML = '<div class="loading-text"><i class="fas fa-spinner fa-spin"></i> Carregando...</div>';
    try {
        const kr = await fetch('https://api.themoviedb.org/3/discover/tv?api_key='+tmdbKeyAtiva+'&with_origin_country=KR&sort_by=popularity.desc&language=pt-BR&page=1');
        const krData = await kr.json();
        let html = '';
        if(krData.results) html += renderCarousel('K-Dramas em Alta', krData.results.slice(0,10), 'tv');
        const jp = await fetch('https://api.themoviedb.org/3/discover/tv?api_key='+tmdbKeyAtiva+'&with_origin_country=JP&sort_by=popularity.desc&language=pt-BR&page=1');
        const jpData = await jp.json();
        if(jpData.results) html += renderCarousel('J-Dramas', jpData.results.slice(0,10), 'tv');
        div.innerHTML = html || '<p class="loading-text">Nenhum dorama encontrado.</p>';
    } catch(e) { div.innerHTML = '<p class="loading-text">Erro ao carregar doramas.</p>'; }
}

function mudarAbaDorama(contentId, tabEl) {
    document.querySelectorAll('.dorama-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.dorama-content').forEach(c => c.classList.remove('active'));
    if(tabEl) tabEl.classList.add('active');
    document.getElementById(contentId).classList.add('active');
}

async function filtrarDoramaPais(countryCode, countryName, tabEl) {
    mudarAbaDorama('dorama-resultados', tabEl);
    const divConteudo = document.getElementById('conteudo-dorama-resultados');
    divConteudo.innerHTML = '<div class="loading-text"><i class="fas fa-spinner fa-spin"></i> Carregando...</div>';
    try {
        const res = await fetch('https://api.themoviedb.org/3/discover/tv?api_key='+tmdbKeyAtiva+'&with_origin_country='+countryCode+'&sort_by=popularity.desc&language=pt-BR&page=1');
        const data = await res.json();
        divConteudo.innerHTML = '<div class="section-header"><div class="section-title">'+esc(countryName)+'</div></div><div class="grid-container">'+renderGrid(data.results||[], 'tv')+'</div>';
    } catch(e) { divConteudo.innerHTML = '<p class="loading-text">Erro.</p>'; }
}

// ===================== GESTOS E EVENTOS =====================
function handleTouchStart(e) {
    touchStartY = e.changedTouches[0].screenY;
    touchStartX = e.changedTouches[0].screenX;
}
function handleTouchEnd(e) {
    const touchEndY = e.changedTouches[0].screenY;
    const touchEndX = e.changedTouches[0].screenX;
    const deltaY = touchEndY - touchStartY;
    const deltaX = touchEndX - touchStartX;
    if(deltaY > 100 && Math.abs(deltaX) < 50) {
        const trailer = document.getElementById('trailerModal');
        const embed = document.getElementById('embedModal');
        if(trailer.style.display === 'flex') fecharTrailer();
        if(embed.style.display === 'flex') fecharEmbedWeb();
    }
}

window.addEventListener('popstate', function(event) {
    const modais = [
        { id: 'adBlockModal', check: (el) => el.style.display === 'flex', close: fecharAdBlock },
        { id: 'embedModal', check: (el) => el.style.display === 'flex', close: fecharEmbedWeb },
        { id: 'trailerModal', check: (el) => el.style.display === 'flex', close: fecharTrailer },
        { id: 'serverModal', check: (el) => el.classList.contains('active'), close: fecharMenuServidores },
        { id: 'actorModal', check: (el) => el.classList.contains('active'), close: fecharAtor },
        { id: 'detailsPage', check: (el) => el.classList.contains('active'), close: fecharDetalhes },
        { id: 'bottomSheet', check: (el) => el.classList.contains('active'), close: fecharSheetTV },
        { id: 'menuPrincipal', check: (el) => el.classList.contains('active'), close: fecharMenuPrincipal },
        { id: 'vipModal', check: (el) => el.style.display === 'flex', close: fecharModalVip }
    ];
    for(let modal of modais) {
        const el = document.getElementById(modal.id);
        if(el && modal.check(el)) {
            modal.close();
            return;
        }
    }
    if(document.getElementById('view-anime').classList.contains('active')) {
        document.getElementById('view-anime').classList.remove('active');
        const mainHeader = document.getElementById('mainHeader');
        if(mainHeader) mainHeader.style.display = 'flex';
        mudarAba('view-home', document.getElementById('nav-home'), true);
        return;
    }
    if(document.getElementById('view-dorama').classList.contains('active')) {
        document.getElementById('view-dorama').classList.remove('active');
        const mainHeader = document.getElementById('mainHeader');
        if(mainHeader) mainHeader.style.display = 'flex';
        mudarAba('view-home', document.getElementById('nav-home'), true);
        return;
    }
    if(document.getElementById('view-iptv').classList.contains('active')) {
        document.getElementById('view-iptv').classList.remove('active');
        const mainHeader = document.getElementById('mainHeader');
        if(mainHeader) mainHeader.style.display = 'flex';
        mudarAba('view-home', document.getElementById('nav-home'), true);
        return;
    }
    if(event.state && event.state.view && event.state.view !== 'view-home') {
        mudarAba(event.state.view, null, true);
        return;
    }
    if(document.getElementById('view-home').classList.contains('active')) {
        return;
    }
    mudarAba('view-home', document.getElementById('nav-home'), true);
});

document.addEventListener('backbutton', function(e) {
    e.preventDefault();
    history.back();
}, false);

window.onload = () => {
    history.replaceState({ view: 'view-home' }, null, "");
    initApp();
};

function fecharAdBlock() {
    document.getElementById('adBlockModal').style.display = 'none';
    document.body.classList.remove('no-scroll');
}
