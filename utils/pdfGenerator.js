// utils/pdfGenerator.js (VERSIÓN OPTIMIZADA)
const PDFDocument = require('pdfkit');
const axios = require('axios');

// Cache para el logo con timeout
let cachedLogo = null;
let logoCacheTime = null;

async function cargarLogoConFallback() {
    // Cache de 1 hora
    if (cachedLogo && logoCacheTime && (Date.now() - logoCacheTime) < 3600000) {
        console.log('✅ Usando logo desde cache');
        return cachedLogo;
    }
    
    try {
        const logoUrl = 'https://res.cloudinary.com/dngutwxha/image/upload/v1765005760/logoNovaHogar_v0jgk1.png';
        console.log('🔄 Descargando logo desde:', logoUrl);
        
        const response = await axios.get(logoUrl, {
            responseType: 'arraybuffer',
            timeout: 10000,
            headers: {
                'Accept': 'image/*',
                'User-Agent': 'PDFGenerator/1.0'
            }
        });
        
        if (response.status !== 200) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        cachedLogo = Buffer.from(response.data);
        logoCacheTime = Date.now();
        console.log('✅ Logo descargado exitosamente');
        return cachedLogo;
        
    } catch (error) {
        console.warn('⚠️ No se pudo cargar el logo:', error.message);
        return null;
    }
}

function formatCurrency(value) {
    const num = Number(value || 0);
    if (isNaN(num)) return '$0.00';
    return '$' + num.toLocaleString('es-MX', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    });
}

