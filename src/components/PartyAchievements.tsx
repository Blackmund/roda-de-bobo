import React from 'react';
import { motion } from 'motion/react';
import { PartyAchievement } from '../utils/achievements';
import { Award, Sparkles, Flame, Crown, Target, Zap } from 'lucide-react';

interface PartyAchievementsProps {
  achievements: PartyAchievement[];
}

export const PartyAchievements: React.FC<PartyAchievementsProps> = ({ achievements }) => {
  if (!achievements || achievements.length === 0) return null;

  const getAccentStyles = (accent: PartyAchievement['accent']) => {
    switch (accent) {
      case 'rose':
        return {
          border: 'border-rose-500/70 hover:border-rose-400',
          bg: 'bg-gradient-to-br from-rose-950/40 via-[#0a060d] to-black',
          badgeBg: 'bg-rose-500 text-white',
          tagText: 'text-rose-300',
          metricBorder: 'border-rose-400/60 bg-rose-950/80 text-rose-200',
          shadow: 'hover:shadow-[0_0_24px_rgba(244,63,94,0.35)]',
          icon: <Flame size={15} className="text-rose-400" />
        };
      case 'amber':
        return {
          border: 'border-amber-500/70 hover:border-amber-400',
          bg: 'bg-gradient-to-br from-amber-950/40 via-[#0e0c06] to-black',
          badgeBg: 'bg-amber-400 text-black',
          tagText: 'text-amber-300',
          metricBorder: 'border-amber-400/60 bg-amber-950/80 text-amber-200',
          shadow: 'hover:shadow-[0_0_24px_rgba(251,191,36,0.35)]',
          icon: <Crown size={15} className="text-amber-400" />
        };
      case 'purple':
        return {
          border: 'border-purple-500/70 hover:border-purple-400',
          bg: 'bg-gradient-to-br from-purple-950/40 via-[#0c0612] to-black',
          badgeBg: 'bg-purple-500 text-white',
          tagText: 'text-purple-300',
          metricBorder: 'border-purple-400/60 bg-purple-950/80 text-purple-200',
          shadow: 'hover:shadow-[0_0_24px_rgba(168,85,247,0.35)]',
          icon: <Sparkles size={15} className="text-purple-400" />
        };
      case 'cyan':
      default:
        return {
          border: 'border-cyan-400/70 hover:border-cyan-300',
          bg: 'bg-gradient-to-br from-cyan-950/40 via-[#060c12] to-black',
          badgeBg: 'bg-cyan-400 text-black',
          tagText: 'text-cyan-300',
          metricBorder: 'border-cyan-400/60 bg-cyan-950/80 text-cyan-200',
          shadow: 'hover:shadow-[0_0_24px_rgba(6,182,212,0.35)]',
          icon: <Target size={15} className="text-cyan-400" />
        };
    }
  };

  return (
    <motion.section
      data-testid="party-achievements-section"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.18 }}
      className="max-w-2xl mx-auto border-2 border-amber-400/80 bg-[#07080f] shadow-2xl overflow-hidden"
    >
      {/* Header Bar */}
      <div className="px-4 py-3 bg-gradient-to-r from-amber-950/80 via-black to-purple-950/80 border-b border-amber-500/50 flex flex-wrap items-center justify-between gap-2 select-none">
        <div className="flex items-center gap-2">
          <Award size={18} className="text-amber-400" />
          <h2 className="font-anton text-sm md:text-base text-white tracking-wider uppercase">
            PARTY ACHIEVEMENTS
          </h2>
          <span className="text-[10px] font-mono-code font-bold uppercase tracking-wider px-2 py-0.5 bg-amber-400/20 text-amber-300 border border-amber-400/40">
            DESTAQUES DA PARTIDA
          </span>
        </div>
        <div className="text-[10px] font-mono-code text-amber-200/80 font-bold uppercase tracking-widest flex items-center gap-1.5">
          <Zap size={11} className="text-amber-400" />
          <span>RECONHECIMENTO COLETIVO</span>
        </div>
      </div>

      {/* Accolades Cards Grid */}
      <div className="p-4 md:p-5 grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {achievements.map((item, idx) => {
          const styles = getAccentStyles(item.accent);

          return (
            <motion.div
              key={item.id}
              data-testid={`achievement-card-${item.id}`}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, delay: 0.22 + idx * 0.08 }}
              className={`p-3.5 border-2 ${styles.border} ${styles.bg} ${styles.shadow} transition-all duration-200 flex flex-col justify-between gap-3 relative overflow-hidden group`}
            >
              {/* Top Tag & Accolade Title */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className={`text-[10px] font-mono-code font-bold uppercase tracking-wider flex items-center gap-1 ${styles.tagText}`}>
                    {styles.icon}
                    <span>{item.tag}</span>
                  </span>
                  <span className="text-xl filter drop-shadow">{item.badge}</span>
                </div>

                <h3 className="font-anton text-base md:text-lg text-white tracking-wide uppercase leading-tight group-hover:text-amber-200 transition-colors">
                  {item.title}
                </h3>
              </div>

              {/* Awarded Player Spotlight */}
              <div className="flex items-center gap-3 bg-black/60 p-2 border border-slate-800">
                <div className="w-10 h-10 border border-amber-400/60 bg-amber-500/10 flex items-center justify-center text-xl shrink-0 shadow-inner">
                  {item.playerAvatar}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-anton text-sm text-white uppercase truncate">
                      {item.playerName}
                    </span>
                    <span
                      className={`text-[9px] font-mono-code font-bold uppercase px-1.5 py-0.2 border ${
                        item.playerTeam === 'A'
                          ? 'border-rose-400/80 bg-rose-950/80 text-rose-300'
                          : 'border-cyan-400/80 bg-cyan-950/80 text-cyan-300'
                      }`}
                    >
                      {item.teamName}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono-code text-amber-300/90 font-semibold truncate">
                    ⭐ {item.playerTitleBadge}
                  </div>
                </div>
              </div>

              {/* Description & Metric Pill */}
              <div className="space-y-2 border-t border-slate-800/80 pt-2">
                <p className="text-[11px] font-mono-code text-slate-300 leading-snug">
                  {item.description}
                </p>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9px] font-mono-code text-slate-400 uppercase font-bold tracking-wider">
                    {item.metricLabel}
                  </span>
                  <span
                    className={`px-2 py-0.5 border text-[10px] font-mono-code font-bold uppercase tracking-wider ${styles.metricBorder}`}
                  >
                    {item.metricValue}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
};
