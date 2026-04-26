import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import PlaceholderPage from "./pages/PlaceholderPage.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route
            path="/discover"
            element={
              <PlaceholderPage
                title="Discover coaches"
                description="Browse verified coaches by niche, price, and rating. Coming in the next round."
              />
            }
          />
          <Route
            path="/feed"
            element={
              <PlaceholderPage
                title="Your feed"
                description="Posts from every coach you subscribe to, newest first."
              />
            }
          />
          <Route
            path="/messages"
            element={
              <PlaceholderPage
                title="Messages"
                description="Direct, real-time chat with your coach. Subscriber-only."
              />
            }
          />
          <Route
            path="/sessions"
            element={
              <PlaceholderPage
                title="Live sessions"
                description="Book and manage 1:1 calls with your coach."
              />
            }
          />
          <Route
            path="/me"
            element={
              <PlaceholderPage
                title="Your profile"
                description="Account, subscriptions, payouts and settings."
              />
            }
          />
          <Route
            path="/auth"
            element={
              <PlaceholderPage
                title="Sign in to ONLY/COACH"
                description="Email + password and Google sign-in arrive in round 2 with Lovable Cloud."
              />
            }
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
