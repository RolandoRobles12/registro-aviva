import Tesseract from 'tesseract.js';

export interface OCRResult {
  extractedText: string;
  clockTime: string | null;
  confidence: number;
  serverTime: string;
  timeDifference: number | null;
  processingTime: number;
  error?: string;
}

/**
 * Procesa una imagen con OCR usando Tesseract.js para extraer la hora del reloj
 * @param imageFile - Archivo de imagen o URL/data URL
 * @returns Resultado del OCR con hora extraída y metadatos
 */
export async function processClockPhoto(
  imageFile: string | File | Blob
): Promise<OCRResult> {
  const startTime = Date.now();
  const serverTime = new Date();

  try {
    // Procesar imagen con Tesseract
    const result = await Tesseract.recognize(
      imageFile,
      'eng', // Idioma: inglés (mejor para números)
      {
        logger: (info) => {
          // Log del progreso (opcional)
          if (info.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(info.progress * 100)}%`);
          }
        },
      }
    );

    const extractedText = result.data.text;
    const confidence = result.data.confidence / 100; // Normalizar a 0-1

    // Parsear hora del texto extraído
    const clockTime = parseTimeFromText(extractedText);

    // Calcular diferencia de tiempo si se encontró hora
    const timeDifference = clockTime
      ? calculateTimeDifference(clockTime, serverTime)
      : null;

    const processingTime = Date.now() - startTime;

    return {
      extractedText: extractedText.trim(),
      clockTime,
      confidence,
      serverTime: serverTime.toISOString(),
      timeDifference,
      processingTime,
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;

    return {
      extractedText: '',
      clockTime: null,
      confidence: 0,
      serverTime: serverTime.toISOString(),
      timeDifference: null,
      processingTime,
      error: error instanceof Error ? error.message : 'OCR processing failed',
    };
  }
}

/**
 * Extrae formato de hora (HH:MM) del texto usando múltiples patrones
 * @param text - Texto extraído por OCR
 * @returns Hora en formato HH:MM o null si no se encuentra
 */
function parseTimeFromText(text: string): string | null {
  // Limpiar texto: remover espacios extras y normalizar
  const cleanText = text.replace(/\s+/g, ' ').trim();

  // Patrones de hora comunes en relojes digitales
  const timePatterns = [
    // Formato estándar: 14:30, 14:30:45, 2:30, 02:30
    /\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b/g,

    // Con espacios: 14 : 30, 2 : 30
    /\b(\d{1,2})\s*:\s*(\d{2})\b/g,

    // Sin dos puntos: 1430, 0230 (4 dígitos seguidos)
    /\b(\d{2})(\d{2})\b/g,

    // Con letra h: 14h30, 2h30
    /\b(\d{1,2})\s*h\s*(\d{2})\b/gi,

    // AM/PM: 2:30 PM, 02:30 AM
    /\b(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)\b/gi,
  ];

  const matches: Array<{ time: string; hour: number; minute: number; confidence: number }> = [];

  // Buscar todos los patrones
  for (const pattern of timePatterns) {
    let match;
    pattern.lastIndex = 0; // Reset regex

    while ((match = pattern.exec(cleanText)) !== null) {
      let hours = parseInt(match[1]);
      let minutes = parseInt(match[2]);

      // Manejar formato AM/PM si existe
      if (match[3] && /pm/i.test(match[3]) && hours < 12) {
        hours += 12;
      } else if (match[3] && /am/i.test(match[3]) && hours === 12) {
        hours = 0;
      }

      // Validar hora válida
      if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
        const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

        // Calcular confianza basada en contexto
        let confidence = 1.0;

        // Mayor confianza si tiene formato estándar con dos puntos
        if (match[0].includes(':')) confidence += 0.5;

        // Mayor confianza si está en rango laboral (6 AM - 10 PM)
        if (hours >= 6 && hours <= 22) confidence += 0.3;

        matches.push({ time: timeStr, hour: hours, minute: minutes, confidence });
      }
    }
  }

  // Si no se encontraron matches, retornar null
  if (matches.length === 0) {
    return null;
  }

  // Ordenar por confianza y retornar el mejor match
  matches.sort((a, b) => b.confidence - a.confidence);
  return matches[0].time;
}

/**
 * Calcula la diferencia en minutos entre la hora del reloj y la hora del servidor
 * @param clockTime - Hora extraída del reloj (HH:MM)
 * @param serverTime - Hora del servidor
 * @returns Diferencia en minutos (positivo = reloj adelantado, negativo = reloj atrasado)
 */
function calculateTimeDifference(clockTime: string, serverTime: Date): number {
  const [hours, minutes] = clockTime.split(':').map(Number);

  const clockDate = new Date(serverTime);
  clockDate.setHours(hours, minutes, 0, 0);

  // Diferencia en milisegundos
  const diffMs = clockDate.getTime() - serverTime.getTime();

  // Convertir a minutos
  const diffMinutes = Math.round(diffMs / (1000 * 60));

  // Manejar caso de cambio de día (ej: reloj muestra 23:50, servidor es 00:10)
  if (Math.abs(diffMinutes) > 12 * 60) {
    // Si la diferencia es mayor a 12 horas, probablemente es cambio de día
    if (diffMinutes > 0) {
      return diffMinutes - 24 * 60; // Restar un día
    } else {
      return diffMinutes + 24 * 60; // Sumar un día
    }
  }

  return diffMinutes;
}

/**
 * Preprocesa la imagen para mejorar la precisión del OCR
 * Aplica filtros y ajustes que ayudan a Tesseract a leer mejor el texto
 * @param imageFile - Archivo o URL de imagen
 * @returns Canvas con imagen procesada o la imagen original
 */
export async function preprocessImage(
  imageFile: string | File | Blob
): Promise<string | File | Blob> {
  // Si es un File o Blob, crear URL temporal
  let imageUrl: string;

  if (imageFile instanceof File || imageFile instanceof Blob) {
    imageUrl = URL.createObjectURL(imageFile);
  } else {
    imageUrl = imageFile;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(imageFile); // Si no hay contexto, retornar original
        return;
      }

      // Mantener tamaño original (Tesseract funciona mejor con imágenes grandes)
      canvas.width = img.width;
      canvas.height = img.height;

      // Dibujar imagen
      ctx.drawImage(img, 0, 0);

      // Obtener datos de píxeles
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Aplicar filtros para mejorar contraste y claridad
      for (let i = 0; i < data.length; i += 4) {
        // Convertir a escala de grises
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;

        // Aumentar contraste con umbral
        const threshold = 128;
        const value = avg > threshold ? 255 : 0;

        data[i] = value;     // R
        data[i + 1] = value; // G
        data[i + 2] = value; // B
        // data[i + 3] es alpha, no se modifica
      }

      // Aplicar imagen procesada
      ctx.putImageData(imageData, 0, 0);

      // Convertir canvas a blob
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          resolve(imageFile);
        }

        // Limpiar URL temporal si se creó
        if (imageFile instanceof File || imageFile instanceof Blob) {
          URL.revokeObjectURL(imageUrl);
        }
      }, 'image/png');
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for preprocessing'));
    };

    img.src = imageUrl;
  });
}

/**
 * Procesa foto con preprocesamiento opcional
 * @param imageFile - Archivo de imagen
 * @param preprocess - Si se debe preprocesar la imagen (default: false)
 * @returns Resultado del OCR
 */
export async function processClockPhotoWithPreprocessing(
  imageFile: string | File | Blob,
  preprocess: boolean = false
): Promise<OCRResult> {
  try {
    if (preprocess) {
      const preprocessedImage = await preprocessImage(imageFile);
      return await processClockPhoto(preprocessedImage);
    } else {
      return await processClockPhoto(imageFile);
    }
  } catch (error) {
    return {
      extractedText: '',
      clockTime: null,
      confidence: 0,
      serverTime: new Date().toISOString(),
      timeDifference: null,
      processingTime: 0,
      error: error instanceof Error ? error.message : 'Processing failed',
    };
  }
}
