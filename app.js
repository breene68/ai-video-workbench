const STORAGE_KEYS = {
    category: 'm1.currentCategory',
    step: 'm1.currentStep',
    draftText: 'm1.rawText',
    checklist: 'm1.checklistState'
};

// Tab switching logic
const navItems = document.querySelectorAll('.nav-item');
const panels = document.querySelectorAll('.step-panel');
const approvedSteps = new Set();

function setActiveStep(stepId, persist = true) {
    navItems.forEach(nav => {
        nav.classList.toggle('active', nav.getAttribute('data-target') === stepId);
    });

    panels.forEach(panel => {
        panel.classList.toggle('active', panel.id === stepId);
    });

    if (persist) {
        localStorage.setItem(STORAGE_KEYS.step, stepId);
    }

    updateFlowUI();
}

navItems.forEach(item => {
    item.addEventListener('click', () => {
        const targetId = item.getAttribute('data-target');
        setActiveStep(targetId);
    });
});

let currentCoverTool = 'doubao';

// Update prompts based on selection
function updatePrompts(silent = false) {
    const category = document.getElementById('globalCategory').value;
    const data = promptDB[category];

    // Update NotebookLM step
    document.getElementById('nblm-title').innerText = data.title;
    document.getElementById('p-nlprompt').innerText = data.nblm;

    // Update Image Generation step
    document.getElementById('img-title').innerText = data.title;
    document.getElementById('p-img').innerText = data.img;

    // Update Cover Image step
    document.getElementById('cover-title').innerText = data.title;
    document.getElementById('p-cover').innerText = data.cover[currentCoverTool];

    // Handle generic track hints for M2-3
    const isEmotion = category === 'emotion';
    const sbHint = document.getElementById('sb-hint');
    const coverHint = document.getElementById('cover-hint');
    if (sbHint) sbHint.style.display = isEmotion ? 'none' : 'inline-block';
    if (coverHint) coverHint.style.display = isEmotion ? 'none' : 'inline-block';

    // Update Title Prompt step
    if (document.getElementById('p-title')) {
        document.getElementById('p-title').innerText = data.titlePrompt;
    }

    // Update Image Suffix step
    document.getElementById('suffix-title').innerText = data.suffixTitle;
    document.getElementById('prompt2').innerText = data.suffix;

    localStorage.setItem(STORAGE_KEYS.category, category);
    if (!silent) {
        showToast('已切换至【' + data.title + '】专属提示词！', '#3b82f6');
    }
}

// Switch Cover Tool Logic
function switchCoverTool(toolName) {
    currentCoverTool = toolName;

    // Update button styles
    document.getElementById('btn-doubao').classList.remove('active');
    document.getElementById('btn-nanobanana').classList.remove('active');
    document.getElementById('btn-' + toolName).classList.add('active');

    // Update description
    const descEl = document.getElementById('cover-desc');
    if (toolName === 'doubao') {
        descEl.innerText = '豆包的强项是画面质感，但画不好字。用此咒语要求大模型生成4:3纯净底图指令，再去剪映居中放置并加顶部大字报。';
    } else {
        descEl.innerText = 'NanoBanana擅长生成【场景融合字】。让大模型构思带有高级内嵌文字指令的4:3画面，最顶部的黄白大字报依然留到剪映去加！';
    }

    // Trigger prompt update
    updatePrompts();
}

// Copy text logic
function copyText(elementId) {
    const text = document.getElementById(elementId).innerText;
    copyToClipboard(text, '已复制到剪贴板！可以直接去粘贴了。');
}

// Copy textarea content
function copyContent(elementId) {
    const text = document.getElementById(elementId).value;
    if (!text) {
        showToast('暂存箱是空的哦~', '#f59e0b');
        return;
    }
    copyToClipboard(text, '已复制暂存箱内容！');
}

async function copyToClipboard(text, successMessage) {
    try {
        await navigator.clipboard.writeText(text);
        showToast(successMessage);
        return;
    } catch {
        const tempTextarea = document.createElement('textarea');
        tempTextarea.value = text;
        tempTextarea.style.position = 'fixed';
        tempTextarea.style.opacity = '0';
        document.body.appendChild(tempTextarea);
        tempTextarea.focus();
        tempTextarea.select();

        const copied = document.execCommand('copy');
        document.body.removeChild(tempTextarea);

        if (copied) {
            showToast(successMessage);
            return;
        }

        showToast('复制失败：浏览器不允许访问剪贴板。', '#ef4444');
    }
}

