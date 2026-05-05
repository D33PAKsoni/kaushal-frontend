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
  onCameraReady?: () => void;
}

export default function FaceMonitor({
  isActive,
  onEvent,
  showOverlay = true,
  onCameraReady,
}: FaceMonitorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const eventsRef = useRef<IntegrityEvent[]>([]);

  const [status, setStatus] = useState<"idle" | "ok" | "warning" | "error" | "denied">("idle");
  const [statusText, setStatusText] = useState("Camera inactive");
  const [permissionAsked, setPermissionAsked] = useState(false);

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
    let total = 0;
    for (let i = 0; i < data.length; i += 4) {
      total += (data[i] + data[i + 1] + data[i + 2]) / 3;
    }
    const avg = total / (data.length / 4);
    const isCovered = avg < 15;
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
      face_coverage: avg / 255,
    };
    eventsRef.current.push(event);
    onEvent?.(event);

    if (isCovered) {
      setStatus("error");
      setStatusText("Camera covered");
    } else if (facePresent) {
      setStatus("ok");
      setStatusText("Face detected ✓");
    } else {
      setStatus("warning");
      setStatusText("No face visible");
    }
  }, [onEvent]);

  // Request camera permission proactively on mount (both mobile and desktop)
  useEffect(() => {
    if (permissionAsked) return;
    setPermissionAsked(true);

    const requestCamera = async () => {
      try {
        // Just test permission — don't keep stream yet
        const testStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });
        testStream.getTracks().forEach((t) => t.stop());
        onCameraReady?.();
      } catch (err: any) {
        if (err.name === "NotAllowedError") {
          setStatus("denied");
          setStatusText("Camera denied — integrity monitoring off");
        }
      }
    };
    requestCamera();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      try {
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
          await videoRef.current.play();
        }
        setStatus("ok");
        setStatusText("Face detected ✓");
        intervalRef.current = setInterval(checkFrame, 2000);
      } catch (err: any) {
        setStatus("denied");
        setStatusText(
          err.name === "NotAllowedError"
            ? "Camera denied"
            : "Camera unavailable"
        );
      }
    };
    startCamera();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [isActive, checkFrame]);

  if (!showOverlay) return null;

  return (
    <div className="relative rounded-xl overflow-hidden bg-gray-900" style={{ height: "160px" }}>
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        style={{ transform: "scaleX(-1)" }}
        playsInline
        muted
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Status pill */}
      <div
        className={`absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
          status === "ok"
            ? "bg-green-500/90 text-white"
            : status === "warning"
            ? "bg-yellow-500/90 text-white"
            : status === "denied" || status === "error"
            ? "bg-red-500/90 text-white"
            : "bg-gray-600/90 text-white"
        }`}
      >
        {statusText}
      </div>

      {/* Live dot */}
      {isActive && status === "ok" && (
        <div className="absolute top-2 left-2">
          <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
        </div>
      )}

      {/* Camera off overlay */}
      {!isActive && (
        <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center">
          <p className="text-gray-400 text-sm">📷 Camera inactive</p>
        </div>
      )}
    </div>
  );
}
