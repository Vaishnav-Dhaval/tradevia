"use client";
import React from "react";
import { useWs } from "../hooks/useWs";

interface BackpackTradeData {
    data: {
        E: number;          // Event time
        T: number;          // Trade time
        a: string;          // Ask order id
        b: string;          // Bid order id
        e: string;          // Event type ("trade")
        m: boolean;         // Is buyer market maker
        p: string;          // Price
        q: string;          // Quantity
        s: string;          // Symbol
        t: number;          // Trade id
    };
    stream: string;         // Stream name
}

interface TickerItemProps {
    symbol: string;
    price: string;
    quantity: string;
    bid: number | null;
    ask: number | null;
    isUp: boolean;
    lastTradeTime: number;
    lastTradePrice: number;
}

const TickerItem: React.FC<TickerItemProps> = ({ symbol, price, quantity, bid, ask, isUp, lastTradeTime, lastTradePrice }) => {
    const formatTime = (timestamp: number) => {
        return new Date(timestamp / 1000).toLocaleTimeString();
    };

    return (
        <div className="p-3 border-b border-[#30363d] hover:bg-[#21262d] transition-colors">
            <div className="flex justify-between items-start mb-2">
                <span className="font-medium text-[#f0f6fc] text-sm">
                    {symbol.replace('_', '/')}
                </span>

            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex flex-col">
                    <span className="text-[#8b949e] text-xs">Bid</span>
                    <span className="font-mono text-[#00b050]">
                        ${bid != null ? bid.toLocaleString() : lastTradePrice.toLocaleString()}
                    </span>
                </div>
                <div className="flex flex-col">
                    <span className="text-[#8b949e] text-xs">Ask</span>
                    <span className="font-mono text-[#ff4976]">
                        ${ask != null ? ask.toLocaleString() : lastTradePrice.toLocaleString()}
                    </span>
                </div>
            </div>

        </div>
    );
};

const LeftSideBar: React.FC = () => {
    const { messages, orderBook, isConnected } = useWs();

    React.useEffect(() => {
        // console.log('LeftSideBar orderBook state:', orderBook);
    }, [orderBook]);

    const symbolData = React.useMemo(() => {
        const dataMap = new Map<string, BackpackTradeData>();

        messages.forEach((message) => {
            try {
                const parsed: BackpackTradeData = JSON.parse(message);
                if (parsed.data && parsed.data.s) {
                    dataMap.set(parsed.data.s, parsed);
                }
            } catch (error) {
                console.error('Error parsing websocket message:', error);
            }
        });

        return Array.from(dataMap.values()).sort((a, b) =>
            a.data.s.localeCompare(b.data.s)
        );
    }, [messages]);

    const [priceChanges, setPriceChanges] = React.useState<Map<string, boolean>>(new Map());
    const previousPricesRef = React.useRef<Map<string, number>>(new Map());

    React.useEffect(() => {
        const newChanges = new Map<string, boolean>();

        symbolData.forEach((data) => {
            const currentPrice = parseFloat(data.data.p);
            const symbol = data.data.s;
            const previousPrice = previousPricesRef.current.get(symbol);

            if (previousPrice !== undefined) {
                const isUp = currentPrice > previousPrice;
                newChanges.set(symbol, isUp);
            } else {
                newChanges.set(symbol, true);
            }

            previousPricesRef.current.set(symbol, currentPrice);
        });

        setPriceChanges(newChanges);
    }, [symbolData]);

    return (
        <div className="w-full bg-[#161b22] border-r border-[#30363d] h-full flex flex-col">
            <div className="p-4 border-b border-[#30363d] bg-[#0d1117]">
                <h2 className="text-lg font-semibold text-[#f0f6fc] font-ibm-plex-mono">
                    Live Ticker
                </h2>
                <p className="text-sm text-[#8b949e] mt-1">
                    {symbolData.length} symbols • Live Bid/Ask
                </p>
            </div>

            <div className="flex-1 overflow-y-auto">
                {symbolData.length === 0 ? (
                    <div className="p-4 text-center text-[#8b949e]">
                        <div className="w-8 h-8 border-4 border-[#30363d] border-t-[#00d9ff] rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-sm">Waiting for live data...</p>
                    </div>
                ) : (
                    symbolData.map((data) => {
                        const getBestBid = () => {
                            if (orderBook && orderBook.symbol === data.data.s && orderBook.bids?.length > 0) {
                                const bid = parseFloat(orderBook.bids[0]?.[0] || '0');
                                return bid;
                            }
                            return null;
                        };

                        const getBestAsk = () => {
                            if (orderBook && orderBook.symbol === data.data.s && orderBook.asks?.length > 0) {
                                const ask = parseFloat(orderBook.asks[0]?.[0] || '0');
                                return ask;
                            }
                            return null;
                        };

                        const lastTradePrice = parseFloat(data.data.p);

                        return (
                            <TickerItem
                                key={data.data.s}
                                symbol={data.data.s}
                                price={data.data.p}
                                quantity={data.data.q}
                                bid={getBestBid()}
                                ask={getBestAsk()}
                                isUp={priceChanges.get(data.data.s) || false}
                                lastTradeTime={data.data.T}
                                lastTradePrice={lastTradePrice}
                            />
                        );
                    })
                )}
            </div>

            <div className="p-3 border-t border-[#30363d] bg-[#0d1117]">
                <div className="flex items-center justify-between text-xs text-[#8b949e]">
                    <span>Real-time data</span>
                    <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#00b050] animate-pulse' : 'bg-[#ff4976]'}`}></div>
                        <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LeftSideBar;