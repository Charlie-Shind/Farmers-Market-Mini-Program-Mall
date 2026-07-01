// config/icons.ts — 统一图标配置入口
// 协议：Lucide Icons ISC (https://lucide.dev)
// 详细协议声明见项目根 THIRD-PARTY-LICENSES.md
//
// === 新业务统一使用方式（推荐） ===
//   <t-icon name="home" size="48rpx" color="#2C4A39" />
//   组件路径：components/base/t-icon/
//
// === 旧代码兼容垫片（已恢复） ===
// 旧页面继续使用：
//   import { iconPaths } from './config/icons';
//   data: { icons: iconPaths }
//   <image src="{{icons.home}}" />
// iconPaths 现已改为返回 SVG data URI 字符串（旧用法图片直接渲染图标）。
// 旧页面 0 修改即可继续工作——只是来源从 49 个本地 SVG 切换为 Tabler MIT。
//
// === 后续迁移路径 ===
// 1. 新页面/新代码：必须用 <t-icon> 组件（支持使用次数统计、动态换色、strokeWidth）
// 2. 旧页面：保持现状，逐页面改 WXML 把 <image src="{{icons.x}}"> 改为 <t-icon name="{{icons.x}}">
// 3. iconPaths 在所有旧页面迁移完后可整体删除

import {
  allIcons,
  getIconSvg,
  type IconName,
} from '../shared/icons/index';

export {
  getIconSvg,
  getIconPath,
  recordIconUsage,
  getIconUsage,
  dumpIconUsage,
  clearIconUsage,
  setIconUsageEnabled,
  allIcons,
  allIconNames,
  iconCategories,
} from '../shared/icons/index';

export type { IconName } from '../shared/icons/index';

function svgToDataUri(svg: string): string {
  // 微信小程序中 <image> 标签渲染 svg data URI 时，utf8 编码在真机上兼容性极差
  // 必须使用 base64 编码以保证在 iOS 和 Android 真机上均能正常渲染
  const bytes = new Uint8Array(svg.length);
  for (let i = 0; i < svg.length; i++) {
    bytes[i] = svg.charCodeAt(i) & 0xff;
  }
  const base64 = wx.arrayBufferToBase64(bytes.buffer);
  return 'data:image/svg+xml;base64,' + base64;
}

// 旧 iconPaths 兼容垫片：返回 SVG data URI 字符串。
// 注意：使用 Proxy 实现，旧代码中 `iconPaths.anyKey` 都会返回对应 SVG，
// 但 TypeScript 类型上只声明了已注册的 key。
function buildCompatIconPaths(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of Object.keys(allIcons)) {
    const svg = getIconSvg(key as IconName).replace(/currentColor/g, '#333333');
    out[key] = svgToDataUri(svg);
  }
  // 用户默认头像：浔源品牌 Logo
  out['defaultAvatar'] = '/assets/avatars/default-user.png';
  return out;
}

export const iconPaths: Record<string, string> = buildCompatIconPaths();
