import { createFileRoute } from "@tanstack/react-router";
import { Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/medicines")({
  head: () => ({ meta: [{ title: "Medicines — Greenacres Pharmacy" }] }),
  component: () => <Navigate to="/inventory" />,
});
