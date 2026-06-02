// ===================== APP INIT / HOME =====================
async function initApp() {
    await verificarStatusVip();
    injetarAnuncios();
    renderGenreChips();

    try {
        const [trendingM, trendingS, upcoming] = await Promise.all([
            getTrending('movie', 1),
            getTrending('tv', 1),
            getUpcoming(1)
        ]);
        const filmes = trendingM.results ? trendingM.results.slice(0, 10) : [];
        const series = trendingS.results ? trendingS.results.slice(0, 10) : [];
        const lancamentos = upcoming.results ? upcoming.results.slice(0, 10) : [];
        heroItems = await Promise.all(filmes.slice(0, 5).map(f => getDetails(f.id, 'movie')));

        const loadingState = document.getElementById('loading-state');
        if(loadingState) loadingState.style.display = 'none';
        const conteudoReal = document.getElementById('conteudo-real');
        if(conteudoReal) conteudoReal.style.display = 'block';

        if(heroItems.length > 0) iniciarHeroSlider();
        let html = '';
        if(filmes.length > 5) html += renderCarousel('Filmes em Alta', filmes.slice(5), 'movie');
        if(series.length > 0) html += renderCarousel('Séries em Alta', series, 'tv');
        if(lancamentos.length > 0) html += renderCarousel('Lançamentos', lancamentos, 'movie');

        const generosDestaque = [
            {id:28,name:'Ação',type:'movie'},
            {id:27,name:'Terror',type:'movie'},
            {id:35,name:'Comédia',type:'movie'},
            {id:878,name:'Ficção Científica',type:'movie'}
        ];
        for(let g of generosDestaque) {
            const d = await getDiscover(g.type, g.id, 1);
            if(d.results && d.results.length > 0) html += renderCarousel(g.name, d.results.slice(0, 10), g.type);
        }
        const conteudoDinamico = document.getElementById('conteudo-dinamico');
        if(conteudoDinamico) conteudoDinamico.innerHTML = html;
    } catch(e) {
        const loadingState = document.getElementById('loading-state');
        if(loadingState) loadingState.innerHTML = "<div class='loading-text'>Erro de conexão. Tente novamente.</div>";
    }
}
