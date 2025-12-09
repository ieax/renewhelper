# 🕒 RenewHelper - 时序·守望 (Service Lifecycle Manager)

[English](./README_EN.md) | **中文**

![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange?logo=cloudflare)
![Vue.js](https://img.shields.io/badge/Frontend-Vue3%20%2B%20ElementPlus-42b883?logo=vue.js)
![License](https://img.shields.io/badge/License-MIT-blue)

**RenewHelper - 时序·守望** 是一款基于 **Cloudflare Workers** 的全栈服务生命周期提醒、管理工具。它专为管理周期性订阅、域名续费、服务器到期等场景设计。无需服务器，零成本托管，提供精美的机甲风（Mecha-style）UI 界面、强大的农历/公历计算核心、多渠道通知推送能力以及 iCal 日程同步。

<div align="center">
  <img src="./assets/mainUI_lightCN_shot.png" alt="RenewHelper 界面预览" width="800">
  <img src="./assets/mainUI_darkEN_shot.png" alt="RenewHelper 界面预览" width="800">
</div>

## ✨ 核心特性

- **⚡️ Serverless 架构**：完全运行在 Cloudflare Workers 上，利用 KV 存储数据，无需购买 VPS，免费额度通常足够个人使用。
- **📅 智能周期管理**：
  - 支持**公历**与**农历**（Lunar）周期计算。内置高精度农历算法（1900-2100），支持公历循环（如月付/年付）和农历循环（如生日、传统节日）。
  - 支持按天、月、年为周期的自动推算。
  - 提供“循环订阅”与“到期重置”两种模式。
- **🔔 多渠道通知**：
  - 内置支持 **Telegram, Bark, PushPlus, NotifyX, Resend (Email), Webhook**。
  - 支持自定义提前提醒天数和每日推送时间。
- **🤖 自动化管理**：
  - **自动续期**：到期自动更新下次提醒时间。
  - **自动禁用**：过期太久未处理的服务自动标记为禁用。
  - **Cron 触发**：支持通过 Cloudflare Cron Triggers 每日定时检查。
- **📆 ICS 日历订阅**：提供标准的 `.ics` 订阅链接，可完美接入 iOS 日历、Google Calendar 或 Outlook，支持基于时区的精确提醒并同步到您的手机日程中。
- **🛡️ 安全可靠**：
  - JWT 身份验证，支持高强度密钥自动生成。
  - 混合限流策略（内存 + KV），防止暴力破解。
  - 数据仅存储在您私有的 Cloudflare KV 中。
  - 敏感操作（删除、重置）二次确认。
- **🎨 现代化 UI**：
  - Vue 3 + Element Plus 构建的单文件前端。
  - 支持深色/浅色模式切换。
  - 响应式设计，完美适配移动端和桌面端。
  - 中英双语界面。
  - 支持数据导入/导出备份。

---

## 🚀 部署指南

### 方式一：自动一键部署 (推荐)

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/ieax/renewhelper)

1.  点击上方按钮。
2.  授权 Cloudflare 访问您的 GitHub 账户（用于 Fork 仓库）。
3.  按照指引完成部署，Cloudflare 会自动为您创建 Worker 和 KV 命名空间。
4.  **重要**：部署完成后，请进入 Cloudflare Dashboard -\> Workers & Pages -\> 您的项目 -\> **Settings/设置** -\> **Variables/变量**。
    - 添加环境变量：`AUTH_PASSWORD`，值为您想设置的登录密码（默认为 `admin`）。
    - 绑定 KV 命名空间：确保变量名为 `RENEW_KV`（不能改！！！）。

### 方式二：网页手动部署 (新手推荐)

如果您没有 Github，可以直接在 Cloudflare 网页后台完成部署。

#### 第一步：创建 KV 存储桶

1.  登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)。
2.  在左侧菜单点击 **Workers & Pages** -> **KV**。
3.  点击 **Create a namespace**。
4.  输入名称：`RENEW_KV`或其他任意名称 (建议大写，方便识别)，点击 **Add**。

#### 第二步：创建 Worker 服务

