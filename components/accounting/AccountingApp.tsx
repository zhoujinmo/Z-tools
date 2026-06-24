"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import type { IconType } from "react-icons";
import {
  FaBriefcase,
  FaCoffee,
  FaGift,
  FaChartLine,
  FaUtensils,
  FaCar,
  FaShoppingBag,
  FaHome,
  FaGamepad,
  FaHeartbeat,
  FaTag,
  FaWallet,
  FaArrowLeft,
  FaSyncAlt,
  FaMoon,
  FaSun,
  FaPlus,
  FaMinus,
  FaMoneyBillWave,
  FaShoppingCart,
  FaFileExcel,
  FaDownload,
  FaUpload,
  FaTrash,
  FaTimes,
  FaCheck,
  FaInfoCircle,
  FaExclamationCircle,
  FaChevronLeft,
  FaChevronRight,
  FaBullseye,
  FaFileAlt,
  FaTrashAlt,
} from "react-icons/fa";
import { Doughnut, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import * as XLSX from "xlsx";
import type { AuthUser } from "@/lib/types";

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

// ===== 常量定义 =====

const STORAGE_KEY = "simple-bill-data";
const THEME_KEY = "bill-theme";
const BUDGET_KEY = "bill-budget";
const CUSTOM_CAT_KEY = "bill-custom-category";

const iconMap: Record<string, IconType> = {
  FaBriefcase,
  FaCoffee,
  FaGift,
  FaChartLine,
  FaCutlery: FaUtensils,
  FaCar,
  FaShoppingBag,
  FaHome,
  FaGamepad,
  FaHeartbeat,
  FaTag,
};

interface CategoryDef {
  name: string;
  icon: string;
  color: string;
  isCustom?: boolean;
}

const systemCategory: { income: CategoryDef[]; expense: CategoryDef[] } = {
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

// 分类颜色对应的完整 Tailwind 类名（避免动态类名被 purge）
const colorClassMap: Record<string, string> = {
  salary:
    "bg-salary/10 dark:bg-salary/20 text-salary border-salary peer-checked:border-salary peer-checked:ring-2 peer-checked:ring-salary/30",
  parttime:
    "bg-parttime/10 dark:bg-parttime/20 text-parttime border-parttime peer-checked:border-parttime peer-checked:ring-2 peer-checked:ring-parttime/30",
  redpack:
    "bg-redpack/10 dark:bg-redpack/20 text-redpack border-redpack peer-checked:border-redpack peer-checked:ring-2 peer-checked:ring-redpack/30",
  finance:
    "bg-finance/10 dark:bg-finance/20 text-finance border-finance peer-checked:border-finance peer-checked:ring-2 peer-checked:ring-finance/30",
  food:
    "bg-food/10 dark:bg-food/20 text-food border-food peer-checked:border-food peer-checked:ring-2 peer-checked:ring-food/30",
  traffic:
    "bg-traffic/10 dark:bg-traffic/20 text-traffic border-traffic peer-checked:border-traffic peer-checked:ring-2 peer-checked:ring-traffic/30",
  shop:
    "bg-shop/10 dark:bg-shop/20 text-shop border-shop peer-checked:border-shop peer-checked:ring-2 peer-checked:ring-shop/30",
  house:
    "bg-house/10 dark:bg-house/20 text-house border-house peer-checked:border-house peer-checked:ring-2 peer-checked:ring-house/30",
  entertainment:
    "bg-entertainment/10 dark:bg-entertainment/20 text-entertainment border-entertainment peer-checked:border-entertainment peer-checked:ring-2 peer-checked:ring-entertainment/30",
  medical:
    "bg-medical/10 dark:bg-medical/20 text-medical border-medical peer-checked:border-medical peer-checked:ring-2 peer-checked:ring-medical/30",
  custom:
    "bg-custom/10 dark:bg-custom/20 text-custom border-custom peer-checked:border-custom peer-checked:ring-2 peer-checked:ring-custom/30",
};

interface BillItem {
  id?: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  remark: string;
  date: string;
  time: number;
}

interface CustomCategoryStore {
  income: { name: string }[];
  expense: { name: string }[];
}

interface AccountingAppProps {
  user: AuthUser;
}

// ===== 辅助函数 =====

function getCurrentYM(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatMoney(n: number): string {
  return "¥" + Number(n).toFixed(2);
}

function parseYM(ym: string): { year: number; month: number } {
  const [y, m] = ym.split("-").map(Number);
  return { year: y, month: m };
}

function addMonth(ym: string, step: number): string {
  let { year, month } = parseYM(ym);
  month += step;
  while (month > 12) {
    year++;
    month -= 12;
  }
  while (month < 1) {
    year--;
    month += 12;
  }
  return `${year}-${String(month).padStart(2, "0")}`;
}

function getCatIconName(name: string, type: "income" | "expense", custom: CustomCategoryStore): string {
  const sys = systemCategory[type];
  const found = sys.find((c) => c.name === name);
  if (found) return found.icon;
  const isCustom = custom[type].some((c) => c.name === name);
  if (isCustom) return "FaTag";
  return "FaTag";
}

// ===== 主组件 =====

export default function AccountingApp({ user }: AccountingAppProps) {
  // 数据状态
  const [bills, setBills] = useState<BillItem[]>([]);
  const [currentYM, setCurrentYM] = useState<string>(getCurrentYM());
  const [isDark, setIsDark] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");
  const [customCategory, setCustomCategory] = useState<CustomCategoryStore>({
    income: [],
    expense: [],
  });

  // 表单状态
  const [formType, setFormType] = useState<"income" | "expense">("income");
  const [formAmount, setFormAmount] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formRemark, setFormRemark] = useState("");
  const [newCatName, setNewCatName] = useState("");

  // 同步状态
  const [currentLedgerId, setCurrentLedgerId] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncStatusVisible, setSyncStatusVisible] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // 消息
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const initializedRef = useRef(false);

  // ===== 初始化 =====

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // 加载主题
    const savedTheme = localStorage.getItem(THEME_KEY);
    const dark = savedTheme === "dark";
    setIsDark(dark);
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // 加载本地数据
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setBills(JSON.parse(raw));
      } catch {
        setBills([]);
      }
    }

    // 加载自定义分类
    const customRaw = localStorage.getItem(CUSTOM_CAT_KEY);
    if (customRaw) {
      try {
        setCustomCategory(JSON.parse(customRaw));
      } catch {
        // ignore
      }
    }

    // 加载用户数据并同步
    loadUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== 数据持久化 =====

  function saveBills(list: BillItem[]) {
    setBills(list);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  function saveCustomCategory(obj: CustomCategoryStore) {
    setCustomCategory(obj);
    localStorage.setItem(CUSTOM_CAT_KEY, JSON.stringify(obj));
  }

  function saveBudget(ym: string, num: number) {
    const budgetObj = JSON.parse(localStorage.getItem(BUDGET_KEY) || "{}");
    budgetObj[ym] = Number(num);
    localStorage.setItem(BUDGET_KEY, JSON.stringify(budgetObj));
  }

  function getBudget(ym: string): number {
    const budgetObj = JSON.parse(localStorage.getItem(BUDGET_KEY) || "{}");
    return budgetObj[ym] || 0;
  }

  function setTheme(dark: boolean) {
    setIsDark(dark);
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
  }

  function showMessage(msg: string, type: "success" | "error") {
    setMessage(msg);
    setMessageType(type);
    if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    messageTimerRef.current = setTimeout(() => setMessage(""), 3000);
  }

  // ===== 分类管理 =====

  function getAllCategory(type: "income" | "expense"): CategoryDef[] {
    const sys = [...systemCategory[type]];
    const custom = customCategory[type].map((item) => ({
      name: item.name,
      icon: "FaTag",
      color: "custom",
      isCustom: true,
    }));
    return [...sys, ...custom];
  }

  function handleAddCustomCat(type: "income" | "expense") {
    const name = newCatName.trim();
    if (!name) {
      alert("请输入分类名称");
      return;
    }
    const allNames = getAllCategory(type).map((c) => c.name);
    if (allNames.includes(name)) {
      alert("该分类名称已存在！");
      return;
    }
    const updated: CustomCategoryStore = {
      ...customCategory,
      [type]: [...customCategory[type], { name }],
    };
    saveCustomCategory(updated);
    setNewCatName("");
  }

  function handleDelCustomCat(type: "income" | "expense", name: string) {
    if (!confirm(`确定删除自定义分类「${name}」？历史账单保留，仅移除分类选项`)) return;
    const updated: CustomCategoryStore = {
      ...customCategory,
      [type]: customCategory[type].filter((item) => item.name !== name),
    };
    saveCustomCategory(updated);
  }

  // ===== 月份管理 =====

  function getAllYMList(): string[] {
    const ymSet = new Set<string>();
    bills.forEach((item) => ymSet.add(item.date.slice(0, 7)));
    const list = Array.from(ymSet).sort().reverse();
    const nowYM = getCurrentYM();
    if (!list.includes(nowYM)) list.unshift(nowYM);
    return list;
  }

  function getMonthBills(ym: string): BillItem[] {
    return bills.filter((item) => item.date.startsWith(ym));
  }

  // ===== 统计计算 =====

  function calcStats(ym: string) {
    const monthBills = getMonthBills(ym);
    let income = 0;
    let expense = 0;
    const categoryMap: Record<string, number> = {};
    getAllCategory("expense").forEach((c) => (categoryMap[c.name] = 0));

    monthBills.forEach((item) => {
      const num = Number(item.amount);
      if (item.type === "income") {
        income += num;
      } else {
        expense += num;
        if (categoryMap[item.category] !== undefined) {
          categoryMap[item.category] += num;
        }
      }
    });

    return { income, expense, balance: income - expense, categoryMap };
  }

  function calcBudgetStat(ym: string) {
    const budgetVal = getBudget(ym);
    const monthBills = getMonthBills(ym);
    let used = 0;
    monthBills.forEach((i) => {
      if (i.type === "expense") used += Number(i.amount);
    });
    return { budgetVal, used, overBudget: budgetVal > 0 && used > budgetVal };
  }

  // ===== API 请求 =====

  async function apiRequest(url: string, method: string = "GET", data: unknown = null) {
    const options: RequestInit = {
      method,
      headers: { "Content-Type": "application/json" },
    };
    if (data) {
      options.body = JSON.stringify(data);
    }
    const response = await fetch(`/api${url}`, options);
    return await response.json();
  }

  // ===== 数据同步 =====

  async function loadUserData() {
    try {
      const ledgers = await apiRequest("/ledgers", "GET");
      if (ledgers.success && ledgers.data.length > 0) {
        setCurrentLedgerId(ledgers.data[0].id);
        saveBills([]);
        setLastSyncTime(null);
        await syncPull();
      }
    } catch {
      // 加载账本列表失败
    }
  }

  async function syncPull() {
    if (!currentLedgerId) return;
    setSyncing(true);
    try {
      const result = await apiRequest("/sync/pull", "POST", {
        lastSyncTime,
        ledgerId: currentLedgerId,
      });
      if (result.success) {
        const serverBills = result.data;
        const pulledBills: BillItem[] = serverBills.map((sb: BillItem) => ({
          id: sb.id,
          type: sb.type,
          category: sb.category,
          amount: sb.amount,
          remark: sb.remark,
          date: sb.date,
          time: sb.time,
        }));

        if (!lastSyncTime) {
          saveBills(pulledBills);
        } else {
          const localBills = [...bills];
          pulledBills.forEach((serverBill) => {
            const exists = localBills.find(
              (b) => b.date === serverBill.date && b.time === serverBill.time
            );
            if (!exists) {
              localBills.push(serverBill);
            }
          });
          saveBills(localBills);
        }

        setLastSyncTime(result.syncTime);
        setSyncStatusVisible(true);
      }
    } catch {
      // 同步失败
    } finally {
      setSyncing(false);
    }
  }

  async function syncPush() {
    if (!currentLedgerId) return;
    setSyncing(true);
    try {
      const transactions = bills.map((b) => ({
        ledgerId: currentLedgerId,
        type: b.type,
        category: b.category,
        amount: b.amount,
        remark: b.remark,
        date: b.date,
        time: b.time,
      }));
      const result = await apiRequest("/sync/push", "POST", { transactions });
      if (result.success) {
        setLastSyncTime(result.syncTime);
        setSyncStatusVisible(true);
        showMessage(result.message || "同步成功", "success");
      }
    } catch {
      showMessage("同步失败，请检查网络", "error");
    } finally {
      setSyncing(false);
    }
  }

  async function handleSync() {
    await syncPull();
    await syncPush();
  }

  // ===== 表单提交 =====

  function handleTypeChange(type: "income" | "expense") {
    setFormType(type);
    const first = getAllCategory(type)[0];
    if (first) {
      setFormCategory(first.name);
    }
  }

  async function handleSaveBill(e: React.FormEvent) {
    e.preventDefault();

    if (!formAmount || Number(formAmount) <= 0) {
      alert("请输入有效的金额");
      return;
    }

    if (!formCategory) {
      alert("请选择一个分类");
      return;
    }

    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}`;
    const newItem: BillItem = {
      type: formType,
      amount: Number(formAmount),
      category: formCategory,
      remark: formRemark.trim(),
      date,
      time: now.getTime(),
    };
    const list = [...bills, newItem];
    saveBills(list);

    if (currentLedgerId) {
      try {
        await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ledgerId: currentLedgerId,
            type: formType,
            category: formCategory,
            amount: Number(formAmount),
            remark: formRemark.trim(),
            date,
            time: now.getTime(),
          }),
        });
      } catch {
        // 保存到服务器失败，将在下次同步时处理
      }
    }

    // 重置表单
    setFormAmount("");
    setFormRemark("");
    handleTypeChange("income");
  }

  async function handleDeleteBill(bill: BillItem) {
    if (!confirm("确定删除这条记录？")) return;

    const all = bills.filter(
      (i) => !(i.date === bill.date && i.time === bill.time)
    );
    saveBills(all);

    if (currentLedgerId && bill.id) {
      try {
        await apiRequest(`/transactions/${bill.id}`, "DELETE");
      } catch {
        // 删除失败，将在下次同步时处理
      }
    }
  }

  // ===== 数据管理 =====

  function exportToExcel() {
    if (bills.length === 0) {
      alert("暂无账单可导出");
      return;
    }
    const sheetData: (string | number)[][] = [["日期", "类型", "分类", "金额", "备注"]];
    bills.forEach((item) => {
      sheetData.push([
        item.date,
        item.type === "income" ? "收入" : "支出",
        item.category,
        Number(item.amount).toFixed(2),
        item.remark || "",
      ]);
    });
    const book = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(book, sheet, "账单明细");
    XLSX.writeFile(book, `账单记录_${new Date().toLocaleDateString()}.xlsx`);
  }

  function exportJsonBackup() {
    const dataStr = JSON.stringify(
      { bills, customCategory },
      null,
      2
    );
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `记账完整备份_${getCurrentYM()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJsonFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const raw = JSON.parse(e.target?.result as string);
        if (!raw.bills || !Array.isArray(raw.bills)) throw new Error("文件格式错误");
        saveBills(raw.bills);
        if (raw.customCategory) saveCustomCategory(raw.customCategory);
        alert("导入成功！账单与自定义分类已恢复");
      } catch {
        alert("导入失败，备份文件损坏");
      }
    };
    reader.readAsText(file);
  }

  function handleClearAll() {
    if (confirm("确定清空所有账单+自定义分类？数据无法恢复！")) {
      saveBills([]);
      localStorage.removeItem(BUDGET_KEY);
      localStorage.removeItem(CUSTOM_CAT_KEY);
      setCustomCategory({ income: [], expense: [] });
    }
  }

  // ===== 退出登录 =====

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    // 清除本地状态
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(BUDGET_KEY);
    localStorage.removeItem(CUSTOM_CAT_KEY);
    // 刷新页面回到认证界面
    window.location.reload();
  }

  // ===== 渲染数据 =====

  const ymList = getAllYMList();
  const stats = calcStats(currentYM);
  const budgetStat = calcBudgetStat(currentYM);
  const monthBills = getMonthBills(currentYM).sort(
    (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
  );

  const incomeCategories = getAllCategory("income");
  const expenseCategories = getAllCategory("expense");

  const isDarkMode = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  const tickColor = isDarkMode ? "#ccc" : "#333";
  const gridColor = isDarkMode ? "#333" : "#eee";

  const pieData = {
    labels: ["收入", "支出"],
    datasets: [
      {
        data: [stats.income, stats.expense],
        backgroundColor: ["#10b981", "#ef4444"],
        borderWidth: 0,
      },
    ],
  };

  const pieOptions = {
    cutout: "70%",
    plugins: { legend: { display: false } },
    maintainAspectRatio: false,
  };

  const barLabels = Object.keys(stats.categoryMap);
  const barData = {
    labels: barLabels,
    datasets: [
      {
        label: "支出金额",
        data: Object.values(stats.categoryMap),
        backgroundColor: "#3b82f6",
        borderRadius: 6,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: tickColor } },
      y: { grid: { color: gridColor }, ticks: { color: tickColor } },
    },
  };

  // ===== 渲染 =====

  return (
    <div className="bg-neutral-50 dark:bg-neutral-900 dark:text-neutral-100 min-h-screen transition-colors duration-300">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* 头部 */}
        <header className="mb-8 flex justify-between items-start">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-neutral-500 dark:text-neutral-400 hover:text-primary mb-2 transition-colors"
            >
              <FaArrowLeft />返回作品集
            </Link>
            <h1 className="text-[26px] font-semibold flex items-center gap-2">
              <FaWallet className="text-primary" />
              简记
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-1">
              收支记账·自定义分类·多月统计·跨设备同步
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="text-sm px-3 py-2 rounded-lg bg-primary/10 text-primary btn-hover flex items-center gap-1 disabled:opacity-50"
            >
              <FaSyncAlt className={syncing ? "animate-spin" : ""} />
              同步
            </button>
            <button
              onClick={() => setTheme(!isDark)}
              className="text-xl p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 btn-hover"
            >
              {isDark ? <FaSun /> : <FaMoon />}
            </button>
            <button
              onClick={handleLogout}
              className="text-sm px-3 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 btn-hover"
            >
              退出登录
            </button>
          </div>
        </header>

        {/* 同步状态 */}
        {syncStatusVisible && (
          <div className="mb-4 px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm flex items-center justify-between">
            <span className="flex items-center gap-1">
              <FaInfoCircle /> 同步状态
            </span>
            <span>
              {lastSyncTime
                ? `上次同步：${new Date(lastSyncTime).toLocaleString()}`
                : "上次同步：未知"}
            </span>
          </div>
        )}

        {/* 消息提示 */}
        {message && (
          <div
            className={`mb-4 px-4 py-2 rounded-lg text-sm flex items-center gap-2 ${
              messageType === "success"
                ? "bg-income/10 text-income"
                : "bg-expense/10 text-expense"
            }`}
          >
            {messageType === "success" ? <FaCheck /> : <FaExclamationCircle />}
            {message}
          </div>
        )}

        {/* 月份选择器 */}
        <section className="bg-white dark:bg-neutral-800 rounded-2xl p-4 card-shadow mb-6 flex items-center justify-between gap-3">
          <button
            onClick={() => setCurrentYM(addMonth(currentYM, -1))}
            className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-700 btn-hover"
          >
            <FaChevronLeft />
          </button>
          <select
            value={currentYM}
            onChange={(e) => setCurrentYM(e.target.value)}
            className="flex-1 py-2 px-3 rounded-lg input-focus"
          >
            {ymList.map((ym) => (
              <option key={ym} value={ym}>
                {ym}
              </option>
            ))}
          </select>
          <button
            onClick={() => setCurrentYM(addMonth(currentYM, 1))}
            className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-700 btn-hover"
          >
            <FaChevronRight />
          </button>
        </section>

        {/* 预算管理 */}
        <section className="bg-white dark:bg-neutral-800 rounded-2xl p-6 card-shadow mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-medium text-lg flex items-center gap-2">
              <FaBullseye className="text-warn" />
              月度预算
            </h3>
            {budgetStat.overBudget && (
              <span className="text-expense font-medium flex items-center gap-1">
                <FaExclamationCircle /> 已超预算！
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <input
              type="number"
              value={budgetInput || getBudget(currentYM) || ""}
              onChange={(e) => setBudgetInput(e.target.value)}
              placeholder="设置本月预算"
              min="0"
              step="0.01"
              className="flex-1 rounded-xl py-3 px-4 input-focus"
            />
            <button
              onClick={() => {
                saveBudget(currentYM, Number(budgetInput) || 0);
                setBudgetInput("");
              }}
              className="bg-warn text-white px-5 rounded-xl btn-hover"
            >
              保存
            </button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
            <div className="bg-neutral-50 dark:bg-neutral-700 p-3 rounded-xl">
              <span className="text-neutral-500 dark:text-neutral-400">预算总额</span>
              <p className="font-semibold text-lg mt-1">{formatMoney(budgetStat.budgetVal)}</p>
            </div>
            <div className="bg-neutral-50 dark:bg-neutral-700 p-3 rounded-xl">
              <span className="text-neutral-500 dark:text-neutral-400">已支出</span>
              <p className="font-semibold text-lg mt-1">{formatMoney(budgetStat.used)}</p>
            </div>
          </div>
        </section>

        {/* 统计与图表 */}
        <section className="bg-white dark:bg-neutral-800 rounded-2xl p-6 card-shadow mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm">当月结余</p>
              <h2 className="text-[32px] font-bold mt-1">{formatMoney(stats.balance)}</h2>
            </div>
            <div style={{ width: 110, height: 110 }}>
              <Doughnut data={pieData} options={pieOptions} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-neutral-50 dark:bg-neutral-700 rounded-xl p-4">
              <p className="text-neutral-500 dark:text-neutral-400 text-sm">当月收入</p>
              <p className="text-income text-xl font-semibold mt-1">{formatMoney(stats.income)}</p>
            </div>
            <div className="bg-neutral-50 dark:bg-neutral-700 rounded-xl p-4">
              <p className="text-neutral-500 dark:text-neutral-400 text-sm">当月支出</p>
              <p className="text-expense text-xl font-semibold mt-1">{formatMoney(stats.expense)}</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-2">支出分类统计</p>
            <div style={{ height: 160 }}>
              <Bar data={barData} options={barOptions} />
            </div>
          </div>
        </section>

        {/* 新增记录表单 */}
        <section className="bg-white dark:bg-neutral-800 rounded-2xl p-6 card-shadow mb-6">
          <h3 className="font-medium text-lg mb-4">新增记录</h3>
          <form onSubmit={handleSaveBill} className="space-y-4">
            {/* 收入/支出切换 */}
            <div className="flex gap-3">
              <label className="flex-1 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="income"
                  className="hidden peer"
                  checked={formType === "income"}
                  onChange={() => handleTypeChange("income")}
                />
                <div className="peer-checked:bg-income peer-checked:text-white bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-xl py-3 text-center btn-hover">
                  <FaPlus className="inline mr-1" />
                  收入
                </div>
              </label>
              <label className="flex-1 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="expense"
                  className="hidden peer"
                  checked={formType === "expense"}
                  onChange={() => handleTypeChange("expense")}
                />
                <div className="peer-checked:bg-expense peer-checked:text-white bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-xl py-3 text-center btn-hover">
                  <FaMinus className="inline mr-1" />
                  支出
                </div>
              </label>
            </div>

            {/* 金额 */}
            <div>
              <label className="text-sm text-neutral-600 dark:text-neutral-400 block mb-1">金额</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                placeholder="输入金额"
                required
                className="w-full border rounded-xl px-4 py-3 input-focus"
              />
            </div>

            {/* 分类选择 */}
            {formType === "income" ? (
              <div>
                <label className="text-sm text-income font-medium block mb-2">
                  <FaMoneyBillWave className="inline mr-1" />
                  收入分类
                </label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {incomeCategories.map((cat) => {
                    const Icon = iconMap[cat.icon] || FaTag;
                    return (
                      <label
                        key={cat.name}
                        className={`cat-tag cursor-pointer flex justify-between relative border-2 peer-checked:scale-[1.02] transition-all duration-200 ${colorClassMap[cat.color] || colorClassMap.custom}`}
                      >
                        <input
                          type="radio"
                          name="category"
                          value={cat.name}
                          className="hidden peer"
                          checked={formCategory === cat.name}
                          onChange={() => setFormCategory(cat.name)}
                        />
                        <span className="flex items-center gap-1">
                          <Icon />
                          {cat.name}
                        </span>
                        {cat.isCustom && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              handleDelCustomCat("income", cat.name);
                            }}
                            className="hover:text-expense"
                          >
                            <FaTimes />
                          </button>
                        )}
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full border-2 hidden peer-checked:flex items-center justify-center"
                          style={{ borderColor: "currentColor" }}
                        >
                          <FaCheck className="w-2.5 h-2.5" />
                        </div>
                      </label>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <input
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomCat("income");
                      }
                    }}
                    placeholder="添加自定义收入分类"
                    className="flex-1 rounded-lg py-2 px-3 input-focus text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddCustomCat("income")}
                    className="bg-primary text-white px-3 rounded-lg btn-hover text-sm"
                  >
                    添加
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <label className="text-sm text-expense font-medium block mb-2">
                  <FaShoppingCart className="inline mr-1" />
                  支出分类
                </label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {expenseCategories.map((cat) => {
                    const Icon = iconMap[cat.icon] || FaTag;
                    return (
                      <label
                        key={cat.name}
                        className={`cat-tag cursor-pointer flex justify-between relative border-2 peer-checked:scale-[1.02] transition-all duration-200 ${colorClassMap[cat.color] || colorClassMap.custom}`}
                      >
                        <input
                          type="radio"
                          name="category"
                          value={cat.name}
                          className="hidden peer"
                          checked={formCategory === cat.name}
                          onChange={() => setFormCategory(cat.name)}
                        />
                        <span className="flex items-center gap-1">
                          <Icon />
                          {cat.name}
                        </span>
                        {cat.isCustom && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              handleDelCustomCat("expense", cat.name);
                            }}
                            className="hover:text-expense"
                          >
                            <FaTimes />
                          </button>
                        )}
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full border-2 hidden peer-checked:flex items-center justify-center"
                          style={{ borderColor: "currentColor" }}
                        >
                          <FaCheck className="w-2.5 h-2.5" />
                        </div>
                      </label>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <input
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomCat("expense");
                      }
                    }}
                    placeholder="添加自定义支出分类"
                    className="flex-1 rounded-lg py-2 px-3 input-focus text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddCustomCat("expense")}
                    className="bg-primary text-white px-3 rounded-lg btn-hover text-sm"
                  >
                    添加
                  </button>
                </div>
              </div>
            )}

            {/* 备注 */}
            <div>
              <label className="text-sm text-neutral-600 dark:text-neutral-400 block mb-1">
                备注（选填）
              </label>
              <input
                type="text"
                value={formRemark}
                onChange={(e) => setFormRemark(e.target.value)}
                placeholder="简单备注这笔开销"
                className="w-full border rounded-xl px-4 py-3 input-focus"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-primary text-white py-3 rounded-xl font-medium btn-hover"
            >
              保存记录
            </button>
          </form>
        </section>

        {/* 数据管理按钮 */}
        <section className="bg-white dark:bg-neutral-800 rounded-2xl p-4 card-shadow mb-6 grid grid-cols-2 gap-3">
          <button
            onClick={exportToExcel}
            className="py-3 rounded-xl bg-neutral-100 dark:bg-neutral-700 btn-hover"
          >
            <FaFileExcel className="inline text-income mr-1" />
            导出Excel
          </button>
          <button
            onClick={exportJsonBackup}
            className="py-3 rounded-xl bg-neutral-100 dark:bg-neutral-700 btn-hover"
          >
            <FaDownload className="inline text-primary mr-1" />
            备份数据
          </button>
          <label className="py-3 rounded-xl bg-neutral-100 dark:bg-neutral-700 text-center cursor-pointer btn-hover block">
            <FaUpload className="inline text-warn mr-1" />
            导入备份
            <input
              type="file"
              accept=".json"
              className="hidden"
              ref={fileInputRef}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importJsonFile(f);
                e.target.value = "";
              }}
            />
          </label>
          <button
            onClick={handleClearAll}
            className="py-3 rounded-xl bg-neutral-100 dark:bg-neutral-700 btn-hover"
          >
            <FaTrash className="inline text-expense mr-1" />
            清空全部
          </button>
        </section>

        {/* 账单列表 */}
        <section className="bg-white dark:bg-neutral-800 rounded-2xl p-6 card-shadow">
          <h3 className="font-medium text-lg mb-4">账单明细</h3>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {monthBills.length === 0 ? (
              <div className="text-center py-10 text-neutral-400">
                <FaFileAlt className="text-3xl block mx-auto mb-2" />
                当月暂无账单
              </div>
            ) : (
              monthBills.map((item, idx) => {
                const iconName = getCatIconName(item.category, item.type, customCategory);
                const Icon = iconMap[iconName] || FaTag;
                const colorCls = item.type === "income" ? "text-income" : "text-expense";
                const sign = item.type === "income" ? "+" : "-";
                return (
                  <div
                    key={`${item.date}-${item.time}-${idx}`}
                    className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-700 rounded-xl p-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-600">
                        <Icon />
                      </span>
                      <div>
                        <p className="font-medium">{item.category}</p>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                          {item.date} {item.remark || "无备注"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`${colorCls} font-semibold`}>
                        {sign}
                        {formatMoney(item.amount)}
                      </span>
                      <button
                        onClick={() => handleDeleteBill(item)}
                        className="text-neutral-400 hover:text-expense btn-hover"
                      >
                        <FaTrashAlt />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
