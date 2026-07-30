import { db } from './auth.js';
import {
  collection, getDocs, addDoc, deleteDoc, doc, query, orderBy,
  serverTimestamp, onSnapshot, Timestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { showToast, showConfirm } from './ui.js';

// ===== STATE VARIABLES =====
let currentUser = null;
let currentUserData = null;
let employees = [];
let tickets = [];
let ticketsUnsub = null;
let selectedEmployeeIds = new Set();
let currentGroupFilter = 'day'; // 'day', 'week', 'month', 'year'

// ===== INITIALIZATION =====
export async function initPropinas(user, userData) {
  currentUser = user;
  currentUserData = userData;
  tickets = [];
  selectedEmployeeIds.clear();
  currentGroupFilter = 'day';

  // Configurar fechas iniciales predeterminadas en los inputs a la fecha de hoy
  const today = new Date().toISOString().slice(0, 10);
  
  const ptFecha = document.getElementById('pt-fecha');
  if (ptFecha) ptFecha.value = today;

  const repDia = document.getElementById('rep-fecha-dia');
  if (repDia) repDia.value = today;

  const repSemana = document.getElementById('rep-fecha-semana');
  if (repSemana) repSemana.value = today;

  const repMes = document.getElementById('rep-fecha-mes');
  if (repMes) repMes.value = today.slice(0, 7);

  const repInicio = document.getElementById('rep-fecha-inicio');
  if (repInicio) repInicio.value = today;

  const repFin = document.getElementById('rep-fecha-fin');
  if (repFin) repFin.value = today;

  // Limpiar filtros del historial
  const filterDate = document.getElementById('filter-date');
  if (filterDate) filterDate.value = '';
  const filterEmp = document.getElementById('filter-empleado');
  if (filterEmp) filterEmp.value = '';

  // Establecer pestaña por defecto
  switchPropinasTab('registrar');

  // Cargar datos iniciales
  await loadEmployees();
  subscribeToTickets();
  setupRegistrationForm();
}

// ===== CLEANUP =====
export function unsubPropinas() {
  if (ticketsUnsub) {
    ticketsUnsub();
    ticketsUnsub = null;
  }
}

// ===== REAL-TIME TICKETS LISTENER =====
function subscribeToTickets() {
  unsubPropinas();
  
  const q = query(collection(db, 'tickets'), orderBy('fecha', 'desc'));
  ticketsUnsub = onSnapshot(q, (snap) => {
    tickets = snap.docs.map(docSnap => {
      const data = docSnap.data();
      const fecha = data.fecha && data.fecha.toDate ? data.fecha.toDate() : new Date(data.fecha);
      const creadoEn = data.creadoEn && data.creadoEn.toDate ? data.creadoEn.toDate() : new Date(data.creadoEn);
      return {
        id: docSnap.id,
        ...data,
        fecha,
        creadoEn
      };
    });
    applyFilters();
  }, (err) => {
    console.error('Error al escuchar tickets:', err);
    showToast('Error al conectar con Firestore: ' + err.message, 'error');
  });
}

// ===== FETCH ACTIVE EMPLOYEES =====
async function loadEmployees() {
  try {
    const snap = await getDocs(collection(db, 'users'));
    employees = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // Ordenar por nombre alfabéticamente
    employees.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));

    // Cargar la cuadrícula en la pestaña de registro
    renderEmployeeGrid();

    // Llenar el selector de empleados del buscador
    const filterSelect = document.getElementById('filter-empleado');
    if (filterSelect) {
      filterSelect.innerHTML = '<option value="">Todos los empleados</option>';
      employees.forEach(emp => {
        const opt = document.createElement('option');
        opt.value = emp.id;
        opt.textContent = emp.nombre;
        filterSelect.appendChild(opt);
      });
    }
  } catch (err) {
    console.error('Error al cargar empleados:', err);
    showToast('Error al cargar la lista de empleados: ' + err.message, 'error');
  }
}

