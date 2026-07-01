import { fetchOrderDetail, submitOrderReview } from '../../../services/app';
import { buildPageTopStyle } from '../../../utils/page-layout';
import { ensureCustomerAccess } from '../../../utils/auth-route';

interface ReviewItem {
  orderItemId: number;
  productId: number;
  title: string;
  skuName: string;
  coverUrl: string;
  rating: number;
  content: string;
  images: string[];
}

Page<Record<string, any>, Record<string, any>>({
  data: {
    pageStyle: '',
    orderNo: '' as string,
    items: [] as ReviewItem[],
    submitting: false,
    emptyText: '加载中…',
  },

  onLoad(options: Record<string, string>) {
    this.setData({ pageStyle: buildPageTopStyle(8) });
    const orderNo = options.orderNo || '';
    if (orderNo) {
      this.setData({ orderNo });
      this.loadOrderItems(orderNo);
    } else {
      this.setData({ emptyText: '订单号错误' });
    }
  },

  async loadOrderItems(orderNo: string) {
    try {
      const order = await fetchOrderDetail(orderNo);
      if (!order || !order.items || !order.items.length) {
        this.setData({ emptyText: '订单不存在或无商品' });
        return;
      }

      const items: ReviewItem[] = order.items.map((item: any) => ({
        orderItemId: item.orderItemId || item.id,
        productId: item.productId,
        title: item.productTitle || item.title || '',
        skuName: item.skuName || '',
        coverUrl: item.productImage || '',
        rating: 5,
        content: '',
        images: [],
      }));

      this.setData({ items, emptyText: '' });
    } catch {
      this.setData({ emptyText: '加载订单信息失败' });
    }
  },

  onStarTap(e: WechatMiniprogram.BaseEvent) {
    const { index, star } = e.currentTarget.dataset as { index: number; star: number };
    const items = this.data.items as ReviewItem[];
    if (index >= 0 && index < items.length) {
      items[index].rating = star;
      this.setData({ items });
    }
  },

  onContentInput(e: WechatMiniprogram.Input) {
    const index = Number(e.currentTarget.dataset.index);
    const value = String(e.detail.value ?? '');
    const items = this.data.items as ReviewItem[];
    if (index >= 0 && index < items.length) {
      items[index].content = value;
      this.setData({ items });
    }
  },

  async onSubmit() {
    if (!ensureCustomerAccess('/pages/order/review/review')) {
      return;
    }

    const items = this.data.items as ReviewItem[];
    const emptyItem = items.find((item) => !item.content.trim());
    if (emptyItem) {
      wx.showToast({ title: '请填写评价内容', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });

    try {
      await submitOrderReview(this.data.orderNo, {
        reviews: items.map((item) => ({
          orderItemId: item.orderItemId,
          rating: item.rating,
          content: item.content.trim(),
        })),
      });

      wx.showToast({ title: '评价成功', icon: 'success' });
      setTimeout(() => {
        wx.navigateBack({ delta: 1 });
      }, 1000);
    } catch (e: any) {
      wx.showToast({ title: e.message || '提交评价失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },

  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack({ delta: 1 });
      return;
    }
    wx.navigateTo({ url: '/pages/index/index' });
  },
});
