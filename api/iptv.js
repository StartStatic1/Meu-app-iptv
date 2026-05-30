// api/iptv.js

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Content-Type', 'application/json');

    const { action, category_id, stream_id, extension } = req.query;

    const baseUrl = "http://kavru.com:80";
    const username = "558396043519";
    const password = "64537505";

    // GERA LINK DE FILME
    if (action === "get_movie_url" && stream_id) {
        const ext = extension || "mp4";
        const streamUrl = `${baseUrl}/movie/${username}/${password}/${stream_id}.${ext}`;
        return res.status(200).json({ url: streamUrl });
    }

    // GERA LINK DE TV AO VIVO (Novo)
    if (action === "get_live_url" && stream_id) {
        const streamUrl = `${baseUrl}/${username}/${password}/${stream_id}.ts`;
        return res.status(200).json({ url: streamUrl });
    }

    let targetUrl = `${baseUrl}/player_api.php?username=${username}&password=${password}`;

    if (action) {
        targetUrl += `&action=${action}`;
    }
    if (category_id) {
        targetUrl += `&category_id=${category_id}`;
    }

    try {
        const response = await fetch(targetUrl);
        if (!response.ok) {
            return res.status(response.status).json({ error: "Erro no servidor Xtream" });
        }
        const data = await response.json();
        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ error: "Falha na comunicação: " + error.message });
    }
}
