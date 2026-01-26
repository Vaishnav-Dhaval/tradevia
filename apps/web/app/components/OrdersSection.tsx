"use client";
import React, { useState, useMemo, useEffect, useRef } from "react";
import { useGetOrders, useCloseOrder } from "../hooks/useOrders";
import { useWs } from "../hooks/useWs";
import toast from "react-hot-toast";

interface Order {
  id: string;
  symbol: string;
  orderType: "long" | "short";
  quantity: number | string;
  price: number | string;
  status: "open" | "closed";
  pnl?: number;
  createdAt: string;
  closedAt?: string;
  exitPrice?: number;
  leverage?: number;
  takeProfit?: number;
  stopLoss?: number;
  closeReason?: string;
}

interface TradeData {
  data: {
    s: string;
    p: string;
  };
  bid: number;
  ask: number;
}

const OrdersSection: React.FC = () => {
  const { data: ordersData, isLoading, error } = useGetOrders();
  const closeOrderMutation = useCloseOrder();
  const { messages, orderBook } = useWs();
  const [activeTab, setActiveTab] = useState<"open" | "all">("open");
  const prevOrdersRef = useRef<Order[]>([]);

  useEffect(() => {
    if (!ordersData?.orders || isLoading) return;

    const currentOrders = ordersData.orders;
    const prevOrders = prevOrdersRef.current;

    currentOrders.forEach((currentOrder: Order) => {
      const prevOrder = prevOrders.find((o) => o.id === currentOrder.id);

      if (prevOrder && prevOrder.status === "open" && currentOrder.status === "closed") {
        const pnl = currentOrder.pnl || 0;
        const pnlText = pnl >= 0 ? `+$${pnl.toFixed(2)}` : `-$${Math.abs(pnl).toFixed(2)}`;

        if (currentOrder.closeReason === "Liquidation" || currentOrder.closeReason === "margin") {
          toast.error(
            `Order Liquidated: ${currentOrder.symbol.toUpperCase()} ${currentOrder.orderType.toUpperCase()} | PnL: ${pnlText}`,
            { duration: 6000 }
          );
        } else if (currentOrder.closeReason === "TakeProfit") {
          toast.success(
            `Take Profit Hit: ${currentOrder.symbol.toUpperCase()} ${currentOrder.orderType.toUpperCase()} | PnL: ${pnlText}`,
            { duration: 5000 }
          );
        } else if (currentOrder.closeReason === "StopLoss") {
          toast.error(
            `Stop Loss Hit: ${currentOrder.symbol.toUpperCase()} ${currentOrder.orderType.toUpperCase()} | PnL: ${pnlText}`,
            { duration: 5000 }
          );
        }
      }
    });

    prevOrdersRef.current = currentOrders;
  }, [ordersData, isLoading]);

  const currentPrices = useMemo(() => {
    const priceMap = new Map<
      string,
      { bid: number; ask: number; price: number }
    >();

    const tradeMap = new Map<string, number>();
    messages.forEach((message) => {
      try {
        const parsed = JSON.parse(message);
        if (parsed.data && parsed.data.s && parsed.data.p) {
          const symbol = parsed.data.s.toLowerCase();
          const price = parseFloat(parsed.data.p);
          tradeMap.set(symbol, price);
        }
      } catch (error) {
        console.error("Error parsing websocket message:", error);
      }
    });

    if (orderBook && orderBook.symbol) {
      const symbol = orderBook.symbol.toLowerCase();
      const bid =
        orderBook.bids?.length > 0
          ? parseFloat(orderBook.bids[0]?.[0] || "0")
          : null;
      const ask =
        orderBook.asks?.length > 0
          ? parseFloat(orderBook.asks[0]?.[0] || "0")
          : null;
      const tradePrice = tradeMap.get(symbol);

      if (bid || ask || tradePrice) {
        priceMap.set(symbol, {
          bid: bid || tradePrice || 0,
          ask: ask || tradePrice || 0,
          price: tradePrice || bid || ask || 0,
        });
      }
    }

    tradeMap.forEach((price, symbol) => {
      if (!priceMap.has(symbol)) {
        priceMap.set(symbol, {
          bid: price,
          ask: price,
          price: price,
        });
      }
    });

    if (ordersData?.orders) {
      ordersData.orders.forEach((order: Order) => {
        const symbol = order.symbol.toLowerCase();
        const symbolWithUsdc = `${symbol}_usdc`;

        if (!priceMap.has(symbol) && !priceMap.has(symbolWithUsdc)) {
          const tradePrice =
            tradeMap.get(symbol) || tradeMap.get(symbolWithUsdc);
          if (tradePrice) {
            priceMap.set(symbol, {
              bid: tradePrice,
              ask: tradePrice,
              price: tradePrice,
            });
          }
        }
      });
    }

    return priceMap;
  }, [messages, orderBook, ordersData]);


  const calculatePnL = (order: Order) => {
    if (order.status === "closed") {
      return order.pnl || 0;
    }

    let currentPrice = currentPrices.get(order.symbol.toLowerCase());

    if (!currentPrice && !order.symbol.includes("_")) {
      currentPrice = currentPrices.get(`${order.symbol.toLowerCase()}_usdc`);
    }

    if (!currentPrice && order.symbol.includes("_")) {
      const baseSymbol = order.symbol.split("_")[0]?.toLowerCase();
      if (baseSymbol) {
        currentPrice = currentPrices.get(baseSymbol);
      }
    }

    if (!currentPrice || !order.price || !order.quantity) return 0;

    const entryPrice =
      typeof order.price === "number" ? order.price : parseFloat(order.price);

    const marketPrice =
      order.orderType === "long" ? currentPrice.bid : currentPrice.ask;
    const quantity =
      typeof order.quantity === "number"
        ? order.quantity
        : parseFloat(order.quantity);

    if (isNaN(entryPrice) || isNaN(marketPrice) || isNaN(quantity)) return 0;

    if (order.orderType === "long") {
      return (marketPrice - entryPrice) * quantity;
    } else {
      return (entryPrice - marketPrice) * quantity;
    }
  };

  const getCurrentPrice = (order: Order) => {
    if (order.status === "closed") {
      return order.exitPrice || 0;
    }

    let currentPrice = currentPrices.get(order.symbol.toLowerCase());

    if (!currentPrice && !order.symbol.includes("_")) {
      currentPrice = currentPrices.get(`${order.symbol.toLowerCase()}_usdc`);
    }

    if (!currentPrice && order.symbol.includes("_")) {
      const baseSymbol = order.symbol.split("_")[0]?.toLowerCase();
      if (baseSymbol) {
        currentPrice = currentPrices.get(baseSymbol);
      }
    }

    if (!currentPrice) return 0;

    return order.orderType === "long" ? currentPrice.bid : currentPrice.ask;
  };

  const handleCloseOrder = (orderId: string) => {
    closeOrderMutation.mutate({ id: orderId, closeReason: "Manual" });
  };

  const orders = ordersData?.orders || [];
  const filteredOrders =
    activeTab === "open"
      ? orders.filter((order: Order) => order.status === "open")
      : orders;

  if (isLoading) {
    return (
      <div className="bg-[#0d1117] border-t border-[#30363d] p-4">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#30363d] border-t-[#00d9ff] rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-[#8b949e]">Loading orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#0d1117] border-t border-[#30363d] p-4">
        <div className="text-center">
          <p className="text-sm text-[#ff4976]">
            Error loading orders: {error?.message || "Unknown error"}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 bg-gradient-to-r from-[#00d9ff] to-[#00b050] text-[#0d1117] rounded-4xl text-sm font-semibold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0d1117] border-t border-[#30363d] h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-[#30363d] flex-shrink-0">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab("open")}
            className={`px-4 py-2 text-sm font-medium rounded-4xl transition-colors ${activeTab === "open"
                ? "bg-[#21262d] text-[#00d9ff] border border-[#00d9ff]"
                : "text-[#8b949e] hover:text-[#f0f6fc]"
              }`}
          >
            Open Orders (
            {orders.filter((o: Order) => o.status === "open").length})
          </button>
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === "all"
                ? "bg-[#21262d] text-[#00d9ff] border border-[#00d9ff]"
                : "text-[#8b949e] hover:text-[#f0f6fc]"
              }`}
          >
            All Orders ({orders.length})
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-[#8b949e]">
            <p>No {activeTab === "open" ? "open " : ""}orders found</p>
          </div>
        ) : (
          <div className="overflow-x-auto h-full">
            <table className="w-full min-w-max">
              <thead className="bg-[#161b22] sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#8b949e] uppercase tracking-wider">
                    Symbol
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#8b949e] uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#8b949e] uppercase tracking-wider">
                    Volume
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#8b949e] uppercase tracking-wider">
                    Notional
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#8b949e] uppercase tracking-wider">
                    Open Price
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#8b949e] uppercase tracking-wider">
                    Close Price
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#8b949e] uppercase tracking-wider">
                    PnL
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#8b949e] uppercase tracking-wider">
                    Leverage
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#8b949e] uppercase tracking-wider">
                    Take Profit
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#8b949e] uppercase tracking-wider">
                    Stop Loss
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#8b949e] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#8b949e] uppercase tracking-wider">
                    Close Reason
                  </th>
                </tr>
              </thead>
              <tbody className="bg-[#0d1117] divide-y divide-[#30363d]">
                {filteredOrders.map((order: Order) => {
                  const pnl = calculatePnL(order);
                  const currentPrice = getCurrentPrice(order);
                  const pnlValue =
                    typeof pnl === "number" ? pnl : parseFloat(pnl) || 0;
                  const isProfitable = pnlValue > 0;

                  return (
                    <tr
                      key={`${order.id}-${order.createdAt}`}
                      className="hover:bg-[#161b22]"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-[#f0f6fc]">
                        {order.symbol.toUpperCase()}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${order.orderType === "long"
                              ? "bg-[#00b050]/20 text-[#00b050]"
                              : "bg-[#ff4976]/20 text-[#ff4976]"
                            }`}
                        >
                          {order.orderType.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-[#f0f6fc]">
                        {(() => {
                          if (!order.quantity) return "---";
                          const qty =
                            typeof order.quantity === "number"
                              ? order.quantity
                              : parseFloat(order.quantity);
                          return isNaN(qty) ? "---" : qty;
                        })()}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-[#f0f6fc]">
                        {(() => {
                          if (!order.quantity || !order.price) return "---";
                          const qty =
                            typeof order.quantity === "number"
                              ? order.quantity
                              : parseFloat(order.quantity);
                          const price =
                            typeof order.price === "number"
                              ? order.price
                              : parseFloat(order.price);
                          if (isNaN(qty) || isNaN(price)) return "---";
                          const notional = qty * price;
                          return `$${notional.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                        })()}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-[#f0f6fc]">
                        $
                        {(() => {
                          if (!order.price) return "---";
                          const price =
                            typeof order.price === "number"
                              ? order.price
                              : parseFloat(order.price);
                          return isNaN(price) ? "---" : price.toFixed(4);
                        })()}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-[#f0f6fc]">
                        $
                        {currentPrice && typeof currentPrice === "number"
                          ? currentPrice.toFixed(4)
                          : "---"}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono">
                        <span
                          className={
                            isProfitable ? "text-[#00b050]" : "text-[#ff4976]"
                          }
                        >
                          {isProfitable ? "+" : ""}$
                          {(() => {
                            if (!pnl && pnl !== 0) return "0.00";
                            const pnlValue =
                              typeof pnl === "number" ? pnl : parseFloat(pnl);
                            return isNaN(pnlValue)
                              ? "0.00"
                              : pnlValue.toFixed(2);
                          })()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-[#00d9ff]">
                        {order.leverage ? `${order.leverage}x` : "1x"}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-[#f0f6fc]">
                        {order.takeProfit && order.takeProfit > 0
                          ? `$${typeof order.takeProfit === "number"
                            ? order.takeProfit.toFixed(4)
                            : parseFloat(order.takeProfit).toFixed(4)
                          }`
                          : "---"}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-[#f0f6fc]">
                        {order.stopLoss && order.stopLoss > 0
                          ? `$${typeof order.stopLoss === "number"
                            ? order.stopLoss.toFixed(4)
                            : parseFloat(order.stopLoss).toFixed(4)
                          }`
                          : "---"}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${order.status === "open"
                              ? "bg-[#f0b429]/20 text-[#f0b429]"
                              : "bg-[#30363d] text-[#8b949e]"
                            }`}
                        >
                          {order.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {order.closeReason ? (
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${order.closeReason === "TakeProfit"
                                ? "bg-[#00b050]/20 text-[#00b050]"
                                : order.closeReason === "StopLoss"
                                  ? "bg-[#ff4976]/20 text-[#ff4976]"
                                  : order.closeReason === "Manual"
                                    ? "bg-[#00d9ff]/20 text-[#00d9ff]"
                                    : order.closeReason === "Liquidation" ||
                                      order.closeReason === "margin"
                                      ? "bg-[#f0b429]/20 text-[#f0b429]"
                                      : "bg-[#30363d] text-[#8b949e]"
                              }`}
                          >
                            {order.closeReason === "margin"
                              ? "Liquidation"
                              : order.closeReason}
                          </span>
                        ) : (
                          "---"
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {order.status === "open" && (
                          <button
                            onClick={() => handleCloseOrder(order.id)}
                            disabled={closeOrderMutation.isPending}
                            className="text-[#ff4976] hover:text-[#ff6b8a] font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {closeOrderMutation.isPending
                              ? "Closing..."
                              : "Close"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersSection;
