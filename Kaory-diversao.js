
(() => {
    "use strict";

    const $ = selector => document.querySelector(selector);

    const fotos = [
        // { src: "/assets/Galeria/kaory-01.png", nome: "Kaory 💜" }
    ];

    const clipes = [
        // { titulo: "Clipe da Kaory", url: "https://www.twitch.tv/kaory_saito/clip/..." }
    ];

    const TWITCH = "https://www.twitch.tv/kaory_saito/clips?range=30d";

    const modal = $("#modalBackdrop");
    const modalTitle = $("#modalTitle");
    const modalContent = $("#modalContent");

    let partida = null;
    let audioContext = null;
    let sonsAtivos = true;

    const style = document.createElement("style");
    style.textContent = `
        .kw-btn {
            border: 1px solid rgba(185,137,220,.45);
            border-radius: 12px;
            padding: 11px 16px;
            background: #79519c;
            color: #fff;
            font: inherit;
            font-size: 13px;
            text-decoration: none;
            cursor: pointer;
            display: inline-block;
            transition: transform .2s, background .2s;
        }
        .kw-btn:hover {
            transform: translateY(-2px);
            background: #9365b7;
        }
        .kw-btn:disabled {
            opacity: .5;
            cursor: default;
        }
        .kw-input {
            width: 100%;
            box-sizing: border-box;
            padding: 13px;
            margin: 12px 0;
            border-radius: 12px;
            border: 1px solid #805c9c;
            background: #1b1226;
            color: #fff;
            font: inherit;
        }
        .kw-muted {
            color: #cdb4df;
            font-size: 13px;
            line-height: 1.7;
        }
        .kw-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 10px;
            margin: 14px 0;
        }
        .kw-box {
            border: 1px solid #654781;
            border-radius: 15px;
            background: #24172f;
            padding: 16px;
            margin: 12px 0;
        }
        .kw-arena {
            position: relative;
            height: 300px;
            border: 1px solid #8255a2;
            border-radius: 18px;
            overflow: hidden;
            background:
                radial-gradient(circle at 50% 35%, #493061, #160d23);
            touch-action: manipulation;
        }
        .kw-target {
            position: absolute;
            width: 58px;
            height: 58px;
            border: 0;
            border-radius: 50%;
            background: #65417f;
            font-size: 32px;
            cursor: pointer;
            animation: kw-appear .18s ease both;
        }
        .kw-target:active {
            transform: scale(.85);
        }
        .kw-ranking {
            display: grid;
            gap: 8px;
            margin: 12px 0;
        }
        .kw-rank {
            display: grid;
            grid-template-columns: 38px 1fr auto;
            gap: 10px;
            align-items: center;
            padding: 12px;
            border: 1px solid rgba(190,142,220,.12);
            border-radius: 12px;
            background: #30203e;
            color: #f4e9ff;
            font-size: 13px;
        }
        .kw-rank:first-child {
            border-color: rgba(255,220,100,.45);
        }
        .kw-gallery {
            display: grid;
            grid-template-columns: repeat(2,minmax(0,1fr));
            gap: 12px;
            margin-top: 16px;
        }
        .kw-photo {
            border: 1px solid #75518e;
            border-radius: 14px;
            overflow: hidden;
            background: #24172f;
            color: #fff;
            padding: 0;
            cursor: pointer;
        }
        .kw-photo img {
            display: block;
            width: 100%;
            aspect-ratio: 1;
            object-fit: cover;
        }
        .kw-photo span {
            display: block;
            padding: 10px;
        }
        .kw-lightbox {
            position: fixed;
            inset: 0;
            z-index: 30000;
            display: grid;
            place-items: center;
            background: rgba(5,3,10,.95);
            padding: 20px;
            cursor: zoom-out;
        }
        .kw-lightbox img {
            max-width: 95vw;
            max-height: 85vh;
            object-fit: contain;
        }
        @keyframes kw-appear {
            from { opacity: 0; transform: scale(.5); }
            to { opacity: 1; transform: scale(1); }
        }
    `;
    document.head.appendChild(style);

    function el(tag, className = "", text = null) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== null) node.textContent = text;
        return node;
    }

    function btn(text, callback) {
        const node = el("button", "kw-btn", text);
        node.type = "button";
        node.addEventListener("click", callback);
        return node;
    }

    function externalLink(text, url) {
        const node = el("a", "kw-btn", text);
        node.href = url;
        node.target = "_blank";
        node.rel = "noopener noreferrer";
        return node;
    }

    function stopGame() {
        if (!partida) return;

        clearInterval(partida.timer);
        partida.running = false;
        partida = null;
    }

    function openModal(title) {
        stopGame();

        modalTitle.textContent = title;
        modalContent.replaceChildren();
        modal.classList.add("open");
        modal.setAttribute("aria-hidden", "false");
    }

    function playTone(frequency, duration = .09, type = "sine") {
        if (!sonsAtivos) return;

        try {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) return;

            if (!audioContext) audioContext = new Ctx();

            if (audioContext.state === "suspended") {
                audioContext.resume().catch(() => {});
            }

            const now = audioContext.currentTime;
            const oscillator = audioContext.createOscillator();
            const gain = audioContext.createGain();

            oscillator.type = type;
            oscillator.frequency.setValueAtTime(frequency, now);

            gain.gain.setValueAtTime(.0001, now);
            gain.gain.exponentialRampToValueAtTime(.035, now + .008);
            gain.gain.exponentialRampToValueAtTime(
                .0001,
                now + duration
            );

            oscillator.connect(gain);
            gain.connect(audioContext.destination);

            oscillator.start(now);
            oscillator.stop(now + duration + .02);
        } catch (error) {
            console.warn("Som indisponível:", error);
        }
    }

    function startSound() {
        playTone(560, .1);
        setTimeout(() => playTone(740, .12), 110);
    }

    function captureSound(score) {
        playTone(440 + Math.min(score, 12) * 35, .07);

        if (score % 5 === 0) {
            setTimeout(() => playTone(880, .13), 80);
            setTimeout(() => playTone(1100, .15), 170);
        }
    }

    function finishSound() {
        playTone(680, .12);
        setTimeout(() => playTone(520, .14), 140);
        setTimeout(() => playTone(390, .22), 290);
    }

    function recordSound() {
        playTone(660, .12);
        setTimeout(() => playTone(880, .14), 130);
        setTimeout(() => playTone(1100, .2), 270);
    }

    async function api(path, options = {}) {
        const response = await fetch(path, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.erro || "Erro de conexão.");
        }

        return data;
    }

    async function loadRanking(container) {
        container.replaceChildren(
            el("p", "kw-muted", "Carregando ranking... 🥝")
        );

        try {
            const data = await api("/api/jogo/ranking");
            container.replaceChildren();

            if (!data.ranking.length) {
                container.appendChild(
                    el("p", "kw-muted", "Seja o primeiro kiwi do ranking!")
                );
                return;
            }

            data.ranking.forEach((player, index) => {
                const row = el("div", "kw-rank");
                const position =
                    ["🥇", "🥈", "🥉"][index] || `#${index + 1}`;

                row.append(
                    el("span", "", position),
                    el("strong", "", player.nick),
                    el("span", "", `${player.pontos} 🥝`)
                );

                container.appendChild(row);
            });
        } catch (error) {
            container.replaceChildren(
                el("p", "kw-muted", error.message)
            );
        }
    }

    function showGame() {
        openModal("Caça aos Kiwis 🥝");

        const intro = el(
            "p",
            "kw-muted",
            "Escolha seu nick e capture o máximo de kiwis em 30 segundos!"
        );

        const nick = el("input", "kw-input");
        nick.type = "text";
        nick.maxLength = 24;
        nick.placeholder = "Seu nick no ranking";
        nick.autocomplete = "nickname";

        try {
            nick.value = localStorage.getItem("kaoryGameNick") || "";
        } catch {}

        const stats = el("div", "kw-row");
        const points = el("strong", "", "🥝 0 pontos");
        const clock = el("strong", "", "⏱ 30s");
        stats.append(points, clock);

        const arena = el("div", "kw-arena");
        const message = el("p", "kw-muted", "Preparado para a caça?");

        const actions = el("div", "kw-row");
        const startButton = btn("Começar partida", begin);

        const soundButton = btn("🔊 Sons ligados", () => {
            sonsAtivos = !sonsAtivos;
            soundButton.textContent = sonsAtivos
                ? "🔊 Sons ligados"
                : "🔇 Sons desligados";
        });

        soundButton.textContent = sonsAtivos
            ? "🔊 Sons ligados"
            : "🔇 Sons desligados";

        actions.append(startButton, soundButton);

        const heading = el("h3", "", "🏆 Ranking global — Top 10");
        const ranking = el("div", "kw-ranking");

        contentAppend(
            intro, nick, stats, arena, message,
            actions, heading, ranking
        );

        loadRanking(ranking);

        function contentAppend(...nodes) {
            modalContent.append(...nodes);
        }

        function spawn() {
            if (!partida || !partida.running) return;

            arena.replaceChildren();

            const target = el("button", "kw-target", "🥝");
            target.type = "button";
            target.setAttribute("aria-label", "Capturar kiwi");

            const maxX = Math.max(0, arena.clientWidth - 58);
            const maxY = Math.max(0, arena.clientHeight - 58);

            target.style.left = `${Math.random() * maxX}px`;
            target.style.top = `${Math.random() * maxY}px`;

            target.addEventListener("click", () => {
                if (!partida || !partida.running) return;

                partida.score++;
                points.textContent = `🥝 ${partida.score} pontos`;

                captureSound(partida.score);
                spawn();
            });

            arena.appendChild(target);
        }

        async function finish() {
            if (!partida || !partida.running) return;

            const finished = partida;
            finished.running = false;

            clearInterval(finished.timer);
            arena.replaceChildren();
            finishSound();

            startButton.disabled = true;
            nick.disabled = false;

            message.textContent =
                `Fim de jogo! ${finished.score} kiwis. Salvando...`;

            try {
                const result = await api("/api/jogo/finalizar", {
                    method: "POST",
                    body: JSON.stringify({
                        token: finished.token,
                        pontos: finished.score
                    })
                });

                message.textContent =
                    `Boa, ${finished.nick}! ${finished.score} kiwis! 💜`;

                if (result.recorde) {
                    recordSound();
                    message.textContent += " 🏆 Novo recorde!";
                }

                await loadRanking(ranking);
            } catch (error) {
                message.textContent =
                    `Você fez ${finished.score} pontos, mas não foi possível salvar: ${error.message}`;
            } finally {
                startButton.disabled = false;
                startButton.textContent = "Jogar novamente";
            }
        }

        async function begin() {
            if (partida?.running) return;

            const playerName = nick.value.trim();

            if (playerName.length < 2 || playerName.length > 24) {
                message.textContent =
                    "Escolha um nick de 2 a 24 caracteres!";
                return;
            }

            startButton.disabled = true;
            message.textContent = "Preparando partida...";

            try {
                const data = await api("/api/jogo/iniciar", {
                    method: "POST",
                    body: JSON.stringify({ nick: playerName })
                });

                try {
                    localStorage.setItem("kaoryGameNick", playerName);
                } catch {}

                partida = {
                    nick: playerName,
                    token: data.token,
                    score: 0,
                    running: true,
                    timer: null
                };

                nick.disabled = true;
                points.textContent = "🥝 0 pontos";
                clock.textContent = "⏱ 30s";
                message.textContent = "VAI, KIWI! 💜";

                startSound();
                spawn();

                const current = partida;
                const deadline = performance.now() + 30000;

                current.timer = setInterval(() => {
                    if (partida !== current || !current.running) {
                        clearInterval(current.timer);
                        return;
                    }

                    const remaining = Math.max(
                        0,
                        Math.ceil((deadline - performance.now()) / 1000)
                    );

                    clock.textContent = `⏱ ${remaining}s`;

                    if (remaining <= 0) finish();
                }, 100);

            } catch (error) {
                message.textContent = error.message;
                startButton.disabled = false;
            }
        }
    }

    function showGallery() {
        openModal("Galeria da Kaory 💜");

        modalContent.appendChild(
            el("p", "kw-muted", "Fotos, artes e momentos especiais da Kaory.")
        );

        if (!fotos.length) {
            modalContent.appendChild(
                el("div", "kw-box", "A galeria está esperando as primeiras fotos! 🦊💜")
            );
            return;
        }

        const grid = el("div", "kw-gallery");

        fotos.forEach(foto => {
            const card = el("button", "kw-photo");
            card.type = "button";

            const img = document.createElement("img");
            img.src = foto.src;
            img.alt = foto.nome;
            img.loading = "lazy";

            card.append(img, el("span", "", foto.nome));

            card.addEventListener("click", () => {
                const overlay = el("div", "kw-lightbox");
                const enlarged = document.createElement("img");

                enlarged.src = foto.src;
                enlarged.alt = foto.nome;

                overlay.appendChild(enlarged);
                document.body.appendChild(overlay);

                overlay.addEventListener("click", () => overlay.remove());
            });

            grid.appendChild(card);
        });

        modalContent.appendChild(grid);
    }

    function showClips() {
        openModal("Clipes da Kaory 🎬");

        modalContent.appendChild(
            el("p", "kw-muted", "Sustos, risadas e os melhores momentos das lives!")
        );

        if (!clipes.length) {
            modalContent.appendChild(
                el("div", "kw-box", "Os clipes selecionados serão adicionados em breve.")
            );
        }

        clipes.forEach(clip => {
            const card = el("div", "kw-box");

            card.append(
                el("strong", "", clip.titulo),
                document.createElement("br"),
                externalLink("Assistir clipe ↗", clip.url)
            );

            modalContent.appendChild(card);
        });

        modalContent.appendChild(
            externalLink("Ver todos os clipes na Twitch ↗", TWITCH)
        );
    }

    // Captura antes de qualquer painel antigo do Kaory.js.
    const galleryCard =
        document.querySelector('[data-panel="gallery"]') ||
        document.querySelector('[data-panel="emotes"]');

    const clipsCard =
        document.querySelector('[data-panel="clips"]');

    if (galleryCard) {
        galleryCard.addEventListener("click", event => {
            event.stopImmediatePropagation();
            showGallery();
        }, true);
    }

    if (clipsCard) {
        clipsCard.addEventListener("click", event => {
            event.stopImmediatePropagation();
            showClips();
        }, true);
    }

    const gameCard = $("#kiwiGameCard");

    if (gameCard) {
        gameCard.addEventListener("click", showGame);
    }

    $("#modalClose").addEventListener("click", stopGame);

    modal.addEventListener("click", event => {
        if (event.target === modal) stopGame();
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") stopGame();
    });

    console.log("🥝 Minigame, ranking e sons carregados!");
})();
