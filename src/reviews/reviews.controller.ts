import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
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
    const ext = extname(file.originalname);
    callback(null, `${uniqueSuffix}${ext}`);
  },
});

// ── PUBLIC ────────────────────────────────────────────────────────────────────

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) { }

  // GET /reviews/:productId — approved reviews for a product
  @Get(':productId')
  findApproved(@Param('productId') productId: string) {
    return this.reviewsService.findApprovedForProduct(+productId);
  }

  // GET /reviews/:productId/mine — logged-in user's own review for a product
  @UseGuards(JwtAuthGuard)
  @Get(':productId/mine')
  findMine(@Param('productId') productId: string, @Req() req: any) {
    return this.reviewsService.findUserReview(+productId, req.user.sub);
  }

  // POST /reviews/:productId — submit a review (logged-in users only)
  @UseGuards(JwtAuthGuard)
  @Post(':productId')
  @UseInterceptors(FilesInterceptor('photos', 5, { storage: reviewPhotoStorage }))
  create(
    @Param('productId') productId: string,
    @Body() body: any,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: any,
  ) {
    return this.reviewsService.create(+productId, req.user.sub, body, files || []);
  }
}

// ── ADMIN ─────────────────────────────────────────────────────────────────────

@Controller('admin/reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(user_roles.admin, user_roles.master)
export class AdminReviewsController {
  constructor(private readonly reviewsService: ReviewsService) { }

  // GET /admin/reviews — all reviews across all products
  @Get()
  findAll() {
    return this.reviewsService.findAll();
  }

  // PUT /admin/reviews?id=X — update status
  @Put()
  updateStatus(
    @Query('id') id: string,
    @Body() body: { status: 'approved' | 'hidden' | 'pending' },
  ) {
    return this.reviewsService.updateStatus(+id, body.status);
  }

  // DELETE /admin/reviews?id=X — permanently delete
  @Delete()
  remove(@Query('id') id: string) {
    return this.reviewsService.remove(+id);
  }
}
