
(() => {
    "use strict";

    const $ = selector => document.querySelector(selector);

    const fotos = [
        // Adicione fotos autorizadas:
        // {
        //     src: "/assets/Galeria/kaory-01.png",
        //     nome: "Kaory Saito 💜"
        // }
    ];

    const clipes = [
        // Adicione clipes individuais:
        // {
        //     titulo: "Momento engraçado da Kaory",
        //     url: "https://www.twitch.tv/kaory_saito/clip/..."
        // }
    ];

    const TWITCH_URL =
        "https://www.twitch.tv/kaory_saito/clips?range=30d";

    const style = document.createElement("style");

    style.textContent = `
        .kw-gallery {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
            margin-top: 18px;
        }

        .kw-gallery-item {
            border: 1px solid rgba(180, 138, 210, .35);
            background: #24172f;
            border-radius: 15px;
            overflow: hidden;
            color: #f5e9ff;
            cursor: pointer;
            text-align: left;
            padding: 0;
            transition: transform .25s, border-color .25s;
        }

        .kw-gallery-item:hover {
            transform: translateY(-4px);
            border-color: #b88bd8;
        }

        .kw-gallery-item img {
            display: block;
            width: 100%;
            aspect-ratio: 1;
            object-fit: cover;
        }

        .kw-gallery-item span {
            display: block;
            padding: 10px;
            font-size: 12px;
        }

        .kw-empty {
            padding: 22px;
            margin-top: 16px;
            background: #24172f;
            border: 1px dashed #75528e;
            border-radius: 15px;
            color: #d6c1e4;
            text-align: center;
            line-height: 1.7;
        }

        .kw-action {
            display: inline-block;
            padding: 11px 16px;
            border-radius: 12px;
            background: #8156a6;
            border: 0;
            color: white;
            font: inherit;
            font-size: 13px;
            text-decoration: none;
            cursor: pointer;
            transition: transform .2s, background .2s;
        }

        .kw-action:hover {
            transform: translateY(-2px);
            background: #9b6bc1;
        }

        .kw-clip {
            padding: 14px;
            border: 1px solid #684780;
            border-radius: 14px;
            background: #24172f;
            margin: 10px 0;
        }

        .kw-clip strong {
            display: block;
            margin-bottom: 10px;
        }

        .kw-game-stats {
            display: flex;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 8px;
            margin: 16px 0;
            font-size: 13px;
        }

        .kw-game-area {
            position: relative;
            height: 280px;
            overflow: hidden;
            border-radius: 18px;
            background: radial-gradient(
                circle at center,
                #38214e,
                #160e22
            );
            border: 1px solid #684780;
        }

        .kw-game-kiwi {
            position: absolute;
            display: grid;
            place-items: center;
            width: 55px;
            height: 55px;
            border: 0;
            border-radius: 50%;
            background: #53326d;
            font-size: 31px;
            cursor: pointer;
            animation: kw-pop .2s ease both;
        }

        .kw-game-kiwi:hover {
            background: #765096;
        }

        .kw-game-message {
            padding: 18px 4px;
            text-align: center;
            color: #e7d5f3;
        }

        .kw-lightbox {
            position: fixed;
            inset: 0;
            z-index: 30000;
            display: grid;
            place-items: center;
            padding: 30px;
            background: rgba(5, 3, 10, .94);
            cursor: zoom-out;
        }

        .kw-lightbox img {
            max-width: 95vw;
            max-height: 85vh;
            object-fit: contain;
            border-radius: 12px;
        }

        @keyframes kw-pop {
            from {
                opacity: 0;
                transform: scale(.6);
            }

            to {
                opacity: 1;
                transform: scale(1);
            }
        }
    `;

    document.head.appendChild(style);

    const modal = $("#modalBackdrop");
    const modalTitle = $("#modalTitle");
    const modalContent = $("#modalContent");

    let gameTimer = null;
    let gameRunning = false;
    let score = 0;
    let seconds = 30;

    function stopGame() {
        clearInterval(gameTimer);
        gameTimer = null;
        gameRunning = false;
    }

    function openModal(title) {
        stopGame();

        modalTitle.textContent = title;
        modalContent.replaceChildren();

        modal.classList.add("open");
        modal.setAttribute("aria-hidden", "false");
    }

    function paragraph(text) {
        const p = document.createElement("p");
        p.textContent = text;
        return p;
    }

    function actionLink(label, url) {
        const a = document.createElement("a");

        a.className = "kw-action";
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = label;

        return a;
    }

    function showGallery() {
        openModal("Galeria da Kaory 💜");

        modalContent.appendChild(
            paragraph(
                "Fotos, artes e momentos especiais da nossa raposinha."
            )
        );

        if (!fotos.length) {
            const empty = document.createElement("div");

            empty.className = "kw-empty";
            empty.textContent =
                "A galeria está esperando as primeiras fotos e artes da Kaory! 🦊💜";

            modalContent.appendChild(empty);
            return;
        }

        const grid = document.createElement("div");
        grid.className = "kw-gallery";

        fotos.forEach(foto => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "kw-gallery-item";

            const img = document.createElement("img");
            img.src = foto.src;
            img.alt = foto.nome;
            img.loading = "lazy";

            const caption = document.createElement("span");
            caption.textContent = foto.nome;

            button.append(img, caption);

            button.addEventListener("click", () => {
                const overlay = document.createElement("div");
                overlay.className = "kw-lightbox";

                const enlarged = document.createElement("img");
                enlarged.src = foto.src;
                enlarged.alt = foto.nome;

                overlay.appendChild(enlarged);
                document.body.appendChild(overlay);

                overlay.addEventListener("click", () => {
                    overlay.remove();
                });
            });

            grid.appendChild(button);
        });

        modalContent.appendChild(grid);
    }

    function showClips() {
        openModal("Clipes da Kaory 🎬");

        modalContent.appendChild(
            paragraph(
                "Sustos, risadas e os melhores momentos das lives!"
            )
        );

        if (!clipes.length) {
            const empty = document.createElement("div");

            empty.className = "kw-empty";
            empty.textContent =
                "Os clipes selecionados ainda serão adicionados. " +
                "Enquanto isso, veja os clipes na Twitch! 🥝";

            modalContent.appendChild(empty);
        }

        clipes.forEach(clipe => {
            const card = document.createElement("div");
            card.className = "kw-clip";

            const title = document.createElement("strong");
            title.textContent = clipe.titulo;

            card.append(
                title,
                actionLink("Assistir clipe ↗", clipe.url)
            );

            modalContent.appendChild(card);
        });

        const footer = document.createElement("p");
        footer.style.marginTop = "18px";

        footer.appendChild(
            actionLink(
                "Ver todos os clipes na Twitch ↗",
                TWITCH_URL
            )
        );

        modalContent.appendChild(footer);
    }

    function getRecord() {
        try {
            return Number(
                localStorage.getItem("kaoryKiwiRecord")
            ) || 0;
        } catch {
            return 0;
        }
    }

    function saveRecord(value) {
        try {
            localStorage.setItem(
                "kaoryKiwiRecord",
                String(value)
            );
        } catch {
            // O jogo funciona mesmo sem localStorage.
        }
    }

    function showGame() {
        openModal("Caça aos Kiwis 🥝");

        modalContent.appendChild(
            paragraph(
                "Você tem 30 segundos para capturar o máximo de kiwis!"
            )
        );

        const stats = document.createElement("div");
        stats.className = "kw-game-stats";

        const points = document.createElement("strong");
        const timer = document.createElement("strong");
        const record = document.createElement("strong");

        stats.append(points, timer, record);

        const area = document.createElement("div");
        area.className = "kw-game-area";

        const message = document.createElement("div");
        message.className = "kw-game-message";
        message.textContent = "Preparado para a caça? 💜🥝";

        const start = document.createElement("button");
        start.type = "button";
        start.className = "kw-action";
        start.textContent = "Começar jogo";

        const controls = document.createElement("div");
        controls.style.marginTop = "15px";
        controls.append(message, start);

        modalContent.append(stats, area, controls);

        function refresh() {
            points.textContent = `🥝 Pontos: ${score}`;
            timer.textContent = `⏱ ${seconds}s`;
            record.textContent = `🏆 Recorde: ${getRecord()}`;
        }

        function spawnKiwi() {
            area.replaceChildren();

            if (!gameRunning) return;

            const kiwi = document.createElement("button");

            kiwi.type = "button";
            kiwi.className = "kw-game-kiwi";
            kiwi.textContent = "🥝";
            kiwi.setAttribute(
                "aria-label",
                "Capturar kiwi"
            );

            const maxX = Math.max(
                0,
                area.clientWidth - 55
            );

            const maxY = Math.max(
                0,
                area.clientHeight - 55
            );

            kiwi.style.left =
                `${Math.random() * maxX}px`;

            kiwi.style.top =
                `${Math.random() * maxY}px`;

            kiwi.addEventListener("click", () => {
                if (!gameRunning) return;

                score++;

                if (score > getRecord()) {
                    saveRecord(score);
                }

                refresh();
                spawnKiwi();
            });

            area.appendChild(kiwi);
        }

        function finish() {
            stopGame();

            area.replaceChildren();
            start.disabled = false;
            start.textContent = "Jogar novamente";

            message.textContent =
                `Fim de jogo! Você capturou ${score} kiwis! 🥝💜`;

            refresh();
        }

        start.addEventListener("click", () => {
            if (gameRunning) return;

            score = 0;
            seconds = 30;
            gameRunning = true;

            start.disabled = true;
            message.textContent =
                "Vai, kiwi! Pega todos!";

            refresh();
            spawnKiwi();

            gameTimer = setInterval(() => {
                seconds--;
                refresh();

                if (seconds <= 0) {
                    finish();
                }
            }, 1000);
        });

        refresh();
    }

    // Captura os cliques antes do painel antigo.
    const galleryCard =
        document.querySelector('[data-panel="gallery"]');

    const clipsCard =
        document.querySelector('[data-panel="clips"]');

    if (galleryCard) {
        galleryCard.addEventListener(
            "click",
            event => {
                event.stopImmediatePropagation();
                showGallery();
            },
            true
        );
    }

    if (clipsCard) {
        clipsCard.addEventListener(
            "click",
            event => {
                event.stopImmediatePropagation();
                showClips();
            },
            true
        );
    }

    const gameCard = $("#kiwiGameCard");

    if (gameCard) {
        gameCard.addEventListener("click", showGame);
    }

    const closeButton = $("#modalClose");

    if (closeButton) {
        closeButton.addEventListener("click", stopGame);
    }

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

    console.log(
        "Kaory World Diversão carregado! 🥝💜"
    );
})();
