---
name: run-liuchengyi
description: Start, drive, and interact with 流程易 (FlowEasy) RPA platform. Use when asked to run 流程易, query flows, search components, modify node parameters, edit global variables, scan for patterns, batch-replace values, or call any 流程易 API.
---

流程易 (FlowEasy) 是一个 Electron 桌面 RPA 平台。启动后在 `127.0.0.1:5555` 暴露 REST API。

驱动方式：`.gemini/skills/run-liuchengyi/driver.mjs`（Node.js，零依赖，仅用内置 `fetch`）。

所有路径相对于 `d:\1_Work\Yundi\Code\AI_lcy\`。

## Prerequisites

- 流程易桌面应用必须正在运行（默认监听 `127.0.0.1:5555`）
- Node.js ≥ 18

```bash
# 验证 API 可访问
curl http://127.0.0.1:5555/projectManagement/query_project/
```

## 远程连接

默认连接 `127.0.0.1:5555`。要连接远程设计器后台，设置 `FLOWEASY_API` 环境变量：

```bash
# Windows cmd
set FLOWEASY_API=http://192.168.1.100:5555
node .gemini/skills/run-liuchengyi/driver.mjs list-projects

# Windows PowerShell
$env:FLOWEASY_API="http://192.168.1.100:5555"
node .gemini/skills/run-liuchengyi/driver.mjs list-projects

# Git Bash（单次生效）
FLOWEASY_API=http://192.168.1.100:5555 node .gemini/skills/run-liuchengyi/driver.mjs list-projects
```

> **注意**：远程机器必须已启动设计器后台（app.py）且端口可访问。当前版本无需登录认证。

## Run (agent path)

Driver 是通用 CLI，覆盖流程易所有 REST API。

### 查询

```bash
# 列出所有项目
node .gemini/skills/run-liuchengyi/driver.mjs list-projects

# 列出项目的流程（★ = 主流程，├─ = 子流程）
node .gemini/skills/run-liuchengyi/driver.mjs list-flows --project "天河"

# 查看流程完整详情（全局变量、所有节点、参数、子节点树）
node .gemini/skills/run-liuchengyi/driver.mjs show-flow --flow-id "<flowId>"

# 查看单个节点
node .gemini/skills/run-liuchengyi/driver.mjs show-node --flow-id "<flowId>" --node-id "<nodeId>"
```

### 搜索

```bash
# 在单个流程中搜索关键词
node .gemini/skills/run-liuchengyi/driver.mjs search --flow-id "<flowId>" --keyword "邮件"

# 跨项目所有流程搜索
node .gemini/skills/run-liuchengyi/driver.mjs search-all --project "天河" --keyword "12345"

# 扫描所有 URL/IP 模式（无 --keyword 时自动匹配 URL 和 IP）
node .gemini/skills/run-liuchengyi/driver.mjs scan --project "天河"

# 扫描指定关键词
node .gemini/skills/run-liuchengyi/driver.mjs scan --project "天河" --keyword "10.194"
```

### 组件管理

```bash
# 列出所有可用组件（全量）
node .gemini/skills/run-liuchengyi/driver.mjs list-modules

# 查看单个组件定义
node .gemini/skills/run-liuchengyi/driver.mjs show-module --module-id "<moduleId>"
```

### 全局变量管理

```bash
# 查询流程的所有全局变量
node .gemini/skills/run-liuchengyi/driver.mjs query-global --flow-id "<flowId>"

# 添加全局变量
node .gemini/skills/run-liuchengyi/driver.mjs add-global \
  --flow-id "<flowId>" --name "变量名" \
  [--value "默认值"] [--value-type "string"] [--desc "描述"] [--encrypt 0]

# 删除全局变量
node .gemini/skills/run-liuchengyi/driver.mjs del-global \
  --flow-id "<flowId>" --var-id "<varId>"
```

### 流程节点（增删/启停）

```bash
# 向流程添加组件节点（type: "add"=添加到末尾, "after"=插入到指定节点之后）
node .gemini/skills/run-liuchengyi/driver.mjs add-node \
  --flow-id "<flowId>" --module-id "<moduleId>" --prefix-node-id "<prevNodeId>"

# 删除流程节点（多个用逗号分隔）
node .gemini/skills/run-liuchengyi/driver.mjs del-node \
  --flow-id "<flowId>" --node-ids "nodeId1,nodeId2"

# 启用/禁用流程节点
node .gemini/skills/run-liuchengyi/driver.mjs toggle-node \
  --flow-id "<flowId>" --node-ids "nodeId1,nodeId2" --disable
