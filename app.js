// Tab switching logic
const navItems = document.querySelectorAll('.nav-item');
const panels = document.querySelectorAll('.step-panel');

navItems.forEach(item => {
    item.addEventListener('click', () => {
        // Remove active class from all
        navItems.forEach(nav => nav.classList.remove('active'));
        panels.forEach(panel => panel.classList.remove('active'));

        // Add active class to clicked
        item.classList.add('active');
        const targetId = item.getAttribute('data-target');
        document.getElementById(targetId).classList.add('active');
    });
});

let currentCoverTool = 'doubao';

// Update prompts based on selection
function updatePrompts() {
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

    showToast('已切换至【' + data.title + '】专属提示词！', '#3b82f6');
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
    navigator.clipboard.writeText(text).then(() => {
        showToast('已复制到剪贴板！可以直接去粘贴了。');
    });
}

// Copy textarea content
function copyContent(elementId) {
    const text = document.getElementById(elementId).value;
    if (!text) {
        showToast('暂存箱是空的哦~', '#f59e0b');
        return;
    }
    navigator.clipboard.writeText(text).then(() => {
        showToast('已复制暂存箱内容！');
    });
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
