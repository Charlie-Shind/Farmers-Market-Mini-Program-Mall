import { iconPaths } from '../../../config/icons';
import { fetchMe } from '../../../services/app';
import { applyMerchant, fetchMerchantProfile } from '../../../services/merchant';
import { upload } from '../../../services/request';
import { buildPageTopStyle } from '../../../utils/page-layout';
import { buildLoginUrl, navigateBackOrHome } from '../../../utils/auth-route';
import { getAuthTokenType } from '../../../services/token';
import { refreshSessionToken } from '../../../services/auth';
import { merchantHomeRoute } from '../../../config/merchant';

Component({
  data: {
    loading: false,
    loadingText: '加载中...',
    pageStyle: '',
    icons: iconPaths,
    merchantStatus: 'NOT_APPLIED', // NOT_APPLIED, PENDING_AUDIT, APPROVED, REJECTED
    submitting: false,
    form: {
      storeName: '',
      storeLogo: '',
      contactName: '',
      contactMobile: '',
      businessLicense: '',
      originQualification: '',
      storeDesc: '',
    },
    toastVisible: false,
    toastMessage: '',
    toastType: 'info' as 'info' | 'success' | 'warning' | 'danger',
    cropperVisible: false,
    cropperImageUrl: '',
    rejectRemark: '',
  },
  lifetimes: {
    attached() {
      this.setData({
        pageStyle: buildPageTopStyle(4),
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
        url: buildLoginUrl('/pages/profile/apply/apply'),
      });
      return false;
    },
    async loadApplicationStatus() {
      this.setData({ loading: true, loadingText: '获取申请状态中' });
      try {
        const me = await fetchMe();
        // 如果后端返回的 me.profile 中包含 merchantStatus
        const merchantStatus = (me.profile as any)?.merchantStatus || 'NOT_APPLIED';

        this.setData({
          merchantStatus,
        });

        if (merchantStatus === 'APPROVED') {
          try {
            await refreshSessionToken();
          } catch (refreshErr) {
            console.error('Silent refresh token failed:', refreshErr);
          }

          wx.showModal({
            title: '审核通过',
            content: '恭喜！您的商户资质已通过审核，即将进入商家工作台。',
            showCancel: false,
            success: () => {
              wx.reLaunch({
                url: merchantHomeRoute,
              });
            }
          });
        } else if (merchantStatus === 'REJECTED' || merchantStatus === 'PENDING_AUDIT') {
          try {
            const profile = await fetchMerchantProfile();
            const businessLicense = profile.qualifications?.find(q => q.qualificationType === 'BUSINESS_LICENSE')?.fileUrl || '';
            const originQualification = profile.qualifications?.find(q => q.qualificationType === 'ORIGIN_QUALIFICATION')?.fileUrl || '';
            const storeDesc = profile.qualifications?.find(q => q.qualificationType === 'STORE_DESC')?.fileUrl || '';
            const rejectRemark = profile.qualifications?.find(q => q.status === 3 || q.auditRemark)?.auditRemark || '';

            this.setData({
              form: {
                storeName: profile.storeName || '',
                storeLogo: profile.storeLogo || '',
                contactName: profile.contactName || '',
                contactMobile: profile.contactMobile || '',
                businessLicense,
                originQualification,
                storeDesc,
              },
              rejectRemark,
            });
          } catch (profileErr) {
            console.error('Failed to load merchant profile:', profileErr);
          }
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
    chooseLogo() {
      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          const file = res.tempFiles[0];
          if (!file) {
            return;
          }

          this.setData({
            cropperImageUrl: file.tempFilePath,
            cropperVisible: true,
          });
        },
      });
    },
    onCropSuccess(e: any) {
      const tempFilePath = e.detail.tempFilePath;
      this.setData({
        cropperVisible: false,
      });

      this.uploadLogo(tempFilePath);
    },
    onCropCancel() {
      this.setData({
        cropperVisible: false,
      });
    },
    async uploadLogo(filePath: string) {
      this.setData({
        loading: true,
        loadingText: '上传Logo中...',
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
          [`form.storeLogo`]: uploaded.url,
        });

        this.showToast('店铺Logo上传成功', 'success');
      } catch {
        this.showToast('图片上传失败，请重试', 'danger');
      } finally {
        this.setData({
          loading: false,
        });
      }
    },
    chooseQualification(e: WechatMiniprogram.TouchEvent) {
      const type = e.currentTarget.dataset.type as 'BUSINESS_LICENSE' | 'ORIGIN_QUALIFICATION';
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
          this.uploadQualification(file.tempFilePath, type);
        },
      });
    },
    async uploadQualification(filePath: string, type: 'BUSINESS_LICENSE' | 'ORIGIN_QUALIFICATION') {
      const typeLabel = type === 'BUSINESS_LICENSE' ? '营业执照' : '产地资质';
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

        const field = type === 'BUSINESS_LICENSE' ? 'businessLicense' : 'originQualification';
        this.setData({
          [`form.${field}`]: uploaded.url,
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
      const { storeName, storeLogo, contactName, contactMobile, businessLicense, originQualification, storeDesc } = this.data.form;

      if (!storeLogo) {
        this.showToast('请上传店铺Logo', 'warning');
        return;
      }
      if (!storeName.trim()) {
        this.showToast('请输入店铺名称', 'warning');
        return;
      }
      if (!contactName.trim()) {
        this.showToast('请输入真实姓名', 'warning');
        return;
      }
      if (!contactMobile.trim()) {
        this.showToast('请输入联系电话', 'warning');
        return;
      }
      if (!storeDesc.trim()) {
        this.showToast('请输入店铺简介', 'warning');
        return;
      }
      if (!businessLicense) {
        this.showToast('请上传营业执照', 'warning');
        return;
      }
      if (!originQualification) {
        this.showToast('请上传产地资质', 'warning');
        return;
      }

      this.setData({ submitting: true });

      const qualifications = [
        {
          qualificationType: 'BUSINESS_LICENSE',
          fileName: '营业执照',
          fileUrl: businessLicense,
        },
        {
          qualificationType: 'ORIGIN_QUALIFICATION',
          fileName: '农产品产地资质证明',
          fileUrl: originQualification,
        },
        {
          qualificationType: 'STORE_DESC',
          fileName: '店铺基础介绍',
          fileUrl: storeDesc.trim(),
        },
      ];

      try {
        await applyMerchant({
          storeName: storeName.trim(),
          storeLogo: storeLogo,
          contactName: contactName.trim(),
          contactMobile: contactMobile.trim(),
          qualifications,
        });

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
