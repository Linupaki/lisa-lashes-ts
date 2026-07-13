import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import sanitizeHtml from 'sanitize-html';
import { DatabaseService } from '../database/database.service';

export type AboutSectionDto = {
  title?: string;
  slug?: string | null;
  content_html?: string;
  sort_order?: number;
  is_active?: boolean;
};

@Injectable()
export class AboutSectionsService {
  constructor(private readonly db: DatabaseService) { }

  private sanitize(html: string) {
    return sanitizeHtml(html || '', {
      allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'div', 'p', 'br'],
      allowedAttributes: {
        a: ['href', 'name', 'target', 'rel'],
        img: ['src', 'alt', 'title', 'width', 'height'],
        '*': ['style', 'class'],
      },
    });
  }

  async listPublic() {
    return this.db.about_blocks.findMany({
      where: { is_active: true },
      orderBy: [{ sort_order: 'asc' }, { id: 'asc' }],
    });
  }

  async listAdmin() {
    return this.db.about_blocks.findMany({
      orderBy: [{ sort_order: 'asc' }, { id: 'asc' }],
    });
  }

  async create(dto?: AboutSectionDto) {
    const payload = dto || {};
    const title = (payload.title || 'New About Section').trim();
    const content_html = this.sanitize(payload.content_html || '');

    let sort_order: number;
    if (payload.sort_order === 0 || payload.sort_order) {
      sort_order = Number(payload.sort_order);
    } else {
      const last = await this.db.about_blocks.findFirst({
        orderBy: [{ sort_order: 'desc' }, { id: 'desc' }],
        select: { sort_order: true },
      });
      sort_order = (last?.sort_order ?? 0) + 10;
    }

    return this.db.about_blocks.create({
      data: {
        title,
        slug: payload.slug === undefined ? null : payload.slug,
        content_html,
        sort_order,
        is_active: payload.is_active ?? true,
      },
    });
  }

  async saveBulk(blocks: any[]) {
    const results = [];

    for (const item of blocks) {
      const title = String(item.title || 'Untitled Section').trim();
      const content_html = this.sanitize(item.body || item.content_html || '');
      const slug = item.slug || null;
      const sort_order = Number(item.sort_order) || 0;
      const is_active = item.is_active !== false;

      const type = item.type || 'intro';
      const body = item.body || '[]';

      if (item.id && !String(item.id).startsWith('temp-')) {
        const idNum = Number(item.id);

        // Fetch current record state first to preserve existing images across bulk text saves
        const currentBlock = await this.db.about_blocks.findUnique({ where: { id: idNum } });
        const image_path = item.image_path !== undefined ? item.image_path : (currentBlock?.image_path || null);

        results.push(
          await this.db.about_blocks.update({
            where: { id: idNum },
            data: {
              title,
              slug,
              content_html,
              sort_order,
              is_active,
              type,
              body,
              image_path,
            },
          }),
        );
      } else {
        const image_path = item.image_path || null;
        results.push(
          await this.db.about_blocks.create({
            data: {
              title,
              slug,
              content_html,
              sort_order,
              is_active,
              type,
              body,
              image_path,
            },
          }),
        );
      }
    }
    return results;
  }

  async update(id: number, dto: AboutSectionDto) {
    const existing = await this.db.about_blocks.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('section not found');

    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.content_html !== undefined) data.content_html = this.sanitize(dto.content_html);
    if (dto.sort_order !== undefined) data.sort_order = Number(dto.sort_order);
    if (dto.is_active !== undefined) data.is_active = dto.is_active;

    return this.db.about_blocks.update({ where: { id }, data });
  }

  async remove(id: number) {
    const existing = await this.db.about_blocks.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('section not found');
    return this.db.about_blocks.delete({ where: { id } });
  }

  async updateImageField(id: number, filename: string) {
    const existing = await this.db.about_blocks.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Block section not found');

    return this.db.about_blocks.update({
      where: { id },
      data: { image_path: filename },
    });
  }
}
