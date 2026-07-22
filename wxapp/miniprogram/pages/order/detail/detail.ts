import { iconPaths } from '../../../config/icons';
import {
  fetchOrderDetail,
  fetchMe,
  updateMeProfile,
  cancelOrder,
  confirmOrder,
  createWechatPayment,
  fetchWechatPaymentStatus,
  mockPaySuccess,
  createRefundApply,
  type AppOrderGroupBuy,
} from '../../../services/app';
import { loadProfileDraft } from '../../../services/profile';
import { buildPageTopStyle } from '../../../utils/page-layout';
import { ensureCustomerAccess, navigateBackOrHome } from '../../../utils/auth-route';

function isHttpAvatar(url?: string | null): boolean {
  return /^https?:\/\//i.test(String(url || '').trim());
}

function normalizeAvatarUrl(url?: string | null): string {
  const value = String(url || '').trim();
  if (!value) return '';
  if (isHttpAvatar(value) || value.startsWith('/')) return value;
  return '';
}

async function resolveCurrentUserAvatar(): Promise<string> {
  const draft = loadProfileDraft();
  const draftAvatar = normalizeAvatarUrl(draft.avatarUrl);
  try {
    const me = await fetchMe();
    const serverAvatar =
      normalizeAvatarUrl(me.profile?.avatarUrl) || normalizeAvatarUrl(me.user?.avatarUrl);
    return draftAvatar || serverAvatar || '';
  } catch {
    return draftAvatar || '';
  }
}

let _groupBuyTimer: number | null = null;

