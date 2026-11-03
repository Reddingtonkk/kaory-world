
"use strict";

const $ = (selector) => document.querySelector(selector);

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

const heroCharacter = $("#heroCharacter");
const fabCharacter = $("#chatFab img");

function setMouth(open) {
  const src = open ? CONFIG.avatarOpen : CONFIG.avatarClosed;
  heroCharacter.src = src;
  fabCharacter.src = src;
}

function playBeep() {
  if (!soundEnabled) return;

  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    if (!audioContext) audioContext = new AudioCtx();
    if (audioContext.state === "suspended") audioContext.resume();

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;

    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(520 + Math.random() * 90, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.018, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.04);
  } catch (error) {
    console.warn("Áudio indisponível:", error);
  }
}

function animateMouth() {
  clearInterval(mouthTimer);
  let open = false;

  mouthTimer = setInterval(() => {
    open = !open;
    setMouth(open);
  }, 130);
}

function stopMouth() {
  clearInterval(mouthTimer);
  mouthTimer = null;
  setMouth(false);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const chatMessages = $("#chatMessages");

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
  const characters = Array.from(text);

  isTyping = true;
  skipRequested = false;
  animateMouth();

  for (let i = 0; i < characters.length; i++) {
    if (token !== typingToken) return;

    if (skipRequested) {
      content.textContent = text;
      break;
    }

    content.textContent += characters[i];

    if (i % 3 === 0 && characters[i].trim()) {
      playBeep();
    }

    chatMessages.scrollTop = chatMessages.scrollHeight;
    await delay(/[.!?]/.test(characters[i]) ? 170 : 29);
  }

  if (token === typingToken) {
    isTyping = false;
    stopMouth();
  }
}

function addUserMessage(text) {
  createMessage("user").textContent = text;
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

const demoResponses = [
  "OIEEE, KIWI!! 🥝💜 Que bom te ver por aqui!",
  "Hmmm... isso parece suspeito. Mas eu gostei! KKKKK",
  "Você sabia que os kiwis são parte importantíssima desse mundinho? 💜",
  "Eu sou a Kaory Saito! Prazer em te conhecer, kiwi!",
  "Se encontrar um kiwi perdido por aí, cuida bem dele, tá? 🥝"
];

function demoReply(message) {
  const normalized = message.toLowerCase();

  if (normalized.includes("oi") || normalized.includes("olá")) {
    return demoResponses[0];
  }

  if (normalized.includes("kiwi")) {
    return demoResponses[2];
  }

  if (normalized.includes("quem é") || normalized.includes("seu nome")) {
    return demoResponses[3];
  }

  return demoResponses[Math.floor(Math.random() * demoResponses.length)];
}

function openChat() {
  $("#chatWindow").classList.add("open");
  $("#chatWindow").setAttribute("aria-hidden", "false");

  if (!chatMessages.children.length) {
    typeMessage("OIEEE!! 💜🥝 Bem-vindo ao meu mundinho! Quer conversar comigo?");
  }

  $("#chatInput").focus();
}

function closeChat() {
  $("#chatWindow").classList.remove("open");
  $("#chatWindow").setAttribute("aria-hidden", "true");
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
  popKiwis(window.innerWidth / 2, window.innerHeight / 2, 8);
  openChat();
});

$("#closeChat").addEventListener("click", closeChat);

$("#skipText").addEventListener("click", () => {
  skipRequested = true;
});


$("#chatForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const input = $("#chatInput");
    const message = input.value.trim();

    if (!message || isTyping) return;

    input.value = "";
    addUserMessage(message);

    try {
        const resposta = await perguntarKaory(message);
        await typeMessage(resposta);
    } catch (erro) {
        console.error("Erro no chat:", erro);

        await typeMessage(
            "Opa! Minha magia deu uma travadinha. Tenta de novo, kiwi! 🥝"
        );
    }
});


