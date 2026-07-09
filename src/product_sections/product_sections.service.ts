import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import sanitizeHtml from 'sanitize-html';
import { DatabaseService } from '../database/database.service';

export type ProductSectionDto = {
  title?: string;
  slug?: string | null;
  content_html?: string;
  sort_order?: number;
  is_active?: boolean;
};

@Injectable()
export class ProductSectionsService {
  constructor(private readonly db: DatabaseService) {}

  private sanitize(html: string) {
    return sanitizeHtml(html || '', {
      allowedTags: [
        ...sanitizeHtml.defaults.allowedTags,
        'img',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'span',
      ],
      allowedAttributes: {
        a: ['href', 'name', 'target', 'rel'],
        img: ['src', 'alt', 'title', 'width', 'height'],
        '*': ['style'],
      },
      allowedSchemes: ['http', 'https', 'data', 'mailto', 'tel'],
      allowedSchemesAppliedToAttributes: ['href', 'src'],
      transformTags: {
        a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }, true),
      },
    });
  }

  async listPublic(productId: number) {
    return this.db.product_sections.findMany({
      where: { product_id: productId, is_active: true },
      orderBy: [{ sort_order: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        title: true,
        slug: true,
        content_html: true,
        sort_order: true,
      },
    });
  }

  async listAdmin(productId: number) {
    return this.db.product_sections.findMany({
      where: { product_id: productId },
      orderBy: [{ sort_order: 'asc' }, { id: 'asc' }],
    });
  }

  async create(productId: number, dto: ProductSectionDto) {
    const title = (dto.title || '').trim();
    if (!title) throw new BadRequestException('title is required');

    const content_html = this.sanitize(dto.content_html || '');

    let sort_order: number;
    if (dto.sort_order === 0 || dto.sort_order) {
      sort_order = Number(dto.sort_order);
    } else {
      const last = await this.db.product_sections.findFirst({
        where: { product_id: productId },
        orderBy: [{ sort_order: 'desc' }, { id: 'desc' }],
        select: { sort_order: true },
      });
      sort_order = (last?.sort_order ?? 0) + 10;
    }

    return this.db.product_sections.create({
      data: {
        product_id: productId,
        title,
        slug: dto.slug === undefined ? null : dto.slug,
        content_html,
        sort_order,
        is_active: dto.is_active ?? true,
      },
    });
  }

  async update(id: number, dto: ProductSectionDto) {
    const existing = await this.db.product_sections.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('section not found');

    const data: any = {};
    if (dto.title !== undefined) {
      const title = (dto.title || '').trim();
      if (!title) throw new BadRequestException('title cannot be empty');
      data.title = title;
    }
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.content_html !== undefined) data.content_html = this.sanitize(dto.content_html);
    if (dto.sort_order !== undefined) data.sort_order = Number(dto.sort_order);
    if (dto.is_active !== undefined) data.is_active = dto.is_active;

    return this.db.product_sections.update({ where: { id }, data });
  }

  async remove(id: number) {
    const existing = await this.db.product_sections.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('section not found');
    return this.db.product_sections.delete({ where: { id } });
  }

  async reorder(productId: number, orderedIds: number[]) {
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      throw new BadRequestException('orderedIds must be a non-empty array');
    }

    const existing = await this.db.product_sections.findMany({
      where: { product_id: productId },
      select: { id: true },
    });
    const existingSet = new Set(existing.map(s => s.id));
    for (const id of orderedIds) {
      if (!existingSet.has(id)) {
        throw new BadRequestException(`section ${id} does not belong to product ${productId}`);
      }
    }

    await this.db.$transaction(
      orderedIds.map((id, idx) =>
        this.db.product_sections.update({
          where: { id },
          data: { sort_order: (idx + 1) * 10 },
        }),
      ),
    );

    return this.listAdmin(productId);
  }
}
