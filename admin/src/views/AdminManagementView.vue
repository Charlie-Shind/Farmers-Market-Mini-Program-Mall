<template>
  <div class="page-stack">
    <StatGrid :cards="metricCards" />

    <section class="panel">
      <div class="panel-head compact">
        <div>
          <h2>管理员管理</h2>
          <p>这里专门处理后台账号、角色分配、启停用和密码重置。</p>
        </div>
        <div class="top-actions">
          <button class="ghost-btn" type="button" @click="router.push('/settings')">前往系统配置</button>
          <RefreshDataButton :loading="loading" @refresh="handleRefreshData" />
        </div>
      </div>
    </section>

    <section class="permission-layout">
      <!-- 管理员账号列表 -->
      <div class="panel">
        <div class="panel-head compact">
          <div>
            <h2>管理员账号管理</h2>
            <p>分配角色、启用/禁用账号和重置管理员密码。</p>
          </div>
          <div class="top-actions">
            <button
              class="ghost-btn"
              type="button"
              style="color: var(--danger);"
              :disabled="!selectedAccountIds.length || accountSaving"
              @click="batchDeleteAccounts"
            >
              批量删除
            </button>
            <button class="ghost-btn" type="button" :disabled="accountSaving" @click="handleSyncMerchants">
              同步商户账号
            </button>
            <button class="primary-btn" type="button" @click="createAccountDialog.visible = true">
              新增管理员
            </button>
          </div>
        </div>

        <div class="table-x">
          <table class="data-table">
            <thead>
              <tr>
                <th class="check-cell">
                  <input type="checkbox" :checked="isAllAccountsSelected" @change="toggleSelectAllAccounts" />
                </th>
                <th>账号</th>
                <th>昵称</th>
                <th>手机号</th>
                <th>登录密码</th>
                <th>角色</th>
                <th>状态</th>
                <th>最近登录</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="account in adminAccounts" :key="account.id">
                <td class="check-cell">
                  <input
                    type="checkbox"
                    :checked="selectedAccountIds.includes(account.id)"
                    :disabled="account.accountNo === currentAccountNo"
                    @change="toggleSelectAccount(account)"
                  />
                </td>
                <td data-label="账号">
                  <strong>{{ account.username }}</strong>
                  <span>{{ account.accountNo || '-' }}</span>
                </td>
                <td data-label="昵称">{{ account.nickname }}</td>
                <td data-label="手机号">{{ account.mobile || '-' }}</td>
                <td data-label="登录密码">
                  <div class="row-actions">
                    <code v-if="account.loginPassword">{{ account.loginPassword }}</code>
                    <span v-else>—</span>
                    <button
                      v-if="account.loginPassword"
                      class="ghost-btn"
                      type="button"
                      @click="copyText(account.loginPassword, '密码已复制')"
                    >
                      复制
                    </button>
                  </div>
                </td>
                <td data-label="角色">
                  <span class="tag">{{ formatRoleNames(account) }}</span>
                </td>
                <td data-label="状态">
                  <span :class="['status', account.status === 'NORMAL' ? 'ok' : 'danger']">
                    {{ account.status === 'NORMAL' ? '启用' : '禁用' }}
                  </span>
                </td>
                <td data-label="最近登录">{{ formatLogTime(account.lastLoginAt) }}</td>
                <td data-label="操作">
                  <div class="row-actions">
                    <button class="ghost-btn" type="button" @click="handleToggleAccountStatus(account)">
                      {{ account.status === 'NORMAL' ? '禁用' : '启用' }}
                    </button>
                    <button class="ghost-btn" type="button" @click="handleUpdateAccountRoles(account)">
                      改角色
                    </button>
                    <button class="ghost-btn" type="button" @click="handleResetPassword(account)">
                      重置密码
                    </button>
                    <button
                      class="ghost-btn"
                      style="color: var(--danger);"
                      type="button"
                      :disabled="account.accountNo === currentAccountNo"
                      @click="handleDeleteAccount(account)"
                    >
                      删除
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="adminAccounts.length === 0">
                <td colspan="9" class="empty-hint">暂无管理员账号</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 管理员角色列表 -->
      <div class="panel">
        <div class="panel-head compact">
          <div>
            <h2>管理员角色管理</h2>
            <p>配置后台常用角色，后续管理员账号绑定对应角色即可。</p>
          </div>
          <button class="primary-btn" type="button" @click="createRoleDialog.visible = true">
            新增角色
          </button>
        </div>

        <div class="table-x">
          <table class="data-table">
            <thead>
              <tr>
                <th>角色编码</th>
                <th>角色名称</th>
                <th>菜单权限</th>
                <th>状态</th>
                <th>成员数</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="role in adminRoles" :key="role.id">
                <td data-label="角色编码">{{ role.code }}</td>
                <td data-label="角色名称">{{ role.name }}</td>
                <td data-label="菜单权限">
                  <span class="tag">
                    {{ role.permissionCount >= ADMIN_PERMISSION_KEYS.length ? '全部菜单' : `${role.permissionCount} 项` }}
                  </span>
                </td>
                <td data-label="状态">
                  <span :class="['status', role.status === 'NORMAL' ? 'ok' : 'danger']">
                    {{ role.status === 'NORMAL' ? '启用' : '禁用' }}
                  </span>
                </td>
                <td data-label="成员数">{{ role.userCount }}</td>
                <td data-label="操作">
                  <div class="row-actions">
                    <button class="ghost-btn" type="button" @click="handleToggleRoleStatus(role)">
                      {{ role.status === 'NORMAL' ? '禁用' : '启用' }}
                    </button>
                    <button class="ghost-btn" type="button" @click="handleRenameRole(role)">
                      重命名
                    </button>
                    <button class="ghost-btn" type="button" @click="handleEditRolePermissions(role)">
                      权限配置
                    </button>
                    <button
                      class="ghost-btn"
                      style="color: var(--danger);"
                      type="button"
                      :disabled="role.userCount > 0"
                      @click="handleDeleteRole(role)"
                    >
                      删除
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="adminRoles.length === 0">
                <td colspan="6" class="empty-hint">暂无角色</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- 修改角色分配弹窗 -->
    <el-dialog
      v-model="editRoleDialog.visible"
      title="修改管理员角色"
      width="460px"
      append-to-body
      destroy-on-close
    >
      <div style="margin-bottom: 16px; font-size: 14px; color: var(--text-muted);">
        正在为管理员账号 <strong style="color: var(--text); font-weight: 600;">{{ editRoleDialog.username }}</strong> 分配角色，请勾选：
      </div>
      <el-checkbox-group v-model="editRoleDialog.roleCodes">
        <div style="display: flex; flex-direction: column; gap: 10px; padding: 4px 0;">
          <el-checkbox
            v-for="role in adminRoles"
            :key="role.code"
            :label="role.code"
            :value="role.code"
            :disabled="role.status !== 'NORMAL'"
            style="margin-right: 0;"
          >
            <span style="font-weight: 500;">{{ role.name }}</span>
            <span style="color: var(--text-muted); font-size: 12px; margin-left: 6px;">({{ role.code }})</span>
          </el-checkbox>
        </div>
      </el-checkbox-group>
      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px;">
          <el-button @click="editRoleDialog.visible = false">取消</el-button>
          <el-button type="primary" :loading="roleSaving" @click="handleSaveAccountRoles">保存更改</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 角色菜单权限配置 -->
    <el-dialog
      v-model="rolePermissionDialog.visible"
      title="配置角色菜单权限"
      width="760px"
      append-to-body
      destroy-on-close
    >
      <div style="margin-bottom: 16px; font-size: 14px; color: var(--text-muted);">
        角色 <strong style="color: var(--text); font-weight: 600;">{{ rolePermissionDialog.roleName }}</strong>
        <span style="color: var(--text-muted); margin-left: 6px;">({{ rolePermissionDialog.roleCode }})</span>
        可见哪些控制面板菜单，请直接勾选，不需要手动填 ID。
      </div>
      <div style="display: grid; gap: 16px;">
        <div
          v-for="group in navGroups"
          :key="group.key"
          style="border: 1px solid var(--border, #e5e7eb); border-radius: 16px; padding: 16px; background: var(--surface, #fff);"
        >
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 12px;">
            <strong>{{ group.label }}</strong>
            <button class="ghost-btn" type="button" @click="toggleGroupPermissions(group.key)">
              {{ isGroupFullySelected(group.items.map((item) => item.key)) ? '取消本组' : '全选本组' }}
            </button>
          </div>
          <el-checkbox-group v-model="rolePermissionDialog.permissionKeys">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px 14px;">
              <el-checkbox
                v-for="item in group.items"
                :key="item.key"
                :label="item.key"
                :value="item.key"
                style="margin-right: 0;"
              >
                <span style="font-weight: 500;">{{ item.label }}</span>
              </el-checkbox>
            </div>
          </el-checkbox-group>
        </div>
      </div>
      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px;">
          <el-button @click="rolePermissionDialog.visible = false">取消</el-button>
          <el-button type="primary" :loading="roleSaving" @click="handleSaveRolePermissions">保存权限</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 新增管理员账号弹窗 -->
    <el-dialog
      v-model="createAccountDialog.visible"
      title="新增管理员账号"
      width="500px"
      append-to-body
      destroy-on-close
      @close="reloadAdminForm"
    >
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <label class="form-field">
          <span>登录账号</span>
          <input v-model.trim="accountForm.username" type="text" placeholder="请输入登录账号，如 ops_lisa" />
        </label>
        <label class="form-field">
          <span>昵称</span>
          <input v-model.trim="accountForm.nickname" type="text" placeholder="请输入昵称，如 运营小林" />
        </label>
        <label class="form-field">
          <span>手机号</span>
          <input v-model.trim="accountForm.mobile" type="text" placeholder="请输入11位手机号" />
        </label>
        <label class="form-field">
          <span>初始密码</span>
          <input v-model.trim="accountForm.password" type="password" placeholder="选填；不填则随机生成 6 位" />
        </label>

        <div class="form-field">
          <span style="margin-bottom: 6px;">分配初始角色 (可选)</span>
          <el-checkbox-group v-model="accountForm.roleCodes">
            <div style="display: flex; flex-wrap: wrap; gap: 10px 16px; padding: 4px 0;">
              <el-checkbox
                v-for="role in adminRoles"
                :key="role.code"
                :label="role.code"
                :value="role.code"
                :disabled="role.status !== 'NORMAL'"
                style="margin-right: 0;"
              >
                {{ role.name }}
              </el-checkbox>
            </div>
          </el-checkbox-group>
        </div>
      </div>
      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px;">
          <el-button @click="createAccountDialog.visible = false">取消</el-button>
          <el-button type="primary" :loading="accountSaving" @click="handleCreateAdminAccount">创建账号</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 新增管理员角色弹窗 -->
    <el-dialog
      v-model="createRoleDialog.visible"
      title="新增管理员角色"
      width="760px"
      append-to-body
      destroy-on-close
      @close="reloadRoleForm"
    >
      <div style="display: grid; gap: 16px;">
        <div style="display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));">
          <label class="form-field">
            <span>角色编码</span>
            <input v-model.trim="roleForm.code" type="text" placeholder="大写英文字母与下划线，如 OPERATOR" />
          </label>
          <label class="form-field">
            <span>角色名称</span>
            <input v-model.trim="roleForm.name" type="text" placeholder="如 运营专员" />
          </label>
          <label class="form-field">
            <span>状态</span>
            <select v-model="roleForm.status">
              <option value="NORMAL">启用</option>
              <option value="DISABLED">禁用</option>
            </select>
          </label>
        </div>

        <div
          style="border: 1px solid var(--border, #e5e7eb); border-radius: 16px; padding: 16px; background: var(--surface, #fff);"
        >
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 12px;">
            <strong>菜单权限</strong>
            <div style="display: flex; gap: 8px;">
              <button class="ghost-btn" type="button" @click="selectAllRolePermissions">全选</button>
              <button class="ghost-btn" type="button" @click="clearRolePermissions">清空</button>
            </div>
          </div>
          <div style="display: grid; gap: 16px;">
            <div v-for="group in navGroups" :key="group.key">
              <strong style="display: block; margin-bottom: 10px;">{{ group.label }}</strong>
              <el-checkbox-group v-model="roleForm.permissionKeys">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px 14px;">
                  <el-checkbox
                    v-for="item in group.items"
                    :key="item.key"
                    :label="item.key"
                    :value="item.key"
                    style="margin-right: 0;"
                  >
                    <span style="font-weight: 500;">{{ item.label }}</span>
                  </el-checkbox>
                </div>
              </el-checkbox-group>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px;">
          <el-button @click="createRoleDialog.visible = false">取消</el-button>
          <el-button type="primary" :loading="roleSaving" @click="handleCreateRole">创建角色</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';

