import { Navigate, useParams } from "react-router-dom";

/** iOS deep-link aliases for checkout flows. The native app routes
 *  /subscribe/:tier_id and /book/:slot_id to web; we redirect those URLs
 *  to /discover (the user picks the coach). /account/billing → /settings/billing. */
export function SubscribeRedirect() {
  const { tier_id } = useParams();
  return <Navigate to={`/discover?subscribe=${tier_id ?? ""}`} replace />;
}
export function BookRedirect() {
  const { slot_id } = useParams();
  return <Navigate to={`/discover?book=${slot_id ?? ""}`} replace />;
}
export function AccountBillingRedirect() {
  return <Navigate to="/settings/billing" replace />;
}
