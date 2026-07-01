import { getAuthUserRole, isAccessSession, isMerchantSession } from '../services/token';
import { isMerchantRoute, merchantHomeRoute } from '../config/merchant';

const TAB_BAR_ROUTES = new Set([
  '/pages/index/index',
  '/pages/category/category',
  '/pages/marketing/marketing',
  '/pages/cart/cart',
  '/pages/profile/profile',
]);

const PROFILE_ROUTES = new Set([
  '/pages/profile/profile',
  '/pages/profile/home/home',
  '/pages/profile/edit/edit',
]);

const INDEX_ROUTE = '/pages/index/index';
const PROFILE_HOME_ROUTE = '/pages/profile/home/home';

function normalizeRoute(route: string): string {
  const [path] = route.split('?');

  return path.startsWith('/') ? path : `/${path}`;
}

export function buildLoginUrl(redirectPath = '/pages/profile/profile'): string {
  return `/pages/login/login?redirect=${encodeURIComponent(redirectPath)}`;
}

export { isMerchantRoute } from '../config/merchant';

export function buildProfileLoginUrl(redirectPath = PROFILE_HOME_ROUTE): string {
  return buildLoginUrl(redirectPath);
}

export function isProfileRoute(route: string): boolean {
  return PROFILE_ROUTES.has(normalizeRoute(route));
}

export function resolveSafeLoginBackPath(rawPath?: string): string {
  const resolved = resolveRedirectPath(rawPath, INDEX_ROUTE);

  if (isProfileRoute(resolved)) {
    return INDEX_ROUTE;
  }

  return resolved;
}

export function resolveRedirectPath(
  rawPath?: string,
  fallbackPath = '/pages/profile/profile',
): string {
  if (!rawPath) {
    return fallbackPath;
  }

  try {
    const decoded = decodeURIComponent(rawPath).trim();
    if (!decoded) {
      return fallbackPath;
    }

    return decoded.startsWith('/') ? decoded : `/${decoded}`;
  } catch {
    return fallbackPath;
  }
}

export function navigateAfterLogin(
  redirectPath?: string,
  fallbackPath = '/pages/profile/profile',
  role?: string,
): void {
  const targetPath = resolveRedirectPath(redirectPath, fallbackPath);
  const currentRole = role || getAuthUserRole();
  const normalizedTarget = normalizeRoute(targetPath);

  if (currentRole === 'GUEST' && isProfileRoute(normalizedTarget)) {
    const guestFallback = normalizeRoute(resolveRedirectPath(fallbackPath, INDEX_ROUTE));
    wx.reLaunch({
      url: isProfileRoute(guestFallback) ? INDEX_ROUTE : guestFallback,
    });
    return;
  }

  if (isMerchantRoute(normalizedTarget) && currentRole !== 'MERCHANT') {
    wx.reLaunch({
      url: resolveRedirectPath(fallbackPath, INDEX_ROUTE),
    });
    return;
  }

  if (currentRole === 'MERCHANT' && !isMerchantRoute(normalizedTarget)) {
    wx.reLaunch({
      url: merchantHomeRoute,
    });
    return;
  }

  if (TAB_BAR_ROUTES.has(normalizedTarget)) {
    wx.reLaunch({
      url: normalizedTarget,
    });
    return;
  }

  wx.redirectTo({
    url: targetPath,
  });
}

export function navigateBackOrHome(delta = 1): void {
  const pages = getCurrentPages();

  if (pages.length > delta) {
    wx.navigateBack({
      delta,
    });
    return;
  }

  wx.reLaunch({
    url: INDEX_ROUTE,
  });
}

export function navigateBackOrMerchantHome(delta = 1): void {
  const pages = getCurrentPages();

  if (pages.length > delta) {
    wx.navigateBack({
      delta,
    });
    return;
  }

  wx.reLaunch({
    url: merchantHomeRoute,
  });
}

export function buildMerchantLoginUrl(redirectPath = merchantHomeRoute): string {
  return buildLoginUrl(redirectPath);
}

export function ensureMerchantAccess(redirectPath = merchantHomeRoute): boolean {
  if (isMerchantSession() || getAuthUserRole() === 'MERCHANT') {
    return true;
  }

  wx.redirectTo({
    url: buildMerchantLoginUrl(redirectPath),
  });

  return false;
}

export function ensureCustomerAccess(redirectPath: string): boolean {
  if (isMerchantSession()) {
    wx.reLaunch({
      url: merchantHomeRoute,
    });
    return false;
  }

  if (!isAccessSession()) {
    wx.navigateTo({
      url: buildLoginUrl(redirectPath),
    });
    return false;
  }

  return true;
}

export function redirectMerchantAwayFromCustomerRoute(rawRoute?: string): boolean {
  const role = getAuthUserRole();

  if (role !== 'MERCHANT') {
    return false;
  }

  const pages = getCurrentPages();
  const currentRoute = rawRoute || pages[pages.length - 1]?.route || '';
  const normalizedRoute = normalizeRoute(currentRoute);

  if (isMerchantRoute(normalizedRoute)) {
    return false;
  }

  wx.reLaunch({
    url: merchantHomeRoute,
  });

  return true;
}
