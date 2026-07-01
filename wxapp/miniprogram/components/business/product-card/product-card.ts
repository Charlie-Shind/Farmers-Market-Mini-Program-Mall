import { iconPaths } from '../../../config/icons';
import { formatMoneyDisplay } from '../../../utils/money';

Component({
  properties: {
    product: {
      type: Object,
      value: null as any,
    },
    layout: {
      type: String,
      value: 'vertical', // 'vertical' | 'horizontal' | 'rank'
    },
  },
  data: {
    icons: iconPaths,
    displayProduct: {} as any,
  },
  observers: {
    product(product: any) {
      if (!product) {
        this.setData({
          displayProduct: {},
        });
        return;
      }

      const isGroupBuy = Boolean(product.groupBuyConfig?.enabled);

      this.setData({
        displayProduct: {
          ...product,
          price: formatMoneyDisplay(product.priceNum ?? product.price),
          priceNum: formatMoneyDisplay(product.priceNum ?? product.price),
          originalPrice: formatMoneyDisplay(product.originalPrice ?? product.originPrice ?? product.priceNum ?? product.price),
          groupPrice: formatMoneyDisplay(product.groupPrice),
          flashPrice: formatMoneyDisplay(product.flashPrice),
          isGroupBuy,
          badge: isGroupBuy ? '拼团' : product.badge,
          ctaText: isGroupBuy ? '去拼团' : '',
        },
      });
    },
  },
  methods: {
    onCardTap() {
      const product = this.properties.product as any;
      const id = product?.id;
      if (id) {
        if (product?.groupBuyConfig?.enabled) {
          wx.navigateTo({
            url: `/pages/quick/group-buy/index?productId=${id}&title=${encodeURIComponent(product.title || '拼团专区')}`,
          });
          return;
        }

        wx.navigateTo({
          url: `/pages/product/detail/detail?productId=${id}`,
        });
      }
    },
    onAddToCart() {
      const product = this.properties.product;
      if (product && (product.skuId || product.id)) {
        this.triggerEvent('addtocart', {
          skuId: product.skuId ? Number(product.skuId) : undefined,
          product: product,
        });
      }
    },
  },
});
