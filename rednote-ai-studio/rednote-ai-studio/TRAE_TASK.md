# Trae CN 开发任务说明

请先读取本项目 README.md、package.json、src/App.tsx 和 server/index.ts，再按以下顺序继续完善，不要推翻现有设计：

1. 先运行 npm install、npm run build，修复 TypeScript / 构建问题。
2. 运行 npm run dev，检查创作工作台、对标研究、笔记管理三个页面在桌面与手机宽度下的布局。
3. 检查 `/api/health`、`/api/generate`、`/api/search`、`/api/feishu/sync`。
4. 在 `.env` 中接入真实 AI、Tavily 搜索和飞书多维表格凭据；密钥只能保存在服务端。
5. 真实搜索结果必须保留来源链接；不能把公开网页摘要声称为小红书真实笔记，也不能虚构点赞收藏数。
6. 飞书字段需要与 README 一致；同步成功后显示真实返回状态，失败时保留错误原因。
7. 首版只生成并保存草稿，保持人工审核，不实现未授权的自动发布。
8. 最后输出已完成、未完成、需要用户配置的项目清单。

如果某个服务凭据未提供，保留清晰的演示模式与配置说明，不要假装接口已经接通。
