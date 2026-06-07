// ===================== TV AO VIVO - BetterFlix =====================
const TV_PROXY = '/api/tv';
const BF_PLAYER = 'https://betterflix.click/api/player';

let tvCanaisAll = [];
let tvCanaisFiltrados = [];
let tvCatAtiva = null;
let tvCarregado = false;
let tvDestaqueAtual = null;
let tvTimeoutBusca = null;

function escTV(s) {
    return String(s || '').replace(/[&<>"']/g, c =>
        ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]
    );
}

async function iniciarTVAoVivo() {
    if (tvCarregado) return;
    tvCarregado = true;

    const lista = document.getElementById('tvCanaisList');
    if (lista) lista.innerHTML = `<div class="tv-lista-loading"><i class="fas fa-spinner fa-spin"></i> Carregando canais...</div>`;

    try {
        const [resCats, resCanais] = await Promise.all([
            fetch(`${TV_PROXY}?action=categories`),
            fetch(`${TV_PROXY}?action=all`)
        ]);
        const dataCats = await resCats.json();
        const dataCanais = await resCanais.json();

        const cats = Array.isArray(dataCats) ? dataCats : (dataCats.categories || []);
        const raw = Array.isArray(dataCanais) ? dataCanais : (dataCanais.channels || dataCanais.data || []);

        tvCanaisAll = raw.map(c => ({
            ...c,
            name: c.nome || c.name || c.title || 'Canal',
            logo: c.imagem || c.logo || c.stream_icon || '',
            category_name: c.categoria || c.category || c.category_name || '',
            id: c.id || c.stream_id || ''
        }));

        tvCanaisFiltrados = [...tvCanaisAll];
        renderTVCatPills(cats);
        renderTVLista(tvCanaisAll);

    } catch(e) {
        if (lista) lista.innerHTML = `<div class="tv-lista-loading" style="color:#f87171;">
            <i class="fas fa-exclamation-circle"></i> Erro ao carregar.<br><br>
            <button onclick="tvCarregado=false;iniciarTVAoVivo()" style="background:var(--accent);color:#000;border:none;padding:8px 18px;border-radius:20px;font-weight:700;cursor:pointer;font-size:13px;">
                <i class="fas fa-redo"></i> Tentar novamente
            </button>
        </div>`;
    }
}

function renderTVCatPills(cats) {
    const scroll = document.getElementById('tvCatsScroll');
    if (!scroll) return;
    let html = `<div class="tv-cat-pill active" onclick="filtrarTVCat(null,this)">Todos</div>`;
    cats.forEach(cat => {
        const nome = cat.name || cat.category_name || String(cat);
        const id = cat.id || cat.category_id || nome;
        html += `<div class="tv-cat-pill" onclick="filtrarTVCat('${escTV(String(id))}','${escTV(nome)}',this)">${escTV(nome)}</div>`;
    });
    scroll.innerHTML = html;
}

function filtrarTVCat(catId, catNome, el) {
    document.querySelectorAll('.tv-cat-pill').forEach(p => p.classList.remove('active'));
    if (el && el.classList) el.classList.add('active');
    tvCatAtiva = catId;
    if (!catId) {
        tvCanaisFiltrados = [...tvCanaisAll];
    } else {
        const gl = catId.toLowerCase();
        tvCanaisFiltrados = tvCanaisAll.filter(c => (c.category_name||'').toLowerCase().includes(gl));
    }
    renderTVLista(tvCanaisFiltrados);
}

function buscarCanalTV() {
    clearTimeout(tvTimeoutBusca);
    const q = document.getElementById('inputBuscaTV')?.value.trim() || '';
    if (q.length < 2) {
        renderTVLista(tvCatAtiva ? tvCanaisFiltrados : tvCanaisAll);
        return;
    }
    tvTimeoutBusca = setTimeout(() => {
        const ql = q.toLowerCase();
        renderTVLista(tvCanaisAll.filter(c => (c.name||'').toLowerCase().includes(ql)));
    }, 300);
}

function renderTVLista(canais) {
    const lista = document.getElementById('tvCanaisList');
    if (!lista) return;
    if (!canais || !canais.length) {
        lista.innerHTML = `<div class="tv-lista-loading" style="color:#888;">Nenhum canal encontrado.</div>`;
        return;
    }

    // Primeiro canal → destaque hero
    mostrarTVDestaque(canais[0]);

    let html = '';
    canais.forEach(canal => {
        const nome = canal.name || 'Canal';
        const logo = canal.logo || '';
        const cat = canal.category_name || '';
        const id = canal.id || '';

        html += `<div class="tv-lista-item" onclick="abrirPlayerTVAoVivo('${escTV(id)}','${escTV(nome)}','${escTV(logo)}')">
            <div class="tv-lista-logo">
                ${logo
                    ? `<img src="${escTV(logo)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">`
                    : ''}
                <div class="tv-lista-logo-fallback" style="${logo?'display:none':'display:flex'}">
                    <i class="fas fa-tv"></i>
                </div>
            </div>
            <div class="tv-lista-info">
                <div class="tv-lista-nome">${escTV(nome)}</div>
                ${cat ? `<div class="tv-lista-cat">${escTV(cat.toUpperCase())}</div>` : ''}
            </div>
            <div class="tv-lista-live">
                <div class="tv-live-dot-small"></div>
            </div>
            <div class="tv-lista-play"><i class="fas fa-play"></i></div>
        </div>`;
    });
    lista.innerHTML = html;
}

function mostrarTVDestaque(canal) {
    tvDestaqueAtual = canal;
    const logoWrap = document.getElementById('tvDestaqueLogo');
    const nomeEl = document.getElementById('tvDestaqueNome');
    const catEl = document.getElementById('tvDestaqueCat');
    const playBtn = document.getElementById('tvDestaquePlayBtn');
    if (!logoWrap) return;

    const nome = canal.name || 'Canal';
    const logo = canal.logo || '';
    const cat = canal.category_name || '';
    const id = canal.id || '';

    logoWrap.innerHTML = logo
        ? `<img src="${escTV(logo)}" style="width:100%;height:100%;object-fit:contain;border-radius:8px;" onerror="this.style.display='none';">`
        : `<i class="fas fa-tv" style="color:var(--accent);font-size:28px;"></i>`;

    nomeEl.textContent = nome;
    catEl.textContent = cat ? cat.toUpperCase() : 'AO VIVO';
    playBtn.onclick = () => abrirPlayerTVAoVivo(id, nome, logo);
}

function abrirPlayerTVAoVivo(id, nome, logo) {
    if (!id) {
        if (typeof mostrarToast === 'function') mostrarToast('Canal não disponível.');
        return;
    }
    const playerUrl = `${BF_PLAYER}?id=${encodeURIComponent(id)}&type=channel`;
    const iframe = document.getElementById('embedFrame');
    const modal = document.getElementById('embedModal');
    iframe.src = '';
    iframe.removeAttribute('srcdoc');
    iframe.src = playerUrl;
    modal.style.display = 'flex';
    if (typeof addNoScroll === 'function') addNoScroll();
    history.pushState({ view: 'embed', modal: true }, null, '');
}
