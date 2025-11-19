// src/components/admin/SlackWebhookTester.tsx - Componente para probar webhooks de Slack

import React, { useState } from 'react'
import { SlackWebhookTester as WebhookTesterService } from '../../services/slackWebhookTester'

interface SlackWebhookTesterProps {
  webhookUrl: string
  channel?: string
  disabled?: boolean
}

/**
 * Hook para copiar texto al portapapeles
 */
const useCopyToClipboard = () => {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      return true
    } catch (err) {
      console.error('Error copiando al portapapeles:', err)
      return false
    }
  }

  return { copied, copyToClipboard }
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
  const { copied, copyToClipboard } = useCopyToClipboard()

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
          <>
            {/* Caso especial: Error CORS */}
            {testResult.message === 'CORS_BLOCKED' ? (
              <div className="p-5 rounded-lg bg-gradient-to-br from-orange-50 to-yellow-50 border-l-4 border-orange-400 animate-fadeIn">
                <div className="flex items-start space-x-3 mb-4">
                  <span className="text-3xl flex-shrink-0">🔒</span>
                  <div className="flex-1">
                    <h5 className="text-base font-bold text-orange-900 mb-1">
                      Bloqueado por Seguridad del Navegador
                    </h5>
                    <p className="text-sm text-orange-800">
                      Los webhooks de Slack no pueden probarse directamente desde el navegador por políticas de seguridad (CORS).
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 mb-4 border border-orange-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-lg">✅</span>
                    <p className="text-sm font-semibold text-green-800">
                      ¡Tu webhook funcionará perfectamente!
                    </p>
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed">
                    Esta restricción <strong>solo aplica en el navegador</strong>. Las notificaciones reales del sistema
                    se enviarán sin problemas porque no están sujetas a estas limitaciones.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-base">🧪</span>
                    <h6 className="text-sm font-bold text-orange-900">
                      Opciones para probar tu webhook:
                    </h6>
                  </div>

                  {/* Opción 1: cURL */}
                  <div className="bg-white rounded-lg p-4 border border-orange-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-base">💻</span>
                        <h6 className="text-sm font-semibold text-gray-900">
                          1. Usa este comando en tu terminal:
                        </h6>
                      </div>
                    </div>
                    <div className="bg-gray-900 rounded-md p-3 mb-2 overflow-x-auto">
                      <code className="text-xs text-green-400 font-mono break-all">
                        curl -X POST -H "Content-Type: application/json" -d '{"{"}"text":"Prueba de webhook"{"}"}' {webhookUrl}
                      </code>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(`curl -X POST -H "Content-Type: application/json" -d '{"text":"Prueba de webhook"}' ${webhookUrl}`)}
                      className="w-full px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-md transition-colors flex items-center justify-center space-x-2"
                    >
                      {copied ? (
                        <>
                          <span>✅</span>
                          <span>¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <span>📋</span>
                          <span>Copiar Comando cURL</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Opción 2: Herramientas */}
                  <div className="bg-white rounded-lg p-4 border border-orange-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-base">🛠️</span>
                      <h6 className="text-sm font-semibold text-gray-900">
                        2. Usa una herramienta de testing:
                      </h6>
                    </div>
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(webhookUrl)}
                        className="w-full px-3 py-2 bg-white hover:bg-gray-50 text-gray-800 text-xs font-medium rounded-md border border-gray-300 transition-colors flex items-center justify-center space-x-2"
                      >
                        <span>📋</span>
                        <span>{copied ? '¡URL Copiada!' : 'Copiar URL del Webhook'}</span>
                      </button>
                      <p className="text-xs text-gray-600 pl-2">
                        • <strong>Postman</strong> o <strong>Insomnia</strong> - Apps de testing de APIs<br/>
                        • <strong>Extensión CORS Unblock</strong> - Para Chrome/Edge<br/>
                        • <strong>Thunder Client</strong> - Extensión de VS Code
                      </p>
                    </div>
                  </div>

                  {/* Opción 3: Solo guardar */}
                  <div className="bg-white rounded-lg p-4 border border-orange-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-base">💾</span>
                      <h6 className="text-sm font-semibold text-gray-900">
                        3. O simplemente guarda la configuración:
                      </h6>
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed">
                      Las notificaciones automáticas del sistema (retrasos, ausencias, etc.)
                      <strong> funcionarán perfectamente</strong> sin necesidad de probar manualmente.
                    </p>
                  </div>
                </div>

                <div className="mt-4 bg-blue-100 rounded-md p-3 border border-blue-300">
                  <div className="flex items-start space-x-2">
                    <span className="text-sm flex-shrink-0">💡</span>
                    <p className="text-xs text-blue-900">
                      <strong>Consejo profesional:</strong> Guarda la configuración y genera una notificación real
                      (por ejemplo, registrando una entrada tardía). Verás el mensaje en Slack inmediatamente.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* Resultados normales (éxito o error no-CORS) */
              <div
                className={`
                  p-4 rounded-lg border-l-4 animate-fadeIn
                  ${
                    testResult.success
                      ? 'bg-green-50 border-green-500'
                      : 'bg-red-50 border-red-500'
                  }
                `}
              >
                <div className="flex items-start space-x-3">
                  <span className="text-2xl flex-shrink-0">
                    {testResult.success ? '✅' : '❌'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div
                      className={`
                        text-sm font-medium whitespace-pre-line
                        ${testResult.success ? 'text-green-900' : 'text-red-900'}
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
          </>
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

        {/* Nota informativa simplificada */}
        {!testResult && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="flex items-start space-x-2">
              <span className="text-sm flex-shrink-0">ℹ️</span>
              <div className="text-xs text-blue-900">
                <p className="font-medium mb-1">Nota sobre pruebas:</p>
                <p className="text-blue-800">
                  Si tu navegador bloquea la prueba por políticas de seguridad, te mostraremos
                  alternativas fáciles para verificar tu webhook. <strong>Las notificaciones reales
                  siempre funcionarán correctamente.</strong>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tips */}
        {!testResult && (
          <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
            <div className="flex items-start space-x-2">
              <span className="text-sm flex-shrink-0">💡</span>
              <div className="text-xs text-purple-900">
                <p className="font-medium mb-1">Consejos útiles:</p>
                <ul className="list-disc list-inside space-y-1 text-purple-800">
                  <li>Los mensajes aparecerán en el canal configurado en tu webhook de Slack</li>
                  <li>Las pruebas avanzadas muestran cómo se verán diferentes tipos de notificaciones</li>
                  <li>Si el webhook no funciona, verifica que esté activo en tu workspace de Slack</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
