export * from './mails.mjs';

// ── DSH 插件接入（方案 A 薄壳：注册 skill 与 CLI 入口；业务逻辑仍在 lib/bin，不在此处）──
import { createPlugin, pkgRootFrom } from '@deepwhale-cn/dsh-guard-core/plugin';

export const { name, inject, apply } = createPlugin({
  name: 'mail-archive',
  pkgRoot: pkgRootFrom(import.meta.url),
  skillFile: 'skill/mail-archive.md',
  binFile: 'bin/cli.mjs',
  description: "检查邮件与聊天记录导出归档：索引清单、留存说明、敏感信息打码提醒 —— 企业留存义务的证据链",
  whenToUse: "邮件与聊天记录导出归档后的合规检查与索引生成。用户会说：邮件归档合规吗、生成归档索引。",
});
