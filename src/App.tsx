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
import Billing from "./pages/Billing.tsx";
import Transactions from "./pages/Transactions.tsx";
import Notifications from "./pages/Notifications.tsx";
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
import StudioAvailability from "./pages/StudioAvailability.tsx";
import SavedPosts from "./pages/SavedPosts.tsx";
import MenteeProfile from "./pages/MenteeProfile.tsx";
import ProfileRedirect from "./pages/ProfileRedirect.tsx";
import RequireAuth from "./components/auth/RequireAuth.tsx";
import { SubscribeRedirect, BookRedirect, AccountBillingRedirect } from "./components/CheckoutRedirects";
import RequireAdmin from "./components/auth/RequireAdmin.tsx";
import AdminOverview from "./pages/admin/AdminOverview.tsx";
import AdminUsers from "./pages/admin/AdminUsers.tsx";
import AdminCoaches from "./pages/admin/AdminCoaches.tsx";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions.tsx";
import AdminPayouts from "./pages/admin/AdminPayouts.tsx";
import AdminContent from "./pages/admin/AdminContent.tsx";
import AdminEmails from "./pages/admin/AdminEmails.tsx";
import AdminAnalytics from "./pages/admin/AdminAnalytics.tsx";
import AdminSystem from "./pages/admin/AdminSystem.tsx";
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
          <Route path="/mentee/:handle" element={<MenteeProfile />} />
          <Route path="/@:handle" element={<ProfileRedirect />} />
          <Route path="/challenges" element={<Challenges />} />
          <Route path="/challenges/:id" element={<ChallengeDetail />} />

          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/terms" element={<Legal kind="terms" />} />
          <Route path="/privacy" element={<Legal kind="privacy" />} />

          <Route path="/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />
          <Route path="/feed" element={<RequireAuth><Feed /></RequireAuth>} />
          <Route path="/saved" element={<RequireAuth><SavedPosts /></RequireAuth>} />
          <Route path="/community" element={<RequireAuth><Community /></RequireAuth>} />
          <Route path="/messages" element={<RequireAuth><Messages /></RequireAuth>} />
          <Route path="/messages/:conversationId" element={<RequireAuth><Messages /></RequireAuth>} />
          <Route path="/sessions" element={<RequireAuth><Sessions /></RequireAuth>} />
          <Route path="/me" element={<RequireAuth><Me /></RequireAuth>} />
          <Route path="/studio" element={<RequireAuth><Studio /></RequireAuth>} />
          <Route path="/studio/post/new" element={<RequireAuth><NewPost /></RequireAuth>} />
          <Route path="/studio/tiers" element={<RequireAuth><StudioTiers /></RequireAuth>} />
          <Route path="/studio/availability" element={<RequireAuth><StudioAvailability /></RequireAuth>} />
          <Route path="/studio/challenges" element={<RequireAuth><StudioChallenges /></RequireAuth>} />
          <Route path="/studio/broadcast" element={<RequireAuth><MassMessage /></RequireAuth>} />
          <Route path="/studio/analytics" element={<RequireAuth><Analytics /></RequireAuth>} />
          <Route path="/studio/subscribers" element={<RequireAuth><Subscribers /></RequireAuth>} />
          <Route path="/studio/payouts" element={<RequireAuth><Payouts /></RequireAuth>} />
          <Route path="/studio/referrals" element={<RequireAuth><Referrals /></RequireAuth>} />
          <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
          <Route path="/settings/billing" element={<RequireAuth><Billing /></RequireAuth>} />
          <Route path="/settings/notifications" element={<RequireAuth><Notifications /></RequireAuth>} />
          <Route path="/payouts" element={<RequireAuth><Payouts /></RequireAuth>} />
          <Route path="/subscribe/:tier_id" element={<SubscribeRedirect />} />
          <Route path="/book/:slot_id" element={<BookRedirect />} />
          <Route path="/account/billing" element={<AccountBillingRedirect />} />

          <Route path="/admin" element={<RequireAdmin><AdminOverview /></RequireAdmin>} />
          <Route path="/admin/users" element={<RequireAdmin><AdminUsers /></RequireAdmin>} />
          <Route path="/admin/coaches" element={<RequireAdmin><AdminCoaches /></RequireAdmin>} />
          <Route path="/admin/subscriptions" element={<RequireAdmin><AdminSubscriptions /></RequireAdmin>} />
          <Route path="/admin/payouts" element={<RequireAdmin><AdminPayouts /></RequireAdmin>} />
          <Route path="/admin/content" element={<RequireAdmin><AdminContent /></RequireAdmin>} />
          <Route path="/admin/emails" element={<RequireAdmin><AdminEmails /></RequireAdmin>} />
          <Route path="/admin/analytics" element={<RequireAdmin><AdminAnalytics /></RequireAdmin>} />
          <Route path="/admin/system" element={<RequireAdmin><AdminSystem /></RequireAdmin>} />

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