import {
  createAdminAccount,
  createAdminRole,
  getAdminAccounts,
  getAdminRoles,
  getLogs,
  getSettings,
  resetAdminPassword,
  syncMerchantsAdminAccounts,
  updateAdminAccount,
  updateAdminRole,
  deleteAdminAccount,
  deleteAdminRole,
} from '@/api/admin';
import { navGroups } from '@/data/admin';
import StatGrid from '@/components/StatGrid.vue';
import RefreshDataButton from '@/components/RefreshDataButton.vue';
import { refreshWithFeedback } from '@/utils/refresh-feedback';
import { ADMIN_PERMISSION_KEYS, normalizeAdminPermissionKeys } from '@/utils/admin-permissions';

type AdminAccount = {
  id: number;
  accountNo: string;
  username: string;
  nickname: string;
  mobile: string;
  loginPassword?: string;
  merchantId?: number | null;
  accountType?: 'PLATFORM' | 'MERCHANT';
  status: 'NORMAL' | 'DISABLED';
  lastLoginAt: string;
  roleCodes: string[];
  roleNames: string[];
};

type AdminRole = {
  id: number;
  code: string;
  name: string;
  status: 'NORMAL' | 'DISABLED';
  userCount: number;
  permissionKeys: string[];
  permissionCount: number;
  createdAt: string;
  updatedAt: string;
};