async function generarNotaCompraPDF(orden) {
    return new Promise(async (resolve, reject) => {
        try {
            console.log(`📄 Generando PDF para orden ${orden.id || 'N/A'}`);
            
            const doc = new PDFDocument({ 
                margin: 40,
                size: 'A4',
                bufferPages: true,
                info: {
                    Title: `Factura ${orden.id || ''}`,
                    Author: 'Nova Hogar',
                    Subject: 'Factura de compra',
                    CreationDate: new Date()
                }
            });
            
            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                console.log(`✅ PDF generado (${Buffer.concat(buffers).length} bytes)`);
                resolve(Buffer.concat(buffers));
            });
            doc.on('error', reject);

            // Dimensiones y configuración
            const pageWidth = 595.28;
            const pageHeight = 841.89;
            const margin = 40;
            const contentWidth = pageWidth - (margin * 2);
            
            let currentY = margin;

            // ==================== ENCABEZADO ====================
            try {
                const logoBuffer = await cargarLogoConFallback();
                
                if (logoBuffer) {
                    // Logo a la izquierda
                    doc.image(logoBuffer, margin, currentY, {
                        width: 100,
                        height: 50,
                        fit: [100, 50]
                    });
                    
                    // Texto de la empresa junto al logo
                    doc.font('Helvetica-Bold')
                       .fontSize(20)
                       .fillColor('#2c3e50')
                       .text('Nova Hogar', margin + 110, currentY + 5);
                    
                    doc.font('Helvetica-Oblique')
                       .fontSize(9)
                       .fillColor('#4a6fa5')
                       .text('DECORA TU VIDA, DECORA TU HOGAR', margin + 110, currentY + 30);
                       
                } else {
                    // Fallback sin imagen
                    doc.font('Helvetica-Bold')
                       .fontSize(20)
                       .fillColor('#2c3e50')
                       .text('Nova Hogar', margin, currentY);
                    
                    doc.font('Helvetica-Oblique')
                       .fontSize(9)
                       .fillColor('#4a6fa5')
                       .text('DECORA TU VIDA, DECORA TU HOGAR', margin, currentY + 25);
                }
            } catch (error) {
                console.warn('Error en encabezado:', error.message);
            }

            // ==================== INFO FACTURA (DERECHA) ====================
            const facturaWidth = 200;
            const facturaX = pageWidth - margin - facturaWidth;
            
            // Marco
            doc.roundedRect(facturaX, currentY, facturaWidth, 75, 5)
               .fillAndStroke('#f0f4f8', '#4a6fa5');
            
            // Título
            doc.font('Helvetica-Bold')
               .fontSize(13)
               .fillColor('#2c3e50')
               .text('FACTURA / NOTA DE COMPRA', facturaX + 10, currentY + 6, {
                   width: facturaWidth - 20,
                   align: 'center'
               });
            
            // Datos
            const fecha = orden.fecha_creacion ? 
                new Date(orden.fecha_creacion) : new Date();
            
            const facturaDatos = [
                { label: 'N° Orden:', value: String(orden.id || orden._id || 'N/A') },
                { label: 'Fecha:', value: fecha.toLocaleDateString('es-MX', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                })},
                { label: 'Método:', value: orden.metodo_pago || 'Tarjeta de Crédito' }
            ];
            
            let facturaYPos = currentY + 32;
            facturaDatos.forEach(item => {
                doc.font('Helvetica-Bold')
                   .fontSize(9)
                   .fillColor('#333')
                   .text(item.label, facturaX + 10, facturaYPos, { width: 60, continued: false });
                
                doc.font('Helvetica')
                   .fontSize(9)
                   .fillColor('#333')
                   .text(item.value, facturaX + 70, facturaYPos, { width: 120 });
                
                facturaYPos += 13;
            });

            currentY += 85; // Avanzar después del encabezado

            // ==================== SEPARADOR ====================
            doc.moveTo(margin, currentY)
               .lineTo(pageWidth - margin, currentY)
               .stroke('#4a6fa5')
               .lineWidth(1.5);
            
            currentY += 20;

            // ==================== DETALLES DEL CLIENTE ====================
            doc.font('Helvetica-Bold')
               .fontSize(12)
               .fillColor('#2c3e50')
               .text('DETALLES DEL CLIENTE', margin, currentY);
            
            currentY += 18;
            
            const clienteDatos = [
                `Nombre: ${orden.nombre_cliente || 'No especificado'}`,
                `Dirección: ${orden.direccion || 'No especificado'}, ${orden.ciudad || ''}`,
                `Código Postal: ${orden.codigo_postal || 'N/A'}`,
                `País: ${orden.pais || 'México'}`,
                `Teléfono: ${orden.telefono || 'N/A'}`
            ];
            
            clienteDatos.forEach(linea => {
                doc.font('Helvetica')
                   .fontSize(10)
                   .fillColor('#333')
                   .text(linea, margin, currentY);
                currentY += 15;
            });

            currentY += 10;

            // ==================== TABLA DE PRODUCTOS ====================
            doc.font('Helvetica-Bold')
               .fontSize(12)
               .fillColor('#2c3e50')
               .text('DETALLES DE LA ORDEN', margin, currentY);
            
            currentY += 18;
            
            // Configuración de columnas optimizada
            const colWidths = [260, 90, 70, 90];
            const colPositions = [margin];
            
            for (let i = 1; i < colWidths.length; i++) {
                colPositions[i] = colPositions[i-1] + colWidths[i-1];
            }
            
            // Encabezado de tabla
            doc.rect(margin, currentY, contentWidth, 25)
               .fill('#4a6fa5');
            
            const headers = ['Producto', 'Precio Unit.', 'Cant.', 'Subtotal'];
            headers.forEach((header, index) => {
                doc.font('Helvetica-Bold')
                   .fontSize(10)
                   .fillColor('white')
                   .text(header, 
                         colPositions[index] + (index === 0 ? 8 : 0), 
                         currentY + 8, {
                       width: colWidths[index] - (index === 0 ? 8 : 0),
                       align: index > 0 ? 'right' : 'left'
                   });
            });
            
            currentY += 25;
            
            // Productos
            if (!orden.detalles || orden.detalles.length === 0) {
                doc.font('Helvetica')
                   .fontSize(10)
                   .fillColor('#666')
                   .text('No hay productos en esta orden', margin, currentY + 5);
                currentY += 25;
            } else {
                orden.detalles.forEach((item, index) => {
                    // Verificar si necesitamos una nueva página
                    if (currentY > pageHeight - 250) {
                        doc.addPage();
                        currentY = margin;
                    }
                    
                    // Fondo alternado
                    if (index % 2 === 0) {
                        doc.rect(margin, currentY, contentWidth, 22)
                           .fill('#f9f9f9');
                    }
                    
                    const rowY = currentY + 6;
                    
                    // Nombre del producto (truncado si es muy largo)
                    const nombre = item.nombre_producto || 'Producto';
                    doc.font('Helvetica')
                       .fontSize(9)
                       .fillColor('#333')
                       .text(nombre, colPositions[0] + 8, rowY, {
                           width: colWidths[0] - 12,
                           ellipsis: true
                       });
                    
                    // Precio
                    doc.text(formatCurrency(item.precio_unitario), 
                             colPositions[1], rowY, {
                           width: colWidths[1],
                           align: 'right'
                       });
                    
                    // Cantidad
                    doc.text(String(item.cantidad || 1), colPositions[2], rowY, {
                           width: colWidths[2],
                           align: 'right'
                       });
                    
                    // Subtotal
                    doc.font('Helvetica-Bold')
                       .text(formatCurrency(item.subtotal), colPositions[3], rowY, {
                           width: colWidths[3],
                           align: 'right'
                       });
                    
                    currentY += 22;
                });
            }
            
            currentY += 15;
            
            // Línea después de productos
            doc.moveTo(margin, currentY)
               .lineTo(pageWidth - margin, currentY)
               .stroke('#ddd')
               .lineWidth(0.5);
            
            currentY += 20;

            // ==================== TOTALES ====================
            const totalesWidth = 240;
            const totalesX = pageWidth - margin - totalesWidth;
            
            // Marco
            doc.roundedRect(totalesX, currentY, totalesWidth, 130, 8)
               .fillAndStroke('#f8f9fa', '#4a6fa5');
            
            const totales = [
                { label: 'Subtotal:', value: Number(orden.subtotal) || 0 },
                { label: 'Gastos de Envío:', value: Number(orden.gastos_envio) || 0 },
                { label: 'Impuestos (IVA):', value: Number(orden.impuestos) || 0 },
                { label: 'Cupón Descuento:', value: -(Number(orden.cupon_descuento) || 0) },
                { separator: true },
                { label: 'TOTAL PAGADO:', value: Number(orden.total) || 0, bold: true }
            ];
            
            let totalesY = currentY + 15;
            
            totales.forEach(item => {
                if (item.separator) {
                    doc.moveTo(totalesX + 15, totalesY)
                       .lineTo(totalesX + totalesWidth - 15, totalesY)
                       .stroke('#4a6fa5')
                       .lineWidth(1);
                    totalesY += 12;
                    return;
                }
                
                const isBold = item.bold;
                doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica')
                   .fontSize(isBold ? 13 : 10);
                
                let color = '#333';
                if (item.value < 0) color = '#e74c3c';
                if (isBold) color = '#2c3e50';
                
                // Etiqueta
                doc.fillColor(color)
                   .text(item.label, totalesX + 15, totalesY, { width: 140 });
                
                // Valor
                const valorAbs = Math.abs(item.value);
                const signo = item.value < 0 ? '-' : '';
                
                doc.fillColor(color)
                   .text(`${signo}${formatCurrency(valorAbs)}`, 
                         totalesX + 155, totalesY, {
                       width: 70,
                       align: 'right'
                   });
                
                totalesY += isBold ? 20 : 16;
            });
            
            // ==================== PIE DE PÁGINA ====================
            const footerY = pageHeight - margin - 50;
            
            doc.moveTo(margin, footerY)
               .lineTo(pageWidth - margin, footerY)
               .stroke('#4a6fa5')
               .lineWidth(0.5);
            
            // Mensaje de agradecimiento
            doc.font('Helvetica-Bold')
               .fontSize(11)
               .fillColor('#2c3e50')
               .text('¡Gracias por tu compra!', margin, footerY + 10, {
                   width: contentWidth,
                   align: 'center'
               });
            
            // Contacto
            doc.font('Helvetica')
               .fontSize(9)
               .fillColor('#666')
               .text('soporte@novahogar.com | Tel: +52 449 123 4567',
                     margin, footerY + 25, {
                         width: contentWidth,
                         align: 'center'
                     });
            
            // Número de página en todas las páginas
            const totalPages = doc.bufferedPageRange().count;
            for (let i = 0; i < totalPages; i++) {
                doc.switchToPage(i);
                doc.font('Helvetica')
                   .fontSize(8)
                   .fillColor('#999')
                   .text(`Página ${i + 1} de ${totalPages}`,
                         pageWidth - margin - 50, pageHeight - margin - 15);
            }
            
            // Finalizar
            doc.end();
            
        } catch (error) {
            console.error('❌ Error crítico generando PDF:', error);
            reject(error);
        }
    });
}

module.exports = {
    generarNotaCompraPDF
};



