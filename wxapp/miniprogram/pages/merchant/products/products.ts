import { buildPageTopStyle } from '../../../utils/page-layout';
import { fetchMerchantProducts, updateMerchantProductStatus, type MerchantProduct } from '../../../services/merchant';

function mapStatus(p: MerchantProduct) {
  const s = String(p.status ?? '');
  const a = String(p.auditStatus ?? '');
  const normalizedStatus = s === '0' ? '已下架' : s === '1' ? '上架中' : s;
  const normalizedAudit = a === '1' ? '待审核' : a === '2' ? '已通过' : a === '3' ? '已驳回' : a;
  if (normalizedStatus === 'OFF_SHELF' || normalizedStatus === '已下架') {
    return { status: '已下架', statusType: 'danger', actionText: '上架', action: 'online', actionType: 'primary' };
  }
  if (normalizedAudit === 'PENDING' || normalizedAudit === '待审核') {
    return { status: '审核中', statusType: 'info', actionText: '下架', action: 'offline', actionType: 'ghost' };
  }
  if (normalizedAudit === 'REJECTED' || normalizedAudit === '已驳回') {
    return { status: '审核驳回', statusType: 'danger', actionText: '下架', action: 'offline', actionType: 'ghost' };
  }
  const sv = Number(p.stockValue || p.stock || 0);
  if (sv <= 0) return { status: '库存低', statusType: 'warning', actionText: '下架', action: 'offline', actionType: 'ghost' };
  if (sv < 10) return { status: '库存低', statusType: 'warning', actionText: '下架', action: 'offline', actionType: 'ghost' };
  return { status: '出售中', statusType: 'success', actionText: '下架', action: 'offline', actionType: 'ghost' };
}

function mapToggledStatus(currentAction: string) {
  if (currentAction === 'online') {
    return { status: '出售中', statusType: 'success', actionText: '下架', action: 'offline', actionType: 'ghost' };
  }
  return { status: '已下架', statusType: 'danger', actionText: '上架', action: 'online', actionType: 'primary' };
}

