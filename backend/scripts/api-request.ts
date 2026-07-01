import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

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

function normalizeMethod(value?: string): Method {
  const upper = (value ?? 'GET').toUpperCase();
  if (upper === 'POST' || upper === 'PUT' || upper === 'PATCH' || upper === 'DELETE') {
    return upper;
  }
  return 'GET';
}

function parseJsonArg(raw: string | undefined, fallback: unknown = undefined) {
  if (!raw) {
    return fallback;
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`invalid JSON: ${raw}`);
  }
}

async function main() {
  loadLocalEnv();

  const baseUrl = normalizeBaseUrl(getArg('baseUrl') ?? process.env.API_BASE_URL);
  const method = normalizeMethod(getArg('method'));
  const path = getArg('path');
  if (!path) {
    throw new Error('missing --path=/api/... parameter');
  }

  const query = parseJsonArg(getArg('query'), {});
  const body = parseJsonArg(getArg('body'));
  const headersInput = parseJsonArg(getArg('headers'), {});
  const token = getArg('token');
  const pretty = getArg('pretty') !== 'false';

  const url = new URL(`${baseUrl}${path.startsWith('/') ? path : `/${path}`}`);
  if (query && typeof query === 'object' && !Array.isArray(query)) {
    for (const [key, value] of Object.entries(query as Record<string, unknown>)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const headers: Record<string, string> = {
    ...(headersInput && typeof headersInput === 'object' && !Array.isArray(headersInput)
      ? Object.fromEntries(
          Object.entries(headersInput as Record<string, unknown>)
            .filter(([, value]) => value !== undefined && value !== null)
            .map(([key, value]) => [key, String(value)]),
        )
      : {}),
  };

  if (token) {
    headers.authorization = `Bearer ${token}`;
  }
  if (body !== undefined) {
    headers['content-type'] = headers['content-type'] ?? 'application/json';
  }

  const startedAt = Date.now();
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error(
      JSON.stringify(
        {
          ok: false,
          status: 0,
          method,
          url: url.toString(),
          durationMs: Date.now() - startedAt,
          error: `request failed: ${detail}`,
          hint: 'check whether backend is running and whether --baseUrl points to the correct API host',
        },
        null,
        2,
      ),
    );
    process.exit(1);
    return;
  }
  const durationMs = Date.now() - startedAt;

  let responseBody: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      responseBody = JSON.parse(text);
    } catch {
      responseBody = text;
    }
  }

  const output = {
    ok: response.ok,
    status: response.status,
    method,
    url: url.toString(),
    durationMs,
    response: responseBody,
  };

  console.log(pretty ? JSON.stringify(output, null, 2) : JSON.stringify(output));
  if (!response.ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
