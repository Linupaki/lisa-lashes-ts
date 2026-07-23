import { IsOptional, IsString, IsEmail, IsUrl } from 'class-validator';

export class UpdateBusinessProfileDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() owner_name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() website?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() instagram?: string;
  @IsOptional() @IsString() about?: string;
}
