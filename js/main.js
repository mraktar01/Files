/* js/main.js – Public file directory logic */
const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbypkfZrXRT3-MStWI8nDdYzIGlxX68JO3tW0N7iQ0tjww_Gq2wwF5ckQgdA3YouONkF/exec";

const EXT_ICONS = {
  pdf: "📄", doc: "📝", docx: "📝", xls: "📊", xlsx: "📊",
  ppt: "📑", pptx: "📑", zip: "🗜️", rar: "🗜️", "7z": "🗜️",
  tar: "🗜️", gz: "🗜️", exe: "⚙️", msi: "⚙️", apk: "📱",
  mp4: "🎬", mkv: "🎬", avi: "🎬", mov: "🎬", mp3: "🎵",
  wav: "🎵", flac: "🎵", jpg: "🖼️", jpeg: "🖼️", png: "🖼️",
  gif: "🖼️", svg: "🖼️", webp: "🖼️", txt: "📃", md: "📃",
  json: "🔧", xml: "🔧", csv: "📊", html: "🌐", css: "🎨",
  js: "📦", ts: "📦", py: "🐍", java: "☕", cpp: "🔩", c: "🔩",
};

function getIcon(name) {
  const ext = (name.split(".").pop() || "").toLowerCase();
  return EXT_ICONS[ext] || "📁";
}

function formatDate(str) {
  if (!str) return "";
  const d = new Date(str);
  if (isNaN(d)) return str;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function renderSkeleton(n = 6) {
  return Array.from({ length: n }, () => `
    <div class="skeleton-card">
      <div class="sk sk-icon"></div>
      <div style="flex:1">
        <div class="sk sk-line1"></div>
        <div class="sk sk-line2"></div>
      </div>
      <div class="sk sk-badge"></div>
    </div>`).join("");
}

function renderFiles(files) {
  const list = document.getElementById("fileList");
  const meta = document.getElementById("listMeta");

  if (!files.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <div class="empty-msg">No files found</div>
      </div>`;
    meta.textContent = "";
    return;
  }

  meta.textContent = `${files.length} file${files.length !== 1 ? "s" : ""}`;

  list.innerHTML = files.map(f => {
    const sizeBadge = (f.size && f.size.trim())
      ? `<span class="size-badge">${f.size}</span>` : "";
    return `
      <div class="file-card" data-link="${f.link}">
        <div class="file-icon">${getIcon(f.name)}</div>
        <div class="file-info">
          <div class="file-name" title="${f.name}">${f.name}</div>
          ${f.date ? `<div class="file-date">${formatDate(f.date)}</div>` : ""}
        </div>
        <div class="file-meta">
          ${sizeBadge}
          <a class="dl-btn" href="${f.link}" target="_blank" rel="noopener" title="Open file" aria-label="Open ${f.name}">↓</a>
          <button class="copy-btn" data-link="${f.link}" title="Copy link" aria-label="Copy link">⎘</button>
        </div>
      </div>`;
  }).join("");

  // Card click → open file (but not intercepting the inner anchor or copy btn)
  list.querySelectorAll(".file-card").forEach(card => {
    card.addEventListener("click", e => {
      if (e.target.closest(".dl-btn") || e.target.closest(".copy-btn")) return;
      const link = card.dataset.link;
      if (link) {
        showToast("Opening file…", "success");
        window.open(link, "_blank", "noopener");
      }
    });
  });

  list.querySelectorAll(".dl-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      showToast("Opening file…", "success");
    });
  });

  list.querySelectorAll(".copy-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      navigator.clipboard.writeText(btn.dataset.link).then(() => {
        btn.textContent = "✓";
        btn.classList.add("copied");
        showToast("Link copied!", "success");
        setTimeout(() => {
          btn.textContent = "⎘";
          btn.classList.remove("copied");
        }, 2000);
      }).catch(() => showToast("Copy failed. Try manually.", "error"));
    });
  });
}

/* ── Main ──────────────────────────────────────────────────── */
let allFiles = [];

async function loadFiles() {
  const list = document.getElementById("fileList");
  list.innerHTML = `<div class="skeleton-list">${renderSkeleton()}</div>`;
  document.getElementById("listMeta").textContent = "Loading…";

  try {
    const res = await fetch(APPS_SCRIPT_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    allFiles = Array.isArray(data) ? data : (data.files || []);
    applyFilters();
  } catch (err) {
    console.error(err);
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <div class="empty-msg">Failed to load files. Please try again later.</div>
      </div>`;
    document.getElementById("listMeta").textContent = "";
    showToast("Failed to load directory", "error");
  }
}

function applyFilters() {
  const query = (document.getElementById("searchInput").value || "").toLowerCase().trim();
  const sort  = document.getElementById("sortSelect").value;

  let filtered = allFiles.filter(f =>
    !query || f.name.toLowerCase().includes(query)
  );

  filtered = [...filtered].sort((a, b) => {
    if (sort === "name-asc")  return a.name.localeCompare(b.name);
    if (sort === "name-desc") return b.name.localeCompare(a.name);
    const da = new Date(a.date || 0), db = new Date(b.date || 0);
    if (sort === "date-asc")  return da - db;
    return db - da; // date-desc (default)
  });

  renderFiles(filtered);
}

document.addEventListener("DOMContentLoaded", () => {
  loadFiles();
  let debounceT;
  document.getElementById("searchInput").addEventListener("input", () => {
    clearTimeout(debounceT);
    debounceT = setTimeout(applyFilters, 180);
  });
  document.getElementById("sortSelect").addEventListener("change", applyFilters);
});
