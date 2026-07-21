<template>
  <div class="page-stack">
    <StatGrid :cards="summaryCards" />

    <section class="panel">
      <div class="panel-head compact">
        <div>
          <h2>拼团管理</h2>
          <p>查看所有拼团实例的进度与成团/失败情况，名额只在用户支付成功后才会计入。</p>
        </div>
        <div class="top-actions">
          <RefreshDataButton :loading="loading" compact @refresh="handleRefreshData" />
        </div>
      </div>

      <div class="filter-grid compact">
        <label class="filter-field compact">
          <span>关键词</span>
          <input
            v-model="filters.keyword"
            class="compact"
            placeholder="团号 / 邀请码 / 商品名称"
            @keyup.enter="applyFilters"
          />
        </label>
        <label class="filter-field compact">
          <span>状态</span>
          <select v-model="filters.status" class="compact" @change="applyFilters">
            <option value="">全部状态</option>
            <option value="OPEN">进行中</option>
            <option value="COMPLETED">已成团</option>
            <option value="FAILED">已失败</option>
          </select>
        </label>
        <div class="filter-actions">
          <button type="button" class="ghost-btn compact" :disabled="!hasFilters" @click="resetFilters">
            重置筛选
          </button>
          <button type="button" class="primary-btn compact" @click="applyFilters">查询</button>
        </div>
      </div>

      <div class="table-x">
        <table class="data-table">
          <thead>
            <tr>
              <th>团号</th>
              <th>商品</th>
              <th>发起人</th>
              <th>进度</th>
              <th>拼团价 / 原价</th>
              <th>状态</th>
              <th>截止时间</th>
              <th>创建时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="group in groups" :key="group.groupId">
              <td data-label="团号">
                <div class="group-no">{{ group.groupNo }}</div>
                <div class="group-invite" v-if="group.inviteCode">邀请码 {{ group.inviteCode }}</div>
              </td>
              <td data-label="商品">
                <div class="product-cell">
                  <img v-if="group.coverUrl" :src="group.coverUrl" class="product-cover" />
                  <span>{{ group.productTitle }}</span>
                </div>
              </td>
              <td data-label="发起人">{{ group.initiatorName }}</td>
              <td data-label="进度">
                <div class="progress-cell">
                  <div class="progress-bar">
                    <div class="progress-fill" :style="{ width: `${progressPercent(group)}%` }"></div>
                  </div>
                  <span>{{ group.memberCount }}/{{ group.needed }} 人</span>
                </div>
              </td>
              <td data-label="拼团价/原价">
                <strong>¥{{ group.groupPrice }}</strong>
                <span class="origin-price">¥{{ group.originPrice }}</span>
              </td>
              <td data-label="状态">
                <span :class="['status', statusClass(group.status)]">{{ statusText(group.status) }}</span>
              </td>
              <td data-label="截止时间">{{ formatTime(group.expireAt) }}</td>
              <td data-label="创建时间">{{ group.createdAt }}</td>
            </tr>
            <tr v-if="!groups.length">
              <td colspan="8" class="empty-hint">暂无拼团记录</td>
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
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';

import { getGroupBuys, type AdminGroupBuyRow } from '@/api/admin';
import StatGrid from '@/components/StatGrid.vue';
import RefreshDataButton from '@/components/RefreshDataButton.vue';
import { refreshWithFeedback } from '@/utils/refresh-feedback';

const refreshApi = inject<{
  register: (handler: () => void | Promise<void>) => () => void;
  tick: { value: number };
} | null>('admin-refresh', null);

const groups = ref<AdminGroupBuyRow[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const pageInput = ref(1);
const loading = ref(false);
const stats = reactive({ OPEN: 0, COMPLETED: 0, FAILED: 0 });

const filters = reactive({
  keyword: '',
  status: '',
});

const hasFilters = computed(() => Boolean(filters.keyword || filters.status));
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));

const summaryCards = computed(() => {
  const successRateBase = stats.COMPLETED + stats.FAILED;
  const successRate = successRateBase > 0 ? ((stats.COMPLETED / successRateBase) * 100).toFixed(1) : '-';
  return [
    { title: '进行中', value: stats.OPEN, note: '<span class="mini-warn">等待成团</span>' },
    { title: '已成团', value: stats.COMPLETED, note: '已支付人数满员' },
    { title: '已失败', value: stats.FAILED, note: '超时/未满员，已自动退款' },
    { title: '成团率', value: successRateBase > 0 ? `${successRate}%` : '-', note: '已成团 / (已成团 + 已失败)' },
  ];
});

onMounted(() => {
  void loadData();
  if (refreshApi) {
    const unregister = refreshApi.register(() => {
      void loadData();
    });
    onBeforeUnmount(() => unregister());
  }
});

async function loadData(): Promise<boolean> {
  loading.value = true;
  try {
    const res = await getGroupBuys({
      page: page.value,
      pageSize: pageSize.value,
      keyword: filters.keyword,
      status: filters.status,
    });
    groups.value = res.items ?? [];
    total.value = res.total ?? 0;
    stats.OPEN = res.stats?.OPEN ?? 0;
    stats.COMPLETED = res.stats?.COMPLETED ?? 0;
    stats.FAILED = res.stats?.FAILED ?? 0;
    pageInput.value = page.value;
    return true;
  } catch (error: any) {
    ElMessage.error(error.message || '加载拼团列表失败');
    return false;
  } finally {
    loading.value = false;
  }
}

function handleRefreshData() {
  void refreshWithFeedback(() => loadData());
}

function applyFilters() {
  page.value = 1;
  void loadData();
}

function resetFilters() {
  filters.keyword = '';
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

function progressPercent(group: AdminGroupBuyRow) {
  return Math.min(100, Math.round((group.memberCount / Math.max(group.needed, 1)) * 100));
}

function statusClass(status: string) {
  switch (status) {
    case 'COMPLETED':
      return 'ok';
    case 'OPEN':
      return 'warn';
    case 'FAILED':
      return 'danger';
    default:
      return '';
  }
}

function statusText(status: string) {
  const map: Record<string, string> = {
    OPEN: '进行中',
    COMPLETED: '已成团',
    FAILED: '已失败',
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
</script>

<style scoped>
.filter-grid.compact {
  gap: 8px;
  margin-bottom: 12px;
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
.group-no {
  font-weight: 600;
}
.group-invite {
  margin-top: 2px;
  font-size: 11px;
  color: var(--muted);
}
.product-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}
.product-cover {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
  background: #f2f2f2;
}
.progress-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 110px;
}
.progress-bar {
  height: 6px;
  border-radius: 999px;
  background: #f0f0f0;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #3f6f44, #c65f2d);
}
.origin-price {
  margin-left: 6px;
  font-size: 12px;
  color: var(--muted);
  text-decoration: line-through;
}
.empty-hint {
  text-align: center;
  color: var(--muted);
  padding: 40px 0;
}
</style>
