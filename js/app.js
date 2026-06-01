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
let currentSuperFlixType = 'animes'; 
let lastSuperFlixData = [];

// Touch gesture vars
let touchStartY = 0;
let touchStartX = 0;

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
                desativarTodosAds();
            } else { msg.innerText = "Sua conta não tem status VIP."; msg.style.display = 'block'; }
        } else { msg.innerText = "E-mail ou senha incorretos."; msg.style.display = 'block'; }
    } catch(e) { msg.innerText = e.message; msg.style.display = 'block'; }
    finally { btn.innerText = "Entrar na Conta VIP"; btn.disabled = false; }
}

function verificarStatusVip() {
    const btnVip = document.getElementById('btnOpenVip');
    if(btnVip) btnVip.style.display = isVip() ? 'none' : 'block';
    const menuVipStatus = document.getElementById('menuVipStatus');
    if(menuVipStatus) {
        if(isVip()) menuVipStatus.innerHTML = '<i class="fas fa-crown" style="color:gold"></i> VIP Ativo';
        else menuVipStatus.innerHTML = '<i class="fas fa-gem" style="color:var(--accent)"></i> Gratuito';
    }
}

// ===================== ADS =====================
function desativarTodosAds() {
    const scripts = document.querySelectorAll('script');
    scripts.forEach(s => {
        const src = s.src || '';
        if(src.includes('5gvci.com') || src.includes('al5sm.com') || src.includes('tag.min.js') || src.includes('omg10.com')) {
            s.remove();
        }
    });
    localStorage.setItem('streamflix_vip', 'true');
    localStorage.setItem('push_accepted', 'false');
    const pushPrompt = document.getElementById('pushPromptModal');
    if(pushPrompt) pushPrompt.style.display = 'none';
    mostrarToast("VIP Ativado! Anúncios removidos.");
    setTimeout(() => location.reload(), 1500);
}

function injetarAnuncios() {
    if(isVip() || adsInjetados) return;
    if(localStorage.getItem('push_accepted') !== 'true') {
        setTimeout(() => { 
            const prompt = document.getElementById('pushPromptModal'); 
            if(prompt) prompt.style.display = 'block'; 
        }, 2500);
    } else {
        activarTodosAds();
    }
}

function aceitarPush() {
    document.getElementById('pushPromptModal').style.display = 'none';
    localStorage.setItem('push_accepted', 'true');
    activarTodosAds();
    mostrarToast("Notificações ativadas!");
}

function activarTodosAds() {
    if(isVip() || adsInjetados) return;
    adsInjetados = true;
    const s1 = document.createElement('script'); s1.src = 'https://5gvci.com/act/files/tag.min.js?z=11081861'; s1.async = true; document.head.appendChild(s1);
    const s2 = document.createElement('script'); s2.src = 'https://5gvci.com/act/files/tag.min.js?z=11081853'; s2.async = true; document.head.appendChild(s2);
    const s3 = document.createElement('script'); s3.dataset.zone = '11081852'; s3.src = 'https://al5sm.com/tag.min.js'; s3.async = true; document.head.appendChild(s3);
}

function dispararDirectLink() {
    if(isVip()) return;
    let a = document.createElement('a');
    a.href = 'https://omg10.com/4/11081875';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// ===================== UTILS =====================
function mostrarToast(msg) {
    let t = document.getElementById('toast-msg'); if(!t) return;
    t.innerText = msg; t.style.opacity = '1';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.style.opacity = '0'; }, 3500);
}
function esc(str) { return (str || '').toString().replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;'); }
function getWatchedList() { try { return JSON.parse(localStorage.getItem('streamflix_watched_v2')) || {}; } catch(e) { return {}; } }
function saveWatchedList(list) { localStorage.setItem('streamflix_watched_v2', JSON.stringify(list)); }
function getFavList() { try { return JSON.parse(localStorage.getItem('streamflix_favs')) || {}; } catch(e) { return {}; } }
function saveFavList(list) { localStorage.setItem('streamflix_favs', JSON.stringify(list)); }

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

// ===================== TMDB =====================
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
        const data = await res.json();
        localStorage.setItem(cacheKey, JSON.stringify({ data, ts: Date.now() }));
        return data;
    } catch(e) { return { results: [] }; }
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

