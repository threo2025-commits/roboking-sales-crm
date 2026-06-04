import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateFollowupDto {
  @IsOptional()
  @IsString()
  leadId?: string;

  @IsOptional()
  @IsString()
  dealId?: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsDateString()
  dueAt!: string;
}
