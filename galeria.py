
import hashlib
import hmac
import io
import logging
import os
import secrets
import time

from collections import defaultdict, deque
from datetime import datetime, timezone
from threading import Lock

import psycopg
from flask import Blueprint, Response, jsonify, request
from PIL import Image, ImageOps, UnidentifiedImageError


galeria_bp = Blueprint("galeria", __name__)

MAX_UPLOAD = 5 * 1024 * 1024
MAX_IMAGE = 1024 * 1024
MAX_PIXELS = 12_000_000
MAX_SIDE = 1600
MAX_ARTES = 60
MAX_UPLOADS_DIA = 15
MAX_UPLOADS_IP_DIA = 3

Image.MAX_IMAGE_PIXELS = MAX_PIXELS

rate_lock = Lock()
tentativas = defaultdict(deque)


def conectar():
    url = os.environ.get("DATABASE_URL")

    if not url:
        raise RuntimeError("DATABASE_URL não configurada.")

    return psycopg.connect(url, connect_timeout=10)


def preparar_galeria():
    if not os.getenv("DATABASE_URL"):
        logging.warning(
            "Galeria: DATABASE_URL não configurada."
        )
        return

    try:
        with conectar() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS kaory_fanarts (
                        id BIGSERIAL PRIMARY KEY,
                        nick VARCHAR(30) NOT NULL,
                        titulo VARCHAR(80) NOT NULL,
                        imagem BYTEA NOT NULL,
                        tamanho INTEGER NOT NULL,
                        ip_hash CHAR(64) NOT NULL,
                        criada_em TIMESTAMPTZ
                            NOT NULL DEFAULT NOW()
                    )
                """)

                cur.execute("ALTER TABLE kaory_fanarts ADD COLUMN IF NOT EXISTS status VARCHAR(12) NOT NULL DEFAULT 'aprovada'")
                cur.execute("""
                    CREATE INDEX IF NOT EXISTS
                    idx_kaory_fanarts_data
                    ON kaory_fanarts (criada_em DESC)
                """)

        logging.info("Galeria da Kaory preparada.")

    except Exception:
        logging.exception("Erro ao preparar galeria.")


def erro(mensagem, status=400):
    return jsonify(erro=mensagem), status



def verificar_origem():
    from urllib.parse import urlsplit

    origem = request.headers.get("Origin", "")

    try:
        parsed = urlsplit(origem)

        if parsed.scheme not in ("http", "https"):
            return False

        if parsed.username or parsed.password:
            return False

        if parsed.path not in ("", "/"):
            return False

        if parsed.query or parsed.fragment:
            return False

        return parsed.netloc.lower() == request.host.lower()

    except ValueError:
        return False



def identidade_ip():
    # Em produção, o proxy reverso do Render fornece
    # REMOTE_ADDR; não confiar em X-Forwarded-For
    # fornecido livremente pelo cliente.
    ip = request.remote_addr or "desconhecido"

    segredo = os.environ.get("GALLERY_HASH_SECRET")

    if not segredo:
        raise RuntimeError(
            "Configure GALLERY_HASH_SECRET."
        )

    return hmac.new(
        segredo.encode("utf-8"),
        ip.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()


def limitar_tentativas(identidade):
    agora = time.monotonic()

    with rate_lock:
        fila = tentativas[identidade]

        while fila and agora - fila[0] > 3600:
            fila.popleft()

        if len(fila) >= 6:
            return False

        fila.append(agora)

        # Evita crescimento indefinido do dicionário.
        if len(tentativas) > 5000:
            for chave in list(tentativas)[:1000]:
                if chave != identidade:
                    tentativas.pop(chave, None)

    return True


def processar_imagem(arquivo):
    dados = arquivo.read(MAX_UPLOAD + 1)

    if not dados:
        raise ValueError("Selecione uma imagem.")

    if len(dados) > MAX_UPLOAD:
        raise ValueError("A imagem deve ter até 5 MB.")

    try:
        with Image.open(io.BytesIO(dados)) as original:
            if original.format not in (
                "PNG", "JPEG", "WEBP"
            ):
                raise ValueError(
                    "Use apenas PNG, JPG ou WebP."
                )

            if (
                original.width * original.height
                > MAX_PIXELS
            ):
                raise ValueError(
                    "A resolução da imagem é muito alta."
                )

            # Obriga a decodificação real da imagem.
            original.load()

            # Corrige orientação EXIF antes de descartar
            # os metadados.
            imagem = ImageOps.exif_transpose(original)

            if getattr(imagem, "is_animated", False):
                raise ValueError(
                    "Imagens animadas não são aceitas."
                )

            imagem.thumbnail(
                (MAX_SIDE, MAX_SIDE),
                Image.Resampling.LANCZOS
            )

            # Cria uma imagem nova, sem preservar EXIF,
            # ICC, comentários ou outros metadados.
            if imagem.mode in ("RGBA", "LA"):
                limpa = Image.new(
                    "RGBA",
                    imagem.size,
                    (0, 0, 0, 0)
                )
                limpa.paste(
                    imagem.convert("RGBA"),
                    (0, 0)
                )
            else:
                limpa = Image.new(
                    "RGB",
                    imagem.size,
                    (255, 255, 255)
                )
                limpa.paste(
                    imagem.convert("RGB"),
                    (0, 0)
                )

            for qualidade in (82, 70, 58, 45):
                saida = io.BytesIO()

                limpa.save(
                    saida,
                    format="WEBP",
                    quality=qualidade,
                    method=4
                )

                resultado = saida.getvalue()

                if len(resultado) <= MAX_IMAGE:
                    return resultado

            raise ValueError(
                "Não foi possível reduzir a imagem. "
                "Tente uma arte menor."
            )

    except (
        UnidentifiedImageError,
        OSError,
        Image.DecompressionBombError
    ):
        raise ValueError(
            "Arquivo de imagem inválido ou corrompido."
        )


@galeria_bp.get("/api/galeria")
def listar_artes():
    try:
        limite = min(
            max(int(request.args.get("limite", 24)), 1),
            60
        )

        pagina = min(
            max(int(request.args.get("pagina", 1)), 1),
            100
        )

    except ValueError:
        return erro("Paginação inválida.")

    offset = (pagina - 1) * limite

    try:
        with conectar() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT COUNT(*)
                    FROM kaory_fanarts
                    WHERE status = 'aprovada'
                """)

                total = cur.fetchone()[0]

                cur.execute("""
                    SELECT id, nick, titulo, criada_em
                    FROM kaory_fanarts
                    WHERE status = 'aprovada'
                    ORDER BY criada_em DESC, id DESC
                    LIMIT %s OFFSET %s
                """, (limite, offset))

                artes = [
                    {
                        "id": item[0],
                        "nick": item[1],
                        "titulo": item[2],
                        "data": item[3].isoformat(),
                        "imagem": (
                            f"/api/galeria/imagem/{item[0]}"
                        )
                    }
                    for item in cur.fetchall()
                ]

        return jsonify(
            artes=artes,
            total=total,
            pagina=pagina
        )

    except Exception:
        logging.exception("Erro ao listar fanarts.")
        return erro(
            "Galeria temporariamente indisponível.",
            503
        )


