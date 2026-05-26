import { db } from './auth.js';
import {
  collection, addDoc, getDocs, query, orderBy, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

export async function generateAndSaveReport({ seccion, creadoPor, productos, totalFaltantes }) {
  // 1. Guardar en Firestore
  await addDoc(collection(db, 'reportes'), {
    seccion,
    creadoPor,
    productos,
    totalFaltantes,
    fecha: serverTimestamp()
  });

  // 2. Generar PDF
  generatePDF({ seccion, creadoPor, productos, totalFaltantes, fecha: new Date() });
}

export async function loadReports() {
  const q = query(collection(db, 'reportes'), orderBy('fecha', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export function generatePDF({ seccion, creadoPor, productos, totalFaltantes, fecha }) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const accentR = seccion === 'cocina' ? 249 : 59;
  const accentG = seccion === 'cocina' ? 115 : 130;
  const accentB = seccion === 'cocina' ?  22 : 246;

  const W = doc.internal.pageSize.getWidth();
  const dateStr = fecha instanceof Date
    ? fecha.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : String(fecha);

  const secLabel = seccion === 'cocina' ? 'Cocina' : 'Barra';

  // ── Header band ──────────────────────────────────────────────────────────
  doc.setFillColor(accentR, accentG, accentB);
  doc.rect(0, 0, W, 30, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Inventario de ' + secLabel, 14, 13);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Fecha: ' + dateStr, 14, 21);
  doc.text('Realizado por: ' + creadoPor.nombre, 14, 26);

  // ── Summary row ───────────────────────────────────────────────────────────
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Total productos: ' + productos.length + '   |   Faltantes: ' + totalFaltantes, 14, 38);

  // ── Group by category ─────────────────────────────────────────────────────
  const groups = {};
  productos.forEach(p => {
    const c = p.categoria || 'Sin categoria';
    if (!groups[c]) groups[c] = [];
    groups[c].push(p);
  });
  const sortedCats = Object.keys(groups).sort();

  let startY = 44;

  sortedCats.forEach(cat => {
    const rows = groups[cat];
    const tableRows = rows.map(p => [
      p.nombre,
      String(p.cantidad),
      String(p.minimo),
      p.esFaltante ? 'FALTANTE' : 'OK'
    ]);

    // Category header row
    doc.autoTable({
      startY,
      head: [[{ content: cat, colSpan: 4,
        styles: { fillColor: [accentR, accentG, accentB], textColor: [255,255,255], fontStyle: 'bold', fontSize: 10 } }]],
      body: [],
      theme: 'plain',
      margin: { left: 14, right: 14 },
      styles: { cellPadding: 2 }
    });
    startY = doc.lastAutoTable.finalY;

    doc.autoTable({
      startY,
      head: [['Producto', 'Cantidad', 'Minimo', 'Estado']],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [230, 230, 230], textColor: [50, 50, 50], fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 40, halign: 'center' }
      },
      margin: { left: 14, right: 14 },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 3) {
          const text = String(data.cell.raw);
          if (text === 'FALTANTE') {
            doc.setFillColor(254, 226, 226);
            doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
            doc.setTextColor(185, 28, 28);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text(text, data.cell.x + data.cell.width / 2,
              data.cell.y + data.cell.height / 2 + 1, { align: 'center' });
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'normal');
          } else {
            doc.setFillColor(209, 250, 229);
            doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
            doc.setTextColor(6, 95, 70);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text(text, data.cell.x + data.cell.width / 2,
              data.cell.y + data.cell.height / 2 + 1, { align: 'center' });
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'normal');
          }
        }
      }
    });
    startY = doc.lastAutoTable.finalY + 4;
  });

  // ── Lista de faltantes para pedido ────────────────────────────────────────
  const faltantes = productos.filter(p => p.esFaltante);

  if (faltantes.length > 0) {
    // Si queda poco espacio en la página, saltar a una nueva
    if (startY > 220) {
      doc.addPage();
      startY = 20;
    } else {
      startY += 6;
    }

    // Titulo de la seccion
    doc.setFillColor(accentR, accentG, accentB);
    doc.rect(14, startY, W - 28, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('LISTA DE PEDIDO - Productos faltantes', 18, startY + 5.5);
    startY += 10;

    const pedidoRows = faltantes
      .sort((a, b) => (a.categoria || '').localeCompare(b.categoria || '', 'es'))
      .map((p, i) => [
        String(i + 1),
        p.categoria || 'Sin categoria',
        p.nombre,
        String(p.cantidad),
        String(p.minimo),
        String(p.minimo - p.cantidad)
      ]);

    doc.autoTable({
      startY,
      head: [['#', 'Categoria', 'Producto', 'Hay', 'Minimo', 'Necesario']],
      body: pedidoRows,
      theme: 'grid',
      headStyles: { fillColor: [254, 226, 226], textColor: [185, 28, 28], fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 38 },
        2: { cellWidth: 68 },
        3: { cellWidth: 16, halign: 'center' },
        4: { cellWidth: 16, halign: 'center' },
        5: { cellWidth: 20, halign: 'center', fontStyle: 'bold', textColor: [185, 28, 28] }
      },
      margin: { left: 14, right: 14 }
    });
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'normal');
    doc.text('Inventario Restaurante  -  Pagina ' + i + ' de ' + pageCount,
      W / 2, 290, { align: 'center' });
  }

  const fileName = 'inventario_' + seccion + '_' + new Date().toISOString().slice(0, 10) + '.pdf';
  doc.save(fileName);
}
