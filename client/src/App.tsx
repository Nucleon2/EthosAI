/**
 * App - Root application component with client-side routing.
 * Uses react-router v7 with a shared Layout wrapper.
 */

import { BrowserRouter, Routes, Route } from "react-router";
import { Layout } from "@/components/layout";
import { HomePage } from "@/features/home";
import { DashboardPage } from "@/features/dashboard";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="dashboard" element={<DashboardPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