// Toast notification logic
function showToast(message, color = '#10b981') {
    const toast = document.getElementById('toast');
    toast.innerText = message;
    toast.style.background = color;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}

function getCurrentStepIndex() {
    return Array.from(navItems).findIndex(item => item.classList.contains('active'));
}

function updateFlowUI() {
    const index = getCurrentStepIndex();
    const prevBtn = document.getElementById('prevStepBtn');
    const nextBtn = document.getElementById('nextStepBtn');
    const approveBtn = document.getElementById('approveBtn');
    const label = document.getElementById('currentStepLabel');

    if (index < 0 || !prevBtn || !nextBtn || !approveBtn || !label) {
        return;
    }

    const currentStepId = navItems[index].getAttribute('data-target');
    const currentStepText = navItems[index].innerText.trim();

    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === navItems.length - 1;
    label.innerText = '当前步骤：' + currentStepText;

    const approved = approvedSteps.has(currentStepId);
    approveBtn.classList.toggle('approved', approved);
    approveBtn.innerText = approved ? '✅ 已同意继续' : '✅ 同意继续';
}

function initFlowControls() {
    const prevBtn = document.getElementById('prevStepBtn');
    const nextBtn = document.getElementById('nextStepBtn');
    const approveBtn = document.getElementById('approveBtn');

    if (!prevBtn || !nextBtn || !approveBtn) {
        return;
    }

    prevBtn.addEventListener('click', () => {
        const index = getCurrentStepIndex();
        if (index > 0) {
            const prevStepId = navItems[index - 1].getAttribute('data-target');
            setActiveStep(prevStepId);
        }
    });

    nextBtn.addEventListener('click', () => {
        const index = getCurrentStepIndex();
        if (index < 0 || index >= navItems.length - 1) {
            return;
        }

        const currentStepId = navItems[index].getAttribute('data-target');
        if (!approvedSteps.has(currentStepId)) {
            showToast('请先点击“同意继续”再进入下一步。', '#f59e0b');
            return;
        }

        const nextStepId = navItems[index + 1].getAttribute('data-target');
        setActiveStep(nextStepId);
    });

    approveBtn.addEventListener('click', () => {
        const index = getCurrentStepIndex();
        if (index < 0) {
            return;
        }

        const currentStepId = navItems[index].getAttribute('data-target');
        approvedSteps.add(currentStepId);
        updateFlowUI();
        showToast('当前步骤已同意继续。');
    });

    updateFlowUI();
}

function loadChecklistState() {
    const raw = localStorage.getItem(STORAGE_KEYS.checklist);
    if (!raw) {
        return {};
    }

    try {
        return JSON.parse(raw);
    } catch {
        return {};
    }
}

function saveChecklistState(state) {
    localStorage.setItem(STORAGE_KEYS.checklist, JSON.stringify(state));
}

function initPersistence() {
    const categoryEl = document.getElementById('globalCategory');
    const rawTextEl = document.getElementById('rawText');

    const savedCategory = localStorage.getItem(STORAGE_KEYS.category);
    if (savedCategory && promptDB[savedCategory]) {
        categoryEl.value = savedCategory;
    }

    updatePrompts(true);

    const savedStep = localStorage.getItem(STORAGE_KEYS.step);
    if (savedStep && document.getElementById(savedStep)) {
        setActiveStep(savedStep, false);
    } else {
        updateFlowUI();
    }

    const savedDraft = localStorage.getItem(STORAGE_KEYS.draftText);
    if (savedDraft !== null) {
        rawTextEl.value = savedDraft;
    }
    rawTextEl.addEventListener('input', () => {
        localStorage.setItem(STORAGE_KEYS.draftText, rawTextEl.value);
    });

    const checklistState = loadChecklistState();
    document.querySelectorAll('.checklist input[type="checkbox"]').forEach(checkbox => {
        const key = checkbox.id;
        if (Object.prototype.hasOwnProperty.call(checklistState, key)) {
            checkbox.checked = Boolean(checklistState[key]);
        }

        checkbox.addEventListener('change', () => {
            checklistState[key] = checkbox.checked;
            saveChecklistState(checklistState);
        });
    });
}

// =========================================
// M2-1: One-Click Transcript Cleanup
// =========================================

// --- Per-Step API Configuration (persisted in localStorage) ---
const SLOT_LABELS = {
    viral: '爆款拆解 API（Step 0）',
    cleanup: '纠错 API（Step 3.1）',
    storyboard: '分镜 API（Step 3.2）'
};

