// ===================== TV AO VIVO - SuperFlixAPI (via proxy /api/tv) =====================
const TV_PROXY = '/api/tv';

let tvCanaisAll = [];
let tvCanaisFiltrados = [];
let tvCatAtiva = null;
let tvCarregado = false;
let tvDestaqueAtual = null;
let timeoutBuscaTV = null;

function escTV(s) {
    return String(s || '').replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
    );
}

async function iniciarTVAoVivo() {
    if (tvCarregado) return;
    tvCarregado = true;

    const grid = document.getElementById('tvCanaisGrid');
    grid.innerHTML = `<div class="tv-loading"><i class="fas fa-spinner fa-spin fa-2x"></i><br><br>Carregando canais...</div>`;

    try {
        // Busca categorias e canais em paralelo
        const [resCats, resCanais] = await Promise.all([
            fetch(`${TV_PROXY}?action=categories`),
            fetch(`${TV_PROXY}?action=all`)
        ]);

        const dataCats = await resCats.json();
        const dataCanais = await resCanais.json();

        const cats = Array.isArray(dataCats) ? dataCats : (dataCats.categories || dataCats.data || []);
        tvCanaisAll = Array.isArray(dataCanais) ? dataCanais : (dataCanais.channels || dataCanais.data || []);
        tvCanaisFiltrados = [...tvCanaisAll];

        renderTVCategoryPills(cats);
        renderTVGrid(tvCanaisAll);

        if (tvCanaisAll.length > 0) mostrarTVDestaque(tvCanaisAll[0]);

    } catch(e) {
        grid.innerHTML = `<div class="tv-loading" style="color:#f87171;">
            <i class="fas fa-exclamation-circle fa-2x"></i><br><br>
            Erro ao carregar canais.<br>
            <small style="color:#666;">${e.message}</small><br><br>
            <button onclick="tvCarregado=false;iniciarTVAoVivo()" style="background:var(--accent);color:#000;border:none;padding:8px 18px;border-radius:20px;font-weight:700;cursor:pointer;">
                <i class="fas fa-redo"></i> Tentar novamente
            </button>
        </div>`;
    }
}

function renderTVCategoryPills(cats) {
    const scroll = document.getElementById('tvCatsScroll');
    let html = `<div class="tv-cat-pill active" onclick="filtrarTVCategoria(null, this)">Todos</div>`;
    cats.forEach(cat => {
        const nome = cat.category_name || cat.name || String(cat);
        const id = cat.category_id || cat.id || nome;
        html += `<div class="tv-cat-pill" onclick="filtrarTVCategoria('${escTV(String(id))}','${escTV(nome)}',this)">${escTV(nome)}</div>`;
    });
    scroll.innerHTML = html;
}

async function filtrarTVCategoria(catId, catNome, el) {
    document.querySelectorAll('.tv-cat-pill').forEach(p => p.classList.remove('active'));
    if (el && el.classList) el.classList.add('active');

    tvCatAtiva = catId;
    const grid = document.getElementById('tvCanaisGrid');

    if (!catId) {
        tvCanaisFiltrados = [...tvCanaisAll];
        renderTVGrid(tvCanaisFiltrados);
        if (tvCanaisFiltrados[0]) mostrarTVDestaque(tvCanaisFiltrados[0]);
        return;
    }

    grid.innerHTML = `<div class="tv-loading"><i class="fas fa-spinner fa-spin"></i> Carregando ${escTV(catNome)}...</div>`;

    try {
        const res = await fetch(`${TV_PROXY}?action=by_genre&genre=${encodeURIComponent(catId)}`);
        const data = await res.json();
        tvCanaisFiltrados = Array.isArray(data) ? data : (data.channels || data.data || []);

        // fallback local se API não filtrar por genre
        if (!tvCanaisFiltrados.length && tvCanaisAll.length) {
            const q = (catNome || '').toLowerCase();
            tvCanaisFiltrados = tvCanaisAll.filter(c => {
                const cat = (c.category_name || c.genre || c.category || '').toLowerCase();
                return cat.includes(q);
            });
        }

        renderTVGrid(tvCanaisFiltrados);
        if (tvCanaisFiltrados[0]) mostrarTVDestaque(tvCanaisFiltrados[0]);
    } catch(e) {
        renderTVGrid([]);
    }
}

function buscarCanalTV() {
    clearTimeout(timeoutBuscaTV);
    const q = document.getElementById('inputBuscaTV').value.trim();

    if (q.length < 2) {
        renderTVGrid(tvCatAtiva ? tvCanaisFiltrados : tvCanaisAll);
        return;
    }

    timeoutBuscaTV = setTimeout(async () => {
        try {
            const res = await fetch(`${TV_PROXY}?action=search&q=${encodeURIComponent(q)}`);
            const data = await res.json();
            const resultado = Array.isArray(data) ? data : (data.channels || data.data || []);

            // fallback local
            if (!resultado.length && tvCanaisAll.length) {
                const ql = q.toLowerCase();
                renderTVGrid(tvCanaisAll.filter(c => (c.name || c.title || '').toLowerCase().includes(ql)));
                return;
            }
            renderTVGrid(resultado);
        } catch(e) {
            const ql = q.toLowerCase();
            renderTVGrid(tvCanaisAll.filter(c => (c.name || c.title || '').toLowerCase().includes(ql)));
        }
    }, 350);
}

