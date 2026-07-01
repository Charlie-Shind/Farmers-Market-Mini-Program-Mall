import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../common/prisma/prisma.service';
import { ObjectStorageService } from '../../../common/storage/object-storage.service';
import { PlatformDataService } from '../../../common/services/platform-data.service';
import { AuthUser } from '../../../common/types';
import { isPublicProductVisible } from '../../../common/utils/product-visibility';
import { AddCartItemDto, UpdateCartItemDto } from './dto/cart-item.dto';

@Injectable()
export class CartService {
  constructor(
    private readonly platformDataService: PlatformDataService,
    private readonly prisma: PrismaService,
    private readonly objectStorageService: ObjectStorageService,
  ) {}

  async addCartItem(authUser: AuthUser, body: AddCartItemDto) {
    const user = await this.platformDataService.ensureUser(authUser);
    const skuId = Number(body.skuId ?? body.id ?? 0);
    const quantity = Math.max(Number(body.quantity ?? 1), 1);
    const checked = body.checked !== false;

    const sku = await this.prisma.productSku.findUnique({
      where: { id: BigInt(skuId) },
      include: { product: true },
    });

    if (!sku) {
      throw new BadRequestException('SKU not found');
    }

    const existing = await this.prisma.cartItem.findUnique({
      where: {
        userId_skuId: {
          userId: user.id,
          skuId: sku.id,
        },
      },
    });

    const cartItem = existing
      ? await this.prisma.cartItem.update({
          where: { id: existing.id },
          data: {
            quantity: existing.quantity + quantity,
            checked,
          },
        })
      : await this.prisma.cartItem.create({
          data: {
            userId: user.id,
            merchantId: sku.product.merchantId,
            productId: sku.productId,
            skuId: sku.id,
            quantity,
            checked,
          },
        });

    return {
      message: 'cart item added',
      input: body,
      cartCount: await this.prisma.cartItem.count({ where: { userId: user.id } }),
      cartId: Number(cartItem.id),
    };
  }

  async getCart(authUser: AuthUser) {
    const user = await this.platformDataService.ensureUser(authUser);
    const items = await this.prisma.cartItem.findMany({
      where: { userId: user.id },
      include: {
        product: {
          include: {
            merchant: true,
          },
        },
        sku: true,
      },
      orderBy: [{ merchantId: 'asc' }, { id: 'asc' }],
    });

    const groups = new Map<number, { merchantId: number; storeName: string; items: unknown[] }>();

    for (const item of items) {
      if (!isPublicProductVisible(item.product)) {
        continue;
      }

      const merchantId = Number(item.merchantId);
      const group = groups.get(merchantId) ?? {
        merchantId,
        storeName: item.product.merchant.storeName,
        items: [],
      };

      group.items.push({
        cartId: Number(item.id),
        productId: Number(item.productId),
        skuId: Number(item.skuId),
        title: item.product.title,
        skuName: item.sku.skuName,
        price: this.computeDisplayPrice(item.sku),
        originalPrice: this.toMoney(item.sku.originalPrice ?? item.sku.price),
        quantity: item.quantity,
        checked: item.checked,
        stock: item.sku.stock,
        coverUrl: this.resolvePublicUrl(item.product.coverUrl) ?? '',
      });

      groups.set(merchantId, group);
    }

    return [...groups.values()];
  }

  async updateCartItem(authUser: AuthUser, cartId: number, body: UpdateCartItemDto) {
    const user = await this.platformDataService.ensureUser(authUser);
    const quantity = body.quantity != null ? Math.max(Number(body.quantity), 1) : undefined;
    const checked = body.checked != null ? Boolean(body.checked) : undefined;

    const cartItem = await this.prisma.cartItem.updateMany({
      where: { id: BigInt(cartId), userId: user.id },
      data: {
        ...(quantity ? { quantity } : {}),
        ...(checked != null ? { checked } : {}),
      },
    });

    return {
      cartId,
      message: 'cart item updated',
      input: body,
      affectedRows: cartItem.count,
    };
  }

  async removeCartItem(authUser: AuthUser, cartId: number) {
    const user = await this.platformDataService.ensureUser(authUser);
    const cartItem = await this.prisma.cartItem.deleteMany({
      where: { id: BigInt(cartId), userId: user.id },
    });

    return {
      cartId,
      message: 'cart item removed',
      affectedRows: cartItem.count,
    };
  }

  private toMoney(value: Prisma.Decimal | number | string | null | undefined): string {
    if (value == null) {
      return '0.00';
    }
    const normalized = Number(value);
    return Number.isFinite(normalized) ? normalized.toFixed(2) : '0.00';
  }

  private resolvePublicUrl(url: string | null | undefined): string | null {
    if (!url) {
      return null;
    }

    const baseUrl = this.objectStorageService.getPublicBaseUrl().replace(/\/+$/, '');
    if (url.startsWith('/')) {
      return `${baseUrl}${url}`;
    }

    const localMatches = [
      'http://127.0.0.1:6004',
      'http://localhost:6004',
      'https://127.0.0.1:6004',
      'https://localhost:6004',
    ];

    for (const match of localMatches) {
      if (url.startsWith(match)) {
        return url.replace(match, baseUrl);
      }
    }

    return url;
  }

  private computeDisplayPrice(sku: { price: Prisma.Decimal; promotionPrice?: Prisma.Decimal | null; promotionStartAt?: Date | null; promotionEndAt?: Date | null }): string {
    const now = new Date();
    if (sku.promotionPrice && sku.promotionStartAt && sku.promotionEndAt && now >= sku.promotionStartAt && now <= sku.promotionEndAt) {
      return this.toMoney(sku.promotionPrice);
    }

    return this.toMoney(sku.price);
  }

}
