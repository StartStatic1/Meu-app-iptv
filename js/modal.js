// ===================== DETALHES TMDB =====================
async function abrirDetalhesTMDB(tmdbId, type) {
    currentTmdbId = tmdbId; currentItemType = type; currentSeason = 1; currentEpisode = 1;
    currentSuperFlixItem = null; // LIMPA SuperFlix
    const btnPlayFilme = document.getElementById('btnPlayFilme');
    if(btnPlayFilme) {
        btnPlayFilme.disabled = false;
        btnPlayFilme.innerHTML = '<i class="fas fa-play"></i> <span>Assistir</span>';
        btnPlayFilme.style.pointerEvents = 'auto';
        btnPlayFilme.style.display = 'flex';
        btnPlayFilme.onclick = () => abrirMenuServidoresDetalhes();
    }
    document.getElementById('dpTitle').innerText = 'Carregando...';
    document.getElementById('dpTmdbMeta').innerHTML = '';
    document.getElementById('dpDirector').innerText = '';
    document.getElementById('dpSynopsis').innerText = 'Aguarde...';
    document.getElementById('dpCastContainer').style.display = 'none';
    document.getElementById('dpEpisodes').style.display = 'none';
    document.getElementById('dpSimilarContainer').style.display = 'none';
    document.getElementById('btnTrailer').style.display = 'none';
    trailerKeyAtivo = null;
    document.getElementById('detailsPage').classList.add('active');
    addNoScroll();
    history.pushState({ view: 'details', modal: true }, null, "");
    try {
        const details = await getDetails(tmdbId, type);
        const title = details.title || details.name || 'Sem Título';
        const backdrop = details.backdrop_path ? `${TMDB_IMG}/original${details.backdrop_path}` : (details.poster_path ? `${TMDB_IMG}/w780${details.poster_path}` : 'https://via.placeholder.com/800x600/111/fff');
        const poster = details.poster_path ? `${TMDB_IMG}/w300${details.poster_path}` : 'https://via.placeholder.com/300x450/111/fff';
        document.getElementById('dpTitle').innerText = title;
        document.getElementById('dpPoster').style.backgroundImage = `url('${backdrop}')`;
        const ano = (details.release_date || details.first_air_date || "").substring(0,4);
        const nota = details.vote_average ? details.vote_average.toFixed(1) : "";
        const generos = details.genres ? details.genres.map(g=>g.name).slice(0,3).join(', ') : "";
        const duracao = details.runtime ? `${details.runtime} min` : (details.episode_run_time && details.episode_run_time[0] ? `${details.episode_run_time[0]} min/ep` : "");
        document.getElementById('dpTmdbMeta').innerHTML = `<i class="fas fa-star" style="color:gold;"></i> ${nota} &nbsp;&bull;&nbsp; ${ano} &nbsp;&bull;&nbsp; ${generos} ${duracao ? '&nbsp;&bull;&nbsp; '+duracao : ''}`;
        if(details.credits && details.credits.crew) {
            const dir = details.credits.crew.find(c => c.job === 'Director' || c.job === 'Creator');
            if(dir) document.getElementById('dpDirector').innerText = `Dirigido/Criado por ${dir.name}`;
        }
        document.getElementById('dpSynopsis').innerText = details.overview || "Sinopse indisponível.";
        if(details.videos && details.videos.results) {
            const trailer = details.videos.results.find(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'));
            if(trailer) { trailerKeyAtivo = trailer.key; document.getElementById('btnTrailer').style.display = 'flex'; }
        }
        if(details.credits && details.credits.cast && details.credits.cast.length > 0) {
            let htmlCast = '';
            details.credits.cast.slice(0, 15).forEach(ator => {
                const foto = ator.profile_path ? `${TMDB_IMG}/w200${ator.profile_path}` : 'https://via.placeholder.com/150x150/333/fff?text=Ator';
                htmlCast += `<div class="cast-item" onclick="abrirAtor(${ator.id})"><img src="${foto}" class="cast-img" loading="lazy"><div class="cast-name">${esc(ator.name)}</div><div class="cast-char">${esc(ator.character)}</div></div>`;
            });
            document.getElementById('dpCast').innerHTML = htmlCast;
            document.getElementById('dpCastContainer').style.display = 'block';
        }
        if(details.recommendations && details.recommendations.results && details.recommendations.results.length > 0) {
            let htmlSim = '';
            details.recommendations.results.slice(0, 10).forEach(rec => { htmlSim += renderCard(rec, rec.media_type || type); });
            document.getElementById('dpSimilar').innerHTML = htmlSim;
            document.getElementById('dpSimilarContainer').style.display = 'block';
        }
        if(type === 'tv' && details.seasons) {
            document.getElementById('dpEpisodes').style.display = 'block';
            // CORREÇÃO: botão Assistir FICA visível para séries também
            // Ele abre o menu de servidores com S01E01
            let htmlEps = '';
            const watchedList = getWatchedList();
            details.seasons.forEach(season => {
                if(season.season_number === 0) return;
                htmlEps += `<h3 class="season-title">${esc(season.name)}</h3><div class="ep-carousel">`;
                for(let ep = 1; ep <= (season.episode_count || 1); ep++) {
                    const epId = `${tmdbId}_s${season.season_number}_e${ep}`;
                    const isWatched = watchedList[epId] ? 'active' : '';
                    htmlEps += `<div class="ep-card" onclick="reproduzirEpisodioTMDB(${tmdbId}, ${season.season_number}, ${ep})"><div class="ep-watched-btn ${isWatched}" onclick="event.stopPropagation(); toggleEpWatchedTMDB(event, '${epId}', '${esc(title)} S${season.season_number}E${ep}', '${poster}')"><i class="fas fa-check"></i></div><div class="ep-thumb" style="background-image:url('${season.poster_path ? TMDB_IMG+'/w300'+season.poster_path : poster}');"><i class="fas fa-play-circle"></i></div><div class="ep-info-text"><div class="ep-number">S${String(season.season_number).padStart(2,'0')}E${String(ep).padStart(2,'0')}</div><div class="ep-name">Episódio ${ep}</div></div></div>`;
                }
                htmlEps += `</div>`;
            });
            document.getElementById('dpEpisodes').innerHTML = htmlEps;
        }
        const btnWatched = document.getElementById('btnWatched');
        const list = getWatchedList();
        if(list[tmdbId]) btnWatched.classList.add('active'); else btnWatched.classList.remove('active');
        const btnFav = document.getElementById('btnFav');
        if(btnFav) {
            const listFav = getFavList();
            if(listFav[tmdbId]) btnFav.classList.add('active'); else btnFav.classList.remove('active');
        }
        currentStreamData = { id: tmdbId, title: title, img: poster, type: type };
    } catch(err) { document.getElementById('dpSynopsis').innerText = "Erro ao carregar detalhes."; }
}

// ===================== DETALHES SUPERFLIX (NOVO) =====================
function abrirDetalhesSuperFlix(titulo, capa, tipo, itemJson) {
    currentTmdbId = null;
    currentItemType = tipo === 'animes' ? 'tv' : 'movie';
    currentSeason = 1;
    currentEpisode = 1;
    currentSuperFlixItem = JSON.parse(itemJson.replace(/\\'/g, "'"));

    const btnPlayFilme = document.getElementById('btnPlayFilme');
    if(btnPlayFilme) {
        btnPlayFilme.disabled = false;
        btnPlayFilme.innerHTML = '<i class="fas fa-play"></i> <span>Assistir no SuperFlix</span>';
        btnPlayFilme.style.pointerEvents = 'auto';
        btnPlayFilme.style.display = 'flex';
        btnPlayFilme.onclick = () => {
            const id = currentSuperFlixItem.tmdb_id || currentSuperFlixItem.id;
            if(id) {
                window.open(`https://superflixapi.fit/${tipo === 'animes' ? 'serie' : 'filme'}/${id}`, '_blank');
            } else {
                mostrarToast("ID não encontrado.");
            }
        };
    }

    document.getElementById('dpTitle').innerText = titulo;
    document.getElementById('dpPoster').style.backgroundImage = `url('${capa}')`;
    document.getElementById('dpTmdbMeta').innerHTML = `<span style="color:var(--accent);"><i class="fas fa-tv"></i> ${tipo === 'animes' ? 'Anime' : 'Dorama'}</span>`;
    document.getElementById('dpDirector').innerText = '';
    document.getElementById('dpSynopsis').innerText = currentSuperFlixItem.overview || currentSuperFlixItem.sinopse || currentSuperFlixItem.description || "Sinopse não disponível.";
    document.getElementById('dpCastContainer').style.display = 'none';
    document.getElementById('dpEpisodes').style.display = 'none';
    document.getElementById('dpSimilarContainer').style.display = 'none';
    document.getElementById('btnTrailer').style.display = 'none';
    trailerKeyAtivo = null;

    currentStreamData = { id: currentSuperFlixItem.id || Date.now(), title: titulo, img: capa, type: currentItemType };

    document.getElementById('detailsPage').classList.add('active');
    addNoScroll();
    history.pushState({ view: 'details', modal: true }, null, "");
}

// ===================== ATOR =====================
async function abrirAtor(atorId) {
    const modal = document.getElementById('actorModal');
    document.getElementById('actorName').innerText = "Carregando...";
    document.getElementById('actorBio').innerText = "";
    document.getElementById('actorCredits').innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    modal.classList.add('active');
    addNoScroll();
    history.pushState({ view: 'actor', modal: true }, null, "");
    try {
        const pRes = await fetch(`https://api.themoviedb.org/3/person/${atorId}?api_key=${TMDB_API_KEY}&language=pt-BR`);
        const pData = await pRes.json();
        document.getElementById('actorName').innerText = pData.name;
        document.getElementById('actorImg').src = pData.profile_path ? `${TMDB_IMG}/w300${pData.profile_path}` : 'https://via.placeholder.com/150';
        let idade = "";
        if(pData.birthday) {
            const nasc = new Date(pData.birthday);
            const ageDifMs = Date.now() - nasc.getTime();
            const ageDate = new Date(ageDifMs);
            idade = ` • ${Math.abs(ageDate.getUTCFullYear() - 1970)} anos`;
        }
        document.getElementById('actorMeta').innerText = pData.birthday ? `${pData.birthday}${idade}` : "";
        document.getElementById('actorPlace').innerText = pData.place_of_birth || "";
        document.getElementById('actorBio').innerText = pData.biography || "Biografia indisponível.";
        const cRes = await fetch(`https://api.themoviedb.org/3/person/${atorId}/combined_credits?api_key=${TMDB_API_KEY}&language=pt-BR`);
        const cData = await cRes.json();
        if(cData.cast && cData.cast.length > 0) {
            const obras = cData.cast.sort((a,b) => b.popularity - a.popularity).slice(0, 20);
            document.getElementById('actorCredits').innerHTML = renderGrid(obras, 'movie');
        } else { document.getElementById('actorCredits').innerHTML = "Nenhuma obra encontrada."; }
    } catch(e) { document.getElementById('actorBio').innerText = "Erro ao carregar dados."; }
}

// ===================== AÇÕES (WATCHED / FAV) =====================
function toggleWatchedGlobal() {
    if(!currentStreamData.id) return;
    const list = getWatchedList();
    const btn = document.getElementById('btnWatched');
    if(list[currentStreamData.id]) {
        delete list[currentStreamData.id];
        btn.classList.remove('active');
    } else {
        list[currentStreamData.id] = currentStreamData;
        btn.classList.add('active');
    }
    saveWatchedList(list);
    if(document.getElementById('view-historico').classList.contains('active')) carregarHistorico();
}

function toggleFavGlobal() {
    if(!currentStreamData.id) return;
    const list = getFavList();
    const btn = document.getElementById('btnFav');
    if(list[currentStreamData.id]) {
        delete list[currentStreamData.id];
        btn.classList.remove('active');
        mostrarToast("Removido.");
    } else {
        list[currentStreamData.id] = currentStreamData;
        btn.classList.add('active');
        mostrarToast("Adicionado!");
    }
    saveFavList(list);
    if(document.getElementById('view-historico').classList.contains('active')) carregarHistorico();
}
