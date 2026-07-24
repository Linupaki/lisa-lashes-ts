import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { UpdateBusinessProfileDto } from './dto/update-business-profile.dto';
import { RolesGuard, Roles } from 'src/auth/roles.guard';
import { user_roles } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) { }


  @Get()
  getProfile() {
    return this.profileService.getProfile();
  }

  @Patch()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin)
  updateProfile(@Body() dto: UpdateBusinessProfileDto) {
    return this.profileService.updateProfile(dto);
  }
}
