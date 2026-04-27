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

  if (state.error) {
    return (
      <div style={{
        minHeight: "100vh", background: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 12, padding: 32,
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}>
        <div style={{
          fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 32, color: "#1D1D1F",
        }}>Dashboard not found</div>
        <div style={{ fontSize: 14, color: "#86868B", textAlign: "center", maxWidth: 400 }}>
          This dashboard doesn't exist or may have been removed. {state.error}
        </div>
        <a href="/marketing" style={{
          marginTop: 16, padding: "8px 20px", borderRadius: 980,
          background: "#000", color: "#fff", textDecoration: "none",
          fontSize: 14, fontWeight: 500,
        }}>Upload new data</a>
      </div>
    );
  }

  return (
    <>
      <MarketingDashboardView
        data={state.data}
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
