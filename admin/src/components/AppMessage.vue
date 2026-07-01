<template>
  <section class="app-message" :class="`app-message--${type}`" role="status" aria-live="polite">
    <AppIcon
      v-if="showIcon"
      class="app-message__icon"
      :name="iconName"
      :size="iconSize"
      :color="iconColor"
      :label="resolvedLabel"
    />

    <div class="app-message__body">
      <strong v-if="title" class="app-message__title">{{ title }}</strong>
      <p v-if="content || $slots.default" class="app-message__content">
        <slot>{{ content }}</slot>
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import AppIcon from '@/components/AppIcon.vue';

type MessageType = 'info' | 'success' | 'warning' | 'error';

const props = withDefaults(
  defineProps<{
    type?: MessageType;
    title?: string;
    content?: string;
    showIcon?: boolean;
    iconName?: string;
    iconColor?: string;
    iconSize?: number | string;
  }>(),
  {
    type: 'info',
    title: '',
    content: '',
    showIcon: true,
    iconName: '',
    iconColor: '',
    iconSize: 18,
  },
);

const typeLabel: Record<MessageType, string> = {
  info: '提示',
  success: '成功',
  warning: '警告',
  error: '错误',
};

const defaultIconName: Record<MessageType, string> = {
  info: 'messageInfo',
  success: 'messageSuccess',
  warning: 'messageWarning',
  error: 'messageError',
};

const defaultIconColor: Record<MessageType, string> = {
  info: 'var(--blue)',
  success: 'var(--green)',
  warning: 'var(--warn)',
  error: 'var(--danger)',
};

const iconName = computed(() => props.iconName || defaultIconName[props.type]);
const iconColor = computed(() => props.iconColor || defaultIconColor[props.type]);
const resolvedLabel = computed(() => props.title || typeLabel[props.type]);
</script>
