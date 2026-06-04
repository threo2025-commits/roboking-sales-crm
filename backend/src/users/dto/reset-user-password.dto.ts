import { IsOptional, IsString, MinLength } from 'class-validator';

export class ResetUserPasswordDto {
  @IsString()
  userId!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;

  @IsOptional()
  @IsString()
  resetRequestId?: string;
}
