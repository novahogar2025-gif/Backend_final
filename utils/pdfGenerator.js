// utils/pdfGenerator.js (VERSIÓN MEJORADA)
const PDFDocument = require('pdfkit');
const axios = require('axios');

function formatCurrency(value) {
  const num = Number(value || 0);
  return num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function generarNotaCompraPDF(orden) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        margin: 40, 
        size: 'A4',
        bufferPages: true 
      });
      
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });
      doc.on('error', reject);

      // --- CONSTANTES PARA DISEÑO ---
      const pageWidth = 595.28; // Ancho A4 en puntos
      const pageHeight = 841.89; // Alto A4 en puntos
      const margin = 40;
      const contentWidth = pageWidth - (margin * 2);

      // --- LOGO DE LA EMPRESA ---
      try {
        const logoUrl = 'https://res.cloudinary.com/dngutwxha/image/upload/v1765005760/logoNovaHogar_v0jgk1.png';
        const logoResponse = await axios.get(logoUrl, { responseType: 'arraybuffer' });
        
        // Insertar logo
        const logoImage = Buffer.from(logoResponse.data);
        doc.image(logoImage, margin, margin, { 
          width: 120,
          height: 60,
          fit: [120, 60]
        });
        
        // Nombre de la empresa al lado del logo
        doc.font('Helvetica-Bold').fontSize(18).fillColor('#2c3e50')
           .text('Nova Hogar', margin + 130, margin + 10);
        
        doc.font('Helvetica-Oblique').fontSize(11).fillColor('#4a6fa5')
           .text('DECORA TU VIDA, DECORA TU HOGAR', margin + 130, margin + 30);
           
      } catch (logoError) {
        console.warn('No se pudo cargar el logo, usando texto alternativo');
        doc.font('Helvetica-Bold').fontSize(24).fillColor('#2c3e50')
           .text('Nova Hogar', margin, margin);
        doc.font('Helvetica-Oblique').fontSize(12).fillColor('#4a6fa5')
           .text('DECORA TU VIDA, DECORA TU HOGAR', margin, margin + 25);
      }

      // --- INFORMACIÓN DE LA FACTURA (lado derecho) ---
      const facturaWidth = 180;
      const facturaX = pageWidth - margin - facturaWidth;
      
      // Marco de la factura
      doc.roundedRect(facturaX, margin, facturaWidth, 80, 5)
         .fillAndStroke('#f8f9fa', '#4a6fa5');
      
      // Título factura
      doc.font('Helvetica-Bold').fontSize(14).fillColor('#2c3e50')
         .text('FACTURA / NOTA DE COMPRA', facturaX + 10, margin + 12);
      
      // Línea decorativa
      doc.moveTo(facturaX + 10, margin + 32).lineTo(facturaX + facturaWidth - 10, margin + 32)
         .stroke('#4a6fa5').lineWidth(0.5);
      
      // Datos de la factura
      const facturaData = [
        { label: 'N° Orden:', value: orden.id || 'N/A' },
        { label: 'Fecha:', value: orden.fecha_creacion ? 
          new Date(orden.fecha_creacion).toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }) : new Date().toLocaleDateString('es-MX') },
        { label: 'Método:', value: orden.metodo_pago || 'Tarjeta de crédito' }
      ];
      
      let facturaY = margin + 40;
      facturaData.forEach(item => {
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#333')
           .text(item.label, facturaX + 10, facturaY, { width: 60 });
        doc.font('Helvetica').fontSize(9).fillColor('#333')
           .text(item.value, facturaX + 70, facturaY, { width: 100 });
        facturaY += 15;
      });
      
      // Línea separadora
      const separatorY = margin + 130;
      doc.moveTo(margin, separatorY).lineTo(pageWidth - margin, separatorY)
         .stroke('#4a6fa5').lineWidth(1);
      
      // --- DETALLES DEL CLIENTE ---
      const clienteY = separatorY + 20;
      
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#2c3e50')
         .text('DETALLES DEL CLIENTE:', margin, clienteY);
      
      const detallesCliente = [
        `Nombre: ${orden.nombre_cliente || 'N/A'}`,
        `Dirección: ${orden.direccion || 'N/A'}, ${orden.ciudad || ''}`,
        `Código Postal: ${orden.codigo_postal || 'N/A'}`,
        `País: ${orden.pais || 'N/A'}`,
        `Teléfono: ${orden.telefono || 'N/A'}`
      ];
      
      detallesCliente.forEach((linea, index) => {
        doc.font('Helvetica').fontSize(10).fillColor('#333')
           .text(linea, margin, clienteY + 20 + (index * 15));
      });
      
      // --- DETALLES DE LA ORDEN ---
      const ordenY = clienteY + 110;
      
      doc.font('Helvetica-Bold').fontSize(14).fillColor('#2c3e50')
         .text('DETALLES DE LA ORDEN', margin, ordenY);
      
      // Encabezados de tabla
      const tableTop = ordenY + 20;
      const colWidths = [220, 100, 80, 100];
      const colPositions = [margin];
      for (let i = 1; i < colWidths.length; i++) {
        colPositions[i] = colPositions[i-1] + colWidths[i-1];
      }
      
      // Fondo encabezados
      doc.rect(margin, tableTop, contentWidth, 25).fill('#4a6fa5');
      
      const headers = ['Producto', 'Precio Unitario', 'Cantidad', 'Subtotal'];
      headers.forEach((header, index) => {
        doc.font('Helvetica-Bold').fontSize(10).fillColor('white')
           .text(header, colPositions[index], tableTop + 8, { 
             width: colWidths[index], 
             align: index > 0 ? 'right' : 'left' 
           });
      });
      
      // Filas de productos
      let currentY = tableTop + 30;
      
      if (!orden.detalles || orden.detalles.length === 0) {
        // Producto por defecto si no hay detalles
        doc.font('Helvetica').fontSize(10).fillColor('#666')
           .text('Sin detalles específicos', margin, currentY);
        currentY += 20;
      } else {
        orden.detalles.forEach((item, index) => {
          // Fondo alternado
          if (index % 2 === 0) {
            doc.rect(margin, currentY - 5, contentWidth, 20).fill('#f9f9f9');
          }
          
          // Producto
          doc.font('Helvetica').fontSize(9).fillColor('#333')
             .text(item.nombre_producto || 'Producto', colPositions[0], currentY, { 
               width: colWidths[0] - 10 
             });
          
          // Precio
          doc.font('Helvetica').fontSize(9).fillColor('#333')
             .text(`$${formatCurrency(item.precio_unitario)}`, colPositions[1], currentY, { 
               width: colWidths[1], 
               align: 'right' 
             });
          
          // Cantidad
          doc.font('Helvetica').fontSize(9).fillColor('#333')
             .text(item.cantidad || 1, colPositions[2], currentY, { 
               width: colWidths[2], 
               align: 'right' 
             });
          
          // Subtotal
          doc.font('Helvetica-Bold').fontSize(9).fillColor('#333')
             .text(`$${formatCurrency(item.subtotal)}`, colPositions[3], currentY, { 
               width: colWidths[3], 
               align: 'right' 
             });
          
          currentY += 20;
        });
      }
      
      // Línea después de productos
      doc.moveTo(margin, currentY + 10).lineTo(pageWidth - margin, currentY + 10)
         .stroke('#cccccc').lineWidth(0.5);
      
      // --- TOTALES ---
      const totalesY = currentY + 25;
      const totalesWidth = 230;
      const totalesX = pageWidth - margin - totalesWidth;
      
      // Marco de totales
      doc.roundedRect(totalesX, totalesY, totalesWidth, 135, 5)
         .fillAndStroke('#f8f9fa', '#4a6fa5');
      
      const lineasTotales = [
        { label: 'Subtotal:', value: orden.subtotal || 0 },
        { label: 'Gastos de Envío:', value: orden.gastos_envio || 0 },
        { label: 'Impuestos (IVA):', value: orden.impuestos || 0 },
        { label: 'Cupón Descuento:', value: -(orden.cupon_descuento || 0) },
        { label: '', value: 0 }, // Espacio
        { label: 'TOTAL PAGADO:', value: orden.total || 0, bold: true }
      ];
      
      let totalesCurrentY = totalesY + 15;
      
      lineasTotales.forEach((linea, index) => {
        // Salto de línea antes del total
        if (index === lineasTotales.length - 2) {
          totalesCurrentY += 10;
          doc.moveTo(totalesX + 10, totalesCurrentY - 5)
             .lineTo(totalesX + totalesWidth - 10, totalesCurrentY - 5)
             .stroke('#4a6fa5').lineWidth(1);
          totalesCurrentY += 10;
        }
        
        if (linea.label === '') {
          totalesCurrentY += 5;
          return;
        }
        
        if (linea.bold) {
          doc.font('Helvetica-Bold').fontSize(12);
        } else {
          doc.font('Helvetica').fontSize(10);
        }
        
        // Etiqueta
        doc.fillColor('#2c3e50')
           .text(linea.label, totalesX + 15, totalesCurrentY, { width: 140 });
        
        // Valor
        const valor = linea.value;
        const signo = valor < 0 ? '-' : '';
        const valorAbs = Math.abs(valor);
        const color = valor < 0 ? '#e74c3c' : (linea.bold ? '#2c3e50' : '#333');
        
        doc.fillColor(color)
           .text(`${signo}$${formatCurrency(valorAbs)}`, totalesX + 155, totalesCurrentY, { 
             width: 60, 
             align: 'right' 
           });
        
        totalesCurrentY += 18;
      });
      
      // --- PIE DE PÁGINA ---
      const footerY = pageHeight - margin - 60;
      
      doc.moveTo(margin, footerY).lineTo(pageWidth - margin, footerY)
         .stroke('#4a6fa5').lineWidth(0.5);
      
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#2c3e50')
         .text('¡Gracias por tu compra!', margin, footerY + 10, { 
           width: contentWidth, 
           align: 'center' 
         });
      
      doc.font('Helvetica').fontSize(9).fillColor('#666')
         .text('Para consultas: soporte@novahogar.com | Tel: +52 449 123 4567', 
               margin, footerY + 25, { width: contentWidth, align: 'center' });
      
      doc.font('Helvetica-Oblique').fontSize(8).fillColor('#95a5a6')
         .text('Nova Hogar - DECORA TU VIDA, DECORA TU HOGAR', 
               margin, footerY + 40, { width: contentWidth, align: 'center' });
      
      // Número de página
      const totalPages = doc.bufferedPageRange().count;
      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i);
        doc.font('Helvetica').fontSize(8).fillColor('#999')
           .text(`Página ${i + 1} de ${totalPages}`, 
                 pageWidth - margin - 50, pageHeight - margin - 10);
      }
      
      // Finalizar documento
      doc.end();
      
    } catch (error) {
      console.error('❌ Error generando PDF:', error);
      reject(error);
    }
  });
}

module.exports = {
  generarNotaCompraPDF,
};
