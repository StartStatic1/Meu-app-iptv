// ===================== TV AO VIVO - BetterFlix API =====================
const BF_CANAIS_URL = 'https://betterflix.click/api/canais.json';
const BF_PLAYER = 'https://betterflix.click/api/player';

let tvCanaisAll = [];
let tvCanaisFiltrados = [];
let tvCatAtiva = null;
let tvCarregado = false;
let tvDestaqueAtual = null;
let tvTimeoutBuscaTV = null;

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
        const res = await fetch(BF_CANAIS_URL);
        if (!res.ok) throw new Error('Servidor retornou ' + res.status);
        const data = await res.json();

        // Normaliza campos BetterFlix -> padrão interno
        tvCanaisAll = (Array.isArray(data) ? data : []).map(c => ({
            ...c,
            name: c.nome || c.name || c.title || 'Canal',
            logo: c.imagem || c.logo || c.stream_icon || '',
            category_name: c.categoria || c.category || c.category_name || '',
            id: String(c.id || c.stream_id || '')
        }));

        if (!tvCanaisAll.length) throw new Error('Nenhum canal recebido');

        // Extrai categorias únicas
        const catNames = [...new Set(tvCanaisAll.map(c => c.category_name).filter(Boolean))];
        const cats = catNames.map(c => ({ id: c, name: c }));

        tvCanaisFiltrados = [...tvCanaisAll];
        renderTVCategoryPills(cats);
        renderTVGrid(tvCanaisAll);
        if (tvCanaisAll.length > 0) mostrarTVDestaque(tvCanaisAll[0]);

    } catch(e) {
        tvCarregado = false; // permite tentar novamente
        grid.innerHTML = `<div class="tv-loading" style="color:#f87171;">
            <i class="fas fa-exclamation-circle fa-2x"></i><br><br>
            Erro ao carregar canais.<br>
            <small style="color:#666;">${e.message}</small><br><br>
            <button onclick="iniciarTVAoVivo()" style="background:var(--accent);color:#000;border:none;padding:8px 18px;border-radius:20px;font-weight:700;cursor:pointer;">
                <i class="fas fa-redo"></i> Tentar novamente
            </button>
        </div>`;
    }
}

function renderTVCategoryPills(cats) {
    const scroll = document.getElementById('tvCatsScroll');
    let html = `<div class="tv-cat-pill active" onclick="filtrarTVCategoria(null, this)">Todos</div>`;
    cats.forEach(cat => {
        const nome = cat.name || cat.category_name || String(cat);
        const id = cat.id || cat.category_id || nome;
        html += `<div class="tv-cat-pill" onclick="filtrarTVCategoria('${escTV(String(id))}','${escTV(nome)}',this)">${escTV(nome)}</div>`;
    });
    scroll.innerHTML = html;
}

async function filtrarTVCategoria(catId, catNome, el) {
    document.querySelectorAll('.tv-cat-pill').forEach(p => p.classList.remove('active'));
    if (el && el.classList) el.classList.add('active');
    tvCatAtiva = catId;

    if (!catId) {
        tvCanaisFiltrados = [...tvCanaisAll];
        renderTVGrid(tvCanaisFiltrados);
        if (tvCanaisFiltrados[0]) mostrarTVDestaque(tvCanaisFiltrados[0]);
        return;
    }

    const gl = (catId || '').toLowerCase();
    tvCanaisFiltrados = tvCanaisAll.filter(c =>
        (c.category_name || '').toLowerCase().includes(gl)
    );
    renderTVGrid(tvCanaisFiltrados);
    if (tvCanaisFiltrados[0]) mostrarTVDestaque(tvCanaisFiltrados[0]);
}

function buscarCanalTV() {
    clearTimeout(tvTimeoutBuscaTV);
    const q = document.getElementById('inputBuscaTV').value.trim();

    if (q.length < 2) {
        renderTVGrid(tvCatAtiva ? tvCanaisFiltrados : tvCanaisAll);
        return;
    }

    tvTimeoutBuscaTV = setTimeout(() => {
        const ql = q.toLowerCase();
        const resultado = tvCanaisAll.filter(c => (c.name || '').toLowerCase().includes(ql));
        renderTVGrid(resultado);
    }, 300);
}

