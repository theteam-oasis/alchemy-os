"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, FolderOpen, Image, FileText, Sparkles, ArrowRight, MessageCircle, Send } from "lucide-react";

const G = {
  bg: "#FFFFFF", card: "#FFFFFF", cardBorder: "#E8E8ED",
  cardShadow: "0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)",
  gold: "#000000", goldSoft: "#00000008", goldBorder: "#D2D2D7",
  text: "#1D1D1F", textSec: "#86868B", textTer: "#AEAEB2",
  border: "#E8E8ED", success: "#34C759",
};
const hd = { fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 400, letterSpacing: "-0.02em" };
const mono = { fontFamily: "'Inter', -apple-system, sans-serif" };

export default function PortalHome() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [clientName, setClientName] = useState("");
  const [creating, setCreating] = useState(false);
  const [activeView, setActiveView] = useState("projects");
  const [conversations, setConversations] = useState([]);
  const [activeConvo, setActiveConvo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/portal/projects").then(r => r.json()).then(data => { setProjects(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const loadConversations = async () => {
    const res = await fetch("/api/portal/messages/all");
    const data = await res.json();
    setConversations(data);
    // Refresh active convo if open
    if (activeConvo) {
      const updated = data.find(c => c.projectId === activeConvo.projectId);
      if (updated) setActiveConvo(updated);
    }
  };

  useEffect(() => {
    if (activeView === "messages") {
      loadConversations();
      const iv = setInterval(loadConversations, 5000);
      return () => clearInterval(iv);
    }
  }, [activeView]);

  const sendReply = async () => {
    if (!replyText.trim() || !activeConvo || sendingReply) return;
    setSendingReply(true);
    await fetch("/api/portal/messages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: activeConvo.projectId, sender: "team", message: replyText.trim() }),
    });
    setReplyText("");
    setSendingReply(false);
    await loadConversations();
  };

  const createProject = async (e) => {
    e.preventDefault();
    if (!clientName.trim()) return;
    setCreating(true);
    const res = await fetch("/api/portal/projects", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientName: clientName.trim() }),
    });
    const project = await res.json();
    router.push(`/portal/create?id=${project.id}`);
  };

  return (
    <div style={{ ...mono, minHeight: "100vh", background: G.bg }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px" }}>

        {/* Nav */}
        <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 0" }}>
          <a href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", cursor: "pointer" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", border: `2px solid ${G.gold}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={14} style={{ color: G.gold }} />
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, color: G.text, letterSpacing: "0.05em", ...mono }}>ALCHEMY <span style={{ fontWeight: 400, color: G.textSec }}>Productions</span></span>
          </a>
          <span style={{ fontSize: 13, color: G.textSec, fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase", ...mono }}>Creatives</span>
        </nav>

        {/* Header */}
        <section style={{ textAlign: "center", padding: "48px 0 32px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 20px", borderRadius: 980, border: `1px solid ${G.goldBorder}`, background: G.goldSoft, marginBottom: 24 }}>
            <Sparkles size={14} style={{ color: G.gold }} />
            <span style={{ color: G.gold, fontSize: 13, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", ...mono }}>Internal Tool</span>
          </div>
          <h1 style={{ ...hd, fontSize: 52, color: G.text, lineHeight: 1.1, marginBottom: 16 }}>Client <span style={{ fontStyle: "italic" }}>Feedback</span> Portal</h1>
          <p style={{ color: G.textSec, fontSize: 15, lineHeight: 1.7, maxWidth: 520, margin: "0 auto", ...mono }}>Manage creative assets, collect client approvals, and track feedback. all in one place.</p>
        </section>

        {/* View Tabs */}
        <div style={{ display: "flex", gap: 4, justifyContent: "center", marginBottom: 40, background: "#F5F5F7", padding: 4, borderRadius: 980, maxWidth: 320, margin: "0 auto 40px", border: `1px solid ${G.border}` }}>
          {[{ k: "projects", l: "Projects", icon: <FolderOpen size={14} /> }, { k: "messages", l: "Messages", icon: <MessageCircle size={14} /> }].map(t => (
            <button key={t.k} onClick={() => setActiveView(t.k)} style={{
              ...mono, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "10px 20px", borderRadius: 980, fontSize: 13, fontWeight: activeView === t.k ? 600 : 500,
              cursor: "pointer", border: "none", transition: "all 0.2s",
              background: activeView === t.k ? G.gold : "transparent",
              color: activeView === t.k ? "#fff" : G.textSec,
            }}>
              {t.icon} {t.l}
              {t.k === "messages" && conversations.filter(c => c.messages.some(m => m.sender === "client")).length > 0 && activeView !== "messages" && (
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#E5484D", flexShrink: 0 }} />
              )}
            </button>
          ))}
        </div>

        {/* Create / Projects Header */}
        {activeView === "projects" && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
            <h2 style={{ ...hd, fontSize: 32, color: G.text }}>Projects</h2>
            <button onClick={() => setShowCreate(true)} style={{ ...mono, display: "flex", alignItems: "center", gap: 8, padding: "14px 32px", background: G.gold, color: "#fff", fontSize: 15, fontWeight: 600, borderRadius: 980, border: "none", cursor: "pointer", transition: "all 0.2s" }}>
              <Plus size={16} /> New Project
            </button>
          </div>
        )}

        {/* Messages View */}
        {activeView === "messages" && (
          <div style={{ display: "flex", gap: 20, minHeight: 500 }}>
            {/* Conversation list */}
            <div style={{ width: 320, flexShrink: 0, background: G.card, border: `1px solid ${G.cardBorder}`, borderRadius: 16, overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: `1px solid ${G.border}` }}>
                <h3 style={{ ...mono, fontSize: 14, fontWeight: 700, color: G.text }}>Conversations</h3>
              </div>
              <div style={{ maxHeight: 440, overflowY: "auto" }}>
                {conversations.length === 0 ? (
                  <div style={{ padding: "40px 20px", textAlign: "center" }}>
                    <MessageCircle size={32} style={{ color: G.textTer, opacity: 0.3, marginBottom: 8 }} />
                    <p style={{ ...mono, fontSize: 13, color: G.textTer }}>No conversations yet</p>
                  </div>
                ) : conversations.map(c => (
                  <div key={c.projectId} onClick={() => setActiveConvo(c)}
                    style={{
                      padding: "14px 20px", cursor: "pointer", borderBottom: `1px solid ${G.border}`,
                      background: activeConvo?.projectId === c.projectId ? "#F5F5F7" : "transparent",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={e => { if (activeConvo?.projectId !== c.projectId) e.currentTarget.style.background = "#FAFAFA"; }}
                    onMouseLeave={e => { if (activeConvo?.projectId !== c.projectId) e.currentTarget.style.background = "transparent"; }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ ...mono, fontSize: 14, fontWeight: 600, color: G.text }}>{c.clientName}</span>
                      <span style={{ ...mono, fontSize: 10, color: G.textTer }}>
                        {new Date(c.lastMessage.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <p style={{ ...mono, fontSize: 12, color: G.textSec, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>
                      {c.lastMessage.sender === "team" ? "You: " : ""}{c.lastMessage.message}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat thread */}
            <div style={{ flex: 1, background: G.card, border: `1px solid ${G.cardBorder}`, borderRadius: 16, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {!activeConvo ? (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }}>
                  <MessageCircle size={40} style={{ color: G.textTer, opacity: 0.2 }} />
                  <p style={{ ...mono, fontSize: 14, color: G.textTer }}>Select a conversation</p>
                </div>
              ) : (
                <>
                  <div style={{ padding: "16px 20px", borderBottom: `1px solid ${G.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <h3 style={{ ...mono, fontSize: 15, fontWeight: 700, color: G.text, margin: 0 }}>{activeConvo.clientName}</h3>
                      <p style={{ ...mono, fontSize: 11, color: G.textTer, margin: 0 }}>/portal/{activeConvo.slug}</p>
                    </div>
                    <a href={`/portal/create?id=${activeConvo.projectId}`} style={{ ...mono, fontSize: 12, fontWeight: 500, color: G.textSec, textDecoration: "none", padding: "6px 14px", border: `1px solid ${G.border}`, borderRadius: 980 }}>
                      Manage Assets →
                    </a>
                  </div>
                  <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 6 }}>
                    {activeConvo.messages.map((m, i) => {
                      const isTeam = m.sender === "team";
                      const showTime = i === 0 || (new Date(m.created_at) - new Date(activeConvo.messages[i-1].created_at)) > 300000;
                      return (
                        <div key={m.id}>
                          {showTime && (
                            <p style={{ ...mono, fontSize: 10, color: G.textTer, textAlign: "center", margin: "12px 0 6px" }}>
                              {new Date(m.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                            </p>
                          )}
                          <div style={{ display: "flex", justifyContent: isTeam ? "flex-end" : "flex-start" }}>
                            <div style={{
                              maxWidth: "70%", padding: "10px 14px", borderRadius: 16,
                              borderBottomRightRadius: isTeam ? 4 : 16,
                              borderBottomLeftRadius: isTeam ? 16 : 4,
                              background: isTeam ? G.text : "#F5F5F7",
                              color: isTeam ? "#fff" : G.text,
                            }}>
                              {!isTeam && <p style={{ ...mono, fontSize: 10, fontWeight: 700, color: G.textTer, margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.05em" }}>The {activeConvo.clientName} Team</p>}
                              <p style={{ ...mono, fontSize: 14, lineHeight: 1.5, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.message}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ padding: "12px 20px 16px", borderTop: `1px solid ${G.border}` }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-end", background: "#F5F5F7", borderRadius: 14, padding: "8px 8px 8px 16px", border: `1px solid ${G.border}` }}>
                      <textarea
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                        placeholder="Reply as Alchemy team..."
                        rows={1}
                        style={{ ...mono, flex: 1, fontSize: 14, color: G.text, background: "transparent", border: "none", outline: "none", resize: "none", lineHeight: 1.5, maxHeight: 80, padding: "4px 0" }}
                        onInput={e => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 80) + "px"; }}
                      />
                      <button onClick={sendReply} disabled={!replyText.trim() || sendingReply}
                        style={{ width: 34, height: 34, borderRadius: "50%", border: "none", cursor: "pointer", background: replyText.trim() ? G.text : "#D2D2D7", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s", flexShrink: 0 }}>
                        <Send size={14} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Inline Create Form */}
        {activeView === "projects" && showCreate && (
          <form onSubmit={createProject} style={{ background: G.card, border: `1px solid ${G.cardBorder}`, boxShadow: G.cardShadow, borderRadius: 16, padding: 32, marginBottom: 32, display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ textAlign: "center" }}>
              <h3 style={{ ...hd, fontSize: 24, color: G.text, marginBottom: 8 }}>Create New Project</h3>
              <p style={{ ...mono, fontSize: 14, color: G.textSec }}>Enter the client or project name to get started</p>
            </div>
            <div>
              <label style={{ ...mono, fontSize: 13, fontWeight: 600, color: G.text, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                <FileText size={14} color={G.textSec} /> Client / Project Name
              </label>
              <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="e.g. Acme Beauty" required autoFocus
                style={{ ...mono, width: "100%", padding: "12px 16px", fontSize: 14, border: `1px solid ${G.border}`, borderRadius: 10, outline: "none", background: G.bg, color: G.text, boxSizing: "border-box", transition: "border-color 0.15s" }} />
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => { setShowCreate(false); setClientName(""); }}
                style={{ ...mono, padding: "12px 24px", fontSize: 14, fontWeight: 500, background: "transparent", color: G.text, border: `1px solid ${G.goldBorder}`, borderRadius: 980, cursor: "pointer", transition: "all 0.2s" }}>Cancel</button>
              <button type="submit" disabled={creating || !clientName.trim()}
                style={{ ...mono, padding: "12px 32px", fontSize: 14, fontWeight: 600, background: G.gold, color: "#fff", border: "none", borderRadius: 980, cursor: "pointer", opacity: creating || !clientName.trim() ? 0.4 : 1, transition: "all 0.2s", display: "flex", alignItems: "center", gap: 8 }}>
                {creating ? "Creating..." : <><ArrowRight size={14} /> Create Project</>}
              </button>
            </div>
          </form>
        )}

        {/* Project List */}
        {activeView === "projects" && (loading ? (
          <div style={{ textAlign: "center", padding: "80px 20px", color: G.textTer }}><p style={{ ...mono, fontSize: 15 }}>Loading...</p></div>
        ) : projects.length === 0 && !showCreate ? (
          <div style={{ textAlign: "center", padding: "80px 20px", color: G.textTer }}>
            <FolderOpen size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
            <p style={{ ...mono, fontSize: 15 }}>No projects yet. Create one to get started.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 20 }}>
            {projects.map(p => (
              <div key={p.id} onClick={() => router.push(`/portal/create?id=${p.id}`)} style={{ background: G.card, border: `1px solid ${G.cardBorder}`, boxShadow: G.cardShadow, borderRadius: 20, padding: "36px 28px", cursor: "pointer", transition: "all 0.3s" }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.10)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = G.cardShadow; e.currentTarget.style.transform = "translateY(0)"; }}>
                <h3 style={{ ...mono, fontSize: 18, fontWeight: 700, color: G.text, marginBottom: 4 }}>{p.clientName}</h3>
                <p style={{ ...mono, color: G.textTer, fontSize: 13 }}>Created {new Date(p.createdAt).toLocaleDateString()}</p>
                <div style={{ display: "flex", gap: 16, marginTop: 16, ...mono, color: G.textSec, fontSize: 14 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Image size={14} /> {p.images?.length || 0} images</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}><FileText size={14} /> {(p.heroScripts?.length || 0) + (p.ugcScripts?.length || 0)} scripts</span>
                </div>
              </div>
            ))}
          </div>
        ))}

        {/* Footer */}
        <footer style={{ borderTop: `1px solid ${G.border}`, padding: "32px 0", marginTop: 80, marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", border: `1.5px solid ${G.goldBorder}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Sparkles size={10} style={{ color: G.textTer }} />
              </div>
              <span style={{ fontSize: 13, color: G.textTer, ...mono }}>Alchemy Productions</span>
            </div>
            <span style={{ fontSize: 12, color: G.textTer, ...mono }}>Creatives</span>
          </div>
          <span style={{ fontSize: 11, color: G.textTer, ...mono }}>&copy; 2026 Alchemy Productions LLC. All rights reserved.</span>
        </footer>
      </div>
    </div>
  );
}
