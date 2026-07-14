import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class GalleryService {
  constructor(private readonly db: DatabaseService) { }

  // Public — active items only
  async listPublic() {
    return this.db.gallery_items.findMany({
      where: { is_active: true },
      orderBy: { sort_order: 'asc' },
    });
  }

  // Admin — everything
  async listAdmin() {
    return this.db.gallery_items.findMany({
      orderBy: { sort_order: 'asc' },
    });
  }

  async findOne(id: number) {
    const item = await this.db.gallery_items.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`Gallery item ${id} not found.`);
    return item;
  }

  async create(data: { title: string; image_path: string }) {
    // Place new items at the end
    const last = await this.db.gallery_items.findFirst({
      orderBy: { sort_order: 'desc' },
      select: { sort_order: true },
    });

    return this.db.gallery_items.create({
      data: {
        title: data.title || 'Untitled',
        image_path: data.image_path,
        sort_order: (last?.sort_order ?? -1) + 1,
        is_active: true,
      },
    });
  }

  async update(id: number, data: { title?: string; image_path?: string; is_active?: boolean }) {
    await this.findOne(id);

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.image_path !== undefined) updateData.image_path = data.image_path;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;

    return this.db.gallery_items.update({ where: { id }, data: updateData });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.db.gallery_items.delete({ where: { id } });
  }

  // Persist a new ordering — payload is an array of ids in display order
  async reorder(ids: number[]) {
    await this.db.$transaction(
      ids.map((id, index) =>
        this.db.gallery_items.update({
          where: { id },
          data: { sort_order: index },
        }),
      ),
    );
    return this.listAdmin();
  }
}
