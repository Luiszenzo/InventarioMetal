import { db } from './auth.js';
import {
  collection, getDocs, addDoc, deleteDoc, doc, query, where,
  serverTimestamp, setDoc, onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { showToast, showConfirm, openModal, closeModal } from './ui.js';
import { generateAndSaveReport } from './reports.js';

let currentSection  = null;
let currentUserData = null;
let products        = [];
let quantities      = {};
let categorias      = [];   // cache local de la colección 'categorias'

// Listener en tiempo real del borrador
let draftUnsub = null;
// Timer debounce para guardar en Firestore
let saveTimer  = null;

/* ── Referencia al documento de borrador ──────────────────────────────────── */
function draftRef() {
  return doc(db, 'drafts', currentSection);
}

/* ── Guardar cantidades en Firestore (debounce 600 ms) ────────────────────── */
function persistQuantities() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await setDoc(draftRef(), { quantities, updatedAt: serverTimestamp() }, { merge: true });
    } catch (e) {
      console.warn('Error al guardar cantidades:', e.message);
    }
  }, 600);
}

/* ── Suscripción en tiempo real al borrador ───────────────────────────────── */
function subscribeToDraft() {
  if (draftUnsub) draftUnsub(); // limpiar suscripción anterior
  let isFirst = true;

  draftUnsub = onSnapshot(draftRef(), (snap) => {
    const saved = snap.exists() ? (snap.data().quantities || {}) : {};
    let changed = isFirst; // siempre renderizar en el primer disparo
    isFirst = false;

    products.forEach(p => {
      if (p.esRopa === true) {
        const savedObj = saved[p.id] || {};
        if (typeof quantities[p.id] !== 'object' || quantities[p.id] === null) {
          quantities[p.id] = { XS: 0, S: 0, M: 0, L: 0, XL: 0, '2XL': 0 };
        }
        ['XS', 'S', 'M', 'L', 'XL', '2XL'].forEach(size => {
          const newQty = savedObj[size] !== undefined ? Number(savedObj[size]) : 0;
          if (quantities[p.id][size] !== newQty) {
            quantities[p.id][size] = newQty;
            changed = true;
          }
        });
      } else {
        const newQty = saved[p.id] !== undefined ? Number(saved[p.id]) : 0;
        if (quantities[p.id] !== newQty) {
          quantities[p.id] = newQty;
          changed = true;
        }
      }
    });
    if (changed) renderProducts();
  }, (err) => {
    console.warn('Draft listener error:', err.message);
  });
}

/* ── Limpiar suscripción (llamar al salir de la vista) ────────────────────── */
export function unsubInventory() {
  if (draftUnsub) { draftUnsub(); draftUnsub = null; }
  clearTimeout(saveTimer);
}

/* ── Init ─────────────────────────────────────────────────────────────────── */
export function initInventory(section, userData) {
  currentSection  = section;
  currentUserData = userData;
  quantities      = {};
  renderInventoryScreen();
  loadProducts();
}

/* ── Cargar productos y suscribirse al borrador ───────────────────────────── */
async function loadProducts() {
  showLoading(true);
  try {
    // Filtramos sólo por seccion para evitar requerir índice compuesto.
    // El filtro de activo lo aplicamos en cliente.
    const q = query(
      collection(db, 'products'),
      where('seccion', '==', currentSection)
    );
    const snap = await getDocs(q);
    products = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(p => p.activo !== false); // excluir sólo los marcados como inactivos

    console.log('[Inventario] Productos cargados:', products.length,
      products.map(p => p.nombre + ' (' + (p.categoria || 'sin cat') + ')'));

    // Inicializar todos en 0 localmente
    products.forEach(p => {
      if (p.esRopa === true) {
        quantities[p.id] = { XS: 0, S: 0, M: 0, L: 0, XL: 0, '2XL': 0 };
      } else {
        quantities[p.id] = 0;
      }
    });

    // Mostrar productos de inmediato
    try {
      renderProducts();
    } catch (renderErr) {
      console.error('[Inventario] Error al renderizar productos:', renderErr);
      showToast('Error al mostrar productos: ' + renderErr.message, 'error');
    }

    // Suscribirse al borrador para cargar cantidades reales
    subscribeToDraft();
  } catch (e) {
    console.error('[Inventario] Error al cargar productos:', e);
    showToast('Error al cargar productos: ' + e.message, 'error');
  }
  showLoading(false);
}

