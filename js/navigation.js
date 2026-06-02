// ===================== NAVEGAÇÃO E MENU =====================
function abrirMenuPrincipal() {
    document.getElementById('menuOverlay').classList.add('active');
    document.getElementById('menuPrincipal').classList.add('active');
    addNoScroll();
    history.pushState({ view: 'menu', modal: true }, null, "");
}

function fecharMenuPrincipal(fromPopState = false) {
    document.getElementById('menuOverlay').classList.remove('active');
    document.getElementById('menuPrincipal').classList.remove('active');
    removeNoScroll();
    if(!fromPopState && history.state && history.state.view === 'menu') { fromPopState = true; history.back(); }
}

function mudarAba(idView, btn, originHistory = false) {
    if(idView !== 'view-home' && heroInterval) { clearInterval(heroInterval); heroInterval = null; }
    else if(idView === 'view-home' && !heroInterval && heroItems.length > 0) { iniciarHeroSlider(); }
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    else {
        const autoBtn = document.getElementById('nav-' + idView.replace('view-',''));
        if(autoBtn) autoBtn.classList.add('active');
    }
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(idView).classList.add('active');
    const mainHeader = document.getElementById('mainHeader');
    if(mainHeader) { if(idView === 'view-home') mainHeader.style.display = 'flex'; else mainHeader.style.display = 'none'; }
    if(!originHistory && idView !== 'view-home') history.pushState({ view: idView }, null, "");
    if(idView === 'view-historico') carregarHistorico();
    if(idView === 'view-buscar') { setTimeout(() => document.getElementById('inputBuscaGlobal').focus(), 300); }
}

// ===================== HISTÓRICO =====================
function carregarHistorico() {
    const listVistos = getWatchedList();
    const listFavs = getFavList();
    const itemsVistos = Object.values(listVistos).reverse();
    const itemsFavs = Object.values(listFavs).reverse();
    let html = "";
    if(itemsFavs.length > 0) {
        html += `<h3 style="color:#fff; padding-left:15px; margin-top:0; grid-column:span 3;"><i class="fas fa-heart" style="color:#e91e63;"></i> Favoritos</h3>`;
        itemsFavs.forEach(item => {
            html += `<div class="card-history" onclick="abrirDetalhesTMDB(${item.id}, '${item.type}')"><img src="${item.img}" style="width:100%; height:75%; object-fit:cover; margin:0;"><div class="titulo-tv" style="padding:5px; height:25%; display:flex; align-items:center; justify-content:center;">${item.title}</div></div>`;
        });
    }
    if(itemsVistos.length > 0) {
        html += `<h3 style="color:#fff; padding-left:15px; grid-column:span 3; margin-top:20px;"><i class="fas fa-check" style="color:#00e676;"></i> Assistidos</h3>`;
        itemsVistos.forEach(item => {
            html += `<div class="card-history" onclick="abrirDetalhesTMDB(${item.id}, '${item.type}')"><div class="ep-watched-btn active" style="top:5px; left:5px; position:absolute;" onclick="event.stopPropagation(); removerDoHistorico(event, '${item.id}')"><i class="fas fa-times"></i></div><img src="${item.img}" style="width:100%; height:75%; object-fit:cover; margin:0;"><div class="titulo-tv" style="padding:5px; height:25%; display:flex; align-items:center; justify-content:center;">${item.title}</div></div>`;
        });
    }
    if(html === "") html = `<p class="loading-text" style="grid-column: span 3; margin-top:30px;">Ainda não marcou nada.</p>`;
    const container = document.getElementById('conteudo-historico');
    if(container) container.innerHTML = html;
}

function removerDoHistorico(event, id) {
    event.stopPropagation();
    const list = getWatchedList();
    delete list[id];
    saveWatchedList(list);
    carregarHistorico();
}

// ===================== GESTOS E EVENTOS =====================
function handleTouchStart(e) {
    touchStartY = e.changedTouches[0].screenY;
    touchStartX = e.changedTouches[0].screenX;
    touchStartTarget = e.target; // GUARDA o elemento tocado
}

