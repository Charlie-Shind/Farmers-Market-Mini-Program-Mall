import { buildPageTopStyle } from '../../../utils/page-layout';
import { fetchMerchantActivityDrafts, publishMerchantActivityDraft } from '../../../services/merchant';

Page<Record<string, any>, Record<string, any>>({
  data: {
    pageStyle: '',
    searchValue: '',

    tabs: [
      { name: '全部', active: true },
      { name: '缺时间', active: false },
      { name: '缺商品', active: false },
      { name: '缺规则', active: false },
      { name: '可发布', active: false },
    ],

    drafts: [] as any[],
  },

  onLoad() { this.setData({ pageStyle: buildPageTopStyle(0) }); this.loadDrafts(); },
  onShow() { this.setData({ pageStyle: buildPageTopStyle(0) }); },

  async loadDrafts() {
    try {
      const result = await fetchMerchantActivityDrafts();
      const items = ((result as any)?.items || []) as any[];
      if (items.length) {
        this.setData({
          drafts: items.map((d: any) => {
            const missing = Array.isArray(d.missingFields) ? d.missingFields : [];
            const canPublish = missing.length === 0;
            return {
              id: String(d.id),
              name: d.title || '未命名活动',
              desc: missing.length
                ? `${missing.join(' · ')} · ${String(d.updatedAt || '').slice(0, 10)}`
                : `已完成配置 · ${String(d.updatedAt || '').slice(0, 10)}`,
              icon: d.activityType === 'GROUP_BUY'
                ? 'package'
                : d.activityType === 'PRESALE'
                  ? 'truck'
                  : d.activityType === 'CASHBACK'
                    ? 'wallet'
                    : 'clock',
              actionText: canPublish ? '发布' : '继续编辑',
              actionType: canPublish ? 'publish' : 'edit',
            };
          }),
        });
      }
    } catch {}
  },

  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack({ delta: 1 });
      return;
    }
    wx.navigateTo({ url: '/pages/merchant/marketing/marketing' });
  },

  onSearchInput(e: any) {
    this.setData({ searchValue: e.detail.value });
  },

  onTabTap(e: any) {
    const index = Number(e.currentTarget.dataset.index);
    const tabs = (this.data.tabs as any[]).map((item, idx) => ({ ...item, active: idx === index }));
    this.setData({ tabs });
  },

  goEdit(e: any) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/merchant/marketing-edit/marketing-edit?id=${id}` });
  },

  goSelectProducts() {
    wx.navigateTo({ url: '/pages/merchant/marketing-products/marketing-products' });
  },

  async publishDraft(e: any) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认发布', content: '发布后活动将立即进入进行中状态',
      success: async (res) => {
        if (!res.confirm) return;
        try { await publishMerchantActivityDraft(id); wx.showToast({ title: '已发布', icon: 'success' }); this.loadDrafts(); }
        catch (err: any) { wx.showToast({ title: err.message || '发布失败', icon: 'none' }); }
      },
    });
  },

  clearExpired() {
    wx.showModal({
      title: '确认清理',
      content: '将删除所有过期草稿',
      confirmColor: '#A6453A',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '已清理过期草稿', icon: 'success' });
        }
      },
    });
  },

  newActivity() {
    wx.navigateTo({ url: '/pages/merchant/marketing-edit/marketing-edit' });
  },
});
