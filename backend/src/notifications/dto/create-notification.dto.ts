import { IsOptional, IsString } from 'class-validator';

export class CreateNotificationDto {
  @IsOptional() @IsString() userId?: string;
  @IsString() title!: string;
  @IsOptional() @IsString() body?: string;
}
