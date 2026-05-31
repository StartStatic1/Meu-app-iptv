// api/iptv.js — MOTOR 8.0 (BLINDADO + CACHE + FALLBACK STREAMS)
module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Content-Type', 'application/json');

    const { action, category_id, stream_id, series_id, extension } = req.query;

    // 1. SERVIDORES VIA ENV (configure no painel da Vercel)
    const servidores = [
        { url: process.env.IPTV_S1_URL, user: process.env.IPTV_S1_USER, pass: process.env.IPTV_S1_PASS },
        { url: process.env.IPTV_S2_URL, user: process.env.IPTV_S2_USER, pass: process.env.IPTV_S2_PASS },
        { url: process.env.IPTV_S3_URL, user: process.env.IPTV_S3_USER, pass: process.env.IPTV_S3_PASS }
    ].filter(s => s.url && s.user && s.pass);

    if (servidores.length === 0) {
        return res.status(500).json({ error: "Nenhum servidor IPTV configurado nas ENV vars." });
    }

    // 2. CACHE SIMPLES (TTL 5 minutos para listas)
    const CACHE_TTL = 5 * 60 * 1000;
    if (!global.cacheIptv) global.cacheIptv = new Map();
    const cacheKey = `${action}_${category_id}_${series_id}_${stream_id}`;
    const cached = global.cacheIptv.get(cacheKey);
    if (cached && (Date.now() - cached.ts < CACHE_TTL)) {
        return res.status(200).json(cached.data);
    }

    // 3. GERAR LINKS DE STREAM COM FALLBACK (retorna url + urls[])
    const ext = extension || "mp4";
    const buildStreamUrls = (pathTemplate) => {
        return servidores.map(s => {
            return pathTemplate
                .replace('{URL}', s.url)
                .replace('{USER}', s.user)
                .replace('{PASS}', s.pass)
                .replace('{ID}', stream_id)
                .replace('{EXT}', ext);
        });
    };

    if (action === "get_movie_url" && stream_id) {
        const urls = buildStreamUrls('{URL}/movie/{USER}/{PASS}/{ID}.{EXT}');
        const data = { url: urls[0], urls: urls };
        global.cacheIptv.set(cacheKey, { data, ts: Date.now() });
        return res.status(200).json(data);
    }
    if (action === "get_live_url" && stream_id) {
        const urls = buildStreamUrls('{URL}/{USER}/{PASS}/{ID}.ts');
        const data = { url: urls[0], urls: urls };
        global.cacheIptv.set(cacheKey, { data, ts: Date.now() });
        return res.status(200).json(data);
    }
    if (action === "get_series_url" && stream_id) {
        const urls = buildStreamUrls('{URL}/series/{USER}/{PASS}/{ID}.{EXT}');
        const data = { url: urls[0], urls: urls };
        global.cacheIptv.set(cacheKey, { data, ts: Date.now() });
        return res.status(200).json(data);
    }

    // 4. BUSCAR DADOS COM FALLBACK (listas, categorias, info)
    let erroFinal = "Todos os servidores falharam.";

    for (let i = 0; i < servidores.length; i++) {
        const svr = servidores[i];
        let targetUrl = `${svr.url}/player_api.php?username=${svr.user}&password=${svr.pass}`;
        if (action) targetUrl += `&action=${action}`;
        if (category_id) targetUrl += `&category_id=${category_id}`;
        if (series_id) targetUrl += `&series_id=${series_id}`;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000);
            const response = await fetch(targetUrl, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                global.cacheIptv.set(cacheKey, { data, ts: Date.now() });
                return res.status(200).json(data);
            } else {
                erroFinal = `Servidor ${i+1} erro ${response.status}`;
            }
        } catch (e) {
            erroFinal = `Servidor ${i+1} offline`;
        }
    }

    return res.status(500).json({ error: erroFinal });
};
