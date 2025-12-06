// utils/pdfGenerator.js (VERSIÓN MEJORADA Y CORREGIDA)
const PDFDocument = require('pdfkit');
const axios = require('axios');

// Cache para el logo
let cachedLogo = null;
let logoCacheTime = null;
const LOGO_CACHE_DURATION = 3600000; // 1 hora

async function getLogo() {
    // Si tenemos logo cacheado y es reciente, usarlo
    if (cachedLogo && logoCacheTime && (Date.now() - logoCacheTime) < LOGO_CACHE_DURATION) {
        return cachedLogo;
    }
    
    try {
        const logoUrl = 'https://res.cloudinary.com/dngutwxha/image/upload/v1765005760/logoNovaHogar_v0jgk1.png';
        console.log('🔄 Cargando logo desde:', logoUrl);
        
        const logoResponse = await axios.get(logoUrl, { 
            responseType: 'arraybuffer',
            timeout: 10000 // 10 segundos timeout
        });
        
        if (!logoResponse.data) {
            throw new Error('Logo response vacío');
        }
        
        cachedLogo = Buffer.from(logoResponse.data);
        logoCacheTime = Date.now();
        console.log('✅ Logo cargado exitosamente');
        return cachedLogo;
        
    } catch (logoError) {
        console.warn('⚠️ No se pudo cargar el logo:', logoError.message);
        // No guardamos en cache el error, para intentar nuevamente la próxima vez
        return null;
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
            const doc = new PDFDocument({ 
                margin: 50, // Aumentamos margen para evitar cortes
                size: 'A4',
                bufferPages: true,
                autoFirstPage: true
            });
            
            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                resolve(Buffer.concat(buffers));
            });
            doc.on('error', reject);

            // --- CONSTANTES PARA DISEÑO MEJORADO ---
            const pageWidth = 595.28;
            const pageHeight = 841.89;
            const margin = 50; // Aumentado de 40
            const contentWidth = pageWidth - (margin * 2);

            // --- LOGO DE LA EMPRESA - MEJORADO ---
            let logoHeight = 0;
            try {
                const logoBuffer = await getLogo();
                
                if (logoBuffer) {
                    // POSICIÓN FIJA Y CON MÁRGENES ADECUADOS
                    const logoX = margin;
                    const logoY = margin + 5; // Un poco más abajo
                    const logoWidth = 120;
                    const logoHeightImg = 60;
                    
                    // Intentar cargar la imagen con validación
                    try {
                        doc.image(logoBuffer, logoX, logoY, { 
                            width: logoWidth,
                            height: logoHeightImg,
                            fit: [logoWidth, logoHeightImg],
                            align: 'left'
                        });
                        logoHeight = logoHeightImg;
                        console.log('✅ Logo insertado en PDF');
                    } catch (imageError) {
                        console.warn('⚠️ Error insertando imagen del logo:', imageError.message);
                        logoHeight = 0;
                    }
                    
                    // Nombre de la empresa - POSICIÓN CORREGIDA
                    doc.font('Helvetica-Bold').fontSize(20).fillColor('#2c3e50')
                       .text('Nova Hogar', margin + 130, margin + 15, { width: 250 });
                    
                    doc.font('Helvetica-Oblique').fontSize(11).fillColor('#4a6fa5')
                       .text('DECORA TU VIDA, DECORA TU HOGAR', margin + 130, margin + 40, { width: 250 });
                       
                } else {
                    // FALLBACK SIN LOGO - MEJOR POSICIONADO
                    console.warn('⚠️ Usando texto en lugar de logo');
                    doc.font('Helvetica-Bold').fontSize(24).fillColor('#2c3e50')
                       .text('Nova Hogar', margin, margin + 10);
                    doc.font('Helvetica-Oblique').fontSize(12).fillColor('#4a6fa5')
                       .text('DECORA TU VIDA, DECORA TU HOGAR', margin, margin + 40);
                    logoHeight = 50;
                }
            } catch (logoError) {
                console.error('❌ Error crítico con logo:', logoError);
                // Continuar sin logo
                doc.font('Helvetica-Bold').fontSize(24).fillColor('#2c3e50')
                   .text('Nova Hogar', margin, margin);
                logoHeight = 30;
            }

            // --- INFORMACIÓN DE LA FACTURA (lado derecho) - POSICIÓN REVISADA ---
            const facturaWidth = 180;
            const facturaX = pageWidth - margin - facturaWidth;
            const facturaY = margin + 5; // Alineado con el logo
            
            // Marco de la factura
            doc.roundedRect(facturaX, facturaY, facturaWidth, 85, 5) // Aumentada altura
               .fillAndStroke('#f8f9fa', '#4a6fa5');
            
            // Título factura
            doc.font('Helvetica-Bold').fontSize(14).fillColor('#2c3e50')
               .text('FACTURA / NOTA DE COMPRA', facturaX + 15, facturaY + 12);
            
            // Línea decorativa
            doc.moveTo(facturaX + 10, facturaY + 35)
               .lineTo(facturaX + facturaWidth - 10, facturaY + 35)
               .stroke('#4a6fa5').lineWidth(0.5);
            
            // Datos de la factura
            const fechaOrden = orden.fecha_creacion ? 
                new Date(orden.fecha_creacion) : new Date();
            
            const facturaData = [
                { label: 'N° Orden:', value: orden.id || orden._id || 'N/A' },
                { label: 'Fecha:', value: fechaOrden.toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                })},
                { label: 'Método:', value: orden.metodo_pago || 'Tarjeta de crédito' }
            ];
            
            let facturaTextY = facturaY + 45;
            facturaData.forEach(item => {
                doc.font('Helvetica-Bold').fontSize(9).fillColor('#333')
                   .text(item.label, facturaX + 15, facturaTextY, { width: 60 });
                doc.font('Helvetica').fontSize(9).fillColor('#333')
                   .text(item.value, facturaX + 75, facturaTextY, { width: 90 });
                facturaTextY += 16; // Aumentado espacio
            });
            
            // --- LÍNEA SEPARADORA - MEJOR POSICIONADA ---
            // Calculamos la posición basada en el contenido más alto (logo o texto)
            const headerBottom = Math.max(margin + logoHeight + 20, facturaY + 85);
            const separatorY = headerBottom + 15; // Más espacio después del header
            
            doc.moveTo(margin, separatorY)
               .lineTo(pageWidth - margin, separatorY)
               .stroke('#4a6fa5').lineWidth(1);
            
            // --- DETALLES DEL CLIENTE - CON MÁS ESPACIO ---
            const clienteY = separatorY + 25; // Aumentado de 20
            
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
                   .text(linea, margin, clienteY + 22 + (index * 18)); // Más espacio entre líneas
            });
            
            // --- DETALLES DE LA ORDEN - REUBICADA ---
            const ordenY = clienteY + (detallesCliente.length * 18) + 35; // Más espacio
            
            doc.font('Helvetica-Bold').fontSize(14).fillColor('#2c3e50')
               .text('DETALLES DE LA ORDEN', margin, ordenY);
            
            // Encabezados de tabla
            const tableTop = ordenY + 25;
            const colWidths = [220, 100, 80, 100];
            const colPositions = [margin];
            for (let i = 1; i < colWidths.length; i++) {
                colPositions[i] = colPositions[i-1] + colWidths[i-1];
            }
            
            // Fondo encabezados
            doc.rect(margin, tableTop, contentWidth, 28) // Aumentada altura
               .fill('#4a6fa5');
            
            const headers = ['Producto', 'Precio Unitario', 'Cantidad', 'Subtotal'];
            headers.forEach((header, index) => {
                doc.font('Helvetica-Bold').fontSize(11).fillColor('white')
                   .text(header, colPositions[index], tableTop + 9, { 
                     width: colWidths[index], 
                     align: index > 0 ? 'right' : 'left' 
                   });
            });
            
            // Filas de productos
            let currentY = tableTop + 35;
            
            if (!orden.detalles || orden.detalles.length === 0) {
                doc.font('Helvetica').fontSize(10).fillColor('#666')
                   .text('Sin detalles específicos', margin, currentY);
                currentY += 25;
            } else {
                orden.detalles.forEach((item, index) => {
                    // Fondo alternado
                    if (index % 2 === 0) {
                        doc.rect(margin, currentY - 8, contentWidth, 24) // Aumentada altura
                           .fill('#f9f9f9');
                    }
                    
                    // Producto (con límite de caracteres)
                    const nombre = item.nombre_producto || 'Producto';
                    const nombreTruncado = nombre.length > 50 ? nombre.substring(0, 47) + '...' : nombre;
                    
                    doc.font('Helvetica').fontSize(10).fillColor('#333')
                       .text(nombreTruncado, colPositions[0] + 5, currentY, { 
                         width: colWidths[0] - 15 
                       });
                    
                    // Precio
                    doc.font('Helvetica').fontSize(10).fillColor('#333')
                       .text(`$${formatCurrency(item.precio_unitario)}`, colPositions[1], currentY, { 
                         width: colWidths[1], 
                         align: 'right' 
                       });
                    
                    // Cantidad
                    doc.font('Helvetica').fontSize(10).fillColor('#333')
                       .text(item.cantidad || 1, colPositions[2], currentY, { 
                         width: colWidths[2], 
                         align: 'right' 
                       });
                    
                    // Subtotal
                    doc.font('Helvetica-Bold').fontSize(10).fillColor('#333')
                       .text(`$${formatCurrency(item.subtotal)}`, colPositions[3], currentY, { 
                         width: colWidths[3], 
                         align: 'right' 
                       });
                    
                    currentY += 24; // Más espacio entre filas
                });
            }
            
            // Línea después de productos
            doc.moveTo(margin, currentY + 15)
               .lineTo(pageWidth - margin, currentY + 15)
               .stroke('#cccccc').lineWidth(0.5);
            
            // --- TOTALES - POSICIÓN FIJA MEJORADA ---
            // Asegurar que los totales estén siempre en buena posición
            const totalesY = Math.max(currentY + 40, pageHeight - 250);
            const totalesWidth = 230;
            const totalesX = pageWidth - margin - totalesWidth;
            
            // Marco de totales
            doc.roundedRect(totalesX, totalesY, totalesWidth, 140, 5) // Aumentada altura
               .fillAndStroke('#f8f9fa', '#4a6fa5');
            
            const lineasTotales = [
                { label: 'Subtotal:', value: orden.subtotal || 0 },
                { label: 'Gastos de Envío:', value: orden.gastos_envio || 0 },
                { label: 'Impuestos (IVA):', value: orden.impuestos || 0 },
                { label: 'Cupón Descuento:', value: -(orden.cupon_descuento || 0) },
                { label: '', value: 0 },
                { label: 'TOTAL PAGADO:', value: orden.total || 0, bold: true }
            ];
            
            let totalesCurrentY = totalesY + 20;
            
            lineasTotales.forEach((linea, index) => {
                // Salto de línea antes del total
                if (index === lineasTotales.length - 2) {
                    totalesCurrentY += 10;
                    doc.moveTo(totalesX + 10, totalesCurrentY - 5)
                       .lineTo(totalesX + totalesWidth - 10, totalesCurrentY - 5)
                       .stroke('#4a6fa5').lineWidth(1.5); // Más gruesa
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
                
                totalesCurrentY += 20; // Más espacio
            });
            
            // --- PIE DE PÁGINA - POSICIÓN FIJA ---
            const footerY = pageHeight - margin - 70; // Más alto
            
            doc.moveTo(margin, footerY)
               .lineTo(pageWidth - margin, footerY)
               .stroke('#4a6fa5').lineWidth(0.5);
            
            doc.font('Helvetica-Bold').fontSize(11).fillColor('#2c3e50')
               .text('¡Gracias por tu compra!', margin, footerY + 12, { 
                 width: contentWidth, 
                 align: 'center' 
               });
            
            doc.font('Helvetica').fontSize(9).fillColor('#666')
               .text('Para consultas: soporte@novahogar.com | Tel: +52 449 123 4567', 
                     margin, footerY + 28, { width: contentWidth, align: 'center' });
            
            doc.font('Helvetica-Oblique').fontSize(8).fillColor('#95a5a6')
               .text('Nova Hogar - DECORA TU VIDA, DECORA TU HOGAR', 
                     margin, footerY + 44, { width: contentWidth, align: 'center' });
            
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
            
            console.log('✅ PDF generado exitosamente para orden:', orden.id);
            
        } catch (error) {
            console.error('❌ Error generando PDF:', error);
            reject(error);
        }
    });
}

module.exports = {
    generarNotaCompraPDF,
};
