# 省系统扫码登录服务端.json 中 openstack_cookie_insert 引用定位文档

在主流程文件 [省系统扫码登录服务端.json](file:///d:/data/Code/sendi/liucheng/登陆/省系统扫码登录服务端 (2)/省系统扫码登录服务端.json) 中，共有 **11 处** 引用了 `openstack_cookie_insert`。

以下是具体的行号及对应的模块/SQL语句：

---

### 1. 数据库查询阶段 (共 1 处)

* **行号：`640`**
  * **组件**：`mysql.querySQL` (数据查询)
  * **语句**：
    ```sql
    select SESSION,openstack_cookie_insert,省账号,扫码次数,失效时间 from 用户账号对应表 where 用户账号='%s'
    ```

---

### 2. 变量初始化阶段 (共 1 处)

* **行号：`1957 - 1959`**
  * **组件**：`Control.vardefine` (变量赋值)
  * **逻辑**：将变量 `openstack_cookie_insert` 初始化为空字符串 `""`。

---

### 3. 子流程输出映射 (共 3 处)

调用子流程 `获取对应省信息` 时，将输出参数映射回主流程变量：

* **行号：`1633 - 1636`** (第 1 处调用)
* **行号：`3046 - 3049`** (第 2 处调用)
* **行号：`5404 - 5407`** (第 3 处调用)
  * **映射逻辑**：
    ```json
    "_id": "IXgfMogT",
    "name": "openstack_cookie_insert",
    "value": "openstack_cookie_insert"
    ```

---

### 4. 数据库插入与更新阶段 (共 6 处)

#### 4.1 写入新记录
* **行号：`2136`** (日志打印) 与 **行号：`2253`** (SQL 执行)
  * **语句**：
    ```sql
    insert into `用户账号对应表`(`用户账号`,`省账号`,`SESSION`,`openstack_cookie_insert`,`更新时间`,`扫码次数`,`组织机构`) 
    values('%s','%s','%s','%s','%s','%d','%s') 
    ON DUPLICATE KEY UPDATE 
    SESSION = VALUES(SESSION), openstack_cookie_insert = VALUES(openstack_cookie_insert), 更新时间= VALUES(更新时间)
    ```

#### 4.2 更新 Session (更新失效时间为 null)
* **行号：`3712`** (日志打印) 与 **行号：`3595`** (SQL 执行)
  * **语句**：
    ```sql
    update 用户账号对应表 set 失效时间=null,省账号='%s',SESSION='%s',openstack_cookie_insert='%s',更新时间='%s',扫码次数='%d',组织机构='%s' where 用户账号='%s'
    ```

#### 4.3 写入失效记录 (更新失效时间为失效时间)
* **行号：`5602`** (日志打印) 与 **行号：`5485`** (SQL 执行)
  * **语句**：
    ```sql
    update 用户账号对应表 set 失效时间='%s',省账号='%s',SESSION='%s',openstack_cookie_insert='%s',更新时间='%s',扫码次数='%d',组织机构='%s' where 用户账号='%s'
    ```

---

## 5. 任务目标与删除影响评估

### 5.1 任务目标
当前任务目标是**彻底删除/剥离**服务端流程中的 `openstack_cookie_insert` 字段，以解决因省系统去除了该 cookie 导致流程提取报错的问题。

### 5.2 核心代码阅读与影响评估

经过对 `省系统扫码登录服务端.json` 和 `省系统扫码登客户端.json` 的代码结构与 SQL 交互阅读，删除该字段可能存在以下三个层面的影响：

#### 1. 数据库写入层面 (SQL Insert / Update)
* **影响分析**：
  * 在主流程中，有多处 `insert` 和 `update` SQL 语句向数据库写入 `openstack_cookie_insert` 的值。
  * 如果直接在 SQL 语句中删除该字段（即不插入/不更新），必须确保 MySQL 数据库 `用户账号对应表` 中的 `openstack_cookie_insert` 字段**允许为 `NULL`** 或**设定了默认值**。否则，`insert` 语句会因为缺少非空字段而报错。
* **规避建议**：
  * **方案 A（最安全，推荐）**：无需修改 SQL 写入语句与数据库结构。我们只需在流程的初始化/赋值阶段，将 `openstack_cookie_insert` 变量硬编码赋值为空字符串 `""`。这样数据库中该列会正常写入空值，对外部数据库结构 0 破坏。
  * **方案 B（彻底删除）**：从所有 SQL（`select`、`insert`、`update`）中完全删除该字段名和对应的占位符。在执行前需要人工确认 MySQL 表结构该列允许为 `NULL`。

#### 2. 客户端流程的连带影响 (`省系统扫码登客户端.json`)
* **影响分析**：
  * 客户端流程会执行 `select SESSION,openstack_cookie_insert,省账号...` 语句查询该字段。
  * 服务端如果不写入，客户端查询出来的值将为 `NULL` 或 `""`。
  * 客户端内部虽然也定义了 `openstack_cookie_insert` 变量并在熔断时将其重置为空，但**并未在后续业务逻辑中对该变量进行实质性校验或使用**。
* **评估结论**：无业务影响。客户端只起到了读取和传递的作用，该值为空不会阻断客户端的正常运行。

#### 3. 下游组件与省系统接口层面
* **影响分析**：
  * 既然报错的原因是省系统“已经没有该 cookie”（即省系统网关或负载均衡器已不再下发、也不再校验该字段）。
  * 那么下游任何使用该 cookie 进行省系统请求的模块，在缺失 `openstack_cookie_insert` 的情况下，也必然不会受到省系统的拒绝。
* **评估结论**：安全。既然源头已废弃，链路后端的删除是顺应系统升级的必然操作。
