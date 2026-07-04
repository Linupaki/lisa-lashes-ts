import {
  Controller, Get, Post, Put, Delete,
  Param, Query, Body, Req,
  UseGuards, UseInterceptors, UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { user_roles } from '../../generated/prisma/client';

const reviewPhotoStorage = diskStorage({
  destination: './front_admin/uploads/reviews',
  filename: (req, file, callback) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    callback(null, `${uniqueSuffix}${extname(file.originalname)}`);
  },
});

// ── PUBLIC ────────────────────────────────────────────────────────────────────

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) { }

  // GET /reviews/slider
  @Get('slider')
  findSlider() {
    return this.reviewsService.findSliderReviews();
  }

  // GET /reviews/product/:productId
  @Get('product/:productId')
  findForProduct(@Param('productId') productId: string) {
    return this.reviewsService.findApprovedForProduct(+productId);
  }

  // GET /reviews/service/:serviceId
  @Get('service/:serviceId')
  findForService(@Param('serviceId') serviceId: string) {
    return this.reviewsService.findApprovedForService(+serviceId);
  }

  // GET /reviews/history/products
  @UseGuards(JwtAuthGuard)
  @Get('history/products')
  getOrderHistory(@Req() req: any) {
    return this.reviewsService.findUserOrderHistory(req.user.sub);
  }

  // GET /reviews/history/services
  @UseGuards(JwtAuthGuard)
  @Get('history/services')
  getBookingHistory(@Req() req: any) {
    return this.reviewsService.findUserBookingHistory(req.user.sub);
  }

  // GET /reviews/product/:productId/mine
  @UseGuards(JwtAuthGuard)
  @Get('product/:productId/mine')
  findMyProductReview(@Param('productId') productId: string, @Req() req: any) {
    return this.reviewsService.findUserProductReview(+productId, req.user.sub);
  }

  // GET /reviews/service/:serviceId/mine
  @UseGuards(JwtAuthGuard)
  @Get('service/:serviceId/mine')
  findMyServiceReview(@Param('serviceId') serviceId: string, @Req() req: any) {
    return this.reviewsService.findUserServiceReview(+serviceId, req.user.sub);
  }

  // POST /reviews/product/:productId
  @UseGuards(JwtAuthGuard)
  @Post('product/:productId')
  @UseInterceptors(FilesInterceptor('photos', 5, { storage: reviewPhotoStorage }))
  createProductReview(
    @Param('productId') productId: string,
    @Body() body: any,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: any,
  ) {
    return this.reviewsService.createProductReview(+productId, req.user.sub, body, files || []);
  }

  // POST /reviews/service/:serviceId
  @UseGuards(JwtAuthGuard)
  @Post('service/:serviceId')
  @UseInterceptors(FilesInterceptor('photos', 5, { storage: reviewPhotoStorage }))
  createServiceReview(
    @Param('serviceId') serviceId: string,
    @Body() body: any,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: any,
  ) {
    return this.reviewsService.createServiceReview(+serviceId, req.user.sub, body, files || []);
  }
}

// ── ADMIN ─────────────────────────────────────────────────────────────────────

@Controller('admin/reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(user_roles.admin, user_roles.master)
export class AdminReviewsController {
  constructor(private readonly reviewsService: ReviewsService) { }

  // GET /admin/reviews
  @Get()
  findAll() {
    return this.reviewsService.findAll();
  }

  // PUT /admin/reviews?id=X
  @Put()
  updateStatus(
    @Query('id') id: string,
    @Body() body: { status: 'approved' | 'hidden' | 'pending' },
  ) {
    return this.reviewsService.updateStatus(+id, body.status);
  }

  // PUT /admin/reviews/slider?id=X
  @Put('slider')
  updateSlider(
    @Query('id') id: string,
    @Body() body: { inSlider: boolean; sliderImagePath: string | null },
  ) {
    return this.reviewsService.updateSlider(+id, body.inSlider, body.sliderImagePath);
  }

  // DELETE /admin/reviews?id=X
  @Delete()
  remove(@Query('id') id: string) {
    return this.reviewsService.remove(+id);
  }
}
