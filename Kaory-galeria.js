
(() => {
    "use strict";

    const $ = selector => document.querySelector(selector);

    const modal = $("#modalBackdrop");
    const modalTitle = $("#modalTitle");
    const modalContent = $("#modalContent");

    if (!modal || !modalTitle || !modalContent) {
        console.error("Galeria: modal não encontrado.");
        return;
    }

    const style = document.createElement("style");

    style.textContent = `
        .kg-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 12px;
            margin: 0 0 18px;
        }

        .kg-description {
            color: #cbb5db;
            font-size: 13px;
            line-height: 1.7;
        }

        .kg-button {
            padding: 11px 15px;
            border: 1px solid #9166b0;
            border-radius: 12px;
            background: #79519c;
            color: white;
            font: inherit;
            font-size: 13px;
            cursor: pointer;
            transition: transform .2s, background .2s;
        }

        .kg-button:hover {
            transform: translateY(-2px);
            background: #9466b6;
        }

        .kg-button:disabled {
            opacity: .5;
            cursor: wait;
        }

        .kg-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
            margin: 20px 0;
        }

        .kg-card {
            min-width: 0;
            border: 1px solid rgba(190,145,220,.25);
            border-radius: 16px;
            overflow: hidden;
            background: #24172f;
            transition: transform .25s, border-color .25s;
        }

        .kg-card:hover {
            transform: translateY(-4px);
            border-color: #aa7bc8;
        }

        .kg-image {
            display: block;
            width: 100%;
            aspect-ratio: 1;
            object-fit: cover;
            background: #160e20;
            cursor: zoom-in;
        }

        .kg-info {
            padding: 12px;
        }

        .kg-title {
            color: #f6eaff;
            font-size: 13px;
            font-weight: 700;
            overflow-wrap: anywhere;
        }

        .kg-author {
            color: #c7a9dc;
            font-size: 11px;
            margin-top: 5px;
            overflow-wrap: anywhere;
        }

        .kg-form {
            display: grid;
            gap: 13px;
            margin: 16px 0;
        }

        .kg-field {
            display: grid;
            gap: 7px;
            color: #ead9f4;
            font-size: 12px;
            font-weight: 600;
        }

        .kg-input {
            width: 100%;
            box-sizing: border-box;
            padding: 12px;
            border: 1px solid #76528f;
            border-radius: 12px;
            background: #1d1428;
            color: white;
            font: inherit;
            outline: none;
        }

        .kg-input:focus {
            border-color: #bd90df;
        }

        .kg-preview {
            display: none;
            width: 100%;
            max-height: 280px;
            object-fit: contain;
            border: 1px solid #6e4b87;
            border-radius: 14px;
            background: #140d1d;
        }

        .kg-message {
            min-height: 20px;
            color: #dbc3eb;
            font-size: 13px;
            line-height: 1.6;
        }

        .kg-empty {
            text-align: center;
            padding: 35px 15px;
            border: 1px dashed #76528f;
            border-radius: 16px;
            color: #cdb5dd;
            grid-column: 1 / -1;
        }

        .kg-pagination {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 12px;
            margin-top: 15px;
        }

        .kg-lightbox {
            position: fixed;
            inset: 0;
            z-index: 30000;
            display: grid;
            place-items: center;
            padding: 20px;
            background: rgba(5,3,10,.96);
            cursor: zoom-out;
        }

        .kg-lightbox img {
            max-width: 95vw;
            max-height: 88vh;
            object-fit: contain;
            border-radius: 10px;
        }

        .kg-consent {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            color: #dbc3eb;
            font-size: 12px;
            line-height: 1.5;
        }

        @media (max-width: 450px) {
            .kg-grid {
                gap: 9px;
            }

            .kg-info {
                padding: 9px;
            }
        }
    `;

    document.head.appendChild(style);

    function create(tag, className = "", text = "") {
        const node = document.createElement(tag);

        if (className) node.className = className;
        node.textContent = text;

        return node;
    }

    function button(text, callback) {
        const node = create("button", "kg-button", text);
        node.type = "button";
        node.addEventListener("click", callback);
        return node;
    }

    async function requestJSON(url, options = {}) {
        const response = await fetch(url, options);

        let data;

        try {
            data = await response.json();
        } catch {
            throw new Error(
                "O servidor não retornou uma resposta válida."
            );
        }

        if (!response.ok) {
            throw new Error(
                data.erro ||
                "Não foi possível concluir a operação."
            );
        }

        return data;
    }

    function openModal(title) {
        modalTitle.textContent = title;
        modalContent.replaceChildren();

        modal.classList.add("open");
        modal.setAttribute("aria-hidden", "false");
    }

    function showImage(src, alt) {
        const overlay = create("div", "kg-lightbox");
        const image = document.createElement("img");

        image.src = src;
        image.alt = alt;

        overlay.appendChild(image);
        document.body.appendChild(overlay);

        function close() {
            overlay.remove();
            document.removeEventListener(
                "keydown",
                onKeyDown
            );
        }

        function onKeyDown(event) {
            if (event.key === "Escape") close();
        }

        overlay.addEventListener("click", close);
        document.addEventListener(
            "keydown",
            onKeyDown
        );
    }

    async function showGallery(page = 1) {
        openModal("Galeria dos Kiwis 💜🥝");

        const header = create("div", "kg-header");

        const description = create(
            "p",
            "kg-description",
            "Artes e fanarts feitas com carinho pela comunidade da Kaory!"
        );

        const upload = button(
            "✦ Enviar fanart",
            showUpload
        );

        header.append(description, upload);

        const gallery = create("div", "kg-grid");

        const status = create(
            "p",
            "kg-message",
            "Carregando fanarts... 🥝"
        );

        const pagination = create(
            "div",
            "kg-pagination"
        );

        modalContent.append(
            header,
            gallery,
            status,
            pagination
        );

        try {
            const data = await requestJSON(
                `/api/galeria?pagina=${page}&limite=12`
            );

            if (!gallery.isConnected) return;

            gallery.replaceChildren();
            status.textContent = "";

            if (!data.artes?.length) {
                gallery.appendChild(
                    create(
                        "div",
                        "kg-empty",
                        "Ainda não temos fanarts! Envie a primeira. 💜🥝"
                    )
                );
                return;
            }

            data.artes.forEach(arte => {
                const card = create(
                    "article",
                    "kg-card"
                );

                const image = document.createElement("img");

                image.className = "kg-image";
                image.src = arte.imagem;
                image.alt = arte.titulo;
                image.loading = "lazy";
                image.decoding = "async";

                image.addEventListener("click", () => {
                    showImage(
                        arte.imagem,
                        arte.titulo
                    );
                });

                const info = create(
                    "div",
                    "kg-info"
                );

                info.append(
                    create(
                        "div",
                        "kg-title",
                        arte.titulo
                    ),
                    create(
                        "div",
                        "kg-author",
                        `🎨 por ${arte.nick}`
                    )
                );

                card.append(image, info);
                gallery.appendChild(card);
            });

            const pages = Math.ceil(data.total / 12);

            if (pages > 1) {
                const previous = button(
                    "←",
                    () => showGallery(page - 1)
                );

                const next = button(
                    "→",
                    () => showGallery(page + 1)
                );

                previous.disabled = page <= 1;
                next.disabled = page >= pages;

                pagination.append(
                    previous,
                    create(
                        "span",
                        "kg-description",
                        `${page} / ${pages}`
                    ),
                    next
                );
            }

        } catch (error) {
            status.textContent = error.message;
        }
    }

    function showUpload() {
        openModal("Enviar fanart da Kaory 🎨");

        const description = create(
            "p",
            "kg-description",
            "Envie sua arte! Ela será publicada automaticamente depois da validação técnica."
        );

        const form = create(
            "form",
            "kg-form"
        );

        const nickLabel = create(
            "label",
            "kg-field",
            "Seu nick"
        );

        const nick = create(
            "input",
            "kg-input"
        );

        nick.type = "text";
        nick.name = "nick";
        nick.maxLength = 30;
        nick.minLength = 2;
        nick.required = true;
        nick.placeholder = "Como quer ser chamado?";

        try {
            nick.value =
                localStorage.getItem("kaoryFanartNick") || "";
        } catch {}

        nickLabel.appendChild(nick);

        const titleLabel = create(
            "label",
            "kg-field",
            "Título da fanart"
        );

        const title = create(
            "input",
            "kg-input"
        );

        title.type = "text";
        title.name = "titulo";
        title.maxLength = 80;
        title.minLength = 3;
        title.required = true;
        title.placeholder = "Nome da sua arte";

        titleLabel.appendChild(title);

        const fileLabel = create(
            "label",
            "kg-field",
            "Imagem (PNG, JPG ou WebP)"
        );

        const file = create(
            "input",
            "kg-input"
        );

        file.type = "file";
        file.name = "imagem";
        file.accept =
            "image/png,image/jpeg,image/webp";
        file.required = true;

        fileLabel.appendChild(file);

        const preview = document.createElement("img");

        preview.className = "kg-preview";
        preview.alt = "Prévia da fanart";

        let previewURL = null;

        function clearPreview() {
            if (previewURL) {
                URL.revokeObjectURL(previewURL);
                previewURL = null;
            }
        }

        const message = create(
            "p",
            "kg-message"
        );

        file.addEventListener("change", () => {
            clearPreview();

            const selected = file.files?.[0];

            if (!selected) {
                preview.style.display = "none";
                return;
            }

            if (selected.size > 5 * 1024 * 1024) {
                file.value = "";
                preview.style.display = "none";

                message.textContent =
                    "A imagem deve ter no máximo 5 MB.";
                return;
            }

            if (![
                "image/png",
                "image/jpeg",
                "image/webp"
            ].includes(selected.type)) {
                file.value = "";
                preview.style.display = "none";

                message.textContent =
                    "Escolha PNG, JPG ou WebP.";
                return;
            }

            message.textContent = "";

            previewURL =
                URL.createObjectURL(selected);

            preview.src = previewURL;
            preview.style.display = "block";
        });

        const rules = create(
            "p",
            "kg-description",
            "Até 5 MB. Envie somente artes que você tem permissão para compartilhar. Não envie conteúdo ofensivo, íntimo ou informações pessoais de terceiros."
        );

        const consentLabel = create(
            "label",
            "kg-consent"
        );

        const consent = document.createElement("input");

        consent.type = "checkbox";
        consent.required = true;

        consentLabel.append(
            consent,
            document.createTextNode(
                "Tenho permissão para publicar esta arte e concordo com as regras da galeria."
            )
        );

        const submit = create(
            "button",
            "kg-button",
            "Publicar fanart 💜"
        );

        submit.type = "submit";

        form.append(
            nickLabel,
            titleLabel,
            fileLabel,
            preview,
            rules,
            consentLabel,
            submit,
            message
        );

        form.addEventListener(
            "submit",
            async event => {
                event.preventDefault();

                if (!form.reportValidity()) return;

                const selected = file.files?.[0];
                if (!selected) return;

                submit.disabled = true;
                submit.textContent = "Publicando... 🥝";

                message.textContent =
                    "Validando a imagem...";

                const body = new FormData();

                body.append(
                    "nick",
                    nick.value.trim()
                );

                body.append(
                    "titulo",
                    title.value.trim()
                );

                body.append(
                    "imagem",
                    selected
                );

                try {
                    await requestJSON(
                        "/api/galeria/enviar",
                        {
                            method: "POST",
                            body
                        }
                    );

                    try {
                        localStorage.setItem(
                            "kaoryFanartNick",
                            nick.value.trim()
                        );
                    } catch {}

                    clearPreview();
                    await showGallery();

                } catch (error) {
                    message.textContent = error.message;
                    submit.disabled = false;
                    submit.textContent =
                        "Tentar novamente";
                }
            }
        );

        const back = button(
            "← Voltar à galeria",
            () => {
                clearPreview();
                showGallery();
            }
        );

        modalContent.append(
            description,
            form,
            back
        );
    }

    function configurarCard() {
        const card =
            document.querySelector(
                '[data-panel="gallery"]'
            ) ||
            document.querySelector(
                '[data-panel="emotes"]'
            );

        if (!card) {
            console.warn(
                "Galeria: card não encontrado no HTML."
            );
            return;
        }

        // Captura o clique antes de qualquer handler
        // antigo do Kaory.js ou Kaory-extras.js.
        card.addEventListener(
            "click",
            event => {
                event.preventDefault();
                event.stopImmediatePropagation();

                showGallery();
            },
            true
        );

        console.log(
            "Card da galeria conectado! 💜🥝"
        );
    }

    configurarCard();

    console.log(
        "Galeria dos Kiwis carregada! 💜🥝"
    );
})();
