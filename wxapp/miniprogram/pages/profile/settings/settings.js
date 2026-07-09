"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const icons_1 = require("../../../config/icons");
const token_1 = require("../../../services/token");
const auth_1 = require("../../../services/auth");
const page_layout_1 = require("../../../utils/page-layout");
Component({
    data: {
        icons: icons_1.iconPaths,
        pageStyle: '',
        userRole: '',
        isLoggedIn: false,
        canSwitchToMerchant: false,
    },
    lifetimes: {
        attached() {
            this.setData({
                pageStyle: (0, page_layout_1.buildPageTopStyle)(),
            });
        },
    },
    pageLifetimes: {
        show() {
            const tokenType = (0, token_1.getAuthTokenType)();
            const userRole = (0, token_1.getAuthUserRole)();
            this.setData({
                userRole: userRole || '',
                isLoggedIn: tokenType === 'access',
                canSwitchToMerchant: (0, token_1.getAvailableRoles)().includes('MERCHANT'),
            });
        },
    },
    methods: {
        goBack() {
            wx.navigateBack({
                delta: 1,
            });
        },
        goToEdit() {
            wx.navigateTo({
                url: '/pages/profile/edit/edit',
            });
        },
        goToApply() {
            wx.navigateTo({
                url: '/pages/profile/apply/apply',
            });
        },
        handleSwitchToMerchant() {
            wx.showModal({
                title: '切换角色',
                content: '确定要切换到商户端吗？',
                success: async (res) => {
                    if (res.confirm) {
                        try {
                            wx.showLoading({ title: '切换中' });
                            await (0, auth_1.switchRole)('MERCHANT');
                            wx.hideLoading();
                            wx.showToast({ title: '切换成功', icon: 'success' });
                            setTimeout(() => {
                                wx.reLaunch({ url: '/pages/merchant/dashboard/dashboard' });
                            }, 800);
                        }
                        catch (error) {
                            wx.hideLoading();
                            wx.showToast({ title: '切换失败', icon: 'none' });
                        }
                    }
                },
            });
        },
        handleLogout() {
            wx.showModal({
                title: '提示',
                content: '确定要退出登录吗？',
                success: (res) => {
                    if (res.confirm) {
                        (0, auth_1.clearUserLocalState)();
                        wx.showToast({
                            title: '已退出登录',
                            icon: 'success',
                        });
                        setTimeout(() => {
                            wx.reLaunch({
                                url: '/pages/index/index',
                            });
                        }, 800);
                    }
                },
            });
        },
    },
});
