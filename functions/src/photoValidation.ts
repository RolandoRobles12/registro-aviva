import { ImageAnnotatorClient } from '@google-cloud/vision';
import { File } from '@google-cloud/storage';

const visionClient = new ImageAnnotatorClient();

// Interfaz para resultados de validación
interface PhotoValidationResult {
  status: 'auto_approved' | 'rejected' | 'needs_review';
  confidence: number;
  personDetected: boolean;
  personConfidence: number;
  uniformDetected: boolean;
  uniformConfidence: number;
  logoDetected: boolean;
  logoConfidence: number;
  locationValid: boolean;
  locationConfidence: number;
  isRealPhoto: boolean;
  labels: Array<{ description: string; score: number }>;
  logos: Array<{ description: string; score: number }>;
  colors: Array<{ red: number; green: number; blue: number; score: number }>;
  rejectionReason?: string;
  processingTime: number;
  error?: string;
}

// Configuración de validación
const VALIDATION_CONFIG = {
  // Umbrales de confianza (ajustados para fotos reales con accesorios)
  MIN_PERSON_CONFIDENCE: 0.6,      // Más bajo porque pueden tener cubrebocas/lentes
  MIN_UNIFORM_CONFIDENCE: 0.4,     // Más bajo porque pueden tener sudadera encima
  MIN_GREEN_COLOR_SCORE: 0.15,     // Score mínimo para color verde dominante
  AUTO_APPROVE_THRESHOLD: 0.7,     // Más bajo para aprobar automáticamente
  AUTO_REJECT_THRESHOLD: 0.25,     // Más bajo para rechazar

  // Etiquetas esperadas para validación
  PERSON_LABELS: ['Person', 'People', 'Human', 'Man', 'Woman', 'Adult', 'Face', 'Portrait', 'Selfie'],
  UNIFORM_LABELS: ['Clothing', 'Uniform', 'Shirt', 'Polo shirt', 'T-shirt', 'Sleeve', 'Top', 'Outerwear', 'Jacket', 'Hoodie'],

  // Ubicación es opcional (puede ser tienda o kiosco mismo)
  LOCATION_LABELS: ['Retail', 'Store', 'Shop', 'Product', 'Shelf', 'Supermarket', 'Market', 'Building', 'Indoor', 'Room', 'Wall'],

  // Logos esperados (OPCIONAL - no crítico porque puede estar cubierto)
  EXPECTED_LOGOS: ['Aviva', 'BA', 'Construrama', 'Disensa'],

  // Color verde esperado (RGB aproximado del uniforme Aviva)
  EXPECTED_GREEN_RANGE: {
    red: { min: 0, max: 150 },
    green: { min: 150, max: 255 },
    blue: { min: 0, max: 150 }
  }
};

/**
 * Valida una foto de check-in usando Google Cloud Vision API
 */
