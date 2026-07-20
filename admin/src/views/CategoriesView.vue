<template>
  <div class="page-stack">
    <StatGrid :cards="summaryCards" />

    <el-card class="panel">
      <template #header>
        <div class="panel-head compact">
          <div>
            <h2>分类管理</h2>
            <p>维护小程序左侧展示的分类标签，商品挂载到子分类后会自动归入对应标签。</p>
          </div>
          <div class="top-actions">
            <el-button
              type="danger"
              plain
              :disabled="!selectedIds.length || saving"
              @click="batchDelete"
            >
              批量删除
            </el-button>
            <el-button type="primary" @click="openCreateModal">新增分类</el-button>
          </div>
        </div>
      </template>

      <el-table v-loading="loading" :data="categories" row-key="id" stripe>
        <el-table-column width="48" align="center">
          <template #header>
            <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" />
          </template>
          <template #default="{ row }">
            <input
              type="checkbox"
              :checked="selectedIds.includes(row.id)"
              @change="toggleSelect(row.id)"
            />
          </template>
        </el-table-column>
        <el-table-column label="名称" min-width="180">
          <template #default="{ row }">
            <span :class="{ 'child-name': !row.isTag }">{{ row.isTag ? row.name : `└ ${row.name}` }}</span>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="110">
          <template #default="{ row }">
            <el-tag :type="row.isTag ? 'success' : 'info'" size="small">
              {{ row.isTag ? '分类标签' : '子分类' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="parentName" label="所属标签" min-width="120">
          <template #default="{ row }">{{ row.parentName || '—' }}</template>
        </el-table-column>
        <el-table-column prop="sortOrder" label="排序" width="80" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">
              {{ row.status === 1 ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="productCount" label="商品数" width="90" />
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEditModal(row)">编辑</el-button>
            <el-button link type="danger" @click="confirmDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialog.open" :title="dialog.isEdit ? '编辑分类' : '新增分类'" width="520px" align-center>
      <el-form :model="form" label-position="top">
        <el-form-item label="分类名称" required>
          <el-input v-model="form.name" maxlength="32" show-word-limit placeholder="例如：时令果蔬" />
        </el-form-item>
        <el-form-item label="分类类型">
          <el-radio-group v-model="form.kind">
            <el-radio value="tag">分类标签（小程序左侧导航）</el-radio>
            <el-radio value="child">子分类（商品挂载类目）</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.kind === 'child'" label="所属标签" required>
          <el-select v-model="form.parentId" placeholder="选择一级分类标签" style="width: 100%">
            <el-option v-for="tag in tagOptions" :key="tag.id" :label="tag.name" :value="tag.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sortOrder" :min="0" :max="9999" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio :value="1">启用</el-radio>
            <el-radio :value="0">停用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.open = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

import {
  createCategory,
  deleteCategory,
  getAdminCategories,
  updateCategory,
  type AdminCategoryRow,
} from '@/api/admin';
import StatGrid from '@/components/StatGrid.vue';

const refreshApi = inject<{
  register: (handler: () => void | Promise<void>) => () => void;
} | null>('admin-refresh', null);

const loading = ref(false);
const saving = ref(false);
const categories = ref<AdminCategoryRow[]>([]);
const selectedIds = ref<number[]>([]);

const isAllSelected = computed(() => {
  if (!categories.value.length) return false;
  return categories.value.every((item) => selectedIds.value.includes(item.id));
});

const dialog = reactive({
  open: false,
  isEdit: false,
  editId: null as number | null,
});

const form = reactive({
  name: '',
  kind: 'tag' as 'tag' | 'child',
  parentId: null as number | null,
  sortOrder: 0,
  status: 1,
});

const tagOptions = computed(() => categories.value.filter((item) => item.isTag && item.status === 1));

const summaryCards = computed(() => {
  const total = categories.value.length;
  const tags = categories.value.filter((item) => item.isTag).length;
  const active = categories.value.filter((item) => item.status === 1).length;
  return [
    { title: '分类总数', value: total, note: '含标签与子分类' },
    { title: '分类标签', value: tags, note: '小程序左侧导航项' },
    { title: '启用中', value: active, note: '<span class="mini-ok">前台可见</span>' },
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
    categories.value = await getAdminCategories();
    selectedIds.value = [];
  } catch (error: any) {
    ElMessage.error(error.message || '分类加载失败');
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
    selectedIds.value = categories.value.map((item) => item.id);
  }
}

function resetForm() {
  form.name = '';
  form.kind = 'tag';
  form.parentId = null;
  form.sortOrder = 0;
  form.status = 1;
}

function openCreateModal() {
  dialog.isEdit = false;
  dialog.editId = null;
  resetForm();
  dialog.open = true;
}

function openEditModal(row: AdminCategoryRow) {
  dialog.isEdit = true;
  dialog.editId = row.id;
  form.name = row.name;
  form.kind = row.isTag ? 'tag' : 'child';
  form.parentId = row.parentId;
  form.sortOrder = row.sortOrder;
  form.status = row.status;
  dialog.open = true;
}

async function submitForm() {
  if (!form.name.trim()) {
    ElMessage.warning('请填写分类名称');
    return;
  }
  if (form.kind === 'child' && !form.parentId) {
    ElMessage.warning('请选择所属分类标签');
    return;
  }

  saving.value = true;
  const payload = {
    name: form.name.trim(),
    parentId: form.kind === 'child' ? form.parentId : null,
    iconUrl: '',
    sortOrder: form.sortOrder,
    status: form.status,
  };

  try {
    if (dialog.isEdit && dialog.editId) {
      await updateCategory(dialog.editId, payload);
      ElMessage.success('分类已更新');
    } else {
      await createCategory(payload);
      ElMessage.success('分类已创建');
    }
    dialog.open = false;
    await loadData();
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败');
  } finally {
    saving.value = false;
  }
}

async function confirmDelete(row: AdminCategoryRow) {
  try {
    await ElMessageBox.confirm(`确定删除分类「${row.name}」吗？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    });
    await deleteCategory(row.id);
    ElMessage.success('分类已删除');
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
      `确定要批量删除已选的 ${selectedIds.value.length} 个分类吗？`,
      '批量删除确认',
      { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'warning' },
    );
    saving.value = true;
    const results = await Promise.allSettled(selectedIds.value.map((id) => deleteCategory(id)));
    const successCount = results.filter((r) => r.status === 'fulfilled').length;
    const failCount = results.length - successCount;
    selectedIds.value = [];
    await loadData();
    if (failCount === 0) {
      ElMessage.success(`成功删除 ${successCount} 个分类`);
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
</script>

<style scoped>
.child-name {
  color: #5f685f;
}
</style>