@galeria_bp.get("/api/galeria/imagem/<int:arte_id>")
def imagem_arte(arte_id):
    try:
        with conectar() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT imagem
                    FROM kaory_fanarts
                    WHERE id = %s
                """, (arte_id,))

                resultado = cur.fetchone()

        if not resultado:
            return erro("Imagem não encontrada.", 404)

        resposta = Response(
            bytes(resultado[0]),
            mimetype="image/webp"
        )

        resposta.headers["X-Content-Type-Options"] = "nosniff"
        resposta.headers["Content-Disposition"] = "inline"
        resposta.headers["Cache-Control"] = (
            "public, max-age=3600"
        )
        resposta.headers["Content-Security-Policy"] = (
            "default-src 'none'; sandbox"
        )

        return resposta

    except Exception:
        logging.exception("Erro ao carregar imagem.")
        return erro("Imagem indisponível.", 503)


@galeria_bp.post("/api/galeria/enviar")
def enviar_arte():
    if not verificar_origem():
        return erro("Origem da requisição inválida.", 403)

    if (
        request.content_length is not None
        and request.content_length > MAX_UPLOAD + 16384
    ):
        return erro("Arquivo muito grande.", 413)

    try:
        ip_hash = identidade_ip()
    except RuntimeError:
        logging.exception("Segredo da galeria ausente.")
        return erro(
            "Envio temporariamente indisponível.",
            503
        )

    if not limitar_tentativas(ip_hash):
        return erro(
            "Muitas tentativas. Aguarde uma hora.",
            429
        )

    nick = request.form.get("nick", "").strip()
    titulo = request.form.get("titulo", "").strip()
    arquivo = request.files.get("imagem")

    if not 2 <= len(nick) <= 30:
        return erro("O nick deve ter de 2 a 30 caracteres.")

    if not 3 <= len(titulo) <= 80:
        return erro(
            "O título deve ter de 3 a 80 caracteres."
        )

    if any(ord(c) < 32 for c in nick + titulo):
        return erro("Texto contém caracteres inválidos.")

    if not arquivo:
        return erro("Selecione uma imagem.")

    try:
        imagem = processar_imagem(arquivo)
    except ValueError as exc:
        return erro(str(exc))

    try:
        with conectar() as conn:
            with conn.cursor() as cur:
                # Serializa uploads simultâneos para
                # respeitar os limites globais.
                cur.execute(
                    "SELECT pg_advisory_xact_lock(%s)",
                    (728391,)
                )

                cur.execute("""
                    SELECT COUNT(*)
                    FROM kaory_fanarts
                """)

                total = cur.fetchone()[0]

                if total >= MAX_ARTES:
                    return erro(
                        "A galeria está cheia no momento.",
                        409
                    )

                cur.execute("""
                    SELECT COUNT(*)
                    FROM kaory_fanarts
                    WHERE criada_em >=
                        NOW() - INTERVAL '24 hours'
                """)

                if cur.fetchone()[0] >= MAX_UPLOADS_DIA:
                    return erro(
                        "Limite diário de fanarts atingido.",
                        429
                    )

                cur.execute("""
                    SELECT COUNT(*)
                    FROM kaory_fanarts
                    WHERE ip_hash = %s
                    AND criada_em >=
                        NOW() - INTERVAL '24 hours'
                """, (ip_hash,))

                if cur.fetchone()[0] >= MAX_UPLOADS_IP_DIA:
                    return erro(
                        "Você atingiu o limite de "
                        "3 artes em 24 horas.",
                        429
                    )

                cur.execute("""
                    INSERT INTO kaory_fanarts
                        (
                            nick,
                            titulo,
                            imagem,
                            tamanho,
                            ip_hash, status
                        )
                    VALUES (%s, %s, %s, %s, %s, 'pendente')
                    RETURNING id
                """, (
                    nick,
                    titulo,
                    psycopg.Binary(imagem),
                    len(imagem),
                    ip_hash
                ))

                arte_id = cur.fetchone()[0]

        return jsonify(
            sucesso=True,
            id=arte_id,
            mensagem="Fanart enviada! Aguarde aprovação da moderação. 💜🥝"
        ), 201

    except Exception:
        logging.exception("Erro ao salvar fanart.")
        return erro(
            "Não foi possível publicar a arte.",
            503
        )


@galeria_bp.delete("/api/galeria/<int:arte_id>")
def remover_arte(arte_id):
    segredo = os.environ.get("GALLERY_ADMIN_KEY")
    recebido = request.headers.get("X-Admin-Key", "")

    if not segredo or not hmac.compare_digest(
        recebido,
        segredo
    ):
        return erro("Não autorizado.", 403)

    try:
        with conectar() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    DELETE FROM kaory_fanarts
                    WHERE id = %s
                    RETURNING id
                """, (arte_id,))

                removido = cur.fetchone()

        if not removido:
            return erro("Arte não encontrada.", 404)

        return jsonify(
            sucesso=True,
            mensagem="Fanart removida."
        )

    except Exception:
        logging.exception("Erro ao remover fanart.")
        return erro(
            "Não foi possível remover a arte.",
            503
        )
