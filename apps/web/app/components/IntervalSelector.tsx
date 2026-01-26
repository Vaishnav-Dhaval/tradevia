"use client";
import React from "react";

interface IntervalSelectorProps {
    selectedInterval: string;
    onIntervalChange: (interval: string) => void;
    className?: string;
}

const IntervalSelector: React.FC<IntervalSelectorProps> = ({
    selectedInterval,
    onIntervalChange,
    className = "",
}) => {
    const intervals = [
        { value: "1m", label: "1m" },
        { value: "5m", label: "5m" },
        { value: "30m", label: "30m" },
        { value: "1h", label: "1h" },
        { value: "6h", label: "6h" },
        { value: "1d", label: "1d" },
        { value: "3d", label: "3d" },
    ];

    return (
        <div className={`inline-flex rounded-lg bg-[#21262d] p-1 border border-[#30363d] ${className}`}>
            {intervals.map((interval) => (
                <button
                    key={interval.value}
                    onClick={() => onIntervalChange(interval.value)}
                    className={`
                        px-3 py-2 md:px-4 md:py-2 text-xs md:text-sm font-medium rounded-md transition-all duration-200 ease-in-out
                        ${selectedInterval === interval.value
                            ? "bg-gradient-to-r from-[#00d9ff] to-[#00b050] text-[#0d1117] shadow-lg transform scale-105"
                            : "text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#30363d] active:scale-95"
                        }
                    `}
                >
                    {interval.label}
                </button>
            ))}
        </div>
    );
};

export default IntervalSelector;
