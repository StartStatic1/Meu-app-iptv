// api/tv.js - Proxy SuperFlixAPI para canais ao vivo
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Content-Type', 'application/json');

    const { action, genre, q, limit } = req.query;
    const SF_BASE = 'https://superflixapi.fit';

    let url = '';

    if (action === 'categories') {
        url = `${SF_BASE}/lista?category=channel_categories&format=json`;
    } else if (action === 'search' && q) {
        url = `${SF_BASE}/lista?category=canais&q=${encodeURIComponent(q)}&format=json`;
    } else if (action === 'by_genre' && genre) {
        url = `${SF_BASE}/lista?category=canais&genre=${encodeURIComponent(genre)}&format=json`;
    } else {
        // action === 'all' ou default
        const lim = limit ? `&limit=${limit}` : '';
        url = `${SF_BASE}/lista?category=canais&format=json${lim}`;
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36',
                'Accept': 'application/json'
            }
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            return res.status(502).json({ error: `SuperFlixAPI retornou ${response.status}` });
        }

        const data = await response.json();
        return res.status(200).json(data);
    } catch (e) {
        return res.status(500).json({ error: e.message || 'Erro ao buscar canais' });
    }
}
