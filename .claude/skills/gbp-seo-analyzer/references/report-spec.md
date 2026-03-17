# HTML 報告規格

## 模板使用方式

1. 先用 `Read` 工具讀取 `references/template.html`（位於本技能目錄下）
2. 以模板為基礎，將 `{{placeholder}}` 替換為實際分析數據
3. **嚴格保留模板中的所有 CSS 變數、class 命名、HTML 結構**，不可自行修改設計風格
4. 僅在資料數量上做增減（如更多 finding-card），不改變佈局邏輯

---

## 報告結構（每個資訊只出現一次）

| 順序 | 區塊             | 對應 class                | 說明                                              |
| ---- | ---------------- | ------------------------- | ------------------------------------------------- |
| 1    | Hero 標頭        | `.hero`                 | 商家名稱、地址、電話、分析日期 +`.hero-creator` |
| 2    | 錨點導航列       | `.sticky-nav`           | 快速跳轉所有區塊                                  |
| 3    | 評分儀表板       | `.dashboard`            | 總分圓環 + 四面向分數卡                           |
| 4    | 30 秒摘要        | `.exec-summary`         | 白話總結 + 最該先做的 1 件事 + 好消息             |
| 5    | 競爭態勢（新增） | `.section#sec-compete`  | 5km 競品表 + 關鍵字排名                           |
| 6    | 診斷發現         | `.section` ×4          | 四面向分析，每項標注資料來源                      |
| 7    | 行動計畫         | `.section#sec-action`   | 影響力×難度矩陣 + 每個行動只出現一次             |
| 8    | 附錄             | `.section#sec-appendix` | 評分矩陣 + copy-paste 範本 + 名詞解釋             |
| 9    | 自我介紹 + CTA   | `.about-section`        | 個人介紹 + CTA 卡片                               |
| 10   | 服務方案 CTA     | `.report-cta-banner`    | 三層服務 tier（取得分析報告/諮詢/專業代操）+ 價值錨定 NT$6,000 |
| 10.5 | 問卷回饋 CTA     | `.survey-cta`           | 連結至 `survey.html?id={{報告ID}}`，報告ID = 使用者提供的 ID（如 `MMT5JQXK`），同時記錄於 `.report-container[data-report-id]` |
| 11   | Footer           | `.report-footer`        | 日期 + 免責聲明 + 品牌                            |

---

## 與舊結構的關鍵差異

1. **新增「競爭態勢」區塊**（順序 5）— 5km 競品表 + 關鍵字排名，基於 API 真實數據
2. **CTA 只放在最後**（`.about-section`）— 不在報告中間插入 CTA
3. **行動計畫獨立成一個區塊** — 每個建議只出現一次，不在面向分析中重複
4. **附錄整合** — 評分矩陣、copy-paste 範本、名詞解釋都放附錄
5. **面向分析精簡** — 只列有問題的項目，通過項目極簡呈現（一行帶過）

---

## 預期效果引用規範

所有預期效果必須引用來源，不可憑空編造百分比：

| 行動               | 預期效果               | 來源                   |
| ------------------ | ---------------------- | ---------------------- |
| 填寫完整商家檔案   | 多 80% 搜尋曝光        | Birdeye 2025           |
| 上傳 15+ 張照片    | 多 42% 導航請求        | Google / Latitude Park |
| 每週發 Google 貼文 | 在地曝光增加 26%       | SQ Magazine 2024       |
| 100% 回覆評論      | 轉換率提升 5.1%+       | SQ Magazine 2024       |
| 關鍵字豐富的描述   | Local Pack 能見度 +31% | SQ Magazine 2024       |

報告中使用格式：「根據 [來源]，類似商家在執行此項後平均提升 X%」

---

## 品牌標示規範

**Hero 區塊**：底部 `.hero-creator`，文字「Analysed by @dev.from.zero」→ `https://www.threads.com/@dev.from.zero`

**自我介紹 + CTA（`.about-section`）**：位於附錄之後

- 左側：頭像（使用 `https://gbp-seo.devfromzero.xyz/assets/avatar.png`）+ 名稱「dev.from.zero」+ 簡介（「懶惰的工程師」開頭）
- 右側：CTA 卡片（語氣用「需要幫忙執行？」而非「購買服務」）
  - 🌐 Google 商家 SEO 優化服務 → `https://gbp-seo.devfromzero.xyz`
  - 💬 追蹤 Threads @dev.from.zero → `https://www.threads.com/@dev.from.zero`
