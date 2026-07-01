<template>
  <div class="page-stack">
    <!-- Stat Cards -->
    <StatGrid :cards="summaryCards" />

    <!-- Main Banner Panel -->
    <el-card class="panel">
      <template #header>
        <div class="panel-head compact">
          <div>
            <h2>Banner管理</h2>
            <p>管理平台首页的轮播广告图，支持拖拽实时排序和一键启停。</p>
          </div>
          <div class="top-actions">
            <el-button class="banner-create-btn" type="primary" @click="openCreateModal">新增 Banner</el-button>
          </div>
        </div>
      </template>

      <!-- Grid View with Drag and Drop -->
      <div v-loading="loading" class="grid-wrap">
        <div v-if="banners.length" class="banner-grid">
          <div
            v-for="(row, index) in banners"
            :key="row.id"
            class="banner-card-item"
            :class="{ 'is-dragging': dragIndex === index }"
            draggable="true"
            @dragstart="onDragStart(index, $event)"
            @dragenter="onDragEnter(index, $event)"
            @dragover.prevent
            @dragend="onDragEnd"
          >
            <!-- Drag Handle Icon Overlay -->
            <div class="card-drag-handle">
              <svg class="drag-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8.5 6a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm5 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm5 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm-10 6a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm5 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm5 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm-10 6a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm5 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm5 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
              </svg>
            </div>

            <!-- Preview Image Area -->
            <div class="card-preview-wrap">
              <el-image
                :src="row.imageUrl"
                fit="cover"
                class="banner-grid-preview"
                :preview-src-list="[row.imageUrl]"
                preview-teleported
              />
              <div class="card-status-badge">
                <el-tag :type="row.status === 'ENABLED' ? 'success' : 'info'" size="small">
                  {{ row.status === 'ENABLED' ? '已启用' : '已停用' }}
                </el-tag>
              </div>
            </div>

            <!-- Action Area -->
            <div class="card-actions">
              <el-switch
                :model-value="row.status === 'ENABLED'"
                active-text="启用"
                inactive-text="停用"
                inline-prompt
                @change="handleToggleStatus(row)"
              />
              <div class="action-buttons">
                <el-button link type="primary" @click="openEditModal(row)">编辑</el-button>
                <el-button link type="danger" @click="confirmDelete(row)">删除</el-button>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="!loading" class="empty-state compact">
          <strong>暂无 Banner 数据</strong>
          <span>请点击右上角发布您的第一张首页轮播图。</span>
        </div>
      </div>
    </el-card>

    <!-- Create/Edit Modal Dialog -->
    <el-dialog
      v-model="dialog.open"
      :title="dialog.isEdit ? '编辑 Banner' : '发布新 Banner'"
      width="500px"
      align-center
    >
      <el-form :model="form" label-position="top">
        <el-form-item label="轮播配图" required>
          <div class="banner-uploader-wrap">
            <el-input v-model="form.imageUrl" placeholder="请输入配图 URL 或在下方上传" style="margin-bottom: 8px" />
            <div class="uploader-action">
              <el-button type="primary" plain :loading="imageUploading" @click="triggerFileInput">
                选择并上传本地图片
              </el-button>
              <input
                ref="fileInputRef"
                type="file"
                accept="image/*"
                style="display: none"
                @change="handleUpload"
              />
            </div>
            <div v-if="form.imageUrl" class="banner-upload-preview">
              <el-image :src="form.imageUrl" fit="cover" />
            </div>
          </div>
        </el-form-item>

        <el-form-item label="启用状态">
          <el-radio-group v-model="form.status" style="width: 100%; display: flex; gap: 20px;">
            <el-radio value="ENABLED">开启</el-radio>
            <el-radio value="DISABLED">停用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialog.open = false">取消</el-button>
          <el-button type="primary" :loading="saving" @click="submitForm">确认保存</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

import {
  getBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  updateBannerStatus,
  uploadFile,
  reorderBanners,
} from '@/api/admin';
import StatGrid from '@/components/StatGrid.vue';

const refreshApi = inject<{
  register: (handler: () => void | Promise<void>) => () => void;
  tick: { value: number };
} | null>('admin-refresh', null);

interface BannerItem {
  id: number;
  title: string;
  imageUrl: string;
  linkType: string;
  linkId: number | null;
  sortOrder: number;
  status: string;
}

const banners = ref<BannerItem[]>([]);
const loading = ref(false);
const saving = ref(false);
const imageUploading = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);

const dragIndex = ref<number | null>(null);

const dialog = reactive({
  open: false,
  isEdit: false,
  editId: null as number | null,
});

const form = reactive({
  imageUrl: '',
  status: 'ENABLED' as 'ENABLED' | 'DISABLED',
});

const summaryCards = computed(() => {
  const total = banners.value.length;
  const active = banners.value.filter((b) => b.status === 'ENABLED').length;
  const inactive = total - active;

  return [
    { title: '总 Banner 数', value: total, note: '全部轮播广告图' },
    {
      title: '已启用',
      value: active,
      note: active > 0 ? '<span class="mini-ok">正在前台投送</span>' : '<span class="mini-muted">无在投广告</span>',
    },
    {
      title: '已停用',
      value: inactive,
      note: inactive > 0 ? '<span class="mini-warn">仓库休眠中</span>' : '<span class="mini-muted">无休眠项</span>',
    },
  ];
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
    const data = await getBanners();
    banners.value = data.sort((a, b) => a.sortOrder - b.sortOrder);
  } catch (error: any) {
    ElMessage.error(error.message || '加载 Banner 列表失败');
  } finally {
    loading.value = false;
  }
}

