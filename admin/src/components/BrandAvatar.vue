<template>
  <img
    class="brand-avatar"
    :class="sizeClass"
    :src="DEFAULT_USER_AVATAR"
    :alt="alt"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { DEFAULT_USER_AVATAR } from '@/constants/brand';

const props = withDefaults(
  defineProps<{
    size?: 'sm' | 'md' | 'lg';
    alt?: string;
  }>(),
  {
    size: 'md',
    alt: '湾源农仓',
  },
);

const sizeClass = computed(() => `brand-avatar--${props.size}`);
</script>
