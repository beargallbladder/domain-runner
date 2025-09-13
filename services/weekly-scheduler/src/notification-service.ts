import { Logger } from 'winston';
import axios from 'axios';
import { ProcessingMode, NotificationPayload } from './types';

export class NotificationService {
  private slackWebhook?: string;
  private emailRecipients: string[];
  
  constructor(private logger: Logger) {
    this.slackWebhook = process.env.SLACK_WEBHOOK_URL;
    this.emailRecipients = process.env.ALERT_EMAIL_RECIPIENTS?.split(',') || [];
  }

  async sendProcessingStarted(mode: ProcessingMode, totalDomains: number): Promise<void> {
    const payload: NotificationPayload = {
      type: 'started',
      mode,
      timestamp: new Date(),
      data: { total: totalDomains }
    };

    const message = `🚀 Domain processing started\n` +
      `Mode: ${mode}\n` +
      `Total domains: ${totalDomains.toLocaleString()}\n` +
      `Time: ${new Date().toLocaleString()}`;

    await this.sendNotification(message, payload, 'good');
  }

  async sendProcessingCompleted(
    mode: ProcessingMode, 
    processed: number, 
    failed: number, 
    durationMs: number
  ): Promise<void> {
    const payload: NotificationPayload = {
      type: 'completed',
      mode,
      timestamp: new Date(),
      data: { 
        processed, 
        failed, 
        duration: durationMs 
      }
    };

    const durationMinutes = Math.round(durationMs / 60000);
    const successRate = processed > 0 ? ((processed - failed) / processed * 100).toFixed(1) : '0';
    
    const message = `✅ Domain processing completed\n` +
      `Mode: ${mode}\n` +
      `Processed: ${processed.toLocaleString()}\n` +
      `Failed: ${failed.toLocaleString()}\n` +
      `Success rate: ${successRate}%\n` +
      `Duration: ${durationMinutes} minutes\n` +
      `Time: ${new Date().toLocaleString()}`;

    await this.sendNotification(message, payload, failed > 0 ? 'warning' : 'good');
  }

  async sendProcessingFailed(mode: ProcessingMode, error: string): Promise<void> {
    const payload: NotificationPayload = {
      type: 'failed',
      mode,
      timestamp: new Date(),
      data: { error }
    };

    const message = `❌ Domain processing failed\n` +
      `Mode: ${mode}\n` +
      `Error: ${error}\n` +
      `Time: ${new Date().toLocaleString()}`;

    await this.sendNotification(message, payload, 'danger');
  }

  async sendProgressUpdate(
    jobId: string,
    mode: ProcessingMode, 
    processed: number, 
    total: number
  ): Promise<void> {
    const percentage = Math.round((processed / total) * 100);
    
    const payload: NotificationPayload = {
      type: 'progress',
      mode,
      jobId,
      timestamp: new Date(),
      data: { 
        processed, 
        total 
      }
    };

    const message = `📊 Processing progress update\n` +
      `Job: ${jobId}\n` +
      `Mode: ${mode}\n` +
      `Progress: ${processed.toLocaleString()} / ${total.toLocaleString()} (${percentage}%)\n` +
      `Time: ${new Date().toLocaleString()}`;

    // Only send progress updates at significant milestones (25%, 50%, 75%)
    if (percentage === 25 || percentage === 50 || percentage === 75) {
      await this.sendNotification(message, payload, 'good');
    }
  }

  async sendLongRunningAlert(
    jobId: string,
    mode: ProcessingMode, 
    durationMinutes: number
  ): Promise<void> {
    const message = `⚠️ Long-running job alert\n` +
      `Job: ${jobId}\n` +
      `Mode: ${mode}\n` +
      `Duration: ${durationMinutes} minutes\n` +
      `This job has been running longer than expected.\n` +
      `Time: ${new Date().toLocaleString()}`;

    await this.sendNotification(message, { 
      type: 'progress',
      mode,
      jobId,
      timestamp: new Date(),
      data: { duration: durationMinutes * 60000 }
    }, 'warning');
  }

  async sendHealthAlert(status: 'degraded' | 'unhealthy', details: string): Promise<void> {
    const emoji = status === 'degraded' ? '⚠️' : '🚨';
    const message = `${emoji} Scheduler health alert\n` +
      `Status: ${status}\n` +
      `Details: ${details}\n` +
      `Time: ${new Date().toLocaleString()}`;

    await this.sendNotification(message, {
      type: 'failed',
      mode: 'full',
      timestamp: new Date(),
      data: { error: details }
    }, 'danger');
  }

  private async sendNotification(
    message: string, 
    payload: NotificationPayload,
    color: 'good' | 'warning' | 'danger' = 'good'
  ): Promise<void> {
    try {
      // Send to Slack if configured
      if (this.slackWebhook) {
        await this.sendSlackNotification(message, color);
      }

      // Log the notification
      this.logger.info('Notification sent', { 
        type: payload.type, 
        mode: payload.mode,
        data: payload.data 
      });

      // Here you could also implement email notifications, PagerDuty, etc.
      // For now, we'll just log that we would send emails
      if (this.emailRecipients.length > 0) {
        this.logger.info('Would send email notification', {
          recipients: this.emailRecipients,
          subject: `Domain Processing: ${payload.type}`,
          message
        });
      }

    } catch (error) {
      this.logger.error('Failed to send notification:', error);
      // Don't throw - notifications should not break the main process
    }
  }

  private async sendSlackNotification(
    message: string, 
    color: 'good' | 'warning' | 'danger'
  ): Promise<void> {
    if (!this.slackWebhook) return;

    try {
      await axios.post(this.slackWebhook, {
        attachments: [{
          color,
          text: message,
          footer: 'Domain Runner Scheduler',
          ts: Math.floor(Date.now() / 1000)
        }]
      });
    } catch (error) {
      this.logger.error('Failed to send Slack notification:', error);
    }
  }
}