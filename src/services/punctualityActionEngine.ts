// src/services/punctualityActionEngine.ts - Motor de Acciones de Puntualidad

import {
  doc,
  updateDoc,
  increment,
  Timestamp,
  collection,
  addDoc,
  getDocs,
  query,
  where
} from 'firebase/firestore'
import { db } from '../config/firebase'
import {
  CheckIn,
  User,
  SystemConfig,
  PunctualityAction,
  PunctualityActionResult,
  PunctualityActionType,
  Notification,
  NotificationType,
  SlackNotification
} from '../types'

/**
 * Motor de Acciones de Puntualidad
 *
 * Este servicio orquesta todas las acciones que deben ejecutarse cuando:
 * - Un usuario llega tarde
 * - Un usuario sale temprano
 * - Un usuario excede el tiempo de comida
 * - Ocurre cualquier otra irregularidad de puntualidad
 *
 * Acciones que ejecuta:
 * 1. Asignar estado de puntualidad
 * 2. Sumar minutos de retraso al acumulado del usuario
 * 3. Exigir comentario obligatorio
 * 4. Notificar al usuario
 * 5. Notificar al supervisor
 * 6. Notificar a administradores
 * 7. Notificar vía Slack
 */
export class PunctualityActionEngine {
  /**
   * Ejecuta todas las acciones necesarias basadas en el check-in y configuración del sistema
   */
  static async executeActions(
    checkIn: CheckIn,
    user: User,
    config: SystemConfig
  ): Promise<PunctualityActionResult> {
    const actions: PunctualityAction[] = []
    const errors: string[] = []

    console.log(`🎯 [PunctualityActionEngine] Ejecutando acciones para check-in ${checkIn.id}`)
    console.log(`   Usuario: ${user.name}, Estado: ${checkIn.status}, Tipo: ${checkIn.type}`)

    try {
      // 1. Asignar estado de puntualidad (ya asignado en validación)
      actions.push(await this.assignStatus(checkIn))

      // 2. Si hay retraso, sumar minutos al acumulado del usuario
      if (checkIn.status === 'retrasado' && checkIn.validationResults?.minutesLate) {
        const action = await this.addLateMinutes(user.id, checkIn.validationResults.minutesLate)
        actions.push(action)
        if (!action.success) {
          errors.push(action.error || 'Error al sumar minutos de retraso')
        }
      }

      // 3. Determinar si se requiere comentario obligatorio
      const requiresComment = this.shouldRequireComment(checkIn, config)
      if (requiresComment) {
        actions.push(await this.requireComment(checkIn))
      }

      // 4. Enviar notificaciones según configuración
      const notificationActions = await this.sendNotifications(
        checkIn,
        user,
        config
      )
      actions.push(...notificationActions)

      // 5. Actualizar el check-in con las acciones ejecutadas
      await this.updateCheckInWithActions(checkIn.id, actions)

    } catch (error) {
      console.error('❌ [PunctualityActionEngine] Error ejecutando acciones:', error)
      errors.push(error instanceof Error ? error.message : 'Error desconocido')
    }

    const result: PunctualityActionResult = {
      checkInId: checkIn.id,
      userId: user.id,
      actions,
      totalActionsExecuted: actions.length,
      totalSuccessful: actions.filter(a => a.success).length,
      totalFailed: actions.filter(a => !a.success).length,
      errors: errors.length > 0 ? errors : undefined
    }

    console.log(`✅ [PunctualityActionEngine] Acciones completadas:`, result)
    return result
  }

  /**
   * Asigna el estado de puntualidad
   */
  private static async assignStatus(checkIn: CheckIn): Promise<PunctualityAction> {
    return {
      type: 'assign_status',
      executedAt: Timestamp.now(),
      success: true,
      details: {
        statusAssigned: checkIn.status
      }
    }
  }

  /**
   * Suma minutos de retraso al acumulado del usuario
   */
  private static async addLateMinutes(
    userId: string,
    minutesLate: number
  ): Promise<PunctualityAction> {
    try {
      const userRef = doc(db, 'users', userId)
      await updateDoc(userRef, {
        totalLateMinutes: increment(minutesLate),
        updatedAt: Timestamp.now()
      })

      console.log(`⏱️ [PunctualityActionEngine] Sumados ${minutesLate} minutos de retraso al usuario ${userId}`)

      return {
        type: 'add_late_minutes',
        executedAt: Timestamp.now(),
        success: true,
        details: {
          minutesAdded: minutesLate
        }
      }
    } catch (error) {
      console.error('❌ Error sumando minutos de retraso:', error)
      return {
        type: 'add_late_minutes',
        executedAt: Timestamp.now(),
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        details: {
          minutesAdded: minutesLate
        }
      }
    }
  }