function formatGroupBuyCountdown(expireAt: string | null | undefined): string {
  if (!expireAt) return '';
  const diff = new Date(expireAt).getTime() - Date.now();
  if (Number.isNaN(diff) || diff <= 0) return '00:00:00';
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

type OrderItem = {
  id: number;
  orderItemId?: number;
  productId: number;
  skuId: number;
  productTitle: string;
  skuName: string;
  productImage: string;
  unitPrice: string;
  quantity: number;
  lineAmount: string;
};

type DeliveryRecord = {
  id: number;
  expressCompany: string;
  expressNo: string;
  shippedAt?: string;
};

type OrderDetail = {
  id: number;
  orderNo: string;
  userId: number;
  merchantId: number;
  addressSnapshot: {
    receiverName: string;
    receiverMobile: string;
    province: string;
    city: string;
    district: string;
    detailAddress: string;
    isDefault?: boolean;
  };
  goodsAmount: string;
  freightAmount: string;
  discountAmount: string;
  payAmount: string;
  orderStatus: number | string;
  payStatus: number;
  deliveryStatus: number;
  refundStatus: number;
  afterSaleStatus?: number;
  status?: string;
  statusEnum?: string;
  statusLabel?: string;
  expireAt?: string;
  actionButtons?: Array<{ key: string; label: string; type?: string }>;
  groupBuyId?: number | null;
  groupBuy?: AppOrderGroupBuy | null;
  remark?: string;
  createdAt: string;
  paidAt?: string;
  deliveredAt?: string;
  completedAt?: string;
  items: OrderItem[];
  deliveries: DeliveryRecord[];
  merchant?: {
    id: number;
    storeName: string;
  };
  refund?: {
    refundNo: string;
    applyType: number;
    applyTypeLabel?: string;
    applyReason: string;
    applyImages?: string[];
    refundAmount: string;
    status: number;
    statusLabel?: string;
    rejectReason?: string | null;
    merchantRemark?: string | null;
    adminRemark?: string | null;
    processedAt?: string | null;
    createdAt?: string;
  } | null;
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


function canInviteGroupBuyOrder(order?: OrderDetailView | null): boolean {
  if (!order?.groupBuy || order.groupBuy.status !== 'OPEN') return false;
  if (Number(order.payStatus) !== 1) return false;
  const refundStatus = Number(order.afterSaleStatus ?? order.refundStatus ?? 0);
  // 1待审 / 2处理中 / 3退款成功：不可再邀请
  if (refundStatus === 1 || refundStatus === 2 || refundStatus === 3) return false;
  const statusLabel = String((order as any).statusLabel || order.status || '').trim();
  if (['售后中', '退款申请中', '退款成功', '退款中'].includes(statusLabel)) return false;
  return true;
}

function getGroupBuyStats(groupBuy?: AppOrderGroupBuy | null) {
  const memberCountRaw = Number(groupBuy?.memberCount ?? groupBuy?.members?.length ?? 0);
  const neededRaw = Number(groupBuy?.needed);
  const memberCount = Number.isFinite(memberCountRaw) && memberCountRaw >= 0 ? memberCountRaw : 0;
  const neededBase = Number.isFinite(neededRaw) && neededRaw > 0 ? neededRaw : 2;
  const needed = Math.max(neededBase, memberCount);
  return {
    memberCount,
    needed,
    remaining: Math.max(needed - memberCount, 0),
  };
}

type GroupBuySlotView = {
  key: string;
  label: string;
  filled: boolean;
  avatarUrl: string;
  isMine: boolean;
};

function buildGroupBuySlots(
  groupBuy?: AppOrderGroupBuy | null,
  currentUserId?: number,
  myAvatarUrl = '',
): GroupBuySlotView[] {
  if (!groupBuy) return [];
  const { memberCount, needed } = getGroupBuyStats(groupBuy);
  const slots = Math.min(Math.max(needed, 1), 5);
  const members = Array.isArray(groupBuy.members) ? [...groupBuy.members] : [];
  members.sort((a, b) => Number(b.isInitiator) - Number(a.isInitiator));
  const fallbackMine = normalizeAvatarUrl(myAvatarUrl);
  const defaultAvatar = String(iconPaths.defaultAvatar || '');

  const views: GroupBuySlotView[] = [];
  for (let i = 0; i < slots; i++) {
    const member = members[i];
    const filled = Boolean(member) || i < memberCount;
    const isMine = Boolean(member && Number(member.userId) === Number(currentUserId));
    let avatarUrl = normalizeAvatarUrl(member?.avatarUrl);
    if (!avatarUrl && isMine && fallbackMine) {
      avatarUrl = fallbackMine;
    }
    if (!avatarUrl && filled) {
      avatarUrl = defaultAvatar;
    }
    views.push({
      key: member ? `m-${member.memberId}` : `slot-${i}`,
      label: i === 0 ? '团长' : filled ? `团员${i}` : '待邀请',
      filled,
      avatarUrl,
      isMine,
    });
  }
  return views;
}

type StatusStep = { label: string; done: boolean; current: boolean };

const STATUS_SUB_LABELS: Record<string, string> = {
  '待付款': '订单已保留在列表中，可随时继续支付',
  '未支付': '订单已保留在列表中，可随时继续支付',
  '待支付': '订单已保留在列表中，可随时继续支付',
  '待接单': '商家正在确认订单，请耐心等待',
  '等待商家接单': '商家正在确认订单，请耐心等待',
  '待发货': '商家正在配货，将尽快发货',
  '等待商家发货': '商家正在配货，将尽快发货',
  '待收货': '商品正在路上，请注意查收',
  '商品已发货': '商品正在路上，请注意查收',
  '已发货': '商品正在路上，请注意查收',
  '运输中': '商品正在路上，请注意查收',
  '待评价': '期待您的宝贵反馈',
  '已签收待评价': '期待您的宝贵反馈',
  '交易已完成': '感谢您的支持，欢迎再次选购',
  '已完成': '感谢您的支持，欢迎再次选购',
  '订单已取消': '交易已关闭',
  '已取消': '交易已关闭',
  '支付超时': '订单已超时，无法继续支付',
  '退款申请中': '退款申请已提交，等待商家审核',
  '售后中': '退款申请已提交，等待商家审核',
  '退款成功': '退款已同意，退款金额已原路退回',
};

function getStatusSubLabel(statusLabel: string, refundStatus = 0, rejectReason = ''): string {
  if (refundStatus === 4) {
    if (rejectReason) {
      return `退款被驳回：${rejectReason}`;
    }
    if (statusLabel === '待发货' || statusLabel === '等待商家发货') {
      return '退款被驳回，等待商家配货发货';
    }
    if (statusLabel === '待收货' || statusLabel === '商品已发货' || statusLabel === '已发货') {
      return '退款被驳回，商品正在路上，请注意查收';
    }
    return '退款申请已被驳回';
  }
  return STATUS_SUB_LABELS[statusLabel] || '';
}

function getStatusIcon(statusLabel: string): string {
  if (['待付款', '未支付', '待支付', '支付超时'].includes(statusLabel)) return 'wallet';
  if (['待发货', '等待商家发货', '待接单', '等待商家接单'].includes(statusLabel)) return 'package';
  if (['待收货', '商品已发货', '已发货', '运输中'].includes(statusLabel)) return 'truck';
  if (['退款申请中', '售后中'].includes(statusLabel)) return 'wallet';
  if (statusLabel === '退款成功') return 'shield';
  if (['订单已取消', '已取消', '拼团失败'].includes(statusLabel)) return 'close';
  return 'shield';
}

function getStatusIconColor(colorClass: string): string {
  if (colorClass === 'banner--gray') return '#ffffff';
  if (colorClass === 'banner--green' || colorClass === 'banner--gold') return '#ffffff';
  return '#2c4a39';
}

function getStatusBgUrl(colorClass: string): string {
  if (colorClass === 'banner--gold') return '/assets/images/order/status-bg-gold.jpg';
  if (colorClass === 'banner--gray') return '/assets/images/order/status-bg-gray.jpg';
  return '/assets/images/order/status-bg-green.jpg';
}

function buildStatusSteps(order: OrderDetail, statusLabel: string): StatusStep[] {
  const skipLabels = ['订单已取消', '已取消', '支付超时', '退款成功', '拼团失败', '退款申请中', '售后中'];
  if (skipLabels.includes(statusLabel)) return [];

  const payStatus = Number(order.payStatus);
  const deliveryStatus = Number(order.deliveryStatus);
  const orderStatus = Number(order.orderStatus);

  const steps: StatusStep[] = [
    { label: '付款', done: false, current: false },
    { label: '接单', done: false, current: false },
    { label: '配货', done: false, current: false },
    { label: '发货', done: false, current: false },
    { label: '签收', done: false, current: false },
  ];

  const markDone = (count: number) => {
    for (let i = 0; i < count; i++) steps[i].done = true;
  };

  if (payStatus === 0) {
    steps[0].current = true;
    return steps;
  }

  markDone(1);

  if (deliveryStatus === 0) {
    steps[1].current = true;
    return steps;
  }

  markDone(2);

  if (deliveryStatus === 1) {
    steps[2].current = true;
    return steps;
  }

  markDone(3);

  if (deliveryStatus === 2 && orderStatus !== 3 && orderStatus !== 4) {
    steps[3].current = true;
    return steps;
  }

  markDone(4);

  if (orderStatus === 3) {
    steps[4].current = true;
    return steps;
  }

  if (orderStatus === 4 || statusLabel === '交易已完成' || statusLabel === '已完成') {
    steps.forEach((step) => { step.done = true; });
    return steps;
  }

  if (statusLabel === '待发货' || statusLabel === '等待商家发货') {
    markDone(2);
    steps[2].current = true;
  } else if (['待收货', '商品已发货', '已发货', '运输中'].includes(statusLabel)) {
    markDone(3);
    steps[3].current = true;
  } else if (statusLabel === '待评价' || statusLabel === '已签收待评价') {
    markDone(4);
    steps[4].current = true;
  } else if (['待接单', '等待商家接单'].includes(statusLabel)) {
    markDone(1);
    steps[1].current = true;
  }

  return steps;
}

function getStatusProgressWidth(steps: StatusStep[]): number {
  if (steps.length <= 1) return 0;
  const currentIdx = steps.findIndex((step) => step.current);
  if (currentIdx >= 0) return (currentIdx / (steps.length - 1)) * 100;
  if (steps.every((step) => step.done)) return 100;
  return 0;
}

Component({
  data: {
    orderNo: '',
    order: {} as OrderDetail,
    pendingAction: '',
    statusLabel: '加载中',
    statusSubLabel: '',
    statusIcon: 'points',
    statusIconColor: '#2c4a39',
    statusColorClass: 'banner--gray',
    statusBgUrl: '/assets/images/order/status-bg-gray.jpg',
    statusSteps: [] as StatusStep[],
    statusProgressWidth: 0,
    hasActionButtons: false,
    actionButtons: [] as Array<{ key: string; label: string; type?: string }>,
    groupBuyProgress: null as { percent: number; memberCount: number; needed: number; remaining: number; expireAt: string | null } | null,
    groupBuyProgressText: '',
    groupBuySlots: [] as GroupBuySlotView[],
    groupBuyCountdown: '' as string,
    canInviteGroupBuy: false,
    groupInviteCode: '',
    myAvatarUrl: '',
    icons: iconPaths,
    pageStyle: '',
    activeSheet: '',
    refundForm: {
      applyType: 1,
      refundAmount: '',
      applyReason: '',
      selectedRefundItemIndex: 0,
    },
  },
  lifetimes: {
    attached() {
      this.setData({
        pageStyle: buildPageTopStyle(0),
      });
    },
    detached() {
      this._clearGroupBuyCountdown();
    },
  },
  pageLifetimes: {
    show() {
      this.tryLoadFromOptions();
    },
    hide() {
      this._clearGroupBuyCountdown();
    },
  },
  methods: {
    tryLoadFromOptions() {
      if (this.data.orderNo) {
        void this.loadOrderDetails(this.data.orderNo);
        return;
      }
      const pages = getCurrentPages();
      const current = pages[pages.length - 1] as { options?: Record<string, string> } | undefined;
      const options = current?.options || {};
      const orderNo = options.orderNo || '';
      const pendingAction = options.action || '';

      if (orderNo) {
        this.setData({
          orderNo,
          pendingAction,
        });
        void this.loadOrderDetails(orderNo);
      } else {
        wx.showToast({ title: '订单号错误', icon: 'none' });
        setTimeout(() => this.goBack(), 1500);
      }
    },
    goBack() {
      navigateBackOrHome();
    },
    async loadOrderDetails(orderNo: string) {
      wx.showLoading({ title: '加载中…' });

      try {
        const [order, myAvatarUrl] = await Promise.all([
          fetchOrderDetail(orderNo),
          resolveCurrentUserAvatar(),
        ]);
        if (!order) {
          wx.showToast({ title: '订单不存在', icon: 'none' });
          setTimeout(() => this.goBack(), 1500);
          return;
        }

        // Format dates & cast statuses
        const rawDeliveries = Array.isArray((order as any).deliveries) ? (order as any).deliveries : [];
        const normalizedDeliveries = rawDeliveries.length > 0
          ? rawDeliveries.map((delivery: any) => ({
              id: Number(delivery.id || 0),
              expressCompany: String(delivery.expressCompany || delivery.logisticsCompany || ''),
              expressNo: String(delivery.expressNo || delivery.trackingNo || ''),
              shippedAt: delivery.shippedAt ? formatDateTime(String(delivery.shippedAt)) : undefined,
            }))
          : ((order as any).logisticsCompany || (order as any).trackingNo)
            ? [
                {
                  id: 0,
                  expressCompany: String((order as any).logisticsCompany || ''),
                  expressNo: String((order as any).trackingNo || ''),
                  shippedAt: (order as any).shippedAt ? formatDateTime(String((order as any).shippedAt)) : undefined,
                },
              ]
            : [];

        const formattedOrder: OrderDetail = {
          ...order,
          statusEnum: String(order.statusEnum || order.orderStatus || ''),
          statusLabel: String(order.statusLabel || order.status || ''),
          actionButtons: (Array.isArray((order as any).actionButtons) ? (order as any).actionButtons : []).filter(
            (item: any) => item?.key !== 'review',
          ),
          orderStatus: Number(order.orderStatus),
          payStatus: Number(order.payStatus),
          deliveryStatus: Number(order.deliveryStatus),
          refundStatus: Number(order.refundStatus),
          afterSaleStatus: Number((order as any).afterSaleStatus ?? order.refundStatus ?? 0),
          createdAt: formatDateTime(order.createdAt),
          paidAt: order.paidAt ? formatDateTime(order.paidAt) : undefined,
          deliveredAt: order.deliveredAt ? formatDateTime(order.deliveredAt) : undefined,
          completedAt: order.completedAt ? formatDateTime(order.completedAt) : undefined,
          deliveries: normalizedDeliveries,
        };

        this.setData({
          order: formattedOrder,
          myAvatarUrl,
        });

        this.mapOrderStatus();
        void this.syncMyAvatarIfNeeded(formattedOrder.groupBuy, myAvatarUrl);

        this._startGroupBuyCountdown();

        if (this.data.pendingAction === 'refund') {
          this.setData({ pendingAction: '' });
          this.onApplyRefund();
        }
      } catch {
        wx.showToast({ title: '获取订单详情失败', icon: 'none' });
      } finally {
        wx.hideLoading();
      }
    },
    async syncMyAvatarIfNeeded(groupBuy?: AppOrderGroupBuy | null, myAvatarUrl = '') {
      if (!groupBuy || !isHttpAvatar(myAvatarUrl)) {
        return;
      }
      const mine = (groupBuy.members || []).find(
        (member) => Number(member.userId) === Number(this.data.order.userId),
      );
      if (!mine || isHttpAvatar(mine.avatarUrl)) {
        return;
      }
      try {
        await updateMeProfile({ avatarUrl: myAvatarUrl });
      } catch {
        // ignore sync failures; UI already falls back to local avatar
      }
    },
    onGroupBuyAvatarError(e: WechatMiniprogram.TouchEvent) {
      const key = String((e.currentTarget.dataset as { key?: string }).key || '');
      if (!key) {
        return;
      }
      const defaultAvatar = String(iconPaths.defaultAvatar || '');
      const groupBuySlots = (this.data.groupBuySlots || []).map((slot) => {
        if (slot.key !== key || slot.avatarUrl === defaultAvatar) {
          return slot;
        }
        return { ...slot, avatarUrl: defaultAvatar };
      });
      this.setData({ groupBuySlots });
    },
    _clearGroupBuyCountdown() {
      if (_groupBuyTimer != null) {
        clearInterval(_groupBuyTimer);
        _groupBuyTimer = null;
      }
    },
    _startGroupBuyCountdown() {
      this._clearGroupBuyCountdown();
      const groupBuy = this.data.order.groupBuy;
      if (!groupBuy || groupBuy.status !== 'OPEN' || !groupBuy.expireAt) {
        this.setData({ groupBuyCountdown: '' });
        return;
      }
      const tick = () => {
        const gb = this.data.order.groupBuy;
        if (!gb || gb.status !== 'OPEN' || !gb.expireAt) {
          this._clearGroupBuyCountdown();
          return;
        }
        this.setData({ groupBuyCountdown: formatGroupBuyCountdown(gb.expireAt) });
      };
      tick();
      _groupBuyTimer = setInterval(tick, 1000) as unknown as number;
    },
    onShareAppMessage(): WechatMiniprogram.Page.ICustomShareContent {
      const order = this.data.order;
      const gb = order.groupBuy;
      const productTitle = gb?.productTitle || (order.items?.[0]?.productTitle ?? '拼团好货');
      if (!canInviteGroupBuyOrder(order)) {
        return {
          title: `一起看看：${productTitle}`,
          path: `/pages/order/detail/detail?orderNo=${order.orderNo}`,
        };
      }
      const remaining = gb ? getGroupBuyStats(gb).remaining : 0;
      const title = `【还差 ${remaining} 人成团】${productTitle}，一起来拼更划算`;
      const path = `/pages/quick/group-buy/index?productId=${gb!.productId}&title=${encodeURIComponent(productTitle)}&groupId=${gb!.groupId}`;
      return {
        title,
        path,
      };
    },
    onInviteGroupBuy() {
      if (!canInviteGroupBuyOrder(this.data.order)) {
        wx.showToast({ title: '售后中不可邀请好友', icon: 'none' });
        return;
      }
      // open-type="share" 已自动调起分享面板，此处仅做 toast 提示
      wx.showToast({ title: '点击右上角分享给好友', icon: 'none' });
    },
    handleActionButton(e: WechatMiniprogram.BaseEvent) {
      const { key } = e.currentTarget.dataset as { key?: string };
      if (!key) return;

      if (key === 'cancel') {
        this.onCancelOrder();
        return;
      }
      if (key === 'pay') {
        this.onPayOrder();
        return;
      }
      if (key === 'logistics') {
        this.onViewLogistics();
        return;
      }
      if (key === 'confirm') {
        this.onConfirmReceipt();
        return;
      }
      if (key === 'refund') {
        this.onApplyRefund();
        return;
      }
      if (key === 'invite') {
        this.onInviteGroupBuy();
        return;
      }
      if (key === 'cancelAfterSale') {
        this.onCancelAfterSale();
      }
    },
    copyGroupInviteCode() {
      if (!canInviteGroupBuyOrder(this.data.order)) {
        wx.showToast({ title: '售后中不可邀请好友', icon: 'none' });
        return;
      }
      const inviteCode = String(this.data.groupInviteCode || '').trim();
      if (!inviteCode) {
        wx.showToast({ title: '暂无邀请码', icon: 'none' });
        return;
      }

      wx.setClipboardData({
        data: inviteCode,
        success: () => {
          wx.showToast({ title: '邀请码已复制', icon: 'success' });
        },
      });
    },
    mapOrderStatus() {
      const order = this.data.order;
      const groupBuy = order.groupBuy;

      // 计算拼团进度数据（无论后端是否直接返回状态文案，都需要展示）
      let groupBuyProgress: { percent: number; memberCount: number; needed: number; remaining: number; expireAt: string | null } | null = null;
      let groupBuyProgressText = '';
      let groupBuySlots: GroupBuySlotView[] = [];
      const groupInviteCode = String(groupBuy?.inviteCode ?? '').trim();
      if (groupBuy) {
        const { memberCount, needed, remaining } = getGroupBuyStats(groupBuy);
        groupBuyProgress = {
          percent: needed > 0 ? Math.min(memberCount / needed, 1) : 0,
          memberCount,
          needed,
          remaining,
          expireAt: groupBuy.expireAt,
        };
        groupBuyProgressText = `${memberCount}/${needed}人`;
        groupBuySlots = buildGroupBuySlots(groupBuy, order.userId, this.data.myAvatarUrl);
      }

      const backendStatusLabel = String((order as any).statusLabel || order.status || '').trim();
      const backendActionButtons = (Array.isArray((order as any).actionButtons) ? (order as any).actionButtons : []).filter(
        (item: any) => item?.key !== 'review',
      );
      if (backendStatusLabel) {
        const normalizedBackendStatusLabel = backendStatusLabel === '已过期' ? '支付超时' : backendStatusLabel;
        let colorClass = 'banner--green';
        if (normalizedBackendStatusLabel === '支付超时' || normalizedBackendStatusLabel === '已取消') {
          colorClass = 'banner--gray';
        } else if (normalizedBackendStatusLabel === '待付款' || normalizedBackendStatusLabel === '未支付') {
          colorClass = 'banner--gold';
        } else if (normalizedBackendStatusLabel === '售后中' || normalizedBackendStatusLabel === '退款申请中') {
          colorClass = 'banner--gold';
        } else if (normalizedBackendStatusLabel === '退款成功') {
          colorClass = 'banner--gray';
        }
        const refundStatus = Number(order.afterSaleStatus ?? order.refundStatus ?? 0);
        const rejectReason = String(order.refund?.rejectReason ?? '').trim();
        let statusSubLabel = getStatusSubLabel(normalizedBackendStatusLabel, refundStatus, rejectReason);
        if ((normalizedBackendStatusLabel === '售后中' || normalizedBackendStatusLabel === '退款申请中') && order.refund?.applyReason) {
          statusSubLabel = `申请原因：${order.refund.applyReason}`;
        }
        const statusSteps = buildStatusSteps(order, normalizedBackendStatusLabel);
        const backendHasActions = backendActionButtons.length > 0;
        const isRefundSuccess = normalizedBackendStatusLabel === '退款成功' || refundStatus === 3;
        const isAfterSale =
          normalizedBackendStatusLabel === '售后中' ||
          normalizedBackendStatusLabel === '退款申请中' ||
          refundStatus === 1 ||
          refundStatus === 2;
        const canInvite = canInviteGroupBuyOrder(order);
        let filteredActionButtons = (isRefundSuccess ? [] : backendActionButtons).filter(
          (item: any) => item?.key !== 'invite' || canInvite,
        );
        if (isAfterSale) {
          const hasCancel = filteredActionButtons.some((item: any) => item?.key === 'cancelAfterSale');
          filteredActionButtons = hasCancel
            ? filteredActionButtons.filter((item: any) => item?.key === 'cancelAfterSale')
            : [{ key: 'cancelAfterSale', label: '取消售后', type: 'secondary' }];
        }
        this.setData({
          statusLabel: normalizedBackendStatusLabel,
          statusSubLabel,
          statusIcon: getStatusIcon(normalizedBackendStatusLabel),
          statusIconColor: getStatusIconColor(colorClass),
          statusColorClass: colorClass,
          statusBgUrl: getStatusBgUrl(colorClass),
          statusSteps,
          statusProgressWidth: getStatusProgressWidth(statusSteps),
          hasActionButtons: !isRefundSuccess && (filteredActionButtons.length > 0 || isAfterSale),
          actionButtons: filteredActionButtons,
          groupBuyProgress,
          groupBuyProgressText,
          groupBuySlots,
          groupInviteCode,
          canInviteGroupBuy: canInvite,
        });
        return;
      }
      const orderStatus = Number(order.orderStatus);
      const payStatus = Number(order.payStatus);
      const deliveryStatus = Number(order.deliveryStatus);
      const refundStatus = Number(order.afterSaleStatus ?? order.refundStatus ?? 0);
      const statusCode = String(order.orderStatus || '').toUpperCase();
      const statusText = String(order.status || '').trim();
      const rejectReason = String(order.refund?.rejectReason ?? '').trim();
      const rejectedSubLabel = rejectReason
        ? `退款被驳回：${rejectReason}`
        : '';

      let statusLabel = statusText || String(order.orderStatus || '未知状态');
      let statusSubLabel = '';
      let statusIcon = 'points';
      let statusColorClass = 'banner--gray';
      let hasActionButtons = false;

      // 售后优先于拼团邀请态
      if (refundStatus === 1 || refundStatus === 2) {
        statusLabel = '退款申请中';
        statusSubLabel = order.refund?.applyReason
          ? `申请原因：${order.refund.applyReason}`
          : '退款申请已提交，等待商家审核';
        statusIcon = 'wallet';
        statusColorClass = 'banner--gold';
        hasActionButtons = true;
      } else if (refundStatus === 3) {
        statusLabel = '退款成功';
        statusSubLabel = '退款已同意，退款金额已原路退回';
        statusIcon = 'shield';
        statusColorClass = 'banner--gray';
        hasActionButtons = false;
      } else if (groupBuy && groupBuy.status === 'OPEN' && payStatus === 1) {
        const remaining = getGroupBuyStats(groupBuy).remaining;
        statusLabel = '拼团中';
        statusSubLabel = remaining > 0
          ? `还差 ${remaining} 人成团，邀请好友一起购买`
          : '成团在即，等待系统确认';
        statusIcon = 'points';
        statusColorClass = 'banner--gold';
        hasActionButtons = true;
      } else if (groupBuy && groupBuy.status === 'FAILED') {
        statusLabel = '拼团失败';
        statusSubLabel = '未能在有效期内凑齐人数，已自动取消订单';
        statusIcon = 'close';
        statusColorClass = 'banner--gray';
        hasActionButtons = false;
      } else {
        if (statusText === '待付款' || statusText === '待支付' || statusText === '等待付款' || statusCode === 'NORMAL' || statusCode === 'PENDING') {
          statusLabel = '未支付';
          statusSubLabel = '订单已保留在列表中，可随时继续支付';
          statusIcon = 'wallet';
          statusColorClass = 'banner--gold';
          hasActionButtons = true;
        }
        else if (statusText === '待接单' || statusText === '等待商家接单') {
          statusLabel = '等待商家接单';
          statusSubLabel = '商家正在确认订单，请耐心等待';
          statusIcon = 'points';
          statusColorClass = 'banner--green';
          hasActionButtons = true;
        }
        else if (statusText === '待发货' || statusText === '等待商家发货') {
          statusLabel = '等待商家发货';
          statusSubLabel = refundStatus === 4
            ? (rejectedSubLabel || '退款被驳回，等待商家配货发货')
            : '商家正在配货，将尽快发货';
          statusIcon = 'package';
          statusColorClass = 'banner--green';
          hasActionButtons = true;
        }
        else if (statusText === '待收货' || statusText === '商品已发货' || statusText === '已发货' || statusText === '运输中') {
          statusLabel = '商品已发货';
          statusSubLabel = refundStatus === 4
            ? (rejectedSubLabel || '退款被驳回，商品正在路上，请注意查收')
            : '商品正在路上，请注意查收';
          statusIcon = 'truck';
          statusColorClass = 'banner--green';
          hasActionButtons = true;
        }
        else if (statusText === '待评价' || statusText === '已签收待评价') {
          statusLabel = '已签收待评价';
          statusSubLabel = '期待您的宝贵反馈';
          statusIcon = 'shield';
          statusColorClass = 'banner--green';
          hasActionButtons = true;
        }
        if (statusCode === 'CANCELLED' || orderStatus === 2) {
          statusLabel = '订单已取消';
          statusSubLabel = '交易已关闭';
          statusIcon = 'close';
          statusColorClass = 'banner--gray';
        }
        else if (statusCode === 'COMPLETED' || orderStatus === 4 || orderStatus === 3) {
          statusLabel = '交易已完成';
          statusSubLabel = '感谢您的支持，欢迎再次选购';
          statusIcon = 'shield';
          statusColorClass = 'banner--green';
          hasActionButtons = refundStatus !== 3;
        }
        else if (
          statusCode === 'PENDING_PAY' ||
          statusCode === 'PENDING_SHIP' ||
          statusCode === 'PENDING_RECEIVE' ||
          statusCode === 'PENDING_COMMENT' ||
          statusCode === 'REFUNDING' ||
          statusCode === 'AFTER_SALE' ||
          orderStatus === 1 ||
          String(order.orderStatus) === 'NORMAL' ||
          String(order.orderStatus) === 'PENDING'
        ) {
          if (payStatus === 0) {
            statusLabel = '未支付';
            statusSubLabel = '订单已保留在列表中，可随时继续支付';
            statusIcon = 'wallet';
            statusColorClass = 'banner--gold';
            hasActionButtons = true;
          } else if (payStatus === 1) {
            if (deliveryStatus === 0) {
              statusLabel = '等待商家发货';
              statusSubLabel = refundStatus === 4
                ? (rejectedSubLabel || '退款被驳回，等待商家配货发货')
                : '商家正在配货，将尽快发货';
              statusIcon = 'package';
              statusColorClass = 'banner--green';
              hasActionButtons = true;
            } else if (deliveryStatus === 1) {
              statusLabel = '商品已发货';
              statusSubLabel = refundStatus === 4
                ? (rejectedSubLabel || '退款被驳回，商品正在路上，请注意查收')
                : '商品正在路上，请注意查收';
              statusIcon = 'truck';
              statusColorClass = 'banner--green';
              hasActionButtons = true;
            } else if (deliveryStatus === 2) {
              statusLabel = '已签收待评价';
              statusSubLabel = '期待您的宝贵反馈';
              statusIcon = 'shield';
              statusColorClass = 'banner--green';
              hasActionButtons = true;
            }
          }
        } else if (statusCode === 'CANCELLED') {
          statusLabel = '订单已取消';
          statusSubLabel = '交易已关闭';
          statusIcon = 'close';
          statusColorClass = 'banner--gray';
        }
      }

      const statusSteps = buildStatusSteps(order, statusLabel);
      this.setData({
        statusLabel,
        statusSubLabel,
        statusIcon,
        statusIconColor: getStatusIconColor(statusColorClass),
        statusColorClass,
        statusBgUrl: getStatusBgUrl(statusColorClass),
        statusSteps,
        statusProgressWidth: getStatusProgressWidth(statusSteps),
        hasActionButtons,
        groupBuyProgress,
        groupBuyProgressText,
        groupBuySlots,
        groupInviteCode,
        canInviteGroupBuy: canInviteGroupBuyOrder(order),
      });
    },
    copyOrderNumber() {
      wx.setClipboardData({
        data: this.data.order.orderNo,
        success: () => {
          wx.showToast({ title: '单号已复制', icon: 'success' });
        },
      });
    },
    copyTrackingNumber() {
      const deliveries = this.data.order.deliveries;
      if (deliveries && deliveries.length) {
        wx.setClipboardData({
          data: deliveries[0].expressNo,
          success: () => {
            wx.showToast({ title: '快递单号已复制', icon: 'success' });
          },
        });
      }
    },
    onViewLogistics() {
      const deliveries = this.data.order.deliveries;
      if (!deliveries || !deliveries.length) {
        wx.showToast({ title: '暂无物流信息', icon: 'none' });
        return;
      }

      wx.navigateTo({
        url: `/pages/order/logistics/detail/detail?orderNo=${this.data.orderNo}`,
      });
    },
    contactMerchant() {
      const { order } = this.data;
      const orderNo = String(order?.orderNo ?? '').trim();
      const merchantId = order?.merchantId || order?.merchant?.id || 0;
      if (!orderNo) {
        wx.showToast({ title: '暂无法发起会话', icon: 'none' });
        return;
      }

      const sceneSource = `订单号 ${orderNo}`;
      wx.navigateTo({
        url: `/pages/chat/chat?sceneType=ORDER&merchantId=${merchantId}&orderNo=${encodeURIComponent(orderNo)}&sceneLabel=${encodeURIComponent('来自订单')}&sceneSource=${encodeURIComponent(sceneSource)}`,
      });
    },
    onCancelOrder() {
      if (!ensureCustomerAccess('/pages/order/detail/detail')) {
        return;
      }

      wx.showModal({
        title: '提示',
        content: '确定要取消这笔订单吗？',
        success: async (res) => {
          if (res.confirm) {
            wx.showLoading({ title: '正在取消订单…' });
            try {
              await cancelOrder(this.data.orderNo);
              wx.showToast({ title: '订单已取消', icon: 'success' });
              void this.loadOrderDetails(this.data.orderNo);
            } catch {
              wx.showToast({ title: '取消订单失败', icon: 'none' });
            } finally {
              wx.hideLoading();
            }
          }
        },
      });
    },
    async onConfirmReceipt() {
      if (!ensureCustomerAccess('/pages/order/detail/detail')) {
        return;
      }

      wx.showModal({
        title: '提示',
        content: '确认已收到购买的农产品吗？',
        success: async (res) => {
          if (res.confirm) {
            wx.showLoading({ title: '正在确认收货…' });
            try {
              await confirmOrder(this.data.orderNo);
              wx.showToast({ title: '已确认收货', icon: 'success' });
              void this.loadOrderDetails(this.data.orderNo);
            } catch {
              wx.showToast({ title: '操作失败，请重试', icon: 'none' });
            } finally {
              wx.hideLoading();
            }
          }
        },
      });
    },
    onPayOrder() {
      if (!ensureCustomerAccess('/pages/order/detail/detail')) {
        return;
      }

      wx.showLoading({ title: '准备支付…' });
      createWechatPayment({ orderNo: this.data.orderNo })
        .then(async (payment) => {
          const paymentStatus = await fetchWechatPaymentStatus(this.data.orderNo);
          wx.hideLoading();
          wx.showModal({
            title: '支付单已创建',
            content:
              paymentStatus.tradeState === 'SUCCESS'
                ? `实付金额：¥${this.data.order.payAmount}\n支付单号：${payment.paymentNo}\n支付状态：已支付。`
                : `实付金额：¥${this.data.order.payAmount}\n支付单号：${payment.paymentNo}\n支付状态：待支付，可稍后继续支付。`,
            showCancel: false,
            confirmText: '知道了',
            confirmColor: '#2c4a39',
            success: async () => {
              if (paymentStatus.tradeState !== 'SUCCESS') {
                try {
                  await mockPaySuccess(this.data.orderNo);
                  wx.showToast({ title: '支付成功', icon: 'success' });
                } catch {
                  wx.showToast({ title: '模拟支付失败', icon: 'none' });
                }
              }
              void this.loadOrderDetails(this.data.orderNo);
            },
          });
        })
        .catch((err: any) => {
          wx.hideLoading();
          wx.showToast({ title: err?.message || '支付单创建失败，请稍后重试', icon: 'none' });
        });
    },
    onApplyRefund() {
      const order = this.data.order;
      if (!order || !order.items || !order.items.length) {
        return;
      }
      const item = order.items[0];
      this.setData({
        activeSheet: 'refund',
        'refundForm.applyType': 1,
        'refundForm.refundAmount': item.unitPrice ? (Number(item.unitPrice) * item.quantity).toFixed(2) : order.payAmount,
        'refundForm.applyReason': '',
        'refundForm.selectedRefundItemIndex': 0,
      });
    },
    onCancelAfterSale() {
      wx.showModal({
        title: '取消售后',
        content: '当前暂不支持直接取消售后申请，请联系商家或客服处理。',
        showCancel: false,
      });
    },
    selectRefundItem(e: any) {
      const idx = Number(e.currentTarget.dataset.index);
      const item = (this.data.order as any)?.items?.[idx];
      if (!item) return;
      this.setData({
        'refundForm.selectedRefundItemIndex': idx,
        'refundForm.refundAmount': item.unitPrice ? (Number(item.unitPrice) * item.quantity).toFixed(2) : '',
      });
    },
    closeSheet() {
      this.setData({
        activeSheet: '',
      });
    },
    preventBubble() {},
    preventTouchMove() {},
    selectRefundType(e: WechatMiniprogram.BaseEvent) {
      const type = Number(e.currentTarget.dataset.type ?? 1);
      this.setData({
        'refundForm.applyType': type,
      });
    },
    onAmountInput(e: WechatMiniprogram.Input) {
      const val = String(e.detail.value ?? '');
      this.setData({
        'refundForm.refundAmount': val,
      });
    },
    onReasonInput(e: WechatMiniprogram.Input) {
      const val = String(e.detail.value ?? '');
      this.setData({
        'refundForm.applyReason': val,
      });
    },
    async submitRefund() {
      if (!ensureCustomerAccess('/pages/order/detail/detail')) {
        return;
      }

      const { order, refundForm } = this.data;
      if (!order || !order.items || !order.items.length) {
        return;
      }

      const item = order.items[refundForm.selectedRefundItemIndex || 0] || order.items[0];
      const maxRefund = Number(item.unitPrice ? (Number(item.unitPrice) * item.quantity).toFixed(2) : order.payAmount);
      const amount = Number(refundForm.refundAmount);

      if (Number.isNaN(amount) || amount <= 0) {
        wx.showToast({ title: '请输入正确的退款金额', icon: 'none' });
        return;
      }

      if (amount > maxRefund) {
        wx.showToast({ title: `退款金额不能超过限额 ¥${maxRefund.toFixed(2)}`, icon: 'none' });
        return;
      }

      const reason = refundForm.applyReason.trim();
      if (!reason) {
        wx.showToast({ title: '请输入退款原因说明', icon: 'none' });
        return;
      }

      wx.showLoading({ title: '正在提交申请…' });

      try {
        await createRefundApply({
          orderNo: order.orderNo,
          orderItemId: item.orderItemId || item.id,
          refundAmount: amount.toFixed(2),
          applyType: refundForm.applyType,
          applyReason: reason,
          applyImages: [],
        });

        wx.hideLoading();
        wx.showToast({ title: '退款申请已提交', icon: 'success' });
        this.setData({
          activeSheet: '',
        });

        setTimeout(() => {
          this.loadOrderDetails(this.data.orderNo);
        }, 1200);
      } catch (err: any) {
        wx.hideLoading();
        wx.showToast({ title: err.message || '申请退款失败，请重试', icon: 'none' });
      }
    },
  },
});
