import { Priority } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  title!: string;

  @IsOptional() @IsString()
  description?: string;
  @IsOptional() @IsString()
  assignedToId?: string;
  @IsOptional() @IsString()
  leadId?: string;
  @IsOptional() @IsString()
  dealId?: string;
  @IsOptional() @IsEnum(Priority)
  priority?: Priority;
  @IsOptional() @IsDateString()
  dueAt?: string;
}
