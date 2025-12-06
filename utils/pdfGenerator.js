// utils/pdfGenerator.js (VERSIÓN MEJORADA CON LOGO)
const PDFDocument = require('pdfkit');
const axios = require('axios'); // Necesitarás instalar: npm install axios

function formatCurrency(value) {
  const num = Number(value || 0);
  return num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function generarNotaCompraPDF(orden) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers = [];

      // Capturar el contenido del PDF en un Buffer
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });
      doc.on('error', reject);

      // --- LOGO DE LA EMPRESA ---
      try {
        // Intentar cargar el logo desde Cloudinary
        const logoUrl = 'https://res.cloudinary.com/dngutwxha/image/upload/v1765005760/logoNovaHogar_v0jgk1.png';
        
        // Dibujar el logo en la esquina superior izquierda
        doc.image(logoUrl, 40, 40, { 
          width: 150,
          height: 60,
          fit: [150, 60],
          align: 'left'
        });
      } catch (logoError) {
        console.warn('No se pudo cargar el logo, usando texto alternativo');
        doc.font('Helvetica-Bold').fontSize(20).text(process.env.EMPRESA_NOMBRE || 'Nova Hogar', 40, 40);
      }

      // --- INFORMACIÓN DE LA FACTURA (lado derecho) ---
      const facturaX = 350;
      const facturaY = 40;
      
      doc.rect(facturaX, facturaY, 200, 80)
         .fillAndStroke('#f0f8ff', '#4a6fa5');
      
      doc.font('Helvetica-Bold').fontSize(14).fillColor('#2c3e50')
         .text('FACTURA / NOTA DE COMPRA', facturaX + 10, facturaY + 10);
      
      doc.font('Helvetica').fontSize(10).fillColor('#333');
      doc.text(`N° Orden: ${orden.id || 'N/A'}`, facturaX + 10, facturaY + 30);
      doc.text(`Fecha: ${orden.fecha_creacion ? new Date(orden.fecha_creacion).toLocaleDateString('es-MX') : 'N/A'}`, facturaX + 10, facturaY + 45);
      doc.text(`Método: ${orden.metodo_pago || 'N/A'}`, facturaX + 10, facturaY + 60);
      
      // Línea decorativa
      doc.moveTo(40, 140).lineTo(550, 140).stroke('#4a6fa5').lineWidth(1);
      
      // --- DETALLES DEL CLIENTE ---
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#2c3e50')
         .text('DETALLES DEL CLIENTE:', 40, 160);
      
      const detallesCliente = [
        `Nombre: ${orden.nombre_cliente || 'N/A'}`,
        `Dirección: ${orden.direccion || 'N/A'}, ${orden.ciudad || ''}, ${orden.codigo_postal || ''}`,
        `País: ${orden.pais || 'N/A'}`,
        `Teléfono: ${orden.telefono || 'N/A'}`
      ];
      
      detallesCliente.forEach((linea, index) => {
        doc.font('Helvetica').fontSize(10).fillColor('#333')
           .text(linea, 40, 185 + (index * 15));
      });
      
      // Línea separadora
      doc.moveTo(40, 250).lineTo(550, 250).stroke('#cccccc').lineWidth(0.5);
      
      // --- DETALLES DE LA ORDEN (TABLA) ---
      doc.font('Helvetica-Bold').fontSize(14).fillColor('#2c3e50')
         .text('DETALLES DE LA ORDEN', 40, 270);
      
      // Encabezados de la tabla
      const tableTop = 300;
      const colWidths = [200, 100, 80, 100]; // Producto, Precio, Cantidad, Subtotal
      let currentX = 40;
      
      const headers = ['Producto', 'Precio Unitario', 'Cantidad', 'Subtotal'];
      
      // Fondo para encabezados
      doc.rect(40, tableTop, 510, 25).fill('#4a6fa5');
      
      headers.forEach((header, index) => {
        doc.font('Helvetica-Bold').fontSize(10).fillColor('white')
           .text(header, currentX, tableTop + 8, { width: colWidths[index], align: index > 0 ? 'right' : 'left' });
        currentX += colWidths[index];
      });
      
      // Filas de productos
      let currentY = tableTop + 30;
      
      if (!orden.detalles || orden.detalles.length === 0) {
        // Manejar caso sin detalles
        doc.font('Helvetica').fontSize(10).fillColor('#666')
           .text('No hay detalles disponibles', 40, currentY);
        currentY += 20;
      } else {
        orden.detalles.forEach((item, index) => {
          // Fondo alternado para filas
          if (index % 2 === 0) {
            doc.rect(40, currentY - 5, 510, 20).fill('#f9f9f9');
          }
          
          let xPos = 40;
          
          // Producto
          doc.font('Helvetica').fontSize(9).fillColor('#333')
             .text(item.nombre_producto || 'Producto sin nombre', xPos, currentY, { width: 200 });
          xPos += 200;
          
          // Precio Unitario
          doc.font('Helvetica').fontSize(9).fillColor('#333')
             .text(`$${formatCurrency(item.precio_unitario)}`, xPos, currentY, { width: 100, align: 'right' });
          xPos += 100;
          
          // Cantidad
          doc.font('Helvetica').fontSize(9).fillColor('#333')
             .text(item.cantidad || 1, xPos, currentY, { width: 80, align: 'right' });
          xPos += 80;
          
          // Subtotal
          doc.font('Helvetica-Bold').fontSize(9).fillColor('#333')
             .text(`$${formatCurrency(item.subtotal)}`, xPos, currentY, { width: 100, align: 'right' });
          
          currentY += 20;
        });
      }
      
      // Línea después de la tabla
      doc.moveTo(40, currentY + 10).lineTo(550, currentY + 10).stroke('#cccccc').lineWidth(0.5);
      
      // --- TOTALES (Cuadro en la derecha) ---
      const totalesTop = currentY + 20;
      const totalesWidth = 230;
      const totalesX = 550 - totalesWidth;
      
      // Fondo del cuadro de totales
      doc.rect(totalesX, totalesTop, totalesWidth, 150)
         .fillAndStroke('#f8f9fa', '#4a6fa5');
      
      const lineasTotales = [
        { label: 'Subtotal:', value: orden.subtotal || 0 },
        { label: 'Gastos de Envío:', value: orden.gastos_envio || 0 },
        { label: 'Impuestos (IVA):', value: orden.impuestos || 0 },
        { label: 'Cupón Descuento:', value: -(orden.cupon_descuento || 0) },
        { label: 'TOTAL PAGADO:', value: orden.total || 0, bold: true }
      ];
      
      let yPos = totalesTop + 15;
      
      lineasTotales.forEach((linea) => {
        if (linea.bold) {
          doc.font('Helvetica-Bold').fontSize(11);
        } else {
          doc.font('Helvetica').fontSize(10);
        }
        
        // Etiqueta
        doc.fillColor('#2c3e50')
           .text(linea.label, totalesX + 10, yPos, { width: 140 });
        
        // Valor
        const valor = linea.value;
        const signo = valor < 0 ? '-' : '';
        const valorAbs = Math.abs(valor);
        
        doc.fillColor(valor < 0 ? '#e74c3c' : (linea.bold ? '#2c3e50' : '#333'))
           .text(`${signo}$${formatCurrency(valorAbs)}`, totalesX + 150, yPos, { width: 70, align: 'right' });
        
        yPos += 22;
        
        // Línea divisoria antes del total
        if (linea.bold) {
          doc.moveTo(totalesX + 10, yPos - 10).lineTo(totalesX + totalesWidth - 10, yPos - 10)
             .stroke('#4a6fa5').lineWidth(0.5);
          yPos += 5;
        }
      });
      
      // --- PIE DE PÁGINA ---
      const footerY = totalesTop + 160;
      
      doc.moveTo(40, footerY).lineTo(550, footerY).stroke('#4a6fa5').lineWidth(1);
      
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#2c3e50')
         .text('¡Gracias por tu compra!', 40, footerY + 15, { align: 'center', width: 510 });
      
      doc.font('Helvetica').fontSize(9).fillColor('#666')
         .text('Para consultas: soporte@novahogar.com | Tel: +52 449 123 4567', 40, footerY + 35, { align: 'center', width: 510 });
      
      doc.font('Helvetica-Oblique').fontSize(8).fillColor('#95a5a6')
         .text('Nova Hogar - DECORA TU VIDA, DECORA TU HOGAR', 40, footerY + 55, { align: 'center', width: 510 });
      
      // Terminar el documento
      doc.end();
      
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  generarNotaCompraPDF,
};