node .gemini/skills/run-liuchengyi/driver.mjs toggle-node \
  --flow-id "<flowId>" --node-ids "nodeId1,nodeId2" --enable
```

### 流程参数（入参/出参）

```bash
# 查询流程的所有入参和出参
node .gemini/skills/run-liuchengyi/driver.mjs query-params --flow-id "<flowId>"

# 添加入参 (--param-type 0)
node .gemini/skills/run-liuchengyi/driver.mjs add-param \
  --flow-id "<flowId>" --name "参数名" --default "默认值" \
  --value-type "string" --param-type 0 --desc "参数描述"

# 添加出参 (--param-type 1)
node .gemini/skills/run-liuchengyi/driver.mjs add-param \
  --flow-id "<flowId>" --name "输出参数" --value-type "string" --param-type 1

# 修改流程参数
node .gemini/skills/run-liuchengyi/driver.mjs update-param \
  --flow-id "<flowId>" --param-id "<paramId>" --name "新名称" \
  --value-type "string" --param-type 0 --desc "新描述"

# 删除流程参数
node .gemini/skills/run-liuchengyi/driver.mjs del-param \
  --flow-id "<flowId>" --param-id "<paramId>"
```

### 修改

```bash
# 修改节点参数（建议始终传入 --display 和 --name 避免覆盖原始值）
node .gemini/skills/run-liuchengyi/driver.mjs edit-node \
  --flow-id "<flowId>" --node-id "<nodeId>" --param-id "<paramId>" \
  --value "新值" [--display "显示名"] [--name "参数名"] [--value-type "python|string|int|..."]
# ⚠ 不传 --value-type 默认使用 string，并打印警告。python 类型参数务必指定 --value-type python

# 修改全局变量
node .gemini/skills/run-liuchengyi/driver.mjs edit-global \
  --flow-id "<flowId>" --var-id "<varId>" --value "新值" \
  [--name "变量名"] [--value-type "string"]

# 修改流程描述
node .gemini/skills/run-liuchengyi/driver.mjs edit-flow-desc \
  --flow-id "<flowId>" --desc "新描述"

# 修改节点描述（备注）
node .gemini/skills/run-liuchengyi/driver.mjs edit-node-desc \
  --flow-id "<flowId>" --node-id "<nodeId>" --desc "备注内容"

# 重命名流程
node .gemini/skills/run-liuchengyi/driver.mjs rename-flow \
  --flow-id "<flowId>" --name "新名称"

# 批量查找替换（先 dry-run）
node .gemini/skills/run-liuchengyi/driver.mjs replace \
  --project "天河" --from "旧值" --to "新值"

# 确认后执行
node .gemini/skills/run-liuchengyi/driver.mjs replace \
  --project "天河" --from "旧值" --to "新值" --no-dry-run
```

### 代码相关

```bash
# 翻译流程 Python 代码
node .gemini/skills/run-liuchengyi/driver.mjs translate --flow-id "<flowId>"