const router = useRouter();
const refreshApi = inject<{
  register: (handler: () => void | Promise<void>) => () => void;
  tick: { value: number };
} | null>('admin-refresh', null);

const loading = ref(false);
const logs = ref<
  Array<{
    id: number;
    operator: string;
    operatorAccount: string;
    module: string;
    action: string;
    createdAt: string;
    riskLevel: string;
  }>
>([]);
const adminAccounts = ref<AdminAccount[]>([]);
const adminRoles = ref<AdminRole[]>([]);
const selectedAccountIds = ref<number[]>([]);
const accountSaving = ref(false);
const roleSaving = ref(false);
const accountMessage = ref('');
const accountError = ref('');
const roleMessage = ref('');
const roleError = ref('');
const settings = ref({
  adminCount: 0,
  permissionNodeCount: 0,
  operationLogCount: 0,
  systemEntryCount: 0,
  customerServiceHotline: '',
  auditMode: '',
  siteName: '',
});
const accountForm = reactive({
  username: '',
  nickname: '',
  mobile: '',
  password: '',
  roleCodes: ['ADMIN'] as string[],
});
const roleForm = reactive({
  code: '',
  name: '',
  status: 'NORMAL',
  permissionKeys: [...ADMIN_PERMISSION_KEYS],
});

