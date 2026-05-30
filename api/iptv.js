export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Content-Type', 'application/json');

    // A MÁGICA 1: Adicionei o 'series_id' aqui para o servidor saber qual série abrir
    const { action, category_id, stream_id, series_id, extension } = req.query;

    const baseUrl = "http://kavru.com:80";
    const username = "558396043519";
    const password = "64537505";

    // LINK FILMES
    if (action === "get_movie_url" && stream_id) {
        const ext = extension || "mp4";
        const streamUrl = `${baseUrl}/movie/${username}/${password}/${stream_id}.${ext}`;
        return res.status(200).json({ url: streamUrl });
    }

    // LINK TV
    if (action === "get_live_url" && stream_id) {
        const streamUrl = `${baseUrl}/${username}/${password}/${stream_id}.ts`;
        return res.status(200).json({ url: streamUrl });
    }

    // LINK EPISÓDIOS DE SÉRIES (A MÁGICA 2)
    if (action === "get_series_url" && stream_id) {
        const ext = extension || "mp4";
        const streamUrl = `${baseUrl}/series/${username}/${password}/${stream_id}.${ext}`;
        return res.status(200).json({ url: streamUrl });
    }

    let targetUrl = `${baseUrl}/player_api.php?username=${username}&password=${password}`;

    if (action) targetUrl += `&action=${action}`;
    if (category_id) targetUrl += `&category_id=${category_id}`;
    if (series_id) targetUrl += `&series_id=${series_id}`; // Repassa a série para o Kavru

    try {
        const response = await fetch(targetUrl);
        if (!response.ok) return res.status(response.status).json({ error: "Erro no Xtream" });
        return res.status(200).json(await response.json());
    } catch (error) {
        return res.status(500).json({ error: "Falha: " + error.message });
    }
}
