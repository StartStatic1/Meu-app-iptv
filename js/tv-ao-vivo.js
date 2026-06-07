// ===================== TV AO VIVO - BetterFlix API =====================
const BF_CANAIS_URL = 'https://betterflix.click/api/canais.json';
const BF_PLAYER    = 'https://betterflix.click/api/player';

let tvCanaisAll      = [];
let tvCanaisFiltrados = [];
let tvCatAtiva       = null;
let tvCarregado      = false;
let tvCanalAtivo     = null;
let tvTimeoutBuscaTV = null;

function escTV(s) {
    return String(s || '').replace(/[&<>"']/g, c =>
        ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]
    );
}

async function iniciarTVAoVivo() {
    if (tvCarregado) return;
    tvCarregado = true;

    const list = document.getElementById('tvCanaisGrid');
    list.innerHTML = `<div class="tv-loading"><i class="fas fa-spinner fa-spin fa-2x"></i><br><br>Carregando canais...</div>`;

    try {
        const res = await fetch(BF_CANAIS_URL);
        if (!res.ok) throw new Error('Erro ' + res.status);
        const data = await res.json();

        tvCanaisAll = (Array.isArray(data) ? data : []).map(c => ({
            id:            String(c.id || c.stream_id || ''),
            name:          c.nome  || c.name  || c.title || 'Canal',
            logo:          c.imagem|| c.logo  || c.stream_icon || '',
            category_name: c.categoria || c.category || c.category_name || ''
        }));

        if (!tvCanaisAll.length) throw new Error('Nenhum canal recebido');

        const catNames = [...new Set(tvCanaisAll.map(c => c.category_name).filter(Boolean))];
        renderTVCategoryPills(catNames);

        tvCanaisFiltrados = [...tvCanaisAll];
        renderTVList(tvCanaisAll);

        // Inicia no primeiro canal automaticamente
        if (tvCanaisAll[0]) selecionarCanalTV(tvCanaisAll[0]);

    } catch(e) {
        tvCarregado = false;
        list.innerHTML = `<div class="tv-loading" style="color:#f87171;">
            <i class="fas fa-exclamation-circle fa-2x"></i><br><br>
            Erro ao carregar canais.<br>
            <small style="color:#666;">${e.message}</small><br><br>
            <button onclick="iniciarTVAoVivo()" style="background:var(--accent);color:#000;border:none;padding:9px 20px;border-radius:20px;font-weight:700;cursor:pointer;margin-top:8px;">
                <i class="fas fa-redo"></i> Tentar novamente
            </button>
        </div>`;
    }
}

function renderTVCategoryPills(catNames) {
    const scroll = document.getElementById('tvCatsScroll');
    let html = `<div class="tv-cat-pill active" onclick="filtrarTVCategoria(null,this)">Todos</div>`;
    catNames.forEach(nome => {
        html += `<div class="tv-cat-pill" onclick="filtrarTVCategoria('${escTV(nome)}',this)">${escTV(nome)}</div>`;
    });
    scroll.innerHTML = html;
}

function filtrarTVCategoria(catNome, el) {
    document.querySelectorAll('.tv-cat-pill').forEach(p => p.classList.remove('active'));
    if (el) el.classList.add('active');
    tvCatAtiva = catNome;

    tvCanaisFiltrados = catNome
        ? tvCanaisAll.filter(c => c.category_name === catNome)
        : [...tvCanaisAll];

    renderTVList(tvCanaisFiltrados);
}

function buscarCanalTV() {
    clearTimeout(tvTimeoutBuscaTV);
    const q = (document.getElementById('inputBuscaTV').value || '').trim();
    if (q.length < 2) {
        renderTVList(tvCatAtiva ? tvCanaisFiltrados : tvCanaisAll);
        return;
    }
    tvTimeoutBuscaTV = setTimeout(() => {
        const ql = q.toLowerCase();
        renderTVList(tvCanaisAll.filter(c => c.name.toLowerCase().includes(ql)));
    }, 280);
}

function renderTVList(canais) {
    const list = document.getElementById('tvCanaisGrid');
    if (!canais || !canais.length) {
        list.innerHTML = `<div class="tv-loading" style="color:#888;">Nenhum canal encontrado.</div>`;
        return;
    }
    list.innerHTML = canais.map(c => {
        const ativo = tvCanalAtivo && tvCanalAtivo.id === c.id ? 'active' : '';
        const logoHtml = c.logo
            ? `<img src="${escTV(c.logo)}" loading="lazy" onerror="this.style.display='none';this.parentElement.innerHTML='<i class=\\"fas fa-tv\\"></i>'">`
            : `<i class="fas fa-tv"></i>`;
        return `<div class="tv-canal-row ${ativo}" onclick="selecionarCanalTV({id:'${escTV(c.id)}',name:'${escTV(c.name)}',logo:'${escTV(c.logo)}',category_name:'${escTV(c.category_name)}'})">
            <div class="tv-canal-row-logo">${logoHtml}</div>
            <div class="tv-canal-row-info">
                <div class="tv-canal-row-name">${escTV(c.name)}</div>
                <div class="tv-canal-row-cat">${escTV(c.category_name)}</div>
            </div>
            <div class="tv-canal-row-play"><i class="fas fa-play"></i></div>
        </div>`;
    }).join('');
}

function selecionarCanalTV(canal) {
    tvCanalAtivo = canal;

    // Atualiza destaque visual na lista
    document.querySelectorAll('.tv-canal-row').forEach(r => r.classList.remove('active'));
    const rows = document.querySelectorAll('.tv-canal-row');
    rows.forEach(r => {
        if (r.querySelector('.tv-canal-row-name')?.textContent === canal.name) r.classList.add('active');
    });

    // Mostra player e barra atual
    const playerWrap = document.getElementById('tvPlayerWrap');
    const currentBar = document.getElementById('tvCurrentBar');
    const headerMain = document.getElementById('tvHeaderMain');
    const frame      = document.getElementById('tvPlayerFrame');

    if (playerWrap) playerWrap.style.display = 'block';
    if (currentBar) currentBar.style.display = 'flex';
    if (headerMain) headerMain.style.display = 'none';

    // Atualiza barra canal atual
    const logoEl = document.getElementById('tvCurrentLogo');
    const nameEl = document.getElementById('tvCurrentName');
    const catEl  = document.getElementById('tvCurrentCat');
    if (logoEl) { logoEl.src = canal.logo || ''; logoEl.style.display = canal.logo ? 'block' : 'none'; }
    if (nameEl) nameEl.textContent = canal.name;
    if (catEl)  catEl.textContent  = (canal.category_name || 'CANAL').toUpperCase();

    // Carrega player BetterFlix
    if (frame && canal.id) {
        frame.src = `${BF_PLAYER}?id=${encodeURIComponent(canal.id)}&type=channel`;
    }

    // Scroll para o topo para ver o player
    document.getElementById('view-tv')?.scrollTo({ top: 0, behavior: 'smooth' });
}
