/**
 * 将 wxml 中的 ui-icon src="{{icons.xxx}}" 批量迁移为 t-icon name="xxx"
 * 运行：node scripts/migrate-ui-icon-to-t-icon.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '../wxapp/miniprogram');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.wxml')) out.push(full);
  }
  return out;
}

function migrateFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  // ui-icon -> t-icon when using icons.* src
  content = content.replace(/<ui-icon\b/g, '<t-icon');
  content = content.replace(/<\/ui-icon>/g, '</t-icon>');

  // src="{{icons.foo}}" -> name="foo"
  content = content.replace(
    /\bsrc="\{\{icons\.([a-zA-Z0-9_]+)\}\}"/g,
    'name="$1"',
  );

  // dynamic: src="{{statusIcon}}" stays - handled separately in TS

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    return true;
  }
  return false;
}

function ensureTIconInJson(file) {
  const jsonFile = file.replace(/\.wxml$/, '.json');
  if (!fs.existsSync(jsonFile)) return;

  const json = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  const comps = json.usingComponents || {};
  const hadUi = !!comps['ui-icon'];
  const hadT = !!comps['t-icon'];

  if (!hadT) {
    const rel = path
      .relative(path.dirname(jsonFile), path.join(ROOT, 'components/base/t-icon/t-icon'))
      .replace(/\\/g, '/');
    comps['t-icon'] = rel;
  }

  if (hadUi && !Object.values(comps).some((v) => typeof v === 'string' && v.includes('icon/icon'))) {
    // keep ui-icon if still referenced - check wxml
    const wxml = fs.readFileSync(file, 'utf8');
    if (!wxml.includes('<ui-icon')) {
      delete comps['ui-icon'];
    }
  } else if (hadUi) {
    const wxml = fs.readFileSync(file, 'utf8');
    if (!wxml.includes('<ui-icon')) delete comps['ui-icon'];
  }

  json.usingComponents = comps;
  fs.writeFileSync(jsonFile, JSON.stringify(json, null, 2) + '\n', 'utf8');
}

let changed = 0;
for (const file of walk(ROOT)) {
  if (migrateFile(file)) {
    changed += 1;
    ensureTIconInJson(file);
    console.log('Migrated:', path.relative(ROOT, file));
  }
}

console.log(`Done. ${changed} wxml files updated.`);
