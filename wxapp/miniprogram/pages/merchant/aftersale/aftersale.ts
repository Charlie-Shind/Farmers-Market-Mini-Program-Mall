import { buildPageTopStyle } from '../../../utils/page-layout';
import { fetchAfterSaleList, type AfterSaleItem } from '../../../services/merchant';

Page<Record<string, any>, Record<string, any>>({
  data: {
    pageStyle: '',
    keyword: '',
    activeTab: 'all',
    showFilter: false,
    filterType: 'all',
    allList: [] as any[],
    filteredList: [] as any[],
  },

  onLoad() { this.setData({ pageStyle: buildPageTopStyle(0) }); },
  onShow() { this.setData({ pageStyle: buildPageTopStyle(0) }); this.loadList(); },

  async loadList() {
    try {
      const result = await fetchAfterSaleList({ page: 1, pageSize: 50 });
      const items = ((result as any).items || []) as AfterSaleItem[];
      this.setData({
        allList: items.map((a: AfterSaleItem) => ({
          id: a.refundNo, buyer: a.buyer?.nickname || '', avatar: a.buyer?.avatarUrl || '',
          statusText: a.statusLabel, statusType: a.status === 1 ? 'danger' : a.status === 2 ? '' : 'success',
          statusKey: a.status === 1 ? 'pending' : a.status === 2 ? 'return' : 'done',
          goodsName: a.item?.title || '', goodsImg: a.item?.coverUrl || '',
          reason: `退款金额 ¥${a.refundAmount} · 原因：${a.applyReason}`,
          amount: a.refundAmount, type: a.applyType === 1 ? 'refund' : 'return',
          canContact: true, canHandle: a.status === 1, canUrge: a.status === 2,
        })),
      }, () => this.applyFilters());
    } catch (e: any) {
      wx.showToast({ title: e.message || '售后列表加载失败', icon: 'none' });
    }
  },

  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack({ delta: 1 });
      return;
    }
    wx.navigateTo({ url: '/pages/merchant/workbench/workbench' });
  },

  goPage(e: any) {
    const url = e.currentTarget.dataset.url as string;
    if (!url) return;
    wx.navigateTo({ url });
  },

  onSearch(e: any) {
    this.setData({ keyword: e.detail.value });
    this.applyFilters();
  },

  onTabTap(e: any) {
    this.setData({ activeTab: e.currentTarget.dataset.tab });
    this.applyFilters();
  },

  openFilter() { this.setData({ showFilter: true }); },
  closeFilter() { this.setData({ showFilter: false }); },
  setFilterType(e: any) { this.setData({ filterType: e.currentTarget.dataset.type }); },

  applyFilter() {
    this.setData({ showFilter: false });
    this.applyFilters();
    wx.showToast({ title: '已应用筛选', icon: 'none' });
  },

  applyFilters() {
    const list = this.data.allList as any[];
    const keyword = (this.data.keyword as string || '').toLowerCase();
    const tab = this.data.activeTab as string;
    const type = this.data.filterType as string;
    let filtered = list;
    if (tab !== 'all') filtered = filtered.filter((item: any) => item.statusKey === tab);
    if (type !== 'all') filtered = filtered.filter((item: any) => item.type === type);
    if (keyword) filtered = filtered.filter((item: any) => item.buyer.includes(keyword) || item.goodsName.includes(keyword));
    this.setData({ filteredList: filtered });
  },

  goRefund(e: any) {
    const id = e.currentTarget.dataset.id as string;
    wx.navigateTo({ url: `/pages/merchant/refund/refund?id=${id}` });
  },

  contactBuyer() {
    wx.showToast({ title: '已联系买家', icon: 'success' });
  },

  urgeReturn() {
    wx.showToast({ title: '已催买家寄回', icon: 'success' });
  },

  showToast() {
    wx.showToast({ title: '操作已记录', icon: 'none' });
  },
});
