
"use strict";

(() => {
  const TOTAL = 5;
  const encontrados = new Set();

  const estilo = document.createElement("style");
  estilo.textContent = `
    .kiwi-secreto {
      position: absolute;
      z-index: 10;
      border: 0;
      background: #2b1d3c;
      border-radius: 50%;
      width: 42px;
      height: 42px;
      font-size: 24px;
      cursor: pointer;
      box-shadow: 0 8px 25px #0007;
      animation: kiwiFlutua 4s ease-in-out infinite;
      transition: filter .2s;
    }
    .kiwi-secreto:hover {
      filter: brightness(1.5);
    }
    .kiwi-contador {
      position: fixed;
      left: 20px;
      bottom: 20px;
      z-index: 35;
      background: #251831;
      color: #e7d8f6;
      border: 1px solid #73518d;
      border-radius: 13px;
      padding: 10px 15px;
      font-size: 12px;
      font-weight: 700;
      box-shadow: 0 10px 30px #0006;
    }
    .kiwi-aviso {
      position: fixed;
      left: 50%;
      top: 90px;
      transform: translateX(-50%);
      z-index: 100;
      background: #302040;
      color: white;
      border: 1px solid #ae86d5;
      border-radius: 14px;
      padding: 15px 22px;
      text-align: center;
      box-shadow: 0 18px 50px #0009;
      max-width: 90vw;
    }
    @keyframes kiwiFlutua {
      50% { translate: 0 -9px; }
    }
  `;
  document.head.appendChild(estilo);

  const contador = document.createElement("div");
  contador.className = "kiwi-contador";
  contador.textContent = `🥝 Kiwis: 0/${TOTAL}`;
  document.body.appendChild(contador);

  function aviso(texto) {
    const elemento = document.createElement("div");
    elemento.className = "kiwi-aviso";
    elemento.textContent = texto;
    document.body.appendChild(elemento);

    setTimeout(() => elemento.remove(), 3500);
  }

  const posicoes = [
    [8, 22],
    [89, 38],
    [16, 58],
    [81, 77],
    [48, 92]
  ];

  const camada = document.createElement("div");
  camada.style.position = "absolute";
  camada.style.inset = "0";
  camada.style.pointerEvents = "none";
  camada.style.zIndex = "10";
  document.body.appendChild(camada);

  posicoes.forEach(([x, y], indice) => {
    const kiwi = document.createElement("button");
    kiwi.className = "kiwi-secreto";
    kiwi.textContent = "🥝";
    kiwi.type = "button";
    kiwi.style.left = `${x}%`;
    kiwi.style.top = `${y}%`;
    kiwi.style.pointerEvents = "auto";
    kiwi.setAttribute("aria-label", "Encontrar kiwi secreto");

    kiwi.addEventListener("click", () => {
      if (encontrados.has(indice)) return;

      encontrados.add(indice);
      kiwi.remove();

      contador.textContent =
        `🥝 Kiwis: ${encontrados.size}/${TOTAL}`;

      if (encontrados.size === TOTAL) {
        aviso("💜 CONQUISTA DESBLOQUEADA: Guardião dos Kiwis!");
      } else {
        aviso(`🥝 Kiwi encontrado! Faltam ${TOTAL - encontrados.size}.`);
      }
    });

    camada.appendChild(kiwi);
  });

  let cliques = 0;

  document.querySelector("#heroKaory")
    ?.addEventListener("click", () => {
      cliques++;

      if (cliques === 5) {
        aviso("🦊 Ei! Tá gostando de clicar na raposinha?");
      }

      if (cliques === 10) {
        aviso("💜 CONQUISTA: Amigo da Kaory!");
      }
    });
})();
