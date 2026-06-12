/* ============================================================
   ACG PRINTS 3D — Generador de recibos PDF
   Tema: oscuro con azul logo, sin glassmorphism.
   ============================================================ */
import { jsPDF } from 'jspdf';

const BUSINESS = {
  name:      'ACG PRINTS 3D',
  tagline:   'Disenos Personalizados - Impresion 3D',
  phone:     '6219-9471',
  instagram: '@acgprints3d',
  // Paleta del logo
  dark:    [10,  12,  18],   // fondo oscuro del logo
  blue:    [41, 121, 255],   // azul logo
  silver:  [200, 205, 215],  // plateado logo
  white:   [255, 255, 255],
  muted:   [140, 148, 160],
  line:    [45,  52,  65],
  rowAlt:  [18,  22,  32],
  ink:     [230, 235, 245],
};

function fmt(val) {
  return '$' + Number(val || 0).toFixed(2);
}

function fmtDate(str) {
  if (!str) return '-';
  const d = new Date(str);
  if (isNaN(d)) return str;
  const months = ['enero','febrero','marzo','abril','mayo','junio',
                  'julio','agosto','septiembre','octubre','noviembre','diciembre'];
  return `${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
}

function receiptNum(data) {
  if (data.receipt_number) return `#${data.receipt_number}`;
  if (data.id) return `#${String(data.id).slice(-6).toUpperCase()}`;
  return '#---';
}

