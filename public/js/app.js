import { auth, getUserData, onAuth, logout } from './auth.js';
import { initInventory, openAddProductModal, submitReport, unsubInventory } from './inventory.js';
import { renderReportsPanel, renderUsersPanel, openNewUserModal } from './admin.js';
import { showToast, closeModal } from './ui.js';

let currentUser = null;
let currentUserData = null;

// ===== ROUTER =====
function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

// ===== MAIN AUTH GUARD =====
onAuth(async user => {
  if (!user) {
    window.location.href = '/login.html';
    return;
  }
  currentUser = user;
  currentUserData = await getUserData(user.uid);

  if (!currentUserData) {
    // First-time admin setup — create user doc
    currentUserData = { nombre: user.email, rol: 'admin' };
  }

  document.getElementById('header-user').textContent = currentUserData.nombre;

  // Show/hide admin menu
  const adminMenu = document.getElementById('menu-admin');
  if (adminMenu) {
    adminMenu.style.display = currentUserData.rol === 'admin' ? 'flex' : 'none';
  }

  showView('view-selector');
});

// ===== SECTION SELECTION =====
window.selectSection = function(section) {
  showView('view-inventory');
  initInventory(section, currentUserData);

  // Update back-btn and title accent
  const color = section === 'cocina' ? '#F97316' : '#3B82F6';
  document.getElementById('inv-header').style.setProperty('--accent', color);
};

// ===== INVENTORY ACTIONS =====
window.openAddProduct = () => openAddProductModal();
window.doSubmitReport = () => submitReport(currentUser);
window.goBack = () => { unsubInventory(); showView('view-selector'); };

// ===== LOGOUT =====
window.doLogout = async () => {
  await logout();
  window.location.href = '/login.html';
};

// ===== ADMIN PANEL =====
window.openAdmin = function(tab = 'reports') {
  showView('view-admin');
  switchAdminTab(tab);
};

window.switchAdminTab = function(tab) {
  document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.admin-tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`tab-btn-${tab}`)?.classList.add('active');
  document.getElementById(`tab-${tab}`)?.classList.add('active');

  if (tab === 'reports') renderReportsPanel();
  if (tab === 'users') renderUsersPanel();
};

window.filterReports = function(section) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  renderReportsPanel(section);
};

window.openNewUser = () => openNewUserModal();
window.closeModalGlobal = () => closeModal();
window.goBackFromAdmin = () => showView('view-selector');
