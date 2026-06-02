// ===================== SERIES / EPISODIOS =====================
function reproduzirEpisodioTMDB(tmdbId, season, episode) {
    currentSeason = season;
    currentEpisode = episode;
    abrirMenuServidoresDetalhes();
}

function toggleEpWatchedTMDB(event, epId, title, thumb) {
    event.stopPropagation();
    const list = getWatchedList();
    const el = event.currentTarget;
    if(list[epId]) {
        delete list[epId];
        el.classList.remove('active');
    } else {
        list[epId] = { id: epId, title: title, img: thumb, type: 'episode', ext: 'mp4' };
        el.classList.add('active');
    }
    saveWatchedList(list);
}
