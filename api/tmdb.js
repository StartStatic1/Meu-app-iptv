// api/tmdb.js — Proxy TMDB server-side (key nunca exposta no browser)
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Content-Type', 'application/json');

    const API_KEY = process.env.TMDB_API_KEY;

    if (!API_KEY) {
        return res.status(500).json({ error: 'TMDB_API_KEY não configurada nas env vars do Vercel.' });
    }

    // Pega o endpoint do query param: /api/tmdb?endpoint=/trending/movie/week&language=pt-BR&page=1
    const { endpoint, ...rest } = req.query;

    if (!endpoint) {
        return res.status(400).json({ error: 'Parâmetro endpoint obrigatório.' });
    }

    // Monta os query params extras (language, page, etc)
    const params = new URLSearchParams({ ...rest, api_key: API_KEY });
    const url = `https://api.themoviedb.org/3${endpoint}?${params.toString()}`;

    try {
        const tmdbRes = await fetch(url, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'StreamFlix/1.0'
            }
        });

        const data = await tmdbRes.json();
        return res.status(tmdbRes.status).json(data);
    } catch (e) {
        return res.status(500).json({ results: [], error: e.message });
    }
}
