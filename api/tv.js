// api/tv.js - Proxy BetterFlix para canais ao vivo
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Content-Type', 'application/json');

    const { action, genre, q, id } = req.query;
    const BF_BASE = 'https://betterflix.click/api';

    let url = '';

    if (action === 'categories') {
        // BetterFlix: pega canais e extrai categorias únicas
        url = `${BF_BASE}/canais.json`;
    } else if (action === 'all') {
        url = `${BF_BASE}/canais.json`;
    } else if (action === 'search' && q) {
        url = `${BF_BASE}/canais.json`;
    } else if (action === 'by_genre' && genre) {
        url = `${BF_BASE}/canais.json`;
    } else {
        url = `${BF_BASE}/canais.json`;
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
            return res.status(502).json({ error: `BetterFlix retornou ${response.status}` });
        }

        let data = await response.json();
        // data = [{ id, nome, imagem, categoria }, ...]
        const canais = Array.isArray(data) ? data : (data.channels || data.data || []);

        if (action === 'categories') {
            // Extrai categorias únicas
            const cats = [...new Set(canais.map(c => c.categoria || c.category || '').filter(Boolean))];
            return res.status(200).json(cats.map(c => ({ id: c, name: c })));
        }

        if (action === 'search' && q) {
            const ql = q.toLowerCase();
            const filtrados = canais.filter(c => (c.nome || c.name || '').toLowerCase().includes(ql));
            return res.status(200).json(filtrados);
        }

        if (action === 'by_genre' && genre) {
            const gl = genre.toLowerCase();
            const filtrados = canais.filter(c => (c.categoria || c.category || '').toLowerCase().includes(gl));
            return res.status(200).json(filtrados);
        }

        return res.status(200).json(canais);
    } catch (e) {
        return res.status(500).json({ error: e.message || 'Erro ao buscar canais' });
    }
}
