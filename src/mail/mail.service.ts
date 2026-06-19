import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailtrapClient } from 'mailtrap';

@Injectable()
export class MailService {
  private client: MailtrapClient;
  private sender = {
    email: 'hello@demomailtrap.co',
    name: 'My App',
  };

  constructor(private config: ConfigService) {
    this.client = new MailtrapClient({
      token: this.config.getOrThrow<string>('MAILTRAP_TOKEN'),
    });
  }

  async sendMail(to: string, subject: string, text: string, html?: string) {
    return this.client.send({
      from: this.sender,
      to: [{ email: to }],
      subject,
      text,
      ...(html && { html }),
      category: 'General',
    });
  }

  async sendVerificationOtp(to: string, username: string, code: string) {
    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px">
        <h2 style="color:#111827">Verify your email</h2>
        <p style="color:#374151">Hi <strong>${username}</strong>,</p>
        <p style="color:#374151">Use the code below to verify your email address. It expires in <strong>10 minutes</strong>.</p>
        <div style="font-size:36px;font-weight:700;letter-spacing:8px;text-align:center;padding:16px;background:#f3f4f6;border-radius:6px;color:#111827;margin:24px 0">
          ${code}
        </div>
        <p style="color:#6b7280;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `;
    return this.sendMail(to, 'Your email verification code', `Your verification code is: ${code}`, html);
  }

  async sendPasswordResetOtp(to: string, username: string, code: string) {
    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px">
        <h2 style="color:#111827">Reset your password</h2>
        <p style="color:#374151">Hi <strong>${username}</strong>,</p>
        <p style="color:#374151">Use the code below to reset your password. It expires in <strong>10 minutes</strong>.</p>
        <div style="font-size:36px;font-weight:700;letter-spacing:8px;text-align:center;padding:16px;background:#f3f4f6;border-radius:6px;color:#111827;margin:24px 0">
          ${code}
        </div>
        <p style="color:#6b7280;font-size:13px">If you didn't request a password reset, please ignore this email. Your password won't change.</p>
      </div>
    `;
    return this.sendMail(to, 'Your password reset code', `Your password reset code is: ${code}`, html);
  }
}
