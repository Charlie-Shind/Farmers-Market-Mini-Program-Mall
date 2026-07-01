import { buildPageTopStyle } from '../../../utils/page-layout';

Page<Record<string, any>, Record<string, any>>({
  data: {
    pageStyle: '',
    searchKeyword: '',
    categories: [
      { title: '发布商品', icon: 'plus', iconClass: '', url: '/pages/merchant/publish/publish' },
      { title: '订单处理', icon: 'invoice', iconClass: 'info', url: '/pages/merchant/orders/orders' },
      { title: '活动配置', icon: 'star', iconClass: 'accent', url: '/pages/merchant/marketing/marketing' },
      { title: '资金提现', icon: 'wallet', iconClass: 'warn', url: '/pages/merchant/withdraw/withdraw' },
    ],
    faqs: [
      {
        title: '商品多规格怎么设置？',
        desc: '进入发布商品 - 规格库存，先选多规格，再添加规格组和规格组合。',
      },
      {
        title: '活动如何多选商品？',
        desc: '进入发布活动 - 参与商品，勾选商品后保存，草稿可在草稿箱继续编辑。',
      },
      {
        title: '退款申请怎么处理？',
        desc: '进入售后管理，查看买家原因和凭证后再同意或驳回。',
      },
    ],
  },

  onLoad() {
    this.setData({ pageStyle: buildPageTopStyle(8) });
  },

  onShow() {
    this.setData({ pageStyle: buildPageTopStyle(8) });
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

  onSearchInput(e: any) {
    this.setData({ searchKeyword: e.detail.value });
  },

  onCatTap(e: any) {
    const index = Number(e.currentTarget.dataset.index);
    const item = (this.data.categories as any[])[index];
    if (item?.url) {
      wx.navigateTo({ url: item.url });
      return;
    }
    wx.showToast({ title: item.title + '说明', icon: 'none' });
  },

  onFaqTap(e: any) {
    const item = e.currentTarget.dataset.item;
    if (item.title.includes('商品多规格')) {
      wx.navigateTo({ url: '/pages/merchant/publish-sku/publish-sku' });
      return;
    }
    if (item.title.includes('活动如何多选商品')) {
      wx.navigateTo({ url: '/pages/merchant/marketing-publish/marketing-publish' });
      return;
    }
    if (item.title.includes('退款申请')) {
      wx.navigateTo({ url: '/pages/merchant/aftersale/aftersale' });
      return;
    }
    wx.showToast({ title: '已展开：' + item.title, icon: 'none' });
  },
});
