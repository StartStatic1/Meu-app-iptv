// ===================== HERO SLIDER =====================
function iniciarHeroSlider() {
    atualizarHero();
    if(heroInterval) clearInterval(heroInterval);
    heroInterval = setInterval(() => { heroIndex = (heroIndex + 1) % heroItems.length; atualizarHero(); }, 5000);
}

function atualizarHero() {
    const f = heroItems[heroIndex]; if(!f) return;
    const title = f.title || f.name || 'Carregando...';
    const backdrop = f.backdrop_path ? `${TMDB_IMG}/w1280${f.backdrop_path}` : (f.poster_path ? `${TMDB_IMG}/w780${f.poster_path}` : '');
    const tags = [];
    if(f.vote_average) tags.push(`<i class="fas fa-star" style="color:gold;"></i> ${f.vote_average.toFixed(1)}`);
    if(f.release_date) tags.push(f.release_date.substring(0,4)); else if(f.first_air_date) tags.push(f.first_air_date.substring(0,4));
    if(f.media_type === 'tv' || f.first_air_date) tags.push('SÉRIE'); else tags.push('FILME');
    document.getElementById('heroBanner').style.backgroundImage = `url('${backdrop}')`;
    document.getElementById('heroTitle').innerText = title;
    document.getElementById('heroTags').innerHTML = tags.join(' <span style="color:#555;">|</span> ');
    const synopsisEl = document.getElementById('heroSynopsis');
    if(synopsisEl) synopsisEl.innerText = f.overview ? f.overview : "Sinopse não disponível.";
}

function abrirHeroDetalhes() {
    const f = heroItems[heroIndex]; if(!f) return;
    abrirDetalhesTMDB(f.id, f.first_air_date ? 'tv' : 'movie');
}

async function abrirHeroTrailer() {
    const f = heroItems[heroIndex]; if(!f) return;
    const btn = document.getElementById('heroTrailerBtn');
    const txtOriginal = btn.innerHTML; btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;
    try {
        if(f.videos && f.videos.results) {
            const trailer = f.videos.results.find(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'));
            if(trailer) { trailerKeyAtivo = trailer.key; abrirTrailer(); }
            else { mostrarToast("Trailer não encontrado."); }
        } else { mostrarToast("Trailer não encontrado."); }
    } catch(e) { mostrarToast("Erro ao buscar trailer."); }
    finally { btn.innerHTML = txtOriginal; }
}