function handleTouchEnd(e) {
    const touchEndY = e.changedTouches[0].screenY;
    const touchEndX = e.changedTouches[0].screenX;
    const deltaY = touchEndY - touchStartY;
    const deltaX = touchEndX - touchStartX;

    // CORREÇÃO: Não fecha modal se o touch começou em elemento scrollável
    if(touchStartTarget) {
        const scrollableParent = touchStartTarget.closest('.carousel, .ep-carousel, .cast-carousel, .bottom-sheet, .server-modal, .details-page, .actor-modal');
        if(scrollableParent && deltaY < 0) return; // Scrollando pra cima = normal
        // Se está scrollando pra baixo mas ainda tem conteúdo acima, não fecha
        if(scrollableParent && scrollableParent.scrollTop > 10 && deltaY > 0) return;
    }

    if(deltaY > 80 && Math.abs(deltaX) < 100) {
        const trailer = document.getElementById('trailerModal');
        const embed = document.getElementById('embedModal');
        const menu = document.getElementById('menuPrincipal');
        const sheetTv = document.getElementById('bottomSheet');
        const serverModal = document.getElementById('serverModal');
        if(trailer && trailer.style.display === 'flex') fecharTrailer();
        if(embed && embed.style.display === 'flex') fecharEmbedWeb();
        if(menu && menu.classList.contains('active')) fecharMenuPrincipal();
        if(sheetTv && sheetTv.classList.contains('active')) fecharSheetTV();
        if(serverModal && serverModal.classList.contains('active')) fecharMenuServidores();
    }
}

// CORREÇÃO: Ordem do popstate do MAIOR z-index pro MENOR
window.addEventListener('popstate', function(event) {
    if(fromPopState) { fromPopState = false; return; }

    // ORDEM CORRIGIDA por z-index (maior primeiro):
    const modais = [
        { id: 'bottomSheet', check: (el) => el.classList.contains('active'), close: () => fecharSheetTV(true) },           // z-index: 5000
        { id: 'menuPrincipal', check: (el) => el.classList.contains('active'), close: () => fecharMenuPrincipal(true) },     // z-index: 4999
        { id: 'embedModal', check: (el) => el.style.display === 'flex', close: () => fecharEmbedWeb(true) },                // z-index: 3800
        { id: 'serverModal', check: (el) => el.classList.contains('active'), close: () => fecharMenuServidores(true) },   // z-index: 3700
        { id: 'trailerModal', check: (el) => el.style.display === 'flex', close: () => fecharTrailer(true) },              // z-index: 3600
        { id: 'actorModal', check: (el) => el.classList.contains('active'), close: () => fecharAtor(true) },              // z-index: 3500
        { id: 'detailsPage', check: (el) => el.classList.contains('active'), close: () => fecharDetalhes(true) },         // z-index: 3000
        { id: 'vipModal', check: (el) => el.style.display === 'flex', close: () => fecharModalVip(true) },               // z-index: 3900 (ajustar se necessário)
        { id: 'adBlockModal', check: (el) => el.style.display === 'flex', close: () => fecharAdBlock() }
    ];

    for(let modal of modais) {
        const el = document.getElementById(modal.id);
        if(el && modal.check(el)) { modal.close(); return; }
    }

    if(document.getElementById('view-iptv').classList.contains('active')) {
        document.getElementById('view-iptv').classList.remove('active');
        const mainHeader = document.getElementById('mainHeader');
        if(mainHeader) mainHeader.style.display = 'flex';
        mudarAba('view-home', document.getElementById('nav-home'), true);
        return;
    }
    if(document.getElementById('view-grade').classList.contains('active')) {
        document.getElementById('view-grade').classList.remove('active');
        document.getElementById('view-iptv').classList.add('active');
        return;
    }
    if(document.getElementById('view-historico').classList.contains('active') || document.getElementById('view-buscar').classList.contains('active')) {
        mudarAba('view-home', document.getElementById('nav-home'), true);
        return;
    }
    if(document.getElementById('view-home').classList.contains('active')) { return; }
    mudarAba('view-home', document.getElementById('nav-home'), true);
});

document.addEventListener('backbutton', function(e) { e.preventDefault(); history.back(); }, false);

window.onload = () => {
    history.replaceState({ view: 'view-home' }, null, "");
    initApp();
    document.addEventListener('contextmenu', event => event.preventDefault());
};

function fecharAdBlock() {
    document.getElementById('adBlockModal').style.display = 'none';
    removeNoScroll();
}
