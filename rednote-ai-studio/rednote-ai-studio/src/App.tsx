import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine, ArrowRight, BarChart3, BookOpen, Check, ChevronDown,
  CircleHelp, Clipboard, Clock3, FileText, Flame, Image, LayoutDashboard,
  Link2, LoaderCircle, PenLine, Plus, Search, Send, Settings2, Sparkles,
  Table2, Tags, WandSparkles
} from "lucide-react";

type Draft = {
  titles: string[];
  recommendedTitle: string;
  body: string;
  tags: string[];
  coverTitle: string;
  coverSubtitle: string;
  imageIdeas: string[];
  factChecks: string[];
};
type Result = { title: string; url: string; snippet: string; source: string; verifiedMetrics: boolean; note?: string };
type SavedDraft = { id: string; title: string; body: string; tags: string[]; status: string; createdAt: string };

const initialDraft: Draft = {
  titles: ["杭州老底子小吃｜本地味道慢慢逛", "第一次逛杭州小吃？这份清单先收好", "不赶时间，在杭州吃点有烟火气的"],
  recommendedTitle: "杭州老底子小吃｜本地味道慢慢逛",
  body: "如果你想了解杭州的传统小吃，可以先从老街、传统糕点和本地日常饮食开始做功课。\n\n📍 出发前建议先确认店铺地址和营业时间，热门时段也可以提前规划路线。\n\n🍵 这份清单可以从三个方向整理：\n1. 传统糕点：关注口感、份量和购买方式\n2. 街边小吃：留意现场制作与排队情况\n3. 茶点搭配：适合慢慢逛、慢慢吃的节奏\n\n价格和营业信息以店家最新公布为准。你更想看杭州哪一类传统小吃？",
  tags: ["杭州美食", "杭州小吃", "本地美食", "周末去哪儿", "美食攻略"],
  coverTitle: "杭州传统小吃",
  coverSubtitle: "慢慢逛 · 慢慢吃",
  imageIdeas: ["封面：食物近景 + 简洁标题", "细节：糕点纹理或制作过程", "信息页：路线与到店提醒"],
  factChecks: ["店铺名称、地址与营业时间待核实", "价格信息发布前核实", "未亲自体验的内容不要写成亲测"]
};

const seedDrafts: SavedDraft[] = [
  { id: "demo-1", title: "杭州老底子小吃｜本地味道慢慢逛", body: initialDraft.body, tags: initialDraft.tags, status: "待审核", createdAt: "刚刚" },
  { id: "demo-2", title: "江南周末慢旅行：出发前的准备清单", body: "一份适合慢慢规划的旅行清单。具体交通、开放时间与预算请出发前核实。", tags: ["江南旅行", "周末攻略"], status: "草稿", createdAt: "昨天" }
];

const navItems = [
  { id: "studio", label: "创作工作台", icon: LayoutDashboard },
  { id: "research", label: "对标研究", icon: Search },
  { id: "drafts", label: "笔记管理", icon: FileText }
];

