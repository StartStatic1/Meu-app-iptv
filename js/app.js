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
let lastSuperFlixData = [];

// ===================== UTILS =====================
function mostrarToast(msg) {
    let t = document.getElementById('toast-msg'); if(!t) return;
    t.innerText = msg; t.style.opacity = '1';
    clearTimeout(t._timer); t._timer = setTimeout(() => { t.style.opacity = '0'; }, 3500);
}
function esc(str) { return !str ? '' : str.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function getWatchedList() { try { return JSON.parse(localStorage.getItem('streamflix_watched_v2')) || {}; } catch(e) { return {}; } }
function saveWatchedList(list) { localStorage.setItem('streamflix_watched_v2', JSON.stringify(list)); }
function getFavList() { try { return JSON.parse(localStorage.getItem('streamflix_favs')) || {}; } catch(e) { return {}; } }
function saveFavList(list) { localStorage.setItem('streamflix_favs', JSON.stringify(list)); }

function isVip() { return localStorage.getItem('streamflix_vip') === 'true'; }

// ===================== SUPABASE & VIP =====================
function getSupabase() {
    if(!meuSupabase) meuSupabase = window.supabase.createClient('https://gkujbjpvphuvrejpvvtz.supabase.co', 'sb_publishable_C9FMCjUyZnlzhINK2KZXWQ_ahpGu0yy');
    return meuSupabase;
}
function abrirModalVip() { 
    document.getElementById('vipModal').style.display = 'flex'; 
    document.body.classList.add('no-scroll');
    history.pushState({ view: 'vip', modal: true }, null, "");
}
function fecharModalVip(fromPopState = false) { 
    document.getElementById('vipModal').style.display = 'none'; 
    document.body.classList.remove('no-scroll');
    if(!fromPopState && history.state && history.state.view === 'vip') history.back();
}

async function fazerLoginVip() {
    const email = document.getElementById('vipEmail').value.trim();
    const senha = document.getElementById('vipSenha').value.trim();
    const btn = document.getElementById('btnLoginBtn');
    const msg = document.getElementById('vipMsg');
    if(!email || !senha) { msg.innerText = "Preencha os campos."; msg.style.display = 'block'; return; }
    
    btn.innerText = "Verificando..."; btn.disabled = true; msg.style.display = 'none';
    try {
        const { data, error } = await getSupabase().from('streamflix_users').select('*').eq('email', email).eq('senha', senha);
        if(error) throw error;
        if(data && data.length > 0 && data[0].status === 'VIP') {
            desativarTodosAds();
        } else { msg.innerText = "E-mail/Senha incorretos ou não VIP."; msg.style.display = 'block'; }
    } catch(e) { msg.innerText = "Erro ao conectar."; msg.style.display = 'block'; }
    finally { btn.innerText = "Entrar na Conta VIP"; btn.disabled = false; }
}

function verificarStatusVip() {
    const btnVip = document.getElementById('btnOpenVip');
    const statusVip = document.getElementById('menuVipStatus');
    if(isVip()) {
        if(btnVip) btnVip.style.display = 'none';
        if(statusVip) statusVip.innerHTML = '<i class="fas fa-gem" style="color:gold"></i> Assinante VIP';
    } else {
        if(btnVip) btnVip.style.display = 'block';
    }
}

// ===================== ADS =====================
function desativarTodosAds() {
    const scripts = document.querySelectorAll('script');
    scripts.forEach(s => {
        const src = s.src || '';
        if(src.includes('5gvci.com') || src.includes('al5sm.com') || src.includes('tag.min.js')) s.remove();
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
    adsInjetados = true;
    
    // Injeta Monetag nativo
    const s1 = document.createElement('script'); s1.src = 'https://5gvci.com/act/files/tag.min.js?z=11081861'; document.head.appendChild(s1);
    const s2 = document.createElement('script'); s2.src = 'https://5gvci.com/act/files/tag.min.js?z=11081853'; document.head.appendChild(s2);
    const s3 = document.createElement('script'); s3.dataset.zone = '11081852'; s3.src = 'https://al5sm.com/tag.min.js'; document.head.appendChild(s3);

    if(localStorage.getItem('push_accepted') !== 'true') {
        setTimeout(() => { const prompt = document.getElementById('pushPromptModal'); if(prompt) prompt.style.display = 'block'; }, 2500);
    }
}

function aceitarPush() {
    document.getElementById('pushPromptModal').style.display = 'none';
    localStorage.setItem('push_accepted', 'true');
    mostrarToast("Notificações ativadas!");
}

function dispararDirectLink() {
    if(isVip()) return;
    let a = document.createElement('a'); a.href = 'https://omg10.com/4/11081875'; a.target = '_blank';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

// ===================== TMDB FETCH =====================
async function tmdbFetch(endpoint) {
    const cacheKey = 'tmdb_' + endpoint.replace(/\?/g,'_').replace(/&/g,'_').replace(/=/g,'_');
    const cached = localStorage.getItem(cacheKey);
    if(cached) {
        try {
            const { data, ts } = JSON.parse(cached);
            const ttl = endpoint.includes('trending') ? 3600000 : 86400000;
            if((Date.now() - ts) < ttl) return data;
        } catch(e){}
    }
    try {
        const connector = endpoint.includes('?') ? '&' : '?';
        const res = await fetch(`https://api.themoviedb.org/3${endpoint}${connector}api_key=${TMDB_API_KEY}&language=pt-BR`);
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

// ===================== RENDERIZAÇÃO DE CARDS =====================
function renderCard(item, type) {
    const tmdbType = item.media_type || type;
    const title = item.title || item.name || 'Sem Título';
    const img = item.poster_path ? `${TMDB_IMG}/w300${item.poster_path}` : 'https://via.placeholder.com/220x330/111/fff';
    const nota = item.vote_average ? `<span style="position:absolute; top:5px; right:5px; background:rgba(0,0,0,0.7); color:gold; font-size:10px; font-weight:900; padding:3px 6px; border-radius:4px;"><i class="fas fa-star"></i> ${item.vote_average.toFixed(1)}</span>` : '';
    return `<div class="card-movie" onclick="abrirDetalhesTMDB(${item.id}, '${tmdbType === 'tv' ? 'tv' : 'movie'}')">
        ${nota}<img src="${img}" loading="lazy"><div class="titulo-fallback" style="display:none">${esc(title)}</div></div>`;
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

// ===================== APP INIT & HERO SLIDER =====================
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
        
        // Pega sinopses para o slider da Home
        heroItems = await Promise.all(filmes.slice(0, 5).map(f => getDetails(f.id, 'movie')));

        document.getElementById('loading-state').style.display = 'none';
        document.getElementById('conteudo-real').style.display = 'block';

        if(heroItems.length > 0) iniciarHeroSlider();
        let html = '';
        if(filmes.length > 5) html += renderCarousel('Filmes em Alta', filmes.slice(5), 'movie');
        if(series.length > 0) html += renderCarousel('Séries em Alta', series, 'tv');
        if(lancamentos.length > 0) html += renderCarousel('Lançamentos', lancamentos, 'movie');

        document.getElementById('conteudo-dinamico').innerHTML = html;
    } catch(e) {
        document.getElementById('loading-state').innerHTML = "<div class='loading-text'>Erro de conexão.</div>";
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
    const backdrop = f.backdrop_path ? `${TMDB_IMG}/w1280${f.backdrop_path}` : '';
    const tags = [];
    if(f.vote_average) tags.push(`<i class="fas fa-star" style="color:gold;"></i> ${f.vote_average.toFixed(1)}`);
    if(f.release_date) tags.push(f.release_date.substring(0,4));
    tags.push(f.first_air_date ? 'SÉRIE' : 'FILME');
    
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
    const txtOriginal = btn.innerHTML; btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;
    try {
        if(f.videos && f.videos.results) {
            const trailer = f.videos.results.find(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'));
            if(trailer) { trailerKeyAtivo = trailer.key; abrirTrailer(); }
            else mostrarToast("Trailer não encontrado.");
        } else mostrarToast("Trailer não encontrado.");
    } catch(e) { mostrarToast("Erro ao buscar trailer."); }
    finally { btn.innerHTML = txtOriginal; }
}

// ===================== BUSCA (TMDB & SUPERFLIX ANIMES/DORAMAS) =====================
function renderGenreChips() {
    const container = document.getElementById('genreChips'); if(!container) return;
    const genres = searchType === 'tv' ? TMDB_GENRES.tv : TMDB_GENRES.movie;
    let html = `<div class="genre-chip ${!selectedGenre ? 'active' : ''}" onclick="filtrarGenero(null)">Todos</div>`;
    genres.forEach(g => { html += `<div class="genre-chip ${selectedGenre == g.id ? 'active' : ''}" onclick="filtrarGenero(${g.id})">${esc(g.name)}</div>`; });
    container.innerHTML = html;
}

function setSearchType(type) {
    searchType = type;
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
    const typeBtn = document.getElementById('type-' + type);
    if(typeBtn) typeBtn.classList.add('active');

    selectedGenre = null;

    if (type === 'animes' || type === 'dorama') {
        carregarSuperFlixGenerosParaBusca(type);
    } else {
        renderGenreChips();
        const query = document.getElementById('inputBuscaGlobal').value.trim();
        if(query.length >= 3 || selectedGenre) pesquisarGlobal();
        else document.getElementById('resultados-global').innerHTML = `<p class="loading-text" style="grid-column: span 3; margin-top: 40px;">Digite pelo menos 3 letras.</p>`;
    }
}

function filtrarGenero(genreId) { selectedGenre = genreId; renderGenreChips(); pesquisarGlobal(); }

async function carregarSuperFlixGenerosParaBusca(tipo) {
    const container = document.getElementById('genreChips');
    if(!container) return;
    container.innerHTML = '<div class="genre-chip active">Carregando...</div>';
    let catUrl = tipo === 'animes' ? 'anime' : 'dorama';
    try {
        const res = await fetch(`https://superflixapi.fit/lista?category=${catUrl}&type=generos&format=json`);
        const generos = await res.json();
        let html = `<div class="genre-chip ${!selectedGenre ? 'active' : ''}" onclick="filtrarGeneroSuperFlix(null)">Todos</div>`;
        if(generos && generos.length > 0) {
            generos.forEach(g => {
                const nomeCat = g.name || g;
                html += `<div class="genre-chip ${selectedGenre === nomeCat ? 'active' : ''}" onclick="filtrarGeneroSuperFlix('${nomeCat}')">${esc(nomeCat)}</div>`;
            });
        }
        container.innerHTML = html;
        pesquisarGlobal();
    } catch(e) { container.innerHTML = ''; }
}

function filtrarGeneroSuperFlix(genero) {
    selectedGenre = genero;
    const container = document.getElementById('genreChips');
    if(container) {
        container.querySelectorAll('.genre-chip').forEach(c => c.classList.remove('active'));
        if(!genero) container.firstElementChild.classList.add('active');
        else Array.from(container.children).forEach(c => { if(c.innerText === genero) c.classList.add('active'); });
    }
    pesquisarGlobal();
}

async function pesquisarGlobal() {
    clearTimeout(timeoutBusca);
    const query = document.getElementById('inputBuscaGlobal').value.trim();
    const container = document.getElementById('resultados-global');

    if (searchType === 'animes' || searchType === 'dorama') {
        container.innerHTML = `<div class="loading-text" style="grid-column: span 3;"><i class="fas fa-spinner fa-spin"></i> Buscando...</div>`;
        timeoutBusca = setTimeout(() => { carregarSuperFlixParaBusca(searchType, selectedGenre, query.length >= 3 ? query : null); }, 800);
        return;
    }

    if(query.length < 3 && !selectedGenre) {
        container.innerHTML = `<p class="loading-text" style="grid-column: span 3; margin-top: 40px;">Digite pelo menos 3 letras.</p>`;
        return;
    }
    
    container.innerHTML = `<div class="loading-text" style="grid-column: span 3;"><i class="fas fa-spinner fa-spin"></i> Buscando no catálogo...</div>`;
    timeoutBusca = setTimeout(async () => {
        try {
            let items = [];
            if(selectedGenre) {
                const type = searchType === 'all' ? 'movie' : searchType;
                const d = await getDiscover(type, selectedGenre, 1); items = d.results || [];
                if(searchType === 'all') { const d2 = await getDiscover('tv', selectedGenre, 1); items = items.concat(d2.results || []); }
            } else {
                const type = searchType === 'all' ? '' : searchType;
                const d = await searchTMDB(query, type, 1); items = d.results || [];
            }
            container.innerHTML = renderGrid(items, searchType === 'all' ? 'movie' : searchType);
        } catch(e) { container.innerHTML = `<p class="loading-text" style="grid-column:span 3;">Erro na busca.</p>`; }
    }, 600);
}

async function carregarSuperFlixParaBusca(tipo, genero, busca) {
    const container = document.getElementById('resultados-global');
    try {
        let url = '';
        if (genero) {
            let catG = tipo === 'animes' ? 'anime' : 'dorama';
            url = `https://superflixapi.fit/lista?category=${catG}&type=tmdb&genero=${encodeURIComponent(genero.toLowerCase())}&format=json`;
        } else if (busca) {
            let catB = tipo === 'animes' ? 'animes' : 'dorama';
            url = `https://superflixapi.fit/lista?category=${catB}&format=json`;
        } else {
            let catB = tipo === 'animes' ? 'animes' : 'dorama';
            url = `https://superflixapi.fit/lista?category=${catB}&type=tmdb&order=desc&format=json`;
        }

        const res = await fetch(url); const text = await res.text(); let dadosBrutos;
        try { dadosBrutos = JSON.parse(text); } catch(err) {
            if(tipo === 'dorama') { const fRes = await fetch(`https://superflixapi.fit/lista?category=dorama&type=imdb&format=json`); dadosBrutos = await fRes.json(); } 
            else { throw err; }
        }

        let resultados = [];
        if (!Array.isArray(dadosBrutos)) {
            if (dadosBrutos.data) resultados = dadosBrutos.data;
            else if (dadosBrutos.series) resultados = dadosBrutos.series;
            else if (dadosBrutos.animes) resultados = dadosBrutos.animes;
            else resultados = Object.values(dadosBrutos);
        } else { resultados = dadosBrutos; }

        lastSuperFlixData = resultados;
        if (busca && lastSuperFlixData.length > 0) {
            resultados = lastSuperFlixData.filter(item => (item.title || item.nome || item.name || '').toLowerCase().includes(busca.toLowerCase()));
        }

        if(!resultados || resultados.length === 0) { container.innerHTML = '<p class="loading-text" style="grid-column:span 3;">Nenhum resultado encontrado.</p>'; return; }
        let html = '';
        resultados.slice(0, 50).forEach(item => {
            const titulo = item.title || item.nome || item.name || 'Sem Título';
            const id = item.tmdb_id || item.id;
            const capa = item.cover || item.poster || item.poster_path || 'https://via.placeholder.com/220x330/111/fff';
            if(id && id !== 0) {
                html += `<div class="card-movie" onclick="abrirDetalhesTMDB(${id}, 'tv')"><img src="${capa}" loading="lazy" onerror="this.src='https://via.placeholder.com/220x330/111/fff';"><div class="titulo-fallback" style="display:none">${esc(titulo)}</div></div>`;
            }
        });
        container.innerHTML = html;
    } catch(e) { container.innerHTML = '<p class="loading-text" style="grid-column:span 3;">Erro ao carregar.</p>'; }
}

// ===================== DETALHES TMDB =====================
async function abrirDetalhesTMDB(tmdbId, type) {
    currentTmdbId = tmdbId; currentItemType = type; currentSeason = 1; currentEpisode = 1;
    
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
        const backdrop = details.backdrop_path ? `${TMDB_IMG}/original${details.backdrop_path}` : (details.poster_path ? `${TMDB_IMG}/w780${details.poster_path}` : '');
        const poster = details.poster_path ? `${TMDB_IMG}/w300${details.poster_path}` : '';
        
        document.getElementById('dpTitle').innerText = title;
        document.getElementById('dpPoster').style.backgroundImage = `url('${backdrop}')`;

        const ano = (details.release_date || details.first_air_date || "").substring(0,4);
        const nota = details.vote_average ? details.vote_average.toFixed(1) : "";
        const generos = details.genres ? details.genres.map(g=>g.name).slice(0,3).join(', ') : "";
        document.getElementById('dpTmdbMeta').innerHTML = `<i class="fas fa-star" style="color:gold;"></i> ${nota} &nbsp;&bull;&nbsp; ${ano} &nbsp;&bull;&nbsp; ${generos}`;

        if(details.credits && details.credits.crew) {
            const dir = details.credits.crew.find(c => c.job === 'Director' || c.job === 'Creator');
            if(dir) document.getElementById('dpDirector').innerText = `Dirigido por ${dir.name}`;
        }

        document.getElementById('dpSynopsis').innerText = details.overview || "Sinopse indisponível.";

        if(details.videos && details.videos.results) {
            const trailer = details.videos.results.find(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'));
            if(trailer) { trailerKeyAtivo = trailer.key; document.getElementById('btnTrailer').style.display = 'flex'; }
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
                    htmlEps += `<div class="ep-card" onclick="currentSeason=${season.season_number}; currentEpisode=${ep}; abrirMenuServidoresDetalhes();"><div class="ep-watched-btn ${isWatched}" onclick="event.stopPropagation(); toggleEpWatchedTMDB(event, '${epId}', '${esc(title)} S${season.season_number}E${ep}', '${poster}')"><i class="fas fa-check"></i></div><div class="ep-thumb" style="background-image:url('${season.poster_path ? TMDB_IMG+'/w300'+season.poster_path : poster}');"><i class="fas fa-play-circle"></i></div><div class="ep-info-text"><div class="ep-number">S${String(season.season_number).padStart(2,'0')}E${String(ep).padStart(2,'0')}</div><div class="ep-name">Episódio ${ep}</div></div></div>`;
                }
                htmlEps += `</div>`;
            });
            document.getElementById('dpEpisodes').innerHTML = htmlEps;
        }

        const btnWatched = document.getElementById('btnWatched');
        const list = getWatchedList();
        if(list[tmdbId]) btnWatched.classList.add('active'); else btnWatched.classList.remove('active');

        const btnFav = document.getElementById('btnFav');
        const listFav = getFavList();
        if(listFav[tmdbId]) btnFav.classList.add('active'); else btnFav.classList.remove('active');

        currentStreamData = { id: tmdbId, title: title, img: poster, type: type };

    } catch(err) { document.getElementById('dpSynopsis').innerText = "Erro ao carregar detalhes."; }
}

function toggleEpWatchedTMDB(event, epId, title, thumb) {
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
        html += `<h3 style="color:#fff; padding-left:15px; margin-top:0; grid-column:span 3;"><i class="fas fa-heart" style="color:#e91e63;"></i> Favoritos</h3>`;
        itemsFavs.forEach(item => { html += `<div class="card-history" onclick="abrirDetalhesTMDB(${item.id}, '${item.type}')"><img src="${item.img}" style="width:100%; height:75%; object-fit:cover;"><div class="titulo-tv" style="padding:5px; height:25%; display:flex; align-items:center; justify-content:center;">${item.title}</div></div>`; });
    }
    if(itemsVistos.length > 0) {
        html += `<h3 style="color:#fff; padding-left:15px; grid-column:span 3; margin-top:20px;"><i class="fas fa-check" style="color:#00e676;"></i> Assistidos</h3>`;
        itemsVistos.forEach(item => { html += `<div class="card-history" onclick="abrirDetalhesTMDB(${item.id}, '${item.type}')"><div class="ep-watched-btn active" style="top:5px; left:5px; position:absolute;" onclick="event.stopPropagation(); removerDoHistorico(event, '${item.id}')"><i class="fas fa-times"></i></div><img src="${item.img}" style="width:100%; height:75%; object-fit:cover;"><div class="titulo-tv" style="padding:5px; height:25%; display:flex; align-items:center; justify-content:center;">${item.title}</div></div>`; });
    }
    if(html === "") html = `<p class="loading-text" style="grid-column: span 3; margin-top:30px;">Ainda não marcou nada.</p>`;
    document.getElementById('conteudo-historico').innerHTML = html;
}
function removerDoHistorico(event, id) { event.stopPropagation(); const list = getWatchedList(); delete list[id]; saveWatchedList(list); carregarHistorico(); }

// ===================== PLAYERS E SERVIDORES =====================
function abrirMenuServidoresDetalhes() {
    document.getElementById('serverModal').classList.add('active');
    const overlay = document.getElementById('sheetOverlay');
    if(overlay) { overlay.style.zIndex = "3600"; overlay.classList.add('active'); }
    document.body.classList.add('no-scroll');
    history.pushState({ view: 'servers', modal: true }, null, "");
}

function fecharMenuServidores(fromPopState = false) {
    document.getElementById('serverModal').classList.remove('active');
    const overlay = document.getElementById('sheetOverlay');
    if(overlay) { overlay.classList.remove('active'); setTimeout(() => overlay.style.zIndex = "", 300); }
    if(!fromPopState && history.state && history.state.view === 'servers') { history.back(); }
}

function abrirPlayerWeb(servidor) {
    if(!currentTmdbId) return;
    fecharMenuServidores();
    
    const modal = document.getElementById('embedModal');
    const frame = document.getElementById('embedFrame');
    let finalUrl = "";
    
    if(servidor === 'betterflix') {
        finalUrl = currentItemType === 'movie' ? `https://betterflix.click/api/player?id=${currentTmdbId}&type=movie` : `https://betterflix.click/api/player?id=${currentTmdbId}&type=tv&season=${currentSeason}&episode=${currentEpisode}`;
    } else if(servidor === 'embedmovies') {
        finalUrl = currentItemType === 'movie' ? `https://myembed.biz/filme/${currentTmdbId}` : `https://myembed.biz/serie/${currentTmdbId}/${currentSeason}/${currentEpisode}`;
    } else if(servidor === 'embedplayapi') {
        finalUrl = currentItemType === 'movie' ? `https://embedplayapi.top/embed/${currentTmdbId}` : `https://embedplayapi.top/embed/${currentTmdbId}/${currentSeason}/${currentEpisode}`;
    } else if(servidor === 'superflix') {
        finalUrl = currentItemType === 'movie' ? `https://superflixapi.fit/filme/${currentTmdbId}` : `https://superflixapi.fit/serie/${currentTmdbId}/${currentSeason}/${currentEpisode}`;
    }
    
    dispararDirectLink();
    setTimeout(() => {
        frame.src = finalUrl;
        modal.style.display = 'flex';
        history.pushState({ view: 'embed', modal: true }, null, "");
    }, 300);
}

// O Botão do Servidor Nativo chama esta função:
document.getElementById('btnServerNativo').onclick = async () => {
    fecharMenuServidores();
    mostrarToast("Procurando no CDN...");
    try {
        let action = currentItemType === 'tv' ? 'get_series' : 'get_vod_streams';
        const res = await fetch(`/api/iptv?action=${action}`);
        const data = await res.json();
        const termo = currentStreamData.title.toLowerCase();
        const match = data.find(item => (item.name || '').toLowerCase().includes(termo));
        
        if(match) {
            const isVod = currentItemType !== 'tv';
            const streamId = isVod ? match.stream_id : match.series_id;
            const ext = match.container_extension || 'mp4';
            if(isVod) { dispararPlayer(streamId, 'vod', ext, currentStreamData.title); }
            else {
                const r = await fetch(`/api/iptv?action=get_series_info&series_id=${streamId}`);
                const d = await r.json();
                if(d.episodes && d.episodes['1'] && d.episodes['1'][0]) {
                    const ep = d.episodes['1'][0];
                    dispararPlayer(ep.id, 'episode', ep.container_extension||'mp4', currentStreamData.title);
                } else { mostrarToast("Episódios não encontrados."); }
            }
        } else { mostrarToast("Não disponível no CDN. Tente Web."); }
    } catch(e) { mostrarToast("Erro CDN."); }
};

async function dispararPlayer(id, tipo, ext, titulo) {
    const btn = (tipo === 'live') ? document.getElementById('btnPlayTV') : null;
    if(btn) { btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`; btn.disabled = true; }
    try {
        let urlFinal = "";
        const act = tipo === 'vod' ? 'get_movie_url' : tipo === 'live' ? 'get_live_url' : 'get_series_url';
        const eStr = tipo === 'live' ? '' : `&extension=${ext||'mp4'}`;
        const res = await fetch(`/api/iptv?action=${act}&stream_id=${id}${eStr}`);
        const data = await res.json(); urlFinal = data.url;
        if(!urlFinal) throw new Error("Link não retornado.");
        
        const urlLimpa = urlFinal.replace(/^https?:\/\//, '');
        const a = document.createElement('a');
        a.href = `intent://${urlLimpa}#Intent;scheme=http;type=video/*;action=android.intent.action.VIEW;end;`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } catch(e) { mostrarToast("Erro: " + e.message); }
    finally { if(btn) { btn.innerHTML = `<i class="fas fa-play"></i> Assistir Agora`; btn.disabled = false; } }
}

function abrirTrailer() {
    if(!trailerKeyAtivo) return;
    document.getElementById('trailerFrame').src = `https://www.youtube.com/embed/${trailerKeyAtivo}?autoplay=1&rel=0`;
    document.getElementById('trailerModal').style.display = 'flex';
    document.body.classList.add('no-scroll');
    history.pushState({ view: 'trailer', modal: true }, null, "");
}
function fecharTrailer(fromPopState = false) {
    document.getElementById('trailerFrame').setAttribute('src', 'about:blank');
    document.getElementById('trailerModal').style.display = 'none';
    document.body.classList.remove('no-scroll');
    if(!fromPopState && history.state && history.state.view === 'trailer') { history.back(); }
}
function fecharEmbedWeb(fromPopState = false) {
    document.getElementById('embedFrame').setAttribute('src', 'about:blank');
    document.getElementById('embedModal').style.display = 'none';
    document.body.classList.remove('no-scroll');
    if(!fromPopState && history.state && history.state.view === 'embed') { history.back(); }
}

function abrirSheetTV(titulo, streamId, tagsStr) {
    document.getElementById('tvTitle').innerText = titulo;
    document.getElementById('tvBadges').innerHTML = gerarHTMLBadges(tagsStr);
    const btn = document.getElementById('btnPlayTV');
    if(btn) btn.onclick = () => dispararPlayer(streamId, 'live', '', titulo);
    document.getElementById('sheetOverlay').classList.add('active');
    document.getElementById('bottomSheet').classList.add('active');
    document.body.classList.add('no-scroll');
    history.pushState({ view: 'sheet', modal: true }, null, "");
}
function fecharSheetTV(fromPopState = false) {
    document.getElementById('sheetOverlay').classList.remove('active');
    document.getElementById('bottomSheet').classList.remove('active');
    document.body.classList.remove('no-scroll');
    if(!fromPopState && history.state && history.state.view === 'sheet') { history.back(); }
}

// ===================== NAVEGAÇÃO E MENU PRINCIPAL =====================
function abrirMenuPrincipal() {
    document.getElementById('menuOverlay').classList.add('active');
    document.getElementById('menuPrincipal').classList.add('active');
    document.body.classList.add('no-scroll');
    history.pushState({ view: 'menu', modal: true }, null, "");
}
function fecharMenuPrincipal(fromPopState = false) {
    document.getElementById('menuOverlay').classList.remove('active');
    document.getElementById('menuPrincipal').classList.remove('active');
    document.body.classList.remove('no-scroll');
    if(!fromPopState && history.state && history.state.view === 'menu') { history.back(); }
}
function fecharTodosOverlays() { fecharMenuServidores(); fecharSheetTV(); fecharMenuPrincipal(); }

function mudarAba(idView, btn, originHistory = false) {
    if(idView !== 'view-home' && heroInterval) { clearInterval(heroInterval); heroInterval = null; }
    else if(idView === 'view-home' && !heroInterval && heroItems.length > 0) { iniciarHeroSlider(); }

    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    else { const autoBtn = document.getElementById('nav-' + idView.replace('view-','')); if(autoBtn) autoBtn.classList.add('active'); }

    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(idView).classList.add('active');

    const mainHeader = document.getElementById('mainHeader');
    if(mainHeader) { if(idView === 'view-home') mainHeader.style.display = 'flex'; else mainHeader.style.display = 'none'; }

    if(!originHistory && idView !== 'view-home') history.pushState({ view: idView }, null, "");
    if(idView === 'view-historico') carregarHistorico();
}

// MODO IPTV (CANAIS E MAIS)
function entrarModoIPTV() {
    if(heroInterval) { clearInterval(heroInterval); heroInterval = null; }
    document.getElementById('view-iptv').classList.add('active');
    document.querySelectorAll('.view').forEach(v => { if(v.id !== 'view-iptv') v.classList.remove('active'); });
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    const mainHeader = document.getElementById('mainHeader'); if(mainHeader) mainHeader.style.display = 'none';
    history.pushState({ view: 'view-iptv' }, null, "");
    if(!iptvCarregado.filmes) carregarIPTFilmes();
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
    const div = document.getElementById('conteudo-iptv-filmes'); div.innerHTML = '<p class="loading-text"><i class="fas fa-spinner fa-spin"></i> Carregando...</p>';
    try {
        const res = await fetch('/api/iptv?action=get_vod_categories'); const cats = await res.json();
        const validas = cats.filter(c => pastaValida(c.category_name)); let html = '';
        validas.forEach(cat => { html += `<div class="category-item" onclick="abrirGradeIPTV('vod', '${cat.category_id}', '${esc(limparNomePasta(cat.category_name))}')"><div style="display:flex; align-items:center; gap:15px;"><i class="fas fa-film category-icon"></i><span class="category-name">${limparNomePasta(cat.category_name)}</span></div><i class="fas fa-chevron-right" style="color: var(--text-muted); font-size: 12px;"></i></div>`; });
        div.innerHTML = html || '<p class="loading-text">Vazio.</p>';
    } catch(e) { div.innerHTML = '<p class="loading-text">Erro ao carregar.</p>'; }
}
async function carregarIPTSeries() {
    iptvCarregado.series = true;
    const div = document.getElementById('conteudo-iptv-series'); div.innerHTML = '<p class="loading-text"><i class="fas fa-spinner fa-spin"></i> Carregando...</p>';
    try {
        const res = await fetch('/api/iptv?action=get_series_categories'); const cats = await res.json();
        const validas = cats.filter(c => pastaValida(c.category_name)); let html = '';
        validas.forEach(cat => { html += `<div class="category-item" onclick="abrirGradeIPTV('series', '${cat.category_id}', '${esc(limparNomePasta(cat.category_name))}')"><div style="display:flex; align-items:center; gap:15px;"><i class="fas fa-tv category-icon"></i><span class="category-name">${limparNomePasta(cat.category_name)}</span></div><i class="fas fa-chevron-right" style="color: var(--text-muted); font-size: 12px;"></i></div>`; });
        div.innerHTML = html || '<p class="loading-text">Vazio.</p>';
    } catch(e) { div.innerHTML = '<p class="loading-text">Erro ao carregar.</p>'; }
}
async function carregarIPTTV() {
    iptvCarregado.tv = true;
    const div = document.getElementById('conteudo-iptv-tv'); div.innerHTML = '<p class="loading-text"><i class="fas fa-spinner fa-spin"></i> Carregando...</p>';
    try {
        const res = await fetch('/api/iptv?action=get_live_categories'); const cats = await res.json();
        const validas = cats.filter(c => pastaTVValida(c.category_name)); let html = '';
        validas.forEach(cat => { html += `<div class="category-item" onclick="abrirGradeIPTV('live', '${cat.category_id}', '${esc(limparNomePasta(cat.category_name))}')"><div style="display:flex; align-items:center; gap:15px;"><i class="fas fa-broadcast-tower category-icon"></i><span class="category-name">${limparNomePasta(cat.category_name)}</span></div><i class="fas fa-chevron-right" style="color: var(--text-muted); font-size: 12px;"></i></div>`; });
        div.innerHTML = html || '<p class="loading-text">Vazio.</p>';
    } catch(e) { div.innerHTML = '<p class="loading-text">Erro ao carregar.</p>'; }
}

async function abrirGradeIPTV(tipo, catId, nomePasta) {
    document.getElementById('titulo-grade').innerText = nomePasta;
    const container = document.getElementById('conteudo-grade'); container.innerHTML = `<div class="loading-text" style="grid-column: span 3;"><i class="fas fa-spinner fa-spin"></i> Carregando...</div>`;
    mudarAba('view-grade', null);
    try {
        let action = tipo === 'vod' ? 'get_vod_streams' : tipo === 'series' ? 'get_series' : 'get_live_streams';
        const res = await fetch(`/api/iptv?action=${action}&category_id=${catId}`); const lista = await res.json(); let html = '';
        lista.forEach(item => {
            if(tipo === 'live') {
                const fmtd = processarTV(item.name); const capa = item.stream_icon;
                html += `<div class="card-movie card-tv" style="height: 110px;" onclick="abrirSheetTV('${esc(fmtd.limpo)}', '${item.stream_id}', '${esc(fmtd.tagsStr)}')"><div class="card-badges">${gerarHTMLBadges(fmtd.tagsStr)}</div>${capa ? `<img src="${capa}" loading="lazy" onerror="this.src='https://via.placeholder.com/100x50/333/fff?text=TV'">` : `<i class="fas fa-tv" style="font-size:24px; color:#555; margin-bottom:5px;"></i>`}<div class="titulo-tv">${fmtd.limpo}</div></div>`;
            } else {
                const fmtd = processarTitulo(item.name, nomePasta); const capa = item.stream_icon || item.cover;
                html += `<div class="card-movie" onclick="abrirDetalhesIPTV('${esc(fmtd.limpo)}', '${esc(nomePasta)}', '${esc(capa)}', '${tipo==='vod'?item.stream_id:item.series_id}', '${tipo}', '${item.container_extension||'mp4'}', '${esc(fmtd.tagsStr)}')"><div class="card-badges">${gerarHTMLBadges(fmtd.tagsStr)}</div>${capa ? `<img src="${capa}" loading="lazy" onerror="this.src='https://via.placeholder.com/220x330/111/fff';">` : `<img src="https://via.placeholder.com/220x330/111/fff"><div class="titulo-fallback">${fmtd.limpo}</div>`}</div>`;
            }
        });
        container.innerHTML = html || `<p class="loading-text" style="grid-column: span 3;">Pasta vazia.</p>`;
    } catch(e) { container.innerHTML = `<p class="loading-text" style="grid-column: span 3;">Erro.</p>`; }
}

async function abrirDetalhesIPTV(titulo, cat, urlCapa, id, tipo, ext, tagsStr) {
    const btnPlayFilme = document.getElementById('btnPlayFilme');
    if(btnPlayFilme) {
        btnPlayFilme.disabled = false;
        btnPlayFilme.innerHTML = '<i class="fas fa-play"></i> <span>Assistir Nativo</span>';
        btnPlayFilme.onclick = () => dispararPlayer(id, tipo, ext, titulo);
    }
    document.getElementById('dpTitle').innerText = titulo;
    document.getElementById('dpMeta').innerHTML = gerarHTMLBadges(tagsStr) + `<span style="color:var(--text-muted); margin-left:5px;">${cat}</span>`;
    const capa = urlCapa || 'https://via.placeholder.com/800x600/111/fff';
    document.getElementById('dpPoster').style.backgroundImage = `url('${capa}')`;
    document.getElementById('dpTmdbMeta').innerHTML = ''; document.getElementById('dpDirector').innerText = '';
    document.getElementById('dpSynopsis').innerText = 'Conteúdo do catálogo IPTV direto.';
    document.getElementById('dpCastContainer').style.display = 'none'; document.getElementById('dpSimilarContainer').style.display = 'none';
    document.getElementById('btnTrailer').style.display = 'none'; document.getElementById('dpEpisodes').style.display = 'none';
    
    currentTmdbId = null; currentItemType = tipo === 'series' ? 'tv' : 'movie';
    if(tipo === 'series') btnPlayFilme.style.display = 'none'; else btnPlayFilme.style.display = 'flex';
    
    document.getElementById('detailsPage').classList.add('active');
    document.body.classList.add('no-scroll');
    history.pushState({ view: 'details', modal: true }, null, "");
}

async function pesquisarTV() {
    clearTimeout(timeoutBuscaTV);
    const inputTv = document.getElementById('inputBuscaIPTVTV'); if(!inputTv) return;
    const query = inputTv.value.toLowerCase();
    const divPastas = document.getElementById('conteudo-iptv-tv');
    const divResultados = document.getElementById('resultados-iptv-tv');
    if(query.length < 3) { divPastas.style.display = 'block'; divResultados.style.display = 'none'; return; }
    divPastas.style.display = 'none'; divResultados.style.display = 'grid';
    divResultados.innerHTML = `<div class="loading-text" style="grid-column: span 3;"><i class="fas fa-spinner fa-spin"></i> Buscando...</div>`;
    timeoutBuscaTV = setTimeout(async () => {
        if(!bancoTV) { try { const res = await fetch('/api/iptv?action=get_live_streams'); bancoTV = await res.json(); } catch(e) { return; } }
        const resultados = bancoTV.filter(c => c.name && c.name.toLowerCase().includes(query)).slice(0, 50);
        if(resultados.length === 0) { divResultados.innerHTML = `<p class="loading-text" style="grid-column:span 3;">Nenhum canal.</p>`; return; }
        let html = "";
        resultados.forEach(item => {
            const fmtd = processarTV(item.name); const capa = item.stream_icon;
            html += `<div class="card-movie card-tv" style="height: 110px;" onclick="abrirSheetTV('${esc(fmtd.limpo)}', '${item.stream_id}', '${esc(fmtd.tagsStr)}')"><div class="card-badges">${gerarHTMLBadges(fmtd.tagsStr)}</div>${capa ? `<img src="${capa}" loading="lazy" onerror="this.src='https://via.placeholder.com/100x50/333/fff?text=TV'">` : `<i class="fas fa-tv" style="font-size:24px; color:#555; margin-bottom:5px;"></i>`}<div class="titulo-tv">${fmtd.limpo}</div></div>`;
        });
        divResultados.innerHTML = html;
    }, 800);
}

// ===================== GESTOS E VOLTAR DO ANDROID =====================
window.addEventListener('popstate', function(event) {
    const modais = [
        { id: 'embedModal', close: () => fecharEmbedWeb(true) },
        { id: 'trailerModal', close: () => fecharTrailer(true) },
        { id: 'serverModal', close: () => fecharMenuServidores(true) },
        { id: 'actorModal', close: () => fecharAtor(true) },
        { id: 'detailsPage', close: () => fecharDetalhes(true) },
        { id: 'bottomSheet', close: () => fecharSheetTV(true) },
        { id: 'menuPrincipal', close: () => fecharMenuPrincipal(true) },
        { id: 'vipModal', close: () => fecharModalVip(true) }
    ];
    for(let modal of modais) {
        const el = document.getElementById(modal.id);
        if(el && (el.style.display === 'flex' || el.classList.contains('active'))) { modal.close(); return; }
    }
    if(document.getElementById('view-iptv').classList.contains('active')) {
        document.getElementById('view-iptv').classList.remove('active');
        const mainHeader = document.getElementById('mainHeader'); if(mainHeader) mainHeader.style.display = 'flex';
        mudarAba('view-home', document.getElementById('nav-home'), true); return;
    }
    if(document.getElementById('view-grade').classList.contains('active')) {
        document.getElementById('view-grade').classList.remove('active');
        document.getElementById('view-iptv').classList.add('active'); return;
    }
    mudarAba('view-home', document.getElementById('nav-home'), true);
});

// START
window.onload = () => {
    history.replaceState({ view: 'view-home' }, null, "");
    initApp();
};
