# Skill: 新增專案到 projects.json

## 觸發時機

當使用者提供一份 GBP SEO 健檢報告 HTML 檔案，並要求加入 projects.json 時使用此流程。

## 使用者會提供

- 一份報告 HTML 檔案（放入 `data/` 目錄）
- Google Maps 連結（必填，格式如 `https://maps.app.goo.gl/xxxxx`）

## 完整流程

### 1. 將 HTML 報告存入 `data/`

檔案命名格式：`YYYYMMDD-slug.html`
- 日期為報告建立日期（今天）
- slug 從商家名稱取英文部分，全小寫，用 `-` 連接
- 範例：`20260303-zarco-store.html`

### 2. 從 HTML 報告中擷取資訊

讀取報告 HTML，擷取以下欄位：

| 欄位 | 來源位置 | 範例 |
|------|---------|------|
| **name** | `<title>` 標籤中 `—` 之後的商家名稱 | `和沐倉庫 ZARCO STORE` |
| **score** | `.score-number` 元素中的數字 | `22` |
| **basicInfo** | 第一個 `.dim-score`（商家基本資訊） | `20` |
| **reviews** | 第二個 `.dim-score`（評論分析） | `35` |
| **photos** | 第三個 `.dim-score`（照片與視覺內容） | `15` |
| **keywords** | 第四個 `.dim-score`（描述與關鍵字策略） | `15` |
| **category** | 報告內容中提及的商家主類別 | `玩具店` |
| **location** | 報告中提及的城市 | `台中` |
| **tags** | 從商家類別、產品特色中提取 3 個標籤 | `["玩具", "兒童用品", "禮品"]` |

### 3. 新增 JSON 項目到 `data/projects.json`

```json
{
  "id": "slug",
  "name": "商家完整名稱",
  "category": "商家主類別",
  "location": "城市",
  "date": "YYYY-MM-DD",
  "score": 22,
  "dimensions": {
    "basicInfo": 20,
    "reviews": 35,
    "photos": 15,
    "keywords": 15
  },
  "tags": ["標籤1", "標籤2", "標籤3"],
  "reportUrl": "data/YYYYMMDD-slug.html",
  "mapsUrl": "https://maps.app.goo.gl/xxxxx",
  "thumbnail": ""
}
```

**重要規則：**
- `mapsUrl` 為必填，必須是有效的 Google Maps 短連結
- `id` 使用英文 slug，與檔案名稱一致
- `score` 和 `dimensions` 的值必須是數字，不是字串
- `tags` 取 3 個最具代表性的標籤
- `thumbnail` 預設為空字串

### 4. 執行 build

```bash
python3 build.py
```

確認輸出顯示正確的專案數量。

### 5. 驗證

- 確認 `index.html` 已更新
- 確認新卡片包含「查看報告」和「Maps」兩個按鈕

## 相關檔案

- `data/projects.json` — 專案資料
- `data/*.html` — 報告 HTML 檔案
- `build.py` — 建置腳本，讀取 projects.json + template.html → index.html
- `template.html` — HTML 模板
- `index.html` — 建置輸出（勿直接編輯）

## 注意事項

- `build.py` 會依 score 由低到高排序卡片
- 若使用者未提供 Maps 連結，必須主動要求
- 從報告中提取的分數要與 `.dim-score` 元素中的數字完全一致
