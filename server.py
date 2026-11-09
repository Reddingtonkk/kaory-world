
import ast
import logging
import os
import secrets
import time

from collections import defaultdict, deque
from pathlib import Path
from threading import Lock

from dotenv import load_dotenv
from flask import (
    Flask,
    jsonify,
    request,
    send_from_directory
)
from google import genai
from google.genai import types
from werkzeug.exceptions import RequestEntityTooLarge

from ranking import ranking_bp, preparar_banco
from galeria import galeria_bp, preparar_galeria


# ==========================================
# CONFIGURAÇÕES
# ==========================================

BASE = Path(__file__).resolve().parent

load_dotenv(BASE / ".env")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)

API_KEY = os.getenv("GEMINI_API_KEY")

MODEL = os.getenv(
    "GEMINI_MODEL",
    "gemini-3-flash-preview"
)

if not API_KEY:
    raise RuntimeError(
        "Configure GEMINI_API_KEY no ambiente."
    )

# Limite real de imagem: 5 MB.
MAX_IMAGEM = 5 * 1024 * 1024

# Margem para multipart/form-data.
MAX_REQUISICAO = MAX_IMAGEM + 512 * 1024


# ==========================================
# PERSONALIDADE DA KAORY
# ==========================================

def carregar_personalidade():
    caminho = BASE / "bot.py"

    if not caminho.exists():
        raise RuntimeError(
            "Arquivo bot.py não encontrado."
        )

    codigo = caminho.read_text(
        encoding="utf-8"
    )

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
            and isinstance(
                valor.func.value,
                ast.Constant
            )
        ):
            return str(
                valor.func.value.value
            ).strip()

    raise RuntimeError(
        "SYSTEM_PROMPT não encontrado no bot.py."
    )


PERSONALIDADE = carregar_personalidade()

INSTRUCOES_SITE = """
Você conversa com visitantes do Kaory World.

Mantenha a personalidade e a lore oficial
da Kaory Saito.

Responda de maneira natural, divertida
e coerente com a personalidade original.

Não invente acontecimentos oficiais
nem dados pessoais.

Nunca envie identificadores internos de
emotes do Discord ou da Twitch.

Use emojis comuns no lugar deles.

Converse de forma natural e expressiva, sem encurtar respostas artificialmente.
Desenvolva os assuntos conforme a conversa pedir.
"""


# ==========================================
# FLASK E GEMINI
# ==========================================

client = genai.Client(
    api_key=API_KEY
)

app = Flask(
    __name__,
    static_folder=None
)

app.config.update(
    MAX_CONTENT_LENGTH=MAX_REQUISICAO,

    # Limite para campos comuns do formulário,
    # sem aumentar o limite do arquivo.
    MAX_FORM_MEMORY_SIZE=512 * 1024,

    # Evita formulários com campos demais.
    MAX_FORM_PARTS=20,

    JSON_AS_ASCII=False
)


# ==========================================
# RANKING E GALERIA
# ==========================================

app.register_blueprint(ranking_bp)
app.register_blueprint(galeria_bp)

preparar_banco()
preparar_galeria()


# ==========================================
# SEGURANÇA
# ==========================================

@app.after_request
def cabecalhos_seguranca(resposta):
    resposta.headers[
        "X-Content-Type-Options"
    ] = "nosniff"

    resposta.headers[
        "Referrer-Policy"
    ] = "strict-origin-when-cross-origin"

    resposta.headers[
        "X-Frame-Options"
    ] = "SAMEORIGIN"

    resposta.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    resposta.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self'; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' data:; "
        "media-src 'self'; "
        "connect-src 'self'; "
        "object-src 'none'; base-uri 'self'; frame-ancestors 'self'; form-action 'self'"
    )
    if os.getenv("RENDER") or request.is_secure:
        resposta.headers["Strict-Transport-Security"] = "max-age=31536000"
    return resposta


@app.before_request
def bloquear_origem_externa():
    if request.method not in ("POST", "PUT", "PATCH", "DELETE"):
        return None
    origem = request.headers.get("Origin")
    if origem:
        from urllib.parse import urlsplit
        try:
            parsed = urlsplit(origem)
            if (parsed.scheme not in ("http", "https") or
                parsed.netloc.lower() != request.host.lower() or
                parsed.path not in ("", "/") or parsed.query or parsed.fragment):
                return jsonify(erro="Origem não permitida."), 403
        except ValueError:
            return jsonify(erro="Origem inválida."), 403
    if request.headers.get("Sec-Fetch-Site") == "cross-site":
        return jsonify(erro="Requisição externa bloqueada."), 403
    return None


