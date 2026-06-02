// api/iptv.js - MOTOR 7.1 (SISTEMA DE FALLBACK CORRIGIDO)
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Content-Type', 'application/json');

    const { action, category_id, stream_id, series_id, extension } = req.query;

    const servidores = [
        { url: "http://kavru.com:80", user: "558396043519", pass: "64537505" },
        { url: "http://rnplay07.vip:80", user: "941394441", pass: "903228872" },
        { url: "http://bnewsc.top:80", user: "reginaldobr", pass: "432334xc" }
    ];

    // CORREÇÃO: Fallback entre servidores para URLs de stream
    if (action === "get_movie_url" && stream_id) {
        const ext = extension || "mp4";
        for (let svr of servidores) {
            const url = `${svr.url}/movie/${svr.user}/${svr.pass}/${stream_id}.${ext}`;
            try {
                const check = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
                if (check.ok || check.status === 405) { // 405 = HEAD não permitido, mas servidor existe
                    return res.status(200).json({ url: url });
                }
            } catch(e) {}
        }
        // Se nenhum responder, retorna o primeiro mesmo assim
        const svr = servidores[0];
        return res.status(200).json({ url: `${svr.url}/movie/${svr.user}/${svr.pass}/${stream_id}.${ext}` });
    }

    if (action === "get_live_url" && stream_id) {
        for (let svr of servidores) {
            const url = `${svr.url}/${svr.user}/${svr.pass}/${stream_id}.ts`;
            try {
                const check = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
                if (check.ok || check.status === 405) {
                    return res.status(200).json({ url: url });
                }
            } catch(e) {}
        }
        const svr = servidores[0];
        return res.status(200).json({ url: `${svr.url}/${svr.user}/${svr.pass}/${stream_id}.ts` });
    }

    if (action === "get_series_url" && stream_id) {
        const ext = extension || "mp4";
        for (let svr of servidores) {
            const url = `${svr.url}/series/${svr.user}/${svr.pass}/${stream_id}.${ext}`;
            try {
                const check = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
                if (check.ok || check.status === 405) {
                    return res.status(200).json({ url: url });
                }
            } catch(e) {}
        }
        const svr = servidores[0];
        return res.status(200).json({ url: `${svr.url}/series/${svr.user}/${svr.pass}/${stream_id}.${ext}` });
    }

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
                return res.status(200).json(data);
            } else {
                erroFinal = `Servidor ${i + 1} retornou Erro ${response.status}`;
                console.log(erroFinal);
            }
        } catch (error) {
            erroFinal = `Servidor ${i + 1} Offline ou Demorou muito.`;
            console.log(erroFinal);
        }
    }

    return res.status(500).json({ error: erroFinal });
}
