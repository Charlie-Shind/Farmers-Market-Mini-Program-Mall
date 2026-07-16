import { iconPaths } from '../../../../config/icons';
import { fetchMyGroupBuys, type MyGroupBuyItem } from '../../../../services/quick';
import { buildPageTopStyle } from '../../../../utils/page-layout';
import { navigateBackOrHome, redirectMerchantAwayFromCustomerRoute } from '../../../../utils/auth-route';

type StatusView = {
  key: 'OPEN' | 'COMPLETED' | 'FAILED';
  label: string;
  className: string;
};

type GroupView = {
  groupId: number;
  productId: number;
  title: string;
  coverUrl: string;
  imageClass: string;
  needed: number;
  memberCount: number;
  percent: number;
  groupPrice: string;
  originPrice: string;
  status: StatusView;
  roleLabel: string;
  actionLabel: string;
  actionKind: 'pay' | 'view' | 'buy';
  orderNo: string | null;
};

const IMAGE_CLASSES = ['img-orange', 'img-rice', 'img-gift', 'img-egg', 'img-meat', 'img-tomato'];

const STATUS_MAP: Record<string, StatusView> = {
  OPEN: { key: 'OPEN', label: '进行中', className: 'is-open' },
  COMPLETED: { key: 'COMPLETED', label: '已成团', className: 'is-completed' },
  FAILED: { key: 'FAILED', label: '已失败', className: 'is-failed' },
};

function mapGroup(item: MyGroupBuyItem, index: number): GroupView {
  const percent = Math.min(100, Math.round((item.memberCount / Math.max(item.needed, 1)) * 100));

  let actionKind: GroupView['actionKind'] = 'buy';
  let orderNo: string | null = null;
  if (item.pendingOrderNo) {
    actionKind = 'pay';
    orderNo = item.pendingOrderNo;
  } else if (item.orderNo) {
    actionKind = 'view';
    orderNo = item.orderNo;
  }

  return {
    groupId: item.groupId,
    productId: item.productId,
    title: item.title,
    coverUrl: item.coverUrl || '',
    imageClass: item.coverUrl ? '' : IMAGE_CLASSES[index % IMAGE_CLASSES.length],
    needed: item.needed,
    memberCount: item.memberCount,
    percent,
    groupPrice: item.groupPrice,
    originPrice: item.originPrice,
    status: STATUS_MAP[item.status] || STATUS_MAP.OPEN,
    roleLabel: item.isInitiator ? '我发起的' : '我参加的',
    actionLabel: actionKind === 'pay' ? '继续支付' : actionKind === 'view' ? '查看订单' : '去下单',
    actionKind,
    orderNo,
  };
}

Component({
  data: {
    pageStyle: '',
    icons: iconPaths,
    loading: false,
    groups: [] as GroupView[],
  },

  lifetimes: {
    attached() {
      if (redirectMerchantAwayFromCustomerRoute('/pages/quick/group-buy/mine/mine')) return;
      this.setData({ pageStyle: buildPageTopStyle(0) });
      void this.loadData();
    },
  },

  pageLifetimes: {
    show() {
      void this.loadData();
    },
  },

  methods: {
    async loadData() {
      this.setData({ loading: true });
      try {
        const result = await fetchMyGroupBuys();
        this.setData({ groups: (result.items || []).map((item, i) => mapGroup(item, i)) });
      } catch {
        this.setData({ groups: [] });
      } finally {
        this.setData({ loading: false });
      }
    },

    onItemTap(e: WechatMiniprogram.BaseEvent) {
      const { orderNo, productId } = (e.currentTarget.dataset as { orderNo?: string; productId?: string }) || {};
      if (orderNo) {
        wx.navigateTo({ url: `/pages/order/detail/detail?orderNo=${orderNo}` });
        return;
      }
      if (productId) {
        wx.navigateTo({ url: `/pages/product/detail/detail?productId=${productId}` });
      }
    },

    goBack() {
      navigateBackOrHome();
    },

    goExplore() {
      wx.navigateTo({ url: '/pages/quick/group-buy-products/index' });
    },
  },
});
