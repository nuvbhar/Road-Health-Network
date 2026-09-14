import React, { useEffect } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { Header } from "./components/layout/Header";
import { PageShell } from "./components/layout/PageShell";
import { OverviewPage } from "./pages/OverviewPage";
import { ReportsPage } from "./pages/ReportsPage";
import { useAppStore } from "./store/useAppStore";
import { supabase } from "./services/supabaseClient";

const LiveSensorPage = React.lazy(() =>
  import("./pages/LiveSensorPage").then((m) => ({ default: m.LiveSensorPage })),
);
const MobileSensorPage = React.lazy(() =>
  import("./pages/MobileSensorPage").then((m) => ({
    default: m.MobileSensorPage,
  })),
);

export const App: React.FC = () => {
  const loadInitialData = useAppStore((state) => state.loadInitialData);

  useEffect(() => {
    loadInitialData();

    // Subscribe to real-time changes to update UI across all views
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reports' },
        (payload) => {
          console.log('Real-time report update received:', payload);
          loadInitialData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadInitialData]);

  return (
    <HashRouter>
      <Header />
      <PageShell>
        <React.Suspense fallback={<div>Loading Live Sensor...</div>}>
          <Routes>
            <Route path="/" element={<OverviewPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/live-sensor" element={<LiveSensorPage />} />
            <Route path="/sensor" element={<MobileSensorPage />} />
          </Routes>
        </React.Suspense>
      </PageShell>
    </HashRouter>
  );
};
