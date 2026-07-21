<template>
  <div class="page-stack">
    <StatGrid :cards="summaryCards" />

    <section class="panel">
      <div class="panel-head compact">
        <div>
          <h2>团长管理</h2>
          <p>管理平台团长申请、审核、状态变更与基础信息维护。</p>
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
        </div>
      </div>

      <div class="filter-grid compact">
        <label class="filter-field compact">
          <span>关键词</span>
          <input v-model.trim="filters.keyword" class="compact" placeholder="姓名 / 手机号 / 申请编号" @keyup.enter="applyFilters" />
        </label>
        <label class="filter-field compact">
          <span>状态</span>
          <select v-model="filters.status" class="compact" @change="applyFilters">
            <option value="">全部状态</option>
            <option value="PENDING_AUDIT">待审核</option>
            <option value="APPROVED">已通过</option>
            <option value="REJECTED">已拒绝</option>
            <option value="DISABLED">已禁用</option>
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
              <th class="check-cell">
                <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" />
              </th>
              <th>ID</th>
              <th>团长信息</th>
              <th>申请编号</th>
              <th>状态</th>
              <th>佣金比例</th>
              <th>自提点数</th>
              <th>申请时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="leader in leaders" :key="leader.id">
              <td class="check-cell">
                <input
                  type="checkbox"
                  :checked="selectedIds.includes(leader.id)"
                  @change="toggleSelect(leader.id)"
                />
              </td>
              <td data-label="ID">{{ leader.id }}</td>
              <td data-label="团长信息">
                <div class="cell-main plain">
                  <strong>{{ leader.realName || '-' }}</strong>
                  <span>{{ leader.mobile || '-' }}</span>
                </div>
              </td>
              <td data-label="申请编号">{{ leader.applicationNo }}</td>
              <td data-label="状态">
                <span :class="['status', statusClass(leader.status)]">{{ statusText(leader.status) }}</span>
              </td>
              <td data-label="佣金比例">{{ formatRate(leader.commissionRate) }}</td>
              <td data-label="自提点数">{{ leader.pickupPointCount ?? 0 }}</td>
              <td data-label="申请时间">{{ formatTime(leader.createdAt) }}</td>
              <td data-label="操作">
                <div class="row-actions wrap">
                  <button type="button" class="ghost-btn compact" @click="openDetail(leader)">详情</button>
                  <button
                    v-if="leader.status === 'PENDING_AUDIT'"
                    type="button"
                    class="ghost-btn compact"
                    @click="openAudit(leader)"
                  >
                    审核
                  </button>
                  <button type="button" class="ghost-btn compact" @click="openEdit(leader)">编辑</button>
                  <button
                    type="button"
                    class="ghost-btn compact danger-text"
                    @click="confirmDelete(leader)"
                  >
                    删除
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!leaders.length">
              <td colspan="9" class="empty-hint">暂无团长记录</td>
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
      title="团长详情"
      width="580px"
      align-center
      destroy-on-close
      class="leader-detail-dialog"
    >
      <div v-if="detailDialog.leader" class="detail-form">
        <div class="detail-row">
          <span>团长 ID</span>
          <strong>{{ detailDialog.leader.id }}</strong>
        </div>
        <div class="detail-row">
          <span>申请编号</span>
          <strong>{{ detailDialog.leader.applicationNo }}</strong>
        </div>
        <div class="detail-row">
          <span>姓名</span>
          <strong>{{ detailDialog.leader.realName || '-' }}</strong>
        </div>
        <div class="detail-row">
          <span>手机号</span>
          <strong>{{ detailDialog.leader.mobile || '-' }}</strong>
        </div>
        <div class="detail-row">
          <span>身份证号</span>
          <strong>{{ detailDialog.leader.idCardNo || '-' }}</strong>
        </div>
        <div class="detail-row">
          <span>当前状态</span>
          <strong>
            <span :class="['status', statusClass(detailDialog.leader.status)]">{{ statusText(detailDialog.leader.status) }}</span>
          </strong>
        </div>
        <div class="detail-row">
          <span>佣金比例</span>
          <strong>{{ formatRate(detailDialog.leader.commissionRate) }}</strong>
        </div>
        <div class="detail-row">
          <span>拒绝原因</span>
          <strong>{{ detailDialog.leader.rejectReason || '-' }}</strong>
        </div>
        <div class="detail-row">
          <span>关联用户</span>
          <strong>
            {{ detailDialog.leader.user ? `${detailDialog.leader.user.nickname} (#${detailDialog.leader.user.id})` : '-' }}
          </strong>
        </div>
        <div class="detail-row">
          <span>用户手机号</span>
          <strong>{{ detailDialog.leader.user?.mobile || '-' }}</strong>
        </div>
        <div class="detail-row">
          <span>用户 OpenID</span>
          <strong class="break">{{ detailDialog.leader.user?.openid || '-' }}</strong>
        </div>
        <div class="detail-row">
          <span>审核人 ID</span>
          <strong>{{ detailDialog.leader.auditedBy ?? '-' }}</strong>
        </div>
        <div class="detail-row">
          <span>审核时间</span>
          <strong>{{ formatTime(detailDialog.leader.auditedAt) }}</strong>
        </div>
        <div class="detail-row">
          <span>创建时间</span>
          <strong>{{ formatTime(detailDialog.leader.createdAt) }}</strong>
        </div>
        <div class="detail-row">
          <span>更新时间</span>
          <strong>{{ formatTime(detailDialog.leader.updatedAt) }}</strong>
        </div>

        <div v-if="detailDialog.leader.idCardFrontUrl || detailDialog.leader.idCardBackUrl || detailDialog.leader.businessCertUrl" class="detail-section">
          <span class="section-label">资质图片</span>
          <div class="image-list">
            <div v-if="detailDialog.leader.idCardFrontUrl" class="image-item">
              <img :src="detailDialog.leader.idCardFrontUrl" alt="身份证正面" @click="previewImage(detailDialog.leader.idCardFrontUrl)" />
              <span>身份证正面</span>
            </div>
            <div v-if="detailDialog.leader.idCardBackUrl" class="image-item">
              <img :src="detailDialog.leader.idCardBackUrl" alt="身份证背面" @click="previewImage(detailDialog.leader.idCardBackUrl)" />
              <span>身份证背面</span>
            </div>
            <div v-if="detailDialog.leader.businessCertUrl" class="image-item">
              <img :src="detailDialog.leader.businessCertUrl" alt="营业执照" @click="previewImage(detailDialog.leader.businessCertUrl)" />
              <span>营业执照</span>
            </div>
          </div>
        </div>

        <div v-if="detailDialog.leader.pickupPoints?.length" class="detail-section">
          <span class="section-label">关联自提点</span>
          <div class="pickup-list">
            <div v-for="p in detailDialog.leader.pickupPoints" :key="p.id" class="pickup-item">
              <strong>{{ p.name }}</strong>
              <span>{{ [p.province, p.city, p.district, p.detailAddress].filter(Boolean).join(' / ') }}</span>
              <span :class="['status', p.status === 'ENABLED' ? 'ok' : 'danger']">{{ p.status === 'ENABLED' ? '启用' : '停用' }}</span>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 审核弹窗 -->
    <el-dialog v-model="auditDialog.open" title="团长审核" width="460px" align-center destroy-on-close class="leader-form-dialog">
      <div v-if="auditDialog.leader" class="form-intro">
        正在审核团长 <strong>{{ auditDialog.leader.realName }}</strong> 的申请
      </div>
      <div class="form-body">
        <label class="form-field compact">
          <span>审核结果</span>
          <select v-model="auditDialog.status" class="compact">
            <option value="APPROVED">通过</option>
            <option value="REJECTED">拒绝</option>
          </select>
        </label>
        <label v-if="auditDialog.status === 'REJECTED'" class="form-field compact">
          <span>拒绝原因 <span class="required">*</span></span>
          <textarea v-model.trim="auditDialog.rejectReason" rows="2" class="compact" placeholder="请填写拒绝原因"></textarea>
        </label>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button size="small" @click="auditDialog.open = false">取消</el-button>
          <el-button size="small" type="primary" :loading="saving" @click="submitAudit">确认审核</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 编辑弹窗 -->
    <el-dialog v-model="editDialog.open" title="编辑团长信息" width="500px" align-center destroy-on-close class="leader-form-dialog">
      <div class="form-body">
        <label class="form-field compact">
          <span>真实姓名</span>
          <input v-model.trim="editDialog.form.realName" class="compact" type="text" placeholder="真实姓名" />
        </label>
        <label class="form-field compact">
          <span>手机号</span>
          <input v-model.trim="editDialog.form.mobile" class="compact" type="text" placeholder="手机号" />
        </label>
        <label class="form-field compact">
          <span>佣金比例 (0~1，如 0.05 表示 5%)</span>
          <input
            v-model.number="editDialog.form.commissionRate"
            class="compact"
            type="number"
            min="0"
            max="1"
            step="0.001"
            placeholder="0.05"
          />
        </label>
        <label class="form-field compact">
          <span>状态</span>
          <select v-model="editDialog.form.status" class="compact">
            <option value="PENDING_AUDIT">待审核</option>
            <option value="APPROVED">已通过</option>
            <option value="REJECTED">已拒绝</option>
            <option value="DISABLED">已禁用</option>
          </select>
        </label>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button size="small" @click="editDialog.open = false">取消</el-button>
          <el-button size="small" type="primary" :loading="saving" @click="submitEdit">保存修改</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

