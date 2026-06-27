import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Order } from '../orders/order.entity';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly sender: string;

  constructor(private config: ConfigService) {
    const mailUser = this.config.getOrThrow<string>('MAIL_USER');
    const mailPort = Number(this.config.get('MAIL_PORT', 587));
    const mailFrom = this.config.get<string>('MAIL_FROM');

    this.sender = mailFrom ?? `"My App" <${mailUser}>`;
    this.transporter = nodemailer.createTransport({
      host: this.config.getOrThrow<string>('MAIL_HOST'),
      port: mailPort,
      secure: mailPort === 465,
      auth: {
        user: mailUser,
        pass: this.config.getOrThrow<string>('MAIL_PASS'),
      },
      tls: { rejectUnauthorized: false },
    });
  }

  async sendMail(
    to: string,
    subject: string,
    text: string,
    html?: string,
  ): Promise<nodemailer.SentMessageInfo> {
    try {
      return await this.transporter.sendMail({
        from: this.sender,
        to,
        subject,
        text,
        ...(html && { html }),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send email to ${to}: ${message}`);
      throw error;
    }
  }

  async sendVerificationOtp(
    to: string,
    username: string,
    code: string,
  ): Promise<nodemailer.SentMessageInfo> {
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
    return this.sendMail(
      to,
      'Your email verification code',
      `Your verification code is: ${code}`,
      html,
    );
  }

  async sendPasswordResetOtp(
    to: string,
    username: string,
    code: string,
  ): Promise<nodemailer.SentMessageInfo> {
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
    return this.sendMail(
      to,
      'Your password reset code',
      `Your password reset code is: ${code}`,
      html,
    );
  }

  async sendOrderConfirmation(
    to: string,
    order: Order,
  ): Promise<nodemailer.SentMessageInfo> {
    const rows = order.items
      .map(
        (item) => `<tr>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb">${item.productTitle}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center">${item.quantity}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">$${Number(item.unitPrice).toFixed(2)}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">$${Number(item.total).toFixed(2)}</td>
      </tr>`,
      )
      .join('');

    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px">
        <h2 style="color:#111827">Order Confirmed #${order.id}</h2>
        <p style="color:#374151">Thank you for your order! We'll notify you when it ships.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <thead>
            <tr style="background:#f3f4f6">
              <th style="padding:8px;text-align:left">Product</th>
              <th style="padding:8px;text-align:center">Qty</th>
              <th style="padding:8px;text-align:right">Unit Price</th>
              <th style="padding:8px;text-align:right">Total</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="text-align:right;margin-top:8px">
          <p style="color:#374151">Subtotal: <strong>$${Number(order.subtotal).toFixed(2)}</strong></p>
          ${order.discountAmount ? `<p style="color:#10b981">Discount: -$${Number(order.discountAmount).toFixed(2)}</p>` : ''}
          <p style="font-size:18px;font-weight:700;color:#111827">Total: $${Number(order.total).toFixed(2)}</p>
        </div>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>
        <p style="color:#6b7280;font-size:13px">
          Shipping to: ${order.shippingAddress.fullName}, ${order.shippingAddress.street},
          ${order.shippingAddress.city}, ${order.shippingAddress['country']}
        </p>
      </div>`;

    return this.sendMail(
      to,
      `Order Confirmed #${order.id}`,
      `Your order #${order.id} has been confirmed. Total: $${Number(order.total).toFixed(2)}`,
      html,
    );
  }

  async sendOrderShipped(
    to: string,
    order: Order,
  ): Promise<nodemailer.SentMessageInfo> {
    const tracking = order.trackingNumber
      ? `<p style="color:#374151">Tracking number: <strong>${order.trackingNumber}</strong></p>`
      : '';
    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px">
        <h2 style="color:#111827">Your order is on its way! 🚚</h2>
        <p style="color:#374151">Order <strong>#${order.id}</strong> has been shipped.</p>
        ${tracking}
        <p style="color:#374151">Shipping to: ${order.shippingAddress.fullName}, ${order.shippingAddress.street}, ${order.shippingAddress.city}</p>
      </div>`;

    return this.sendMail(
      to,
      `Order #${order.id} Shipped`,
      `Your order #${order.id} is on its way!`,
      html,
    );
  }
}
