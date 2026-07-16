import { iconPaths } from '../../config/icons';
import {
  addToCart,
  fetchHomeBanners,
  fetchHomeHotProducts,
  fetchHomeQuickEntries,
  fetchProducts,
  fetchCartItemCount,
  fetchUnreadMessageCount,
  fetchProductDetail,
} from '../../services/app';
import { DEFAULT_LOCATION_LABEL, loadSelectedLocation, saveSelectedLocation } from '../../services/location';
import { buildHeaderSafeRightStyle, buildPageTopStyle } from '../../utils/page-layout';
import { buildLoginUrl, redirectMerchantAwayFromCustomerRoute } from '../../utils/auth-route';
import { formatMoneyDisplay } from '../../utils/money';

let hasPromptedThisSession = false;

function getDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

type HomeBannerView = {
  id: number;
  key: string;
  title: string;
  imageUrl: string;
  linkType?: string;
  linkId?: number | null;
};

const GOODS_IMAGE_CLASSES = ['orange-img', 'egg-img', 'tomato-img', 'rice-img', 'oil-img', 'date-img'];
const QUICK_ENTRY_IMAGE_PATHS = [
  '/assets/quick/1.png',
  '/assets/quick/2.png',
  '/assets/quick/3.png',
  '/assets/quick/4.png',
];

type HomeSceneEntryView = {
  key: string;
  label: string;
  icon: string;
  linkType: string;
};

/** 第二排场景入口（参考花礼网双排） */
const SCENE_ENTRIES: HomeSceneEntryView[] = [
  { key: 'hot', label: '热销榜', icon: 'star', linkType: 'hot' },
  { key: 'new', label: '新品尝鲜', icon: 'categoryPresale', linkType: 'new' },
  { key: 'points', label: '积分兑换', icon: 'points', linkType: 'points' },
  { key: 'category', label: '全部分类', icon: 'category', linkType: 'category' },
  { key: 'favorite', label: '我的收藏', icon: 'favorite', linkType: 'favorite' },
];

type RankTabKey = 'sales' | 'new' | 'good';

type RankTabView = {
  key: RankTabKey;
  label: string;
};

const RANK_TABS: RankTabView[] = [
  { key: 'sales', label: '销量TOP' },
  { key: 'new', label: '新品TOP' },
  { key: 'good', label: '好评TOP' },
];

type HomeQuickEntryView = {
  id: number;
  label: string;
  title: string;
  icon: string;
  linkType: string;
  linkId: number | null;
};

type HomeCardView = {
  id: string;
  skuId?: number;
  title: string;
  desc: string;
  price: string;
  imageClass: string;
  coverUrl: string;
  imageStyle: string;
};

type HomeRankView = HomeCardView & {
  rank: string;
  sales: string;
  tags?: string[];
  icon: string;
};

function resolveHomeEntryRoute(linkType?: string, _linkId?: number | null, title?: string) {
  if (linkType === 'product' && _linkId) {
    return `/pages/product/detail/detail?productId=${_linkId}`;
  }

  if (linkType === 'activity') {
    return `/pages/activity/topic/topic?title=${encodeURIComponent(title || '活动专题')}`;
  }

  if (linkType === 'flashSale') {
    return `/pages/quick/flash-sale/index?title=${encodeURIComponent(title || '限时秒杀')}`;
  }

  if (linkType === 'groupBuy') {
    return `/pages/quick/group-buy-products/index?title=${encodeURIComponent(title || '拼团领券')}`;
  }

  if (linkType === 'gift') {
    return `/pages/quick/gift-zone/index?title=${encodeURIComponent(title || '礼盒专区')}`;
  }

  if (linkType === 'origin') {
    return `/pages/quick/origin-zone/index?title=${encodeURIComponent(title || '产地直供')}`;
  }

  if (linkType === 'category') {
    return '/pages/category/category';
  }

  if (linkType === 'coupon') {
    return '/pages/profile/coupons/coupons';
  }

  if (linkType === 'points') {
    return '/pages/marketing/points/exchange';
  }

  if (linkType === 'hot') {
    return `/pages/product/list/list?title=${encodeURIComponent('热销榜单')}&scene=hot`;
  }

  if (linkType === 'new') {
    return `/pages/product/list/list?title=${encodeURIComponent('新品尝鲜')}&scene=new`;
  }

  if (linkType === 'favorite') {
    return '/pages/favorite/list/list';
  }

  return '';
}

