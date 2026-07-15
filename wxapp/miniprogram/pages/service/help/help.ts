import { iconPaths } from '../../../config/icons';
import { fetchChatSupportTarget, type AppChatSupportTarget } from '../../../services/app';
import { buildPageTopStyle } from '../../../utils/page-layout';
import { navigateBackOrHome } from '../../../utils/auth-route';

type HelpActionKey = 'online' | 'afterSale' | 'logistics' | 'refund' | 'address' | 'phone';

type HelpAction = {
  key: HelpActionKey;
  title: string;
  desc: string;
  icon: string;
};

const HELP_ACTIONS: HelpAction[] = [
  { key: 'online', title: '平台客服', desc: '直连平台管理员接待，优先处理订单与活动问题', icon: 'message' },
  { key: 'afterSale', title: '申请售后', desc: '退款、退货、补发统一从这里发起', icon: 'wallet' },
  { key: 'logistics', title: '查看物流', desc: '查看配送进度和物流节点', icon: 'truck' },
  { key: 'refund', title: '退款进度', desc: '跟进售后中的退款处理状态', icon: 'points' },
  { key: 'address', title: '修改地址', desc: '未发货订单先到地址管理处理', icon: 'location' },
  { key: 'phone', title: '电话客服', desc: '电话客服待配置，先使用平台在线客服', icon: 'phone' },
];

const FAQS = [
  {
    question: '生鲜坏果如何赔付？',
    answer: '签收后尽快提交照片与问题说明，平台会按售后规则处理退款或补发。',
  },
  {
    question: '订单发货后可以改地址吗？',
    answer: '未发货前可以在地址管理中确认，已发货需要联系在线客服协助。',
  },
  {
    question: '退款多久到账？',
    answer: '退款状态以订单详情和售后进度为准，支付渠道完成退款后会同步更新。',
  },
];

function buildSupportSubtitle(target: AppChatSupportTarget | null, loading: boolean): string {
  if (loading) {
    return '正在加载平台接待信息…';
  }
  if (!target) {
    return '平台管理员在线接待';
  }
  return `平台管理员在线接待 · ${target.merchantName}`;
}

Component({
  data: {
    icons: iconPaths,
    pageStyle: '',
    actions: HELP_ACTIONS,
    faqs: FAQS,
    supportTarget: null as AppChatSupportTarget | null,
    supportLoading: false,
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
      this.setData({
        supportLoading: true,
        supportSubtitle: buildSupportSubtitle(null, true),
      });
      try {
        const supportTarget = await fetchChatSupportTarget();
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
          supportLoading: false,
          supportSubtitle: buildSupportSubtitle(this.data.supportTarget, false),
        });
      }
    },
    goBack() {
      navigateBackOrHome();
    },
    goToPlatformSupport() {
      const target = this.data.supportTarget;
      if (!target) {
        wx.showToast({ title: '客服暂未配置', icon: 'none' });
        return;
      }

      const sceneLabel = target.sceneLabel || '平台管理员在线客服';
      const sceneSource = target.sceneSource || '帮助中心';

      wx.navigateTo({
        url: `/pages/chat/chat?sceneType=OFFICIAL&sceneLabel=${encodeURIComponent(sceneLabel)}&sceneSource=${encodeURIComponent(sceneSource)}`,
      });
    },
    handleAction(e: WechatMiniprogram.BaseEvent) {
      const { action } = (e.currentTarget.dataset as { action?: HelpActionKey }) || {};

      if (!action) {
        return;
      }

      if (action === 'online') {
        this.goToPlatformSupport();
        return;
      }

      if (action === 'afterSale' || action === 'refund') {
        wx.navigateTo({ url: '/pages/order/list/list?type=refund' });
        return;
      }

      if (action === 'logistics') {
        wx.navigateTo({ url: '/pages/order/list/list?type=receive' });
        return;
      }

      if (action === 'address') {
        wx.navigateTo({ url: '/pages/address/list/list' });
        return;
      }

      if (action === 'phone') {
        wx.showModal({
          title: '电话客服',
          content: '电话客服暂未配置，请先使用平台在线客服联系管理员。',
          showCancel: false,
        });
      }
    },
  },
});
