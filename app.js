const loginCard = document.getElementById('loginCard');
const dashboardCard = document.getElementById('dashboardCard');
const loginBtn = document.getElementById('loginBtn');
const loginUser = document.getElementById('loginUser');
const loginPass = document.getElementById('loginPass');
const loginError = document.getElementById('loginError');
const logoutLink = document.getElementById('logoutLink');

const form = document.getElementById('buildForm');
const submitBtn = document.getElementById('submitBtn');
const statusBox = document.getElementById('statusBox');
const workflowDot = document.getElementById('workflowDot');
const workflowText = document.getElementById('workflowText');
const downloadsEl = document.getElementById('downloads');

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
  dashboardCard.style.display = 'block';
  checkStatus();
}

function showLogin() {
  loginCard.style.display = 'block';
  dashboardCard.style.display = 'none';
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

logoutLink.addEventListener('click', (e) => {
  e.preventDefault();
  clearToken();
  if (pollTimer) clearInterval(pollTimer);
  showLogin();
});

// --- Build submission ---
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  submitBtn.textContent = 'در حال ارسال...';
  statusBox.classList.add('show');
  downloadsEl.style.display = 'none';
  workflowDot.className = 'dot progress';
  workflowText.textContent = 'در حال ارسال فایل‌ها به گیت‌هاب...';

  try {
    const formData = new FormData(form);
    const res = await fetch(`${API_BASE_URL}/build`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + getToken() },
      body: formData,
    });

    if (res.status === 401) {
      clearToken();
      showLogin();
      return;
    }

    const data = await res.json();
    if (!data.ok) {
      workflowDot.className = 'dot err';
      workflowText.textContent = 'خطا: ' + data.error;
      submitBtn.disabled = false;
      submitBtn.textContent = 'ساخت برنامه';
      return;
    }

    workflowText.textContent = 'ارسال شد، منتظر شروع ساخت روی گیت‌هاب...';
    startPolling();
  } catch (err) {
    workflowDot.className = 'dot err';
    workflowText.textContent = 'خطای شبکه: ' + err.message;
    submitBtn.disabled = false;
    submitBtn.textContent = 'ساخت برنامه';
  }
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

    statusBox.classList.add('show');
    const run = data.workflow;
    const release = data.release;

    if (run && run.status !== 'completed') {
      workflowDot.className = 'dot progress';
      workflowText.textContent = 'در حال ساخت (' + (run.status === 'queued' ? 'در صف' : 'در حال اجرا') + ')...';
    } else if (run && run.status === 'completed' && run.conclusion === 'failure') {
      workflowDot.className = 'dot err';
      workflowText.textContent = 'ساخت با خطا مواجه شد. لاگ را در گیت‌هاب ببین.';
      stopPollingAndReenable();
    } else if (release) {
      workflowDot.className = 'dot ok';
      workflowText.textContent = 'آماده است - نسخه ' + release.tag;
      downloadsEl.style.display = 'flex';
      downloadsEl.innerHTML = '';
      if (release.exe_url) downloadsEl.innerHTML += `<a href="${release.exe_url}">دانلود ویندوز (exe)</a>`;
      if (release.apk_url) downloadsEl.innerHTML += `<a href="${release.apk_url}">دانلود اندروید (apk)</a>`;
      stopPollingAndReenable();
    }
  } catch (err) {
    // Network hiccup during polling - just try again next tick.
  }
}

function stopPollingAndReenable() {
  if (pollTimer) clearInterval(pollTimer);
  submitBtn.disabled = false;
  submitBtn.textContent = 'ساخت برنامه';
}

// --- Boot ---
if (getToken()) {
  showDashboard();
} else {
  showLogin();
}