// ===== RENDER EMPLOYEE GRID (REGISTRATION FORM) =====
function renderEmployeeGrid() {
  const grid = document.getElementById('pt-empleados-grid');
  if (!grid) return;
  grid.innerHTML = '';

  if (employees.length === 0) {
    grid.innerHTML = '<p class="empty-state-text">No hay empleados registrados en el sistema.</p>';
    return;
  }

  employees.forEach(emp => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'employee-toggle-btn' + (selectedEmployeeIds.has(emp.id) ? ' active' : '');
    btn.innerHTML = `<span class="chk-icon">${selectedEmployeeIds.has(emp.id) ? '✓' : '○'}</span> ${emp.nombre}`;
    
    btn.onclick = () => {
      if (selectedEmployeeIds.has(emp.id)) {
        selectedEmployeeIds.delete(emp.id);
        btn.classList.remove('active');
        btn.querySelector('.chk-icon').textContent = '○';
      } else {
        selectedEmployeeIds.add(emp.id);
        btn.classList.add('active');
        btn.querySelector('.chk-icon').textContent = '✓';
      }
    };
    grid.appendChild(btn);
  });
}

// ===== SETUP ADD TICKET FORM =====
function setupRegistrationForm() {
  const form = document.getElementById('registrar-ticket-form');
  if (!form) return;

  form.onsubmit = async (e) => {
    e.preventDefault();
    const dateVal = document.getElementById('pt-fecha').value;
    const amountVal = parseFloat(document.getElementById('pt-monto').value);

    if (isNaN(amountVal) || amountVal <= 0) {
      showToast('Ingresa un monto válido mayor a $0.00', 'error');
      return;
    }

    if (selectedEmployeeIds.size === 0) {
      showToast('Selecciona al menos un empleado para este ticket.', 'error');
      return;
    }

    const selectedEmployees = employees
      .filter(emp => selectedEmployeeIds.has(emp.id))
      .map(emp => ({ uid: emp.id, nombre: emp.nombre }));

    // Guardar a las 12:00 local para evitar desvíos de zona horaria al agrupar
    const ticketDate = new Date(dateVal + 'T12:00:00');

    try {
      await addDoc(collection(db, 'tickets'), {
        fecha: Timestamp.fromDate(ticketDate),
        monto: amountVal,
        empleados: selectedEmployees,
        creadoPor: {
          uid: currentUser.uid,
          nombre: currentUserData?.nombre || currentUser.email
        },
        creadoEn: serverTimestamp()
      });

      showToast('Ticket registrado correctamente ✅', 'success');

      // Limpiar campos e interactividad
      document.getElementById('pt-monto').value = '';
      selectedEmployeeIds.clear();
      renderEmployeeGrid();
    } catch (err) {
      console.error('Error guardando ticket:', err);
      showToast('Error al guardar el ticket: ' + err.message, 'error');
    }
  };
}

// ===== TAB CONTROL =====
export function switchPropinasTab(tab) {
  document.querySelectorAll('.propinas-tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.propinas-tab-panel').forEach(p => p.classList.remove('active'));

  const activeBtn = document.getElementById(`tab-btn-prop-${tab}`);
  if (activeBtn) activeBtn.classList.add('active');

  const activePanel = document.getElementById(`tab-prop-${tab}`);
  if (activePanel) activePanel.classList.add('active');

  if (tab === 'historial') {
    applyFilters();
  } else if (tab === 'registrar') {
    selectedEmployeeIds.clear();
    renderEmployeeGrid();
  }
}

