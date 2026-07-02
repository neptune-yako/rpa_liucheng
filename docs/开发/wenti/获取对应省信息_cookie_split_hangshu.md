# 获取对应省信息.json 中已禁用/僵尸代码与变量引用盘点文档

> - **本篇目的**：物理留痕子流程 [获取对应省信息.json](file:///d:/data/Code/sendi/liucheng/登陆/省系统扫码登录服务端%20(2)/省系统扫码登录服务端/获取对应省信息.json) 中存在的 10 个被禁用但仍被编译的僵尸 Block，以及与 `openstack_cookie_insert` 变量相关的配置定位，为物理清理提供事实依据。

---

## 1. 已禁用的僵尸 Block 清单 (共 10 处)

以下 Blocks 在控制台虽然显示为**已禁用 (`is_enable: false`)**，但由于 RPA 编译引擎在转换为后台 Python 脚本时未作过滤，它们仍会在后台执行。

| JSON 块 Index | 组件 ID | 组件名称 | 组件功能与输入值 | 崩溃/隐患关联性 |
| :---: | :--- | :--- | :--- | :--- |
| **5** | `uoQlGfkI` | 分割字符串 | 将 `cookies字符串` 按照 `;` 分割为 `字符串` (数组) | 基础分割组件 |
| **6** | `UmOUyelh` | 打印日志 | 打印 `字符串` 整个数组 | 打印日志 |
| **7** | `nUmOrjtw` | 打印日志 | 打印 `字符串[0]` (SESSION元素) | 正常打印 |
| **8** | `PV2cezw4` | 打印日志 | 打印 `字符串[1]` (原本对应 openstack_cookie_insert) | 💥 **致命报错点**：单 Cookie 时触发 `list index out of range` |
| **9** | `Qw6rMAf2` | 变量赋值 | 将 `第一对参数` 赋值为 `字符串[0]` | 正常赋值 |
| **10** | `2FCHyGRO` | 变量赋值 | 将 `第二对参数` 赋值为 `字符串[1]` | 💥 **致命报错点**：单 Cookie 时触发 `list index out of range` |
| **11** | `QbCpVCnn` | 分割字符串 | 将 `第一对参数` 按 `=` 分割 | 冗余分割逻辑 |
| **13** | `7bctygLk` | 分割字符串 | 将 `第二对参数` 按 `=` 分割 | 冗余分割逻辑 |
| **15** | `uxITOCtt` | 获取时间 | 按时间格式 `%Y-%m-%d` 获取当前时间 | 冗余组件 |
| **22** | `yNKeLHrV` | 延迟 | 延时等待 `2` 秒 | 冗余组件 |

---

## 2. openstack_cookie_insert 变量与参数定位 (共 2 处)

### 2.1 局部变量定义 (第 1 处)
* **组件 Index**：`12`
* **组件 ID**：`XxhRhdNW`
* **组件名称**：变量赋值 (`Control.vardefine`)
* **逻辑**：将局部变量 `openstack_cookie_insert` 初始化定义为 `''`。

### 2.2 子流程输出参数定义 (第 2 处)
* **位置**：文件底部的 `parameters` 属性数组中。
* **逻辑**：
  ```json
  {
    "_id": "AtWbwBJh",
    "parameterName": "openstack_cookie_insert",
    "defaultValue": "",
    "valueType": "string",
    "type": 0,
    "desc": ""
  }
  ```
  *(该节点负责将子流程中的变量值输出回主流程，属于参数接口定义)*

---

## 3. 剥离与删除策略

为彻底杜绝 `list index out of range` 越界崩溃并剥离 `openstack_cookie_insert` 字段，我们将执行以下物理删除动作：
1. 从 `blocks` 数组中物理抹除上述 **第 1 节列出的 10 个僵尸 Block**。
2. 从 `blocks` 数组中物理抹除 **第 12 个 Block**（初始化空变量）。
3. 从 `parameters` 数组中物理抹除 **第 2.2 节所定义的输出参数对象**。
