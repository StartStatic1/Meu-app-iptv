// ===================== IPTV / TV AO VIVO =====================
function entrarModoIPTV() {
    if(heroInterval) { clearInterval(heroInterval); heroInterval = null; }
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
            html += `<div class="category-item" onclick="abrirGradeIPTV('vod', '${cat.category_id}', '${esc(limparNomePasta(cat.category_name))}')"><div style="display:flex; align-items:center; gap:15px;"><i class="fas fa-film category-icon"></i><span class="category-name">${limparNomePasta(cat.category_name)}</span></div><i class="fas fa-chevron-right" style="color: var(--text-muted); font-size: 12px;"></i></div>`;
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
            html += `<div class="category-item" onclick="abrirGradeIPTV('series', '${cat.category_id}', '${esc(limparNomePasta(cat.category_name))}')"><div style="display:flex; align-items:center; gap:15px;"><i class="fas fa-tv category-icon"></i><span class="category-name">${limparNomePasta(cat.category_name)}</span></div><i class="fas fa-chevron-right" style="color: var(--text-muted); font-size: 12px;"></i></div>`;
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
            html += `<div class="category-item" onclick="abrirGradeIPTV('live', '${cat.category_id}', '${esc(limparNomePasta(cat.category_name))}')"><div style="display:flex; align-items:center; gap:15px;"><i class="fas fa-broadcast-tower category-icon"></i><span class="category-name">${limparNomePasta(cat.category_name)}</span></div><i class="fas fa-chevron-right" style="color: var(--text-muted); font-size: 12px;"></i></div>`;
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
                html += `<div class="card-movie card-tv" style="height: 110px;" onclick="abrirSheetTV('${esc(fmtd.limpo)}', '${item.stream_id}', '${esc(fmtd.tagsStr)}')"><div class="card-badges">${gerarHTMLBadges(fmtd.tagsStr)}</div>${capa ? `<img src="${capa}" loading="lazy" onerror="this.src='https://via.placeholder.com/100x50/333/fff?text=TV'">` : `<i class="fas fa-tv" style="font-size:24px; color:#555; margin-bottom:5px;"></i>`}<div class="titulo-tv">${fmtd.limpo}</div></div>`;
            } else {
                const fmtd = processarTitulo(item.name, nomePasta);
                const capa = item.stream_icon || item.cover;
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
        btnPlayFilme.innerHTML = '<i class="fas fa-play"></i> <span>Assistir</span>';
        btnPlayFilme.style.pointerEvents = 'auto';
        btnPlayFilme.style.display = 'flex';
        btnPlayFilme.onclick = () => dispararPlayer(id, tipo, ext, titulo);
    }
    document.getElementById('dpTitle').innerText = titulo;
    document.getElementById('dpMeta').innerHTML = gerarHTMLBadges(tagsStr) + `<span style="color:var(--text-muted); margin-left:5px;">${cat}</span>`;
    const capa = urlCapa || 'https://via.placeholder.com/800x600/111/fff';
    document.getElementById('dpPoster').style.backgroundImage = `url('${capa}')`;
    document.getElementById('dpTmdbMeta').innerHTML = '';
    document.getElementById('dpDirector').innerText = '';
    document.getElementById('dpSynopsis').innerText = 'Conteúdo do catálogo IPTV direto.';
    document.getElementById('dpCastContainer').style.display = 'none';
    document.getElementById('dpSimilarContainer').style.display = 'none';
    document.getElementById('btnTrailer').style.display = 'none';
    document.getElementById('dpEpisodes').style.display = 'none';
    currentTmdbId = null;
    currentItemType = tipo === 'series' ? 'tv' : 'movie';
    currentStreamData = { id: id, title: titulo, img: capa, type: tipo, ext: ext };
    if(tipo === 'series') btnPlayFilme.style.display = 'none';
    document.getElementById('detailsPage').classList.add('active');
    addNoScroll();
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
        if(!bancoTV) {
            try { const res = await fetch('/api/iptv?action=get_live_streams'); bancoTV = await res.json(); }
            catch(e) { return; }
        }
        const resultados = bancoTV.filter(c => c.name && c.name.toLowerCase().includes(query)).slice(0, 50);
        if(resultados.length === 0) { divResultados.innerHTML = `<p class="loading-text" style="grid-column:span 3;">Nenhum canal.</p>`; return; }
        let html = "";
        resultados.forEach(item => {
            const fmtd = processarTV(item.name);
            const capa = item.stream_icon;
            html += `<div class="card-movie card-tv" style="height: 110px;" onclick="abrirSheetTV('${esc(fmtd.limpo)}', '${item.stream_id}', '${esc(fmtd.tagsStr)}')"><div class="card-badges">${gerarHTMLBadges(fmtd.tagsStr)}</div>${capa ? `<img src="${capa}" loading="lazy" onerror="this.src='https://via.placeholder.com/100x50/333/fff?text=TV'">` : `<i class="fas fa-tv" style="font-size:24px; color:#555; margin-bottom:5px;"></i>`}<div class="titulo-tv">${fmtd.limpo}</div></div>`;
        });
        divResultados.innerHTML = html;
    }, 800);
}