$("#soundToggle").addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  $("#soundToggle").textContent = soundEnabled ? "♫" : "♪̸";
  $("#soundToggle").setAttribute(
    "aria-label",
    soundEnabled ? "Desativar sons" : "Ativar sons"
  );
});

$("#menuToggle").addEventListener("click", () => {
  const nav = $("#navigation");
  nav.classList.toggle("open");
  $("#menuToggle").setAttribute(
    "aria-label",
    nav.classList.contains("open") ? "Fechar menu" : "Abrir menu"
  );
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
      <p>Seu universo guarda muitas histórias que ainda vamos descobrir.</p>
    `
  },
  emotes: {
    title: "Emotes da Kaory 💜",
    html: `
      <p>Um espaço reservado para os emotes oficiais da Kaory.</p>
      <p>Em breve vamos colocar aqui uma galeria interativa com os arquivos originais.</p>
      <p>🥝 💜 🦊 ✨</p>
    `
  },
  clips: {
    title: "Momentos inesquecíveis 🎬",
    html: `
      <p>Um cantinho especial para os melhores clipes das lives.</p>
      <p>Sustos, gritos, risadas e aqueles momentos que só a Kaory consegue proporcionar.</p>
      <p>A galeria de vídeos será adicionada nas próximas etapas.</p>
    `
  }
};

function openPanel(name) {
  const panel = panels[name];
  if (!panel) return;

  $("#modalTitle").textContent = panel.title;
  $("#modalContent").innerHTML = panel.html;
  $("#modalBackdrop").classList.add("open");
  $("#modalBackdrop").setAttribute("aria-hidden", "false");
}

function closePanel() {
  $("#modalBackdrop").classList.remove("open");
  $("#modalBackdrop").setAttribute("aria-hidden", "true");
}

document.querySelectorAll("[data-panel]").forEach(button => {
  button.addEventListener("click", () => {
    openPanel(button.dataset.panel);
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

document.querySelectorAll("[data-link]").forEach(link => {
  const type = link.dataset.link;
  if (CONFIG[type]) link.href = CONFIG[type];
});

$("#discordLink").addEventListener("click", event => {
  if (!CONFIG.discord) {
    event.preventDefault();
    openPanel("lore");
    $("#modalTitle").textContent = "Comunidade 💜";
    $("#modalContent").textContent =
      "O convite do Discord ainda será adicionado ao site.";
  }
});

if (CONFIG.discord) {
  $("#discordLink").href = CONFIG.discord;
  $("#discordLink").target = "_blank";
  $("#discordLink").rel = "noopener noreferrer";
  $("#discordHint").textContent = "Te esperamos por lá! 💜";
}

function popKiwis(x, y, amount = 5) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  for (let i = 0; i < amount; i++) {
    const kiwi = document.createElement("span");
    kiwi.className = "kiwi-pop";
    kiwi.textContent = i % 3 === 0 ? "💜" : "🥝";

    kiwi.style.left = `${x + (Math.random() - .5) * 90}px`;
    kiwi.style.top = `${y + (Math.random() - .5) * 45}px`;
    kiwi.style.setProperty("--dx", `${(Math.random() - .5) * 150}px`);

    $("#kiwiLayer").appendChild(kiwi);
    setTimeout(() => kiwi.remove(), 1100);
  }
}

$("#heroKaory").addEventListener("mouseenter", () => {
  $("#heroBubble").textContent = "OIEEE, KIWI!! 💜";
});

$("#heroKaory").addEventListener("mouseleave", () => {
  $("#heroBubble").textContent = "Oieee! Clica em mim! 🥝";
});

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.08 });

document.querySelectorAll(".reveal").forEach(element => {
  observer.observe(element);
});

console.log("🥝 Kaory World carregado com sucesso!");

async function perguntarKaory(mensagem) {
  const respostaHTTP = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ mensagem })
  });

  const dados = await respostaHTTP.json();

  if (!respostaHTTP.ok) {
    throw new Error(
      dados.erro || "Não consegui conversar com a Kaory."
    );
  }

  return dados.resposta;
}
