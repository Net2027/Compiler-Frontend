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

const modeSite = document.getElementById('mode_site');
const modeCustom = document.getElementById('mode_custom');
const modeHint = document.getElementById('modeHint');
const siteModeFields = document.getElementById('siteModeFields');
const customModeFields = document.getElementById('customModeFields');
const customWindowsField = document.getElementById('customWindowsField');
const customAndroidField = document.getElementById('customAndroidField');

const winProjInput = document.getElementById('windows_project_zip');
const winProjDropzone = document.getElementById('winProjDropzone');
const winProjDropBody = document.getElementById('winProjDropBody');
const winProjFileChip = document.getElementById('winProjFileChip');

const androidProjInput = document.getElementById('android_project_zip');
const androidProjDropzone = document.getElementById('androidProjDropzone');
const androidProjDropBody = document.getElementById('androidProjDropBody');
const androidProjFileChip = document.getElementById('androidProjFileChip');

const platformWindows = document.getElementById('platform_windows');
const platformAndroid = document.getElementById('platform_android');
const platformError = document.getElementById('platformError');

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
  dropzone.addEventListener('click', (e) => {
    if (e.target === input) return; // this click is the input's own (bubbled) synthetic click - don't re-trigger
    input.click();
  });
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

function setupZipDropzone(dropzone, input, dropBody, chipEl) {
  setupDropzone(dropzone, input, (files) => {
    if (!files.length) return;
    const file = files[0];
    dropBody.style.display = 'none';
    chipEl.style.display = 'flex';
    const removeId = input.id + 'Remove';
    chipEl.innerHTML = `<span>${escapeHtml(file.name)} — ${formatBytes(file.size)}</span><span class="chip-remove" id="${removeId}">✕</span>`;
    document.getElementById(removeId).addEventListener('click', (e) => {
      e.stopPropagation();
      input.value = '';
      chipEl.style.display = 'none';
      dropBody.style.display = 'flex';
    });
  });
}

setupZipDropzone(zipDropzone, zipInput, zipDropBody, zipFileChip);
setupZipDropzone(winProjDropzone, winProjInput, winProjDropBody, winProjFileChip);
setupZipDropzone(androidProjDropzone, androidProjInput, androidProjDropBody, androidProjFileChip);

// --- Mode toggle (site vs custom) ---
function applyModeVisibility() {
  const isCustom = modeCustom.checked;
  siteModeFields.style.display = isCustom ? 'none' : 'block';
  customModeFields.style.display = isCustom ? 'block' : 'none';
  modeHint.textContent = isCustom
    ? 'پروژه‌ی خودت (C#/اندروید) رو بده، فقط کامپایل و امضا می‌شه — بدون هیچ تغییری.'
    : 'فایل‌های سایت (html/css/js) رو بده، خودکار داخل یک اپ ویندوز/اندروید بسته‌بندی می‌شه.';

  customWindowsField.style.display = platformWindows.checked ? 'block' : 'none';
  customAndroidField.style.display = platformAndroid.checked ? 'block' : 'none';
}
modeSite.addEventListener('change', applyModeVisibility);
modeCustom.addEventListener('change', applyModeVisibility);
platformWindows.addEventListener('change', applyModeVisibility);
platformAndroid.addEventListener('change', applyModeVisibility);
applyModeVisibility();

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

  if (!platformWindows.checked && !platformAndroid.checked) {
    platformError.style.display = 'block';
    return;
  }
  platformError.style.display = 'none';

  let platforms = 'both';
  if (platformWindows.checked && !platformAndroid.checked) platforms = 'windows';
  if (!platformWindows.checked && platformAndroid.checked) platforms = 'android';

  const isCustom = modeCustom.checked;
  if (!isCustom && zipInput.files.length === 0) {
    alert('فایل zip سایت را انتخاب کن.');
    return;
  }
  if (isCustom && platformWindows.checked && winProjInput.files.length === 0) {
    alert('فایل zip پروژه‌ی ویندوز را انتخاب کن.');
    return;
  }
  if (isCustom && platformAndroid.checked && androidProjInput.files.length === 0) {
    alert('فایل zip پروژه‌ی اندروید را انتخاب کن.');
    return;
  }

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
  formData.set('platforms', platforms);
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
    loadHistory();
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
  pollTimer = setInterval(() => { checkStatus(); loadHistory(); }, 6000);
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

    renderHistory(data.items);
  } catch (err) {
    historyList.innerHTML = `<div class="hint">خطای شبکه در بارگذاری تاریخچه.</div>`;
  }
}