const editRoleDialog = reactive({
  visible: false,
  adminUserId: 0,
  username: '',
  roleCodes: [] as string[],
});

const rolePermissionDialog = reactive({
  visible: false,
  roleId: 0,
  roleCode: '',
  roleName: '',
  permissionKeys: [...ADMIN_PERMISSION_KEYS] as string[],
});

const createAccountDialog = reactive({
  visible: false,
});

const createRoleDialog = reactive({
  visible: false,
});

const currentAccountNo = computed(() => localStorage.getItem('farm-admin-account') || '');

const selectableAccounts = computed(() =>
  adminAccounts.value.filter((account) => account.accountNo !== currentAccountNo.value),
);

const isAllAccountsSelected = computed(() => {
  if (!selectableAccounts.value.length) return false;
  return selectableAccounts.value.every((account) => selectedAccountIds.value.includes(account.id));
});

const metricCards = computed(() => [
  {
    title: '管理员数量',
    value: settings.value.adminCount || adminAccounts.value.length || 0,
    note: '来自后端真实统计',
  },
  {
    title: '权限节点',
    value: settings.value.permissionNodeCount || adminRoles.value.length || 0,
    note: '来自后端真实统计',
  },
  {
    title: '操作日志',
    value: settings.value.operationLogCount || 0,
    note: '来自后端真实统计',
  },
  {
    title: '系统入口',
    value: settings.value.systemEntryCount || 0,
    note: `审核模式 ${settings.value.auditMode || 'STRICT'}`,
  },
]);

