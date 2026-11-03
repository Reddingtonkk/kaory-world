
"use strict";

const $ = selector => document.querySelector(selector);

const CONFIG = {
    twitch: "https://www.twitch.tv/kaory_saito",
    youtube: "https://www.youtube.com/@KaorySaito-r4h",
    discord: "https://discord.gg/vkCmjt7cBy",
    clips: "https://www.twitch.tv/kaory_saito/clips?range=30d",
    avatarClosed: "assets/kaory-fechada.png",
    avatarOpen: "assets/kaory-aberta.png"
};

let soundEnabled = true;
let audioContext = null;
let isTyping = false;
let skipRequested = false;
let mouthTimer = null;
let typingToken = 0;
let aguardandoResposta = false;

const heroCharacter = $("#heroCharacter");
const fabCharacter = $("#chatFab img");
const chatMessages = $("#chatMessages");
const chatInput = $("#chatInput");
const chatStatus = $("#chatStatus");
const chatForm = $("#chatForm");
const sendButton = chatForm.querySelector('button[type="submit"]');

// Pré-carrega as duas imagens da Kaory.
const avatarFechado = new Image();
avatarFechado.src = CONFIG.avatarClosed;

const avatarAberto = new Image();
avatarAberto.src = CONFIG.avatarOpen;

avatarAberto.addEventListener("error", () => {
    console.error(
        "Imagem da boca aberta não encontrada:",
        CONFIG.avatarOpen
    );
});

// ========================================
// ANIMAÇÃO DA BOCA
// ========================================

function setMouth(open) {
    const src = open
        ? CONFIG.avatarOpen
        : CONFIG.avatarClosed;

    if (heroCharacter && !heroCharacter.src.endsWith(src)) {
        heroCharacter.src = src;
    }

    if (fabCharacter && !fabCharacter.src.endsWith(src)) {
        fabCharacter.src = src;
    }
}

function animateMouth() {
    stopMouth();

    let open = false;

    mouthTimer = setInterval(() => {
        open = !open;
        setMouth(open);
    }, 135);
}

function stopMouth() {
    if (mouthTimer !== null) {
        clearInterval(mouthTimer);
        mouthTimer = null;
    }

    setMouth(false);
}

// ========================================
// SOM DE FALA ESTILO POKÉMON
// ========================================

