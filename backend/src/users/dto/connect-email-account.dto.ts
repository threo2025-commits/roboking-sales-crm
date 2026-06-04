import { IsEmail, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ConnectEmailAccountDto {
  @IsString()
  userId!: string;

  @IsEmail()
  emailAddress!: string;

  @IsOptional()
  @IsString()
  smtpHost?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  smtpPort?: number;

  @IsOptional()
  @IsString()
  imapHost?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  imapPort?: number;

  @IsString()
  password!: string;
}
