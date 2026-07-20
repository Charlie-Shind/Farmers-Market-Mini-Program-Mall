// shared/icons — 统一图标注册表（单源）
// 协议：Lucide Icons ISC (https://lucide.dev)
// 由 scripts/gen-lucide-icons.mjs 从 lucide 包生成 registry/
// 详细协议声明见项目根 THIRD-PARTY-LICENSES.md

import { navigationIcons } from './registry/navigation';
import { actionIcons } from './registry/action';
import { statusIcons } from './registry/status';
import { businessIcons } from './registry/business';
import { categoryIcons } from './registry/category';
import { orderIcons } from './registry/order';
import { customIcons } from './registry/custom';

const allIcons = {
  ...navigationIcons,
  ...actionIcons,
  ...statusIcons,
  ...businessIcons,
  ...categoryIcons,
  ...orderIcons,
  ...customIcons,
} as const;

export type IconName = keyof typeof allIcons;

// 完整 <svg> 字符串（24x24 viewBox / currentColor 描边）
export function getIconSvg(name: IconName): string {
  const body = (allIcons as Record<string, string>)[name];
  if (!body) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"></svg>';
  }
  return [
    '<svg xmlns="http://www.w3.org/2000/svg"',
    ' viewBox="0 0 24 24"',
    ' fill="none"',
    ' stroke="currentColor"',
    ' stroke-width="2"',
    ' stroke-linecap="round"',
    ' stroke-linejoin="round">',
    body,
    '</svg>',
  ].join('');
}

// 仅 SVG 内部 body（不含 <svg> 标签），用于 <image> 标签或自定义包装
export function getIconPath(name: IconName): string {
  return (allIcons as Record<string, string>)[name] || '';
}

// 所有图标 key 列表（用于生成图标库文档）
export const allIconNames = Object.keys(allIcons) as IconName[];

// 分类下标（用于组件库展示）
export const iconCategories = {
  navigation: Object.keys(navigationIcons) as IconName[],
  action: Object.keys(actionIcons) as IconName[],
  status: Object.keys(statusIcons) as IconName[],
  business: Object.keys(businessIcons) as IconName[],
  category: Object.keys(categoryIcons) as IconName[],
  order: Object.keys(orderIcons) as IconName[],
  custom: Object.keys(customIcons) as IconName[],
} as const;

// ==================== 使用次数统计 ====================
//
// 设计目标：
// 1. 同一会话/进程内统计每个 icon 被 t-icon 组件挂载的次数
// 2. 提供 dumpIconUsage() 给管理后台或测试页查看
// 3. 不写入持久化（避免污染用户存储），仅内存计数
// 4. 打包时可通过 setIconUsageEnabled(false) 关闭以减少包体

type IconUsage = Record<string, number>;

let usageEnabled = true;
const usageStore: IconUsage = {};

export function setIconUsageEnabled(enabled: boolean): void {
  usageEnabled = enabled;
}

export function recordIconUsage(name: IconName): void {
  if (!usageEnabled) {
    return;
  }
  usageStore[name] = (usageStore[name] || 0) + 1;
}

export function getIconUsage(): IconUsage {
  return { ...usageStore };
}

export function dumpIconUsage(): any[] {
  return Object.entries(usageStore)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export function clearIconUsage(): void {
  for (const key of Object.keys(usageStore)) {
    delete usageStore[key];
  }
}

export { allIcons };
