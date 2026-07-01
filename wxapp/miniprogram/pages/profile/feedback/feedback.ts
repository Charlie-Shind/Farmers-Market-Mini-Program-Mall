import { iconPaths } from '../../../config/icons';
import { fetchChatSupportTarget, openChatConversation, sendChatMessage, type AppChatSupportTarget } from '../../../services/app';
import { buildPageTopStyle } from '../../../utils/page-layout';
import { navigateBackOrHome } from '../../../utils/auth-route';

type FeedbackType = '功能建议' | '页面问题' | '内容问题' | '售后反馈' | '其他';

const FEEDBACK_TYPES: FeedbackType[] = ['功能建议', '页面问题', '内容问题', '售后反馈', '其他'];

Component({
  data: {
    icons: iconPaths,
    pageStyle: '',
    loading: false,
    loadingText: '正在加载反馈页',
    submitting: false,
    supportTarget: null as AppChatSupportTarget | null,
    feedbackTypes: FEEDBACK_TYPES,
    typeIndex: 0,
    form: {
      contact: '',
      content: '',
    },
  },
  lifetimes: {
    attached() {
      this.setData({
        pageStyle: buildPageTopStyle(4),
      });
      void this.loadSupportTarget();
    },
  },
  methods: {
    async loadSupportTarget() {
      this.setData({
        loading: true,
        loadingText: '正在加载反馈页',
      });

      try {
        const supportTarget = await fetchChatSupportTarget();
        this.setData({
          supportTarget,
        });
      } catch {
        this.setData({
          supportTarget: null,
        });
      } finally {
        this.setData({
          loading: false,
        });
      }
    },
    goBack() {
      navigateBackOrHome();
    },
    onTypeChange(e: WechatMiniprogram.PickerChange) {
      const index = Number(e.detail.value ?? 0);
      this.setData({
        typeIndex: Number.isNaN(index) ? 0 : index,
      });
    },
    onContactInput(e: WechatMiniprogram.Input) {
      this.setData({
        'form.contact': e.detail.value,
      });
    },
    onContentInput(e: WechatMiniprogram.Input) {
      this.setData({
        'form.content': e.detail.value,
      });
    },
    async submitFeedback() {
      const content = String(this.data.form.content || '').trim();
      const contact = String(this.data.form.contact || '').trim();

      if (!content) {
        wx.showToast({
          title: '请先填写反馈内容',
          icon: 'none',
        });
        return;
      }

      this.setData({
        submitting: true,
      });

      try {
        const target = this.data.supportTarget || (await fetchChatSupportTarget().catch(() => null));
        if (!target) {
          wx.showToast({
            title: '客服暂未配置',
            icon: 'none',
          });
          return;
        }

        const category = this.data.feedbackTypes[this.data.typeIndex] || '其他';
        const opened = await openChatConversation({
          sceneType: 'OFFICIAL',
          sceneLabel: '意见反馈',
          sceneSource: '个人中心',
        });

        const message = [
          '【意见反馈】',
          `类型：${category}`,
          `联系方式：${contact || '未填写'}`,
          `内容：${content}`,
        ].join('\n');

        await sendChatMessage(opened.conversationId, {
          content: message,
          contentType: 'TEXT',
        });

        this.setData({
          form: {
            contact: '',
            content: '',
          },
          typeIndex: 0,
        });

        wx.showToast({
          title: '反馈已提交',
          icon: 'success',
        });
      } catch {
        wx.showToast({
          title: '提交失败，请稍后重试',
          icon: 'none',
        });
      } finally {
        this.setData({
          submitting: false,
        });
      }
    },
  },
});
