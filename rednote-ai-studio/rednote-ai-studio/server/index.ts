import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const PORT = Number(process.env.PORT || 8787);

type SearchResult = {
  title: string;
  url: string;
  snippet: string;
  source: string;
  verifiedMetrics: boolean;
  note?: string;
};

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    services: {
      ai: Boolean(process.env.AI_API_KEY),
      search: Boolean(process.env.TAVILY_API_KEY),
      feishu: Boolean(
        process.env.FEISHU_APP_ID &&
        process.env.FEISHU_APP_SECRET &&
        process.env.FEISHU_BITABLE_APP_TOKEN &&
        process.env.FEISHU_TABLE_ID
      )
    }
  });
});

app.post("/api/generate", async (req, res) => {
  const { niche, topic, audience, tone, referenceNotes } = req.body ?? {};
  if (!topic || typeof topic !== "string" || topic.trim().length < 2) {
    return res.status(400).json({ error: "请填写至少 2 个字的选题。" });
  }

  const systemPrompt = `你是中文社交媒体内容编辑。请产出原创小红书笔记，不复制参考文本的独特表达，不编造亲测体验、价格、营业时间、点赞收藏数或功效。信息缺失时写入“待核实”。请仅返回 JSON，字段为 titles(3个字符串), recommendedTitle, body, tags(5-10个字符串), coverTitle, coverSubtitle, imageIdeas(数组), factChecks(数组)。`;
  const userPrompt = `赛道：${niche || "生活方式"}\n选题：${topic}\n目标读者：${audience || "兴趣用户"}\n文风：${tone || "自然、真实、实用"}\n参考资料（仅分析规律，禁止复制）：${referenceNotes || "无"}\n请生成一份可人工审核的原创草稿。`;

  if (!process.env.AI_API_KEY) {
    return res.json({
      mode: "demo",
      notice: "当前为演示生成结果。配置 AI_API_KEY 后才会调用真实模型。",
      draft: {
        titles: [
          `${topic}｜这份实用清单先收藏`,
          `关于${topic}，出发前建议先看这篇`,
          `${topic}怎么安排更省心？整理给你`
        ],
        recommendedTitle: `${topic}｜这份实用清单先收藏`,
        body: `如果你最近正在关注「${topic}」，可以先把这份清单收好。\n\n📌 先明确自己的需求和时间安排，再根据实际情况筛选适合的方案。\n\n✨ 建议重点关注：\n1. 提前核对地点、价格或相关规则\n2. 根据个人预算和偏好做取舍\n3. 出发前再次确认最新信息\n\n这篇先作为整理思路的草稿，具体细节发布前记得核实。你最想了解哪一部分？`,
        tags: ["小红书创作", "实用攻略", "生活记录", "经验分享", "收藏备用"],
        coverTitle: `${topic}实用指南`,
        coverSubtitle: "出发前先看 · 信息记得核实",
        imageIdeas: ["一张主题清晰的封面图", "2—3 张步骤或细节图", "一张总结清单图"],
        factChecks: ["具体地点/产品信息待核实", "价格、时间与政策信息发布前复核", "不得将未体验内容写成亲测"]
      }
    });
  }

  try {
    const base = (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
    const response = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.AI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || "gpt-4o-mini",
        temperature: 0.8,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      })
    });
    if (!response.ok) {
      const detail = await response.text();
      return res.status(502).json({ error: "AI 服务请求失败。", detail: detail.slice(0, 500) });
    }
    const data = await response.json() as any;
    const content = data.choices?.[0]?.message?.content;
    if (!content) return res.status(502).json({ error: "AI 服务未返回有效内容。" });
    return res.json({ mode: "live", draft: JSON.parse(content) });
  } catch (error) {
    return res.status(500).json({
      error: "生成失败，请检查模型配置或返回格式。",
      detail: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

app.post("/api/search", async (req, res) => {
  const query = String(req.body?.query || "").trim();
  if (query.length < 2) return res.status(400).json({ error: "请输入至少 2 个字的搜索关键词。" });

  if (!process.env.TAVILY_API_KEY) {
    const demo: SearchResult[] = [
      {
        title: `演示结果：${query} 选题研究方向`,
        url: "https://example.com/demo-search-result",
        snippet: "这是演示数据，不是实际小红书笔记。配置 TAVILY_API_KEY 后可搜索公开网页；点赞和收藏数据不会由此自动获得。",
        source: "演示数据",
        verifiedMetrics: false,
        note: "请勿作为真实对标样本引用。"
      }
    ];
    return res.json({ mode: "demo", notice: "未配置搜索服务，当前显示演示结果。", results: demo });
  }

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query: `${query} 小红书 笔记`,
        search_depth: "advanced",
        max_results: 8,
        include_answer: false
      })
    });
    if (!response.ok) {
      const detail = await response.text();
      return res.status(502).json({ error: "搜索服务请求失败。", detail: detail.slice(0, 400) });
    }
    const data = await response.json() as any;
    const results: SearchResult[] = (data.results || []).map((r: any) => ({
      title: String(r.title || "无标题"),
      url: String(r.url || ""),
      snippet: String(r.content || ""),
      source: (() => { try { return new URL(r.url).hostname; } catch { return "公开网页"; } })(),
      verifiedMetrics: false,
      note: "搜索摘要不代表小红书站内互动数据，需打开来源核验。"
    }));
    return res.json({ mode: "live", results });
  } catch (error) {
    return res.status(500).json({ error: "搜索失败。", detail: error instanceof Error ? error.message : "Unknown error" });
  }
});

