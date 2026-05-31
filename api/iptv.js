// api/iptv.js - MOTOR 7.0 (SISTEMA DE FALLBACK)
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Content-Type', 'application/json');

    const { action, category_id, stream_id, series_id, extension } = req.query;

    // A ARMA SECRETA: LISTA DE SERVIDORES
    // O sistema tentará o Principal. Se falhar, tenta o Backup 1, depois o Backup 2.
    const servidores = [
        { url: "http://kavru.com:80", user: "558396043519", pass: "64537505" },   // Principal
        { url: "http://rnplay07.vip:80", user: "941394441", pass: "903228872" },   // Backup 1
        { url: "http://bnewsc.top:80", user: "reginaldobr", pass: "432334xc" }    // Backup 2
    ];

    // ==========================================
    // FUNÇÃO: GERAR LINKS DE REPRODUÇÃO DIRETOS
    // ==========================================
    if (action === "get_movie_url" && stream_id) {
        // Retorna o link do servidor Principal. 
        // (Nota: Links diretos de VOD não testam falha de conexão na API, o teste ocorre no próprio App nativo)
        const ext = extension || "mp4";
        const svr = servidores[0];
        return res.status(200).json({ url: `${svr.url}/movie/${svr.user}/${svr.pass}/${stream_id}.${ext}` });
    }

    if (action === "get_live_url" && stream_id) {
        const svr = servidores[0];
        return res.status(200).json({ url: `${svr.url}/${svr.user}/${svr.pass}/${stream_id}.ts` });
    }

    if (action === "get_series_url" && stream_id) {
        const ext = extension || "mp4";
        const svr = servidores[0];
        return res.status(200).json({ url: `${svr.url}/series/${svr.user}/${svr.pass}/${stream_id}.${ext}` });
    }

    // ==========================================
    // FUNÇÃO: BUSCAR DADOS (COM SISTEMA FALLBACK)
    // ==========================================
    let erroFinal = "Todos os servidores falharam.";

    // Loop Inteligente: Tenta um servidor de cada vez
    for (let i = 0; i < servidores.length; i++) {
        const svr = servidores[i];
        let targetUrl = `${svr.url}/player_api.php?username=${svr.user}&password=${svr.pass}`;

        if (action) targetUrl += `&action=${action}`;
        if (category_id) targetUrl += `&category_id=${category_id}`;
        if (series_id) targetUrl += `&series_id=${series_id}`;

        try {
            // Aborta a tentativa se o servidor demorar mais de 6 segundos (para não congelar o telemóvel)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000);

            const response = await fetch(targetUrl, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                // Se respondeu certinho, devolve para o telemóvel e PARA o loop. Sucesso!
                return res.status(200).json(data);
            } else {
                erroFinal = `Servidor ${i + 1} retornou Erro ${response.status}`;
                console.log(erroFinal); // Falhou, vai tentar o próximo...
            }
        } catch (error) {
            erroFinal = `Servidor ${i + 1} Offline ou Demorou muito.`;
            console.log(erroFinal); // Falhou, vai tentar o próximo...
        }
    }

    // Se o código chegou até aqui, significa que os 3 servidores (Kavru, rnplay07 e bnewsc) caíram ao mesmo tempo.
    return res.status(500).json({ error: erroFinal });
}

