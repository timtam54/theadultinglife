"use client";

import { useEffect } from "react";

// Inside the WordPress iframe: tells the website how tall the shop is, so
// the iframe grows to fit (the website's snippet listens for this).
export function EmbedResizer() {
  useEffect(() => {
    const send = () =>
      window.parent?.postMessage({ type: "tal-shop-height", height: document.documentElement.scrollHeight }, "*");
    send();
    const observer = new ResizeObserver(send);
    observer.observe(document.body);
    window.addEventListener("load", send);
    return () => {
      observer.disconnect();
      window.removeEventListener("load", send);
    };
  }, []);
  return null;
}