function openCreateModal() {
  dialog.isEdit = false;
  dialog.editId = null;
  form.imageUrl = '';
  form.status = 'ENABLED';
  dialog.open = true;
}

function openEditModal(row: BannerItem) {
  dialog.isEdit = true;
  dialog.editId = row.id;
  form.imageUrl = row.imageUrl;
  form.status = row.status as 'ENABLED' | 'DISABLED';
  dialog.open = true;
}

function triggerFileInput() {
  fileInputRef.value?.click();
}

async function handleUpload(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    ElMessage.error('只能上传图片文件');
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error('图片大小不能超过 5MB');
    return;
  }

  imageUploading.value = true;
  try {
    const res = await uploadFile(file);
    form.imageUrl = res.url;
    ElMessage.success('图片上传成功');
  } catch (error: any) {
    ElMessage.error(error.message || '图片上传失败');
  } finally {
    imageUploading.value = false;
    target.value = '';
  }
}

async function submitForm() {
  if (!form.imageUrl.trim()) {
    ElMessage.warning('请先选择或填写图片地址');
    return;
  }

  saving.value = true;
  const payload = {
    imageUrl: form.imageUrl.trim(),
    status: form.status,
  };

  try {
    if (dialog.isEdit && dialog.editId) {
      await updateBanner(dialog.editId, payload);
      ElMessage.success('Banner 已成功修改');
    } else {
      await createBanner(payload);
      ElMessage.success('新 Banner 已成功发布');
    }
    dialog.open = false;
    await loadData();
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败');
  } finally {
    saving.value = false;
  }
}

async function handleToggleStatus(row: BannerItem) {
  const nextStatus = row.status === 'ENABLED' ? 'DISABLED' : 'ENABLED';
  try {
    await updateBannerStatus(row.id, nextStatus, '列表页快速状态切换');
    ElMessage.success(`Banner 状态已变更为 ${nextStatus === 'ENABLED' ? '启用' : '停用'}`);
    await loadData();
  } catch (error: any) {
    ElMessage.error(error.message || '切换状态失败');
  }
}

async function confirmDelete(row: BannerItem) {
  try {
    await ElMessageBox.confirm(
      '确定要永久删除这个 Banner 吗？此操作无法撤销。',
      '删除 Banner 确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '我再想想',
        type: 'warning',
      }
    );
    await deleteBanner(row.id);
    ElMessage.success('该广告轮播图已成功删除');
    await loadData();
  } catch {
    // 用户取消删除
  }
}

// Drag & Drop handlers
function onDragStart(index: number, event: DragEvent) {
  dragIndex.value = index;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
  }
}

function onDragEnter(index: number, event: DragEvent) {
  if (dragIndex.value !== null && dragIndex.value !== index) {
    const list = [...banners.value];
    const item = list.splice(dragIndex.value, 1)[0];
    list.splice(index, 0, item);
    banners.value = list;
    dragIndex.value = index;
  }
}

async function onDragEnd() {
  dragIndex.value = null;
  const ids = banners.value.map((b) => b.id);
  try {
    await reorderBanners(ids);
    ElMessage.success('最新排序已同步到后端');
  } catch (error: any) {
    ElMessage.error(error.message || '排序保存失败');
  }
}
</script>

<style scoped>
.grid-wrap {
  margin-top: 10px;
}

.panel-head.compact {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.panel-head.compact > div:first-child {
  min-width: 0;
}

.top-actions {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin-left: auto;
}

.banner-create-btn {
  --el-button-bg-color: #111111;
  --el-button-border-color: #111111;
  --el-button-text-color: #ffffff;
  --el-button-hover-bg-color: #2f2f2f;
  --el-button-hover-border-color: #2f2f2f;
  --el-button-active-bg-color: #22382b;
  --el-button-active-border-color: #22382b;
  color: #ffffff !important;
  background: linear-gradient(135deg, #111111, #444444) !important;
  border-color: #111111 !important;
  box-shadow: 0 10px 20px rgba(17, 17, 17, 0.12);
}

.banner-create-btn:hover,
.banner-create-btn:focus {
  color: #ffffff !important;
  background: linear-gradient(135deg, #2f2f2f, #111111) !important;
  border-color: #2f2f2f !important;
}

.banner-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}

.banner-card-item {
  background: var(--bg-card, #ffffff);
  border-radius: 12px;
  border: 1px solid var(--border-light, #ebeef5);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
  transition: transform 0.2s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.2s ease;
  user-select: none;
}

.banner-card-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
}

.banner-card-item.is-dragging {
  opacity: 0.5;
  border: 2px dashed #409eff;
  transform: scale(0.98);
}

.card-drag-handle {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 10;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.banner-card-item:hover .card-drag-handle {
  opacity: 1;
}

.drag-icon {
  width: 14px;
  height: 14px;
}

.card-preview-wrap {
  width: 100%;
  height: 160px;
  position: relative;
  background: #f5f7fa;
}

.banner-grid-preview {
  width: 100%;
  height: 100%;
}

.card-status-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 5;
}

.card-info {
  padding: 16px;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.card-title {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.card-meta {
  font-size: 12px;
  color: #909399;
}

.card-actions {
  padding: 12px 16px;
  background: #fafafa;
  border-top: 1px solid #ebeef5;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.banner-uploader-wrap {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.uploader-action {
  margin-bottom: 8px;
}

.banner-upload-preview {
  width: 100%;
  height: 140px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px dashed #dcdfe6;
  display: flex;
  align-items: center;
  justify-content: center;
}

.banner-upload-preview .el-image {
  width: 100%;
  height: 100%;
}
</style>
