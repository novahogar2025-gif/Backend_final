// utils/pdfGenerator.js (VERSIÓN COMPLETA CORREGIDA)
const PDFDocument = require('pdfkit');

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
        // URL del logo - verificada
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
        console.log('🔄 Intentando con placeholder alternativo...');
        
        // Crear un logo simple como fallback
        try {
            const fallbackUrl = 'https://via.placeholder.com/120x60/2c3e50/FFFFFF?text=Nova+Hogar';
            const fallbackResponse = await axios.get(fallbackUrl, {
                responseType: 'arraybuffer',
                timeout: 5000
            });
            
            cachedLogo = Buffer.from(fallbackResponse.data);
            logoCacheTime = Date.now();
            return cachedLogo;
        } catch (fallbackError) {
            console.warn('⚠️ No se pudo cargar ningún logo');
            return null;
        }
    }
}

function formatCurrency(value) {
    const num = Number(value || 0);
    if (isNaN(num)) return '$0.00';
    return num.toLocaleString('es-MX', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    });
}

async function generarNotaCompraPDF(orden) {
    return new Promise(async (resolve, reject) => {
        try {
            console.log(`📄 Generando PDF para orden ${orden.id || 'N/A'}`);
            
            const doc = new PDFDocument({ 
                margin: 50,
                size: 'A4',
                bufferPages: true,
                info: {
                    Title: `Factura ${orden.id || ''}`,
                    Author: 'Nova Hogar',
                    Subject: 'Factura de compra',
                    Keywords: 'factura, compra, pedido',
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

            // Dimensiones
            const pageWidth = 595.28;
            const pageHeight = 841.89;
            const margin = 50;
            const contentWidth = pageWidth - (margin * 2);

            // --- ENCABEZADO CON LOGO ---
            let headerHeight = 80;
            const logoX = margin;
            const logoY = margin;
            
            try {
                const logoBuffer = await cargarLogoConFallback();
                
                if (logoBuffer) {
                    // Insertar logo con tamaño controlado
                    doc.image(logoBuffer, logoX, logoY, {
                        width: 120,
                        height: 60,
                        fit: [120, 60]
                    });
                    
                    // Nombre de la empresa - CORREGIDO: "Nova Hogar" no "NOVA Hogar"
                    doc.font('Helvetica-Bold')
                       .fontSize(22)
                       .fillColor('#2c3e50')
                       .text('Nova Hogar', margin + 130, margin + 10);
                    
                    // Lema completo - CORREGIDO
                    doc.font('Helvetica-Oblique')
                       .fontSize(11)
                       .fillColor('#4a6fa5')
                       .text('DECORA TU VIDA, DECORA TU HOGAR', margin + 130, margin + 35);
                       
                } else {
                    // Fallback sin imagen
                    doc.font('Helvetica-Bold')
                       .fontSize(24)
                       .fillColor('#2c3e50')
                       .text('Nova Hogar', margin, margin + 10);
                    
                    doc.font('Helvetica-Oblique')
                       .fontSize(12)
                       .fillColor('#4a6fa5')
                       .text('DECORA TU VIDA, DECORA TU HOGAR', margin, margin + 40);
                    
                    headerHeight = 60;
                }
            } catch (error) {
                console.warn('Error en encabezado:', error.message);
                // Continuar sin logo
                doc.font('Helvetica-Bold')
                   .fontSize(24)
                   .fillColor('#2c3e50')
                   .text('Nova Hogar', margin, margin);
            }

            // --- INFORMACIÓN DE FACTURA (derecha) ---
            const facturaWidth = 200;
            const facturaX = pageWidth - margin - facturaWidth;
            const facturaY = margin;
            
            // Marco con fondo
            doc.roundedRect(facturaX, facturaY, facturaWidth, 85, 8)
               .fillAndStroke('#f8f9fa', '#4a6fa5');
            
            // Título
            doc.font('Helvetica-Bold')
               .fontSize(16)
               .fillColor('#2c3e50')
               .text('FACTURA / NOTA DE COMPRA', facturaX + 15, facturaY + 15);
            
            // Línea decorativa
            doc.moveTo(facturaX + 15, facturaY + 40)
               .lineTo(facturaX + facturaWidth - 15, facturaY + 40)
               .stroke('#4a6fa5')
               .lineWidth(0.8);
            
            // Datos
            const fecha = orden.fecha_creacion ? 
                new Date(orden.fecha_creacion) : new Date();
            
            const facturaDatos = [
                { label: 'N° Orden:', value: orden.id || orden._id || 'N/A' },
                { label: 'Fecha:', value: fecha.toLocaleDateString('es-MX', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                })},
                { label: 'Método:', value: orden.metodo_pago || 'Tarjeta de Crédito' }
            ];
            
            let facturaYPos = facturaY + 50;
            facturaDatos.forEach(item => {
                doc.font('Helvetica-Bold')
                   .fontSize(10)
                   .fillColor('#333')
                   .text(item.label, facturaX + 15, facturaYPos, { width: 70 });
                
                doc.font('Helvetica')
                   .fontSize(10)
                   .fillColor('#333')
                   .text(item.value, facturaX + 85, facturaYPos, { width: 100 });
                
                facturaYPos += 16;
            });

            // --- SEPARADOR ---
            const separatorY = Math.max(margin + headerHeight, facturaY + 90) + 10;
            doc.moveTo(margin, separatorY)
               .lineTo(pageWidth - margin, separatorY)
               .stroke('#4a6fa5')
               .lineWidth(1.5);
            
            // --- DETALLES DEL CLIENTE ---
            const clienteY = separatorY + 25;
            
            doc.font('Helvetica-Bold')
               .fontSize(14)
               .fillColor('#2c3e50')
               .text('DETALLES DEL CLIENTE', margin, clienteY);
            
            const clienteDatos = [
                `Nombre: ${orden.nombre_cliente || 'No especificado'}`,
                `Dirección: ${orden.direccion || 'No especificado'}, ${orden.ciudad || ''}`,
                `Código Postal: ${orden.codigo_postal || 'N/A'}`,
                `País: ${orden.pais || 'México'}`,
                `Teléfono: ${orden.telefono || 'N/A'}`
            ];
            
            clienteDatos.forEach((linea, index) => {
                doc.font('Helvetica')
                   .fontSize(11)
                   .fillColor('#333')
                   .text(linea, margin, clienteY + 25 + (index * 18));
            });

            // --- DETALLES DE LA ORDEN ---
            const ordenY = clienteY + (clienteDatos.length * 18) + 40;
            
            doc.font('Helvetica-Bold')
               .fontSize(16)
               .fillColor('#2c3e50')
               .text('DETALLES DE LA ORDEN', margin, ordenY);
            
            // Tabla
            const tableTop = ordenY + 25;
            const colWidths = [240, 100, 80, 100];
            const colPositions = [margin];
            
            for (let i = 1; i < colWidths.length; i++) {
                colPositions[i] = colPositions[i-1] + colWidths[i-1];
            }
            
            // Encabezado de tabla
            doc.rect(margin, tableTop, contentWidth, 30)
               .fill('#4a6fa5');
            
            const headers = ['Producto', 'Precio Unitario', 'Cantidad', 'Subtotal'];
            headers.forEach((header, index) => {
                doc.font('Helvetica-Bold')
                   .fontSize(12)
                   .fillColor('white')
                   .text(header, colPositions[index] + (index === 0 ? 10 : 0), 
                         tableTop + 9, {
                       width: colWidths[index] - (index === 0 ? 10 : 0),
                       align: index > 0 ? 'right' : 'left'
                   });
            });
            
            // Productos
            let currentY = tableTop + 35;
            
            if (!orden.detalles || orden.detalles.length === 0) {
                doc.font('Helvetica')
                   .fontSize(11)
                   .fillColor('#666')
                   .text('No hay productos en esta orden', margin, currentY);
                currentY += 25;
            } else {
                orden.detalles.forEach((item, index) => {
                    // Fondo alternado
                    if (index % 2 === 0) {
                        doc.rect(margin, currentY - 8, contentWidth, 25)
                           .fill('#f9f9f9');
                    }
                    
                    // Nombre del producto
                    const nombre = item.nombre_producto || 'Producto';
                    doc.font('Helvetica')
                       .fontSize(11)
                       .fillColor('#333')
                       .text(nombre, colPositions[0] + 10, currentY, {
                           width: colWidths[0] - 20
                       });
                    
                    // Precio
                    doc.font('Helvetica')
                       .fontSize(11)
                       .fillColor('#333')
                       .text(formatCurrency(item.precio_unitario), 
                             colPositions[1], currentY, {
                           width: colWidths[1],
                           align: 'right'
                       });
                    
                    // Cantidad
                    doc.font('Helvetica')
                       .fontSize(11)
                       .fillColor('#333')
                       .text(item.cantidad || 1, colPositions[2], currentY, {
                           width: colWidths[2],
                           align: 'right'
                       });
                    
                    // Subtotal
                    doc.font('Helvetica-Bold')
                       .fontSize(11)
                       .fillColor('#333')
                       .text(formatCurrency(item.subtotal), colPositions[3], currentY, {
                           width: colWidths[3],
                           align: 'right'
                       });
                    
                    currentY += 25;
                });
            }
            
            // Línea después de productos
            doc.moveTo(margin, currentY + 15)
               .lineTo(pageWidth - margin, currentY + 15)
               .stroke('#ddd')
               .lineWidth(0.5);
            
            // --- TOTALES ---
            const totalesY = Math.max(currentY + 30, pageHeight - 180);
            const totalesWidth = 250;
            const totalesX = pageWidth - margin - totalesWidth;
            
            // Marco
            doc.roundedRect(totalesX, totalesY, totalesWidth, 150, 10)
               .fillAndStroke('#f8f9fa', '#4a6fa5');
            
            const totales = [
                { label: 'Subtotal:', value: Number(orden.subtotal) || 0 },
                { label: 'Gastos de Envío:', value: Number(orden.gastos_envio) || 0 },
                { label: 'Impuestos (IVA):', value: Number(orden.impuestos) || 0 },
                { label: 'Cupón Descuento:', value: -(Number(orden.cupon_descuento) || 0) },
                { separator: true },
                { label: 'TOTAL PAGADO:', value: Number(orden.total) || 0, bold: true }
            ];
            
            let totalesCurrentY = totalesY + 20;
            
            totales.forEach((item, index) => {
                if (item.separator) {
                    // Línea separadora
                    doc.moveTo(totalesX + 15, totalesCurrentY)
                       .lineTo(totalesX + totalesWidth - 15, totalesCurrentY)
                       .stroke('#4a6fa5')
                       .lineWidth(1);
                    totalesCurrentY += 15;
                    return;
                }
                
                // Estilo
                const isBold = item.bold;
                doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica')
                   .fontSize(isBold ? 14 : 11);
                
                // Color
                let color = '#333';
                if (item.value < 0) color = '#e74c3c';
                if (isBold) color = '#2c3e50';
                
                // Etiqueta
                doc.fillColor(color)
                   .text(item.label, totalesX + 20, totalesCurrentY, { width: 150 });
                
                // Valor
                const valorAbs = Math.abs(item.value);
                const signo = item.value < 0 ? '-' : '';
                
                doc.fillColor(color)
                   .text(`${signo}${formatCurrency(valorAbs)}`, 
                         totalesX + 170, totalesCurrentY, {
                       width: 60,
                       align: 'right'
                   });
                
                totalesCurrentY += isBold ? 22 : 18;
            });
            
            // --- PIE DE PÁGINA ---
            const footerY = pageHeight - margin - 80;
            
            doc.moveTo(margin, footerY)
               .lineTo(pageWidth - margin, footerY)
               .stroke('#4a6fa5')
               .lineWidth(0.5);
            
            // Mensaje de agradecimiento
            doc.font('Helvetica-Bold')
               .fontSize(12)
               .fillColor('#2c3e50')
               .text('¡Gracias por tu compra!', margin, footerY + 15, {
                   width: contentWidth,
                   align: 'center'
               });
            
            // Contacto
            doc.font('Helvetica')
               .fontSize(10)
               .fillColor('#666')
               .text('Para consultas: soporte@novahogar.com | Tel: +52 449 123 4567',
                     margin, footerY + 35, {
                         width: contentWidth,
                         align: 'center'
                     });
            
            // Lema
            doc.font('Helvetica-Oblique')
               .fontSize(9)
               .fillColor('#95a5a6')
               .text('Nova Hogar - DECORA TU VIDA, DECORA TU HOGAR',
                     margin, footerY + 50, {
                         width: contentWidth,
                         align: 'center'
                     });
            
            // Número de página
            const totalPages = doc.bufferedPageRange().count;
            for (let i = 0; i < totalPages; i++) {
                doc.switchToPage(i);
                doc.font('Helvetica')
                   .fontSize(9)
                   .fillColor('#999')
                   .text(`Página ${i + 1} de ${totalPages}`,
                         pageWidth - margin - 60, pageHeight - margin - 15);
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
