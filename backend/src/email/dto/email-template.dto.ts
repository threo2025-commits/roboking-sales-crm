import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class EmailTemplateDto {
  @IsString()
  name!: string;
  @IsString()
  subject!: string;
  @IsString()
  bodyHtml!: string;
  @IsOptional() @IsBoolean()
  isActive?: boolean;
}
