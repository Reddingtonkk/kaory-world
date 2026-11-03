
(() => {
    "use strict";

    const MUSIC_URL =
        "/assets/Sounds/shopping-with-mom.mp3";

    const DEFAULT_VOLUME = 0.15;

    const music = new Audio(MUSIC_URL);

    music.loop = true;
    music.preload = "auto";

    let enabled =
        localStorage.getItem("kaoryMusicEnabled") !== "false";

    const savedVolume =
        localStorage.getItem("kaoryMusicVolume");

    let volume = savedVolume === null
        ? DEFAULT_VOLUME
        : Number(savedVolume);

    if (
        !Number.isFinite(volume) ||
        volume < 0 ||
        volume > 1
    ) {
        volume = DEFAULT_VOLUME;
    }

    let ducked = false;
    let fadeFrame = null;

    music.volume = 0;

    const style = document.createElement("style");

    style.textContent = `
        #kaoryMusicControl {
            position: fixed;
            right: 22px;
            bottom: 92px;
            z-index: 900;
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 13px;
            background: rgba(24, 15, 36, .92);
            border: 1px solid rgba(180, 138, 210, .32);
            border-radius: 18px;
            box-shadow: 0 12px 35px rgba(0, 0, 0, .3);
            backdrop-filter: blur(14px);
            color: #f4e8ff;
            font-family: inherit;
            transition:
                right .3s ease,
                left .3s ease,
                bottom .3s ease,
                transform .25s ease;
        }

        #kaoryMusicControl:hover {
            transform: translateY(-3px);
        }

        #kaoryMusicButton {
            width: 34px;
            height: 34px;
            border: 0;
            border-radius: 11px;
            background: rgba(166, 117, 204, .18);
            color: #f4d8ff;
            font-size: 19px;
            cursor: pointer;
        }

        .kaory-music-info {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .kaory-music-info strong {
            font-size: 11px;
            font-weight: 600;
        }

        .kaory-music-info small {
            font-size: 10px;
            color: #c3a7d2;
        }

        #kaoryMusicVolume {
            width: 72px;
            accent-color: #b68ad4;
            cursor: pointer;
        }

        body.kaory-chat-open #kaoryMusicControl {
            right: auto;
            left: 22px;
            bottom: 16px;
        }

        @media (max-width: 600px) {
            #kaoryMusicControl {
                right: 12px;
                bottom: 82px;
                gap: 7px;
                padding: 8px;
            }

            .kaory-music-info {
                display: none;
            }

            #kaoryMusicVolume {
                width: 55px;
            }

            body.kaory-chat-open #kaoryMusicControl {
                right: auto;
                left: 12px;
                bottom: 12px;
            }
        }
    `;

    document.head.appendChild(style);

    const control = document.createElement("div");

    control.id = "kaoryMusicControl";

    control.innerHTML = `
        <button
            id="kaoryMusicButton"
            type="button"
            aria-label="Ligar ou desligar música"
        >♫</button>

        <div class="kaory-music-info">
            <strong>Shopping with Mom</strong>
            <small>Stationary Sign</small>
        </div>

        <input
            id="kaoryMusicVolume"
            type="range"
            min="0"
            max="100"
            step="1"
            aria-label="Volume da música"
        >
    `;

    document.body.appendChild(control);

    const button =
        control.querySelector("#kaoryMusicButton");

    const slider =
        control.querySelector("#kaoryMusicVolume");

    slider.value = Math.round(volume * 100);

    function targetVolume() {
        if (!enabled) return 0;

        return ducked
            ? volume * 0.12
            : volume;
    }

    function fadeTo(target, duration = 1200) {
        if (fadeFrame !== null) {
            cancelAnimationFrame(fadeFrame);
        }

        const initial = music.volume;
        const start = performance.now();

        function step(now) {
            const progress = Math.min(
                (now - start) / duration,
                1
            );

            const smooth =
                progress * progress * (3 - 2 * progress);

            music.volume = Math.max(
                0,
                Math.min(
                    1,
                    initial +
                    (target - initial) * smooth
                )
            );

            if (progress < 1) {
                fadeFrame = requestAnimationFrame(step);
            } else {
                fadeFrame = null;

                if (!enabled && music.volume === 0) {
                    music.pause();
                }
            }
        }

        fadeFrame = requestAnimationFrame(step);
    }

    function updateButton() {
        button.textContent = enabled ? "♫" : "♪";
        button.style.opacity = enabled ? "1" : ".45";

        button.title = enabled
            ? "Desligar música"
            : "Ligar música";
    }

    async function startMusic() {
        if (!enabled) return false;

        try {
            if (music.paused) {
                await music.play();
            }

            fadeTo(targetVolume(), 1800);
            return true;

        } catch (error) {
            console.warn(
                "Não foi possível iniciar a música:",
                error
            );

            return false;
        }
    }

    button.addEventListener("click", () => {
        enabled = !enabled;

        localStorage.setItem(
            "kaoryMusicEnabled",
            String(enabled)
        );

        updateButton();

        if (enabled) {
            startMusic();
        } else {
            fadeTo(0, 550);
        }
    });

    slider.addEventListener("input", () => {
        volume = Number(slider.value) / 100;

        localStorage.setItem(
            "kaoryMusicVolume",
            String(volume)
        );

        if (enabled) {
            if (music.paused) {
                startMusic();
            } else {
                fadeTo(targetVolume(), 150);
            }
        }
    });

    document.addEventListener(
        "kaory:meme-start",
        () => {
            ducked = true;

            if (enabled && !music.paused) {
                fadeTo(targetVolume(), 220);
            }
        }
    );

    document.addEventListener(
        "kaory:meme-end",
        () => {
            ducked = false;

            if (enabled && !music.paused) {
                fadeTo(targetVolume(), 900);
            }
        }
    );

    window.KaoryMusic = {
        start: startMusic,

        isEnabled: () => enabled,

        setEnabled: value => {
            enabled = Boolean(value);

            localStorage.setItem(
                "kaoryMusicEnabled",
                String(enabled)
            );

            updateButton();

            if (!enabled) {
                fadeTo(0, 400);
            }
        }
    };

    const chatWindow =
        document.querySelector("#chatWindow");

    if (chatWindow) {
        const syncPosition = () => {
            document.body.classList.toggle(
                "kaory-chat-open",
                chatWindow.classList.contains("open")
            );
        };

        const observer =
            new MutationObserver(syncPosition);

        observer.observe(chatWindow, {
            attributes: true,
            attributeFilter: ["class"]
        });

        syncPosition();
    }

    updateButton();

    console.log("Kaory Music carregada! 💜🥝");
})();
