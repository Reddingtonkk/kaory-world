
import logging
import os
import re
import secrets
import time

from threading import Lock

import psycopg
from flask import Blueprint, jsonify, request


ranking_bp = Blueprint("ranking", __name__)

DURACAO = 30
LIMITE_PONTOS = 300

PARTIDAS = {}
INICIOS = {}
LOCK = Lock()
MAX_PARTIDAS_ATIVAS = 2500
MAX_INICIOS_POR_MINUTO = 12


def conectar():
    url = os.getenv("DATABASE_URL")

    if not url:
        raise RuntimeError(
            "DATABASE_URL não configurada."
        )

    return psycopg.connect(url, connect_timeout=10)


def preparar_banco():
    if not os.getenv("DATABASE_URL"):
        logging.warning(
            "Ranking desativado: DATABASE_URL ausente."
        )
        return

    try:
        with conectar() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS ranking_kiwis (
                        id BIGSERIAL PRIMARY KEY,
                        nick VARCHAR(24) NOT NULL,
                        nick_key VARCHAR(24) NOT NULL UNIQUE,
                        pontos INTEGER NOT NULL DEFAULT 0,
                        atualizado_em TIMESTAMPTZ
                            NOT NULL DEFAULT NOW()
                    )
                """)

        logging.info("Ranking dos Kiwis preparado.")

    except Exception:
        logging.exception(
            "Não foi possível preparar o ranking."
        )


def limpar_partidas():
    agora = time.monotonic()

    for token, partida in list(PARTIDAS.items()):
        if agora - partida["inicio"] > 120:
            del PARTIDAS[token]


@ranking_bp.post("/api/jogo/iniciar")
def iniciar_jogo():
    dados = request.get_json(silent=True) or {}
    nick = dados.get("nick", "")

    if not isinstance(nick, str):
        return jsonify(erro="Nick inválido."), 400

    nick = nick.strip()

    if not re.fullmatch(
        r"[\wÀ-ÿ -]{2,24}",
        nick,
        flags=re.UNICODE
    ):
        return jsonify(
            erro="Use um nick de 2 a 24 caracteres."
        ), 400

    if not os.getenv("DATABASE_URL"):
        return jsonify(
            erro="O ranking ainda não foi configurado."
        ), 503

    token = secrets.token_urlsafe(32)
    identidade = request.remote_addr or "desconhecido"

    with LOCK:
        limpar_partidas()
        agora = time.monotonic()
        for ip, fila in list(INICIOS.items()):
            fila[:] = [t for t in fila if agora - t < 60]
            if not fila:
                del INICIOS[ip]
        fila = INICIOS.setdefault(identidade, [])
        if len(fila) >= MAX_INICIOS_POR_MINUTO:
            return jsonify(erro="Muitas partidas iniciadas. Aguarde um minuto."), 429
        if len(PARTIDAS) >= MAX_PARTIDAS_ATIVAS:
            return jsonify(erro="Muitas partidas em andamento. Tente novamente."), 503
        fila.append(agora)
        PARTIDAS[token] = {
            "nick": nick,
            "inicio": time.monotonic()
        }

    return jsonify(
        token=token,
        duracao=DURACAO
    )


@ranking_bp.post("/api/jogo/finalizar")
def finalizar_jogo():
    dados = request.get_json(silent=True) or {}

    token = dados.get("token")
    pontos = dados.get("pontos")

    if not isinstance(token, str):
        return jsonify(erro="Partida inválida."), 400

    if type(pontos) is not int:
        return jsonify(erro="Pontuação inválida."), 400

    with LOCK:
        partida = PARTIDAS.pop(token, None)

    if partida is None:
        return jsonify(
            erro="Partida não encontrada ou já finalizada."
        ), 400

    tempo = time.monotonic() - partida["inicio"]

    if tempo < DURACAO - 1 or tempo > DURACAO + 15:
        return jsonify(
            erro="Tempo de partida inválido."
        ), 400

    if pontos < 0 or pontos > LIMITE_PONTOS:
        return jsonify(
            erro="Pontuação fora do limite."
        ), 400

    if pontos > int(tempo * 10):
        return jsonify(
            erro="Pontuação incompatível com a partida."
        ), 400

    nick = partida["nick"]
    nick_key = nick.casefold()

    try:
        with conectar() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO ranking_kiwis
                        (nick, nick_key, pontos)
                    VALUES (%s, %s, %s)

                    ON CONFLICT (nick_key)
                    DO UPDATE SET
                        pontos = GREATEST(
                            ranking_kiwis.pontos,
                            EXCLUDED.pontos
                        ),
                        atualizado_em = CASE
                            WHEN EXCLUDED.pontos >
                                ranking_kiwis.pontos
                            THEN NOW()
                            ELSE ranking_kiwis.atualizado_em
                        END

                    RETURNING pontos
                """, (nick, nick_key, pontos))

                melhor = cur.fetchone()[0]

        return jsonify(
            sucesso=True,
            pontos=pontos,
            melhor=melhor,
            recorde=(melhor == pontos and pontos > 0)
        )

    except Exception:
        logging.exception(
            "Erro ao salvar pontuação."
        )

        return jsonify(
            erro="Não foi possível salvar a pontuação."
        ), 503


@ranking_bp.get("/api/jogo/ranking")
def listar_ranking():
    try:
        with conectar() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT nick, pontos
                    FROM ranking_kiwis
                    ORDER BY
                        pontos DESC,
                        atualizado_em ASC,
                        id ASC
                    LIMIT 10
                """)

                linhas = cur.fetchall()

        return jsonify(
            ranking=[
                {
                    "nick": nick,
                    "pontos": pontos
                }
                for nick, pontos in linhas
            ]
        )

    except Exception:
        logging.exception(
            "Erro ao consultar ranking."
        )

        return jsonify(
            erro="Ranking temporariamente indisponível."
        ), 503
