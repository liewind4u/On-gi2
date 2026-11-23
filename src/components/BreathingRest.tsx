import React, { useEffect, useState } from 'react';
import { Pause, Play, RotateCcw, Wind } from 'lucide-react';

type BreathingMode = 'deep' | 'gentle';

interface PhaseConfig {
  label: string;
  guidance: string;
  seconds: number;
  targetScale: number;
}

const BREATHING_PRESETS: Record<
  BreathingMode,
  { name: string; summary: string; phases: PhaseConfig[] }
> = {
  deep: {
    name: '4-4-6 깊은 진정 호흡',
    summary: '가슴이 답답하거나 눈물이 날 때 마음을 천천히 가라앉혀 줘요.',
    phases: [
      {
        label: '숨 들이마시기',
        guidance: '코로 부드럽게 숨을 들이마시며 배가 부풀어 오르는 걸 느껴 보세요.',
        seconds: 4,
        targetScale: 1.18,
      },
      {
        label: '잠시 멈추기',
        guidance: '들이마신 따뜻한 공기를 가슴 속에 포근하게 머금어 주세요.',
        seconds: 4,
        targetScale: 1.18,
      },
      {
        label: '길게 내쉬기',
        guidance: '입으로 후— 하고 무거운 마음을 멀리 날려 보내듯 내쉬어요.',
        seconds: 6,
        targetScale: 0.92,
      },
    ],
  },
  gentle: {
    name: '4-2-4 가벼운 쉼 호흡',
    summary: '지치고 기운이 없을 때 부담 없이 따라 하기 좋은 편안한 리듬이에요.',
    phases: [
      {
        label: '숨 들이마시기',
        guidance: '어깨의 힘을 툭 풀고 천천히 맑은 공기를 들이마셔요.',
        seconds: 4,
        targetScale: 1.15,
      },
      {
        label: '잠시 멈추기',
        guidance: '마음속으로 "괜찮아" 하고 조용히 한 번 되뇌어 보세요.',
        seconds: 2,
        targetScale: 1.15,
      },
      {
        label: '편안히 내쉬기',
        guidance: '긴장이 녹아내리도록 천천히 숨을 끝까지 내쉬어요.',
        seconds: 4,
        targetScale: 0.94,
      },
    ],
  },
};

export const BreathingRest: React.FC = () => {
  const [mode, setMode] = useState<BreathingMode>('deep');
  const [isRunning, setIsRunning] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(BREATHING_PRESETS.deep.phases[0].seconds);
  const [completedCycles, setCompletedCycles] = useState(0);
  const [imageError, setImageError] = useState(false);

  const currentPreset = BREATHING_PRESETS[mode];
  const currentPhase = currentPreset.phases[phaseIndex];

  useEffect(() => {
    if (!isRunning) return;

    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev > 1) {
          return prev - 1;
        }

        setPhaseIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % currentPreset.phases.length;
          if (nextIndex === 0) {
            setCompletedCycles((c) => c + 1);
          }
          setSecondsLeft(currentPreset.phases[nextIndex].seconds);
          return nextIndex;
        });

        return prev;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isRunning, currentPreset]);

  const handleModeChange = (nextMode: BreathingMode) => {
    setMode(nextMode);
    setIsRunning(false);
    setPhaseIndex(0);
    setSecondsLeft(BREATHING_PRESETS[nextMode].phases[0].seconds);
  };

  const handleReset = () => {
    setIsRunning(false);
    setPhaseIndex(0);
    setSecondsLeft(currentPreset.phases[0].seconds);
    setCompletedCycles(0);
  };

  const visualScale = isRunning ? currentPhase.targetScale : 1;

  return (
    <section aria-labelledby="breathing-heading" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
      {/* Left 60% Stage */}
      <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-8 flex flex-col justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>마음 진정 연습</span>
            <span aria-hidden="true">·</span>
            <span>{currentPreset.name}</span>
          </div>
          <h2 id="breathing-heading" className="text-2xl font-semibold text-slate-900">
            잠시 말없이 숨을 고르며 쉬어가요
          </h2>
          <p className="text-sm text-slate-600">{currentPreset.summary}</p>
        </div>

        {/* Interactive Breathing Ripple Stage */}
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-[#EDF2F7] min-h-[320px] flex items-center justify-center p-8">
          {!imageError && (
            <img
              src="/src/assets/images/breathing_pond_calm_1795417873272.jpg"
              alt="잔잔한 연못 물결 일러스트"
              referrerPolicy="no-referrer"
              onError={() => setImageError(true)}
              className="absolute inset-0 w-full h-full object-cover opacity-35"
            />
          )}
          <div className="relative z-10 flex flex-col items-center justify-center text-center gap-6">
            <div
              style={{
                transform: `scale(${visualScale})`,
              }}
              className="w-44 h-44 rounded-full bg-white/90 border border-[#1F6E6C]/30 shadow-sm flex flex-col items-center justify-center transition-transform duration-1000 ease-out"
            >
              <span className="text-xs font-medium text-[#1F6E6C]">
                {isRunning ? currentPhase.label : '준비됨'}
              </span>
              <span className="text-4xl font-semibold text-slate-900 font-mono-nums mt-1">
                {secondsLeft}s
              </span>
            </div>

            <p className="max-w-md text-sm font-medium text-slate-800 bg-white/90 border border-slate-200/80 rounded-xl px-5 py-3">
              {isRunning
                ? currentPhase.guidance
                : '시작 버튼을 누르면 화면의 원이 천천히 커지고 작아지며 호흡 박자를 맞춰 줄 거예요.'}
            </p>
          </div>
        </div>
      </div>

      {/* Right 40% Controls */}
      <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-8 flex flex-col justify-between gap-6">
        <div className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-slate-900">호흡 리듬 선택</h3>
            <div className="grid grid-cols-1 gap-3">
              {(['deep', 'gentle'] as BreathingMode[]).map((presetKey) => {
                const preset = BREATHING_PRESETS[presetKey];
                const active = mode === presetKey;
                return (
                  <button
                    key={presetKey}
                    type="button"
                    onClick={() => handleModeChange(presetKey)}
                    className={`text-left p-4 rounded-xl border transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#ECF6F5] border-[#1F6E6C] text-slate-900'
                        : 'bg-[#F7F9FB] border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{preset.name}</span>
                      <span className="text-xs font-mono-nums text-slate-500">
                        {preset.phases.map((p) => `${p.seconds}s`).join('-')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{preset.summary}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">완료한 호흡 바퀴</span>
              <span className="font-mono-nums font-semibold text-slate-900">
                {completedCycles}회
              </span>
            </div>

            <div className="space-y-2">
              {currentPreset.phases.map((p, idx) => {
                const isCurrent = isRunning && idx === phaseIndex;
                return (
                  <div
                    key={p.label}
                    className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm ${
                      isCurrent
                        ? 'bg-[#ECF6F5] border-[#1F6E6C] text-slate-900 font-medium'
                        : 'bg-[#F7F9FB] border-slate-200 text-slate-600'
                    }`}
                  >
                    <span>{p.label}</span>
                    <span className="font-mono-nums text-xs">{p.seconds}초</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setIsRunning((r) => !r)}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-medium text-white bg-[#1F6E6C] hover:bg-[#185755] rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4" aria-hidden="true" />
                <span>잠시 멈춤</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" aria-hidden="true" />
                <span>숨 고르기 시작</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-slate-700 bg-[#EDF2F7] hover:bg-slate-200 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            <span>처음으로</span>
          </button>
        </div>
      </div>
    </section>
  );
};
