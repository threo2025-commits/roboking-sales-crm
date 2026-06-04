import { IsEmail, IsOptional, IsString } from 'class-validator';

export class SendEmailDto {
  @IsOptional() @IsString()
  leadId?: string;

  @IsEmail()
  toEmail!: string;

  @IsOptional() @IsString()
  cc?: string;

  @IsString()
  subject!: string;

  @IsString()
  bodyHtml!: string;
}
