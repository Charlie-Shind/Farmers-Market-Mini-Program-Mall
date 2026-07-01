<template>
  <el-container class="admin-root">
    <input id="drawerToggle" class="drawer-check" type="checkbox" />

    <el-aside :class="['sidebar', { 'sidebar--collapsed': isCollapse }]">
      <div class="brand">
        <BrandAvatar size="sm" />
        <div v-show="!isCollapse" class="brand-text">
          <strong>湾源农仓</strong>
          <span>运营管理后台</span>
        </div>
        <button
          type="button"
          class="collapse-btn"
          @click="isCollapse = !isCollapse"
          :title="isCollapse ? '展开侧边栏' : '收起侧边栏'"
        >
          <AppIcon :name="isCollapse ? 'chevronRight' : 'chevronLeft'" :size="16" />
        </button>
      </div>

      <el-scrollbar class="menu-scrollbar">
        <el-menu
          :default-active="route.path"
          router
          :collapse="isCollapse"
          :collapse-transition="false"
          class="nav-menu"
        >
          <el-sub-menu v-for="group in visibleNavGroups" :key="group.key" :index="group.key">
            <template #title>
              <el-icon><AppIcon :name="group.icon" :size="18" /></el-icon>
              <span>{{ group.label }}</span>
            </template>
            <el-menu-item
              v-for="item in group.items"
              :key="item.key"
              :index="item.to"
              @click="closeDrawer"
            >
              <el-icon><AppIcon :name="item.icon" :size="18" /></el-icon>
              <template #title>
                <span class="nav-item-label">{{ item.label }}</span>
                <span
                  v-if="item.badgeKey && badgeCounts[item.badgeKey] > 0"
                  class="nav-badge"
                >
                  {{ badgeCounts[item.badgeKey] > 99 ? '99+' : badgeCounts[item.badgeKey] }}
                </span>
              </template>
            </el-menu-item>
          </el-sub-menu>
        </el-menu>
      </el-scrollbar>

      <div class="sidebar-user">
        <div v-if="!isCollapse" class="sidebar-user__card">
          <div class="avatar">{{ userTag }}</div>
          <div class="sidebar-user__meta">
            <strong>{{ userName }}</strong>
            <span>{{ userAccount }}</span>
            <span v-if="userRole" class="role-tag" :class="`role-tag--${roleTier}`">{{ userRole }}</span>
          </div>
        </div>
        <div v-else class="sidebar-user__avatar-only">
          <div class="avatar">{{ userTag }}</div>
        </div>
        <button type="button" class="logout-btn" @click="askLogout">
          <AppIcon name="logout" :size="16" />
          <span v-show="!isCollapse">退出登录</span>
        </button>
      </div>
    </el-aside>

    <label class="drawer-mask" for="drawerToggle" aria-label="关闭菜单"></label>

    <el-container class="main-container">
      <el-header class="topbar">
        <div class="top-left">
          <label class="menu-toggle" for="drawerToggle" aria-label="打开菜单">☰</label>
          <div>
            <div class="breadcrumb">{{ breadcrumb }}</div>
            <h1>{{ title }}</h1>
          </div>
        </div>

        <div class="top-actions">
          <el-button type="primary" :loading="refreshing" @click="refreshPage">
            <span>刷新</span>
          </el-button>
        </div>
      </el-header>

      <el-main class="app-main">
        <RouterView :key="`${route.path}:${route.query.q ?? ''}`" />
      </el-main>
    </el-container>

    <el-dialog v-model="logoutConfirm" title="退出登录确认" width="400px" align-center>
      <span>确认退出登录？退出后需要重新输入账号密码才能进入后台。</span>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="cancelLogout">取消</el-button>
          <el-button type="primary" @click="confirmLogout">确认退出</el-button>
        </div>
      </template>
    </el-dialog>
  </el-container>
</template>

<script setup lang="ts">
import { computed, provide, reactive, ref, watch } from 'vue';
import { RouterView, useRoute, useRouter } from 'vue-router';

import { getProducts, getRefunds, logout } from '@/api/admin';
import { filterNavGroupsByPermissions, readStoredPermissionKeys } from '@/utils/admin-permissions';
import AppIcon from '@/components/AppIcon.vue';
import BrandAvatar from '@/components/BrandAvatar.vue';

const route = useRoute();
const router = useRouter();
const permissionKeys = ref<string[] | null>(readStoredPermissionKeys());
const visibleNavGroups = computed(() => filterNavGroupsByPermissions(permissionKeys.value));

const isCollapse = ref(localStorage.getItem('farm-admin-sidebar-collapsed') === 'true');
watch(isCollapse, (val) => {
  localStorage.setItem('farm-admin-sidebar-collapsed', String(val));
});

const title = computed(() => String(route.meta.title ?? '控制台首页'));
const breadcrumb = computed(() => String(route.meta.breadcrumb ?? '后台管理'));

const userName = computed(() => localStorage.getItem('farm-admin-name') ?? '平台管理员');
const userAccount = computed(() => localStorage.getItem('farm-admin-account') ?? '未登录');
const userRole = computed(() => localStorage.getItem('farm-admin-role') ?? '');
const userTag = computed(() => userName.value.slice(0, 1) || '管');
const roleTier = computed(() => {
  const rawCodes = localStorage.getItem('farm-admin-role-codes') || '[]';
  const roleCodes = (() => {
    try {
      return JSON.parse(rawCodes) as string[];
    } catch {
      return [] as string[];
    }
  })();
  const role = [userRole.value, ...roleCodes].join(' ').toLowerCase();
  if (role.includes('super') || role.includes('admin')) return 'tier-1';
  if (role.includes('finance') || role.includes('audit')) return 'tier-2';
  return 'tier-3';
});
const logoutConfirm = ref(false);

const badgeCounts = reactive<Record<string, number>>({
  pendingRefund: 0,
  pendingProductAudit: 0,
});

async function refreshBadges() {
  try {
    const [refunds, products] = await Promise.all([
      getRefunds({ page: 1, pageSize: 100, status: 'PENDING_ARBITRATION' }),
      getProducts({ page: 1, pageSize: 100, auditStatus: 'PENDING_AUDIT' }),
    ]);
    badgeCounts.pendingRefund = refunds.total ?? refunds.items?.length ?? 0;
    badgeCounts.pendingProductAudit = products.total ?? products.items?.length ?? 0;
  } catch {
    // 静默
  }
}

void refreshBadges();

watch(
  () => route.path,
  () => {
    void refreshBadges();
  },
);

function closeDrawer() {
  const toggle = document.getElementById('drawerToggle') as HTMLInputElement | null;
  if (toggle) {
    toggle.checked = false;
  }
}

function handleLogout() {
  logout();
  router.push('/login');
}

function askLogout() {
  logoutConfirm.value = true;
}

function cancelLogout() {
  logoutConfirm.value = false;
}

function confirmLogout() {
  logoutConfirm.value = false;
  handleLogout();
}

const refreshTick = ref(0);
const refreshing = ref(false);
const refreshHandlers = new Set<() => void | Promise<void>>();

provide('admin-refresh', {
  register(handler: () => void | Promise<void>) {
    refreshHandlers.add(handler);
    return () => refreshHandlers.delete(handler);
  },
  tick: refreshTick,
});

async function refreshPage() {
  if (refreshing.value) {
    return;
  }
  refreshing.value = true;
  refreshTick.value += 1;
  try {
    const promises = Array.from(refreshHandlers).map((h) => Promise.resolve(h()));
    await Promise.all(promises);
    await refreshBadges();
  } finally {
    refreshing.value = false;
  }
}
</script>