export async function validateCheckInPhoto(file: File): Promise<PhotoValidationResult> {
  const startTime = Date.now();

  try {
    console.log('Iniciando análisis de foto con Vision API');

    // Analizar imagen con Vision API
    // Usamos múltiples features para análisis completo
    const [result] = await visionClient.annotateImage({
      image: { source: { imageUri: `gs://${file.bucket.name}/${file.name}` } },
      features: [
        { type: 'LABEL_DETECTION', maxResults: 20 },
        { type: 'LOGO_DETECTION', maxResults: 10 },
        { type: 'IMAGE_PROPERTIES' },
        { type: 'SAFE_SEARCH_DETECTION' },
        { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
      ],
    });

    // Extraer resultados
    const labels = (result.labelAnnotations || []).map((label) => ({
      description: label.description || '',
      score: label.score || 0,
    }));

    const logos = (result.logoAnnotations || []).map((logo) => ({
      description: logo.description || '',
      score: logo.score || 0,
    }));

    const colors = (result.imagePropertiesAnnotation?.dominantColors?.colors || []).map((color) => ({
      red: color.color?.red || 0,
      green: color.color?.green || 0,
      blue: color.color?.blue || 0,
      score: color.score || 0,
    }));

    console.log('Etiquetas detectadas:', labels.map((l) => `${l.description}(${l.score.toFixed(2)})`));
    console.log('Logos detectados:', logos.map((l) => `${l.description}(${l.score.toFixed(2)})`));

    // Validar persona
    const { detected: personDetected, confidence: personConfidence } = detectFromLabels(
      labels,
      VALIDATION_CONFIG.PERSON_LABELS
    );

    // Validar uniforme
    const { detected: uniformDetected, confidence: uniformConfidence } = detectFromLabels(
      labels,
      VALIDATION_CONFIG.UNIFORM_LABELS
    );

    // Validar ubicación (ambiente de tienda/trabajo)
    const { detected: locationDetected, confidence: locationConfidence } = detectFromLabels(
      labels,
      VALIDATION_CONFIG.LOCATION_LABELS
    );

    // Validar logo (OPCIONAL)
    const { detected: logoDetected, confidence: logoConfidence } = detectFromLogos(
      logos,
      VALIDATION_CONFIG.EXPECTED_LOGOS
    );

    // Validar color verde (IMPORTANTE para uniforme Aviva)
    const greenColorScore = detectGreenColor(colors);
    const hasGreenColor = greenColorScore >= VALIDATION_CONFIG.MIN_GREEN_COLOR_SCORE;

    console.log('Color verde detectado:', greenColorScore.toFixed(2));

    // Calcular confianza general
    const confidence = calculateOverallConfidence({
      personConfidence,
      uniformConfidence,
      logoConfidence,
      locationConfidence,
      greenColorScore,
    });

    // Determinar estado y razón de rechazo
    const { status, rejectionReason } = determineValidationStatus({
      personDetected,
      personConfidence,
      uniformDetected,
      uniformConfidence,
      hasGreenColor,
      greenColorScore,
      locationDetected,
      locationConfidence,
      confidence,
    });

    const processingTime = Date.now() - startTime;

    const validationResult: PhotoValidationResult = {
      status,
      confidence,
      personDetected,
      personConfidence,
      uniformDetected,
      uniformConfidence,
      logoDetected,
      logoConfidence,
      locationValid: locationDetected,
      locationConfidence,
      isRealPhoto: true, // Siempre true porque la foto es captura obligatoria
      labels,
      logos,
      colors,
      rejectionReason,
      processingTime,
    };

    console.log('Resultado de validación:', {
      status,
      confidence: confidence.toFixed(2),
      personDetected,
      uniformDetected,
      hasGreenColor,
      greenColorScore: greenColorScore.toFixed(2),
      locationDetected,
    });

    return validationResult;
  } catch (error) {
    console.error('Error en validación de foto:', error);

    const processingTime = Date.now() - startTime;

    return {
      status: 'needs_review',
      confidence: 0,
      personDetected: false,
      personConfidence: 0,
      uniformDetected: false,
      uniformConfidence: 0,
      logoDetected: false,
      logoConfidence: 0,
      locationValid: false,
      locationConfidence: 0,
      isRealPhoto: false,
      labels: [],
      logos: [],
      colors: [],
      processingTime,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Detecta si alguna etiqueta de la lista esperada está presente
 */
function detectFromLabels(
  labels: Array<{ description: string; score: number }>,
  expectedLabels: string[]
): { detected: boolean; confidence: number } {
  let maxConfidence = 0;

  for (const label of labels) {
    for (const expected of expectedLabels) {
      if (label.description.toLowerCase().includes(expected.toLowerCase())) {
        maxConfidence = Math.max(maxConfidence, label.score);
      }
    }
  }

  return {
    detected: maxConfidence > 0,
    confidence: maxConfidence,
  };
}

/**
 * Detecta si algún logo esperado está presente
 */
function detectFromLogos(
  logos: Array<{ description: string; score: number }>,
  expectedLogos: string[]
): { detected: boolean; confidence: number } {
  let maxConfidence = 0;

  for (const logo of logos) {
    for (const expected of expectedLogos) {
      if (logo.description.toLowerCase().includes(expected.toLowerCase())) {
        maxConfidence = Math.max(maxConfidence, logo.score);
      }
    }
  }

  return {
    detected: maxConfidence > 0,
    confidence: maxConfidence,
  };
}

/**
 * Detecta color verde en los colores dominantes de la imagen
 * (uniforme Aviva es verde brillante)
 */
function detectGreenColor(
  colors: Array<{ red: number; green: number; blue: number; score: number }>
): number {
  const { EXPECTED_GREEN_RANGE } = VALIDATION_CONFIG;
  let maxGreenScore = 0;

  for (const color of colors) {
    // Verificar si el color está en el rango verde esperado
    const isInGreenRange =
      color.red >= EXPECTED_GREEN_RANGE.red.min &&
      color.red <= EXPECTED_GREEN_RANGE.red.max &&
      color.green >= EXPECTED_GREEN_RANGE.green.min &&
      color.green <= EXPECTED_GREEN_RANGE.green.max &&
      color.blue >= EXPECTED_GREEN_RANGE.blue.min &&
      color.blue <= EXPECTED_GREEN_RANGE.blue.max;

    if (isInGreenRange) {
      // El score del color representa qué tan dominante es en la imagen
      maxGreenScore = Math.max(maxGreenScore, color.score);
    }
  }

  return maxGreenScore;
}

/**
 * Calcula confianza general de la validación
 */
function calculateOverallConfidence(params: {
  personConfidence: number;
  uniformConfidence: number;
  logoConfidence: number;
  locationConfidence: number;
  greenColorScore: number;
}): number {
  // Pesos ajustados para fotos reales de Aviva
  const weights = {
    person: 0.4,        // MÁS IMPORTANTE: debe haber persona
    greenColor: 0.3,    // COLOR VERDE es crítico para uniforme Aviva
    uniform: 0.15,      // Ropa detectada (menos peso porque puede estar cubierta)
    location: 0.1,      // Ambiente (opcional, puede ser kiosco)
    logo: 0.05,         // Logo (opcional, puede no ser visible)
  };

  const confidence =
    params.personConfidence * weights.person +
    params.greenColorScore * weights.greenColor +
    params.uniformConfidence * weights.uniform +
    params.locationConfidence * weights.location +
    params.logoConfidence * weights.logo;

  return confidence;
}

/**
 * Determina el estado final de validación y razón de rechazo
 */
function determineValidationStatus(params: {
  personDetected: boolean;
  personConfidence: number;
  uniformDetected: boolean;
  uniformConfidence: number;
  hasGreenColor: boolean;
  greenColorScore: number;
  locationDetected: boolean;
  locationConfidence: number;
  confidence: number;
}): { status: 'auto_approved' | 'rejected' | 'needs_review'; rejectionReason?: string } {
  // Rechazar si no hay persona (criterio MÁS importante)
  if (!params.personDetected || params.personConfidence < VALIDATION_CONFIG.MIN_PERSON_CONFIDENCE) {
    return {
      status: 'rejected',
      rejectionReason: 'No se detectó una persona claramente en la foto. Asegúrate de estar visible y de frente.',
    };
  }

  // Aprobar automáticamente si cumple criterios con buena confianza
  if (params.confidence >= VALIDATION_CONFIG.AUTO_APPROVE_THRESHOLD) {
    return { status: 'auto_approved' };
  }

  // Rechazar automáticamente si la confianza es muy baja
  // (no hay persona clara NI color verde NI uniforme)
  if (params.confidence <= VALIDATION_CONFIG.AUTO_REJECT_THRESHOLD) {
    const reasons = [];
    if (!params.hasGreenColor) reasons.push('uniforme verde');
    if (!params.uniformDetected) reasons.push('ropa de trabajo visible');

    return {
      status: 'rejected',
      rejectionReason: `La foto no cumple con los requisitos. No se detectó: ${reasons.join(' ni ')}.`,
    };
  }

  // Caso intermedio: requiere revisión manual
  // (hay persona pero no se ve claro el uniforme/color)
  return { status: 'needs_review' };
}
