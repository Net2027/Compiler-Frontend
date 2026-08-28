const loginCard = document.getElementById('loginCard');
const dashboardCard = document.getElementById('dashboardCard');
const loginBtn = document.getElementById('loginBtn');
const loginUser = document.getElementById('loginUser');
const loginPass = document.getElementById('loginPass');
const loginError = document.getElementById('loginError');
const logoutLink = document.getElementById('logoutLink');

const form = document.getElementById('buildForm');
const submitBtn = document.getElementById('submitBtn');
const submitBtnLabel = submitBtn.querySelector('.btn-label');
const statusBox = document.getElementById('statusBox');
const workflowDot = document.getElementById('workflowDot');
const workflowText = document.getElementById('workflowText');
const downloadsEl = document.getElementById('downloads');
const progressWrap = document.getElementById('progressWrap');
const progressFill = document.getElementById('progressFill');
const progressLabel = document.getElementById('progressLabel');
const historyList = document.getElementById('historyList');
const pipeline = document.getElementById('pipeline');

const iconInput = document.getElementById('icon');
const iconDropzone = document.getElementById('iconDropzone');
const iconDropBody = document.getElementById('iconDropBody');
const iconPreview = document.getElementById('iconPreview');

const zipInput = document.getElementById('site_zip');
const zipDropzone = document.getElementById('zipDropzone');
const zipDropBody = document.getElementById('zipDropBody');
const zipFileChip = document.getElementById('zipFileChip');

let pollTimer = null;

function getToken() {
  return localStorage.getItem('panel_token');
}
function setToken(token) {
  localStorage.setItem('panel_token', token);
}
function clearToken() {
  localStorage.removeItem('panel_token');
}

function showDashboard() {
  loginCard.style.display = 'none';
  dashboardCard.style.display = 'flex';
  logoutLink.style.display = 'inline-block';
  checkStatus();
  loadHistory();
}
function showLogin() {
  loginCard.style.display = 'block';
  dashboardCard.style.display = 'none';
  logoutLink.style.display = 'none';
}

// --- Login ---
loginBtn.addEventListener('click', async () => {
  loginError.style.display = 'none';
  loginBtn.disabled = true;
  loginBtn.textContent = 'در حال ورود...';
  try {
    const res = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: loginUser.value, password: loginPass.value }),
    });
    const data = await res.json();
    if (!data.ok) {
      loginError.textContent = data.error || 'ورود ناموفق بود.';
      loginError.style.display = 'block';
      return;
    }
    setToken(data.token);
    showDashboard();
  } catch (err) {
    loginError.textContent = 'خطای شبکه: ' + err.message;
    loginError.style.display = 'block';
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'ورود';
  }
});

loginPass.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') loginBtn.click();
});

logoutLink.addEventListener('click', (e) => {
  e.preventDefault();
  clearToken();
  if (pollTimer) clearInterval(pollTimer);
  showLogin();
});

// --- Dropzones ---
function setupDropzone(dropzone, input, onFiles) {
  dropzone.addEventListener('click', () => input.click());
  dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('drag-over'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    if (e.dataTransfer.files.length) {
      input.files = e.dataTransfer.files;
      onFiles(input.files);
    }
  });
  input.addEventListener('change', () => onFiles(input.files));
}

setupDropzone(iconDropzone, iconInput, (files) => {
  if (!files.length) return;
  const file = files[0];
  const url = URL.createObjectURL(file);
  iconPreview.src = url;
  iconPreview.style.display = 'block';
  iconDropBody.style.display = 'none';
});

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

setupDropzone(zipDropzone, zipInput, (files) => {
  if (!files.length) return;
  const file = files[0];
  zipDropBody.style.display = 'none';
  zipFileChip.style.display = 'flex';
  zipFileChip.innerHTML = `<span>${escapeHtml(file.name)} — ${formatBytes(file.size)}</span><span class="chip-remove" id="zipRemove">✕</span>`;
  document.getElementById('zipRemove').addEventListener('click', (e) => {
    e.stopPropagation();
    zipInput.value = '';
    zipFileChip.style.display = 'none';
    zipDropBody.style.display = 'flex';
  });
});

