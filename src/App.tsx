import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import RequireAuth from "./components/auth/RequireAuth.tsx";
import { DeepLinkHandler } from "./components/DeepLinkHandler.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import { I18nProvider } from "./lib/i18n.tsx";

// Public, hot-path routes — keep eagerly loaded so the landing page
// and auth flow don't pay an extra round-trip on first paint.
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Discover from "./pages/Discover.tsx";
import Auth from "./pages/Auth.tsx";

// Everything else — code-split. Each chunk loads only when its route
// is hit, which keeps the initial bundle reasonable.
const CoachProfile = lazy(() => import("./pages/CoachProfile.tsx"));
const Feed = lazy(() => import("./pages/Feed.tsx"));
const Messages = lazy(() => import("./pages/Messages.tsx"));
const Sessions = lazy(() => import("./pages/Sessions.tsx"));
const Me = lazy(() => import("./pages/Me.tsx"));
const Studio = lazy(() => import("./pages/Studio.tsx"));
const NewPost = lazy(() => import("./pages/NewPost.tsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.tsx"));
const Onboarding = lazy(() => import("./pages/Onboarding.tsx"));
const Settings = lazy(() => import("./pages/Settings.tsx"));
const Legal = lazy(() => import("./pages/Legal.tsx"));
const Challenges = lazy(() => import("./pages/Challenges.tsx"));
const ChallengeDetail = lazy(() => import("./pages/ChallengeDetail.tsx"));
const Community = lazy(() => import("./pages/Community.tsx"));
const Analytics = lazy(() => import("./pages/Analytics.tsx"));
const Subscribers = lazy(() => import("./pages/Subscribers.tsx"));
const Payouts = lazy(() => import("./pages/Payouts.tsx"));
const Referrals = lazy(() => import("./pages/Referrals.tsx"));
const MassMessage = lazy(() => import("./pages/MassMessage.tsx"));
const StudioChallenges = lazy(() => import("./pages/StudioChallenges.tsx"));
const StudioTiers = lazy(() => import("./pages/StudioTiers.tsx"));
const StudioContent = lazy(() => import("./pages/StudioContent.tsx"));
const SavedPosts = lazy(() => import("./pages/SavedPosts.tsx"));
const Notifications = lazy(() => import("./pages/Notifications.tsx"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="flex min-h-[40vh] items-center justify-center">
    <div className="brutal-tag">Loading…</div>
  </div>
);

const App = () => (
  <ErrorBoundary>
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <DeepLinkHandler />
            <Suspense fallback={<RouteFallback />}>
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
                <Route path="/studio/content" element={<RequireAuth><StudioContent /></RequireAuth>} />
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
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </I18nProvider>
  </ErrorBoundary>
);

export default App;
