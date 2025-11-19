// src/services/slackWebhookTester.ts - Servicio para probar webhooks de Slack

import { SlackNotification } from '../types'

export interface WebhookTestResult {
  success: boolean
  message: string
  responseStatus?: number
  error?: string
  timestamp: Date
}

/**
 * Servicio para probar la configuración del webhook de Slack
 */
export class SlackWebhookTester {
  /**
   * Envía un mensaje de prueba al webhook de Slack
   */
  static async testWebhook(
    webhookUrl: string,
    channel?: string
  ): Promise<WebhookTestResult> {
    const timestamp = new Date()

    try {
      // Validar que la URL sea válida
      if (!webhookUrl || !webhookUrl.trim()) {
        return {
          success: false,
          message: 'La URL del webhook está vacía',
          timestamp
        }
      }

      // Validar formato de URL de Slack
      if (!webhookUrl.startsWith('https://hooks.slack.com/')) {
        return {
          success: false,
          message: 'La URL no parece ser un webhook válido de Slack. Debe comenzar con https://hooks.slack.com/',
          timestamp
        }
      }

      // Construir mensaje de prueba
      const testMessage: SlackNotification = {
        username: 'Sistema de Asistencia AVIVA',
        icon_emoji: ':white_check_mark:',
        text: '✅ Prueba de conexión exitosa',
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '🧪 Mensaje de Prueba',
              emoji: true
            }
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: '*Estado:*\n✅ Conexión exitosa'
              },
              {
                type: 'mrkdwn',
                text: `*Fecha y Hora:*\n${timestamp.toLocaleString('es-MX', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}`
              },
              {
                type: 'mrkdwn',
                text: `*Sistema:*\nRegistro de Asistencia AVIVA`
              },
              {
                type: 'mrkdwn',
                text: channel ? `*Canal:*\n#${channel}` : '*Canal:*\nCanal configurado en webhook'
              }
            ]
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '✅ *La configuración del webhook de Slack es correcta.*\n\nLas notificaciones del sistema se enviarán correctamente a este canal.'
            }
          },
          {
            type: 'divider' as any
          },
          {
            type: 'context' as any,
            elements: [
              {
                type: 'mrkdwn',
                text: '🔧 Esta es una prueba automática del sistema. Si ves este mensaje, la integración está funcionando correctamente.'
              }
            ]
          } as any
        ],
        attachments: [
          {
            color: '#36a64f', // Verde
            blocks: []
          }
        ]
      }

      // Si se especificó un canal, agregarlo
      if (channel) {
        testMessage.channel = channel.startsWith('#') ? channel : `#${channel}`
      }

      // Enviar mensaje al webhook
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testMessage)
      })

      // Verificar respuesta
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No se pudo leer el error')

        // Mensajes de error específicos según el código de estado
        let errorMessage = `Error ${response.status}: `
        switch (response.status) {
          case 400:
            errorMessage += 'Solicitud inválida. Verifica el formato del mensaje.'
            break
          case 404:
            errorMessage += 'Webhook no encontrado. Verifica que la URL sea correcta.'
            break
          case 410:
            errorMessage += 'Webhook desactivado. Necesitas crear uno nuevo en Slack.'
            break
          case 500:
            errorMessage += 'Error del servidor de Slack. Intenta de nuevo más tarde.'
            break
          default:
            errorMessage += errorText || 'Error desconocido'
        }

        return {
          success: false,
          message: errorMessage,
          responseStatus: response.status,
          error: errorText,
          timestamp
        }
      }

      // Éxito
      return {
        success: true,
        message: '✅ Mensaje de prueba enviado exitosamente. Revisa tu canal de Slack.',
        responseStatus: response.status,
        timestamp
      }

    } catch (error) {
      console.error('❌ Error probando webhook de Slack:', error)

      let errorMessage = 'Error al conectar con Slack: '

      // Detectar error de CORS (el más común en navegadores)
      if (error instanceof TypeError) {
        if (error.message.includes('fetch') || error.message.includes('Failed to fetch') || error.message.includes('Network request failed')) {
          errorMessage = 'CORS_BLOCKED' // Marcador especial para el frontend
        } else {
          errorMessage += error.message
        }
      } else if (error instanceof Error) {
        errorMessage += error.message
      } else {
        errorMessage += 'Error desconocido'
      }

      return {
        success: false,
        message: errorMessage,
        error: error instanceof Error ? error.message : String(error),
        timestamp
      }
    }
  }

  /**
   * Envía un mensaje de prueba personalizado (para testing de diferentes escenarios)
   */
  static async testCustomMessage(
    webhookUrl: string,
    messageType: 'success' | 'warning' | 'error' | 'info'
  ): Promise<WebhookTestResult> {
    const timestamp = new Date()

    const messages: Record<typeof messageType, { emoji: string; color: string; title: string; text: string }> = {
      success: {
        emoji: '✅',
        color: '#36a64f',
        title: 'Prueba: Mensaje de Éxito',
        text: 'Este es un ejemplo de cómo se verá una notificación exitosa.'
      },
      warning: {
        emoji: '⚠️',
        color: '#ECB22E',
        title: 'Prueba: Mensaje de Advertencia',
        text: 'Este es un ejemplo de cómo se verá una notificación de advertencia (ej: retraso leve).'
      },
      error: {
        emoji: '🔴',
        color: '#e01e5a',
        title: 'Prueba: Mensaje de Error',
        text: 'Este es un ejemplo de cómo se verá una notificación crítica (ej: retraso severo).'
      },
      info: {
        emoji: 'ℹ️',
        color: '#4A90E2',
        title: 'Prueba: Mensaje Informativo',
        text: 'Este es un ejemplo de cómo se verá una notificación informativa.'
      }
    }

    const config = messages[messageType]

    try {
      const testMessage: SlackNotification = {
        username: 'Sistema de Asistencia AVIVA',
        icon_emoji: ':clock1:',
        text: `${config.emoji} ${config.title}`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `${config.emoji} ${config.title}`,
              emoji: true
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: config.text
            }
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Usuario:*\nJuan Pérez (ejemplo)`
              },
              {
                type: 'mrkdwn',
                text: `*Ubicación:*\nKiosk Principal`
              },
              {
                type: 'mrkdwn',
                text: `*Hora:*\n${timestamp.toLocaleTimeString('es-MX')}`
              },
              {
                type: 'mrkdwn',
                text: `*Tipo:*\n${messageType.toUpperCase()}`
              }
            ]
          }
        ],
        attachments: [
          {
            color: config.color,
            blocks: []
          }
        ]
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testMessage)
      })

      if (!response.ok) {
        return {
          success: false,
          message: `Error al enviar mensaje de prueba: ${response.status}`,
          responseStatus: response.status,
          timestamp
        }
      }

      return {
        success: true,
        message: `✅ Mensaje de prueba tipo "${messageType}" enviado exitosamente`,
        responseStatus: response.status,
        timestamp
      }

    } catch (error) {
      console.error('❌ Error enviando mensaje de prueba:', error)

      let errorMessage = 'Error al enviar mensaje de prueba: '

      // Detectar error de CORS (el más común en navegadores)
      if (error instanceof TypeError) {
        if (error.message.includes('fetch') || error.message.includes('Failed to fetch') || error.message.includes('Network request failed')) {
          errorMessage = 'CORS_BLOCKED' // Marcador especial para el frontend
        } else {
          errorMessage += error.message
        }
      } else if (error instanceof Error) {
        errorMessage += error.message
      } else {
        errorMessage += 'Error desconocido'
      }

      return {
        success: false,
        message: errorMessage,
        error: error instanceof Error ? error.message : String(error),
        timestamp
      }
    }
  }
}
