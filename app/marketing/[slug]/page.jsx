"use client";
import { useEffect, useState, useCallback } from "react";
import MarketingDashboardView from "@/components/MarketingDashboardView";
import AddProductModal from "@/components/AddProductModal";
import { Loader2 } from "lucide-react";

export default function ClientDashboardPage({ params }) {
  const { slug } = params;
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [addProductOpen, setAddProductOpen] = useState(false);

  const loadDashboard = useCallback(() => {
    return fetch(`/api/marketing-dashboards?slug=${encodeURIComponent(slug)}`)
      .then(r => r.json())
      .then(j => {
        if (j.error || !j.dashboard) {
          setState({ loading: false, error: j.error || "Dashboard not found", data: null });
        } else {
          const d = j.dashboard;
          setState({
            loading: false,
            error: null,
            data: {
              headers: d.headers || [],
              rows: d.rows || [],
              fileName: d.file_name || "Data",
              title: d.title,
              description: d.description,
              clientName: d.client_name,
              clientId: d.client_id,
            },
          });
        }
      })
      .catch(e => setState({ loading: false, error: e.message, data: null }));
  }, [slug]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  if (state.loading) {
    return (
      <div style={{
        minHeight: "100vh", background: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 16,
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}>
        <Loader2 size={24} style={{ animation: "spin 0.8s linear infinite", color: "#86868B" }} />
        <div style={{ fontSize: 13, color: "#86868B" }}>Loading dashboard...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Always render the dashboard shell. If there's no data yet, the view shows
  // an empty state and the user can hit "Add Product" to upload their first CSV.
  const dashboardData = state.data || { headers: [], rows: [], fileName: "No data yet" };

  return (
    <>
      <MarketingDashboardView
        data={dashboardData}
        onAddProduct={() => setAddProductOpen(true)}
      />
      <AddProductModal
        open={addProductOpen}
        slug={slug}
        onClose={() => setAddProductOpen(false)}
        onSuccess={() => {
          // Reload the dashboard data so the new product shows up in tabs immediately
          loadDashboard();
        }}
      />
    </>
  );
}
