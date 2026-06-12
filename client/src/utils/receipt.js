/* ============================================================
   ACG PRINTS 3D — Generador de recibos
   Genera HTML estilizado y abre el diálogo de impresión/PDF.
   Soporta todos los caracteres, sin dependencias de fuentes.
   ============================================================ */

const BUSINESS = {
  name:      'ACG PRINTS 3D',
  tagline:   'Diseños Personalizados · Impresión 3D',
  phone:     '6219-9471',
  instagram: '@acgprints3d',
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
  if (data.receipt_number) return `#${String(data.receipt_number).padStart(4,'0')}`;
  if (data.id) return `#${String(data.id).slice(-6).toUpperCase()}`;
  return '#---';
}

export function generateReceiptPDF(data, type = 'sale') {
  const items    = data.items || [];
  const clientName = data.customer_name || data.customer?.name || 'Sin cliente';
  const dateStr  = fmtDate(data.created_at || data.date);
  const num      = receiptNum(data);
  const label    = type === 'order' ? 'PEDIDO' : 'RECIBO';
  const hasDeposit = type === 'order' && data.deposit && Number(data.deposit) > 0;
  const remaining  = hasDeposit ? Math.max(0, Number(data.total||0) - Number(data.deposit||0)) : 0;

  const itemsHTML = items.map((item, i) => {
    const name     = item.product_name || item.name || 'Producto';
    const qty      = Number(item.quantity || 1);
    const price    = Number(item.unit_price || item.price || 0);
    const subtotal = Number(item.subtotal || qty * price);
    return `
      <tr style="background:${i%2===0?'#12161f':'transparent'}">
        <td style="padding:8px 10px;color:#e6eaf5;font-size:12px">${name}</td>
        <td style="padding:8px 10px;color:#8c94a0;font-size:12px;text-align:center">${qty}</td>
        <td style="padding:8px 10px;color:#8c94a0;font-size:12px;text-align:right">${fmt(price)}</td>
        <td style="padding:8px 10px;color:#e6eaf5;font-size:12px;text-align:right;font-weight:600">${fmt(subtotal)}</td>
      </tr>`;
  }).join('');

  const discountRow = data.discount && Number(data.discount) > 0 ? `
    <tr>
      <td colspan="3" style="padding:6px 10px;color:#8c94a0;font-size:11px;text-align:right">Descuento</td>
      <td style="padding:6px 10px;color:#8c94a0;font-size:11px;text-align:right">-${fmt(data.discount)}</td>
    </tr>` : '';

  const depositRows = hasDeposit ? `
    <tr>
      <td colspan="3" style="padding:6px 10px;color:#8c94a0;font-size:11px;text-align:right">Adelanto recibido</td>
      <td style="padding:6px 10px;color:#8c94a0;font-size:11px;text-align:right">-${fmt(data.deposit)}</td>
    </tr>
    <tr>
      <td colspan="3" style="padding:6px 10px;color:#8c94a0;font-size:11px;text-align:right;font-weight:700">Saldo pendiente</td>
      <td style="padding:6px 10px;font-size:11px;text-align:right;font-weight:700;color:${remaining>0?'#e05c50':'#4caf78'}">${fmt(remaining)}</td>
    </tr>` : '';

  const notesHTML = data.notes ? `
    <p style="margin:0 0 12px;font-size:11px;color:#8c94a0;font-style:italic">
      Nota: ${data.notes}
    </p>` : '';

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Recibo ${num} - ACG PRINTS 3D</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      font-family:'Inter',system-ui,sans-serif;
      background:#0a0c12;
      color:#e6eaf5;
      print-color-adjust:exact;
      -webkit-print-color-adjust:exact;
    }
    .page {
      width:148mm;
      min-height:210mm;
      margin:0 auto;
      background:#0a0c12;
      position:relative;
    }
    @media print {
      html,body { background:#0a0c12 !important; }
      .page { width:100%; margin:0; box-shadow:none; }
      .no-print { display:none; }
    }
    /* Botón de descarga (solo en pantalla) */
    .print-btn {
      display:block;
      margin:16px auto;
      padding:10px 28px;
      background:#2979ff;
      color:#fff;
      border:none;
      border-radius:6px;
      font-size:14px;
      font-weight:600;
      cursor:pointer;
      font-family:inherit;
    }
    .print-btn:hover { background:#1565c0; }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">⬇ Descargar / Imprimir PDF</button>
  <div class="page">
    <!-- Encabezado -->
    <div style="background:#12183a;border-left:5px solid #2979ff;padding:16px 20px;display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <div style="font-size:17px;font-weight:800;color:#ffffff;letter-spacing:-0.3px">ACG PRINTS 3D</div>
        <div style="font-size:9px;color:#8c9bc0;margin-top:3px;font-weight:500">${BUSINESS.tagline}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:13px;font-weight:800;color:#2979ff;letter-spacing:1px">${label}</div>
        <div style="font-size:9px;color:#8c9bc0;margin-top:3px;font-weight:600">${num}</div>
      </div>
    </div>

    <!-- Borde azul -->
    <div style="height:2px;background:linear-gradient(90deg,#2979ff,#1a237e)"></div>

    <!-- Contacto -->
    <div style="padding:10px 20px;border-bottom:1px solid #1e2535">
      <span style="font-size:10px;color:#8c94a0">Tel: ${BUSINESS.phone} &nbsp;·&nbsp; Instagram: ${BUSINESS.instagram}</span>
    </div>

    <!-- Cliente + Fecha -->
    <div style="padding:14px 20px;display:flex;justify-content:space-between;border-bottom:1px solid #1e2535">
      <div>
        <div style="font-size:9px;font-weight:700;color:#8c94a0;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Cliente</div>
        <div style="font-size:13px;font-weight:700;color:#ffffff">${clientName}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:9px;font-weight:700;color:#8c94a0;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Fecha</div>
        <div style="font-size:12px;color:#e6eaf5">${dateStr}</div>
      </div>
    </div>

    <!-- Notas -->
    ${notesHTML ? `<div style="padding:8px 20px 0;border-bottom:1px solid #1e2535">${notesHTML}</div>` : ''}

    <!-- Tabla -->
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:#12183a">
          <th style="padding:8px 10px;font-size:9px;font-weight:700;color:#2979ff;text-transform:uppercase;letter-spacing:1px;text-align:left">Producto / Descripción</th>
          <th style="padding:8px 10px;font-size:9px;font-weight:700;color:#2979ff;text-transform:uppercase;letter-spacing:1px;text-align:center">Cant</th>
          <th style="padding:8px 10px;font-size:9px;font-weight:700;color:#2979ff;text-transform:uppercase;letter-spacing:1px;text-align:right">P.Unit</th>
          <th style="padding:8px 10px;font-size:9px;font-weight:700;color:#2979ff;text-transform:uppercase;letter-spacing:1px;text-align:right">Subtotal</th>
        </tr>
      </thead>
      <tbody>${itemsHTML}</tbody>
      <tfoot>
        ${discountRow}
        ${depositRows}
        <tr>
          <td colspan="4" style="padding:0">
            <div style="background:#2979ff;padding:10px 10px;display:flex;justify-content:space-between;align-items:center">
              <span style="font-size:11px;font-weight:800;color:#fff;letter-spacing:1px">TOTAL</span>
              <span style="font-size:16px;font-weight:800;color:#fff">${fmt(data.total)}</span>
            </div>
          </td>
        </tr>
      </tfoot>
    </table>

    <!-- Pie -->
    <div style="margin-top:auto;padding:14px 20px;text-align:center;border-top:1px solid #1e2535">
      <div style="font-size:10px;color:#8c94a0">¡Gracias por tu compra! · acgprints3d</div>
      <div style="font-size:9px;color:#4a5060;margin-top:3px">Generado el ${new Date().toLocaleDateString('es-PA')}</div>
    </div>
    <div style="height:5px;background:linear-gradient(90deg,#2979ff,#1a237e)"></div>
  </div>
  <button class="print-btn no-print" onclick="window.print()" style="margin-bottom:24px">⬇ Descargar / Imprimir PDF</button>
</body>
</html>`;

  // Abrir en nueva pestaña y activar diálogo de impresión
  const win = window.open('', '_blank');
  if (!win) {
    alert('Por favor permite ventanas emergentes para descargar el recibo.');
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  // Pequeño delay para que cargue la fuente de Google
  setTimeout(() => { win.print(); }, 900);
}
