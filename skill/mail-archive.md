# 邮件/IM 归档合规体检（dsh-mail-archive）

**什么时候用**：邮件/聊天记录导出归档后（留存义务、证据链准备）。
用户会说：「邮件归档怎么存才合规」「这些记录里有没有敏感信息」「归档能不能当证据用」。

## 怎么用

```bash
<cli 路径> --root <归档目录>              # 常规检查
<cli 路径> --root <目录> --index          # 生成 MANIFEST.json + 索引.csv
<cli 路径> --demo | --json | --html r.html
```

## 它查什么（4 条 + PII 补扫）

| 规则 | 查什么 | 级别 |
|---|---|---|
| `MAIL-INDEX` | 缺索引文件 | high |
| `MAIL-RETENTION` | 无留存期限说明 | medium |
| `MAIL-EXPORT-NOTE` | 无导出说明（时间/范围/来源） | low |
| `MAIL-PII` | 归档内容里的身份证/银行卡/手机号（**带校验和、打码展示**；.eml 由本插件补扫） | medium |

## 怎么用 --index

.eml 会被解析出 Date/From/To/Subject 写进 MANIFEST.json 与 索引.csv（Excel 可开，带 BOM）；这个索引就是归档的目录页。