import {
  auditLeader,
  deleteLeader,
  getLeader,
  getLeaders,
  updateLeader,
} from '@/api/admin';
import StatGrid from '@/components/StatGrid.vue';
import RefreshDataButton from '@/components/RefreshDataButton.vue';
import { refreshWithFeedback } from '@/utils/refresh-feedback';

const refreshApi = inject<{
  register: (handler: () => void | Promise<void>) => () => void;
  tick: { value: number };
} | null>('admin-refresh', null);

interface LeaderUser {
  id: number;
  nickname: string;
  avatarUrl?: string | null;
  openid?: string;
  mobile?: string | null;
}

interface LeaderPickupPoint {
  id: number;
  name: string;
  province: string;
  city: string;
  district: string | null;
  detailAddress: string;
  status: string;
}

interface Leader {
  id: number;
  userId: number;
  applicationNo: string;
  realName: string;
  mobile: string;
  idCardNo: string | null;
  idCardFrontUrl: string | null;
  idCardBackUrl: string | null;
  businessCertUrl: string | null;
  status: 'PENDING_AUDIT' | 'APPROVED' | 'REJECTED' | 'DISABLED';
  rejectReason: string | null;
  commissionRate: number | null;
  auditedBy: number | null;
  auditedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user?: LeaderUser | null;
  pickupPointCount?: number;
  pickupPoints?: LeaderPickupPoint[];
}

