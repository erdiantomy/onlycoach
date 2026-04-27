import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderStatus = "idle" | "recording" | "stopped" | "denied" | "unsupported";

export interface VoiceClip {
  blob: Blob;
  url: string;
  durationMs: number;
}

/**
 * Tiny wrapper around MediaRecorder for voice notes.
 *
 * - status reflects the lifecycle: idle → recording → stopped (or denied/unsupported)
 * - durationMs ticks while recording so callers can render a timer
 * - clip exposes the resulting Blob + an object URL for playback
 *
 * Caller is responsible for revoking URLs when the clip is sent or dropped.
 */
export const useVoiceRecorder = () => {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [durationMs, setDurationMs] = useState(0);
  const [clip, setClip] = useState<VoiceClip | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startedAtRef = useRef<number>(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("mediaDevices" in navigator) || typeof MediaRecorder === "undefined") {
      setStatus("unsupported");
    }
  }, []);

  const start = useCallback(async () => {
    if (status === "unsupported") return;
    if (clip?.url) URL.revokeObjectURL(clip.url);
    setClip(null);
    setDurationMs(0);
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const url = URL.createObjectURL(blob);
        setClip({ blob, url, durationMs: Date.now() - startedAtRef.current });
        setStatus("stopped");
        if (tickRef.current) clearInterval(tickRef.current);
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };
      recorder.start();
      startedAtRef.current = Date.now();
      setStatus("recording");
      tickRef.current = setInterval(() => {
        setDurationMs(Date.now() - startedAtRef.current);
      }, 200);
    } catch {
      setStatus("denied");
    }
  }, [status, clip]);

  const stop = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state === "recording") {
      recorderRef.current.stop();
    }
  }, []);

  const reset = useCallback(() => {
    if (clip?.url) URL.revokeObjectURL(clip.url);
    setClip(null);
    setDurationMs(0);
    setStatus(status === "unsupported" || status === "denied" ? status : "idle");
  }, [clip, status]);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (clip?.url) URL.revokeObjectURL(clip.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { status, durationMs, clip, start, stop, reset };
};
