import React from 'react';
import { OCRResult } from '../../types';

interface OCRResultsProps {
  ocrResults: OCRResult;
  variant?: 'compact' | 'detailed';
}

export function OCRResults({ ocrResults, variant = 'detailed' }: OCRResultsProps) {
  if (ocrResults.error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-3">
        <p className="text-sm text-red-700">
          <span className="font-medium">Error en OCR:</span> {ocrResults.error}
        </p>
      </div>
    );
  }

  if (!ocrResults.clockTime) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
        <p className="text-sm text-yellow-700">
          ⚠️ No se pudo detectar la hora del reloj en la imagen
        </p>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="inline-flex items-center space-x-2 bg-green-50 border border-green-200 rounded px-2 py-1">
        <span className="text-xs text-green-700">⏰ OCR:</span>
        <span className="text-xs text-green-900 font-semibold">
          {ocrResults.clockTime}
        </span>
        {ocrResults.timeDifference !== null && Math.abs(ocrResults.timeDifference) > 0 && (
          <span className={`text-xs ${
            Math.abs(ocrResults.timeDifference) > 5 ? 'text-red-600' : 'text-yellow-600'
          }`}>
            ({Math.abs(ocrResults.timeDifference)}min {ocrResults.timeDifference > 0 ? '⏩' : '⏪'})
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-md p-4">
      <h4 className="text-sm font-semibold text-green-900 mb-3">
        🔍 Resultados del Reconocimiento OCR
      </h4>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between items-center py-1 border-b border-green-100">
          <span className="text-green-700 font-medium">⏰ Hora del Reloj:</span>
          <span className="text-green-900 font-bold text-base">{ocrResults.clockTime}</span>
        </div>

        {ocrResults.timeDifference !== null && (
          <div className="flex justify-between items-center py-1 border-b border-green-100">
            <span className="text-green-700 font-medium">📊 Diferencia con Servidor:</span>
            <span className={`font-semibold ${
              Math.abs(ocrResults.timeDifference) <= 2
                ? 'text-green-700'
                : Math.abs(ocrResults.timeDifference) <= 5
                ? 'text-yellow-700'
                : 'text-red-700'
            }`}>
              {Math.abs(ocrResults.timeDifference)} minuto{Math.abs(ocrResults.timeDifference) !== 1 ? 's' : ''}
              {ocrResults.timeDifference > 0 ? ' adelantado' : ' atrasado'}
            </span>
          </div>
        )}

        <div className="flex justify-between items-center py-1 border-b border-green-100">
          <span className="text-green-700 font-medium">✅ Confianza del OCR:</span>
          <div className="flex items-center space-x-2">
            <span className="text-green-900 font-semibold">
              {Math.round(ocrResults.confidence * 100)}%
            </span>
            <div className="w-20 bg-green-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all"
                style={{ width: `${ocrResults.confidence * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center py-1">
          <span className="text-green-700 font-medium">⚡ Tiempo de Procesamiento:</span>
          <span className="text-green-900">
            {(ocrResults.processingTime / 1000).toFixed(2)}s
          </span>
        </div>

        {ocrResults.extractedText && (
          <details className="mt-3 pt-3 border-t border-green-200">
            <summary className="text-green-700 font-medium cursor-pointer hover:text-green-900">
              📝 Ver texto extraído completo
            </summary>
            <div className="mt-2 p-2 bg-white rounded border border-green-300">
              <pre className="text-xs text-green-900 whitespace-pre-wrap break-words">
                {ocrResults.extractedText}
              </pre>
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
