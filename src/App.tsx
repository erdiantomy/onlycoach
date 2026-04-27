import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Discover from "./pages/Discover.tsx";
import CoachProfile from "./pages/CoachProfile.tsx";
import Feed from "./pages/Feed.tsx";
import Messages from "./pages/Messages.tsx";
import Sessions from "./pages/Sessions.tsx";
import Me from "./pages/Me.tsx";
import Studio from "./pages/Studio.tsx";
import NewPost from "./pages/NewPost.tsx";
import Auth from "./pages/Auth.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import Onboarding from "./pages/Onboarding.tsx";
import Settings from "./pages/Settings.tsx";
import Legal from "./pages/Legal.tsx";
import Challenges from "./pages/Challenges.tsx";
import ChallengeDetail from "./pages/ChallengeDetail.tsx";
import Community from "./pages/Community.tsx";
import Analytics from "./pages/Analytics.tsx";
import Subscribers from "./pages/Subscribers.tsx";
import Payouts from "./pages/Payouts.tsx";
import Referrals from "./pages/Referrals.tsx";
import MassMessage from "./pages/MassMessage.tsx";
import StudioChallenges from "./pages/StudioChallenges.tsx";
import StudioTiers from "./pages/StudioTiers.tsx";
import SavedPosts from "./pages/SavedPosts.tsx";
import Notifications from "./pages/Notifications.tsx";
import RequireAuth from "./components/auth/RequireAuth.tsx";
import { DeepLinkHandler } from "./components/DeepLinkHandler.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import { I18nProvider } from "./lib/i18n.tsx";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <DeepLinkHandler />
            <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/coach/:handle" element={<CoachProfile />} />
          <Route path="/challenges" element={<Challenges />} />
          <Route path="/challenges/:id" element={<ChallengeDetail />} />

          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/terms" element={<Legal kind="terms" />} />
          <Route path="/privacy" element={<Legal kind="privacy" />} />

          <Route path="/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />
          <Route path="/feed" element={<RequireAuth><Feed /></RequireAuth>} />
          <Route path="/saved" element={<RequireAuth><SavedPosts /></RequireAuth>} />
          <Route path="/notifications" element={<RequireAuth><Notifications /></RequireAuth>} />
          <Route path="/community" element={<RequireAuth><Community /></RequireAuth>} />
          <Route path="/messages" element={<RequireAuth><Messages /></RequireAuth>} />
          <Route path="/messages/:conversationId" element={<RequireAuth><Messages /></RequireAuth>} />
          <Route path="/sessions" element={<RequireAuth><Sessions /></RequireAuth>} />
          <Route path="/me" element={<RequireAuth><Me /></RequireAuth>} />
          <Route path="/studio" element={<RequireAuth><Studio /></RequireAuth>} />
          <Route path="/studio/post/new" element={<RequireAuth><NewPost /></RequireAuth>} />
          <Route path="/studio/challenges" element={<RequireAuth><StudioChallenges /></RequireAuth>} />
          <Route path="/studio/tiers" element={<RequireAuth><StudioTiers /></RequireAuth>} />
          <Route path="/studio/broadcast" element={<RequireAuth><MassMessage /></RequireAuth>} />
          <Route path="/studio/analytics" element={<RequireAuth><Analytics /></RequireAuth>} />
          <Route path="/studio/subscribers" element={<RequireAuth><Subscribers /></RequireAuth>} />
          <Route path="/studio/payouts" element={<RequireAuth><Payouts /></RequireAuth>} />
          <Route path="/studio/referrals" element={<RequireAuth><Referrals /></RequireAuth>} />
          <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </I18nProvider>
  </ErrorBoundary>
);

export default App;
