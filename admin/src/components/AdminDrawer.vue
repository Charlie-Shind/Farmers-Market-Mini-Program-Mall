<template>
  <Teleport to="body">
    <div
      :class="['drawer-overlay', { 'drawer-overlay--show': open }]"
      @click.self="closeOnMask && $emit('close')"
    ></div>
    <div :class="['drawer-panel', { 'drawer-panel--show': open }]" :style="panelStyle">
      <header class="drawer-head" v-if="$slots.header || title">
        <slot name="header">
          <div>
            <h3>{{ title }}</h3>
            <p v-if="subtitle">{{ subtitle }}</p>
          </div>
        </slot>
        <button type="button" class="drawer-close-btn" @click="$emit('close')" aria-label="关闭">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="5" y1="5" x2="15" y2="15"/><line x1="15" y1="5" x2="5" y2="15"/></svg>
        </button>
      </header>

      <div class="drawer-body">
        <slot></slot>
      </div>

      <footer class="drawer-foot" v-if="$slots.footer">
        <slot name="footer"></slot>
      </footer>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    open: boolean;
    title?: string;
    subtitle?: string;
    width?: string | number;
    closeOnMask?: boolean;
  }>(),
  {
    title: '',
    subtitle: '',
    width: 460,
    closeOnMask: true,
  },
);

defineEmits<{
  close: [];
}>();

const panelStyle = computed(() => {
  const w = typeof props.width === 'number' ? `${props.width}px` : props.width;
  return { width: w };
});
</script>
