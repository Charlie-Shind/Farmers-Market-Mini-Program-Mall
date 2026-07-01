export const merchantHomeRoute = '/pages/merchant/dashboard/dashboard';
// 商户端导航配置（icon 为 Lucide 注册名）
export const merchantNavItems = [
  { key: 'home', label: '首页', icon: 'home', url: '/pages/merchant/dashboard/dashboard' },
  { key: 'chat', label: '聊天', icon: 'message', url: '/pages/merchant/messages/messages' },
  { key: 'orders', label: '订单', icon: 'invoice', url: '/pages/merchant/orders/orders' },
  { key: 'inventory', label: '库存', icon: 'package', url: '/pages/merchant/products/products' },
  { key: 'account', label: '账号', icon: 'profile', url: '/pages/merchant/shop/shop' },
] as const;

export type MerchantNavKey = (typeof merchantNavItems)[number]['key'];

export function isMerchantRoute(route: string): boolean {
  return route.startsWith('/pages/merchant/');
}
