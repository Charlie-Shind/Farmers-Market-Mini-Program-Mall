<template>
  <component
    v-if="IconComponent"
    :is="IconComponent as any"
    :size="resolvedSize"
    :color="color"
    :stroke-width="strokeWidth"
    :aria-label="label || name"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import * as LucideIcons from 'lucide-vue-next';

const props = withDefaults(
  defineProps<{
    name: string;
    size?: number | string;
    color?: string;
    strokeWidth?: number;
    label?: string;
  }>(),
  {
    size: 20,
    color: 'currentColor',
    strokeWidth: 2,
    label: '',
  },
);

/** 项目内 camelCase 名称 -> Lucide PascalCase 组件名 */
const LUCIDE_ALIAS: Record<string, keyof typeof LucideIcons> = {
  back: 'ChevronLeft',
  chevronRight: 'ChevronRight',
  chevronLeft: 'ChevronLeft',
  chevronDown: 'ChevronDown',
  chevronUp: 'ChevronUp',
  plusLight: 'Plus',
  delete: 'Trash2',
  map: 'MapPin',
  location: 'MapPin',
  address: 'MapPin',
  avatar: 'User',
  profile: 'User',
  logo: 'Sprout',
  shopBag: 'ShoppingBag',
  delivering: 'PackageCheck',
  orderPendingPay: 'Wallet',
  orderPendingShip: 'Package',
  orderPendingReceive: 'Truck',
  orderPendingReview: 'Star',
  orderRefunded: 'RotateCcw',
  wechatPay: 'MessageCircle',
  wechat: 'MessageCircle',
  starFilled: 'Star',
  messageInfo: 'Info',
  messageSuccess: 'CircleCheck',
  messageWarning: 'TriangleAlert',
  messageError: 'CircleX',
  networkError: 'WifiOff',
  support: 'Headset',
  feedback: 'MessageSquareText',
  signin: 'LogIn',
  thumbUp: 'ThumbsUp',
  redPacket: 'Gift',
  sidebarCollapse: 'PanelLeftClose',
  sidebarExpand: 'PanelLeftOpen',
  category: 'LayoutGrid',
  discover: 'Compass',
  lightning: 'Zap',
  flash: 'Zap',
  refund: 'Undo2',
  invoice: 'FileText',
  member: 'BadgeCheck',
  shop: 'Store',
};

function toPascalCase(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

const IconComponent = computed(() => {
  const alias = LUCIDE_ALIAS[props.name];
  if (alias && LucideIcons[alias]) {
    return LucideIcons[alias];
  }

  const pascal = toPascalCase(props.name);
  if (LucideIcons[pascal as keyof typeof LucideIcons]) {
    return LucideIcons[pascal as keyof typeof LucideIcons];
  }

  return LucideIcons.CircleHelp;
});

const resolvedSize = computed(() => (
  typeof props.size === 'number' ? props.size : parseFloat(props.size) || 20
));
</script>

<style scoped>
:deep(svg) {
  display: block;
}
</style>
