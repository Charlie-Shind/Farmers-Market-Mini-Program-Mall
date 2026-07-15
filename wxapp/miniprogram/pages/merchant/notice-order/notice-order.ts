import { buildPageTopStyle } from '../../../utils/page-layout';
import { fetchMerchantNotices, type MerchantNotice } from '../../../services/merchant';

Page<Record<string, any>, Record<string, any>>({
  data: { pageStyle: '', notices: [] as any[] },

  onLoad() { this.setData({ pageStyle: buildPageTopStyle(0) }); },
  onShow() { this.setData({ pageStyle: buildPageTopStyle(0) }); this.loadNotices(); },

  async loadNotices() {
    try {
      const result = await fetchMerchantNotices({ type: 'ORDER', page: 1, pageSize: 20 });
      const items = ((result as any)?.items || []) as MerchantNotice[];
      this.setData({
        notices: items.map((n, i) => ({
          id: n.noticeId, index: i + 1, title: n.title, desc: n.summary,
          status: n.typeLabel || '订单', pillClass: n.isRead ? 'info' : 'warning',
          link: '/pages/merchant/orders/orders',
        })),
      });
    } catch {}
  },

  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack({ delta: 1 });
      return;
    }
    wx.navigateTo({ url: '/pages/merchant/notice/notice' });
  },

  goPage(e: any) {
    const url = e.currentTarget.dataset.url as string;
    if (!url) return;
    wx.navigateTo({ url });
  },

  openNotice(e: any) {
    const item = e.currentTarget.dataset.item;
    if (item.link) {
      wx.navigateTo({ url: item.link });
    }
  },
});
