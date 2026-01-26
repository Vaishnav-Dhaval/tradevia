import React, { useState } from 'react';
import { useDeposit } from '../hooks/useBalance';

interface DepositModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const DepositModal: React.FC<DepositModalProps> = ({ isOpen, onClose }) => {
    const [symbol, setSymbol] = useState<'USDC' | 'BTC'>('USDC');
    const [amount, setAmount] = useState('');
    const depositMutation = useDeposit();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const depositAmount = parseFloat(amount);
        if (isNaN(depositAmount) || depositAmount <= 0) {
            return;
        }

        try {
            await depositMutation.mutateAsync({
                symbol,
                amount: depositAmount,
                decimals: symbol === 'USDC' ? 2 : 8
            });

            setAmount('');
            onClose();
        } catch (error) {
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6 w-full max-w-md mx-4 shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-[#f0f6fc]">Deposit Funds</h2>
                    <button
                        onClick={onClose}
                        className="text-[#8b949e] hover:text-[#f0f6fc] transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-[#8b949e] mb-2">
                            Asset
                        </label>
                        <select
                            value={symbol}
                            onChange={(e) => setSymbol(e.target.value as 'USDC' | 'BTC')}
                            className="w-full px-3 py-2 bg-[#21262d] border border-[#30363d] rounded-md text-[#f0f6fc] focus:outline-none focus:border-[#00d9ff] transition-colors"
                        >
                            <option value="USDC">USDC</option>
                            <option value="BTC">BTC</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[#8b949e] mb-2">
                            Amount
                        </label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="Enter amount"
                            min="0"
                            step={symbol === 'USDC' ? '0.01' : '0.00000001'}
                            className="w-full px-3 py-2 bg-[#21262d] border border-[#30363d] rounded-md text-[#f0f6fc] placeholder-[#8b949e] focus:outline-none focus:border-[#00d9ff] transition-colors"
                            required
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 text-[#f0f6fc] bg-[#21262d] border border-[#30363d] rounded-md hover:bg-[#30363d] transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={depositMutation.isPending || !amount}
                            className="flex-1 px-4 py-2 bg-gradient-to-r from-[#00d9ff] to-[#00b050] text-[#0d1117] font-semibold rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {depositMutation.isPending ? 'Depositing...' : 'Deposit'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DepositModal;
