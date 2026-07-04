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
    product: {
      select: { id: true, name: true },
    },
    service: {
      select: { id: true, name: true },
    },
  };

  // ════════════════════════════════════════════════════════════════════
  // PUBLIC
  // ════════════════════════════════════════════════════════════════════

  // GET approved reviews for a product
  async findApprovedForProduct(productId: number) {
    return this.db.reviews.findMany({
      where: { product_id: productId, status: 'approved' },
      orderBy: { created_at: 'desc' },
      include: this.includeRelations,
    });
  }

  // GET approved reviews for a service
  async findApprovedForService(serviceId: number) {
    return this.db.reviews.findMany({
      where: { service_id: serviceId, status: 'approved' },
      orderBy: { created_at: 'desc' },
      include: this.includeRelations,
    });
  }

  // GET slider reviews — approved, in_slider, must have slider_image_path
  async findSliderReviews() {
    return this.db.reviews.findMany({
      where: {
        status: 'approved',
        in_slider: true,
        slider_image_path: { not: null },
      },
      orderBy: { updated_at: 'desc' },
      include: {
        user: { select: { id: true, first_name: true, last_name: true } },
        review_images: { orderBy: { id: 'asc' as const } },
      },
    });
  }

  // GET current user's review for a product
  async findUserProductReview(productId: number, userId: number) {
    return this.db.reviews.findUnique({
      where: { product_id_user_id: { product_id: productId, user_id: userId } },
      include: this.includeRelations,
    });
  }

  // GET current user's review for a service
  async findUserServiceReview(serviceId: number, userId: number) {
    return this.db.reviews.findUnique({
      where: { service_id_user_id: { service_id: serviceId, user_id: userId } },
      include: this.includeRelations,
    });
  }

  // GET user's order history (products they can review)
  async findUserOrderHistory(userId: number) {
    const orders = await this.db.orders.findMany({
      where: { user_id: userId },
      include: {
        order_items: {
          include: {
            products: { select: { id: true, name: true, path: true } },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    // Flatten to unique products and check if already reviewed
    const productMap = new Map<number, any>();
    for (const order of orders) {
      for (const item of order.order_items) {
        if (!productMap.has(item.product_id)) {
          productMap.set(item.product_id, item.products);
        }
      }
    }

    const products = Array.from(productMap.values());
    const reviewed = await this.db.reviews.findMany({
      where: { user_id: userId, product_id: { in: products.map(p => p.id) } },
      select: { product_id: true },
    });
    const reviewedIds = new Set(reviewed.map(r => r.product_id));

    return products.map(p => ({ ...p, already_reviewed: reviewedIds.has(p.id) }));
  }

  // GET user's booking history (services they can review)
  async findUserBookingHistory(userId: number) {
    const bookings = await this.db.bookings.findMany({
      where: {
        user_id: userId,
        status: { in: ['completed', 'confirmed'] },
        service_id: { not: null },
      },
      include: {
        salon_services: { select: { id: true, name: true, price: true } },
      },
      orderBy: { start_time: 'desc' },
    });

    // Flatten to unique services and check if already reviewed
    const serviceMap = new Map<number, any>();
    for (const booking of bookings) {
      if (booking.salon_services && !serviceMap.has(booking.service_id)) {
        serviceMap.set(booking.service_id, booking.salon_services);
      }
    }

    const services = Array.from(serviceMap.values());
    const reviewed = await this.db.reviews.findMany({
      where: { user_id: userId, service_id: { in: services.map(s => s.id) } },
      select: { service_id: true },
    });
    const reviewedIds = new Set(reviewed.map(r => r.service_id));

    return services.map(s => ({ ...s, already_reviewed: reviewedIds.has(s.id) }));
  }

  // POST submit a product review
  async createProductReview(
    productId: number,
    userId: number,
    data: { rating: string; comment: string },
    files: Express.Multer.File[],
  ) {
    const rating = Number(data.rating);
    if (!rating || rating < 1 || rating > 5) {
      files.forEach(f => this.deleteFileFromDisk(f.filename));
      throw new BadRequestException('Rating must be between 1 and 5.');
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

  // POST submit a service review
  async createServiceReview(
    serviceId: number,
    userId: number,
    data: { rating: string; comment: string },
    files: Express.Multer.File[],
  ) {
    const rating = Number(data.rating);
    if (!rating || rating < 1 || rating > 5) {
      files.forEach(f => this.deleteFileFromDisk(f.filename));
      throw new BadRequestException('Rating must be between 1 and 5.');
    }
    if (!data.comment?.trim()) {
      files.forEach(f => this.deleteFileFromDisk(f.filename));
      throw new BadRequestException('Comment is required.');
    }

    const service = await this.db.salon_services.findUnique({ where: { id: serviceId } });
    if (!service) {
      files.forEach(f => this.deleteFileFromDisk(f.filename));
      throw new NotFoundException(`Service with ID ${serviceId} not found.`);
    }

    const existing = await this.db.reviews.findUnique({
      where: { service_id_user_id: { service_id: serviceId, user_id: userId } },
    });
    if (existing) {
      files.forEach(f => this.deleteFileFromDisk(f.filename));
      throw new ConflictException('You have already reviewed this service.');
    }

    return this.db.reviews.create({
      data: {
        service_id: serviceId,
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
      include: this.includeRelations,
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

  // PUT toggle slider + set which photo to use
  async updateSlider(id: number, inSlider: boolean, sliderImagePath: string | null) {
    const review = await this.db.reviews.findUnique({
      where: { id },
      include: { review_images: true },
    });
    if (!review) throw new NotFoundException(`Review with ID ${id} not found.`);

    if (inSlider) {
      if (!review.review_images.length) {
        throw new BadRequestException('Review must have at least one photo to be added to slider.');
      }
      if (!sliderImagePath) {
        throw new BadRequestException('A slider image must be selected.');
      }
      // Verify the chosen image belongs to this review
      const validImage = review.review_images.find(img => img.path === sliderImagePath);
      if (!validImage) {
        throw new BadRequestException('Selected image does not belong to this review.');
      }
    }

    return this.db.reviews.update({
      where: { id },
      data: {
        in_slider: inSlider,
        slider_image_path: inSlider ? sliderImagePath : null,
      },
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
