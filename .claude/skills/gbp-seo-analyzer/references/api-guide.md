# Google Places API (New) 技術指南

## API 基本資訊

- **Base URL**：`https://places.googleapis.com/v1`
- **API Key**：存放於專案根目錄 `.env`，變數名 `GOOGLE_MAPS_API_KEY`
- **認證**：Header `X-Goog-Api-Key`
- **欄位選擇**：Header `X-Goog-FieldMask`（必填，逗號分隔，**不可有空格**）
- **語言**：request body 中帶 `"languageCode": "zh-TW"`

**讀取 API Key：**
```bash
API_KEY=$(grep GOOGLE_MAPS_API_KEY .env | cut -d '=' -f2)
```

---

## 三個核心端點

| 端點 | 方法 | 用途 | 結果上限 |
|------|------|------|----------|
| `/places:searchText` | POST | 文字搜尋商家（定位 + 關鍵字排名） | 每頁 1-20，最多 60 筆（分頁） |
| `/places/{placeId}` | GET | 單一商家完整資料 | 1 筆 |
| `/places:searchNearby` | POST | 座標 + 類型搜尋附近競品 | 1-20 筆 |

---

### 端點一：Text Search（搜尋商家 / 關鍵字排名）

```bash
curl -X POST 'https://places.googleapis.com/v1/places:searchText' \
  -H 'Content-Type: application/json' \
  -H "X-Goog-Api-Key: $API_KEY" \
  -H 'X-Goog-FieldMask: places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.primaryType,places.primaryTypeDisplayName,places.websiteUri,places.nationalPhoneNumber,places.googleMapsUri,places.location,places.businessStatus,places.photos' \
  -d '{
    "textQuery": "饗鍋物料理 台中",
    "languageCode": "zh-TW",
    "pageSize": 5
  }'
```

**Request Body 參數：**

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `textQuery` | string | ✅ | 搜尋字串（如「商家名 城市」或「地區 服務類型」） |
| `languageCode` | string | | 回傳語言，固定用 `"zh-TW"` |
| `pageSize` | int | | 每頁結果數（1-20，預設 20） |
| `pageToken` | string | | 翻頁 token（從前次回應取得） |
| `locationBias` | object | | 偏好區域（circle 或 rectangle），**不強制限制** |
| `locationRestriction` | object | | 限制區域（僅 rectangle），**結果必須在範圍內** |
| `includedType` | string | | 篩選單一類型（如 `"hot_pot_restaurant"`） |
| `rankPreference` | string | | `"RELEVANCE"`（預設）或 `"DISTANCE"` |
| `openNow` | bool | | 只回傳目前營業中的商家 |
| `minRating` | float | | 最低評分篩選（0.0-5.0，0.5 為單位） |
| `priceLevels` | array | | 價位篩選 |

**locationBias 格式（用於關鍵字排名搜尋）：**
```json
"locationBias": {
  "circle": {
    "center": {"latitude": 24.1828, "longitude": 120.6468},
    "radius": 5000.0
  }
}
```

---

### 端點二：Place Details（商家完整資料）

```bash
curl -X GET "https://places.googleapis.com/v1/places/ChIJ2_SrGtMVaTQRE3vjUP0KkbQ" \
  -H "X-Goog-Api-Key: $API_KEY" \
  -H 'X-Goog-FieldMask: id,displayName,formattedAddress,addressComponents,location,photos,types,primaryType,primaryTypeDisplayName,businessStatus,googleMapsUri,rating,userRatingCount,websiteUri,nationalPhoneNumber,internationalPhoneNumber,regularOpeningHours,priceLevel,priceRange,reviews,editorialSummary,dineIn,takeout,delivery,outdoorSeating,parkingOptions,allowsDogs,goodForChildren,goodForGroups,reservable,servesBreakfast,servesLunch,servesDinner,servesBeer,servesCocktails,servesWine,servesCoffee,servesVegetarianFood,reviewSummary'
```

**注意：Place Details 使用 GET 方法**，Place ID 直接放在 URL path 中。`languageCode` 以 query parameter 帶入：

```
https://places.googleapis.com/v1/places/{placeId}?languageCode=zh-TW
```

---

