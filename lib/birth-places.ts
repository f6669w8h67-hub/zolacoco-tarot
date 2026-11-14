// Birth places for 探索妳的星盤: our own list (no outside place-search service, ChatGPT review B1).
// City centres to two decimals (about 1 km), each with its IANA time zone, so past daylight-saving
// rules apply. A visitor not on the list picks the nearest city: a few dozen kilometres moves the
// Ascendant by well under a degree.
export type BirthPlace = { id: string; name: string; group: string; latitude: number; longitude: number; timeZone: string };

const TW = "Asia/Taipei";

export const BIRTH_PLACES: BirthPlace[] = [
  { id: "tw-taipei", name: "台北市", group: "台灣", latitude: 25.04, longitude: 121.56, timeZone: TW },
  { id: "tw-newtaipei", name: "新北市（板橋）", group: "台灣", latitude: 25.01, longitude: 121.46, timeZone: TW },
  { id: "tw-keelung", name: "基隆市", group: "台灣", latitude: 25.13, longitude: 121.74, timeZone: TW },
  { id: "tw-taoyuan", name: "桃園市", group: "台灣", latitude: 24.99, longitude: 121.30, timeZone: TW },
  { id: "tw-hsinchu-city", name: "新竹市", group: "台灣", latitude: 24.80, longitude: 120.97, timeZone: TW },
  { id: "tw-hsinchu-county", name: "新竹縣（竹北）", group: "台灣", latitude: 24.84, longitude: 121.01, timeZone: TW },
  { id: "tw-miaoli", name: "苗栗縣（苗栗市）", group: "台灣", latitude: 24.56, longitude: 120.82, timeZone: TW },
  { id: "tw-taichung", name: "台中市", group: "台灣", latitude: 24.15, longitude: 120.67, timeZone: TW },
  { id: "tw-changhua", name: "彰化縣（彰化市）", group: "台灣", latitude: 24.08, longitude: 120.54, timeZone: TW },
  { id: "tw-nantou", name: "南投縣（南投市）", group: "台灣", latitude: 23.91, longitude: 120.68, timeZone: TW },
  { id: "tw-yunlin", name: "雲林縣（斗六）", group: "台灣", latitude: 23.71, longitude: 120.54, timeZone: TW },
  { id: "tw-chiayi-city", name: "嘉義市", group: "台灣", latitude: 23.48, longitude: 120.45, timeZone: TW },
  { id: "tw-chiayi-county", name: "嘉義縣（太保）", group: "台灣", latitude: 23.46, longitude: 120.33, timeZone: TW },
  { id: "tw-tainan", name: "台南市", group: "台灣", latitude: 23.00, longitude: 120.23, timeZone: TW },
  { id: "tw-kaohsiung", name: "高雄市", group: "台灣", latitude: 22.63, longitude: 120.30, timeZone: TW },
  { id: "tw-pingtung", name: "屏東縣（屏東市）", group: "台灣", latitude: 22.67, longitude: 120.49, timeZone: TW },
  { id: "tw-yilan", name: "宜蘭縣（宜蘭市）", group: "台灣", latitude: 24.75, longitude: 121.75, timeZone: TW },
  { id: "tw-hualien", name: "花蓮縣（花蓮市）", group: "台灣", latitude: 23.99, longitude: 121.60, timeZone: TW },
  { id: "tw-taitung", name: "台東縣（台東市）", group: "台灣", latitude: 22.76, longitude: 121.14, timeZone: TW },
  { id: "tw-penghu", name: "澎湖縣（馬公）", group: "台灣", latitude: 23.57, longitude: 119.58, timeZone: TW },
  { id: "tw-kinmen", name: "金門縣（金城）", group: "台灣", latitude: 24.43, longitude: 118.32, timeZone: TW },
  { id: "tw-lienchiang", name: "連江縣（馬祖南竿）", group: "台灣", latitude: 26.16, longitude: 119.95, timeZone: TW },

  { id: "hk", name: "香港", group: "港澳", latitude: 22.32, longitude: 114.17, timeZone: "Asia/Hong_Kong" },
  { id: "mo", name: "澳門", group: "港澳", latitude: 22.20, longitude: 113.54, timeZone: "Asia/Macau" },

  { id: "cn-beijing", name: "北京", group: "中國大陸", latitude: 39.90, longitude: 116.41, timeZone: "Asia/Shanghai" },
  { id: "cn-shanghai", name: "上海", group: "中國大陸", latitude: 31.23, longitude: 121.47, timeZone: "Asia/Shanghai" },
  { id: "cn-guangzhou", name: "廣州", group: "中國大陸", latitude: 23.13, longitude: 113.26, timeZone: "Asia/Shanghai" },
  { id: "cn-shenzhen", name: "深圳", group: "中國大陸", latitude: 22.54, longitude: 114.06, timeZone: "Asia/Shanghai" },
  { id: "cn-xiamen", name: "廈門", group: "中國大陸", latitude: 24.48, longitude: 118.09, timeZone: "Asia/Shanghai" },
  { id: "cn-fuzhou", name: "福州", group: "中國大陸", latitude: 26.07, longitude: 119.30, timeZone: "Asia/Shanghai" },
  { id: "cn-hangzhou", name: "杭州", group: "中國大陸", latitude: 30.27, longitude: 120.16, timeZone: "Asia/Shanghai" },
  { id: "cn-nanjing", name: "南京", group: "中國大陸", latitude: 32.06, longitude: 118.80, timeZone: "Asia/Shanghai" },
  { id: "cn-tianjin", name: "天津", group: "中國大陸", latitude: 39.34, longitude: 117.36, timeZone: "Asia/Shanghai" },
  { id: "cn-wuhan", name: "武漢", group: "中國大陸", latitude: 30.59, longitude: 114.31, timeZone: "Asia/Shanghai" },
  { id: "cn-chengdu", name: "成都", group: "中國大陸", latitude: 30.57, longitude: 104.07, timeZone: "Asia/Shanghai" },
  { id: "cn-chongqing", name: "重慶", group: "中國大陸", latitude: 29.56, longitude: 106.55, timeZone: "Asia/Shanghai" },
  { id: "cn-xian", name: "西安", group: "中國大陸", latitude: 34.34, longitude: 108.94, timeZone: "Asia/Shanghai" },

  { id: "jp-tokyo", name: "東京", group: "日本、韓國", latitude: 35.68, longitude: 139.65, timeZone: "Asia/Tokyo" },
  { id: "jp-osaka", name: "大阪", group: "日本、韓國", latitude: 34.69, longitude: 135.50, timeZone: "Asia/Tokyo" },
  { id: "jp-kyoto", name: "京都", group: "日本、韓國", latitude: 35.01, longitude: 135.77, timeZone: "Asia/Tokyo" },
  { id: "jp-nagoya", name: "名古屋", group: "日本、韓國", latitude: 35.18, longitude: 136.91, timeZone: "Asia/Tokyo" },
  { id: "jp-fukuoka", name: "福岡", group: "日本、韓國", latitude: 33.59, longitude: 130.40, timeZone: "Asia/Tokyo" },
  { id: "jp-sapporo", name: "札幌", group: "日本、韓國", latitude: 43.06, longitude: 141.35, timeZone: "Asia/Tokyo" },
  { id: "jp-naha", name: "沖繩（那霸）", group: "日本、韓國", latitude: 26.21, longitude: 127.68, timeZone: "Asia/Tokyo" },
  { id: "kr-seoul", name: "首爾", group: "日本、韓國", latitude: 37.57, longitude: 126.98, timeZone: "Asia/Seoul" },
  { id: "kr-busan", name: "釜山", group: "日本、韓國", latitude: 35.18, longitude: 129.08, timeZone: "Asia/Seoul" },

  { id: "sg", name: "新加坡", group: "東南亞", latitude: 1.35, longitude: 103.82, timeZone: "Asia/Singapore" },
  { id: "my-kl", name: "吉隆坡", group: "東南亞", latitude: 3.14, longitude: 101.69, timeZone: "Asia/Kuala_Lumpur" },
  { id: "my-penang", name: "檳城（喬治市）", group: "東南亞", latitude: 5.41, longitude: 100.33, timeZone: "Asia/Kuala_Lumpur" },
  { id: "my-jb", name: "新山", group: "東南亞", latitude: 1.49, longitude: 103.74, timeZone: "Asia/Kuala_Lumpur" },
  { id: "th-bangkok", name: "曼谷", group: "東南亞", latitude: 13.76, longitude: 100.50, timeZone: "Asia/Bangkok" },
  { id: "vn-hcmc", name: "胡志明市", group: "東南亞", latitude: 10.82, longitude: 106.63, timeZone: "Asia/Ho_Chi_Minh" },
  { id: "ph-manila", name: "馬尼拉", group: "東南亞", latitude: 14.60, longitude: 120.98, timeZone: "Asia/Manila" },
  { id: "id-jakarta", name: "雅加達", group: "東南亞", latitude: -6.21, longitude: 106.85, timeZone: "Asia/Jakarta" },

  { id: "us-la", name: "洛杉磯", group: "美國、加拿大", latitude: 34.05, longitude: -118.24, timeZone: "America/Los_Angeles" },
  { id: "us-sf", name: "舊金山", group: "美國、加拿大", latitude: 37.77, longitude: -122.42, timeZone: "America/Los_Angeles" },
  { id: "us-seattle", name: "西雅圖", group: "美國、加拿大", latitude: 47.61, longitude: -122.33, timeZone: "America/Los_Angeles" },
  { id: "us-honolulu", name: "檀香山", group: "美國、加拿大", latitude: 21.31, longitude: -157.86, timeZone: "Pacific/Honolulu" },
  { id: "us-houston", name: "休士頓", group: "美國、加拿大", latitude: 29.76, longitude: -95.37, timeZone: "America/Chicago" },
  { id: "us-chicago", name: "芝加哥", group: "美國、加拿大", latitude: 41.88, longitude: -87.63, timeZone: "America/Chicago" },
  { id: "us-nyc", name: "紐約", group: "美國、加拿大", latitude: 40.71, longitude: -74.01, timeZone: "America/New_York" },
  { id: "us-boston", name: "波士頓", group: "美國、加拿大", latitude: 42.36, longitude: -71.06, timeZone: "America/New_York" },
  { id: "ca-vancouver", name: "溫哥華", group: "美國、加拿大", latitude: 49.28, longitude: -123.12, timeZone: "America/Vancouver" },
  { id: "ca-toronto", name: "多倫多", group: "美國、加拿大", latitude: 43.65, longitude: -79.38, timeZone: "America/Toronto" },

  { id: "uk-london", name: "倫敦", group: "歐洲", latitude: 51.51, longitude: -0.13, timeZone: "Europe/London" },
  { id: "fr-paris", name: "巴黎", group: "歐洲", latitude: 48.86, longitude: 2.35, timeZone: "Europe/Paris" },
  { id: "de-berlin", name: "柏林", group: "歐洲", latitude: 52.52, longitude: 13.40, timeZone: "Europe/Berlin" },
  { id: "nl-amsterdam", name: "阿姆斯特丹", group: "歐洲", latitude: 52.37, longitude: 4.90, timeZone: "Europe/Amsterdam" },
  { id: "ch-zurich", name: "蘇黎世", group: "歐洲", latitude: 47.38, longitude: 8.54, timeZone: "Europe/Zurich" },
  { id: "at-vienna", name: "維也納", group: "歐洲", latitude: 48.21, longitude: 16.37, timeZone: "Europe/Vienna" },
  { id: "it-rome", name: "羅馬", group: "歐洲", latitude: 41.90, longitude: 12.50, timeZone: "Europe/Rome" },
  { id: "es-madrid", name: "馬德里", group: "歐洲", latitude: 40.42, longitude: -3.70, timeZone: "Europe/Madrid" },

  { id: "au-sydney", name: "雪梨", group: "澳洲、紐西蘭", latitude: -33.87, longitude: 151.21, timeZone: "Australia/Sydney" },
  { id: "au-melbourne", name: "墨爾本", group: "澳洲、紐西蘭", latitude: -37.81, longitude: 144.96, timeZone: "Australia/Melbourne" },
  { id: "au-brisbane", name: "布里斯本", group: "澳洲、紐西蘭", latitude: -27.47, longitude: 153.03, timeZone: "Australia/Brisbane" },
  { id: "au-perth", name: "伯斯", group: "澳洲、紐西蘭", latitude: -31.95, longitude: 115.86, timeZone: "Australia/Perth" },
  { id: "nz-auckland", name: "奧克蘭", group: "澳洲、紐西蘭", latitude: -36.85, longitude: 174.76, timeZone: "Pacific/Auckland" },
];

export const PLACE_GROUPS = [...new Set(BIRTH_PLACES.map((place) => place.group))];

export function placeById(id: string) {
  return BIRTH_PLACES.find((place) => place.id === id) ?? null;
}