# 代码行号 → 组件 ID
node .gemini/skills/run-liuchengyi/driver.mjs code-to-card --flow-id "<flowId>" --line 22
```

### 底层 API 调用

```bash
# 调用任意 API
node .gemini/skills/run-liuchengyi/driver.mjs raw --method GET --path "projectManagement/query_project/"
node .gemini/skills/run-liuchengyi/driver.mjs raw --method POST --path "flowList/queryflowlist/" --body '{"projectId":"...","type":"flat"}'
```

> **Git Bash 注意**：`raw` 的 `--path` 不要以 `/` 开头（Git Bash 会将其解释为路径），用 `projectManagement/query_project/` 而非 `/projectManagement/query_project/`。其他命令不受影响。

| 命令 | 功能 |
|---|---|
| `list-projects` | 列出所有项目 |
| `list-flows --project <name>` | 列出项目的流程树 |
| `show-flow --flow-id <id>` | 查看流程完整结构（变量+节点+参数） |
| `show-node --flow-id <id> --node-id <id>` | 查看节点详情 |
| `search --flow-id <id> --keyword <kw>` | 在流程中搜索 |
| `search-all --project <name> --keyword <kw>` | 跨所有流程搜索 |
| `scan --project <name> [--keyword <kw>]` | 扫描 URL/IP 或关键词（全局变量自动去重） |
| `list-modules` | 列出所有可用组件 |
| `show-module --module-id <id>` | 查看组件定义 |
| `add-node --flow-id <id> --module-id <id> --prefix-node-id <id> [--type <add\|after>]` | 添加流程节点 |
| `del-node --flow-id <id> --node-ids <id1,id2,...>` | 删除流程节点 |
| `toggle-node --flow-id <id> --node-ids <id,...> (--enable\|--disable)` | 启用/禁用流程节点 |
| `edit-custom-attr --flow-id <id> --node-id <id> --custom-attr '<json>'` | 修改节点自定义属性(customAttr) |
| `edit-node-desc --flow-id <id> --node-id <id> --desc <d>` | 修改节点描述(备注) |
| `query-global --flow-id <id>` | 查询全局变量 |
| `add-global --flow-id <id> --name <n> [--value <v>] [--value-type <t>] [--desc <d>]` | 添加全局变量 |
| `del-global --flow-id <id> --var-id <id>` | 删除全局变量 |
| `query-params --flow-id <id>` | 查询流程入参/出参 |
| `add-param --flow-id <id> --name <n> [--default <v>] [--param-type <0\|1>]` | 添加流程参数 |
| `update-param --flow-id <id> --param-id <id> --name <n>` | 修改流程参数 |
| `del-param --flow-id <id> --param-id <id>` | 删除流程参数 |
| `edit-node --flow-id <id> --node-id <id> --param-id <id> --value <v> [--display <d>] [--name <n>] [--value-type <t>]` | 修改节点参数 |
| `edit-global --flow-id <id> --var-id <id> --value <v> [--name <n>] [--value-type <t>]` | 修改全局变量 |
| `edit-flow-desc --flow-id <id> --desc <d>` | 修改流程描述 |
| `rename-flow --flow-id <id> --name <n>` | 重命名流程 |
| `replace --project <name> --from <old> --to <new> [--no-dry-run]` | 批量查找替换 |
| `replace-module --flow-id <id> --old-node-id <id> --new-module-id <id>` | 一键替换组件类型 |
| `edit-session-start --flow-id <id> --node-id <id> [--session-id <id>]` | 开始安全编辑（复制→禁用原节点） |
| `edit-session-commit --session-id <id>` | 提交安全编辑（删除原节点→还原desc） |
| `edit-session-rollback --session-id <id>` | 回滚安全编辑（删除新节点→启用原节点） |
| `edit-session-list` | 列出所有活跃编辑会话 |
| `edit-session-clean --session-id <id>` | 强制清理会话（删除新旧节点） |
| `translate --flow-id <id>` | 翻译 Python 代码 |
| `code-to-card --flow-id <id> --line <n>` | 代码行→组件 ID |
| `raw --method <GET\|POST> --path <p> [--body '<json>']` | 底层 API 调用 |

## Run (human path)

启动流程易桌面应用（Windows GUI），应用自动监听 `127.0.0.1:5555`。关闭窗口即可停止。

## 常见操作模式

### 安全编辑流程（推荐）

对已有节点进行修改时，使用安全编辑会话避免改坏后无法恢复：

```bash
# 1. 开始编辑：复制节点 → 禁用原节点 → 在新节点上操作
node .gemini/skills/run-liuchengyi/driver.mjs edit-session-start \
  --flow-id "<flowId>" --node-id "<nodeId>"
# 输出 session ID 和新节点 ID，例如 session: es_abc12345, 新节点: <newNodeId>

# 2. 修改新节点（可多次执行）
node .gemini/skills/run-liuchengyi/driver.mjs edit-node \
  --flow-id "<flowId>" --node-id "<newNodeId>" --param-id "<paramId>" \
  --value "新值" --value-type "string"
node .gemini/skills/run-liuchengyi/driver.mjs edit-node-desc \
  --flow-id "<flowId>" --node-id "<newNodeId>" --desc "修改说明"

# 3. 查看所有活跃会话
node .gemini/skills/run-liuchengyi/driver.mjs edit-session-list

# 4a. 验证通过 → 提交（删除原节点，还原 desc）
node .gemini/skills/run-liuchengyi/driver.mjs edit-session-commit --session-id "<sessionId>"

# 4b. 验证不通过 → 回滚（删除新节点，重新启用原节点）
node .gemini/skills/run-liuchengyi/driver.mjs edit-session-rollback --session-id "<sessionId>"

# 5. 异常情况 → 强制清理（删除新旧节点，慎用）
node .gemini/skills/run-liuchengyi/driver.mjs edit-session-clean --session-id "<sessionId>"
```

**工作原理**：
```
修改前:
  ┌─────────────┐
  │  原节点 (启用) │
  └─────────────┘

