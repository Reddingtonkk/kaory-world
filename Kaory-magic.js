
(() => {
    "use strict";

    const LINKS = {
        twitch: "https://www.twitch.tv/kaory_saito",
        youtube: "https://www.youtube.com/@KaorySaito-r4h",
        discord: "https://discord.gg/vkCmjt7cBy",
        clips: "https://www.twitch.tv/kaory_saito/clips?range=30d"
    };

    const AUDIOS = {
        sola: "/assets/Sounds/eh-na-sola-da-bota.mp3",
        fahhh: "/assets/Sounds/fahhh_KcgAXfs.mp3"
    };

    let totalClicks = 0;
    let currentAudio = null;
    let lastAudio = "";
    let audioBusy = false;

    const style = document.createElement("style");

    style.textContent = `
        #kiwiRain {
            position: fixed;
            inset: 0;
            overflow: hidden;
            pointer-events: none;
            z-index: 5;
        }

        .kiwi-drop {
            position: absolute;
            top: -65px;
            font-size: var(--kiwi-size);
            opacity: .35;
            user-select: none;
            pointer-events: auto;
            cursor: pointer;
            animation: kiwiFall var(--duration) linear infinite;
            animation-delay: var(--delay);
            filter: drop-shadow(0 0 8px #8bcf6560);
            transition: opacity .2s, filter .2s;
        }

        .kiwi-drop:hover {
            opacity: 1;
            animation-play-state: paused;
            filter: drop-shadow(0 0 12px #a9ed88);
        }

        .kiwi-drop.golden {
            opacity: .9;
            filter: drop-shadow(0 0 12px gold);
        }

        @keyframes kiwiFall {
            0% {
                transform: translate3d(0, -10vh, 0)
                           rotate(0deg);
            }

            100% {
                transform: translate3d(
                    var(--drift),
                    115vh,
                    0
                ) rotate(360deg);
            }
        }

        .kiwi-burst {
            position: fixed;
            z-index: 9999;
            pointer-events: none;
            font-size: 25px;
            animation: kiwiBurst .75s ease-out forwards;
        }

        @keyframes kiwiBurst {
            from {
                transform: translate(0, 0) scale(1);
                opacity: 1;
            }

            to {
                transform: translate(
                    var(--burst-x),
                    var(--burst-y)
                ) scale(.3);
                opacity: 0;
            }
        }

        .kiwi-toast {
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 9999;
            padding: 13px 20px;
            max-width: calc(100vw - 32px);
            border-radius: 14px;
            background: #271c35;
            color: #fff;
            border: 1px solid #72568c;
            box-shadow: 0 12px 35px #0009;
            font-size: 13px;
            text-align: center;
            animation: kiwiToastIn .3s ease-out;
        }

        @keyframes kiwiToastIn {
            from {
                opacity: 0;
                translate: 0 -12px;
            }

            to {
                opacity: 1;
                translate: 0 0;
            }
        }

        @keyframes kiwiDance {
            0%, 100% {
                transform: rotate(-12deg) scale(1);
            }

            50% {
                transform: rotate(12deg) scale(1.3);
            }
        }

        .kiwi-drop.dancing {
            animation: kiwiDance .35s ease-in-out
                       infinite alternate !important;
            opacity: 1;
        }

        @media (prefers-reduced-motion: reduce) {
            .kiwi-drop {
                animation: none;
                display: none;
            }

            .kiwi-burst,
            .kiwi-toast {
                animation: none;
            }
        }
    `;

    document.head.appendChild(style);

    // ======================================
    // FUNDO DE KIWIS
    // ======================================

    const rain = document.createElement("div");

    rain.id = "kiwiRain";
    rain.setAttribute("aria-hidden", "true");

    document.body.prepend(rain);


    // ======================================
    // MENSAGENS SECRETAS
    // ======================================

    function toast(message) {
        document.querySelector(".kiwi-toast")?.remove();

        const element = document.createElement("div");

        element.className = "kiwi-toast";
        element.textContent = message;

        document.body.appendChild(element);

        setTimeout(() => element.remove(), 2600);
    }


    // ======================================
    // EXPLOSÃO DE PARTÍCULAS
    // ======================================

    function burst(x, y, golden = false) {
        for (let i = 0; i < 9; i++) {
            const particle = document.createElement("span");

            particle.className = "kiwi-burst";

            particle.textContent = golden
                ? (i % 2 ? "✨" : "👑")
                : (i % 2 ? "💜" : "🥝");

            particle.style.left = `${x}px`;
            particle.style.top = `${y}px`;

            const angle = (Math.PI * 2 * i) / 9;
            const distance = 45 + Math.random() * 75;

            particle.style.setProperty(
                "--burst-x",
                `${Math.cos(angle) * distance}px`
            );

            particle.style.setProperty(
                "--burst-y",
                `${Math.sin(angle) * distance}px`
            );

            document.body.appendChild(particle);

            setTimeout(() => particle.remove(), 800);
        }
    }


    // ======================================
    // ÁUDIOS DOS MEMES
    // ======================================

    function playFunnySound(forceSola = false) {
        if (audioBusy) return;

        let selected;

        if (forceSola) {
            selected = "sola";
        } else {
            selected = Math.random() < .8
                ? "fahhh"
                : "sola";

            if (
                selected === lastAudio &&
                Math.random() < .5
            ) {
                selected = selected === "fahhh"
                    ? "sola"
                    : "fahhh";
            }
        }

        lastAudio = selected;

        if (currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
        }

        const audio = new Audio(AUDIOS[selected]);

        currentAudio = audio;

        audio.volume = selected === "sola"
            ? .35
            : .5;

        audioBusy = true;

        let finished = false;

        function finalizarAudio() {
            if (finished) return;

            finished = true;
            audioBusy = false;

            document.dispatchEvent(
                new Event("kaory:meme-end")
            );

            document
                .querySelectorAll(".kiwi-drop")
                .forEach(kiwi => {
                    kiwi.classList.remove("dancing");
                });
        }

        audio.addEventListener(
            "ended",
            finalizarAudio,
            { once: true }
        );

        audio.addEventListener(
            "error",
            finalizarAudio,
            { once: true }
        );

        audio.play().then(() => {
            document.dispatchEvent(
                new Event("kaory:meme-start")
            );

            if (selected === "sola") {
                toast("🎶 É NA SOLA DA BOTA KKKKK");

                document
                    .querySelectorAll(".kiwi-drop")
                    .forEach(kiwi => {
                        kiwi.classList.add("dancing");
                    });
            }
        }).catch(error => {
            console.warn(
                "Não foi possível tocar o meme:",
                error
            );

            finalizarAudio();
        });
    }


    // ======================================
    // CRIAÇÃO DOS KIWIS
    // ======================================

    function createKiwi(golden = false) {
        const kiwi = document.createElement("span");

        kiwi.className = golden
            ? "kiwi-drop golden"
            : "kiwi-drop";

        kiwi.textContent = golden
            ? "👑🥝"
            : "🥝";

        kiwi.style.left = `${Math.random() * 95}%`;

        kiwi.style.setProperty(
            "--kiwi-size",
            `${13 + Math.random() * 16}px`
        );

        kiwi.style.setProperty(
            "--duration",
            `${13 + Math.random() * 18}s`
        );

        kiwi.style.setProperty(
            "--delay",
            `${-Math.random() * 30}s`
        );

        kiwi.style.setProperty(
            "--drift",
            `${Math.random() * 120 - 60}px`
        );

        kiwi.addEventListener("click", event => {
            event.stopPropagation();

            totalClicks++;

            burst(
                event.clientX,
                event.clientY,
                golden
            );

            if (golden) {
                toast(
                    "👑 VOCÊ ENCONTROU O KIWI DOURADO!"
                );

                playFunnySound(true);
                kiwi.remove();

                return;
            }

            playFunnySound();

            if (totalClicks === 1) {
                toast(
                    "🥝 Você encontrou um kiwi suspeito..."
                );
            } else if (totalClicks === 5) {
                toast(
                    "💜 Os kiwis estão observando você..."
                );
            } else if (totalClicks === 10) {
                toast(
                    "🦊 CONQUISTA: Caçador de Kiwis!"
                );
            } else if (totalClicks === 20) {
                toast(
                    "👑 O GRANDE KIWI TE RECONHECE!"
                );
            }
        });

        rain.appendChild(kiwi);

        return kiwi;
    }


    // ======================================
    // CHUVA DE KIWIS
    // ======================================

    for (let i = 0; i < 24; i++) {
        createKiwi();
    }

    // 15% de chance de Kiwi Dourado
    if (Math.random() < .15) {
        createKiwi(true);
    }


    // ======================================
    // LINKS OFICIAIS
    // ======================================

    document.querySelectorAll("a[href]").forEach(link => {
        const href = link.getAttribute("href") || "";
        const texto = link.textContent.toLowerCase();

        if (
            href.includes("twitch.tv") &&
            !href.includes("/clips")
        ) {
            link.href = LINKS.twitch;
        }

        if (href.includes("youtube.com")) {
            link.href = LINKS.youtube;
        }

        if (href.includes("discord.gg")) {
            link.href = LINKS.discord;
        }

        if (
            href.includes("twitch.tv") &&
            href.includes("/clips")
        ) {
            link.href = LINKS.clips;
        }

        if (
            texto.includes("clipes") &&
            link.tagName === "A"
        ) {
            link.href = LINKS.clips;
        }

        if (
            texto.includes("entrar no discord") &&
            link.tagName === "A"
        ) {
            link.href = LINKS.discord;
        }

        if (
            link.href === LINKS.twitch ||
            link.href === LINKS.youtube ||
            link.href === LINKS.discord ||
            link.href === LINKS.clips
        ) {
            link.target = "_blank";
            link.rel = "noopener noreferrer";
        }
    });


    // ======================================
    // CRÉDITOS
    // ======================================

    document.querySelectorAll("footer").forEach(footer => {
        const elementos = footer.querySelectorAll(
            "p, small, span"
        );

        for (const elemento of elementos) {
            if (
                elemento.children.length === 0 &&
                /feito com carinho/i.test(
                    elemento.textContent
                )
            ) {
                elemento.textContent =
                    "Feito com carinho por Redd 💜🥝";
            }
        }
    });

    console.log(
        "Kaory World Magic carregado! 🥝💜"
    );
})();
