
(() => {
    "use strict";

    const $ = selector => document.querySelector(selector);

    const TWITCH_CLIPS =
        "https://www.twitch.tv/kaory_saito/clips?range=30d";

    const modal = $("#modalBackdrop");
    const modalTitle = $("#modalTitle");
    const modalContent = $("#modalContent");

    if (!modal || !modalTitle || !modalContent) {
        console.error("Kaory Diversão: modal não encontrado.");
        return;
    }

    let partida = null;
    let sonsAtivos = true;
    let audioContext = null;

    const fahhh = new Audio(
        "/assets/Sounds/fahhh_KcgAXfs.mp3"
    );
    fahhh.preload = "auto";

    const style = document.createElement("style");
    style.textContent = `
        .kd-btn {
            padding: 11px 16px;
            border-radius: 12px;
            border: 1px solid #9568b3;
            background: #76519a;
            color: white;
            font: inherit;
            cursor: pointer;
            transition: transform .2s, background .2s;
        }

        .kd-btn:hover {
            transform: translateY(-2px);
            background: #9568b3;
        }

        .kd-btn:disabled {
            opacity: .5;
            cursor: default;
        }

        .kd-input {
            width: 100%;
            box-sizing: border-box;
            padding: 13px;
            margin: 12px 0;
            border: 1px solid #80599b;
            border-radius: 12px;
            background: #1c1228;
            color: white;
            font: inherit;
        }

        .kd-muted {
            color: #cdb6dd;
            font-size: 13px;
            line-height: 1.7;
        }

        .kd-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 10px;
            margin: 15px 0;
        }

        .kd-arena {
            position: relative;
            height: 300px;
            border: 1px solid #80549e;
            border-radius: 18px;
            overflow: hidden;
            background: radial-gradient(
                circle at center,
                #48305e,
                #160d23
            );
            touch-action: manipulation;
        }

        .kd-kiwi {
            position: absolute;
            width: 58px;
            height: 58px;
            display: grid;
            place-items: center;
            border: 0;
            border-radius: 50%;
            background: rgba(167, 115, 202, .25);
            font-size: 33px;
            cursor: pointer;
            animation: kd-pop .18s ease both;
        }

        .kd-kiwi:hover {
            background: rgba(167, 115, 202, .45);
        }

        .kd-ranking {
            display: grid;
            gap: 8px;
            margin: 12px 0;
        }

        .kd-rank {
            display: grid;
            grid-template-columns: 35px 1fr auto;
            gap: 10px;
            align-items: center;
            padding: 12px;
            border-radius: 12px;
            background: #30203e;
            color: #f4e9ff;
            font-size: 13px;
        }

        .kd-rank:first-child {
            border: 1px solid rgba(255, 220, 100, .5);
        }

        .kd-clip {
            padding: 16px;
            margin: 12px 0;
            border: 1px solid #684a80;
            border-radius: 14px;
            background: #24172f;
        }

        @keyframes kd-pop {
            from {
                opacity: 0;
                transform: scale(.5);
            }
            to {
                opacity: 1;
                transform: scale(1);
            }
        }
    `;
    document.head.appendChild(style);

    function element(tag, className = "", text = "") {
        const node = document.createElement(tag);
        if (className) node.className = className;
        node.textContent = text;
        return node;
    }

    function button(text, callback) {
        const node = element("button", "kd-btn", text);
        node.type = "button";
        node.addEventListener("click", callback);
        return node;
    }

    function stopGame() {
        if (partida) {
            clearInterval(partida.timer);
            partida.running = false;
            partida = null;
        }
    }

    function openModal(title) {
        stopGame();

        modalTitle.textContent = title;
        modalContent.replaceChildren();

        modal.classList.add("open");
        modal.setAttribute("aria-hidden", "false");
    }

    async function api(url, options = {}) {
        const response = await fetch(url, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.erro || "Erro de comunicação."
            );
        }

        return data;
    }

    function tocarFahhh() {
        if (!sonsAtivos) return;

        const som = fahhh.cloneNode();
        som.volume = .28;
        som.playbackRate = .95 + Math.random() * .15;

        som.play().catch(() => {});

        document.dispatchEvent(
            new Event("kaory:meme-start")
        );

        const finalizar = () => {
            document.dispatchEvent(
                new Event("kaory:meme-end")
            );
        };

        som.addEventListener("ended", finalizar, {
            once: true
        });

        som.addEventListener("error", finalizar, {
            once: true
        });
    }

    function tone(frequency, duration = .09) {
        if (!sonsAtivos) return;

        try {
            const Ctx =
                window.AudioContext ||
                window.webkitAudioContext;

            if (!Ctx) return;

            if (!audioContext) {
                audioContext = new Ctx();
            }

            if (audioContext.state === "suspended") {
                audioContext.resume().catch(() => {});
            }

            const now = audioContext.currentTime;
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();

            osc.type = "sine";
            osc.frequency.value = frequency;

            gain.gain.setValueAtTime(.0001, now);
            gain.gain.exponentialRampToValueAtTime(
                .035,
                now + .01
            );
            gain.gain.exponentialRampToValueAtTime(
                .0001,
                now + duration
            );

            osc.connect(gain);
            gain.connect(audioContext.destination);

            osc.start(now);
            osc.stop(now + duration + .02);
        } catch {}
    }

    function somInicio() {
        tone(580, .1);
        setTimeout(() => tone(780, .12), 120);
    }

    function somFinal() {
        tone(700, .12);
        setTimeout(() => tone(520, .14), 150);
        setTimeout(() => tone(390, .2), 300);
    }

    async function carregarRanking(container) {
        container.replaceChildren(
            element("p", "kd-muted", "Carregando ranking...")
        );

        try {
            const data = await api("/api/jogo/ranking");

            if (!container.isConnected) return;

            container.replaceChildren();

            if (!data.ranking?.length) {
                container.appendChild(
                    element(
                        "p",
                        "kd-muted",
                        "Seja o primeiro kiwi no ranking! 🥝"
                    )
                );
                return;
            }

            data.ranking.forEach((jogador, index) => {
                const linha = element("div", "kd-rank");

                const posicao =
                    ["🥇", "🥈", "🥉"][index] ||
                    `#${index + 1}`;

                linha.append(
                    element("span", "", posicao),
                    element("strong", "", jogador.nick),
                    element(
                        "span",
                        "",
                        `${jogador.pontos} 🥝`
                    )
                );

                container.appendChild(linha);
            });
        } catch (error) {
            container.replaceChildren(
                element("p", "kd-muted", error.message)
            );
        }
    }

    function showGame() {
        openModal("Caça aos Kiwis 🥝");

        const intro = element(
            "p",
            "kd-muted",
            "Escolha seu nick e capture o máximo de kiwis em 30 segundos!"
        );

        const nick = element("input", "kd-input");
        nick.type = "text";
        nick.maxLength = 24;
        nick.placeholder = "Seu nick no ranking";

        try {
            nick.value =
                localStorage.getItem("kaoryGameNick") || "";
        } catch {}

        const stats = element("div", "kd-row");
        const points = element(
            "strong",
            "",
            "🥝 0 pontos"
        );
        const clock = element(
            "strong",
            "",
            "⏱ 30s"
        );

        stats.append(points, clock);

        const arena = element("div", "kd-arena");

        const message = element(
            "p",
            "kd-muted",
            "Preparado para começar?"
        );

        const actions = element("div", "kd-row");

        const start = button(
            "Começar partida",
            iniciar
        );

        const sound = button(
            sonsAtivos
                ? "🔊 Sons ligados"
                : "🔇 Sons desligados",
            () => {
                sonsAtivos = !sonsAtivos;
                sound.textContent = sonsAtivos
                    ? "🔊 Sons ligados"
                    : "🔇 Sons desligados";
            }
        );

        actions.append(start, sound);

        const rankingTitle = element(
            "h3",
            "",
            "🏆 Ranking global — Top 10"
        );

        const ranking = element(
            "div",
            "kd-ranking"
        );

        modalContent.append(
            intro,
            nick,
            stats,
            arena,
            message,
            actions,
            rankingTitle,
            ranking
        );

        carregarRanking(ranking);

        function spawn() {
            if (!partida?.running) return;

            arena.replaceChildren();

            const kiwi = element(
                "button",
                "kd-kiwi",
                "🥝"
            );

            kiwi.type = "button";
            kiwi.setAttribute(
                "aria-label",
                "Capturar kiwi"
            );

            const maxX = Math.max(
                0,
                arena.clientWidth - 58
            );

            const maxY = Math.max(
                0,
                arena.clientHeight - 58
            );

            kiwi.style.left =
                `${Math.random() * maxX}px`;

            kiwi.style.top =
                `${Math.random() * maxY}px`;

            kiwi.addEventListener("click", () => {
                if (!partida?.running) return;

                partida.score++;

                points.textContent =
                    `🥝 ${partida.score} pontos`;

                tocarFahhh();

                if (partida.score % 5 === 0) {
                    tone(950, .12);
                }

                spawn();
            });

            arena.appendChild(kiwi);
        }

        async function finalizar() {
            if (!partida?.running) return;

            const atual = partida;

            atual.running = false;
            clearInterval(atual.timer);

            arena.replaceChildren();
            somFinal();

            message.textContent =
                `Fim! ${atual.score} kiwis. Salvando...`;

            try {
                const resultado = await api(
                    "/api/jogo/finalizar",
                    {
                        method: "POST",
                        body: JSON.stringify({
                            token: atual.token,
                            pontos: atual.score
                        })
                    }
                );

                message.textContent =
                    `${atual.nick} conseguiu ${atual.score} kiwis! 💜`;

                if (resultado.recorde) {
                    message.textContent +=
                        " 🏆 Novo recorde!";
                }

                await carregarRanking(ranking);
            } catch (error) {
                message.textContent =
                    `Pontuação: ${atual.score}. ${error.message}`;
            } finally {
                nick.disabled = false;
                start.disabled = false;
                start.textContent = "Jogar novamente";
            }
        }

        async function iniciar() {
            if (partida?.running) return;

            const nome = nick.value.trim();

            if (nome.length < 2 || nome.length > 24) {
                message.textContent =
                    "Escolha um nick de 2 a 24 caracteres.";
                return;
            }

            start.disabled = true;
            message.textContent = "Preparando partida...";

            try {
                const data = await api(
                    "/api/jogo/iniciar",
                    {
                        method: "POST",
                        body: JSON.stringify({
                            nick: nome
                        })
                    }
                );

                try {
                    localStorage.setItem(
                        "kaoryGameNick",
                        nome
                    );
                } catch {}

                partida = {
                    nick: nome,
                    token: data.token,
                    score: 0,
                    running: true,
                    timer: null
                };

                const atual = partida;
                const deadline =
                    performance.now() + 30000;

                nick.disabled = true;

                points.textContent = "🥝 0 pontos";
                clock.textContent = "⏱ 30s";
                message.textContent = "VAI, KIWI! 💜";

                somInicio();
                spawn();

                atual.timer = setInterval(() => {
                    if (
                        partida !== atual ||
                        !atual.running
                    ) {
                        clearInterval(atual.timer);
                        return;
                    }

                    const restante = Math.max(
                        0,
                        Math.ceil(
                            (deadline - performance.now()) / 1000
                        )
                    );

                    clock.textContent =
                        `⏱ ${restante}s`;

                    if (restante <= 0) {
                        finalizar();
                    }
                }, 100);

            } catch (error) {
                message.textContent = error.message;
                start.disabled = false;
            }
        }
    }

    function showClips() {
        openModal("Clipes da Kaory 🎬");

        modalContent.appendChild(
            element(
                "p",
                "kd-muted",
                "Os sustos, as risadas e os melhores momentos da Kaory!"
            )
        );

        const card = element("div", "kd-clip");

        card.appendChild(
            element(
                "p",
                "kd-muted",
                "Confira os clipes da Kaory diretamente na Twitch."
            )
        );

        const link = element(
            "a",
            "kd-btn",
            "Assistir clipes ↗"
        );

        link.href = TWITCH_CLIPS;
        link.target = "_blank";
        link.rel = "noopener noreferrer";

        card.appendChild(link);
        modalContent.appendChild(card);
    }

    const gameCard = $("#kiwiGameCard");

    if (gameCard) {
        gameCard.addEventListener("click", showGame);
    }

    const clipsCard =
        document.querySelector('[data-panel="clips"]');

    if (clipsCard) {
        clipsCard.addEventListener(
            "click",
            event => {
                event.preventDefault();
                event.stopImmediatePropagation();
                showClips();
            },
            true
        );
    }

    $("#modalClose")?.addEventListener(
        "click",
        stopGame
    );

    modal.addEventListener("click", event => {
        if (event.target === modal) {
            stopGame();
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            stopGame();
        }
    });

    console.log("Kaory Diversão carregado! 🥝");
})();
