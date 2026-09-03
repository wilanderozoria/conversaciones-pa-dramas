export type VoiceName = 'Kore' | 'Puck' | 'Zephyr' | 'Fenrir' | 'Charon';

export interface VoiceOption {
  id: VoiceName;
  name: string;
  gender: 'Femenina' | 'Masculina' | 'Neutro';
  description: string;
  tone: string;
}

export const AVAILABLE_VOICES: VoiceOption[] = [
  {
    id: 'Kore',
    name: 'Kore',
    gender: 'Femenina',
    description: 'Voz clara, cálida y natural',
    tone: 'Versátil, podcast, amigable',
  },
  {
    id: 'Puck',
    name: 'Puck',
    gender: 'Masculina',
    description: 'Voz expresiva, entusiasta y enérgica',
    tone: 'Dinámica, juvenil, atractiva',
  },
  {
    id: 'Zephyr',
    name: 'Zephyr',
    gender: 'Femenina',
    description: 'Voz serena, suave y pausada',
    tone: 'Tranquila, reflexiva, profesional',
  },
  {
    id: 'Fenrir',
    name: 'Fenrir',
    gender: 'Masculina',
    description: 'Voz profunda, firme y segura',
    tone: 'Grave, confiada, narración',
  },
  {
    id: 'Charon',
    name: 'Charon',
    gender: 'Masculina',
    description: 'Voz seria, madura y autoritaria',
    tone: 'Formal, analítica, documental',
  },
];

export interface SpeakerConfig {
  name: string;
  roleDescription: string;
  voice: VoiceName;
  avatarColor: string;
}

export interface DialogueTurn {
  id: string;
  speakerIndex: 1 | 2;
  speakerName: string;
  text: string;
  audioBase64?: string; // PCM base64 for this turn
  durationSec?: number;
  startTimeSec?: number;
}

export interface Conversation {
  id: string;
  title: string;
  topic: string;
  language: string;
  createdAt: string;
  speaker1: SpeakerConfig;
  speaker2: SpeakerConfig;
  turns: DialogueTurn[];
  fullAudioPcmBase64?: string;
  fullAudioMp3Base64?: string;
  durationSec?: number;
}

export interface TopicPreset {
  id: string;
  title: string;
  category: string;
  topic: string;
  speaker1Name: string;
  speaker1Role: string;
  speaker1Voice: VoiceName;
  speaker2Name: string;
  speaker2Role: string;
  speaker2Voice: VoiceName;
}
