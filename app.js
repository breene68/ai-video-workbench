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

// --- API Configuration (set these to enable auto-cleanup) ---
// To enable: set window.CLEANUP_API = { url: '...', key: '...' } before this script,
// or modify the object below.
const CLEANUP_API = window.CLEANUP_API || {
    url: '',   // e.g. 'https://api.openai.com/v1/chat/completions'
    key: '',   // e.g. 'sk-...'
    model: '', // e.g. 'gpt-4o-mini'
    timeoutMs: 30000
};

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

initFlowControls();
initPersistence();