export function generateReceiptPDF(data, type = 'sale') {
  const doc = new jsPDF({ unit: 'mm', format: 'a5', orientation: 'portrait' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 14;
  let y = 0;

  const B = BUSINESS;

  // ── Fondo total oscuro ────────────────────────────────────
  doc.setFillColor(...B.dark);
  doc.rect(0, 0, W, H, 'F');

  // ── Encabezado: banda azul oscura ─────────────────────────
  doc.setFillColor(18, 28, 55);
  doc.rect(0, 0, W, 30, 'F');

  // Borde inferior azul brillante
  doc.setDrawColor(...B.blue);
  doc.setLineWidth(0.8);
  doc.line(0, 30, W, 30);

  // Acento azul izquierdo (barra vertical)
  doc.setFillColor(...B.blue);
  doc.rect(0, 0, 4, 30, 'F');

  // Nombre negocio
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...B.white);
  doc.text('ACG PRINTS 3D', M + 4, 12);

  // Tagline
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...B.silver);
  doc.text(B.tagline, M + 4, 19);

  // Tipo doc (derecha)
  const label = type === 'order' ? 'PEDIDO' : 'RECIBO';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...B.blue);
  doc.text(label, W - M, 12, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...B.silver);
  doc.text(receiptNum(data), W - M, 19, { align: 'right' });

  y = 38;

  // ── Contacto ──────────────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...B.muted);
  doc.text(`Tel: ${B.phone}   Instagram: ${B.instagram}`, M, y);
  y += 7;

  // ── Separador ─────────────────────────────────────────────
  doc.setDrawColor(...B.line);
  doc.setLineWidth(0.3);
  doc.line(M, y, W - M, y);
  y += 7;

  // ── Cliente + Fecha ───────────────────────────────────────
  const clientName = data.customer_name || data.customer?.name || 'Sin cliente';
  const dateStr    = fmtDate(data.created_at || data.date);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...B.muted);
  doc.text('CLIENTE', M, y);
  doc.text('FECHA', W - M, y, { align: 'right' });

  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...B.ink);
  doc.text(clientName, M, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(dateStr, W - M, y, { align: 'right' });
  y += 8;

  // Notas
  if (data.notes) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(...B.muted);
    const lines = doc.splitTextToSize(`Nota: ${data.notes}`, W - M * 2);
    doc.text(lines, M, y);
    y += lines.length * 4 + 2;
  }

  // ── Encabezado tabla ──────────────────────────────────────
  doc.setFillColor(18, 28, 55);
  doc.rect(M, y, W - M * 2, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...B.blue);
  doc.text('PRODUCTO / DESCRIPCION', M + 2, y + 4.8);
  doc.text('CANT',     W - M - 32, y + 4.8, { align: 'right' });
  doc.text('P.UNIT',   W - M - 14, y + 4.8, { align: 'right' });
  doc.text('SUBTOTAL', W - M,      y + 4.8, { align: 'right' });
  y += 9;

  // ── Ítems ─────────────────────────────────────────────────
  const items = data.items || [];
  doc.setDrawColor(...B.line);
  doc.setLineWidth(0.2);

  items.forEach((item, i) => {
    const name     = item.product_name || item.name || 'Producto';
    const qty      = Number(item.quantity || item.qty || 1);
    const price    = Number(item.unit_price || item.price || 0);
    const subtotal = Number(item.subtotal || qty * price);

    if (i % 2 === 0) {
      doc.setFillColor(...B.rowAlt);
      doc.rect(M, y - 1, W - M * 2, 7, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...B.ink);
    const nameLines = doc.splitTextToSize(name, W - M * 2 - 52);
    doc.text(nameLines, M + 2, y + 4);

    doc.setTextColor(...B.muted);
    doc.text(String(qty),        W - M - 32, y + 4, { align: 'right' });
    doc.text(fmt(price),         W - M - 14, y + 4, { align: 'right' });
    doc.setTextColor(...B.ink);
    doc.text(fmt(subtotal),      W - M,      y + 4, { align: 'right' });

    y += Math.max(nameLines.length * 5, 7);
    doc.setDrawColor(...B.line);
    doc.line(M, y, W - M, y);
    y += 1;
  });

  y += 3;

  // ── Descuento ─────────────────────────────────────────────
  if (data.discount && Number(data.discount) > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...B.muted);
    doc.text('Descuento', W - M - 28, y, { align: 'right' });
    doc.text(`-${fmt(data.discount)}`, W - M, y, { align: 'right' });
    y += 6;
  }

  // ── Adelanto (pedidos) ────────────────────────────────────
  if (type === 'order' && data.deposit && Number(data.deposit) > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...B.muted);
    doc.text('Adelanto recibido', W - M - 28, y, { align: 'right' });
    doc.text(`-${fmt(data.deposit)}`, W - M, y, { align: 'right' });
    y += 6;

    const remaining = Math.max(0, Number(data.total || 0) - Number(data.deposit || 0));
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...B.muted);
    doc.text('Saldo pendiente', W - M - 28, y, { align: 'right' });
    doc.setTextColor(remaining > 0 ? 220 : 80, remaining > 0 ? 80 : 180, remaining > 0 ? 60 : 100);
    doc.text(fmt(remaining), W - M, y, { align: 'right' });
    y += 6;
  }

  // ── Total ─────────────────────────────────────────────────
  // Fondo azul para el total
  doc.setFillColor(...B.blue);
  doc.rect(M, y, W - M * 2, 11, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...B.white);
  doc.text('TOTAL', M + 4, y + 7.2);
  doc.setFontSize(13);
  doc.text(fmt(data.total), W - M - 2, y + 7.5, { align: 'right' });
  y += 17;

  // ── Pie ───────────────────────────────────────────────────
  doc.setDrawColor(...B.line);
  doc.setLineWidth(0.3);
  doc.line(M, H - 16, W - M, H - 16);

  // Acento azul en el pie
  doc.setFillColor(...B.blue);
  doc.rect(0, H - 6, W, 6, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...B.muted);
  doc.text('Gracias por tu compra! - acgprints3d', W / 2, H - 10, { align: 'center' });

  // ── Guardar ───────────────────────────────────────────────
  const num = data.receipt_number || String(data.id || '').slice(-6).toUpperCase();
  doc.save(`recibo_${type === 'order' ? 'pedido' : 'venta'}_${num}.pdf`);
}