edit-session-start 后:
  ┌─────────────┐   ┌──────────────────────────┐
  │  原节点 (禁用) │   │  新节点 (启用, desc含session标记) │
  └─────────────┘   └──────────────────────────┘
                          ↑ 你在这里修改

commit 后:
  ┌──────────────────────────┐
  │  新节点 (启用, desc已还原)  │
  └──────────────────────────┘

rollback 后:
  ┌─────────────┐
  │  原节点 (重新启用) │
  └─────────────┘
```

> **会话持久化**：会话数据保存在 `.gemini/skills/run-liuchengyi/edit-sessions.json`，跨 Claude Code 会话保留。重启后仍可通过 `edit-session-list` 查看、`commit` 或 `rollback`。

### 替换组件类型（如"点击元素"→"通过JS点击元素"）

**推荐使用 `replace-module` 一键替换**，自动处理 add→复制参数→复制customAttr→delete 全流程：

```bash
node .gemini/skills/run-liuchengyi/driver.mjs replace-module \
  --flow-id "<flowId>" \
  --old-node-id "<旧nodeId>" \
  --new-module-id "<新moduleId>"
```

命令会自动：
1. 在旧节点后插入新组件
2. 按 name 匹配复制所有参数值（xpath 等）
3. 复制旧节点的 customAttr（元素定位信息）到新节点
4. 删除旧节点

失败时不会删除旧节点，避免产生孤儿节点。

<details>
<summary>手动四步流程（供批量脚本参考）</summary>

```bash
# 1. 在旧节点后添加新组件
node .gemini/skills/run-liuchengyi/driver.mjs add-node \
  --flow-id "<flowId>" --module-id "<新moduleId>" \
  --prefix-node-id "<旧nodeId>" --type after

# 2. 查询新节点获取其参数 ID
node .gemini/skills/run-liuchengyi/driver.mjs show-node \
  --flow-id "<flowId>" --node-id "<新nodeId>"

# 3. 设置参数（尤其 xpath 需要复制旧值）
node .gemini/skills/run-liuchengyi/driver.mjs edit-node \
  --flow-id "<flowId>" --node-id "<新nodeId>" \
  --param-id "<xpathParamId>" \
  --value '"{\"XPath\":\"//img[@id=\"xxx\"]\",\"iframe\":[]}"' \
  --value-type "python" --display "元素XPath" --name "xpath"

# 3.5. ★ 复制旧节点的 customAttr 到新节点（浏览器组件必须！否则前端不显示元素定位信息）
# 先用 show-node 获取旧节点的 customAttr，然后用 raw API 写入新节点
node .gemini/skills/run-liuchengyi/driver.mjs raw --method POST \
  --path "flowNode/editcustomAttr/" \
  --body '{"flowId":"<flowId>","nodeId":"<新nodeId>","customAttr":<旧节点的customAttr>}'

# 4. 删除旧节点
node .gemini/skills/run-liuchengyi/driver.mjs del-node \
  --flow-id "<flowId>" --node-ids "<旧nodeId>"
