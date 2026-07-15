import { readPageMetrics } from '../../../utils/page-layout';

Component({
  options: {
    multipleSlots: true,
  },
  properties: {
    title: {
      type: String,
      value: '',
    },
    showBack: {
      type: Boolean,
      value: true,
    },
    theme: {
      type: String,
      value: 'solid',
    },
    placeholder: {
      type: Boolean,
      value: true,
    },
    delta: {
      type: Number,
      value: 1,
    },
  },
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    totalHeight: 64,
    safeRight: 112,
    iconColor: '#ffffff',
  },
  lifetimes: {
    attached() {
      this.applyMetrics();
      this.applyThemeColors(this.data.theme);
    },
  },
  observers: {
    theme(theme: string) {
      this.applyThemeColors(theme);
    },
  },
  methods: {
    applyMetrics() {
      const metrics = readPageMetrics(12);
      const totalHeight = metrics.statusBarHeight + metrics.navBarHeight;
      this.setData({
        statusBarHeight: metrics.statusBarHeight,
        navBarHeight: metrics.navBarHeight,
        totalHeight,
        safeRight: metrics.safeRight,
      });
    },
    applyThemeColors(theme: string) {
      const iconColor =
        theme === 'solid' ? '#111111' : '#ffffff';
      this.setData({ iconColor });
    },
    onBack() {
      const delta = Math.max(1, Number(this.data.delta) || 1);
      this.triggerEvent('back', { delta });
      const pages = getCurrentPages();
      if (pages.length > 1) {
        wx.navigateBack({ delta });
        return;
      }
      wx.reLaunch({ url: '/pages/index/index' });
    },
  },
});
