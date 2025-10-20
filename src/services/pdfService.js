const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

class PDFService {
  async generarPDF(boletos, nombreArchivo, loteId = null, comedor = null) {
    const pdfPath = path.join(__dirname, '../../pdfs', nombreArchivo);

    // Crear directorio si no existe
    if (!fs.existsSync(path.join(__dirname, '../../pdfs'))) {
      fs.mkdirSync(path.join(__dirname, '../../pdfs'), { recursive: true });
    }

    // Pre-generar todos los QR codes en paralelo (OPTIMIZACIÓN)
    console.log('Generando QR codes...');
    const qrPromises = boletos.map(boleto =>
      QRCode.toDataURL(boleto.uuid, {
        errorCorrectionLevel: 'H',
        width: 120,
        margin: 1
      })
    );

    const qrCodes = await Promise.all(qrPromises);
    console.log(`${qrCodes.length} QR codes generados`);

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'LETTER',
          margin: 30
        });

        const stream = fs.createWriteStream(pdfPath);
        doc.pipe(stream);

        // Título del documento
        doc.fontSize(20)
           .text('BOLETOS DE COMEDOR - GESSA', { align: 'center' })
           .moveDown(0.5);

        doc.fontSize(12)
           .text(`Contratista: ${boletos[0].contratista}`, { align: 'center' });

        if (comedor && comedor.nombre) {
          doc.text(`Comedor: ${comedor.nombre}`, { align: 'center' });
        }

        doc.text(`Total de boletos: ${boletos.length}`, { align: 'center' })
           .text(`Válido hasta: ${boletos[0].fechaVencimiento}`, { align: 'center' });

        if (loteId) {
           doc.text(`Lote: ${loteId}`, { align: 'center' });
        }

        doc.moveDown(1);

        // Layout: 3 boletos por fila, 3 filas por página (9 boletos por página)
        const boletosPerRow = 3;
        const boletoWidth = 165;
        const boletoHeight = 180;
        const marginX = 30;
        const marginY = 150;
        const spacingX = 10;
        const spacingY = 10;

        for (let i = 0; i < boletos.length; i++) {
          const boleto = boletos[i];
          const col = i % boletosPerRow;

          // Nueva página si es necesario (9 boletos por página: 3x3)
          if (i > 0 && i % 9 === 0) {
            doc.addPage();
          }

          const pageRow = Math.floor((i % 9) / boletosPerRow);
          const x = marginX + col * (boletoWidth + spacingX);
          const pageY = marginY + pageRow * (boletoHeight + spacingY);

          // Dibujar boleto con QR pre-generado
          this.dibujarBoleto(doc, boleto, qrCodes[i], x, pageY, boletoWidth, boletoHeight, boleto.lote || loteId, comedor);
        }

        doc.end();

        stream.on('finish', () => {
          console.log(`PDF generado: ${pdfPath}`);
          resolve(pdfPath);
        });

        stream.on('error', reject);

      } catch (error) {
        reject(error);
      }
    });
  }

  dibujarBoleto(doc, boleto, qrDataURL, x, y, width, height, loteId = null, comedor = null) {
    // Borde del boleto
    doc.rect(x, y, width, height).stroke();

    // Título más pequeño y compacto
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .text('BOLETO DE COMEDOR', x + 5, y + 5, {
         width: width - 10,
         align: 'center'
       });

    let currentY = y + 18;

    doc.fontSize(8)
       .font('Helvetica')
       .text('GESSA', x + 5, currentY, {
         width: width - 10,
         align: 'center'
       });

    currentY += 10;

    // Mostrar comedor si existe
    if (comedor && comedor.nombre) {
      doc.fontSize(6)
         .font('Helvetica')
         .text(comedor.nombre, x + 5, currentY, {
           width: width - 10,
           align: 'center'
         });
      currentY += 8;
    }

    // Insertar QR - más pequeño para caber mejor
    const qrY = y + 32;
    const qrSize = 85; // QR más pequeño para 3 columnas
    try {
      const qrBuffer = Buffer.from(qrDataURL.split(',')[1], 'base64');
      doc.image(qrBuffer, x + (width - qrSize) / 2, qrY, {
        width: qrSize,
        height: qrSize
      });
    } catch (error) {
      console.error('Error insertando QR:', error);
    }

    // Información debajo del QR (Lote y Código de Contratista)
    let infoQRY = qrY + qrSize + 2; // Espacio más compacto

    // Lote en una línea más pequeña
    if (loteId) {
      doc.fontSize(5)
         .font('Helvetica')
         .text(`Lote: ${loteId}`, x + 3, infoQRY, {
           width: width - 6,
           align: 'center'
         });
      infoQRY += 7;
    }

    // Código de contratista más prominente
    if (boleto.codigoContratista) {
      doc.fontSize(8)
         .font('Helvetica-Bold')
         .text(`[${boleto.codigoContratista}]`, x + 3, infoQRY, {
           width: width - 6,
           align: 'center'
         });
    }

    // Información del boleto en la parte inferior
    const bottomLineY = y + height - 10;

    doc.fontSize(6)
       .font('Helvetica')
       .text(`Boleto ${boleto.numero}/${boleto.total}`, x + 3, bottomLineY, {
         width: (width - 6) / 2,
         align: 'left'
       });

    doc.fontSize(6)
       .text(`Vence: ${boleto.fechaVencimiento}`, x + width / 2, bottomLineY, {
         width: (width - 6) / 2,
         align: 'right'
       });

    // Línea de corte cada 3 boletos (al final de cada fila)
    if ((boleto.numero % 3) === 0) {
      doc.moveTo(x - width * 2 - 20, y + height + 7)
         .lineTo(x + width, y + height + 7)
         .dash(5, { space: 3 })
         .stroke()
         .undash();
    }
  }
}

module.exports = new PDFService();