```
</details>

**批量替换时**：建议直接用 `raw API` 编写 Node.js 脚本，因为需要动态获取新节点的 paramId。脚本模式：
1. `POST /flowNode/addnode/` → 获取 new node ID
2. `POST /flowNode/querynode/` → 获取 xpath paramId 以及旧节点的 customAttr
3. `POST /nodeParam/editnodeparam/` → 设置 xpath 值
4. `POST /flowNode/editcustomAttr/` → 复制旧节点的 customAttr 到新节点
5. `POST /flowNode/delNode/` → 删除旧节点

> 注意：每次操作后验证是否产生孤立节点（xpath 为空的新节点）。批量脚本失败时会留下孤儿，需要递归遍历 `blocks`/`loopChildren`/`elseLoopChildren`/`Lcplay` 清理。

### 查找已有节点：scan 先定位，再逐个处理

```bash
# 先 scan 定位所有匹配节点（给出 flowId + nodeId + paramId）
node .gemini/skills/run-liuchengyi/driver.mjs scan --project "项目名" --keyword "关键词"
# 然后对每个结果执行操作
```

## Gotchas

- **全局变量父子共享**：子流程（type=2）查询到的 `globalVarList` 实际是父流程（type=1）的变量，ID 相同。`scan` 和 `replace` 会自动按 `globalVariable_id` 去重，避免重复计数和重复修改。
- **Git Bash 路径问题**：`raw` 命令的 `--path` 参数不要以 `/` 开头。用 `projectManagement/query_project/` 而非 `/projectManagement/query_project/`。PowerShell 和 cmd 不受影响。
- **全局变量与节点参数使用不同 API**：全局变量 → `POST /globalList/update/`，节点参数 → `POST /nodeParam/editnodeparam/`。driver 的 `replace` 会根据类型自动选择正确端点。
- **valueType 注意事项**：修改节点参数时，不指定 `--value-type` 默认用 `string` 并打印警告。如果参数实际是 `python` 类型（如 xpath），务必指定 `--value-type python`，否则可能因类型不匹配导致语法校验报错。
- **扫描性能**：`scan` 会逐个查询每个流程 of workflow 详情，68 个流程约需 30-60 秒。
- **子流程（viewType=2）的数据结构**：顶层节点在 `blocks` 数组中。子节点根据父节点类型存储在不同字段。driver 遍历所有已知子节点字段：`tryChildren`, `catchChildren`, `finallyChildren`, `loopChildren`, `ifChildren`, `elseChildren`, `elseLoopChildren`, `Lcplay`。递归遍历时排除 `inputs`/`outputs`。
- **XPath 参数值的 Python 字符串格式**：xpath 参数 `valueType: "python"`，值必须是 Python 字符串字面量，即带外层引号。正确格式：`"{\"XPath\":\"//img[@id='xxx']\",\"iframe\":[]}"`（外层双引号是 Python 字符串的一部分）。
  
  **跨 shell 转义差异**：
  - **cmd**：内层双引号用 `\"`，外层的 `"` 保持不变：`"{\"XPath\":\"//img[@id='xxx']\",\"iframe\":[]}"`
  - **PowerShell**：需要用反引号 `` ` `` 转义或使用单引号包裹：`'"{\"XPath\":\"//img[@id=\"xxx\"]\",\"iframe\":[]}"'`
  - **Git Bash**：`--value` 参数加上最外层单引号可避免大部分问题：`'"{\"XPath\":\"//img[@id=\"xxx\"]\",\"iframe\":[]}"'`
  - 直接调用 `raw` API 时（JSON body），value 字段同样需要包含外层引号。
- **替换浏览器组件必须同步 customAttr**：浏览器相关组件（点击元素、通过JS点击元素、浏览器截图等）的 `customAttr` 存储了元素定位信息（XPath 列表、JS Path、iframe、截图路径等）。`add-node` 添加的新节点 `customAttr` 只有空的 `graphData`，不会自动继承旧节点的定位数据。**推荐使用 `replace-module` 命令自动处理此步骤**。手动操作时必须用 `POST /flowNode/editcustomAttr/` 将旧节点的 `customAttr` 复制到新节点，否则前端界面看不到 XPath，组件也无法正确运行。
- **API 路径对照**：写脚本直接调用 raw API 时注意正确路径（driver 内部使用，与直觉可能不同）：
  - 添加节点：`POST /flowNode/addnode/`，body: `{flowId, moduleId, prefixNodeId, type}`
  - 删除节点：`POST /flowNode/delNode/`，body: `{nodeIdList: [...], flowId}`（注意 key 是 `nodeIdList` 不是 `nodeIds`）
  - 查询节点：`POST /flowNode/querynode/`，body: `{nodeId, flowId}`
  - 修改节点自定义属性：`POST /flowNode/editcustomAttr/`，body: `{flowId, nodeId, customAttr}`
  - 查询流程：`POST /workFlow/queryworkflow/`，body: `{flowId}`
- **API 返回值格式**：driver 的 `api` 函数自动提取 `json.data` 并在 `code !== 0` 时抛出异常。自己写脚本调用 raw API 时需同样处理：检查 `resp.ok`，检查 `json.code`，使用 `json.data`。
- **add-node 返回值**：`add-node` 返回新创建节点的数据。`replace-module` 自动解析 `_idList[0]` 或 `_id` 字段获取新节点 ID。手动使用 `add-node` 后，通过 `show-node --flow-id <id> --node-id <新id>` 查看节点参数获取 `paramId`。

## Troubleshooting

- **`ECONNREFUSED` / `fetch failed`**：流程易桌面应用未启动。
- **`未找到项目`**：使用 `list-projects` 查看准确的项目名，`--project` 支持模糊匹配。
- **`API error code=...`**：检查参数是否正确。使用 `show-flow` 查看流程结构获取正确的 ID。
