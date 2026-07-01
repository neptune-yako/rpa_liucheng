# 过期 IP 与 URL 物理分布记录 (老旧 IP 盘点)

> - **本篇目的**：对整个 codebase 中存在的所有过期 IP `19.15.0.100` 及其关联 URL 的物理节点、行号、以及所属 JSON 块进行全局盘点和归档，为后续批量替换提供事实依据。

---

## 1. 物理分布汇总表

经全局检索，代码库中共有 **8 处** 包含过期 IP `19.15.0.100` 的硬编码配置。根据现阶段的修改要求，**已排除 https、背景图以及非登录目录下的流程**，具体过滤状态及物理位置如下表：

| 序号 | 物理文件路径 | JSON 行号 | 所属流程节点 / 模块 | 对应硬编码内容 | 处理状态 |
| :---: | :--- | :---: | :--- | :--- | :---: |
| **1** | [省系统扫码登录服务端.json](file:///d:/data/Code/sendi/liucheng/登陆/省系统扫码登录服务端%20(2)/省系统扫码登录服务端.json) | **224** | 节点 `cw0jDpO3` (打开浏览器) | `"https://19.15.0.100/zwml-admin/admin4/"` | 🚫 **忽略** (HTTPS协议) |
| **2** | [省系统扫码登录服务端.json](file:///d:/data/Code/sendi/liucheng/登陆/省系统扫码登录服务端%20(2)/省系统扫码登录服务端.json) | **6367** | 节点 `jnDALbQO` (跳转URL) | `"http://19.15.0.100/zwml-admin/"` | ✅ **待修改** |
| **3** | [用户粤政易扫码.json](file:///d:/data/Code/sendi/liucheng/登陆/省系统扫码登录服务端%20(2)/省系统扫码登录服务端/用户粤政易扫码.json) | **1810** | 节点 `Browser.navigateURL` (跳转省统一登录) | 见下文详细参数 (包含 redirect_uri) | ✅ **待修改** |
| **4** | [用户粤政易扫码.json](file:///d:/data/Code/sendi/liucheng/登陆/省系统扫码登录服务端%20(2)/省系统扫码登录服务端/用户粤政易扫码.json) | **3127** | 节点 `Browser.navigateURL` (跳转省统一登录) | 见下文详细参数 (包含 redirect_uri) | ✅ **待修改** |
| **5** | [市政数事项.json](file:///d:/data/Code/sendi/liucheng/数据/市政数事项/市政数事项.json) | **2032** | 节点 `Browser.openBrowser` (打开浏览器) | `"http://19.15.0.100/zwml-admin/admin4/img/home_cardbg_1.d7d48cc1.png"` | 🚫 **忽略** (背景图) |
| **6** | [市政数事项.json](file:///d:/data/Code/sendi/liucheng/数据/市政数事项/市政数事项.json) | **2642** | 节点 `Browser.openBrowser` (打开浏览器) | `"http://19.15.0.100/zwml-admin/admin4/img/home_cardbg_1.d7d48cc1.png"` | 🚫 **忽略** (背景图) |
| **7** | [市政数事项.json](file:///d:/data/Code/sendi/liucheng/数据/市政数事项/市政数事项.json) | **2899** | 节点 `Browser.checkUsingBrowser` (使用已存在浏览器) | `"http://19.15.0.100/zwml-admin/admin4/home/index"` | ✅ **待修改** |
| **8** | [机器人账号登录.json](file:///d:/data/Code/sendi/liucheng/数据/市政数事项/市政数事项/机器人账号登录.json) | **1** | 节点 `uLatU4n0` (登录网址参数 等) | 包含 `"http://19.15.0.100/zwml-admin/"` 等 | 🚫 **忽略** (非登陆文件夹流程) |

> [!IMPORTANT]
> **💡 现阶段忽略规则说明**：
> * **序号 1**：由于目前仅替换 `http` 协议下的请求，而序号 1 属于 `https://19.15.0.100/...`，故现阶段予以**忽略**。
> * **序号 5、6**：由于该链接仅指向主系统前台的背景图片资源（`home_cardbg_1.png`），不影响页面功能逻辑，故现阶段予以**忽略**。
> * **序号 8**：由于该子流程存储在 `数据\市政数事项\市政数事项\机器人账号登录.json`，不属于根目录下的 `登陆`（登录）文件夹控制流，故现阶段予以**忽略**。

---

## 2. 核心上下文详情

### 2.1 登录服务端 (`省系统扫码登录服务端.json`)
* **第 224 行**：
  在 RPA 打开浏览器容器时，作为初始访问的目标网址：
  ```json
  "value": "https://19.15.0.100/zwml-admin/admin4/"
  ```
* **第 6367 行**：
  在 Finally 异常资源回收收尾阶段，控制浏览器跳转重定向以净空会话的网址：
  ```json
  "value": "http://19.15.0.100/zwml-admin/"
  ```

### 2.2 二维码控制子流程（序号3、4） (`用户粤政易扫码.json`)
* **第 1810 行 / 第 3127 行**：
  在二维码加载重试超时后，强制跳转至省统一身份认证接口（`Browser.navigateURL`）的 redirect_uri 参数中：
  ```text
  https://tyrz.gdgov.cn/zwrz/login?appid=wl2bee594e73&agentid=1002048&client_id=zwrz_gdzwfwsxglxt&response_type=code&scope=all&redirect_uri=https%3A%2F%2F19.15.0.100%2Fzwml-cas%2FlinkGdbsZwLogin%3Fservice%3Dhttps%3A%2F%2F19.15.0.100%2Fzwml-admin%2Fadmin4%2F&pvfm_flag=true
  ```

### 2.3 数据分发主控 (`市政数事项.json`)
* **第 2032 行 / 第 2642 行**：
  在打开浏览器容器作为静默挂起测试时加载的辅助背景资源图片：
  ```json
  "value": "http://19.15.0.100/zwml-admin/admin4/img/home_cardbg_1.d7d48cc1.png"
  ```
* **第 2899 行**：
  在检查并使用已打开浏览器时定位的首页验证链接：
  ```json
  "value": "http://19.15.0.100/zwml-admin/admin4/home/index"
  ```

### 2.4 子流程 `机器人账号登录.json`
由于此子流程为单行压缩的大型 JSON（总行数为 1），它包含多处对过期 IP 的硬编码引用：
* **RPA 登录首开网址**：`"http://19.15.0.100/zwml-admin/"`
* **Cookie 添加生效域名限制**：`"19.15.0.100"`（包含 `openstack_cookie_insert` 与 `SESSION` 生效域参数）
* **跳转首页验证 URL**：`"http://19.15.0.100/zwml-admin/admin4/home/index"`

---

省系统网址：
从源地址访问:https://19.15.0.100/zwml-admin/admin4/
或者直接访问:https://19.25.42.21/zwml-admin/admin4/
登录成功后：
https://19.25.42.21/zwml-admin/admin4/home/index?ticket=ST-4171-QNT7z
tUXBByMLue7bj55-cas01.example.org
https://19.25.42.21/zwml-admin/admin4/home/index
原先省网址（已废弃）：
http://19.15.0.100/zwml-cas/login?service=http://19.15.0.100/zwml-admin/admin4/

---

## 3. 替换目标分流规则与实操映射

根据业务状态，替换新地址时需严格区分以下两种状态：
* **目标 A (登录前 / 未登录)**：`https://19.25.42.21/zwml-admin/admin4/`
* **目标 B (登录成功后)**：`https://19.25.42.21/zwml-admin/admin4/home/index`

### 💡 待修改项应用策略映射表：

| 待修改序号 | 物理文件 / 行号 | 流程业务上下文 | 应用替换目标 | 替换后的完整网址 / 内容 |
| :---: | :--- | :--- | :--- | :--- |
| **2** | `省系统扫码登录服务端.json` <br/> (第 6367 行) | Finally 异常释放时重定向清理 | **目标 A** (重定向根) | `"https://19.25.42.21/zwml-admin/admin4/"` |
| **3** | `用户粤政易扫码.json` <br/> (第 1810 行) | 二维码重试跳转粤政易的 `redirect_uri` | **目标 A** (编码形式) | `redirect_uri=https%3A%2F%2F19.25.42.21%2Fzwml-admin%2Fadmin4%2FlinkGdbsZwLogin%3Fservice%3Dhttps%3A%2F%2F19.25.42.21%2Fzwml-admin%2Fadmin4%2F` |
| **4** | `用户粤政易扫码.json` <br/> (第 3127 行) | 二维码重试跳转粤政易的 `redirect_uri` | **目标 A** (编码形式) | 同上 (URL 编码的 A 网址) |
| **7** | [市政数事项.json](file:///d:/data/Code/sendi/liucheng/数据/市政数事项/市政数事项.json) <br/> (第 2899 行) | 校验当前浏览器是否已在首页 | **目标 B** (登录成功) | `"https://19.25.42.21/zwml-admin/admin4/home/index"` |