1.  回到 **Workers & Pages** -> **Overview** 页面。
2.  点击 **Create application** -> **Create Worker**。
3.  给 Worker 起个名字，例如 `renewhelper`，点击 **Deploy**。
4.  部署成功后，点击 **Edit code** 进入代码编辑器。

#### 第三步：粘贴代码

1.  在代码编辑器左侧的文件列表中，选中 `worker.js`。
2.  **全选并删除**里面的所有默认代码。
3.  将本项目提供的 `_worker.js` 完整代码复制并粘贴进去。
4.  点击右上角的 **Deploy** 按钮保存代码。

#### 第四步：绑定 KV 数据库 (关键)

1.  点击左上角的箭头返回到 Worker 的详情页面 (或者点击顶部的 Worker 名称)。
2.  点击 **Settings** (设置) -> **Variables** (变量)。
3.  向下滚动找到 **KV Namespace Bindings** (KV 命名空间绑定)。
4.  点击 **Add binding**：
    - **Variable name (变量名)**: 必须填写 `RENEW_KV` (不能改！！！)。
    - **KV Namespace (命名空间)**: 下拉选择你在第一步创建的那个存储桶。
5.  点击 **Save and deploy**。

#### 第五步：设置登录密码

1.  还在 **Variables** 页面，向上滚动找到 **Environment Variables** (环境变量)。
2.  点击 **Add variable**：
    - **Variable name**: `AUTH_PASSWORD`
    - **Value**: 输入你想设置的后台登录密码 (如果不设置，默认为 `admin`)。
3.  点击 **Save and deploy**。

#### 第六步：设置定时任务 (Cron)

为了让自动续期功能生效，**须要设置定时触发器。**

1.  点击页面顶部的 **Triggers** (触发器) 标签。
2.  向下滚动找到 **Cron Triggers**。
3.  点击 **Add Cron Trigger**。
4.  **Cron schedule**: 准确输入 `0/30 * * * *` (代表 UTC 时间每天每个半点检查一次，不能改！！！)。
5.  点击 **Add Trigger**。

### 🎉 部署完成！

---

## ⚙️ 设置与配置

部署成功后，访问您的 Worker 域名或您添加的自定义域名（如 `https://renewhelper.your-name.workers.dev`或 `https://renewhelper.your-domain.com`）。

1.  **首次登录**：使用您设置的 `AUTH_PASSWORD`（默认 `admin`）解锁。
2.  **系统设置**：点击控制台右上角的 **系统设置 (SETTINGS)** 按钮。
    - **时区设置**：非常重要！请选择您所在的时区（如 `Asia/Shanghai`），这决定了提醒和日历的准确性。
    - **通知总开关**：开启后可配置具体的推送渠道。

<div align="center">
  <img src="./assets/configUIhelp_darkCN_shot.png" alt="RenewHelper 界面预览" width="800">
</div>

### 📢 推送渠道配置说明

在“系统设置” -\> “通知配置”中填写：

