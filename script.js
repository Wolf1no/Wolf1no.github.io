document.addEventListener('DOMContentLoaded', () => {
    const webhookForm = document.getElementById('webhookForm');
    const webhookUrlInput = document.getElementById('webhookUrl');
    const embedColorInput = document.getElementById('embedColor');
    const messageBlocksContainer = document.getElementById('messageBlocksContainer');
    const addBlockButton = document.getElementById('addBlockButton');
    const messageBlockTemplate = document.getElementById('messageBlockTemplate');
    const sendButton = document.getElementById('sendButton');
    const statusMessage = document.getElementById('statusMessage');
    const reloadButton = document.getElementById('reloadButton');
    const saveWebhookNameInput = document.getElementById('saveWebhookName');
    const saveWebhookButton = document.getElementById('saveWebhookButton');
    const webhookMgmtStatus = document.getElementById('webhookMgmtStatus');
    const savedWebhookListDiv = document.getElementById('savedWebhookList');

    const APP_STATE_KEY = 'discordSenderAppState_v2';
    const SAVED_WEBHOOKS_KEY = 'discordSavedWebhooks_v2';
    const MAX_EMBEDS = 10;
    const IMAGE_URL_REGEX = /\.(jpe?g|png|gif|webp|bmp)(\?.*)?$/i; // Slightly updated Regex to handle query parameters potentially

    function saveCurrentState() {
        const blocksData = [];
        messageBlocksContainer.querySelectorAll('.message-block').forEach(block => {
            const textInput = block.querySelector('.block-text');
            const imageUrlInput = block.querySelector('.block-image-url');
            blocksData.push({ text: textInput ? textInput.value : '', imageUrl: imageUrlInput ? imageUrlInput.value : '' });
        });
        const state = { webhookUrl: webhookUrlInput.value, embedColor: embedColorInput.value, blocks: blocksData };
        try { localStorage.setItem(APP_STATE_KEY, JSON.stringify(state)); }
        catch (e) { console.error("Chyba při ukládání stavu:", e); showStatus("Nepodařilo se uložit stav (možná plné úložiště?).", "error"); }
    }

    function loadSavedState() {
        const savedStateJSON = localStorage.getItem(APP_STATE_KEY);
        let state = null;
        if (savedStateJSON) { try { state = JSON.parse(savedStateJSON); } catch (e) { console.error("Chyba při načítání uloženého stavu:", e); localStorage.removeItem(APP_STATE_KEY); } }
        webhookUrlInput.value = state?.webhookUrl || '';
        embedColorInput.value = state?.embedColor || getCssVariable('--button-bg') || '#7a805b';
        messageBlocksContainer.innerHTML = '';
        if (state?.blocks && Array.isArray(state.blocks) && state.blocks.length > 0) { state.blocks.forEach(blockData => { addBlock(blockData.text, blockData.imageUrl); }); }
        else { addBlock(); }
    }

    function getSavedWebhooks() {
        const saved = localStorage.getItem(SAVED_WEBHOOKS_KEY);
        try { return saved ? JSON.parse(saved) : []; }
        catch (e) { console.error("Chyba při načítání uložených webhooků:", e); localStorage.removeItem(SAVED_WEBHOOKS_KEY); return []; }
    }

    function saveWebhooks(webhooksArray) {
         try { localStorage.setItem(SAVED_WEBHOOKS_KEY, JSON.stringify(webhooksArray)); return true; }
         catch (e) { console.error("Chyba při ukládání webhooků:", e); showWebhookMgmtStatus("Nepodařilo se uložit seznam webhooků.", "error"); return false; }
    }

    function displaySavedWebhooks() {
        const webhooks = getSavedWebhooks();
        savedWebhookListDiv.innerHTML = '';
        if (webhooks.length === 0) { savedWebhookListDiv.innerHTML = '<span class="placeholder-text">Žádné webhooky nebyly uloženy.</span>'; return; }
        webhooks.sort((a, b) => a.name.localeCompare(b.name));
        webhooks.forEach(wh => {
            const item = document.createElement('div');
            item.className = 'saved-webhook-item';
            item.textContent = wh.name;
            item.title = `Klikněte pro načtení:\n${wh.url}`;
            item.dataset.url = wh.url;
            item.addEventListener('click', (e) => { if (e.target.classList.contains('delete-webhook-btn')) return; webhookUrlInput.value = wh.url; showWebhookMgmtStatus(`Webhook '${wh.name}' načten.`, "success"); saveCurrentState(); });
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-webhook-btn';
            deleteBtn.innerHTML = '×';
            deleteBtn.title = `Smazat webhook '${wh.name}'`;
            deleteBtn.dataset.name = wh.name;
            deleteBtn.addEventListener('click', () => { handleDeleteWebhook(wh.name, wh.url); });
            item.appendChild(deleteBtn);
            savedWebhookListDiv.appendChild(item);
        });
    }

     function handleDeleteWebhook(nameToDelete, urlToDelete) {
         let webhooks = getSavedWebhooks();
         const initialLength = webhooks.length;
         webhooks = webhooks.filter(wh => !(wh.name === nameToDelete && wh.url === urlToDelete));
         if (webhooks.length < initialLength) { if (saveWebhooks(webhooks)) { showWebhookMgmtStatus(`Webhook '${nameToDelete}' smazán.`, "success"); displaySavedWebhooks(); if (webhookUrlInput.value === urlToDelete) { webhookUrlInput.value = ''; saveCurrentState(); } } }
         else { showWebhookMgmtStatus(`Webhook '${nameToDelete}' nebyl nalezen ke smazání.`, "error"); }
     }

    function handleSaveWebhook() {
        const name = saveWebhookNameInput.value.trim();
        const url = webhookUrlInput.value.trim();
        if (!name) { showWebhookMgmtStatus("Prosím, zadejte název pro uložení.", "error"); return; }
        if (!url) { showWebhookMgmtStatus("Prosím, vložte URL webhooku do pole výše.", "error"); return; }
        if (!url.startsWith('https://discord.com/api/webhooks/')) { showWebhookMgmtStatus("Zadaná URL adresa se nezdá být platný Discord webhook.", "error"); return; }
        const webhooks = getSavedWebhooks();
        const existingIndex = webhooks.findIndex(wh => wh.name.toLowerCase() === name.toLowerCase());
        if (existingIndex !== -1) { webhooks[existingIndex].url = url; showWebhookMgmtStatus(`Webhook '${name}' aktualizován.`, "success"); }
        else { webhooks.push({ name: name, url: url }); showWebhookMgmtStatus(`Webhook '${name}' uložen.`, "success"); }
        if (saveWebhooks(webhooks)) { displaySavedWebhooks(); saveWebhookNameInput.value = ''; }
    }

    function showWebhookMgmtStatus(message, type = 'info') {
        webhookMgmtStatus.textContent = message;
        webhookMgmtStatus.className = 'status-inline';
        if (type === 'success') webhookMgmtStatus.classList.add('success');
        else if (type === 'error') webhookMgmtStatus.classList.add('error');
         setTimeout(() => { if (webhookMgmtStatus.textContent === message) { webhookMgmtStatus.textContent = ''; webhookMgmtStatus.className = 'status-inline'; } }, 4000);
    }

    function addBlock(initialText = '', initialImageUrl = '') {
        if (messageBlocksContainer.children.length >= MAX_EMBEDS) { showStatus(`Discord podporuje maximálně ${MAX_EMBEDS} vložených bloků.`, "error"); return; }
        const templateContent = messageBlockTemplate.content.cloneNode(true);
        const newBlock = templateContent.querySelector('.message-block');
        const textInput = newBlock.querySelector('.block-text');
        const imageUrlInput = newBlock.querySelector('.block-image-url');
        if (textInput) textInput.value = initialText;
        if (imageUrlInput) imageUrlInput.value = initialImageUrl;
        textInput?.addEventListener('input', saveCurrentState);
        imageUrlInput?.addEventListener('input', saveCurrentState);
        const removeButton = newBlock.querySelector('.remove-block-button');
        removeButton?.addEventListener('click', () => { newBlock.remove(); saveCurrentState(); clearStatus(); });
        messageBlocksContainer.appendChild(templateContent);
    }

    webhookForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        clearStatus();
        saveCurrentState();

        const webhookUrl = webhookUrlInput.value.trim();
        const embedColorValue = embedColorInput.value;
        const blocks = messageBlocksContainer.querySelectorAll('.message-block');

        if (!webhookUrl) { showStatus('Prosím, zadejte Webhook URL před odesláním.', 'error'); return; }
        if (!webhookUrl.startsWith('https://discord.com/api/webhooks/')) { showStatus('Zadaná Webhook URL adresa není ve správném formátu.', 'error'); return; }
        if (blocks.length === 0) { showStatus('Nejméně jeden textový blok vyžadován.', 'error'); return; }
        if (blocks.length > MAX_EMBEDS) { showStatus(`Nelze přidat více než ${MAX_EMBEDS} textových bloků. Prosím, odstraňte nějaké.`, 'error'); return; }

        sendButton.disabled = true;
        sendButton.textContent = 'Odesílání...';
        const embedsArray = [];
        let hasContent = false;
        let errorOccurred = false;
        try {
            blocks.forEach((block, index) => { // Added index for better error reporting
                if (errorOccurred) return;
                const textInput = block.querySelector('.block-text');
                const imageUrlInput = block.querySelector('.block-image-url');
                const text = textInput ? textInput.value.trim() : '';
                const imageUrl = imageUrlInput ? imageUrlInput.value.trim() : '';
                if (text || imageUrl) {
                    hasContent = true;
                    const embedData = { color: hexToDecimal(embedColorValue) };
                    if (text) embedData.description = text;

                    if (imageUrl) {
                        if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
                            showStatus(`Blok #${index + 1}: Odkaz na obrázek musí začínat http:// nebo https://.`, 'error');
                            errorOccurred = true; return;
                        }
                        if (!IMAGE_URL_REGEX.test(imageUrl)) {
                             showStatus(`Blok #${index + 1}: Odkaz na obrázek nevypadá jako přímý odkaz na soubor (.jpg, .png, .gif).`, 'error');
                             errorOccurred = true; return;
                        }
                        embedData.image = { url: imageUrl };
                    }
                    embedsArray.push(embedData);
                }
            });
            if (errorOccurred) { throw new Error("Chyba validace bloku."); }
            if (!hasContent) { showStatus('Bloky jsou prázdné. Prosím přidejte text/obrázek do přidaných text. bloků.', 'error'); throw new Error("Žádný obsah v blocích."); }
            const payload = { embeds: embedsArray };
            const response = await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), });
            if (response.ok) { showStatus('Zpráva úspěšně odeslána!', 'success'); }
            else { let errorData = null; try { errorData = await response.json(); } catch (e) {} const errorMessage = errorData?.message || `HTTP chyba! Status: ${response.status}`; console.error('Discord API Error Response:', errorData || response.statusText); showStatus(`Nepodařilo se odeslat zprávu: ${errorMessage}`, 'error'); }
        } catch (error) { if (!error.message.includes("Chyba validace bloku") && !error.message.includes("Žádný obsah")) { console.error('Chyba při odesílání:', error); showStatus(`Objevila se chyba při zpracování nebo odesílání: ${error.message}`, 'error'); } }
        finally { sendButton.disabled = false; sendButton.textContent = 'Odeslat zprávu'; }
    });

    function hexToDecimal(hex) { const hexClean = String(hex).replace("#", ""); return parseInt(hexClean, 16); }
    function showStatus(message, type = 'info') { statusMessage.textContent = message; statusMessage.className = ''; if (type === 'success') statusMessage.classList.add('success'); else if (type === 'error') statusMessage.classList.add('error'); statusMessage.style.display = 'block'; }
    function clearStatus() { statusMessage.textContent = ''; statusMessage.className = ''; statusMessage.style.display = 'none'; }
    function getCssVariable(variableName) { try { return getComputedStyle(document.documentElement).getPropertyValue(variableName).trim(); } catch (e) { console.warn("Nepodařilo se získat CSS proměnou", variableName, e); return null; } }

    reloadButton.addEventListener('click', () => location.reload());
    addBlockButton.addEventListener('click', () => { addBlock(); saveCurrentState(); });
    saveWebhookButton.addEventListener('click', handleSaveWebhook);
    webhookUrlInput.addEventListener('input', saveCurrentState);
    embedColorInput.addEventListener('input', saveCurrentState);

    displaySavedWebhooks();
    loadSavedState();
});