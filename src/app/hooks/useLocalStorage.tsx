/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useState, useEffect, type Dispatch, type SetStateAction } from "react";

type SetValue<T> = Dispatch<SetStateAction<T>>;

function useLocalStorage<T>(key: string, defaultValue: T): [T, SetValue<T>] {
  const [value, setValue] = useState(defaultValue);

  const [isClient, setIsClient] = useState<boolean>(false);

  useEffect(() => {
    console.log("useLocalStorage init");
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    localStorage.setItem(key, JSON.stringify(value));
  }, [value, key]);

  useEffect(() => {
    if (!isClient) return;

    try {
      setValue(JSON.parse(localStorage.getItem(key) || String(defaultValue)));
    } catch (error) {
      setValue(defaultValue);
    }
  }, [isClient]);

  return [value, setValue];
}

export default useLocalStorage;