let unregisterRefresh: (() => void) | null = null;

onMounted(() => {
  void loadSystemData();
  if (refreshApi) {
    unregisterRefresh = refreshApi.register(() => loadSystemData());
  }
});

onBeforeUnmount(() => {
  unregisterRefresh?.();
  unregisterRefresh = null;
});

async function loadSystemData(): Promise<boolean> {
  loading.value = true;
  try {
    const [logData, settingsData, accountData, roleData] = await Promise.all([
      getLogs(),
      getSettings(),
      getAdminAccounts(),
      getAdminRoles(),
    ]);

    logs.value = logData.items;
    settings.value = settingsData;
    adminAccounts.value = accountData.items;
    adminRoles.value = roleData.items.map((role) => {
      const permissionKeys = normalizeAdminPermissionKeys(role.permissionKeys);
      return {
        ...role,
        permissionKeys,
        permissionCount: role.permissionCount ?? permissionKeys.length,
      };
    });
    selectedAccountIds.value = [];
    return true;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '刷新数据失败');
    return false;
  } finally {
    loading.value = false;
  }
}

function toggleSelectAccount(account: AdminAccount) {
  if (account.accountNo === currentAccountNo.value) return;
  const idx = selectedAccountIds.value.indexOf(account.id);
  if (idx > -1) {
    selectedAccountIds.value.splice(idx, 1);
  } else {
    selectedAccountIds.value.push(account.id);
  }
}

function toggleSelectAllAccounts() {
  const selectableIds = selectableAccounts.value.map((account) => account.id);
  if (isAllAccountsSelected.value) {
    selectedAccountIds.value = selectedAccountIds.value.filter((id) => !selectableIds.includes(id));
  } else {
    selectedAccountIds.value = Array.from(new Set([...selectedAccountIds.value, ...selectableIds]));
  }
}

function handleRefreshData() {
  void refreshWithFeedback(() => loadSystemData());
}

function isGroupFullySelected(permissionKeys: string[]) {
  return permissionKeys.length > 0 && permissionKeys.every((key) => rolePermissionDialog.permissionKeys.includes(key));
}

function selectAllRolePermissions() {
  roleForm.permissionKeys = [...ADMIN_PERMISSION_KEYS];
}

function clearRolePermissions() {
  roleForm.permissionKeys = [];
}

function toggleGroupPermissions(groupKey: string) {
  const group = navGroups.find((item) => item.key === groupKey);
  if (!group) {
    return;
  }

  const groupKeys = group.items.map((item) => item.key);
  const allSelected = isGroupFullySelected(groupKeys);
  if (allSelected) {
    rolePermissionDialog.permissionKeys = rolePermissionDialog.permissionKeys.filter((key) => !groupKeys.includes(key));
    return;
  }

  rolePermissionDialog.permissionKeys = Array.from(new Set([...rolePermissionDialog.permissionKeys, ...groupKeys]));
}

function formatRoleNames(account: AdminAccount): string {
  return account.roleNames.length > 0
    ? account.roleNames.join(' / ')
    : account.roleCodes.length > 0
      ? account.roleCodes.join(' / ')
      : '-';
}

