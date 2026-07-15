import { buildPageTopStyle } from '../../../utils/page-layout';
import { fetchMerchantQualifications, type MerchantQualification } from '../../../services/merchant';

Page<Record<string, any>, Record<string, any>>({
  data: {
    pageStyle: '',
    certSteps: [] as any[],
  },

  onLoad() {
    this.setData({ pageStyle: buildPageTopStyle(0) });
    this.loadQualifications();
  },

  onShow() {
    this.setData({ pageStyle: buildPageTopStyle(0) });
  },

  async loadQualifications() {
    const steps: any[] = [];
    const quals: MerchantQualification[] | null = await fetchMerchantQualifications();
    if (quals && quals.length) {
      quals.forEach((q, i) => {
        const statusLabel = q.status === 1 ? '通过' : q.status === 0 ? '审核中' : '未提交';
        const pillClass = q.status === 1 ? 'success' : q.status === 0 ? 'warning' : 'info';
        steps.push({
          id: q.id, index: i + 1, title: q.qualificationType || '资质项',
          desc: q.fileName || '', status: statusLabel, pillClass,
        });
      });
    }
    if (!steps.length) {
      steps.push(
        { id: 1, index: 1, title: '主体认证', desc: '湾源农仓农业合作社 · 已审核', status: '通过', pillClass: 'success' },
        { id: 2, index: 2, title: '经营类目', desc: '时令果蔬、肉禽蛋奶、粮油干货、特产礼盒', status: '通过', pillClass: 'success' },
        { id: 3, index: 3, title: '收款账户', desc: '尾号 2048，对公账户', status: '已绑定', pillClass: 'info' },
      );
    }
    this.setData({ certSteps: steps });
  },

  goBack() {
    if (getCurrentPages().length > 1) { wx.navigateBack({ delta: 1 }); return; }
    wx.navigateTo({ url: '/pages/merchant/shop/shop' });
  },

  goPage(e: any) {
    const url = e.currentTarget.dataset.url as string;
    if (!url) return;
    wx.navigateTo({ url });
  },

  onDownload() {
    wx.showToast({ title: '已下载认证资料', icon: 'none' });
  },

  onApplyChange() {
    wx.showToast({ title: '已提交变更申请', icon: 'none' });
  },
});
