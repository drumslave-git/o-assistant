export type TtsResponseFormat =
  | "mp3"
  | "wav"
  | "opus"
  | "flac"
  | "m4a"
  | "pcm";

export type TtsUserConfig = {
  baseURL: string;
  apiKey: string;
  model: string;
  voice: string;
  speed: number;
  responseFormat: TtsResponseFormat;
};

export type KokoroLang = {
  id: string;
  name: string;
};

export type KokoroModel = {
  id: string;
  quantization?: string;
  size?: string;
};

export type KokoroVoice = {
  id: string;
  name: string;
  gender?: string;
  targetQuality?: string;
  overallGrade?: string;
  lang?: KokoroLang;
};

export type TtsCatalog = {
  langs: KokoroLang[];
  models: KokoroModel[];
  voices: KokoroVoice[];
};
