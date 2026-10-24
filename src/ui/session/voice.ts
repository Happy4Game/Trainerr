/**
 * Speech recognition of the phone (Web Speech API). On Android it can run
 * offline when the language pack is installed. Absent → the button is hidden.
 */
interface RecognitionResultEvent {
  readonly results: ArrayLike<ArrayLike<{ readonly transcript: string }>>;
}

export interface Recognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
}

type RecognitionConstructor = new () => Recognition;

function recognitionClass(): RecognitionConstructor | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export function voiceSupported(): boolean {
  return recognitionClass() !== undefined;
}

export function createRecognition(locale: string): Recognition | undefined {
  const Class = recognitionClass();
  if (!Class) return undefined;
  const recognition = new Class();
  recognition.lang = locale;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  return recognition;
}
