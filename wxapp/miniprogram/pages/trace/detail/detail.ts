import { iconPaths } from '../../../config/icons';
import { fetchChatSupportTarget, fetchTraceDetail, type AppChatSupportTarget, type AppTraceDetail } from '../../../services/app';
import { buildPageTopStyle } from '../../../utils/page-layout';
import { navigateBackOrHome } from '../../../utils/auth-route';

function formatDateTime(value?: string) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

Component({
  data: {
    icons: iconPaths,
    pageStyle: '',
    loading: false,
    traceCode: '',
    traceDetail: null as AppTraceDetail | null,
    recordedAtLabel: '',
    supportTarget: null as AppChatSupportTarget | null,
  },
  lifetimes: {
    attached() {
      this.setData({
        pageStyle: buildPageTopStyle(4),
      });
    },
  },
  pageLifetimes: {
    show() {
      void this.bootstrapTraceDetail();
    },
  },
  methods: {
    async resolveTraceCode() {
      await new Promise((resolve) => setTimeout(resolve, 0));
      const pages = getCurrentPages();
      const current = pages[pages.length - 1] as { options?: Record<string, string> } | undefined;
      return String(current?.options?.traceCode ?? '').trim();
    },
    async bootstrapTraceDetail() {
      const traceCode = await this.resolveTraceCode();
      if (!traceCode) {
        wx.showToast({ title: '缺少溯源码', icon: 'none' });
        setTimeout(() => this.goBack(), 1200);
        return;
      }

      if (traceCode === this.data.traceCode && this.data.traceDetail) {
        return;
      }

      await this.loadTraceDetail(traceCode);
    },
    async loadSupportTarget() {
      try {
        const supportTarget = await fetchChatSupportTarget();
        this.setData({ supportTarget });
      } catch {
        this.setData({ supportTarget: null });
      }
    },
    async loadTraceDetail(traceCode: string) {
      this.setData({
        loading: true,
        traceCode,
      });

      wx.showLoading({ title: '查询中...' });
      try {
        const traceDetail = await fetchTraceDetail(traceCode);
        void this.loadSupportTarget();
        this.setData({
          traceDetail,
          recordedAtLabel: formatDateTime(traceDetail.recordedAt),
        });
      } catch {
        this.setData({
          traceDetail: null,
        });
        wx.showToast({ title: '未找到对应溯源码', icon: 'none' });
      } finally {
        this.setData({ loading: false });
        wx.hideLoading();
      }
    },
    goBack() {
      navigateBackOrHome();
    },
    openProductDetail() {
      const productId = this.data.traceDetail?.product?.id;
      if (!productId) {
        return;
      }

      wx.navigateTo({
        url: `/pages/product/detail/detail?productId=${productId}`,
      });
    },
    contactMerchant() {
      const traceDetail = this.data.traceDetail;
      const target = this.data.supportTarget;

      if (!traceDetail) {
        wx.showToast({ title: '客服信息加载中', icon: 'none' });
        return;
      }

      wx.navigateTo({
        url: `/pages/chat/chat?sceneType=OFFICIAL&sceneLabel=${encodeURIComponent('来自溯源详情')}&sceneSource=${encodeURIComponent(
          traceDetail.product.title || target?.sceneSource || traceDetail.traceCode,
        )}`,
      });
    },
  },
});