function playBeep() {
    if (!soundEnabled) return;

    try {
        const AudioCtx =
            window.AudioContext ||
            window.webkitAudioContext;

        if (!AudioCtx) return;

        if (!audioContext) {
            audioContext = new AudioCtx();
        }

        if (audioContext.state === "suspended") {
            audioContext.resume().catch(() => {});
        }

        if (audioContext.state !== "running") {
            return;
        }

        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const now = audioContext.currentTime;

        oscillator.type = "square";

        oscillator.frequency.setValueAtTime(
            520 + Math.random() * 90,
            now
        );

        gain.gain.setValueAtTime(0.0001, now);

        gain.gain.exponentialRampToValueAtTime(
            0.018,
            now + 0.004
        );

        gain.gain.exponentialRampToValueAtTime(
            0.0001,
            now + 0.035
        );

        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        oscillator.start(now);
        oscillator.stop(now + 0.04);

    } catch (error) {
        console.warn("Áudio da Kaory indisponível:", error);
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ========================================
// MENSAGENS DO CHAT
// ========================================

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

function addUserMessage(text) {
    createMessage("user").textContent = text;
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function updateChatStatus(text) {
    if (chatStatus) {
        chatStatus.textContent = text;
    }
}

function setSending(sending) {
    aguardandoResposta = sending;

    if (sendButton) {
        sendButton.disabled = sending;
        sendButton.style.opacity = sending ? ".5" : "1";
        sendButton.style.cursor = sending
            ? "wait"
            : "pointer";
    }
}

// ========================================
// DIGITAÇÃO ANIMADA
// ========================================

async function typeMessage(text) {
    const token = ++typingToken;
    const content = createMessage("kaory");
    const characters = Array.from(String(text ?? ""));

    isTyping = true;
    skipRequested = false;

    animateMouth();

    const longText = characters.length > 500;
    const interval = longText ? 12 : 22;
    const chunkSize = longText ? 5 : 2;

    let index = 0;

    try {
        while (index < characters.length) {
            if (token !== typingToken) {
                return;
            }

            if (skipRequested) {
                content.textContent = characters.join("");
                break;
            }

            const chunk = characters
                .slice(index, index + chunkSize)
                .join("");

            content.textContent += chunk;
            index += chunkSize;

            if (index % 12 < chunkSize && chunk.trim()) {
                playBeep();
            }

            chatMessages.scrollTop =
                chatMessages.scrollHeight;

            await delay(interval);
        }
    } finally {
        if (token === typingToken) {
            isTyping = false;
            stopMouth();
        }
    }
}

// ========================================
// GEMINI
// ========================================

async function perguntarKaory(mensagem) {
    const controller = new AbortController();

    // Evita que uma requisição fique presa para sempre.
    const timeout = setTimeout(() => {
        controller.abort();
    }, 60000);

    try {
        const respostaHTTP = await fetch("/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ mensagem }),
            signal: controller.signal
        });

        const dados = await respostaHTTP.json();

        if (!respostaHTTP.ok) {
            throw new Error(
                dados.erro ||
                "Não consegui conversar com a Kaory."
            );
        }

        if (typeof dados.resposta !== "string") {
            throw new Error("Resposta inválida do servidor.");
        }

        return dados.resposta;
    } finally {
        clearTimeout(timeout);
    }
}

// ========================================
// ABRIR E FECHAR CHAT
// ========================================

function openChat() {
    const windowChat = $("#chatWindow");

    windowChat.classList.add("open");
    windowChat.setAttribute("aria-hidden", "false");

    if (!chatMessages.children.length) {
        typeMessage(
            "OIEEE!! 💜🥝 Bem-vindo ao meu mundinho! " +
            "Quer conversar comigo?"
        );
    }

    chatInput.focus();
}

function closeChat() {
    const windowChat = $("#chatWindow");

    windowChat.classList.remove("open");
    windowChat.setAttribute("aria-hidden", "true");

    skipRequested = true;
}

$("#chatFab").addEventListener("click", () => {
    if ($("#chatWindow").classList.contains("open")) {
        closeChat();
    } else {
        openChat();
    }
});

$("#heroKaory").addEventListener("click", () => {
    popKiwis(
        window.innerWidth / 2,
        window.innerHeight / 2,
        8
    );

    openChat();
});

$("#closeChat").addEventListener("click", closeChat);

$("#skipText").addEventListener("click", () => {
    skipRequested = true;
});

// ========================================
// ENVIAR MENSAGEM
// ========================================

chatForm.addEventListener("submit", async event => {
    event.preventDefault();

    const message = chatInput.value.trim();

    if (!message || aguardandoResposta) return;

    if (isTyping) {
        skipRequested = true;

        // Aguarda o efeito anterior terminar.
        await delay(40);
    }

    chatInput.value = "";
    addUserMessage(message);

    setSending(true);
    updateChatStatus("Kaory está pensando... 🥝");

    try {
        const resposta = await perguntarKaory(message);

        updateChatStatus("Kaory está respondendo... 💜");

        await typeMessage(resposta);

    } catch (error) {
        console.error("Erro no chat da Kaory:", error);

        updateChatStatus("Conexão indisponível");

        let mensagemErro =
            "Opa, kiwi! Minha magia deu uma travadinha. " +
            "Tenta novamente daqui a pouco! 🥝💜";

        if (error.name === "AbortError") {
            mensagemErro =
                "A magia demorou demais dessa vez! " +
                "Tenta novamente, kiwi! 💜";
        } else if (error.message) {
            // Exibe o erro informado pelo nosso servidor.
            mensagemErro = error.message;
        }

        await typeMessage(mensagemErro);

    } finally {
        setSending(false);

        updateChatStatus(
            "Assistente virtual da Kaory 💜"
        );

        if ($("#chatWindow").classList.contains("open")) {
            chatInput.focus();
        }
    }
});

// ========================================
// CONTROLE DOS SONS DE FALA
// ========================================

$("#soundToggle").addEventListener("click", () => {
    soundEnabled = !soundEnabled;

    $("#soundToggle").textContent = soundEnabled
        ? "♫"
        : "♪̸";

    $("#soundToggle").setAttribute(
        "aria-label",
        soundEnabled
            ? "Desativar sons"
            : "Ativar sons"
    );
});

// ========================================
// MENU MOBILE
// ========================================

$("#menuToggle").addEventListener("click", () => {
    const nav = $("#navigation");

    nav.classList.toggle("open");

    $("#menuToggle").setAttribute(
        "aria-label",
        nav.classList.contains("open")
            ? "Fechar menu"
            : "Abrir menu"
    );
});

document.querySelectorAll(".nav a").forEach(link => {
    link.addEventListener("click", () => {
        $("#navigation").classList.remove("open");
    });
});

// ========================================
// PAINÉIS DO SITE
// ========================================

const panels = {
    lore: {
        title: "O clã Saito 🦊",
        html: `
            <p>
                Kaory Saito é uma das últimas integrantes
                de um clã extinto.
            </p>
            <p>
                Após uma longa guerra entre clãs,
                apenas ela e sua mãe sobreviveram.
            </p>
            <p>
                Suas habilidades incluem metamorfose,
                persuasão, feitiçaria e ilusão.
            </p>
            <p>
                Seu universo guarda muitas histórias
                que ainda vamos descobrir.
            </p>
        `
    },

    emotes: {
        title: "Emotes da Kaory 💜",
        html: `
            <p>
                Um espaço reservado para os emotes
                oficiais da Kaory.
            </p>
            <p>
                Em breve vamos colocar aqui uma galeria
                interativa com os arquivos originais.
            </p>
            <p>🥝 💜 🦊 ✨</p>
        `
    },

    clips: {
        title: "Momentos inesquecíveis 🎬",
        html: `
            <p>
                Um cantinho especial para os melhores
                clipes das lives.
            </p>
            <p>
                Sustos, gritos, risadas e aqueles momentos
                que só a Kaory consegue proporcionar.
            </p>
            <p>
                A galeria de vídeos será adicionada
                nas próximas etapas.
            </p>
        `
    }
};

function openPanel(name) {
    const panel = panels[name];

    if (!panel) return;

    $("#modalTitle").textContent = panel.title;
    $("#modalContent").innerHTML = panel.html;

    $("#modalBackdrop").classList.add("open");

    $("#modalBackdrop").setAttribute(
        "aria-hidden",
        "false"
    );
}

function closePanel() {
    $("#modalBackdrop").classList.remove("open");

    $("#modalBackdrop").setAttribute(
        "aria-hidden",
        "true"
    );
}

document.querySelectorAll("[data-panel]").forEach(button => {
    button.addEventListener("click", () => {
        openPanel(button.dataset.panel);
    });
});

$("#modalClose").addEventListener("click", closePanel);

$("#modalBackdrop").addEventListener("click", event => {
    if (event.target === $("#modalBackdrop")) {
        closePanel();
    }
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        closePanel();
        closeChat();
    }
});

// ========================================
// LINKS OFICIAIS
// ========================================

document.querySelectorAll("[data-link]").forEach(link => {
    const type = link.dataset.link;

    if (CONFIG[type]) {
        link.href = CONFIG[type];
    }
});

if (CONFIG.discord) {
    const discordLink = $("#discordLink");

    discordLink.href = CONFIG.discord;
    discordLink.target = "_blank";
    discordLink.rel = "noopener noreferrer";

    $("#discordHint").textContent =
        "Te esperamos por lá! 💜";
}

// ========================================
// PARTÍCULAS DE KIWIS
// ========================================

function popKiwis(x, y, amount = 5) {
    if (
        window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches
    ) {
        return;
    }

    const layer = $("#kiwiLayer");

    for (let i = 0; i < amount; i++) {
        const kiwi = document.createElement("span");

        kiwi.className = "kiwi-pop";
        kiwi.textContent = i % 3 === 0 ? "💜" : "🥝";

        kiwi.style.left = `${
            x + (Math.random() - 0.5) * 90
        }px`;

        kiwi.style.top = `${
            y + (Math.random() - 0.5) * 45
        }px`;

        kiwi.style.setProperty(
            "--dx",
            `${(Math.random() - 0.5) * 150}px`
        );

        layer.appendChild(kiwi);

        setTimeout(() => kiwi.remove(), 1100);
    }
}

$("#heroKaory").addEventListener("mouseenter", () => {
    $("#heroBubble").textContent = "OIEEE, KIWI!! 💜";
});

$("#heroKaory").addEventListener("mouseleave", () => {
    $("#heroBubble").textContent =
        "Oieee! Clica em mim! 🥝";
});

// ========================================
// ANIMAÇÕES DE ENTRADA
// ========================================

if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("visible");
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.08
    });

    document.querySelectorAll(".reveal").forEach(element => {
        observer.observe(element);
    });
} else {
    document.querySelectorAll(".reveal").forEach(element => {
        element.classList.add("visible");
    });
}

console.log("🥝 Kaory World carregado com sucesso!");
console.log("💜 Chat Gemini e animação da boca preparados!");
