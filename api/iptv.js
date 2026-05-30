// api/iptv.js

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Content-Type', 'application/json');

    const { action, category_id, stream_id } = req.query;

    const baseUrl = "http://bnewsc.top:80";
    const username = "reginaldobr";
    const password = "432334xc";

    // NOVIDADE: Rota secreta para gerar o link do vídeo sem expor senha no HTML
    if (action === "get_stream_url" && stream_id) {
        // Formato padrão do Xtream Codes para canais ao vivo (geralmente .m3u8 ou .ts)
        const streamUrl = `${baseUrl}/live/${username}/${password}/${stream_id}.m3u8`;
        return res.status(200).json({ url: streamUrl });
    }

    // Código original para carregar categorias e listas
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
