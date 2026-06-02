// ===================== PLAYER / SERVIDORES =====================
function abrirMenuServidoresDetalhes() {
    if(document.activeElement) document.activeElement.blur();
    const btnNativo = document.getElementById('btnServerNativo');
    if (btnNativo) {
        btnNativo.onclick = () => { fecharMenuServidores(); buscarEReproduzirNativo(currentStreamData.title, currentItemType); };
    }
    document.getElementById('serverModal').classList.add('active');
    const overlay = document.getElementById('sheetOverlay');
    if(overlay) { overlay.style.zIndex = "3600"; overlay.classList.add('active'); }
    addNoScroll();
    history.pushState({ view: 'servers', modal: true }, null, "");
}

async function buscarEReproduzirNativo(title, type) {
    mostrarToast("Procurando no CDN...");
    try {
        let action = type === 'tv' ? 'get_series' : 'get_vod_streams';
        const res = await fetch(`/api/iptv?action=${action}`);
        const data = await res.json();
        const termo = title.toLowerCase();
        const matches = data.filter(item => (item.name || '').toLowerCase().includes(termo));
        if(matches.length > 0) {
            let match = matches.find(m => !/(4k|uhd|2160p)/i.test((m.name || '').toLowerCase()));
            if(!match) match = matches[0];
            const isVod = type !== 'tv';
            const streamId = isVod ? match.stream_id : match.series_id;
            const ext = match.container_extension || 'mp4';
            if(isVod) { dispararPlayer(streamId, 'vod', ext, title); }
            else {
                const r = await fetch(`/api/iptv?action=get_series_info&series_id=${streamId}`);
                const d = await r.json();
                if(d.episodes && d.episodes['1'] && d.episodes['1'][0]) {
                    const ep = d.episodes['1'][0];
                    dispararPlayer(ep.id, 'episode', ep.container_extension||'mp4', title);
                } else { mostrarToast("Episódios não encontrados."); }
            }
        } else {
            mostrarToast("Não disponível no CDN. Tente Web.");
            setTimeout(() => {
                document.getElementById('serverModal').classList.add('active');
                const overlay = document.getElementById('sheetOverlay');
                if(overlay) { overlay.style.zIndex = "3600"; overlay.classList.add('active'); }
            }, 1500);
        }
    } catch(e) { mostrarToast("Erro CDN: " + e.message); }
}

function abrirPlayerWeb(servidor) {
    if(!currentTmdbId) return;
    document.getElementById('serverModal').classList.remove('active');
    const overlay = document.getElementById('sheetOverlay');
    if(overlay) { overlay.classList.remove('active'); setTimeout(() => overlay.style.zIndex = "", 300); }
    const modal = document.getElementById('embedModal');
    const frame = document.getElementById('embedFrame');
    let finalUrl = "";
    if(servidor === 'betterflix') {
        if(currentItemType === 'movie') finalUrl = `https://betterflix.click/api/player?id=${currentTmdbId}&type=movie`;
        else finalUrl = `https://betterflix.click/api/player?id=${currentTmdbId}&type=tv&season=${currentSeason}&episode=${currentEpisode}`;
    } else if(servidor === 'embedmovies') {
        if(currentItemType === 'movie') finalUrl = `https://myembed.biz/filme/${currentTmdbId}`;
        else finalUrl = `https://myembed.biz/serie/${currentTmdbId}/${currentSeason}/${currentEpisode}`;
    } else if(servidor === 'embedplayapi') {
        if(currentItemType === 'movie') finalUrl = `https://embedplayapi.top/embed/${currentTmdbId}`;
        else finalUrl = `https://embedplayapi.top/embed/${currentTmdbId}/${currentSeason}/${currentEpisode}`;
    } else if(servidor === 'superflix') {
        if(currentItemType === 'movie') finalUrl = `https://superflixapi.fit/filme/${currentTmdbId}`;
        else finalUrl = `https://superflixapi.fit/serie/${currentTmdbId}/${currentSeason}/${currentEpisode}`;
    }
    dispararDirectLink();
    setTimeout(() => {
        frame.src = finalUrl;
        modal.style.display = 'flex';
        if(history.state && history.state.view === 'servers') {
            history.replaceState({ view: 'embed', modal: true }, null, "");
        } else {
            history.pushState({ view: 'embed', modal: true }, null, "");
        }
        try { if(screen.orientation && screen.orientation.lock) { screen.orientation.lock('landscape').catch(e => console.log(e)); } }
        catch(e) {}
    }, 300);
}