### 端點三：Nearby Search（附近競品）

```bash
curl -X POST 'https://places.googleapis.com/v1/places:searchNearby' \
  -H 'Content-Type: application/json' \
  -H "X-Goog-Api-Key: $API_KEY" \
  -H 'X-Goog-FieldMask: places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.primaryType,places.primaryTypeDisplayName,places.websiteUri,places.photos,places.location' \
  -d '{
    "includedTypes": ["hot_pot_restaurant"],
    "locationRestriction": {
      "circle": {
        "center": {"latitude": 24.1828, "longitude": 120.6468},
        "radius": 5000.0
      }
    },
    "maxResultCount": 20,
    "rankPreference": "POPULARITY",
    "languageCode": "zh-TW"
  }'
```

**Request Body 參數：**

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `locationRestriction` | object | ✅ | 搜尋範圍（circle，radius 0-50000m） |
| `includedTypes` | array | | 篩選類型（Table A，最多 50 個） |
| `excludedTypes` | array | | 排除類型 |
| `includedPrimaryTypes` | array | | 篩選主類型 |
| `maxResultCount` | int | | 結果數（1-20，預設 20） |
| `rankPreference` | string | | `"POPULARITY"`（預設）或 `"DISTANCE"` |
| `languageCode` | string | | 回傳語言 |

---

## FieldMask 分層（影響計費 SKU）

報告需要的欄位橫跨多個 SKU tier，以下是本技能使用的欄位清單：

**Pro SKU（基本資訊）：**
`id`, `displayName`, `formattedAddress`, `addressComponents`, `location`, `photos`, `types`, `primaryType`, `primaryTypeDisplayName`, `businessStatus`, `googleMapsUri`

**Enterprise SKU（營運資訊）：**
`rating`, `userRatingCount`, `websiteUri`, `nationalPhoneNumber`, `internationalPhoneNumber`, `regularOpeningHours`, `priceLevel`, `priceRange`

**Enterprise + Atmosphere SKU（評論與屬性）：**
`reviews`, `editorialSummary`, `reviewSummary`, `dineIn`, `takeout`, `delivery`, `outdoorSeating`, `parkingOptions`, `allowsDogs`, `goodForChildren`, `goodForGroups`, `reservable`, `servesBeer`, `servesCocktails`, `servesWine`, `servesCoffee`, `servesLunch`, `servesDinner`, `servesVegetarianFood`

**注意：**
- Text Search / Nearby Search 的 FieldMask 欄位需加 `places.` 前綴（如 `places.id`）
- Place Details 的 FieldMask **不需要**前綴（直接用 `id`）
- 欄位之間不可有空格

---

## 常用 Place Types（Table A）

根據商家產業選擇精確的 `includedTypes`：

| 產業 | 推薦 Type |
|------|-----------|
| 火鍋 | `hot_pot_restaurant` |
| 咖啡廳 | `cafe`, `coffee_shop` |
| 餐廳（通用） | `restaurant` |
| 燒烤 | `barbecue_restaurant`, `korean_barbecue_restaurant` |
| 甜點 | `dessert_shop`, `dessert_restaurant`, `bakery` |
| 日式料理 | `japanese_restaurant`, `ramen_restaurant`, `sushi_restaurant` |
| 韓式料理 | `korean_restaurant`, `korean_barbecue_restaurant` |
| 台灣料理 | `taiwanese_restaurant` |
| 酒吧 | `bar`, `cocktail_bar`, `wine_bar` |
| 茶館 | `tea_house` |
| 民宿/旅館 | `hotel`, `bed_and_breakfast` |
| 美容 | `beauty_salon`, `spa` |

若精確類型結果太少（< 5 家），改用更通用的父類型（如 `restaurant`）。

---

## 呼叫流程（每份報告 4+ 次）

**呼叫 1：Text Search — 定位目標商家**

```
POST /places:searchText
→ textQuery: "商家名稱 城市"
→ pageSize: 5
→ 取得：Place ID + 座標 + 基本資訊
```

從回傳結果比對名稱和地址，選出正確的目標商家。若使用者已提供 Place ID，可跳過此步直接呼叫 Place Details。

**呼叫 2：Place Details — 目標商家完整資料**

