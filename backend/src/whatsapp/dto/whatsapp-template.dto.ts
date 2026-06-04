import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class WhatsappTemplateDto {
  @IsString()
  name!: string;
  @IsString()
  message!: string;
  @IsOptional() @IsBoolean()
  isActive?: boolean;
}
