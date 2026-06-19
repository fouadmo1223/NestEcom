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
}
