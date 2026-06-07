// esc helper (fallback se app.js ainda nao carregou)
function escTV(s){return String(s||"").replace(/[<>"']/g,c=>({"":"amp;","<":"lt;",">":"gt;",'"":"quot;","'":"#39;"})[c]);}

// ===================== TV AO VIVO - SuperFlixAPI =====================
const SF_BASE = 'https://superflixapi.fit';
let tvCanaisAll = [];
let tvCanaisFiltrados = [];
let tvCatAtiva = null;
let tvCarregado = false;
let tvDestaqueAtual = null;
let timeoutBuscaTV = null;

async function iniciarTVAoVivo() {
    if (tvCarregado) return;
    tvCarregado = true;

    const grid = document.getElementById('tvCanaisGrid');
    grid.innerHTML = `<div style="grid-column:span 3; text-align:center; padding:40px 0; color:#888;"><i class="fas fa-spinner fa-spin fa-2x"></i><br><br>Carregando canais...</div>`;

    try {
        // Busca categorias para os pills
        const resCats = await fetch(`${SF_BASE}/lista?category=channel_categories&format=json`);
        const dataCats = await resCats.json();
        const cats = Array.isArray(dataCats) ? dataCats : (dataCats.categories || dataCats.data || []);
        renderTVCategoryPills(cats);

        // Busca todos os canais
        const resCanais = await fetch(`${SF_BASE}/lista?category=canais&format=json`);
        const dataCanais = await resCanais.json();
        tvCanaisAll = Array.isArray(dataCanais) ? dataCanais : (dataCanais.channels || dataCanais.data || []);
        tvCanaisFiltrados = [...tvCanaisAll];

        renderTVGrid(tvCanaisAll);

        // Destaque com o primeiro canal
        if (tvCanaisAll.length > 0) mostrarTVDestaque(tvCanaisAll[0]);

    } catch(e) {
        grid.innerHTML = `<div style="grid-column:span 3; text-align:center; padding:40px; color:#888;">Erro ao carregar canais.<br><small>${e.message}</small></div>`;
    }
}

function renderTVCategoryPills(cats) {
    const scroll = document.getElementById('tvCatsScroll');
    // Mantém "Todos" e adiciona categorias
    let html = `<div class="tv-cat-pill active" onclick="filtrarTVCategoria(null, this)">Todos</div>`;
    cats.forEach(cat => {
        const nome = cat.category_name || cat.name || cat;
        const id = cat.category_id || cat.id || nome;
        html += `<div class="tv-cat-pill" onclick="filtrarTVCategoria('${escTV(String(id))}','${escTV(nome)}',this)">${escTV(nome)}</div>`;
    });
    scroll.innerHTML = html;
}

async function filtrarTVCategoria(catId, catNome, el) {
    // Update pills
    document.querySelectorAll('.tv-cat-pill').forEach(p => p.classList.remove('active'));
    if (el) {
        if (typeof el === 'string') {
            // called with nome as second arg
        } else {
            el.classList.add('active');
        }
    } else {
        document.querySelector('.tv-cat-pill')?.classList.add('active');
    }

    tvCatAtiva = catId;
    const grid = document.getElementById('tvCanaisGrid');

    if (!catId) {
        tvCanaisFiltrados = [...tvCanaisAll];
        renderTVGrid(tvCanaisFiltrados);
        if (tvCanaisFiltrados[0]) mostrarTVDestaque(tvCanaisFiltrados[0]);
        return;
    }

    grid.innerHTML = `<div style="grid-column:span 3; text-align:center; padding:30px; color:#888;"><i class="fas fa-spinner fa-spin"></i> Carregando...</div>`;

    try {
        const res = await fetch(`${SF_BASE}/lista?category=canais&genre=${encodeURIComponent(catId)}&format=json`);
        const data = await res.json();
        tvCanaisFiltrados = Array.isArray(data) ? data : (data.channels || data.data || []);
        renderTVGrid(tvCanaisFiltrados);
        if (tvCanaisFiltrados[0]) mostrarTVDestaque(tvCanaisFiltrados[0]);
    } catch(e) {
        // fallback local
        const cNome = (catNome || '').toLowerCase();
        tvCanaisFiltrados = tvCanaisAll.filter(c => {
            const cat = (c.category_name || c.genre || c.category || '').toLowerCase();
            return cat.includes(cNome) || cat === catId;
        });
        renderTVGrid(tvCanaisFiltrados);
    }
}

function buscarCanalTV() {
    clearTimeout(timeoutBuscaTV);
    const q = document.getElementById('inputBuscaTV').value.trim().toLowerCase();

    if (q.length < 2) {
        renderTVGrid(tvCanaisFiltrados.length ? tvCanaisFiltrados : tvCanaisAll);
        return;
    }

    timeoutBuscaTV = setTimeout(async () => {
        try {
            const res = await fetch(`${SF_BASE}/lista?category=canais&q=${encodeURIComponent(q)}&format=json`);
            const data = await res.json();
            const resultado = Array.isArray(data) ? data : (data.channels || data.data || []);
            renderTVGrid(resultado);
        } catch(e) {
            // fallback local
            const filtrado = tvCanaisAll.filter(c => (c.name || c.title || '').toLowerCase().includes(q));
            renderTVGrid(filtrado);
        }
    }, 350);
}

function renderTVGrid(canais) {
    const grid = document.getElementById('tvCanaisGrid');
    if (!canais || !canais.length) {
        grid.innerHTML = `<div style="grid-column:span 3; text-align:center; padding:40px; color:#888;">Nenhum canal encontrado.</div>`;
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
            ? `<img class="tv-canal-logo" src="${escTV(logo)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
               <div class="tv-canal-logo-fallback" style="display:none;"><i class="fas fa-tv"></i></div>`
            : `<div class="tv-canal-logo-fallback"><i class="fas fa-tv"></i></div>`;

        html += `<div class="tv-canal-card"
            onclick="selecionarCanalTV('${escTV(streamUrl)}','${escTV(nome)}','${escTV(logo)}','${id}','${escTV(cat)}',this,${idx})">
            ${logoHtml}
            <div class="tv-canal-nome">${escTV(nome)}</div>
            ${cat ? `<div class="tv-canal-cat-tag">${escTV(cat)}</div>` : ''}
        </div>`;
    });
    grid.innerHTML = html;
}

function selecionarCanalTV(url, nome, logo, id, cat, el, idx) {
    // Destacar card selecionado
    document.querySelectorAll('.tv-canal-card').forEach(c => c.classList.remove('selected'));
    if (el) el.classList.add('selected');

    // Mostrar no destaque
    const canal = { name: nome, logo, url, stream_id: id, category_name: cat };
    mostrarTVDestaque(canal);
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
        ? `<img src="${escTV(logo)}" style="width:100%;height:100%;object-fit:contain;" onerror="this.style.display='none';">`
        : `<i class="fas fa-tv" style="color:var(--accent);font-size:22px;"></i>`;

    nomeEl.textContent = nome;
    catEl.textContent = cat.toUpperCase();

    playBtn.onclick = () => abrirPlayerTVAoVivo(url, nome, logo, id);

    destaque.style.display = 'block';
}

function abrirPlayerTVAoVivo(url, nome, logo, id) {
    if (!url && id) url = `${SF_BASE}/play?id=${id}`;
    if (!url) { mostrarToast('URL do canal não disponível.'); return; }

    const iframe = document.getElementById('embedFrame');
    const modal = document.getElementById('embedModal');

    const playerHTML = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${nome}</title>
<script src="https://cdn.jsdelivr.net/npm/hls.js@latest"><\/script>
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#000;display:flex;align-items:center;justify-content:center;height:100vh}video{width:100%;height:100%;object-fit:contain}</style>
</head><body>
<video id="v" controls autoplay playsinline></video>
<script>
const v=document.getElementById('v');
const src="${url.replace(/"/g,'&quot;')}";
if(Hls.isSupported()){const h=new Hls({enableWorker:false});h.loadSource(src);h.attachMedia(v);h.on(Hls.Events.MANIFEST_PARSED,()=>v.play().catch(()=>{}));}
else if(v.canPlayType('application/vnd.apple.mpegurl')){v.src=src;v.play().catch(()=>{});}
else{v.src=src;v.play().catch(()=>{});}
<\/script></body></html>`;

    iframe.srcdoc = playerHTML;
    modal.style.display = 'flex';
    addNoScroll();
    history.pushState({ view: 'embed', modal: true }, null, '');
}
