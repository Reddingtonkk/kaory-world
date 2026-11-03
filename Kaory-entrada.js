
(() => {
    "use strict";

    const style = document.createElement("style");

    style.textContent = `
        #kaoryWelcome {
            position: fixed;
            inset: 0;
            z-index: 20000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            background:
                radial-gradient(
                    circle at 50% 35%,
                    #39234f 0%,
                    #1b1029 45%,
                    #090610 100%
                );
            transition:
                opacity .9s ease,
                visibility .9s ease;
        }

        #kaoryWelcome.hidden {
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
        }

        .kaory-welcome-card {
            width: min(100%, 480px);
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            animation: welcomeAppear 1s ease both;
        }

        .kaory-welcome-avatar {
            width: 170px;
            height: 170px;
            object-fit: contain;
            margin-bottom: 15px;
            filter: drop-shadow(0 15px 30px #0007);
            animation: welcomeFloat 3s ease-in-out infinite;
        }

        .kaory-welcome-small {
            color: #b69bc9;
            font-size: 11px;
            letter-spacing: 4px;
            text-transform: uppercase;
            margin-bottom: 12px;
        }

        .kaory-welcome-title {
            font-size: clamp(38px, 8vw, 62px);
            line-height: 1.1;
            font-weight: 800;
            color: #f5e7ff;
            margin: 0 0 15px;
            text-shadow: 0 5px 35px #b96ef455;
        }

        .kaory-welcome-description {
            max-width: 340px;
            color: #cdb8da;
            font-size: 14px;
            line-height: 1.8;
            margin-bottom: 30px;
        }

        #kaoryEnterButton {
            padding: 16px 30px;
            border: 1px solid #b08ac8;
            border-radius: 16px;
            background: linear-gradient(
                135deg,
                #9d70c4,
                #68418e
            );
            color: #fff;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            box-shadow: 0 12px 40px #8c4db044;
            transition:
                transform .3s,
                box-shadow .3s;
        }

        #kaoryEnterButton:hover {
            transform: translateY(-4px) scale(1.03);
            box-shadow: 0 18px 50px #a467d077;
        }

        .kaory-welcome-song {
            margin-top: 22px;
            color: #a68bb9;
            font-size: 11px;
        }

        @keyframes welcomeAppear {
            from {
                opacity: 0;
                transform: translateY(30px);
            }

            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        @keyframes welcomeFloat {
            0%, 100% {
                transform: translateY(0);
            }

            50% {
                transform: translateY(-12px);
            }
        }

        @media (prefers-reduced-motion: reduce) {
            .kaory-welcome-card,
            .kaory-welcome-avatar {
                animation: none;
            }

            #kaoryWelcome {
                transition: none;
            }
        }
    `;

    document.head.appendChild(style);

    const welcome = document.createElement("div");
    welcome.id = "kaoryWelcome";

    welcome.innerHTML = `
        <div class="kaory-welcome-card">
            <img
                class="kaory-welcome-avatar"
                src="/assets/kaory-fechada.png"
                alt="Kaory"
            >

            <div class="kaory-welcome-small">
                Um pequeno universo
            </div>

            <h1 class="kaory-welcome-title">
                Kaory World
            </h1>

            <p class="kaory-welcome-description">
                Um cantinho especial cheio de histórias,
                magia e kiwis esperando por você.
                💜🥝
            </p>

            <button
                id="kaoryEnterButton"
                type="button"
            >
                Entrar no mundo da Kaory 💜
            </button>

            <div class="kaory-welcome-song">
                ♫ Shopping with Mom — Stationary Sign
            </div>
        </div>
    `;

    document.body.appendChild(welcome);

    const enterButton = welcome.querySelector("#kaoryEnterButton");

    enterButton.addEventListener("click", () => {
        // Se a música foi desligada anteriormente,
        // reativa para a experiência de entrada.
        if (window.KaoryMusic) {
            if (!window.KaoryMusic.isEnabled()) {
                window.KaoryMusic.setEnabled(true);
            }

            // Chamada direta dentro do clique do usuário.
            window.KaoryMusic.start();
        }

        welcome.classList.add("hidden");

        setTimeout(() => {
            welcome.remove();
        }, 1000);
    });

    console.log("Tela de entrada da Kaory pronta! 🥝");
})();
