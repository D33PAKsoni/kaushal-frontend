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
}

export default function FaceMonitor({
  isActive,
  onEvent,
  showOverlay = true,
}: FaceMonitorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const eventsRef = useRef<IntegrityEvent[]>([]);

  const [status, setStatus] = useState<"idle" | "ok" | "warning" | "error">("idle");
  const [statusText, setStatusText] = useState("ಕ್ಯಾಮೆರಾ ಆರಂಭಿಸಲಾಗುತ್ತಿದೆ...");
  const [faceDetected, setFaceDetected] = useState(false);

  // Simple face detection using canvas pixel analysis
  // In production this would use MediaPipe WASM
  // For Day 2 demo: camera on = face assumed present, checks for very dark frames
  const checkFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 160;
    canvas.height = 120;
    ctx.drawImage(video, 0, 0, 160, 120);

    const imageData = ctx.getImageData(0, 0, 160, 120);
    const data = imageData.data;

    // Calculate average brightness
    let totalBrightness = 0;
    for (let i = 0; i < data.length; i += 4) {
      totalBrightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
    }
    const avgBrightness = totalBrightness / (data.length / 4);

    // Very dark frame = camera covered or no face
    const isCovered = avgBrightness < 15;
    const facePresent = !isCovered && video.readyState >= 2;

    const eventType: IntegrityEvent["event_type"] = isCovered
      ? "face_covered"
      : facePresent
      ? "face_ok"
      : "no_face";

    const event: IntegrityEvent = {
      timestamp_ms: Date.now(),
      event_type: eventType,
      face_detected: facePresent,
      multiple_faces: false,
      face_coverage: avgBrightness / 255,
    };

    eventsRef.current.push(event);
    onEvent?.(event);
    setFaceDetected(facePresent);

    if (isCovered) {
      setStatus("error");
      setStatusText("ಕ್ಯಾಮೆರಾ ಮುಚ್ಚಲಾಗಿದೆ · Camera covered");
    } else if (facePresent) {
      setStatus("ok");
      setStatusText("✓ ಮುಖ ಪತ್ತೆಯಾಗಿದೆ");
    } else {
      setStatus("warning");
      setStatusText("⚠ ಮುಖ ಕಾಣಿಸುತ್ತಿಲ್ಲ");
    }
  }, [onEvent]);

  useEffect(() => {
    if (!isActive) {
      // Stop camera
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      setStatus("idle");
      return;
    }

    // Start camera
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 320, height: 240 },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStatus("ok");
        setStatusText("✓ ಮುಖ ಪತ್ತೆಯಾಗಿದೆ");

        // Check every 2 seconds as per spec
        intervalRef.current = setInterval(checkFrame, 2000);
      } catch (err) {
        console.error("Camera error:", err);
        setStatus("error");
        setStatusText("ಕ್ಯಾಮೆರಾ ಅನುಮತಿ ಇಲ್ಲ");
      }
    };

    startCamera();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isActive, checkFrame]);

  // Expose events for flush to backend
  const getEvents = useCallback(() => eventsRef.current, []);

  if (!showOverlay) return null;

  return (
    <div className="relative">
      {/* Hidden video element */}
      <video
        ref={videoRef}
        className="w-full rounded-xl object-cover"
        style={{ maxHeight: "160px", transform: "scaleX(-1)" }}
        playsInline
        muted
      />
      {/* Hidden canvas for pixel analysis */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Status overlay */}
      <div
        className={`absolute top-2 right-2 px-2 py-1 rounded-lg text-xs font-medium ${
          status === "ok"
            ? "bg-green-500/80 text-white"
            : status === "warning"
            ? "bg-yellow-500/80 text-white"
            : status === "error"
            ? "bg-red-500/80 text-white"
            : "bg-gray-500/80 text-white"
        }`}
      >
        {statusText}
      </div>

      {/* Face indicator dot */}
      <div className="absolute top-2 left-2">
        <div
          className={`w-3 h-3 rounded-full ${
            status === "ok" ? "bg-green-400 animate-pulse" : "bg-red-400"
          }`}
        />
      </div>
    </div>
  );
}

// Export getEvents via ref pattern
export type { FaceMonitorProps };
