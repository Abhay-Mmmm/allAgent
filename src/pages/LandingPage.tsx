import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { getTranslation } from '@/lib/translations';
import { MessageCircle, Shield, ChevronRight, Phone, ArrowLeft, Smartphone, LayoutDashboard, ScanLine } from 'lucide-react';

export const LandingPage = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const handleBack = () => navigate('/');
  const handleStartChat = () => navigate('/mobile/chat');
  const handleStartVoiceCall = () => navigate('/mobile/call');
  const handleStartDocumentScan = () => navigate('/mobile/scan');
  const handleSwitchToDashboard = () => navigate('/dashboard');

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-card">
        <div className="flex items-center gap-2">
          <button
            onClick={handleBack}
            className="p-2 rounded-xl hover:bg-secondary transition-colors mr-1"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="w-10 h-10 rounded-xl gradient-card flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-accessible-lg font-bold text-foreground">
            {getTranslation(language, 'appName')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Mobile Badge */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-purple-100 text-purple-700">
            <Smartphone className="w-3 h-3" />
            Mobile
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 space-y-6">
        {/* Hero Card with Gradient */}
        <div className="gradient-card rounded-3xl p-5 text-primary-foreground relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 bg-accent text-accent-foreground text-sm font-semibold rounded-full flex items-center gap-1">
                <span className="w-2 h-2 bg-accent-foreground rounded-full animate-pulse" />
                Active
              </span>
            </div>

            <p className="text-white/70 text-sm uppercase tracking-wide mb-1">
              Your Insurance Assistant
            </p>
            <h2 className="text-2xl font-bold mb-1">
              {getTranslation(language, 'tagline')}
            </h2>
            <p className="text-white/80 text-accessible-sm">
              Get instant answers about crop insurance, schemes, and claims
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-2xl p-4 card-shadow">
            <p className="text-muted-foreground text-sm mb-1">Quick Answers</p>
            <p className="text-accessible-xl font-bold text-foreground">24/7</p>
            <p className="text-accent text-sm font-medium flex items-center gap-1">
              <span className="w-2 h-2 bg-accent rounded-full" />
              Always Available
            </p>
          </div>
          <div className="bg-card rounded-2xl p-4 card-shadow">
            <p className="text-muted-foreground text-sm mb-1">Languages</p>
            <p className="text-accessible-xl font-bold text-foreground">1</p>
            <p className="text-muted-foreground text-sm">English</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-accessible-lg font-semibold text-foreground">
              How can we help?
            </h3>
          </div>

          {/* Action Items */}
          <div className="space-y-2">


            <button
              onClick={handleStartVoiceCall}
              className="w-full flex items-center gap-4 bg-card rounded-2xl p-4 card-shadow hover:shadow-soft-lg transition-shadow border-2 border-primary/20"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Phone className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-foreground">Voice Support</p>
                <p className="text-muted-foreground text-sm">
                  Speak in your language
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>

            {/* Switch to Dashboard */}
            <button
              onClick={handleSwitchToDashboard}
              className="w-full flex items-center gap-4 bg-slate-100 rounded-2xl p-4 hover:bg-slate-200 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-slate-700 flex items-center justify-center">
                <LayoutDashboard className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-foreground">Agent Dashboard</p>
                <p className="text-muted-foreground text-sm">
                  Switch to agent view
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </main>

      {/* Bottom Action Bar */}
      <div className="sticky bottom-0 px-4 py-4 bg-background border-t border-border">
        <div className="flex gap-3">
          <button
            onClick={handleStartDocumentScan}
            className="flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-card border border-border font-semibold text-foreground shadow-soft"
          >
            <ScanLine className="w-5 h-5" />
            Scan
          </button>
          <button
            onClick={handleStartChat}
            className="flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-2xl gradient-card font-semibold text-primary-foreground shadow-soft-lg"
          >
            <MessageCircle className="w-5 h-5" />
            {getTranslation(language, 'startChat')}
          </button>
        </div>
      </div>
    </div>
  );
};