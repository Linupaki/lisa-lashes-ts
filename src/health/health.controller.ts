import { Controller, Get, Delete, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { user_roles } from '@prisma/client';
import { BufferedLogger } from './logger.service';
import { DatabaseService } from '../database/database.service';
import * as fs from 'fs';
import * as path from 'path';

// Upload folders to scan — relative to project root
const UPLOAD_FOLDERS: { folder: string; label: string }[] = [
  { folder: 'front_admin/uploads/products', label: 'Products' },
  { folder: 'front_admin/uploads/courses', label: 'Courses' },
  { folder: 'front_admin/uploads/about', label: 'About Page' },
  { folder: 'front_admin/uploads/reviews', label: 'Reviews' },
];

@Controller('admin/health')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(user_roles.admin, user_roles.master)
export class HealthController {
  constructor(private readonly db: DatabaseService) { }

  // ── SERVER HEALTH ─────────────────────────────────────────────────────────

  @Get()
  async getHealth() {
    let dbStatus = 'ok';
    let dbLatency = 0;
    try {
      const start = Date.now();
      await this.db.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - start;
    } catch (e) {
      dbStatus = 'error';
    }

    const mem = process.memoryUsage();

    return {
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      db: { status: dbStatus, latency: dbLatency },
      memory: {
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
        rss: Math.round(mem.rss / 1024 / 1024),
        external: Math.round(mem.external / 1024 / 1024),
      },
      logs: BufferedLogger.getLogs(),
    };
  }

  @Delete('logs')
  clearLogs() {
    BufferedLogger.clear();
    return { message: 'Logs cleared.' };
  }

  // ── STORAGE SCANNER ───────────────────────────────────────────────────────

  @Get('storage')
  async scanStorage() {
    const referenced = await this.getReferencedFiles();
    const result: { folder: string; label: string; unused: { name: string; size: number; path: string }[]; total: number; unusedCount: number; unusedSize: number }[] = [];

    for (const { folder, label } of UPLOAD_FOLDERS) {
      const absFolder = path.join(process.cwd(), folder);
      if (!fs.existsSync(absFolder)) {
        result.push({ folder, label, unused: [], total: 0, unusedCount: 0, unusedSize: 0 });
        continue;
      }

      const files = fs.readdirSync(absFolder).filter(f =>
        fs.statSync(path.join(absFolder, f)).isFile()
      );

      const unused = files
        .filter(f => !referenced.has(f))
        .map(f => {
          const stat = fs.statSync(path.join(absFolder, f));
          return { name: f, size: stat.size, path: `${folder}/${f}` };
        });

      result.push({
        folder,
        label,
        unused,
        total: files.length,
        unusedCount: unused.length,
        unusedSize: unused.reduce((s, f) => s + f.size, 0),
      });
    }

    return result;
  }

  @Delete('storage')
  async deleteUnusedFiles() {
    const referenced = await this.getReferencedFiles();
    const deleted: string[] = [];
    const errors: string[] = [];

    for (const { folder } of UPLOAD_FOLDERS) {
      const absFolder = path.join(process.cwd(), folder);
      if (!fs.existsSync(absFolder)) continue;

      const files = fs.readdirSync(absFolder).filter(f =>
        fs.statSync(path.join(absFolder, f)).isFile()
      );

      for (const file of files) {
        if (!referenced.has(file)) {
          try {
            fs.unlinkSync(path.join(absFolder, file));
            deleted.push(`${folder}/${file}`);
          } catch (e) {
            errors.push(`${folder}/${file}: ${e.message}`);
          }
        }
      }
    }

    return { deleted, errors, count: deleted.length };
  }

  // ── HELPERS ───────────────────────────────────────────────────────────────

  private async getReferencedFiles(): Promise<Set<string>> {
    const refs = new Set<string>();
    const add = (val: string | null) => {
      if (!val) return;
      // Store just the filename — folder prefix varies
      refs.add(path.basename(val));
    };

    // Products
    const products = await this.db.products.findMany({ select: { path: true } });
    products.forEach(p => add(p.path));

    // Product images
    const productImages = await this.db.product_images.findMany({ select: { path: true } });
    productImages.forEach(p => add(p.path));

    // Courses
    const courses = await this.db.courses.findMany({ select: { image_path: true } });
    courses.forEach(c => add(c.image_path));

    // About blocks
    const aboutBlocks = await this.db.about_blocks.findMany({ select: { image_path: true } });
    aboutBlocks.forEach(b => add(b.image_path));

    // Reviews
    try {
      const reviews = await (this.db as any).reviews.findMany({ select: { image_path: true } });
      reviews.forEach((r: any) => add(r.image_path));
    } catch (e) { /* reviews may not have image_path */ }

    // Review images
    try {
      const reviewImages = await (this.db as any).review_images.findMany({ select: { image_path: true } });
      reviewImages.forEach((r: any) => add(r.image_path));
    } catch (e) { }

    // Also extract filenames from about block body (Quill-embedded images)
    const allAbout = await this.db.about_blocks.findMany({ select: { body: true, content_html: true } });
    allAbout.forEach(b => {
      const html = b.body || b.content_html || '';
      const matches = html.matchAll(/uploads\/about\/([^"'\s]+)/g);
      for (const match of matches) refs.add(match[1]);
    });

    return refs;
  }
}
