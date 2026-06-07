// ===================== TV AO VIVO - BetterFlix API =====================
const TV_PROXY = '/api/tv';
const BF_PLAYER = 'https://betterflix.click/api/player';

let tvCanaisAll = [];
let tvCanaisFiltrados = [];
let tvCatAtiva = null;
let tvCarregado = false;
let tvCanalAtivo = null;
let timeoutBuscaTV = null;

// Favoritos IPTV TV
function getTVFavs() { try { return JSON.parse(localStorage.getItem('sf_tv_favs') || '[]'); } catch(e) { return []; } }
function saveTVFavs(list) { localStorage.setItem('sf_tv_favs', JSON.stringify(list)); }
function isTVFav(id) { return getTVFavs().some(c => c.id === id); }
function toggleTVFav(canal, btn) {
    let favs = getTVFavs();
    if (isTVFav(canal.id)) {
        favs = favs.filter(c => c.id !== canal.id);
        if (btn) { btn.style.color = '#555'; btn.innerHTML = '<i class="fas fa-star"></i>'; }
        if (typeof mostrarToast === 'function') mostrarToast('Removido dos favoritos');
    } else {
        favs.unshift(canal);
        if (btn) { btn.style.color = 'gold'; btn.innerHTML = '<i class="fas fa-star"></i>'; }
        if (typeof mostrarToast === 'function') mostrarToast('⭐ Canal favoritado!');
    }
    saveTVFavs(favs);
    renderMeusIPTVFavoritos();
}

function renderMeusIPTVFavoritos() {
    const div = document.getElementById('meus-iptv-favoritos');
    if (!div) return;
    const favs = getTVFavs();
    if (!favs.length) {
        div.innerHTML = '<p style="color:#555;font-size:13px;text-align:center;padding:20px 0;">Nenhum canal favoritado ainda.<br><span style="font-size:11px;color:#444;">Vá em TV e adicione canais aos favoritos.</span></p>';
        return;
    }
    let html = '<div class="canais-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">';
    favs.forEach(canal => {
        const nome = canal.name || 'Canal';
        const logo = canal.logo || '';
        const id = canal.id || '';
        html += `<div class="canal-card" onclick="selecionarCanalTVFromFav('${escTV(id)}','${escTV(nome)}','${escTV(logo)}','${escTV(canal.category_name||'')}')">
            <div class="canal-logo-wrap" style="height:60px;background:#111;border-radius:10px;display:flex;align-items:center;justify-content:center;overflow:hidden;margin-bottom:6px;">
                ${logo ? `<img src="${escTV(logo)}" loading="lazy" style="max-width:80%;max-height:80%;object-fit:contain;" onerror="this.style.display='none';">` : '<i class="fas fa-tv" style="color:var(--accent);font-size:24px;"></i>'}
            </div>
            <div style="font-size:10px;font-weight:700;color:#ccc;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escTV(nome)}</div>
        </div>`;
    });
    html += '</div>';
    div.innerHTML = html;
}

function selecionarCanalTVFromFav(id, nome, logo, cat) {
    // Navega para TV e seleciona o canal
    if (typeof mudarAba === 'function') mudarAba('view-tv', document.getElementById('nav-tv'));
    setTimeout(() => {
        selecionarCanalTV(id, nome, logo, cat, null);
    }, 300);
}

function escTV(s) {
    return String(s || '').replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
    );
}

