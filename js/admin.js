/* js/admin.js – Admin authentication and upload logic */
const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxsiEzf4ESd3SsPImUYM5w77koNGwQRWOaPGfUWjoGqyQvxD-pCtIEUyaFXlOonfYrq/exec";

const SESSION_KEY  = "aktar_session";
const SESSION_LIFE = 60 * 60 * 1000; // 1 hour in ms

/* ── Session helpers ───────────────────────────────────────── */
function saveSession(token) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token, ts: Date.now() }));
}

function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

function isSessionValid(session) {
  return session && session.token && (Date.now() - session.ts < SESSION_LIFE);
}

function guardSession() {
  const s = getSession();
  if (!isSessionValid(s)) {
    if (s) { clearSession(); showToast("Session expired. Please log in again.", "warning"); }
    showLoginScreen();
    return null;
  }
  return s.token;
}

/* ── UI toggles ────────────────────────────────────────────── */
function showLoginScreen() {
  document.getElementById("loginScreen").style.display = "flex";
  document.getElementById("dashboardLayout").classList.remove("active");
}

function showDashboard(token) {
  const ls = document.getElementById("loginScreen");
  ls.classList.add("fade-out");
  setTimeout(() => {
    ls.style.display = "none";
    ls.classList.remove("fade-out");
    const dash = document.getElementById("dashboardLayout");
    dash.classList.add("active", "fade-in");
    setTimeout(() => dash.classList.remove("fade-in"), 500);
    startSessionClock(token);
  }, 350);
}

/* ── Session clock display ─────────────────────────────────── */
let clockInterval = null;

function startSessionClock(token) {
  if (clockInterval) clearInterval(clockInterval);
  const el = document.getElementById("sessionTimer");

  function update() {
    const s = getSession();
    if (!isSessionValid(s)) {
      clearSession();
      clearInterval(clockInterval);
      showToast("Session expired. Please log in again.", "warning");
      showLoginScreen();
      return;
    }
    const elapsed = Date.now() - s.ts;
    const rem = SESSION_LIFE - elapsed;
    const m = Math.floor(rem / 60000);
    const sec = Math.floor((rem % 60000) / 1000);
    el.textContent = `Session expires in ${m}m ${sec < 10 ? "0" : ""}${sec}s`;
  }
  update();
  clockInterval = setInterval(update, 1000);
}

/* ── Login ─────────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  // Check existing valid session
  const s = getSession();
  if (isSessionValid(s)) {
    showDashboard(s.token);
  } else {
    clearSession();
    showLoginScreen();
  }

  /* Login form */
  document.getElementById("loginForm").addEventListener("submit", async e => {
    e.preventDefault();
    const btn      = document.getElementById("loginBtn");
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    if (!username || !password) {
      showToast("Please enter username and password.", "warning");
      return;
    }

    btn.disabled = true;
    btn.textContent = "Verifying…";

    try {
      const res = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "login", username, password }),
      });
      const data = await res.json();

      if (data.success && data.token) {
        saveSession(data.token);
        showToast("Welcome back!", "success");
        showDashboard(data.token);
      } else {
        showToast(data.message || "Invalid credentials.", "error");
      }
    } catch (err) {
      showToast("Connection error. Try again.", "error");
    } finally {
      btn.disabled = false;
      btn.textContent = "Log In";
    }
  });

  /* Upload form */
  document.getElementById("uploadForm").addEventListener("submit", async e => {
    e.preventDefault();
    const token = guardSession();
    if (!token) return;

    const btn  = document.getElementById("uploadBtn");
    const name = document.getElementById("fileName").value.trim();
    const link = document.getElementById("fileLink").value.trim();
    const size = document.getElementById("fileSize").value.trim();

    if (!name || !link) {
      showToast("File name and link are required.", "warning");
      return;
    }

    btn.disabled = true;
    btn.textContent = "Adding…";

    try {
      const res = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "addFile", token, name, link, size }),
      });
      const data = await res.json();

      if (data.success) {
        showToast("File added successfully!", "success");
        document.getElementById("uploadForm").reset();
      } else {
        showToast(data.message || "Failed to add file.", "error");
      }
    } catch {
      showToast("Connection error. Try again.", "error");
    } finally {
      btn.disabled = false;
      btn.textContent = "Add File";
    }
  });

  /* Logout */
  document.getElementById("logoutBtn").addEventListener("click", () => {
    clearSession();
    if (clockInterval) clearInterval(clockInterval);
    showToast("Logged out.", "warning");
    showLoginScreen();
  });
});