function renderTVGrid(canais) {
    const grid = document.getElementById('tvCanaisGrid');
    if (!canais || !canais.length) {
        grid.innerHTML = `<div class="tv-loading" style="color:#888;">Nenhum canal encontrado.</div>`;
        return;
    }

    let html = '';
    canais.forEach((canal, idx) => {
        const nome = canal.name || canal.title || canal.channel_name || 'Canal';
        const logo = canal.logo || canal.stream_icon || canal.icon || '';
        const cat = canal.category_name || canal.genre || canal.category || '';
        const streamUrl = canal.url || canal.stream_url || canal.hls_url || '';
        const id = canal.stream_id || canal.id || '';

        const logoHtml = logo
            ? `<img class="tv-canal-logo" src="${escTV(logo)}" loading="lazy"
                onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
               <div class="tv-canal-logo-fallback" style="display:none;"><i class="fas fa-tv"></i></div>`
            : `<div class="tv-canal-logo-fallback"><i class="fas fa-tv"></i></div>`;

        html += `<div class="tv-canal-card"
            onclick="selecionarCanalTV('${escTV(streamUrl)}','${escTV(nome)}','${escTV(logo)}','${id}','${escTV(cat)}',this)">
            ${logoHtml}
            <div class="tv-canal-nome">${escTV(nome)}</div>
            ${cat ? `<div class="tv-canal-cat-tag">${escTV(cat)}</div>` : ''}
        </div>`;
    });
    grid.innerHTML = html;
}

function selecionarCanalTV(url, nome, logo, id, cat, el) {
    document.querySelectorAll('.tv-canal-card').forEach(c => c.classList.remove('selected'));
    if (el) el.classList.add('selected');

    const canal = { name: nome, logo, url, stream_id: id, category_name: cat };
    mostrarTVDestaque(canal);

    // scroll destaque para o topo
    document.getElementById('tvDestaque')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function mostrarTVDestaque(canal) {
    tvDestaqueAtual = canal;
    const destaque = document.getElementById('tvDestaque');
    const logoWrap = document.getElementById('tvDestaqueLogo');
    const nomeEl = document.getElementById('tvDestaqueNome');
    const catEl = document.getElementById('tvDestaqueCat');
    const playBtn = document.getElementById('tvDestaquePlayBtn');

    const nome = canal.name || canal.title || 'Canal';
    const logo = canal.logo || canal.stream_icon || '';
    const cat = canal.category_name || canal.genre || '';
    const url = canal.url || canal.stream_url || canal.hls_url || '';
    const id = canal.stream_id || canal.id || '';

    logoWrap.innerHTML = logo
        ? `<img src="${escTV(logo)}" style="width:100%;height:100%;object-fit:contain;border-radius:8px;"
            onerror="this.style.display='none';">`
        : `<i class="fas fa-tv" style="color:var(--accent);font-size:22px;"></i>`;

    nomeEl.textContent = nome;
    catEl.textContent = cat ? cat.toUpperCase() : '';
    playBtn.onclick = () => abrirPlayerTVAoVivo(url, nome, logo, id);

    destaque.style.display = 'block';
}

function abrirPlayerTVAoVivo(url, nome, logo, id) {
    if (!url && id) url = `/api/tv?action=stream&id=${id}`;
    if (!url) { if (typeof mostrarToast === 'function') mostrarToast('URL do canal não disponível.'); return; }

    const iframe = document.getElementById('embedFrame');
    const modal = document.getElementById('embedModal');

    const playerHTML = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${nome}</title>
<script src="https://cdn.jsdelivr.net/npm/hls.js@latest"><\/script>
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#000;display:flex;align-items:center;justify-content:center;height:100vh;}video{width:100%;height:100%;object-fit:contain;}</style>
</head><body>
<video id="v" controls autoplay playsinline></video>
<script>
const v=document.getElementById('v');
const src="${url.replace(/"/g, '&quot;')}";
if(Hls.isSupported()){
  const h=new Hls({enableWorker:false,debug:false});
  h.loadSource(src);h.attachMedia(v);
  h.on(Hls.Events.MANIFEST_PARSED,()=>v.play().catch(()=>{}));
  h.on(Hls.Events.ERROR,(_,d)=>{ if(d.fatal) v.src=src; });
}else if(v.canPlayType('application/vnd.apple.mpegurl')){
  v.src=src;v.play().catch(()=>{});
}else{ v.src=src;v.play().catch(()=>{}); }
<\/script></body></html>`;

    iframe.srcdoc = playerHTML;
    modal.style.display = 'flex';
    if (typeof addNoScroll === 'function') addNoScroll();
    history.pushState({ view: 'embed', modal: true }, null, '');
}
