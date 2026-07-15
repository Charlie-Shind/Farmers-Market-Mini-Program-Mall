import { buildPageTopStyle } from '../../../utils/page-layout';
import { fetchCategories, type AppCategory } from '../../../services/app';

function getCategoryText(category: any): string {
  return String(category?.name || category?.label || category?.title || '').trim();
}

function joinCategoryName(parentName: string, childName: string): string {
  return [parentName, childName].map((item) => String(item || '').trim()).filter(Boolean).join(' / ');
}

Page<Record<string, any>, Record<string, any>>({
  data: {
    pageStyle: '',
    slug: 'publish-category',
    loading: true,
    selectedPrimary: 0,
    selectedSub: 0,
    primaryCategories: [] as any[],
    subCategories: [] as any[],
    selectedCategoryId: 0,
    selectedCategoryName: '',
  },

  onLoad() {
    this.setData({ pageStyle: buildPageTopStyle(0) });
    this.loadCategories();
  },

  onShow() {
    this.setData({ pageStyle: buildPageTopStyle(0) });
  },

  async loadCategories() {
    this.setData({ loading: true });
    try {
      const list = await fetchCategories();
      if (!list || !list.length) {
        this.setData({ loading: false });
        return;
      }

      const primaryCategories = list.map((cat: AppCategory, idx: number) => ({
        id: cat.id,
        name: getCategoryText(cat),
        active: idx === 0,
      }));

      const children = list[0]?.children || [];
      const subCategories = children.map((child: any) => ({
        id: child.id,
        name: getCategoryText(child),
        desc: '',
        icon: 'package',
        active: false,
        recommended: false,
      }));

      this.setData({
        primaryCategories,
        subCategories,
        selectedCategoryId: 0,
        loading: false,
      });
    } catch (e: any) {
      wx.showToast({ title: e.message || '加载分类失败', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack({ delta: 1 });
      return;
    }
    wx.navigateTo({ url: '/pages/merchant/publish/publish' });
  },

  onPrimaryTap(e: any) {
    const index = Number(e.currentTarget.dataset.index);
    const primaryCategories = (this.data.primaryCategories as any[]).map((item, idx) => ({
      ...item,
      active: idx === index,
    }));
    this.setData({ primaryCategories, selectedPrimary: index, selectedSub: 0, selectedCategoryId: 0 });

    // 重新加载原始数据获取该一级类目下的二级分类
    this.loadSubCategories(index);
  },

  async loadSubCategories(primaryIndex: number) {
    try {
      const list = await fetchCategories();
      if (!list || !list[primaryIndex]) return;

      const children = list[primaryIndex].children || [];
      const subCategories = children.map((child: any) => ({
        id: child.id,
        name: getCategoryText(child),
        desc: '',
        icon: 'package',
        active: false,
        recommended: false,
      }));
      this.setData({ subCategories });
    } catch {
      // 静默失败，保留旧子分类
    }
  },

  onSubTap(e: any) {
    const index = Number(e.currentTarget.dataset.index);
    const subCategories = (this.data.subCategories as any[]).map((item, idx) => ({
      ...item,
      active: idx === index,
    }));
    const selected = subCategories[index];
    this.setData({
      subCategories,
      selectedSub: index,
      selectedCategoryId: selected ? selected.id : 0,
      selectedCategoryName: selected ? selected.name : '',
    });
  },

  confirmCategory() {
    const selected = (this.data.subCategories as any[])[this.data.selectedSub];
    if (!selected || !selected.id) {
      wx.showToast({ title: '请选择一个分类', icon: 'none' });
      return;
    }

    // 将选中的分类写回上一页
    const pages = getCurrentPages();
    const prevPage = pages[pages.length - 2];
    if (prevPage) {
      const primaryName = (this.data.primaryCategories as any[])[this.data.selectedPrimary]?.name || '';
      const categoryName = joinCategoryName(primaryName, selected.name);
      prevPage.setData({
        categoryName,
        categoryDisplayName: categoryName,
        categoryId: selected.id,
      });
    }

    wx.showToast({ title: '已选择分类', icon: 'success' });
    setTimeout(() => {
      wx.navigateBack({ delta: 1 });
    }, 500);
  },
});
