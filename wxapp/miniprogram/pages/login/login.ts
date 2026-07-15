import { iconPaths } from '../../config/icons';
import { buildPageTopStyle } from '../../utils/page-layout';
import { logger } from '../../utils/logger';
import {
  navigateAfterLogin,
  navigateBackOrHome,
  resolveRedirectPath,
  resolveSafeLoginBackPath,
} from '../../utils/auth-route';
import {
  bindWechatPhone,
  clearUserLocalState,
  fetchAnonymousSession,
  loginWithWechatCode,
  loginWithWechatSms,
} from '../../services/auth';
import { setGuestMode } from '../../services/token';

type ToastType = 'info' | 'success' | 'warning' | 'danger';

type ProtocolDialogState = {
  show: boolean;
  title: string;
  content: string;
  cancelText: string;
  confirmText: string;
};

const USER_PROTOCOL_TEXT = [
  '1. 你可以使用微信手机号一键登录农仓小程序，平台会根据微信身份和手机号识别账号。',
  '2. 登录后，平台会在商品浏览、下单、订单查询、售后处理、客服沟通等必要场景使用你的账号信息。',
  '3. 你应确保授权的手机号属于你本人，或已经获得合法授权。',
  '4. 若账号出现异常、误绑定或需要解绑处理，可通过平台客服或相关功能入口发起申请。',
  '5. 你在使用本服务前，需要同时接受平台的业务规则、订单规则和交易规则。',
].join('\n');

const PRIVACY_POLICY_TEXT = [
  '1. 我们仅收集实现登录、交易和服务所必需的信息，包括微信身份、手机号、头像昵称、订单信息、收货地址和必要的操作记录。',
  '2. 上述信息主要用于账号识别、订单履约、售后处理、消息通知、客服支持和安全风控。',
  '3. 平台不会向无关第三方出售你的个人信息，只有在法律要求、服务必要或你主动授权时才会共享必要数据。',
  '4. 你可以通过账户相关入口查询、更正或管理部分个人信息；如需注销或删除相关数据，可按平台流程提交申请。',
  '5. 平台会采取合理的技术与管理措施保护你的信息安全，但你也需要妥善保管自己的账号和设备。',
].join('\n');

