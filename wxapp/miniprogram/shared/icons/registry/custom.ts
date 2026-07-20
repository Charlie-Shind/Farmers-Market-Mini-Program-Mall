// 营销中心分区标题专用图标（手绘精简稿，非 Lucide 生成）
// 均为颜色填充实心风格：元素自带 fill="currentColor" stroke="none"，
// 覆盖 t-icon 外层 <svg> 的 fill="none" stroke="currentColor" 默认值。
export const customIcons = {
  // 券：实心票根，右侧打孔虚线（evenodd 挖孔）
  mktCoupon:
    '<path fill="currentColor" stroke="none" fill-rule="evenodd" d="M3 7.5A1.5 1.5 0 0 1 4.5 6h15A1.5 1.5 0 0 1 21 7.5v2.2a2.2 2.2 0 0 0 0 4.6v2.2A1.5 1.5 0 0 1 19.5 18h-15A1.5 1.5 0 0 1 3 16.5v-2.2a2.2 2.2 0 0 0 0-4.6Z M14.8 7.9a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8Z M14.8 11.1a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8Z M14.8 14.3a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8Z"/>',
  // 秒杀：实心闪电
  mktFlash:
    '<path fill="currentColor" stroke="none" d="M13.4 2.3c.24-.36-.2-.78-.54-.5L4.4 13a.5.5 0 0 0 .4.8h5.3L8.9 21.4c-.06.42.46.64.72.3l8-10.9a.5.5 0 0 0-.4-.8h-5.3l1.48-7.7Z"/>',
  // 拼团：邻里两人（实心，后方人物降透明度做层次）
  mktGroup:
    '<circle cx="16.8" cy="8.6" r="2.6" fill="currentColor" stroke="none" opacity="0.55"/><path fill="currentColor" stroke="none" opacity="0.55" d="M13.6 20a4.7 4.7 0 0 1 9.4 0v.2h-9.4Z"/><circle cx="8.8" cy="7.6" r="3.4" fill="currentColor" stroke="none"/><path fill="currentColor" stroke="none" d="M2.4 20.2a6.4 6.4 0 0 1 12.8 0v.1H2.4Z"/>',
  // 积分：麦穗/双叶（实心叶片 + 圆角茎秆）
  mktPoints:
    '<path fill="currentColor" stroke="none" d="M12 9.8C9.7 7.2 6.6 6.5 3.4 7.4c1.2 3.3 3.4 5.4 8.6 6.1Z"/><path fill="currentColor" stroke="none" d="M12 9.8c2.3-2.6 5.4-3.3 8.6-2.4-1.2 3.3-3.4 5.4-8.6 6.1Z"/><rect x="11.1" y="11" width="1.8" height="10" rx="0.9" fill="currentColor" stroke="none"/>',
} as const;
