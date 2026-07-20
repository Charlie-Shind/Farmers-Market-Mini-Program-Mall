<template>
  <div class="page-stack">
    <StatGrid :cards="summaryCards" />

    <section class="panel">
      <div class="panel-head compact">
        <div>
          <h2>自提点管理</h2>
          <p>管理平台自提点信息、绑定团长、启停状态与新增维护。</p>
        </div>
        <div class="top-actions">
          <RefreshDataButton :loading="loading" compact @refresh="handleRefreshData" />
          <button
            type="button"
            class="ghost-btn compact danger-text"
            :disabled="!selectedIds.length || saving"
            @click="batchDelete"
          >
            批量删除
          </button>
          <button type="button" class="primary-btn compact" @click="openCreate">新增自提点</button>
        </div>
      </div>

      <div class="filter-grid compact">
        <label class="filter-field compact">
          <span>关键词</span>
          <input v-model.trim="filters.keyword" class="compact" placeholder="名称 / 地址 / 联系人" @keyup.enter="applyFilters" />
        </label>
        <label class="filter-field compact">
          <span>城市</span>
          <input v-model.trim="filters.city" class="compact" placeholder="如：广州" @keyup.enter="applyFilters" />
        </label>
        <label class="filter-field compact">
          <span>区县</span>
          <input v-model.trim="filters.district" class="compact" placeholder="如：天河" @keyup.enter="applyFilters" />
        </label>
        <label class="filter-field compact">
          <span>状态</span>
          <select v-model="filters.status" class="compact" @change="applyFilters">
            <option value="">全部状态</option>
            <option value="ENABLED">启用</option>
            <option value="DISABLED">停用</option>
          </select>
        </label>
        <div class="filter-actions">
          <button type="button" class="ghost-btn compact" :disabled="!hasFilters" @click="resetFilters">
            重置筛选
          </button>
          <button type="button" class="primary-btn compact" @click="applyFilters">查询</button>
        </div>
      </div>

      <div class="table-x pickup-table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th class="check-cell">
                <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" />
              </th>
              <th>ID</th>
              <th>自提点名称</th>
              <th>关联团长</th>
              <th>所在地区</th>
              <th>详细地址</th>
              <th>营业时间</th>
              <th>来源</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="point in pickupPoints" :key="point.id">
              <td class="check-cell">
                <input
                  type="checkbox"
                  :checked="selectedIds.includes(point.id)"
                  @change="toggleSelect(point.id)"
                />
              </td>
              <td data-label="ID">{{ point.id }}</td>
              <td data-label="自提点名称">
                <div class="cell-main plain">
                  <strong>{{ point.name }}</strong>
                  <span v-if="point.contactName || point.contactMobile">{{ point.contactName }} {{ point.contactMobile }}</span>
                </div>
              </td>
              <td data-label="关联团长">
                {{ point.leader ? `${point.leader.realName} (#${point.leader.id})` : '未绑定' }}
              </td>
              <td data-label="所在地区">
                <span class="pickup-address" :title="formatRegion(point)">
                  {{ formatRegion(point) || '待完善' }}
                </span>
              </td>
              <td data-label="详细地址">
                <span class="pickup-address" :title="decodeDisplayText(point.detailAddress)">
                  {{ decodeDisplayText(point.detailAddress) || '待完善' }}
                </span>
              </td>
              <td data-label="营业时间">{{ point.businessHours || '-' }}</td>
              <td data-label="来源">{{ point.source || '-' }}</td>
              <td data-label="状态">
                <span :class="['status', point.status === 'ENABLED' ? 'ok' : 'danger']"
                  >{{ point.status === 'ENABLED' ? '启用' : '停用' }}</span
                >
              </td>
              <td data-label="操作">
                <div class="row-actions wrap">
                  <button type="button" class="ghost-btn compact" @click="openEdit(point)">编辑</button>
                  <button type="button" class="ghost-btn compact" @click="toggleStatus(point)">
                    {{ point.status === 'ENABLED' ? '停用' : '启用' }}
                  </button>
                  <button type="button" class="ghost-btn compact danger-text" @click="confirmDelete(point)">删除</button>
                </div>
              </td>
            </tr>
            <tr v-if="!pickupPoints.length">
              <td colspan="10" class="empty-hint">暂无自提点记录</td>
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

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      v-model="formDialog.open"
      :title="formDialog.isEdit ? '编辑自提点' : '新增自提点'"
      width="560px"
      align-center
      destroy-on-close
      class="pickup-form-dialog"
    >
      <div class="form-body">
        <label class="form-field compact">
          <span>自提点名称 <span class="required">*</span></span>
          <input v-model.trim="formDialog.form.name" class="compact" type="text" placeholder="如：某某小区自提点" />
        </label>
        <label class="form-field compact">
          <span>关联团长 ID</span>
          <input v-model.number="formDialog.form.leaderId" class="compact" type="number" placeholder="选填，绑定已有团长" />
        </label>
        <div class="form-grid compact-2">
          <label class="form-field compact">
            <span>联系人</span>
            <input v-model.trim="formDialog.form.contactName" class="compact" type="text" placeholder="联系人姓名" />
          </label>
          <label class="form-field compact">
            <span>联系电话</span>
            <input v-model.trim="formDialog.form.contactMobile" class="compact" type="text" placeholder="手机号" />
          </label>
        </div>
        <div class="form-grid compact-3">
          <label class="form-field compact">
            <span>省 <span class="required">*</span></span>
            <input v-model.trim="formDialog.form.province" class="compact" type="text" placeholder="省" />
          </label>
          <label class="form-field compact">
            <span>市 <span class="required">*</span></span>
            <input v-model.trim="formDialog.form.city" class="compact" type="text" placeholder="市" />
          </label>
          <label class="form-field compact">
            <span>区县</span>
            <input v-model.trim="formDialog.form.district" class="compact" type="text" placeholder="区县" />
          </label>
        </div>
        <label class="form-field compact">
          <span>详细地址 <span class="required">*</span></span>
          <input v-model.trim="formDialog.form.detailAddress" class="compact" type="text" placeholder="街道门牌等详细地址" />
        </label>
        <div class="form-grid compact-3">
          <label class="form-field compact">
            <span>经度</span>
            <input v-model.number="formDialog.form.longitude" class="compact" type="number" step="0.0000001" placeholder="经度" />
          </label>
          <label class="form-field compact">
            <span>纬度</span>
            <input v-model.number="formDialog.form.latitude" class="compact" type="number" step="0.0000001" placeholder="纬度" />
          </label>
          <label class="form-field compact">
            <span>营业时间</span>
            <input v-model.trim="formDialog.form.businessHours" class="compact" type="text" placeholder="如 09:00-21:00" />
          </label>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button size="small" @click="formDialog.open = false">取消</el-button>
          <el-button size="small" type="primary" :loading="saving" @click="submitForm">保存</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

