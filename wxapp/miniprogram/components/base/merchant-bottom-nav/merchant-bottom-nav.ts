import { merchantNavItems, type MerchantNavKey } from '../../../config/merchant';

function resolveActiveKeyFromRoute(): MerchantNavKey {
  const pages = getCurrentPages();
  const current = pages[pages.length - 1];
  if (!current) {
    return 'home';
  }

  const route = current.route || '';
  for (const item of merchantNavItems) {
    if (route.startsWith(item.url.replace(/^\//, '').replace(/\/?$/, ''))) {
      return item.key;
    }
  }

  return 'home';
}

function normalizeActiveKey(value: string): MerchantNavKey {
  if (value === 'dashboard') {
    return 'home';
  }
  if (value === 'messages') {
    return 'chat';
  }
  if (value === 'products') {
    return 'inventory';
  }
  if (value === 'shop') {
    return 'account';
  }
  return value as MerchantNavKey;
}

Component({
  properties: {
    active: {
      type: String,
      value: 'home',
      observer(value: string) {
        this.syncActiveKey(normalizeActiveKey(value));
      },
    },
  },
  data: {
    activeKey: 'home' as MerchantNavKey,
    items: merchantNavItems,
  },
  lifetimes: {
    attached() {
      this.syncActiveKey(normalizeActiveKey(this.properties.active || 'home'));
    },
  },
  pageLifetimes: {
    show() {
      this.syncActiveKey(normalizeActiveKey(this.properties.active || resolveActiveKeyFromRoute()));
    },
  },
  methods: {
    syncActiveKey(preferred: MerchantNavKey) {
      const resolved = preferred !== 'home' ? preferred : resolveActiveKeyFromRoute();

      this.setData({
        activeKey: resolved,
      });
    },
    go(e: WechatMiniprogram.BaseEvent) {
      const { url, key } = (e.currentTarget.dataset as { url?: string; key?: MerchantNavKey }) || {};

      if (!url || !key) {
        return;
      }

      this.setData({
        activeKey: key,
      });
      this.triggerEvent('change', {
        active: key,
        url,
      });
      wx.reLaunch({
        url,
      });
    },
  },
});
