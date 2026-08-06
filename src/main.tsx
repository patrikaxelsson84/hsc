import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";

import { RouterProvider } from "react-router-dom";
import { router } from "./app/router";
import { initCompetitions } from "./data/competitions";
import { LanguageProvider } from "./lib/language";

initCompetitions();

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <LanguageProvider>
            <RouterProvider router={router} />
        </LanguageProvider>
    </StrictMode>
);