import { db, getToken } from './auth.js';
import {
  collection, getDocs, query, orderBy, Timestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { loadReports, generatePDF } from './reports.js';
import { showToast, openModal, closeModal, showConfirm } from './ui.js';

// ===== REPORTS HISTORY =====
export async function renderReportsPanel(filterSection = 'all') {
  const container = document.getElementById('reports-list');
  container.innerHTML = '<div class="loading-spinner"></div>';

  try {
    const reports = await loadReports();
    const filtered = filterSection === 'all' ? reports : reports.filter(r => r.seccion === filterSection);

    if (filtered.length === 0) {
      container.innerHTML = `<div class="empty-state"><span class="empty-icon">📂</span><p>No hay reportes guardados.</p></div>`;
      return;
    }

    container.innerHTML = '';
    filtered.forEach(r => {
      let fechaStr = '—';
      if (r.fecha) {
        const d = r.fecha.toDate ? r.fecha.toDate() : new Date(r.fecha);
        fechaStr = d.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      }
      const card = document.createElement('div');
      card.className = 'report-card';
      const secLabel = r.seccion === 'cocina' ? '🍳 Cocina' : '🍹 Barra';
      const accentVar = r.seccion === 'cocina' ? 'var(--cocina)' : 'var(--barra)';
      card.innerHTML = `
        <div class="report-left">
          <span class="report-section-badge" style="background:${accentVar}">${secLabel}</span>
          <div class="report-meta">
            <span class="report-date">${fechaStr}</span>
            <span class="report-author">👤 ${r.creadoPor?.nombre || 'Desconocido'}</span>
          </div>
        </div>
        <div class="report-right">
          ${r.totalFaltantes > 0
            ? `<span class="badge-faltante">⚠️ ${r.totalFaltantes} faltantes</span>`
            : `<span class="badge-ok">✅ Sin faltantes</span>`}
          <button class="btn-pdf" onclick="downloadReport('${r.id}')">📄 PDF</button>
        </div>`;
      container.appendChild(card);
      // Store report data on element for PDF generation
      card.dataset.report = JSON.stringify(r);
    });
  } catch (e) {
    showToast('Error al cargar reportes: ' + e.message, 'error');
    container.innerHTML = '';
  }
}

window.downloadReport = function(id) {
  const card = document.querySelector(`[onclick="downloadReport('${id}')"]`)?.closest('.report-card');
  if (!card) return;
  try {
    const r = JSON.parse(card.dataset.report);
    const fecha = r.fecha?.toDate ? r.fecha.toDate() : new Date();
    generatePDF({ ...r, fecha });
  } catch(e) {
    showToast('Error al generar PDF', 'error');
  }
};

// ===== USER MANAGEMENT =====
export async function renderUsersPanel() {
  const container = document.getElementById('users-list');
  container.innerHTML = '<div class="loading-spinner"></div>';
  try {
    const token = await getToken();
    const res = await fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } });
    const users = await res.json();
    if (!Array.isArray(users) || users.length === 0) {
      container.innerHTML = `<div class="empty-state"><span class="empty-icon">👥</span><p>No hay usuarios registrados.</p></div>`;
      return;
    }
    container.innerHTML = '';
    users.forEach(u => {
      const card = document.createElement('div');
      card.className = 'user-card';
      card.innerHTML = `
        <div class="user-info">
          <span class="user-avatar">${(u.nombre || 'U')[0].toUpperCase()}</span>
          <div>
            <span class="user-name">${u.nombre}</span>
            <span class="user-email">${u.email}</span>
          </div>
        </div>
        <div class="user-actions">
          <span class="role-badge role-${u.rol}">${u.rol}</span>
          <button class="btn-trash" onclick="deleteUser('${u.id}', '${(u.nombre||'').replace(/'/g,"\\'")}')">🗑️</button>
        </div>`;
      container.appendChild(card);
    });
  } catch (e) {
    showToast('Error al cargar usuarios', 'error');
    container.innerHTML = '';
  }
}

export function openNewUserModal() {
  openModal(`
    <h2 class="modal-title">Nuevo Empleado</h2>
    <form id="new-user-form" class="form-stack">
      <label class="form-label">Nombre completo *
        <input class="form-input" id="nu-nombre" type="text" placeholder="Ej: Carlos Ramírez" required />
      </label>
      <label class="form-label">Correo electrónico *
        <input class="form-input" id="nu-email" type="email" placeholder="empleado@restaurante.com" required />
      </label>
      <label class="form-label">Contraseña *
        <input class="form-input" id="nu-pass" type="password" placeholder="Mínimo 6 caracteres" required minlength="6" />
      </label>
      <label class="form-label">Rol
        <select class="form-input" id="nu-rol">
          <option value="empleado">Empleado</option>
          <option value="admin">Administrador</option>
        </select>
      </label>
      <button type="submit" class="btn-primary">Crear usuario</button>
    </form>
  `);

  document.getElementById('new-user-form').onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('[type=submit]');
    btn.disabled = true;
    btn.textContent = 'Creando...';
    try {
      const token = await getToken();
      const res = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nombre: document.getElementById('nu-nombre').value.trim(),
          email: document.getElementById('nu-email').value.trim(),
          password: document.getElementById('nu-pass').value,
          rol: document.getElementById('nu-rol').value
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      closeModal();
      showToast('Usuario creado ✅', 'success');
      renderUsersPanel();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Crear usuario';
    }
  };
}

window.deleteUser = async function(uid, nombre) {
  const ok = await showConfirm(`¿Eliminar al usuario "${nombre}"?`);
  if (!ok) return;
  try {
    const token = await getToken();
    const res = await fetch(`/api/users/${uid}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    showToast('Usuario eliminado', 'success');
    renderUsersPanel();
  } catch (e) {
    showToast('Error: ' + e.message, 'error');
  }
};
