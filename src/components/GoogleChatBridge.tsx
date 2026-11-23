import React, { useCallback, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  LogOut,
  MessageSquare,
  RefreshCw,
  Send,
  X,
} from 'lucide-react';
import {
  clearAccessToken,
  FIREBASE_PROJECT_ID,
  getAccessToken,
  googleSignIn,
  initAuth,
  logout,
} from '../lib/firebaseAuth';
import { GoogleChatMessage, GoogleChatSpace } from '../types';
import { GoogleSignInButton } from './GoogleSignInButton';

interface GoogleChatBridgeProps {
  draftMessage: string;
  onDraftMessageChange: (text: string) => void;
  user: User | null;
  needsAuth: boolean;
  onAuthChange: (user: User | null, needsAuth: boolean) => void;
}

const CHAT_CONSOLE_URL = `https://console.cloud.google.com/apis/api/chat.googleapis.com/hangouts-chat?project=${FIREBASE_PROJECT_ID}`;

function extractSpaceId(spaceName: string): string {
  return spaceName.replace(/^spaces\//, '');
}

function formatChatTime(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export const GoogleChatBridge: React.FC<GoogleChatBridgeProps> = ({
  draftMessage,
  onDraftMessageChange,
  user,
  needsAuth,
  onAuthChange,
}) => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [spaces, setSpaces] = useState<GoogleChatSpace[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<GoogleChatSpace | null>(null);
  const [spaceMessages, setSpaceMessages] = useState<GoogleChatMessage[]>([]);
  const [loadingSpaces, setLoadingSpaces] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [chatApiError, setChatApiError] = useState<{ status?: number; message: string } | null>(null);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [sendSuccessMsg, setSendSuccessMsg] = useState<string | null>(null);

  const loadSpaces = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) {
      onAuthChange(user, true);
      return;
    }

    setLoadingSpaces(true);
    setChatApiError(null);

    try {
      const res = await fetch('/api/chat/spaces', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (res.status === 401) {
        clearAccessToken();
        onAuthChange(user, true);
        return;
      }

      if (!res.ok) {
        const message =
          data?.error?.message || data?.error || 'Google Chat 공간 목록을 불러오지 못했습니다.';
        setChatApiError({ status: res.status, message });
        setSpaces([]);
        return;
      }

      const list: GoogleChatSpace[] = Array.isArray(data.spaces) ? data.spaces : [];
      setSpaces(list);
      if (list.length > 0) {
        setSelectedSpace((prev) => {
          if (prev && list.some((s) => s.name === prev.name)) return prev;
          return list[0];
        });
      } else {
        setSelectedSpace(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google Chat 연결 중 오류가 발생했습니다.';
      setChatApiError({ message: msg });
    } finally {
      setLoadingSpaces(false);
    }
  }, [onAuthChange, user]);

  const loadMessages = useCallback(
    async (space: GoogleChatSpace) => {
      const token = await getAccessToken();
      if (!token) {
        onAuthChange(user, true);
        return;
      }

      setLoadingMessages(true);
      setChatApiError(null);

      try {
        const spaceId = extractSpaceId(space.name);
        const res = await fetch(`/api/chat/spaces/${encodeURIComponent(spaceId)}/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (res.status === 401) {
          clearAccessToken();
          onAuthChange(user, true);
          return;
        }

        if (!res.ok) {
          const message =
            data?.error?.message || data?.error || 'Google Chat 대화를 불러오지 못했습니다.';
          setChatApiError({ status: res.status, message });
          setSpaceMessages([]);
          return;
        }

        const rawMessages: GoogleChatMessage[] = Array.isArray(data.messages) ? data.messages : [];
        setSpaceMessages([...rawMessages].reverse());
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '메시지를 불러오는 중 오류가 발생했습니다.';
        setChatApiError({ message: msg });
      } finally {
        setLoadingMessages(false);
      }
    },
    [onAuthChange, user]
  );

  useEffect(() => {
    const unsubscribe = initAuth(
      (authedUser) => {
        onAuthChange(authedUser, false);
      },
      (existingUser) => {
        onAuthChange(existingUser, true);
      }
    );
    return () => unsubscribe();
  }, [onAuthChange]);

  useEffect(() => {
    if (!needsAuth) {
      loadSpaces();
    }
  }, [needsAuth, loadSpaces]);

  useEffect(() => {
    if (!needsAuth && selectedSpace) {
      loadMessages(selectedSpace);
    }
  }, [needsAuth, selectedSpace, loadMessages]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const result = await googleSignIn();
      onAuthChange(result.user, false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google 로그인에 실패했습니다.';
      setAuthError(msg);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setSpaces([]);
    setSelectedSpace(null);
    setSpaceMessages([]);
    setChatApiError(null);
    onAuthChange(null, true);
  };

  const handleConfirmSend = async () => {
    if (!selectedSpace || !draftMessage.trim() || isSendingMessage) return;

    const token = await getAccessToken();
    if (!token) {
      setShowConfirmModal(false);
      onAuthChange(user, true);
      return;
    }

    setIsSendingMessage(true);
    setChatApiError(null);
    setSendSuccessMsg(null);

    try {
      const spaceId = extractSpaceId(selectedSpace.name);
      const res = await fetch(`/api/chat/spaces/${encodeURIComponent(spaceId)}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: draftMessage.trim() }),
      });

      const data = await res.json();
      if (res.status === 401) {
        clearAccessToken();
        setShowConfirmModal(false);
        onAuthChange(user, true);
        return;
      }

      if (!res.ok) {
        const message =
          data?.error?.message || data?.error || 'Google Chat 메시지 전송에 실패했습니다.';
        setChatApiError({ status: res.status, message });
        setShowConfirmModal(false);
        return;
      }

      setShowConfirmModal(false);
      onDraftMessageChange('');
      setSendSuccessMsg(
        `'${selectedSpace.displayName || selectedSpace.name}' 공간에 따뜻한 메시지를 전송했습니다.`
      );
      await loadMessages(selectedSpace);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '메시지 전송 중 오류가 발생했습니다.';
      setChatApiError({ message: msg });
      setShowConfirmModal(false);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const isChatAppNotConfiguredError =
    chatApiError?.status === 404 ||
    (chatApiError?.message || '').toLowerCase().includes('chat app not found');

  return (
    <section aria-labelledby="google-chat-heading" className="space-y-6">
      {/* Header & Prerequisite Guidance */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>Google Chat 연동</span>
            <span aria-hidden="true">·</span>
            <span>선생님 및 상담 공간 연결</span>
          </div>
          <h2 id="google-chat-heading" className="text-2xl font-semibold text-slate-900">
            따뜻한 마음 편지를 Google Chat 상담 공간에 전해요
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            사용자의 허락을 받아 Google Chat 공간과 메시지를 확인하고, 아이를 응원하거나
            상담실에 도움을 요청하는 마음 편지를 직접 보낼 수 있습니다. 전송 전에는 항상 확인 창이 열립니다.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {needsAuth ? (
            <GoogleSignInButton onClick={handleLogin} disabled={isLoggingIn} />
          ) : (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-900">
                  {user?.displayName || 'Google Workspace 사용자'}
                </p>
                <p className="text-xs text-slate-500">{user?.email || '연결됨'}</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-[#EDF2F7] hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                <span>로그아웃</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Upfront Prerequisites Notice */}
      <div className="bg-[#EDF2F7] border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1 text-xs text-slate-700 leading-relaxed">
          <p className="font-semibold text-slate-900">Google Chat 이용 전 확인 사항</p>
          <p>
            1) 개인 <span className="font-mono">@gmail.com</span> 계정이 아닌{' '}
            <strong>Business 또는 Enterprise Google Workspace 계정</strong>이 필요합니다.{' '}
            2) 프로젝트(
            <span className="font-mono">{FIREBASE_PROJECT_ID}</span>)의{' '}
            <strong>Google Chat API &gt; Configuration</strong> 페이지에서 앱 이름·아바타 URL·설명을 한 번 저장해야 합니다.
          </p>
        </div>
        <a
          href={CHAT_CONSOLE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-[#1F6E6C] bg-white border border-slate-200 hover:border-[#1F6E6C] rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <span>Chat 앱 설정 열기</span>
          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
        </a>
      </div>

      {authError && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 text-sm text-red-700">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="font-medium">Google 로그인 중 문제가 발생했습니다.</p>
            <p className="text-xs mt-1">{authError}</p>
          </div>
        </div>
      )}

      {chatApiError && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3 text-sm text-amber-950">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1.5">
              <p className="font-semibold">
                Google Chat API 응답 안내 {chatApiError.status ? `(HTTP ${chatApiError.status})` : ''}
              </p>
              <p className="text-xs font-mono bg-white/80 border border-amber-200 rounded-lg px-3 py-2 text-amber-900 break-words">
                {chatApiError.message}
              </p>
              {isChatAppNotConfiguredError ? (
                <p className="text-xs text-amber-900 leading-relaxed">
                  아직 Google Cloud Console에서 Google Chat 앱 기본 정보(앱 이름, 아바타 URL, 설명)가 설정되지 않았습니다.
                  아래 링크에서 설정을 저장한 뒤 &lsquo;공간 새로고침&rsquo;을 눌러주세요.
                </p>
              ) : (
                <p className="text-xs text-amber-900 leading-relaxed">
                  개인용 @gmail.com 계정은 Google Chat API가 지원되지 않으며, Business 또는 Enterprise Google Workspace 계정으로 로그인해야 공간을 조회할 수 있습니다.
                </p>
              )}
              <div className="pt-1">
                <a
                  href={CHAT_CONSOLE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1F6E6C] hover:underline"
                >
                  <span>Google Cloud Console &gt; Google Chat API Configuration 바로가기</span>
                  <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {sendSuccessMsg && (
        <div className="bg-[#ECF6F5] border border-[#1F6E6C]/30 rounded-2xl p-4 flex items-center gap-3 text-sm text-[#185755]">
          <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
          <span>{sendSuccessMsg}</span>
        </div>
      )}

      {/* Workspace Spaces + Message Viewer + Composer */}
      {needsAuth ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-4">
          <MessageSquare className="w-10 h-10 text-[#1F6E6C] mx-auto" aria-hidden="true" />
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-lg font-semibold text-slate-900">
              Google Workspace 계정으로 연결해 주세요
            </h3>
            <p className="text-sm text-slate-600">
              로그인하시면 소속 학교 또는 상담 팀의 Google Chat 공간 목록을 불러와
              작성한 마음 편지를 안전하게 전달할 수 있습니다.
            </p>
          </div>
          <div className="pt-2 flex justify-center">
            <GoogleSignInButton onClick={handleLogin} disabled={isLoggingIn} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Spaces Sidebar */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">상담 공간 목록</h3>
              <button
                type="button"
                onClick={loadSpaces}
                disabled={loadingSpaces}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-[#F7F9FB] hover:bg-[#EDF2F7] border border-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingSpaces ? 'animate-spin' : ''}`} aria-hidden="true" />
                <span>공간 새로고침</span>
              </button>
            </div>

            {loadingSpaces ? (
              <div className="space-y-2 py-4">
                <div className="h-12 bg-slate-100 rounded-xl animate-pulse" />
                <div className="h-12 bg-slate-100 rounded-xl animate-pulse" />
              </div>
            ) : spaces.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <p className="text-sm font-medium text-slate-700">표시할 공간이 없습니다</p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Google Workspace 계정의 Google Chat에 참여 중인 스페이스가 있으면 여기에 표시됩니다.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {spaces.map((space) => {
                  const active = selectedSpace?.name === space.name;
                  return (
                    <button
                      key={space.name}
                      type="button"
                      onClick={() => setSelectedSpace(space)}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#ECF6F5] border-[#1F6E6C] text-slate-900'
                          : 'bg-[#F7F9FB] border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <p className="text-sm font-medium truncate">
                        {space.displayName || space.name}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {space.spaceType || space.type || 'Google Chat 공간'}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected Space Messages & Composer */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl flex flex-col min-h-[460px]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-slate-900 truncate">
                  {selectedSpace
                    ? selectedSpace.displayName || selectedSpace.name
                    : '공간을 선택해 주세요'}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedSpace
                    ? '최근 대화 확인 및 마음 편지 전송'
                    : '왼쪽 목록에서 대화할 상담 공간을 선택하세요'}
                </p>
              </div>
              {selectedSpace && (
                <button
                  type="button"
                  onClick={() => loadMessages(selectedSpace)}
                  disabled={loadingMessages}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-[#F7F9FB] border border-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingMessages ? 'animate-spin' : ''}`} aria-hidden="true" />
                  <span>대화 새로고침</span>
                </button>
              )}
            </div>

            <div className="flex-1 p-6 space-y-3 max-h-[300px] overflow-y-auto">
              {!selectedSpace ? (
                <p className="text-sm text-slate-500 text-center py-10">
                  선택된 Google Chat 공간이 없습니다.
                </p>
              ) : loadingMessages ? (
                <div className="space-y-3">
                  <div className="h-14 bg-slate-100 rounded-xl animate-pulse" />
                  <div className="h-14 bg-slate-100 rounded-xl animate-pulse" />
                </div>
              ) : spaceMessages.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-10">
                  이 공간에는 아직 표시할 최근 메시지가 없습니다. 아래에서 첫 따뜻한 인사를 보내보세요.
                </p>
              ) : (
                spaceMessages.map((msg) => (
                  <div
                    key={msg.name}
                    className="p-4 rounded-xl bg-[#F7F9FB] border border-slate-200 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                      <span className="font-medium text-slate-800">
                        {msg.sender?.displayName || msg.sender?.name || '참여자'}
                      </span>
                      <span className="font-mono-nums">{formatChatTime(msg.createTime)}</span>
                    </div>
                    <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                      {msg.text || '(첨부 메시지)'}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Composer */}
            <div className="p-5 border-t border-slate-100 bg-[#F7F9FB] rounded-b-2xl space-y-3">
              <label htmlFor="google-chat-composer" className="block text-xs font-semibold text-slate-700">
                Google Chat 공간으로 보낼 마음 편지 / 응원 메시지
              </label>
              <textarea
                id="google-chat-composer"
                rows={4}
                value={draftMessage}
                onChange={(e) => onDraftMessageChange(e.target.value)}
                placeholder="마음 대화 탭에서 만든 '마음 편지 초안'이 여기에 자동으로 채워지거나, 직접 따뜻한 메시지를 작성할 수 있어요."
                className="w-full resize-y px-4 py-3 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1F6E6C] focus:ring-2 focus:ring-[#1F6E6C]/15"
              />
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-slate-500">
                  보내기 전 최종 확인 창에서 내용을 다시 한 번 검토합니다.
                </span>
                <button
                  type="button"
                  disabled={!selectedSpace || !draftMessage.trim()}
                  onClick={() => setShowConfirmModal(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#1F6E6C] hover:bg-[#185755] disabled:opacity-50 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Send className="w-4 h-4" aria-hidden="true" />
                  <span>Google Chat으로 보내기</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mandatory Explicit Confirmation Dialog before sending message to Google Chat */}
      {showConfirmModal && selectedSpace && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-send-title"
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h3 id="confirm-send-title" className="text-lg font-semibold text-slate-900">
                  Google Chat으로 메시지를 전송할까요?
                </h3>
                <p className="text-xs text-slate-500">
                  전송 후에는 선택한 Google Chat 공간의 참여자들이 내용을 볼 수 있습니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                aria-label="닫기"
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="bg-[#F7F9FB] border border-slate-200 rounded-xl px-4 py-3">
                <span className="text-xs text-slate-500 block">받는 Google Chat 공간</span>
                <span className="font-semibold text-slate-900">
                  {selectedSpace.displayName || selectedSpace.name}
                </span>
              </div>

              <div className="bg-[#F7F9FB] border border-slate-200 rounded-xl px-4 py-3 max-h-48 overflow-y-auto">
                <span className="text-xs text-slate-500 block mb-1">전송할 내용</span>
                <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {draftMessage.trim()}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSendingMessage}
                className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-[#EDF2F7] hover:bg-slate-200 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmSend}
                disabled={isSendingMessage}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#1F6E6C] hover:bg-[#185755] disabled:opacity-60 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Send className="w-4 h-4" aria-hidden="true" />
                <span>{isSendingMessage ? '전송 중...' : '전송 확인'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
