/* js/utils/toast.js – Global toast notification utility */
(function () {
  function ensureContainer() {
    let c = document.getElementById("toast-container");
    if (!c) {
      c = document.createElement("div");
      c.id = "toast-container";
      document.body.appendChild(c);
    }
    return c;
  }

  window.showToast = function (message, type = "success") {
    const container = ensureContainer();
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="toast-icon"></span><span class="toast-msg">${message}</span>`;
    container.appendChild(toast);
    // Remove after animation completes (3.2s display + 0.3s exit)
    setTimeout(() => toast.remove(), 3600);
  };
})();
