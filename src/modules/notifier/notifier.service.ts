import nodemailer from 'nodemailer';
import { MailtrapTransport } from 'mailtrap';

export class NotifierService {
  private transporter: nodemailer.Transporter;
  
  private sender = {
    address: `noreply@${process.env.EMAIL_DOMAIN}`,
    name: 'GitHub Notifier',
  };

  constructor() {
    const token = process.env.MAILTRAP_TOKEN;

    if (!token) throw new Error('MAILTRAP_TOKEN is not defined');

    this.transporter = nodemailer.createTransport(
      MailtrapTransport({
        token: token,
      })
    );
  }

  async sendConfirmationEmail(email: string, repoName: string, token: string) {
    const unsubscribeLink = `${process.env.DOMAIN_URL}/api/unsubscribe/${token}`;
    const confirmLink = `${process.env.DOMAIN_URL}/confirm.html?token=${token}&repo=${encodeURIComponent(repoName)}`;
    
    try {
      await this.transporter.sendMail({
        from: this.sender,
        to: [email],
        subject: `Please confirm your subscription to ${repoName}`,
        html: `
          <h2>GitHub Release Notifier</h2>
          <p>You requested to subscribe to releases for <b>${repoName}</b>.</p>
          <p>Please confirm your subscription by clicking the link below:</p>
          <a href="${confirmLink}" style="padding: 10px 20px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">Confirm Subscription</a>
          <br><br>
          <p style="font-size: 12px; color: gray;">If you didn't request this, you can ignore this email or <a href="${unsubscribeLink}">unsubscribe</a>.</p>
        `,
      });
      console.log(`✉️ Confirmation email sent to ${email} for ${repoName}`);
    } catch (error) {
      console.error(`❌ Failed to send confirmation email to ${email}:`, error);
    }
  }

  async sendReleaseEmail(email: string, repoName: string, releaseTag: string, token: string) {
    const unsubscribeLink = `${process.env.DOMAIN_URL}/api/unsubscribe/${token}`;

    try {
      await this.transporter.sendMail({
        from: this.sender,
        to: [email],
        subject: `🚀 New release for ${repoName}: ${releaseTag}`,
        html: `
          <h2>New Release Detected!</h2>
          <p>Good news! A new version <b>${releaseTag}</b> has been released for <b>${repoName}</b>.</p>
          <p>Check it out on GitHub: <a href="https://github.com/${repoName}/releases/tag/${releaseTag}">View Release</a></p>
          <br><br>
          <p style="font-size: 12px; color: gray;">To stop receiving these notifications, click here to <a href="${unsubscribeLink}">unsubscribe</a>.</p>
        `,
      });
      console.log(`🚀 Release email sent to ${email} about ${repoName} ${releaseTag}`);
    } catch (error) {
      console.error(`❌ Failed to send release email to ${email}:`, error);
    }
  }
}