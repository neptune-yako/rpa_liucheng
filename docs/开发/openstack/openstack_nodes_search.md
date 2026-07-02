# 0702-登陆服务端项目 openstack 关键字节点搜索报告

根据 `run-liuchengyi` Skill 对项目 `0702-登陆服务端` 的扫描结果，全流程共在 **2 个流程**中发现了 **12 个包含 "openstack" 关键字的节点**。

---

## 一、 流程：省系统扫码登录服务端 (flowId: FKXSU3rc)
此流程中包含 **11 个** 与 `openstack` 相关的节点，主要涉及数据库查询（SELECT）、插入（INSERT）、更新（UPDATE）、日志打印，以及子流程调用传参。

| 序号 | 节点 ID | 组件名称 | 匹配参数名 | 参数值 |
|---|---|---|---|---|
| 1 | `79X3HpIy` | 数据查询 | 执行的SQL语句 | `"select SESSION,openstack_cookie_insert,省账号,扫码次数,失效时间 from 用户账号对应表 where 用户账号='%s' "%用户账号` |
| 2 | `RROjf73F` | 调用子流程 | openstack_cookie_insert | `openstack_cookie_insert` |
| 3 | `FVoLrIe8` | 变量赋值 | 变量名称 | `openstack_cookie_insert` |
| 4 | `iRu3Edte` | 打印日志 | 打印内容 | `"insert into \`用户账号对应表\`(\`用户账号\`,\`省账号\`,\`SESSION\`,\`openstack_cookie_insert\`,\`更新时间\`,\`扫码次数\`,\`组织机构\`) values('%s','%s','%s','%s'...` |
| 5 | `N8oMXDYb` | 执行SQL语句 | 执行的SQL语句 | `"insert into \`用户账号对应表\`(\`用户账号\`,\`省账号\`,\`SESSION\`,\`openstack_cookie_insert\`,\`更新时间\`,\`扫码次数\`,\`组织机构\`) values('%s','%s','%s','%s'...` |
| 6 | `fKyTWioz` | 调用子流程 | openstack_cookie_insert | `openstack_cookie_insert` |
| 7 | `jSa6ib0D` | 打印日志 | 打印内容 | `"update 用户账号对应表 set 失效时间=null,省账号='%s',SESSION='%s',openstack_cookie_insert='%s',更新时间='%s',扫码次数='%d',组织机构='%s' where 用户账...` |
| 8 | `pt8xpiBB` | 执行SQL语句 | 执行的SQL语句 | `"update 用户账号对应表 set 失效时间=null,省账号='%s',SESSION='%s',openstack_cookie_insert='%s',更新时间='%s',扫码次数='%d',组织机构='%s' where 用户账...` |
| 9 | `5PfhQH2D` | 调用子流程 | openstack_cookie_insert | `openstack_cookie_insert` |
| 10 | `aET3bEKt` | 打印日志 | 打印内容 | `"update 用户账号对应表 set 失效时间='%s',省账号='%s',SESSION='%s',openstack_cookie_insert='%s',更新时间='%s',扫码次数='%d',组织机构='%s' where 用户账...` |
| 11 | `MDIMOwKg` | 执行SQL语句 | 执行的SQL语句 | `"update 用户账号对应表 set 失效时间='%s',省账号='%s',SESSION='%s',openstack_cookie_insert='%s',更新时间='%s',扫码次数='%d',组织机构='%s' where 用户账...` |

---

## 二、 流程：获取对应省信息 (flowId: Er2ayzBa)
此流程中包含 **1 个** 与 `openstack` 相关的节点，用于定义和接收 `openstack_cookie_insert` 变量。

| 序号 | 节点 ID | 组件名称 | 匹配参数名 | 参数值 |
|---|---|---|---|---|
| 12 | `W8b6qQ3H` | 变量赋值 | 变量名称 | `openstack_cookie_insert` |

---

## 三、 分析与总结
1. **数据流动关系**：`openstack_cookie_insert` 在子流程中被提取（Index 12），然后传回主流程，并广泛应用于主流程的日志审计以及数据库 `用户账号对应表` 的插入和更新 SQL 语句中。
2. **改版防灾建议**：由于在新版省系统中该 Cookie 缺失，在对子流程做无损屏蔽（使其赋空值 `''`）后，需要确保主流程在把空值 `''` 写入上述 SQL 语句时也能正常运行而不引发数据库约束错误（通常由于该字段允许为空，写入空字符串或 NULL 可以正常兼容）。

---
1. 主流程中的 11 个节点本身是安全的（不需要做结构性破坏修改）
主流程中的节点主要分为以下三类：

数据查询/更新/插入的 SQL 语句（如 79X3HpIy、N8oMXDYb、pt8xpiBB 等）： 在 SQL 中，openstack_cookie_insert 作为一个字段被 SELECT、INSERT 或 UPDATE。在数据库字段允许为空（NULL 或空字符串 ''）的情况下，写入一个空值不会引发任何 SQL 报错。
日志打印（如 iRu3Edte、jSa6ib0D 等）： 格式化字符串中将 openstack_cookie_insert 打印出来，如果变量值是空字符串 ''，只会打印出空值，不会导致 Python 报错崩溃。
子流程传参映射（如 RROjf73F 等）： 它只是用来接收子流程返回的参数。如果子流程能够安全返回一个空值 ''，那么主流程的接收和赋值就不会报错。
结论：主流程无需做任何修改。 我们应该极力避免去改动主流程中的 11 个节点，因为修改多处的 SQL 拼接和变量传递极其容易引发新的拼写或语法错误（符合 Trellis 极简修改与防错原则）。

2. 问题根源完全聚焦在子流程中的 1 个节点（需外科手术式精准修复）
崩溃的源头仅在于子流程 获取对应省信息 中的 Index 12（ID: W8b6qQ3H，在 JSON 中是 XxhRhdNW）：

它是唯一一个试图强行从 字符串数组[1] 中获取数据的地方。因为没有第二个 Cookie，此处必定触发 IndexError。
只要子流程在这里崩溃，主流程就永远拿不到输出变量 SESSION，导致主流程随之瘫痪。