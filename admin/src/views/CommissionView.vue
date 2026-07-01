<template>
  <div class="page-stack">
    <StatGrid :cards="summaryCards" />

    <section class="panel">
      <div class="panel-head compact">
        <div>
          <h2>佣金管理</h2>
          <p>管理团长佣金记录，支持按团长/状态筛选与批量结算。</p>
        </div>
        <div class="top-actions">
          <button type="button" class="ghost-btn compact" :disabled="loading" @click="loadData">
            {{ loading ? '刷新中...' : '刷新数据' }}
          </button>
          <button
            type="button"
            class="primary-btn compact"
            :disabled="!selectedIds.length || saving"
            @click="batchSettle"
          >
            批量结算
          </button>
        </div>
      </div>

      <div class="filter-grid compact">
        <label class="filter-field compact">
          <span>团长 ID</span>
          <input v-model.number="filters.leaderId" class="compact" placeholder="按团长 ID 筛选" @keyup.enter="applyFilters" />
        </label>
        <label class="filter-field compact">
          <span>状态</span>
          <select v-model="filters.status" class="compact" @change="applyFilters">
            <option value="">全部状态</option>
            <option value="PENDING_SETTLEMENT">待结算</option>
            <option value="SETTLED">已结算</option>
            <option value="CANCELLED">已取消</option>
          </select>
        </label>
        <div class="filter-actions">
          <button type="button" class="ghost-btn compact" :disabled="!hasFilters" @click="resetFilters">
            重置筛选
          </button>
          <button type="button" class="primary-btn compact" @click="applyFilters">查询</button>
        </div>
      </div>

      <div class="batch-toolbar compact">
        <div>
          <strong>{{ commissions.length }} / {{ total }} 条记录</strong>
          <span v-if="selectedIds.length">已选 {{ selectedIds.length }} 笔，待结算金额 ¥{{ selectedPendingAmount.toFixed(2) }}</span>
        </div>
      </div>

      <div class="table-x">
        <table class="data-table">
          <thead>
            <tr>
              <th class="check-cell">
                <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" />
              </th>
              <th>ID</th>
              <th>团长</th>
              <th>订单号</th>
              <th>订单金额</th>
              <th>佣金比例</th>
              <th>佣金金额</th>
              <th>状态</th>
              <th>结算时间</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="commission in commissions" :key="commission.id">
              <td class="check-cell">
                <input
                  type="checkbox"
                  :checked="selectedIds.includes(commission.id)"
                  :disabled="commission.status !== 'PENDING_SETTLEMENT'"
                  @change="toggleSelect(commission)"
                />
              </td>
              <td data-label="ID">{{ commission.id }}</td>
              <td data-label="团长">
                {{ commission.leader ? `${commission.leader.realName} (#${commission.leader.id})` : `团长#${commission.leaderId}` }}
              </td>
              <td data-label="订单号">{{ commission.orderNo }}</td>
              <td data-label="订单金额">¥{{ Number(commission.orderAmount).toFixed(2) }}</td>
              <td data-label="佣金比例">{{ (Number(commission.commissionRate) * 100).toFixed(2) }}%</td>
              <td data-label="佣金金额">
                <strong>¥{{ Number(commission.commissionAmount).toFixed(2) }}</strong>
              </td>
              <td data-label="状态">
                <span :class="['status', statusClass(commission.status)]">{{ statusText(commission.status) }}</span
                >
              </td>
              <td data-label="结算时间">{{ commission.settledAt ? formatTime(commission.settledAt) : '-' }}</td>
              <td data-label="创建时间">{{ formatTime(commission.createdAt) }}</td>
              <td data-label="操作">
                <div class="row-actions wrap">
                  <button type="button" class="ghost-btn compact" @click="openDetail(commission)">详情</button>
                  <button
                    type="button"
                    class="ghost-btn compact"
                    :disabled="commission.status !== 'PENDING_SETTLEMENT'"
                    @click="settleOne(commission)"
                  >
                    结算
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!commissions.length">
              <td colspan="11" class="empty-hint">暂无佣金记录</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="pagination">
        <span>第 {{ page }} / {{ totalPages }} 页 · 共 {{ total }} 条</span>
        <div class="pagination-actions">
          <button type="button" :disabled="page <= 1" @click="goToPage(page - 1)">上一页</button>
          <label class="pagination-jump">
            <span>跳到</span>
            <input v-model.number="pageInput" type="number" min="1" :max="totalPages" @keyup.enter="goToPage(pageInput)" />
            <span>页</span>
          </label>
          <button type="button" @click="goToPage(pageInput)">确定</button>
          <button type="button" :disabled="page >= totalPages" @click="goToPage(page + 1)">下一页</button>
        </div>
      </div>
    </section>

    <!-- 详情弹窗 -->
    <el-dialog
      v-model="detailDialog.open"
      title="佣金详情"
      width="520px"
      align-center
      destroy-on-close
      class="commission-detail-dialog"
    >
      <div v-if="detailDialog.commission" class="detail-form">
        <div class="detail-row">
          <span>佣金 ID</span>
          <strong>{{ detailDialog.commission.id }}</strong>
        </div>
        <div class="detail-row">
          <span>团长</span>
          <strong>
            {{ detailDialog.commission.leader ? `${detailDialog.commission.leader.realName} (#${detailDialog.commission.leader.id})` : `团长#${detailDialog.commission.leaderId}` }}
          </strong>
        </div>
        <div class="detail-row">
          <span>团长手机号</span>
          <strong>{{ detailDialog.commission.leader?.mobile || '-' }}</strong>
        </div>
        <div class="detail-row">
          <span>订单号</span>
          <strong>{{ detailDialog.commission.orderNo }}</strong>
        </div>
        <div class="detail-row">
          <span>订单 ID</span>
          <strong>{{ detailDialog.commission.orderId ?? '-' }}</strong>
        </div>
        <div class="detail-row">
          <span>订单金额</span>
          <strong>¥{{ Number(detailDialog.commission.orderAmount).toFixed(2) }}</strong>
        </div>
        <div class="detail-row">
          <span>佣金比例</span>
          <strong>{{ (Number(detailDialog.commission.commissionRate) * 100).toFixed(2) }}%</strong>
        </div>
        <div class="detail-row">
          <span>佣金金额</span>
          <strong>¥{{ Number(detailDialog.commission.commissionAmount).toFixed(2) }}</strong>
        </div>
        <div class="detail-row">
          <span>状态</span>
          <strong>
            <span :class="['status', statusClass(detailDialog.commission.status)]"
              >{{ statusText(detailDialog.commission.status) }}</span
            >
          </strong>
        </div>
        <div class="detail-row">
          <span>结算时间</span>
          <strong>{{ detailDialog.commission.settledAt ? formatTime(detailDialog.commission.settledAt) : '-' }}</strong>
        </div>
        <div class="detail-row">
          <span>备注</span>
          <strong>{{ detailDialog.commission.remark || '-' }}</strong>
        </div>
        <div class="detail-row">
          <span>创建时间</span>
          <strong>{{ formatTime(detailDialog.commission.createdAt) }}</strong>
        </div>
        <div class="detail-row">
          <span>更新时间</span>
          <strong>{{ formatTime(detailDialog.commission.updatedAt) }}</strong>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