const API_SLOTS = {};  // runtime cache: { viral: {url,key,model,timeoutMs}, ... }

function slotStorageKey(slot) { return 'api.slot.' + slot; }

function getSlotApi(slot) {
    if (API_SLOTS[slot]) return API_SLOTS[slot];
    return { url: '', key: '', model: '', timeoutMs: 30000 };
}

// Backward compat: existing consumers still reference CLEANUP_API
// We make it a dynamic getter pointing to 'cleanup' slot by default
let CLEANUP_API = { url: '', key: '', model: '', timeoutMs: 30000 };
function syncCleanupApi() {
    const c = getSlotApi('cleanup');
    CLEANUP_API.url = c.url; CLEANUP_API.key = c.key;
    CLEANUP_API.model = c.model; CLEANUP_API.timeoutMs = c.timeoutMs;
}

function loadSlotConfig(slot) {
    try {
        const saved = localStorage.getItem(slotStorageKey(slot));
        if (saved) { API_SLOTS[slot] = JSON.parse(saved); }
    } catch (e) { }
}

function saveSlotConfig(slot) {
    const prefix = 'cfg_' + slot + '_';
    const url = (document.getElementById(prefix + 'url').value || '').trim();
    const key = (document.getElementById(prefix + 'key').value || '').trim();
    const model = (document.getElementById(prefix + 'model').value || '').trim();
    const ts = parseInt(document.getElementById(prefix + 'timeout').value, 10) || 30;
    API_SLOTS[slot] = { url: url, key: key, model: model, timeoutMs: Math.max(5, Math.min(120, ts)) * 1000 };
    try { localStorage.setItem(slotStorageKey(slot), JSON.stringify(API_SLOTS[slot])); } catch (e) { }
    syncCleanupApi();
    updateSlotBadge(slot);
    showToast(SLOT_LABELS[slot] + ' 配置已保存！');
}

function clearSlotConfig(slot) {
    API_SLOTS[slot] = { url: '', key: '', model: '', timeoutMs: 30000 };
    try { localStorage.removeItem(slotStorageKey(slot)); } catch (e) { }
    const prefix = 'cfg_' + slot + '_';
    ['url', 'key', 'model'].forEach(f => { const el = document.getElementById(prefix + f); if (el) el.value = ''; });
    const tEl = document.getElementById(prefix + 'timeout'); if (tEl) tEl.value = '30';
    syncCleanupApi();
    updateSlotBadge(slot);
    showToast(SLOT_LABELS[slot] + ' 配置已清空。', '#f59e0b');
}

function toggleSlotKeyVis(slot) {
    const el = document.getElementById('cfg_' + slot + '_key');
    const btn = document.getElementById('cfg_' + slot + '_toggleKey');
    if (!el) return;
    if (el.type === 'password') { el.type = 'text'; btn.textContent = '\ud83d\ude48'; }
    else { el.type = 'password'; btn.textContent = '\ud83d\udc41\ufe0f'; }
}

function updateSlotBadge(slot) {
    const badge = document.getElementById('cfg_' + slot + '_badge');
    if (!badge) return;
    const cfg = getSlotApi(slot);
    if (cfg.url && cfg.key) {
        badge.textContent = '\u2705 \u5df2\u914d\u7f6e';
        badge.style.background = '#d1fae5'; badge.style.color = '#065f46';
    } else {
        badge.textContent = '\u672a\u914d\u7f6e';
        badge.style.background = '#fef3c7'; badge.style.color = '#92400e';
    }
}

async function testSlotConnection(slot) {
    const cfg = getSlotApi(slot);
    const resultEl = document.getElementById('cfg_' + slot + '_result');
    if (!cfg.url || !cfg.key) {
        resultEl.innerHTML = '<span style="color:#ef4444;">\u274c \u8bf7\u5148\u586b\u5199\u5e76\u4fdd\u5b58</span>';
        return;
    }
    resultEl.innerHTML = '<span style="color:var(--primary);">\u23f3 \u6d4b\u8bd5\u4e2d\u2026</span>';
    try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 15000);
        const resp = await fetch(cfg.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.key },
            body: JSON.stringify({ model: cfg.model || 'gpt-4o-mini', messages: [{ role: 'user', content: '\u8bf7\u56de\u590d\u201c\u8fde\u63a5\u6210\u529f\u201d' }], max_tokens: 20 }),
            signal: ctrl.signal
        });
        clearTimeout(timer);
        if (!resp.ok) { resultEl.innerHTML = '<span style="color:#ef4444;">\u274c \u9519\u8bef ' + resp.status + '</span>'; return; }
        const data = await resp.json();
        const reply = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
        resultEl.innerHTML = '<span style="color:#065f46;">\u2705 ' + escapeHtml((reply || '').slice(0, 50)) + '</span>';
    } catch (err) {
        resultEl.innerHTML = '<span style="color:#ef4444;">\u274c ' + escapeHtml(err.message) + '</span>';
    }
}

