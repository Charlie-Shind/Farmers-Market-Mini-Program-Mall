import { createRouter, createWebHistory } from 'vue-router';

import AdminShell from '@/components/AdminShell.vue';
import DashboardView from '@/views/DashboardView.vue';
import LoginView from '@/views/LoginView.vue';
import AnalyticsView from '@/views/AnalyticsView.vue';
import AdminManagementView from '@/views/AdminManagementView.vue';
import SettingsView from '@/views/SettingsView.vue';
import OrderDetailView from '@/views/OrderDetailView.vue';
import ResourceListView from '@/views/ResourceListView.vue';
import AnnouncementsView from '@/views/AnnouncementsView.vue';
import BannersView from '@/views/BannersView.vue';
import CategoriesView from '@/views/CategoriesView.vue';
import ChatView from '@/views/ChatView.vue';
import ExchangeCenterView from '@/views/ExchangeCenterView.vue';
import LeaderView from '@/views/LeaderView.vue';
import GroupBuyView from '@/views/GroupBuyView.vue';
import PickupPointView from '@/views/PickupPointView.vue';
import CommissionView from '@/views/CommissionView.vue';
import { canAccessPermission, findFirstAccessiblePath, readStoredPermissionKeys } from '@/utils/admin-permissions';

const router = createRouter({
  history: createWebHistory((import.meta.env.VITE_ADMIN_BASE as string | undefined) || '/admin/'),
  routes: [
    {
      path: '/',
      redirect: '/dashboard',
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: {
        title: '管理员登录',
      },
    },
    {
      path: '/',
      component: AdminShell,
      meta: {
        requiresAuth: true,
      },
      children: [
        {
          path: 'dashboard',
          name: 'dashboard',
          component: DashboardView,
          meta: {
            title: '控制台首页',
            breadcrumb: '后台管理 / 控制台首页',
            permissionKey: 'dashboard',
          },
        },
        {
          path: 'users',
          name: 'users',
          component: ResourceListView,
          props: { resourceKey: 'users' },
          meta: {
            title: '用户管理',
            breadcrumb: '后台管理 / 用户管理',
            searchPlaceholder: '搜索昵称 / 手机号',
            permissionKey: 'users',
          },
        },
        {
          path: 'merchants',
          name: 'merchants',
          component: ResourceListView,
          props: { resourceKey: 'merchants' },
          meta: {
            title: '商户管理',
            breadcrumb: '后台管理 / 商户管理',
            searchPlaceholder: '搜索店铺 / 联系人 / 手机号',
            permissionKey: 'merchants',
          },
        },
        {
          path: 'products',
          name: 'products',
          component: ResourceListView,
          props: { resourceKey: 'products' },
          meta: {
            title: '商品管理',
            breadcrumb: '后台管理 / 商品管理',
            searchPlaceholder: '搜索商品 / 商户 / 类目',
            permissionKey: 'products',
          },
        },
        {
          path: 'categories',
          name: 'categories',
          component: CategoriesView,
          meta: {
            title: '分类管理',
            breadcrumb: '后台管理 / 分类管理',
            permissionKey: 'categories',
          },
        },
        {
          path: 'coupons',
          name: 'coupons',
          component: ResourceListView,
          props: { resourceKey: 'coupons' },
          meta: {
            title: '优惠券管理',
            breadcrumb: '后台管理 / 优惠券管理',
            searchPlaceholder: '搜索券名称 / 类型',
            permissionKey: 'coupons',
          },
        },
        {
          path: 'exchange',
          redirect: '/exchange/coupons',
        },
        {
          path: 'exchange/coupons',
          name: 'exchange',
          component: ExchangeCenterView,
          props: { defaultMode: 'COUPON' },
          meta: {
            title: '兑换券管理',
            breadcrumb: '后台管理 / 兑换券管理',
            searchPlaceholder: '搜索兑换券 / 适用类目 / 店铺',
            permissionKey: 'exchange',
          },
        },
        {
          path: 'exchange/products',
          name: 'exchange-products',
          component: ExchangeCenterView,
          props: { defaultMode: 'PRODUCT' },
          meta: {
            title: '兑换商品管理',
            breadcrumb: '后台管理 / 兑换商品管理',
            searchPlaceholder: '搜索兑换商品 / 适用类目 / 店铺',
            permissionKey: 'exchange',
          },
        },
        {
          path: 'activities',
          name: 'activities',
          component: ResourceListView,
          props: { resourceKey: 'activities' },
          meta: {
            title: '活动管理',
            breadcrumb: '后台管理 / 活动管理',
            searchPlaceholder: '搜索活动 / 类型 / 状态',
            permissionKey: 'activities',
          },
        },
        {
          path: 'group-buys',
          name: 'group-buys',
          component: GroupBuyView,
          meta: {
            title: '拼团管理',
            breadcrumb: '后台管理 / 拼团管理',
            permissionKey: 'groupBuys',
          },
        },
        {
          path: 'banners',
          name: 'banners',
          component: BannersView,
          meta: {
            title: 'Banner管理',
            breadcrumb: '后台管理 / Banner管理',
            permissionKey: 'banners',
          },
        },
        {
          path: 'orders',
          name: 'orders',
          component: ResourceListView,
          props: { resourceKey: 'orders' },
          meta: {
            title: '订单列表',
            breadcrumb: '后台管理 / 订单列表',
            searchPlaceholder: '搜索订单号 / 用户 / 商户',
            permissionKey: 'orders',
          },
        },
        {
          path: 'orders/:orderNo',
          name: 'order-detail',
          component: OrderDetailView,
          meta: {
            title: '订单详情',
            breadcrumb: '后台管理 / 订单详情',
            permissionKey: 'orders',
          },
        },
        {
          path: 'refunds',
          name: 'refunds',
          component: ResourceListView,
          props: { resourceKey: 'refunds' },
          meta: {
            title: '售后仲裁',
            breadcrumb: '后台管理 / 售后仲裁',
            searchPlaceholder: '搜索售后单 / 订单号 / 用户',
            permissionKey: 'refunds',
          },
        },
        {
          path: 'withdraws',
          name: 'withdraws',
          component: ResourceListView,
          props: { resourceKey: 'withdraws' },
          meta: {
            title: '提现审核',
            breadcrumb: '后台管理 / 提现审核',
            searchPlaceholder: '搜索提现单号 / 商户',
            permissionKey: 'withdraws',
          },
        },
        {
          path: 'analytics',
          name: 'analytics',
          component: AnalyticsView,
          meta: {
            title: '数据看板',
            breadcrumb: '后台管理 / 数据看板',
            permissionKey: 'analytics',
          },
        },
        {
          path: 'logistics',
          name: 'logistics',
          component: ResourceListView,
          props: { resourceKey: 'logistics' },
          meta: {
            title: '物流配置',
            breadcrumb: '后台管理 / 物流配置',
            searchPlaceholder: '搜索规则 / 地区 / 模板',
            permissionKey: 'logistics',
          },
        },
        {
          path: 'messages',
          name: 'messages',
          component: AnnouncementsView,
          meta: {
            title: '公告管理',
            breadcrumb: '后台管理 / 公告管理',
            searchPlaceholder: '搜索公告标题 / 摘要',
            permissionKey: 'messages',
          },
        },
        {
          path: 'chat',
          name: 'chat',
          component: ChatView,
          meta: {
            title: '客服会话',
            breadcrumb: '后台管理 / 客服会话',
            searchPlaceholder: '搜索买家 / 商户 / 场景',
            permissionKey: 'chat',
          },
        },
        {
          path: 'settings',
          name: 'settings',
          component: SettingsView,
          meta: {
            title: '系统配置',
            breadcrumb: '后台管理 / 系统配置',
            permissionKey: 'settings',
          },
        },
        {
          path: 'admins',
          name: 'admins',
          component: AdminManagementView,
          meta: {
            title: '管理员管理',
            breadcrumb: '后台管理 / 管理员管理',
            permissionKey: 'admins',
          },
        },
        {
          path: 'leaders',
          name: 'leaders',
          component: LeaderView,
          meta: {
            title: '团长管理',
            breadcrumb: '后台管理 / 团长管理',
            permissionKey: 'leaders',
          },
        },
        {
          path: 'pickup-points',
          name: 'pickup-points',
          component: PickupPointView,
          meta: {
            title: '自提点管理',
            breadcrumb: '后台管理 / 自提点管理',
            permissionKey: 'pickup-points',
          },
        },
        {
          path: 'commissions',
          name: 'commissions',
          component: CommissionView,
          meta: {
            title: '佣金管理',
            breadcrumb: '后台管理 / 佣金管理',
            permissionKey: 'commissions',
          },
        },
      ],
    },
  ],
});

router.beforeEach((to) => {
  const token = localStorage.getItem('farm-admin-token');

  if (to.meta.requiresAuth && !token) {
    return { path: '/login', query: { redirect: to.fullPath } };
  }

  const permissionKeys = readStoredPermissionKeys();
  const permissionKey = typeof to.meta.permissionKey === 'string' ? to.meta.permissionKey : '';
  if (token && permissionKeys != null && permissionKeys.length > 0 && !canAccessPermission(permissionKey, permissionKeys)) {
    return { path: findFirstAccessiblePath(permissionKeys) };
  }

  return true;
});

export default router;
