import type { TransactionType } from "@/lib/types";

export interface Category {
  name: string;
  icon: string;
  color: string;
  isCustom?: boolean;
}

export const systemCategory: Record<TransactionType, Category[]> = {
  income: [
    { name: "工资", icon: "FaBriefcase", color: "salary" },
    { name: "兼职", icon: "FaCoffee", color: "parttime" },
    { name: "红包礼金", icon: "FaGift", color: "redpack" },
    { name: "理财收益", icon: "FaChartLine", color: "finance" },
  ],
  expense: [
    { name: "餐饮美食", icon: "FaCutlery", color: "food" },
    { name: "交通出行", icon: "FaCar", color: "traffic" },
    { name: "购物消费", icon: "FaShoppingBag", color: "shop" },
    { name: "住房房租", icon: "FaHome", color: "house" },
    { name: "休闲娱乐", icon: "FaGamepad", color: "entertainment" },
    { name: "医疗健康", icon: "FaHeartbeat", color: "medical" },
  ],
};

export function getAllCategory(
  type: TransactionType,
  custom: { income: Array<{ name: string }>; expense: Array<{ name: string }> }
): Category[] {
  const sys = [...systemCategory[type]];
  const customCats = custom[type].map((item) => ({
    name: item.name,
    icon: "FaTag",
    color: "custom",
    isCustom: true,
  }));
  return [...sys, ...customCats];
}

export function formatMoney(n: number): string {
  return "¥" + Number(n).toFixed(2);
}

export function getCurrentYM(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function addMonth(ym: string, step: number): string {
  const [year, month] = ym.split("-").map(Number);
  let y = year;
  let m = month + step;
  while (m > 12) {
    y++;
    m -= 12;
  }
  while (m < 1) {
    y--;
    m += 12;
  }
  return `${y}-${String(m).padStart(2, "0")}`;
}

// localStorage keys
export const STORAGE_KEY = "simple-bill-data";
export const THEME_KEY = "bill-theme";
export const BUDGET_KEY = "bill-budget";
export const CUSTOM_CAT_KEY = "bill-custom-category";

export interface Bill {
  id?: string;
  type: TransactionType;
  category: string;
  amount: number;
  remark: string;
  date: string;
  time: number;
}
