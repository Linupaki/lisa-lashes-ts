import { Injectable } from '@nestjs/common';
import { UpdateBusinessProfileDto } from './dto/update-business-profile.dto';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class ProfileService {
  constructor(private readonly db: DatabaseService) {

  }
  async getProfile() {
    const profile = await this.db.business_profile.findFirst();
    return profile || {};
  }

  async updateProfile(dto: UpdateBusinessProfileDto) {
    const existing = await this.db.business_profile.findFirst();

    if (existing) {
      return this.db.business_profile.update({
        where: { id: existing.id },
        data: dto,
      });
    }
    return this.db.business_profile.create({ data: dto as any });
  }

}
