// ===================== IPTV CANAIS - SuperFlixAPI =====================
const IPTV_CANAIS_PROXY = '/api/tv';
let canalCategorias = [];
let todosCanais = [];
let canaisCarregado = false;
let timeoutBuscaCanais = null;
let categoriaAtiva = null;

async function iniciarIPTVCanais() {
    if (canaisCarregado) return;
    canaisCarregado = true;
    await carregarCategoriasCanais();
}

async function carregarCategoriasCanais() {
    const divCats = document.getElementById('iptv-tv-categorias');
    const divCanais = document.getElementById('iptv-tv-canais');
    if (!divCats) return;
    
    divCats.innerHTML = `<p class="loading-text"><i class="fas fa-spinner fa-spin"></i> Carregando categorias...</p>`;
    
    try {
        const res = await fetch(`${IPTV_CANAIS_PROXY}?action=categories`);
        const data = await res.json();
        const cats = Array.isArray(data) ? data : (data.categories || data.data || []);
        canalCategorias = cats;
        
        if (!cats.length) {
            divCats.innerHTML = `<p class="loading-text">Nenhuma categoria encontrada.</p>`;
            return;
        }
        
        let html = `<div class="canal-cats-grid">`;
        const icons = {
            'esporte': 'fa-futbol', 'esportes': 'fa-futbol', 'sport': 'fa-futbol',
            'noticia': 'fa-newspaper', 'noticias': 'fa-newspaper', 'news': 'fa-newspaper',
            'infantil': 'fa-child', 'kids': 'fa-child', 'crianca': 'fa-child',
            'filme': 'fa-film', 'filmes': 'fa-film', 'movie': 'fa-film',
            'serie': 'fa-tv', 'series': 'fa-tv',
            'musica': 'fa-music', 'music': 'fa-music',
            'variedade': 'fa-star', 'variedades': 'fa-star',
            'religioso': 'fa-church', 'documentario': 'fa-globe',
        };
        
        cats.forEach(cat => {
            const nome = cat.category_name || cat.name || cat;
            const id = cat.category_id || cat.id || nome;
            const nomeL = nome.toLowerCase();
            let icon = 'fa-tv';
            for (const [k, v] of Object.entries(icons)) {
                if (nomeL.includes(k)) { icon = v; break; }
            }
            html += `<div class="canal-cat-item" onclick="carregarCanaisCategoria('${esc(String(id))}','${esc(nome)}')">
                <i class="fas ${icon}"></i>
                <span>${esc(nome)}</span>
            </div>`;
        });
        html += `</div>`;
        divCats.innerHTML = html;
        
        // Carrega todos os canais em background para busca
        carregarTodosCanaisBackground();
        
    } catch(e) {
        divCats.innerHTML = `<p class="loading-text">Erro ao carregar categorias.</p>`;
    }
}

async function carregarTodosCanaisBackground() {
    try {
        const res = await fetch(`${IPTV_CANAIS_PROXY}?action=all`);
        const data = await res.json();
        todosCanais = Array.isArray(data) ? data : (data.channels || data.data || []);
    } catch(e) {}
}

async function carregarCanaisCategoria(catId, catNome) {
    categoriaAtiva = catId;
    const divCats = document.getElementById('iptv-tv-categorias');
    const divCanais = document.getElementById('iptv-tv-canais');
    const titleEl = document.getElementById('iptv-tv-cat-title');
    
    divCats.style.display = 'none';
    divCanais.style.display = 'block';
    if (titleEl) titleEl.style.display = 'flex';
    titleEl.querySelector('span').innerText = catNome;
    
    divCanais.innerHTML = `<p class="loading-text"><i class="fas fa-spinner fa-spin"></i> Carregando ${catNome}...</p>`;
    
    try {
        const res = await fetch(`${IPTV_CANAIS_PROXY}?action=by_genre&genre=${encodeURIComponent(catId)}`);
        const data = await res.json();
        const canais = Array.isArray(data) ? data : (data.channels || data.data || []);
        
        if (!canais.length) {
            divCanais.innerHTML = `<p class="loading-text">Nenhum canal nesta categoria.</p>`;
            return;
        }
        
        renderCanaisGrid(canais, divCanais);
    } catch(e) {
        divCanais.innerHTML = `<p class="loading-text">Erro ao carregar canais.</p>`;
    }
}

