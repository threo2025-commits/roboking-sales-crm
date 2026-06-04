import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class CommitImportDto {
  @IsString()
  fileName!: string;

  @IsArray()
  rows!: Array<{ rowNumber: number; status: string; data: any; duplicate?: any; error?: string }>;

  @IsOptional()
  @IsBoolean()
  allowDuplicateOverride?: boolean;
}