import {
  createPickupPoint,
  deletePickupPoint,
  getPickupPoints,
  updatePickupPoint,
  updatePickupPointStatus,
} from '@/api/admin';
import StatGrid from '@/components/StatGrid.vue';
import RefreshDataButton from '@/components/RefreshDataButton.vue';
import { refreshWithFeedback } from '@/utils/refresh-feedback';

function decodeDisplayText(value: string | null | undefined): string {
  if (!value) return '';
  const raw = String(value).trim();
  if (!raw) return '';
  if (!/%[0-9A-Fa-f]{2}/.test(raw)) return raw;
  try {
    return decodeURIComponent(raw.replace(/\+/g, ' '));
  } catch {
    return raw;
  }
}

function formatRegion(point: PickupPoint): string {
  return [point.province, point.city, point.district]
    .filter(Boolean)
    .map((part) => decodeDisplayText(part))
    .join(' / ');
}

const refreshApi = inject<{
  register: (handler: () => void | Promise<void>) => () => void;
  tick: { value: number };
} | null>('admin-refresh', null);

interface PickupPointLeader {
  id: number;
  realName: string;
  mobile: string;
}

interface PickupPoint {
  id: number;
  leaderId: number | null;
  name: string;
  contactName: string | null;
  contactMobile: string | null;
  province: string;
  city: string;
  district: string | null;
  detailAddress: string;
  longitude: number | null;
  latitude: number | null;
  businessHours: string | null;
  status: 'ENABLED' | 'DISABLED';
  source: string;
  createdAt: string;
  updatedAt: string;
  leader: PickupPointLeader | null;
}

