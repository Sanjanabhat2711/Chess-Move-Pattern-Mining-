/**
 * App.jsx — Root component: ThemeProvider + Router + Layout
 *
 * "/" → LandingPage (full-screen, no sidebar)
 * All other routes → wrapped in Layout with sidebar
 */
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';

import chessDark from './theme';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import MoveRecommender from './pages/MoveRecommender';
import AssociationRules from './pages/AssociationRules';
import OpeningAnalysis from './pages/OpeningAnalysis';

export default function App() {
  return (
    <ThemeProvider theme={chessDark}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          {/* Landing — no sidebar */}
          <Route path="/" element={<LandingPage />} />

          {/* Dashboard pages — wrapped in Layout */}
          <Route
            path="/*"
            element={
              <Layout>
                <Routes>
                  <Route path="/recommender" element={<MoveRecommender />} />
                  <Route path="/rules"        element={<AssociationRules />} />
                  <Route path="/openings"     element={<OpeningAnalysis />} />
                  <Route path="*"             element={<Navigate to="/recommender" replace />} />
                </Routes>
              </Layout>
            }
          />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
