import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/shared/styles/base.css";
import "@/site/styles"; // before App, so component CSS loads after it
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