function initStepApiConfigs() {
    document.querySelectorAll('.step-api-cfg').forEach(container => {
        const slot = container.getAttribute('data-slot');
        if (!slot || !SLOT_LABELS[slot]) return;
        loadSlotConfig(slot);
        const cfg = getSlotApi(slot);
        const p = 'cfg_' + slot + '_';
        container.innerHTML =
            '<details class="step-api-details" style="margin-bottom:12px;">' +
            '<summary style="cursor:pointer; font-size:0.9rem; font-weight:500; color:var(--text-muted); list-style:none; display:flex; align-items:center; gap:6px;">' +
            '\u2699\ufe0f ' + SLOT_LABELS[slot] +
            ' <span id="' + p + 'badge" style="font-size:0.75rem; padding:1px 6px; border-radius:8px; background:#fef3c7; color:#92400e;">\u672a\u914d\u7f6e</span>' +
            '</summary>' +
            '<div class="api-fields-grid" style="margin-top:10px;">' +
            '<label>URL <input type="text" id="' + p + 'url" value="' + escapeHtml(cfg.url) + '" placeholder="https://api.openai.com/v1/chat/completions"></label>' +
            '<label>Key <div style="position:relative;"><input type="password" id="' + p + 'key" value="' + escapeHtml(cfg.key) + '" placeholder="sk-...">' +
            '<button type="button" id="' + p + 'toggleKey" onclick="toggleSlotKeyVis(\'' + slot + '\')" style="position:absolute;right:4px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:0.9rem;padding:0;">\ud83d\udc41\ufe0f</button></div></label>' +
            '<label>Model <input type="text" id="' + p + 'model" value="' + escapeHtml(cfg.model) + '" placeholder="gpt-4o-mini"></label>' +
            '<label>\u8d85\u65f6(\u79d2) <input type="number" id="' + p + 'timeout" value="' + (cfg.timeoutMs ? cfg.timeoutMs / 1000 : 30) + '" min="5" max="120" style="width:70px;"></label>' +
            '</div>' +
            '<div style="display:flex; gap:8px; margin-top:10px; align-items:center;">' +
            '<button onclick="saveSlotConfig(\'' + slot + '\')" style="padding:4px 10px; font-size:0.8rem;">\ud83d\udcbe \u4fdd\u5b58</button>' +
            '<button class="outline" onclick="testSlotConnection(\'' + slot + '\')" style="padding:4px 10px; font-size:0.8rem;">\ud83d\udd17 \u6d4b\u8bd5</button>' +
            '<button class="outline" onclick="clearSlotConfig(\'' + slot + '\')" style="padding:4px 10px; font-size:0.8rem; border-color:#ef4444; color:#ef4444;">\ud83d\uddd1\ufe0f \u6e05\u7a7a</button>' +
            '<span id="' + p + 'result" style="font-size:0.8rem;"></span>' +
            '</div>' +
            '</details>';
        updateSlotBadge(slot);
    });
    syncCleanupApi();
}

// Replaced old loadApiConfig — now called below
function loadApiConfig() { initStepApiConfigs(); }

const CLEANUP_CACHE_PREFIX = 'm2.fixCache.';

// Simple djb2 hash for cache keys
function hashText(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
    }
    return hash.toString(36);
}

function setFixStatus(message, type) {
    const el = document.getElementById('fixStatus');
    if (!el) return;
    el.innerText = message;
    el.className = 'fix-status';
    if (type) el.classList.add('fix-status--' + type);
}

function showFixResult(text) {
    const wrap = document.getElementById('fixResultWrap');
    const result = document.getElementById('fixResult');
    if (!wrap || !result) return;
    result.innerText = text;
    wrap.style.display = 'block';
}

