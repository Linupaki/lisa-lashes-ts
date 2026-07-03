import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ReviewsService {
  constructor(private readonly db: DatabaseService) { }

  private deleteFileFromDisk(fileName: string | null | undefined) {
    if (!fileName) return;
    const absoluteFilePath = path.join(
      process.cwd(),
      'front_admin',
      'uploads',
      'reviews',
      fileName,
    );
    try {
      if (fs.existsSync(absoluteFilePath)) {
        fs.unlinkSync(absoluteFilePath);
        console.log(`[Review Cleanup] Removed: ${fileName}`);
      }
    } catch (error) {
      console.error(`[Review Cleanup] Failed to remove: ${absoluteFilePath}`, error);
    }
  }

  private readonly includeRelations = {
    user: {
      select: { id: true, first_name: true, last_name: true },
    },
    review_images: {
      orderBy: { id: 'asc' as const },
    },
  };

  // ════════════════════════════════════════════════════════════════════
  // PUBLIC
  // ════════════════════════════════════════════════════════════════════

  async findApprovedForProduct(productId: number) {
    return this.db.reviews.findMany({
      where: {
        product_id: productId,
        status: 'approved',
      },
      orderBy: { created_at: 'desc' },
      include: this.includeRelations,
    });
  }

  async findUserReview(productId: number, userId: number) {
    return this.db.reviews.findUnique({
      where: {
        product_id_user_id: { product_id: productId, user_id: userId },
      },
      include: this.includeRelations,
    });
  }

  async create(
    productId: number,
    userId: number,
    data: { rating: string; comment: string },
    files: Express.Multer.File[],
  ) {
    const rating = Number(data.rating);

    if (!rating || rating < 1 || rating > 5) {
      files.forEach(f => this.deleteFileFromDisk(f.filename));
      throw new BadRequestException('Rating must be a number between 1 and 5.');
    }

    if (!data.comment?.trim()) {
      files.forEach(f => this.deleteFileFromDisk(f.filename));
      throw new BadRequestException('Comment is required.');
    }

    const product = await this.db.products.findUnique({ where: { id: productId } });
    if (!product) {
      files.forEach(f => this.deleteFileFromDisk(f.filename));
      throw new NotFoundException(`Product with ID ${productId} not found.`);
    }

    const existing = await this.db.reviews.findUnique({
      where: { product_id_user_id: { product_id: productId, user_id: userId } },
    });
    if (existing) {
      files.forEach(f => this.deleteFileFromDisk(f.filename));
      throw new ConflictException('You have already reviewed this product.');
    }

    return this.db.reviews.create({
      data: {
        product_id: productId,
        user_id: userId,
        rating,
        comment: data.comment.trim(),
        status: 'pending',
        review_images: files.length
          ? { create: files.map(f => ({ path: f.filename })) }
          : undefined,
      },
      include: this.includeRelations,
    });
  }

  // ════════════════════════════════════════════════════════════════════
  // ADMIN
  // ════════════════════════════════════════════════════════════════════

  async findAll() {
    return this.db.reviews.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        ...this.includeRelations,
        product: { select: { id: true, name: true } },
      },
    });
  }

  async updateStatus(id: number, status: 'approved' | 'hidden' | 'pending') {
    const review = await this.db.reviews.findUnique({ where: { id } });
    if (!review) throw new NotFoundException(`Review with ID ${id} not found.`);

    return this.db.reviews.update({
      where: { id },
      data: { status },
      include: this.includeRelations,
    });
  }

  async remove(id: number) {
    const review = await this.db.reviews.findUnique({
      where: { id },
      include: { review_images: true },
    });
    if (!review) throw new NotFoundException(`Review with ID ${id} not found.`);

    review.review_images.forEach(img => this.deleteFileFromDisk(img.path));

    return this.db.reviews.delete({ where: { id } });
  }
}
