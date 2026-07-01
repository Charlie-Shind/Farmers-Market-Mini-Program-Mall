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

type TimelineStep = {
  key: string;
  title: string;
  desc: string;
  active: boolean;
};

type LogisticsTimelineItem = {
  time: string | null;
  title: string;
  desc: string;
  status: 'done' | 'pending';
};

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

function resolveStatusLabel(order?: LogisticsDetail | null) {
  if (!order) {
    return '加载中';
  }

  return order.statusLabel || '物流已更新';
}

function resolveStatusSubLabel(order?: LogisticsDetail | null) {
  if (!order) {
    return '';
  }

  if (order.status === 'DELIVERED') {
    return '包裹已签收，可前往订单详情继续处理售后。';
  }

  if (order.status === 'IN_TRANSIT') {
    return '包裹已出库，正在运送中。';
  }

  return '订单已提交，等待商家配货。';
}

function buildTimeline(order?: LogisticsDetail | null): TimelineStep[] {
  const timeline = order?.timeline || [];
  return [
    {
      key: 'submit',
      title: '订单已提交',
      desc: timeline[0]?.time ? `下单时间 ${formatDateTime(timeline[0].time || undefined)}` : timeline[0]?.desc || '等待商家审核和配货',
      active: true,
    },
    {
      key: 'pay',
      title: '等待发货',
      desc: timeline[1]?.time ? `付款时间 ${formatDateTime(timeline[1].time || undefined)}` : timeline[1]?.desc || '等待完成支付',
      active: timeline[1]?.status === 'done' || order?.status !== 'PENDING_SHIP',
    },
    {
      key: 'delivery',
      title: '运输中',
      desc: timeline[2]?.time ? `${formatDateTime(timeline[2].time || undefined)} · ${timeline[2].desc}` : timeline[2]?.desc || '物流节点更新后将显示最新信息',
      active: timeline[2]?.status === 'done' || order?.status === 'IN_TRANSIT' || order?.status === 'DELIVERED',
    },
    {
      key: 'signed',
      title: '已签收',
      desc: timeline[3]?.time ? `${formatDateTime(timeline[3].time || undefined)} · ${timeline[3].desc}` : timeline[3]?.desc || '签收后可在订单详情申请售后',
      active: timeline[3]?.status === 'done' || order?.status === 'DELIVERED',
    },
  ];
}

Page({
  data: {
    icons: iconPaths,
    pageStyle: '',
    loading: true,
    orderNo: '',
    order: null as LogisticsDetail | null,
    statusLabel: '',
    statusSubLabel: '',
    timeline: [] as TimelineStep[],
  },
  onLoad(options) {
    this.setData({
      pageStyle: buildPageTopStyle(4),
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
      this.setData({
        order,
        statusLabel: resolveStatusLabel(order),
        statusSubLabel: resolveStatusSubLabel(order),
        timeline: buildTimeline(order),
      });
    } catch (err: any) {
      wx.showToast({ title: err?.message || '加载物流信息失败', icon: 'none' });
      this.setData({
        order: null,
        statusLabel: '',
        statusSubLabel: '',
        timeline: [],
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
  copyOrderNumber() {
    if (!this.data.orderNo) {
      return;
    }

    wx.setClipboardData({
      data: this.data.orderNo,
      success: () => wx.showToast({ title: '单号已复制', icon: 'success' }),
    });
  },
  copyTrackingNumber(e: WechatMiniprogram.BaseEvent) {
    const { expressNo } = e.currentTarget.dataset as { expressNo?: string };
    if (!expressNo) {
      return;
    }

    wx.setClipboardData({
      data: expressNo,
      success: () => wx.showToast({ title: '快递单号已复制', icon: 'success' }),
    });
  },
});
