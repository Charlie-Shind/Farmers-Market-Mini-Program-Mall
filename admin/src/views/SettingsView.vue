<template>
  <div class="page-stack">
    <StatGrid :cards="metricCards" />

    <section class="config-card-grid">
      <article class="config-card config-form-card">
        <strong>系统基础配置</strong>
        <p>站点名称、客服热线、官方账号名称和审核模式会直接读取后端配置并可写回。</p>
        <div class="config-form">
          <label class="form-field">
            <span>站点名称</span>
            <input v-model.trim="settingForm.siteName" type="text" placeholder="湾源农仓运营管理后台" />
          </label>
          <label class="form-field">
            <span>客服热线</span>
            <input v-model.trim="settingForm.customerServiceHotline" type="text" placeholder="400-800-2026" />
          </label>
          <label class="form-field">
            <span>官方账号名称</span>
            <input v-model.trim="settingForm.platformOfficialMerchantName" type="text" placeholder="浔源农仓" />
            <small class="form-help">这个名称会同步到平台官方商户资料，后续平台商品默认归属它。</small>
          </label>
          <label class="form-field">
            <span>平台客服商户</span>
            <select v-model="settingForm.platformSupportMerchantId">
              <option value="">请选择商户</option>
              <option v-for="merchant in merchantOptions" :key="merchant.id" :value="String(merchant.id)">
                {{ merchant.storeName }}
              </option>
            </select>
            <small class="form-help">只能从已有商户列表里选择，不再手填 ID。</small>
          </label>
          <label class="form-field">
            <span>审核模式</span>
            <select v-model="settingForm.auditMode">
              <option value="STRICT">严格审核</option>
              <option value="NORMAL">常规审核</option>
            </select>
          </label>
        </div>
        <div class="config-form-actions">
          <RefreshDataButton :loading="refreshing" :disabled="savingSettings" label="刷新配置" @refresh="handleRefreshData('系统配置')" />
          <button class="primary-btn" type="button" @click="handleSaveSettings" :disabled="savingSettings">
            {{ savingSettings ? '保存中...' : '保存配置' }}
          </button>
        </div>
        <p v-if="saveMessage" class="form-help success-text">{{ saveMessage }}</p>
        <p v-if="saveError" class="form-help error-text">{{ saveError }}</p>
      </article>

      <article class="config-card config-form-card">
        <strong>积分规则配置</strong>
        <p>这里控制订单返积分、积分抵扣开关和抵扣比例，保存后会直接影响结算页和订单完成后的积分入账。</p>
        <div class="config-form">
          <label class="form-field">
            <span>积分抵扣开关</span>
            <select v-model="settingForm.pointsRedeemEnabled">
              <option :value="true">开启</option>
              <option :value="false">关闭</option>
            </select>
            <small class="form-help">关闭后 C 端结算页不会显示“使用积分抵扣”，后端也会拒绝带积分抵现的请求。</small>
          </label>
          <label class="form-field">
            <span>订单返积分比例</span>
            <input v-model.trim="settingForm.pointsEarnRate" type="number" min="0.01" step="0.01" placeholder="1" />
            <small class="form-help">1 元订单金额可返多少积分，例如填 1 表示 1 元返 1 积分。</small>
          </label>
          <label class="form-field">
            <span>积分抵扣比例</span>
            <input v-model.trim="settingForm.pointsRedeemRate" type="number" min="1" step="1" placeholder="100" />
            <small class="form-help">多少积分抵扣 1 元，例如填 100 表示 100 积分抵 1 元。</small>
          </label>
        </div>
        <div class="config-card-actions">
          <RefreshDataButton :loading="refreshing" :disabled="savingSettings" label="刷新规则" @refresh="handleRefreshData('积分规则')" />
          <button class="primary-btn" type="button" @click="handleSaveSettings" :disabled="savingSettings">
            {{ savingSettings ? '保存中...' : '保存规则' }}
          </button>
        </div>
      </article>

      <article class="config-card">
        <strong>平台客服绑定</strong>
        <p>这里绑定的是小程序“官方客服”默认打开的商户会话。配置后会优先按这个商户创建/打开客服对话。</p>
        <div class="config-card-actions">
          <RefreshDataButton :loading="refreshing" :disabled="savingSettings" label="刷新绑定" @refresh="handleRefreshData('客服绑定')" />
        </div>
        <div v-if="supportTarget" class="support-target-box">
          <div class="support-target-box__main">
            <strong>{{ supportTarget.merchantName }}</strong>
            <span>商户 ID：{{ supportTarget.merchantId }}</span>
            <span>热线：{{ supportTarget.hotline || '未配置' }}</span>
            <span>默认场景：{{ supportTarget.sceneLabel }}</span>
            <span v-if="supportTarget.sceneSource">场景来源：{{ supportTarget.sceneSource }}</span>
          </div>
          <span class="support-target-box__source">{{ supportTarget.source === 'CONFIGURED' ? '已手动配置' : '回退到首个商户' }}</span>
        </div>
      </article>

      <article class="config-card">
        <strong>管理员入口</strong>
        <p>管理员账号和角色已经拆到左侧独立菜单，方便单独维护权限体系。</p>
        <div class="config-card-actions">
          <button class="ghost-btn" type="button" @click="router.push('/admins')">前往管理员管理</button>
          <button class="ghost-btn" type="button" @click="router.push('/messages')">前往公告通知</button>
        </div>
      </article>

      <article class="config-card">
        <strong>业务模块入口</strong>
        <p>Banner 与公告已统一归口到营销中心模块，本页不再提供业务配置入口。</p>
        <div class="config-card-actions">
          <button class="ghost-btn" type="button" @click="router.push('/activities')">前往活动管理</button>
          <button class="ghost-btn" type="button" @click="router.push('/messages')">前往公告通知</button>
        </div>
      </article>
    </section>

    <section class="panel">
      <div class="panel-head compact">
        <h2>操作日志</h2>
      </div>

      <div class="table-x">
        <table class="data-table">
          <thead>
            <tr>
              <th>操作人</th>
              <th>模块</th>
              <th>动作</th>
              <th>时间</th>
              <th>风险</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in logs" :key="log.id">
              <td data-label="操作人">
                <div class="cell-main">
                  <div class="thumb">{{ log.operator.slice(0, 1) }}</div>
                  <div>
                    <strong>{{ log.operator }}</strong>
                    <span>{{ log.operatorAccount }}</span>
                  </div>
                </div>
              </td>
              <td data-label="模块">{{ log.module }}</td>
              <td data-label="动作">{{ formatLogAction(log.action) }}</td>
              <td data-label="时间">{{ formatLogTime(log.createdAt) }}</td>
              <td data-label="风险">
                <span
                  :class="[
                    'status',
                    log.riskLevel === '正常' ? 'ok' : log.riskLevel === '高风险' ? 'danger' : 'warn',
                  ]"
                >
                  {{ log.riskLevel }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import {
  getAdminAccounts,
  getChatSupportTarget,
  getAdminRoles,
  getLogs,
  getSettings,
  getMerchants,
  saveSettings,
} from '@/api/admin';
import StatGrid from '@/components/StatGrid.vue';
import RefreshDataButton from '@/components/RefreshDataButton.vue';
import { refreshWithFeedback } from '@/utils/refresh-feedback';

const router = useRouter();

const refreshApi = inject<{
  register: (handler: () => void | Promise<void>) => () => void;
  tick: { value: number };
} | null>('admin-refresh', null);

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
const savingSettings = ref(false);
const refreshing = ref(false);
const saveMessage = ref('');
const saveError = ref('');
const settings = ref({
  adminCount: 0,
  permissionNodeCount: 0,
  operationLogCount: 0,
  systemEntryCount: 0,
  customerServiceHotline: '',
  platformOfficialMerchantName: '',
  platformSupportMerchantId: '',
  auditMode: '',
  pointsEarnRate: '1',
  pointsRedeemRate: '100',
  pointsRedeemEnabled: true,
  siteName: '',
});
const merchantOptions = ref<Array<{ id: number; storeName: string }>>([]);
const settingForm = reactive({
  siteName: '',
  customerServiceHotline: '',
  platformOfficialMerchantName: '',
  platformSupportMerchantId: '',
  auditMode: 'STRICT',
  pointsRedeemEnabled: true,
  pointsEarnRate: '1',
  pointsRedeemRate: '100',
});
const supportTarget = ref<null | {
  merchantId: number;
  merchantName: string;
  merchantLogo: string;
  hotline: string;
  source: 'CONFIGURED' | 'FALLBACK';
  sceneType: 'GENERAL' | 'PRODUCT' | 'ORDER' | 'OFFICIAL';
  sceneLabel: string;
  sceneSource: string;
}>(null);

const metricCards = computed(() => [
  {
    title: '管理员数量',
    value: settings.value.adminCount || 0,
    note: '来自后端真实统计',
  },
  {
    title: '权限节点',
    value: settings.value.permissionNodeCount || 0,
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
    unregisterRefresh = refreshApi.register(() => {
      void loadSystemData();
    });
  }
});

onBeforeUnmount(() => {
  unregisterRefresh?.();
  unregisterRefresh = null;
});

async function loadSystemData(): Promise<boolean> {
  refreshing.value = true;
  try {
    const [logData, settingsData, accountData, roleData] = await Promise.all([
      getLogs(),
      getSettings(),
      getAdminAccounts(),
      getAdminRoles(),
    ]);
    const [targetData, merchantData] = await Promise.all([
      getChatSupportTarget().catch(() => null),
      getMerchants({ page: 1, pageSize: 100 }).catch(() => ({ items: [] })),
    ]);

    logs.value = logData.items;
    merchantOptions.value = (merchantData.items ?? []).map((item: any) => ({
      id: Number(item.id),
      storeName: String(item.storeName ?? item.name ?? `商户 ${item.id}`),
    }));
    settings.value = {
      ...settings.value,
      ...settingsData,
      pointsRedeemEnabled: settingsData.pointsRedeemEnabled ?? true,
      pointsEarnRate: settingsData.pointsEarnRate || '1',
      pointsRedeemRate: settingsData.pointsRedeemRate || '100',
    };
    settingForm.siteName = settingsData.siteName || '';
    settingForm.customerServiceHotline = settingsData.customerServiceHotline || '';
    settingForm.platformOfficialMerchantName = settingsData.platformOfficialMerchantName || '浔源农仓';
    settingForm.platformSupportMerchantId = settingsData.platformSupportMerchantId || '';
    settingForm.auditMode = settingsData.auditMode || 'STRICT';
    settingForm.pointsRedeemEnabled = settingsData.pointsRedeemEnabled ?? true;
    settingForm.pointsEarnRate = settingsData.pointsEarnRate || '1';
    settingForm.pointsRedeemRate = settingsData.pointsRedeemRate || '100';
    supportTarget.value = targetData;

    settings.value.adminCount = accountData.items.length;
    settings.value.permissionNodeCount = settingsData.permissionNodeCount || new Set(
      roleData.items.flatMap((role: any) => Array.isArray(role.permissionKeys) ? role.permissionKeys : []),
    ).size;
    return true;
  } catch (error) {
    saveError.value = error instanceof Error ? error.message : '刷新失败';
    return false;
  } finally {
    refreshing.value = false;
  }
}

function handleRefreshData(scope = '数据') {
  saveError.value = '';
  void refreshWithFeedback(() => loadSystemData(), `${scope}已刷新`);
}

const LOG_ACTION_MAP: Record<string, string> = {
  AUDIT_MERCHANT: '审核商户',
  AUDIT_PRODUCT: '审核商品',
  ARBITRATE_REFUND: '售后仲裁处理',
  AUDIT_WITHDRAW: '审核提现',
  LOGIN: '管理员登录',
  LOGOUT: '管理员登出',
  UPDATE_SETTINGS: '更新系统配置',
  CREATE_BANNER: '新增 Banner',
  UPDATE_BANNER: '编辑 Banner',
  DELETE_BANNER: '删除 Banner',
  UPDATE_BANNER_STATUS: 'Banner 启停',
  SEND_MESSAGE: '发送消息',
  BROADCAST_MESSAGE: '全员广播',
  DELETE_MESSAGE: '撤回消息',
  UPDATE_USER_STATUS: '用户状态切换',
  CREATE_ACTIVITY: '创建活动',
  CREATE_ADMIN_ACCOUNT: '创建管理员账号',
  UPDATE_ADMIN_ACCOUNT: '编辑管理员账号',
  RESET_ADMIN_PASSWORD: '重置管理员密码',
  DELETE_ADMIN_ACCOUNT: '删除管理员账号',
  CREATE_ADMIN_ROLE: '创建管理员角色',
  UPDATE_ADMIN_ROLE: '更新管理员角色',
  DELETE_ADMIN_ROLE: '删除管理员角色',
};

function formatLogAction(action: string): string {
  return LOG_ACTION_MAP[action] ?? action;
}

function formatLogTime(raw: string): string {
  if (!raw) return '-';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function handleSaveSettings() {
  if (savingSettings.value) return;

  saveError.value = '';
  const earnRate = Number(settingForm.pointsEarnRate);
  const redeemRate = Number(settingForm.pointsRedeemRate);
  if (!Number.isFinite(earnRate) || earnRate <= 0) {
    saveError.value = '订单返积分比例必须大于 0';
    return;
  }
  if (!Number.isFinite(redeemRate) || redeemRate < 1) {
    saveError.value = '积分抵扣比例必须大于等于 1';
    return;
  }

  savingSettings.value = true;
  saveMessage.value = '';
  saveError.value = '';

  try {
    const updated = await saveSettings([
      { key: 'siteName', value: settingForm.siteName.trim() || '湾源农仓运营管理后台' },
      { key: 'customerServiceHotline', value: settingForm.customerServiceHotline.trim() || '400-800-2026' },
      { key: 'platformOfficialMerchantName', value: settingForm.platformOfficialMerchantName.trim() || '浔源农仓' },
      { key: 'platformSupportMerchantId', value: settingForm.platformSupportMerchantId.trim() || '' },
      { key: 'auditMode', value: settingForm.auditMode || 'STRICT' },
      { key: 'pointsRedeemEnabled', value: String(settingForm.pointsRedeemEnabled) },
      { key: 'pointsEarnRate', value: settingForm.pointsEarnRate.trim() || '1' },
      { key: 'pointsRedeemRate', value: settingForm.pointsRedeemRate.trim() || '100' },
    ]);

    settings.value = {
      ...settings.value,
      ...updated,
      pointsRedeemEnabled: updated.pointsRedeemEnabled ?? true,
      pointsEarnRate: updated.pointsEarnRate || '1',
      pointsRedeemRate: updated.pointsRedeemRate || '100',
    };
    settingForm.siteName = updated.siteName || '';
    settingForm.customerServiceHotline = updated.customerServiceHotline || '';
    settingForm.platformOfficialMerchantName = updated.platformOfficialMerchantName || '浔源农仓';
    settingForm.platformSupportMerchantId = updated.platformSupportMerchantId || '';
    settingForm.auditMode = updated.auditMode || 'STRICT';
    settingForm.pointsRedeemEnabled = updated.pointsRedeemEnabled ?? true;
    settingForm.pointsEarnRate = updated.pointsEarnRate || '1';
    settingForm.pointsRedeemRate = updated.pointsRedeemRate || '100';
    const officialMerchantId = Number(updated.platformSupportMerchantId || 0);
    const officialMerchantName = settingForm.platformOfficialMerchantName.trim() || '浔源农仓';
    if (officialMerchantId) {
      merchantOptions.value = merchantOptions.value.map((merchant) =>
        merchant.id === officialMerchantId ? { ...merchant, storeName: officialMerchantName } : merchant,
      );
    }
    if (supportTarget.value?.merchantId === officialMerchantId) {
      supportTarget.value = {
        ...supportTarget.value,
        merchantName: officialMerchantName,
      };
    }
    saveMessage.value = '系统配置已保存并回读后台数据';
  } catch (error) {
    saveError.value = error instanceof Error ? error.message : '保存配置失败';
  } finally {
    savingSettings.value = false;
  }
}
</script>
