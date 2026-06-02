// ===================== BUSCA UNIFICADA =====================
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
    lastSuperFlixData = [];

    if (type === 'animes' || type === 'dorama') {
        carregarSuperFlixGenerosParaBusca(type);
    } else {
        renderGenreChips();
        const query = document.getElementById('inputBuscaGlobal').value.trim();
        if(query.length >= 3 || selectedGenre) pesquisarGlobal();
        else {
            const container = document.getElementById('resultados-global');
            if(container) container.innerHTML = `<p class="loading-text" style="grid-column: span 3; margin-top: 40px;">Digite pelo menos 3 letras ou escolha um genero.</p>`;
        }
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
                html += `<div class="genre-chip ${selectedGenre === nomeCat ? 'active' : ''}" onclick="filtrarGeneroSuperFlix('${esc(nomeCat)}')">${esc(nomeCat)}</div>`;
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
        else {
            Array.from(container.children).forEach(c => {
                if(c.innerText === genero) c.classList.add('active');
            });
        }
    }
    pesquisarGlobal();
}

async function pesquisarGlobal() {
    clearTimeout(timeoutBusca);
    const queryEl = document.getElementById('inputBuscaGlobal');
    const query = queryEl ? queryEl.value.trim() : '';
    const container = document.getElementById('resultados-global');

    if (searchType === 'animes' || searchType === 'dorama') {
        if(container) container.innerHTML = `<div class="loading-text" style="grid-column: span 3;"><i class="fas fa-spinner fa-spin"></i> Buscando...</div>`;
        timeoutBusca = setTimeout(() => {
            carregarSuperFlixParaBusca(searchType, selectedGenre, query.length >= 3 ? query : null);
        }, 800);
        return;
    }

    if(query.length < 3 && !selectedGenre) {
        if(container) container.innerHTML = `<p class="loading-text" style="grid-column: span 3; margin-top: 40px;">Digite pelo menos 3 letras ou escolha um genero.</p>`;
        return;
    }
    if(container) container.innerHTML = `<div class="loading-text" style="grid-column: span 3;"><i class="fas fa-spinner fa-spin"></i> Buscando...</div>`;

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
            if(container) container.innerHTML = renderGrid(items, searchType === 'all' ? 'movie' : searchType);
        } catch(e) { 
            console.error('Busca erro:', e);
            if(container) container.innerHTML = `<p class="loading-text" style="grid-column:span 3;">Erro na busca.</p>`; 
        }
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

        const res = await fetch(url);
        const text = await res.text();
        let dadosBrutos;
        try {
            dadosBrutos = JSON.parse(text);
        } catch(err) {
            if(tipo === 'dorama') {
                const fRes = await fetch(`https://superflixapi.fit/lista?category=dorama&type=imdb&format=json`);
                dadosBrutos = await fRes.json();
            } else { throw err; }
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
            html += renderSuperFlixCard(item, tipo);
        });
        container.innerHTML = html;
    } catch(e) {
        console.error('SuperFlix erro:', e);
        container.innerHTML = '<p class="loading-text" style="grid-column:span 3;">Erro ao carregar os titulos.</p>';
    }
}
