// dto/account.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsBoolean, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  first_name?: string;

  @IsString()
  @IsOptional()
  last_name?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string; // Fallback profile email/address mapping

  @IsString()
  @IsOptional()
  default_payment_method?: string;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  current_password!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  new_password!: string;
}

export class CreateAddressDto {
  @IsString()
  @IsOptional()
  label?: string;

  @IsString()
  @IsNotEmpty()
  first_name!: string;

  @IsString()
  @IsNotEmpty()
  last_name!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsString()
  @IsNotEmpty()
  address1!: string;

  @IsString()
  @IsOptional()
  address2?: string;

  @IsString()
  @IsNotEmpty()
  city!: string;

  @IsString()
  @IsOptional()
  eircode?: string;

  @IsBoolean()
  @IsOptional()
  is_default?: boolean;
}

export class DeleteAccountDto {
  @IsString()
  @IsNotEmpty()
  password!: string;
}
