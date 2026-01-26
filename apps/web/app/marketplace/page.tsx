"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { SiBitcoin } from "react-icons/si";
import { SiTether } from "react-icons/si";
import {
  createChart,
  CrosshairMode,
  IChartApi,
  CandlestickData,
  UTCTimestamp,
  CandlestickSeries,
} from "lightweight-charts";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useGetCandles } from "../hooks/useCandles";
import { Candle } from "../types/candle.type";
import { useGetBalances } from "../hooks/useBalance";
import IntervalSelector from "../components/IntervalSelector";
import LeftSideBar from "../components/LeftSideBar";
import RightSideBar from "../components/RightSideBar";
import OrdersSection from "../components/OrdersSection";
import DepositModal from "../components/DepositModal";

const Marketplace = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ReturnType<IChartApi["addSeries"]> | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [selectedInterval, setSelectedInterval] = useState("1m");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);

  const { data: balanceData, isLoading: balanceLoading } = useGetBalances();

  const totalBalance =
    balanceData?.balances?.reduce((total, balance) => {
      if (balance.symbol === "USDC") {
        const balanceInDollars = balance.balance / Math.pow(10, balance.decimals);
        return total + balanceInDollars;
      }
      return total;
    }, 0) || 0;

  const { data, isLoading, isError } = useGetCandles(
    selectedInterval,
    0,
    0,
    "BTC_USDC"
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const initChart = () => {
      if (!containerRef.current) return;

      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
      }

      const parentElement = containerRef.current.parentElement;
      const rect =
        parentElement?.getBoundingClientRect() ||
        containerRef.current.getBoundingClientRect();

      const containerWidth = Math.max(rect.width - 20, 600);
      const containerHeight = Math.max(rect.height - 20, 400);

      const chart = createChart(containerRef.current, {
        width: containerWidth,
        height: containerHeight,
        layout: {
          background: { color: "#0d1117" },
          textColor: "#8b949e",
          fontSize: 12,
        },
        crosshair: { mode: CrosshairMode.Normal },
        grid: {
          vertLines: { color: "#21262d" },
          horzLines: { color: "#21262d" },
        },
        timeScale: { borderColor: "#30363d" },
        rightPriceScale: { borderColor: "#30363d" },
        handleScroll: {
          mouseWheel: true,
          pressedMouseMove: true,
        },
        handleScale: {
          axisPressedMouseMove: true,
          mouseWheel: true,
          pinch: true,
        },
      });

      chartRef.current = chart;

      const series = chart.addSeries(CandlestickSeries, {
        upColor: "#00b050",
        downColor: "#ff4976",
        borderDownColor: "#ff4976",
        borderUpColor: "#00b050",
        wickDownColor: "#8b949e",
        wickUpColor: "#8b949e",
      });
      seriesRef.current = series;

      const ro = new ResizeObserver((entries) => {
        if (entries[0] && chartRef.current) {
          const { width, height } = entries[0].contentRect;
          if (width > 100 && height > 100) {
            chart.applyOptions({ width: width - 10, height: height - 10 });
            chart.timeScale().fitContent();
          }
        }
      });

      if (containerRef.current.parentElement) {
        ro.observe(containerRef.current.parentElement);
      }
      resizeObserverRef.current = ro;
    };

    const timer = setTimeout(initChart, 100);

    return () => {
      clearTimeout(timer);
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current || !data || isLoading || isError) return;

    const mapped: CandlestickData[] = data.map((row: Candle) => {
      let timestamp: number;
      const timeValue = row.bucket ?? row.time ?? "";

      if (typeof timeValue === "string") {
        const parsedNumber = Number(timeValue);
        if (!isNaN(parsedNumber)) {
          timestamp = parsedNumber;
          if (timestamp > 1000000000000) {
            timestamp = Math.floor(timestamp / 1000);
          }
        } else {
          timestamp = Math.floor(new Date(timeValue).getTime() / 1000);
        }
      } else {
        timestamp = timeValue;
        if (timestamp > 1000000000000) {
          timestamp = Math.floor(timestamp / 1000);
        }
      }

      return {
        time: timestamp as UTCTimestamp,
        open: Number(row.open),
        high: Number(row.high),
        low: Number(row.low),
        close: Number(row.close),
        volume: Number(row.volume),
      };
    });

    mapped.sort((a, b) => (a.time as number) - (b.time as number));

    seriesRef.current.setData(mapped);
    chartRef.current?.timeScale().fitContent();
  }, [data, isLoading, isError]);

  return (
    <div className="w-full h-screen bg-[#0d1117] flex flex-col">
      <header className="bg-[#161b22] border-b border-[#30363d] px-4 py-2 md:px-6 lg:px-4 flex-shrink-0">
        <div className="mx-auto">
          <div className="flex items-center justify-between mb-4 md:mb-0">
            <div className="flex items-center gap-2">
              <Image
                src="/images/logo.png"
                alt="Tradevia Logo"
                width={28}
                height={28}
                className="rounded-full"
              />
              <h1 className="text-xl font-semibold text-[#f0f6fc] font-ibm-plex-mono">
                tradevia
              </h1>
            </div>

            <button
              className="md:hidden p-2 text-[#8b949e] hover:text-[#f0f6fc]"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>

          <div className="hidden md:flex md:items-center md:justify-between">
            <div className="flex items-center gap-6 lg:gap-8">
              <nav className="flex items-center gap-6 lg:gap-8">
                <Link
                  href="/"
                  className="text-[#8b949e] hover:text-[#00d9ff] transition-colors font-instrument-sans"
                >
                  Home
                </Link>
                <Link
                  href="/docs"
                  className="text-[#8b949e] hover:text-[#00d9ff] transition-colors font-instrument-sans"
                >
                  Docs
                </Link>
                <Link
                  href="/marketplace"
                  className="text-[#00d9ff] font-semibold font-instrument-sans"
                >
                  Marketplace
                </Link>
              </nav>

              <div className="flex items-center gap-2 bg-[#21262d] px-3 py-2 rounded-lg border border-[#30363d]">
                <div className="flex items-center gap-1">
                  <SiBitcoin className="w-5 h-5 text-orange-500" />
                  <span className="font-semibold text-[#f0f6fc] font-ibm-plex-mono">BTC</span>
                </div>
                <span className="text-[#8b949e]">/</span>
                <div className="flex items-center gap-1">
                  <SiTether className="w-5 h-5 text-green-500" />
                  <span className="font-semibold text-[#f0f6fc] font-ibm-plex-mono">USDT</span>
                </div>
              </div>

              <div className="flex items-center gap-4 lg:gap-6 pl-6 lg:pl-8 border-l border-[#30363d]">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-[#8b949e]">Timeframe:</span>
                  <IntervalSelector
                    selectedInterval={selectedInterval}
                    onIntervalChange={setSelectedInterval}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 lg:gap-6">
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#8b949e]">Balance:</span>
                <span className="text-lg font-semibold text-[#00d9ff] font-ibm-plex-mono">
                  {balanceLoading
                    ? "Loading..."
                    : `$${totalBalance.toLocaleString()}`}
                </span>
              </div>
              <button
                onClick={() => setIsDepositModalOpen(true)}
                className="bg-gradient-to-r from-[#00d9ff] to-[#00b050] text-[#0d1117] text-sm px-6 py-2 rounded-4xl font-semibold transition-all hover:opacity-90 cursor-pointer"
              >
                Deposit
              </button>
            </div>
          </div>

          <div className={`md:hidden ${mobileMenuOpen ? "block" : "hidden"}`}>
            <div className="space-y-4 pt-4 border-t border-[#30363d]">
              <nav className="flex flex-col gap-3 pb-4 border-b border-[#30363d]">
                <Link
                  href="/"
                  className="text-[#8b949e] hover:text-[#00d9ff] transition-colors font-instrument-sans"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Home
                </Link>
                <Link
                  href="/docs"
                  className="text-[#8b949e] hover:text-[#00d9ff] transition-colors font-instrument-sans"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Docs
                </Link>
                <Link
                  href="/marketplace"
                  className="text-[#00d9ff] font-semibold font-instrument-sans"
                >
                  Marketplace
                </Link>
              </nav>

              <div className="flex items-center justify-center gap-2 bg-[#21262d] px-3 py-2 rounded-lg border border-[#30363d]">
                <div className="flex items-center gap-1">
                  <SiBitcoin className="w-5 h-5 text-orange-500" />
                  <span className="font-semibold text-[#f0f6fc] font-ibm-plex-mono">BTC</span>
                </div>
                <span className="text-[#8b949e]">/</span>
                <div className="flex items-center gap-1">
                  <SiTether className="w-5 h-5 text-green-500" />
                  <span className="font-semibold text-[#f0f6fc] font-ibm-plex-mono">USDT</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#8b949e]">Balance:</span>
                  <span className="text-lg font-semibold text-[#00d9ff] font-ibm-plex-mono">
                    {balanceLoading
                      ? "Loading..."
                      : `$${totalBalance.toLocaleString()}`}
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-sm text-[#8b949e]">Timeframe:</span>
                  <IntervalSelector
                    selectedInterval={selectedInterval}
                    onIntervalChange={setSelectedInterval}
                    className="w-full"
                  />
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setIsDepositModalOpen(true)}
                    className="w-full bg-gradient-to-r from-[#00d9ff] to-[#00b050] text-[#0d1117] text-sm px-4 py-3 rounded-4xl font-semibold transition-all hover:opacity-90"
                  >
                    Deposit
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div
        className="flex-1 overflow-hidden pb-20 md:pb-0"
        style={{ height: "calc(100vh - 120px)" }}
      >
        <PanelGroup direction="horizontal" className="h-full">
          <Panel
            defaultSize={20}
            minSize={15}
            maxSize={30}
            className="hidden lg:block"
          >
            <LeftSideBar />
          </Panel>

          <PanelResizeHandle className="hidden lg:block resize-handle-horizontal" />

          <Panel defaultSize={60} minSize={40} className="lg:min-w-0 w-full">
            <PanelGroup direction="vertical" className="h-full">
              <Panel defaultSize={75} minSize={50}>
                <div className="h-full relative bg-[#0d1117]">
                  {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#0d1117] bg-opacity-90 z-10">
                      <div className="text-center">
                        <div className="text-[#f0f6fc] text-lg mb-2">
                          Loading chart data...
                        </div>
                        <div className="w-8 h-8 border-4 border-[#00d9ff] border-t-transparent rounded-full animate-spin mx-auto"></div>
                      </div>
                    </div>
                  )}
                  {isError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#0d1117] bg-opacity-90 z-10">
                      <div className="text-center p-4">
                        <div className="text-[#ff4976] text-lg mb-2">
                          Error loading chart data
                        </div>
                        <button
                          onClick={() => window.location.reload()}
                          className="bg-[#21262d] border border-[#30363d] text-[#f0f6fc] px-4 py-2 rounded-4xl text-sm transition-colors hover:border-[#00d9ff] hover:text-[#00d9ff]"
                        >
                          Retry
                        </button>
                      </div>
                    </div>
                  )}
                  <div
                    ref={containerRef}
                    className="w-full h-full"
                    style={{
                      border: "1px solid #30363d",
                      borderRadius: "8px",
                      backgroundColor: "#0d1117",
                    }}
                  />
                </div>
              </Panel>

              <PanelResizeHandle className="resize-handle-vertical" />

              <Panel defaultSize={25} minSize={15} maxSize={50}>
                <div className="h-full border-t border-[#30363d] bg-[#0d1117]">
                  <OrdersSection />
                </div>
              </Panel>
            </PanelGroup>
          </Panel>

          <PanelResizeHandle className="hidden lg:block resize-handle-horizontal" />

          <Panel
            defaultSize={20}
            minSize={15}
            maxSize={30}
            className="hidden lg:block"
          >
            <RightSideBar selectedSymbol={"BTC_USDC"} />
          </Panel>
        </PanelGroup>
      </div>

      <DepositModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
      />
    </div>
  );
};

export default Marketplace;
