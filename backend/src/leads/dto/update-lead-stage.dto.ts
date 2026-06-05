import { LeadStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateLeadStageDto {
  @IsEnum(LeadStatus)
  status!: LeadStatus;

  @IsOptional()
  @IsDateString()
  nextFollowupAt?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
