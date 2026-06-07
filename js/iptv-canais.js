// ===================== IPTV CANAIS - SuperFlixAPI =====================
const SUPERFLIX_BASE = 'https://superflixapi.fit';
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
        const res = await fetch(`${SUPERFLIX_BASE}/lista?category=channel_categories&format=json`);
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
        const res = await fetch(`${SUPERFLIX_BASE}/lista?category=canais&format=json`);
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
        const res = await fetch(`${SUPERFLIX_BASE}/lista?category=canais&genre=${encodeURIComponent(catId)}&format=json`);
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
        const nome = canal.name || canal.title || canal.channel_name || 'Canal';
        const logo = canal.logo || canal.stream_icon || canal.icon || '';
        const streamUrl = canal.url || canal.stream_url || canal.hls_url || '';
        const id = canal.stream_id || canal.id || '';
        
        html += `<div class="canal-card" onclick="abrirPlayerCanal('${esc(streamUrl)}','${esc(nome)}','${esc(logo)}','${id}')">
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
            const res = await fetch(`${SUPERFLIX_BASE}/lista?category=canais&q=${encodeURIComponent(q)}&format=json`);
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
    if (!url && id) {
        url = `${SUPERFLIX_BASE}/play?id=${id}`;
    }
    if (!url) { mostrarToast('URL do canal não disponível.'); return; }
    
    // Usa o embed modal existente com HLS.js via srcDoc
    const iframe = document.getElementById('embedFrame');
    const modal = document.getElementById('embedModal');
    
    // Página HTML com HLS player
    const playerHTML = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${nome}</title>
<script src="https://cdn.jsdelivr.net/npm/hls.js@latest"><\/script>
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#000}video{width:100vw;height:100vh;object-fit:contain}</style>
</head><body>
<video id="v" controls autoplay playsinline></video>
<script>
const v=document.getElementById('v');
const src="${url.replace(/"/g,'&quot;')}";
if(Hls.isSupported()){const h=new Hls({enableWorker:false});h.loadSource(src);h.attachMedia(v);h.on(Hls.Events.MANIFEST_PARSED,()=>v.play());}
else if(v.canPlayType('application/vnd.apple.mpegurl')){v.src=src;v.play();}
else{v.src=src;v.play();}
<\/script></body></html>`;
    
    iframe.srcdoc = playerHTML;
    modal.style.display = 'flex';
    addNoScroll();
    history.pushState({ view: 'embed', modal: true }, null, '');
    dispararDirectLink();
}
