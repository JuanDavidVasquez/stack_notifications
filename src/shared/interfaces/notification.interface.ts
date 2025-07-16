import { NotificationStatus, NotificationType, Priority } from "../enums/notification-type.enum";

export interface NotificationPayload {
  id?: string;
  type: NotificationType;
  recipient: string | string[];
  template?: string;
  subject?: string;
  content: string | Record<string, any>;
  data?: Record<string, any>;
  language?: string;
  priority?: Priority;
  scheduledAt?: Date;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

export interface NotificationResult {
  id: string;
  status: NotificationStatus;
  recipient: string;
  type: NotificationType;
  sentAt?: Date;
  deliveredAt?: Date;
  failureReason?: string;
  providerResponse?: any;
  metadata?: Record<string, any>;
}

export interface BulkNotificationRequest {
  template: string;
  type: NotificationType;
  recipients: Array<{
    recipient: string;
    data?: Record<string, any>;
    language?: string;
  }>;
  globalData?: Record<string, any>;
  priority?: Priority;
  scheduledAt?: Date;
}