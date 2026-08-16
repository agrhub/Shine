import nodemailer from 'nodemailer';
import { Logger } from '../utils/logger.js';

export class EmailService {
  private transporter: nodemailer.Transporter | undefined;
  private fromEmail: string | undefined;
  
  constructor() {
    const host = process.env.SMTP_HOST;
    
    if (host) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        }
      });
      Logger.info('[EmailService] Configured with real SMTP');
      this.fromEmail = (process.env.SMTP_NAME || "Shine Studio") + " <" + (process.env.SMTP_USER || "") + ">";
    } else {
      Logger.info('[EmailService] Configured with mock Ethereal SMTP (Test Mode)');
    }
  }

  public async sendPasswordRecovery(email: string, resetToken: string) {
    const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    const mailOptions = {
      from: this.fromEmail,
      to: email,
      subject: 'Password Recovery - Shine Studio',
      text: `Hello, you requested a password reset. Click the following link: ${resetUrl}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Password Recovery</h2>
          <p>Hello,</p>
          <p>You recently requested to reset your password for your Shine Studio account.</p>
          <p><a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
          <p>If you didn't request this, you can safely ignore this email.</p>
        </div>
      `
    };
    
    await this.sendMail(mailOptions);
  }

  public async sendWelcomeEmail(email: string, name: string) {
    const mailOptions = {
      from: this.fromEmail,
      to: email,
      subject: 'Welcome to Shine Studio!',
      text: `Hello ${name}, welcome to Shine Studio! Get ready to create amazing viral micro-dramas.`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Welcome, ${name}!</h2>
          <p>We're thrilled to have you onboard.</p>
          <p>Shine Studio is the premier AI platform for crafting high-retention vertical videos.</p>
          <p>Get started now and create your first episode!</p>
        </div>
      `
    };
    
    await this.sendMail(mailOptions);
  }

  public async sendUserNotification(email: string, type: 'credit' | 'balance' | 'share' | 'render' | 'publish', metadata: any) {
    const subjects = {
      'credit': 'Credits Updated',
      'balance': 'Low Balance Warning',
      'share': 'A Project Was Shared With You',
      'render': 'Your Episode Finished Rendering',
      'publish': 'Your Video is Live!'
    };
    
    const mailOptions = {
      from: this.fromEmail,
      to: email,
      subject: `${subjects[type]} - Shine Studio`,
      text: `Notification: ${type} - ${JSON.stringify(metadata)}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>${subjects[type]}</h2>
          <pre>${JSON.stringify(metadata, null, 2)}</pre>
        </div>
      `
    };
    
    await this.sendMail(mailOptions);
  }

  public async sendAdminSystemAlert(serviceName: string, errorMessage: string) {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@shinestudio.app';
    const mailOptions = {
      from: this.fromEmail,
      to: adminEmail,
      subject: `[CRITICAL ALERT] ${serviceName} Failure`,
      text: `Service ${serviceName} encountered a critical error: ${errorMessage}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #d9534f;">Critical System Alert</h2>
          <p><strong>Service:</strong> ${serviceName}</p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
          <p><strong>Error Message:</strong></p>
          <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #d9534f; margin: 10px 0;">
            <pre style="margin: 0; white-space: pre-wrap;">${errorMessage}</pre>
          </div>
          <p>Please check the server logs (Grafana/OpenTelemetry) immediately.</p>
        </div>
      `
    };
    
    await this.sendMail(mailOptions);
  }

  private async sendMail(options: nodemailer.SendMailOptions) {
    try {
      if(!this.transporter){
        Logger.warn(`[EmailService] SMTP not configured, skip send to ${options.to}`);
        return;
      }
      const info = await this.transporter.sendMail(options);
      Logger.info(`[EmailService] Sent email to ${options.to}. MessageId: ${info.messageId}`);
      if (info.messageId && !process.env.SMTP_HOST) {
        Logger.info(`[EmailService] Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
      }
    } catch (err: any) {
      Logger.error(`[EmailService] Failed to send email to ${options.to}: ${err.message}`);
    }
  }
}

export const emailService = new EmailService();