async function dispararPlayer(id, tipo, ext, titulo) {
    const btn = (tipo === 'live') ? document.getElementById('btnPlayTV') : document.getElementById('btnPlayFilme');
    if(btn) { btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Conectando...`; btn.disabled = true; }
    try {
        let urlFinal = "";
        if(tipo === 'vod') {
            const res = await fetch(`/api/iptv?action=get_movie_url&stream_id=${id}&extension=${ext||'mp4'}`);
            const data = await res.json(); urlFinal = data.url;
        } else if(tipo === 'live') {
            const res = await fetch(`/api/iptv?action=get_live_url&stream_id=${id}`);
            const data = await res.json(); urlFinal = data.url;
        } else if(tipo === 'episode') {
            const res = await fetch(`/api/iptv?action=get_series_url&stream_id=${id}&extension=${ext||'mp4'}`);
            const data = await res.json(); urlFinal = data.url;
        }
        if(!urlFinal) throw new Error("Link não retornado.");
        if (window.AndroidApp && window.AndroidApp.abrirVideoNativo) {
            window.AndroidApp.abrirVideoNativo(urlFinal);
        } else {
            const urlLimpa = urlFinal.replace(/^https?:\/\//, '');
            window.location.href = `intent://${urlLimpa}#Intent;scheme=http;type=video/*;action=android.intent.action.VIEW;end;`;
        }
    } catch(e) { mostrarToast("Erro: " + e.message); }
    finally { setTimeout(() => { if(btn) { btn.innerHTML = `<i class="fas fa-play"></i> Assistir`; btn.disabled = false; } }, 1000); }
}

// ===================== TRAILER / EMBED =====================
function abrirTrailer() {
    if(!trailerKeyAtivo) return;
    const frame = document.getElementById('trailerFrame');
    frame.src = `https://www.youtube.com/embed/${trailerKeyAtivo}?autoplay=1&rel=0`;
    document.getElementById('trailerModal').style.display = 'flex';
    addNoScroll();
    history.pushState({ view: 'trailer', modal: true }, null, "");
}

function fecharTrailer(fromPopState = false) {
    const frame = document.getElementById('trailerFrame');
    frame.src = 'about:blank';
    setTimeout(() => { frame.src = ''; }, 200);
    document.getElementById('trailerModal').style.display = 'none';
    removeNoScroll();
    if(!fromPopState && history.state && history.state.view === 'trailer') { fromPopState = true; history.back(); }
}

function fecharMenuServidores(fromPopState = false) {
    document.getElementById('serverModal').classList.remove('active');
    const overlay = document.getElementById('sheetOverlay');
    if(overlay) { overlay.classList.remove('active'); setTimeout(() => overlay.style.zIndex = "", 300); }
    removeNoScroll();
    if(!fromPopState && history.state && history.state.view === 'servers') { fromPopState = true; history.back(); }
}

function fecharEmbedWeb(fromPopState = false) {
    const frame = document.getElementById('embedFrame');
    frame.src = 'about:blank';
    setTimeout(() => { frame.src = ''; }, 200);
    document.getElementById('embedModal').style.display = 'none';
    removeNoScroll();
    try { if(screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch(e) {}
    if(!fromPopState && history.state && history.state.view === 'embed') { fromPopState = true; history.back(); }
}

function fecharDetalhes(fromPopState = false) {
    document.getElementById('detailsPage').classList.remove('active');
    removeNoScroll();
    if(!fromPopState && history.state && history.state.view === 'details') { fromPopState = true; history.back(); }
}

function fecharAtor(fromPopState = false) {
    document.getElementById('actorModal').classList.remove('active');
    removeNoScroll();
    if(!fromPopState && history.state && history.state.view === 'actor') { fromPopState = true; history.back(); }
}

function abrirSheetTV(titulo, streamId, tagsStr) {
    const btnPlayTV = document.getElementById('btnPlayTV');
    if(btnPlayTV) {
        btnPlayTV.disabled = false;
        btnPlayTV.innerHTML = '<i class="fas fa-play"></i> Assistir Agora';
        btnPlayTV.onclick = () => dispararPlayer(streamId, 'live', '', titulo);
    }
    document.getElementById('tvTitle').innerText = titulo;
    document.getElementById('tvBadges').innerHTML = gerarHTMLBadges(tagsStr);
    document.getElementById('sheetOverlay').classList.add('active');
    document.getElementById('bottomSheet').classList.add('active');
    addNoScroll();
    history.pushState({ view: 'sheet', modal: true }, null, "");
}

function fecharSheetTV(fromPopState = false) {
    document.getElementById('sheetOverlay').classList.remove('active');
    document.getElementById('bottomSheet').classList.remove('active');
    removeNoScroll();
    if(!fromPopState && history.state && history.state.view === 'sheet') { fromPopState = true; history.back(); }
}

function fecharTodosOverlays() {
    fecharMenuServidores();
    fecharSheetTV();
    fecharMenuPrincipal();
}