// --- Pipeline helpers ---
function setPipelineStep(name, state) {
  // state: 'active' | 'done' | 'error' | null(reset)
  const el = pipeline.querySelector(`[data-step="${name}"]`);
  if (!el) return;
  el.classList.remove('active', 'done', 'error');
  if (state) el.classList.add(state);
}
function resetPipeline() {
  pipeline.querySelectorAll('.pipeline-step').forEach((el) => el.classList.remove('active', 'done', 'error'));
}

// --- Build submission (XHR so we get upload progress) ---
form.addEventListener('submit', (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  submitBtnLabel.textContent = 'در حال ارسال...';
  statusBox.classList.add('show');
  downloadsEl.style.display = 'none';
  pipeline.style.display = 'flex';
  resetPipeline();
  setPipelineStep('upload', 'active');
  workflowDot.className = 'dot progress';
  workflowText.textContent = 'در حال ارسال فایل‌ها...';
  progressWrap.style.display = 'block';
  progressFill.style.width = '0%';
  progressLabel.textContent = '0%';

  const formData = new FormData(form);
  const xhr = new XMLHttpRequest();
  xhr.open('POST', `${API_BASE_URL}/build`);
  xhr.setRequestHeader('Authorization', 'Bearer ' + getToken());

  xhr.upload.addEventListener('progress', (ev) => {
    if (!ev.lengthComputable) return;
    const percent = Math.round((ev.loaded / ev.total) * 100);
    progressFill.style.width = percent + '%';
    progressLabel.textContent = percent + '%';
    if (percent >= 100) {
      setPipelineStep('upload', 'done');
      setPipelineStep('commit', 'active');
      workflowText.textContent = 'در حال ارسال به گیت‌هاب...';
    }
  });

  xhr.addEventListener('load', () => {
    progressWrap.style.display = 'none';

    if (xhr.status === 401) {
      clearToken();
      showLogin();
      return;
    }

    let data;
    try {
      data = JSON.parse(xhr.responseText);
    } catch {
      data = { ok: false, error: 'پاسخ نامعتبر از سرور.' };
    }

    if (!data.ok) {
      setPipelineStep('commit', 'error');
      workflowDot.className = 'dot err';
      workflowText.textContent = 'خطا: ' + data.error;
      submitBtn.disabled = false;
      submitBtnLabel.textContent = 'کامپایل کن';
      return;
    }

    setPipelineStep('commit', 'done');
    setPipelineStep('build', 'active');
    workflowText.textContent = 'ارسال شد، منتظر شروع ساخت روی گیت‌هاب...';
    startPolling();
  });

  xhr.addEventListener('error', () => {
    progressWrap.style.display = 'none';
    setPipelineStep('upload', 'error');
    workflowDot.className = 'dot err';
    workflowText.textContent = 'خطای شبکه در حین آپلود. دوباره امتحان کن.';
    submitBtn.disabled = false;
    submitBtnLabel.textContent = 'کامپایل کن';
  });

  xhr.send(formData);
});

function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(checkStatus, 6000);
  checkStatus();
}

async function checkStatus() {
  const token = getToken();
  if (!token) return;

  try {
    const res = await fetch(`${API_BASE_URL}/status`, {
      headers: { 'Authorization': 'Bearer ' + token },
    });

    if (res.status === 401) {
      clearToken();
      if (pollTimer) clearInterval(pollTimer);
      showLogin();
      return;
    }

    const data = await res.json();
    if (!data.ok) return;

    const run = data.workflow;
    const release = data.release;
    if (!run && !release) return; // nothing has ever been built - keep the form quiet

    statusBox.classList.add('show');
    pipeline.style.display = 'flex';

    if (run && run.status !== 'completed') {
      setPipelineStep('commit', 'done');
      setPipelineStep('build', 'active');
      workflowDot.className = 'dot progress';
      workflowText.textContent = 'در حال ساخت (' + (run.status === 'queued' ? 'در صف' : 'در حال اجرا') + ')...';
    } else if (run && run.status === 'completed' && run.conclusion === 'failure') {
      setPipelineStep('build', 'error');
      workflowDot.className = 'dot err';
      workflowText.textContent = 'ساخت با خطا مواجه شد. لاگ را در گیت‌هاب ببین.';
      stopPollingAndReenable();
    } else if (release) {
      setPipelineStep('commit', 'done');
      setPipelineStep('build', 'done');
      setPipelineStep('ready', 'done');
      workflowDot.className = 'dot ok';
      workflowText.textContent = 'آماده است — نسخه ' + release.tag;
      downloadsEl.style.display = 'flex';
      downloadsEl.innerHTML = '';
      if (release.exe_url) downloadsEl.innerHTML += `<a href="${release.exe_url}">⬇ دانلود ویندوز (exe)</a>`;
      if (release.apk_url) downloadsEl.innerHTML += `<a href="${release.apk_url}">⬇ دانلود اندروید (apk)</a>`;
      stopPollingAndReenable();
      loadHistory();
    }
  } catch (err) {
    // Network hiccup during polling - just try again next tick.
  }
}

