import { buildPageTopStyle } from '../../../utils/page-layout';
import {
  fetchMerchantDetail,
  fetchMerchantPublicProducts,
  type AppMerchantSummary,
  type AppMerchantProduct,
} from '../../../services/app';

Page<Record<string, any>, Record<string, any>>({
  data: {
    pageStyle: '',
    merchantId: 0,
    shopName: '',
    shopDesc: '',
    products: [] as any[],
  },

  onLoad(options: any) {
    this.setData({ pageStyle: buildPageTopStyle(8) });
    if (options.merchantId) {
      this.setData({ merchantId: Number(options.merchantId) });
    }
    this.loadData();
  },

  onShow() {
    this.setData({ pageStyle: buildPageTopStyle(8) });
  },

  async loadData() {
    const { merchantId } = this.data;

    if (merchantId) {
      try {
        const merchant: AppMerchantSummary = await fetchMerchantDetail(merchantId);
        if (merchant) {
          this.setData({
            shopName: merchant.storeName || '',
            shopDesc: merchant.contactName ? `联系人已认证 · 商品${merchant.productCount}件` : `商品${merchant.productCount}件`,
          });
        }
      } catch { /* 后端未就绪 */ }

      try {
        const res = await fetchMerchantPublicProducts(merchantId, { page: 1, pageSize: 20 });
        if (res && res.items) {
          const items = res.items.map((p: AppMerchantProduct) => ({
            id: p.productId,
            thumb: p.coverUrl || '/assets/goods/g2.svg',
            title: p.title,
            tag: p.saleCount > 100 ? '热卖' : '',
            tagClass: p.saleCount > 100 ? 'success' : '',
            meta: p.originPlace || '产地直供',
            price: '¥' + (p.minPrice || '0'),
            sold: p.saleCount || 0,
          }));
          this.setData({ products: items });
          return;
        }
      } catch { /* 后端未就绪 */ }
    }

    this.setData({ products: [] });
  },

  goBack() {
    if (getCurrentPages().length > 1) { wx.navigateBack({ delta: 1 }); return; }
    wx.navigateTo({ url: '/pages/merchant/shop/shop' });
  },

  onFollowTap() {
    wx.showToast({ title: '已关注预览', icon: 'success' });
  },
});
