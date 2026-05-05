"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface IntegrityEvent {
  timestamp_ms: number;
  event_type: "face_ok" | "no_face" | "multiple_faces" | "face_covered";
  face_detected: boolean;
  multiple_faces: boolean;
  face_coverage: number;
}

interface FaceMonitorProps {
  isActive: boolean;
  onEvent?: (event: IntegrityEvent) => void;
  showOverlay?: boolean;
  lang?: string;
}

export default function FaceMonitor({
  isActive,
  onEvent,
  showOverlay = true,
  lang = "kn",
}: FaceMonitorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const eventsRef = useRef<IntegrityEvent[]>([]);

  const [status, setStatus] = useState<"idle" | "requesting" | "ok" | "warning" | "error">("idle");
  const [statusText, setStatusText] = useState("");
  const [permissionDenied, setPermissionDenied] = useState(false);

  const labels = {
    requesting: { kn: "ಕ್ಯಾಮೆರಾ ಅನುಮತಿ ಕೋರಲಾಗುತ್ತಿದೆ...", en: "Requesting camera..." },
    denied: { kn: "ಕ್ಯಾಮೆರಾ ಅನುಮತಿ ಇಲ್ಲ", en: "Camera permission denied" },
    ok: { kn: "✓ ಕ್ಯಾಮೆರಾ ಸಕ್ರಿಯ", en: "✓ Camera active" },
    covered: { kn: "⚠ ಕ್ಯಾಮೆರಾ ಮುಚ್ಚಲಾಗಿದೆ", en: "⚠ Camera covered" },
    noFace: { kn: "⚠ ಮುಖ ಕಾಣಿಸುತ್ತಿಲ್ಲ", en: "⚠ Face not visible" },
  };

  const l = (key: keyof typeof labels) =>
    labels[key][lang as "kn" | "en"] ?? labels[key]["en"];

  const checkFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx || video.readyState < 2) return;

    canvas.width = 160;
    canvas.height = 120;
    ctx.drawImage(video, 0, 0, 160, 120);

    const imageData = ctx.getImageData(0, 0, 160, 120);
    const data = imageData.data;
    let total = 0;
    for (let i = 0; i < data.length; i += 4) {
      total += (data[i] + data[i + 1] + data[i + 2]) / 3;
    }
    const avg = total / (data.length / 4);
    const isCovered = avg < 15;
    const facePresent = !isCovered;

    const event: IntegrityEvent = {
      timestamp_ms: Date.now(),
      event_type: isCovered ? "face_covered" : "face_ok",
      face_detected: facePresent,
      multiple_faces: false,
      face_coverage: avg / 255,
    };

    eventsRef.current.push(event);
    onEvent?.(event);

    if (isCovered) {
      setStatus("error");
      setStatusText(l("covered"));
    } else {
      setStatus("ok");
      setStatusText(l("ok"));
    }
  }, [onEvent, lang]);

  useEffect(() => {
    if (!isActive) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      setStatus("idle");
      return;
    }

    const startCamera = async () => {
      setStatus("requesting");
      setStatusText(l("requesting"));

      try {
        /**
         * Fix for Issue 2 (no camera on desktop):
         * We explicitly call getUserMedia with video constraints.
         * On desktop Chrome this WILL show the permission bar.
         * The key was that previous code was sometimes not awaiting
         * properly or the component was unmounting before the prompt appeared.
         * We also add a small delay to ensure the component is mounted.
         */
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 320 },
            height: { ideal: 240 },
          },
          audio: false,
        });

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Use onloadedmetadata to ensure video dimensions are ready
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().then(() => {
              setStatus("ok");
              setStatusText(l("ok"));
              // Start integrity checks every 2 seconds
              intervalRef.current = setInterval(checkFrame, 2000);
            });
          };
        }
      } catch (err: any) {
        console.error("Camera error:", err);
        setPermissionDenied(true);
        setStatus("error");
        setStatusText(l("denied"));
      }
    };

    // Small delay ensures component is fully mounted before prompt
    const timer = setTimeout(startCamera, 300);
    return () => {
      clearTimeout(timer);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isActive, checkFrame, lang]);

  if (!showOverlay) return null;

  return (
    <div className="relative rounded-xl overflow-hidden bg-gray-900">
      {/* Video element — always rendered so browser can attach stream */}
      <video
        ref={videoRef}
        className="w-full object-cover rounded-xl"
        style={{
          maxHeight: "160px",
          transform: "scaleX(-1)", // mirror for selfie view
          display: status === "idle" ? "none" : "block",
        }}
        playsInline
        muted
        autoPlay
      />

      {/* Hidden canvas for pixel analysis */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Permission denied fallback */}
      {permissionDenied && (
        <div className="bg-gray-800 rounded-xl px-4 py-3 text-center">
          <p className="text-yellow-400 text-xs">
            {lang === "kn"
              ? "📷 ಕ್ಯಾಮೆರಾ ಅನುಮತಿ ಬೇಕು — ಬ್ರೌಸರ್ ಸೆಟ್ಟಿಂಗ್ ಪರಿಶೀಲಿಸಿ"
              : "📷 Camera permission needed — check browser settings"}
          </p>
          <p className="text-gray-400 text-xs mt-1">
            {lang === "kn"
              ? "ಸಂದರ್ಶನ ಮುಂದುವರಿಯುತ್ತದೆ (ಮೈಕ್ ಮಾತ್ರ)"
              : "Interview will continue (microphone only)"}
          </p>
        </div>
      )}

      {/* Requesting state */}
      {status === "requesting" && !permissionDenied && (
        <div className="bg-gray-800 rounded-xl px-4 py-3 text-center">
          <p className="text-blue-300 text-xs animate-pulse">
            {lang === "kn"
              ? "📷 ಕ್ಯಾಮೆರಾ ಅನುಮತಿ ಕೋರಲಾಗುತ್ತಿದೆ..."
              : "📷 Requesting camera access..."}
          </p>
          <p className="text-gray-400 text-xs mt-1">
            {lang === "kn"
              ? "ಬ್ರೌಸರ್ ಮೇಲ್ಭಾಗದಲ್ಲಿ Allow ಕ್ಲಿಕ್ ಮಾಡಿ"
              : "Click Allow in the browser bar above"}
          </p>
        </div>
      )}

      {/* Status overlay on video */}
      {status !== "idle" && status !== "requesting" && !permissionDenied && (
        <div
          className={`absolute top-2 right-2 px-2 py-1 rounded-lg text-xs font-medium ${
            status === "ok"
              ? "bg-green-500/80 text-white"
              : status === "warning"
              ? "bg-yellow-500/80 text-white"
              : "bg-red-500/80 text-white"
          }`}
        >
          {statusText}
        </div>
      )}

      {/* Live indicator dot */}
      {status === "ok" && (
        <div className="absolute top-2 left-2">
          <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse" />
        </div>
      )}
    </div>
  );
}
