
import ast
import os
import time
import secrets

from collections import defaultdict, deque
from pathlib import Path
from threading import Lock

from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory
from google import genai
from google.genai import types


BASE = Path(__file__).resolve().parent

load_dotenv(BASE / ".env")

API_KEY = os.getenv("GEMINI_API_KEY")
MODEL = os.getenv("GEMINI_MODEL", "gemini-3-flash-preview")

if not API_KEY:
    raise RuntimeError(
        "Configure GEMINI_API_KEY no arquivo .env"
    )


# ==========================================
# PERSONALIDADE DA KAORY
# ==========================================

def carregar_personalidade():
    caminho = BASE / "bot.py"

    if not caminho.exists():
        raise RuntimeError("Arquivo bot.py não encontrado.")

    codigo = caminho.read_text(encoding="utf-8")
    arvore = ast.parse(codigo)

    for no in arvore.body:
        if not isinstance(no, ast.Assign):
            continue

        encontrou = any(
            isinstance(alvo, ast.Name)
            and alvo.id == "SYSTEM_PROMPT"
            for alvo in no.targets
        )

        if not encontrou:
            continue

        valor = no.value

        if isinstance(valor, ast.Constant):
            return str(valor.value).strip()

        if (
            isinstance(valor, ast.Call)
            and isinstance(valor.func, ast.Attribute)
            and valor.func.attr == "strip"
            and isinstance(valor.func.value, ast.Constant)
        ):
            return str(valor.func.value.value).strip()

    raise RuntimeError(
        "SYSTEM_PROMPT não encontrado no bot.py"
    )


PERSONALIDADE = carregar_personalidade()

INSTRUCOES_SITE = """
Você está conversando com visitantes do site Kaory World,
e não dentro do Discord.

Mantenha integralmente a personalidade e a lore oficial
da Kaory Saito.

Não use códigos de emojis exclusivos do Discord.

Responda de maneira natural, divertida e coerente
com a personalidade original da Kaory.

Prefira respostas concisas e adequadas a uma janela
de chat. Desenvolva mais quando o visitante pedir.

Não invente acontecimentos oficiais ou dados pessoais.
"""


# ==========================================
# GEMINI E FLASK
# ==========================================

client = genai.Client(api_key=API_KEY)

app = Flask(__name__, static_folder=None)

historicos = defaultdict(lambda: deque(maxlen=16))
ultimos_pedidos = {}

controle = Lock()


# ==========================================
# ROTAS DO SITE
# ==========================================

@app.get("/")
def inicio():
    return send_from_directory(BASE, "Kaory.HTML")


@app.get("/Kaory.CSS")
def css():
    return send_from_directory(BASE, "Kaory.CSS")


@app.get("/Kaory.js")
def javascript():
    return send_from_directory(BASE, "Kaory.js")


@app.get("/Kaory-extras.js")
def extras():
    return send_from_directory(BASE, "Kaory-extras.js")


@app.get("/Kaory-magic.js")
def magic():
    return send_from_directory(BASE, "Kaory-magic.js")


@app.get("/Kaory-surpresa.js")
def surpresa():
    return send_from_directory(BASE, "Kaory-surpresa.js")


@app.get("/Kaory-musica.js")
def musica():
    return send_from_directory(BASE, "Kaory-musica.js")


# Nova tela de entrada
@app.get("/Kaory-entrada.js")
def entrada():
    return send_from_directory(BASE, "Kaory-entrada.js")


@app.get("/assets/<path:nome>")
def assets(nome):
    return send_from_directory(BASE / "assets", nome)


# ==========================================
# CHAT COM GEMINI
# ==========================================

@app.post("/api/chat")
def conversar():
    dados = request.get_json(silent=True) or {}

    mensagem = dados.get("mensagem", "")

    if not isinstance(mensagem, str):
        return jsonify(
            erro="Mensagem inválida."
        ), 400

    mensagem = mensagem.strip()

    if not mensagem or len(mensagem) > 1500:
        return jsonify(
            erro="Envie uma mensagem de até 1500 caracteres."
        ), 400

    sessao = request.cookies.get("kaory_session")

    nova_sessao = (
        not sessao
        or len(sessao) != 32
        or any(
            c not in "0123456789abcdef"
            for c in sessao
        )
    )

    if nova_sessao:
        sessao = secrets.token_hex(16)

    agora = time.monotonic()

    with controle:
        anterior = ultimos_pedidos.get(sessao, 0)

        if agora - anterior < 3:
            return jsonify(
                erro="Calma, kiwi! Aguarde um pouquinho. 🥝"
            ), 429

        ultimos_pedidos[sessao] = agora
        historico = list(historicos[sessao])

    conteudos = []

    for item in historico:
        conteudos.append(
            types.Content(
                role=item["role"],
                parts=[
                    types.Part(text=item["texto"])
                ]
            )
        )

    conteudos.append(
        types.Content(
            role="user",
            parts=[
                types.Part(text=mensagem)
            ]
        )
    )

    try:
        resultado = client.models.generate_content(
            model=MODEL,
            contents=conteudos,
            config=types.GenerateContentConfig(
                system_instruction=(
                    PERSONALIDADE
                    + "\n\n"
                    + INSTRUCOES_SITE
                ),
                max_output_tokens=600
            )
        )

        resposta = (resultado.text or "").strip()

        if not resposta:
            resposta = (
                "Minha magia falhou por um instante! 🥝"
            )

    except Exception:
        app.logger.exception("Falha ao consultar Gemini")

        return jsonify(
            erro="Minha magia deu uma travadinha. Tenta novamente!"
        ), 502

    with controle:
        historicos[sessao].append({
            "role": "user",
            "texto": mensagem
        })

        historicos[sessao].append({
            "role": "model",
            "texto": resposta
        })

    retorno = jsonify(resposta=resposta)

    if nova_sessao:
        retorno.set_cookie(
            "kaory_session",
            sessao,
            httponly=True,
            samesite="Lax",
            secure=request.is_secure,
            max_age=86400
        )

    return retorno


# ==========================================
# INICIALIZAÇÃO
# ==========================================

if __name__ == "__main__":
    print()
    print("======================================")
    print("          KAORY WORLD ONLINE")
    print("======================================")
    print()
    print("Site: http://127.0.0.1:5000")
    print("Gemini configurado")
    print("Personalidade da Kaory carregada")
    print("Chuva de kiwis disponível")
    print("Memes configurados")
    print("Cartinha secreta disponível")
    print("Música ambiente disponível")
    print("Tela de entrada disponível")
    print()

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=False
    )
