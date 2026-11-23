import React, { useEffect, useRef, useState } from 'react';
import { Feather, Send, Sparkles } from 'lucide-react';
import { CounselingMessage, MoodOption } from '../types';

interface CounselingChatProps {
  selectedMood: MoodOption;
  childName: string;
  messages: CounselingMessage[];
  onMessagesChange: React.Dispatch<React.SetStateAction<CounselingMessage[]>>;
  onDraftReadyForGoogleChat: (draftText: string) => void;
}

const STARTER_PROMPTS = [
  '오늘 학원이랑 숙제가 너무 많아서 지쳤어요.',
  '친구랑 있었던 일 때문에 마음이 무겁고 속상해요.',
  '별일 없는데 자꾸 기운이 빠지고 눈물이 나요.',
  '그냥 누군가 "오늘 고생 많았어" 하고 다정하게 말해줬으면 좋겠어요.',
];

function formatTime(): string {
  const now = new Date();
  return now.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export const CounselingChat: React.FC<CounselingChatProps> = ({
  selectedMood,
  childName,
  messages,
  onMessagesChange,
  onDraftReadyForGoogleChat,
}) => {
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState(false);
  const scrollEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const displayName = childName.trim() || '작은 별';

  const sendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isSending) return;

    setErrorMsg(null);
    const childMsg: CounselingMessage = {
      id: `child-${Date.now()}`,
      role: 'child',
      text: trimmed,
      timestamp: formatTime(),
    };

    const nextMessages = [...messages, childMsg];
    onMessagesChange(nextMessages);
    setInputText('');
    setIsSending(true);

    try {
      const response = await fetch('/api/counseling/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, text: m.text })),
          moodLabel: selectedMood.label,
          childName: displayName,
        }),
      });

      const data = (await response.json()) as {
        reply?: string;
        gentleTip?: string;
        error?: string;
      };

      if (!response.ok || !data.reply) {
        throw new Error(data.error || '상담 답변을 불러오지 못했습니다.');
      }

      const counselorMsg: CounselingMessage = {
        id: `counselor-${Date.now()}`,
        role: 'counselor',
        text: data.reply,
        gentleTip: data.gentleTip,
        timestamp: formatTime(),
      };
      onMessagesChange((prev) => [...prev, counselorMsg]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '대화 전송 중 오류가 발생했습니다.';
      setErrorMsg(msg);
    } finally {
      setIsSending(false);
    }
  };

  const handleDraftLetter = async () => {
    if (isSummarizing) return;
    setErrorMsg(null);
    setIsSummarizing(true);

    try {
      const response = await fetch('/api/counseling/summarize-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map((m) => ({ role: m.role, text: m.text })),
          moodLabel: selectedMood.label,
          childName: displayName,
        }),
      });

      const data = (await response.json()) as { letter?: string; error?: string };
      if (!response.ok || !data.letter) {
        throw new Error(data.error || '마음 편지 초안을 만들지 못했습니다.');
      }

      onDraftReadyForGoogleChat(data.letter);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '초안 생성 중 오류가 발생했습니다.';
      setErrorMsg(msg);
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <section aria-labelledby="counseling-heading" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left Column: Counselor Info & Quick Prompts */}
      <aside className="lg:col-span-4 space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden border border-slate-200 bg-[#ECF6F5] shrink-0">
              {!avatarError ? (
                <img
                  src="/src/assets/images/counselor_avatar_starlight_1795417873314.jpg"
                  alt="별빛 부엉이 상담사 일러스트"
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#1F6E6C]">
                  <Sparkles className="w-6 h-6" aria-hidden="true" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h2 id="counseling-heading" className="text-lg font-semibold text-slate-900">
                별빛 부엉이 상담실
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {displayName}님의 이야기 · {selectedMood.label}
              </p>
            </div>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed">
            어떤 말도 괜찮아요. 맞춤법이 틀려도, 짧은 단어 하나만 적어도 괜찮아요.
            마음이 조금 정리되면 선생님이나 상담 공간에 보낼 &lsquo;마음 편지&rsquo; 초안도 함께 써 줄게요.
          </p>

          <button
            type="button"
            onClick={handleDraftLetter}
            disabled={isSummarizing}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-[#1F6E6C] bg-[#ECF6F5] hover:bg-[#dcefeb] border border-[#1F6E6C]/25 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
          >
            <Feather className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{isSummarizing ? '마음 편지 초안 쓰는 중...' : '선생님께 보낼 마음 편지 만들기'}</span>
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">말 꺼내기 어려울 때 눌러보세요</h3>
          <div className="space-y-2">
            {STARTER_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                disabled={isSending}
                onClick={() => sendMessage(prompt)}
                className="w-full text-left px-4 py-3 text-xs leading-relaxed text-slate-700 bg-[#F7F9FB] hover:bg-[#EDF2F7] border border-slate-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Right Column: Main Counseling Conversation */}
      <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl flex flex-col min-h-[580px] max-h-[680px]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-medium text-slate-800">{displayName}님과 별빛 부엉이</span>
            <span aria-hidden="true">·</span>
            <span>판단 없이 듣는 시간</span>
          </div>
          <span className="text-xs font-mono-nums text-slate-400">
            대화 {messages.length}건
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          {messages.map((msg) => {
            const isChild = msg.role === 'child';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isChild ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-1.5">
                  <span>{isChild ? displayName : '별빛 부엉이'}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-nums">{msg.timestamp}</span>
                </div>
                <div
                  className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    isChild
                      ? 'bg-[#1F6E6C] text-white'
                      : 'bg-[#F7F9FB] border border-slate-200 text-slate-800'
                  }`}
                >
                  {msg.text}
                </div>
                {!isChild && msg.gentleTip && (
                  <div className="mt-2 max-w-[85%] bg-[#ECF6F5] border border-[#1F6E6C]/20 rounded-xl px-4 py-2.5 text-xs text-[#185755] leading-relaxed">
                    작은 쉼 제안: {msg.gentleTip}
                  </div>
                )}
              </div>
            );
          })}

          {isSending && (
            <div className="flex flex-col items-start">
              <span className="text-xs text-slate-400 mb-1.5">별빛 부엉이</span>
              <div className="bg-[#F7F9FB] border border-slate-200 rounded-2xl px-5 py-3.5 text-sm text-slate-500">
                따뜻한 마음을 담아 답장을 적고 있어요...
              </div>
            </div>
          )}

          <div ref={scrollEndRef} />
        </div>

        {errorMsg && (
          <div className="mx-6 mb-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
            오류: {errorMsg}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(inputText);
          }}
          className="p-4 border-t border-slate-100 bg-[#F7F9FB] rounded-b-2xl space-y-2"
        >
          <div className="flex items-end gap-3">
            <textarea
              rows={2}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(inputText);
                }
              }}
              placeholder="오늘 힘들었던 일이나 지금 드는 생각을 편하게 적어 보세요..."
              className="flex-1 resize-none px-4 py-3 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1F6E6C] focus:ring-2 focus:ring-[#1F6E6C]/15"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isSending}
              className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium text-white bg-[#1F6E6C] hover:bg-[#185755] disabled:opacity-50 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Send className="w-4 h-4" aria-hidden="true" />
              <span>보내기</span>
            </button>
          </div>
          <p className="text-xs text-slate-500 px-1">
            혼자 감당하기 너무 힘든 일이 있을 때는 청소년 전화 1388이나 믿을 수 있는 어른에게 바로 도움을 요청하세요.
          </p>
        </form>
      </div>
    </section>
  );
};
