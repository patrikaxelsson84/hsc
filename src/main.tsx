import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";

import { RouterProvider } from "react-router-dom";
import { router } from "./app/router";
import { LanguageProvider } from "./lib/language";
import { PlayersProvider } from "./contexts/PlayersContext";
import { CompetitionsProvider } from "./contexts/CompetitionsContext";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <LanguageProvider>
            <PlayersProvider>
                <CompetitionsProvider>
                    <RouterProvider router={router} />
                </CompetitionsProvider>
            </PlayersProvider>
        </LanguageProvider>
    </StrictMode>
);
