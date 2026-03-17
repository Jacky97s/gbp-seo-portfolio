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

## 補充資料來源（免費，不耗 API）

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