const pickupPoints = ref<PickupPoint[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const pageInput = ref(1);
const loading = ref(false);
const saving = ref(false);
const selectedIds = ref<number[]>([]);

const isAllSelected = computed(() => {
  if (!pickupPoints.value.length) return false;
  return pickupPoints.value.every((item) => selectedIds.value.includes(item.id));
});

const filters = reactive({
  keyword: '',
  city: '',
  district: '',
  status: '',
});

const formDialog = reactive({
  open: false,
  isEdit: false,
  point: null as PickupPoint | null,
  form: {
    leaderId: undefined as number | undefined,
    name: '',
    contactName: '',
    contactMobile: '',
    province: '',
    city: '',
    district: '',
    detailAddress: '',
    longitude: undefined as number | undefined,
    latitude: undefined as number | undefined,
    businessHours: '',
  },
});

const hasFilters = computed(() => Boolean(filters.keyword || filters.city || filters.district || filters.status));
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));

const summaryCards = computed(() => {
  const all = total.value;
  const enabled = pickupPoints.value.filter((p) => p.status === 'ENABLED').length;
  const disabled = pickupPoints.value.filter((p) => p.status === 'DISABLED').length;
  const bound = pickupPoints.value.filter((p) => p.leaderId != null).length;
  return [
    { title: '自提点总数', value: all, note: '全部自提点记录' },
    { title: '已启用', value: enabled, note: enabled > 0 ? '<span class="mini-ok">可下单</span>' : '<span class="mini-muted">无启用</span>' },
    { title: '已停用', value: disabled, note: disabled > 0 ? '<span class="mini-warn">暂停服务</span>' : '<span class="mini-muted">无停用</span>' },
    { title: '已绑定团长', value: bound, note: bound > 0 ? '<span class="mini-ok">归属团长</span>' : '<span class="mini-muted">暂无绑定</span>' },
  ];
});

onMounted(() => {
  void loadData();
  if (refreshApi) {
    const unregister = refreshApi.register(() => loadData());
    onBeforeUnmount(() => unregister());
  }
});

async function loadData(): Promise<boolean> {
  loading.value = true;
  try {
    const res = await getPickupPoints({
      page: page.value,
      pageSize: pageSize.value,
      keyword: filters.keyword,
      city: filters.city,
      district: filters.district,
      status: filters.status,
    });
    pickupPoints.value = res.items ?? [];
    total.value = res.total ?? 0;
    pageInput.value = page.value;
    selectedIds.value = [];
    return true;
  } catch (error: any) {
    ElMessage.error(error.message || '加载自提点列表失败');
    return false;
  } finally {
    loading.value = false;
  }
}

