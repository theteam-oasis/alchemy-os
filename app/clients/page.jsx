'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export default function ClientsPage() {
  const [clients, setClients] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('clients').select('*').order('name'),
      supabase.from('campaigns').select('id,client_id,concept_title,client_status,storyboard_complete,created_at').eq('storyboard_complete',true).order('created_at',{ascending:false}),
    ]).then(([{data:c},{data:camp}]) => {
      if(c)setClients(c); if(camp)setCampaigns(camp); setLoading(false)
    })
  },[])

  const cc = id => campaigns.filter(c=>c.client_id===id)
  const st = id => { const x=cc(id); if(!x.length)return'empty'; if(x.some(c=>c.client_status==='approved'))return'approved'; if(x.some(c=>c.client_status==='revisions'))return'revisions'; if(x.some(c=>c.client_status==='declined'))return'declined'; return'pending' }
  const SC = {approved:{dot:'#10b981'},revisions:{dot:'#f59e0b'},declined:{dot:'#ef4444'},pending:{dot:'rgba(26,26,46,0.2)'},empty:{dot:'rgba(26,26,46,0.1)'}}
  const filtered = clients.filter(c=>c.name?.toLowerCase().includes(search.toLowerCase()))

  return (<>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,200;9..40,300;9..40,400;9..40,500;9..40,600&family=DM+Mono:wght@300;400&display=swap');
      *{box-sizing:border-box;margin:0;padding:0;}
      body,html{background:#f0f2f7;color:#1a1a2e;font-family:'DM Sans',-apple-system,sans-serif;min-height:100vh;-webkit-font-smoothing:antialiased;}
      body::before{content:'';position:fixed;inset:0;background:radial-gradient(ellipse 100% 80% at 10% -10%,rgba(199,210,254,0.6) 0%,transparent 50%),radial-gradient(ellipse 80% 60% at 90% 110%,rgba(216,180,254,0.4) 0%,transparent 50%),radial-gradient(ellipse 60% 80% at 50% 50%,rgba(255,255,255,0.5) 0%,transparent 70%);pointer-events:none;z-index:0;animation:drift 25s ease-in-out infinite alternate;}
      @keyframes drift{0%{opacity:.9;transform:scale(1)}100%{opacity:1;transform:scale(1.05) translate(-1%,1.5%)}}
      @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
      .shell{min-height:100vh;position:relative;z-index:1;}
      .nav{display:flex;align-items:center;justify-content:space-between;padding:16px 40px;background:rgba(255,255,255,0.55);backdrop-filter:blur(24px);border-bottom:1px solid rgba(255,255,255,0.75);position:sticky;top:0;z-index:100;}
      .nav-logo{display:flex;align-items:center;gap:10px;text-decoration:none;}
      .logo-mark{width:28px;height:28px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:white;box-shadow:0 2px 12px rgba(99,102,241,0.3);}
      .logo-text{font-size:13px;font-weight:500;color:#1a1a2e;}
      .logo-text em{color:rgba(26,26,46,0.35);font-style:normal;font-weight:300;}
      .nav-links{display:flex;gap:4px;}
      .nav-link{font-size:12px;font-weight:500;color:rgba(26,26,46,0.45);text-decoration:none;padding:6px 12px;border-radius:8px;border:1px solid transparent;transition:all 0.2s;}
      .nav-link:hover{color:#1a1a2e;background:rgba(255,255,255,0.65);border-color:rgba(255,255,255,0.85);}
      .nav-link.act{color:#6366f1;background:rgba(99,102,241,0.08);border-color:rgba(99,102,241,0.2);}
      .container{max-width:860px;margin:0 auto;padding:48px 40px 80px;animation:fadeUp 0.4s ease;}
      .ph{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:28px;}
      .pt{font-size:28px;font-weight:300;letter-spacing:-0.02em;color:#0f0f23;}
      .ps{font-size:13px;color:rgba(26,26,46,0.4);margin-top:4px;font-weight:300;}
      .search{background:rgba(255,255,255,0.6);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.78);border-radius:10px;color:#0f0f23;font-size:13px;padding:9px 14px;outline:none;font-family:'DM Sans',sans-serif;width:220px;transition:all 0.2s;box-shadow:0 2px 8px rgba(100,100,150,0.06);}
      .search::placeholder{color:rgba(26,26,46,0.3);}
      .search:focus{border-color:rgba(99,102,241,0.4);box-shadow:0 0 0 3px rgba(99,102,241,0.08);}
      .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:24px;}
      .sc{background:rgba(255,255,255,0.55);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.78);border-radius:12px;padding:16px 20px;box-shadow:0 4px 16px rgba(100,100,150,0.07);}
      .sn{font-family:'DM Mono',monospace;font-size:22px;font-weight:400;color:#0f0f23;line-height:1;margin-bottom:4px;}
      .sl{font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:rgba(26,26,46,0.35);}
      .list{display:flex;flex-direction:column;gap:7px;}
      .row{background:rgba(255,255,255,0.55);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.78);border-radius:12px;padding:16px 20px;display:flex;align-items:center;gap:16px;cursor:pointer;transition:all 0.2s cubic-bezier(0.22,1,0.36,1);text-decoration:none;position:relative;overflow:hidden;box-shadow:0 2px 12px rgba(100,100,150,0.06);}
      .row::before{content:'';position:absolute;top:0;left:10%;right:10%;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.9),transparent);}
      .row:hover{background:rgba(255,255,255,0.72);border-color:rgba(255,255,255,0.9);transform:translateY(-1px);box-shadow:0 8px 24px rgba(100,100,150,0.12);}
      .av{width:36px;height:36px;border-radius:50%;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.2);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;color:#6366f1;flex-shrink:0;font-family:'DM Mono',monospace;}
      .cn{font-size:14px;font-weight:500;color:#0f0f23;margin-bottom:2px;letter-spacing:-0.01em;}
      .cm{font-size:11px;color:rgba(26,26,46,0.4);font-weight:300;}
      .chips{display:flex;gap:5px;flex-wrap:wrap;}
      .chip{font-size:9px;padding:3px 8px;border-radius:100px;border:1px solid;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;}
      .ca{color:#10b981;border-color:rgba(16,185,129,0.3);background:rgba(16,185,129,0.06);}
      .cr{color:#f59e0b;border-color:rgba(245,158,11,0.3);background:rgba(245,158,11,0.06);}
      .cd{color:#ef4444;border-color:rgba(239,68,68,0.3);background:rgba(239,68,68,0.06);}
      .cp{color:rgba(26,26,46,0.35);border-color:rgba(26,26,46,0.12);background:transparent;}
      .dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;}
      .arr{color:rgba(26,26,46,0.25);font-size:14px;margin-left:auto;}
      .empty{text-align:center;padding:80px 0;color:rgba(26,26,46,0.3);font-size:14px;font-weight:300;}
    `}</style>
    <div className="shell">
      <nav className="nav">
        <a href="/" className="nav-logo"><div className="logo-mark">A</div><span className="logo-text">Alchemy <em>OS</em></span></a>
        <div className="nav-links">
          <a href="/clients" className="nav-link act">CRM</a>
          <a href="/sample-brief" className="nav-link">Sample Brief</a>
          <a href="/auto-brief" className="nav-link">Full Brief</a>
        </div>
      </nav>
      <div className="container">
        <div className="ph">
          <div><h1 className="pt">Clients</h1><p className="ps">{clients.length} clients · {campaigns.length} briefs</p></div>
          <input className="search" placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        {!loading && <div className="stats">
          {[{n:campaigns.filter(c=>c.client_status==='approved').length,l:'Approved'},{n:campaigns.filter(c=>c.client_status==='revisions').length,l:'Revisions'},{n:campaigns.filter(c=>!c.client_status||c.client_status==='pending').length,l:'Awaiting'},{n:clients.length,l:'Clients'}].map(({n,l})=>(
            <div key={l} className="sc"><p className="sn">{n}</p><p className="sl">{l}</p></div>
          ))}
        </div>}
        {loading ? <div className="empty">Loading...</div> : filtered.length===0 ? <div className="empty">No clients found</div> : (
          <div className="list">
            {filtered.map(client => {
              const ccs=cc(client.id); const s=SC[st(client.id)]
              return (
                <a key={client.id} href={`/clients/${client.id}`} className="row">
                  <div className="av">{client.name?.[0]?.toUpperCase()}</div>
                  <div style={{flex:1}}>
                    <p className="cn">{client.name}</p>
                    <p className="cm">{ccs.length} brief{ccs.length!==1?'s':''}{client.email?` · ${client.email}`:''}</p>
                  </div>
                  <div className="chips">
                    {ccs.slice(0,3).map(c=><span key={c.id} className={`chip c${(c.client_status||'p')[0]}`}>{c.client_status||'pending'}</span>)}
                    {ccs.length>3&&<span className="chip cp">+{ccs.length-3}</span>}
                  </div>
                  <div className="dot" style={{background:s.dot}} />
                  <span className="arr">→</span>
                </a>
              )
            })}
          </div>
        )}
      </div>
    </div>
  </>)
}