const leaders = ref<Leader[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const pageInput = ref(1);
const loading = ref(false);
const saving = ref(false);
const selectedIds = ref<number[]>([]);

const isAllSelected = computed(() => {
  if (!leaders.value.length) return false;
  return leaders.value.every((item) => selectedIds.value.includes(item.id));
});

const filters = reactive({
  keyword: '',
  status: '',
});

const detailDialog = reactive({
  open: false,
  leader: null as Leader | null,
});

const auditDialog = reactive({
  open: false,
  leader: null as Leader | null,
  status: 'APPROVED' as 'APPROVED' | 'REJECTED',
  rejectReason: '',
});

const editDialog = reactive({
  open: false,
  leader: null as Leader | null,
  form: {
    realName: '',
    mobile: '',
    commissionRate: undefined as number | undefined,
    status: 'PENDING_AUDIT' as Leader['status'],
  },
});

const hasFilters = computed(() => Boolean(filters.keyword || filters.status));
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));

const summaryCards = computed(() => {
  const all = total.value;
  const pending = leaders.value.filter((l) => l.status === 'PENDING_AUDIT').length;
  const approved = leaders.value.filter((l) => l.status === 'APPROVED').length;
  const disabled = leaders.value.filter((l) => l.status === 'DISABLED' || l.status === 'REJECTED').length;
  return [
    { title: '团长总数', value: all, note: '全部团长记录' },
    { title: '待审核', value: pending, note: pending > 0 ? '<span class="mini-warn">待处理申请</span>' : '<span class="mini-muted">暂无待审</span>' },
    { title: '已通过', value: approved, note: approved > 0 ? '<span class="mini-ok">正常服务中</span>' : '<span class="mini-muted">暂无通过</span>' },
    { title: '已禁用/拒绝', value: disabled, note: disabled > 0 ? '<span class="mini-danger">不可用</span>' : '<span class="mini-muted">暂无</span>' },
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
    const res = await getLeaders({
      page: page.value,
      pageSize: pageSize.value,
      keyword: filters.keyword,
      status: filters.status,
    });
    leaders.value = res.items ?? [];
    total.value = res.total ?? 0;
    pageInput.value = page.value;
    selectedIds.value = [];
    return true;
  } catch (error: any) {
    ElMessage.error(error.message || '加载团长列表失败');
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
    selectedIds.value = leaders.value.map((item) => item.id);
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

function statusClass(status: string) {
  switch (status) {
    case 'APPROVED':
      return 'ok';
    case 'PENDING_AUDIT':
      return 'warn';
    case 'REJECTED':
    case 'DISABLED':
      return 'danger';
    default:
      return '';
  }
}

function statusText(status: string) {
  const map: Record<string, string> = {
    PENDING_AUDIT: '待审核',
    APPROVED: '已通过',
    REJECTED: '已拒绝',
    DISABLED: '已禁用',
  };
  return map[status] ?? status;
}

function formatRate(rate: number | null | undefined) {
  if (rate == null) return '-';
  return `${(Number(rate) * 100).toFixed(2)}%`;
}

function formatTime(raw: string | null | undefined) {
  if (!raw) return '-';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function openDetail(leader: Leader) {
  try {
    const data = await getLeader(leader.id);
    detailDialog.leader = data as Leader;
    detailDialog.open = true;
  } catch (error: any) {
    ElMessage.error(error.message || '加载详情失败');
  }
}

function previewImage(url: string) {
  window.open(url, '_blank');
}

function openAudit(leader: Leader) {
  auditDialog.leader = leader;
  auditDialog.status = 'APPROVED';
  auditDialog.rejectReason = '';
  auditDialog.open = true;
}

async function submitAudit() {
  if (!auditDialog.leader) return;
  if (auditDialog.status === 'REJECTED' && !auditDialog.rejectReason.trim()) {
    ElMessage.warning('请填写拒绝原因');
    return;
  }
  saving.value = true;
  try {
    await auditLeader(auditDialog.leader.id, {
      status: auditDialog.status,
      rejectReason: auditDialog.status === 'REJECTED' ? auditDialog.rejectReason.trim() : undefined,
    });
    ElMessage.success('审核操作成功');
    auditDialog.open = false;
    await loadData();
  } catch (error: any) {
    ElMessage.error(error.message || '审核失败');
  } finally {
    saving.value = false;
  }
}

function openEdit(leader: Leader) {
  editDialog.leader = leader;
  editDialog.form.realName = leader.realName ?? '';
  editDialog.form.mobile = leader.mobile ?? '';
  editDialog.form.commissionRate = leader.commissionRate ?? undefined;
  editDialog.form.status = leader.status;
  editDialog.open = true;
}

async function submitEdit() {
  if (!editDialog.leader) return;
  saving.value = true;
  try {
    const payload: Record<string, unknown> = {};
    if (editDialog.form.realName.trim()) payload.realName = editDialog.form.realName.trim();
    if (editDialog.form.mobile.trim()) payload.mobile = editDialog.form.mobile.trim();
    if (editDialog.form.commissionRate != null) payload.commissionRate = editDialog.form.commissionRate;
    if (editDialog.form.status) payload.status = editDialog.form.status;

    await updateLeader(editDialog.leader.id, payload);
    ElMessage.success('团长信息已更新');
    editDialog.open = false;
    await loadData();
  } catch (error: any) {
    ElMessage.error(error.message || '更新失败');
  } finally {
    saving.value = false;
  }
}

async function confirmDelete(leader: Leader) {
  try {
    await ElMessageBox.confirm(
      `确定要删除团长「${leader.realName || leader.applicationNo}」吗？删除后将解除其角色与自提点关联。`,
      '删除确认',
      { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'warning' },
    );
    await deleteLeader(leader.id);
    ElMessage.success('团长已删除');
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
      `确定要批量删除已选的 ${selectedIds.value.length} 位团长吗？删除后将解除其角色与自提点关联。`,
      '批量删除确认',
      { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'warning' },
    );
    saving.value = true;
    const results = await Promise.allSettled(selectedIds.value.map((id) => deleteLeader(id)));
    const successCount = results.filter((r) => r.status === 'fulfilled').length;
    const failCount = results.length - successCount;
    selectedIds.value = [];
    await loadData();
    if (failCount === 0) {
      ElMessage.success(`成功删除 ${successCount} 位团长`);
    } else {
      ElMessage.warning(`删除完成：成功 ${successCount} 位，失败 ${failCount} 位`);
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '批量删除失败');
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
  max-width: 200px;
}
.danger-text {
  color: var(--danger);
}

.leader-form-dialog :deep(.el-dialog__body) {
  padding-top: 8px;
  padding-bottom: 8px;
}
.form-intro {
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--muted);
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
  resize: vertical;
}
.form-field.compact textarea {
  min-height: 56px;
}
.required {
  color: var(--danger);
}
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.leader-detail-dialog :deep(.el-dialog__body) {
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
.detail-row strong.break {
  font-size: 11px;
}
.detail-section {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
}
.section-label {
  font-size: 12px;
  color: var(--muted);
  font-weight: 700;
}
.image-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
}
.image-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.image-item img {
  width: 100%;
  height: 100px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--line);
  cursor: pointer;
}
.image-item span {
  font-size: 11px;
  color: var(--muted);
  text-align: center;
}
.pickup-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.pickup-item {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 4px 12px;
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #ffffff;
}
.pickup-item strong {
  grid-column: 1 / -1;
  font-size: 13px;
}
.pickup-item span:first-of-type {
  font-size: 12px;
  color: var(--muted);
}
.empty-hint {
  text-align: center;
  color: var(--muted);
  padding: 40px 0;
}
</style>
