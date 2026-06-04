import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCallLogDto {
  @IsOptional() @IsString()
  leadId?: string;

  @IsOptional() @IsString()
  clientId?: string;

  @IsOptional() @IsString()
  dealId?: string;

  @IsString()
  phone!: string;

  @IsOptional() @IsString()
  clientName?: string;

  @IsString()
  status!: string;

  @IsOptional() @IsNumber()
  durationSeconds?: number;

  @IsOptional() @IsString()
  summary?: string;

  @IsOptional() @IsString()
  objectionReason?: string;

  @IsOptional() @IsNumber()
  budgetDiscussed?: number;

  @IsOptional() @IsString()
  productInterest?: string;

  @IsOptional() @IsDateString()
  nextFollowupAt?: string;
}