import {
  batchSettleLeaderCommissions,
  getLeaderCommissions,
  settleLeaderCommission,
} from '@/api/admin';
import StatGrid from '@/components/StatGrid.vue';

const refreshApi = inject<{
  register: (handler: () => void | Promise<void>) => () => void;
  tick: { value: number };
} | null>('admin-refresh', null);

interface CommissionLeader {
  id: number;
  realName: string;
  mobile: string;
}

interface Commission {
  id: number;
  leaderId: number;
  orderId: number | null;
  orderNo: string;
  orderAmount: number;
  commissionRate: number;
  commissionAmount: number;
  status: 'PENDING_SETTLEMENT' | 'SETTLED' | 'CANCELLED';
  settledAt: string | null;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
  leader: CommissionLeader | null;
}

const commissions = ref<Commission[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const pageInput = ref(1);
const loading = ref(false);
const saving = ref(false);
const selectedIds = ref<number[]>([]);

const filters = reactive({
  leaderId: undefined as number | undefined,
  status: '',
});

const detailDialog = reactive({
  open: false,
  commission: null as Commission | null,
});

const hasFilters = computed(() => Boolean(filters.leaderId || filters.status));
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));

const pendingCommissions = computed(() => commissions.value.filter((c) => c.status === 'PENDING_SETTLEMENT'));
const settledCommissions = computed(() => commissions.value.filter((c) => c.status === 'SETTLED'));

const summaryCards = computed(() => {
  const totalAmount = commissions.value.reduce((sum, c) => sum + Number(c.commissionAmount), 0);
  const pendingAmount = pendingCommissions.value.reduce((sum, c) => sum + Number(c.commissionAmount), 0);
  return [
    { title: '佣金总额', value: `¥${totalAmount.toFixed(2)}`, note: '当前筛选范围累计' },
    {
      title: '待结算笔数',
      value: pendingCommissions.value.length,
      note: pendingCommissions.value.length > 0 ? '<span class="mini-warn">待处理</span>' : '<span class="mini-muted">暂无</span>',
    },
    { title: '待结算金额', value: `¥${pendingAmount.toFixed(2)}`, note: '需尽快结算' },
    { title: '已结算笔数', value: settledCommissions.value.length, note: '已完成打款' },
  ];
});

const isAllSelected = computed(() => {
  const selectable = pendingCommissions.value;
  if (!selectable.length) return false;
  return selectable.every((c) => selectedIds.value.includes(c.id));
});

