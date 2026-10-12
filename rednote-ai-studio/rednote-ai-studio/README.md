# 红笺 AI Studio

小红书智能创作网页应用首版：AI 文案生成、公开网页搜索与对标分析、飞书多维表格草稿同步。默认只生成草稿，需人工审核，不自动发布。

## 环境要求
- Node.js 20 或更新版本
- npm
- Trae CN 或其他支持终端的编辑器

## 本地运行
1. 解压项目，在 Trae CN 中打开项目文件夹。
2. 在终端运行 `npm install`
3. 复制 `.env.example` 为 `.env`，按需填写服务密钥。
4. 运行 `npm run dev`
5. 打开终端显示的 Vite 地址（通常是 `http://localhost:5173`）。

没有填写 AI、搜索和飞书配置时，前端仍可用演示数据体验流程。演示数据有明确提示，不代表真实搜索结果。

## 服务配置
### AI
在 `.env` 配置 `AI_BASE_URL`、`AI_API_KEY`、`AI_MODEL`。服务端使用 OpenAI 兼容的 `/chat/completions` 接口。不同供应商可能需要调整 base URL 或请求格式。

### 搜索
配置 `TAVILY_API_KEY` 后，服务端会调用 Tavily 搜索 API。它用于公开网页发现，不保证可抓取小红书登录后内容或互动指标。请遵守网站规则与搜索服务条款。

### 飞书多维表格
配置：
- `FEISHU_APP_ID`
- `FEISHU_APP_SECRET`
- `FEISHU_BITABLE_APP_TOKEN`
- `FEISHU_TABLE_ID`

飞书表格中预先创建以下字段，名称需与字段映射一致：
- `标题`（文本）
- `正文`（文本）
- `话题标签`（文本）
- `状态`（文本）
- `参考来源`（文本）

应用需要获得目标多维表格的访问权限。服务端会获取 tenant access token 并创建记录。不要把密钥放入前端或提交到代码仓库。

## API
- `GET /api/health`：服务状态
- `POST /api/generate`：生成笔记
- `POST /api/search`：搜索公开网页
- `POST /api/feishu/sync`：同步草稿至飞书

## 当前边界
- 没有小红书官方授权发布接口接入；本项目不会自动登录、绕过验证码或自动发布。
- 搜索结果和互动数据只在来源明确可验证时展示；演示结果不会伪装成真实笔记。
- 首版草稿存在浏览器 localStorage 中，仅适合个人原型测试，不适合存储敏感信息或多人协作。
