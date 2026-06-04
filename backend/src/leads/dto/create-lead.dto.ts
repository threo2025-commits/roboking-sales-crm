import { LeadStatus, Priority } from '@prisma/client';
import { IsDateString, IsEmail, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateLeadDto {
  @IsString()
  organization!: string;

  @IsOptional() @IsString()
  contactName?: string;

  @IsOptional() @IsString()
  phone?: string;

  @IsOptional() @IsString()
  whatsapp?: string;

  @IsOptional() @IsEmail()
  email?: string;

  @IsOptional() @IsString()
  city?: string;

  @IsOptional() @IsString()
  state?: string;

  @IsOptional() @IsString()
  requirement?: string;

  @IsOptional() @IsString()
  source?: string;

  @IsOptional() @IsEnum(Priority)
  priority?: Priority;

  @IsOptional() @IsEnum(LeadStatus)
  status?: LeadStatus;

  @IsOptional() @IsNumber()
  expectedValue?: number;

  @IsOptional() @IsString()
  assignedToId?: string;

  @IsOptional() @IsDateString()
  nextFollowupAt?: string;

  @IsOptional()
  allowDuplicateOverride?: boolean;
}
