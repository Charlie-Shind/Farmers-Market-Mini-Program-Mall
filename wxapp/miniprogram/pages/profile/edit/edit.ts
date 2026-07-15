import { iconPaths } from '../../../config/icons';
import { fetchMe, updateMeProfile } from '../../../services/app';
import { fetchMerchantProfile } from '../../../services/merchant';
import { loadProfileDraft, normalizeProfileDraft, saveProfileDraft, type ProfileDraft } from '../../../services/profile';
import { upload } from '../../../services/request';
import { buildPageTopStyle } from '../../../utils/page-layout';
import { buildLoginUrl, navigateBackOrHome } from '../../../utils/auth-route';
import { isRemoteUrl } from '../../../utils/util';
import { bindWechatPhone, clearUserLocalState } from '../../../services/auth';
import {
  getAuthTokenType,
  getAuthUserRole,
  isMerchantSession,
} from '../../../services/token';

const IDENTITY_OPTIONS = ['商户 / 农户', 'C端普通用户', '社区团长'];

function formatDateTime(value?: string) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

Component({
  data: {
    loading: false,
    loadingText: '正在加载资料编辑页',
    pageStyle: '',
    icons: iconPaths,
    authKind: '',
    redirecting: false,
    isMerchantProfile: false,
    avatarUrl: iconPaths.defaultAvatar as string,
    serverAvatarUrl: '',
    regionValue: [] as string[],
    identityOptions: IDENTITY_OPTIONS,
    identityIndex: 0,
    form: {
      displayName: '',
      identityType: IDENTITY_OPTIONS[0],
      contactName: '',
      contactMobile: '',
      region: '',
      bio: '',
    },
    preview: {
      title: '修改个人资料',
      lastSyncAt: '',
      metaText: '当前仅保留必要资料项，避免页面信息过载。',
    },
    saving: false,
    cropperVisible: false,
    cropperImageUrl: '',
  },
  lifetimes: {
    attached() {
      this.setData({
        pageStyle: buildPageTopStyle(0),
      });
    },
  },
  pageLifetimes: {
    show() {
      this.syncAuthState();
      if (!this.ensureAccess()) {
        return;
      }

      this.loadProfile();
    },
  },
  methods: {
    ensureAccess() {
      if (this.data.authKind === 'access') {
        if (this.data.redirecting) {
          this.setData({
            redirecting: false,
          });
        }

        return true;
      }

      if (this.data.redirecting) {
        return false;
      }

      this.setData({
        redirecting: true,
      });

      this.goLogin();
      return false;
    },
    syncAuthState() {
      const authKind = getAuthTokenType();
      this.setData({
        authKind,
        loadingText:
          authKind === 'access'
            ? '正在同步个人资料'
            : authKind === 'guest'
              ? '正在加载游客预览'
              : '正在加载资料编辑页',
      });
    },
    async loadProfile() {
      this.syncAuthState();
      this.setData({ loading: true });

      try {
        const [me, merchantProfile] = await Promise.all([
          fetchMe(),
          isMerchantSession() ? fetchMerchantProfile().catch(() => null) : Promise.resolve(null),
        ]);

        const draft = loadProfileDraft();
        const role = me.user.role || getAuthUserRole();
        const isMerchant = Boolean(merchantProfile);
        const profileName = me.profile?.nickname || me.user.nickname || '';
        const profileMobile = me.profile?.mobile || me.user.mobile || '';
        const profileAvatarUrl = me.profile?.avatarUrl || me.user.avatarUrl || '';
        const serverAvatarUrl = merchantProfile?.storeLogo || profileAvatarUrl || '';
        const normalizedDraft = normalizeProfileDraft(draft, {
          displayName: merchantProfile?.storeName || profileName || '',
          identityType: isMerchant
            ? '商户 / 农户'
            : role === 'GUEST'
              ? '游客'
              : 'C端普通用户',
          contactName: merchantProfile?.contactName || profileName || '',
          contactMobile: merchantProfile?.contactMobile || profileMobile || '',
          region: '',
          bio: '',
          avatarUrl: serverAvatarUrl || iconPaths.defaultAvatar,
        });
        const identityType = normalizedDraft.identityType;
        const identityIndex = Math.max(IDENTITY_OPTIONS.indexOf(identityType), 0);
        const displayName = normalizedDraft.displayName;
        const contactName = normalizedDraft.contactName;
        const contactMobile = normalizedDraft.contactMobile;
        const region = normalizedDraft.region;
        const bio = normalizedDraft.bio;
        const cachedAvatar = isRemoteUrl(normalizedDraft.avatarUrl) ? normalizedDraft.avatarUrl : '';
        const resolvedServerAvatar = isRemoteUrl(serverAvatarUrl) ? serverAvatarUrl : '';
        const avatarUrl = cachedAvatar || resolvedServerAvatar || iconPaths.defaultAvatar;
        const regionValue = this.resolveRegionValue(region);

        saveProfileDraft({
          ...normalizedDraft,
          avatarUrl: isRemoteUrl(normalizedDraft.avatarUrl) ? normalizedDraft.avatarUrl : '',
        });

        this.setData({
          avatarUrl,
          serverAvatarUrl,
          regionValue,
          isMerchantProfile: isMerchant,
          identityIndex,
          form: {
            displayName,
            identityType,
            contactName,
            contactMobile,
            region,
            bio,
          },
          preview: {
            title: isMerchant ? '商户资料编辑' : '个人资料编辑',
            lastSyncAt: formatDateTime(me.profile?.lastLoginAt),
            metaText: isMerchant
              ? `最近同步：${formatDateTime(me.profile?.lastLoginAt) || '暂无记录'}`
              : '当前仅保留昵称、头像、手机号、地区和简介等必要资料项。',
          },
        });
      } catch {
        wx.showToast({
          title: '登录状态异常，请重新登录',
          icon: 'none',
        });
        clearUserLocalState();
        this.goLogin();
      } finally {
        this.setData({ loading: false });
      }
    },
    goBack() {
      navigateBackOrHome();
    },
    goLogin() {
      wx.navigateTo({
        url: buildLoginUrl('/pages/profile/edit/edit'),
      });
    },
    onChooseAvatar(e: any) {
      if (!this.ensureAccess()) {
        return;
      }
      const avatarUrl = e.detail.avatarUrl;
      if (!avatarUrl) return;

      this.setData({
        cropperImageUrl: avatarUrl,
        cropperVisible: true,
      });
    },
    async onGetPhoneNumber(e: any) {
      if (!this.ensureAccess()) {
        return;
      }

      const { code, encryptedData } = e.detail;
      if (!code && !encryptedData) {
        wx.showToast({
          title: '获取手机号失败',
          icon: 'none',
        });
        return;
      }

      this.setData({
        loading: true,
        loadingText: '正在绑定手机号',
      });

      try {
        const loginRes = await new Promise<WechatMiniprogram.LoginSuccessCallbackResult>((resolve, reject) => {
          wx.login({
            success: resolve,
            fail: reject,
          });
        });

        await bindWechatPhone({
          loginCode: loginRes.code,
          phoneCode: code || encryptedData || '',
        });

        const me = await fetchMe();
        const mobile = me.user?.mobile || me.profile?.mobile || '';

        if (mobile) {
          this.setData({
            [`form.contactMobile`]: mobile,
          });

          const draft = loadProfileDraft();
          saveProfileDraft(
            normalizeProfileDraft(
              { ...draft, contactMobile: mobile },
              {
                displayName: this.data.form.displayName,
                identityType: this.data.form.identityType,
                contactName: this.data.form.contactName,
                contactMobile: mobile,
                region: this.data.form.region,
                bio: this.data.form.bio,
                avatarUrl: this.data.avatarUrl,
              }
            )
          );

          wx.showToast({
            title: '手机号绑定成功',
            icon: 'success',
          });
        } else {
          throw new Error('未获取到手机号');
        }
      } catch (err: any) {
        wx.showToast({
          title: err.message || '绑定手机号失败，请重试',
          icon: 'none',
        });
      } finally {
        this.setData({
          loading: false,
        });
      }
    },
    resolveRegionValue(regionText: string) {
      if (!regionText) {
        return [];
      }

      const parts = regionText
        .split(/[·•、/|-]/)
        .map((item) => item.trim())
        .filter(Boolean);
      
      if (parts.length >= 2) {
        return parts.slice(0, 3);
      }

      return [regionText];
    },
    onCropSuccess(e: any) {
      const tempFilePath = e.detail.tempFilePath;
      this.setData({
        cropperVisible: false,
      });

      this.uploadAvatar(tempFilePath);
    },
    onCropCancel() {
      this.setData({
        cropperVisible: false,
      });
    },
    async uploadAvatar(filePath: string) {
      this.setData({
        loading: true,
        loadingText: '正在上传头像',
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
          avatarUrl: uploaded.url,
          serverAvatarUrl: uploaded.url,
        });

        saveProfileDraft(
          normalizeProfileDraft(
            { avatarUrl: uploaded.url },
            {
              displayName: this.data.form.displayName,
              identityType: this.data.form.identityType,
              contactName: this.data.form.contactName,
              contactMobile: this.data.form.contactMobile,
              region: this.data.form.region,
              bio: this.data.form.bio,
              avatarUrl: uploaded.url,
            },
          ),
        );

        wx.showToast({
          title: '头像已上传',
          icon: 'success',
        });
      } catch {
        wx.showToast({
          title: '头像上传失败',
          icon: 'none',
        });
      } finally {
        this.setData({
          loading: false,
        });
      }
    },
    onInput(e: WechatMiniprogram.Input) {
      const field = (e.currentTarget.dataset as { field?: keyof ProfileDraft })?.field;
      if (!field) {
        return;
      }

      this.setData({
        [`form.${field}`]: e.detail.value,
      });
    },
    onIdentityChange(e: WechatMiniprogram.PickerChange) {
      const index = Number(e.detail.value);
      const identityType = IDENTITY_OPTIONS[index] || IDENTITY_OPTIONS[0];
      this.setData({
        identityIndex: index,
        [`form.identityType`]: identityType,
      });
    },
    onRegionPickerChange(e: WechatMiniprogram.PickerChange) {
      const value = (e.detail.value as string[]) || [];
      const regionText = value.filter(Boolean).join(' · ');
      this.setData({
        regionValue: value,
        [`form.region`]: regionText,
      });
    },
    async saveProfile() {
      if (this.data.authKind !== 'access') {
        this.goLogin();
        return;
      }

      if (!this.ensureAccess()) {
        return;
      }

      if (this.data.saving) {
        return;
      }

      const draft: ProfileDraft = normalizeProfileDraft({
        displayName: this.data.form.displayName.trim(),
        identityType: this.data.form.identityType,
        contactName: this.data.form.contactName.trim(),
        contactMobile: this.data.form.contactMobile.trim(),
        region: this.data.form.region.trim(),
        bio: this.data.form.bio.trim(),
        avatarUrl: this.data.avatarUrl,
      }, {
        displayName: this.data.form.displayName.trim(),
        identityType: this.data.form.identityType,
        contactName: this.data.form.contactName.trim(),
        contactMobile: this.data.form.contactMobile.trim(),
        region: this.data.form.region.trim(),
        bio: this.data.form.bio.trim(),
        avatarUrl: this.data.serverAvatarUrl,
      });

      this.setData({ saving: true });

      try {
        const payload: Record<string, unknown> = {
          displayName: draft.displayName,
          contactName: draft.contactName || draft.displayName,
          contactMobile: draft.contactMobile,
          identityType: draft.identityType,
          region: draft.region,
          bio: draft.bio,
        };

        const avatarUrl = isRemoteUrl(this.data.avatarUrl)
          ? this.data.avatarUrl
          : isRemoteUrl(this.data.serverAvatarUrl)
            ? this.data.serverAvatarUrl
            : '';
        if (avatarUrl) {
          payload.avatarUrl = avatarUrl;
        }

        await updateMeProfile(payload);
        saveProfileDraft({
          ...draft,
          avatarUrl: isRemoteUrl(this.data.avatarUrl) ? this.data.avatarUrl : this.data.serverAvatarUrl || '',
        });
        wx.showToast({
          title: '资料已保存',
          icon: 'success',
        });
        setTimeout(() => {
          navigateBackOrHome();
        }, 300);
      } catch (error: any) {
        const message = String(error?.message ?? '');
        if (message.includes('登录已失效') || message.includes('Guest session cannot update profile')) {
          this.goLogin();
          return;
        }
        if (message.includes('手机号已被其他账号使用')) {
          wx.showToast({
            title: '手机号已被其他账号使用',
            icon: 'none',
          });
          return;
        }
        wx.showToast({
          title: message || '保存失败，请重试',
          icon: 'none',
        });
      } finally {
        this.setData({ saving: false });
      }
    },
  },
});