function toggleSelect(id: number) {
  const idx = selectedIds.value.indexOf(id);
  if (idx > -1) {
    selectedIds.value.splice(idx, 1);
  } else {
    selectedIds.value.push(id);
  }
}

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedIds.value = [];
  } else {
    selectedIds.value = pickupPoints.value.map((item) => item.id);
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
  filters.city = '';
  filters.district = '';
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

function resetForm() {
  formDialog.form = {
    leaderId: undefined,
    name: '',
    contactName: '',
    contactMobile: '',
    province: '',
    city: '',
    district: '',
    detailAddress: '',
    longitude: undefined,
    latitude: undefined,
    businessHours: '',
  };
  formDialog.point = null;
}

function openCreate() {
  resetForm();
  formDialog.isEdit = false;
  formDialog.open = true;
}

function openEdit(point: PickupPoint) {
  resetForm();
  formDialog.isEdit = true;
  formDialog.point = point;
  formDialog.form = {
    leaderId: point.leaderId ?? undefined,
    name: point.name,
    contactName: point.contactName ?? '',
    contactMobile: point.contactMobile ?? '',
    province: point.province,
    city: point.city,
    district: point.district ?? '',
    detailAddress: point.detailAddress,
    longitude: point.longitude ?? undefined,
    latitude: point.latitude ?? undefined,
    businessHours: point.businessHours ?? '',
  };
  formDialog.open = true;
}

async function submitForm() {
  if (!formDialog.form.name.trim()) {
    ElMessage.warning('请输入自提点名称');
    return;
  }
  if (!formDialog.form.province.trim() || !formDialog.form.city.trim() || !formDialog.form.detailAddress.trim()) {
    ElMessage.warning('请填写完整的省、市和详细地址');
    return;
  }

  saving.value = true;
  try {
    const payload: Record<string, unknown> = {};
    if (formDialog.form.leaderId != null) payload.leaderId = formDialog.form.leaderId;
    payload.name = formDialog.form.name.trim();
    payload.contactName = formDialog.form.contactName.trim() || undefined;
    payload.contactMobile = formDialog.form.contactMobile.trim() || undefined;
    payload.province = formDialog.form.province.trim();
    payload.city = formDialog.form.city.trim();
    payload.district = formDialog.form.district.trim() || undefined;
    payload.detailAddress = formDialog.form.detailAddress.trim();
    if (formDialog.form.longitude != null) payload.longitude = formDialog.form.longitude;
    if (formDialog.form.latitude != null) payload.latitude = formDialog.form.latitude;
    payload.businessHours = formDialog.form.businessHours.trim() || undefined;

    if (formDialog.isEdit && formDialog.point) {
      await updatePickupPoint(formDialog.point.id, payload);
      ElMessage.success('自提点已更新');
    } else {
      await createPickupPoint(payload);
      ElMessage.success('自提点已创建');
    }
    formDialog.open = false;
    await loadData();
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败');
  } finally {
    saving.value = false;
  }
}

async function toggleStatus(point: PickupPoint) {
  const next = point.status === 'ENABLED' ? 'DISABLED' : 'ENABLED';
  try {
    await updatePickupPointStatus(point.id, { status: next });
    ElMessage.success(`自提点已${next === 'ENABLED' ? '启用' : '停用'}`);
    await loadData();
  } catch (error: any) {
    ElMessage.error(error.message || '状态切换失败');
  }
}

async function confirmDelete(point: PickupPoint) {
  try {
    await ElMessageBox.confirm(
      `确定要删除自提点「${point.name}」吗？若已关联订单将无法删除。`,
      '删除确认',
      { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'warning' },
    );
    await deletePickupPoint(point.id);
    ElMessage.success('自提点已删除');
    await loadData();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败');
    }
  }
}

async function batchDelete() {
  if (!selectedIds.value.length) return;
  try {
    await ElMessageBox.confirm(
      `确定要批量删除已选的 ${selectedIds.value.length} 个自提点吗？若已关联订单将无法删除。`,
      '批量删除确认',
      { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'warning' },
    );
    saving.value = true;
    const results = await Promise.allSettled(selectedIds.value.map((id) => deletePickupPoint(id)));
    const successCount = results.filter((r) => r.status === 'fulfilled').length;
    const failCount = results.length - successCount;
    selectedIds.value = [];
    await loadData();
    if (failCount === 0) {
      ElMessage.success(`成功删除 ${successCount} 个自提点`);
    } else {
      ElMessage.warning(`删除完成：成功 ${successCount} 个，失败 ${failCount} 个`);
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '批量删除失败');
    }
  } finally {
    saving.value = false;
  }
}

function formatTime(raw: string | null | undefined) {
  if (!raw) return '-';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatLngLat(longitude: number | null, latitude: number | null) {
  if (longitude == null || latitude == null) return '-';
  return `${longitude}, ${latitude}`;
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
  padding: 0 10px;
  font-size: 13px;
  border-radius: 8px;
}
.cell-main.plain {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.cell-main.plain .thumb {
  display: none;
}
.row-actions.wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-width: 210px;
}
.danger-text {
  color: var(--danger);
}
.ellipsis {
  display: inline-block;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}

.pickup-form-dialog :deep(.el-dialog__body) {
  padding-top: 8px;
  padding-bottom: 8px;
}
.form-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.form-field.compact {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.form-field.compact span {
  font-size: 12px;
  color: var(--muted);
  font-weight: 700;
}
.form-field.compact input,
.form-field.compact select,
.form-field.compact textarea {
  width: 100%;
  min-height: 32px;
  padding: 6px 10px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
  font-size: 13px;
  color: var(--text);
}
.form-grid.compact-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.form-grid.compact-3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
}
.required {
  color: var(--danger);
}
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.pickup-detail-dialog :deep(.el-dialog__body) {
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
