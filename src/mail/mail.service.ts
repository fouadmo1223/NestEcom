import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { CustomerOrder } from '../orders/entities/customer-order.entity';
import type { VendorOrder } from '../orders/entities/vendor-order.entity';

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

  async sendCustomerOrderConfirmation(
    to: string,
    order: CustomerOrder,
  ): Promise<nodemailer.SentMessageInfo> {
    const currency = order.currency || 'EGP';
    const money = (n: number | string) => `${currency} ${Number(n).toFixed(2)}`;

    const vendorSections = (order.vendorOrders ?? [])
      .map((vo) => {
        const rows = (vo.items ?? [])
          .map(
            (item) => `<tr>
              <td style="padding:8px;border-bottom:1px solid #e5e7eb">${item.productTitle}</td>
              <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center">${item.quantity}</td>
              <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">${money(item.lineTotal)}</td>
            </tr>`,
          )
          .join('');
        return `<p style="color:#111827;font-weight:600;margin:16px 0 4px">Shipment ${vo.id}</p>
          <table style="width:100%;border-collapse:collapse"><tbody>${rows}</tbody></table>`;
      })
      .join('');

    const addr = order.shippingAddress as Record<string, string>;
    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px">
        <h2 style="color:#111827">Order confirmed &middot; #${order.id}</h2>
        <p style="color:#374151">Thanks for your order. Each store ships its items separately and you'll be updated per shipment.</p>
        ${vendorSections}
        <div style="text-align:right;margin-top:16px">
          <p style="color:#374151">Subtotal: <strong>${money(order.subtotal)}</strong></p>
          ${order.discountTotal ? `<p style="color:#10b981">Discount: -${money(order.discountTotal)}</p>` : ''}
          <p style="font-size:18px;font-weight:700;color:#111827">Total (Cash on Delivery): ${money(order.grandTotal)}</p>
        </div>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>
        <p style="color:#6b7280;font-size:13px">
          Shipping to: ${addr.fullName}, ${addr.street}, ${addr.city}, ${addr.country}
        </p>
      </div>`;

    return this.sendMail(
      to,
      `Order confirmed #${order.id}`,
      `Your order #${order.id} is confirmed. Total (COD): ${money(order.grandTotal)}`,
      html,
    );
  }

  async sendVendorOrderShipped(
    to: string,
    customerOrderId: number,
    vo: VendorOrder,
  ): Promise<nodemailer.SentMessageInfo> {
    const tracking = vo.trackingNumber
      ? `<p style="color:#374151">Tracking: <strong>${vo.trackingNumber}</strong>${
          vo.carrier ? ` (${vo.carrier})` : ''
        }</p>`
      : '';
    const html = this.shell(
      'A shipment is on its way 🚚',
      `<p style="color:#374151">Part of your order <strong>#${customerOrderId}</strong> has shipped.</p>${tracking}`,
    );
    return this.sendMail(
      to,
      `Order #${customerOrderId}: a shipment is on its way`,
      `Part of your order #${customerOrderId} has shipped.`,
      html,
    );
  }

  // ─── Vendor lifecycle ──────────────────────────────────────────────────

  private shell(title: string, body: string): string {
    return `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px">
        <h2 style="color:#111827">${title}</h2>
        ${body}
      </div>`;
  }

  async sendVendorApplicationReceived(
    to: string,
    username: string,
    storeName: string,
  ): Promise<nodemailer.SentMessageInfo> {
    const html = this.shell(
      'Application received',
      `<p style="color:#374151">Hi <strong>${username}</strong>,</p>
       <p style="color:#374151">We've received your application to open <strong>${storeName}</strong>.
       Our team will review it and get back to you by email.</p>`,
    );
    return this.sendMail(
      to,
      'We received your vendor application',
      `We received your application to open ${storeName}. We'll review it and email you.`,
      html,
    );
  }

  async sendVendorApproved(
    to: string,
    username: string,
    storeName: string,
  ): Promise<nodemailer.SentMessageInfo> {
    const html = this.shell(
      'Your store is approved 🎉',
      `<p style="color:#374151">Hi <strong>${username}</strong>,</p>
       <p style="color:#374151"><strong>${storeName}</strong> is live. Sign in to the operations
       dashboard to set up your storefront and add your first products.</p>`,
    );
    return this.sendMail(
      to,
      `${storeName} is approved`,
      `${storeName} is approved. Sign in to the dashboard to get started.`,
      html,
    );
  }

  async sendVendorRejected(
    to: string,
    username: string,
    reason: string,
  ): Promise<nodemailer.SentMessageInfo> {
    const html = this.shell(
      'About your vendor application',
      `<p style="color:#374151">Hi <strong>${username}</strong>,</p>
       <p style="color:#374151">We're unable to approve your application at this time.</p>
       <p style="color:#374151"><strong>Reason:</strong> ${reason}</p>
       <p style="color:#6b7280;font-size:13px">You're welcome to apply again once addressed.</p>`,
    );
    return this.sendMail(
      to,
      'Update on your vendor application',
      `We're unable to approve your application at this time. Reason: ${reason}`,
      html,
    );
  }
}
