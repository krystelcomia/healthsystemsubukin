import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Register Service Worker for PWA download & offline support
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("Service Worker registered with scope:", registration.scope);
      })
      .catch((error) => {
        console.error("Service Worker registration error:", error);
      });
  });
} else if ("serviceWorker" in navigator) {
  // In development, also register to test PWA capabilities if desired
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("Dev Service Worker registered:", registration.scope);
      })
      .catch(() => {});
  });
}

createRoot(document.getElementById("root")!).render(<App />);
