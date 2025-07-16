import { Twilio } from 'twilio';
import { NotificationResult } from '../../shared/interfaces/notification.interface';
import { NotificationStatus } from '../../shared/enums/notification-type.enum';
import { config } from '../../core/config/env';
import setupLogger from '../../shared/utils/logger';
import { Notification } from '../../core/entities/entities/notification.entity';

export interface SmsProviderConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

export class TwilioProvider {
  private readonly logger = setupLogger({
    ...config.logging,
    dir: `${config.logging.dir}/providers/sms`,
  });
  private twilioClient: Twilio;

  constructor(private readonly providerConfig: SmsProviderConfig) {
    this.twilioClient = new Twilio(
      providerConfig.accountSid,
      providerConfig.authToken
    );
    this.logger.info('TwilioProvider initialized');
  }

  public async send(notification: Notification): Promise<NotificationResult> {
    this.logger.info(`Sending SMS to ${notification.recipient}`);

    try {
      const message = await this.twilioClient.messages.create({
        body: notification.content,
        from: this.providerConfig.fromNumber,
        to: notification.recipient,
      });

      this.logger.info(`SMS sent successfully to ${notification.recipient}`, {
        sid: message.sid
      });

      return {
        id: notification.id,
        status: NotificationStatus.SENT,
        recipient: notification.recipient,
        type: notification.type,
        sentAt: new Date(),
        providerResponse: {
          sid: message.sid,
          status: message.status,
          errorCode: message.errorCode,
          errorMessage: message.errorMessage,
        },
      };

    } catch (error) {
      this.logger.error(`Error sending SMS to ${notification.recipient}:`, error);

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