```
GET /places/{placeId}?languageCode=zh-TW
→ FieldMask: 所有 Pro + Enterprise + Atmosphere 欄位
→ 取得：名稱、地址、電話、網站、營業時間、評分、評論（最多5則）、照片（最多10張ref）、類別、屬性等
```

**Place Details 只呼叫一次** — 用完整 FieldMask 一次拿齊所有需要的欄位。

**呼叫 3：Nearby Search — 方圓 5km 同類競品**

```
POST /places:searchNearby
→ includedTypes: [目標商家的精確類型]
→ locationRestriction: circle, 目標座標, radius 5000m
→ maxResultCount: 20
→ rankPreference: "POPULARITY"
→ 取得：附近同類商家列表（名稱、評分、評論數、距離）
```

**呼叫 4+：Text Search — 核心關鍵字競爭排名**

```
POST /places:searchText
→ textQuery: "地區 + 服務類型"（如「台中西屯火鍋」）
→ locationBias: circle, 目標座標, 5km
→ pageSize: 10
→ 取得：前 10 名搜尋結果，比對 Place ID 標記目標商家排名位置
```

最多搜 10 組關鍵字。

---

## 呼叫限制規則

- **每份報告最多 18 次 API 呼叫**（8 次基礎 + 最多 10 次關鍵字）
- **不要重複呼叫**同一端點取相同資料
- **Place Details 只呼叫一次** — 一次拿齊所有需要的欄位
- 若某次呼叫失敗，最多重試 1 次
- **所有 API 呼叫使用繁體中文**（`languageCode: "zh-TW"`）
- **macOS SSL 注意**：若 curl 遇到 SSL 問題，加上 `-k` 參數

---

## 評論深度收集策略

Google Places API (New) 硬上限 **5 則**評論，無分頁、無排序。專案提供 `scripts/scrape-reviews.py` 腳本，透過 SerpAPI 突破此限制，支援四種排序、自動分頁、去重與統計。

### 使用腳本收集評論（建議方式）

```bash
# 四種排序各取最多 50 筆（去重後通常 ~120-160 則不重複）
python3 scripts/scrape-reviews.py --place-id "${PLACE_ID}" --sort all --limit 50

# 只取特定排序
python3 scripts/scrape-reviews.py --place-id "${PLACE_ID}" --sort lowest --limit 50
python3 scripts/scrape-reviews.py --place-id "${PLACE_ID}" --sort newest --limit 50
```

**排序選項：** `relevant`（最相關）| `newest`（最新）| `highest`（最高分）| `lowest`（最低分）| `all`（全部四種）

**輸出 JSON 結構：**
```json
{
  "meta": { "place_id", "sorts_requested", "limit_per_sort", "serp_api_pages_total" },
  "place_info": { "title", "rating", "total_reviews", "address" },
  "stats": {
    "total_collected",        // 去重後總數
    "avg_rating",             // 收集到的評論平均分
    "rating_distribution",    // {"1.0": 10, "2.0": 1, ...}
    "with_text_pct",          // 有文字的比例
    "with_response",          // 有商家回覆的筆數
    "response_rate_pct",      // 商家回覆率
    "local_guides",           // 在地嚮導數
    "local_guide_pct",        // 在地嚮導比例
    "with_photos"             // 有附圖數
  },
  "by_sort": { "relevant": {...}, "newest": {...}, "highest": {...}, "lowest": {...} },
  "all_unique_reviews": [...]  // 去重後的所有評論
}
```

**每則評論包含（Places API 無法取得的以 ⭐ 標記）：**
- `author` — 評論者名稱
- `rating` — 星級（1-5）
- `date` / `iso_date` — 發布時間
- `text` — 評論文字
- ⭐ `response` — 商家回覆內容
- ⭐ `response_date` — 商家回覆日期
- ⭐ `is_local_guide` — 是否為在地嚮導
- ⭐ `reviewer_reviews` — 該評論者總評論數
- ⭐ `likes` — 評論按讚數
- `photo_count` — 評論附圖數

**SerpAPI 呼叫消耗：** 第一頁固定 8 則，後續頁帶 `num=20` 取最大值。`--sort all --limit 50` 約消耗 **16 次** SerpAPI 搜尋（4 頁 × 4 排序），可取得約 **160+ 則不重複評論**。