| 渠道              | 参数说明                                                           | 获取/配置方法                                                                                                                                                                                                                               |
| :---------------- | :----------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Telegram**      | **Token**: 机器人令牌<br>**Chat ID**: 您的用户 ID 或群组 ID        | 1. 找 [@BotFather](https://t.me/BotFather) 创建机器人获取 Token。找`@userinfobot`获取UserID。<br>2. 或浏览器访问 `https://api.telegram.org/bot<YourToken>/getUpdates` <br>3. 添加您的机器人为好友，并发送任意消息给机器人。<br>4. 在刚才打开的 URL 页面刷新获取 Chat ID。 |
| **Bark** (iOS)    | **Server**: 服务器地址<br>**Device Key**: 设备密钥                 | 1. App Store 下载 Bark 应用。<br>2. 复制 App 内显示的服务器地址和 Key。                                                                                                                                                                     |
| **PushPlus**      | **Token**: 用户令牌                                                | 1. 访问 [PushPlus 官网](https://www.pushplus.plus/)。<br>2. 微信扫码登录获取 Token。                                                                                                                                                        |
| **NotifyX**       | **API Key**: 密钥                                                  | 1. 访问 [NotifyX 官网](https://www.notifyx.cn/)。 <br>2. 微信扫码登录获取 API Key。                                                                                                                                                         |
| **Resend** (邮件) | **API Key**: Resend 密钥<br>**From**: 发件地址<br>**To**: 收件地址 | 1. 注册 [Resend](https://resend.com/)。<br>2. 绑定域名并获取 API Key。<br>3. `From` 必须是您验证过的域名邮箱（如 `alert@yourdomain.com`）。若您没有域名邮箱，可以使用`onboarding@resend.dev`，发送至您注册 resend 账号的邮箱。              |
| **Webhook**       | **URL**: POST 地址                                                 | 适用于自定义开发。系统会向该 URL 发送 POST 请求：`{ "title": "...", "content": "..." }`。                                                                                                                                                   |

---

## 🛠 使用方法

### 添加服务

- **名称**：服务的名称（如 "Netflix 4K"，"Google Voice - 8888"）。
- **标签**：用于分类（如 `Media`, `Server`, `Domain`, `PhoneNumber`），支持多选。
- **模式**：
  - 📅 **循环订阅**：每隔固定周期（如 1 个月/1 个自然年/1 个农历年）到期的各种事项，如月付会员订阅、年付 VPS 续费等。
  - ⏳ **到期重置**：到期后需手动或自动处理，有效期随之展期的各种事项，如 eSIM 动账延长 180 天有效期、签到增加服务时长等。
- **农历开关**：开启后，周期将按农历计算（适合农历生日、事物提醒）。
- **自动化策略**：
  - **自动续期**：到期后自动将下次到期日顺延一个周期。
  - **自动禁用**：到期超过指定天数未处理，自动标记为禁用。

<div align="center">
  <img src="./assets/AddUI_darkCN_shot.png" alt="RenewHelper 界面预览" width="600">
</div>

### 查看日志

点击主界面的 **运行日志 (LOGS)** 按钮，可查看所有自动化任务的历史记录、推送结果以及操作审计。

### ICS 日历订阅

在“系统设置”中找到 **日历订阅** 区域。

1.  复制订阅链接。
2.  **iOS**: 设置 -\> 邮件 -\> 账户 -\> 添加账户 -\> 其他 -\> 添加已订阅的日历。
3.  **Google Calendar**: 添加日历 -\> 来自 URL 或从订阅链接下载后文件导入。
4.  **Outlook**: 文件 -\> 添加日历 -\> 从 WEB 订阅或从订阅链接下载后文件导入。
5.  **手机自带日程 APP**: 在 CalDAV 服务商添加订阅链接，手机添加 CalDAV 订阅信息进行日程同步或从订阅链接下载后，在日程软件中导入。
6.  **注意**: 链接包含安全 Token，请勿泄露。如泄露可点击“重置令牌”。

---

## ⚠️ 注意事项

1.  **数据安全**：所有数据存储在您的 Cloudflare KV 中, 建议定期手动导出 JSON 备份。
2.  **免费版限制**：
    - Cloudflare Workers 免费版每天限制 100,000 次请求。
    - KV 每天写入限制 1,000 次。

---

## 🤝 贡献与支持

如果您发现了 Bug 或有新功能建议，欢迎提交 Issue 或 Pull Request。

### 💖 捐赠 (Donation)

如果您觉得 RenewHelper 对您有帮助，欢迎请作者喝一杯咖啡 ☕️。您的支持是我持续更新的动力！

**加密货币** - 国际用户

| 币种 | 网络 (Network) | 地址 (Click to Copy) |
| :--- | :--- | :--- |
| **USDT** | **BSC (BEP20)** / Polygon / ETH | `0x0de4d19673cbdf954cfb83c0a48abb5ce8f6bf58` |

> ⚠️ 注意：此地址仅支持 EVM 兼容链 (以太坊/币安链/Polygon等)，请不要充值 TRC20 (波场) 资产！！！

**爱发电** - 国内用户

[![爱发电](https://img.shields.io/badge/爱发电-Afdian-946ce6?style=for-the-badge&logo=github&logoColor=white)](https://afdian.com/a/lostfree)

---

**License**: MIT
Copyright (c) 2025 LOSTFREE
