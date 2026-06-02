// ===================== CONFIGURAÇÕES GLOBAIS =====================
const TMDB_API_KEY = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI1YjBlMWRjM2E3YmY4ZGRkY2Y0ZjA5NjFiMTQ3YjEyOCIsInN1YiI6IjY1Y2I3ZGU2MTFjMDY2MDE4N2FmMGFhMiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.hcXnyR8i3jdll0S3DfBP2w_3jDfpd9DKl9fR0hHu6dE';
const TMDB_IMG = 'https://image.tmdb.org/t/p';

const TMDB_GENRES = {
    movie: [
        {id:28,name:'Ação'},{id:12,name:'Aventura'},{id:16,name:'Animação'},{id:35,name:'Comédia'},
        {id:80,name:'Crime'},{id:99,name:'Documentário'},{id:18,name:'Drama'},{id:10751,name:'Família'},
        {id:14,name:'Fantasia'},{id:36,name:'História'},{id:27,name:'Terror'},{id:10402,name:'Música'},
        {id:9648,name:'Mistério'},{id:10749,name:'Romance'},{id:878,name:'Ficção Científica'},{id:10770,name:'Cinema TV'},
        {id:53,name:'Thriller'},{id:10752,name:'Guerra'},{id:37,name:'Faroeste'}
    ],
    tv: [
        {id:10759,name:'Ação & Aventura'},{id:16,name:'Animação'},{id:35,name:'Comédia'},{id:80,name:'Crime'},
        {id:99,name:'Documentário'},{id:18,name:'Drama'},{id:10751,name:'Família'},{id:10762,name:'Infantil'},
        {id:9648,name:'Mistério'},{id:10763,name:'Notícias'},{id:10764,name:'Reality'},{id:10765,name:'Ficção Científica & Fantasia'},
        {id:10766,name:'Soap'},{id:10767,name:'Talk'},{id:10768,name:'Guerra & Política'},{id:37,name:'Faroeste'}
    ]
};
