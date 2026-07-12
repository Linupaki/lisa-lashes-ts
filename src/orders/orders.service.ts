import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(private readonly db: DatabaseService) { }

  private readonly includeItems = {
    order_items: {
      include: {
        products: {
          include: {
            product_discount: true,
          },
        },
      },
    },
  };

  // GET all orders for a user
  async findUserOrders(userId: number) {
    return this.db.orders.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      include: this.includeItems,
    });
  }

  // GET single order (must belong to user)
  async findOneUserOrder(orderId: number, userId: number) {
    const order = await this.db.orders.findFirst({
      where: { id: orderId, user_id: userId },
      include: this.includeItems,
    });
    if (!order) throw new NotFoundException(`Order with ID ${orderId} not found.`);
    return order;
  }

  // POST create order from cart
  async createFromCart(userId: number, customerDetails: {
    first_name: string;
    last_name: string;
    email?: string;
    phone: string;
    promoCode?: string;
  }) {
    const cart = await this.db.carts.findUnique({
      where: { user_id: userId },
      include: {
        cart_items: {
          include: {
            products: {
              include: { product_discount: true },
            },
          },
        },
      },
    });

    if (!cart || !cart.cart_items.length) {
      throw new BadRequestException('Your cart is empty.');
    }

    for (const item of cart.cart_items) {
      if (item.products.stock < item.quantity) {
        throw new BadRequestException(
          `"${item.products.name}" only has ${item.products.stock} in stock.`
        );
      }
    }

    // Helper to get effective price after product discount
    const getItemEffectivePrice = (item: any): number => {
      const orig = Number(item.products.price);
      const d = item.products.product_discount;
      if (!d) return orig;
      const now = new Date();
      const active = new Date(d.start_time) <= now && new Date(d.end_time) >= now;
      if (!active) return orig;
      if (d.discount_type === 'percentage') return orig * (1 - Number(d.discount_value) / 100);
      if (d.discount_type === 'fixed') return Math.max(0, orig - Number(d.discount_value));
      return orig;
    };

    // Subtotal uses product-discounted prices
    const subtotal = cart.cart_items.reduce(
      (sum, item) => sum + getItemEffectivePrice(item) * item.quantity,
      0
    );

    // Apply promo if provided
    let total = subtotal;
    let promoId: number | null = null;

    if (customerDetails.promoCode) {
      const promo = await this.db.promo_codes.findUnique({
        where: { code: customerDetails.promoCode.toUpperCase() },
      });

      if (promo && promo.is_active) {
        const notExpired = !promo.expires_at || new Date() <= new Date(promo.expires_at);
        const notMaxed = promo.max_uses === null || (promo.used_count ?? 0) < promo.max_uses;

        // Check single use per user if enabled on this promo
        let notUsedByUser = true;
        if (promo.single_use_per_user) {
          const existingUse = await this.db.promo_code_uses.findUnique({
            where: { promo_id_user_id: { promo_id: promo.id, user_id: userId } },
          });
          if (existingUse) {
            throw new BadRequestException('You have already used this promo code.');
          }
        }

        if (notExpired && notMaxed && notUsedByUser) {
          promoId = promo.id;
          const dtype = promo.discount_type.toLowerCase();
          if (dtype.includes('percent')) {
            total = subtotal * (1 - Number(promo.discount_value) / 100);
          } else if (dtype.includes('fixed') || dtype.includes('amount')) {
            total = Math.max(0, subtotal - Number(promo.discount_value));
          }
        }
      }
    }

    const order = await this.db.$transaction(async (tx) => {

      // Calculate effective price per item:
      // product discount first, then proportional promo ratio on top
      const promoRatio = subtotal > 0 ? total / subtotal : 1;

      const newOrder = await tx.orders.create({
        data: {
          user_id: userId,
          total,
          status: 'pending',
          order_items: {
            create: cart.cart_items.map(item => {
              const productDiscountedPrice = getItemEffectivePrice(item);
              const finalPrice = Math.round(productDiscountedPrice * promoRatio * 100) / 100;
              return {
                product_id: item.product_id,
                quantity: item.quantity,
                price_at_purchase: new Prisma.Decimal(finalPrice.toString()),
              };
            }),
          },
        },
        include: {
          order_items: {
            include: {
              products: { include: { product_discount: true } },
            },
          },
        },
      });

      for (const item of cart.cart_items) {
        await tx.products.update({
          where: { id: item.product_id },
          data: { stock: { decrement: item.quantity } },
        });
      }

      // Increment promo used_count if applied
      if (promoId) {
        await tx.promo_codes.update({
          where: { id: promoId },
          data: { used_count: { increment: 1 } },
        });

        // Record per-user use if single_use_per_user is enabled
        const promoRecord = await tx.promo_codes.findUnique({ where: { id: promoId } });
        if (promoRecord?.single_use_per_user) {
          await tx.promo_code_uses.create({
            data: { promo_id: promoId, user_id: userId },
          });
        }
      }

      await tx.cart_items.deleteMany({ where: { cart_id: cart.id } });

      return newOrder;
    });

    return order;
  }

  // ADMIN — get all orders
  async findAll() {
    return this.db.orders.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        ...this.includeItems,
        users: { select: { id: true, first_name: true, last_name: true, phone: true } },
      },
    });
  }

  // ADMIN — update order status
  async updateStatus(orderId: number, status: string) {
    const order = await this.db.orders.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException(`Order with ID ${orderId} not found.`);
    return this.db.orders.update({
      where: { id: orderId },
      data: { status },
      include: this.includeItems,
    });
  }
}