function formatLogTime(raw: string): string {
  if (!raw) return '-';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function reloadAdminForm() {
  accountForm.username = '';
  accountForm.nickname = '';
  accountForm.mobile = '';
  accountForm.password = '';
  accountForm.roleCodes = ['ADMIN'];
  accountMessage.value = '';
  accountError.value = '';
}

function reloadRoleForm() {
  roleForm.code = '';
  roleForm.name = '';
  roleForm.status = 'NORMAL';
  roleForm.permissionKeys = [...ADMIN_PERMISSION_KEYS];
  roleMessage.value = '';
  roleError.value = '';
}

async function handleCreateAdminAccount() {
  const username = accountForm.username.trim();
  const nickname = accountForm.nickname.trim();
  const mobile = accountForm.mobile.trim();
  const password = accountForm.password.trim();

  if (!username) {
    ElMessage.warning('请输入登录账号');
    return;
  }
  if (!nickname) {
    ElMessage.warning('请输入昵称');
    return;
  }
  if (mobile && !/^1[3-9]\d{9}$/.test(mobile)) {
    ElMessage.warning('请输入正确的11位手机号');
    return;
  }
  if (password && password.length < 6) {
    ElMessage.warning('初始密码长度不能少于 6 位');
    return;
  }
  if (accountSaving.value) return;
  accountSaving.value = true;
  accountMessage.value = '';
  accountError.value = '';

  const rolesToSend = accountForm.roleCodes.length > 0 ? accountForm.roleCodes : ['ADMIN'];

  try {
    const created = await createAdminAccount({
      username,
      nickname,
      mobile: mobile || undefined,
      password: password || undefined,
      roleCodes: rolesToSend,
    });
    reloadAdminForm();
    await loadSystemData();
    createAccountDialog.visible = false;
    if (created.initialPassword) {
      await ElMessageBox.alert(
        `账号：${created.username}\n初始密码：${created.initialPassword}\n\n密码也会显示在列表「登录密码」列。`,
        '账号已创建',
        { confirmButtonText: '我已复制', type: 'success' },
      );
    } else {
      ElMessage.success('管理员账号已创建');
    }
  } catch (error) {
    accountError.value = error instanceof Error ? error.message : '创建管理员账号失败';
    ElMessage.error(accountError.value);
  } finally {
    accountSaving.value = false;
  }
}

async function copyText(text: string, successMessage = '已复制') {
  const value = String(text ?? '').trim();
  if (!value) {
    ElMessage.warning('暂无可复制内容');
    return;
  }
  try {
    await navigator.clipboard.writeText(value);
    ElMessage.success(successMessage);
  } catch {
    ElMessage.error('复制失败，请手动选择文本');
  }
}

async function handleSyncMerchants() {
  try {
    await ElMessageBox.confirm(
      '将为所有已通过商户补齐后台账号（商户管理员角色），并确保可查看登录密码。是否继续？',
      '同步商户账号',
      { type: 'warning', confirmButtonText: '开始同步', cancelButtonText: '取消' },
    );
  } catch {
    return;
  }

  accountSaving.value = true;
  try {
    const result = await syncMerchantsAdminAccounts();
    await loadSystemData();
    const accounts = result.accounts?.length
      ? result.accounts
      : [...(result.created || []), ...(result.ensured || [])];
    if (!accounts.length) {
      ElMessage.success(
        `同步完成：新建 ${result.createdCount || 0} 个，已有 ${result.ensuredCount || 0} 个，跳过 ${result.skippedCount || 0} 个`,
      );
      return;
    }
    const lines = accounts
      .map(
        (item) =>
          `${item.storeName} | ${item.username || item.mobile} | ${item.initialPassword}`,
      )
      .join('\n');
    await ElMessageBox.alert(
      `新建 ${result.createdCount || 0} 个，已有账号 ${result.ensuredCount || 0} 个，跳过 ${result.skippedCount || 0} 个\n\n店铺 | 登录账号 | 密码\n${lines}\n\n密码也会显示在管理员列表「登录密码」列，可随时复制。`,
      '商户账号同步结果',
      { confirmButtonText: '我已复制', type: 'success', customClass: 'sync-merchant-password-dialog' },
    );
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error instanceof Error ? error.message : '同步商户账号失败');
    }
  } finally {
    accountSaving.value = false;
  }
}

async function handleToggleAccountStatus(account: AdminAccount) {
  const currentAccountNo = localStorage.getItem('farm-admin-account');
  if (account.accountNo === currentAccountNo) {
    ElMessage.warning('为了系统安全，您不能禁用自己当前登录的账号');
    return;
  }

  const actionText = account.status === 'NORMAL' ? '禁用' : '启用';
  try {
    await ElMessageBox.confirm(`确定要${actionText}管理员账号 [${account.username}] 吗？`, '安全提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    await updateAdminAccount(account.id, {
      status: account.status === 'NORMAL' ? 'DISABLED' : 'NORMAL',
    });
    await loadSystemData();
    ElMessage.success(`账号已成功${actionText}`);
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error instanceof Error ? error.message : '操作失败');
    }
  }
}