### 評論收集與 Places API 的搭配

```
Step 1: Places API Place Details → 取得 rating, userRatingCount, reviewSummary（基礎統計）
Step 2: scripts/scrape-reviews.py → 取得大量評論原文 + 商家回覆 + 在地嚮導等深度資料
Step 3: web_search → 跨平台評論（iFoodie、OpenRice 等，見下方補充資料來源）
```

在報告中標注「基於 N 則評論分析」。若 SerpAPI 不可用（無 key 或額度用完），退回使用 Places API 5 則評論 + web_search 補充。

### 評論分析維度（8 項）

收集評論後，依以下 8 個維度進行分析：

1. **評論數量等級**：極少 <20 / 偏少 20-50 / 中等 50-150 / 豐富 150-500 / 非常豐富 >500
   - ⚠️ 若 <20 則，強調「評論需超過 20-30 則才會開始在搜尋中出現」
   - 數量的影響力大於星級（100 則五星 < 10,000 則四星）

2. **星級分布**：統計 1-5 星各佔比（SerpAPI 從實際評論統計；僅 API 則用 `rating` + `userRatingCount` 推估）

3. **最高分評論分析**（`ratingHigh`）：提取讚美面向（服務、產品、環境、CP值）、識別行銷金句、正面關鍵字貢獻排名

4. **最低分評論分析**（`ratingLow`）：歸類負面主題、分析結構性問題、台灣消費者傾向從負評判斷 → 負評處理品質直接影響轉換

5. **最新評論趨勢**（`newestFirst`）：近期評分趨勢（上升/持平/下降）、突發負評事件、評論頻率（每月幾則）

6. **商家回覆分析**（SerpAPI `response` 欄位）：回覆率、回覆速度、回覆品質（千篇一律？針對問題？融入關鍵字？）。若無 SerpAPI 則標注「需 SerpAPI」，不列入評分

7. **評論關鍵字分析**：高頻正面/負面詞、評論 = 「外部文章」+「內部內容」雙重 SEO 價值、識別缺失關鍵字

8. **在地嚮導比例**（`local_guide` 欄位）：四級以上評論權重較高，統計佔比

**評論行動建議應包含：** 正確的邀請方式（壓克力看板、口頭詢問）及禁止事項（不可利誘）、優先回覆最相關 → 最低分、針對重複負評提具體方案、鼓勵顧客評論中提及特定關鍵字的話術

### 沒有 SERP_API_KEY 時的替代方案

直接使用 SerpAPI curl 呼叫（不用腳本）：

```bash
SERP_KEY=$(grep SERP_API_KEY .env | cut -d '=' -f2)
curl -s "https://serpapi.com/search.json?engine=google_maps_reviews&place_id=${PLACE_ID}&sort_by=ratingLow&hl=zh-TW&api_key=${SERP_KEY}"
```

或退回 Places API 5 則 + 加大 web_search 力度。

---

## 補充資料來源（免費，不耗 Google API）

在 API 取得核心資料後，用 `web_search` 補充：

```
web_search("商家名稱 城市")                → 尋找官網、社群媒體
web_search("商家名稱 評論 推薦")            → 第三方評論（iFoodie、OpenRice 等）
web_search("商家名稱 instagram facebook")  → 社群經營狀況
```

這些搜尋用來：

- 確認 NAP 在不同平台的一致性（特別注意搬遷過的商家）
- 了解線上存在感（部落客食記、社群媒體）
- 發現未連結到 Google 商家檔案的資源

---

## 資料可信度分層標示

報告中每個 finding 必須標注資料來源：

| 標籤         | 含義                      | 使用時機                                   |
| ------------ | ------------------------- | ------------------------------------------ |
| `已驗證`   | Places API 回傳的真實數據 | 評分、評論數、類別、電話、網站、營業時間等 |
| `交叉比對` | 多平台比對結果            | NAP 一致性、社群連結                       |

**原則：報告只呈現可驗證的項目。** 無法從外部驗證的項目（Google 貼文、後台成效數據、產品目錄、Logo/封面照）直接跳過，不列入報告。
