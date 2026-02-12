import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LanguageProvider } from "@/context/LanguageContext";
import { ModeSelectionPage } from "@/pages/ModeSelectionPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { LandingPage } from "@/pages/LandingPage";
import { ChatPage } from "@/pages/ChatPage";
import { VoiceCallPage } from "@/pages/VoiceCallPage";
import { DocumentScannerPage } from "@/pages/DocumentScannerPage";
import { ClaimsPage } from "@/pages/ClaimsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <LanguageProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/" element={<ModeSelectionPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/dashboard/claims" element={<ClaimsPage />} />
            <Route path="/dashboard/settings" element={<SettingsPage />} />
            <Route path="/mobile" element={<LandingPage />} />
            <Route path="/mobile/chat" element={<ChatPage />} />
            <Route path="/mobile/call" element={<VoiceCallPage />} />
            <Route path="/mobile/scan" element={<DocumentScannerPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
