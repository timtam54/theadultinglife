"use client";

import { useEffect, useRef, useState } from "react";
import { AiConsentGate } from "@/components/AiConsentGate";
import { useAiConsent } from "@/hooks/useAiConsent";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  disabled?: boolean;
  /** Show the polish button. Defaults to true. Turn off for short single-line uses. */
  polish?: boolean;
  /** Show the mic button. Defaults to true. */
  dictate?: boolean;
  /** Extra label under the textarea (aria + user hint). */
  ariaLabel?: string;
  /** Called with the new value on any change (typing, dictation, polish). */
  name?: string;
  id?: string;
}

type Mode = null | "recording" | "transcribing" | "polishing";

// Minimal typing for the vendor-prefixed Web Speech API. Not in lib.dom.d.ts.
interface SpeechRecognitionAlt {
  new (): SpeechRecognitionInstance;
}
interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      0: { transcript: string };
    };
  };
}

function getSpeechRecognitionCtor(): SpeechRecognitionAlt | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionAlt;
    webkitSpeechRecognition?: SpeechRecognitionAlt;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function SmartTextarea({
  value,
  onChange,
  placeholder,
  rows = 4,
  className,
  disabled = false,
  polish = true,
  dictate = true,
  ariaLabel,
  name,
  id,
}: Props) {
  const [mode, setMode] = useState<Mode>(null);
  const [error, setError] = useState<string | null>(null);
  const [previous, setPrevious] = useState<string | null>(null);
  const [interim, setInterim] = useState("");
  const [suggestion, setSuggestion] = useState<{
    original: string;
    proposed: string;
  } | null>(null);
  const { pendingKind, requestConsent, onGranted, onCancel } = useAiConsent();

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const shouldRestartRecognitionRef = useRef(false);

  // Where the pre-recording text ended, so Whisper can replace only what was
  // captured live and leave existing typed text untouched.
  const baseValueRef = useRef("");
  // Text the browser recognizer captured live during this recording session.
  // On stop we ask Whisper to re-transcribe the same audio and replace this
  // with the more accurate version.
  const liveCapturedRef = useRef("");

  useEffect(() => {
    return () => {
      teardownRecognition();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  function teardownRecognition() {
    shouldRestartRecognitionRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        /* already stopped */
      }
      recognitionRef.current = null;
    }
  }

  function startLiveRecognition() {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return; // browser doesn't support it — Whisper still runs on stop
    try {
      const rec = new Ctor();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-AU";

      rec.onresult = (event) => {
        let finalText = "";
        let interimText = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const r = event.results[i];
          const t = r[0].transcript;
          if (r.isFinal) finalText += t + " ";
          else interimText += t;
        }
        if (finalText) {
          liveCapturedRef.current =
            liveCapturedRef.current + (liveCapturedRef.current ? " " : "") + finalText.trim();
          // Push live text into the textarea so the user sees it appear as they speak.
          const merged = mergeBaseAndLive(baseValueRef.current, liveCapturedRef.current);
          onChange(merged);
        }
        setInterim(interimText);
      };

      rec.onerror = (e) => {
        // "aborted" fires when we intentionally stop. "no-speech" fires after silence.
        if (e.error === "aborted" || e.error === "no-speech") return;
        // Any other error — just stop restarting; Whisper will still confirm on stop.
        shouldRestartRecognitionRef.current = false;
      };

      rec.onend = () => {
        // Recognizer stops itself after a few seconds of silence. Restart while
        // still recording so the live transcript keeps flowing.
        if (shouldRestartRecognitionRef.current) {
          try {
            rec.start();
          } catch {
            /* ignore */
          }
        }
      };

      shouldRestartRecognitionRef.current = true;
      recognitionRef.current = rec;
      rec.start();
    } catch {
      // Ignore — Whisper will still run when the user stops.
    }
  }

  async function startRecording() {
    setError(null);
    setInterim("");
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Voice input isn't supported in this browser.");
      return;
    }
    const ok = await requestConsent("transcribe-audio");
    if (!ok) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      liveCapturedRef.current = "";
      baseValueRef.current = value;
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        void transcribe();
      };
      recorderRef.current = rec;
      rec.start();
      setMode("recording");
      startLiveRecognition();
    } catch {
      setError("Couldn't access the microphone. Check browser permissions.");
    }
  }

  function stopRecording() {
    teardownRecognition();
    setInterim("");
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setMode("transcribing");
  }

  async function transcribe() {
    const blob = new Blob(chunksRef.current, {
      type: chunksRef.current[0]?.type || "audio/webm",
    });
    chunksRef.current = [];
    if (blob.size === 0) {
      setMode(null);
      return;
    }
    try {
      const fd = new FormData();
      const ext = blob.type.includes("mp4") ? "mp4" : "webm";
      fd.append("audio", new File([blob], `dictation.${ext}`, { type: blob.type }));
      const res = await fetch("/api/transcribe", { method: "POST", body: fd });
      if (!res.ok) {
        // Keep whatever Web Speech captured — better than nothing.
        setError("Transcription check failed — kept live capture.");
        setMode(null);
        return;
      }
      const { text } = (await res.json()) as { text: string };
      if (text) {
        // Replace the live-captured chunk with Whisper's more accurate version.
        const merged = mergeBaseAndLive(baseValueRef.current, text.trim());
        onChange(merged);
      }
      setMode(null);
    } catch {
      setError("Transcription check failed — kept live capture.");
      setMode(null);
    }
  }

  async function handlePolish() {
    if (!value.trim()) {
      setError("Nothing to polish yet.");
      return;
    }
    const ok = await requestConsent("polish-text");
    if (!ok) return;
    setError(null);
    setMode("polishing");
    try {
      const res = await fetch("/api/polish-text", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: value }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(
          j.error === "text_too_long"
            ? "Too long to polish (max 8,000 characters)."
            : "Polish failed. Try again."
        );
        setMode(null);
        return;
      }
      const { text } = (await res.json()) as { text: string };
      if (text && text !== value) {
        setSuggestion({ original: value, proposed: text });
      } else {
        setError("No changes suggested — your text looks fine.");
      }
    } catch {
      setError("Polish failed. Try again.");
    } finally {
      setMode(null);
    }
  }

  function acceptSuggestion() {
    if (!suggestion) return;
    setPrevious(suggestion.original);
    onChange(suggestion.proposed);
    setSuggestion(null);
  }

  function undoPolish() {
    if (previous == null) return;
    onChange(previous);
    setPrevious(null);
  }

  const busy = mode !== null || disabled;
  const showUndo = previous != null && !busy;
  const isRecording = mode === "recording";

  return (
    <div className="space-y-1">
      <div className="relative">
        <textarea
          id={id}
          name={name}
          value={value}
          onChange={(e) => {
            setPrevious(null);
            onChange(e.target.value);
          }}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled || mode === "transcribing"}
          aria-label={ariaLabel}
          className={
            className ??
            "w-full rounded-xl border border-tal-line px-3 py-2 pr-2 bg-white disabled:bg-tal-cream-soft"
          }
        />
        {isRecording && interim && (
          <div className="mt-1 text-xs text-tal-plum-soft italic">
            <span className="opacity-70">…</span> {interim}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {dictate && (
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={disabled || mode === "transcribing" || mode === "polishing"}
            className={
              "inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition " +
              (isRecording
                ? "bg-red-600 text-white hover:bg-red-700"
                : "border border-tal-line bg-white text-tal-plum hover:bg-tal-cream-soft") +
              " disabled:opacity-60"
            }
            title="Dictate — speak instead of typing"
          >
            {isRecording ? (
              <>
                <span className="inline-block w-2 h-2 rounded-full bg-white animate-pulse" />
                Stop
              </>
            ) : mode === "transcribing" ? (
              <>
                <Spinner /> Checking…
              </>
            ) : (
              <>
                <MicIcon /> Dictate
              </>
            )}
          </button>
        )}
        {polish && (
          <button
            type="button"
            onClick={handlePolish}
            disabled={disabled || mode !== null || !value.trim()}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium border border-violet-300 bg-violet-50 text-violet-800 hover:bg-violet-100 disabled:opacity-60 transition"
            title="Polish — let AI tidy up spelling and wording"
          >
            {mode === "polishing" ? (
              <>
                <Spinner /> Polishing…
              </>
            ) : (
              <>✨ Polish</>
            )}
          </button>
        )}
        {showUndo && (
          <button
            type="button"
            onClick={undoPolish}
            className="text-xs text-tal-plum-soft hover:text-tal-plum underline"
          >
            Undo polish
          </button>
        )}
        {error && (
          <span className="text-xs text-red-700 ml-auto">{error}</span>
        )}
      </div>
      {suggestion && (
        <PolishPreviewModal
          original={suggestion.original}
          proposed={suggestion.proposed}
          onCancel={() => setSuggestion(null)}
          onAccept={acceptSuggestion}
        />
      )}
      {pendingKind && (
        <AiConsentGate
          kind={pendingKind}
          onGranted={onGranted}
          onCancel={onCancel}
        />
      )}
    </div>
  );
}