@app.errorhandler(RequestEntityTooLarge)
def arquivo_grande(error):
    tamanho = request.content_length

    app.logger.warning(
        "Upload recusado com HTTP 413. "
        "Tamanho da requisição: %s bytes. "
        "Limite: %s bytes. "
        "Content-Type: %s",
        tamanho,
        MAX_REQUISICAO,
        request.content_type
    )

    return jsonify(
        erro=(
            "O envio ultrapassou um limite "
            "de segurança do servidor. "
            "A imagem deve ter até 5 MB."
        )
    ), 413


# ==========================================
# ARQUIVOS DO SITE
# ==========================================

@app.get("/")
def inicio():
    return send_from_directory(
        BASE,
        "Kaory.HTML"
    )


@app.get("/<path:nome>")
def arquivos_site(nome):
    permitidos = {
        "Kaory.CSS",
        "Kaory.js",
        "Kaory-extras.js",
        "Kaory-magic.js",
        "Kaory-surpresa.js",
        "Kaory-musica.js",
        "Kaory-entrada.js",
        "Kaory-diversao.js",
        "Kaory-galeria.js",
    }

    if nome not in permitidos:
        return jsonify(
            erro="Arquivo não encontrado."
        ), 404

    return send_from_directory(
        BASE,
        nome
    )


@app.get("/assets/<path:nome>")
def assets(nome):
    return send_from_directory(
        BASE / "assets",
        nome
    )


# ==========================================
# CHAT DA KAORY
# ==========================================

historicos = defaultdict(
    lambda: deque(maxlen=16)
)

ultimos_pedidos = {}

controle = Lock()


@app.post("/api/chat")
def conversar():
    dados = request.get_json(
        silent=True
    ) or {}

    mensagem = dados.get(
        "mensagem",
        ""
    )

    if not isinstance(mensagem, str):
        return jsonify(
            erro="Mensagem inválida."
        ), 400

    mensagem = mensagem.strip()

    if not mensagem or len(mensagem) > 1500:
        return jsonify(
            erro=(
                "Envie uma mensagem "
                "de até 1500 caracteres."
            )
        ), 400

    sessao = request.cookies.get(
        "kaory_session"
    )

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
        # Mantém a memória limitada mesmo com cookies descartáveis.
        if len(ultimos_pedidos) > 3000:
            antigos = sorted(ultimos_pedidos, key=ultimos_pedidos.get)[:1000]
            for chave in antigos:
                ultimos_pedidos.pop(chave, None)
                historicos.pop(chave, None)
        anterior = ultimos_pedidos.get(
            sessao,
            0
        )

        if agora - anterior < 3:
            return jsonify(
                erro=(
                    "Calma, kiwi! Aguarde "
                    "um pouquinho. 🥝"
                )
            ), 429

        ultimos_pedidos[sessao] = agora

        historico = list(
            historicos[sessao]
        )

    conteudos = []

    for item in historico:
        conteudos.append(
            types.Content(
                role=item["role"],
                parts=[
                    types.Part(
                        text=item["texto"]
                    )
                ]
            )
        )

    conteudos.append(
        types.Content(
            role="user",
            parts=[
                types.Part(
                    text=mensagem
                )
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
                max_output_tokens=4096
            )
        )

        resposta = (
            resultado.text or ""
        ).strip()

        if not resposta:
            resposta = (
                "Minha magia falhou "
                "por um instante! 🥝"
            )

    except Exception:
        app.logger.exception(
            "Erro ao consultar Gemini."
        )

        return jsonify(
            erro=(
                "Minha magia deu uma "
                "travadinha. "
                "Tenta novamente! 🥝"
            )
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

    retorno = jsonify(
        resposta=resposta
    )

    if nova_sessao:
        retorno.set_cookie(
            "kaory_session",
            sessao,
            httponly=True,
            samesite="Lax",
            secure=bool(os.getenv("RENDER")) or request.is_secure,
            max_age=86400
        )

    return retorno


# ==========================================
# INICIALIZAÇÃO
# ==========================================

if __name__ == "__main__":
    print()
    print("================================")
    print("       KAORY WORLD ONLINE")
    print("================================")
    print()
    print("http://127.0.0.1:5000")
    print()
    print("Gemini, ranking e galeria carregados.")
    print("Limite de imagem: 5 MB.")
    print()

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=False
    )
