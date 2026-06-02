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

// Touch gesture vars
let touchStartY = 0;
let touchStartX = 0;
let noScrollCount = 0;
let fromPopState = false;

function addNoScroll() {
    noScrollCount++;
    document.body.classList.add('no-scroll');
}
function removeNoScroll() {
    noScrollCount = Math.max(0, noScrollCount - 1);
    if(noScrollCount === 0) document.body.classList.remove('no-scroll');
}

// ===================== UTILS =====================
function mostrarToast(msg) {
    let t = document.getElementById('toast-msg'); if(!t) return;
    t.innerText = msg; t.style.opacity = '1';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.style.opacity = '0'; }, 3500);
}
function esc(str) { return !str ? '' : str.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function getWatchedList() { try { return JSON.parse(localStorage.getItem('streamflix_watched_v2')) || {}; } catch(e) { return {}; } }
function saveWatchedList(list) { localStorage.setItem('streamflix_watched_v2', JSON.stringify(list)); }
function getFavList() { try { return JSON.parse(localStorage.getItem('streamflix_favs')) || {}; } catch(e) { return {}; } }
function saveFavList(list) { localStorage.setItem('streamflix_favs', JSON.stringify(list)); }
function limparNomePasta(nome) { return nome.replace(/Filmes\s*\|\s*/i, '').replace(/Séries\s*\|\s*/i, '').trim(); }
function pastaValida(nome) { const proibidos = ['JOGOS','REALITY','XXX','RELIGIOSO','ADULTO','+18','24H','CÂMERA','RADIO','OSCAR','TESTE']; return !proibidos.some(p => (nome||'').toUpperCase().includes(p)); }
function pastaTVValida(nome) { const proibidos = ['JOGOS','REALITY','XXX','RELIGIOSO','ADULTO','+18','24H','RADIO','CÂMERA']; return !proibidos.some(p => (nome||'').toUpperCase().includes(p)); }

function processarTitulo(nomeBruto, nomePasta) {
    let nomeLimpo = nomeBruto || "Sem Título"; const tags = []; const pU = nomePasta ? nomePasta.toUpperCase() : '';
    if(pU.includes('4K') || /4K|UHD|2160p/i.test(nomeLimpo)) tags.push('4K');
    if(/FHD|1080p/i.test(nomeLimpo)) tags.push('FHD'); if(/HD|720p/i.test(nomeLimpo)) tags.push('HD');
    if(pU.includes('LEGENDADO') || /\[LEG\]|\(LEG\)/i.test(nomeLimpo)) tags.push('LEG');
    else if(pU.includes('DUBLADO') || /\[DUB\]|\(DUB\)/i.test(nomeLimpo)) tags.push('DUB');
    nomeLimpo = nomeLimpo.replace(/(4K|UHD|2160p|FHD|1080p|HD|720p)/ig, '').replace(/\[(DUB|LEG|VOD).*?\]/ig, '').replace(/\((DUB|LEG).*?\)/ig, '').replace(/\|.*?\|/g, '').replace(/-\s*$/, '').replace(/\s+/g, ' ').trim();
    if(nomeLimpo.length < 2) nomeLimpo = nomeBruto.substring(0, 20);
    return { limpo: nomeLimpo, tagsStr: tags.join(',') };
}
function processarTV(nomeBruto) {
    let nomeLimpo = nomeBruto || "Canal"; const tags = [];
    if(/FHDR/i.test(nomeLimpo)) tags.push('FHDR'); else if(/FHD/i.test(nomeLimpo)) tags.push('FHD'); else if(/HD/i.test(nomeLimpo)) tags.push('HD'); else if(/4K/i.test(nomeLimpo)) tags.push('4K'); else if(/SD/i.test(nomeLimpo)) tags.push('SD');
    const estado = nomeLimpo.match(/\b(SP|RJ|MG|RS|PR|SC|BA|PE|CE|DF|GO|MT|MS|AM|AC|PA|RR|RO|AP|TO|PI|MA|PB|AL|SE|RN)\b/i);
    if(estado && !tags.includes(estado[0].toUpperCase())) tags.push(estado[0].toUpperCase());
    nomeLimpo = nomeLimpo.replace(/\[(FHDR|FHD|HD|4K|SD)\]/ig, '').replace(/\((FHDR|FHD|HD|4K|SD)\)/ig, '').replace(/\b(FHDR|FHD|HD|4K|SD)\b/ig, '').replace(/^[\s\|\-]+|[\s\|\-]+$/g, '').replace(/\s+/g, ' ').trim();
    if (!nomeLimpo || nomeLimpo.length < 2) nomeLimpo = nomeBruto.replace(/\[.*?\]|\(.*?\)/g, '').replace(/[>-\|*•]/g, '').trim();
    return { limpo: nomeLimpo, tagsStr: tags.join(',') };
}

function gerarHTMLBadges(tagsStr) {
    if(!tagsStr) return ''; let html = '';
    tagsStr.split(',').forEach(t => {
        let cor = '#000', bg = '#fff';
        if(t==='4K') { cor='#fff'; bg='#ff1744'; } if(t==='FHDR') { cor='#fff'; bg='#d50000'; } if(t==='FHD') { cor='#000'; bg='#00e5ff'; }
        if(t==='HD') { cor='#000'; bg='#76ff03'; } if(t==='DUB') { cor='#000'; bg='#00e676'; } if(t==='LEG') { cor='#fff'; bg='#b388ff'; }
        if(t.length === 2) { cor='#fff'; bg='#ff9100'; }
        html += `<span style="background:${bg}; color:${cor}; font-size:8px; font-weight:900; padding:3px 5px; border-radius:4px; box-shadow: 0 2px 5px rgba(0,0,0,0.5);">${t}</span>`;
    }); return html;
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