const TRASH_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`;

function historyStatusInfo(item) {
  if (item.status !== 'completed') {
    return { dotClass: 'progress', label: item.status === 'queued' ? 'در صف' : 'در حال ساخت' };
  }
  if (item.conclusion === 'failure') {
    return { dotClass: 'err', label: 'ناموفق' };
  }
  if (item.exe_url || item.apk_url) {
    return { dotClass: 'ok', label: 'آماده' };
  }
  return { dotClass: '', label: item.conclusion || '—' };
}

function renderHistory(items) {
  if (!items || items.length === 0) {
    historyList.innerHTML = `<div class="hint">هنوز هیچ برنامه‌ای ساخته نشده.</div>`;
    return;
  }

  historyList.innerHTML = '';
  for (const item of items) {
    const row = document.createElement('div');
    row.className = 'history-item';

    const date = new Date(item.created_at);
    const dateText = isNaN(date) ? item.created_at : date.toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' });
    const info = historyStatusInfo(item);

    const links = [];
    if (item.exe_url) links.push(`<a href="${item.exe_url}">exe</a>`);
    if (item.apk_url) links.push(`<a href="${item.apk_url}">apk</a>`);

    const sourceButtons = [];
    if (item.has_source_windows) {
      sourceButtons.push(`<button class="history-source" data-run="${item.run_number}" data-platform="windows">کد ویندوز</button>`);
    }
    if (item.has_source_android) {
      sourceButtons.push(`<button class="history-source" data-run="${item.run_number}" data-platform="android">کد اندروید</button>`);
    }

    row.innerHTML = `
      <div class="history-info">
        <div class="history-name">
          <span class="dot ${info.dotClass}" style="display:inline-block; margin-left:6px;"></span>
          ${escapeHtml(item.app_name)}
        </div>
        <div class="history-meta">
          <span class="history-date">${dateText}</span>
          <span class="history-tag">${escapeHtml(item.tag)}</span>
          <span class="history-date">${escapeHtml(info.label)}</span>
        </div>
      </div>
      <div class="history-actions">
        ${links.join('')}
        ${sourceButtons.join('')}
        <button class="history-delete" data-run="${item.run_number}" title="حذف از تاریخچه">${TRASH_ICON}</button>
      </div>
    `;
    historyList.appendChild(row);
  }

  historyList.querySelectorAll('.history-delete').forEach((btn) => {
    btn.addEventListener('click', () => deleteHistoryItem(btn.dataset.run, btn));
  });
  historyList.querySelectorAll('.history-source').forEach((btn) => {
    btn.addEventListener('click', () => downloadSource(btn.dataset.run, btn.dataset.platform, btn));
  });
}

async function downloadSource(runNumber, platform, btnEl) {
  const originalText = btnEl.textContent;
  btnEl.disabled = true;
  btnEl.textContent = 'در حال دریافت...';

  try {
    const res = await fetch(`${API_BASE_URL}/history/${encodeURIComponent(runNumber)}/source/${platform}`, {
      headers: { 'Authorization': 'Bearer ' + getToken() },
    });

    if (res.status === 401) {
      clearToken();
      showLogin();
      return;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'خطای ناشناخته' }));
      alert('خطا در دریافت کد: ' + (data.error || res.status));
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `source-${platform}-${runNumber}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert('خطای شبکه در دریافت کد.');
  } finally {
    btnEl.disabled = false;
    btnEl.textContent = originalText;
  }
}

async function deleteHistoryItem(runNumber, btnEl) {
  if (!confirm('این مورد از تاریخچه حذف بشه؟ این کار قابل بازگشت نیست.')) return;

  btnEl.disabled = true;
  const originalHtml = btnEl.innerHTML;
  btnEl.innerHTML = '…';

  try {
    const res = await fetch(`${API_BASE_URL}/history/${encodeURIComponent(runNumber)}`, {
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