function truncateLocationText(text: string, maxChars = 9) {
  const chars = Array.from(String(text || ''));
  if (chars.length <= maxChars) {
    return chars.join('');
  }

  return `${chars.slice(0, maxChars).join('')}…`;
}



Component({
  data: {
    home: {
      location: DEFAULT_LOCATION_LABEL,
      locationDisplay: truncateLocationText(DEFAULT_LOCATION_LABEL),
      searchPlaceholder: '搜索商品名称',
      locationModeLabel: '当前定位 · 自动',
      banners: [] as HomeBannerView[],
      quickEntries: [] as HomeQuickEntryView[],
      sceneEntries: SCENE_ENTRIES,
      recommendations: [] as HomeCardView[],
      rankTabs: RANK_TABS,
      rankDataSets: {} as Record<RankTabKey, HomeRankView[]>,
      activeRankTab: 'sales' as RankTabKey,
      hotList: [] as HomeRankView[],
      unreadMessageCount: 0,
    },
    icons: iconPaths,
    pageStyle: '',
    topSearchStyle: '',
    cartBadge: '',
    /** 指示点下标；不回写到 swiper 的 current，避免自动轮播抖动 */
    activeBannerIndex: 0,
    bannerAutoplay: false,
    locationMode: 'auto' as 'auto' | 'manual',
    isLocating: false,
    showSpecSheet: false,
    activeSpecProduct: null as any,
  },
  lifetimes: {
    attached() {
      if (redirectMerchantAwayFromCustomerRoute('/pages/index/index')) {
        return;
      }

      this.setData({
        pageStyle: buildPageTopStyle(0, 16),
        topSearchStyle: buildHeaderSafeRightStyle(16),
      });
    },
  },
  pageLifetimes: {
    show() {
      this.setData({
        pageStyle: buildPageTopStyle(0, 16),
        bannerAutoplay: (this.data.home.banners || []).length > 1,
      });
      // 首次加载；从商品详情返回时不重拉首页，避免闪屏
      if (!(this as any)._hasLoaded) {
        this.loadHomeData();
      }
      this.syncCartBadge();
      this.syncMessageBadge();
      this.autoUpdateLocationIfEnabled();
      this.checkLocationChangePrompt();

      const tabBar = (this as any).getTabBar?.();
      if (tabBar) {
        tabBar.setData({
          active: 'home',
        });
        if (typeof tabBar.syncFromRoute === 'function') {
          tabBar.syncFromRoute();
        }
      }
    },
    hide() {
      // 离开首页时关掉自动播放，避免后台继续触发 change 造成状态错乱
      this.setData({ bannerAutoplay: false });
    },
  },
  methods: {
    async syncCartBadge() {
      try {
        const count = await fetchCartItemCount();
        this.setData({
          cartBadge: count > 0 ? String(count) : '',
        });
      } catch {
        this.setData({
          cartBadge: '',
        });
      }
    },
    async syncMessageBadge() {
      try {
        const { unreadCount } = await fetchUnreadMessageCount();
        this.setData({
          unreadMessageCount: unreadCount > 0 ? unreadCount : 0,
        });
      } catch {
        this.setData({
          unreadMessageCount: 0,
        });
      }
    },
    async loadHomeData() {
      try {
        const selectedLocation = loadSelectedLocation();
        const [banners, quickEntries, hotProducts, productsPage] = await Promise.all([
          fetchHomeBanners().catch(() => [] as any[]),
          fetchHomeQuickEntries(),
          fetchHomeHotProducts(),
          fetchProducts('', 6),
        ]);

        const bannerViews = (() => {
          const seen = new Set<string>();
          const list: HomeBannerView[] = [];
          (banners || []).forEach((b: any, index: number) => {
            const imageUrl = String(b.imageUrl || '').trim();
            if (!imageUrl) return;
            const dedupeKey = imageUrl;
            if (seen.has(dedupeKey)) return;
            seen.add(dedupeKey);
            const id = Number(b.id ?? b.bannerId ?? index + 1) || index + 1;
            list.push({
              id,
              key: `banner-${id}-${index}`,
              title: b.title ?? '',
              imageUrl,
              linkType: b.linkType ?? '',
              linkId: b.linkId ?? null,
            });
          });
          return list;
        })();

        const prevBannerSignature = (this.data.home.banners || [])
          .map((item) => `${item.id}:${item.imageUrl}`)
          .join('|');
        const nextBannerSignature = bannerViews.map((item) => `${item.id}:${item.imageUrl}`).join('|');
        const bannersChanged = prevBannerSignature !== nextBannerSignature;

        const products = productsPage.items ?? [];
        const hotProductMap = new Map<string, any>();
        hotProducts.forEach((item: any) => {
          hotProductMap.set(String(item.id), item);
        });
        const mergedProducts = products.map((product: any) => {
          const hot = hotProductMap.get(String(product.id)) || {};
          return {
            ...product,
            saleCount: Number(product.saleCount ?? hot.saleCount ?? hot.salesCount ?? 0),
            createdAt: product.createdAt || hot.createdAt || '',
            isHot: Boolean(product.isHot ?? hot.isHot),
          };
        });
        const locationMode = selectedLocation?.source || 'auto';
        const locationModeLabel = locationMode === 'manual' ? '当前定位 · 手动' : '当前定位 · 自动';

        const buildRankView = (product: any, index: number, _tabKey: RankTabKey): HomeRankView => {
          return {
            id: String(product.id),
            skuId: product.skuId,
            rank: String(index + 1),
            title: product.title,
            desc: product.subtitle || product.originPlace || '热销商品',
            price: formatMoneyDisplay(product.minPrice),
            priceNum: formatMoneyDisplay(product.minPrice),
            sales: `已售 ${Number(product.saleCount ?? 0).toLocaleString('zh-CN')}件`,
            imageClass: GOODS_IMAGE_CLASSES[(index + 3) % GOODS_IMAGE_CLASSES.length],
            coverUrl: product.coverUrl,
            icon: product.icon || '',
            imageStyle: product.coverUrl
              ? `background-image: url(${product.coverUrl}); background-size: cover; background-position: center;`
              : '',
          };
        };

        const salesSorted = [...mergedProducts]
          .sort((a, b) => Number(b.saleCount ?? 0) - Number(a.saleCount ?? 0) || Number(b.isHot) - Number(a.isHot))
          .slice(0, 3);
        const newSorted = [...mergedProducts]
          .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime() || Number(b.saleCount ?? 0) - Number(a.saleCount ?? 0))
          .slice(0, 3);
        const goodSorted = [...mergedProducts]
          .sort((a, b) => Number(b.isHot) - Number(a.isHot) || Number(b.saleCount ?? 0) - Number(a.saleCount ?? 0) || new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
          .slice(0, 3);

        this.setData({
          locationMode,
          ...(bannersChanged
            ? {
                activeBannerIndex: 0,
                bannerAutoplay: bannerViews.length > 1,
              }
            : {
                bannerAutoplay: bannerViews.length > 1,
              }),
          home: {
            location: selectedLocation?.name || selectedLocation?.address || DEFAULT_LOCATION_LABEL,
            locationDisplay: truncateLocationText(selectedLocation?.name || selectedLocation?.address || DEFAULT_LOCATION_LABEL),
            searchPlaceholder: '搜索商品名称',
            locationModeLabel,
            banners: bannersChanged ? bannerViews : this.data.home.banners,
            quickEntries: (() => {
              const mapped = quickEntries.map((entry, index) => ({
                ...entry,
                label: entry.linkType === 'origin' ? '产地直销' : entry.title,
                icon: QUICK_ENTRY_IMAGE_PATHS[index] || iconPaths[entry.icon as keyof typeof iconPaths] || iconPaths.flash,
              }));
              mapped.push({
                id: -1001,
                label: '卡券专区',
                title: '卡券专区',
                icon: '/assets/quick/5.png',
                linkType: 'coupon',
                linkId: null as number | null,
              });
              return mapped;
            })(),
            sceneEntries: SCENE_ENTRIES,
            recommendations: products.slice(0, 3).map((product, index) => ({
              id: String(product.id),
              skuId: product.skuId,
              title: product.title,
              desc: product.subtitle || product.originPlace || '优选好货',
              price: `¥${formatMoneyDisplay(product.minPrice)}`,
              imageClass: GOODS_IMAGE_CLASSES[index % GOODS_IMAGE_CLASSES.length],
              coverUrl: product.coverUrl,
              imageStyle: product.coverUrl ? `background-image: url(${product.coverUrl}); background-size: cover; background-position: center;` : '',
            })),
            rankTabs: RANK_TABS,
            rankDataSets: {
              sales: salesSorted.map((item, index) => buildRankView(item, index, 'sales')),
              new: newSorted.map((item, index) => buildRankView(item, index, 'new')),
              good: goodSorted.map((item, index) => buildRankView(item, index, 'good')),
            },
            activeRankTab: 'sales',
            hotList: salesSorted.map((item, index) => buildRankView(item, index, 'sales')),
            unreadMessageCount: this.data.unreadMessageCount,
          },
        });
        (this as any)._hasLoaded = true;
      } catch {
        // Keep the initial shell data when the backend is temporarily unavailable.
      }
    },
    openLogin() {
      wx.navigateTo({
        url: buildLoginUrl('/pages/index/index'),
      });
    },
    openSearch() {
      wx.navigateTo({
        url: '/pages/search/search',
      });
    },
    onBannerChange(e: WechatMiniprogram.CustomEvent<{ current: number; source: string }>) {
      const { current, source } = e.detail || {};
      // 忽略空 source 的程序触发，只同步指示点，绝不回写 current
      if (source !== 'touch' && source !== 'autoplay') {
        return;
      }
      if (typeof current !== 'number' || current === this.data.activeBannerIndex) {
        return;
      }
      this.setData({ activeBannerIndex: current });
    },
    onBannerAnimationFinish(e: WechatMiniprogram.CustomEvent<{ current: number }>) {
      const { current } = e.detail || {};
      if (typeof current !== 'number' || current === this.data.activeBannerIndex) {
        return;
      }
      this.setData({ activeBannerIndex: current });
    },
    openHomeEntry(e: WechatMiniprogram.BaseEvent) {
      const { linkType, linkId, title } = (e.currentTarget.dataset as {
        linkType?: string;
        linkId?: number | string;
        title?: string;
      }) || {};
      const route = resolveHomeEntryRoute(linkType, linkId != null ? Number(linkId) : null, title);

      if (!route) {
        return;
      }

      if (linkType === 'category') {
        wx.switchTab({ url: route });
        return;
      }

      wx.navigateTo({ url: route });
    },
    openSection(e: WechatMiniprogram.BaseEvent) {
      const { label, target, scene } = (e.currentTarget.dataset as { label?: string; target?: string; scene?: string }) || {};

      if (label === '定位') {
        this.startManualLocation();
        return;
      }

      if (label === '消息') {
        wx.navigateTo({ url: '/pages/message/message' });
        return;
      }

      if (target === 'category') {
        wx.navigateTo({ url: '/pages/category/category' });
        return;
      }

      if (target === 'product-list') {
        const sceneParam = scene ? `&scene=${encodeURIComponent(scene)}` : '';
        wx.navigateTo({
          url: `/pages/product/list/list?title=${encodeURIComponent(label || '商品列表')}${sceneParam}`,
        });
        return;
      }

      if (target === 'marketing') {
        wx.navigateTo({ url: '/pages/marketing/marketing' });
        return;
      }

      return;
    },
    switchRankTab(e: WechatMiniprogram.BaseEvent) {
      const { key } = (e.currentTarget.dataset as { key?: RankTabKey }) || {};
      if (!key) {
        return;
      }

      const rankDataSets = this.data.home.rankDataSets || {};
      this.setData({
        'home.activeRankTab': key,
        'home.hotList': rankDataSets[key] || [],
      });
    },
    async addHomeProductToCart(e: WechatMiniprogram.BaseEvent & { detail?: { skuId?: number; product?: any } }) {
      const productId = e.detail?.product?.id || (e.currentTarget.dataset as { id?: number | string })?.id;
      if (!productId) {
        wx.showToast({ title: '商品不存在', icon: 'none' });
        return;
      }

      wx.showLoading({ title: '加载中...', mask: true });
      try {
        const fullProduct = await fetchProductDetail(Number(productId));
        wx.hideLoading();

        if (fullProduct.skus && fullProduct.skus.length > 0) {
          this.setData({
            activeSpecProduct: fullProduct,
            showSpecSheet: true,
          });
        } else {
          wx.showToast({ title: '该商品暂无规格', icon: 'none' });
        }
      } catch (err: any) {
        wx.hideLoading();
        wx.showToast({ title: err.message || '获取商品规格失败', icon: 'none' });
      }
    },
    onCloseSpecSheet() {
      this.setData({ showSpecSheet: false });
    },
    async onConfirmSpecSheet(e: WechatMiniprogram.BaseEvent & { detail?: { sku?: any; qty?: number } }) {
      const { sku, qty } = e.detail || {};
      if (!sku) {
        wx.showToast({ title: '请选择规格', icon: 'none' });
        return;
      }

      wx.showLoading({ title: '添加中...', mask: true });
      try {
        const result = await addToCart(Number(sku.id), qty || 1);
        wx.hideLoading();
        wx.showToast({ title: '已加入购物车', icon: 'success' });
        this.setData({
          showSpecSheet: false,
          cartBadge: result.cartCount > 0 ? String(result.cartCount) : '',
        });
        const tabBar = (this as any).getTabBar?.();
        if (tabBar && typeof tabBar.syncFromRoute === 'function') {
          tabBar.syncFromRoute();
        }
      } catch (err: any) {
        wx.hideLoading();
        wx.showToast({ title: err.message || '加入购物车失败', icon: 'none' });
      }
    },
    openProductDetail(e: WechatMiniprogram.BaseEvent) {
      const { id } = (e.currentTarget.dataset as { id?: string }) || {};
      if (id) {
        wx.navigateTo({
          url: `/pages/product/detail/detail?productId=${id}`,
        });
      }
    },
    async autoUpdateLocationIfEnabled() {
      const selectedLocation = loadSelectedLocation();
      if (selectedLocation) {
        const locationText = selectedLocation.name || selectedLocation.address;
        this.setData({
          'home.location': locationText,
          'home.locationDisplay': truncateLocationText(locationText),
          'home.locationModeLabel': '当前定位 · 手动',
          locationMode: 'manual',
        });
      } else {
        this.setData({
          'home.location': DEFAULT_LOCATION_LABEL,
          'home.locationDisplay': truncateLocationText(DEFAULT_LOCATION_LABEL),
          'home.locationModeLabel': '当前定位 · 自动',
          locationMode: 'auto',
        });
      }
    },
    toggleLocationMode() {
      // 废弃无用的自动定位切换，仅作接口占位
    },
    checkLocationChangePrompt() {
      if (hasPromptedThisSession) {
        return;
      }

      const selected = loadSelectedLocation();
      const isDefault = !selected || selected.name === DEFAULT_LOCATION_LABEL;

      if (isDefault) {
        hasPromptedThisSession = true;
        wx.showModal({
          title: '位置提示',
          content: '您当前处于默认位置，是否前往进行定位以获取真实周边商品？',
          confirmText: '重新定位',
          cancelText: '暂不',
          success: (modalRes) => {
            if (modalRes.confirm) {
              this.startManualLocation();
            }
          },
        });
        return;
      }

      wx.getSetting({
        success: (res) => {
          if (!res.authSetting['scope.userLocation']) {
            return;
          }

          const getGPS = (): Promise<WechatMiniprogram.GetLocationSuccessCallbackResult> => {
            return new Promise((resolve, reject) => {
              const fuzzy = (wx as any).getFuzzyLocation;
              const options = {
                type: 'gcj02',
                success: resolve,
                fail: () => {
                  wx.getLocation({
                    type: 'gcj02',
                    success: resolve,
                    fail: reject,
                  });
                },
              };
              if (typeof fuzzy === 'function') {
                fuzzy(options);
              } else {
                wx.getLocation(options);
              }
            });
          };

          getGPS().then((gps) => {
            const dist = getDistance(gps.latitude, gps.longitude, selected.latitude, selected.longitude);
            if (dist > 5000) { // 超过 5 公里
              hasPromptedThisSession = true;
              wx.showModal({
                title: '位置提示',
                content: '检测到您当前的物理位置已发生变动，是否重新选点定位？',
                confirmText: '重新定位',
                cancelText: '暂不',
                success: (modalRes) => {
                  if (modalRes.confirm) {
                    this.startManualLocation();
                  }
                },
              });
            }
          }).catch((err) => {
            console.error('Check location change GPS failed:', err);
          });
        },
      });
    },
    startManualLocation() {
      wx.getSetting({
        success: (settingRes) => {
          const choose = () => {
            wx.chooseLocation({
              success: (chooseRes) => {
                const lat = Number(chooseRes.latitude);
                const lng = Number(chooseRes.longitude);
                const manualLoc = {
                  source: 'manual' as const,
                  name: chooseRes.name || '选择的位置',
                  address: chooseRes.address || '',
                  latitude: lat,
                  longitude: lng,
                  updatedAt: Date.now(),
                };
                saveSelectedLocation(manualLoc);
                const locationText = manualLoc.name || manualLoc.address;
                this.setData({
                  'home.location': locationText,
                  'home.locationDisplay': truncateLocationText(locationText),
                  'home.locationModeLabel': '当前定位 · 手动',
                  locationMode: 'manual',
                });
                wx.showToast({ title: '已更新位置', icon: 'success' });
                void this.loadHomeData();
              },
              fail: (err) => {
                console.error('chooseLocation failed', err);
              }
            });
          };

          if (settingRes.authSetting['scope.userLocation']) {
            choose();
          } else {
            wx.authorize({
              scope: 'scope.userLocation',
              success: choose,
              fail: () => {
                wx.showModal({
                  title: '需要定位权限',
                  content: '请在设置中允许小程序使用定位权限以选择位置。',
                  confirmText: '去设置',
                  success: (modalRes) => {
                    if (modalRes.confirm) {
                      wx.openSetting({
                        success: (settingRes2) => {
                          if (settingRes2.authSetting['scope.userLocation']) {
                            choose();
                          }
                        }
                      });
                    }
                  }
                });
              }
            });
          }
        }
      });
    },
  },
});
