// src/components/admin/SlackWebhookTester.tsx - Componente para probar webhooks de Slack

import React, { useState } from 'react'
import { SlackWebhookTester as WebhookTesterService } from '../../services/slackWebhookTester'

interface SlackWebhookTesterProps {
  webhookUrl: string
  channel?: string
  disabled?: boolean
}

/**
 * Componente para probar la configuración del webhook de Slack
 */
export const SlackWebhookTester: React.FC<SlackWebhookTesterProps> = ({
  webhookUrl,
  channel,
  disabled = false
}) => {
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{
    success: boolean
    message: string
    timestamp?: Date
  } | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  /**
   * Ejecuta la prueba del webhook
   */
  const handleTest = async () => {
    if (!webhookUrl || !webhookUrl.trim()) {
      setTestResult({
        success: false,
        message: '⚠️ Por favor, ingresa una URL de webhook antes de probar'
      })
      return
    }

    setTesting(true)
    setTestResult(null)

    try {
      const result = await WebhookTesterService.testWebhook(webhookUrl, channel)
      setTestResult({
        success: result.success,
        message: result.message,
        timestamp: result.timestamp
      })
    } catch (error) {
      setTestResult({
        success: false,
        message: `❌ Error inesperado: ${error instanceof Error ? error.message : 'Error desconocido'}`
      })
    } finally {
      setTesting(false)
    }
  }

  /**
   * Ejecuta una prueba personalizada
   */
  const handleCustomTest = async (messageType: 'success' | 'warning' | 'error' | 'info') => {
    if (!webhookUrl || !webhookUrl.trim()) {
      setTestResult({
        success: false,
        message: '⚠️ Por favor, ingresa una URL de webhook antes de probar'
      })
      return
    }

    setTesting(true)
    setTestResult(null)

    try {
      const result = await WebhookTesterService.testCustomMessage(webhookUrl, messageType)
      setTestResult({
        success: result.success,
        message: result.message,
        timestamp: result.timestamp
      })
    } catch (error) {
      setTestResult({
        success: false,
        message: `❌ Error inesperado: ${error instanceof Error ? error.message : 'Error desconocido'}`
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="bg-white rounded-lg p-5 border border-purple-200">
      <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center">
        <span className="text-lg mr-2">🧪</span>
        Probar Conexión con Slack
      </h4>

      <div className="space-y-4">
        {/* Botón principal de prueba */}
        <div>
          <button
            type="button"
            onClick={handleTest}
            disabled={disabled || testing || !webhookUrl}
            className={`
              w-full px-4 py-3 rounded-lg font-medium text-sm
              transition-all duration-200 flex items-center justify-center space-x-2
              ${
                disabled || !webhookUrl
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : testing
                  ? 'bg-purple-400 text-white cursor-wait'
                  : 'bg-purple-600 text-white hover:bg-purple-700 hover:shadow-lg active:scale-95'
              }
            `}
          >
            {testing ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Enviando mensaje de prueba...</span>
              </>
            ) : (
              <>
                <span>🚀</span>
                <span>Enviar Mensaje de Prueba a Slack</span>
              </>
            )}
          </button>

          <p className="text-xs text-gray-500 mt-2 text-center">
            Esto enviará un mensaje de prueba a tu canal de Slack
          </p>
        </div>

        {/* Resultado de la prueba */}
        {testResult && (
          <div
            className={`
              p-4 rounded-lg border-l-4 animate-fadeIn
              ${
                testResult.success
                  ? 'bg-green-50 border-green-500'
                  : testResult.message.includes('CORS')
                  ? 'bg-yellow-50 border-yellow-500'
                  : 'bg-red-50 border-red-500'
              }
            `}
          >
            <div className="flex items-start space-x-3">
              <span className="text-2xl flex-shrink-0">
                {testResult.success ? '✅' : testResult.message.includes('CORS') ? '⚠️' : '❌'}
              </span>
              <div className="flex-1 min-w-0">
                <div
                  className={`
                    text-sm whitespace-pre-line
                    ${
                      testResult.success
                        ? 'text-green-900'
                        : testResult.message.includes('CORS')
                        ? 'text-yellow-900'
                        : 'text-red-900'
                    }
                  `}
                >
                  {testResult.message}
                </div>
                {testResult.timestamp && (
                  <p className="text-xs text-gray-600 mt-2">
                    {testResult.timestamp.toLocaleString('es-MX')}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Opciones avanzadas */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            disabled={disabled || !webhookUrl}
            className="text-sm text-purple-600 hover:text-purple-800 font-medium flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>{showAdvanced ? '▼' : '▶'}</span>
            <span>Pruebas Avanzadas</span>
          </button>

          {showAdvanced && (
            <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3 animate-fadeIn">
              <p className="text-xs text-gray-600 mb-3">
                Prueba diferentes tipos de mensajes para ver cómo se verán en Slack:
              </p>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleCustomTest('success')}
                  disabled={disabled || testing || !webhookUrl}
                  className="px-3 py-2 bg-green-100 text-green-800 rounded-md text-xs font-medium hover:bg-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1"
                >
                  <span>✅</span>
                  <span>Éxito</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCustomTest('warning')}
                  disabled={disabled || testing || !webhookUrl}
                  className="px-3 py-2 bg-yellow-100 text-yellow-800 rounded-md text-xs font-medium hover:bg-yellow-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1"
                >
                  <span>⚠️</span>
                  <span>Advertencia</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCustomTest('error')}
                  disabled={disabled || testing || !webhookUrl}
                  className="px-3 py-2 bg-red-100 text-red-800 rounded-md text-xs font-medium hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1"
                >
                  <span>🔴</span>
                  <span>Error</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCustomTest('info')}
                  disabled={disabled || testing || !webhookUrl}
                  className="px-3 py-2 bg-blue-100 text-blue-800 rounded-md text-xs font-medium hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1"
                >
                  <span>ℹ️</span>
                  <span>Info</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <div className="flex items-start space-x-2">
            <span className="text-sm flex-shrink-0">💡</span>
            <div className="text-xs text-blue-900">
              <p className="font-medium mb-1">Importante:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li><strong>Es normal</strong> que la prueba falle por restricciones CORS del navegador</li>
                <li>Esto <strong>NO significa</strong> que el webhook esté mal configurado</li>
                <li>Las notificaciones <strong>funcionarán correctamente</strong> durante check-ins reales (se envían desde el servidor)</li>
                <li><strong>Para verificar:</strong> Guarda la configuración y realiza un check-in de prueba con retraso</li>
                <li>Asegúrate de que el webhook esté activo en tu workspace de Slack</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