/* ── Header ───────────────────────────────────────────────────────────────── */
function renderInventoryScreen() {
  let label = '👕 Tienda';
  let color = 'var(--tienda)';
  if (currentSection === 'cocina') {
    label = '🍳 Cocina';
    color = 'var(--cocina)';
  } else if (currentSection === 'barra') {
    label = '🍹 Barra';
    color = 'var(--barra)';
  }
  document.getElementById('inv-title').textContent = label;
  document.getElementById('inv-header').style.borderBottomColor = color;
  document.getElementById('inv-fab').style.background = color;
  document.getElementById('inv-submit-btn').style.background = color;
}

/* ── Render productos agrupados por categoría ─────────────────────────────── */
function renderProducts() {
  const container = document.getElementById('inv-list');
  container.innerHTML = '';

  if (products.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📦</span>
        <p>No hay productos en este inventario.</p>
        <p>Usa el botón <strong>+</strong> para agregar el primero.</p>
      </div>`;
    return;
  }

  // Agrupar por categoría
  const groups = {};
  products.forEach(p => {
    const cat = p.categoria || 'Sin categoría';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(p);
  });

  // Ordenar categorías A→Z
  Object.keys(groups)
    .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
    .forEach(cat => {
      const header = document.createElement('div');
      header.className = 'cat-header';
      header.innerHTML = '<span class="cat-label">' + cat + '</span>';
      container.appendChild(header);

      groups[cat]
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
        .forEach(p => buildProductCard(p, container));
    });
}

function buildProductCard(p, container) {
  const isClothing = p.esRopa === true;
  let totalQty = 0;
  if (isClothing) {
    const sizeData = quantities[p.id] || {};
    totalQty = ['XS', 'S', 'M', 'L', 'XL', '2XL'].reduce((sum, s) => sum + (Number(sizeData[s]) || 0), 0);
  } else {
    totalQty = Number(quantities[p.id]) || 0;
  }
  const isFaltante = totalQty < p.minimo;
  const card       = document.createElement('div');
  card.className   = 'product-card' + (isFaltante ? ' faltante' : '');
  card.id          = 'card-' + p.id;

  const safeNombre = p.nombre.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

  let qtyControlsHtml = '';
  if (isClothing) {
    const sizeData = quantities[p.id] || {};
    qtyControlsHtml = `
      <div class="clothing-sizes-grid">
        ${['XS', 'S', 'M', 'L', 'XL', '2XL'].map(size => {
          const sizeQty = Number(sizeData[size]) || 0;
          return `
            <div class="size-control">
              <span class="size-label">${size}</span>
              <div class="size-qty-actions">
                <button class="qty-btn-sm minus" onclick="adjustSizeQty('${p.id}', '${size}', -1)">−</button>
                <input class="qty-input-sm size-input-${size}" type="number" inputmode="numeric" min="0" value="${sizeQty}" onchange="setSizeQty('${p.id}', '${size}', this.value)" />
                <button class="qty-btn-sm plus" onclick="adjustSizeQty('${p.id}', '${size}', 1)">+</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
      <div class="clothing-total-row">
        <span>Total en stock: <strong>${totalQty}</strong></span>
      </div>
    `;
  } else {
    const unidad = p.unidad || 'pzas';
    const isDecimal = (unidad === 'kg' || unidad === 'L');
    const inputType = isDecimal ? 'number' : 'number';
    const inputMode = isDecimal ? 'decimal' : 'numeric';
    const stepAttr = isDecimal ? 'step="0.5"' : 'step="1"';
    let unitLabel = unidad;
    if (unidad === 'paquete' && p.piezasPorPaquete) {
      unitLabel = `paq. (${p.piezasPorPaquete} pzas c/u)`;
    }
    qtyControlsHtml = `
      <div class="card-qty">
        <button class="qty-btn minus" onclick="adjustQty('${p.id}', -1)">−</button>
        <input class="qty-input" type="${inputType}" inputmode="${inputMode}" min="0" ${stepAttr} value="${totalQty}" onchange="setQty('${p.id}', this.value)" />
        <span class="qty-unit">${unitLabel}</span>
        <button class="qty-btn plus" onclick="adjustQty('${p.id}', 1)">+</button>
      </div>
    `;
  }

  const unidadLabel = (p.unidad && p.unidad !== 'pzas') ? p.unidad : 'pzas';
  const minimoLabel = p.minimo + ' ' + unidadLabel;

  card.innerHTML =
    '<div class="card-top">' +
      '<div class="card-info">' +
        '<span class="card-name">' + p.nombre + '</span>' +
        (p.unidad && p.unidad !== 'pzas' ? '<span class="card-unit-badge">' + p.unidad + '</span>' : '') +
      '</div>' +
      '<button class="btn-trash" ' +
        'onclick="deleteProduct(\'' + p.id + '\', \'' + safeNombre + '\')" ' +
        'title="Eliminar producto">🗑️</button>' +
    '</div>' +
    qtyControlsHtml +
    '<div class="card-footer">' +
      '<span class="card-min">Mínimo: ' + minimoLabel + '</span>' +
      (isFaltante
        ? '<span class="badge-faltante">⚠️ Faltante</span>'
        : '<span class="badge-ok">✅ OK</span>') +
    '</div>';

  container.appendChild(card);
}

/* ── Controles de cantidad ────────────────────────────────────────────────── */
window.adjustQty = function(id, delta) {
  const p = products.find(x => x.id === id);
  const step = (p && (p.unidad === 'kg' || p.unidad === 'L')) ? 0.5 : 1;
  quantities[id] = Math.max(0, parseFloat(((quantities[id] ?? 0) + delta * step).toFixed(3)));
  refreshCard(id);       // actualización inmediata en la UI
  persistQuantities();   // guardado en Firestore con debounce
};

window.setQty = function(id, val) {
  const p = products.find(x => x.id === id);
  const isDecimal = p && (p.unidad === 'kg' || p.unidad === 'L');
  quantities[id] = Math.max(0, isDecimal ? (parseFloat(val) || 0) : (parseInt(val) || 0));
  refreshCard(id);
  persistQuantities();
};

window.adjustSizeQty = function(id, size, delta) {
  if (typeof quantities[id] !== 'object' || quantities[id] === null) {
    quantities[id] = { XS: 0, S: 0, M: 0, L: 0, XL: 0, '2XL': 0 };
  }
  const currentVal = Number(quantities[id][size]) || 0;
  quantities[id][size] = Math.max(0, currentVal + delta);
  refreshCard(id);
  persistQuantities();
};

window.setSizeQty = function(id, size, val) {
  if (typeof quantities[id] !== 'object' || quantities[id] === null) {
    quantities[id] = { XS: 0, S: 0, M: 0, L: 0, XL: 0, '2XL': 0 };
  }
  quantities[id][size] = Math.max(0, parseInt(val) || 0);
  refreshCard(id);
  persistQuantities();
};

function refreshCard(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  const isClothing = p.esRopa === true;
  let totalQty = 0;
  
  const card = document.getElementById('card-' + id);
  if (!card) return;

  if (isClothing) {
    const sizeData = quantities[id] || {};
    totalQty = ['XS', 'S', 'M', 'L', 'XL', '2XL'].reduce((sum, s) => sum + (Number(sizeData[s]) || 0), 0);
    ['XS', 'S', 'M', 'L', 'XL', '2XL'].forEach(size => {
      const input = card.querySelector('.size-input-' + size);
      if (input) input.value = Number(sizeData[size]) || 0;
    });
    const totalEl = card.querySelector('.clothing-total-row span strong');
    if (totalEl) totalEl.textContent = totalQty;
  } else {
    totalQty = Number(quantities[id]) || 0;
    const input = card.querySelector('.qty-input');
    if (input) input.value = totalQty;
  }

  const isFaltante = totalQty < p.minimo;
  card.className = 'product-card' + (isFaltante ? ' faltante' : '');
  const unidadLabelR = (p.unidad && p.unidad !== 'pzas') ? p.unidad : 'pzas';
  card.querySelector('.card-footer').innerHTML =
    '<span class="card-min">Mínimo: ' + p.minimo + ' ' + unidadLabelR + '</span>' +
    (isFaltante
      ? '<span class="badge-faltante">⚠️ Faltante</span>'
      : '<span class="badge-ok">✅ OK</span>');
}

/* ── Eliminar producto ────────────────────────────────────────────────────── */
window.deleteProduct = async function(id, nombre) {
  const ok = await showConfirm('¿Eliminar "' + nombre + '" del catálogo permanentemente?');
  if (!ok) return;
  try {
    await deleteDoc(doc(db, 'products', id));
    products = products.filter(p => p.id !== id);
    delete quantities[id];
    persistQuantities();
    renderProducts();
    showToast('Producto eliminado', 'success');
  } catch (e) {
    showToast('Error al eliminar: ' + e.message, 'error');
  }
};

/* ── Categorías en Firestore ──────────────────────────────────────────────── */

/** Carga la lista de categorías de la sección actual desde Firestore */
async function loadCategorias() {
  try {
    const q    = query(collection(db, 'categorias'), where('seccion', '==', currentSection));
    const snap = await getDocs(q);
    categorias = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
  } catch (e) {
    console.warn('Error al cargar categorías:', e.message);
    categorias = [];
  }
}

/**
 * Guarda una categoría nueva en Firestore si no existe ya.
 * Actualiza el cache local `categorias`.
 * @returns {string} El nombre de la categoría (ya normalizado)
 */
async function saveCategoria(nombre) {
  const normalizado = nombre.trim();
  const yaExiste = categorias.some(
    c => c.nombre.toLowerCase() === normalizado.toLowerCase()
  );
  if (!yaExiste) {
    const ref = await addDoc(collection(db, 'categorias'), {
      nombre: normalizado,
      seccion: currentSection,
      creadoEn: serverTimestamp()
    });
    categorias.push({ id: ref.id, nombre: normalizado, seccion: currentSection });
    categorias.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
  }
  return normalizado;
}

/* ── Modal Agregar Producto ───────────────────────────────────────────────── */
export async function openAddProductModal() {
  let accentColor = 'var(--tienda)';
  if (currentSection === 'cocina') {
    accentColor = 'var(--cocina)';
  } else if (currentSection === 'barra') {
    accentColor = 'var(--barra)';
  }

  // Cargar categorías frescas desde Firestore
  await loadCategorias();

  const optionsHtml = categorias
    .map(c => '<option value="' + c.nombre + '">' + c.nombre + '</option>')
    .join('');

  const unidadesHtml = ['pzas', 'kg', 'g', 'L', 'mL', 'paquete']
    .map(u => `<option value="${u}">${u}</option>`).join('');

  openModal(
    '<h2 class="modal-title">Agregar Producto</h2>' +
    '<form id="add-product-form" class="form-stack">' +

      '<label class="form-label">Nombre del Producto *' +
        '<input class="form-input" id="np-nombre" type="text"' +
        ' placeholder="Ej: Aceite de oliva" required autocomplete="off" />' +
      '</label>' +

      '<label class="form-label">Categoría *' +
        '<select class="form-input" id="np-cat-select" onchange="handleCatChange(this.value)">' +
          '<option value="" disabled selected>-- Selecciona una categoría --</option>' +
          optionsHtml +
          '<option value="__nueva__">➕ Nueva categoría…</option>' +
        '</select>' +
      '</label>' +

      '<div id="np-cat-new-wrap" style="display:none">' +
        '<label class="form-label">Nombre de la nueva categoría *' +
          '<input class="form-input" id="np-cat-nueva" type="text"' +
          ' placeholder="Ej: Lácteos" autocomplete="off" />' +
        '</label>' +
      '</div>' +

      (currentSection === 'tienda' ? `
        <label class="form-label-switch">
          <input type="checkbox" id="np-es-ropa" onchange="toggleClothingInitialQty(this.checked)" />
          <span>👕 Es prenda de ropa (tallas XS-2XL)</span>
        </label>
      ` : '') +

      '<label class="form-label">Unidad de medida *' +
        '<select class="form-input" id="np-unidad" onchange="handleUnidadChange(this.value)">' +
          unidadesHtml +
        '</select>' +
      '</label>' +

      '<div id="np-piezas-wrap" style="display:none">' +
        '<label class="form-label">Piezas por paquete *' +
          '<input class="form-input" id="np-piezas" type="number" inputmode="numeric" min="1" value="12" />' +
        '</label>' +
      '</div>' +

      '<label class="form-label" id="np-qty-label">Cantidad inicial' +
        '<input class="form-input" id="np-qty" type="number"' +
        ' inputmode="decimal" min="0" step="0.5" value="0" />' +
      '</label>' +

      '<label class="form-label">Mínimo en stock *' +
        '<input class="form-input" id="np-min" type="number"' +
        ' inputmode="decimal" min="0" step="0.5" value="1" required />' +
      '</label>' +

      '<button type="submit" class="btn-primary"' +
      ' style="background:' + accentColor + '">Agregar</button>' +
    '</form>'
  );

  window.toggleClothingInitialQty = function(isRopa) {
    const qtyLabel  = document.getElementById('np-qty-label');
    const unitLabel = document.getElementById('np-unidad')?.closest('label');
    if (qtyLabel)  qtyLabel.style.display  = isRopa ? 'none' : 'flex';
    if (unitLabel) unitLabel.style.display = isRopa ? 'none' : 'flex';
  };

  window.handleCatChange = function(val) {
    const wrap     = document.getElementById('np-cat-new-wrap');
    const newInput = document.getElementById('np-cat-nueva');
    if (val === '__nueva__') {
      wrap.style.display = 'block';
      newInput.required  = true;
      setTimeout(() => newInput.focus(), 50);
    } else {
      wrap.style.display = 'none';
      newInput.required  = false;
      newInput.value     = '';
    }
  };

  window.handleUnidadChange = function(val) {
    const wrap  = document.getElementById('np-piezas-wrap');
    const input = document.getElementById('np-piezas');
    if (val === 'paquete') {
      wrap.style.display = 'block';
      input.required = true;
    } else {
      wrap.style.display = 'none';
      input.required = false;
    }
    // Ajustar step e inputmode del campo cantidad según unidad
    const qtyInput = document.getElementById('np-qty');
    const minInput = document.getElementById('np-min');
    const isDecimal = (val === 'kg' || val === 'L');
    [qtyInput, minInput].forEach(el => {
      if (!el) return;
      el.step = isDecimal ? '0.5' : '1';
      el.inputMode = isDecimal ? 'decimal' : 'numeric';
    });
  };

  document.getElementById('add-product-form').onsubmit = async (e) => {
    e.preventDefault();
    const nombre    = document.getElementById('np-nombre').value.trim();
    const selectVal = document.getElementById('np-cat-select').value;
    let   categoria = selectVal === '__nueva__'
      ? document.getElementById('np-cat-nueva').value.trim()
      : selectVal;
    const unidad = document.getElementById('np-unidad')?.value || 'pzas';
    const piezasPorPaquete = unidad === 'paquete'
      ? (parseInt(document.getElementById('np-piezas')?.value) || 1)
      : null;
    const isDecimal = (unidad === 'kg' || unidad === 'L');
    const qty    = isDecimal
      ? (parseFloat(document.getElementById('np-qty').value) || 0)
      : (parseInt(document.getElementById('np-qty').value)   || 0);
    const minimo = isDecimal
      ? (parseFloat(document.getElementById('np-min').value) || 0)
      : (parseInt(document.getElementById('np-min').value)   || 0);
    const esRopa = document.getElementById('np-es-ropa')?.checked || false;

    if (!nombre || !categoria) {
      showToast('Completa nombre y categoría', 'error');
      return;
    }

    try {
      // Si es categoría nueva, guardarla en Firestore primero
      if (selectVal === '__nueva__') {
        categoria = await saveCategoria(categoria);
      }

      const productData = {
        nombre, categoria, minimo,
        unidad,
        seccion: currentSection,
        activo: true,
        creadoEn: serverTimestamp()
      };
      if (esRopa) productData.esRopa = true;
      if (piezasPorPaquete) productData.piezasPorPaquete = piezasPorPaquete;

      const ref = await addDoc(collection(db, 'products'), productData);
      const newProduct = { id: ref.id, ...productData, creadoEn: null };
      products.push(newProduct);
      
      if (esRopa) {
        quantities[ref.id] = { XS: 0, S: 0, M: 0, L: 0, XL: 0, '2XL': 0 };
      } else {
        quantities[ref.id] = qty;
      }
      persistQuantities();
      closeModal();
      renderProducts();
      showToast('Producto agregado ✅', 'success');
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  };
}

/* ── Enviar Reporte ───────────────────────────────────────────────────────── */
export async function submitReport(user) {
  const faltantes = products.filter(p => {
    let totalQty = 0;
    if (p.esRopa === true) {
      const sizeData = quantities[p.id] || {};
      totalQty = ['XS', 'S', 'M', 'L', 'XL', '2XL'].reduce((sum, s) => sum + (Number(sizeData[s]) || 0), 0);
    } else {
      totalQty = Number(quantities[p.id]) || 0;
    }
    return totalQty < p.minimo;
  });

  const ok = await showConfirm(
    '¿Enviar reporte?\n\n' + products.length + ' productos · ' + faltantes.length + ' faltantes',
    'Enviar'
  );
  if (!ok) return;

  const snapshot = products.map(p => {
    let totalQty = 0;
    if (p.esRopa === true) {
      const sizeData = quantities[p.id] || {};
      totalQty = ['XS', 'S', 'M', 'L', 'XL', '2XL'].reduce((sum, s) => sum + (Number(sizeData[s]) || 0), 0);
      return {
        id:          p.id,
        nombre:      p.nombre,
        categoria:   p.categoria || 'Sin categoría',
        cantidad:    sizeData,
        totalCantidad: totalQty,
        esRopa:      true,
        minimo:      p.minimo,
        esFaltante:  totalQty < p.minimo
      };
    } else {
      totalQty = Number(quantities[p.id]) || 0;
      return {
        id:          p.id,
        nombre:      p.nombre,
        categoria:   p.categoria || 'Sin categoría',
        cantidad:    totalQty,
        unidad:      p.unidad || 'pzas',
        piezasPorPaquete: p.piezasPorPaquete || null,
        minimo:      p.minimo,
        esFaltante:  totalQty < p.minimo
      };
    }
  });

  try {
    await generateAndSaveReport({
      seccion:       currentSection,
      creadoPor:     { uid: user.uid, nombre: currentUserData.nombre },
      productos:     snapshot,
      totalFaltantes: faltantes.length
    });
    showToast('¡Reporte enviado! 📄', 'success');
  } catch (e) {
    showToast('Error al enviar reporte: ' + e.message, 'error');
  }
}

/* ── Loading ──────────────────────────────────────────────────────────────── */
function showLoading(show) {
  const el = document.getElementById('inv-loading');
  if (el) el.style.display = show ? 'flex' : 'none';
}