function getFixSystemPrompt() {
    return '你是一个中文逐字稿纠错助手。用户会发给你一段AI播客音频自动识别出来的逐字稿，里面包含同音错别字、标点错误或语病。' +
        '请通读一遍，修正所有的错别字并理顺标点。' +
        '【绝对铁律】：必须100%保留所有的口语化语气词（如"啊"、"呢"、"对"、"没错"、"哇"、"哎呀"）和原本的对话节奏，绝对不能把它改写成书面死板的文章！' +
        '请直接输出修正后的完整纯文本，不要加任何解释。';
}

async function callCleanupAPI(inputText) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CLEANUP_API.timeoutMs || 30000);

    try {
        const response = await fetch(CLEANUP_API.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + CLEANUP_API.key
            },
            body: JSON.stringify({
                model: CLEANUP_API.model || 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: getFixSystemPrompt() },
                    { role: 'user', content: inputText }
                ],
                temperature: 0.3
            }),
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
            const errorBody = await response.text().catch(() => '');
            throw new Error('API 返回错误 (' + response.status + ')：' + (errorBody.slice(0, 200) || response.statusText));
        }

        const data = await response.json();
        const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
        if (!content) {
            throw new Error('API 返回数据格式异常，未找到 content 字段。');
        }
        return content.trim();
    } catch (err) {
        clearTimeout(timeout);
        if (err.name === 'AbortError') {
            throw new Error('请求超时（' + ((CLEANUP_API.timeoutMs || 30000) / 1000) + '秒），请检查网络或稍后重试。');
        }
        throw err;
    }
}

async function runTranscriptCleanup() {
    const inputEl = document.getElementById('fixInput');
    const btn = document.getElementById('fixBtn');
    const manualDetails = document.getElementById('fixManualDetails');
    const inputText = (inputEl ? inputEl.value : '').trim();

    if (!inputText) {
        showToast('请先粘贴需要纠错的逐字稿文本！', '#f59e0b');
        if (inputEl) inputEl.focus();
        return;
    }

    // Check cache first
    const cacheKey = CLEANUP_CACHE_PREFIX + hashText(inputText);
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
        setFixStatus('✅ 命中缓存，已加载上次结果', 'success');
        showFixResult(cached);
        showToast('已从缓存加载纠错结果！');
        return;
    }

    // Check if API is configured
    if (!CLEANUP_API.url || !CLEANUP_API.key) {
        setFixStatus('⚠️ 未配置 API，使用手工模式', 'warn');
        showToast('未配置 API，请展开下方手工模式，复制 Prompt 发给大模型。', '#f59e0b');
        if (manualDetails) manualDetails.open = true;
        return;
    }

    // Start API call
    btn.disabled = true;
    btn.innerText = '⏳ 纠错中…';
    setFixStatus('正在调用大模型，请稍候…', 'loading');

    try {
        const result = await callCleanupAPI(inputText);
        // Cache the result
        try {
            localStorage.setItem(cacheKey, result);
        } catch (e) {
            // localStorage full — silently skip caching
        }
        showFixResult(result);
        setFixStatus('✅ 纠错完成', 'success');
        showToast('纠错完成！请检查结果并复制。');
    } catch (err) {
        setFixStatus('❌ ' + err.message, 'error');
        showToast('纠错失败：' + err.message, '#ef4444');
        if (manualDetails) manualDetails.open = true;
    } finally {
        btn.disabled = false;
        btn.innerText = '🚀 一键纠错';
    }
}

// =========================================
// M2-2: One-Click Storyboard Split
// =========================================

const SB_CACHE_PREFIX = 'm2.sbCache.';
let sbData = []; // current storyboard rows: [{seq, text, prompt}]

function getSbInputText() {
    // Priority: fixResult (M2-1 output) > fixInput (raw textarea)
    const fixResult = document.getElementById('fixResult');
    const fixResultText = fixResult ? fixResult.innerText.trim() : '';
    if (fixResultText) return fixResultText;

    const fixInput = document.getElementById('fixInput');
    return fixInput ? fixInput.value.trim() : '';
}

