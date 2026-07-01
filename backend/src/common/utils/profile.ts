import { createHash } from 'node:crypto';

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function buildFallbackNickname(seed: string, prefix = '微信用户'): string {
  const normalizedSeed = seed.trim() || 'profile';
  const suffix = createHash('sha256').update(normalizedSeed).digest('hex').slice(0, 4).toUpperCase();

  return `${prefix}${suffix}`;
}

export function resolveProfileNickname(value: unknown, seed: string, prefix = '微信用户'): string {
  return normalizeText(value) || buildFallbackNickname(seed, prefix);
}

export function resolveProfileText(value: unknown, fallback = ''): string {
  return normalizeText(value) || fallback;
}
