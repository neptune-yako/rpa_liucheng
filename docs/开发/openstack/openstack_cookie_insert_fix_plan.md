# openstack_cookie_insert 变量越界防崩溃修复设计文档 (方式 1)

## 1. 背景与问题描述 (Background)

由于省系统安全网关改版，当前获取到的 Cookie 字符串为单 Cookie 结构（仅包含 `SESSION` 键值），不再包含 `openstack_cookie_insert`。

在原版的子流程 [获取对应省信息.json](file:///d:/data/Code/sendi/liucheng/登陆/省系统扫码登录服务端%20(2)/省系统扫码登录服务端/获取对应省信息.json) 中，负责提取 `openstack_cookie_insert` 变量的组件 **Index 12 (ID: `W8b6qQ3H`)** 会强行读取 `"字符串数组[1]"`。这在单 Cookie 场景下直接引发 `IndexError: list index out of range`，导致整个登录流程崩溃。

---

## 2. 修复方案设计：方式 1 (Design Strategy: Method 1)

为了符合 Trellis **“极简修改、零结构破坏、平稳兼容”** 的规范，我们决定使用 **方式 1：子流程源头赋空值**。

### 核心思路：
* **主流程零修改**：保持主流程中对 `openstack_cookie_insert` 变量的引用（数据库 SELECT/INSERT/UPDATE、日志打印、子流程输出映射）完全不变。
* **子流程源头平稳兼容**：将子流程中获取该变量的逻辑修改为**直接赋予空字符串 `''`**，使其安全流转。

---

## 3. 具体修改细节 (Implementation Details)

我们将对 [获取对应省信息.json](file:///d:/data/Code/sendi/liucheng/登陆/省系统扫码登录服务端%20(2)/省系统扫码登录服务端/获取对应省信息.json) 流程文件做两处“外科手术式”的局部修改：

### 修改一：禁用已过时的物理分割组件 (置灰防灾)
为了防止后台引擎强行翻译执行已废弃的旧逻辑，将下列旧组件状态置为禁用：
* **目标节点 ID**：Index 5 (`uoQlGfkI`), Index 6 (`UmOUyelh`), Index 7 (`nUmOrjtw`), Index 8 (`PV2cezw4`), Index 9 (`Qw6rMAf2`), Index 10 (`2FCHyGRO`), Index 11 (`QbCpVCnn`), Index 13 (`7bctygLk`), Index 15 (`uxITOCtt`), Index 22 (`yNKeLHrV`)。
* **修改项**：
  ```json
  "is_enable": false,
  "self_enable": false
  ```

### 修改二：对 openstack 变量安全赋空值 (方式 1 核心)
使负责给 `openstack_cookie_insert` 赋值的组件直接赋予空字符串，斩断越界源头。
* **目标节点 ID**：`W8b6qQ3H` (JSON 对应 ID: `XxhRhdNW`)
* **组件类型**：`Control.vardefine` (变量赋值)
* **修改参数**：将入参 `init` 的配置由直接读取数组索引，改为 Python 空字面量。
* **配置对照**：
  ```diff
  - "value": "字符串数组[1]"
  + "value": "''"
  ```

---

## 4. 数据兼容性与防崩验证 (Compatibility & Verification)

经过此方案改造后：
1. **子流程不会崩溃**：Index 12 直接被赋予空字符串 `''`，彻底规避了 `list index out of range` 异常。
2. **出参契合主流程**：子流程正常输出 `openstack_cookie_insert = ''` 给主流程。
3. **数据库与日志兼容**：主流程在执行 `INSERT` 和 `UPDATE` SQL 时，将该变量渲染为 `''` 写入数据库，日志里打印为 `openstack_cookie_insert=''`。由于数据库字段通常允许空字符串或 NULL，因此插入和更新操作能够平稳完成。
4. **SESSION 正常获取**：整个子流程能顺利跑完，主流程的 `SESSION` 变量得以正确定义并流转，系统恢复正常。