const selectedPendingAmount = computed(() => {
  return commissions.value
    .filter((c) => selectedIds.value.includes(c.id) && c.status === 'PENDING_SETTLEMENT')
    .reduce((sum, c) => sum + Number(c.commissionAmount), 0);
});

onMounted(() => {
  void loadData();
  if (refreshApi) {
    const unregister = refreshApi.register(() => loadData());
    onBeforeUnmount(() => unregister());
  }
});

async function loadData() {
  loading.value = true;
  try {
    const res = await getLeaderCommissions({
      page: page.value,
      pageSize: pageSize.value,
      leaderId: filters.leaderId,
      status: filters.status,
    });
    commissions.value = res.items ?? [];
    total.value = res.total ?? 0;
    pageInput.value = page.value;
    selectedIds.value = [];
  } catch (error: any) {
    ElMessage.error(error.message || '加载佣金列表失败');
  } finally {
    loading.value = false;
  }
}

function applyFilters() {
  page.value = 1;
  void loadData();
}

function resetFilters() {
  filters.leaderId = undefined;
  filters.status = '';
  applyFilters();
}

function goToPage(target: number) {
  const next = Math.max(1, Math.min(totalPages.value, Number(target) || 1));
  if (next !== page.value) {
    page.value = next;
    void loadData();
  }
}

function statusClass(status: string) {
  switch (status) {
    case 'SETTLED':
      return 'ok';
    case 'PENDING_SETTLEMENT':
      return 'warn';
    case 'CANCELLED':
      return 'danger';
    default:
      return '';
  }
}

function statusText(status: string) {
  const map: Record<string, string> = {
    PENDING_SETTLEMENT: '待结算',
    SETTLED: '已结算',
    CANCELLED: '已取消',
  };
  return map[status] ?? status;
}

function formatTime(raw: string | null | undefined) {
  if (!raw) return '-';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toggleSelect(commission: Commission) {
  if (commission.status !== 'PENDING_SETTLEMENT') return;
  const idx = selectedIds.value.indexOf(commission.id);
  if (idx > -1) {
    selectedIds.value.splice(idx, 1);
  } else {
    selectedIds.value.push(commission.id);
  }
}

function toggleSelectAll() {
  const selectable = pendingCommissions.value.map((c) => c.id);
  if (isAllSelected.value) {
    selectedIds.value = selectedIds.value.filter((id) => !selectable.includes(id));
  } else {
    selectedIds.value = Array.from(new Set([...selectedIds.value, ...selectable]));
  }
}

function openDetail(commission: Commission) {
  detailDialog.commission = commission;
  detailDialog.open = true;
}

async function settleOne(commission: Commission) {
  try {
    await ElMessageBox.confirm(
      `确定要结算该笔佣金 ¥${Number(commission.commissionAmount).toFixed(2)} 吗？`,
      '结算确认',
      { confirmButtonText: '确认结算', cancelButtonText: '取消', type: 'warning' },
    );
    saving.value = true;
    await settleLeaderCommission(commission.id);
    ElMessage.success('佣金结算成功');
    await loadData();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '结算失败');
    }
  } finally {
    saving.value = false;
  }
}

async function batchSettle() {
  if (!selectedIds.value.length) return;
  try {
    await ElMessageBox.confirm(
      `确定要批量结算已选的 ${selectedIds.value.length} 笔佣金吗？`,
      '批量结算确认',
      { confirmButtonText: '确认结算', cancelButtonText: '取消', type: 'warning' },
    );
    saving.value = true;
    const res = await batchSettleLeaderCommissions(selectedIds.value);
    ElMessage.success(`批量结算成功，共结算 ${res?.settledCount ?? selectedIds.value.length} 笔`);
    await loadData();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '批量结算失败');
    }
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.filter-grid.compact {
  gap: 8px;
  margin-bottom: 12px;
}
.filter-field.compact {
  gap: 4px;
}
.filter-field.compact span {
  font-size: 11px;
}
.filter-field.compact input,
.filter-field.compact select {
  min-height: 32px;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 13px;
}
.primary-btn.compact,
.ghost-btn.compact {
  height: 32px;
  padding: 0 12px;
  font-size: 13px;
  border-radius: 8px;
}
.batch-toolbar.compact {
  padding: 8px 10px;
  min-height: 36px;
}
.row-actions.wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-width: 140px;
}

.commission-detail-dialog :deep(.el-dialog__body) {
  padding-top: 6px;
  padding-bottom: 6px;
}
.detail-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.detail-row {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #ffffff;
}
.detail-row span {
  color: var(--muted);
  font-size: 11px;
}
.detail-row strong {
  font-size: 13px;
  word-break: break-word;
}
.empty-hint {
  text-align: center;
  color: var(--muted);
  padding: 40px 0;
}
</style>
