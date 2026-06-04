import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateDealDto {
  @IsString()
  title!: string;
  @IsOptional() @IsString()
  leadId?: string;
  @IsOptional() @IsString()
  clientId?: string;
  @IsOptional() @IsString()
  assignedToId?: string;
  @IsOptional() @IsNumber()
  expectedValue?: number;
  @IsOptional() @IsNumber()
  probability?: number;
  @IsOptional() @IsDateString()
  nextFollowupAt?: string;
}
