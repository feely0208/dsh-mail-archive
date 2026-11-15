# @deepwhale-cn/dsh-mail-archive

> **技能型插件 · 无面板**：安装后由 DSH 智能体按 skill 说明调用 CLI；无独立面板界面。

安装到 DSH：

```bash
dsh plugin --profile web add @deepwhale-cn/dsh-mail-archive
```

邮件/IM 归档合规体检：索引清单、留存期限说明、敏感信息打码提醒（.eml 补扫），一键生成 MANIFEST.json + 索引.csv。（深鲸守护系列 · 基于 dsh-guard-core + 归档索引扩展）

```bash
npx @deepwhale-cn/dsh-mail-archive --root <归档目录>
npx @deepwhale-cn/dsh-mail-archive --root <目录> --index
```

规则 4 条；PII 扫描带身份证/银行卡校验位验证（不误报），输出永远打码。