function voltarCategorias() {
    categoriaAtiva = null;
    const divCats = document.getElementById('iptv-tv-categorias');
    const divCanais = document.getElementById('iptv-tv-canais');
    const titleEl = document.getElementById('iptv-tv-cat-title');
    
    divCats.style.display = 'block';
    divCanais.style.display = 'none';
    if (titleEl) titleEl.style.display = 'none';
}

function renderCanaisGrid(canais, container) {
    let html = `<div class="canais-grid">`;
    canais.forEach(canal => {
        const nome = canal.nome || canal.name || canal.title || canal.channel_name || 'Canal';
        const logo = canal.imagem || canal.logo || canal.stream_icon || canal.icon || '';
        const id = canal.id || canal.stream_id || '';
        
        html += `<div class="canal-card" onclick="abrirPlayerCanal('','${esc(nome)}','${esc(logo)}','${id}')">
            <div class="canal-logo-wrap">
                ${logo ? `<img src="${esc(logo)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">` : ''}
                <div class="canal-logo-fallback" style="${logo?'display:none':'display:flex'}">
                    <i class="fas fa-tv"></i>
                </div>
            </div>
            <div class="canal-nome">${esc(nome)}</div>
        </div>`;
    });
    html += `</div>`;
    container.innerHTML = html;
}

function buscarCanalIPTV() {
    clearTimeout(timeoutBuscaCanais);
    const q = document.getElementById('inputBuscaCanais').value.trim();
    const divCats = document.getElementById('iptv-tv-categorias');
    const divCanais = document.getElementById('iptv-tv-canais');
    const titleEl = document.getElementById('iptv-tv-cat-title');
    
    if (q.length < 2) {
        if (!categoriaAtiva) {
            divCats.style.display = 'block';
            divCanais.style.display = 'none';
            if (titleEl) titleEl.style.display = 'none';
        }
        return;
    }
    
    divCats.style.display = 'none';
    divCanais.style.display = 'block';
    if (titleEl) titleEl.style.display = 'none';
    divCanais.innerHTML = `<p class="loading-text"><i class="fas fa-spinner fa-spin"></i> Buscando...</p>`;
    
    timeoutBuscaCanais = setTimeout(async () => {
        try {
            const res = await fetch(`${IPTV_CANAIS_PROXY}?action=search&q=${encodeURIComponent(q)}`);
            const data = await res.json();
            const canais = Array.isArray(data) ? data : (data.channels || data.data || []);
            
            if (!canais.length) {
                divCanais.innerHTML = `<p class="loading-text">Nenhum canal encontrado para "${esc(q)}".</p>`;
                return;
            }
            renderCanaisGrid(canais, divCanais);
        } catch(e) {
            // fallback local
            const q2 = q.toLowerCase();
            const filtrados = todosCanais.filter(c => (c.name||'').toLowerCase().includes(q2));
            if (filtrados.length) renderCanaisGrid(filtrados, divCanais);
            else divCanais.innerHTML = `<p class="loading-text">Nenhum canal encontrado.</p>`;
        }
    }, 400);
}

// ===================== PLAYER DE CANAL =====================
let playerCanalAtivo = null;

function abrirPlayerCanal(url, nome, logo, id) {
    if (!id) { mostrarToast('Canal não disponível.'); return; }

    // BetterFlix player integrado — sem bloqueios de CORS/HLS
    const playerUrl = `https://betterflix.click/api/player?id=${encodeURIComponent(id)}&type=channel`;

    const iframe = document.getElementById('embedFrame');
    const modal = document.getElementById('embedModal');

    iframe.removeAttribute('srcdoc');
    iframe.src = '';
    iframe.src = playerUrl;
    modal.style.display = 'flex';
    if (typeof addNoScroll === 'function') addNoScroll();
    history.pushState({ view: 'embed', modal: true }, null, '');
}
