# 🥝 Kaory World

Site oficial da comunidade da **Kaory Saito**, com experiências interativas para os kiwis: chat com IA, galeria de fanarts, minigame com ranking, música, lore e links para as redes sociais.

🌐 **Site:** https://kaory-world.onrender.com/

## ✨ Funcionalidades

- **Chat da Kaory:** conversa com IA do Google Gemini, usando a personalidade definida em `bot.py`.
- **Galeria de fanarts:** envio de imagens PNG, JPG e WebP, com limite de 5 MB e aprovação administrativa antes da publicação.
- **Painel administrativo:** acesso em `/admin`, protegido por senha e código temporário TOTP (compatível com Google Authenticator).
- **Minigame e ranking:** pontuações registradas no PostgreSQL.
- **Experiência da comunidade:** lore da personagem, música, animações e atalhos para redes sociais.

## 🛠️ Tecnologias

- **Frontend:** HTML, CSS e JavaScript
- **Backend:** Python e Flask
- **IA:** Google Gemini via `google-genai`
- **Banco de dados:** PostgreSQL via `psycopg`
- **Imagens:** Pillow
- **Hospedagem:** Render com Gunicorn

## 🚀 Rodando localmente

Requisitos: Python instalado, uma chave válida da API Gemini e PostgreSQL para as funcionalidades de galeria e ranking.

```bash
git clone https://github.com/Reddingtonkk/kaory-world.git
cd kaory-world
python -m venv .venv
```

Ative o ambiente virtual:

**Windows (PowerShell):**
```powershell
.\.venv\Scripts\Activate.ps1
```

**Linux/macOS:**
```bash
source .venv/bin/activate
```

Instale as dependências:

```bash
pip install -r requirements.txt
```

Crie um arquivo `.env` na raiz do projeto e configure as variáveis necessárias (veja abaixo). Em seguida:

```bash
python server.py
```

Abra **http://127.0.0.1:5000**.

## 🔐 Variáveis de ambiente

| Variável | Finalidade |
| --- | --- |
| `GEMINI_API_KEY` | Chave da API Google Gemini; necessária para iniciar o servidor |
| `GEMINI_MODEL` | Modelo usado no chat; **`gemini-3.6-flash` é o modelo validado no Render** |
| `DATABASE_URL` | Conexão PostgreSQL para galeria e ranking |
| `KAORY_SESSION_SECRET` | Chave secreta persistente para sessões Flask |
| `KAORY_ADMIN_PASSWORD_HASH` | Hash da senha do painel administrativo |
| `KAORY_ADMIN_TOTP_SECRET` | Segredo TOTP do segundo fator |
| `GALLERY_HASH_SECRET` | Segredo usado para proteger identificadores na galeria |
| `GALLERY_ADMIN_KEY` | Chave legada de administração da galeria, caso a rota correspondente seja utilizada |

> **Nunca publique o `.env`, chaves de API, segredos TOTP ou senhas no GitHub.** Configure os segredos no painel **Environment** do Render em produção.

A variável `GEMINI_MODEL` no Render tem prioridade sobre o valor padrão no código. O modelo atualmente validado é `gemini-3.6-flash`; alterar o modelo pode afetar disponibilidade e tempo de resposta.

## ☁️ Deploy no Render

O projeto está hospedado no Render. Para uma instalação equivalente:

1. Conecte o repositório GitHub a um serviço **Web Service** Python.
2. Configure a instalação das dependências com `pip install -r requirements.txt`.
3. Configure o comando de inicialização com `gunicorn server:app`.
4. Adicione as variáveis de ambiente e configure o PostgreSQL.
5. Selecione a branch desejada para deploy e publique.

A atualização de uma branch no GitHub só dispara um novo deploy se o serviço estiver configurado para acompanhar essa branch com deploy automático.

## 🛡️ Segurança e moderação

O backend aplica validações de requisições, cabeçalhos de segurança, limites para uploads e restrições de tentativas em operações sensíveis. O painel administrativo usa autenticação por senha e TOTP. Novas fanarts ficam pendentes até serem aprovadas; somente imagens aprovadas aparecem na galeria pública.

A autenticação administrativa e as chaves devem permanecer **exclusivamente no servidor**.

## 📁 Estrutura principal

```text
kaory-world/
├── server.py            # Flask, chat Gemini e painel administrativo
├── bot.py               # Personalidade da Kaory
├── galeria.py           # Upload, armazenamento e moderação de fanarts
├── ranking.py           # Minigame e ranking
├── Kaory.HTML           # Página principal
├── Kaory.CSS            # Estilos
├── Kaory.js             # Interações e chat
├── Kaory-admin.html     # Interface administrativa
├── Kaory-admin.js       # Interações administrativas
├── assets/              # Imagens e recursos visuais
└── requirements.txt     # Dependências Python
```

## 💜 Projeto

Desenvolvido para a Kaory e sua comunidade. O objetivo é reunir os kiwis em um espaço com identidade própria, interatividade e recursos que evoluem junto com a comunidade.
