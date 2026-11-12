import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import OpenAI from 'openai';
import parrotImg from './assets/parrot.png';
import worldmapImg from './assets/worldmap.png';
import frFlag from './assets/fr-flag.png';
import spFlag from './assets/sp-flag.png';
import jpnFlag from './assets/jpn-flag.png';

const LANGUAGES = [
  { code: 'fr', name: 'French', nativeName: 'Français', speechLocale: 'fr-FR', flagSrc: frFlag },
  { code: 'es', name: 'Spanish', nativeName: 'Español', speechLocale: 'es-ES', flagSrc: spFlag },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', speechLocale: 'ja-JP', flagSrc: jpnFlag }
];

const ENV = (typeof import.meta !== 'undefined' && import.meta.env) || {};
const GENERIC_ENV_KEY = ENV.AI_KEY || ENV.VITE_AI_KEY || '';
const GENERIC_ENV_URL = (ENV.AI_URL || ENV.VITE_AI_URL || '').trim();
const GENERIC_ENV_MODEL = (ENV.AI_MODEL || ENV.VITE_AI_MODEL || '').trim();

function detectEnvEngine(url) {
  const lower = url.toLowerCase();
  if (!lower) return 'openrouter';
  if (lower.includes('groq.com')) return 'groq';
  if (lower.includes('api.openai.com')) return 'openai';
  if (lower.includes('openrouter.ai')) return 'openrouter';
  return 'custom';
}

const INITIAL_ENGINE = detectEnvEngine(GENERIC_ENV_URL);

