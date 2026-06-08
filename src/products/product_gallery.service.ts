
import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ProductImagesService {
  constructor(private readonly db: DatabaseService) { }

  private deleteFileFromDisk(fileName: string | null | undefined) {
    if (!fileName) return;
    const absoluteFilePath = path.join(
      process.cwd(),
      'front_admin',
      'uploads',
      'products',
      fileName,
    );
    try {
      if (fs.existsSync(absoluteFilePath)) {
        fs.unlinkSync(absoluteFilePath);
        console.log(`[Gallery Cleanup] Removed file: ${fileName}`);
      } else {
        console.warn(`[Gallery Cleanup] File not found: ${absoluteFilePath}`);
      }
    } catch (error) {
      console.error(`[Gallery Cleanup] Error removing file: ${absoluteFilePath}`, error);
    }
  }

  async addImages(productId: number, files: Express.Multer.File[]) {
    const product = await this.db.products.findUnique({ where: { id: productId } });
    if (!product) {
      // Clean up already-saved files before throwing
      files.forEach(f => this.deleteFileFromDisk(f.filename));
      throw new NotFoundException(`Product with ID ${productId} not found.`);
    }

    const created = await this.db.$transaction(
      files.map(f =>
        this.db.product_images.create({
          data: {
            product_id: productId,
            path: f.filename,
          },
        }),
      ),
    );

    return created;
  }

  async removeImage(imageId: number) {
    const image = await this.db.product_images.findUnique({ where: { id: imageId } });
    if (!image) {
      throw new NotFoundException(`Gallery image with ID ${imageId} not found.`);
    }

    this.deleteFileFromDisk(image.path);

    return this.db.product_images.delete({ where: { id: imageId } });
  }
}
