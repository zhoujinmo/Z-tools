"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  FaArrowLeft,
  FaSearch,
  FaMapMarkerAlt,
  FaExclamationCircle,
  FaTint,
  FaWind,
  FaCompass,
  FaEye,
} from "react-icons/fa";
import {
  cityLocationIds,
  supportedCities,
  getWeatherIcon,
  getDayName,
  findNearestCity,
} from "@/lib/weather-data";

interface CurrentWeather {
  temp: string;
  text: string;
  icon: string;
  humidity: string;
  windSpeed: string;
  windDir: string;
  pressure: string;
  visibility: string;
}

interface ForecastDay {
  fxDate: string;
  tempMax: string;
  tempMin: string;
  iconDay: string;
  textDay: string;
}

interface WeatherData {
  now: CurrentWeather;
  forecast: ForecastDay[];
  cityDisplayName: string;
}

export default function WeatherPage() {
  const [searchValue, setSearchValue] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("");
  const [error, setError] = useState<{ message: string; details?: string } | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // 加载搜索历史
  useEffect(() => {
    const stored = localStorage.getItem("weather_search_history");
    if (stored) {
      setHistory(JSON.parse(stored).slice(0, 5));
    }
    // 默认加载北京天气
    fetchWeather("北京");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 点击外部关闭建议
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  // 通过服务端代理调用和风天气 API
  async function callWeatherApi(path: string, location: string) {
    const url = `/api/weather?path=${encodeURIComponent(path)}&location=${encodeURIComponent(location)}`;
    const res = await fetch(url);
    const data = await res.json();

    // Console 输出完整 API 响应信息（用于调试）
    console.group(`🌤️ [天气API] ${path}`);
    console.log(`📡 请求URL:`, url);
    console.log(`📊 HTTP状态码:`, res.status, `(${res.statusText})`);
    console.log(`📦 响应数据:`, data);
    console.groupEnd();

    if (!res.ok) {
      throw new Error(`API 请求失败: HTTP ${res.status}`);
    }
    return data;
  }

  async function searchCity(city: string) {
    const data = await callWeatherApi("/v7/city/search", city);
    if (data.code !== "200" || !data.location || data.location.length === 0) {
      return null;
    }
    return { id: data.location[0].id, name: data.location[0].name };
  }

  async function fetchWeatherHefeng(city: string): Promise<WeatherData> {
    const locationId = cityLocationIds[city];
    let displayName = city;

    if (!locationId) {
      setLoadingStatus("正在搜索城市...");
      const searchResult = await searchCity(city);
      if (!searchResult) {
        throw new Error(`未找到城市 "${city}"，请尝试其他城市名称`);
      }
      displayName = searchResult.name;
    }

    const id = locationId || (await searchCity(city))?.id;
    if (!id) throw new Error("无法获取城市 ID");

    setLoadingStatus("正在获取实时天气...");
    const nowData = await callWeatherApi("/v7/weather/now", id);
    if (nowData.code !== "200") throw new Error("获取实时天气失败");

    setLoadingStatus("正在获取天气预报...");
    const forecastData = await callWeatherApi("/v7/weather/7d", id);
    if (forecastData.code !== "200") throw new Error("获取天气预报失败");

    return {
      now: nowData.now,
      forecast: forecastData.daily,
      cityDisplayName: displayName,
    };
  }

  const fetchWeather = useCallback(async (city: string) => {
    setLoading(true);
    setError(null);
    setWeather(null);

    try {
      if (!navigator.onLine) {
        throw new Error("网络连接不可用，请检查网络设置");
      }
      setLoadingStatus("正在连接天气服务器...");
      const data = await fetchWeatherHefeng(city);
      setWeather(data);
      addToHistory(city);
    } catch (err) {
      const errorMessages: Record<string, string> = {
        "Failed to fetch": "网络请求失败，请检查网络连接",
        NetworkError: "网络连接失败，请检查网络设置",
        "Not allowed": "地理位置权限被拒绝",
      };
      const message =
        errorMessages[(err as Error).message] || (err as Error).message || "未知错误";
      setError({ message, details: (err as Error).message });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addToHistory(city: string) {
    const stored = localStorage.getItem("weather_search_history");
    let list: string[] = stored ? JSON.parse(stored) : [];
    list = list.filter((c) => c !== city);
    list.unshift(city);
    list = list.slice(0, 10);
    localStorage.setItem("weather_search_history", JSON.stringify(list));
    setHistory(list.slice(0, 5));
  }

  function handleSearchInput(value: string) {
    setSearchValue(value);
    if (!value.trim()) {
      setShowSuggestions(false);
      return;
    }
    const filtered = supportedCities.filter((city) =>
      city.toLowerCase().includes(value.toLowerCase())
    );
    setSuggestions(filtered.slice(0, 6));
    setShowSuggestions(true);
  }

  function handleSearch() {
    const city = searchValue.trim();
    if (city) {
      setShowSuggestions(false);
      fetchWeather(city);
    }
  }

  function handleSuggestionClick(city: string) {
    setSearchValue(city);
    setShowSuggestions(false);
    fetchWeather(city);
  }

  async function getLocationWeather() {
    if (!navigator.geolocation) {
      alert("您的浏览器不支持地理定位功能，请手动输入城市查询天气");
      return;
    }

    setLoading(true);
    setLoadingStatus("正在请求定位权限...");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          setLoadingStatus("正在获取位置信息...");
          console.log(`📍 获取到位置: 纬度 ${latitude.toFixed(4)}, 经度 ${longitude.toFixed(4)}`);

          // 先尝试 API 反向地理编码
          let city: string | null = null;
          try {
            const data = await callWeatherApi(
              "/v7/city/lookup",
              `${latitude},${longitude}`
            );
            if (data.code === "200" && data.location?.length > 0) {
              city = data.location[0].name;
            }
          } catch {
            console.warn("⚠️ API 反向地理编码失败，使用预设城市列表匹配");
          }

          // API 失败时降级使用预设城市列表
          if (!city) {
            city = findNearestCity(latitude, longitude);
          }

          if (city) {
            setLoadingStatus(`正在获取 ${city} 的天气...`);
            setSearchValue(city);
            await fetchWeather(city);
          } else {
            throw new Error("无法根据当前位置获取城市信息");
          }
        } catch (err) {
          setLoading(false);
          alert("根据位置获取天气失败，请手动输入城市查询");
          fetchWeather("北京");
        }
      },
      (err) => {
        setLoading(false);
        const errorMessages: Record<number, string> = {
          1: "定位权限被拒绝，请在浏览器设置中允许定位权限",
          2: "无法获取位置信息",
          3: "定位请求超时",
        };
        alert(errorMessages[err.code] || "定位失败，请手动输入城市查询");
        fetchWeather("北京");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  function formatDate() {
    const now = new Date();
    return now.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });
  }

  return (
    <div className="min-h-screen py-8 px-4 bg-gradient-to-br from-indigo-500 to-purple-700">
      <div className="max-w-4xl mx-auto">
        {/* 头部 */}
        <header className="text-center text-white mb-8 fade-in">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
          >
            <FaArrowLeft className="w-5 h-5" />
            返回作品集
          </Link>
          <h1 className="text-4xl font-bold mb-2">天气查询</h1>
          <p className="text-white/80">实时获取全球天气信息</p>
        </header>

        {/* 搜索栏 */}
        <div className="bg-white/95 backdrop-blur rounded-[20px] p-6 mb-6 shadow-lg fade-in">
          <div className="relative">
            <input
              type="text"
              value={searchValue}
              onChange={(e) => handleSearchInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              className="w-full px-6 py-4 text-lg rounded-full border-2 border-gray-200 focus:border-indigo-500 focus:outline-none focus:ring-3 focus:ring-indigo-500/30 transition-colors"
              placeholder="输入任意中国城市名称，如：北京、上海、广州、成都..."
            />
            <button
              onClick={getLocationWeather}
              className="absolute right-20 top-1/2 -translate-y-1/2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-3 rounded-full font-medium hover:shadow-lg transition-all hover:scale-105"
              title="使用当前位置"
            >
              <FaMapMarkerAlt className="w-5 h-5" />
            </button>
            <button
              onClick={handleSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-6 py-3 rounded-full font-medium hover:shadow-lg transition-all hover:scale-105"
            >
              搜索
            </button>
          </div>

          {/* 搜索建议 */}
          {showSuggestions && (
            <div
              ref={suggestionsRef}
              className="absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-xl z-10 max-h-60 overflow-y-auto"
            >
              {suggestions.length === 0 ? (
                <div className="px-4 py-3 text-gray-500 flex items-center gap-2">
                  <FaSearch className="w-4 h-4 text-gray-400" />
                  尝试搜索任意中国城市...
                </div>
              ) : (
                suggestions.map((city) => (
                  <div
                    key={city}
                    onClick={() => handleSuggestionClick(city)}
                    className="px-4 py-3 cursor-pointer hover:bg-gray-100 flex items-center gap-2"
                  >
                    <FaMapMarkerAlt className="w-4 h-4 text-gray-400" />
                    {city}
                  </div>
                ))
              )}
            </div>
          )}

          {/* 搜索历史 */}
          {history.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 items-center">
              <span className="text-sm text-gray-500">历史记录:</span>
              {history.map((city) => (
                <span
                  key={city}
                  onClick={() => {
                    setSearchValue(city);
                    fetchWeather(city);
                  }}
                  className="px-3 py-1 bg-gray-100 rounded-full text-sm cursor-pointer text-gray-600 hover:bg-indigo-500 hover:text-white transition-all"
                >
                  {city}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 加载状态 */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 text-white">
            <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mb-4" />
            <p className="text-lg">正在获取天气数据...</p>
            <p className="text-white/60 text-sm mt-2">{loadingStatus}</p>
          </div>
        )}

        {/* 错误状态 */}
        {error && (
          <div className="bg-white/95 backdrop-blur rounded-[20px] p-6 mb-6 shadow-lg border-l-4 border-red-500">
            <div className="flex items-center gap-3 mb-4">
              <FaExclamationCircle className="w-6 h-6 text-red-500" />
              <span>{error.message}</span>
            </div>
            {error.details && error.details !== error.message && (
              <div className="text-sm text-gray-500 mb-4">
                详细信息: {error.details}
              </div>
            )}
            <button
              onClick={() => fetchWeather(searchValue.trim() || "北京")}
              className="bg-indigo-500 text-white px-4 py-2 rounded-full text-sm hover:bg-indigo-600 transition-all hover:scale-105"
            >
              重试
            </button>
          </div>
        )}

        {/* 天气内容 */}
        {weather && !loading && (
          <>
            <div className="bg-white/95 backdrop-blur rounded-[20px] p-8 mb-6 shadow-lg fade-in">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="text-center md:text-left">
                  <h2 className="text-3xl font-bold text-gray-800 mb-2">
                    {weather.cityDisplayName}
                  </h2>
                  <p className="text-gray-500">{formatDate()}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-6xl text-indigo-500" style={{ animation: "float 3s ease-in-out infinite" }}>
                    {getWeatherIcon(weather.now.icon)}
                  </div>
                  <div>
                    <span className="text-6xl font-bold text-gray-800">
                      {weather.now.temp}
                    </span>
                    <span className="text-3xl text-gray-500">°C</span>
                  </div>
                </div>
              </div>

              <div className="text-xl text-gray-600 text-center md:text-left mt-4 mb-6">
                {weather.now.text}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <FaTint className="mx-auto mb-2 text-blue-500 w-5 h-5" />
                  <p className="text-sm text-gray-500">湿度</p>
                  <p className="text-lg font-semibold text-gray-800">
                    {weather.now.humidity}%
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <FaWind className="mx-auto mb-2 text-green-500 w-5 h-5" />
                  <p className="text-sm text-gray-500">风速</p>
                  <p className="text-lg font-semibold text-gray-800">
                    {weather.now.windSpeed} {weather.now.windDir}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <FaCompass className="mx-auto mb-2 text-orange-500 w-5 h-5" />
                  <p className="text-sm text-gray-500">气压</p>
                  <p className="text-lg font-semibold text-gray-800">
                    {weather.now.pressure} hPa
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <FaEye className="mx-auto mb-2 text-purple-500 w-5 h-5" />
                  <p className="text-sm text-gray-500">能见度</p>
                  <p className="text-lg font-semibold text-gray-800">
                    {weather.now.visibility || "10"} km
                  </p>
                </div>
              </div>
            </div>

            {/* 7天预报 */}
            <div className="bg-white/95 backdrop-blur rounded-[20px] p-6 shadow-lg fade-in">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                未来7天天气预报
              </h3>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {weather.forecast.slice(0, 7).map((day) => (
                  <div
                    key={day.fxDate}
                    className="flex-shrink-0 bg-gray-50 rounded-xl p-4 text-center min-w-[80px] transition-all hover:-translate-y-1 hover:shadow-lg"
                  >
                    <p className="text-sm font-medium text-gray-600">
                      {getDayName(day.fxDate)}
                    </p>
                    <div className="text-3xl my-2">
                      {getWeatherIcon(day.iconDay)}
                    </div>
                    <p className="text-sm">
                      <span className="font-semibold text-gray-800">
                        {day.tempMax}°
                      </span>
                      <span className="text-gray-400 ml-1">{day.tempMin}°</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <footer className="text-center text-white/60 mt-8 text-sm">
          <p>
            支持全国300+城市天气查询 | 可搜索任意中国城市 | 数据来源: 和风天气 API
          </p>
        </footer>
      </div>

      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
      `}</style>
    </div>
  );
}
