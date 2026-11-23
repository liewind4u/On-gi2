import React, { useCallback, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { BreathingRest } from './components/BreathingRest';
import { CounselingChat } from './components/CounselingChat';
import { GoogleChatBridge } from './components/GoogleChatBridge';
import { MOOD_OPTIONS, MoodCheckIn } from './components/MoodCheckIn';
import { googleSignIn, initAuth } from './lib/firebaseAuth';
import { ActiveSection, CounselingMessage, MoodOption } from './types';

function createInitialMessages(mood: MoodOption, childName: string): CounselingMessage[] {
  const safeName = childName.trim() || '작은 별';
  return [
    {
      id: 'welcome-1',
      role: 'counselor',
      text: `${safeName}님, 별빛 쉼터에 잘 왔어요. ${mood.warmReply}\n지금 머릿속이나 가슴 속에 맴도는 이야기가 있다면 편하게 들려줄래요?`,
      gentleTip: '어깨를 귀 쪽으로 살짝 올렸다가 후— 하고 툭 내려놓아 보세요.',
      timestamp: new Date().toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
    },
  ];
}

export default function App() {
  const [activeSection, setActiveSection] = useState<ActiveSection>('checkin');
  const [selectedMood, setSelectedMood] = useState<MoodOption>(MOOD_OPTIONS[0]);
  const [childName, setChildName] = useState('');
  const [messages, setMessages] = useState<CounselingMessage[]>(() =>
    createInitialMessages(MOOD_OPTIONS[0], '')
  );
  const [googleChatDraft, setGoogleChatDraft] = useState('');

  const [user, setUser] = useState<User | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleAuthChange = useCallback((nextUser: User | null, nextNeedsAuth: boolean) => {
    setUser(nextUser);
    setNeedsAuth(nextNeedsAuth);
  }, []);

  useEffect(() => {
    const unsubscribe = initAuth(
      (authedUser) => {
        setUser(authedUser);
        setNeedsAuth(false);
      },
      (existingUser) => {
        setUser(existingUser);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleHeaderPrimaryAction = async () => {
    if (needsAuth) {
      setIsLoggingIn(true);
      try {
        const result = await googleSignIn();
        setUser(result.user);
        setNeedsAuth(false);
        setActiveSection('chat');
      } catch (err) {
        console.error('Header login failed:', err);
        setActiveSection('chat');
      } finally {
        setIsLoggingIn(false);
      }
    } else {
      setActiveSection('chat');
    }
  };

  const handleStartCounseling = async () => {
    setActiveSection('counseling');
    setMessages((prev) => {
      const hasChildReply = prev.some((m) => m.role === 'child');
      if (hasChildReply) return prev;
      return createInitialMessages(selectedMood, childName);
    });
  };

  const handleDraftReadyForGoogleChat = (draftText: string) => {
    setGoogleChatDraft(draftText);
    setActiveSection('chat');
  };

  const navItems: { id: ActiveSection; label: string }[] = [
    { id: 'checkin', label: '오늘의 마음' },
    { id: 'counseling', label: '마음 대화' },
    { id: 'breathing', label: '숨 고르기' },
    { id: 'chat', label: '선생님 연결' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F9FB] text-slate-900">
      {/* Three-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single text wordmark */}
          <button
            type="button"
            onClick={() => setActiveSection('checkin')}
            className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
          >
            별빛 쉼터
          </button>

          {/* Zone 2: 4 concise single-line text nav links */}
          <nav aria-label="주요 메뉴" className="hidden md:flex items-center gap-7">
            {navItems.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  className={`py-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                    isActive
                      ? 'text-[#1F6E6C] border-[#1F6E6C]'
                      : 'text-slate-600 border-transparent hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={handleHeaderPrimaryAction}
              disabled={isLoggingIn}
              className="px-4 py-2 text-xs font-medium text-white bg-[#1F6E6C] hover:bg-[#185755] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
            >
              {needsAuth ? (isLoggingIn ? '연결 중...' : 'Google 연결') : '마음 편지 보내기'}
            </button>
          </div>
        </div>

        {/* Mobile sub-navigation row (kept compact) */}
        <div className="md:hidden border-t border-slate-100 px-4 py-2 flex items-center justify-between gap-2 overflow-x-auto">
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#ECF6F5] text-[#1F6E6C]'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10">
        {activeSection === 'checkin' && (
          <MoodCheckIn
            selectedMood={selectedMood}
            onSelectMood={setSelectedMood}
            childName={childName}
            onChangeChildName={setChildName}
            onStartCounseling={handleStartCounseling}
            onGoToBreathing={() => setActiveSection('breathing')}
          />
        )}

        {activeSection === 'counseling' && (
          <CounselingChat
            selectedMood={selectedMood}
            childName={childName}
            messages={messages}
            onMessagesChange={setMessages}
            onDraftReadyForGoogleChat={handleDraftReadyForGoogleChat}
          />
        )}

        {activeSection === 'breathing' && <BreathingRest />}

        {activeSection === 'chat' && (
          <GoogleChatBridge
            draftMessage={googleChatDraft}
            onDraftMessageChange={setGoogleChatDraft}
            user={user}
            needsAuth={needsAuth}
            onAuthChange={handleAuthChange}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>별빛 쉼터 · 지친 아이들을 위한 마음 돌봄 공간</span>
          <span>긴급 상담이 필요할 때: 청소년 전화 1388 · 문자 #1388</span>
        </div>
      </footer>
    </div>
  );
}
