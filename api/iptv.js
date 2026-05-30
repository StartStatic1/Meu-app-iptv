// api/iptv.js

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Content-Type', 'application/json');

    // Recebe o que o aplicativo quer fazer (ex: get_live_categories, get_live_streams) e o ID da pasta
    const { action, category_id } = req.query;

    // O seu novo host que funcionou perfeitamente
    const baseUrl = "http://bnewsc.top:80";
    const username = "reginaldobr";
    const password = "432334xc";

    // Usando a API JSON (player_api.php) para evitar o limite de 4.5MB da Vercel
    let targetUrl = `${baseUrl}/player_api.php?username=${username}&password=${password}`;

    // Adiciona as ações dinamicamente no link
    if (action) {
        targetUrl += `&action=${action}`;
    }
    if (category_id) {
        targetUrl += `&category_id=${category_id}`;
    }

    try {
        const response = await fetch(targetUrl);
        
        // Se a resposta não for OK, dispara erro
        if (!response.ok) {
            return res.status(response.status).json({ error: "Erro no servidor Xtream" });
        }

        const data = await response.json();
        return res.status(200).json(data);

    } catch (error) {
        return res.status(500).json({ error: "Falha na comunicação: " + error.message });
    }
}