function getSbSystemPrompt() {
    const category = document.getElementById('globalCategory').value;
    const data = promptDB[category];
    // Build the image-generation prompt template but replace the placeholder
    // We reuse the prompt structure from promptDB.img
    return '你是一个专业的短视频分镜脚本编写专家。用户会发给你一段播客逐字稿纯文本。\n' +
        '请按照语意转折，将文案切分成 10-15 个画面分段（每个分段大概两三句话，约15秒）。\n' +
        '并为每个分段写出用于豆包 AI 绘画的高质量中文提示词（Prompt）。\n\n' +
        '当前赛道：【' + data.title + '】\n\n' +
        '【输出格式要求 — 严格遵守】：\n' +
        '必须以 Markdown 表格格式输出，表头固定为：\n' +
        '| 分段序号 | 文案内容段落 | AI生图提示词 |\n' +
        '不要输出表格以外的任何内容（不要解释、不要前言、不要总结）。\n' +
        '序号使用纯数字 1, 2, 3 …';
}

function parseSbMarkdownTable(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.startsWith('|'));
    const rows = [];
    for (const line of lines) {
        // Skip header and separator rows
        if (line.match(/^\|[\s\-:|]+\|$/)) continue;
        const cells = line.split('|').map(c => c.trim()).filter(c => c.length > 0);
        if (cells.length >= 3) {
            const seq = cells[0].replace(/[^0-9]/g, '');
            if (seq && !isNaN(Number(seq))) {
                rows.push({ seq: seq, text: cells[1], prompt: cells[2] });
            }
        }
    }
    return rows;
}

function renderSbTable(rows) {
    const tbody = document.getElementById('sbTableBody');
    const wrap = document.getElementById('sbResultWrap');
    if (!tbody || !wrap) return;
    tbody.innerHTML = '';
    rows.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td>' + escapeHtml(r.seq) + '</td><td>' + escapeHtml(r.text) + '</td><td>' + escapeHtml(r.prompt) + '</td>';
        tbody.appendChild(tr);
    });
    wrap.style.display = 'block';
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

function sbToMarkdown() {
    if (!sbData.length) return '';
    let md = '| 分段序号 | 文案内容段落 | AI生图提示词 |\n';
    md += '|---------|-----------|------------|\n';
    sbData.forEach(r => {
        md += '| ' + r.seq + ' | ' + r.text.replace(/\|/g, '\\|') + ' | ' + r.prompt.replace(/\|/g, '\\|') + ' |\n';
    });
    return md;
}

function sbToPlain() {
    if (!sbData.length) return '';
    return sbData.map(r => '【第' + r.seq + '段】\n文案：' + r.text + '\n提示词：' + r.prompt).join('\n\n');
}

function copySbMarkdown() {
    const md = sbToMarkdown();
    if (!md) { showToast('还没有分镜数据可复制。', '#f59e0b'); return; }
    copyToClipboard(md, '已复制 Markdown 表格！');
}

function copySbPlain() {
    const text = sbToPlain();
    if (!text) { showToast('还没有分镜数据可复制。', '#f59e0b'); return; }
    copyToClipboard(text, '已复制纯文本分镜！');
}

function setSbStatus(message, type) {
    const el = document.getElementById('sbStatus');
    if (!el) return;
    el.innerText = message;
    el.className = 'fix-status';
    if (type) el.classList.add('fix-status--' + type);
}

async function callStoryboardAPI(inputText) {
    const sbApi = getSlotApi('storyboard');
    const controller = new AbortController();
    const timeoutMs = sbApi.timeoutMs ? sbApi.timeoutMs * 2 : 60000;
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(sbApi.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + sbApi.key
            },
            body: JSON.stringify({
                model: sbApi.model || 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: getSbSystemPrompt() },
                    { role: 'user', content: inputText }
                ],
                temperature: 0.4
            }),
            signal: controller.signal
        });

        clearTimeout(timer);

        if (!response.ok) {
            const errorBody = await response.text().catch(() => '');
            throw new Error('API 返回错误 (' + response.status + ')：' + (errorBody.slice(0, 200) || response.statusText));
        }

        const data = await response.json();
        const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
        if (!content) {
            throw new Error('API 返回数据格式异常，未找到 content 字段。');
        }
        return content.trim();
    } catch (err) {
        clearTimeout(timer);
        if (err.name === 'AbortError') {
            throw new Error('请求超时（' + (timeoutMs / 1000) + '秒），分镜内容较长，请稍后重试。');
        }
        throw err;
    }
}

