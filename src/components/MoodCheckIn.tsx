import React, { useState } from 'react';
import { ArrowRight, Check, HeartHandshake, Wind } from 'lucide-react';
import { MoodOption } from '../types';

export const MOOD_OPTIONS: MoodOption[] = [
  {
    id: 'exhausted',
    label: '몸도 마음도 무겁고 지쳤어요',
    description: '숙제, 학원, 일정 때문에 기운이 다 빠진 기분이에요.',
    warmReply: '오늘 하루를 버텨내느라 정말 많은 힘을 썼구나. 지금 이 자리에서는 아무것도 잘하려고 애쓰지 않아도 괜찮아요.',
    suggestedPrompt: '오늘 해야 할 일이 너무 많아서 몸도 마음도 너무 지쳤어요.',
  },
  {
    id: 'upset',
    label: '마음이 먹먹하고 속상해요',
    description: '말로 다 하기 어려운 서운함이나 답답함이 쌓여 있어요.',
    warmReply: '혼자 속으로 삼키느라 마음이 많이 무거웠겠다. 네가 느낀 속상함은 결코 사소하지 않아요.',
    suggestedPrompt: '오늘 있었던 일 때문에 마음이 자꾸 먹먹하고 속상해요.',
  },
  {
    id: 'lonely',
    label: '혼자인 것 같아 외로워요',
    description: '내 편이 아무도 없는 것처럼 마음이 쓸쓸해요.',
    warmReply: '사람들 사이에 있어도 문득 혼자 남겨진 기분이 들 때가 있지. 지금은 내가 네 이야기 끝까지 곁에서 들어줄게.',
    suggestedPrompt: '누구에게도 내 마음을 말하기 어려워서 혼자인 것처럼 외로워요.',
  },
  {
    id: 'worried',
    label: '앞일이 자꾸 걱정되고 불안해요',
    description: '내일이나 다가올 일 생각에 마음이 편히 놓이지 않아요.',
    warmReply: '아직 오지 않은 일까지 미리 걱정하느라 마음이 쉴 틈이 없었구나. 잠깐만 멈춰서 지금 여기에서 숨을 골라 보자.',
    suggestedPrompt: '앞으로 잘할 수 있을지 자꾸 걱정이 되고 마음이 불안해요.',
  },
  {
    id: 'quiet-rest',
    label: '말없이 조용히 쉬고 싶어요',
    description: '대답하거나 설명할 힘조차 없어서 조용한 쉼이 필요해요.',
    warmReply: '억지로 말하지 않아도 괜찮아. 그저 조용히 기대어 숨을 고르면서 마음을 쉬게 해 주자.',
    suggestedPrompt: '지금은 긴 이야기보다 조용히 위로받고 쉬고 싶어요.',
  },
];

interface MoodCheckInProps {
  selectedMood: MoodOption;
  onSelectMood: (mood: MoodOption) => void;
  childName: string;
  onChangeChildName: (name: string) => void;
  onStartCounseling: (promptText?: string) => void;
  onGoToBreathing: () => void;
}

export const MoodCheckIn: React.FC<MoodCheckInProps> = ({
  selectedMood,
  onSelectMood,
  childName,
  onChangeChildName,
  onStartCounseling,
  onGoToBreathing,
}) => {
  const [imageError, setImageError] = useState(false);

  return (
    <section aria-labelledby="checkin-heading" className="space-y-10">
      {/* Two-column balanced hero split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-8 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span>아동 마음 돌봄 공간</span>
              <span aria-hidden="true">·</span>
              <span>비밀 보장 대화</span>
              <span aria-hidden="true">·</span>
              <span>언제든 멈추고 쉴 수 있어요</span>
            </div>

            <div className="space-y-3">
              <h1
                id="checkin-heading"
                className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 leading-tight"
              >
                오늘 하루도 정말 많이 애썼어요
              </h1>
              <p className="text-base text-slate-600 leading-relaxed max-w-xl">
                지치고 힘든 날에는 잘하려는 마음을 잠깐 내려놓아도 괜찮아요.
                지금 네 마음을 가볍게 골라 주면, 별빛 부엉이가 따뜻하게 이야기를 들어줄게요.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <label htmlFor="child-nickname" className="block text-sm font-medium text-slate-700">
                어떻게 불러주면 좋을까요? (비워두면 &lsquo;작은 별&rsquo;로 부를게요)
              </label>
              <input
                id="child-nickname"
                type="text"
                maxLength={20}
                value={childName}
                onChange={(e) => onChangeChildName(e.target.value)}
                placeholder="예: 민준, 지우, 작은 구름"
                className="w-full max-w-sm px-4 py-2.5 text-sm bg-[#F7F9FB] border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1F6E6C] focus:ring-2 focus:ring-[#1F6E6C]/15 transition-colors"
              />
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 space-y-4">
            <p className="text-sm text-[#1F6E6C] font-medium leading-relaxed">
              {selectedMood.warmReply}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onStartCounseling(selectedMood.suggestedPrompt)}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#1F6E6C] hover:bg-[#185755] rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1F6E6C]"
              >
                <HeartHandshake className="w-4 h-4" aria-hidden="true" />
                <span>이 마음으로 이야기 나누기</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={onGoToBreathing}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-700 bg-[#EDF2F7] hover:bg-slate-200 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              >
                <Wind className="w-4 h-4" aria-hidden="true" />
                <span>말 없이 숨 고르기</span>
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col">
          {!imageError ? (
            <img
              src="/src/assets/images/hero_comfort_room_1795417873376.jpg"
              alt="따뜻한 햇살이 드는 조용한 창가 쉼터 일러스트"
              referrerPolicy="no-referrer"
              onError={() => setImageError(true)}
              className="w-full h-72 lg:h-full object-cover"
            />
          ) : (
            <div className="w-full h-72 lg:h-full min-h-[320px] bg-gradient-to-br from-[#ECF6F5] via-[#F7F9FB] to-[#E2E8F0] flex flex-col items-center justify-center p-8 text-center">
              <HeartHandshake className="w-10 h-10 text-[#1F6E6C] mb-3" aria-hidden="true" />
              <p className="text-base font-medium text-slate-800">포근한 창가 마음 쉼터</p>
              <p className="text-sm text-slate-500 mt-1">잠시 기대어 쉬어가도 괜찮은 공간이에요</p>
            </div>
          )}
        </div>
      </div>

      {/* 5-column / responsive mood selector grid */}
      <div className="space-y-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-xl font-semibold text-slate-900">
            지금 내 마음에 가장 가까운 기분을 골라보세요
          </h2>
          <span className="text-xs text-slate-500 whitespace-nowrap shrink-0">
            5가지 마음 상태 중 선택
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {MOOD_OPTIONS.map((mood) => {
            const isSelected = mood.id === selectedMood.id;
            return (
              <button
                key={mood.id}
                type="button"
                onClick={() => onSelectMood(mood)}
                aria-pressed={isSelected}
                className={`text-left p-5 rounded-2xl border transition-colors flex flex-col justify-between gap-4 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1F6E6C] ${
                  isSelected
                    ? 'bg-[#ECF6F5] border-[#1F6E6C] text-slate-900'
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-xs font-medium ${
                        isSelected ? 'text-[#1F6E6C]' : 'text-slate-400'
                      }`}
                    >
                      {isSelected ? '선택됨' : '마음 카드'}
                    </span>
                    {isSelected && (
                      <Check className="w-4 h-4 text-[#1F6E6C] shrink-0" aria-hidden="true" />
                    )}
                  </div>
                  <h3 className="text-base font-semibold leading-snug text-slate-900">
                    {mood.label}
                  </h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {mood.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
