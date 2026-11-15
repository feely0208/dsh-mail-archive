#!/usr/bin/env node
/**
 * dsh-mail-archive —— 邮件/IM 归档合规体检（guard-core + 归档索引扩展）
 *
 * 用法：
 *   dsh-mail-archive --root <归档目录>            # 常规检查（索引/留存/PII/导出说明）
 *   dsh-mail-archive --root <目录> --index        # 生成 MANIFEST.json + 索引.csv
 *   dsh-mail-archive --demo | --json | --html r.html
 *
 * .eml 不在 guard-core 默认文本白名单，这里用 checkCtx.readText 覆写让 .eml 可读。
 */
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scan } from '@deepwhale-cn/dsh-guard-core';
import { scanArchivePii } from '../lib/mails.mjs';
import { textReport, htmlReport, jsonReport } from '@deepwhale-cn/dsh-guard-core/report';

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(pkgRoot, 'package.json'), 'utf-8'));
const META = { name: '深鲸守护 · 邮件/IM 归档合规体检', version: pkg.version, desc: pkg.description };

const args = process.argv.slice(2);
const has = (k) => args.includes('--' + k);
const val = (k, d = '') => {
  const i = args.indexOf('--' + k);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d;
};

if (has('help')) {
  console.log(`dsh-mail-archive —— 邮件/IM 归档合规体检

用法：dsh-mail-archive [--root 归档目录] [--index] [--json] [--html out.html]
检查：索引文件 / 留存期限说明 / 敏感个人信息（打码展示）/ 导出说明。
--index：扫描 .eml（解析 Date/From/To/Subject）与 .md/.txt（取修改时间），生成 MANIFEST.json + 索引.csv。`);
  process.exit(0);
}

const root = has('demo') ? join(pkgRoot, 'tests/fixtures/fail/demo-project') : val('root', process.cwd());

/** .eml 也当文本读（guard-core 默认不读 eml） */
const ctxReadText = (f) => {
  if (f.isText || f.ext === '.eml') {
    try { return readFileSync(f.abs, 'utf-8'); } catch { return null; }
  }
  return null;
};

function loadRules() {
  return require0(join(pkgRoot, 'rules'));
}
function require0(dir) {
  return readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(join(dir, f), 'utf-8')));
}

// ── 常规检查 ──
const rules = loadRules();
let { findings, stats } = scan({ root, rules, rootLabel: has('demo') ? '内置演示样本 · 故意有问题' : null });
// .eml 的 PII 补扫（guard-core 文本白名单不含 .eml，见 lib/mails.mjs 说明）
{
  const { walk } = await import('@deepwhale-cn/dsh-guard-core');
  const { files } = walk(root);
  const extra = scanArchivePii(files, ctxReadText);
  if (extra.length) {
    findings = [...findings, ...extra];
    stats = { ...stats, findings: findings.length };
  }
}

if (has('index')) {
  const rows = [];
  (function rec(dir) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, e.name);
      if (e.isDirectory()) { rec(full); continue; }
      const st = statSync(full);
      const row = { file: full, bytes: st.size, mtime: new Date(st.mtimeMs).toISOString().slice(0, 19).replace('T', ' ') };
      if (e.name.endsWith('.eml')) {
        const t = readFileSync(full, 'utf-8');
        for (const h of ['Date', 'From', 'To', 'Subject']) {
          const m = t.match(new RegExp('^' + h + ':[ \\t]*(.+)$', 'im'));
          if (m) row[h.toLowerCase()] = m[1].trim();
        }
      }
      rows.push(row);
    }
  })(root);
  const manifest = { generated_at: new Date().toISOString(), source: root, count: rows.length, entries: rows };
  const outDir = val('out', root);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'MANIFEST.json'), JSON.stringify(manifest, null, 2), 'utf-8');
  const csv = ['文件,大小,修改时间,日期,发件人,收件人,主题',
    ...rows.map((r) => [r.file, r.bytes, r.mtime, r.date || '', r.from || '', r.to || '', r.subject || '']
      .map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(','))].join('\n');
  writeFileSync(join(outDir, '索引.csv'), '\ufeff' + csv, 'utf-8');
  if (!has('json')) console.log(`已生成 ${join(outDir, 'MANIFEST.json')} 与 索引.csv（${rows.length} 条）`);
  if (!has('json') && !has('quiet')) process.exit(0);
  else if (!has('json')) process.exit(0);
}

if (has('json')) {
  console.log(jsonReport({ findings, stats, meta: META }));
} else if (has('quiet')) {
  console.log(`${stats.findings} 条命中 · 扫描 ${stats.scannedFiles} 文件 · ${stats.rulesRun} 规则`);
} else {
  if (has('demo')) console.log('\n  【演示模式】使用内置样本，不是你的真实项目。\n');
  console.log(textReport({ findings, stats, meta: META }));
}
if (has('html')) {
  writeFileSync(val('html'), htmlReport({ findings, stats, meta: META }), 'utf-8');
  if (!has('quiet') && !has('json')) console.log(`  HTML 报告已写入：${val('html')}\n`);
}
process.exit(findings.some((f) => f.severity === 'high') ? 1 : 0);