async function runStoryboardSplit() {
    const btn = document.getElementById('sbBtn');
    const manualDetails = document.getElementById('sbManualDetails');
    const inputText = getSbInputText();

    if (!inputText) {
        showToast('请先完成上方的纠错步骤，或在纠错输入框中粘贴逐字稿文本！', '#f59e0b');
        return;
    }

    // Check cache
    const cacheKey = SB_CACHE_PREFIX + hashText(inputText);
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
        try {
            sbData = JSON.parse(cached);
            renderSbTable(sbData);
            setSbStatus('✅ 命中缓存，已加载上次分镜结果', 'success');
            showToast('已从缓存加载分镜表！');
            return;
        } catch (e) {
            localStorage.removeItem(cacheKey);
        }
    }

    // Check API
    const sbApi = getSlotApi('storyboard');
    if (!sbApi.url || !sbApi.key) {
        setSbStatus('⚠️ 未配置 API，使用手工模式', 'warn');
        showToast('未配置 API，请展开下方手工模式，复制 Prompt 发给大模型。', '#f59e0b');
        if (manualDetails) manualDetails.open = true;
        return;
    }

    // Start API call
    btn.disabled = true;
    btn.innerText = '⏳ 分镜生成中…';
    setSbStatus('正在调用大模型生成分镜，请稍候…', 'loading');

    try {
        const rawResult = await callStoryboardAPI(inputText);
        const rows = parseSbMarkdownTable(rawResult);

        if (rows.length === 0) {
            throw new Error('大模型返回的内容无法解析为表格，请尝试手工模式。原始输出已记录到控制台。');
        }

        sbData = rows;
        // Cache
        try {
            localStorage.setItem(cacheKey, JSON.stringify(rows));
        } catch (e) { /* localStorage full */ }

        renderSbTable(rows);
        setSbStatus('✅ 分镜完成，共 ' + rows.length + ' 段', 'success');
        showToast('分镜表生成完成！共 ' + rows.length + ' 段。');
    } catch (err) {
        setSbStatus('❌ ' + err.message, 'error');
        showToast('分镜失败：' + err.message, '#ef4444');
        if (manualDetails) manualDetails.open = true;
    } finally {
        btn.disabled = false;
        btn.innerText = '🎬 一键分镜';
    }
}

// =========================================
// M3-1: Viral Gene Analyzer (Step 0)
// =========================================

const VIRAL_CACHE_PREFIX = 'm3.viralCache.';

function setViralStatus(message, type) {
    const el = document.getElementById('analyzeStatus');
    if (!el) return;
    el.innerText = message;
    el.className = 'fix-status';
    if (type) el.classList.add('fix-status--' + type);
}

function copyViralDraft() {
    const text = document.getElementById('viralNewDraft').value;
    if (!text) { showToast('还没有新稿可复制。', '#f59e0b'); return; }
    copyToClipboard(text, '已复制原创爆款新稿！');
}

function passDraftToStep1() {
    const text = document.getElementById('viralNewDraft').value;
    if (!text) { showToast('还没有新稿可使用。', '#f59e0b'); return; }

    // Set text to rawText fallback
    const rawTextEl = document.getElementById('rawText');
    if (rawTextEl) {
        rawTextEl.value = text;
        showToast('新稿已填入剧本暂存箱！');
    }

    // Switch navigation to step1
    const nli = Array.from(document.querySelectorAll('.nav-item')).find(el => el.getAttribute('data-target') === 'step1');
    if (nli) nli.click();
}

