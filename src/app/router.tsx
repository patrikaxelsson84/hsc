import { createBrowserRouter } from "react-router-dom";
import AdminLayout from "../layouts/AdminLayout";

import ClubPage from "../pages/ClubPage";
import CompetitionsPage from "../pages/CompetitionsPage";
import CompetitionsPublicPage from "../pages/CompetitionsPublicPage";
import DashboardPage from "../pages/DashboardPage";
import HomePage from "../pages/HomePage";
import PlayersPage from "../pages/PlayersPage";
import RegistrationPage from "../pages/RegistrationPage";
import ResultsPage from "../pages/ResultsPage";
import ScoringPage from "../pages/ScoringPage";

export const router = createBrowserRouter([
    {
        path: "/",
        element: <HomePage />,
    },
    {
        path: "/registration",
        element: <RegistrationPage />,
    },
    {
        path: "/club",
        element: <ClubPage />,
    },
    {
        path: "/competitions",
        element: <CompetitionsPublicPage />,
    },
    {
        path: "/admin",
        element: <AdminLayout />,
        children: [
            {
                index: true,
                element: <DashboardPage />,
            },
            {
                path: "players",
                element: <PlayersPage />,
            },
            {
                path: "competitions",
                element: <CompetitionsPage />,
            },
            {
                path: "registration",
                element: <RegistrationPage />,
            },
            {
                path: "scoring",
                element: <ScoringPage />,
            },
            {
                path: "results",
                element: <ResultsPage />,
            },
        ],
    },
]);
