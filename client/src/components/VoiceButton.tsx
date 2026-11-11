import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, Square } from 'lucide-react';
import { LANGUAGES } from '../i18n';

// Minimal typing for the Web Speech API (Chrome on Android supports kn-IN, hi-IN, te-IN, ta-IN)
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

const Recognition = (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike })
  .SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;

/** Dictate field notes in the officer's language – faster than typing Kannada on a phone. */
export function VoiceButton({ onText }: { onText: (text: string) => void }) {
  const { t, i18n } = useTranslation();
  const [listening, setListening] = useState(false);
  const rec = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => () => rec.current?.stop(), []);
  if (!Recognition) return null;

  function toggle() {
    if (listening) {
      rec.current?.stop();
      return;
    }
    const r = new Recognition!();
    r.lang = LANGUAGES.find((l) => l.code === i18n.language)?.speech ?? 'kn-IN';
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) onText(e.results[i][0].transcript);
      }
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    rec.current = r;
    r.start();
    setListening(true);
  }

  return (
    <button type="button" onClick={toggle} className={listening ? 'btn-danger min-h-9 px-3' : 'btn-secondary min-h-9 px-3'}>
      {listening ? <Square size={14} aria-hidden /> : <Mic size={15} aria-hidden />}
      {listening ? t('common.listening') : t('common.voice')}
    </button>
  );
}
