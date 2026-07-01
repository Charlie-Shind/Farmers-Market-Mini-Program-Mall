import { fetchCartItemCount, invalidateCartItemCount } from '../services/app';

type TabItem = {
  key: string;
  label: string;
  icon: string;
  url: string;
  badge?: string;
};

const CUSTOMER_ITEMS: TabItem[] = [
  { key: 'home', label: '首页', icon: 'home', url: '/pages/index/index' },
  { key: 'category', label: '分类', icon: 'category', url: '/pages/category/category' },
  { key: 'marketing', label: '发现', icon: 'discover', url: '/pages/marketing/marketing' },
  { key: 'cart', label: '购物车', icon: 'cart', url: '/pages/cart/cart' },
  { key: 'profile', label: '我的', icon: 'profile', url: '/pages/profile/profile' },
];

function normalizeRoute(route: string): string {
  return route.startsWith('/') ? route : `/${route}`;
}

function normalizeBadge(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return '';
  }

  if (value > 99) {
    return '99+';
  }

  return String(value);
}

Component({
  data: {
    active: 'home',
    visible: true,
    items: CUSTOMER_ITEMS as TabItem[],
  },
  lifetimes: {
    attached() {
      void this.syncFromRoute();
    },
  },
  pageLifetimes: {
    show() {
      invalidateCartItemCount();
      void this.syncFromRoute();
    },
  },
  methods: {
    syncFromRoute() {
      const pages = getCurrentPages();
      if (!pages || pages.length === 0) {
        return;
      }
      const currentRoute = normalizeRoute(pages[pages.length - 1]?.route || '');
      const activeItem = CUSTOMER_ITEMS.find((item) => normalizeRoute(item.url) === currentRoute);
      const visible = !!activeItem;

      const currentActive = this.data.active;
      const targetActive = activeItem?.key || currentActive || 'home';

      // Use wx.nextTick to defer the rendering updates. This prevents the WeChat rendering engine
      // from encountering "expect FLOW_CREATE_NODE but get another" errors due to page-transition vs custom-tab-bar state updates.
      wx.nextTick(async () => {
        const updateData: Record<string, any> = {
          visible,
        };

        if (this.data.active !== targetActive) {
          updateData.active = targetActive;
        }

        try {
          const count = await fetchCartItemCount();
          const cartBadge = normalizeBadge(Number(count || 0));
          
          const nextItems = CUSTOMER_ITEMS.map((item) => {
            const newItem = { ...item };
            if (newItem.key === 'cart') {
              newItem.badge = cartBadge;
            }
            return newItem;
          });
          
          updateData.items = nextItems;
        } catch {
          const nextItems = CUSTOMER_ITEMS.map((item) => {
            const newItem = { ...item };
            if (newItem.key === 'cart') {
              newItem.badge = '';
            }
            return newItem;
          });
          
          updateData.items = nextItems;
        }

        this.setData(updateData);
      });
    },
    go(e: WechatMiniprogram.BaseEvent) {
      const { url } = (e.currentTarget.dataset as { url?: string }) || {};
      if (!url) {
        return;
      }

      wx.switchTab({
        url,
      });
    },
  },
});
