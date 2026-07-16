import { iconPaths } from '../../config/icons';
import {
  addToCart,
  fetchAddresses,
  fetchCart,
  fetchProducts,
  fetchProductDetail,
  removeCartItem,
  updateCartItem,
  type AppCartGroup,
} from '../../services/app';
import { buildPageTopStyle } from '../../utils/page-layout';
import { ensureCustomerAccess, redirectMerchantAwayFromCustomerRoute } from '../../utils/auth-route';

type CartViewItem = {
  id: string;
  cartId: number;
  title: string;
  desc: string;
  price: string;
  quantity: number;
  checked: boolean;
  imageClass: string;
  coverUrl: string;
  imageStyle: string;
};

type CartPromoView = {
  text: string;
  actionLabel: string;
  threshold: number;
};

function toMoney(value: string | number | undefined) {
  const amount = Number(String(value == null ? 0 : value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(amount) ? amount : 0;
}

function buildCartItems(groups: AppCartGroup[]) {
  const flatItems = groups.flatMap((group) =>
    group.items.map((item, index) => ({
      ...item,
      groupKey: group.storeName,
      orderIndex: index,
    })),
  );

  return flatItems.map((item, index) => ({
    id: String(item.cartId),
    cartId: item.cartId,
    title: item.title,
    desc: item.skuName || `规格 ${index + 1}`,
    price: `¥${item.price}`,
    quantity: item.quantity,
    checked: item.checked,
    imageClass: ['orange-img', 'egg-img', 'rice-img', 'oil-img'][index % 4],
    coverUrl: item.coverUrl,
    imageStyle: item.coverUrl
      ? `background-image: url(${item.coverUrl}); background-size: cover; background-position: center;`
      : '',
  }));
}

Component({
  data: {
    cart: {
      address: {
        title: '收货地址：加载中',
        desc: '正在拉取真实收货地址',
      },
      promo: {
        text: '满¥129.00，可享免运费',
        actionLabel: '去凑单',
        threshold: 129,
      } as CartPromoView,
      shopName: '购物车',
      items: [] as CartViewItem[],
      discount: '¥0.00',
      total: '¥0.00',
      recommend: [] as Array<{
        id: string;
        skuId?: number;
        title: string;
        desc: string;
        price: string;
        imageClass: string;
        coverUrl: string;
        imageStyle: string;
      }>,
    },
    cartItemCount: 0,
    checkedItemCount: 0,
    isAllChecked: false,
    loadError: false,
    icons: iconPaths,
    pageStyle: '',
    showSpecSheet: false,
    activeSpecProduct: null as any,
  },
  lifetimes: {
    attached() {
      if (redirectMerchantAwayFromCustomerRoute('/pages/cart/cart')) {
        return;
      }

      this.setData({
        pageStyle: buildPageTopStyle(0),
      });
    },
  },
  pageLifetimes: {
    show() {
      this.setData({
        pageStyle: buildPageTopStyle(0),
      });
      void this.loadCartData();

      const tabBar = (this as any).getTabBar?.();
      if (tabBar) {
        if (typeof tabBar.syncFromRoute === 'function') {
          tabBar.syncFromRoute();
        } else {
          tabBar.setData({ visible: true, active: 'cart' });
        }
      }
    },
  },
  methods: {
    async loadCartData() {
      if ((this as any)._cartLoading) {
        return;
      }
      (this as any)._cartLoading = true;
      this.setData({
        loadError: false,
      });

      try {
        const [groups, addresses, productsPage] = await Promise.all([
          fetchCart(),
          fetchAddresses(),
          fetchProducts('', 4),
        ]);

        const items = buildCartItems(groups);
        const checkedItems = items.filter((item) => item.checked);
        const checkedTotal = items.reduce((sum, item) => {
          if (!item.checked) {
            return sum;
          }

          return sum + toMoney(item.price) * item.quantity;
        }, 0);
        const promoThreshold = 129;
        const shopName = groups.length > 1 ? `${groups.length} 家商户商品` : groups[0]?.storeName || '购物车';
        const address = addresses.find((item) => item.isDefault) || addresses[0];
        const promoText =
          checkedTotal >= promoThreshold
            ? '已满足免运费'
            : `满¥${promoThreshold.toFixed(2)}，可享免运费`;

        this.setData({
          cart: {
            address: address
              ? {
                  title: `${address.province}${address.city}${address.district} ${address.detailAddress}`,
                  desc: `${address.receiverName} ${address.receiverMobile}${address.isDefault ? ' · 默认地址' : ''}`,
                }
              : {
                  title: '请选择收货地址',
                  desc: '添加地址后，可更精准为您推荐商品',
                },
            promo: {
              text: promoText,
              actionLabel: '去凑单',
              threshold: promoThreshold,
            },
            shopName,
            items,
            discount: '¥0.00',
            total: `¥${checkedTotal.toFixed(2)}`,
            recommend: (productsPage.items || []).slice(0, 2).map((product, index) => ({
              id: String(product.id),
              skuId: product.skuId,
              title: product.title,
              desc: product.subtitle || product.originPlace || '优选商品',
              price: `¥${product.minPrice || '0.00'}`,
              imageClass: ['oil-img', 'tomato-img'][index % 2],
              coverUrl: product.coverUrl,
              imageStyle: product.coverUrl
                ? `background-image: url(${product.coverUrl}); background-size: cover; background-position: center;`
                : '',
            })),
          },
          cartItemCount: items.reduce((sum, item) => sum + item.quantity, 0),
          checkedItemCount: checkedItems.reduce((sum, item) => sum + item.quantity, 0),
          isAllChecked: items.length > 0 && checkedItems.length === items.length,
        });

        const tabBar = (this as any).getTabBar?.();
        if (tabBar && typeof tabBar.syncFromRoute === 'function') {
          tabBar.syncFromRoute();
        }
      } catch {
        this.setData({
          loadError: true,
        });
      } finally {
        (this as any)._cartLoading = false;
      }
    },
    async toggleItem(e: WechatMiniprogram.BaseEvent) {
      if (!ensureCustomerAccess('/pages/cart/cart')) {
        return;
      }

      const { cartId, checked } = (e.currentTarget.dataset as { cartId?: string; checked?: boolean }) || {};
      if (!cartId) {
        return;
      }

      try {
        const currentChecked = checked === true;
        await updateCartItem(Number(cartId), { checked: !currentChecked });
        this.loadCartData();
      } catch {
        wx.showToast({ title: '更新失败', icon: 'none' });
      }
    },
    async toggleSelectAll() {
      if (!ensureCustomerAccess('/pages/cart/cart')) {
        return;
      }

      const items = this.data.cart.items;
      if (!items.length) {
        return;
      }

      const nextChecked = !this.data.isAllChecked;

      wx.showLoading({ title: '处理中...', mask: true });
      try {
        await Promise.all(
          items
            .filter((item) => item.checked !== nextChecked)
            .map((item) => updateCartItem(item.cartId, { checked: nextChecked })),
        );
        await this.loadCartData();
      } catch {
        wx.showToast({ title: '操作失败，请重试', icon: 'none' });
      } finally {
        wx.hideLoading();
      }
    },
    async increaseItem(e: WechatMiniprogram.BaseEvent) {
      if (!ensureCustomerAccess('/pages/cart/cart')) {
        return;
      }

      const { cartId, quantity } = (e.currentTarget.dataset as { cartId?: string; quantity?: number }) || {};
      if (!cartId) {
        return;
      }

      try {
        await updateCartItem(Number(cartId), { quantity: Number(quantity || 0) + 1 });
        this.loadCartData();
      } catch {
        wx.showToast({ title: '更新失败', icon: 'none' });
      }
    },
    async decreaseItem(e: WechatMiniprogram.BaseEvent) {
      if (!ensureCustomerAccess('/pages/cart/cart')) {
        return;
      }

      const { cartId, quantity } = (e.currentTarget.dataset as { cartId?: string; quantity?: number }) || {};
      if (!cartId) {
        return;
      }

      const nextQuantity = Math.max(Number(quantity || 0) - 1, 0);

      try {
        if (nextQuantity <= 0) {
          await removeCartItem(Number(cartId));
        } else {
          await updateCartItem(Number(cartId), { quantity: nextQuantity });
        }

        this.loadCartData();
      } catch {
        wx.showToast({ title: '更新失败', icon: 'none' });
      }
    },
    removeItem(e: WechatMiniprogram.BaseEvent) {
      if (!ensureCustomerAccess('/pages/cart/cart')) {
        return;
      }

      const { cartId, title } = (e.currentTarget.dataset as { cartId?: string; title?: string }) || {};
      if (!cartId) {
        return;
      }

      wx.showModal({
        title: '删除商品',
        content: title ? `确定要将「${title}」从购物车删除吗？` : '确定要删除这件商品吗？',
        confirmColor: '#c65f2d',
        success: (res) => {
          if (!res.confirm) {
            return;
          }

          wx.showLoading({ title: '删除中...', mask: true });
          removeCartItem(Number(cartId))
            .then(() => {
              wx.hideLoading();
              wx.showToast({ title: '已删除', icon: 'success' });
              this.loadCartData();
            })
            .catch(() => {
              wx.hideLoading();
              wx.showToast({ title: '删除失败', icon: 'none' });
            });
        },
      });
    },
    openProductDetail(e: WechatMiniprogram.BaseEvent) {
      const { id } = (e.currentTarget.dataset as { id?: string }) || {};
      if (!id) {
        return;
      }

      wx.navigateTo({
        url: `/pages/product/detail/detail?productId=${id}`,
      });
    },
    async addRecommendToCart(e: WechatMiniprogram.BaseEvent) {
      if (!ensureCustomerAccess('/pages/cart/cart')) {
        return;
      }

      const { id } = (e.currentTarget.dataset as { id?: string }) || {};
      if (!id) {
        wx.showToast({ title: '商品不存在', icon: 'none' });
        return;
      }

      wx.showLoading({ title: '加载中...', mask: true });
      try {
        const fullProduct = await fetchProductDetail(Number(id));
        wx.hideLoading();

        if (fullProduct && fullProduct.skus && fullProduct.skus.length > 0) {
          this.setData({
            activeSpecProduct: fullProduct,
            showSpecSheet: true,
          });
        } else {
          wx.showToast({ title: '该商品暂无规格', icon: 'none' });
        }
      } catch {
        wx.hideLoading();
        wx.showToast({ title: '获取商品规格失败', icon: 'none' });
      }
    },
    onCloseSpecSheet() {
      this.setData({ showSpecSheet: false });
    },
    async onConfirmSpecSheet(e: WechatMiniprogram.BaseEvent & { detail?: { sku?: any; qty?: number } }) {
      const { sku, qty } = e.detail || {};
      if (!sku) {
        wx.showToast({ title: '请选择规格', icon: 'none' });
        return;
      }

      wx.showLoading({ title: '加入购物车...', mask: true });
      try {
        await addToCart(Number(sku.id), qty || 1);
        wx.hideLoading();
        wx.showToast({ title: '已加入购物车', icon: 'success' });
        this.setData({ showSpecSheet: false });
        await this.loadCartData();
      } catch {
        wx.hideLoading();
        wx.showToast({ title: '加入购物车失败', icon: 'none' });
      }
    },
    openSection(e: WechatMiniprogram.BaseEvent) {
      const { label } = (e.currentTarget.dataset as { label?: string }) || {};

      if (label === '收货地址') {
        if (!ensureCustomerAccess('/pages/cart/cart')) {
          return;
        }
        wx.navigateTo({ url: '/pages/address/list/list' });
        return;
      }

      if (label === '去凑单') {
        if (!ensureCustomerAccess('/pages/cart/cart')) {
          return;
        }
        wx.navigateTo({ url: '/pages/category/category' });
        return;
      }

      if (label === '去逛逛') {
        wx.switchTab({ url: '/pages/index/index' });
        return;
      }

      if (label === '结算') {
        if (!ensureCustomerAccess('/pages/cart/cart')) {
          return;
        }
        const checkedIds = this.data.cart.items.filter((item) => item.checked).map((item) => item.cartId);
        if (!checkedIds.length) {
          wx.showToast({ title: '请选择要结算的商品', icon: 'none' });
          return;
        }

        wx.navigateTo({
          url: `/pages/checkout/checkout?cartIds=${checkedIds.join(',')}`,
        });
        return;
      }

      if (label === '编辑购物车') {
        wx.showToast({ title: '数量和勾选可直接编辑', icon: 'none' });
      }
    },
  },
});