async function runViralAnalysis() {
    const btn = document.getElementById('analyzeBtn');
    const manualDetails = document.getElementById('viralManualDetails');
    const resultWrap = document.getElementById('viralResultWrap');

    // Collect inputs
    let inputs = [];
    for (let i = 1; i <= 5; i++) {
        const el = document.getElementById('viralInput' + i);
        if (el) {
            const val = el.value.trim();
            if (val) {
                if (val.length > 3000) {
                    showToast('第 ' + i + ' 篇文案字数超过3000字，为节省 Token 请删减后再试！', '#f59e0b');
                    return;
                }
                inputs.push(val);
            }
        }
    }

    if (inputs.length === 0) {
        showToast('请至少粘贴1篇爆款文案！', '#f59e0b');
        return;
    }

    const kwEl = document.getElementById('viralKeyword');
    const keyword = kwEl ? kwEl.value.trim() : '';

    // Check Cache
    const cacheStr = inputs.join('|') + '|||' + keyword;
    const cacheKey = VIRAL_CACHE_PREFIX + hashText(cacheStr);
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
        try {
            const parsed = JSON.parse(cached);
            document.getElementById('viralStructure').innerHTML = parsed.structure.replace(/\n/g, '<br>');
            document.getElementById('viralNewDraft').value = parsed.draft;
            resultWrap.style.display = 'block';
            setViralStatus('✅ 命中缓存，已加载上次分析结果', 'success');
            showToast('已从缓存加载！');
            return;
        } catch (e) {
            localStorage.removeItem(cacheKey);
        }
    }

    // API Check
    const viralApi = getSlotApi('viral');
    if (!viralApi.url || !viralApi.key) {
        setViralStatus('⚠️ 未配置 API，使用手工模式', 'warn');
        showToast('未配置 API，请展开下方手工模式自行发给大模型。', '#f59e0b');
        if (manualDetails) manualDetails.open = true;
        return;
    }

    // Prompt Construction
    const sysPrompt = '你是一个顶级的短视频爆款拆解专家与编导。我将发给你几篇点赞极高的中老年赛道爆款文案。\n' +
        '请你：\n' +
        '1. 分析并提炼出这些爆款的【共性结构】。\n' +
        '2. 提取出3条黄金开场Hook、3条核心痛点、3条金句。\n' +
        '3. （重要）结合这些结构和痛点' + (keyword ? '，以及关键词【' + keyword + '】' : '') + '，重新创作一篇【完全原创的新稿】。语气要像真实的电台主持人，贴近50岁中国女性的语境，逻辑严密、情感扎心。\n\n' +
        '要求输出格式必须分为上下两部分，中间用分隔符 ===DRAFT=== 隔开。\n' +
        '格式示范：\n' +
        '#### 爆款共性结构\n' +
        '- 痛点引入: ...\n' +
        '#### 黄金Hook与核心痛点\n' +
        '...\n' +
        '===DRAFT===\n' +
        '创作的新文案正文直接放在这里（不用写标题）';

    const userContent = inputs.map((text, idx) => '【爆款文案 ' + (idx + 1) + '】:\n' + text).join('\n\n');

    btn.disabled = true;
    btn.innerText = '⏳ 分析重组中(约需数十秒)…';
    setViralStatus('正在分析痛点并生成新稿，请稍候…', 'loading');

    const callApi = async () => {
        const controller = new AbortController();
        const timeoutMs = viralApi.timeoutMs || 60000;
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const resp = await fetch(viralApi.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + viralApi.key },
                body: JSON.stringify({
                    model: viralApi.model || 'gpt-4o-mini',
                    messages: [{ role: 'system', content: sysPrompt }, { role: 'user', content: userContent }],
                    temperature: 0.6
                }),
                signal: controller.signal
            });
            clearTimeout(timer);
            if (!resp.ok) {
                const errBody = await resp.text().catch(() => '');
                throw new Error('API错误: (' + resp.status + ') ' + errBody.slice(0, 50));
            }
            const data = await resp.json();
            const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
            if (!content) throw new Error('API 返回数据格式异常，未找到 content 字段。');
            return content.trim();
        } catch (err) {
            clearTimeout(timer);
            if (err.name === 'AbortError') throw new Error('请求超时（60秒），原文本可能过于庞大，请稍后重试。');
            throw err;
        }
    };

    // Run with 1 retry
    let resultText = '';
    try {
        resultText = await callApi();
    } catch (err) {
        setViralStatus('请求出错，正在重试第1次...', 'warn');
        try {
            resultText = await callApi();
        } catch (err2) {
            setViralStatus('❌ 重试失败: ' + err2.message, 'error');
            showToast('分析失败：' + err2.message, '#ef4444');
            if (manualDetails) manualDetails.open = true;
            btn.disabled = false;
            btn.innerText = '🚀 一键拆解重组';
            return;
        }
    }

    // Parsing response
    const parts = resultText.split('===DRAFT===');
    let structure = parts[0] ? parts[0].trim() : '（未能提取到结构内容）';
    let draft = parts[1] ? parts[1].trim() : resultText;

    // Save to Cache and Render
    try {
        localStorage.setItem(cacheKey, JSON.stringify({ structure: structure, draft: draft }));
    } catch (e) { }

    document.getElementById('viralStructure').innerHTML = escapeHtml(structure).replace(/\n/g, '<br>');
    document.getElementById('viralNewDraft').value = draft;
    resultWrap.style.display = 'block';

    setViralStatus('✅ 拆解重组完成！', 'success');
    showToast('原创新稿已生成！');

    btn.disabled = false;
    btn.innerText = '🚀 一键拆解重组';
}

// =========================================

initFlowControls();
initPersistence();
loadApiConfig();