// ===== GROUP FILTER TRIGGER =====
export function setGroupFilter(group) {
  currentGroupFilter = group;
  document.querySelectorAll('.btn-group-toggle .toggle-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  const activeBtn = document.getElementById(`group-btn-${group}`);
  if (activeBtn) activeBtn.classList.add('active');

  applyFilters();
}

// ===== APPLY FILTERS AND RE-RENDER =====
export function applyFilters() {
  const dateVal = document.getElementById('filter-date')?.value;
  const empVal = document.getElementById('filter-empleado')?.value;

  let filtered = tickets;

  if (dateVal) {
    const filterDateStr = new Date(dateVal + 'T12:00:00').toDateString();
    filtered = filtered.filter(t => t.fecha.toDateString() === filterDateStr);
  }

  if (empVal) {
    filtered = filtered.filter(t => t.empleados.some(e => e.uid === empVal));
  }

  renderWeeklySummary(filtered);
  renderGroupedTickets(filtered);
}

// ===== WEEK RANGE HELPER (Lunes a Domingo) =====
function getWeekRange(date) {
  const d = new Date(date);
  const day = d.getDay();
  // Hacer que el lunes sea el día 1, domingo sea el 7
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { monday, sunday };
}

// ===== RENDER WEEKLY SUMMARY TABLE =====
function renderWeeklySummary(filteredTickets) {
  const tbody = document.getElementById('prop-weekly-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (filteredTickets.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" class="empty-table-cell">No hay tickets registrados en esta consulta.</td></tr>';
    return;
  }

  const weeklyData = {};

  filteredTickets.forEach(ticket => {
    const { monday, sunday } = getWeekRange(ticket.fecha);
    const key = monday.toISOString().slice(0, 10);

    if (!weeklyData[key]) {
      weeklyData[key] = {
        monday,
        sunday,
        total: 0,
        shares: {}
      };
    }

    weeklyData[key].total += ticket.monto;
    const splitCount = ticket.empleados.length;
    if (splitCount > 0) {
      const share = ticket.monto / splitCount;
      ticket.empleados.forEach(emp => {
        weeklyData[key].shares[emp.nombre] = (weeklyData[key].shares[emp.nombre] || 0) + share;
      });
    }
  });

  const sortedWeekKeys = Object.keys(weeklyData).sort().reverse();

  sortedWeekKeys.forEach(key => {
    const data = weeklyData[key];
    const tr = document.createElement('tr');

    const weekLabel = `${data.monday.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} al ${data.sunday.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}`;

    let sharesHtml = '<div class="employee-shares-wrap">';
    Object.keys(data.shares).sort().forEach(empName => {
      sharesHtml += `<span class="employee-share-badge"><strong>${empName}:</strong> $${data.shares[empName].toFixed(2)}</span>`;
    });
    sharesHtml += '</div>';

    tr.innerHTML = `
      <td class="week-cell">📅 ${weekLabel}</td>
      <td class="total-cell"><strong>$${data.total.toFixed(2)}</strong></td>
      <td class="shares-cell">${sharesHtml}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ===== GROUPING LOGIC =====
function groupTickets(filtered) {
  const groups = {};

  filtered.forEach(ticket => {
    let key = '';
    let label = '';

    if (currentGroupFilter === 'day') {
      key = ticket.fecha.toISOString().slice(0, 10);
      label = ticket.fecha.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      label = label.charAt(0).toUpperCase() + label.slice(1);
    } else if (currentGroupFilter === 'week') {
      const { monday, sunday } = getWeekRange(ticket.fecha);
      key = monday.toISOString().slice(0, 10);
      label = `Semana del ${monday.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} al ${sunday.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    } else if (currentGroupFilter === 'month') {
      key = ticket.fecha.toISOString().slice(0, 7);
      label = ticket.fecha.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
      label = label.charAt(0).toUpperCase() + label.slice(1);
    } else if (currentGroupFilter === 'year') {
      key = ticket.fecha.getFullYear().toString();
      label = `Año ${key}`;
    }

    if (!groups[key]) {
      groups[key] = {
        label,
        total: 0,
        tickets: []
      };
    }

    groups[key].total += ticket.monto;
    groups[key].tickets.push(ticket);
  });

  return groups;
}

// ===== RENDER GROUPED TICKETS LIST =====
function renderGroupedTickets(filtered) {
  const container = document.getElementById('tickets-list');
  if (!container) return;
  container.innerHTML = '';

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📂</span>
        <p>No se encontraron tickets con los filtros aplicados.</p>
      </div>`;
    return;
  }

  const groups = groupTickets(filtered);
  const sortedKeys = Object.keys(groups).sort().reverse();

  sortedKeys.forEach(key => {
    const group = groups[key];

    const groupSection = document.createElement('div');
    groupSection.className = 'ticket-group-section';

    const header = document.createElement('div');
    header.className = 'ticket-group-header';
    header.innerHTML = `
      <div class="group-header-left">
        <span class="group-arrow">▾</span>
        <span class="group-title">${group.label}</span>
      </div>
      <span class="group-total">Total: $${group.total.toFixed(2)}</span>
    `;

    const list = document.createElement('div');
    list.className = 'ticket-group-list';

    // Colapsar / Expandir al hacer clic en el encabezado
    header.onclick = () => {
      const isHidden = list.style.display === 'none';
      list.style.display = isHidden ? 'block' : 'none';
      header.querySelector('.group-arrow').textContent = isHidden ? '▾' : '▸';
    };

    // Ordenar tickets dentro del grupo descendentemente por fecha/hora
    group.tickets.sort((a, b) => b.fecha - a.fecha || b.creadoEn - a.creadoEn);

    group.tickets.forEach(ticket => {
      const card = document.createElement('div');
      card.className = 'ticket-card';

      const empBadges = ticket.empleados
        .map(emp => `<span class="ticket-emp-badge">${emp.nombre}</span>`)
        .join('');

      const dateStr = ticket.fecha.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
      const creatoStr = ticket.creadoEn instanceof Date
        ? ticket.creadoEn.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '—';

      card.innerHTML = `
        <div class="ticket-card-main">
          <div class="ticket-info">
            <div class="ticket-top-row">
              <span class="ticket-date-badge">📅 ${dateStr}</span>
              <span class="ticket-amount">$${ticket.monto.toFixed(2)}</span>
            </div>
            <div class="ticket-employees-row">
              ${empBadges}
            </div>
            <div class="ticket-audit-trail">
              <span>👤 Creado por: <strong>${ticket.creadoPor?.nombre || 'Desconocido'}</strong></span>
              <span>🕒 Registro: ${creatoStr}</span>
            </div>
          </div>
          <button class="btn-trash" onclick="deleteTicket('${ticket.id}')" title="Eliminar ticket">🗑️</button>
        </div>
      `;
      list.appendChild(card);
    });

    groupSection.appendChild(header);
    groupSection.appendChild(list);
    container.appendChild(groupSection);
  });
}

// ===== DELETE TICKET =====
window.deleteTicket = async function(id) {
  const ok = await showConfirm('¿Estás seguro de que deseas eliminar este ticket permanentemente?\nEsta acción no se puede deshacer.', 'Eliminar');
  if (!ok) return;

  try {
    await deleteDoc(doc(db, 'tickets', id));
    showToast('Ticket eliminado con éxito', 'success');
  } catch (err) {
    console.error('Error al eliminar ticket:', err);
    showToast('Error al eliminar: ' + err.message, 'error');
  }
};

// ===== REPORT FORM VISIBILITY CONTROL =====
export function handleReportTypeChange(type) {
  const wraps = {
    diario: document.getElementById('rep-param-diario-wrap'),
    semanal: document.getElementById('rep-param-semanal-wrap'),
    mensual: document.getElementById('rep-param-mensual-wrap'),
    personalizado: document.getElementById('rep-param-rango-wrap')
  };

  Object.keys(wraps).forEach(key => {
    if (wraps[key]) {
      wraps[key].style.display = key === type ? 'block' : 'none';
    }
  });
}

// ===== GATHER TICKETS FOR REPORT =====
function getReportTickets() {
  const tipo = document.getElementById('rep-tipo').value;
  let start = null;
  let end = null;
  let labelText = '';

  if (tipo === 'diario') {
    const val = document.getElementById('rep-fecha-dia').value;
    if (!val) throw new Error('Selecciona el día para el reporte.');
    start = new Date(val + 'T00:00:00');
    end = new Date(val + 'T23:59:59.999');
    labelText = `Reporte Diario - ${start.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}`;
  } else if (tipo === 'semanal') {
    const val = document.getElementById('rep-fecha-semana').value;
    if (!val) throw new Error('Selecciona el día representativo de la semana.');
    const date = new Date(val + 'T12:00:00');
    const range = getWeekRange(date);
    start = range.monday;
    end = range.sunday;
    labelText = `Reporte Semanal - del ${start.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} al ${end.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  } else if (tipo === 'mensual') {
    const val = document.getElementById('rep-fecha-mes').value;
    if (!val) throw new Error('Selecciona el mes para el reporte.');
    const parts = val.split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    start = new Date(year, month, 1, 0, 0, 0, 0);
    end = new Date(year, month + 1, 0, 23, 59, 59, 999);
    labelText = `Reporte Mensual - ${start.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}`;
  } else if (tipo === 'personalizado') {
    const valIni = document.getElementById('rep-fecha-inicio').value;
    const valFin = document.getElementById('rep-fecha-fin').value;
    if (!valIni || !valFin) throw new Error('Ingresa las fechas de inicio y fin para el rango.');
    start = new Date(valIni + 'T00:00:00');
    end = new Date(valFin + 'T23:59:59.999');
    if (start > end) throw new Error('La fecha de inicio debe ser menor o igual a la de fin.');
    labelText = `Reporte Personalizado - del ${start.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })} al ${end.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  }

  // Filtrar tickets dentro del rango [start, end]
  const filtered = tickets.filter(t => t.fecha >= start && t.fecha <= end);

  return { tickets: filtered, labelText, start, end };
}

// ===== EXPORT TRIGGER =====
export function exportTipsReport(format) {
  try {
    const { tickets: reportTickets, labelText } = getReportTickets();

    if (reportTickets.length === 0) {
      showToast('No se encontraron tickets registrados en el rango seleccionado.', 'info');
      return;
    }

    if (format === 'pdf') {
      generatePDFReport(reportTickets, labelText);
    } else if (format === 'csv') {
      generateCSVReport(reportTickets, labelText);
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ===== PDF GENERATION =====
function generatePDFReport(reportTickets, labelText) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();

  const accentR = 16;
  const accentG = 185;
  const accentB = 129;

  const todayStr = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  // ── Header band ──
  doc.setFillColor(accentR, accentG, accentB);
  doc.rect(0, 0, W, 30, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Reporte de Propinas', 14, 13);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(labelText, 14, 21);
  doc.text(`Realizado por: ${currentUserData?.nombre || currentUser.email}  |  Fecha Impresión: ${todayStr}`, 14, 26);

  // Calcular la distribución general del reporte
  let totalTips = 0;
  const employeeShares = {};

  reportTickets.forEach(t => {
    totalTips += t.monto;
    const splitCount = t.empleados.length;
    if (splitCount > 0) {
      const share = t.monto / splitCount;
      t.empleados.forEach(emp => {
        employeeShares[emp.nombre] = (employeeShares[emp.nombre] || 0) + share;
      });
    }
  });

  let startY = 38;

  // ── Seccion 1: Resumen de Distribución ──
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMEN DE PROPINA POR EMPLEADO', 14, startY);
  startY += 5;

  const summaryBody = Object.keys(employeeShares).sort().map(name => {
    return [name, `$${employeeShares[name].toFixed(2)}`];
  });
  summaryBody.push([{ content: 'TOTAL GENERAL', styles: { fontStyle: 'bold' } }, { content: `$${totalTips.toFixed(2)}`, styles: { fontStyle: 'bold' } }]);

  doc.autoTable({
    startY,
    head: [['Empleado', 'Propina Recibida']],
    body: summaryBody,
    theme: 'striped',
    headStyles: { fillColor: [240, 240, 240], textColor: [50, 50, 50], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 80, halign: 'right' }
    },
    margin: { left: 14, right: 14 }
  });

  startY = doc.lastAutoTable.finalY + 10;

  // ── Seccion 2: Detalle de Tickets ──
  if (startY > 230) {
    doc.addPage();
    startY = 20;
  }

  doc.setTextColor(60, 60, 60);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('DETALLE DE TICKETS REGISTRADOS', 14, startY);
  startY += 5;

  // Ordenar los tickets para imprimir del más reciente al más antiguo
  reportTickets.sort((a, b) => b.fecha - a.fecha || b.creadoEn - a.creadoEn);

  const detailsBody = reportTickets.map((t, idx) => {
    const dateTicketStr = t.fecha.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
    const empList = t.empleados.map(e => e.nombre).join(', ');
    const logInfo = `Por: ${t.creadoPor?.nombre || '—'}`;

    return [
      String(idx + 1),
      dateTicketStr,
      `$${t.monto.toFixed(2)}`,
      empList,
      logInfo
    ];
  });

  doc.autoTable({
    startY,
    head: [['#', 'Fecha Ticket', 'Monto Total', 'Empleados Participantes', 'Registrado Por']],
    body: detailsBody,
    theme: 'grid',
    headStyles: { fillColor: [accentR, accentG, accentB], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8.5 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 32, halign: 'center' },
      2: { cellWidth: 26, halign: 'right' },
      3: { cellWidth: 70 },
      4: { cellWidth: 42 }
    },
    margin: { left: 14, right: 14 }
  });

  // ── Paginación ──
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'normal');
    doc.text(`Sistema de Gestión de Propinas  -  Página ${i} de ${pageCount}`, W / 2, 290, { align: 'center' });
  }

  const fileName = `reporte_propinas_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
  showToast('PDF generado correctamente 📄', 'success');
}

// ===== CSV GENERATION =====
function generateCSVReport(reportTickets, labelText) {
  reportTickets.sort((a, b) => b.fecha - a.fecha || b.creadoEn - a.creadoEn);

  const headers = ['Fecha Ticket', 'Monto Total', 'Num Participantes', 'Participantes', 'Dividido c/u', 'Registrado Por', 'Fecha Registro'];

  const rows = reportTickets.map(t => {
    const dateStr = t.fecha.toISOString().slice(0, 10);
    const amountStr = t.monto.toFixed(2);
    const count = t.empleados.length;
    const list = t.empleados.map(e => e.nombre).join('; ');
    const split = count > 0 ? (t.monto / count).toFixed(2) : '0.00';
    const creator = t.creadoPor?.nombre || 'Desconocido';
    const createdAt = t.creadoEn instanceof Date ? t.creadoEn.toISOString() : '—';

    return [
      dateStr,
      amountStr,
      String(count),
      `"${list.replace(/"/g, '""')}"`,
      split,
      `"${creator.replace(/"/g, '""')}"`,
      createdAt
    ];
  });

  // Totales consolidados para incluir al final del CSV
  const employeeShares = {};
  let totalTips = 0;

  reportTickets.forEach(t => {
    totalTips += t.monto;
    const splitCount = t.empleados.length;
    if (splitCount > 0) {
      const share = t.monto / splitCount;
      t.empleados.forEach(emp => {
        employeeShares[emp.nombre] = (employeeShares[emp.nombre] || 0) + share;
      });
    }
  });

  let csvContent = `Reporte: ${labelText}\n\n`;
  csvContent += headers.join(',') + '\n';
  rows.forEach(r => {
    csvContent += r.join(',') + '\n';
  });

  csvContent += `\nRESUMEN DE PROPINA POR EMPLEADO\n`;
  csvContent += `Empleado,Propina Total Asignada\n`;
  Object.keys(employeeShares).sort().forEach(name => {
    csvContent += `"${name.replace(/"/g, '""')}",${employeeShares[name].toFixed(2)}\n`;
  });
  csvContent += `TOTAL GENERAL,${totalTips.toFixed(2)}\n`;

  // Disparar la descarga en el navegador con soporte para caracteres especiales
  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `reporte_propinas_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast('CSV exportado correctamente 📊', 'success');
}
