export type Cafe = {
  id: number;
  name: string;
  area: string;
  walk: string;
  rating: number;
  reviews: number;
  price: string;
  tags: string[];
  color: string;
  coordinates: [number, number];
  hours: string;
};

export const cafes: Cafe[] = [
  { id: 1, name: "Kissa Common", area: "清澄白河", walk: "駅から徒歩3分", rating: 4.8, reviews: 126, price: "¥600〜", tags: ["電源あり", "高速Wi-Fi", "静か"], color: "#d9ad7c", coordinates: [35.6819, 139.8005], hours: "8:00–20:00" },
  { id: 2, name: "WOODWORK Coffee", area: "蔵前", walk: "駅から徒歩5分", rating: 4.6, reviews: 89, price: "¥550〜", tags: ["電源あり", "Wi-Fi", "長居OK"], color: "#647d62", coordinates: [35.702, 139.7908], hours: "9:00–19:00" },
  { id: 3, name: "Nui. Lounge", area: "浅草橋", walk: "駅から徒歩7分", rating: 4.5, reviews: 214, price: "¥500〜", tags: ["Wi-Fi", "開放的", "夜まで営業"], color: "#bf765e", coordinates: [35.7041, 139.795], hours: "10:00–23:00" },
];
