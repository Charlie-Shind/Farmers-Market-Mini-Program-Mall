const TOKEN_KEY = 'farm_access_token';
const TOKEN_TYPE_KEY = 'farm_access_token_type';
const USER_ROLE_KEY = 'farm_user_role';
const CURRENT_SUB_KEY = 'farm_current_sub';

export type AuthTokenType = 'access' | 'guest';
export type AuthUserRole = 'GUEST' | 'USER' | 'MERCHANT' | 'ADMIN' | 'LEADER' | '';

function updateAppToken(token?: string, tokenType?: AuthTokenType, userRole?: string) {
  try {
    const app = getApp<any>();
    app.globalData.accessToken = token;
    app.globalData.accessTokenType = tokenType || '';
    app.globalData.userRole = userRole || '';
  } catch (error) {
    // App not ready yet.
  }
}

export function setToken(
  token: string,
  tokenType: AuthTokenType = 'access',
  userRole: string = '',
): void {
  wx.setStorageSync(TOKEN_KEY, token);
  wx.setStorageSync(TOKEN_TYPE_KEY, tokenType);
  if (userRole) {
    wx.setStorageSync(USER_ROLE_KEY, userRole);
  }

  updateAppToken(token, tokenType, userRole);
}

export function setCurrentSub(sub: string | null): void {
  if (sub) {
    wx.setStorageSync(CURRENT_SUB_KEY, sub);
  } else {
    wx.removeStorageSync(CURRENT_SUB_KEY);
  }
}

export function getCurrentSub(): string {
  return wx.getStorageSync(CURRENT_SUB_KEY) || '';
}

export function clearCurrentSub(): void {
  wx.removeStorageSync(CURRENT_SUB_KEY);
}

export function setGuestMode(): void {
  wx.removeStorageSync(TOKEN_KEY);
  wx.setStorageSync(TOKEN_TYPE_KEY, 'guest');
  wx.setStorageSync(USER_ROLE_KEY, 'GUEST');
  wx.removeStorageSync(CURRENT_SUB_KEY);
  updateAppToken(undefined, 'guest', 'GUEST');
}

export function getToken(): string {
  return wx.getStorageSync(TOKEN_KEY) || '';
}

export function getAuthTokenType(): AuthTokenType | '' {
  const tokenType = wx.getStorageSync(TOKEN_TYPE_KEY);

  if (tokenType === 'access' || tokenType === 'guest') {
    return tokenType;
  }

  return getToken() ? 'access' : '';
}

export function removeToken(): void {
  wx.removeStorageSync(TOKEN_KEY);
  wx.removeStorageSync(TOKEN_TYPE_KEY);
  wx.removeStorageSync(USER_ROLE_KEY);
  wx.removeStorageSync(CURRENT_SUB_KEY);
  updateAppToken(undefined, undefined, undefined);
}

export function hasToken(): boolean {
  return Boolean(getToken());
}

export function isAccessSession(): boolean {
  return getAuthTokenType() === 'access';
}

export function isGuestSession(): boolean {
  return getAuthTokenType() === 'guest';
}

export function getAuthUserRole(): AuthUserRole {
  const userRole = wx.getStorageSync(USER_ROLE_KEY);

  if (userRole === 'GUEST' || userRole === 'USER' || userRole === 'MERCHANT' || userRole === 'ADMIN' || userRole === 'LEADER') {
    return userRole;
  }

  if (isGuestSession()) {
    return 'GUEST';
  }

  return '';
}

export function isMerchantSession(): boolean {
  return getAuthUserRole() === 'MERCHANT';
}
