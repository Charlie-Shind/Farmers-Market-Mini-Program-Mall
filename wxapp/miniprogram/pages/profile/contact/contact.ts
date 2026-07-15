import { iconPaths } from '../../../config/icons';
import { fetchChatSupportTarget, type AppChatSupportTarget } from '../../../services/app';
import { buildPageTopStyle } from '../../../utils/page-layout';
import { navigateBackOrHome } from '../../../utils/auth-route';

function buildSupportSubtitle(target: AppChatSupportTarget | null, loading: boolean): string {
  if (loading) {
    return '正在加载平台接待信息…';
  }

  if (!target) {
    return '平台管理员在线接待';
  }

  return `${target.merchantName || '平台管理员'} · 在线接待`;
}

Component({
  data: {
    icons: iconPaths,
    pageStyle: '',
    loading: false,
    loadingText: '正在加载客服信息',
    supportTarget: null as AppChatSupportTarget | null,
    supportSubtitle: buildSupportSubtitle(null, false),
  },
  lifetimes: {
    attached() {
      this.setData({
        pageStyle: buildPageTopStyle(0),
      });
      void this.loadSupportTarget();
    },
  },
  methods: {
    async loadSupportTarget() {
      let supportTarget: AppChatSupportTarget | null = null;
      this.setData({
        loading: true,
        loadingText: '正在加载客服信息',
        supportSubtitle: buildSupportSubtitle(null, true),
      });

      try {
        supportTarget = await fetchChatSupportTarget();
        this.setData({
          supportTarget,
          supportSubtitle: buildSupportSubtitle(supportTarget, false),
        });
      } catch {
        this.setData({
          supportTarget: null,
          supportSubtitle: buildSupportSubtitle(null, false),
        });
      } finally {
        this.setData({
          loading: false,
          supportSubtitle: buildSupportSubtitle(supportTarget, false),
        });
      }
    },
    goBack() {
      navigateBackOrHome();
    },
    goToChat() {
      const target = this.data.supportTarget;
      if (!target) {
        wx.showToast({
          title: '客服暂未配置',
          icon: 'none',
        });
        return;
      }

      wx.navigateTo({
        url: `/pages/chat/chat?sceneType=OFFICIAL&sceneLabel=${encodeURIComponent(
          target.sceneLabel || '联系客服',
        )}&sceneSource=${encodeURIComponent(target.sceneSource || '个人中心')}`,
      });
    },
    callHotline() {
      const hotline = this.data.supportTarget?.hotline;
      if (!hotline) {
        wx.showToast({
          title: '电话客服暂未开通',
          icon: 'none',
        });
        return;
      }

      wx.makePhoneCall({
        phoneNumber: hotline,
      });
    },
  },
});
