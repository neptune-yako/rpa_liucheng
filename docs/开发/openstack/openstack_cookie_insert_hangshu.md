# 获取对应省信息 openstack_cookie_insert 变量越界报错分析与解决方案

## 1. 现象与报错堆栈 (Symptom & Stacktrace)

在目标系统返回的 Cookie 字符串为单 Cookie 结构（仅包含 `SESSION`，不含 `openstack_cookie_insert`）时，子流程运行出现以下报错：

```text
[DEBUG] 07-02 15:54:11 获取对应省信息.py  [line:19] 正在查询所有cookie...
[INFO] 07-02 15:54:11 获取对应省信息.py  [line:20] SESSION=Y2QwNDAzNWUtMjhjZi00OTZmLTk5MzItYThlZjg0MWMxMDg2
[DEBUG] 07-02 15:54:11 获取对应省信息.py  [line:21] 正在分割字符串...
[INFO] 07-02 15:54:11 获取对应省信息.py  [line:22] ['SESSION=Y2QwNDAzNWUtMjhjZi00OTZmLTk5MzItYThlZjg0MWMxMDg2']
[INFO] 07-02 15:54:11 获取对应省信息.py  [line:23] SESSION=Y2QwNDAzNWUtMjhjZi00OTZmLTk5MzItYThlZjg0MWMxMDg2
[INFO] 07-02 15:54:11 获取对应省信息.py  [line:61] 流程出错：list index out of range
[INFO] 07-02 15:54:11 获取对应省信息.py  [line:62] 再给一次机会
...
[INFO] 07-02 15:54:11 test.py  [line:265] 主流程错误:name 'SESSION' is not defined
```

由于该子流程崩溃，主流程 `test.py` 无法获取到所需的 `SESSION` 变量，继而抛出 `NameError`。

---

## 2. 根本原因定位 (Root Cause Analysis)

经排查，该报错由 [获取对应省信息.json](file:///d:/data/Code/sendi/liucheng/登陆/省系统扫码登录服务端%20(2)/省系统扫码登录服务端/获取对应省信息.json) 流程中负责为 `openstack_cookie_insert` 变量赋值的组件引起：

* **越界节点**：Index 12 (ID: `XxhRhdNW`) 变量赋值组件。
* **组件现状**：
  * `"is_enable"` 状态为 **`true`** (启用)。
  * 入参 `"init"` 被配置为 `"字符串数组[1]"`。
* **逻辑漏洞**：
  * 当省系统返回的 Cookie 字符串只有单个 `SESSION` 时，按分号 `;` 切割后得到的 `字符串数组` 长度仅为 1（仅有索引 `0`）。
  * 处于激活状态 of Index 12 节点试图强行读取 `字符串数组[1]`，直接引发 Python 的 `IndexError: list index out of range` 崩溃。

---

## 3. Trellis 规范与软屏蔽设计原则

按照 Trellis 系统关于“不破坏可视化结构、零破坏防崩溃”的设计原则，对于多余或已废弃的节点，应当进行**软屏蔽（Soft Shielding）**或**无损改写**，而非直接删除节点（直接删除节点可能导致 RPA 前台展示不兼容或提示流程损坏）。

此前对 Index 5、6、7、8、9、10、11、13 等节点的置灰或软屏蔽处理，遗漏了 **Index 12 (ID: `XxhRhdNW`)**，导致数据流防护存在漏洞。

---

## 4. 具体修复方案 (Action Plan)

我们可以在 [获取对应省信息.json](file:///d:/data/Code/sendi/liucheng/登陆/省系统扫码登录服务端%20(2)/省系统扫码登录服务端/获取对应省信息.json) 中选择以下两种修复方案之一进行配置修改：

### 方案 A：直接禁用该组件（推荐，零侧效应）

由于 `openstack_cookie_insert` 变量在改版省系统中已废弃，直接将其对应的赋值组件置为禁用。

* **目标节点 ID**：`XxhRhdNW`
* **JSON 修改项**：
  ```json
  "is_enable": false,
  "self_enable": false
  ```

### 方案 B：安全取值表达式改写（防灾防崩溃）

如果后续仍需兼容该变量的声明，可通过 Python 的三元表达式改写 `init` 值，避免数组越界。

* **目标节点 ID**：`XxhRhdNW`
* **JSON 修改项**：将该节点的 `init` 参数 `value` 修改为安全表达式。
* **代码替换对照**：
  * *原配置*：`"value": "字符串数组[1]"`
  * *修改后*：`"value": "字符串数组[1] if len(字符串数组) > 1 else ''"`
