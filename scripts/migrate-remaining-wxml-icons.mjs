/**
 * 将 wxml 中剩余的 image 图标替换为 t-icon
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '../wxapp/miniprogram');

const STATIC_MAP = {
  '/assets/icons/home.svg': 'home',
  '/assets/icons/message.svg': 'message',
  '/assets/icons/order.svg': 'invoice',
  '/assets/icons/box.svg': 'package',
  '/assets/icons/user.svg': 'profile',
  '/assets/icons/store.svg': 'shop',
  '/assets/icons/chevron.svg': 'chevronRight',
  '/assets/icons/chevron-right.svg': 'chevronRight',
};

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.wxml')) out.push(full);
  }
  return out;
}

function migrate(content) {
  let next = content;

  for (const [src, name] of Object.entries(STATIC_MAP)) {
    const re = new RegExp(`<image[^>]*src="${src.replace(/\//g, '\\/')}"[^>]*\\/?>`, 'g');
    next = next.replace(re, `<t-icon name="${name}" size="40rpx"></t-icon>`);
  }

  next = next.replace(
    /<image class="fit-icon" src="\{\{item\.icon\}\}" mode="aspectFit"\s*\/>/g,
    '<t-icon name="{{item.icon}}" size="40rpx"></t-icon>',
  );
  next = next.replace(
    /<image class="fit-icon" src="\{\{row\.icon\}\}" mode="aspectFit"\s*\/>/g,
    '<t-icon name="{{row.icon}}" size="40rpx"></t-icon>',
  );
  next = next.replace(
    /<image class="nav-icon" src="\{\{item\.icon\}\}" mode="aspectFit"\s*\/>/g,
    '<t-icon name="{{item.icon}}" size="40rpx"></t-icon>',
  );
  next = next.replace(
    /<view class="icon-box nav-icon"><image class="fit-icon" src="\{\{item\.icon\}\}" mode="aspectFit" \/><\/view>/g,
    '<view class="icon-box nav-icon"><t-icon name="{{item.icon}}" size="40rpx"></t-icon></view>',
  );
  next = next.replace(
    /<view class="process-index"><image class="fit-icon" src="\{\{item\.icon\}\}" mode="aspectFit" \/><\/view>/g,
    '<view class="process-index"><t-icon name="{{item.icon}}" size="40rpx"></t-icon></view>',
  );

  return next;
}

let changed = 0;
for (const file of walk(ROOT)) {
  const original = fs.readFileSync(file, 'utf8');
  const next = migrate(original);
  if (next !== original) {
    fs.writeFileSync(file, next, 'utf8');
    changed += 1;
    console.log('Updated:', path.relative(ROOT, file));
  }
}

console.log(`Done. ${changed} wxml files updated.`);