Page<Record<string, any>, Record<string, any>>({
  data: {
    pageStyle: '',
    loading: true,
    nav: [
      { name: '首页', icon: 'home', url: '/pages/merchant/dashboard/dashboard?tab=0', active: false, tab: 0 },
      { name: '聊天', icon: 'message', url: '/pages/merchant/messages/messages?tab=1', active: false, tab: 1 },
      { name: '订单', icon: 'invoice', url: '/pages/merchant/orders/orders?tab=2', active: false, tab: 2 },
      { name: '库存', icon: 'package', url: '/pages/merchant/products/products?tab=3', active: true, tab: 3 },
      { name: '账号', icon: 'profile', url: '/pages/merchant/shop/shop?tab=4', active: false, tab: 4 },
    ],
    tabs: [
      { name: '全部', active: true }, { name: '出售中', active: false },
      { name: '审核中', active: false }, { name: '已下架', active: false }, { name: '库存低', active: false },
    ],
    filters: [
      { name: '最新排序', active: true }, { name: '销量优先', active: false },
      { name: '库存低', active: false }, { name: '活动商品', active: false },
    ],
    allProducts: [] as any[],
    products: [] as any[],
    draftCount: 0,
  },

  onLoad() { this.setData({ pageStyle: buildPageTopStyle(0) }); },
  onShow() {
    this.setData({ pageStyle: buildPageTopStyle(0) });
    this.loadProducts();
    this.updateDraftCount();
  },

  async loadProducts() {
    this.setData({ loading: true });
    try {
      const result = await fetchMerchantProducts({ page: 1, pageSize: 100 });
      const items = ((result as any).items || result || []) as MerchantProduct[];
      const dedupedItems = Array.from(
        new Map(items.map((item: MerchantProduct) => [String(item.productId || item.skuId || item.title || ''), item])).values(),
      );
      const allProducts = dedupedItems.map((p: MerchantProduct) => {
        const mapped = mapStatus(p);
        return {
          id: String(p.productId),
          productId: p.productId,
          image: p.coverUrl || '/assets/goods/g1.svg',
          title: p.title,
          meta: `${p.categoryName || '未分类'} · ${p.subtitle || ''}`,
          inventory: `库存 ${p.stockValue || p.stock || 0}`,
          sales: `已售 -`,
          extra: p.updatedAt ? `更新于 ${p.updatedAt.slice(5, 10)}` : '',
          price: `¥${p.price || '0'}`,
          status: mapped.status,
          statusType: mapped.statusType,
          actionText: mapped.actionText,
          action: mapped.action,
          actionType: mapped.actionType,
        };
      });
      this.setData({ allProducts, loading: false });
      this.applyFilter();
    } catch (e: any) {
      wx.showToast({ title: e.message || '加载失败', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  updateDraftCount() {
    try {
      const raw1 = wx.getStorageSync('merchant_product_drafts') || '[]';
      const raw2 = wx.getStorageSync('merchant-product-draft-v2');
      const count1 = JSON.parse(raw1).length;
      const count2 = raw2 ? 1 : 0;
      this.setData({ draftCount: count1 + count2 });
    } catch { this.setData({ draftCount: 0 }); }
  },

  applyFilter() {
    const all = this.data.allProducts as any[];
    const activeTab = (this.data.tabs as any[]).find((t: any) => t.active);
    const tabName = activeTab?.name;
    let filtered: any[];
    if (!tabName || tabName === '全部') filtered = all;
    else if (tabName === '库存低') filtered = all.filter((p: any) => p.statusType === 'warning');
    else filtered = all.filter((p: any) => p.status === tabName);
    this.setData({ products: filtered });
  },

  goPage(e: any) { const url = e.currentTarget.dataset.url as string; if (url) wx.navigateTo({ url }); },
  goPublish() { wx.navigateTo({ url: '/pages/merchant/products/edit/edit' }); },
  goDrafts() { wx.navigateTo({ url: '/pages/merchant/product-drafts/product-drafts' }); },
  showSearch() { wx.showToast({ title: '搜索商品', icon: 'none' }); },
  showFilter() { wx.showToast({ title: '筛选已打开', icon: 'none' }); },

  onTabTap(e: any) {
    const index = Number(e.currentTarget.dataset.index);
    const tabs = (this.data.tabs as any[]).map((item, idx) => ({ ...item, active: idx === index }));
    this.setData({ tabs }, () => this.applyFilter());
  },

  onFilterTap(e: any) {
    const index = Number(e.currentTarget.dataset.index);
    const filters = (this.data.filters as any[]).map((item, idx) => ({ ...item, active: idx === index }));
    let filtered = this.data.allProducts as any[];
    if (index === 2) filtered = filtered.filter((p: any) => p.statusType === 'warning');
    else if (index === 3) filtered = filtered.filter((p: any) => p.status === '出售中');
    this.setData({ filters, products: filtered });
  },

  editProduct(e: any) {
    const productId = e.currentTarget?.dataset?.productId;
    if (productId) wx.navigateTo({ url: `/pages/merchant/products/edit/edit?productId=${productId}` });
    else wx.showToast({ title: '缺少商品ID', icon: 'none' });
  },

  async toggleProduct(e: any) {
    const action = e.currentTarget.dataset.action as string;
    const productId = Number(e.currentTarget.dataset.productId);
    if (!productId) { wx.showToast({ title: '缺少商品ID', icon: 'none' }); return; }
    const newStatus = action === 'online' ? 'ON_SHELF' : 'OFF_SHELF';
    const optimistic = mapToggledStatus(action);
    const allProducts = (this.data.allProducts as any[]).map((item) => {
      if (Number(item.productId) !== productId) return item;
      return { ...item, ...optimistic };
    });
    this.setData({ allProducts }, () => this.applyFilter());
    try {
      await updateMerchantProductStatus(productId, newStatus);
      wx.showToast({ title: action === 'online' ? '已上架' : '已下架', icon: 'success' });
    } catch (e: any) {
      wx.showToast({ title: e.message || '操作失败', icon: 'none' });
    }
  },
});
