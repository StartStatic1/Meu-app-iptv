// ===================== ADS =====================
function desativarTodosAds() {
    const scripts = document.querySelectorAll('script');
    scripts.forEach(s => {
        const src = s.src || '';
        if(src.includes('5gvci.com') || src.includes('al5sm.com') || src.includes('tag.min.js') || src.includes('omg10.com')) {
            s.remove();
        }
    });
    document.querySelectorAll('iframe').forEach(f => {
        if(f.src && (f.src.includes('5gvci') || f.src.includes('al5sm') || f.src.includes('omg10'))) {
            f.remove();
        }
    });
    adsInjetados = false;
    localStorage.setItem('streamflix_vip', 'true');
    localStorage.setItem('push_accepted', 'false');
    const pushPrompt = document.getElementById('pushPromptModal');
    if(pushPrompt) pushPrompt.style.display = 'none';
    mostrarToast("VIP Ativado! Anuncios removidos.");
    setTimeout(() => location.reload(), 1500);
}

function injetarAnuncios() {
    if(isVip()) return;
    if(adsInjetados) return;
    ativarTodosAds();
    if(localStorage.getItem('push_accepted') !== 'true') {
        setTimeout(() => {
            const prompt = document.getElementById('pushPromptModal');
            if(prompt) prompt.style.display = 'block';
        }, 2500);
    }
}

function aceitarPush() {
    document.getElementById('pushPromptModal').style.display = 'none';
    localStorage.setItem('push_accepted', 'true');
    mostrarToast("Notificacoes ativadas!");
}

function ativarTodosAds() {
    if(isVip() || adsInjetados) return;
    adsInjetados = true;
    const s1 = document.createElement('script');
    s1.src = 'https://5gvci.com/act/files/tag.min.js?z=11081861';
    s1.setAttribute('data-cfasync', 'false');
    s1.async = true;
    document.head.appendChild(s1);
    const s2 = document.createElement('script');
    s2.src = 'https://5gvci.com/act/files/tag.min.js?z=11081853';
    s2.setAttribute('data-cfasync', 'false');
    s2.async = true;
    document.head.appendChild(s2);
    const s3 = document.createElement('script');
    s3.dataset.zone = '11081852';
    s3.src = 'https://al5sm.com/tag.min.js';
    s3.async = true;
    document.head.appendChild(s3);
}

function dispararDirectLink() {
    if(isVip()) return;
    let a = document.createElement('a');
    a.href = 'https://omg10.com/4/11081875';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}
