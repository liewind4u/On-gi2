import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

interface ClientChatMessage {
  role: 'child' | 'counselor';
  text: string;
}

function getBearerToken(req: express.Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // Counseling reply via Gemini 4 Hydrogen (server-side only)
  app.post('/api/counseling/reply', async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          error: 'GEMINI_API_KEY가 설정되어 있지 않습니다. Settings > Secrets 패널에서 API 키를 확인해 주세요.',
        });
      }

      const { messages, moodLabel, childName } = req.body as {
        messages?: ClientChatMessage[];
        moodLabel?: string;
        childName?: string;
      };

      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: '상담 대화 내용이 비어 있습니다.' });
      }

      const safeName = (childName || '').trim() || '작은 친구';
      const safeMood = (moodLabel || '').trim() || '마음이 조금 지쳐 있어요';

      const conversationText = messages
        .slice(-16)
        .map((m) => `${m.role === 'child' ? safeName : '별빛 부엉이 상담사'}: ${m.text}`)
        .join('\n');

      const systemInstruction = `당신은 '별빛 쉼터'의 따뜻하고 다정한 아동 마음 상담사 '별빛 부엉이'입니다.
지치고 힘든 하루를 보낸 아이(초등~중학생 나이대)의 이야기를 판단 없이 들어주고, 마음을 포근하게 안아주는 역할을 합니다.

대화 원칙:
1. 아이의 감정을 먼저 있는 그대로 인정하고 공감하세요. ("그랬구나, 오늘 정말 많이 버겁고 힘들었겠다.", "속상한 마음이 드는 건 당연해.")
2. 훈계하거나 성급히 해결책을 강요하지 마세요. ("더 열심히 해봐", "긍정적으로 생각해" 같은 말 금지)
3. 초등학생도 편하게 읽을 수 있도록 부드럽고 쉬운 한국어 존댓말(해요체) 또는 다정한 말을 일관되게 사용하세요. (여기서는 아이를 존중하는 부드러운 해요체를 사용하세요.)
4. 답변(reply)은 3~5문장 정도로 부담스럽지 않고 따뜻하게 작성하세요.
5. 아이가 심하게 자해, 학대, 위험한 상황을 언급하면 즉시 믿을 수 있는 어른(부모님, 학교 선생님, 청소년 전화 1388)에게 도움을 청하도록 다정하고 분명하게 안내하세요.
6. gentleTip에는 지금 당장 10초 안에 해볼 수 있는 아주 작고 포근한 쉼 행동(예: "두 손을 가슴에 올리고 '괜찮아' 한 번 속삭여 보기", "창밖 먼 곳을 5초만 바라보기")을 한 문장으로 적어주세요.

아이 이름(애칭): ${safeName}
아이가 선택한 오늘의 마음: ${safeMood}`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `지금까지의 대화:\n${conversationText}\n\n위 대화에서 ${safeName}의 마지막 말에 따뜻하게 공감하고 위로하는 다음 답장을 작성해 주세요.`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: {
                type: Type.STRING,
                description: '아이에게 건네는 따뜻하고 공감 어린 상담 답변 (3~5문장, 해요체)',
              },
              gentleTip: {
                type: Type.STRING,
                description: '지금 바로 해볼 수 있는 작고 편안한 휴식 팁 1문장',
              },
            },
            required: ['reply', 'gentleTip'],
          },
        },
      });

      const rawText = (response.text ?? '').trim();
      const parsed = JSON.parse(rawText || '{}') as { reply?: string; gentleTip?: string };

      if (!parsed.reply) {
        return res.status(502).json({
          error: '상담 응답을 생성하는 중 잠시 문제가 생겼습니다. 다시 시도해 주세요.',
        });
      }

      return res.json({
        reply: parsed.reply,
        gentleTip: parsed.gentleTip || '따뜻한 물 한 모금을 천천히 마시며 어깨의 힘을 빼 보세요.',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '상담 응답 생성에 실패했습니다.';
      console.error('Counseling reply error:', error);
      return res.status(500).json({ error: message });
    }
  });

  // Summarize child's conversation into a gentle Heart Note draft for Google Chat
  app.post('/api/counseling/summarize-letter', async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          error: 'GEMINI_API_KEY가 설정되어 있지 않습니다. Settings > Secrets 패널에서 API 키를 확인해 주세요.',
        });
      }

      const { messages, moodLabel, childName } = req.body as {
        messages?: ClientChatMessage[];
        moodLabel?: string;
        childName?: string;
      };

      const safeName = (childName || '').trim() || '아이';
      const safeMood = (moodLabel || '').trim() || '마음이 지쳐 있어요';
      const conversationText = Array.isArray(messages)
        ? messages
            .slice(-16)
            .map((m) => `${m.role === 'child' ? safeName : '상담사'}: ${m.text}`)
            .join('\n')
        : '';

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `아이 이름(애칭): ${safeName}\n오늘의 마음 상태: ${safeMood}\n대화 내용:\n${conversationText || '(대화 시작 전)'}\n\n위 내용을 바탕으로, 담임 선생님이나 전문 상담 선생님(또는 보호자)에게 Google Chat 공간으로 조심스럽게 전할 수 있는 정중하고 따뜻한 '마음 편지' 초안을 한국어로 작성해 주세요. 아이의 비밀이나 과도한 감정을 과장하지 말고, 현재 기분과 어떤 따뜻한 말이나 휴식이 도움이 될지 3~4줄로 정리해 주세요.`,
        config: {
          systemInstruction:
            '당신은 아동의 마음을 어른에게 부드럽고 정확하게 전달하는 다리 역할을 합니다. 지나치게 무겁거나 판단하는 어조를 피하고, 아이가 안전하고 존중받는 느낌이 들도록 단정하고 따뜻한 편지 초안을 작성하세요.',
        },
      });

      const letter = (response.text ?? '').trim();
      if (!letter) {
        return res.status(502).json({ error: '마음 편지 초안을 만들지 못했습니다.' });
      }

      return res.json({ letter });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '마음 편지 초안 생성에 실패했습니다.';
      console.error('Summarize letter error:', error);
      return res.status(500).json({ error: message });
    }
  });

  // Google Chat API: List spaces
  app.get('/api/chat/spaces', async (req, res) => {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Google 계정 인증 토큰이 필요합니다.' });
    }

    try {
      const upstream = await fetch('https://chat.googleapis.com/v1/spaces?pageSize=50', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await upstream.json();
      if (!upstream.ok) {
        return res.status(upstream.status).json(data);
      }

      return res.json(data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Google Chat 공간 목록 조회 중 오류가 발생했습니다.';
      return res.status(500).json({ error: { message } });
    }
  });

  // Google Chat API: List messages in a space
  app.get('/api/chat/spaces/:spaceId/messages', async (req, res) => {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Google 계정 인증 토큰이 필요합니다.' });
    }

    const { spaceId } = req.params;
    try {
      const upstream = await fetch(
        `https://chat.googleapis.com/v1/spaces/${encodeURIComponent(spaceId)}/messages?pageSize=25&orderBy=createTime%20desc`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await upstream.json();
      if (!upstream.ok) {
        return res.status(upstream.status).json(data);
      }

      return res.json(data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Google Chat 메시지 조회 중 오류가 발생했습니다.';
      return res.status(500).json({ error: { message } });
    }
  });

  // Google Chat API: Send message to a space
  app.post('/api/chat/spaces/:spaceId/messages', async (req, res) => {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Google 계정 인증 토큰이 필요합니다.' });
    }

    const { spaceId } = req.params;
    const { text } = req.body as { text?: string };
    if (!text || !text.trim()) {
      return res.status(400).json({ error: { message: '보낼 메시지 내용을 입력해 주세요.' } });
    }

    try {
      const upstream = await fetch(
        `https://chat.googleapis.com/v1/spaces/${encodeURIComponent(spaceId)}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: text.trim() }),
        }
      );

      const data = await upstream.json();
      if (!upstream.ok) {
        return res.status(upstream.status).json(data);
      }

      return res.json(data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Google Chat 메시지 전송 중 오류가 발생했습니다.';
      return res.status(500).json({ error: { message } });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

startServer();
