// api/iptv.js

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Content-Type', 'application/json');

    const { action, category_id, stream_id, extension } = req.query;

    const baseUrl = "http://bnewsc.top:80";
    const username = "reginaldobr";
    const password = "432334xc";

    // NOVIDADE: Rota para gerar link de FILMES
    if (action === "get_movie_url" && stream_id) {
        // Filmes geralmente vêm com extensão .mp4 ou .mkv. Se não vier, testamos mp4.
        const ext = extension || "mp4";
        const streamUrl = `${baseUrl}/movie/${username}/${password}/${stream_id}.${ext}`;
        return res.status(200).json({ url: streamUrl });
    }

    // Consulta padrão da API Xtream
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
