export const PROJECT_COLORS = {
  brandGreen: '#2C4A39',
  brandGreenStrong: '#3F6F44',
  brandGold: '#D8A978',
  brandOrange: '#C65F2D',
  brandPurple: '#9663AA',
  brandText: '#333333',
  brandMuted: '#8A877F',
  brandLine: 'rgba(44, 74, 57, 0.08)',
  brandBg: '#F6F3EB',
  brandCard: 'rgba(255, 255, 255, 0.88)',
  brandIvory: '#FFF8E9',
  brandCream: '#F8F0D9',
  brandDanger: '#D93B2F',
  brandWhite: '#FFFFFF',
} as const;

export function resolveProjectColor(color?: string): string {
  if (!color) {
    return '';
  }

  return (PROJECT_COLORS as Record<string, string>)[color] || color;
}
