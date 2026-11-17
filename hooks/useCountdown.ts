"use client";
import { useState, useEffect } from "react";

export function useCountdownFromDate(endDate: string): { display: string; isUrgent: boolean; isEnded: boolean } {
  const [display, setDisplay] = useState("00:00:00");
  const [isUrgent, setIsUrgent] = useState(false);
  const [isEnded, setIsEnded] = useState(false);

  useEffect(() => {
    const end = new Date(endDate).getTime();
    const update = () => {
      const diff = end - Date.now();
      if (diff <= 0) {
        setIsEnded(true);
        setDisplay("00:00:00");
        return;
      }
      setIsUrgent(diff < 3600000);
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setDisplay([h, m, s].map((n) => String(n).padStart(2, "0")).join(":"));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [endDate]);

  return { display, isUrgent, isEnded };
}

/**
 * Duration-based countdown hook.
 * Accepts a time string like "11:42:08" and counts down from that duration.
 * Returns the formatted string and urgency flags.
 */
export default function useCountdown(timeStr?: string): string | null {
  const [time, setTime] = useState(timeStr || null);

  useEffect(() => {
    if (!timeStr) return;
    const [h, m, s] = timeStr.split(":").map(Number);
    let total = h * 3600 + m * 60 + s;
    if (total <= 0) {
      setTime("00:00:00");
      return;
    }
    setTime(
      [h, m, s].map((n) => String(n).padStart(2, "0")).join(":")
    );
    const id = setInterval(() => {
      total--;
      if (total < 0) {
        clearInterval(id);
        setTime("00:00:00");
        return;
      }
      const hh = Math.floor(total / 3600);
      const mm = Math.floor((total % 3600) / 60);
      const ss = total % 60;
      setTime(
        [hh, mm, ss].map((n) => String(n).padStart(2, "0")).join(":")
      );
    }, 1000);
    return () => clearInterval(id);
  }, [timeStr]);

  return time;
}