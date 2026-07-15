import { buildPageTopStyle } from '../../../utils/page-layout';
import { fetchActivityProductCandidates, type ActivityProductCandidate } from '../../../services/merchant';

Page<Record<string, any>, Record<string, any>>({
  data: {
    pageStyle: '',
    searchValue: '',
    selectedCount: 0,

    chips: [
      { name: '全部', active: true },
      { name: '果蔬', active: false },
      { name: '礼盒', active: false },
      { name: '低库存', active: false },
      { name: '活动中', active: false },
    ],

    products: [] as any[],
  },

  onLoad() { this.setData({ pageStyle: buildPageTopStyle(0) }); this.loadCandidates(); },
  onShow() { this.setData({ pageStyle: buildPageTopStyle(0) }); },

  async loadCandidates() {
    try {
      const result = await fetchActivityProductCandidates({ page: 1, pageSize: 50 });
      const items = ((result as any)?.items || []) as ActivityProductCandidate[];
      if (items.length) {
        const selected = wx.getStorageSync('merchant_activity_selected_product');
        const products = items.map((p) => ({
          id: String(p.productId), name: p.title, cover: p.coverUrl, stock: p.totalStock,
          originPrice: p.maxPrice, activityPrice: p.minPrice, checked: selected && String(selected.id) === String(p.productId),
        }));
        this.setData({ products, selectedCount: products.filter((p) => p.checked).length, filteredList: products });
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

  onChipTap(e: any) {
    const index = Number(e.currentTarget.dataset.index);
    const chips = (this.data.chips as any[]).map((item, idx) => ({ ...item, active: idx === index }));
    this.setData({ chips });
  },

  toggleProduct(e: any) {
    const index = Number(e.currentTarget.dataset.index);
    const products = (this.data.products as any[]).map((item, idx) => ({
      ...item,
      checked: idx === index,
    }));
    this.setData({ products, selectedCount: 1 });
  },

  clearSelection() {
    const products = (this.data.products as any[]).map((p) => ({ ...p, checked: false }));
    this.setData({ products, selectedCount: 0 });
    wx.removeStorageSync('merchant_activity_selected_product');
    wx.showToast({ title: '已清空选择', icon: 'none' });
  },

  confirmSelection() {
    const count = this.data.selectedCount;
    if (count === 0) {
      wx.showToast({ title: '请选择商品', icon: 'none' });
      return;
    }
    const selected = (this.data.products as any[]).find((p) => p.checked);
    if (selected) {
      wx.setStorageSync('merchant_activity_selected_product', selected);
    }
    wx.showToast({ title: '已选择 1 件商品', icon: 'success' });
    setTimeout(() => {
      wx.navigateBack({ delta: 1 });
    }, 600);
  },
});
