import { ConfigService } from '@nestjs/config';

export function requireConfigValue(configService: ConfigService, key: string): string {
  const value = configService.get<string>(key)?.trim();
  if (!value) {
    throw new Error(`${key} is required`);
  }

  return value;
}
