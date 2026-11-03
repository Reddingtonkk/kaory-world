
"use strict";

const $ = selector => document.querySelector(selector);

const CONFIG = {
    twitch: "https://www.twitch.tv/kaory_saito",
    youtube: "https://www.youtube.com/@KaorySaito-r4h",
    discord: "https://discord.gg/vkCmjt7cBy",
    avatarClosed: "/assets/kaory-fechada.png",
    avatarOpen: "/assets/kaory-aberta.png"
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

[CONFIG.avatarClosed, CONFIG.avatarOpen].forEach(src => {
    const image = new Image();
    image.src = src;
});

function setMouth(open) {
    const src = open ? CONFIG.avatarOpen : CONFIG.avatarClosed;

    if (heroCharacter && !heroCharacter.src.endsWith(src)) {
        heroCharacter.src = src;
    }

    if (fabCharacter && !fabCharacter.src.endsWith(src)) {
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
    }, 155);
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

        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const now = audioContext.currentTime;

        oscillator.type = "square";
        oscillator.frequency.setValueAtTime(
            510 + Math.random() * 90,
            now
        );

        gain.gain.setValueAtTime(.0001, now);
        gain.gain.exponentialRampToValueAtTime(.013, now + .004);
        gain.gain.exponentialRampToValueAtTime(.0001, now + .035);

        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        oscillator.start(now);
        oscillator.stop(now + .04);
    } catch (error) {
        console.warn("Som de fala indisponível:", error);
    }
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

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

function updateChatStatus(text) {
    if (chatStatus) chatStatus.textContent = text;
}

function setSending(sending) {
    aguardandoResposta = sending;
    sendButton.disabled = sending;
    sendButton.style.opacity = sending ? ".5" : "1";
}

async function typeMessage(text) {
    const token = ++typingToken;
    const content = createMessage("kaory");
    const characters = Array.from(String(text ?? ""));

    isTyping = true;
    skipRequested = false;
    animateMouth();

    const interval = characters.length > 500 ? 30 : 42;
    let index = 0;

    try {
        while (index < characters.length) {
            if (token !== typingToken) return;

            if (skipRequested) {
                content.textContent = characters.join("");
                break;
            }

            const char = characters[index];
            content.textContent += char;
            index++;

            if (index % 4 === 0 && char.trim()) {
                playBeep();
            }

            chatMessages.scrollTop = chatMessages.scrollHeight;
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
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mensagem }),
            signal: controller.signal
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.erro || "Erro ao conversar com a Kaory.");
        }

        if (typeof data.resposta !== "string") {
            throw new Error("Resposta inválida do servidor.");
        }

        return data.resposta;
    } finally {
        clearTimeout(timeout);
    }
}

function openChat() {
    const chat = $("#chatWindow");

    chat.classList.add("open");
    chat.setAttribute("aria-hidden", "false");

    if (!chatMessages.children.length) {
        typeMessage(
            "OIEEE!! 💜🥝 Bem-vindo ao meu mundinho! Quer conversar comigo?"
        );
    }

    chatInput.focus();
}

function closeChat() {
    const chat = $("#chatWindow");

    chat.classList.remove("open");
    chat.setAttribute("aria-hidden", "true");

    skipRequested = true;
}

$("#chatFab").addEventListener("click", () => {
    $("#chatWindow").classList.contains("open")
        ? closeChat()
        : openChat();
});

$("#heroKaory").addEventListener("click", openChat);
$("#closeChat").addEventListener("click", closeChat);

$("#skipText").addEventListener("click", () => {
    skipRequested = true;
});

chatForm.addEventListener("submit", async event => {
    event.preventDefault();

    const message = chatInput.value.trim();

    if (!message || aguardandoResposta) return;

    if (isTyping) {
        skipRequested = true;
        await delay(55);
    }

    chatInput.value = "";
    createMessage("user").textContent = message;

    setSending(true);
    updateChatStatus("Kaory está pensando... 🥝");

    try {
        const resposta = await perguntarKaory(message);

        updateChatStatus("Kaory está respondendo... 💜");
        await typeMessage(resposta);
    } catch (error) {
        console.error(error);

        const texto = error.name === "AbortError"
            ? "Demorei demais dessa vez, kiwi! Tenta novamente. 💜"
            : "Minha magia deu uma travadinha. Tenta novamente! 🥝";

        await typeMessage(texto);
    } finally {
        setSending(false);
        updateChatStatus("Assistente virtual da Kaory 💜");
        chatInput.focus();
    }
});

$("#soundToggle").addEventListener("click", () => {
    soundEnabled = !soundEnabled;

    $("#soundToggle").textContent = soundEnabled ? "♫" : "♪";
    $("#soundToggle").title = soundEnabled
        ? "Desativar sons da fala"
        : "Ativar sons da fala";
});

$("#menuToggle").addEventListener("click", () => {
    $("#navigation").classList.toggle("open");
});

document.querySelectorAll(".nav a").forEach(link => {
    link.addEventListener("click", () => {
        $("#navigation").classList.remove("open");
    });
});

const panels = {
    lore: {
        title: "O clã Saito 🦊",
        html: `
            <p>Kaory Saito é uma das últimas integrantes de um clã extinto.</p>
            <p>Após uma longa guerra entre clãs, apenas ela e sua mãe sobreviveram.</p>
            <p>Suas habilidades incluem metamorfose, persuasão, feitiçaria e ilusão.</p>
        `
    }
};

function closePanel() {
    $("#modalBackdrop").classList.remove("open");
    $("#modalBackdrop").setAttribute("aria-hidden", "true");
}

document.querySelectorAll('[data-panel="lore"]').forEach(button => {
    button.addEventListener("click", () => {
        $("#modalTitle").textContent = panels.lore.title;
        $("#modalContent").innerHTML = panels.lore.html;
        $("#modalBackdrop").classList.add("open");
        $("#modalBackdrop").setAttribute("aria-hidden", "false");
    });
});

$("#modalClose").addEventListener("click", closePanel);

$("#modalBackdrop").addEventListener("click", event => {
    if (event.target === $("#modalBackdrop")) closePanel();
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        closePanel();
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
