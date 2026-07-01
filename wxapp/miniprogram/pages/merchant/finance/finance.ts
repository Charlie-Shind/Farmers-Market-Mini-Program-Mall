import { buildPageTopStyle } from '../../../utils/page-layout';
import { fetchMerchantWallet, fetchMerchantFinanceRecords, type FinanceRecord } from '../../../services/merchant';

Page<Record<string, any>, Record<string, any>>({
  data: {
    pageStyle: '',
    loading: true,
    balance: '0.00',
    frozen: '0.00',
    weekIncome: '0.00',
    activeChip: 'all',
    showFilter: false,
    filterType: 'all',
    filterTime: 'today',
    filterAmount: 'all',
    financeList: [] as any[],
    filteredList: [] as any[],
  },

  onLoad() {
    this.setData({ pageStyle: buildPageTopStyle(8) });
  },

  onShow() {
    this.setData({ pageStyle: buildPageTopStyle(8) });
    this.loadData();
  },

  async loadData() {
    this.setData({ loading: true });
    try {
      const [wallet, records] = await Promise.all([
        fetchMerchantWallet().catch(() => null),
        fetchMerchantFinanceRecords().catch(() => []),
      ]);
      if (wallet) {
        this.setData({
          balance: wallet.availableAmount || '0',
          frozen: wallet.frozenAmount || '0',
          weekIncome: wallet.totalIncome || '0',
        });
      }
      if (records && records.length) {
        const list = records.map((r: FinanceRecord) => ({
          typeName: r.title,
          orderNo: r.desc || '',
          amount: r.tone === 'green' ? Number(r.amount) : -Number(r.amount),
          amountText: r.amount,
          type: r.tone === 'warn' ? 'withdraw' : r.tone === 'danger' ? 'refund' : 'income',
        }));
        this.setData({ financeList: list, loading: false }, () => this.applyFilterToList());
      } else {
        this.setData({ financeList: [], filteredList: [], loading: false });
      }
    } catch {
      this.setData({ loading: false });
    }
  },

  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack({ delta: 1 });
      return;
    }
    wx.navigateTo({ url: '/pages/merchant/shop/shop' });
  },

  goPage(e: any) {
    const url = e.currentTarget.dataset.url as string;
    if (!url) return;
    wx.navigateTo({ url });
  },

  goWithdraw() {
    wx.navigateTo({ url: '/pages/merchant/withdraw/withdraw' });
  },

  goStatistics() {
    wx.navigateTo({ url: '/pages/merchant/statistics/statistics' });
  },

  onChipTap(e: any) {
    const chip = e.currentTarget.dataset.chip as string;
    this.setData({ activeChip: chip, filterType: chip }, () => this.applyFilterToList());
  },

  openFilter() {
    this.setData({ showFilter: true });
  },

  closeFilter() {
    this.setData({ showFilter: false });
  },

  setFilterType(e: any) {
    this.setData({ filterType: e.currentTarget.dataset.type });
  },

  setFilterTime(e: any) {
    this.setData({ filterTime: e.currentTarget.dataset.time });
  },

  setFilterAmount(e: any) {
    this.setData({ filterAmount: e.currentTarget.dataset.amount });
  },

  resetFilter() {
    this.setData({ filterType: 'all', filterTime: 'today', filterAmount: 'all' });
  },

  applyFilter() {
    this.setData({ showFilter: false, activeChip: this.data.filterType }, () => this.applyFilterToList());
  },

  applyFilterToList() {
    const list = this.data.financeList as any[];
    const type = this.data.filterType as string;
    const filtered = type === 'all' ? list : list.filter((item: any) => item.type === type);
    this.setData({ filteredList: filtered });
  },

  exportBill() {
    wx.showToast({ title: '账单导出中，请稍候', icon: 'none' });
  },
});