const PROVIDERS = {
  openrouter: {
    id: 'openrouter',
    label: 'OpenRouter',
    baseURL: 'https://openrouter.ai/api/v1',
    keyPlaceholder: 'sk-or-v1-...',
    envKey: ENV.VITE_OPENROUTER_API_KEY || (INITIAL_ENGINE === 'openrouter' ? GENERIC_ENV_KEY : ''),
    defaultModel:
      ENV.VITE_OPENROUTER_MODEL ||
      (INITIAL_ENGINE === 'openrouter' && GENERIC_ENV_MODEL) ||
      'nvidia/nemotron-nano-9b-v2:free',
    models: [
      { id: 'nvidia/nemotron-nano-9b-v2:free', label: 'NVIDIA Nemotron Nano 9B v2 (Free)' },
      { id: 'nvidia/nemotron-3-nano-30b-a3b:free', label: 'NVIDIA Nemotron 3 Nano 30B (Free)' },
      { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Meta Llama 3.3 70B Instruct (Free)' },
      { id: 'google/gemma-3-27b-it:free', label: 'Google Gemma 3 27B IT (Free)' },
      { id: 'qwen/qwen3-next-80b-a3b-instruct:free', label: 'Qwen3 Next 80B Instruct (Free)' },
      { id: 'openai/gpt-4o-mini', label: 'OpenAI GPT-4o mini' },
      { id: 'google/gemini-2.5-flash', label: 'Google Gemini 2.5 Flash' },
      { id: 'openrouter/auto', label: 'OpenRouter Auto Router' }
    ]
  },
  groq: {
    id: 'groq',
    label: 'Groq',
    baseURL: 'https://api.groq.com/openai/v1',
    keyPlaceholder: 'gsk_...',
    envKey: ENV.VITE_GROQ_API_KEY || (INITIAL_ENGINE === 'groq' ? GENERIC_ENV_KEY : ''),
    defaultModel:
      ENV.VITE_GROQ_MODEL ||
      (INITIAL_ENGINE === 'groq' && GENERIC_ENV_MODEL) ||
      'llama-3.3-70b-versatile',
    models: [
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile (Free tier)' },
      { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant (Free tier)' },
      { id: 'meta-llama/llama-4-scout-17b-16e-instruct', label: 'Llama 4 Scout 17B (Free tier)' },
      { id: 'qwen/qwen3-32b', label: 'Qwen3 32B (Free tier)' },
      { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B (Free tier)' }
    ]
  },
  openai: {
    id: 'openai',
    label: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    keyPlaceholder: 'sk-...',
    envKey: ENV.VITE_OPENAI_API_KEY || (INITIAL_ENGINE === 'openai' ? GENERIC_ENV_KEY : ''),
    defaultModel:
      ENV.VITE_OPENAI_MODEL ||
      (INITIAL_ENGINE === 'openai' && GENERIC_ENV_MODEL) ||
      'gpt-4o-mini',
    models: [
      { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
      { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini' },
      { id: 'gpt-4.1-nano', label: 'GPT-4.1 nano' },
      { id: 'gpt-4o', label: 'GPT-4o' }
    ]
  },
  custom: {
    id: 'custom',
    label: 'Custom',
    baseURL: INITIAL_ENGINE === 'custom' && GENERIC_ENV_URL ? GENERIC_ENV_URL : 'http://localhost:11434/v1',
    keyPlaceholder: 'API key for your endpoint',
    envKey: INITIAL_ENGINE === 'custom' ? GENERIC_ENV_KEY : '',
    defaultModel: (INITIAL_ENGINE === 'custom' && GENERIC_ENV_MODEL) || 'llama3.2',
    models: []
  }
};

const STORAGE_KEYS = {
  MESSAGES: 'pollyglot_messages_v2',
  SETTINGS: 'pollyglot_settings_v4',
  LANG: 'pollyglot_target_lang_v2'
};

const DEFAULT_SETTINGS = {
  engine: INITIAL_ENGINE, // 'openrouter' | 'groq' | 'openai' | 'custom' | 'builtin'
  apiKeys: {
    openrouter: PROVIDERS.openrouter.envKey,
    groq: PROVIDERS.groq.envKey,
    openai: PROVIDERS.openai.envKey,
    custom: PROVIDERS.custom.envKey
  },
  models: {
    openrouter: PROVIDERS.openrouter.defaultModel,
    groq: PROVIDERS.groq.defaultModel,
    openai: PROVIDERS.openai.defaultModel,
    custom: PROVIDERS.custom.defaultModel
  },
  baseURLs: {
    openrouter: PROVIDERS.openrouter.baseURL,
    groq: PROVIDERS.groq.baseURL,
    openai: PROVIDERS.openai.baseURL,
    custom: PROVIDERS.custom.baseURL
  },
  imageModel: 'google/gemini-2.5-flash-image',
  autoSpeak: false,
  showPhonetics: true,
  simulateError: false
};

const GREETING_MESSAGE = {
  id: 'greeting',
  sender: 'polly',
  text: 'Select the language you want me to translate into, type your text and hit send!',
  phonetic: '',
  note: '',
  alternative: '',
  langCode: 'en',
  isGreeting: true
};

const QUICK_EXAMPLES = [
  'How are you?',
  'Where is the coffee shop?',
  'I love learning languages!'
];

class PollyError extends Error {
  constructor(code, message, { retryable = false, canFallbackOffline = false, needsApiKey = false } = {}) {
    super(message);
    this.name = 'PollyError';
    this.code = code;
    this.retryable = retryable;
    this.canFallbackOffline = canFallbackOffline;
    this.needsApiKey = needsApiKey;
  }
}

function getLanguageByCode(code) {
  return LANGUAGES.find((l) => l.code === code) || LANGUAGES[0];
}

function createId() {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// Built-in offline fallback dictionary for zero-config testing & offline recovery
const OFFLINE_PHRASEBOOK = {
  'how are you': {
    fr: {
      text: 'Comment allez-vous ?',
      alt: 'Salut, ça va ? (casual)',
      examples: [
        'Bonjour Madame, comment allez-vous ? — Hello Ma’am, how are you?',
        'Comment allez-vous aujourd’hui ? — How are you today?'
      ],
      history: 'Uses the polite plural pronoun "vous" paired with "aller" (to go), rooted in medieval courtly French.'
    },
    es: {
      text: '¿Cómo estás?',
      alt: '¿Cómo está usted? (formal)',
      examples: [
        '¡Hola! ¿Cómo estás hoy? — Hi! How are you today?',
        '¿Cómo estás, amigo? — How are you, friend?'
      ],
      history: 'Uses "estar" (temporary state) rather than "ser", reflecting how Spanish distinguishes mood and health from permanent identity.'
    },
    ja: {
      text: 'お元気ですか？',
      phonetic: 'O-genki desu ka?',
      alt: '元気？ (Genki? — casual)',
      examples: [
        'お元気ですか？私は元気です。 — How are you? I am fine.',
        '最近お元気ですか？ — How have you been lately?'
      ],
      history: '"Genki" (元気) literally combines "origin" (元) and "spirit/energy" (気), prefixed with "o-" (お) for politeness.'
    }
  },
  'where is the coffee shop': {
    fr: {
      text: 'Où est le café ?',
      examples: [
        'Excusez-moi, où est le café ? — Excuse me, where is the coffee shop?',
        'Où est le café le plus proche ? — Where is the nearest café?'
      ],
      history: 'French "café" derives from Ottoman Turkish "kahve" and Arabic "qahwa", entering Parisian culture in the 17th century.'
    },
    es: {
      text: '¿Dónde está la cafetería?',
      examples: [
        'Perdón, ¿dónde está la cafetería? — Pardon me, where is the coffee shop?',
        '¿Dónde está la cafetería de la estación? — Where is the station café?'
      ],
      history: 'Spanish uses "estar" for physical locations, and "cafetería" combines "café" with the place-suffix "-ería".'
    },
    ja: {
      text: '喫茶店はどこですか？',
      phonetic: 'Kissaten wa doko desu ka?',
      examples: [
        'すみません、喫茶店はどこですか？ — Excuse me, where is the coffee shop?',
        '駅前の喫茶店はどこですか？ — Where is the café in front of the station?'
      ],
      history: '"Kissaten" (喫茶店) originally meant "tea-drinking shop" in the Meiji era before evolving into Japan’s classic retro coffeehouses.'
    }
  },
  'i love learning languages': {
    fr: {
      text: 'J’adore apprendre les langues !',
      examples: [
        'J’adore apprendre les langues avec des amis. — I love learning languages with friends.',
        'Pourquoi j’adore apprendre les langues ? — Why do I love learning languages?'
      ],
      history: 'In French, "adorer" expresses strong enthusiasm for hobbies and activities, while "aimer" is softer unless used for people.'
    },
    es: {
      text: '¡Me encanta aprender idiomas!',
      examples: [
        'Me encanta aprender idiomas nuevos. — I love learning new languages.',
        'A mí también me encanta aprender idiomas. — I also love learning languages.'
      ],
      history: '"Encantar" literally means "to enchant/charm", so the activity is grammatically the subject that delights the speaker.'
    },
    ja: {
      text: '言語を学ぶのが大好きです！',
      phonetic: 'Gengo o manabu no ga daisuki desu!',
      examples: [
        '毎日言語を学ぶのが大好きです。 — I love learning languages every day.',
        '新しい言語を学ぶのが大好きです！ — I love learning new languages!'
      ],
      history: '"Manabu" (学ぶ, to learn) shares a root with "maneru" (真似る, to imitate), reflecting learning by observing and repeating.'
    }
  },
  hello: {
    fr: {
      text: 'Bonjour !',
      alt: 'Salut !',
      examples: [
        'Bonjour ! Comment ça va ? — Hello! How is it going?',
        'Bonjour tout le monde ! — Hello everyone!'
      ],
      history: 'Combines "bon" (good) and "jour" (day), standard in France from morning until early evening.'
    },
    es: {
      text: '¡Hola!',
      examples: [
        '¡Hola! Mucho gusto. — Hello! Nice to meet you.',
        '¡Hola a todos! — Hello everyone!'
      ],
      history: 'Thought to stem from Old Germanic or maritime calls ("hāl" / "ahoy") used to hail someone’s attention.'
    },
    ja: {
      text: 'こんにちは！',
      phonetic: 'Konnichiwa!',
      examples: [
        'こんにちは！お元気ですか？ — Hello! How are you?',
        'みなさん、こんにちは！ — Hello, everyone!'
      ],
      history: 'Shortened from "Konnichi wa gokigen ikaga desu ka?" ("How is your mood today?"), with "wa" written as は.'
    }
  },
  'thank you': {
    fr: {
      text: 'Merci beaucoup !',
      examples: [
        'Merci beaucoup pour votre aide ! — Thank you very much for your help!',
        'Merci, c’est très gentil. — Thank you, that is very kind.'
      ],
      history: 'Comes from Latin "merces" (reward/favor), originally expressing gratitude for someone’s kindness or grace.'
    },
    es: {
      text: '¡Muchas gracias!',
      examples: [
        '¡Muchas gracias por todo! — Thank you very much for everything!',
        'Gracias por tu ayuda. — Thanks for your help.'
      ],
      history: 'Derived from Latin "gratias" (favors/thanks), pluralized in Spanish as a traditional sign of warmth.'
    },
    ja: {
      text: 'ありがとうございます！',
      phonetic: 'Arigatō gozaimasu!',
      examples: [
        '手伝ってくれてありがとうございます！ — Thank you for helping me!',
        'いつもありがとうございます。 — Thank you as always.'
      ],
      history: 'Derived from "arigatashi" (有り難し), meaning "rare or hard to exist"—expressing deep appreciation for a rare kindness.'
    }
  }
};

function runOfflineFallback(text, targetLangCode, mode) {
  const trimmed = text.trim();
  const normalized = trimmed.toLowerCase().replace(/['’]/g, '').replace(/[?!.,;:]+$/g, '').replace(/\s+/g, ' ');
  const lang = getLanguageByCode(targetLangCode);

  if (mode === 'correct') {
    let corrected = trimmed
      .replace(/\bteh\b/gi, 'the')
      .replace(/\bi\b/g, 'I')
      .replace(/\bi goed\b/gi, 'I went');
    if (/^[a-z]/.test(corrected)) {
      corrected = corrected.charAt(0).toUpperCase() + corrected.slice(1);
    }
    if (!/[.!?]$/.test(corrected)) corrected += '.';
    return {
      primaryText: corrected,
      phonetic: '',
      examples: [],
      history: '',
      note: 'Offline basic correction applied. Connect OpenRouter/Groq/OpenAI for full AI grammar coaching.',
      alternative: ''
    };
  }

  const entry = OFFLINE_PHRASEBOOK[normalized]?.[targetLangCode];
  if (entry) {
    return {
      primaryText: entry.text,
      phonetic: entry.phonetic || '',
      examples: entry.examples || [],
      history: entry.history || '',
      note: '',
      alternative: entry.alt || ''
    };
  }

  return {
    primaryText: `[${lang.name} offline] "${trimmed}"`,
    phonetic: '',
    examples: [],
    history: '',
    note: 'Offline mode only includes starter phrases. Add your API key in Settings for live translation of any text.',
    alternative: ''
  };
}

function parseJsonPayload(raw) {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Invalid JSON');
  }
}

function createOpenAIClient(settings) {
  const provider = PROVIDERS[settings.engine];
  if (!provider) {
    throw new PollyError('UNSUPPORTED_PROVIDER', `Unknown provider: ${settings.engine}`, {
      canFallbackOffline: true
    });
  }

  const apiKey = (settings.apiKeys?.[provider.id] || '').trim();
  const baseURL = (settings.baseURLs?.[provider.id] || provider.baseURL).trim();

  if (!apiKey) {
    throw new PollyError(
      'MISSING_API_KEY',
      `Add your ${provider.label} API key in Settings to translate, or switch to Offline mode.`,
      { retryable: false, canFallbackOffline: true, needsApiKey: true }
    );
  }

  const client = new OpenAI({
    apiKey,
    baseURL,
    dangerouslyAllowBrowser: true,
    defaultHeaders:
      provider.id === 'openrouter'
        ? {
            'HTTP-Referer': window.location.origin,
            'X-Title': 'PollyGlot'
          }
        : undefined
  });

  return { client, provider, modelName: (settings.models?.[provider.id] || provider.defaultModel).trim() };
}

function normalizeExamples(rawExamples) {
  if (!Array.isArray(rawExamples)) {
    return typeof rawExamples === 'string' && rawExamples.trim() ? [rawExamples.trim()] : [];
  }
  return rawExamples
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object') {
        const target = item.sentence || item.target || item.text || '';
        const english = item.translation || item.english || item.meaning || '';
        return target && english ? `${target} — ${english}` : target || english;
      }
      return '';
    })
    .filter(Boolean)
    .slice(0, 3);
}

async function callProviderTranslation({ text, targetLangCode, mode, settings }) {
  const { client, provider, modelName } = createOpenAIClient(settings);

  const lang = getLanguageByCode(targetLangCode);
  const systemPrompt = `You are Polly, a cheerful expert multilingual translator and language coach.
Respond with valid JSON only (no markdown fences, no extra prose).
Always return a JSON object with these exact keys:
- "primaryText": string (accurate natural translation in the target language, or corrected text when asked to correct)
- "phonetic": string (romanization/pronunciation guide if target language uses non-Latin script, otherwise "")
- "examples": array of 2-3 short example sentences showing how the translated/corrected phrase is used in the target language with English translations
- "history": string (1-2 sentence origin, etymology, or cultural background behind the phrase/expression, or "" if purely literal)
- "note": string (brief grammar/correction tip if helpful, otherwise "")
- "alternative": string (optional casual or formal alternative phrasing, otherwise "")`;

  const userPrompt =
    mode === 'correct'
      ? `Correct the grammar, spelling, and natural phrasing of: "${text}". Also translate the corrected text into ${lang.name}. Provide 2-3 example sentences using it in "examples", explain any fixes in "note", and include a short origin/cultural note in "history" if relevant.`
      : `Translate "${text}" into ${lang.name}. Include 2-3 natural example sentences using the translated phrase in "examples" (with English translations) and a short history/cultural origin behind it in "history".`;

  let completion;
  try {
    completion = await client.chat.completions.create({
      model: modelName,
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    });
  } catch (err) {
    const status = err?.status;
    const detail = err?.error?.message || err?.message || '';

    if (status === 401 || status === 403) {
      throw new PollyError(
        'AUTH_ERROR',
        detail || `${provider.label} rejected your API key (401/403). Check your key in Settings.`,
        { retryable: false, canFallbackOffline: true, needsApiKey: true }
      );
    }
    if (status === 402) {
      throw new PollyError(
        'INSUFFICIENT_CREDITS',
        detail || `Insufficient ${provider.label} credits (402). Top up your account or select a :free model.`,
        { retryable: false, canFallbackOffline: true, needsApiKey: true }
      );
    }
    if (status === 429) {
      throw new PollyError(
        'RATE_LIMIT',
        detail || `${provider.label} rate limit reached (429). Wait a moment and click Retry.`,
        { retryable: true, canFallbackOffline: true }
      );
    }
    if (!status) {
      throw new PollyError(
        'NETWORK_ERROR',
        `Unable to reach ${provider.label} API. Check your internet connection and base URL.`,
        { retryable: true, canFallbackOffline: true }
      );
    }
    throw new PollyError(
      'API_ERROR',
      detail || `${provider.label} returned HTTP ${status}. You can retry or switch to Offline mode.`,
      { retryable: true, canFallbackOffline: true }
    );
  }

  const content = completion?.choices?.[0]?.message?.content;
  if (!content) {
    throw new PollyError('API_ERROR', `${provider.label} returned an empty response.`, {
      retryable: true,
      canFallbackOffline: true
    });
  }

  try {
    const parsed = parseJsonPayload(content);
    return {
      primaryText: parsed.primaryText || content.trim(),
      phonetic: parsed.phonetic || '',
      examples: normalizeExamples(parsed.examples),
      history: typeof parsed.history === 'string' ? parsed.history.trim() : '',
      note: parsed.note || '',
      alternative: parsed.alternative || ''
    };
  } catch {
    return {
      primaryText: content.trim(),
      phonetic: '',
      examples: [],
      history: '',
      note: '',
      alternative: ''
    };
  }
}

function buildFallbackSvgIllustration(sourceText, translatedText, targetLangName) {
  const escapeXml = (str) =>
    String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const lower = `${sourceText} ${translatedText}`.toLowerCase();
  const isCoffee = ['coffee', 'cafe', 'tea', 'café', 'コーヒー'].some((k) => lower.includes(k));
  const isGreeting = ['hello', 'hi', 'how are you', 'bonjour', 'hola', 'comment allez'].some((k) => lower.includes(k));

  let caption = `${targetLangName} Postcard`;
  let bg = ['#E0F2FE', '#DBEAFE'];
  let body = `
    <rect x="64" y="42" width="192" height="72" rx="14" fill="#FFFFFF" stroke="#035AA6" stroke-width="3"/>
    <text x="160" y="76" text-anchor="middle" fill="#035AA6" font-family="sans-serif" font-size="14" font-weight="700">${escapeXml(targetLangName)}</text>
    <text x="160" y="96" text-anchor="middle" fill="#334155" font-family="sans-serif" font-size="11" font-weight="600">${escapeXml(translatedText.slice(0, 26))}</text>
  `;

  if (isCoffee) {
    caption = 'Cafe Scene';
    bg = ['#FEF3C7', '#FDE68A'];
    body = `
      <ellipse cx="160" cy="126" rx="64" ry="11" fill="#D97706" opacity="0.28"/>
      <path d="M115 74 H205 V106 C205 122 190 132 160 132 C130 132 115 122 115 106 Z" fill="#FFFFFF" stroke="#78350F" stroke-width="4"/>
      <path d="M205 82 C222 82 224 106 205 108" fill="none" stroke="#78350F" stroke-width="5" stroke-linecap="round"/>
      <ellipse cx="160" cy="74" rx="45" ry="9" fill="#78350F"/>
    `;
  } else if (isGreeting) {
    caption = 'Friendly Greeting';
    bg = ['#DBEAFE', '#BFDBFE'];
    body = `
      <circle cx="96" cy="84" r="34" fill="#035AA6"/>
      <text x="96" y="90" text-anchor="middle" fill="#FFFFFF" font-family="sans-serif" font-size="15" font-weight="700">Hello!</text>
      <circle cx="222" cy="74" r="34" fill="#65DA4D"/>
      <text x="222" y="80" text-anchor="middle" fill="#0F172A" font-family="sans-serif" font-size="14" font-weight="700">Salut!</text>
    `;
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 150">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${bg[0]}"/>
          <stop offset="100%" stop-color="${bg[1]}"/>
        </linearGradient>
      </defs>
      <rect width="320" height="150" fill="url(#bg)"/>
      ${body}
    </svg>
  `.trim();

  return {
    dataUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    caption,
    isAiGenerated: false
  };
}

async function generateProviderOrFallbackImage({ sourceText, translatedText, targetLangName, settings }) {
  const apiKey = (settings.apiKeys?.[settings.engine] || '').trim();

  if (settings.engine === 'openrouter' && apiKey && settings.imageModel) {
    try {
      const { client } = createOpenAIClient(settings);
      const data = await client.chat.completions.create({
        model: settings.imageModel,
        modalities: ['image', 'text'],
        messages: [
          {
            role: 'user',
            content: `Create a warm, clean flat editorial illustration depicting the phrase: "${sourceText}" (${targetLangName}: "${translatedText}"). No text in the image.`
          }
        ]
      });
      const imageUrl = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (imageUrl) {
        return {
          dataUrl: imageUrl,
          caption: 'OpenRouter AI Image',
          isAiGenerated: true
        };
      }
    } catch {
      // Fall back cleanly to built-in SVG card
    }
  } else if (settings.engine === 'openai' && apiKey) {
    try {
      const { client } = createOpenAIClient(settings);
      const data = await client.images.generate({
        model: 'dall-e-3',
        prompt: `Warm, clean, friendly flat editorial illustration depicting the phrase: "${sourceText}" (${targetLangName}: "${translatedText}"). No text in the image.`,
        size: '1024x1024',
        n: 1
      });
      const url = data?.data?.[0]?.url;
      if (url) {
        return {
          dataUrl: url,
          caption: 'OpenAI DALL-E Image',
          isAiGenerated: true
        };
      }
    } catch {
      // Fall back cleanly to built-in SVG card
    }
  }

  return buildFallbackSvgIllustration(sourceText, translatedText, targetLangName);
}

function ChatMessage({
  message,
  isEditing,
  showPhonetics,
  isSpeaking,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onSpeak,
  onCopy,
  onShowAlternative,
  onGenerateImage
}) {
  const [draftText, setDraftText] = useState(message.text || '');
  const [copied, setCopied] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);
  const editInputRef = useRef(null);

  useEffect(() => {
    if (isEditing) {
      setDraftText(message.text || '');
      editInputRef.current?.focus();
    }
  }, [isEditing, message.text]);

  if (message.isTyping) {
    return (
      <div className="message-row polly">
        <div className="bubble">
          <div className="typing-dots" aria-label="Polly is translating">
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
    );
  }

  if (message.sender === 'user' && isEditing) {
    return (
      <div className="message-row user">
        <div className="bubble">
          <form
            className="inline-edit-form"
            onSubmit={(e) => {
              e.preventDefault();
              onSaveEdit(message.id, draftText);
            }}
          >
            <textarea
              ref={editInputRef}
              className="inline-edit-input"
              rows={2}
              maxLength={500}
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
            />
            <div className="inline-edit-actions">
              <button type="button" className="inline-edit-btn cancel" onClick={onCancelEdit}>
                Cancel
              </button>
              <button type="submit" className="inline-edit-btn save">
                Update &amp; Re-send
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`message-row ${message.sender}`}>
      <div className="bubble">
        <div>{message.text}</div>

        {message.sender === 'polly' && message.phonetic && showPhonetics && (
          <div className="bubble-phonetic">{message.phonetic}</div>
        )}

        {message.sender === 'polly' && message.examples?.length > 0 && (
          <div className="bubble-section">
            <div className="bubble-section-title">Example Sentences</div>
            <ul className="bubble-examples">
              {message.examples.map((ex, idx) => (
                <li key={idx}>{ex}</li>
              ))}
            </ul>
          </div>
        )}

        {message.sender === 'polly' && message.history && (
          <div className="bubble-section">
            <div className="bubble-section-title">Origin &amp; History</div>
            <div className="bubble-history">{message.history}</div>
          </div>
        )}

        {message.sender === 'polly' && message.note && (
          <div className="bubble-note">{message.note}</div>
        )}

        {message.sender === 'polly' && message.image && (
          <div className="bubble-image-card">
            <img src={message.image.dataUrl} alt={message.image.caption || 'Visual illustration'} />
            <div className="bubble-image-caption">
              <span>{message.image.caption}</span>
              <span>{message.image.isAiGenerated ? 'AI' : 'Illustrated'}</span>
            </div>
          </div>
        )}
      </div>

      {!message.isGreeting && (
        <div className="bubble-meta">
          {message.sender === 'user' ? (
            <>
              <span className="meta-tag">
                {message.edited ? 'Edited' : getLanguageByCode(message.targetLangCode).name}
              </span>
              <button
                type="button"
                className="bubble-action-btn"
                title="Correct or edit this message"
                onClick={() => onStartEdit(message.id)}
              >
                Edit
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className={`bubble-action-btn${isSpeaking ? ' active' : ''}`}
                title="Pronounce aloud"
                onClick={() => onSpeak(message.id, message.text, message.langCode)}
              >
                Speak
              </button>
              <button
                type="button"
                className="bubble-action-btn"
                onClick={async () => {
                  const ok = await onCopy(message.text);
                  if (ok) {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1300);
                  }
                }}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
              {message.alternative && (
                <button
                  type="button"
                  className="bubble-action-btn"
                  title="Show alternative phrasing"
                  onClick={() => onShowAlternative(message.id)}
                >
                  Alt
                </button>
              )}
              {!message.image && message.sourceText && (
                <button
                  type="button"
                  className="bubble-action-btn"
                  title="Generate AI image for this phrase"
                  disabled={loadingImage}
                  onClick={async () => {
                    setLoadingImage(true);
                    try {
                      await onGenerateImage(message);
                    } finally {
                      setLoadingImage(false);
                    }
                  }}
                >
                  {loadingImage ? '...' : 'Image'}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SettingsModal({ isOpen, settings, onClose, onSave }) {
  const [draft, setDraft] = useState(settings);

  useEffect(() => {
    if (isOpen) setDraft(settings);
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const activeProvider = PROVIDERS[draft.engine];
  const currentApiKey = activeProvider ? draft.apiKeys?.[activeProvider.id] || '' : '';
  const currentModel = activeProvider ? draft.models?.[activeProvider.id] ?? activeProvider.defaultModel : '';
  const currentBaseURL = activeProvider ? draft.baseURLs?.[activeProvider.id] ?? activeProvider.baseURL : '';
  const isKnownPreset = activeProvider ? activeProvider.models.some((m) => m.id === currentModel) : false;

  const updateProviderField = (fieldMapKey, value) => {
    if (!activeProvider) return;
    setDraft((prev) => ({
      ...prev,
      [fieldMapKey]: {
        ...prev[fieldMapKey],
        [activeProvider.id]: value
      }
    }));
  };

  let safeHost = currentBaseURL;
  try {
    safeHost = new URL(currentBaseURL).host;
  } catch {
    // Allow editing partial URLs without throwing
  }

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settingsTitle"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-card">
        <div className="modal-header">
          <h2 id="settingsTitle">PollyGlot — Provider &amp; Model Settings</h2>
          <button type="button" className="modal-close-btn" aria-label="Close settings" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-body">
          <div className="setting-group">
            <label htmlFor="engineSelect" className="setting-label">
              Translation Provider (OpenAI SDK)
            </label>
            <select
              id="engineSelect"
              className="setting-input"
              value={draft.engine}
              onChange={(e) => setDraft({ ...draft, engine: e.target.value })}
            >
              <option value="openrouter">OpenRouter (Free &amp; Paid Models)</option>
              <option value="groq">Groq (Ultra-Fast Free Tier)</option>
              <option value="openai">OpenAI (Official API)</option>
              <option value="custom">Custom OpenAI-Compatible Base URL</option>
              <option value="builtin">Offline Starter Mode (No API Key)</option>
            </select>
          </div>

          {activeProvider && (
            <>
              <div className="setting-group">
                <label htmlFor="baseUrlInput" className="setting-label">
                  Base URL (<code>baseURL</code>)
                </label>
                <input
                  id="baseUrlInput"
                  type="url"
                  className="setting-input"
                  placeholder={activeProvider.baseURL}
                  value={currentBaseURL}
                  onChange={(e) => updateProviderField('baseURLs', e.target.value)}
                />
              </div>

              <div className="setting-group">
                <div className="setting-toggle-row">
                  <label htmlFor="providerKeyInput" className="setting-label">
                    {activeProvider.label} API Key
                  </label>
                  {currentApiKey && (
                    <button
                      type="button"
                      className="bubble-action-btn"
                      onClick={() => updateProviderField('apiKeys', '')}
                    >
                      Clear Key
                    </button>
                  )}
                </div>
                <input
                  id="providerKeyInput"
                  type="password"
                  className="setting-input"
                  placeholder={activeProvider.keyPlaceholder}
                  autoComplete="off"
                  value={currentApiKey}
                  onChange={(e) => updateProviderField('apiKeys', e.target.value)}
                />
                <p className="setting-help">
                  Saved only in your browser&apos;s <code>localStorage</code> (never uploaded to any server). Sent
                  directly via the <code>openai</code> SDK to <code>{safeHost}</code>.
                </p>
              </div>

              <div className="setting-group">
                <label htmlFor="modelNameInput" className="setting-label">
                  {activeProvider.label} Model Name (Editable)
                </label>
                {activeProvider.models.length > 0 && (
                  <select
                    id="modelPresetSelect"
                    className="setting-input"
                    value={isKnownPreset ? currentModel : 'custom'}
                    onChange={(e) => {
                      if (e.target.value !== 'custom') {
                        updateProviderField('models', e.target.value);
                      }
                    }}
                  >
                    {activeProvider.models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                    {!isKnownPreset && <option value="custom">Custom ({currentModel || 'enter below'})</option>}
                  </select>
                )}
                <input
                  id="modelNameInput"
                  type="text"
                  className="setting-input"
                  placeholder={`Type any ${activeProvider.label} model name (e.g. ${activeProvider.defaultModel})`}
                  value={currentModel}
                  onChange={(e) => updateProviderField('models', e.target.value)}
                />
                <p className="setting-help">
                  Fully editable — type or paste any model ID (e.g. <code>nvidia/nemotron-nano-9b-v2:free</code>,{' '}
                  <code>nvidia/nemotron-3-nano-30b-a3b:free</code>, <code>llama-3.3-70b-versatile</code>,{' '}
                  <code>gpt-4o-mini</code>).
                </p>
              </div>

              {activeProvider.id === 'openrouter' && (
                <div className="setting-group">
                  <label htmlFor="imageModelInput" className="setting-label">
                    OpenRouter Image Model (optional)
                  </label>
                  <input
                    id="imageModelInput"
                    type="text"
                    className="setting-input"
                    placeholder="google/gemini-2.5-flash-image"
                    value={draft.imageModel}
                    onChange={(e) => setDraft({ ...draft, imageModel: e.target.value })}
                  />
                  <p className="setting-help">
                    Used when generating phrase images. Falls back to an illustrated card if image output is unavailable.
                  </p>
                </div>
              )}
            </>
          )}

          <div className="setting-group setting-toggle-row">
            <div>
              <span className="setting-label">Auto-speak translations</span>
              <p className="setting-help">Read Polly&apos;s translations aloud automatically</p>
            </div>
            <input
              type="checkbox"
              className="toggle-checkbox"
              checked={draft.autoSpeak}
              onChange={(e) => setDraft({ ...draft, autoSpeak: e.target.checked })}
            />
          </div>

          <div className="setting-group setting-toggle-row">
            <div>
              <span className="setting-label">Show phonetic / pronunciation guide</span>
              <p className="setting-help">Display Romaji hints for Japanese</p>
            </div>
            <input
              type="checkbox"
              className="toggle-checkbox"
              checked={draft.showPhonetics}
              onChange={(e) => setDraft({ ...draft, showPhonetics: e.target.checked })}
            />
          </div>

          <div className="setting-group setting-toggle-row">
            <div>
              <span className="setting-label">Simulate network error</span>
              <p className="setting-help">Test graceful error banner, retry, and offline fallback</p>
            </div>
            <input
              type="checkbox"
              className="toggle-checkbox"
              checked={draft.simulateError}
              onChange={(e) => setDraft({ ...draft, simulateError: e.target.checked })}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              onSave({
                ...draft,
                apiKeys: {
                  openrouter: (draft.apiKeys?.openrouter || '').trim(),
                  groq: (draft.apiKeys?.groq || '').trim(),
                  openai: (draft.apiKeys?.openai || '').trim(),
                  custom: (draft.apiKeys?.custom || '').trim()
                },
                models: {
                  openrouter: (draft.models?.openrouter || '').trim() || PROVIDERS.openrouter.defaultModel,
                  groq: (draft.models?.groq || '').trim() || PROVIDERS.groq.defaultModel,
                  openai: (draft.models?.openai || '').trim() || PROVIDERS.openai.defaultModel,
                  custom: (draft.models?.custom || '').trim() || PROVIDERS.custom.defaultModel
                },
                baseURLs: {
                  openrouter: (draft.baseURLs?.openrouter || '').trim() || PROVIDERS.openrouter.baseURL,
                  groq: (draft.baseURLs?.groq || '').trim() || PROVIDERS.groq.baseURL,
                  openai: (draft.baseURLs?.openai || '').trim() || PROVIDERS.openai.baseURL,
                  custom: (draft.baseURLs?.custom || '').trim() || PROVIDERS.custom.baseURL
                },
                imageModel: (draft.imageModel || '').trim()
              });
              onClose();
            }}
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}

function loadInitialSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        apiKeys: {
          openrouter: parsed.apiKeys?.openrouter || PROVIDERS.openrouter.envKey,
          groq: parsed.apiKeys?.groq || PROVIDERS.groq.envKey,
          openai: parsed.apiKeys?.openai || PROVIDERS.openai.envKey,
          custom: parsed.apiKeys?.custom || PROVIDERS.custom.envKey
        },
        models: {
          openrouter: parsed.models?.openrouter || PROVIDERS.openrouter.defaultModel,
          groq: parsed.models?.groq || PROVIDERS.groq.defaultModel,
          openai: parsed.models?.openai || PROVIDERS.openai.defaultModel,
          custom: parsed.models?.custom || PROVIDERS.custom.defaultModel
        },
        baseURLs: {
          openrouter: parsed.baseURLs?.openrouter || PROVIDERS.openrouter.baseURL,
          groq: parsed.baseURLs?.groq || PROVIDERS.groq.baseURL,
          openai: parsed.baseURLs?.openai || PROVIDERS.openai.baseURL,
          custom: parsed.baseURLs?.custom || PROVIDERS.custom.baseURL
        }
      };
    }
  } catch {
    // Ignore storage read errors
  }
  return { ...DEFAULT_SETTINGS };
}

function loadInitialLang() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LANG);
    if (raw && LANGUAGES.some((l) => l.code === raw)) return raw;
  } catch {
    // Ignore storage read errors
  }
  return 'fr';
}

function loadInitialMessages() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // Ignore storage read errors
  }
  return [{ ...GREETING_MESSAGE }];
}

function App() {
  const [messages, setMessages] = useState(loadInitialMessages);
  const [targetLangCode, setTargetLangCode] = useState(loadInitialLang);
  const [settings, setSettings] = useState(loadInitialSettings);
  const [mode, setMode] = useState('translate');
  const [inputText, setInputText] = useState('');
  const [attachImage, setAttachImage] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const [errorState, setErrorState] = useState(null);
  const [shakeTick, setShakeTick] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    try {
      const clean = messages.filter((m) => !m.isTyping);
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(clean));
    } catch {
      // Ignore quota errors
    }
  }, [messages]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      localStorage.setItem(STORAGE_KEYS.LANG, targetLangCode);
    } catch {
      // Ignore storage errors
    }
  }, [settings, targetLangCode]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const resizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 90)}px`;
  };

  const triggerError = (err, failedPayload = null) => {
    setErrorState({
      message: err.message || 'Something went wrong.',
      retryable: Boolean(err.retryable && failedPayload),
      canFallbackOffline: Boolean(err.canFallbackOffline),
      needsApiKey: Boolean(err.needsApiKey),
      failedPayload
    });
    if (err.code === 'EMPTY_INPUT') {
      setShakeTick((n) => n + 1);
    }
  };

  const speakText = (msgId, text, langCode) => {
    if (!('speechSynthesis' in window)) {
      triggerError(new PollyError('SPEECH_UNSUPPORTED', 'Speech synthesis is not supported in this browser.'));
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = getLanguageByCode(langCode).speechLocale;
    utterance.rate = 0.95;
    setSpeakingMessageId(msgId);
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);
    window.speechSynthesis.speak(utterance);
  };

  const sendOrRetry = async ({
    text,
    langCode,
    reqMode,
    withImage,
    existingUserId = null,
    overrideSettings = null
  }) => {
    setErrorState(null);
    const trimmed = (text || '').trim();
    if (!trimmed) {
      triggerError(new PollyError('EMPTY_INPUT', 'Please type a message before hitting send.'));
      return;
    }
    if (trimmed.length > 500) {
      triggerError(new PollyError('TEXT_TOO_LONG', 'Messages are limited to 500 characters.'));
      return;
    }

    const activeSettings = overrideSettings || settings;
    setIsBusy(true);

    const userId = existingUserId || createId();
    const typingId = createId();

    setMessages((prev) => {
      if (existingUserId) {
        const withoutOldReply = prev.filter((m) => m.replyToId !== existingUserId);
        const updated = withoutOldReply.map((m) =>
          m.id === existingUserId ? { ...m, text: trimmed, edited: true, targetLangCode: langCode } : m
        );
        const userIdx = updated.findIndex((m) => m.id === existingUserId);
        const next = [...updated];
        next.splice(userIdx + 1, 0, { id: typingId, sender: 'polly', isTyping: true });
        return next;
      }

      return [
        ...prev,
        { id: userId, sender: 'user', text: trimmed, targetLangCode: langCode, mode: reqMode },
        { id: typingId, sender: 'polly', isTyping: true }
      ];
    });

    try {
      if (activeSettings.simulateError) {
        throw new PollyError(
          'SIMULATED_ERROR',
          'Simulated connection error: could not reach translation provider.',
          { retryable: true, canFallbackOffline: true }
        );
      }

      const result =
        activeSettings.engine === 'builtin'
          ? runOfflineFallback(trimmed, langCode, reqMode)
          : await callProviderTranslation({
              text: trimmed,
              targetLangCode: langCode,
              mode: reqMode,
              settings: activeSettings
            });

      let image = null;
      if (withImage) {
        image = await generateProviderOrFallbackImage({
          sourceText: trimmed,
          translatedText: result.primaryText,
          targetLangName: getLanguageByCode(langCode).name,
          settings: activeSettings
        });
      }

      const pollyMsg = {
        id: createId(),
        replyToId: userId,
        sender: 'polly',
        text: result.primaryText,
        phonetic: result.phonetic,
        examples: result.examples || [],
        history: result.history || '',
        note: result.note,
        alternative: result.alternative,
        sourceText: trimmed,
        langCode: reqMode === 'correct' ? 'en' : langCode,
        image
      };

      setMessages((prev) => prev.map((m) => (m.id === typingId ? pollyMsg : m)));

      if (activeSettings.autoSpeak) {
        speakText(pollyMsg.id, pollyMsg.text, pollyMsg.langCode);
      }
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== typingId));
      triggerError(err, {
        text: trimmed,
        langCode,
        reqMode,
        withImage,
        existingUserId: userId
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isBusy) return;
    if (!inputText.trim()) {
      triggerError(new PollyError('EMPTY_INPUT', 'Please type a message before hitting send.'));
      return;
    }
    const textToSend = inputText;
    setInputText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    await sendOrRetry({
      text: textToSend,
      langCode: targetLangCode,
      reqMode: mode,
      withImage: attachImage
    });
  };

  const handleSaveEdit = async (messageId, newText) => {
    const trimmed = newText.trim();
    if (!trimmed) {
      triggerError(new PollyError('EMPTY_INPUT', 'Edited message cannot be empty.'));
      return;
    }
    const targetMsg = messages.find((m) => m.id === messageId);
    setEditingMessageId(null);
    await sendOrRetry({
      text: trimmed,
      langCode: targetLangCode,
      reqMode: targetMsg?.mode || mode,
      withImage: attachImage,
      existingUserId: messageId
    });
  };

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      triggerError(new PollyError('CLIPBOARD_ERROR', 'Could not copy text to clipboard.'));
      return false;
    }
  };

  const handleShowAlternative = (messageId) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId || !m.alternative) return m;
        const nextNote = m.note ? `${m.note}\nAlternative: ${m.alternative}` : `Alternative: ${m.alternative}`;
        return { ...m, note: nextNote, alternative: '' };
      })
    );
  };

  const handleGenerateImageForMessage = async (message) => {
    const imgResult = await generateProviderOrFallbackImage({
      sourceText: message.sourceText,
      translatedText: message.text,
      targetLangName: getLanguageByCode(message.langCode).name,
      settings
    });
    setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, image: imgResult } : m)));
  };

  const handleClearChat = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setSpeakingMessageId(null);
    setEditingMessageId(null);
    setErrorState(null);
    setMessages([{ ...GREETING_MESSAGE }]);
  };

  const handleFallbackOffline = async () => {
    const offlineSettings = { ...settings, engine: 'builtin', simulateError: false };
    setSettings(offlineSettings);
    if (errorState?.failedPayload && !isBusy) {
      await sendOrRetry({ ...errorState.failedPayload, overrideSettings: offlineSettings });
    } else {
      setErrorState(null);
    }
  };

  const hasUserMessages = messages.some((m) => m.sender === 'user');
  const activeLanguage = getLanguageByCode(targetLangCode);
  const activeProvider = PROVIDERS[settings.engine];
  const hasKey = activeProvider ? Boolean((settings.apiKeys?.[activeProvider.id] || '').trim()) : false;
  const badgeClass = activeProvider ? (hasKey ? 'openrouter' : '') : 'ready';
  const badgeLabel = activeProvider
    ? hasKey
      ? activeProvider.label
      : `Add ${activeProvider.label} Key`
    : 'Offline';

  return (
    <>
      <div className="ambient-bg" aria-hidden="true" />
      <main className="app-shell">
        <section className="phone-frame" aria-label="PollyGlot Translator Chat">
          <header className="brand-header">
            <img src={worldmapImg} alt="" className="world-map-bg" aria-hidden="true" />

            <div className="brand-content">
              <img src={parrotImg} alt="Polly the Parrot" className="parrot-img" />
              <div className="brand-text">
                <h1 className="brand-title">PollyGlot</h1>
                <p className="brand-subtitle">Perfect Translation Every Time</p>
              </div>
            </div>

            <div className="header-actions">
              <button
                type="button"
                className="icon-btn-header"
                onClick={handleClearChat}
                title="Clear conversation"
                aria-label="Clear conversation"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6" />
                  <path d="M14 11v6" />
                </svg>
              </button>
              <button
                type="button"
                className="icon-btn-header"
                onClick={() => setIsSettingsOpen(true)}
                title="OpenRouter API Key & Settings"
                aria-label="Open Settings"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>
            </div>
          </header>

          <div className="chat-panel-wrapper">
            <div className="chat-panel">
              <div className="toolbar-strip">
                <div className="mode-pills" role="tablist" aria-label="Polly mode">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'translate'}
                    className={`mode-pill${mode === 'translate' ? ' active' : ''}`}
                    onClick={() => setMode('translate')}
                  >
                    Translate
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'correct'}
                    className={`mode-pill${mode === 'correct' ? ' active' : ''}`}
                    title="Fix grammar & spelling in your text"
                    onClick={() => setMode('correct')}
                  >
                    Correct Text
                  </button>
                </div>

                <button
                  type="button"
                  className={`engine-badge ${badgeClass}`}
                  title="Configure OpenRouter API key and model"
                  onClick={() => setIsSettingsOpen(true)}
                >
                  <span className="status-dot" />
                  <span>{badgeLabel}</span>
                </button>
              </div>

              <div className="chat-messages" aria-live="polite">
                {messages.map((msg) => (
                  <ChatMessage
                    key={msg.id}
                    message={msg}
                    isEditing={editingMessageId === msg.id}
                    showPhonetics={settings.showPhonetics}
                    isSpeaking={speakingMessageId === msg.id}
                    onStartEdit={setEditingMessageId}
                    onCancelEdit={() => setEditingMessageId(null)}
                    onSaveEdit={handleSaveEdit}
                    onSpeak={speakText}
                    onCopy={handleCopy}
                    onShowAlternative={handleShowAlternative}
                    onGenerateImage={handleGenerateImageForMessage}
                  />
                ))}
                <div ref={chatEndRef} />
              </div>

              {errorState && (
                <div className="error-banner" role="alert">
                  <div className="error-banner-body">
                    <span className="error-icon" aria-hidden="true">!</span>
                    <p className="error-text">{errorState.message}</p>
                  </div>
                  <div className="error-banner-actions">
                    {errorState.needsApiKey && (
                      <button
                        type="button"
                        className="error-action-btn"
                        onClick={() => setIsSettingsOpen(true)}
                      >
                        Set Key
                      </button>
                    )}
                    {errorState.retryable && (
                      <button
                        type="button"
                        className="error-action-btn"
                        onClick={() => sendOrRetry(errorState.failedPayload)}
                      >
                        Retry
                      </button>
                    )}
                    {errorState.canFallbackOffline && (
                      <button
                        type="button"
                        className="error-action-btn secondary"
                        onClick={handleFallbackOffline}
                      >
                        Offline
                      </button>
                    )}
                    <button
                      type="button"
                      className="error-dismiss-btn"
                      aria-label="Dismiss error"
                      onClick={() => setErrorState(null)}
                    >
                      &times;
                    </button>
                  </div>
                </div>
              )}

              {!hasUserMessages && (
                <div className="quick-chips" aria-label="Quick examples">
                  {QUICK_EXAMPLES.map((example) => (
                    <button
                      key={example}
                      type="button"
                      className="quick-chip"
                      onClick={() => {
                        if (isBusy) return;
                        sendOrRetry({
                          text: example,
                          langCode: targetLangCode,
                          reqMode: mode,
                          withImage: attachImage
                        });
                      }}
                    >
                      {example}
                    </button>
                  ))}
                </div>
              )}

              <form className="input-area" onSubmit={handleSubmit} noValidate>
                <div key={shakeTick} className={`input-box${shakeTick > 0 ? ' shake' : ''}`}>
                  <textarea
                    ref={textareaRef}
                    className="message-input"
                    rows={1}
                    maxLength={500}
                    value={inputText}
                    placeholder={
                      mode === 'correct'
                        ? 'Type text to fix grammar & spelling...'
                        : `Type text to translate into ${activeLanguage.name}...`
                    }
                    aria-label="Text to translate or correct"
                    onChange={(e) => {
                      setInputText(e.target.value);
                      if (errorState) setErrorState(null);
                      resizeTextarea();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e);
                      }
                    }}
                  />

                  <div className="input-actions">
                    <button
                      type="button"
                      className={`input-tool-btn${attachImage ? ' active' : ''}`}
                      title="Attach an AI / illustrated image with translation"
                      aria-pressed={attachImage}
                      aria-label="Toggle generated image for next message"
                      onClick={() => setAttachImage((prev) => !prev)}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    </button>

                    <button
                      type="submit"
                      className="send-btn"
                      disabled={isBusy}
                      title="Send message"
                      aria-label="Send message"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="flag-bar" role="radiogroup" aria-label="Target language">
                  {LANGUAGES.map((lang) => {
                    const isSelected = lang.code === targetLangCode;
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        className={`flag-btn${isSelected ? ' selected' : ''}`}
                        role="radio"
                        aria-checked={isSelected}
                        aria-label={`${lang.name} (${lang.nativeName})`}
                        title={`${lang.name} (${lang.nativeName})`}
                        onClick={() => setTargetLangCode(lang.code)}
                      >
                        <img src={lang.flagSrc} alt={lang.name} className="flag-img" />
                      </button>
                    );
                  })}
                </div>
              </form>
            </div>
          </div>
        </section>
      </main>

      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        onClose={() => setIsSettingsOpen(false)}
        onSave={setSettings}
      />
    </>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
