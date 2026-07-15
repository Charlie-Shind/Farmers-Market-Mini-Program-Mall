import { iconPaths } from '../../../config/icons';
import { upload } from '../../../services/request';
import { buildPageTopStyle } from '../../../utils/page-layout';
import { buildLoginUrl, navigateBackOrHome } from '../../../utils/auth-route';
import { getAuthTokenType } from '../../../services/token';
import {
  applyLeader,
  fetchLeaderApplication,
  updateLeaderApplication,
} from '../../../services/leader';
import { refreshSessionToken } from '../../../services/auth';

function maskMobile(mobile: string): string {
  const value = String(mobile || '').trim();
  if (!value) return '—';
  if (value.length < 7) return value;
  return value.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}

function maskIdCard(idCardNo: string): string {
  const value = String(idCardNo || '').trim();
  if (!value) return '—';
  if (value.length < 8) return value;
  return value.replace(/^(.{4}).*(.{4})$/, '$1**********$2');
}

function formatSubmittedAt(value?: string): string {
  if (!value) return '刚刚提交';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}-${day} ${hours}:${minutes} 提交`;
}

function buildSitePreviewName(realName: string): string {
  const name = String(realName || '').trim();
  return name ? `${name}社区自提点` : '待开通自提站点';
}

Component({
  data: {
    loading: false,
    loadingText: '加载中...',
    pageStyle: '',
    icons: iconPaths,
    applicationStatus: 'NOT_APPLIED',
    submitting: false,
    form: {
      realName: '',
      idCardNo: '',
      mobile: '',
      businessCertUrl: '',
      idCardFrontUrl: '',
      idCardBackUrl: '',
    },
    toastVisible: false,
    toastMessage: '',
    toastType: 'info' as 'info' | 'success' | 'warning' | 'danger',
    rejectRemark: '',
    sitePreviewName: '待开通自提站点',
    maskedMobile: '—',
    maskedIdCard: '—',
    submittedAtText: '刚刚提交',
  },
  lifetimes: {
    attached() {
      this.setData({
        pageStyle: buildPageTopStyle(0),
      });

      if (!this.ensureAccess()) {
        return;
      }

      this.loadApplicationStatus();
    },
  },
  pageLifetimes: {
    show() {
      if (!this.ensureAccess()) {
        return;
      }

      this.loadApplicationStatus();
    },
  },
  methods: {
    ensureAccess() {
      const authKind = getAuthTokenType();
      if (authKind === 'access') {
        return true;
      }

      wx.navigateTo({
        url: buildLoginUrl('/pages/leader/apply/apply'),
      });
      return false;
    },
    async loadApplicationStatus() {
      this.setData({ loading: true, loadingText: '获取申请状态中' });
      try {
        const application = await fetchLeaderApplication();
        const status = application?.status || 'NOT_APPLIED';

        this.setData({
          applicationStatus: status,
        });

        if (status === 'APPROVED') {
          try {
            await refreshSessionToken();
          } catch (refreshErr) {
            console.error('Silent refresh token failed:', refreshErr);
          }

          wx.redirectTo({
            url: '/pages/leader/dashboard/dashboard',
          });
          return;
        } else if (status === 'REJECTED' || status === 'PENDING_AUDIT') {
          const form = {
            realName: application.realName || '',
            idCardNo: application.idCardNo || '',
            mobile: application.mobile || '',
            businessCertUrl: application.businessCertUrl || '',
            idCardFrontUrl: application.idCardFrontUrl || '',
            idCardBackUrl: application.idCardBackUrl || '',
          };
          this.setData({
            form,
            rejectRemark: application.rejectRemark || '',
            sitePreviewName: buildSitePreviewName(form.realName),
            maskedMobile: maskMobile(form.mobile),
            maskedIdCard: maskIdCard(form.idCardNo),
            submittedAtText: formatSubmittedAt(application.createdAt),
          });
        }
      } catch (err) {
        // 容错处理
      } finally {
        this.setData({ loading: false });
      }
    },
    onInput(e: WechatMiniprogram.Input) {
      const field = String(e.currentTarget.dataset.field || '');
      if (!field) {
        return;
      }

      this.setData({
        [`form.${field}`]: e.detail.value,
      });
    },
    chooseImage(e: WechatMiniprogram.TouchEvent) {
      const type = e.currentTarget.dataset.type as string;
      if (!type) {
        return;
      }

      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          const file = res.tempFiles[0];
          if (!file) {
            return;
          }
          this.uploadImage(file.tempFilePath, type);
        },
      });
    },
    async uploadImage(filePath: string, type: string) {
      const typeLabels: Record<string, string> = {
        businessCertUrl: '营业执照',
        idCardFrontUrl: '身份证正面',
        idCardBackUrl: '身份证反面',
      };
      const typeLabel = typeLabels[type] || '图片';
      this.setData({
        loading: true,
        loadingText: `上传${typeLabel}中...`,
      });

      try {
        const uploaded = await upload<{ url?: string }>({
          url: '/files/upload',
          filePath: filePath,
          name: 'file',
          auth: false,
        });

        if (!uploaded?.url) {
          throw new Error('上传失败');
        }

        this.setData({
          [`form.${type}`]: uploaded.url,
        });

        this.showToast(`${typeLabel}上传成功`, 'success');
      } catch (err) {
        this.showToast(`${typeLabel}上传失败，请重试`, 'danger');
      } finally {
        this.setData({
          loading: false,
        });
      }
    },
    async submitApplication() {
      const {
        realName,
        idCardNo,
        mobile,
        businessCertUrl,
        idCardFrontUrl,
        idCardBackUrl,
      } = this.data.form;

      if (!realName.trim()) {
        this.showToast('请输入真实姓名', 'warning');
        return;
      }
      if (!idCardNo.trim()) {
        this.showToast('请输入身份证号', 'warning');
        return;
      }
      if (!/^\d{17}[\dXx]$/.test(idCardNo.trim())) {
        this.showToast('身份证号格式不正确', 'warning');
        return;
      }
      if (!mobile.trim()) {
        this.showToast('请输入手机号', 'warning');
        return;
      }
      if (!/^1[3-9]\d{9}$/.test(mobile.trim())) {
        this.showToast('手机号格式不正确', 'warning');
        return;
      }
      if (!businessCertUrl) {
        this.showToast('请上传营业执照', 'warning');
        return;
      }
      if (!idCardFrontUrl) {
        this.showToast('请上传身份证正面', 'warning');
        return;
      }
      if (!idCardBackUrl) {
        this.showToast('请上传身份证反面', 'warning');
        return;
      }

      this.setData({ submitting: true });

      try {
        const payload = {
          realName: realName.trim(),
          idCardNo: idCardNo.trim(),
          mobile: mobile.trim(),
          businessCertUrl,
          idCardFrontUrl,
          idCardBackUrl,
        };

        if (this.data.applicationStatus === 'REJECTED') {
          await updateLeaderApplication(payload);
        } else {
          await applyLeader(payload);
        }

        this.showToast('申请提交成功', 'success');
        
        setTimeout(() => {
          this.loadApplicationStatus();
        }, 1000);
      } catch (err) {
        this.showToast('提交申请失败，请稍后重试', 'danger');
      } finally {
        this.setData({ submitting: false });
      }
    },
    showToast(message: string, type: 'info' | 'success' | 'warning' | 'danger' = 'info') {
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
    goBack() {
      navigateBackOrHome();
    },
  },
});
