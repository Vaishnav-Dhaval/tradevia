"use client";
import React, { useState, useMemo, useEffect } from "react";
import { useWs } from "../hooks/useWs";
import { useCreateOrder } from "../hooks/useOrders";
import { useGetBalances } from "../hooks/useBalance";

const getSliderStyle = (selectedIndex: number) => {
    const percentage = (selectedIndex / 4) * 100;
    return {
        background: `linear-gradient(to right, #00d9ff 0%, #00b050 ${percentage}%, #30363d ${percentage}%, #30363d 100%)`,
        outline: 'none',
        WebkitAppearance: 'none' as const,
        MozAppearance: 'none' as const,
        height: '8px',
        borderRadius: '4px',
    };
};

interface TradeData {
    data: {
        e: string;
        E: number;
        a: number;
        s: string;
        p: string;
        q: string;
        f: number;
        l: number;
        T: number;
        m: boolean;
    };
    bid: number;
    ask: number;
    timestamp: string;
}

interface OrderData {
    quantity: number;
    orderType: "long" | "short";
    symbol: string;
    leverage: number;
    takeProfit?: number;
    stopLoss?: number;
}

interface RightSideBarProps {
    selectedSymbol: string;
}

const RightSideBar: React.FC<RightSideBarProps> = ({ selectedSymbol }) => {
    const { messages, orderBook } = useWs();
    const createOrderMutation = useCreateOrder();
    const { data: balanceData } = useGetBalances();

    const [volume, setVolume] = useState("1.00");
    const [takeProfit, setTakeProfit] = useState("");
    const [stopLoss, setStopLoss] = useState("");
    const [orderType, setOrderType] = useState<"long" | "short">("long");
    const [leverage, setLeverage] = useState(1);
    const [isMobileTradeOpen, setIsMobileTradeOpen] = useState(false);

    const currentSymbolData = useMemo(() => {
        let latestTrade = null;
        for (const message of messages) {
            try {
                const parsed = JSON.parse(message);
                if (parsed.data && parsed.data.s && parsed.data.s.toLowerCase() === selectedSymbol.toLowerCase()) {
                    latestTrade = parsed;
                    break;
                }
            } catch (error) {
                console.error('Error parsing websocket message:', error);
            }
        }

        let bid = null;
        let ask = null;
        if (orderBook && orderBook.symbol && orderBook.symbol.toLowerCase() === selectedSymbol.toLowerCase()) {
            if (orderBook.bids?.length > 0) {
                bid = parseFloat(orderBook.bids[0]?.[0] || '0');
            }
            if (orderBook.asks?.length > 0) {
                ask = parseFloat(orderBook.asks[0]?.[0] || '0');
            }
        }

        return latestTrade ? {
            ...latestTrade,
            bid,
            ask
        } : null;
    }, [messages, selectedSymbol, orderBook]);

    const currentBidPrice = currentSymbolData?.bid;
    const currentAskPrice = currentSymbolData?.ask;

    const lastTradePrice = currentSymbolData?.data?.p ? parseFloat(currentSymbolData.data.p) : null;

    const availableBalance = useMemo(() => {
        if (!balanceData?.balances) return 0;
        const usdcBalance = balanceData.balances.find(balance => balance.symbol === "USDC");
        return usdcBalance ? usdcBalance.balance / Math.pow(10, usdcBalance.decimals) : 0;
    }, [balanceData]);

    const getExecutionPrice = (side: "long" | "short") => {
        if (side === "long") {
            return currentAskPrice || lastTradePrice;
        } else {
            return currentBidPrice || lastTradePrice;
        }
    };


    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value === "" || (/^\d{0,2}(\.\d{0,2})?$/.test(value) && parseFloat(value) <= 100)) {
            setVolume(value);
        }
    };

    const validateTakeProfit = (value: string, side: "long" | "short" = orderType) => {
        const executionPrice = getExecutionPrice(side);
        if (!value || !executionPrice) return true;
        const tpValue = parseFloat(value);
        if (side === "long") {
            return tpValue > executionPrice;
        } else {
            return tpValue < executionPrice;
        }
    };

    const validateStopLoss = (value: string, side: "long" | "short" = orderType) => {
        const executionPrice = getExecutionPrice(side);
        if (!value || !executionPrice) return true;
        const slValue = parseFloat(value);
        if (side === "long") {
            return slValue < executionPrice;
        } else {
            return slValue > executionPrice;
        }
    };

    const handleCreateOrder = (side: "long" | "short") => {
        const executionPrice = getExecutionPrice(side);

        if (!executionPrice || !volume || parseFloat(volume) <= 0) {
            return;
        }

        if (takeProfit && !validateTakeProfit(takeProfit, side)) {
            const priceType = side === "long" ? "ask" : "bid";
            const direction = side === "long" ? "greater than" : "less than";
            alert(`Take profit must be ${direction} execution price (${priceType}: ${executionPrice.toFixed(4)})`);
            return;
        }

        if (stopLoss && !validateStopLoss(stopLoss, side)) {
            const priceType = side === "long" ? "ask" : "bid";
            const direction = side === "long" ? "less than" : "greater than";
            alert(`Stop loss must be ${direction} execution price (${priceType}: ${executionPrice.toFixed(4)})`);
            return;
        }

        const quantity = parseFloat(volume);
        const notionalValue = quantity * executionPrice;
        const requiredMargin = notionalValue / leverage;

        if (requiredMargin > availableBalance) {
            alert(`Insufficient balance! Required margin: $${requiredMargin.toFixed(2)}, Available balance: $${availableBalance.toFixed(2)}`);
            return;
        }

        const orderData: OrderData = {
            quantity,
            orderType: side,
            symbol: selectedSymbol.toLowerCase(),
            leverage
        };

        if (takeProfit) {
            orderData.takeProfit = parseFloat(takeProfit);
        }
        if (stopLoss) {
            orderData.stopLoss = parseFloat(stopLoss);
        }

        createOrderMutation.mutate(orderData);
    };

    return (
        <>
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#161b22] border-t border-[#30363d] p-4 z-40">
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => setIsMobileTradeOpen(true)}
                        className="bg-[#00b050] text-[#0d1117] py-3 px-4 rounded-4xl font-medium transition-colors hover:opacity-90"
                    >
                        Long
                    </button>
                    <button
                        onClick={() => setIsMobileTradeOpen(true)}
                        className="bg-[#ff4976] text-[#0d1117] py-3 px-4 rounded-4xl font-medium transition-colors hover:opacity-90"
                    >
                        Short
                    </button>
                </div>
            </div>

            {isMobileTradeOpen && (
                <div className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50">
                    <div className="absolute bottom-0 left-0 right-0 bg-[#161b22] rounded-t-lg max-h-[80vh] overflow-hidden border-t border-[#30363d]">
                        <div className="p-4 border-b border-[#30363d] bg-[#0d1117] flex justify-between items-center">
                            <h2 className="text-lg font-semibold text-[#f0f6fc] font-ibm-plex-mono">
                                Trade {selectedSymbol.toUpperCase()}
                            </h2>
                            <button
                                onClick={() => setIsMobileTradeOpen(false)}
                                className="p-2 hover:bg-[#21262d] rounded-4xl text-[#8b949e] hover:text-[#f0f6fc]"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="overflow-y-auto max-h-[calc(80vh-80px)]">
                            <div className="p-4 border-b border-[#30363d]">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="text-center">
                                        <div className="text-sm text-[#8b949e] mb-1">Bid</div>
                                        <div className="text-lg font-mono font-semibold text-[#00b050]">
                                            ${currentSymbolData?.bid ? currentSymbolData.bid.toFixed(4) : (lastTradePrice ? lastTradePrice.toFixed(4) : "---")}
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-sm text-[#8b949e] mb-1">Ask</div>
                                        <div className="text-lg font-mono font-semibold text-[#ff4976]">
                                            ${currentSymbolData?.ask ? currentSymbolData.ask.toFixed(4) : (lastTradePrice ? lastTradePrice.toFixed(4) : "---")}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-xs text-[#8b949e] mt-2 text-center">
                                    Long orders pay ask price • Short orders receive bid price
                                </div>
                            </div>

                            <div className="p-4 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-[#f0f6fc] mb-2">
                                        Volume/Quantity
                                    </label>
                                    <input
                                        type="text"
                                        value={volume}
                                        onChange={handleVolumeChange}
                                        placeholder="0.00"
                                        className="w-full px-3 py-2 bg-[#21262d] border border-[#30363d] rounded-lg font-mono text-[#f0f6fc] placeholder-[#8b949e] focus:outline-none focus:border-[#00d9ff]"
                                        min="0.01"
                                        max="100.00"
                                        step="0.01"
                                    />
                                    <div className="text-xs text-[#8b949e] mt-1">Range: 0.01 - 100.00</div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[#f0f6fc] mb-2">
                                        Leverage: {leverage}x
                                    </label>
                                    <div className="space-y-3">
                                        <input
                                            type="range"
                                            min="0"
                                            max="4"
                                            step="1"
                                            value={[1, 5, 10, 50, 100].indexOf(leverage)}
                                            onChange={(e) => {
                                                const leverageOptions = [1, 5, 10, 50, 100];
                                                const index = parseInt(e.target.value);
                                                if (!isNaN(index) && index >= 0 && index < leverageOptions.length) {
                                                    const newLeverage = leverageOptions[index];
                                                    if (newLeverage !== undefined) {
                                                        setLeverage(newLeverage);
                                                    }
                                                }
                                            }}
                                            className="w-full appearance-none cursor-pointer slider"
                                            style={getSliderStyle([1, 5, 10, 50, 100].indexOf(leverage))}
                                        />
                                        <div className="flex justify-between text-xs text-[#8b949e]">
                                            <span className={leverage === 1 ? "font-semibold text-[#00d9ff]" : ""}>1x</span>
                                            <span className={leverage === 5 ? "font-semibold text-[#00d9ff]" : ""}>5x</span>
                                            <span className={leverage === 10 ? "font-semibold text-[#00d9ff]" : ""}>10x</span>
                                            <span className={leverage === 50 ? "font-semibold text-[#00d9ff]" : ""}>50x</span>
                                            <span className={leverage === 100 ? "font-semibold text-[#00d9ff]" : ""}>100x</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[#f0f6fc] mb-2">
                                        Take Profit (Optional)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={takeProfit}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                if (value === "" || /^\d*\.?\d*$/.test(value)) {
                                                    setTakeProfit(value);
                                                }
                                            }}
                                            placeholder="Not set"
                                            className={`w-full px-3 py-2 pr-8 bg-[#21262d] border rounded-4xl font-mono text-[#f0f6fc] placeholder-[#8b949e] focus:outline-none ${takeProfit && !validateTakeProfit(takeProfit)
                                                    ? 'border-[#ff4976] bg-[#ff4976]/10'
                                                    : 'border-[#30363d] focus:border-[#00d9ff]'
                                                }`}
                                        />
                                        {takeProfit && (
                                            <button
                                                type="button"
                                                onClick={() => setTakeProfit("")}
                                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-[#8b949e] hover:text-[#f0f6fc] p-1"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                    {takeProfit && !validateTakeProfit(takeProfit) && (
                                        <div className="text-xs text-[#ff4976] mt-1">
                                            Take profit must be {orderType === "long" ? "greater than" : "less than"} {orderType === "long" ? "ask" : "bid"} price (${getExecutionPrice(orderType)?.toFixed(4)})
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[#f0f6fc] mb-2">
                                        Stop Loss (Optional)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={stopLoss}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                if (value === "" || /^\d*\.?\d*$/.test(value)) {
                                                    setStopLoss(value);
                                                }
                                            }}
                                            placeholder="Not set"
                                            className={`w-full px-3 py-2 pr-8 bg-[#21262d] border rounded-4xl font-mono text-[#f0f6fc] placeholder-[#8b949e] focus:outline-none ${stopLoss && !validateStopLoss(stopLoss)
                                                    ? 'border-[#ff4976] bg-[#ff4976]/10'
                                                    : 'border-[#30363d] focus:border-[#00d9ff]'
                                                }`}
                                        />
                                        {stopLoss && (
                                            <button
                                                type="button"
                                                onClick={() => setStopLoss("")}
                                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-[#8b949e] hover:text-[#f0f6fc] p-1"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                    {stopLoss && !validateStopLoss(stopLoss) && (
                                        <div className="text-xs text-[#ff4976] mt-1">
                                            Stop loss must be {orderType === "long" ? "less than" : "greater than"} {orderType === "long" ? "ask" : "bid"} price (${getExecutionPrice(orderType)?.toFixed(4)})
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-4">
                                    <button
                                        onClick={() => {
                                            handleCreateOrder("long");
                                            setIsMobileTradeOpen(false);
                                        }}
                                        disabled={createOrderMutation.isPending || !getExecutionPrice("long") || !volume || parseFloat(volume) <= 0}
                                        className="bg-[#00b050] text-[#0d1117] py-3 px-4 rounded-4xl font-semibold transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                    >
                                        {createOrderMutation.isPending ? "..." : "Long"}
                                    </button>
                                    <button
                                        onClick={() => {
                                            handleCreateOrder("short");
                                            setIsMobileTradeOpen(false);
                                        }}
                                        disabled={createOrderMutation.isPending || !getExecutionPrice("short") || !volume || parseFloat(volume) <= 0}
                                        className="bg-[#ff4976] text-[#0d1117] py-3 px-4 rounded-4xl font-semibold transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                    >
                                        {createOrderMutation.isPending ? "..." : "Short"}
                                    </button>
                                </div>

                                {getExecutionPrice(orderType) && volume && parseFloat(volume) > 0 && (
                                    <div className="mt-4 p-3 bg-[#21262d] border border-[#30363d] rounded-4xl">
                                        <div className="text-sm text-[#f0f6fc] mb-2 font-medium">Order Summary:</div>
                                        <div className="space-y-1 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-[#8b949e]">Volume:</span>
                                                <span className="font-mono text-[#f0f6fc]">{volume}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-[#8b949e]">Leverage:</span>
                                                <span className="font-mono font-semibold text-[#00d9ff]">{leverage}x</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-[#8b949e]">Execution Price ({orderType === "long" ? "Ask" : "Bid"}):</span>
                                                <span className="font-mono text-[#f0f6fc]">
                                                    ${getExecutionPrice(orderType)?.toFixed(4)}
                                                </span>
                                            </div>
                                            <hr className="my-2 border-[#30363d]" />
                                            <div className="flex justify-between font-medium">
                                                <span className="text-[#8b949e]">Notional:</span>
                                                <span className="font-mono text-[#f0f6fc]">
                                                    ${(parseFloat(volume) * (getExecutionPrice(orderType) || 0)).toFixed(2)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between font-medium">
                                                <span className="text-[#8b949e]">Required Margin:</span>
                                                <span className="font-mono text-[#f0f6fc]">
                                                    ${((parseFloat(volume) * (getExecutionPrice(orderType) || 0)) / leverage).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="hidden md:flex w-full bg-[#161b22] border-l border-[#30363d] h-full flex-col">
                <div className="p-4 border-b border-[#30363d] bg-[#0d1117] flex-shrink-0">
                    <h2 className="text-lg font-semibold text-[#f0f6fc] font-ibm-plex-mono">
                        Trade {selectedSymbol.toUpperCase()}
                    </h2>
                </div>

                <div className="p-4 border-b border-[#30363d] flex-shrink-0">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                            <div className="text-sm text-[#8b949e] mb-1">Bid</div>
                            <div className="text-lg font-mono font-semibold text-[#00b050]">
                                ${currentSymbolData?.bid ? currentSymbolData.bid.toFixed(4) : (lastTradePrice ? lastTradePrice.toFixed(4) : "---")}
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="text-sm text-[#8b949e] mb-1">Ask</div>
                            <div className="text-lg font-mono font-semibold text-[#ff4976]">
                                ${currentSymbolData?.ask ? currentSymbolData.ask.toFixed(4) : (lastTradePrice ? lastTradePrice.toFixed(4) : "---")}
                            </div>
                        </div>
                    </div>
                    <div className="text-xs text-[#8b949e] mt-2 text-center">
                        Long orders pay ask price • Short orders receive bid price
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <div className="p-4 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-[#f0f6fc] mb-2">
                                Volume/Quantity
                            </label>
                            <input
                                type="text"
                                value={volume}
                                onChange={handleVolumeChange}
                                placeholder="0.00"
                                className="w-full px-3 py-2 bg-[#21262d] border border-[#30363d] rounded-lg font-mono text-[#f0f6fc] placeholder-[#8b949e] focus:outline-none focus:border-[#00d9ff]"
                                min="0.01"
                                max="100.00"
                                step="0.01"
                            />
                            <div className="text-xs text-[#8b949e] mt-1">Range: 0.01 - 100.00</div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[#f0f6fc] mb-2">
                                Leverage: {leverage}x
                            </label>
                            <div className="space-y-3">
                                <input
                                    type="range"
                                    min="0"
                                    max="4"
                                    step="1"
                                    value={[1, 5, 10, 50, 100].indexOf(leverage)}
                                    onChange={(e) => {
                                        const leverageOptions = [1, 5, 10, 50, 100];
                                        const index = parseInt(e.target.value);
                                        if (!isNaN(index) && index >= 0 && index < leverageOptions.length) {
                                            const newLeverage = leverageOptions[index];
                                            if (newLeverage !== undefined) {
                                                setLeverage(newLeverage);
                                            }
                                        }
                                    }}
                                    className="w-full appearance-none cursor-pointer slider"
                                    style={getSliderStyle([1, 5, 10, 50, 100].indexOf(leverage))}
                                />
                                <div className="flex justify-between text-xs text-[#8b949e]">
                                    <span className={leverage === 1 ? "font-semibold text-[#00d9ff]" : ""}>1x</span>
                                    <span className={leverage === 5 ? "font-semibold text-[#00d9ff]" : ""}>5x</span>
                                    <span className={leverage === 10 ? "font-semibold text-[#00d9ff]" : ""}>10x</span>
                                    <span className={leverage === 50 ? "font-semibold text-[#00d9ff]" : ""}>50x</span>
                                    <span className={leverage === 100 ? "font-semibold text-[#00d9ff]" : ""}>100x</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[#f0f6fc] mb-2">
                                Take Profit (Optional)
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={takeProfit}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        if (value === "" || /^\d*\.?\d*$/.test(value)) {
                                            setTakeProfit(value);
                                        }
                                    }}
                                    placeholder="Not set"
                                    className={`w-full px-3 py-2 pr-8 bg-[#21262d] border rounded-lg font-mono text-[#f0f6fc] placeholder-[#8b949e] focus:outline-none ${takeProfit && !validateTakeProfit(takeProfit)
                                            ? 'border-[#ff4976] bg-[#ff4976]/10'
                                            : 'border-[#30363d] focus:border-[#00d9ff]'
                                        }`}
                                />
                                {takeProfit && (
                                    <button
                                        type="button"
                                        onClick={() => setTakeProfit("")}
                                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-[#8b949e] hover:text-[#f0f6fc] p-1"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                            {takeProfit && !validateTakeProfit(takeProfit) && (
                                <div className="text-xs text-[#ff4976] mt-1">
                                    Take profit must be {orderType === "long" ? "greater than" : "less than"} {orderType === "long" ? "ask" : "bid"} price (${getExecutionPrice(orderType)?.toFixed(4)})
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[#f0f6fc] mb-2">
                                Stop Loss (Optional)
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={stopLoss}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        if (value === "" || /^\d*\.?\d*$/.test(value)) {
                                            setStopLoss(value);
                                        }
                                    }}
                                    placeholder="Not set"
                                    className={`w-full px-3 py-2 pr-8 bg-[#21262d] border rounded-lg font-mono text-[#f0f6fc] placeholder-[#8b949e] focus:outline-none ${stopLoss && !validateStopLoss(stopLoss)
                                            ? 'border-[#ff4976] bg-[#ff4976]/10'
                                            : 'border-[#30363d] focus:border-[#00d9ff]'
                                        }`}
                                />
                                {stopLoss && (
                                    <button
                                        type="button"
                                        onClick={() => setStopLoss("")}
                                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-[#8b949e] hover:text-[#f0f6fc] p-1"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                            {stopLoss && !validateStopLoss(stopLoss) && (
                                <div className="text-xs text-[#ff4976] mt-1">
                                    Stop loss must be {orderType === "long" ? "less than" : "greater than"} {orderType === "long" ? "ask" : "bid"} price (${getExecutionPrice(orderType)?.toFixed(4)})
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-4">
                            <button
                                onClick={() => handleCreateOrder("long")}
                                disabled={createOrderMutation.isPending || !getExecutionPrice("long") || !volume || parseFloat(volume) <= 0}
                                className="bg-[#00b050] text-[#0d1117] py-3 px-4 rounded-4xl font-semibold transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                                {createOrderMutation.isPending ? "..." : "Long"}
                            </button>
                            <button
                                onClick={() => handleCreateOrder("short")}
                                disabled={createOrderMutation.isPending || !getExecutionPrice("short") || !volume || parseFloat(volume) <= 0}
                                className="bg-[#ff4976] text-[#0d1117] py-3 px-4 rounded-4xl font-semibold transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                                {createOrderMutation.isPending ? "..." : "Short"}
                            </button>
                        </div>

                        {getExecutionPrice(orderType) && volume && parseFloat(volume) > 0 && (
                            <div className="mt-4 p-3 bg-[#21262d] border border-[#30363d] rounded-lg">
                                <div className="text-sm text-[#f0f6fc] mb-2 font-medium">Order Summary:</div>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-[#8b949e]">Volume:</span>
                                        <span className="font-mono text-[#f0f6fc]">{volume}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[#8b949e]">Leverage:</span>
                                        <span className="font-mono font-semibold text-[#00d9ff]">{leverage}x</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[#8b949e]">Execution Price ({orderType === "long" ? "Ask" : "Bid"}):</span>
                                        <span className="font-mono text-[#f0f6fc]">
                                            ${getExecutionPrice(orderType)?.toFixed(4)}
                                        </span>
                                    </div>
                                    <hr className="my-2 border-[#30363d]" />
                                    <div className="flex justify-between font-medium">
                                        <span className="text-[#8b949e]">Notional:</span>
                                        <span className="font-mono text-[#f0f6fc]">
                                            ${(parseFloat(volume) * (getExecutionPrice(orderType) || 0)).toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between font-medium">
                                        <span className="text-[#8b949e]">Required Margin:</span>
                                        <span className="font-mono text-[#f0f6fc]">
                                            ${((parseFloat(volume) * (getExecutionPrice(orderType) || 0)) / leverage).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </>
    );
};

export default RightSideBar;