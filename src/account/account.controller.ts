import {
  Controller, Get, Post, Patch, Put, Delete, Body, Req, UseGuards, Param, ParseIntPipe, HttpCode, HttpStatus
} from '@nestjs/common';
import { AccountService } from './account.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateProfileDto, ChangePasswordDto, CreateAddressDto, DeleteAccountDto } from './dto/account.dto';

@Controller('account')
@UseGuards(JwtAuthGuard)
export class AccountController {
  constructor(private readonly accountService: AccountService) { }

  @Get('profile')
  async getProfile(@Req() req) {
    const userId = Number(req.user?.id || req.user?.sub);
    return this.accountService.getProfile(userId);
  }

  @Patch('profile')
  async updateProfile(@Req() req, @Body() dto: UpdateProfileDto) {
    const userId = Number(req.user?.id || req.user?.sub);
    return this.accountService.updateProfile(userId, dto);
  }

  @Get('addresses')
  async getAddresses(@Req() req) {
    return this.accountService.getAddresses(req.user.id);
  }

  @Post('addresses')
  async createAddress(@Req() req, @Body() dto: CreateAddressDto) {
    return this.accountService.createAddress(req.user.sub, dto);
  }

  @Put('addresses/:id')
  async updateAddress(
    @Req() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateAddressDto
  ) {
    return this.accountService.updateAddress(req.user.sub, id, dto);
  }
  @Put('addresses/:id/default')
  async setDefaultAddress(@Req() req, @Param('id', ParseIntPipe) id: number) {
    return this.accountService.setDefaultAddress(req.user.id, id);
  }

  @Delete('addresses/:id')
  async removeAddress(@Req() req, @Param('id', ParseIntPipe) id: number) {
    return this.accountService.removeAddress(req.user.id, id);
  }

  @Get('payment-methods')
  async getPaymentMethods(@Req() req) {
    return this.accountService.getPaymentMethods(req.user.sub);
  }

  @Delete('payment-methods/:id')
  async removePaymentMethod(@Req() req, @Param('id', ParseIntPipe) id: number) {
    return this.accountService.removePaymentMethod(req.user.sub, id);
  }
  @Post('password')
  @HttpCode(HttpStatus.OK)
  async changePassword(@Req() req, @Body() dto: ChangePasswordDto) {
    return this.accountService.changePassword(req.user.sub, dto);
  }

  @Delete()
  @HttpCode(HttpStatus.OK) // Returns 200 OK instead of default 204 No Content so we can send a message
  async deleteAccount(@Req() req, @Body() dto: DeleteAccountDto) {

    return this.accountService.deleteAccount(req.user.sub, dto);
  }
}
