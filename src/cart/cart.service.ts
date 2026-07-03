import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class CartService {
  constructor(private readonly db: DatabaseService) { }

  private readonly includeItems = {
    cart_items: {
      include: {
        products: {
          select: {
            id: true,
            name: true,
            price: true,
            path: true,
            stock: true,
          },
        },
      },
      orderBy: { id: 'asc' as const },
    },
  };

  // ── Get or create cart for a user ──
  private async getOrCreateCart(userId: number) {
    let cart = await this.db.carts.findUnique({
      where: { user_id: userId },
      include: this.includeItems,
    });

    if (!cart) {
      cart = await this.db.carts.create({
        data: { user_id: userId },
        include: this.includeItems,
      });
    }

    return cart;
  }

  // GET /cart — get current user's cart items
  async getCart(userId: number) {
    const cart = await this.getOrCreateCart(userId);
    return cart.cart_items;
  }

  // POST /cart — add item or increment quantity
  async addItem(userId: number, productId: number, quantity: number = 1) {
    const product = await this.db.products.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException(`Product with ID ${productId} not found.`);

    const cart = await this.getOrCreateCart(userId);

    const existing = await this.db.cart_items.findUnique({
      where: { cart_id_product_id: { cart_id: cart.id, product_id: productId } },
    });

    if (existing) {
      return this.db.cart_items.update({
        where: { cart_id_product_id: { cart_id: cart.id, product_id: productId } },
        data: { quantity: existing.quantity + quantity },
        include: { products: { select: { id: true, name: true, price: true, path: true } } },
      });
    }

    return this.db.cart_items.create({
      data: { cart_id: cart.id, product_id: productId, quantity },
      include: { products: { select: { id: true, name: true, price: true, path: true } } },
    });
  }

  // PATCH /cart/:productId — set exact quantity
  async updateQuantity(userId: number, productId: number, quantity: number) {
    if (quantity < 1) return this.removeItem(userId, productId);

    const cart = await this.getOrCreateCart(userId);

    return this.db.cart_items.update({
      where: { cart_id_product_id: { cart_id: cart.id, product_id: productId } },
      data: { quantity },
      include: { products: { select: { id: true, name: true, price: true, path: true } } },
    });
  }

  // DELETE /cart/:productId — remove one item
  async removeItem(userId: number, productId: number) {
    const cart = await this.getOrCreateCart(userId);

    return this.db.cart_items.delete({
      where: { cart_id_product_id: { cart_id: cart.id, product_id: productId } },
    });
  }

  // DELETE /cart — clear entire cart
  async clearCart(userId: number) {
    const cart = await this.getOrCreateCart(userId);

    return this.db.cart_items.deleteMany({
      where: { cart_id: cart.id },
    });
  }
}
