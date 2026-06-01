// ===================== CONFIGURACOES =====================
const TMDB_API_KEY = '46230929e061f1d2f3df518aed983e08';
const TMDB_API_KEY_FALLBACK = '072730d77b46330bda51e5fcaac85d75';
const TMDB_IMG = 'https://image.tmdb.org/t/p';
const WATCHMODE_API_KEY = 'gwOmzXcaSHNcNTFVo6pDCEogdkkwgSyumajryJV8';

const TMDB_GENRES = {
    movie: [
        {id:28,name:'Ação'},{id:12,name:'Aventura'},{id:16,name:'Animação'},{id:35,name:'Comédia'},
        {id:80,name:'Crime'},{id:99,name:'Documentário'},{id:18,name:'Drama'},{id:10751,name:'Família'},
        {id:14,name:'Fantasia'},{id:36,name:'História'},{id:27,name:'Terror'},{id:10402,name:'Música'},
        {id:9648,name:'Mistério'},{id:10749,name:'Romance'},{id:878,name:'Ficção Científica'},
        {id:10770,name:'Cinema TV'},{id:53,name:'Thriller'},{id:10752,name:'Guerra'},{id:37,name:'Faroeste'}
    ],
    tv: [
        {id:10759,name:'Ação & Aventura'},{id:16,name:'Animação'},{id:35,name:'Comédia'},{id:80,name:'Crime'},
        {id:99,name:'Documentário'},{id:18,name:'Drama'},{id:10751,name:'Família'},{id:10762,name:'Infantil'},
        {id:9648,name:'Mistério'},{id:10763,name:'Notícias'},{id:10764,name:'Reality'},{id:10765,name:'Sci-Fi & Fantasia'},
        {id:10766,name:'Novela'},{id:10767,name:'Talk Show'},{id:10768,name:'Guerra & Política'},{id:37,name:'Faroeste'}
    ]
};

// ===================== EMBEDS CONFIG =====================
const EMBED_CONFIG = {
    betterflix: {
        movie: (id) => `https://betterflix.click/api/player?id=${id}&type=movie`,
        tv: (id, s, e) => `https://betterflix.click/api/player?id=${id}&type=tv&season=${s}&episode=${e}`,
        channel: (id) => `https://betterflix.click/api/player?id=${id}&type=channel`,
        name: 'BetterFlix'
    },
    embedmovies: {
        movie: (id) => `https://myembed.biz/filme/${id}`,
        tv: (id, s, e) => `https://myembed.biz/serie/${id}/${s}/${e}`,
        name: 'EmbedMovies'
    },
    embedplayapi: {
        movie: (id) => `https://embedplayapi.top/embed/${id}`,
        tv: (id, s, e) => `https://embedplayapi.top/embed/${id}/${s}/${e}`,
        name: 'EmbedPlay'
    },
    megaembed: {
        movie: (id) => `https://megaembedapi.site/embed/${id}`,
        tv: (id, s, e) => `https://megaembedapi.site/embed/${id}/${s}/${e}`,
        name: 'MegaEmbed'
    }
};

// ===================== ANIME GENRES (Jikan) =====================
const ANIME_GENRES = [
    {id:1,name:'Ação'},{id:2,name:'Aventura'},{id:4,name:'Comédia'},{id:8,name:'Drama'},
    {id:10,name:'Fantasia'},{id:14,name:'Horror'},{id:22,name:'Romance'},{id:24,name:'Sci-Fi'},
    {id:27,name:'Shounen'},{id:42,name:'Seinen'},{id:25,name:'Shoujo'},{id:36,name:'Slice of Life'}
];

// ===================== DORAMA COUNTRIES =====================
const DORAMA_COUNTRIES = [
    {code:'KR',name:'K-Drama'},{code:'JP',name:'J-Drama'},
    {code:'CN',name:'C-Drama'},{code:'TW',name:'TW-Drama'}
];
