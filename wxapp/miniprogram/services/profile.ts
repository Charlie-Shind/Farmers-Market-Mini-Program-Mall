export type ProfileDraft = {
  displayName: string;
  identityType: string;
  contactName: string;
  contactMobile: string;
  region: string;
  bio: string;
  avatarUrl: string;
};

const PROFILE_DRAFT_KEY = 'farm_profile_draft';
const DEFAULT_PROFILE_IDENTITY = 'C端普通用户';
const DEFAULT_PROFILE_REGION = '湾源县 · 个人中心';
const DEFAULT_PROFILE_CONTACT_MOBILE = '13800000000';
const DEFAULT_PROFILE_BIO = '正在浏览湾源农仓商品，关注产地直采和家庭采买。';

function readText(value?: string): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function createRandomProfileName(prefix = '农仓用户'): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';

  for (let index = 0; index < 4; index += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return `${prefix}${suffix}`;
}

export function normalizeProfileDraft(
  draft: Partial<ProfileDraft> = {},
  fallback: Partial<ProfileDraft> = {},
): ProfileDraft {
  const displayName = readText(draft.displayName) || readText(fallback.displayName) || createRandomProfileName();
  const identityType = readText(draft.identityType) || readText(fallback.identityType) || DEFAULT_PROFILE_IDENTITY;
  const contactName = readText(draft.contactName) || readText(fallback.contactName) || displayName;
  const contactMobile = readText(draft.contactMobile) || readText(fallback.contactMobile) || DEFAULT_PROFILE_CONTACT_MOBILE;
  const region = readText(draft.region) || readText(fallback.region) || DEFAULT_PROFILE_REGION;
  const bio = readText(draft.bio) || readText(fallback.bio) || DEFAULT_PROFILE_BIO;
  const avatarUrl = readText(draft.avatarUrl) || readText(fallback.avatarUrl);

  return {
    displayName,
    identityType,
    contactName,
    contactMobile,
    region,
    bio,
    avatarUrl,
  };
}

export function loadProfileDraft(): Partial<ProfileDraft> {
  try {
    const draft = wx.getStorageSync(PROFILE_DRAFT_KEY);
    if (draft && typeof draft === 'object') {
      return draft as Partial<ProfileDraft>;
    }
  } catch {
    // Ignore storage errors and fall back to backend data.
  }

  return {};
}

export function saveProfileDraft(draft: ProfileDraft): void {
  wx.setStorageSync(PROFILE_DRAFT_KEY, draft);
}

export function clearProfileDraft(): void {
  wx.removeStorageSync(PROFILE_DRAFT_KEY);
}
