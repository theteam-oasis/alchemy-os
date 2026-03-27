'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export default function ClientsPage() {
  const [clients,setClients]=useState([])
  const [campaigns,setCampaigns]=useState([])
  const [loading,setLoading]=useState(true)
  const [search,setSearch]=useState('')

  useEffect(()=>{
    Promise.all([supabase.from('clients').select('*').order('name'),supabase.from('campaigns').select('id,client_id,concept_title,client_status,storyboard_complete,created_at').eq('storyboard_complete',true).order('created_at',{ascending:false})])
    .then(([{data:c},{data:camp}])=>{if(c)setClients(c);if(camp)setCampaigns(camp);setLoading(false)})
  },[])

  const cc=id=>campaigns.filter(c=>c.client_id===id)
  const st=id=>{const x=cc(id);if(!x.length)return'empty';if(x.some(c=>c.client_status==='approved'))return'approved';if(x.some(c=>c.client_status==='revisions'))return'revisions';if(x.some(c=>c.client_status==='declined'))return'declined';return'pending'}
  const dotColor={approved:'#111111',revisions:'#111111',declined:'#cccccc',pending:'#dddddd',empty:'#eeeeee'}
  const filtered=clients.filter(c=>c.name?.toLowerCase().includes(search.toLowerCase()))

  return(<>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=DM+Mono:wght@400&display=swap');
      *{box-sizing:border-box;margin:0;padding:0;}
      body,html{background:#ffffff;color:#111111;font-family:'DM Sans',-apple-system,sans-serif;min-height:100vh;-webkit-font-smoothing:antialiased;}
      @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      .shell{min-height:100vh;}
      .nav{display:flex;align-items:center;justify-content:space-between;padding:16px 40px;background:white;border-bottom:1px solid #eeeeee;position:sticky;top:0;z-index:100;}
      .nav-logo{display:flex;align-items:center;gap:9px;text-decoration:none;}
      .logo-mark{width:26px;height:26px;background:#111111;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:white;}
      .logo-text{font-size:13px;font-weight:500;color:#111111;}
      .logo-text em{color:#aaaaaa;font-style:normal;font-weight:300;}
      .nav-links{display:flex;gap:2px;}
      .nl{font-size:12px;font-weight:500;color:#aaaaaa;text-decoration:none;padding:6px 12px;border-radius:6px;transition:all 0.15s;}
      .nl:hover{color:#111111;background:#f5f5f5;}
      .nl.a{color:#111111;background:#f0f0f0;font-weight:600;}
      .container{max-width:860px;margin:0 auto;padding:48px 40px 80px;animation:fadeUp 0.3s ease;}
      .ph{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:28px;}
      .pt{font-size:28px;font-weight:300;letter-spacing:-0.02em;color:#111111;}
      .ps{font-size:13px;color:#aaaaaa;margin-top:4px;font-weight:300;}
      .search{background:white;border:1px solid #e5e5e5;border-radius:8px;color:#111111;font-size:13px;padding:9px 14px;outline:none;font-family:'DM Sans',sans-serif;width:220px;transition:border-color 0.15s;}
      .search::placeholder{color:#cccccc;}
      .search:focus{border-color:#111111;}
      .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:24px;}
      .sc{background:white;border:1px solid #eeeeee;border-radius:10px;padding:14px 18px;}
      .sn{font-family:'DM Mono',monospace;font-size:22px;font-weight:400;color:#111111;line-height:1;margin-bottom:4px;}
      .sl{font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#cccccc;}
      .list{display:flex;flex-direction:column;gap:1px;}
      .row{background:white;border-bottom:1px solid #f0f0f0;padding:14px 4px;display:flex;align-items:center;gap:16px;cursor:pointer;transition:background 0.1s;text-decoration:none;}
      .row:first-child{border-top:1px solid #f0f0f0;}
      .row:hover{background:#fafafa;}
      .av{width:32px;height:32px;border-radius:50%;background:#f0f0f0;border:1px solid #eeeeee;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:#888888;flex-shrink:0;}
      .cn{font-size:14px;font-weight:500;color:#111111;margin-bottom:1px;}
      .cm{font-size:11px;color:#aaaaaa;font-weight:300;}
      .chips{display:flex;gap:4px;flex-wrap:wrap;}
      .chip{font-size:9px;padding:2px 8px;border-radius:100px;border:1px solid #eeeeee;color:#aaaaaa;font-weight:500;text-transform:uppercase;letter-spacing:0.04em;}
      .chip.approved{color:#111111;border-color:#111111;}
      .chip.revisions{color:#888888;border-color:#cccccc;}
      .chip.declined{color:#cccccc;border-color:#eeeeee;}
      .dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;}
      .arr{color:#cccccc;font-size:14px;margin-left:auto;}
      .empty{text-align:center;padding:80px 0;color:#cccccc;font-size:14px;font-weight:300;}
    `}</style>
    <div className="shell">
      <nav className="nav">
        <a href="/" className="nav-logo"><div className="logo-mark">A</div><span className="logo-text">Alchemy <em>OS</em></span></a>
        <div className="nav-links">
          <a href="/clients" className="nl a">CRM</a>
          <a href="/sample-brief" className="nl">Sample Brief</a>
          <a href="/auto-brief" className="nl">Full Brief</a>
        </div>
      </nav>
      <div className="container">
        <div className="ph">
          <div><h1 className="pt">Clients</h1><p className="ps">{clients.length} clients · {campaigns.length} briefs</p></div>
          <input className="search" placeholder="Search clients..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        {!loading&&<div className="stats">
          {[{n:campaigns.filter(c=>c.client_status==='approved').length,l:'Approved'},{n:campaigns.filter(c=>c.client_status==='revisions').length,l:'Revisions'},{n:campaigns.filter(c=>!c.client_status||c.client_status==='pending').length,l:'Awaiting'},{n:clients.length,l:'Clients'}].map(({n,l})=>(
            <div key={l} className="sc"><p className="sn">{n}</p><p className="sl">{l}</p></div>
          ))}
        </div>}
        {loading?<div className="empty">Loading...</div>:filtered.length===0?<div className="empty">No clients found</div>:(
          <div className="list">
            {filtered.map(client=>{
              const ccs=cc(client.id);const s=st(client.id)
              return(
                <a key={client.id} href={`/clients/${client.id}`} className="row">
                  <div className="av">{client.name?.[0]?.toUpperCase()}</div>
                  <div style={{flex:1}}>
                    <p className="cn">{client.name}</p>
                    <p className="cm">{ccs.length} brief{ccs.length!==1?'s':''}{client.email?` · ${client.email}`:''}</p>
                  </div>
                  <div className="chips">
                    {ccs.slice(0,3).map(c=><span key={c.id} className={`chip ${c.client_status||'pending'}`}>{c.client_status||'pending'}</span>)}
                    {ccs.length>3&&<span className="chip">+{ccs.length-3}</span>}
                  </div>
                  <div className="dot" style={{background:dotColor[s]}}/>
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
