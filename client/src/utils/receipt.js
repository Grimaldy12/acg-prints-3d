/* ============================================================
   ACG PRINTS 3D — Generador de recibos PDF
   ============================================================ */
import { jsPDF } from 'jspdf';

const BUSINESS = {
  name:      'ACG PRINTS 3D',
  tagline:   'Impresión 3D Personalizada',
  phone:     '6219-9471',
  instagram: '@acgprints3d',
  accent:    [226, 87, 15],   // naranja filamento
  ink:       [32, 37, 31],    // tinta oscura
  muted:     [121, 128, 111], // gris taller
  line:      [219, 220, 208], // línea suave
  bg:        [246, 246, 241], // fondo suave
};

function formatMoney(val) {
  return `$${Number(val || 0).toFixed(2)}`;
}

function formatDateStr(str) {
  if (!str) return '—';
  const d = new Date(str);
  if (isNaN(d)) return str;
  return d.toLocaleDateString('es-PA', { day: '2-digit', month: 'long', year: 'numeric' });
}

function receiptNumber(id) {
  if (!id) return 'N/A';
  return `#${String(id).slice(-6).toUpperCase()}`;
}

/* ── Función principal ──────────────────────────────────────── */
export function generateReceiptPDF(data, type = 'sale') {
  const doc = new jsPDF({ unit: 'mm', format: 'a5', orientation: 'portrait' });
  const W = doc.internal.pageSize.getWidth();   // 148mm
  const H = doc.internal.pageSize.getHeight();  // 210mm
  const M = 14; // margen
  let y = 0;

  // ── Helpers ────────────────────────────────────────────────
  const rgb  = (arr) => ({ r: arr[0], g: arr[1], b: arr[2] });
  const setC = (arr) => doc.setTextColor(...arr);
  const setF = (arr) => doc.setFillColor(...arr);
  const setD = (arr) => doc.setDrawColor(...arr);

  // ── Fondo blanco ───────────────────────────────────────────
  setF([255, 255, 255]);
  doc.rect(0, 0, W, H, 'F');

  // ── Encabezado naranja ─────────────────────────────────────
  setF(BUSINESS.accent);
  doc.rect(0, 0, W, 28, 'F');

  // Líneas de capa (firma visual) en el encabezado
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.3);
  for (let x = 0; x < W; x += 5) {
    doc.line(x, 0, x, 28);
  }
  doc.setGState(new doc.GState({ opacity: 1 }));

  // Nombre del negocio
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text(BUSINESS.name, M, 11);

  // Tagline
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 220, 190);
  doc.text(BUSINESS.tagline, M, 17);

  // Tipo de documento (derecha)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  const label = type === 'order' ? 'PEDIDO' : 'RECIBO';
  doc.text(label, W - M, 11, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 220, 190);
  doc.text(receiptNumber(data.id), W - M, 17, { align: 'right' });

  y = 36;

  // ── Datos del negocio ──────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  setC(BUSINESS.muted);
  doc.text(`Tel: ${BUSINESS.phone}   Instagram: ${BUSINESS.instagram}`, M, y);
  y += 7;

  // ── Línea divisora ─────────────────────────────────────────
  setD(BUSINESS.line);
  doc.setLineWidth(0.4);
  doc.line(M, y, W - M, y);
  y += 6;

  // ── Info del cliente y fecha ───────────────────────────────
  const clientName = data.customer_name || data.customer?.name || 'Sin cliente';
  const dateStr    = formatDateStr(data.created_at || data.date);
  const statusLabel = {
    pendiente: 'Pendiente', pagado: 'Pagado', entregado: 'Entregado',
    cancelado: 'Cancelado', cola: 'En cola', imprimiendo: 'Imprimiendo',
    terminado: 'Terminado',
  }[data.status] || data.status || '—';

  // Columna izquierda: cliente
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  setC(BUSINESS.muted);
  doc.text('CLIENTE', M, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  setC(BUSINESS.ink);
  doc.text(clientName, M, y + 5);

  // Columna derecha: fecha + estado
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  setC(BUSINESS.muted);
  doc.text('FECHA', W - M, y, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  setC(BUSINESS.ink);
  doc.text(dateStr, W - M, y + 5, { align: 'right' });

  y += 14;

  // Notas del pedido (si aplica)
  if (data.notes) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    setC(BUSINESS.muted);
    const noteLines = doc.splitTextToSize(`Nota: ${data.notes}`, W - M * 2);
    doc.text(noteLines, M, y);
    y += noteLines.length * 4 + 2;
  }

  // ── Encabezado de tabla ────────────────────────────────────
  setF(BUSINESS.bg);
  doc.rect(M, y, W - M * 2, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  setC(BUSINESS.muted);
  doc.text('PRODUCTO / DESCRIPCIÓN', M + 2, y + 4.8);
  doc.text('CANT', W - M - 32, y + 4.8, { align: 'right' });
  doc.text('P.UNIT', W - M - 14, y + 4.8, { align: 'right' });
  doc.text('SUBTOTAL', W - M, y + 4.8, { align: 'right' });
  y += 9;

  // ── Ítems ──────────────────────────────────────────────────
  const items = data.items || [];
  setD(BUSINESS.line);
  doc.setLineWidth(0.2);

  items.forEach((item, i) => {
    const name     = item.product_name || item.name || 'Producto';
    const qty      = Number(item.quantity || item.qty || 1);
    const price    = Number(item.unit_price || item.price || 0);
    const subtotal = Number(item.subtotal || qty * price);

    // Fondo alterno suave
    if (i % 2 === 0) {
      setF([252, 252, 250]);
      doc.rect(M, y - 1, W - M * 2, 7, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    setC(BUSINESS.ink);
    const nameLines = doc.splitTextToSize(name, W - M * 2 - 52);
    doc.text(nameLines, M + 2, y + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    setC(BUSINESS.muted);
    doc.text(String(qty),           W - M - 32, y + 4, { align: 'right' });
    doc.text(formatMoney(price),    W - M - 14, y + 4, { align: 'right' });
    setC(BUSINESS.ink);
    doc.text(formatMoney(subtotal), W - M,      y + 4, { align: 'right' });

    y += Math.max(nameLines.length * 5, 7);
    doc.line(M, y, W - M, y);
    y += 1;
  });

  y += 3;

  // ── Descuento (si aplica) ──────────────────────────────────
  if (data.discount && Number(data.discount) > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    setC(BUSINESS.muted);
    doc.text('Descuento', W - M - 28, y, { align: 'right' });
    doc.text(`-${formatMoney(data.discount)}`, W - M, y, { align: 'right' });
    y += 6;
  }

  // ── Adelanto (pedidos) ─────────────────────────────────────
  if (type === 'order' && data.deposit && Number(data.deposit) > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    setC(BUSINESS.muted);
    doc.text('Adelanto recibido', W - M - 28, y, { align: 'right' });
    doc.text(`-${formatMoney(data.deposit)}`, W - M, y, { align: 'right' });
    y += 6;

    const remaining = Number(data.total || 0) - Number(data.deposit || 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    setC(BUSINESS.muted);
    doc.text('Saldo pendiente', W - M - 28, y, { align: 'right' });
    setC(remaining > 0 ? [193, 58, 46] : [46, 125, 79]);
    doc.text(formatMoney(Math.max(0, remaining)), W - M, y, { align: 'right' });
    y += 6;
  }

  // ── Total ──────────────────────────────────────────────────
  setF(BUSINESS.ink);
  doc.rect(M, y, W - M * 2, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL', M + 4, y + 6.5);
  doc.setFontSize(12);
  doc.text(formatMoney(data.total), W - M - 2, y + 6.5, { align: 'right' });
  y += 16;

  // ── Estado ────────────────────────────────────────────────
  const statusColors = {
    pendiente: BUSINESS.accent, pagado: [46, 125, 79], entregado: [47, 99, 196],
    cancelado: [193, 58, 46],   cola: [109, 75, 190],  imprimiendo: BUSINESS.accent,
    terminado: [184, 58, 116],
  };
  const sColor = statusColors[data.status] || BUSINESS.muted;
  setF([...sColor, 0.15].slice(0,3));
  doc.setFillColor(sColor[0], sColor[1], sColor[2]);
  doc.setGState(new doc.GState({ opacity: 0.12 }));
  doc.rect(M, y, 40, 7, 'F');
  doc.setGState(new doc.GState({ opacity: 1 }));
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...sColor);
  doc.text(`Estado: ${statusLabel}`, M + 2, y + 4.8);
  y += 12;

  // ── Pie de página ──────────────────────────────────────────
  setD(BUSINESS.line);
  doc.setLineWidth(0.3);
  doc.line(M, H - 18, W - M, H - 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  setC(BUSINESS.muted);
  doc.text('¡Gracias por tu compra! · acgprints3d', W / 2, H - 13, { align: 'center' });
  doc.text(`Generado el ${new Date().toLocaleDateString('es-PA')}`, W / 2, H - 8, { align: 'center' });

  // ── Guardar ────────────────────────────────────────────────
  const filename = `recibo_${type === 'order' ? 'pedido' : 'venta'}_${receiptNumber(data.id).replace('#','')}.pdf`;
  doc.save(filename);
}
