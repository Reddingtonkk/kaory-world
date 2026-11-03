
(() => {
    "use strict";

    const estilo = document.createElement("style");

    estilo.textContent = `
        #reddSecret {
            position: fixed;
            bottom: 20px;
            left: 20px;
            z-index: 100;
            background: transparent;
            border: 0;
            cursor: pointer;
            font-size: 19px;
            opacity: .35;
            transition: transform .3s, opacity .3s;
        }

        #reddSecret:hover {
            opacity: 1;
            transform: scale(1.25) rotate(-12deg);
        }

        #reddSurprise {
            position: fixed;
            inset: 0;
            z-index: 10000;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 20px;
            background: rgba(8, 5, 16, .88);
            backdrop-filter: blur(14px);
        }

        #reddSurprise.active {
            display: flex;
            animation: reddFade .5s ease forwards;
        }

        .redd-letter {
            position: relative;
            width: min(100%, 480px);
            padding: 48px 35px;
            border-radius: 24px;
            text-align: center;
            background: linear-gradient(
                145deg,
                #25152f,
                #130e20
            );
            border: 1px solid #a47abd65;
            box-shadow: 0 25px 90px #0009;
            animation: reddLetterIn .7s ease both;
        }

        .redd-letter-icon {
            font-size: 48px;
            margin-bottom: 20px;
            animation: reddHeartbeat 1.5s ease-in-out infinite;
        }

        .redd-letter h2 {
            margin: 0 0 20px;
            color: #f3d6ff;
            font-size: clamp(22px, 5vw, 30px);
        }

        .redd-message {
            color: #f5eafa;
            font-size: clamp(16px, 3vw, 19px);
            line-height: 1.9;
            white-space: pre-wrap;
            min-height: 120px;
        }

        .redd-signature {
            margin-top: 25px;
            color: #c79de1;
            font-size: 13px;
            letter-spacing: 1px;
            opacity: 0;
            transition: opacity 1s;
        }

        .redd-signature.visible {
            opacity: 1;
        }

        .redd-close {
            position: absolute;
            top: 15px;
            right: 18px;
            border: none;
            background: transparent;
            color: #d8b9e8;
            font-size: 24px;
            cursor: pointer;
        }

        .redd-particle {
            position: fixed;
            bottom: -50px;
            pointer-events: none;
            z-index: 10001;
            animation: reddFloat var(--time) linear forwards;
        }

        @keyframes reddFade {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes reddLetterIn {
            from {
                opacity: 0;
                transform: translateY(35px) scale(.94);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }

        @keyframes reddHeartbeat {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.16); }
        }

        @keyframes reddFloat {
            from {
                transform: translateY(0) rotate(0deg);
                opacity: 0;
            }
            15% { opacity: 1; }
            85% { opacity: 1; }
            to {
                transform: translateY(-115vh) rotate(35deg);
                opacity: 0;
            }
        }

        @media (prefers-reduced-motion: reduce) {
            .redd-letter,
            .redd-letter-icon,
            .redd-particle {
                animation: none;
            }
        }
    `;

    document.head.appendChild(estilo);

    // Coração secreto
    const botao = document.createElement("button");

    botao.id = "reddSecret";
    botao.textContent = "💜";
    botao.title = "Um pequeno segredo...";
    botao.setAttribute("aria-label", "Abrir mensagem secreta");

    document.body.appendChild(botao);

    // Cartinha
    const overlay = document.createElement("div");

    overlay.id = "reddSurprise";

    overlay.innerHTML = `
        <div class="redd-letter" role="dialog"
             aria-modal="true"
             aria-labelledby="reddTitle">
            <button class="redd-close"
                    aria-label="Fechar mensagem">×</button>

            <div class="redd-letter-icon">💜</div>

            <h2 id="reddTitle">Para minha maninha</h2>

            <p class="redd-message"></p>

            <div class="redd-signature">
                Com amor, Redd ❤️🥝
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    const mensagem =
        "Feito com muito carinho pelo seu irmão Redd mesmo sem muito tempo, você merece tudo de bom eu te amo maninha ❤️🥝";

    const texto = overlay.querySelector(".redd-message");
    const assinatura = overlay.querySelector(".redd-signature");

    let typingTimer = null;
    let particleTimer = null;
    let previousFocus = null;

    function criarParticula() {
        if (!overlay.classList.contains("active")) return;

        const particula = document.createElement("span");

        particula.className = "redd-particle";
        particula.textContent = Math.random() > .5 ? "💜" : "🥝";
        particula.style.left = `${Math.random() * 100}%`;
        particula.style.fontSize = `${16 + Math.random() * 22}px`;
        particula.style.setProperty(
            "--time",
            `${5 + Math.random() * 5}s`
        );

        overlay.appendChild(particula);

        setTimeout(() => particula.remove(), 10000);
    }

    function abrir() {
        if (overlay.classList.contains("active")) return;

        previousFocus = document.activeElement;
        overlay.classList.add("active");

        texto.textContent = "";
        assinatura.classList.remove("visible");

        overlay.querySelector(".redd-close").focus();

        let index = 0;

        typingTimer = setInterval(() => {
            if (index >= mensagem.length) {
                clearInterval(typingTimer);
                typingTimer = null;
                assinatura.classList.add("visible");
                return;
            }

            texto.textContent += mensagem[index];
            index++;
        }, 38);

        particleTimer = setInterval(criarParticula, 350);
    }

    function fechar() {
        overlay.classList.remove("active");

        clearInterval(typingTimer);
        clearInterval(particleTimer);

        typingTimer = null;
        particleTimer = null;

        overlay.querySelectorAll(".redd-particle").forEach(
            particula => particula.remove()
        );

        previousFocus?.focus();
    }

    botao.addEventListener("click", abrir);

    overlay.querySelector(".redd-close")
        .addEventListener("click", fechar);

    overlay.addEventListener("click", event => {
        if (event.target === overlay) fechar();
    });

    document.addEventListener("keydown", event => {
        if (!overlay.classList.contains("active")) return;

        if (event.key === "Escape") {
            fechar();
        }

        if (event.key === "Tab") {
            const closeButton = overlay.querySelector(".redd-close");
            event.preventDefault();
            closeButton.focus();
        }
    });

    console.log("Um segredo do Redd foi escondido. 💜");
})();
