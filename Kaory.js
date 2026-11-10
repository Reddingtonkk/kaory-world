
"use strict";

(() => {
    const $ = selector => document.querySelector(selector);

    const CONFIG = {
        avatarClosed: "/assets/kaory-fechada.png",
        avatarOpen: "/assets/kaory-aberta.png"
    };

    let soundEnabled = true;
    let audioContext = null;
    let mouthTimer = null;
    let typingToken = 0;
    let isTyping = false;
    let skipRequested = false;
    let sending = false;

    const heroCharacter = $("#heroCharacter");
    const fabCharacter = $("#chatFab img");
    const chatMessages = $("#chatMessages");
    const chatInput = $("#chatInput");
    const chatForm = $("#chatForm");
    const sendButton = chatForm?.querySelector('button[type="submit"]');

    const closedImage = new Image();
    closedImage.src = CONFIG.avatarClosed;

    const openImage = new Image();
    openImage.src = CONFIG.avatarOpen;

    function setMouth(open) {
        const src = open ? CONFIG.avatarOpen : CONFIG.avatarClosed;

        if (heroCharacter && heroCharacter.getAttribute("src") !== src) {
            heroCharacter.src = src;
        }

        if (fabCharacter && fabCharacter.getAttribute("src") !== src) {
            fabCharacter.src = src;
        }
    }

    function stopMouth() {
        if (mouthTimer !== null) {
            clearInterval(mouthTimer);
            mouthTimer = null;
        }

        setMouth(false);
    }

    function animateMouth() {
        stopMouth();

        let open = false;

        mouthTimer = setInterval(() => {
            open = !open;
            setMouth(open);
        }, 185);
    }

    function playBeep() {
        if (!soundEnabled) return;

        try {
            const AudioCtx =
                window.AudioContext || window.webkitAudioContext;

            if (!AudioCtx) return;

            if (!audioContext) audioContext = new AudioCtx();

            if (audioContext.state === "suspended") {
                audioContext.resume().catch(() => {});
            }

            if (audioContext.state !== "running") return;

            const now = audioContext.currentTime;
            const oscillator = audioContext.createOscillator();
            const gain = audioContext.createGain();

            oscillator.type = "square";
            oscillator.frequency.setValueAtTime(
                500 + Math.random() * 110,
                now
            );

            gain.gain.setValueAtTime(.0001, now);
            gain.gain.exponentialRampToValueAtTime(.011, now + .004);
            gain.gain.exponentialRampToValueAtTime(.0001, now + .04);

            oscillator.connect(gain);
            gain.connect(audioContext.destination);

            oscillator.start(now);
            oscillator.stop(now + .045);
        } catch (error) {
            console.warn("Som indisponível:", error);
        }
    }

    function limparRespostaKaory(texto) {
        return String(texto ?? "")
            .replace(/<KaoryYaay:\d+>/gi, "💜🥝")
            .replace(/<Kaory\w+:\d+>/gi, "🥝")
            .replace(/<a?:([a-zA-Z0-9_]+):\d+>/g, (_, nome) => {
                return `:${nome}:`;
            });
    }

    const delay = ms =>
        new Promise(resolve => setTimeout(resolve, ms));

    function createMessage(sender) {
        const element = document.createElement("div");
        element.className = `message ${sender}`;

        if (sender === "kaory") {
            const name = document.createElement("span");
            name.className = "message-name";
            name.textContent = "KAORY 🥝";
            element.appendChild(name);
        }

        const content = document.createElement("span");
        element.appendChild(content);

        chatMessages.appendChild(element);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        return content;
    }

    async function typeMessage(text) {
        const token = ++typingToken;
        const content = createMessage("kaory");
        const characters = Array.from(limparRespostaKaory(text));

        isTyping = true;
        skipRequested = false;
        animateMouth();

        try {
            for (let i = 0; i < characters.length; i++) {
                if (token !== typingToken) return;

                if (skipRequested) {
                    content.textContent = characters.join("");
                    break;
                }

                const char = characters[i];
                content.textContent += char;

                if (i % 4 === 0 && char.trim()) {
                    playBeep();
                }

                chatMessages.scrollTop = chatMessages.scrollHeight;

                let interval = 12;

                if (char === "." || char === "!" || char === "?") {
                    interval = 65;
                } else if (char === ",") {
                    interval = 35;
                }

                await delay(interval);
            }
        } finally {
            if (token === typingToken) {
                isTyping = false;
                stopMouth();
            }
        }
    }

    async function perguntarKaory(mensagem) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 60000);

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ mensagem }),
                signal: controller.signal
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.erro || "Erro ao conversar com a Kaory."
                );
            }

            return String(data.resposta ?? "");
        } finally {
            clearTimeout(timeout);
        }
    }

    function openChat() {
        const chat = $("#chatWindow");
        if (!chat) return;

        chat.classList.add("open");
        chat.setAttribute("aria-hidden", "false");

        if (!chatMessages.children.length) {
            typeMessage(
                "OIEEE!! 💜🥝 Bem-vindo ao meu mundinho! Quer conversar comigo?"
            );
        }

        chatInput?.focus();
    }

    function closeChat() {
        const chat = $("#chatWindow");
        if (!chat) return;

        chat.classList.remove("open");
        chat.setAttribute("aria-hidden", "true");

        skipRequested = true;
    }

    $("#chatFab")?.addEventListener("click", () => {
        $("#chatWindow")?.classList.contains("open")
            ? closeChat()
            : openChat();
    });

    $("#heroKaory")?.addEventListener("click", openChat);
    $("#closeChat")?.addEventListener("click", closeChat);

    $("#skipText")?.addEventListener("click", () => {
        skipRequested = true;
    });

    chatForm?.addEventListener("submit", async event => {
        event.preventDefault();

        const message = chatInput.value.trim();

        if (!message || sending) return;

        if (isTyping) {
            skipRequested = true;
            await delay(60);
        }

        chatInput.value = "";
        createMessage("user").textContent = message;

        sending = true;
        sendButton.disabled = true;

        try {
            const resposta = await perguntarKaory(message);
            await typeMessage(resposta);
        } catch (error) {
            console.error(error);

            const texto = error.name === "AbortError"
                ? "Demorei demais, kiwi! Tenta novamente. 💜"
                : "Minha magia deu uma travadinha! Tenta de novo. 🥝";

            await typeMessage(texto);
        } finally {
            sending = false;
            sendButton.disabled = false;
            chatInput.focus();
        }
    });

    $("#soundToggle")?.addEventListener("click", () => {
        soundEnabled = !soundEnabled;

        $("#soundToggle").textContent =
            soundEnabled ? "♫" : "♪";
    });

    $("#menuToggle")?.addEventListener("click", () => {
        $("#navigation")?.classList.toggle("open");
    });

    document.querySelectorAll(".nav a").forEach(link => {
        link.addEventListener("click", () => {
            $("#navigation")?.classList.remove("open");
        });
    });

    const lore = {
        title: "O clã Saito 🦊",
        html: `
            <p>Kaory Saito é uma das últimas integrantes
            de um clã extinto.</p>

            <p>Depois de uma longa guerra entre clãs,
            apenas Kaory e sua mãe sobreviveram.</p>

            <p>Entre suas habilidades estão
            <strong>Metamorfose, Persuasão,
            Feitiçaria e Ilusão.</strong></p>

            <p>Apesar de seu passado misterioso,
            Kaory encontrou um novo lugar
            entre seus queridos kiwis. 💜🥝</p>
        `
    };

    function openLore() {
        const backdrop = $("#modalBackdrop");
        const title = $("#modalTitle");
        const content = $("#modalContent");

        if (!backdrop || !title || !content) return;

        title.textContent = lore.title;
        content.innerHTML = lore.html;

        backdrop.classList.add("open");
        backdrop.setAttribute("aria-hidden", "false");
    }

    function closeModal() {
        const backdrop = $("#modalBackdrop");

        backdrop?.classList.remove("open");
        backdrop?.setAttribute("aria-hidden", "true");
    }

    document.querySelectorAll('[data-panel="lore"]').forEach(button => {
        button.addEventListener("click", openLore);
    });

    $("#modalClose")?.addEventListener("click", closeModal);

    $("#modalBackdrop")?.addEventListener("click", event => {
        if (event.target === $("#modalBackdrop")) {
            closeModal();
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeModal();
            closeChat();
        }
    });

    if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("visible");
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: .08 });

        document.querySelectorAll(".reveal").forEach(element => {
            observer.observe(element);
        });
    } else {
        document.querySelectorAll(".reveal").forEach(element => {
            element.classList.add("visible");
        });
    }

    console.log("Kaory World carregado! 💜🥝");
})();