function renderTVGrid(canais) {
    const grid = document.getElementById('tvCanaisGrid');
    if (!canais || !canais.length) {
        grid.innerHTML = `<div class="tv-loading" style="color:#888;">Nenhum canal encontrado.</div>`;
        return;
    }

    let html = '';
    canais.forEach((canal) => {
        const nome = canal.name || 'Canal';
        const logo = canal.logo || '';
        const cat = canal.category_name || '';
        const id = canal.id || '';

        html += `<div class="tv-canal-card" onclick="selecionarCanalTV('${escTV(id)}','${escTV(nome)}','${escTV(logo)}','${escTV(cat)}',this)">
            <div class="tv-canal-card-bg">
                ${logo ? `<img src="${escTV(logo)}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=tv-canal-logo-fallback><i class=\"fas fa-tv\"></i></div>'">` : '<div class="tv-canal-logo-fallback"><i class="fas fa-tv"></i></div>'}
            </div>
            <div class="tv-canal-card-overlay"></div>
            <div class="tv-canal-card-bottom">
                <div style="flex:1;min-width:0;">
                    <div style="font-size:12px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escTV(nome)}</div>
                    ${cat ? `<div style="font-size:10px;color:#888;margin-top:1px;">${escTV(cat)}</div>` : ''}
                </div>
                <div style="display:flex;align-items:center;gap:5px;">
                    <div class="tv-live-dot-small"></div>
                    <div class="tv-canal-play-btn"><i class="fas fa-play"></i></div>
                </div>
            </div>
        </div>`;
    });
    grid.innerHTML = html;
}

function selecionarCanalTV(id, nome, logo, cat, el) {
    document.querySelectorAll('.tv-canal-card').forEach(c => c.classList.remove('selected'));
    if (el) el.classList.add('selected');
    const canal = { id, name: nome, logo, category_name: cat };
    mostrarTVDestaque(canal);
    document.getElementById('tvDestaque')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function mostrarTVDestaque(canal) {
    tvDestaqueAtual = canal;
    const destaque = document.getElementById('tvDestaque');
    const logoWrap = document.getElementById('tvDestaqueLogo');
    const nomeEl = document.getElementById('tvDestaqueNome');
    const catEl = document.getElementById('tvDestaqueCat');
    const playBtn = document.getElementById('tvDestaquePlayBtn');

    const nome = canal.name || 'Canal';
    const logo = canal.logo || '';
    const cat = canal.category_name || '';
    const id = canal.id || '';

    logoWrap.innerHTML = logo
        ? `<img src="${escTV(logo)}" style="width:100%;height:100%;object-fit:contain;border-radius:8px;"
            onerror="this.style.display='none';">`
        : `<i class="fas fa-tv" style="color:var(--accent);font-size:22px;"></i>`;

    nomeEl.textContent = nome;
    catEl.textContent = cat ? cat.toUpperCase() : '';
    playBtn.onclick = () => abrirPlayerTVAoVivo(id, nome, logo);
    destaque.style.display = 'block';
}

function abrirPlayerTVAoVivo(id, nome, logo) {
    if (!id) {
        if (typeof mostrarToast === 'function') mostrarToast('Canal não disponível.');
        return;
    }

    const playerUrl = `${BF_PLAYER}?id=${encodeURIComponent(id)}&type=channel`;

    const iframe = document.getElementById('embedFrame');
    const modal = document.getElementById('embedModal');

    // Usa iframe direto do BetterFlix - já tem player integrado, sem bloqueios
    iframe.src = '';
    iframe.removeAttribute('srcdoc');
    iframe.src = playerUrl;
    modal.style.display = 'flex';
    if (typeof addNoScroll === 'function') addNoScroll();
    history.pushState({ view: 'embed', modal: true }, null, '');
}
