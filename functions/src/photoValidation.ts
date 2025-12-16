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
  // Umbrales de confianza
  MIN_PERSON_CONFIDENCE: 0.7,
  MIN_UNIFORM_CONFIDENCE: 0.6,
  MIN_LOGO_CONFIDENCE: 0.5,
  MIN_LOCATION_CONFIDENCE: 0.6,
  AUTO_APPROVE_THRESHOLD: 0.85,
  AUTO_REJECT_THRESHOLD: 0.3,

  // Etiquetas esperadas para validación
  PERSON_LABELS: ['Person', 'People', 'Human', 'Man', 'Woman', 'Adult'],
  UNIFORM_LABELS: ['Clothing', 'Uniform', 'Shirt', 'Polo shirt', 'T-shirt'],
  LOCATION_LABELS: ['Retail', 'Store', 'Shop', 'Product', 'Shelf', 'Supermarket', 'Market', 'Building', 'Indoor'],

  // Etiquetas que indican que NO es foto real
  FAKE_PHOTO_LABELS: ['Screenshot', 'Display', 'Screen', 'Monitor', 'Computer', 'Phone', 'Photograph'],

  // Logos esperados (personalizar según empresa)
  EXPECTED_LOGOS: ['Aviva', 'BA', 'Construrama', 'Disensa'],
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

    // Validar logo
    const { detected: logoDetected, confidence: logoConfidence } = detectFromLogos(
      logos,
      VALIDATION_CONFIG.EXPECTED_LOGOS
    );

    // Detectar si es foto real (no screenshot)
    const { detected: isFakePhoto } = detectFromLabels(
      labels,
      VALIDATION_CONFIG.FAKE_PHOTO_LABELS
    );
    const isRealPhoto = !isFakePhoto;

    // Calcular confianza general
    const confidence = calculateOverallConfidence({
      personConfidence,
      uniformConfidence,
      logoConfidence,
      locationConfidence,
      isRealPhoto,
    });

    // Determinar estado y razón de rechazo
    const { status, rejectionReason } = determineValidationStatus({
      personDetected,
      personConfidence,
      uniformDetected,
      uniformConfidence,
      logoDetected,
      logoConfidence,
      locationDetected,
      locationConfidence,
      isRealPhoto,
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
      isRealPhoto,
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
      logoDetected,
      locationDetected,
      isRealPhoto,
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
 * Calcula confianza general de la validación
 */
function calculateOverallConfidence(params: {
  personConfidence: number;
  uniformConfidence: number;
  logoConfidence: number;
  locationConfidence: number;
  isRealPhoto: boolean;
}): number {
  // Pesos para cada factor
  const weights = {
    person: 0.3,
    uniform: 0.25,
    logo: 0.2,
    location: 0.15,
    realPhoto: 0.1,
  };

  const confidence =
    params.personConfidence * weights.person +
    params.uniformConfidence * weights.uniform +
    params.logoConfidence * weights.logo +
    params.locationConfidence * weights.location +
    (params.isRealPhoto ? 1.0 : 0.0) * weights.realPhoto;

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
  logoDetected: boolean;
  logoConfidence: number;
  locationDetected: boolean;
  locationConfidence: number;
  isRealPhoto: boolean;
  confidence: number;
}): { status: 'auto_approved' | 'rejected' | 'needs_review'; rejectionReason?: string } {
  // Rechazar automáticamente si no es foto real
  if (!params.isRealPhoto) {
    return {
      status: 'rejected',
      rejectionReason: 'La foto parece ser un screenshot o foto de pantalla. Se requiere foto en tiempo real.',
    };
  }

  // Rechazar si no hay persona
  if (!params.personDetected || params.personConfidence < VALIDATION_CONFIG.MIN_PERSON_CONFIDENCE) {
    return {
      status: 'rejected',
      rejectionReason: 'No se detectó una persona en la foto. Asegúrate de estar visible en la imagen.',
    };
  }

  // Aprobar automáticamente si cumple todos los criterios con alta confianza
  if (params.confidence >= VALIDATION_CONFIG.AUTO_APPROVE_THRESHOLD) {
    return { status: 'auto_approved' };
  }

  // Rechazar automáticamente si la confianza es muy baja
  if (params.confidence <= VALIDATION_CONFIG.AUTO_REJECT_THRESHOLD) {
    const reasons = [];
    if (!params.uniformDetected) reasons.push('uniforme');
    if (!params.logoDetected) reasons.push('logo de la empresa');
    if (!params.locationDetected) reasons.push('ambiente de trabajo');

    return {
      status: 'rejected',
      rejectionReason: `La foto no cumple con los requisitos. Falta: ${reasons.join(', ')}.`,
    };
  }

  // Caso intermedio: requiere revisión manual
  return { status: 'needs_review' };
}
