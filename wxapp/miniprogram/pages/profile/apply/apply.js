"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const icons_1 = require("../../../config/icons");
const app_1 = require("../../../services/app");
const merchant_1 = require("../../../services/merchant");
const request_1 = require("../../../services/request");
const page_layout_1 = require("../../../utils/page-layout");
const auth_route_1 = require("../../../utils/auth-route");
const token_1 = require("../../../services/token");
const auth_1 = require("../../../services/auth");
const merchant_2 = require("../../../config/merchant");
Component({
    data: {
        loading: false,
        loadingText: '加载中...',
        pageStyle: '',
        icons: icons_1.iconPaths,
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
        toastType: 'info',
        cropperVisible: false,
        cropperImageUrl: '',
        rejectRemark: '',
    },
    lifetimes: {
        attached() {
            this.setData({
                pageStyle: (0, page_layout_1.buildPageTopStyle)(4),
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
            const authKind = (0, token_1.getAuthTokenType)();
            if (authKind === 'access') {
                return true;
            }
            wx.navigateTo({
                url: (0, auth_route_1.buildLoginUrl)('/pages/profile/apply/apply'),
            });
            return false;
        },
        async loadApplicationStatus() {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
            this.setData({ loading: true, loadingText: '获取申请状态中' });
            try {
                const me = await (0, app_1.fetchMe)();
                // 如果后端返回的 me.profile 中包含 merchantStatus
                const merchantStatus = ((_a = me.profile) === null || _a === void 0 ? void 0 : _a.merchantStatus) || 'NOT_APPLIED';
                this.setData({
                    merchantStatus,
                });
                if (merchantStatus === 'APPROVED') {
                    try {
                        await (0, auth_1.refreshSessionToken)();
                    }
                    catch (refreshErr) {
                        console.error('Silent refresh token failed:', refreshErr);
                    }
                    wx.showModal({
                        title: '审核通过',
                        content: '恭喜！您的商户资质已通过审核，即将进入商家工作台。',
                        showCancel: false,
                        success: () => {
                            wx.reLaunch({
                                url: merchant_2.merchantHomeRoute,
                            });
                        }
                    });
                }
                else if (merchantStatus === 'REJECTED' || merchantStatus === 'PENDING_AUDIT') {
                    try {
                        const profile = await (0, merchant_1.fetchMerchantProfile)();
                        const businessLicense = ((_c = (_b = profile.qualifications) === null || _b === void 0 ? void 0 : _b.find(q => q.qualificationType === 'BUSINESS_LICENSE')) === null || _c === void 0 ? void 0 : _c.fileUrl) || '';
                        const originQualification = ((_e = (_d = profile.qualifications) === null || _d === void 0 ? void 0 : _d.find(q => q.qualificationType === 'ORIGIN_QUALIFICATION')) === null || _e === void 0 ? void 0 : _e.fileUrl) || '';
                        const storeDesc = ((_g = (_f = profile.qualifications) === null || _f === void 0 ? void 0 : _f.find(q => q.qualificationType === 'STORE_DESC')) === null || _g === void 0 ? void 0 : _g.fileUrl) || '';
                        const rejectRemark = ((_j = (_h = profile.qualifications) === null || _h === void 0 ? void 0 : _h.find(q => q.status === 3 || q.auditRemark)) === null || _j === void 0 ? void 0 : _j.auditRemark) || '';
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
                    }
                    catch (profileErr) {
                        console.error('Failed to load merchant profile:', profileErr);
                    }
                }
            }
            catch (err) {
                // 容错处理
            }
            finally {
                this.setData({ loading: false });
            }
        },
        onInput(e) {
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
        onCropSuccess(e) {
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
        async uploadLogo(filePath) {
            this.setData({
                loading: true,
                loadingText: '上传Logo中...',
            });
            try {
                const uploaded = await (0, request_1.upload)({
                    url: '/files/upload',
                    filePath: filePath,
                    name: 'file',
                    auth: false,
                });
                if (!(uploaded === null || uploaded === void 0 ? void 0 : uploaded.url)) {
                    throw new Error('上传失败');
                }
                this.setData({
                    [`form.storeLogo`]: uploaded.url,
                });
                this.showToast('店铺Logo上传成功', 'success');
            }
            catch {
                this.showToast('图片上传失败，请重试', 'danger');
            }
            finally {
                this.setData({
                    loading: false,
                });
            }
        },
        chooseQualification(e) {
            const type = e.currentTarget.dataset.type;
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
        async uploadQualification(filePath, type) {
            const typeLabel = type === 'BUSINESS_LICENSE' ? '营业执照' : '产地资质';
            this.setData({
                loading: true,
                loadingText: `上传${typeLabel}中...`,
            });
            try {
                const uploaded = await (0, request_1.upload)({
                    url: '/files/upload',
                    filePath: filePath,
                    name: 'file',
                    auth: false,
                });
                if (!(uploaded === null || uploaded === void 0 ? void 0 : uploaded.url)) {
                    throw new Error('上传失败');
                }
                const field = type === 'BUSINESS_LICENSE' ? 'businessLicense' : 'originQualification';
                this.setData({
                    [`form.${field}`]: uploaded.url,
                });
                this.showToast(`${typeLabel}上传成功`, 'success');
            }
            catch (err) {
                this.showToast(`${typeLabel}上传失败，请重试`, 'danger');
            }
            finally {
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
                await (0, merchant_1.applyMerchant)({
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
            }
            catch (err) {
                this.showToast('提交申请失败，请稍后重试', 'danger');
            }
            finally {
                this.setData({ submitting: false });
            }
        },
        showToast(message, type = 'info') {
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
            (0, auth_route_1.navigateBackOrHome)();
        },
    },
});
