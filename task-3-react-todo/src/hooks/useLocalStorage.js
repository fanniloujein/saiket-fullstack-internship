import { useEffect, useState } from "react";

// Read a saved value once; return the fallback if storage is empty, broken or blocked.
export function readStorage(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

// Save `value` to localStorage every time it changes.
export function usePersist(key, value) {
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // private mode or full storage: the app keeps working, just without saving
    }
  }, [key, value]);
}

// Custom hook: like useState, but the value survives a page reload.
export function useLocalStorage(key, fallback) {
  const [value, setValue] = useState(() => readStorage(key, fallback));
  usePersist(key, value);
  return [value, setValue];
}
