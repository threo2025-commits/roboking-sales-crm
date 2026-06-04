import { IsOptional, IsString } from 'class-validator';

export class RequestPasswordResetDto {
  @IsString()
  loginId!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
