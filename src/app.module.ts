import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { BookingModule } from './booking/booking.module';
import { ServiceModule } from './service/service.module';
import { ResourceModule } from './resource/resource.module';
import { ScheduleModule } from './schedule/schedule.module';
import { CartModule } from './cart/cart.module';
import { ProductsModule } from './products/products.module';
import { ProductTypesModule } from './product_types/product_types.module';
import { PromoModule } from './promo/promo.module';
import { ReviewsModule } from './reviews/reviews.module';
import { OrdersModule } from './orders/orders.module';
import { ProductSectionsModule } from './product_sections/product_sections.module';
import { ProductDiscountsModule } from './product_discounts/product_discounts.module';
import { HealthModule } from './health/health.module';
import { CoursesModule } from './courses/courses.module';
import { CoursesBookingsModule } from './courses-bookings/courses-bookings.module';
import { ReceiptModule } from './receipt/receipt.module';
import { AboutModule } from './about/about.module';
import { GalleryModule } from './gallery/gallery.module';
import { AccountModule } from './account/account.module';
import { CacheModule } from '@nestjs/cache-manager';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '../..', 'front'),
      renderPath: '/',
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '../..', 'front_admin'),
      serveRoot: '/front_admin',
    }),
    CacheModule.register({
      isGlobal: true,
      ttl: 60000,
      max: 100,
    }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,   // 1 second window
        limit: 1000000000,   // Max 10 requests per second per IP
      },
      {
        name: 'medium',
        ttl: 10000,  // 10 second window
        limit: 5000000000,   // Max 50 requests every 10 seconds per IP
      },
    ]),
    DatabaseModule,
    UserModule,
    AuthModule,
    BookingModule,
    ServiceModule,
    ResourceModule,
    ScheduleModule,
    CartModule,
    ProductsModule,
    ProductTypesModule,
    PromoModule,
    ReviewsModule,
    OrdersModule,
    ProductSectionsModule,
    ProductDiscountsModule,
    HealthModule,
    CoursesModule,
    CoursesBookingsModule,
    ReceiptModule,
    AboutModule,
    GalleryModule,
    AccountModule,

  ],
  controllers: [AppController],
  providers: [AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }
