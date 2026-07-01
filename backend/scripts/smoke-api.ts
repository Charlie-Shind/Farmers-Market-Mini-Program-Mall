import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

type SmokeMode = 'public' | 'auth';

type SmokeStep = {
  name: string;
  method: 'GET' | 'POST';
  path: string;
  body?: Record<string, unknown>;
  auth?: boolean;
};

type SmokeResult = {
  name: string;
  method: string;
  path: string;
  ok: boolean;
  status: number;
  durationMs: number;
  detail: string;
};

function loadLocalEnv() {
  const envPath = join(process.cwd(), '.env.local');
  if (!existsSync(envPath)) {
    return;
  }

  const content = readFileSync(envPath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const equalIndex = line.indexOf('=');
    if (equalIndex <= 0) {
      continue;
    }

    const key = line.slice(0, equalIndex).trim();
    const value = line.slice(equalIndex + 1).trim();
    if (key && process.env[key] == null) {
      process.env[key] = value;
    }
  }
}

function getArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const direct = process.argv.find((arg) => arg.startsWith(prefix));
  if (direct) {
    return direct.slice(prefix.length);
  }

  const separateIndex = process.argv.findIndex((arg) => arg === `--${name}`);
  if (separateIndex >= 0 && separateIndex + 1 < process.argv.length) {
    return process.argv[separateIndex + 1];
  }

  return undefined;
}

function normalizeBaseUrl(rawBaseUrl?: string) {
  const fallbackPort = process.env.PORT ?? '6002';
  const defaultBaseUrl = `http://127.0.0.1:${fallbackPort}/api`;
  return (rawBaseUrl ?? defaultBaseUrl).replace(/\/+$/, '');
}

function getMode(): SmokeMode {
  const mode = getArg('mode');
  return mode === 'auth' ? 'auth' : 'public';
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`request failed: ${url} - ${detail}`);
  }
  const payload = (await response.json()) as T;
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return payload;
}

async function getGuestToken(baseUrl: string) {
  const payload = await requestJson<{ data?: { token?: string } }>(`${baseUrl}/identity/auth/anonymous`);
  const token = payload?.data?.token;
  if (!token) {
    throw new Error('anonymous token missing in response.data.token');
  }
  return token;
}

function buildSteps(mode: SmokeMode): SmokeStep[] {
  const publicSteps: SmokeStep[] = [
    { name: 'status', method: 'GET', path: '/identity/auth/status' },
    { name: 'anonymous', method: 'GET', path: '/identity/auth/anonymous' },
    { name: 'categories', method: 'GET', path: '/app/categories' },
    { name: 'products', method: 'GET', path: '/app/products?pageSize=3' },
    { name: 'flash-sale-active', method: 'GET', path: '/app/quick/flash-sale/active' },
    { name: 'group-buy-products', method: 'GET', path: '/app/quick/group-buy/products?pageSize=3' },
  ];

  if (mode === 'public') {
    return publicSteps;
  }

  return [
    ...publicSteps,
    { name: 'me', method: 'GET', path: '/identity/auth/me', auth: true },
    { name: 'favorites', method: 'GET', path: '/app/favorites?pageSize=3', auth: true },
    { name: 'cart', method: 'GET', path: '/app/cart', auth: true },
    { name: 'orders', method: 'GET', path: '/app/orders?pageSize=3', auth: true },
    {
      name: 'group-buy-nearby',
      method: 'POST',
      path: '/app/quick/group-buy/nearby',
      body: { lat: 43.8171, lng: 125.3235, limit: 3 },
    },
  ];
}

async function runStep(baseUrl: string, step: SmokeStep, token?: string): Promise<SmokeResult> {
  const startedAt = Date.now();
  const headers: Record<string, string> = {};

  if (step.auth) {
    if (!token) {
      throw new Error(`step ${step.name} requires token`);
    }
    headers.Authorization = `Bearer ${token}`;
  }

  if (step.body) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(`${baseUrl}${step.path}`, {
      method: step.method,
      headers,
      body: step.body ? JSON.stringify(step.body) : undefined,
    });
    const durationMs = Date.now() - startedAt;
    const payload = (await response.json().catch(() => null)) as { message?: string; data?: unknown } | null;
    const detail = response.ok
      ? payload?.message ?? 'ok'
      : payload?.message ?? response.statusText;

    return {
      name: step.name,
      method: step.method,
      path: step.path,
      ok: response.ok,
      status: response.status,
      durationMs,
      detail,
    };
  } catch (error) {
    return {
      name: step.name,
      method: step.method,
      path: step.path,
      ok: false,
      status: 0,
      durationMs: Date.now() - startedAt,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main() {
  loadLocalEnv();

  const mode = getMode();
  const baseUrl = normalizeBaseUrl(getArg('baseUrl') ?? process.env.SMOKE_API_BASE_URL);
  const steps = buildSteps(mode);
  const token = mode === 'auth' ? await getGuestToken(baseUrl) : undefined;
  const results: SmokeResult[] = [];

  for (const step of steps) {
    results.push(await runStep(baseUrl, step, token));
  }

  const passed = results.filter((item) => item.ok).length;
  const failed = results.length - passed;
  console.log(
    JSON.stringify(
      {
        script: 'smoke:api',
        mode,
        baseUrl,
        total: results.length,
        passed,
        failed,
        results,
      },
      null,
      2,
    ),
  );

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
