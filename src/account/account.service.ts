// account.service.ts
import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { UpdateProfileDto, ChangePasswordDto, CreateAddressDto, DeleteAccountDto } from './dto/account.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AccountService {
  constructor(private readonly prisma: DatabaseService) { }

  // ── PROFILE ─────────────────────────────────────────────────────────────────

  async getProfile(userId: number) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        phone: true,
        address: true, // This maps to the generic address string field on your users model
        role: true,
      },
    });
    if (!user) throw new NotFoundException('User profile not found.');
    return user;
  }

  async updateProfile(userId: number, dto: UpdateProfileDto) {
    return this.prisma.users.update({
      where: { id: userId },
      data: {
        first_name: dto.first_name,
        last_name: dto.last_name,
        phone: dto.phone,
        address: dto.address, // Keeps the fallback profile address string updated
      },
      select: {
        first_name: true,
        last_name: true,
        phone: true,
        address: true,
      },
    });
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.prisma.users.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User profile not found.');

    // Validates against your existing "password_hash" table column
    const isMatch = await bcrypt.compare(dto.current_password, user.password_hash);
    if (!isMatch) {
      throw new BadRequestException({ message: 'The current password you entered is incorrect.' });
    }

    const salt = await bcrypt.genSalt(10);
    const newHashedPassword = await bcrypt.hash(dto.new_password, salt);

    await this.prisma.users.update({
      where: { id: userId },
      data: { password_hash: newHashedPassword },
    });

    return { message: 'Password updated successfully' };
  }

  // ── SAVED CARDS ─────────────────────────────────────────────────────────────

  async getPaymentMethods(userId: number) {
    return this.prisma.payment_methods.findMany({
      where: { user_id: userId },
      orderBy: { is_default: 'desc' },
    });
  }

  async removePaymentMethod(userId: number, cardId: number) {
    const card = await this.prisma.payment_methods.findUnique({ where: { id: cardId } });
    if (!card) throw new NotFoundException('Payment method not found.');
    if (card.user_id !== userId) throw new ForbiddenException('You do not own this card details entry.');

    await this.prisma.payment_methods.delete({ where: { id: cardId } });
    return { success: true };
  }

  // ── SHIPPING ADDRESSES ──────────────────────────────────────────────────────

  async getAddresses(userId: number) {
    return this.prisma.addresses.findMany({
      where: { user_id: userId },
      orderBy: [
        { is_default: 'desc' },
        { created_at: 'desc' }
      ],
    });
  }

  async createAddress(userId: number, dto: CreateAddressDto) {
    return this.prisma.$transaction(async (tx) => {
      if (dto.is_default) {
        await tx.addresses.updateMany({
          where: { user_id: userId, is_default: true },
          data: { is_default: false },
        });
      }

      const count = await tx.addresses.count({ where: { user_id: userId } });
      const shouldBeDefault = count === 0 ? true : dto.is_default;

      return tx.addresses.create({
        data: {
          ...dto,
          user_id: userId,
          is_default: shouldBeDefault,
        },
      });
    });
  }

  async updateAddress(userId: number, addressId: number, dto: CreateAddressDto) {
    const address = await this.prisma.addresses.findUnique({ where: { id: addressId } });
    if (!address) throw new NotFoundException('Address entity not found.');
    if (address.user_id !== userId) throw new ForbiddenException('You do not own this address entry.');

    return this.prisma.$transaction(async (tx) => {
      if (dto.is_default) {
        await tx.addresses.updateMany({
          where: { user_id: userId, is_default: true, id: { not: addressId } },
          data: { is_default: false },
        });
      }

      return tx.addresses.update({
        where: { id: addressId },
        data: dto,
      });
    });
  }

  async setDefaultAddress(userId: number, addressId: number) {
    const address = await this.prisma.addresses.findUnique({ where: { id: addressId } });
    if (!address) throw new NotFoundException('Address entity not found.');
    if (address.user_id !== userId) throw new ForbiddenException('You do not own this address entry.');

    await this.prisma.$transaction([
      this.prisma.addresses.updateMany({
        where: { user_id: userId, is_default: true },
        data: { is_default: false },
      }),
      this.prisma.addresses.update({
        where: { id: addressId },
        data: { is_default: true },
      }),
    ]);

    return { success: true };
  }

  async removeAddress(userId: number, addressId: number) {
    const address = await this.prisma.addresses.findUnique({ where: { id: addressId } });
    if (!address) throw new NotFoundException('Address entity not found.');
    if (address.user_id !== userId) throw new ForbiddenException('Access denied.');

    await this.prisma.addresses.delete({ where: { id: addressId } });
    return { success: true };
  }

  async deleteAccount(userId: number, dto: DeleteAccountDto) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User account not found.');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password_hash);
    if (!isMatch) {
      throw new BadRequestException('Incorrect password. Account deletion canceled.');
    }

    await this.prisma.$transaction(async (tx) => {
      // deletes all the data about user, chosen in code(For logging purposes all the data except reviews saved)
      await tx.reviews.deleteMany({ where: { user_id: userId } });
      // Finally, delete the user (automatic cascading for addresses, cards, carts, etc.)
      await tx.users.delete({
        where: { id: userId },
      });
    });

    return { message: 'Your account and all associated data have been permanently deleted.' };
  }
}

