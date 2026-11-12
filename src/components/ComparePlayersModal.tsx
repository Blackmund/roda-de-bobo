import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { Crown, Medal, Target, Award } from 'lucide-react';
import { X, Swords, Sparkles } from './rdb/rdbIcons';
import { RetroWindow } from './rdb/RetroWindow';
import type { MatchPlayerComparison } from '../utils/sessionPersistence';
import { PlayerMark } from './rdb/PlayerMark';

interface ComparePlayersModalProps {
  isOpen: boolean;
  onClose: () => void;
  comparison: MatchPlayerComparison;
}

const COMPACT_AXIS_LABELS: Record<string, string> = {
  'Total Points': 'Points',
  Accuracy: 'Accuracy',
  'Pts / Round': 'Pts/Rnd',
  'Rounds Won': 'Rounds Won',
  'Match Impact': 'Impact'
};

export const ComparePlayersModal: React.FC<ComparePlayersModalProps> = ({
  isOpen,
  onClose,
  comparison
}) => {
  const [chartViewMode, setChartViewMode] = useState<'overlaid' | 'dual'>('overlaid');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const { mvp, runnerUp, axes } = comparison;

  const radarData = axes.map((axis) => ({
    ...axis,
    compactSubject: COMPACT_AXIS_LABELS[axis.subject] || axis.subject
  }));

  const mvpAvgPts =
    mvp.roundsPlayed > 0 ? Math.round((mvp.score / mvp.roundsPlayed) * 10) / 10 : mvp.score;
  const runnerAvgPts =
    runnerUp.roundsPlayed > 0
      ? Math.round((runnerUp.score / runnerUp.roundsPlayed) * 10) / 10
      : runnerUp.score;

  // Count how many radar dimensions each contender leads
  const mvpCategoryWins = axes.filter((a) => a.mvpScore >= a.runnerUpScore).length;
  const runnerUpCategoryWins = axes.filter((a) => a.runnerUpScore > a.mvpScore).length;

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          data-testid="compare-players-modal-backdrop"
          onClick={onClose}
          className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
        >
          <RetroWindow
            data-testid="compare-players-modal"
            titleId="compare-players-modal-title"
            title="COMPARAR JOGADORES · MVP VS 2º COLOCADO"
            subtitle="Análise Tática Lado a Lado · Radar de Performance"
            icon={<Swords size={16} />}
            onClose={onClose}
            closeTestId="close-compare-players-modal"
            tone="cyan"
            className="w-full max-w-4xl max-h-[85dvh] my-auto"
          >
            

            <div className="p-4 sm:p-5 space-y-4">
              {/* Top Contenders Side-by-Side Header Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* #1 MVP Card */}
                <div
                  data-testid="compare-mvp-player-card"
                  className="p-3.5 border-2 border-amber-400/90 bg-gradient-to-r from-amber-950/60 via-[#141004] to-black flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 border-2 border-amber-300 bg-amber-500/20 flex items-center justify-center text-2xl relative shrink-0">
                      <span><PlayerMark p={mvp} /></span>
                      <span className="absolute -top-2 -right-2 bg-amber-400 text-black p-0.5 border border-black">
                        <Crown size={11} className="fill-black" />
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] font-mono-code font-bold uppercase text-amber-300">
                        <span>#1 MVP</span>
                        <span>·</span>
                        <span className="text-amber-200/80 truncate">{mvp.teamName}</span>
                      </div>
                      <div
                        data-testid="compare-mvp-name"
                        className="font-anton text-xl sm:text-2xl text-amber-200 uppercase tracking-wide truncate"
                      >
                        {mvp.name}
                      </div>
                      <div className="text-[11px] font-mono-code text-slate-300">
                        ACC <strong className="text-amber-300">{mvp.accuracy}%</strong> ·{' '}
                        {mvp.roundsWon}/{mvp.roundsPlayed}R
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-[9px] font-mono-code uppercase text-amber-300/80 font-bold">
                      TOTAL
                    </div>
                    <div
                      data-testid="compare-mvp-score"
                      className="font-anton text-2xl sm:text-3xl text-amber-400 leading-none whitespace-nowrap"
                    >
                      {mvp.score} PTS
                    </div>
                    <div className="text-[10px] font-mono-code text-amber-200/80 mt-1 whitespace-nowrap">
                      {mvpAvgPts} PTS/R
                    </div>
                  </div>
                </div>

                {/* #2 Runner-Up Card */}
                <div
                  data-testid="compare-runnerup-player-card"
                  className="p-3.5 border-2 border-cyan-400/80 bg-gradient-to-r from-cyan-950/55 via-[#061318] to-black flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 border-2 border-cyan-300 bg-cyan-500/20 flex items-center justify-center text-2xl relative shrink-0">
                      <span><PlayerMark p={runnerUp} /></span>
                      <span className="absolute -top-2 -right-2 bg-cyan-400 text-black p-0.5 border border-black">
                        <Medal size={11} />
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] font-mono-code font-bold uppercase text-cyan-300">
                        <span>#2 VICE-MVP</span>
                        <span>·</span>
                        <span className="text-cyan-200/80 truncate">{runnerUp.teamName}</span>
                      </div>
                      <div
                        data-testid="compare-runnerup-name"
                        className="font-anton text-xl sm:text-2xl text-cyan-200 uppercase tracking-wide truncate"
                      >
                        {runnerUp.name}
                      </div>
                      <div className="text-[11px] font-mono-code text-slate-300">
                        ACC <strong className="text-cyan-300">{runnerUp.accuracy}%</strong> ·{' '}
                        {runnerUp.roundsWon}/{runnerUp.roundsPlayed}R
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-[9px] font-mono-code uppercase text-cyan-300/80 font-bold">
                      TOTAL
                    </div>
                    <div
                      data-testid="compare-runnerup-score"
                      className="font-anton text-2xl sm:text-3xl text-cyan-400 leading-none whitespace-nowrap"
                    >
                      {runnerUp.score} PTS
                    </div>
                    <div className="text-[10px] font-mono-code text-cyan-200/80 mt-1 whitespace-nowrap">
                      {runnerAvgPts} PTS/R
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Side-by-Side Comparison Workspace: Radar Chart(s) + Head-to-Head Metric Bars */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                {/* Left Column: Recharts Radar Chart Visualization (7 cols) */}
                <div
                  data-testid="compare-players-radar-section"
                  className="lg:col-span-7 border border-slate-800 bg-[#0b0d19] p-3.5 flex flex-col justify-between"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
                    <div>
                      <div className="font-anton text-sm sm:text-base text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles size={14} className="text-amber-400" />
                        <span>RADAR DE ATRIBUTOS (0–100)</span>
                      </div>
                      <div className="text-[10px] font-mono-code text-slate-400">
                        Comparativo multidimensional normalizado da partida
                      </div>
                    </div>

                    {/* Interactive Chart View Mode Switcher */}
                    <div className="flex items-center gap-1 bg-black/70 p-1 border border-slate-800">
                      <button
                        type="button"
                        data-testid="radar-mode-overlaid"
                        onClick={() => setChartViewMode('overlaid')}
                        className={`px-2.5 py-1 font-mono-code text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                          chartViewMode === 'overlaid'
                            ? 'bg-amber-400 text-black'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Sobreposto
                      </button>
                      <button
                        type="button"
                        data-testid="radar-mode-dual"
                        onClick={() => setChartViewMode('dual')}
                        className={`px-2.5 py-1 font-mono-code text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                          chartViewMode === 'dual'
                            ? 'bg-cyan-400 text-black'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Lado a Lado
                      </button>
                    </div>
                  </div>

                  {/* Radar Chart Container */}
                  {chartViewMode === 'overlaid' ? (
                    <div
                      data-testid="recharts-radar-overlaid"
                      className="w-full h-[270px] sm:h-[295px] pt-2"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart
                          cx="50%"
                          cy="52%"
                          outerRadius="62%"
                          margin={{ top: 10, right: 28, bottom: 10, left: 28 }}
                          data={radarData}
                        >
                          <PolarGrid stroke="#334155" strokeDasharray="3 3" />
                          <PolarAngleAxis
                            dataKey="compactSubject"
                            tick={{
                              fill: '#E2E8F0',
                              fontSize: 11,
                              fontFamily: 'JetBrains Mono, monospace',
                              fontWeight: 700
                            }}
                          />
                          <PolarRadiusAxis
                            angle={90}
                            domain={[0, 100]}
                            tickCount={5}
                            tick={{ fill: '#64748B', fontSize: 9 }}
                            axisLine={false}
                          />
                          <Radar
                            name={`#1 ${mvp.name} (MVP)`}
                            dataKey="mvpScore"
                            stroke="#FBBF24"
                            strokeWidth={2.5}
                            fill="#FBBF24"
                            fillOpacity={0.38}
                            isAnimationActive={false}
                          />
                          <Radar
                            name={`#2 ${runnerUp.name}`}
                            dataKey="runnerUpScore"
                            stroke="#22D3EE"
                            strokeWidth={2.5}
                            fill="#22D3EE"
                            fillOpacity={0.28}
                            isAnimationActive={false}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#07080d',
                              borderColor: '#FBBF24',
                              borderRadius: 0,
                              fontFamily: 'JetBrains Mono, monospace',
                              fontSize: '11px',
                              color: '#F8FAFC'
                            }}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div
                      data-testid="recharts-radar-dual"
                      className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2"
                    >
                      <div className="h-[245px] border border-amber-500/25 bg-black/40 p-2 flex flex-col">
                        <div className="text-[10px] font-mono-code font-bold text-amber-300 uppercase text-center truncate">
                          #1 {mvp.name} ({mvp.score} PTS)
                        </div>
                        <div className="flex-1 min-h-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart
                              cx="50%"
                              cy="52%"
                              outerRadius="54%"
                              margin={{ top: 8, right: 22, bottom: 8, left: 22 }}
                              data={radarData}
                            >
                              <PolarGrid stroke="#334155" />
                              <PolarAngleAxis
                                dataKey="compactSubject"
                                tick={{
                                  fill: '#FDE68A',
                                  fontSize: 9,
                                  fontFamily: 'JetBrains Mono, monospace'
                                }}
                              />
                              <PolarRadiusAxis
                                angle={90}
                                domain={[0, 100]}
                                tick={false}
                                axisLine={false}
                              />
                              <Radar
                                name={mvp.name}
                                dataKey="mvpScore"
                                stroke="#FBBF24"
                                strokeWidth={2.5}
                                fill="#FBBF24"
                                fillOpacity={0.45}
                                isAnimationActive={false}
                              />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="h-[245px] border border-cyan-500/25 bg-black/40 p-2 flex flex-col">
                        <div className="text-[10px] font-mono-code font-bold text-cyan-300 uppercase text-center truncate">
                          #2 {runnerUp.name} ({runnerUp.score} PTS)
                        </div>
                        <div className="flex-1 min-h-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart
                              cx="50%"
                              cy="52%"
                              outerRadius="54%"
                              margin={{ top: 8, right: 22, bottom: 8, left: 22 }}
                              data={radarData}
                            >
                              <PolarGrid stroke="#334155" />
                              <PolarAngleAxis
                                dataKey="compactSubject"
                                tick={{
                                  fill: '#A5F3FC',
                                  fontSize: 9,
                                  fontFamily: 'JetBrains Mono, monospace'
                                }}
                              />
                              <PolarRadiusAxis
                                angle={90}
                                domain={[0, 100]}
                                tick={false}
                                axisLine={false}
                              />
                              <Radar
                                name={runnerUp.name}
                                dataKey="runnerUpScore"
                                stroke="#22D3EE"
                                strokeWidth={2.5}
                                fill="#22D3EE"
                                fillOpacity={0.4}
                                isAnimationActive={false}
                              />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Legend & Summary Footer */}
                  <div className="pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono-code">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5 text-amber-300 font-bold">
                        <span className="w-3 h-3 bg-amber-400 border border-amber-200 inline-block" />
                        <span>{mvp.name} (MVP)</span>
                      </span>
                      <span className="flex items-center gap-1.5 text-cyan-300 font-bold">
                        <span className="w-3 h-3 bg-cyan-400 border border-cyan-200 inline-block" />
                        <span>{runnerUp.name} (#2)</span>
                      </span>
                    </div>
                    <div className="text-slate-400">
                      Vantagem em categorias:{' '}
                      <strong className="text-amber-300">{mvpCategoryWins}</strong> x{' '}
                      <strong className="text-cyan-300">{runnerUpCategoryWins}</strong>
                    </div>
                  </div>
                </div>

                {/* Right Column: Side-by-Side Metric Breakdown Table (5 cols) */}
                <div
                  data-testid="compare-players-metrics-breakdown"
                  className="lg:col-span-5 border border-slate-800 bg-[#0b0d19] p-3.5 flex flex-col justify-between space-y-3"
                >
                  <div className="pb-2 border-b border-slate-800/80">
                    <div className="font-anton text-sm sm:text-base text-white uppercase tracking-wider">
                      COMPARATIVO DIRETO POR MÉTRICA
                    </div>
                    <div className="text-[10px] font-mono-code text-slate-400">
                      Valores brutos da partida e índice normalizado
                    </div>
                  </div>

                  <div className="space-y-2.5 flex-1 flex flex-col justify-center">
                    {axes.map((axis) => {
                      const mvpLeads = axis.mvpScore > axis.runnerUpScore;
                      const runnerLeads = axis.runnerUpScore > axis.mvpScore;
                      return (
                        <div
                          key={axis.key}
                          data-testid={`compare-axis-${axis.key}`}
                          className="p-2.5 bg-black/60 border border-slate-800/90 space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-[11px] font-mono-code">
                            <span className="text-amber-300 font-bold flex items-center gap-1">
                              <span>{axis.mvpRawLabel}</span>
                              {mvpLeads && (
                                <Award size={11} className="text-amber-400 shrink-0" />
                              )}
                            </span>
                            <span className="text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                              {axis.subject}
                            </span>
                            <span className="text-cyan-300 font-bold flex items-center gap-1">
                              {runnerLeads && (
                                <Award size={11} className="text-cyan-400 shrink-0" />
                              )}
                              <span>{axis.runnerUpRawLabel}</span>
                            </span>
                          </div>

                          {/* Dual Progress Comparison Bar */}
                          <div className="grid grid-cols-2 gap-1.5 items-center">
                            <div className="h-2 bg-slate-900 overflow-hidden flex justify-end">
                              <div
                                className="h-full bg-gradient-to-l from-amber-400 to-amber-600"
                                style={{ width: `${Math.max(6, axis.mvpScore)}%` }}
                              />
                            </div>
                            <div className="h-2 bg-slate-900 overflow-hidden flex justify-start">
                              <div
                                className="h-full bg-gradient-to-r from-cyan-400 to-cyan-600"
                                style={{ width: `${Math.max(6, axis.runnerUpScore)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary Insight Callout */}
                  <div className="p-2.5 border border-amber-500/30 bg-amber-950/25 text-[11px] font-mono-code text-amber-200/90 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Target size={13} className="text-amber-400 shrink-0" />
                      <span>
                        Vantagem MVP:{' '}
                        <strong className="text-amber-300">
                          +{Math.max(0, mvp.score - runnerUp.score)} PTS
                        </strong>
                      </span>
                    </div>
                    <span className="text-[10px] text-amber-300 font-bold uppercase">
                      ACC: {mvp.accuracy}% vs {runnerUp.accuracy}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </RetroWindow>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