async function iniciarTVAoVivo() {
    if (tvCarregado) return;
    tvCarregado = true;

    // Mostra player topo vazio
    const playerTopo = document.getElementById('tvPlayerTopo');
    if (playerTopo) playerTopo.style.display = 'block';

    const grid = document.getElementById('tvCanaisGrid');
    grid.innerHTML = `<div class="tv-loading"><i class="fas fa-spinner fa-spin fa-2x"></i><br><br>Carregando canais BetterFlix...</div>`;

    try {
        const [resCats, resCanais] = await Promise.all([
            fetch(`${TV_PROXY}?action=categories`),
            fetch(`${TV_PROXY}?action=all`)
        ]);

        const dataCats = await resCats.json();
        const dataCanais = await resCanais.json();

        const cats = Array.isArray(dataCats) ? dataCats : (dataCats.categories || []);
        tvCanaisAll = Array.isArray(dataCanais) ? dataCanais : (dataCanais.channels || dataCanais.data || []);

        // Normaliza campos BetterFlix -> padrão interno
        tvCanaisAll = tvCanaisAll.map(c => ({
            ...c,
            name: c.nome || c.name || c.title || 'Canal',
            logo: c.imagem || c.logo || c.stream_icon || '',
            category_name: c.categoria || c.category || c.category_name || '',
            id: c.id || c.stream_id || ''
        }));

        tvCanaisFiltrados = [...tvCanaisAll];
        renderTVCategoryPills(cats);
        renderTVGrid(tvCanaisAll);

        // Auto-seleciona primeiro canal para mostrar info no topo
        if (tvCanaisAll.length > 0) mostrarInfoCanalAtivo(tvCanaisAll[0]);

    } catch(e) {
        grid.innerHTML = `<div class="tv-loading" style="color:#f87171;">
            <i class="fas fa-exclamation-circle fa-2x"></i><br><br>
            Erro ao carregar canais BetterFlix.<br>
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
        return;
    }

    const gl = (catId || '').toLowerCase();
    tvCanaisFiltrados = tvCanaisAll.filter(c =>
        (c.category_name || '').toLowerCase().includes(gl)
    );
    renderTVGrid(tvCanaisFiltrados);
}

function buscarCanalTV() {
    clearTimeout(timeoutBuscaTV);
    const q = document.getElementById('inputBuscaTV').value.trim();

    if (q.length < 2) {
        renderTVGrid(tvCatAtiva ? tvCanaisFiltrados : tvCanaisAll);
        return;
    }

    timeoutBuscaTV = setTimeout(() => {
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
        const fav = isTVFav(id);

        html += `<div class="tv-canal-card ${tvCanalAtivo?.id === id ? 'selected' : ''}" onclick="selecionarCanalTV('${escTV(id)}','${escTV(nome)}','${escTV(logo)}','${escTV(cat)}',this)">
            <div class="tv-canal-card-bg">
                ${logo ? `<img src="${escTV(logo)}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=tv-canal-logo-fallback><i class=\'fas fa-tv\'></i></div>'">` : '<div class="tv-canal-logo-fallback"><i class="fas fa-tv"></i></div>'}
            </div>
            <div class="tv-canal-card-overlay"></div>
            <div class="tv-canal-card-bottom">
                <div style="flex:1;min-width:0;">
                    <div style="font-size:11px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escTV(nome)}</div>
                    ${cat ? `<div style="font-size:9px;color:#888;margin-top:1px;">${escTV(cat)}</div>` : ''}
                </div>
                <div style="display:flex;align-items:center;gap:4px;">
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
    tvCanalAtivo = canal;
    mostrarInfoCanalAtivo(canal);

    // Scroll para o topo para ver player
    document.getElementById('view-tv')?.scrollTo({ top: 0, behavior: 'smooth' });
}

function mostrarInfoCanalAtivo(canal) {
    tvCanalAtivo = canal;
    const nome = canal.name || 'Canal';
    const logo = canal.logo || '';
    const cat = canal.category_name || '';
    const id = canal.id || '';

    // Atualiza info do canal ativo
    const infoBar = document.getElementById('tvCanalAtivoInfo');
    const logoEl = document.getElementById('tvCanalAtivoLogo');
    const nomeEl = document.getElementById('tvCanalAtivoNome');
    const catEl = document.getElementById('tvCanalAtivoCat');

    if (infoBar) infoBar.style.display = 'block';
    if (logoEl) logoEl.innerHTML = logo
        ? `<img src="${escTV(logo)}" style="width:100%;height:100%;object-fit:contain;border-radius:8px;" onerror="this.style.display='none';">`
        : `<i class="fas fa-tv" style="color:var(--accent);font-size:18px;"></i>`;
    if (nomeEl) nomeEl.textContent = nome;
    if (catEl) catEl.textContent = cat || '';

    // Atualiza player topo info
    const topoLogo = document.getElementById('tvPlayerTopoLogo');
    const topoNome = document.getElementById('tvPlayerTopoNome');
    const topoCat = document.getElementById('tvPlayerTopoCat');
    const topoBtn = document.getElementById('tvPlayerTopoBtn');

    if (topoLogo) topoLogo.innerHTML = logo
        ? `<img src="${escTV(logo)}" style="width:100%;height:100%;object-fit:contain;border-radius:12px;" onerror="this.style.display='none';">`
        : `<i class="fas fa-tv" style="color:var(--accent);font-size:28px;"></i>`;
    if (topoNome) topoNome.textContent = nome;
    if (topoCat) topoCat.textContent = cat ? cat.toUpperCase() : 'AO VIVO';
    if (topoBtn) {
        topoBtn.style.display = id ? 'flex' : 'none';
        topoBtn.onclick = () => abrirPlayerTVAoVivoInline(id, nome, logo);
    }
}

// Abre player inline no topo (não mais modal separado)
function abrirPlayerTVAoVivoInline(id, nome, logo) {
    const useId = id || tvCanalAtivo?.id;
    if (!useId) {
        if (typeof mostrarToast === 'function') mostrarToast('Canal não disponível.');
        return;
    }

    const playerUrl = `${BF_PLAYER}?id=${encodeURIComponent(useId)}&type=channel`;

    const infoEl = document.getElementById('tvPlayerTopoInfo');
    const frame = document.getElementById('tvPlayerTopoFrame');
    const closeBtn = document.getElementById('tvPlayerTopoClose');

    if (infoEl) infoEl.style.display = 'none';
    if (frame) {
        frame.src = playerUrl;
        frame.style.display = 'block';
    }
    if (closeBtn) closeBtn.style.display = 'flex';

    // Scroll para o topo
    document.getElementById('view-tv')?.scrollTo({ top: 0, behavior: 'smooth' });
}

function fecharPlayerTopo() {
    const infoEl = document.getElementById('tvPlayerTopoInfo');
    const frame = document.getElementById('tvPlayerTopoFrame');
    const closeBtn = document.getElementById('tvPlayerTopoClose');

    if (frame) { frame.src = ''; frame.style.display = 'none'; }
    if (infoEl) infoEl.style.display = 'flex';
    if (closeBtn) closeBtn.style.display = 'none';
}

// Mantém compatibilidade com código antigo
function abrirPlayerTVAoVivo(id, nome, logo) {
    abrirPlayerTVAoVivoInline(id, nome, logo);
}

// Legado: destaque (mantido para não quebrar chamadas)
function mostrarTVDestaque(canal) {
    mostrarInfoCanalAtivo(canal);
}
