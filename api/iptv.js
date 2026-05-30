// api/iptv.js

export default async function handler(req, res) {
    // 1. Libera o CORS para que qualquer navegador (inclusive o Chrome) possa ler os dados
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Content-Type', 'application/json');

    // 2. Pega os parâmetros enviados pelo seu HTML (ex: action=get_live_streams)
    const { action } = req.query;

    // 3. Credenciais protegidas no servidor (Ninguém do lado de fora consegue ver)
    const baseUrl = "http://bnewsc.top";
    const username = "reginaldobr";
    const password = "432334xc";

    // 4. Monta a URL final para a API do Xtream Codes
    let targetUrl = `${baseUrl}/player_api.php?username=${username}&password=${password}`;
    if (action) {
        targetUrl += `&action=${action}`;
    }

    try {
        // 5. Faz a requisição ao servidor IPTV
        const response = await fetch(targetUrl);
        if (!response.ok) {
            return res.status(response.status).json({ error: "Erro na resposta do servidor IPTV" });
        }

        // 6. Entrega os dados limpos em JSON para o seu aplicativo
        const data = await response.json();
        return res.status(200).json(data);

    } catch (error) {
        return res.status(500).json({ error: "Falha ao conectar ao servidor IPTV: " + error.message });
    }
}
