import { LeadStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateDealStageDto {
  @IsString()
  dealId!: string;

  @IsEnum(LeadStatus)
  stage!: LeadStatus;

  @IsOptional()
  @IsString()
  note?: string;
}