app.post("/api/feishu/sync", async (req, res) => {
  const { title, body, tags, sources } = req.body ?? {};
  if (!title || !body) return res.status(400).json({ error: "标题和正文不能为空。" });

  const { FEISHU_APP_ID, FEISHU_APP_SECRET, FEISHU_BITABLE_APP_TOKEN, FEISHU_TABLE_ID } = process.env;
  if (!FEISHU_APP_ID || !FEISHU_APP_SECRET || !FEISHU_BITABLE_APP_TOKEN || !FEISHU_TABLE_ID) {
    return res.status(400).json({
      error: "飞书尚未配置。请在服务端 .env 中填写应用凭证、Bitable app token 和 table ID。",
      configured: false
    });
  }

  try {
    const tokenResp = await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app_id: FEISHU_APP_ID, app_secret: FEISHU_APP_SECRET })
    });
    const tokenData = await tokenResp.json() as any;
    if (!tokenResp.ok || tokenData.code !== 0 || !tokenData.tenant_access_token) {
      return res.status(502).json({ error: "获取飞书 tenant_access_token 失败。", detail: tokenData.msg || "请检查应用凭证。" });
    }

    const recordResp = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${encodeURIComponent(FEISHU_BITABLE_APP_TOKEN)}/tables/${encodeURIComponent(FEISHU_TABLE_ID)}/records`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenData.tenant_access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fields: {
            "标题": String(title),
            "正文": String(body),
            "话题标签": Array.isArray(tags) ? tags.join(" ") : String(tags || ""),
            "状态": "待审核",
            "参考来源": Array.isArray(sources) ? sources.join("\n") : String(sources || "")
          }
        })
      }
    );
    const recordData = await recordResp.json() as any;
    if (!recordResp.ok || recordData.code !== 0) {
      return res.status(502).json({
        error: "飞书写入失败。请检查表格字段名称、应用权限和表格授权。",
        detail: recordData.msg || `HTTP ${recordResp.status}`
      });
    }
    return res.json({ ok: true, recordId: recordData.data?.record?.record_id, status: "待审核" });
  } catch (error) {
    return res.status(500).json({ error: "飞书同步异常。", detail: error instanceof Error ? error.message : "Unknown error" });
  }
});

app.listen(PORT, () => {
  console.log(`Rednote AI Studio API running at http://localhost:${PORT}`);
});
