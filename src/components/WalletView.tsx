import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Wallet, Coins, ArrowUpRight, ArrowDownLeft, Sparkles, TrendingUp, ShieldCheck, CreditCard, History, Lock, Clock, CheckCircle2 } from 'lucide-react';
import { User } from '../types';

interface WalletViewProps {
  currentUser: User;
}

export default function WalletView({ currentUser }: WalletViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'earnings'>('overview');

  const transactions = [
    { id: 'tx-1', type: 'earn', title: 'Creator Sparks Reward', amount: '+240 Sparks', value: '~$2.40 USD', date: 'Today, 14:32', status: 'Completed' },
    { id: 'tx-2', type: 'earn', title: 'Mission Bonus: Unified Mesh', amount: '+500 NEX', value: '~$15.00 USD', date: 'Yesterday, 09:15', status: 'Completed' },
    { id: 'tx-3', type: 'tip', title: 'Community Spark Tip from @voh', amount: '+100 Sparks', value: '~$1.00 USD', date: '2 days ago', status: 'Completed' },
    { id: 'tx-4', type: 'subscription', title: 'Channel Subscriber Payout', amount: '+1,200 Sparks', value: '~$12.00 USD', date: '3 days ago', status: 'Completed' }
  ];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-linear-to-r from-emerald-950/40 via-teal-950/20 to-black border border-emerald-500/20 backdrop-blur-xl shadow-md text-left">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-sans font-black tracking-tight text-white flex items-center gap-2">
              Nexora Wallet
              <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-0.5 rounded-full uppercase">
                NEX & Earnings
              </span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Secure home for NEX tokens, Sparks, and creator monetization payouts
            </p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 bg-black/40 p-1 rounded-2xl border border-white/10">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'transactions', label: 'Ledger' },
            { id: 'earnings', label: 'Creator Earnings' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-sans font-bold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: NEX Tokens */}
        <div className="p-6 rounded-3xl bg-linear-to-br from-emerald-950/60 to-black border border-emerald-500/30 shadow-md relative overflow-hidden text-left space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Coins className="w-4 h-4" /> NEX Tokens Balance
            </span>
            <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              Mainnet Ready
            </span>
          </div>

          <div>
            <div className="text-3xl font-mono font-black text-white tracking-tight">
              1,480.00 <span className="text-sm font-sans font-bold text-emerald-400">NEX</span>
            </div>
            <div className="text-xs font-mono text-zinc-400 mt-1">
              &approx; $44.40 USD (1 NEX = $0.03 USD)
            </div>
          </div>

          <div className="flex gap-2.5 pt-2">
            <button className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-sans font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
              <ArrowDownLeft className="w-3.5 h-3.5" /> Receive NEX
            </button>
            <button className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-sans font-bold text-xs border border-white/10 transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
              <ArrowUpRight className="w-3.5 h-3.5" /> Transfer
            </button>
          </div>
        </div>

        {/* Card 2: Creator Sparks */}
        <div className="p-6 rounded-3xl bg-linear-to-br from-purple-950/60 to-black border border-purple-500/30 shadow-md relative overflow-hidden text-left space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-mono font-bold text-pink-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> Creator Sparks
            </span>
            <span className="text-[10px] font-mono bg-pink-500/20 text-pink-300 border border-pink-500/30 px-2 py-0.5 rounded-full">
              Monetized
            </span>
          </div>

          <div>
            <div className="text-3xl font-mono font-black text-white tracking-tight">
              4,820 <span className="text-sm font-sans font-bold text-pink-400">Sparks</span>
            </div>
            <div className="text-xs font-mono text-zinc-400 mt-1">
              &approx; $48.20 USD (100 Sparks = $1.00 USD)
            </div>
          </div>

          <div className="flex gap-2.5 pt-2">
            <button className="flex-1 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-sans font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
              <CreditCard className="w-3.5 h-3.5" /> Payout Settings
            </button>
            <button className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-sans font-bold text-xs border border-white/10 transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
              <TrendingUp className="w-3.5 h-3.5" /> Analytics
            </button>
          </div>
        </div>
      </div>

      {/* Transaction History Ledger */}
      <div className="p-6 rounded-3xl bg-[#080614]/90 border border-white/10 shadow-md text-left space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <h3 className="text-sm font-sans font-bold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-400" /> Recent Transactions
          </h3>
          <span className="text-[10px] font-mono text-zinc-500">Live P2P Ledger</span>
        </div>

        <div className="space-y-3">
          {transactions.map(tx => (
            <div key={tx.id} className="p-3.5 rounded-2xl bg-white/5 border border-white/5 hover:border-emerald-500/30 transition-colors flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">{tx.title}</h4>
                  <span className="text-[10px] font-mono text-zinc-400">{tx.date}</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-mono font-bold text-emerald-400 block">{tx.amount}</span>
                <span className="text-[10px] font-mono text-zinc-500">{tx.value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