  /**
   * Marca que se requiere comentario obligatorio
   */
  private static async requireComment(checkIn: CheckIn): Promise<PunctualityAction> {
    try {
      const checkInRef = doc(db, 'checkins', checkIn.id)
      await updateDoc(checkInRef, {
        requiresComment: true
      })

      console.log(`📝 [PunctualityActionEngine] Comentario requerido para check-in ${checkIn.id}`)

      return {
        type: 'require_comment',
        executedAt: Timestamp.now(),
        success: true,
        details: {
          commentRequired: true
        }
      }
    } catch (error) {
      console.error('❌ Error marcando comentario requerido:', error)
      return {
        type: 'require_comment',
        executedAt: Timestamp.now(),
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }

  /**
   * Envía notificaciones a todos los destinatarios configurados
   */
  private static async sendNotifications(
    checkIn: CheckIn,
    user: User,
    config: SystemConfig
  ): Promise<PunctualityAction[]> {
    const actions: PunctualityAction[] = []
    const notificationRules = config.notificationRules

    // Determinar tipo de notificación
    const notificationType = this.getNotificationType(checkIn)
    if (!notificationType) {
      return actions
    }

    // Verificar si debe notificar según el tipo de evento
    const shouldNotify = this.shouldNotifyForType(checkIn, config)
    if (!shouldNotify) {
      console.log(`ℹ️ [PunctualityActionEngine] Notificaciones deshabilitadas para ${checkIn.status}`)
      return actions
    }

    // 1. Notificar al usuario
    if (notificationRules?.notifyUser !== false) {
      const action = await this.notifyUser(checkIn, user, notificationType)
      actions.push(action)
    }

    // 2. Notificar al supervisor
    if (notificationRules?.notifySupervisor !== false && user.supervisorId) {
      const action = await this.notifySupervisor(checkIn, user, notificationType)
      actions.push(action)
    }

    // 3. Notificar a administradores
    if (notificationRules?.notifyAdmin !== false) {
      const action = await this.notifyAdmins(checkIn, user, notificationType)
      actions.push(action)
    }

    // 4. Notificar vía Slack
    if (config.slackConfig?.enabled && this.shouldNotifySlack(checkIn, config)) {
      const action = await this.notifySlack(checkIn, user, config)
      actions.push(action)
    }

    return actions
  }

  /**
   * Notifica al usuario sobre su registro
   */
  private static async notifyUser(
    checkIn: CheckIn,
    user: User,
    type: NotificationType
  ): Promise<PunctualityAction> {
    try {
      const { title, message } = this.buildNotificationContent(checkIn, user)

      const notificationData: Omit<Notification, 'id'> = {
        type,
        title,
        message,
        userId: user.id,
        checkInId: checkIn.id,
        recipientIds: [user.id],
        read: false,
        createdAt: Timestamp.now()
      }

      const notificationRef = await addDoc(collection(db, 'notifications'), notificationData)

      console.log(`📧 [PunctualityActionEngine] Notificación enviada al usuario ${user.name}`)

      return {
        type: 'notify_user',
        executedAt: Timestamp.now(),
        success: true,
        details: {
          notificationId: notificationRef.id
        }
      }
    } catch (error) {
      console.error('❌ Error notificando al usuario:', error)
      return {
        type: 'notify_user',
        executedAt: Timestamp.now(),
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }

  /**
   * Notifica al supervisor del usuario
   */
  private static async notifySupervisor(
    checkIn: CheckIn,
    user: User,
    type: NotificationType
  ): Promise<PunctualityAction> {
    try {
      if (!user.supervisorId) {
        return {
          type: 'notify_supervisor',
          executedAt: Timestamp.now(),
          success: false,
          error: 'Usuario no tiene supervisor asignado'
        }
      }

      const { title, message } = this.buildNotificationContent(checkIn, user, 'supervisor')

      const notificationData: Omit<Notification, 'id'> = {
        type,
        title: `[Supervisión] ${title}`,
        message,
        userId: user.id,
        checkInId: checkIn.id,
        recipientIds: [user.supervisorId],
        read: false,
        createdAt: Timestamp.now()
      }

      const notificationRef = await addDoc(collection(db, 'notifications'), notificationData)

      console.log(`👔 [PunctualityActionEngine] Notificación enviada al supervisor ${user.supervisorName}`)

      return {
        type: 'notify_supervisor',
        executedAt: Timestamp.now(),
        success: true,
        details: {
          notificationId: notificationRef.id
        }
      }
    } catch (error) {
      console.error('❌ Error notificando al supervisor:', error)
      return {
        type: 'notify_supervisor',
        executedAt: Timestamp.now(),
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }

  /**
   * Notifica a todos los administradores
   */
  private static async notifyAdmins(
    checkIn: CheckIn,
    user: User,
    type: NotificationType
  ): Promise<PunctualityAction> {
    try {
      // Obtener todos los administradores
      const adminsQuery = query(
        collection(db, 'users'),
        where('role', 'in', ['admin', 'super_admin']),
        where('status', '==', 'active')
      )
      const adminsSnapshot = await getDocs(adminsQuery)
      const adminIds = adminsSnapshot.docs.map(doc => doc.id)

      if (adminIds.length === 0) {
        return {
          type: 'notify_admin',
          executedAt: Timestamp.now(),
          success: false,
          error: 'No hay administradores activos'
        }
      }

      const { title, message } = this.buildNotificationContent(checkIn, user, 'admin')

      const notificationData: Omit<Notification, 'id'> = {
        type,
        title: `[Admin] ${title}`,
        message,
        userId: user.id,
        checkInId: checkIn.id,
        recipientIds: adminIds,
        read: false,
        createdAt: Timestamp.now()
      }

      const notificationRef = await addDoc(collection(db, 'notifications'), notificationData)

      console.log(`👨‍💼 [PunctualityActionEngine] Notificación enviada a ${adminIds.length} administradores`)

      return {
        type: 'notify_admin',
        executedAt: Timestamp.now(),
        success: true,
        details: {
          notificationId: notificationRef.id
        }
      }
    } catch (error) {
      console.error('❌ Error notificando a administradores:', error)
      return {
        type: 'notify_admin',
        executedAt: Timestamp.now(),
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }

  /**
   * Envía notificación vía Slack
   */
  private static async notifySlack(
    checkIn: CheckIn,
    user: User,
    config: SystemConfig
  ): Promise<PunctualityAction> {
    try {
      if (!config.slackConfig?.webhookUrl) {
        return {
          type: 'notify_slack',
          executedAt: Timestamp.now(),
          success: false,
          error: 'Webhook URL de Slack no configurado'
        }
      }

      const slackMessage = this.buildSlackMessage(checkIn, user, config)

      const response = await fetch(config.slackConfig.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(slackMessage)
      })

      if (!response.ok) {
        throw new Error(`Slack API respondió con status ${response.status}`)
      }

      console.log(`💬 [PunctualityActionEngine] Notificación enviada a Slack`)

      // Actualizar el check-in para marcar que se envió vía Slack
      await updateDoc(doc(db, 'checkins', checkIn.id), {
        'actionsTaken': [...(checkIn.actionsTaken || []), {
          type: 'notify_slack',
          executedAt: Timestamp.now(),
          success: true
        }]
      })

      return {
        type: 'notify_slack',
        executedAt: Timestamp.now(),
        success: true,
        details: {
          slackMessageId: 'sent' // Slack webhooks no devuelven message ID
        }
      }
    } catch (error) {
      console.error('❌ Error enviando notificación a Slack:', error)
      return {
        type: 'notify_slack',
        executedAt: Timestamp.now(),
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }

  /**
   * Actualiza el check-in con las acciones ejecutadas
   */
  private static async updateCheckInWithActions(
    checkInId: string,
    actions: PunctualityAction[]
  ): Promise<void> {
    try {
      const checkInRef = doc(db, 'checkins', checkInId)
      await updateDoc(checkInRef, {
        actionsTaken: actions
      })
    } catch (error) {
      console.error('❌ Error actualizando check-in con acciones:', error)
    }
  }

  // ==================== MÉTODOS AUXILIARES ====================

  /**
   * Determina si se debe requerir comentario obligatorio
   */
  private static shouldRequireComment(checkIn: CheckIn, config: SystemConfig): boolean {
    const commentRules = config.commentRules

    // Si ya tiene comentario, no es necesario requerir
    if (checkIn.notes && checkIn.notes.trim().length >= (commentRules?.minCommentLength || 10)) {
      return false
    }

    // Verificar según el tipo de check-in y estado
    if (checkIn.status === 'retrasado') {
      if (checkIn.type === 'entrada' && commentRules?.requireOnLateArrival !== false) {
        return true
      }
      if (checkIn.type === 'regreso_comida' && commentRules?.requireOnLongLunch !== false) {
        return true
      }
    }

    if (checkIn.status === 'anticipado' && checkIn.type === 'salida') {
      if (commentRules?.requireOnEarlyDeparture !== false) {
        return true
      }
    }

    return false
  }

  /**
   * Determina el tipo de notificación basado en el check-in
   */
  private static getNotificationType(checkIn: CheckIn): NotificationType | null {
    if (checkIn.status === 'retrasado') {
      if (checkIn.type === 'entrada') return 'late_arrival'
      if (checkIn.type === 'regreso_comida') return 'long_lunch'
    }

    if (checkIn.status === 'anticipado' && checkIn.type === 'salida') {
      return 'early_departure'
    }

    if (checkIn.status === 'ubicacion_invalida') {
      return 'location_violation'
    }

    return null
  }

  /**
   * Verifica si debe notificar según el tipo de evento
   */
  private static shouldNotifyForType(checkIn: CheckIn, config: SystemConfig): boolean {
    const notificationRules = config.notificationRules

    if (checkIn.status === 'retrasado' && checkIn.type === 'entrada') {
      return notificationRules?.notifyOnLateArrival !== false
    }

    if (checkIn.status === 'retrasado' && checkIn.type === 'regreso_comida') {
      return notificationRules?.notifyOnLongLunch !== false
    }

    if (checkIn.status === 'anticipado' && checkIn.type === 'salida') {
      return notificationRules?.notifyOnLateExit !== false
    }

    return true
  }

  /**
   * Verifica si debe notificar vía Slack según el tipo de evento
   */
  private static shouldNotifySlack(checkIn: CheckIn, config: SystemConfig): boolean {
    const slackConfig = config.slackConfig

    if (!slackConfig) return false

    if (checkIn.status === 'retrasado' && checkIn.type === 'entrada') {
      return slackConfig.notifyOnLateArrival !== false
    }

    if (checkIn.status === 'retrasado' && checkIn.type === 'regreso_comida') {
      return slackConfig.notifyOnLongLunch !== false
    }

    return false
  }

  /**
   * Construye el contenido de la notificación
   */
  private static buildNotificationContent(
    checkIn: CheckIn,
    user: User,
    recipientRole: 'user' | 'supervisor' | 'admin' = 'user'
  ): { title: string; message: string } {
    const minutesLate = checkIn.validationResults?.minutesLate || 0
    const typeLabels: Record<string, string> = {
      entrada: 'Entrada',
      salida: 'Salida',
      comida: 'Comida',
      regreso_comida: 'Regreso de comida'
    }

    const typeLabel = typeLabels[checkIn.type] || checkIn.type

    if (checkIn.status === 'retrasado') {
      if (recipientRole === 'user') {
        return {
          title: `Registro con retraso - ${typeLabel}`,
          message: `Tu ${typeLabel.toLowerCase()} se registró con ${minutesLate} minuto(s) de retraso en ${checkIn.kioskName}. ${checkIn.requiresComment ? 'Se requiere un comentario explicativo.' : ''}`
        }
      } else {
        return {
          title: `${user.name} - Retraso en ${typeLabel}`,
          message: `${user.name} registró ${typeLabel.toLowerCase()} con ${minutesLate} minuto(s) de retraso en ${checkIn.kioskName}.`
        }
      }
    }

    if (checkIn.status === 'anticipado') {
      if (recipientRole === 'user') {
        return {
          title: `${typeLabel} anticipada`,
          message: `Tu ${typeLabel.toLowerCase()} se registró de manera anticipada en ${checkIn.kioskName}.`
        }
      } else {
        return {
          title: `${user.name} - ${typeLabel} anticipada`,
          message: `${user.name} registró ${typeLabel.toLowerCase()} de manera anticipada en ${checkIn.kioskName}.`
        }
      }
    }

    return {
      title: `Registro de ${typeLabel}`,
      message: `Registro de ${typeLabel.toLowerCase()} en ${checkIn.kioskName}.`
    }
  }

  /**
   * Construye el mensaje para Slack con formato enriquecido
   */
  private static buildSlackMessage(checkIn: CheckIn, user: User, config?: SystemConfig): SlackNotification {
    const minutesLate = checkIn.validationResults?.minutesLate || 0
    const typeLabels: Record<string, string> = {
      entrada: 'Entrada',
      salida: 'Salida',
      comida: 'Comida',
      regreso_comida: 'Regreso de comida'
    }

    const typeLabel = typeLabels[checkIn.type] || checkIn.type

    // Determinar emoji y color según el estado y severidad
    let emoji = '📍'
    let color = '#36a64f' // Verde por defecto (a tiempo)
    let statusText = 'A tiempo'

    if (checkIn.status === 'retrasado') {
      const severeThreshold = config?.severeDelayThreshold || 20

      if (minutesLate >= severeThreshold) {
        emoji = '🔴'
        color = '#e01e5a' // Rojo (retraso severo)
        statusText = `⚠️ RETRASO SEVERO (${minutesLate} min)`
      } else if (minutesLate > 10) {
        emoji = '🟡'
        color = '#ECB22E' // Amarillo (retraso moderado)
        statusText = `⚠️ Retrasado (${minutesLate} min)`
      } else {
        emoji = '🟠'
        color = '#f2c744' // Naranja (retraso leve)
        statusText = `Retraso leve (${minutesLate} min)`
      }
    } else if (checkIn.status === 'anticipado') {
      emoji = '⚡'
      color = '#4A90E2' // Azul
      statusText = 'Anticipado'
    }

    // Construir texto principal
    let text = `${emoji} *${user.name}* - ${typeLabel}`
    if (checkIn.status === 'retrasado') {
      text += ` con ${minutesLate} min de retraso`
    }

    // Construir campos informativos
    const fields: Array<{ type: string; text: string }> = [
      {
        type: 'mrkdwn',
        text: `*👤 Usuario:*\n${user.name}${user.email ? `\n_${user.email}_` : ''}`
      },
      {
        type: 'mrkdwn',
        text: `*📍 Ubicación:*\n${checkIn.kioskName}`
      },
      {
        type: 'mrkdwn',
        text: `*⏰ Hora:*\n${new Date(checkIn.timestamp.toMillis()).toLocaleString('es-MX', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          day: '2-digit',
          month: 'short'
        })}`
      },
      {
        type: 'mrkdwn',
        text: `*📊 Estado:*\n${statusText}`
      }
    ]

    // Agregar información del supervisor si existe
    if (user.supervisorName) {
      fields.push({
        type: 'mrkdwn',
        text: `*👔 Supervisor:*\n${user.supervisorName}`
      })
    }

    // Agregar información del producto si existe
    if (checkIn.productType) {
      fields.push({
        type: 'mrkdwn',
        text: `*🏢 Producto:*\n${checkIn.productType}`
      })
    }

    // Agregar acumulado de minutos tarde si existe y hay retraso
    if (checkIn.status === 'retrasado' && user.totalLateMinutes !== undefined) {
      const totalAfterThis = (user.totalLateMinutes || 0) + minutesLate
      fields.push({
        type: 'mrkdwn',
        text: `*📈 Minutos acumulados:*\n${totalAfterThis} min totales`
      })
    }

    // Bloque principal del mensaje
    const mainBlocks: SlackNotification['blocks'] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${emoji} Registro de ${typeLabel}`,
          emoji: true
        }
      },
      {
        type: 'section',
        fields
      }
    ]

    // Agregar contexto si hay comentario
    if (checkIn.notes) {
      mainBlocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*💬 Comentario:*\n_"${checkIn.notes}"_`
        }
      })
    } else if (checkIn.requiresComment) {
      mainBlocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*⚠️ Se requiere comentario explicativo*`
        }
      })
    }

    // Agregar divider
    mainBlocks.push({
      type: 'divider' as any
    })

    // Agregar contexto adicional
    const contextText = [
      `🕐 Sistema de Asistencia AVIVA`,
      checkIn.id ? `ID: ${checkIn.id.slice(0, 8)}...` : ''
    ].filter(Boolean).join(' • ')

    mainBlocks.push({
      type: 'context' as any,
      elements: [
        {
          type: 'mrkdwn',
          text: contextText
        }
      ]
    } as any)

    return {
      username: 'Sistema de Asistencia AVIVA',
      icon_emoji: ':clock1:',
      text,
      blocks: mainBlocks,
      attachments: [
        {
          color,
          blocks: []
        }
      ]
    }
  }

  /**
   * Valida que un comentario cumpla con los requisitos mínimos
   */
  static validateComment(comment: string | undefined, config: SystemConfig): boolean {
    if (!comment) return false

    const minLength = config.commentRules?.minCommentLength || 10
    return comment.trim().length >= minLength
  }
}
