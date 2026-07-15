import { buildPageTopStyle } from '../../../utils/page-layout';
import { fetchMerchantNotices, type MerchantNotice } from '../../../services/merchant';

Page<Record<string, any>, Record<string, any>>({
  data: { pageStyle: '', notices: [] as any[] },

  onLoad() { this.setData({ pageStyle: buildPageTopStyle(0) }); },
  onShow() { this.setData({ pageStyle: buildPageTopStyle(0) }); this.loadNotices(); },

  async loadNotices() {
    try {
      const result = await fetchMerchantNotices({ type: 'SYSTEM', page: 1, pageSize: 20 });
      const items = ((result as any)?.items || []) as MerchantNotice[];
      this.setData({
        notices: items.map((n) => ({
          id: n.noticeId, title: n.title, desc: n.summary,
          icon: 'star', iconClass: n.isRead ? '' : 'ok',
          link: '/pages/merchant/marketing/marketing',
        })),
      });
    } catch {}
  },

  goBack() {
    if (getCurrentPages().length > 1) { wx.navigateBack({ delta: 1 }); return; }
    wx.navigateTo({ url: '/pages/merchant/notice/notice' });
  },
  goPage(e: any) { const url = e.currentTarget.dataset.url; if (url) wx.navigateTo({ url }); },
  openNotice(e: any) {
    const link = e.currentTarget.dataset.item?.link;
    if (link) wx.navigateTo({ url: link });
  },
});
