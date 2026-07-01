<template>
  <div class="page-stack">
    <StatGrid :cards="summaryCards" />

    <el-card class="panel exchange-panel">
      <template #header>
        <div class="panel-head compact">
          <div>
            <h2>{{ pageTitle }}</h2>
            <p>{{ pageSubtitle }}</p>
          </div>
          <div class="top-actions">
            <el-button @click="reload">刷新</el-button>
            <el-button type="primary" @click="openCreateDialog">{{ createButtonLabel }}</el-button>
          </div>
        </div>
      </template>

      <div class="toolbar">
        <div class="toolbar-left">
          <el-input
            v-model="searchKeyword"
            clearable
            class="toolbar-search"
            placeholder="搜索名称 / 适用范围 / 类目"
            @keyup.enter="applyKeyword"
          />
          <el-select v-model="statusFilter" class="toolbar-select" clearable placeholder="状态">
            <el-option label="启用" value="ENABLED" />
            <el-option label="停用" value="DISABLED" />
            <el-option label="草稿" value="DRAFT" />
          </el-select>
          <el-select v-if="!forcedMode" v-model="kindFilter" class="toolbar-select" clearable placeholder="兑换类型">
            <el-option label="全部兑换项" value="" />
            <el-option label="兑换券" value="COUPON" />
            <el-option label="兑换商品" value="PRODUCT" />
          </el-select>
        </div>
        <div class="toolbar-right">
          <el-button @click="resetFilters">重置筛选</el-button>
        </div>
      </div>

      <el-tabs v-if="!forcedMode" v-model="kindTab" class="kind-tabs">
        <el-tab-pane label="全部" name="ALL" />
        <el-tab-pane label="兑换券" name="COUPON" />
        <el-tab-pane label="兑换商品" name="PRODUCT" />
      </el-tabs>

      <el-table v-loading="loading" :data="visibleRows" stripe border class="exchange-table">
        <el-table-column prop="name" label="名称" min-width="180" />
        <el-table-column label="兑换类型" width="120">
          <template #default="{ row }">
            <el-tag :type="exchangeKindTagType(exchangeKindOf(row))" round>
              {{ exchangeKindLabel(exchangeKindOf(row)) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="面额" width="120">
          <template #default="{ row }">¥{{ moneyOf(row.discountAmount) }}</template>
        </el-table-column>
        <el-table-column label="需要积分" width="120">
          <template #default="{ row }">{{ pointsCostOf(row) }} 分</template>
        </el-table-column>
        <el-table-column label="门槛" width="120">
          <template #default="{ row }">¥{{ moneyOf(row.thresholdAmount) }}</template>
        </el-table-column>
        <el-table-column label="适用范围" min-width="180">
          <template #default="{ row }">{{ scopeLabel(row) }}</template>
        </el-table-column>
        <el-table-column label="库存" width="120">
          <template #default="{ row }">
            {{ row.remainingStock }} / {{ row.stock }}
          </template>
        </el-table-column>
        <el-table-column label="有效期" min-width="180">
          <template #default="{ row }">
            {{ formatWindow(row.validStartAt, row.validEndAt) }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="row.status === 'ENABLED' ? 'success' : row.status === 'DISABLED' ? 'info' : 'warning'">
              {{ row.status === 'ENABLED' ? '启用' : row.status === 'DISABLED' ? '停用' : '草稿' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <div class="row-actions">
              <el-button link type="primary" @click="openEditDialog(row)">编辑</el-button>
              <el-button link :type="row.status === 'ENABLED' ? 'warning' : 'success'" @click="toggleStatus(row)">
                {{ row.status === 'ENABLED' ? '下架' : '上架' }}
              </el-button>
              <el-button link type="danger" @click="removeItem(row)">删除</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="!visibleRows.length && !loading" class="empty-state compact">
        <strong>暂无兑换数据</strong>
        <span>先创建一个兑换券或兑换商品，前台就能开始展示。</span>
      </div>
    </el-card>

    <el-dialog
      v-model="dialog.open"
      :title="dialog.mode === 'edit' ? editDialogTitle : createDialogTitle"
      width="900px"
      align-center
      destroy-on-close
    >
      <el-form :model="form" label-position="top" class="exchange-form">
        <el-form-item label="兑换名称" required>
          <el-input v-model.trim="form.name" placeholder="如：积分兑换 10 元券 / 20 元专区券" />
        </el-form-item>
        <el-form-item label="兑换类型" required>
          <el-select v-model="form.exchangeKind" :disabled="!!forcedMode">
            <el-option label="兑换券" value="COUPON" />
            <el-option label="兑换商品" value="PRODUCT" />
          </el-select>
        </el-form-item>
        <el-form-item label="面额 / 价值" required>
          <el-input v-model.trim="form.discountAmount" placeholder="例如 10.00" />
        </el-form-item>
        <el-form-item label="门槛金额">
          <el-input v-model.trim="form.thresholdAmount" placeholder="例如 0.00" />
        </el-form-item>
        <el-form-item label="库存" required>
          <el-input-number v-model="form.stock" :min="0" :step="1" class="full-width" />
        </el-form-item>
        <el-form-item label="每人限领">
          <el-input-number v-model="form.perUserLimit" :min="1" :step="1" class="full-width" />
        </el-form-item>
        <el-form-item label="开始时间">
          <DateTimeField
            v-model="form.validStartAt"
            value-format="YYYY-MM-DDTHH:mm:ss"
            placeholder="立即生效可留空"
          />
        </el-form-item>
        <el-form-item label="结束时间">
          <DateTimeField
            v-model="form.validEndAt"
            value-format="YYYY-MM-DDTHH:mm:ss"
            placeholder="长期有效可留空"
          />
        </el-form-item>
        <el-form-item label="适用范围" required>
          <el-select v-model="form.scope">
            <el-option label="全部商品" value="ALL" />
            <el-option label="指定类目" value="CATEGORY" />
            <el-option label="指定店铺" value="SHOP" />
            <el-option label="类目 + 店铺" value="CATEGORY_SHOP" />
          </el-select>
        </el-form-item>
        <el-form-item label="上架状态" required>
          <el-select v-model="form.status">
            <el-option label="启用" value="ENABLED" />
            <el-option label="停用" value="DISABLED" />
            <el-option label="草稿" value="DRAFT" />
          </el-select>
        </el-form-item>
        <el-form-item label="需要积分">
          <el-input :model-value="String(pointsPreview)" disabled />
        </el-form-item>
        <el-form-item v-if="needsCategorySelection" label="适用类目">
          <el-select v-model="form.categoryIds" multiple filterable collapse-tags collapse-tags-tooltip placeholder="选择类目">
            <el-option v-for="item in categoryOptions" :key="item.id" :label="item.label" :value="String(item.id)" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="needsMerchantSelection" label="适用店铺">
          <el-select v-model="form.merchantIds" multiple filterable collapse-tags collapse-tags-tooltip placeholder="选择店铺">
            <el-option v-for="item in merchantOptions" :key="item.id" :label="item.label" :value="String(item.id)" />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialog.open = false">取消</el-button>
          <el-button type="primary" :loading="saving" @click="submitForm">
            {{ dialog.mode === 'edit' ? saveButtonLabel : createButtonLabel }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

import {
  createExchangeCoupon,
  deleteExchangeCoupon,
  getExchangeCoupons,
  getMerchants,
  getSettings,
  getCatalogCategories,
  updateExchangeCoupon,
  updateExchangeCouponStatus,
} from '@/api/admin';
import StatGrid from '@/components/StatGrid.vue';
import DateTimeField from '@/components/DateTimeField.vue';

type ExchangeKind = 'COUPON' | 'PRODUCT';
type ExchangeScope = 'ALL' | 'CATEGORY' | 'SHOP' | 'CATEGORY_SHOP';

type ExchangeRow = {
  id: number;
  name: string;
  type: string;
  thresholdAmount: string;
  discountAmount: string;
  stock: number;
  issuedStock: number;
  remainingStock: number;
  validStartAt: string;
  validEndAt: string;
  scope: string;
  perUserLimit: number;
  status: string;
  ruleJson?: Record<string, unknown> | null;
};

type SelectOption = { id: number; label: string };

const props = defineProps<{
  defaultMode?: ExchangeKind;
}>();

const refreshApi = inject<{
  register: (handler: () => void | Promise<void>) => () => void;
  tick: { value: number };
} | null>('admin-refresh', null);

const loading = ref(false);
const saving = ref(false);
const rows = ref<ExchangeRow[]>([]);
const searchKeyword = ref('');
const statusFilter = ref('');
const kindFilter = ref('');
const kindTab = ref<'ALL' | ExchangeKind>(props.defaultMode ?? 'ALL');
const redeemRate = ref(100);
const categoryOptions = ref<SelectOption[]>([]);
const merchantOptions = ref<SelectOption[]>([]);
let unregisterRefresh: (() => void) | null = null;

const dialog = reactive({
  open: false,
  mode: 'create' as 'create' | 'edit',
  editId: null as number | null,
});

const form = reactive({
  name: '',
  exchangeKind: 'COUPON' as ExchangeKind,
  thresholdAmount: '0.00',
  discountAmount: '10.00',
  stock: 100,
  perUserLimit: 1,
  validStartAt: '',
  validEndAt: '',
  scope: 'ALL' as ExchangeScope,
  categoryIds: [] as string[],
  merchantIds: [] as string[],
  status: 'ENABLED',
});

const summaryCards = computed(() => {
  const total = rows.value.length;
  const enabled = rows.value.filter((row) => row.status === 'ENABLED').length;
  const coupons = rows.value.filter((row) => exchangeKindOf(row) === 'COUPON').length;
  const products = rows.value.filter((row) => exchangeKindOf(row) === 'PRODUCT').length;

  return [
    { title: '兑换项总数', value: total, note: '全部可配置兑换项' },
    { title: '已启用', value: enabled, note: enabled > 0 ? '正在前台可兑' : '暂无启用项' },
    { title: '兑换券', value: coupons, note: '可配置券类兑换' },
    { title: '兑换商品', value: products, note: '可配置商品类兑换' },
  ];
});

const visibleRows = computed(() => {
  let list = rows.value.slice();

  if (forcedMode.value) {
    list = list.filter((row) => exchangeKindOf(row) === forcedMode.value);
  }

  if (kindTab.value !== 'ALL') {
    list = list.filter((row) => exchangeKindOf(row) === kindTab.value);
  }

  if (kindFilter.value) {
    list = list.filter((row) => exchangeKindOf(row) === kindFilter.value);
  }

  if (statusFilter.value) {
    list = list.filter((row) => row.status === statusFilter.value);
  }

  const kw = searchKeyword.value.trim().toLowerCase();
  if (kw) {
    list = list.filter((row) => {
      const scopeText = scopeLabel(row).toLowerCase();
      const kindText = exchangeKindLabel(exchangeKindOf(row)).toLowerCase();
      return [row.name, row.scope, scopeText, kindText].some((value) => String(value ?? '').toLowerCase().includes(kw));
    });
  }

  return list.sort((a, b) => Number(b.id) - Number(a.id));
});

const pointsPreview = computed(() => {
  return Math.max(Math.ceil(Number(form.discountAmount || 0) * redeemRate.value), redeemRate.value);
});

const needsCategorySelection = computed(() => ['CATEGORY', 'CATEGORY_SHOP'].includes(form.scope));
const needsMerchantSelection = computed(() => ['SHOP', 'CATEGORY_SHOP'].includes(form.scope));
const forcedMode = computed(() => props.defaultMode ?? '');
const pageTitle = computed(() => {
  if (forcedMode.value === 'PRODUCT') return '兑换商品管理';
  if (forcedMode.value === 'COUPON') return '兑换券管理';
  return '兑换中心';
});
const pageSubtitle = computed(() => {
  if (forcedMode.value === 'PRODUCT') return '管理可兑换的商品类目、库存、上下架和条件配置。';
  if (forcedMode.value === 'COUPON') return '管理积分兑换券、门槛、库存和适用条件。';
  return '统一管理积分兑换券、兑换商品和可上架兑换项，所有条件都通过选择器配置，不需要手填 ID。';
});
const createButtonLabel = computed(() => (forcedMode.value === 'PRODUCT' ? '新增兑换商品' : forcedMode.value === 'COUPON' ? '新增兑换券' : '新增兑换项'));
const createDialogTitle = computed(() => (forcedMode.value === 'PRODUCT' ? '新增兑换商品' : forcedMode.value === 'COUPON' ? '新增兑换券' : '新增兑换项'));
const editDialogTitle = computed(() => (forcedMode.value === 'PRODUCT' ? '编辑兑换商品' : forcedMode.value === 'COUPON' ? '编辑兑换券' : '编辑兑换项'));
const saveButtonLabel = computed(() => (forcedMode.value === 'PRODUCT' ? '保存商品' : forcedMode.value === 'COUPON' ? '保存券' : '保存修改'));

onMounted(async () => {
  await Promise.all([loadSettings(), loadCatalog(), loadMerchants(), loadData()]);
  if (refreshApi) {
    unregisterRefresh = refreshApi.register(() => loadData());
  }
});

onBeforeUnmount(() => {
  unregisterRefresh?.();
  unregisterRefresh = null;
});

watch(kindTab, () => {
  kindFilter.value = '';
});

watch(
  () => props.defaultMode,
  (value) => {
    kindTab.value = value ?? 'ALL';
    kindFilter.value = '';
  },
);

async function loadData() {
  loading.value = true;
  try {
    const data = await getExchangeCoupons({ page: 1, pageSize: 100 });
    rows.value = (data.items ?? []).filter((item) => String(item.type ?? '').toUpperCase() === 'CASHBACK');
  } catch (error: any) {
    ElMessage.error(error.message || '加载兑换中心失败');
  } finally {
    loading.value = false;
  }
}

async function loadSettings() {
  try {
    const settings = await getSettings();
    const rate = Number(settings.pointsRedeemRate ?? 100);
    redeemRate.value = Number.isFinite(rate) && rate > 0 ? rate : 100;
  } catch {
    redeemRate.value = 100;
  }
}

async function loadCatalog() {
  try {
    const data = await getCatalogCategories();
    categoryOptions.value = flattenCategories(data);
  } catch {
    categoryOptions.value = [];
  }
}

async function loadMerchants() {
  try {
    const data = await getMerchants({ page: 1, pageSize: 500 });
    merchantOptions.value = (data.items ?? []).map((item) => ({
      id: Number(item.id),
      label: `${item.storeName || `商户${item.id}`} · ${item.contactName || item.mobile || ''}`.trim(),
    }));
  } catch {
    merchantOptions.value = [];
  }
}

function flattenCategories(input: Array<{ id: number; name: string; children?: Array<{ id: number; name: string; children?: unknown }> }>, prefix = ''): SelectOption[] {
  const result: SelectOption[] = [];
  for (const item of input) {
    const label = prefix ? `${prefix}/${item.name}` : item.name;
    result.push({ id: Number(item.id), label });
    if (Array.isArray(item.children) && item.children.length) {
      result.push(...flattenCategories(item.children as any, label));
    }
  }
  return result;
}

function openCreateDialog() {
  dialog.mode = 'create';
  dialog.editId = null;
  resetForm();
  dialog.open = true;
}

function openEditDialog(row: ExchangeRow) {
  dialog.mode = 'edit';
  dialog.editId = row.id;
  form.name = row.name;
  form.exchangeKind = exchangeKindOf(row);
  form.thresholdAmount = moneyOf(row.thresholdAmount);
  form.discountAmount = moneyOf(row.discountAmount);
  form.stock = Number(row.stock ?? 0);
  form.perUserLimit = Number(row.perUserLimit ?? 1);
  form.validStartAt = row.validStartAt ? row.validStartAt.slice(0, 19) : '';
  form.validEndAt = row.validEndAt ? row.validEndAt.slice(0, 19) : '';
  form.scope = String(row.scope ?? 'ALL') as ExchangeScope;
  form.categoryIds = Array.isArray(row.ruleJson?.categoryIds) ? row.ruleJson.categoryIds.map((id) => String(id)) : [];
  form.merchantIds = Array.isArray(row.ruleJson?.merchantIds) ? row.ruleJson.merchantIds.map((id) => String(id)) : [];
  form.status = row.status;
  dialog.open = true;
}

function resetForm() {
  form.name = '';
  form.exchangeKind = forcedMode.value || 'COUPON';
  form.thresholdAmount = '0.00';
  form.discountAmount = '10.00';
  form.stock = 100;
  form.perUserLimit = 1;
  form.validStartAt = '';
  form.validEndAt = '';
  form.scope = 'ALL';
  form.categoryIds = [];
  form.merchantIds = [];
  form.status = 'ENABLED';
}

function exchangeKindOf(row: ExchangeRow): ExchangeKind {
  const kind = String(row.ruleJson?.exchangeKind ?? 'COUPON').toUpperCase();
  return kind === 'PRODUCT' ? 'PRODUCT' : 'COUPON';
}

function exchangeKindLabel(kind: ExchangeKind) {
  return kind === 'PRODUCT' ? '兑换商品' : '兑换券';
}

function exchangeKindTagType(kind: ExchangeKind) {
  return kind === 'PRODUCT' ? 'warning' : 'success';
}

function moneyOf(value: string | number | null | undefined) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num.toFixed(2) : '0.00';
}

function pointsCostOf(row: ExchangeRow) {
  return Math.max(Math.ceil(Number(row.discountAmount ?? 0) * redeemRate.value), redeemRate.value);
}

function scopeLabel(row: ExchangeRow) {
  const scope = String(row.scope ?? 'ALL').toUpperCase();
  const categories = Array.isArray(row.ruleJson?.categoryIds)
    ? row.ruleJson.categoryIds.map((id) => categoryNameById(Number(id))).filter(Boolean)
    : [];
  const merchants = Array.isArray(row.ruleJson?.merchantIds)
    ? row.ruleJson.merchantIds.map((id) => merchantNameById(Number(id))).filter(Boolean)
    : [];

  if (scope === 'CATEGORY_SHOP') {
    const pieces = [];
    if (categories.length) pieces.push(`类目: ${categories.join('、')}`);
    if (merchants.length) pieces.push(`店铺: ${merchants.join('、')}`);
    return pieces.length ? pieces.join(' / ') : '类目 + 店铺';
  }
  if (scope === 'CATEGORY') {
    return categories.length ? `类目: ${categories.join('、')}` : '指定类目';
  }
  if (scope === 'SHOP') {
    return merchants.length ? `店铺: ${merchants.join('、')}` : '指定店铺';
  }
  return '全部商品';
}

function formatWindow(startAt: string, endAt: string) {
  const start = startAt ? startAt.slice(0, 16).replace('T', ' ') : '立即';
  const end = endAt ? endAt.slice(0, 16).replace('T', ' ') : '长期';
  return `${start} - ${end}`;
}

function categoryNameById(id: number) {
  return categoryOptions.value.find((item) => item.id === id)?.label || `类目${id}`;
}

function merchantNameById(id: number) {
  return merchantOptions.value.find((item) => item.id === id)?.label || `店铺${id}`;
}

async function submitForm() {
  if (!form.name.trim()) {
    ElMessage.warning('请填写兑换名称');
    return;
  }
  if (!form.discountAmount.trim()) {
    ElMessage.warning('请填写面额 / 价值');
    return;
  }

  saving.value = true;
  const payload = {
    name: form.name.trim(),
    type: 'CASHBACK',
    thresholdAmount: form.thresholdAmount.trim() || '0.00',
    discountAmount: form.discountAmount.trim(),
    stock: Number(form.stock || 0),
    perUserLimit: Number(form.perUserLimit || 1),
    validStartAt: form.validStartAt ? new Date(form.validStartAt).toISOString() : null,
    validEndAt: form.validEndAt ? new Date(form.validEndAt).toISOString() : null,
    scope: form.scope,
    categoryIds: form.categoryIds,
    merchantIds: form.merchantIds,
    ruleJson: {
      exchangeKind: form.exchangeKind,
    },
    status: form.status,
  };

  try {
    if (dialog.mode === 'edit' && dialog.editId != null) {
      await updateExchangeCoupon(dialog.editId, payload);
      ElMessage.success('兑换项已更新');
    } else {
      await createExchangeCoupon(payload);
      ElMessage.success('兑换项已创建');
    }
    dialog.open = false;
    await loadData();
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败');
  } finally {
    saving.value = false;
  }
}

async function toggleStatus(row: ExchangeRow) {
    const nextStatus = row.status === 'ENABLED' ? 'DISABLED' : 'ENABLED';
  try {
    await updateExchangeCouponStatus(row.id, nextStatus);
    ElMessage.success(`已切换为${nextStatus === 'ENABLED' ? '上架' : '下架'}`);
    await loadData();
  } catch (error: any) {
    ElMessage.error(error.message || '状态切换失败');
  }
}

async function removeItem(row: ExchangeRow) {
  try {
    await ElMessageBox.confirm(`确定删除「${row.name}」吗？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    });
    await deleteExchangeCoupon(row.id);
    ElMessage.success('已删除');
    await loadData();
  } catch {
    // ignore cancel
  }
}

function resetFilters() {
  searchKeyword.value = '';
  statusFilter.value = '';
  kindFilter.value = '';
  kindTab.value = 'ALL';
}

function applyKeyword() {
  // template binding only
}

function reload() {
  void loadData();
}
</script>

<style scoped>
.exchange-panel {
  overflow: hidden;
}

.panel-head.compact {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.top-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
}

.toolbar-left {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.toolbar-search {
  width: 260px;
}

.toolbar-select {
  width: 160px;
}

.kind-tabs {
  margin-bottom: 8px;
}

.exchange-table :deep(.el-table__inner-wrapper) {
  border-radius: 12px;
}

.row-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.exchange-form {
  max-height: 70vh;
  overflow: auto;
  padding-right: 8px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.form-grid--wide {
  margin-top: 4px;
}

.full-width {
  width: 100%;
}

:deep(.el-select),
:deep(.el-date-editor) {
  width: 100%;
}
</style>
