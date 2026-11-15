/**
 * dsh-mail-archive · .eml/.txt 邮件归档的补充扫描与索引
 * guard-core 的 check 实现内联引用模块级 readText（.eml 不在其文本白名单），
 * 所以 eml 的解析与 PII 补扫在这里做，结果合并进回执（打码输出）。
 */
import { readFileSync } from 'node:fs';

const ID_RE = /(?<![0-9])[1-9][0-9]{5}(?:19|20)[0-9]{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12][0-9]|3[01])[0-9]{3}[0-9Xx](?![0-9])/g;
const CARD_RE = /(?<![0-9])(?:62|4[0-9]{2}|5[1-5][0-9]{2}|3[47][0-9]{2})[0-9]{8,15}(?![0-9])/g;
const PHONE_RE = /(?<![0-9])(?:\+?86[-\s]?)?1(?:3[0-9]|4[5-9]|5[0-35-9]|6[2567]|7[0-8]|8[0-9]|9[0-35-9])[0-9]{8}(?![0-9])/g;

function idValid(s) {
  const w = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const map = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
  const d = s.toUpperCase().split('');
  let sum = 0;
  for (let i = 0; i < 17; i++) sum += Number(d[i]) * w[i];
  return map[sum % 11] === d[17];
}
function luhn(s) {
  const d = s.split('').reverse().map(Number);
  let sum = 0;
  d.forEach((x, i) => { if (i % 2 === 1) { x *= 2; if (x > 9) x -= 9; } sum += x; });
  return sum % 10 === 0;
}
export const mask = (s) => (String(s).length <= 6 ? '***' : String(s).slice(0, 3) + '***' + String(s).slice(-3));

/** 扫一段文本里的敏感个人信息（带校验和，输出打码） */
export function scanPiiText(text) {
  const hits = [];
  const scanOne = (re, label, validate) => {
    const r = new RegExp(re.source, re.flags);
    let m;
    while ((m = r.exec(text)) !== null) {
      if (validate && !validate(m[0])) continue;
      hits.push({ type: label, masked: mask(m[0]) });
      if (hits.length >= 50) return;
    }
  };
  scanOne(ID_RE, '身份证', idValid);
  scanOne(CARD_RE, '银行卡', luhn);
  scanOne(PHONE_RE, '手机号', null);
  return hits;
}

/** 解析 .eml 头部 */
export function parseEmlHeaders(text) {
  const out = {};
  for (const h of ['Date', 'From', 'To', 'Subject']) {
    const m = text.match(new RegExp('^' + h + ':[ \\t]*(.+)$', 'im'));
    if (m) out[h.toLowerCase()] = m[1].trim();
  }
  return out;
}

/** 对整个归档目录做 eml/文本 PII 补扫，返回 findings（guard-core finding 结构） */
export function scanArchivePii(files, readText) {
  const findings = [];
  for (const f of files) {
    if (!['.eml', '.txt', '.md', '.html', '.csv', '.json'].includes(f.ext)) continue;
    const t = f.ext === '.eml' ? (f.isText !== undefined ? readFileSync(f.abs, 'utf-8') : null) : readText(f);
    if (!t) continue;
    const lines = t.split('\n');
    lines.forEach((line, i) => {
      for (const h of scanPiiText(line)) {
        findings.push({
          ruleId: 'MAIL-PII', title: '归档邮件/聊天记录中包含未打码的敏感个人信息', severity: 'medium',
          source: '《个人信息保护法》—— 归档属于继续处理，应遵循最小必要；对外提供前应去标识化',
          advice: '定位处为' + h.type + '（已打码）。归档外发、共享前先做去标识化处理；确需原值的限定接触人并留痕。',
          file: f.path, line: i + 1, evidence: `${h.type}（已打码：${h.masked}）`,
        });
      }
    });
  }
  return findings;
}