function PolishPreviewModal({
  original,
  proposed,
  onCancel,
  onAccept,
}: {
  original: string;
  proposed: string;
  onCancel: () => void;
  onAccept: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Review polish suggestion"
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-3xl rounded-2xl bg-white shadow-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-5 pb-3 border-b border-tal-line">
          <h3 className="font-display text-lg text-tal-plum">
            Review polish suggestion
          </h3>
          <p className="text-xs text-tal-plum-soft mt-1">
            AI suggested some changes. Compare below and choose which version to
            keep.
          </p>
        </div>
        <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-tal-line max-h-[60vh] overflow-y-auto">
          <div className="p-5">
            <div className="text-xs uppercase tracking-wider text-tal-plum-soft mb-2">
              Your original
            </div>
            <div className="text-sm text-tal-plum whitespace-pre-wrap">
              {original}
            </div>
          </div>
          <div className="p-5 bg-violet-50/40">
            <div className="text-xs uppercase tracking-wider text-violet-800 mb-2">
              AI suggestion
            </div>
            <div className="text-sm text-tal-plum whitespace-pre-wrap">
              {proposed}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-tal-line flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-9 px-3 rounded-xl text-sm text-tal-plum hover:bg-tal-cream-soft"
          >
            Keep original
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="h-9 px-4 rounded-xl bg-violet-700 text-white text-sm font-medium hover:bg-violet-800"
          >
            Use suggestion
          </button>
        </div>
      </div>
    </div>
  );
}

function mergeBaseAndLive(base: string, live: string): string {
  if (!live) return base;
  if (!base) return live;
  return `${base.trimEnd()} ${live}`;
}

function MicIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="9"
        y="3"
        width="6"
        height="12"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M5 11a7 7 0 0 0 14 0M12 18v3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Spinner() {
  return (
    <span className="inline-block h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
  );
}
