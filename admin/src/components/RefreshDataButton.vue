<template>
  <button
    type="button"
    class="ghost-btn refresh-data-btn"
    :class="{ compact, 'refresh-data-btn--loading': loading }"
    :disabled="loading || disabled"
    @click="$emit('refresh')"
  >
    <span v-if="loading" class="refresh-data-btn__spinner" aria-hidden="true"></span>
    <span class="refresh-data-btn__label">{{ loading ? loadingLabel : label }}</span>
  </button>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    loading?: boolean;
    disabled?: boolean;
    label?: string;
    loadingLabel?: string;
    compact?: boolean;
  }>(),
  {
    loading: false,
    disabled: false,
    label: '刷新数据',
    loadingLabel: '刷新中...',
    compact: false,
  },
);

defineEmits<{
  refresh: [];
}>();
</script>