function stopPollingAndReenable() {
  if (pollTimer) clearInterval(pollTimer);
  submitBtn.disabled = false;
  submitBtnLabel.textContent = 'کامپایل کن';
}

// --- History ---
async function loadHistory() {
  const token = getToken();
  if (!token) return;

  try {
    const res = await fetch(`${API_BASE_URL}/history`, {
      headers: { 'Authorization': 'Bearer ' + token },
    });

    if (res.status === 401) {
      clearToken();
      showLogin();
      return;
    }

    const data = await res.json();
    if (!data.ok) {
      historyList.innerHTML = `<div class="hint">خطا در بارگذاری تاریخچه: ${escapeHtml(data.error)}</div>`;
      return;
    }

    renderHistory(data.releases);
  } catch (err) {
    historyList.innerHTML = `<div class="hint">خطای شبکه در بارگذاری تاریخچه.</div>`;
  }
}

const TRASH_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`;

function renderHistory(releases) {
  if (!releases || releases.length === 0) {
    historyList.innerHTML = `<div class="hint">هنوز هیچ برنامه‌ای ساخته نشده.</div>`;
    return;
  }

  historyList.innerHTML = '';
  for (const rel of releases) {
    const item = document.createElement('div');
    item.className = 'history-item';

    const date = new Date(rel.published_at);
    const dateText = isNaN(date) ? rel.published_at : date.toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' });

    const links = [];
    if (rel.exe_url) links.push(`<a href="${rel.exe_url}">exe</a>`);
    if (rel.apk_url) links.push(`<a href="${rel.apk_url}">apk</a>`);

    item.innerHTML = `
      <div class="history-info">
        <div class="history-name">${escapeHtml(rel.name || rel.tag)}</div>
        <div class="history-meta">
          <span class="history-date">${dateText}</span>
          <span class="history-tag">${escapeHtml(rel.tag)}</span>
        </div>
      </div>
      <div class="history-actions">
        ${links.join('')}
        <button class="history-delete" data-tag="${escapeHtml(rel.tag)}" title="حذف از تاریخچه">${TRASH_ICON}</button>
      </div>
    `;
    historyList.appendChild(item);
  }

  historyList.querySelectorAll('.history-delete').forEach((btn) => {
    btn.addEventListener('click', () => deleteHistoryItem(btn.dataset.tag, btn));
  });
}

async function deleteHistoryItem(tag, btnEl) {
  if (!confirm('این مورد از تاریخچه حذف بشه؟ این کار قابل بازگشت نیست.')) return;

  btnEl.disabled = true;
  const originalHtml = btnEl.innerHTML;
  btnEl.innerHTML = '…';

  try {
    const res = await fetch(`${API_BASE_URL}/history/${encodeURIComponent(tag)}`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + getToken() },
    });

    if (res.status === 401) {
      clearToken();
      showLogin();
      return;
    }

    const data = await res.json();
    if (!data.ok) {
      alert('خطا در حذف: ' + data.error);
      btnEl.disabled = false;
      btnEl.innerHTML = originalHtml;
      return;
    }

    loadHistory();
  } catch (err) {
    alert('خطای شبکه در حذف.');
    btnEl.disabled = false;
    btnEl.innerHTML = originalHtml;
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// --- Boot ---
if (getToken()) {
  showDashboard();
} else {
  showLogin();
}
