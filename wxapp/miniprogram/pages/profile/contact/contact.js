"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const icons_1 = require("../../../config/icons");
const app_1 = require("../../../services/app");
const page_layout_1 = require("../../../utils/page-layout");
const auth_route_1 = require("../../../utils/auth-route");
function buildSupportSubtitle(target, loading) {
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
        icons: icons_1.iconPaths,
        pageStyle: '',
        loading: false,
        loadingText: '正在加载客服信息',
        supportTarget: null,
        supportSubtitle: buildSupportSubtitle(null, false),
    },
    lifetimes: {
        attached() {
            this.setData({
                pageStyle: (0, page_layout_1.buildPageTopStyle)(4),
            });
            void this.loadSupportTarget();
        },
    },
    methods: {
        async loadSupportTarget() {
            let supportTarget = null;
            this.setData({
                loading: true,
                loadingText: '正在加载客服信息',
                supportSubtitle: buildSupportSubtitle(null, true),
            });
            try {
                supportTarget = await (0, app_1.fetchChatSupportTarget)();
                this.setData({
                    supportTarget,
                    supportSubtitle: buildSupportSubtitle(supportTarget, false),
                });
            }
            catch {
                this.setData({
                    supportTarget: null,
                    supportSubtitle: buildSupportSubtitle(null, false),
                });
            }
            finally {
                this.setData({
                    loading: false,
                    supportSubtitle: buildSupportSubtitle(supportTarget, false),
                });
            }
        },
        goBack() {
            (0, auth_route_1.navigateBackOrHome)();
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
                url: `/pages/chat/chat?sceneType=OFFICIAL&sceneLabel=${encodeURIComponent(target.sceneLabel || '联系客服')}&sceneSource=${encodeURIComponent(target.sceneSource || '个人中心')}`,
            });
        },
        callHotline() {
            var _a;
            const hotline = (_a = this.data.supportTarget) === null || _a === void 0 ? void 0 : _a.hotline;
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