- **不在報告中間插入 CTA**，所有 CTA 集中在此區塊

**服務方案 CTA**（`.report-cta-banner`）：位於 About 之後，含三層服務方案
- 標題：「選擇最適合你的優化方式」
- 三層服務 tier cards（`.service-tiers` grid）：
  1. **取得分析報告**（NT$6,000）— 照報告執行 + 使用附錄範本 → `https://gbp-seo.devfromzero.xyz/#cta`
  2. **1 對 1 諮詢**（預約討論）— 深度解說 + 量身策略 + 客製化關鍵字 → `https://www.threads.com/@dev.from.zero`
  3. **專業代操**（客製報價，標「最省時」）— 全方位代操：描述撰寫、照片優化、評論管理、Google 貼文代發、持續成效追蹤 → `https://www.threads.com/@dev.from.zero`

**About section CTA cards**：3 張卡片
- 🚀 專業代操服務（`.cta-card-highlight`，綠色高亮邊框）→ Threads 私訊
- 📊 免費索取分析報告 → `https://gbp-seo.devfromzero.xyz/#cta`
- 💬 追蹤 Threads → `https://www.threads.com/@dev.from.zero`

**Footer**：「Created by @dev.from.zero」+ 網站按鈕

---

## 客戶導向 UX 規範

**UX-1 — 30 秒摘要精簡化**

- Dashboard 之後，用 3-4 句白話文說明現況
- 只列「最該先做的 1 件事」（不是 3 件），附預估時間
- 用比喻讓抽象概念具體化

**UX-2 — 術語白話化 + Tooltip**

- 專業術語用 `.term` + `.tip` tooltip
- 必須解釋：Google 商家檔案、SEO、Google 貼文、NAP 一致性、關鍵字、搜尋曝光次數

**UX-3 — Finding Card 標注資料來源**

- 每張 `.finding-card` 必須標注「已驗證 / 交叉比對」
- 底部 `.finding-impact` 一句話說明對生意的影響
- **通過項目極簡呈現**（一行），不需要長篇解釋為什麼好

**UX-4 — 行動計畫使用矩陣排列**

- 用影響力 × 難度矩陣取代「高/中/低優先」
- 🔴 立刻做最多 1 件
- 每個行動標注難度星級 + 三層指引（自己做/找人/交給專家）

**UX-5 — 競品表視覺突出**

- 目標商家用 ★ 標記、粗體、底色區分
- 表格按評分或熱門度排序
- 一句話點出差距：「你的照片數在 20 家中排倒數第 3」

**UX-6 — 價值錨定 + CTA**：Hero 區顯示「價值 NT$6,000」標籤；Service CTA 區描述報告涵蓋的分析量等同 NT$6,000 專業健檢；Tier 1「取得分析報告」定價 NT$6,000

**UX-7 — 手機體驗優化**（保留）

---

## 每面向區塊固定結構

```
section.section#sec-{id}
├── div.section-header
│   ├── div.section-icon
│   ├── h2.section-title
│   └── span.section-score-inline
├── div.section-verdict              ← 一句話結論
├── div.findings-grid
│   └── div.finding-card.status-{pass|warn|fail} ×N
│       ├── div.finding-status       ← 含資料來源標籤
│       ├── div.finding-title
│       ├── div.finding-detail
│       └── div.finding-impact
└── （不放 rec-card — 建議統一在行動計畫區塊）
```

---

## 固定設計規範

**字型**：DM Sans（標題）、Noto Sans TC（正文）、JetBrains Mono（數據）
**配色**：深海藍 `#0F2B3C` / 翡翠綠 `#00C9A7` / 評分四色
**圓環圖**：`circumference = 490, offset = 490 × (1 - score/100)`

---

## 技術要求

- 單一 HTML 檔案，CSS 內嵌 `<style>`，JS 內嵌 `<script>`
- 不依賴外部 JS/CSS（僅 Google Fonts CDN）
- 響應式：768px / 560px 斷點
- 支援列印 `@media print`
