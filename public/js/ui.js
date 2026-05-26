// ui.js — Shared UI helpers: modal, toast, confirm, loading

// ===== MODAL =====
export function openModal(html) {
  const overlay = document.getElementById('modal-overlay');
  const body = document.getElementById('modal-body');
  body.innerHTML = html;
  overlay.classList.add('active');
  // Focus first input
  setTimeout(() => {
    const first = body.querySelector('input, select, textarea');
    if (first) first.focus();
  }, 100);
}

export function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  overlay.classList.remove('active');
  document.getElementById('modal-body').innerHTML = '';
}

// ===== CONFIRM DIALOG =====
export function showConfirm(message, confirmText = 'Confirmar') {
  return new Promise(resolve => {
    openModal(`
      <div class="confirm-box">
        <span class="confirm-icon">⚠️</span>
        <p class="confirm-msg">${message.replace(/\n/g, '<br>')}</p>
        <div class="confirm-btns">
          <button class="btn-secondary" id="confirm-no">Cancelar</button>
          <button class="btn-danger" id="confirm-yes">${confirmText}</button>
        </div>
      </div>
    `);
    document.getElementById('confirm-yes').onclick = () => { closeModal(); resolve(true); };
    document.getElementById('confirm-no').onclick  = () => { closeModal(); resolve(false); };
  });
}

// ===== TOAST =====
export function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ===== CLOSE MODAL ON OVERLAY CLICK =====
document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal();
    });
  }

  // Register SW
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
});