function handleUpdateAccountRoles(account: AdminAccount) {
  editRoleDialog.adminUserId = account.id;
  editRoleDialog.username = account.username;
  editRoleDialog.roleCodes = [...account.roleCodes];
  editRoleDialog.visible = true;
}

async function handleSaveAccountRoles() {
  if (editRoleDialog.roleCodes.length === 0) {
    ElMessage.warning('请至少选择一个角色');
    return;
  }

  const currentAccountNo = localStorage.getItem('farm-admin-account');
  const targetAccount = adminAccounts.value.find((a) => a.id === editRoleDialog.adminUserId);
  if (targetAccount?.accountNo === currentAccountNo && !editRoleDialog.roleCodes.includes('ADMIN')) {
    ElMessage.warning('为了系统安全，您不能移除自己的管理员(ADMIN)角色');
    return;
  }

  if (roleSaving.value) return;
  roleSaving.value = true;

  try {
    await updateAdminAccount(editRoleDialog.adminUserId, {
      roleCodes: editRoleDialog.roleCodes,
    });
    editRoleDialog.visible = false;
    await loadSystemData();
    ElMessage.success('角色分配已成功更新');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '更新账号角色失败');
  } finally {
    roleSaving.value = false;
  }
}

async function handleResetPassword(account: AdminAccount) {
  try {
    const { value: password } = await ElMessageBox.prompt(
      `为管理员 [${account.username}] 设置新密码。留空则随机生成 6 位密码。`,
      '重置密码',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPlaceholder: '选填；不填则随机生成',
        inputType: 'password',
        inputValidator: (val) => {
          if (val && val.trim().length > 0 && val.trim().length < 6) {
            return '密码长度不能少于 6 位';
          }
          return true;
        },
      },
    );

    const result = await resetAdminPassword(account.id, password?.trim() || undefined);
    if (result.initialPassword) {
      await ElMessageBox.alert(
        `账号：${result.username || account.username}\n新密码：${result.initialPassword}\n\n密码也会显示在列表「登录密码」列。`,
        '密码已重置',
        { confirmButtonText: '我已复制', type: 'success' },
      );
      await loadSystemData();
    } else {
      ElMessage.success(`管理员 [${account.username}] 的密码已重置成功`);
      await loadSystemData();
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error instanceof Error ? error.message : '重置密码失败');
    }
  }
}

async function handleCreateRole() {
  const code = roleForm.code.trim();
  const name = roleForm.name.trim();

  if (!code) {
    ElMessage.warning('请输入角色编码');
    return;
  }
  if (!/^[A-Z0-9_]+$/.test(code)) {
    ElMessage.warning('角色编码仅支持大写字母、数字和下划线');
    return;
  }
  if (!name) {
    ElMessage.warning('请输入角色名称');
    return;
  }
  if (roleForm.permissionKeys.length === 0) {
    ElMessage.warning('请至少选择一个菜单权限');
    return;
  }

  if (roleSaving.value) return;
  roleSaving.value = true;
  roleMessage.value = '';
  roleError.value = '';

  try {
    await createAdminRole({
      code,
      name,
      status: roleForm.status as 'NORMAL' | 'DISABLED',
      permissionKeys: [...roleForm.permissionKeys],
    });
    reloadRoleForm();
    await loadSystemData();
    ElMessage.success('管理员角色已创建');
    createRoleDialog.visible = false;
  } catch (error) {
    roleError.value = error instanceof Error ? error.message : '创建管理员角色失败';
    ElMessage.error(roleError.value);
  } finally {
    roleSaving.value = false;
  }
}