export default function App() {
  const [page, setPage] = useState("studio");
  const [niche, setNiche] = useState("美食探店");
  const [topic, setTopic] = useState("杭州传统小吃与老街美食");
  const [audience, setAudience] = useState("周末来杭州的年轻游客");
  const [tone, setTone] = useState("真实实用");
  const [referenceNotes, setReferenceNotes] = useState("");
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [searchQuery, setSearchQuery] = useState("杭州传统小吃 小红书");
  const [searchResults, setSearchResults] = useState<Result[]>([]);
  const [searchNotice, setSearchNotice] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [searchBusy, setSearchBusy] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [mode, setMode] = useState("demo");
  const [health, setHealth] = useState({ ai: false, search: false, feishu: false });
  const [drafts, setDrafts] = useState<SavedDraft[]>(() => {
    try {
      const stored = localStorage.getItem("rednote-drafts");
      return stored ? JSON.parse(stored) : seedDrafts;
    } catch { return seedDrafts; }
  });

  useEffect(() => {
    localStorage.setItem("rednote-drafts", JSON.stringify(drafts));
  }, [drafts]);

  useEffect(() => {
    fetch("/api/health").then(r => r.json()).then(d => setHealth(d.services || { ai: false, search: false, feishu: false })).catch(() => {});
  }, []);

  const selectedTitle = draft.recommendedTitle || draft.titles[0] || "";
  const stats = useMemo(() => [
    { label: "累计草稿", value: String(drafts.length).padStart(2, "0"), icon: FileText, note: "本地保存" },
    { label: "待审核", value: String(drafts.filter(d => d.status === "待审核").length).padStart(2, "0"), icon: Clock3, note: "等待你确认" },
    { label: "对标样本", value: String(searchResults.length).padStart(2, "0"), icon: BarChart3, note: "当前研究结果" }
  ], [drafts, searchResults]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  }

  async function generate() {
    if (topic.trim().length < 2) return notify("先填写一个明确的选题。");
    setBusy(true);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche, topic, audience, tone, referenceNotes })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "生成失败");
      setDraft(data.draft);
      setMode(data.mode || "demo");
      notify(data.mode === "live" ? "文案生成完成，请检查事实与表达。" : "已生成演示草稿；配置 AI 后可调用真实模型。");
    } catch (e) {
      notify(e instanceof Error ? e.message : "生成失败，请检查后端服务。");
    } finally { setBusy(false); }
  }

  async function search() {
    if (searchQuery.trim().length < 2) return notify("请输入搜索关键词。");
    setSearchBusy(true);
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "搜索失败");
      setSearchResults(data.results || []);
      setSearchNotice(data.notice || (data.mode === "live" ? "以下为公开网页搜索结果，不代表已核实的站内互动数据。" : ""));
      setMode(data.mode || "demo");
      notify(data.mode === "live" ? "搜索完成，请逐条核实来源。" : "当前显示演示结果，请配置搜索服务。");
    } catch (e) {
      notify(e instanceof Error ? e.message : "搜索失败。");
    } finally { setSearchBusy(false); }
  }

  function saveDraft(status = "待审核") {
    const item: SavedDraft = {
      id: crypto.randomUUID(),
      title: selectedTitle,
      body: draft.body,
      tags: draft.tags || [],
      status,
      createdAt: new Date().toLocaleString("zh-CN", { hour12: false })
    };
    setDrafts(old => [item, ...old]);
    notify(status === "待审核" ? "已保存到笔记管理，等待人工审核。" : "草稿已保存。");
    setPage("drafts");
  }

  async function syncFeishu() {
    if (!selectedTitle || !draft.body) return notify("请先生成笔记内容。");
    setSyncBusy(true);
    try {
      const response = await fetch("/api/feishu/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: selectedTitle, body: draft.body, tags: draft.tags, sources: sourceUrl ? [sourceUrl] : searchResults.map(r => r.url) })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "同步失败");
      notify(`已同步到飞书，状态：${data.status || "待审核"}`);
      setHealth(h => ({ ...h, feishu: true }));
    } catch (e) {
      notify(e instanceof Error ? e.message : "同步失败。");
    } finally { setSyncBusy(false); }
  }

  function copyText(value: string) {
    navigator.clipboard?.writeText(value).then(() => notify("已复制到剪贴板。")).catch(() => notify("复制失败，请手动选择文本复制。"));
  }

  function approve(id: string) {
    setDrafts(old => old.map(d => d.id === id ? { ...d, status: "已批准" } : d));
    notify("已标记为已批准。实际发布仍由你手动完成。");
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><span>笺</span></div>
          <div><div className="brand-name">红笺 <span>AI Studio</span></div><div className="brand-sub">REDNOTE CREATOR WORKSPACE</div></div>
        </div>
        <div className="workspace-label">工作空间</div>
        <nav className="side-nav">
          {navItems.map(item => {
            const Icon = item.icon;
            return <button key={item.id} className={`nav-item ${page === item.id ? "active" : ""}`} onClick={() => setPage(item.id)}>
              <Icon size={18}/><span>{item.label}</span>{item.id === "drafts" && <span className="nav-count">{drafts.length}</span>}
            </button>;
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="helper-card">
            <div className="helper-icon"><Sparkles size={17}/></div>
            <div><strong>创作小提示</strong><p>真实细节比夸张标题更能建立信任。</p></div>
          </div>
          <button className="nav-item muted" onClick={() => notify("服务配置请在项目根目录的 .env 中完成。")}><Settings2 size={18}/><span>服务配置</span></button>
          <div className="profile">
            <div className="avatar">红</div><div className="profile-text"><strong>内容创作者</strong><span>个人工作空间</span></div><ChevronDown size={15} className="profile-chevron"/>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">工作空间 <span>/</span> {navItems.find(n => n.id === page)?.label}</div>
          <div className="topbar-right"><span className="status-dot"></span><span>本地工作区</span><button className="icon-button" title="帮助" onClick={() => notify("先配置 AI、搜索与飞书环境变量，即可逐步启用真实服务。")}><CircleHelp size={18}/></button><div className="avatar small">红</div></div>
        </header>

        <div className="content">
          {page === "studio" && <>
            <section className="welcome-row">
              <div><div className="eyebrow"><Sparkles size={14}/> AI CONTENT WORKSPACE</div><h1>让好内容，自然生长。</h1><p className="welcome-sub">从灵感、研究到成稿，把每一次创作变得更轻松。</p></div>
              <div className="date-chip"><span className="date-dot"></span> 创作工作台 <span className="chip-separator">·</span> 草稿优先</div>
            </section>
            <section className="stats-grid">
              {stats.map(s => { const Icon = s.icon; return <div className="stat-card" key={s.label}><div className="stat-top"><span>{s.label}</span><span className="stat-icon"><Icon size={17}/></span></div><div className="stat-value">{s.value}</div><div className="stat-note">{s.note}</div></div>; })}
            </section>
            <div className="studio-grid">
              <section className="panel create-panel">
                <div className="panel-heading"><div><div className="section-kicker">STEP 01 / CREATE</div><h2><WandSparkles size={19}/> 开始创作</h2><p>先说清楚你想写什么，剩下的交给灵感。</p></div><span className="soft-pill"><Sparkles size={13}/> AI 助手</span></div>
                <div className="form-grid">
                  <label className="field"><span>内容赛道</span><select value={niche} onChange={e => setNiche(e.target.value)}><option>美食探店</option><option>旅游攻略</option><option>商品测评</option><option>穿搭生活</option><option>家居好物</option><option>学习成长</option></select></label>
                  <label className="field"><span>目标读者</span><input value={audience} onChange={e => setAudience(e.target.value)} placeholder="例如：周末出游的年轻人"/></label>
                  <label className="field full"><span>这次想写什么？<i>必填</i></span><textarea value={topic} onChange={e => setTopic(e.target.value)} rows={3} placeholder="输入选题、地点、产品或你想解决的问题…"/></label>
                  <label className="field"><span>文案风格</span><select value={tone} onChange={e => setTone(e.target.value)}><option>真实实用</option><option>轻松口语</option><option>温柔治愈</option><option>专业测评</option><option>清单攻略</option></select></label>
                  <label className="field"><span>参考笔记 / 补充事实 <small>选填</small></span><input value={sourceUrl} onChange={e => { setSourceUrl(e.target.value); setReferenceNotes(e.target.value); }} placeholder="粘贴公开链接或补充真实信息"/></label>
                </div>
                <div className="form-footer"><div className="privacy-note"><span className="mini-check"><Check size={12}/></span>生成后先审核，不会自动发布</div><button className="primary-button" onClick={generate} disabled={busy}>{busy ? <LoaderCircle className="spin" size={17}/> : <Sparkles size={17}/>} {busy ? "正在生成…" : "生成笔记"}<ArrowRight size={16}/></button></div>
              </section>
              <section className="panel workflow-panel">
                <div className="panel-heading"><div><div className="section-kicker">YOUR WORKFLOW</div><h2>创作流程</h2><p>从灵感到可发布草稿</p></div><div className="workflow-flower"><WandSparkles size={20}/></div></div>
                <div className="workflow-list">
                  <div className="workflow-step done"><div className="step-marker"><Search size={16}/></div><div><strong>研究选题</strong><p>寻找公开参考资料</p></div><span className={`step-status ${health.search ? "connected" : ""}`}>{health.search ? "已连接" : "待配置"}</span></div>
                  <div className="workflow-line"></div>
                  <div className="workflow-step"><div className="step-marker"><PenLine size={16}/></div><div><strong>生成原创文案</strong><p>标题、正文与话题标签</p></div><span className={`step-status ${health.ai ? "connected" : ""}`}>{health.ai ? "已连接" : "演示模式"}</span></div>
                  <div className="workflow-line"></div>
                  <div className="workflow-step"><div className="step-marker"><Table2 size={16}/></div><div><strong>同步飞书</strong><p>进入待审核内容库</p></div><span className={`step-status ${health.feishu ? "connected" : ""}`}>{health.feishu ? "已连接" : "待配置"}</span></div>
                </div>
                <div className="workflow-tip"><Flame size={16}/><span>小建议：先明确内容价值，再选择标题表达。</span></div>
              </section>
            </div>

            <section className="panel result-panel">
              <div className="result-heading"><div><div className="section-kicker">STEP 02 / YOUR DRAFT</div><h2><FileText size={19}/> 笔记预览</h2><p>这是你的编辑区，内容可以继续调整。</p></div><div className="result-actions"><span className={`mode-pill ${mode === "live" ? "live" : ""}`}>{mode === "live" ? "真实服务结果" : "演示 / 草稿"}</span><button className="secondary-button" onClick={() => copyText(`${selectedTitle}\n\n${draft.body}\n\n${draft.tags.map(t => "#" + t).join(" ")}`)}><Clipboard size={15}/> 复制全文</button></div></div>
              <div className="preview-grid">
                <div className="preview-editor">
                  <label className="field"><span>推荐标题</span><input value={draft.recommendedTitle} onChange={e => setDraft(d => ({ ...d, recommendedTitle: e.target.value }))}/></label>
                  <div className="title-options"><div className="small-label">标题灵感 <span>{draft.titles.length} 个备选</span></div>{draft.titles.map((t, i) => <button key={i} className={`title-option ${t === draft.recommendedTitle ? "selected" : ""}`} onClick={() => setDraft(d => ({ ...d, recommendedTitle: t }))}><span>{t}</span>{t === draft.recommendedTitle ? <Check size={15}/> : <ArrowDownToLine size={14}/>}</button>)}</div>
                  <label className="field body-field"><span>正文内容</span><textarea rows={10} value={draft.body} onChange={e => setDraft(d => ({ ...d, body: e.target.value }))}/><div className="text-count">{draft.body.length} 字符 · 可编辑</div></label>
                  <div className="tag-block"><div className="small-label"><Tags size={14}/> 话题标签</div><div className="tag-list">{draft.tags.map((tag, i) => <button key={`${tag}-${i}`} className="tag" onClick={() => copyText("#" + tag)}>#{tag}</button>)}</div></div>
                </div>
                <aside className="cover-preview">
                  <div className="cover-top"><span><Image size={14}/> 封面文案方案</span><span className="cover-number">01 / 03</span></div>
                  <div className="cover-art"><div className="cover-stamp">REDNOTE<br/>EDITORIAL</div><div className="cover-deco deco-one"></div><div className="cover-deco deco-two"></div><div className="cover-copy"><span className="cover-eyebrow">一份认真整理的指南</span><h3>{draft.coverTitle}</h3><p>{draft.coverSubtitle}</p><div className="cover-rule"></div><span className="cover-foot">收藏这份灵感 · 慢慢探索</span></div><div className="cover-leaf">✳</div></div>
                  <label className="field cover-field"><span>封面主标题</span><input value={draft.coverTitle} onChange={e => setDraft(d => ({ ...d, coverTitle: e.target.value }))}/></label>
                  <label className="field cover-field"><span>封面副标题</span><input value={draft.coverSubtitle} onChange={e => setDraft(d => ({ ...d, coverSubtitle: e.target.value }))}/></label>
                  <div className="image-ideas"><div className="small-label"><Image size={14}/> 配图建议</div>{draft.imageIdeas.map((idea, i) => <div className="idea-row" key={i}><span>{String(i + 1).padStart(2, "0")}</span>{idea}</div>)}</div>
                </aside>
              </div>
              <div className="fact-checks"><div className="small-label"><Check size={14}/> 发布前核验</div><div className="fact-list">{draft.factChecks.map((f, i) => <span key={i}><span className="fact-dot"></span>{f}</span>)}</div></div>
              <div className="result-footer"><span className="review-note"><Clock3 size={15}/> 建议核实信息后再发布</span><div><button className="secondary-button" onClick={() => saveDraft("草稿")}><Plus size={15}/> 保存草稿</button><button className="secondary-button feishu-button" onClick={syncFeishu} disabled={syncBusy}>{syncBusy ? <LoaderCircle className="spin" size={15}/> : <Table2 size={15}/>} 同步飞书</button><button className="primary-button" onClick={() => saveDraft("待审核")}><Check size={16}/> 提交人工审核</button></div></div>
            </section>
          </>}

          {page === "research" && <>
            <section className="welcome-row"><div><div className="eyebrow"><Search size={14}/> CONTENT RESEARCH</div><h1>先研究，再创作。</h1><p className="welcome-sub">从公开网页找到灵感，提炼规律，不复制别人的表达。</p></div><div className="date-chip"><Search size={14}/> 对标研究</div></section>
            <section className="panel research-panel">
              <div className="panel-heading"><div><div className="section-kicker">STEP 01 / DISCOVER</div><h2>搜索公开参考内容</h2><p>输入关键词或粘贴可访问的公开页面链接。</p></div><span className="soft-pill"><Link2 size={13}/> 来源可追溯</span></div>
              <div className="search-form"><div className="search-input-wrap"><Search size={18}/><input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && search()} placeholder="例如：杭州传统小吃 / 周末旅行攻略"/></div><button className="primary-button" onClick={search} disabled={searchBusy}>{searchBusy ? <LoaderCircle className="spin" size={16}/> : <Search size={16}/>} 开始搜索</button></div>
              <div className="search-hints"><span>推荐方向</span>{["杭州传统小吃", "江南两日游", "平价好物测评"].map(x => <button key={x} onClick={() => setSearchQuery(x)}>{x}</button>)}</div>
              {searchNotice && <div className="notice-box"><CircleHelp size={16}/>{searchNotice}</div>}
              <div className="results-header"><h3>搜索结果 <span>{searchResults.length}</span></h3><span className="muted-text">互动指标仅在来源可验证时记录</span></div>
              {searchResults.length === 0 ? <div className="empty-state"><div className="empty-icon"><BookOpen size={24}/></div><strong>开始你的第一轮选题研究</strong><p>搜索公开网页，收集标题、摘要与来源，再总结内容规律。</p><button className="secondary-button" onClick={search}><Search size={15}/> 搜索示例关键词</button></div> :
                <div className="search-results">{searchResults.map((r, i) => <article className="search-result" key={`${r.url}-${i}`}><div className="result-source"><span className="source-badge">{r.source}</span><span className="result-index">参考样本 {String(i + 1).padStart(2, "0")}</span></div><h3>{r.title}</h3><p>{r.snippet}</p><div className="result-card-bottom"><a href={r.url} target="_blank" rel="noreferrer">查看来源 <ArrowRight size={13}/></a><span className="metrics-unverified">{r.verifiedMetrics ? "互动数据已核实" : "未核实互动数据"}</span><button className="text-action" onClick={() => { setReferenceNotes(old => old ? `${old}\n${r.title}: ${r.snippet}\n来源：${r.url}` : `${r.title}: ${r.snippet}\n来源：${r.url}`); setSourceUrl(r.url); setPage("studio"); notify("已将摘要加入创作参考，请注意核验事实。"); }}>用于创作参考</button></div>{r.note && <div className="result-note">{r.note}</div>}</article>)}</div>}
            </section>
            <section className="panel analysis-guide"><div className="panel-heading"><div><div className="section-kicker">STEP 02 / ANALYZE</div><h2><BarChart3 size={19}/> 对标分析维度</h2><p>关注可复用的内容规律，而不是照搬原文。</p></div></div><div className="analysis-grid">{[{n:"01",t:"标题结构",d:"明确受众、场景与具体价值"},{n:"02",t:"开头吸引力",d:"尽快回答读者为什么要看"},{n:"03",t:"收藏价值",d:"清单、步骤、路线或比较维度"},{n:"04",t:"可信度",d:"来源、事实、体验边界与适用人群"}].map(x => <div className="analysis-item" key={x.n}><span>{x.n}</span><div><strong>{x.t}</strong><p>{x.d}</p></div></div>)}</div><button className="primary-button" onClick={() => setPage("studio")}>根据研究开始创作 <ArrowRight size={15}/></button></section>
          </>}

          {page === "drafts" && <>
            <section className="welcome-row"><div><div className="eyebrow"><FileText size={14}/> DRAFT LIBRARY</div><h1>你的内容，一目了然。</h1><p className="welcome-sub">集中管理草稿与审核状态。这里的首版记录保存在当前浏览器。</p></div><button className="primary-button" onClick={() => setPage("studio")}><Plus size={16}/> 新建笔记</button></section>
            <section className="panel drafts-panel"><div className="drafts-toolbar"><div><h2>笔记列表 <span className="list-count">{drafts.length}</span></h2><p>编辑完成后可同步飞书，发布前请人工核实。</p></div><button className="secondary-button" onClick={() => copyText(JSON.stringify(drafts, null, 2))}><ArrowDownToLine size={15}/> 导出 JSON</button></div>
              {drafts.length === 0 ? <div className="empty-state"><div className="empty-icon"><FileText size={24}/></div><strong>还没有笔记</strong><p>从创作工作台开始，生成你的第一篇草稿。</p><button className="primary-button" onClick={() => setPage("studio")}>去创作 <ArrowRight size={15}/></button></div> :
                <div className="draft-table-wrap"><table className="draft-table"><thead><tr><th>笔记标题</th><th>赛道</th><th>状态</th><th>创建时间</th><th>操作</th></tr></thead><tbody>{drafts.map(d => <tr key={d.id}><td><div className="draft-title-cell"><div className="draft-file-icon"><FileText size={16}/></div><div><strong>{d.title}</strong><span>{d.tags.slice(0, 3).map(t => "#" + t).join(" ")}</span></div></div></td><td><span className="category-label">{niche}</span></td><td><span className={`status-label ${d.status === "已批准" ? "approved" : d.status === "待审核" ? "review" : ""}`}><span></span>{d.status}</span></td><td className="time-cell">{d.createdAt}</td><td><div className="table-actions"><button className="text-action" onClick={() => { setDraft(old => ({ ...old, recommendedTitle: d.title, body: d.body, tags: d.tags })); setPage("studio"); }}>编辑</button>{d.status === "待审核" && <button className="text-action approve-action" onClick={() => approve(d.id)}>通过审核</button>}<button className="text-action delete-action" onClick={() => setDrafts(old => old.filter(x => x.id !== d.id))}>删除</button></div></td></tr>)}</tbody></table></div>}
              <div className="drafts-footer"><span><span className="status-dot"></span> 本地保存已开启</span><span>首版暂不自动发布</span></div>
            </section>
            <section className="panel sync-panel"><div className="sync-icon"><Table2 size={21}/></div><div className="sync-copy"><h3>让飞书成为你的内容中枢</h3><p>配置飞书多维表格后，可以把标题、正文、标签、来源和审核状态同步到团队内容库。</p></div><button className="secondary-button" onClick={() => notify(health.feishu ? "飞书配置已检测到。请在创作页选择同步飞书。" : "请先在项目 .env 配置飞书应用凭证与多维表格信息。")}>检查连接 <ArrowRight size={15}/></button></section>
          </>}
          <footer className="app-footer"><span>红笺 AI Studio <span className="footer-dot">·</span> 为认真创作而设计</span><span>草稿优先 <span className="footer-dot">·</span> 人工审核 <span className="footer-dot">·</span> 尊重原创</span></footer>
        </div>
      </main>
      {toast && <div className="toast"><span className="toast-check"><Check size={14}/></span>{toast}</div>}
    </div>
  );
}