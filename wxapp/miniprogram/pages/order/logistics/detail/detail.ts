import { iconPaths } from '../../../../config/icons';
import { fetchOrderLogisticsDetail } from '../../../../services/app';
import { buildPageTopStyle } from '../../../../utils/page-layout';
import { navigateBackOrHome } from '../../../../utils/auth-route';

type LogisticsDetail = {
  orderNo: string;
  logisticsCompany: string;
  logisticsCode: string;
  trackingNo: string;
  status: string;
  statusLabel: string;
  shippedAt: string | null;
  deliveredAt: string | null;
  updatedAt: string;
  timeline: LogisticsTimelineItem[];
};

type LogisticsTimelineItem = {
  time: string | null;
  title: string;
  desc: string;
  status: 'done' | 'pending';
};

type ProgressStep = {
  key: string;
  title: string;
  timeText: string;
  done: boolean;
  current: boolean;
  icon: string;
};

type TrackItem = {
  key: string;
  title: string;
  timeText: string;
  desc: string;
  done: boolean;
  current: boolean;
};

function formatDateTime(value?: string | null, compact = false) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  if (compact) {
    return `${month}-${day} ${hours}:${minutes}`;
  }
  const year = date.getFullYear();
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function resolveStatusCopy(order?: LogisticsDetail | null) {
  if (!order) {
    return { label: '加载中', sub: '正在同步物流信息…' };
  }
  if (order.status === 'DELIVERED') {
    return { label: '已签收', sub: '包裹已签收，祝您购物愉快' };
  }
  if (order.status === 'IN_TRANSIT') {
    return { label: '运输中', sub: '包裹正在运输中，请耐心等待' };
  }
  return { label: '等待发货', sub: '商家正在备货，发货后可查看物流轨迹' };
}

function buildProgressSteps(order?: LogisticsDetail | null): ProgressStep[] {
  const timeline = order?.timeline || [];
  const status = order?.status || 'PENDING_SHIP';
  const currentIndex =
    status === 'DELIVERED' ? 4 : status === 'IN_TRANSIT' ? 2 : 1;

  const defs = [
    { key: 'submit', title: '订单提交', icon: 'check', time: timeline[0]?.time },
    { key: 'wait', title: '等待发货', icon: 'package', time: timeline[1]?.time },
    { key: 'transit', title: '运输中', icon: 'truck', time: timeline[2]?.time || order?.shippedAt },
    { key: 'shipped', title: '已发货', icon: 'delivering', time: timeline[2]?.time || order?.shippedAt },
    { key: 'signed', title: '已签收', icon: 'signed', time: timeline[3]?.time || order?.deliveredAt },
  ];

  return defs.map((item, index) => {
    const done = index < currentIndex || status === 'DELIVERED';
    const current = index === currentIndex;
    const showTime = done || current;
    return {
      key: item.key,
      title: item.title,
      icon: item.icon,
      timeText: showTime ? formatDateTime(item.time, true) : '',
      done: done && !current,
      current,
    };
  });
}

function buildTrackItems(order?: LogisticsDetail | null): TrackItem[] {
  const timeline = [...(order?.timeline || [])].reverse();
  const items: TrackItem[] = timeline.map((item, index) => ({
    key: `api-${index}`,
    title: item.title,
    timeText: formatDateTime(item.time),
    desc: item.desc || '',
    done: item.status === 'done',
    current: false,
  }));

  if (!items.length) {
    return items;
  }

  const firstDoneIndex = items.findIndex((item) => item.done);
  if (firstDoneIndex >= 0) {
    items[firstDoneIndex] = { ...items[firstDoneIndex], current: true };
  } else {
    items[0] = { ...items[0], current: true };
  }

  return items;
}

Page({
  data: {
    icons: iconPaths,
    pageStyle: '',
    heroBg: '/assets/images/order/status-bg-green.jpg',
    loading: true,
    orderNo: '',
    order: null as LogisticsDetail | null,
    statusLabel: '',
    statusSubLabel: '',
    progressSteps: [] as ProgressStep[],
    trackItems: [] as TrackItem[],
    companyInitial: '物',
  },
  onLoad(options) {
    this.setData({
      pageStyle: buildPageTopStyle(0),
    });

    const orderNo = options.orderNo || '';
    if (!orderNo) {
      wx.showToast({ title: '缺少订单编号', icon: 'none' });
      setTimeout(() => navigateBackOrHome(1), 800);
      return;
    }

    this.setData({ orderNo });
    void this.loadOrder(orderNo);
  },
  async loadOrder(orderNo: string) {
    this.setData({ loading: true });
    try {
      const order = await fetchOrderLogisticsDetail(orderNo);
      const copy = resolveStatusCopy(order);
      const company = String(order.logisticsCompany || '物流').trim();
      this.setData({
        order,
        statusLabel: copy.label,
        statusSubLabel: copy.sub,
        progressSteps: buildProgressSteps(order),
        trackItems: buildTrackItems(order),
        companyInitial: company.slice(0, 1) || '物',
      });
    } catch (err: any) {
      wx.showToast({ title: err?.message || '加载物流信息失败', icon: 'none' });
      this.setData({
        order: null,
        statusLabel: '',
        statusSubLabel: '',
        progressSteps: [],
        trackItems: [],
      });
    } finally {
      this.setData({ loading: false });
    }
  },
  goBack() {
    navigateBackOrHome(1);
  },
  openOrderDetail() {
    if (!this.data.orderNo) {
      return;
    }
    wx.navigateTo({
      url: `/pages/order/detail/detail?orderNo=${this.data.orderNo}`,
    });
  },
  openContact() {
    wx.navigateTo({
      url: '/pages/profile/contact/contact',
    });
  },
  copyTrackingNumber() {
    const trackingNo = this.data.order?.trackingNo;
    if (!trackingNo) {
      wx.showToast({ title: '暂无快递单号', icon: 'none' });
      return;
    }
    wx.setClipboardData({
      data: trackingNo,
      success: () => wx.showToast({ title: '单号已复制', icon: 'success' }),
    });
  },
});
