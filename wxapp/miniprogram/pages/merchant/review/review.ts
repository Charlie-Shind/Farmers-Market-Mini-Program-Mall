import { buildPageTopStyle } from '../../../utils/page-layout';
import { fetchReviewSummary, fetchReviewList, replyMerchantReview } from '../../../services/merchant';

interface ReviewViewItem {
  id: string;
  orderNo: string;
  buyer: string;
  avatar: string;
  content: string;
  score: string;
  goodsName: string;
  goodsImg: string;
  starText: string;
  tag: string;
  replyStatus: string;
  replyText: string;
}

Page<Record<string, any>, Record<string, any>>({
  data: {
    pageStyle: '',
    shopScore: '4.8', goodRate: '96%', pendingReply: '0',
    activeChip: 'all',
    allList: [] as any[],
    filteredList: [] as any[],
  },

  onLoad() { this.setData({ pageStyle: buildPageTopStyle(0) }); },
  onShow() { this.setData({ pageStyle: buildPageTopStyle(0) }); this.loadData(); },

  async loadData() {
    try {
      const [summary, result] = await Promise.all([
        fetchReviewSummary().catch(() => null),
        fetchReviewList({ page: 1, pageSize: 50 }).catch(() => null),
      ]);
      if (summary) this.setData({ shopScore: summary.shopScore, goodRate: summary.goodRate, pendingReply: String(summary.pendingReply) });
      if (result) {
        const items = ((result as any).items || []) as any[];
        this.setData({
          allList: items.map((r: any) => ({
            id: String(r.id),
            orderNo: String(r.orderNo || ''),
            buyer: r.buyer?.nickname || '',
            avatar: r.buyer?.avatarUrl || '',
            content: r.content || '',
            score: String(r.rating),
            goodsName: r.product?.title || '',
            goodsImg: r.product?.coverUrl || '',
            starText: `${r.rating}星`,
            tag: r.rating >= 4 ? 'good' : r.rating >= 3 ? 'normal' : 'bad',
            replyStatus: r.replyContent ? 'done' : 'todo',
            replyText: r.replyContent ? '已回复' : '待回复',
          })),
        }, () => this.applyFilter());
      }
    } catch (e: any) {
      wx.showToast({ title: e.message || '评价加载失败', icon: 'none' });
    }
  },

  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack({ delta: 1 });
      return;
    }
    wx.navigateTo({ url: '/pages/merchant/orders/orders' });
  },

  goPage(e: any) {
    const url = e.currentTarget.dataset.url as string;
    if (!url) return;
    wx.navigateTo({ url });
  },

  onChipTap(e: any) {
    this.setData({ activeChip: e.currentTarget.dataset.chip });
    this.applyFilter();
  },

  applyFilter() {
    const list = this.data.allList as any[];
    const chip = this.data.activeChip as string;
    let filtered = list;
    if (chip === 'todo') filtered = list.filter((item: any) => item.replyStatus === 'todo');
    else if (chip !== 'all') filtered = list.filter((item: any) => item.tag === chip);
    this.setData({ filteredList: filtered });
  },

  goOrderDetail(_e: any) {
    const orderNo = String(_e.currentTarget.dataset.orderNo || '');
    if (!orderNo) return;
    wx.navigateTo({ url: `/pages/merchant/order-detail/order-detail?orderNo=${orderNo}` });
  },

  copyReview(e: any) {
    const id = e.currentTarget.dataset.id as string;
    const item = (this.data.allList as ReviewViewItem[]).find(r => r.id === id);
    if (item) {
      wx.setClipboardData({ data: item.content, success: () => {
        wx.showToast({ title: '已复制评价', icon: 'success' });
      }});
    }
  },

  async replyReview(e: any) {
    const id = Number(e.currentTarget?.dataset?.id || 0);
    if (!id) return;
    try {
      await replyMerchantReview(id, '感谢您的评价！');
      wx.showToast({ title: '已回复评价', icon: 'success' });
      this.loadData();
    } catch (e: any) { wx.showToast({ title: e.message || '回复失败', icon: 'none' }); }
  },

  showToast() {
    wx.showToast({ title: '操作已记录', icon: 'none' });
  },
});
