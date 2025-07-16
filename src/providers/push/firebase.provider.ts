import * as admin from 'firebase-admin';
import { NotificationResult } from '../../shared/interfaces/notification.interface';
import { NotificationStatus } from '../../shared/enums/notification-type.enum';
import { config } from '../../core/config/env';
import setupLogger from '../../shared/utils/logger';
import { Notification } from '../../core/entities/entities/notification.entity';

export interface PushProviderConfig {
  serviceAccountKey: any;
  databaseURL?: string;
}

export class FirebaseProvider {
  private readonly logger = setupLogger({
    ...config.logging,
    dir: `${config.logging.dir}/providers/push`,
  });

  constructor(private readonly providerConfig: PushProviderConfig) {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(providerConfig.serviceAccountKey),
        databaseURL: providerConfig.databaseURL,
      });
    }
    this.logger.info('FirebaseProvider initialized');
  }

  public async send(notification: Notification): Promise<NotificationResult> {
    this.logger.info(`Sending push notification to ${notification.recipient}`);

    try {
      // El recipient debería ser el FCM token
      const token = notification.recipient;
      
      // Parsear el contenido si es JSON
      let messageData;
      try {
        messageData = JSON.parse(notification.content);
      } catch {
        messageData = {
          title: notification.subject || 'Notification',
          body: notification.content,
        };
      }

      const message = {
        token,
        notification: {
          title: messageData.title,
          body: messageData.body,
        },
        data: notification.data ? 
          Object.fromEntries(
            Object.entries(notification.data).map(([k, v]) => [k, String(v)])
          ) : {},
      };

      const response = await admin.messaging().send(message);

      this.logger.info(`Push notification sent successfully to ${notification.recipient}`, {
        messageId: response
      });

      return {
        id: notification.id,
        status: NotificationStatus.SENT,
        recipient: notification.recipient,
        type: notification.type,
        sentAt: new Date(),
        providerResponse: {
          messageId: response,
        },
      };

    } catch (error) {
      this.logger.error(`Error sending push notification to ${notification.recipient}:`, error);

      return {
        id: notification.id,
        status: NotificationStatus.FAILED,
        recipient: notification.recipient,
        type: notification.type,
        failureReason: error instanceof Error ? error.message : 'Unknown error',
        providerResponse: error,
      };
    }
  }
}
