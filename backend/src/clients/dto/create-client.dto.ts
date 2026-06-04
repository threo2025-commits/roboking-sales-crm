import { IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateClientDto {
  @IsString()
  organization!: string;

  @IsOptional() @IsString()
  category?: string;
  @IsOptional() @IsString()
  city?: string;
  @IsOptional() @IsString()
  state?: string;
  @IsOptional() @IsString()
  source?: string;
  @IsOptional() @IsString()
  website?: string;
  @IsOptional() @IsString()
  notes?: string;

  @IsOptional() @IsString()
  contactName?: string;
  @IsOptional() @IsString()
  designation?: string;
  @IsOptional() @IsString()
  phone?: string;
  @IsOptional() @IsString()
  whatsapp?: string;
  @IsOptional() @IsEmail()
  email?: string;
}