// ===================== APP INIT =====================
async function initApp() {
    verificarStatusVip();
    injetarAnuncios(); 
    renderGenreChips();

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
    if(document.getElementById('btnPlayFilme')) document.getElementById('btnPlayFilme').style.display = 'flex';
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
            if(document.getElementById('btnPlayFilme')) document.getElementById('btnPlayFilme').style.display = 'none';
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

    } catch(err) { document.getElementById('dpSynopsis').innerText = "Erro ao carregar detalhes."; }
}

// ===================== MENUS E REPRODUÇÃO =====================
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

        const matches = data.filter(item => (item.name || '').toLowerCase().includes(termo));
        if(matches.length > 0) {
            let match = matches.find(m => !/(4k|uhd|2160p)/i.test((m.name || '').toLowerCase()));
            if(!match) match = matches[0]; 

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
    } else if(servidor === 'superflix') {
        // EXATAMENTE O FORMATO OFICIAL DO SUPERFLIX
        if(currentItemType === 'movie') finalUrl = `https://superflixapi.fit/filme/${currentTmdbId}`;
        else finalUrl = `https://superflixapi.fit/serie/${currentTmdbId}/${currentSeason}/${currentEpisode}`;
    }

    dispararDirectLink();

    setTimeout(() => {
        frame.src = finalUrl;
        modal.style.display = 'flex';
        document.body.classList.add('no-scroll');
        history.pushState({ view: 'embed', modal: true }, null, "");
        
        try { 
            if(screen.orientation && screen.orientation.lock) {
                screen.orientation.lock('landscape').catch(e => console.log(e));
            } 
        } catch(e) {}
    }, 800);
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
        const pRes = await fetch(`https://api.themoviedb.org/3/person/${atorId}?api_key=${TMDB_API_KEY}&language=pt-BR`);
        const pData = await pRes.json();
        document.getElementById('actorName').innerText = pData.name;
        document.getElementById('actorImg').src = pData.profile_path ? `${TMDB_IMG}/w300${pData.profile_path}` : 'https://via.placeholder.com/150';
        let idade = "";
        if(pData.birthday) { const nasc = new Date(pData.birthday); const ageDifMs = Date.now() - nasc.getTime(); const ageDate = new Date(ageDifMs); idade = ` • ${Math.abs(ageDate.getUTCFullYear() - 1970)} anos`; }
        document.getElementById('actorMeta').innerText = pData.birthday ? `${pData.birthday}${idade}` : "";
        document.getElementById('actorPlace').innerText = pData.place_of_birth || "";
        document.getElementById('actorBio').innerText = pData.biography || "Biografia indisponível.";
        const cRes = await fetch(`https://api.themoviedb.org/3/person/${atorId}/combined_credits?api_key=${TMDB_API_KEY}&language=pt-BR`);
        const cData = await cRes.json();
        if(cData.cast && cData.cast.length > 0) {
            const obras = cData.cast.sort((a,b) => b.popularity - a.popularity).slice(0, 20);
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
    document.body.classList.add('no-scroll');
    history.pushState({ view: 'trailer', modal: true }, null, "");
}
function fecharTrailer() {
    const frame = document.getElementById('trailerFrame');
    frame.src = 'about:blank';
    setTimeout(() => { frame.src = ''; }, 200);
    document.getElementById('trailerModal').style.display = 'none';
    document.body.classList.remove('no-scroll');
    if(history.state && history.state.view === 'trailer') history.back();
}
function fecharMenuServidores() {
    document.getElementById('serverModal').classList.remove('active');
    const overlay = document.getElementById('sheetOverlay');
    if(overlay) overlay.classList.remove('active');
}
function fecharEmbedWeb() {
    const frame = document.getElementById('embedFrame');
    frame.src = 'about:blank';
    setTimeout(() => { frame.src = ''; }, 200);
    document.getElementById('embedModal').style.display = 'none';
    document.body.classList.remove('no-scroll');
    
    try { if(screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch(e) {}
    
    if(history.state && history.state.view === 'embed') history.back();
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

// ===================== NAVEGAÇÃO E MENU (AJUSTADO PARA NÃO TRAVAR ROLAGEM) =====================
function abrirMenuPrincipal() {
    document.getElementById('menuOverlay').classList.add('active');
    document.getElementById('menuPrincipal').classList.add('active');
    document.body.classList.add('no-scroll'); 
    history.pushState({ view: 'menuPrincipal', modal: true }, null, ""); 
}
function fecharMenuPrincipal() {
    document.getElementById('menuOverlay').classList.remove('active');
    document.getElementById('menuPrincipal').classList.remove('active');
    document.body.classList.remove('no-scroll'); 
    if(history.state && history.state.view === 'menuPrincipal') history.back();
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

    // Arrasto longo para baixo, sem muito desvio pros lados, fecha os modais
    if(deltaY > 80 && Math.abs(deltaX) < 100) {
        const trailer = document.getElementById('trailerModal');
        const embed = document.getElementById('embedModal');
        const menu = document.getElementById('menuPrincipal');
        const sheetTv = document.getElementById('bottomSheet');
        const serverMenu = document.getElementById('serverModal');

        if(trailer && trailer.style.display === 'flex') fecharTrailer();
        if(embed && embed.style.display === 'flex') fecharEmbedWeb();
        if(menu && menu.classList.contains('active')) fecharMenuPrincipal();
        if(sheetTv && sheetTv.classList.contains('active')) fecharSheetTV();
        if(serverMenu && serverMenu.classList.contains('active')) fecharMenuServidores();
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

    if(document.getElementById('view-superflix') && document.getElementById('view-superflix').classList.contains('active')) {
        document.getElementById('view-superflix').classList.remove('active');
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

    if(document.getElementById('view-grade').classList.contains('active')) {
        document.getElementById('view-grade').classList.remove('active');
        document.getElementById('view-iptv').classList.add('active');
        return;
    }

    if(document.getElementById('view-historico').classList.contains('active') || 
       document.getElementById('view-buscar').classList.contains('active')) {
        mudarAba('view-home', document.getElementById('nav-home'), true); 
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
    document.addEventListener('contextmenu', event => event.preventDefault());
};

function fecharAdBlock() {
    document.getElementById('adBlockModal').style.display = 'none';
    document.body.classList.remove('no-scroll');
}

// ===================== INTEGRAÇÃO SUPER FLIX (CORRIGIDA) =====================
async function abrirSuperFlix(tipo) {
    currentSuperFlixType = tipo;
    document.getElementById('titulo-superflix').innerText = tipo === 'animes' ? 'Animes' : 'Doramas';
    document.getElementById('inputBuscaSuperFlix').value = '';
    
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-superflix').classList.add('active');
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    
    const mainHeader = document.getElementById('mainHeader');
    if(mainHeader) mainHeader.style.display = 'none';

    carregarSuperFlixGeneros(tipo);
    carregarSuperFlixLista(tipo, null);
    history.pushState({ view: 'view-superflix' }, null, "");
}

async function carregarSuperFlixGeneros(tipo) {
    let catUrl = tipo === 'animes' ? 'anime' : 'dorama';
    try {
        const res = await fetch(`https://superflixapi.fit/lista?category=${catUrl}&type=generos&format=json`);
        const generos = await res.json();
        let html = `<div class="genre-chip active" onclick="filtrarSuperFlix(null, this)">Todos</div>`;
        if(generos && generos.length > 0) {
            generos.forEach(g => {
                const nomeCat = g.name || g;
                html += `<div class="genre-chip" onclick="filtrarSuperFlix('${nomeCat}', this)">${nomeCat}</div>`;
            });
        }
        document.getElementById('genreChipsSuperFlix').innerHTML = html;
    } catch(e) { console.error("Erro gêneros", e); }
}

function filtrarSuperFlix(genero, el) {
    document.querySelectorAll('#genreChipsSuperFlix .genre-chip').forEach(c => c.classList.remove('active'));
    if(el) el.classList.add('active');
    carregarSuperFlixLista(currentSuperFlixType, genero);
}

let timeoutSfBusca = null;
function pesquisarSuperFlix() {
    clearTimeout(timeoutSfBusca);
    const query = document.getElementById('inputBuscaSuperFlix').value.trim();
    timeoutSfBusca = setTimeout(() => {
        if(query.length >= 3) {
            carregarSuperFlixLista(currentSuperFlixType, null, query);
        } else if (query.length === 0) {
            carregarSuperFlixLista(currentSuperFlixType, null);
        }
    }, 800);
}

async function carregarSuperFlixLista(tipo, genero, busca = null) {
    const container = document.getElementById('conteudo-superflix');
    container.innerHTML = `<div class="loading-text" style="grid-column: span 3;"><i class="fas fa-spinner fa-spin"></i> Carregando...</div>`;
    
    try {
        let url = '';
        
        if (genero) {
            let catG = tipo === 'animes' ? 'anime' : 'dorama';
            url = `https://superflixapi.fit/lista?category=${catG}&type=tmdb&genero=${encodeURIComponent(genero.toLowerCase())}&format=json`;
        } else {
            let catBase = tipo === 'animes' ? 'animes' : 'dorama';
            url = `https://superflixapi.fit/lista?category=${catBase}&format=json`;
        }

        const res = await fetch(url);
        let dadosBrutos = await res.json();

        // O superflix às vezes retorna os arrays dentro de objetos com nomes diferentes
        let resultados = [];
        if (!Array.isArray(dadosBrutos)) {
            if (dadosBrutos.data) resultados = dadosBrutos.data;
            else if (dadosBrutos.series) resultados = dadosBrutos.series;
            else if (dadosBrutos.animes) resultados = dadosBrutos.animes;
            else resultados = Object.values(dadosBrutos);
        } else {
            resultados = dadosBrutos;
        }

        lastSuperFlixData = resultados;

        // Se houver busca, filtra apenas na lista que foi salva no cache local (é mais eficiente e focado)
        if (busca && lastSuperFlixData.length > 0) {
            resultados = lastSuperFlixData.filter(item => {
                const t = (item.title || item.nome || item.name || '').toLowerCase();
                return t.includes(busca.toLowerCase());
            });
        }

        if(!resultados || resultados.length === 0) {
            container.innerHTML = '<p class="loading-text" style="grid-column:span 3;">Nenhum resultado encontrado.</p>';
            return;
        }

        let html = '';
        resultados.slice(0, 50).forEach(item => {
            const titulo = item.title || item.nome || item.name || 'Sem Título';
            
            // Alguns endpoints mandam tmdb_id, outros apenas id
            const id = item.tmdb_id || item.id; 
            
            // As capas também mudam de nome
            const capa = item.cover || item.poster || item.poster_path || 'https://via.placeholder.com/220x330/111/fff';
            
            // Animes e Doramas carregam o módulo de "série" no the movie database (TMDB)
            const typeToOpen = 'tv'; 

            if(id && id !== 0) {
                html += `<div class="card-movie" onclick="abrirDetalhesTMDB(${id}, '${typeToOpen}')">
                    <img src="${capa}" loading="lazy" onerror="this.src='https://via.placeholder.com/220x330/111/fff';">
                    <div class="titulo-fallback" style="display:none">${esc(titulo)}</div>
                </div>`;
            }
        });
        
        container.innerHTML = html;
        
    } catch(e) {
        console.error("Erro no SuperFlix", e);
        container.innerHTML = '<p class="loading-text" style="grid-column:span 3;">Erro ao carregar do servidor.</p>';
    }
}
