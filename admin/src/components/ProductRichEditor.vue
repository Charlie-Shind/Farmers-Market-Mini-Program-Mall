<template>
  <div class="rich-editor">
    <div class="rich-editor__toolbar">
      <button type="button" class="rich-tool-btn" @click="addTextBlock">插入文字</button>
      <el-upload
        action=""
        :show-file-list="false"
        :http-request="handleUploadImage"
        accept="image/*"
      >
        <button type="button" class="rich-tool-btn rich-tool-btn--primary">插入图片</button>
      </el-upload>
      <span class="rich-editor__hint">图文可交错排列，上下拖动可调整顺序</span>
    </div>

    <div v-if="!blocks.length" class="rich-editor__empty">
      暂无内容，请点击「插入文字」或「插入图片」开始编辑商品详情
    </div>

    <div
      v-for="(block, index) in blocks"
      :key="block.id"
      class="rich-block"
      :class="`rich-block--${block.type}`"
    >
      <div class="rich-block__aside">
        <span class="rich-block__badge">{{ block.type === 'text' ? '文字' : '图片' }}</span>
        <div class="rich-block__ops">
          <button type="button" :disabled="index === 0" @click="moveBlock(index, -1)">↑</button>
          <button type="button" :disabled="index === blocks.length - 1" @click="moveBlock(index, 1)">↓</button>
          <button type="button" class="danger" @click="removeBlock(index)">删</button>
        </div>
      </div>

      <textarea
        v-if="block.type === 'text'"
        v-model="block.content"
        class="rich-block__textarea"
        rows="4"
        placeholder="输入商品介绍段落，可说明产地、规格、食用方法、售后服务等…"
        @input="emitValue"
      />
      <div v-else class="rich-block__image-wrap">
        <img v-if="block.url" :src="block.url" alt="详情图" />
        <span v-else>图片上传中或地址无效</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

type RichBlock =
  | { id: string; type: 'text'; content: string }
  | { id: string; type: 'image'; url: string };

const props = defineProps<{
  modelValue?: string;
  upload: (file: File) => Promise<string>;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const blocks = ref<RichBlock[]>([]);
let syncingFromProp = false;

function uid() {
  return `b_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function blocksToHtml(list: RichBlock[]) {
  return list
    .map((block) => {
      if (block.type === 'text') {
        const parts = (block.content || '')
          .split(/\n+/)
          .map((line) => line.trim())
          .filter(Boolean);
        if (!parts.length) return '';
        return parts.map((line) => `<p>${escapeHtml(line)}</p>`).join('');
      }
      const url = (block.url || '').trim();
      if (!url) return '';
      return `<img src="${escapeHtml(url)}" alt="商品详情图" style="width:100%;display:block;margin:12px 0;" />`;
    })
    .filter(Boolean)
    .join('');
}

function htmlToBlocks(html: string): RichBlock[] {
  const raw = (html || '').trim();
  if (!raw) return [];

  if (!/<\s*(p|img|div|br|h[1-6]|span|section)/i.test(raw)) {
    return [{ id: uid(), type: 'text', content: raw }];
  }

  const result: RichBlock[] = [];
  const tokenRe = /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>|<p\b[^>]*>([\s\S]*?)<\/p>|([^<]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = tokenRe.exec(raw))) {
    if (match[1]) {
      result.push({ id: uid(), type: 'image', url: match[1].trim() });
      continue;
    }
    const text = (match[2] ?? match[3] ?? '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .trim();
    if (!text) continue;
    const last = result[result.length - 1];
    if (last?.type === 'text') {
      last.content = `${last.content}\n${text}`.trim();
    } else {
      result.push({ id: uid(), type: 'text', content: text });
    }
  }

  return result.length ? result : [{ id: uid(), type: 'text', content: raw.replace(/<[^>]+>/g, '').trim() }];
}

function emitValue() {
  if (syncingFromProp) return;
  emit('update:modelValue', blocksToHtml(blocks.value));
}

function addTextBlock() {
  blocks.value.push({ id: uid(), type: 'text', content: '' });
  emitValue();
}

async function handleUploadImage(options: { file: File }) {
  const url = await props.upload(options.file);
  if (!url) return;
  blocks.value.push({ id: uid(), type: 'image', url });
  emitValue();
}

function removeBlock(index: number) {
  blocks.value.splice(index, 1);
  emitValue();
}

function moveBlock(index: number, delta: number) {
  const next = index + delta;
  if (next < 0 || next >= blocks.value.length) return;
  const list = blocks.value.slice();
  const [item] = list.splice(index, 1);
  list.splice(next, 0, item);
  blocks.value = list;
  emitValue();
}

watch(
  () => props.modelValue,
  (value) => {
    const nextHtml = blocksToHtml(blocks.value);
    if ((value || '') === nextHtml) return;
    syncingFromProp = true;
    blocks.value = htmlToBlocks(value || '');
    syncingFromProp = false;
  },
  { immediate: true },
);
</script>

<style scoped>
.rich-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.rich-editor__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.rich-tool-btn {
  height: 32px;
  padding: 0 12px;
  border: 1px solid #d7ddd7;
  border-radius: 8px;
  background: #fff;
  color: #2c4a39;
  font-size: 13px;
  cursor: pointer;
}

.rich-tool-btn--primary {
  background: #2c4a39;
  border-color: #2c4a39;
  color: #fff;
}

.rich-editor__hint {
  color: #8a8f87;
  font-size: 12px;
}

.rich-editor__empty {
  padding: 24px 16px;
  border: 1px dashed #d7ddd7;
  border-radius: 10px;
  color: #8a8f87;
  font-size: 13px;
  text-align: center;
  background: #fafcfa;
}

.rich-block {
  display: grid;
  grid-template-columns: 88px 1fr;
  gap: 10px;
  padding: 10px;
  border: 1px solid #e6ebe6;
  border-radius: 10px;
  background: #fff;
}

.rich-block__aside {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rich-block__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 24px;
  border-radius: 999px;
  background: #eef5ef;
  color: #2c4a39;
  font-size: 12px;
  font-weight: 600;
}

.rich-block__ops {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rich-block__ops button {
  height: 26px;
  border: 1px solid #d7ddd7;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  font-size: 12px;
}

.rich-block__ops button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.rich-block__ops button.danger {
  color: #b42318;
  border-color: #f0c7c2;
}

.rich-block__textarea {
  width: 100%;
  min-height: 96px;
  padding: 10px 12px;
  border: 1px solid #d7ddd7;
  border-radius: 8px;
  resize: vertical;
  font-size: 14px;
  line-height: 1.6;
  box-sizing: border-box;
}

.rich-block__image-wrap {
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  overflow: hidden;
  background: #f5f7f5;
  color: #8a8f87;
  font-size: 13px;
}

.rich-block__image-wrap img {
  display: block;
  width: 100%;
  max-height: 360px;
  object-fit: contain;
  background: #fff;
}
</style>
