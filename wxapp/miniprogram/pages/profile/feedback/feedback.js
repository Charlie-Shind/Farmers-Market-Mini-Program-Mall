"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const icons_1 = require("../../../config/icons");
const app_1 = require("../../../services/app");
const page_layout_1 = require("../../../utils/page-layout");
const auth_route_1 = require("../../../utils/auth-route");
const FEEDBACK_TYPES = ['功能建议', '页面问题', '内容问题', '售后反馈', '其他'];
Component({
    data: {
        icons: icons_1.iconPaths,
        pageStyle: '',
        loading: false,
        loadingText: '正在加载反馈页',
        submitting: false,
        supportTarget: null,
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
                pageStyle: (0, page_layout_1.buildPageTopStyle)(4),
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
                const supportTarget = await (0, app_1.fetchChatSupportTarget)();
                this.setData({
                    supportTarget,
                });
            }
            catch {
                this.setData({
                    supportTarget: null,
                });
            }
            finally {
                this.setData({
                    loading: false,
                });
            }
        },
        goBack() {
            (0, auth_route_1.navigateBackOrHome)();
        },
        onTypeChange(e) {
            var _a;
            const index = Number((_a = e.detail.value) !== null && _a !== void 0 ? _a : 0);
            this.setData({
                typeIndex: Number.isNaN(index) ? 0 : index,
            });
        },
        onContactInput(e) {
            this.setData({
                'form.contact': e.detail.value,
            });
        },
        onContentInput(e) {
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
                const target = this.data.supportTarget || (await (0, app_1.fetchChatSupportTarget)().catch(() => null));
                if (!target) {
                    wx.showToast({
                        title: '客服暂未配置',
                        icon: 'none',
                    });
                    return;
                }
                const category = this.data.feedbackTypes[this.data.typeIndex] || '其他';
                const opened = await (0, app_1.openChatConversation)({
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
                await (0, app_1.sendChatMessage)(opened.conversationId, {
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
            }
            catch {
                wx.showToast({
                    title: '提交失败，请稍后重试',
                    icon: 'none',
                });
            }
            finally {
                this.setData({
                    submitting: false,
                });
            }
        },
    },
});
