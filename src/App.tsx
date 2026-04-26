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
import RequireAuth from "./components/auth/RequireAuth.tsx";
import { DeepLinkHandler } from "./components/DeepLinkHandler.tsx";

const queryClient = new QueryClient();

const App = () => (
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

          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/terms" element={<Legal kind="terms" />} />
          <Route path="/privacy" element={<Legal kind="privacy" />} />

          <Route path="/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />
          <Route path="/feed" element={<RequireAuth><Feed /></RequireAuth>} />
          <Route path="/messages" element={<RequireAuth><Messages /></RequireAuth>} />
          <Route path="/messages/:conversationId" element={<RequireAuth><Messages /></RequireAuth>} />
          <Route path="/sessions" element={<RequireAuth><Sessions /></RequireAuth>} />
          <Route path="/me" element={<RequireAuth><Me /></RequireAuth>} />
          <Route path="/studio" element={<RequireAuth><Studio /></RequireAuth>} />
          <Route path="/studio/post/new" element={<RequireAuth><NewPost /></RequireAuth>} />
          <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