Component({
  data: {
    loginMode: 'wechat' as 'wechat' | 'sms',
    phoneNumber: '',
    verifyCode: '',
    agree: false,
    redirectPath: '/pages/index/index',
    safeBackPath: '/pages/index/index',
    loading: false,
    loadingText: '处理中',
    toastVisible: false,
    toastMessage: '',
    toastType: 'info' as ToastType,
    protocolDialog: {
      show: false,
      title: '',
      content: '',
      cancelText: '关闭',
      confirmText: '我知道了',
    } as ProtocolDialogState,
    icons: iconPaths,
    pageStyle: '',
  },
  lifetimes: {
    attached() {
      this.syncRouteState();
      this.setData({
        pageStyle: buildPageTopStyle(0),
      });
    },
  },
  methods: {
    syncRouteState() {
      const pages = getCurrentPages();
      const current = pages[pages.length - 1] as
        | {
            options?: Record<string, string>;
          }
        | undefined;
      const redirect =
        current && current.options && current.options.redirect
          ? resolveRedirectPath(current.options.redirect, '/pages/index/index')
          : '/pages/index/index';
      const safeBackPath = resolveSafeLoginBackPath(redirect);

      this.setData({
        redirectPath: redirect,
        safeBackPath,
      });
    },
    goBack() {
      if (this.data.safeBackPath !== this.data.redirectPath) {
        wx.reLaunch({
          url: this.data.safeBackPath,
        });
        return;
      }

      navigateBackOrHome();
    },
    setToast(message: string, type: ToastType = 'info') {
      this.setData({
        toastMessage: message,
        toastType: type,
        toastVisible: true,
      });
    },
    hideToast() {
      this.setData({
        toastVisible: false,
      });
    },
    openProtocolDialog(title: string, content: string) {
      this.setData({
        protocolDialog: {
          show: true,
          title,
          content,
          cancelText: '关闭',
          confirmText: '我知道了',
        },
      });
    },
    hideProtocolDialog() {
      this.setData({
        protocolDialog: {
          ...this.data.protocolDialog,
          show: false,
        },
      });
    },
    toggleAgree() {
      this.setData({
        agree: !this.data.agree,
      });
    },
    showUserProtocol() {
      this.openProtocolDialog('用户协议', USER_PROTOCOL_TEXT);
    },
    showPrivacyProtocol() {
      this.openProtocolDialog('隐私政策', PRIVACY_POLICY_TEXT);
    },
    switchLoginMode(e: WechatMiniprogram.BaseEvent) {
      const { mode } = (e.currentTarget.dataset as { mode?: 'wechat' | 'sms' }) || {};
      if (!mode || mode === this.data.loginMode) {
        return;
      }

      this.setData({
        loginMode: mode,
      });
    },
    handlePhoneNumberInput(e: WechatMiniprogram.BaseEvent) {
      const detail = (e as WechatMiniprogram.BaseEvent & { detail?: { value?: string } }).detail ?? {};
      const rawValue = String(detail.value ?? '');
      this.setData({
        phoneNumber: rawValue.replace(/\D/g, '').slice(0, 11),
      });
    },
    handleVerifyCodeInput(e: WechatMiniprogram.BaseEvent) {
      const detail = (e as WechatMiniprogram.BaseEvent & { detail?: { value?: string } }).detail ?? {};
      const rawValue = String(detail.value ?? '');
      this.setData({
        verifyCode: rawValue.replace(/\D/g, '').slice(0, 6),
      });
    },
    handleSendPhoneSms() {
      if (!this.data.phoneNumber) {
        this.setToast('请输入手机号', 'warning');
        return;
      }
      this.setToast('验证码已发送，请注意查收', 'success');
    },
    async handleSmsLogin() {
      if (!this.data.agree) {
        this.setToast('请先勾选协议', 'warning');
        return;
      }

      const phoneNumber = this.data.phoneNumber.trim();
      const verifyCode = this.data.verifyCode.trim();

      if (!/^1\d{10}$/.test(phoneNumber)) {
        this.setToast('请输入正确的手机号', 'warning');
        return;
      }

      if (!/^\d{6}$/.test(verifyCode)) {
        this.setToast('请输入 6 位验证码', 'warning');
        return;
      }

      clearUserLocalState();

      this.setData({
        loading: true,
        loadingText: '正在完成手机号登录',
      });

      try {
        const session = await loginWithWechatSms({
          verifyCode: `mock_${phoneNumber}`,
        });

        this.completeAuth('登录成功', session.user?.role);
      } catch (error) {
        logger.error('sms login failed', error);
        this.setToast(this.getErrorMessage(error), 'danger');
      } finally {
        this.setData({
          loading: false,
        });
      }
    },
    async completeAuth(message: string, role?: string) {
      this.setToast(message, 'success');
      setTimeout(() => {
        navigateAfterLogin(this.data.redirectPath, '/pages/index/index', role);
      }, 500);
    },
    getErrorMessage(error: unknown): string {
      if (error instanceof Error && error.message.trim()) {
        return error.message;
      }

      return '登录失败，请重试';
    },
    async handleWechatPhoneLogin(e: WechatMiniprogram.CustomEvent) {
      const detail = e.detail as {
        errMsg?: string;
        code?: string;
      };

      if (!this.data.agree) {
        this.setToast('请先勾选协议', 'warning');
        return;
      }

      if (!detail || !detail.code || detail.errMsg !== 'getPhoneNumber:ok') {
        this.setToast('手机号授权失败，请重试', 'warning');
        return;
      }

      clearUserLocalState();

      this.setData({
        loading: true,
        loadingText: '正在完成微信登录',
      });

      try {
        const loginCode = await new Promise<string>((resolve, reject) => {
          wx.login({
            success: (res) => {
              if (res.code) {
                resolve(res.code);
                return;
              }

              reject(new Error(res.errMsg || '微信登录失败'));
            },
            fail: (error) => {
              reject(error);
            },
          });
        });

        await loginWithWechatCode({
          code: loginCode,
        });

        const freshLoginCode = await new Promise<string>((resolve, reject) => {
          wx.login({
            success: (res) => {
              if (res.code) {
                resolve(res.code);
                return;
              }

              reject(new Error(res.errMsg || '微信登录失败'));
            },
            fail: (error) => {
              reject(error);
            },
          });
        });

        const boundSession = await bindWechatPhone({
          loginCode: freshLoginCode,
          phoneCode: detail.code,
        });

        this.completeAuth('登录成功', boundSession.user?.role);
      } catch (error) {
        logger.error('wechat login failed', error);
        this.setToast(this.getErrorMessage(error), 'danger');
      } finally {
        this.setData({
          loading: false,
        });
      }
    },
    enterGuest() {
      this.setData({
        loading: true,
        loadingText: '正在进入游客态',
      });

      clearUserLocalState();

      fetchAnonymousSession()
        .then(() => {
          this.completeAuth('已进入游客态');
        })
        .catch((error) => {
          logger.warn('anonymous session failed, fallback to guest browsing', error);
          setGuestMode();
          this.completeAuth('已进入游客态');
        })
        .finally(() => {
          this.setData({
            loading: false,
          });
        });
    },
  },
});