async function handleToggleRoleStatus(role: AdminRole) {
  const actionText = role.status === 'NORMAL' ? '禁用' : '启用';
  try {
    await ElMessageBox.confirm(`确定要${actionText}角色 [${role.name}] 吗？这可能会影响分配了该角色的所有管理员。`, '安全提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    await updateAdminRole(role.id, {
      status: role.status === 'NORMAL' ? 'DISABLED' : 'NORMAL',
    });
    await loadSystemData();
    ElMessage.success(`角色已成功${actionText}`);
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error instanceof Error ? error.message : '操作失败');
    }
  }
}

async function handleRenameRole(role: AdminRole) {
  try {
    const { value: name } = await ElMessageBox.prompt(`请输入角色 [${role.code}] 的新名称：`, '修改角色名称', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputValue: role.name,
      inputPlaceholder: '请输入角色名称',
      inputValidator: (val) => {
        if (!val || !val.trim()) {
          return '角色名称不能为空';
        }
        return true;
      },
    });

    if (!name) return;

    await updateAdminRole(role.id, { name: name.trim() });
    await loadSystemData();
    ElMessage.success('角色名称更新成功');
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error instanceof Error ? error.message : '更新角色失败');
    }
  }
}

function handleEditRolePermissions(role: AdminRole) {
  rolePermissionDialog.roleId = role.id;
  rolePermissionDialog.roleCode = role.code;
  rolePermissionDialog.roleName = role.name;
  rolePermissionDialog.permissionKeys = role.permissionKeys.length > 0
    ? [...role.permissionKeys]
    : [...ADMIN_PERMISSION_KEYS];
  rolePermissionDialog.visible = true;
}

async function handleSaveRolePermissions() {
  if (rolePermissionDialog.permissionKeys.length === 0) {
    ElMessage.warning('请至少保留一个菜单权限');
    return;
  }

  if (roleSaving.value) return;
  roleSaving.value = true;
  try {
    await updateAdminRole(rolePermissionDialog.roleId, {
      permissionKeys: [...rolePermissionDialog.permissionKeys],
    });
    rolePermissionDialog.visible = false;
    await loadSystemData();
    ElMessage.success('角色菜单权限已更新');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '更新权限失败');
  } finally {
    roleSaving.value = false;
  }
}

async function handleDeleteAccount(account: AdminAccount) {
  const currentAccountNo = localStorage.getItem('farm-admin-account');
  if (account.accountNo === currentAccountNo) {
    ElMessage.warning('为了系统安全，您不能删除自己当前登录的账号');
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除管理员账号 [${account.username}] 吗？删除后该账号将无法再登录系统，但操作日志会保留。`,
      '安全提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );

    await deleteAdminAccount(account.id);
    await loadSystemData();
    ElMessage.success('管理员账号已成功删除');
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error instanceof Error ? error.message : '删除失败');
    }
  }
}

async function batchDeleteAccounts() {
  if (!selectedAccountIds.value.length) return;
  try {
    await ElMessageBox.confirm(
      `确定要批量删除已选的 ${selectedAccountIds.value.length} 个管理员账号吗？删除后这些账号将无法再登录系统。`,
      '批量删除确认',
      { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'warning' },
    );
    accountSaving.value = true;
    const results = await Promise.allSettled(
      selectedAccountIds.value.map((id) => deleteAdminAccount(id)),
    );
    const successCount = results.filter((r) => r.status === 'fulfilled').length;
    const failCount = results.length - successCount;
    selectedAccountIds.value = [];
    await loadSystemData();
    if (failCount === 0) {
      ElMessage.success(`成功删除 ${successCount} 个管理员账号`);
    } else {
      ElMessage.warning(`删除完成：成功 ${successCount} 个，失败 ${failCount} 个`);
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error instanceof Error ? error.message : '批量删除失败');
    }
  } finally {
    accountSaving.value = false;
  }
}

async function handleDeleteRole(role: AdminRole) {
  if (role.userCount > 0) {
    ElMessage.warning('该角色下仍有绑定的管理员，无法删除！');
    return;
  }

  try {
    await ElMessageBox.confirm(`确定要彻底删除角色 [${role.name}] (${role.code}) 吗？此操作不可逆！`, '安全提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    await deleteAdminRole(role.id);
    await loadSystemData();
    ElMessage.success('角色已成功删除');
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error instanceof Error ? error.message : '删除角色失败');
    }
  }
}
</script>
