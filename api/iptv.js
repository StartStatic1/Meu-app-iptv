// api/iptv.js — MOTOR 8.1 (BASE64 + FALLBACK + CACHE LEVE)
// Servidores codificados em Base64 para ofuscação
const SERVIDORES_B64 = 'W3sidXJsIjogImh0dHA6Ly9rYXZydS5jb206ODAiLCAidXNlciI6ICI1NTgzOTYwNDM1MTkiLCAicGFzcyI6ICI2NDUzNzUwNSJ9LCB7InVybCI6ICJodHRwOi8vcm5wbGF5MDcudmlwOjgwIiwgInVzZXIiOiAiOTQxMzk0NDQxIiwgInBhc3MiOiAiOTAzMjI4ODcyIn0sIHsidXJsIjogImh0dHA6Ly9ibmV3c2MudG9wOjgwIiwgInVzZXIiOiAicmVnaW5hbGRvYnIiLCAicGFzcyI6ICI0MzIzMzR4YyJ9XQ==';

function decodeServidores() {
    try {
        const json = Buffer.from(SERVIDORES_B64, 'base64').toString('utf8');
        return JSON.parse(json);
    } catch (e) {
        return [];
    }
}

// Cache em memória (funciona bem no Vercel serverless para requests simultâneas)
const CACHE = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

function getCache(key) {
    const item = CACHE.get(key);
    if (!item) return null;
    if (Date.now() - item.ts > CACHE_TTL) {
        CACHE.delete(key);
        return null;
    }
    return item.data;
}

function setCache(key, data) {
    CACHE.set(key, { data, ts: Date.now() });
}

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { action, category_id, stream_id, series_id, extension } = req.query;

    // 1. DECODIFICAR SERVIDORES
    const servidores = decodeServidores();
    if (servidores.length === 0) {
        return res.status(500).json({ error: "Erro ao decodificar servidores." });
    }

    // 2. CACHE KEY
    const cacheKey = `${action}_${category_id}_${series_id}_${stream_id}`;
    const cached = getCache(cacheKey);
    if (cached) {
        return res.status(200).json(cached);
    }

    // 3. GERAR LINKS DE STREAM (RETORNA TODOS OS LINKS DE FALLBACK)
    const ext = extension || "mp4";

    if (action === "get_movie_url" && stream_id) {
        const urls = servidores.map(s => 
            `${s.url}/movie/${s.user}/${s.pass}/${stream_id}.${ext}`
        );
        const data = { url: urls[0], urls: urls };
        setCache(cacheKey, data);
        return res.status(200).json(data);
    }

    if (action === "get_live_url" && stream_id) {
        const urls = servidores.map(s => 
            `${s.url}/${s.user}/${s.pass}/${stream_id}.ts`
        );
        const data = { url: urls[0], urls: urls };
        setCache(cacheKey, data);
        return res.status(200).json(data);
    }

    if (action === "get_series_url" && stream_id) {
        const urls = servidores.map(s => 
            `${s.url}/series/${s.user}/${s.pass}/${stream_id}.${ext}`
        );
        const data = { url: urls[0], urls: urls };
        setCache(cacheKey, data);
        return res.status(200).json(data);
    }

    // 4. BUSCAR DADOS COM FALLBACK (SEM ABORTCONTROLLER - DEIXA O VERCEL GERENCIAR)
    let erroFinal = "Todos os servidores falharam.";

    for (let i = 0; i < servidores.length; i++) {
        const svr = servidores[i];
        let targetUrl = `${svr.url}/player_api.php?username=${svr.user}&password=${svr.pass}`;
        if (action) targetUrl += `&action=${action}`;
        if (category_id) targetUrl += `&category_id=${category_id}`;
        if (series_id) targetUrl += `&series_id=${series_id}`;

        try {
            // REMOVIDO: AbortController com 6s que matava a request
            // O Vercel já tem timeout próprio (10s hobby, 60s+ pro)
            const response = await fetch(targetUrl);

            if (response.ok) {
                const data = await response.json();
                setCache(cacheKey, data);
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
