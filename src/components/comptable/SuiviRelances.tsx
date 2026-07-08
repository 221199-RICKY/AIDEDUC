// ─────────────────────────────────────────────
// AIDEDUC — SuiviRelances.tsx
// src/components/comptable/SuiviRelances.tsx
// Liste des impayés + relance WhatsApp click-to-chat
// ─────────────────────────────────────────────

import { useState, useMemo } from 'react'

const C = {
  primary:   '#1B3A5C',
  accent:    '#F5A623',
  green:     '#1D9E75',
  amber:     '#BA7517',
  red:       '#E24B4A',
  bg:        '#F4F6F9',
  surface:   '#FFFFFF',
  border:    '#E2E8F0',
  textMain:  '#1A1A2E',
  textMuted: '#6C757D',
  whatsapp:  '#25D366',
}

type NiveauUrgence = 'critique' | 'urgent' | 'normal'
type FiltreStatut  = 'tous' | NiveauUrgence

interface Impaye {
  id: string
  elevePrenom: string
  eleveNom: string
  classe: string
  numero: string
  parentNom: string
  parentTel: string
  totalDu: number
  totalPaye: number
  joursRetard: number
  derniereRelance?: string
  relanceCount: number
}

const INIT_IMPAYES: Impaye[] = [
  { id:'i1', elevePrenom:'David',    eleveNom:'Sow',      classe:'Terminale C', numero:'TCL-004', parentNom:'M. Ibrahima Sow',      parentTel:'+22996000004', totalDu:225000, totalPaye:0,      joursRetard:45, relanceCount:2, derniereRelance:'2026-06-10' },
  { id:'i2', elevePrenom:'Basile',   eleveNom:'Mensah',   classe:'Terminale C', numero:'TCL-002', parentNom:'Mme Adjoua Mensah',     parentTel:'+22997000002', totalDu:225000, totalPaye:100000, joursRetard:28, relanceCount:1, derniereRelance:'2026-06-18' },
  { id:'i3', elevePrenom:'Nathan',   eleveNom:'Toviho',   classe:'2nde B',      numero:'2B-001',  parentNom:'M. Kossi Toviho',       parentTel:'+22898000007', totalDu:175000, totalPaye:25000,  joursRetard:34, relanceCount:1, derniereRelance:'2026-06-12' },
  { id:'i4', elevePrenom:'Karine',   eleveNom:'Dossou',   classe:'Première D',  numero:'PD-003',  parentNom:'Mme Céleste Dossou',    parentTel:'+22994000003', totalDu:200000, totalPaye:75000,  joursRetard:20, relanceCount:0 },
  { id:'i5', elevePrenom:'Lionel',   eleveNom:'Akplogan', classe:'Première D',  numero:'PD-004',  parentNom:'M. Théodore Akplogan',  parentTel:'+22995000012', totalDu:200000, totalPaye:25000,  joursRetard:15, relanceCount:0 },
  { id:'i6', elevePrenom:'Quintina', eleveNom:'Houinsou', classe:'2nde B',      numero:'2B-004',  parentNom:'Mme Rosine Houinsou',   parentTel:'+22991000017', totalDu:175000, totalPaye:50000,  joursRetard:8,  relanceCount:0 },
]

function formatXOF(n: number): string { return n.toLocaleString('fr-FR') + ' XOF' }

function urgence(i: Impaye): NiveauUrgence {
  if (i.joursRetard >= 30 || (i.totalDu - i.totalPaye) >= 150000) return 'critique'
  if (i.joursRetard >= 15) return 'urgent'
  return 'normal'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day:'numeric', month:'short' })
}

function buildMsg(i: Impaye): string {
  const reste = i.totalDu - i.totalPaye
  return `Bonjour ${i.parentNom},\n\nNous vous contactons de la part du Lycée Béhanzin concernant les frais de scolarité de ${i.elevePrenom} ${i.eleveNom} (${i.classe}).\n\n📋 Situation :\n• Total dû : ${formatXOF(i.totalDu)}\n• Versé : ${formatXOF(i.totalPaye)}\n• Reste : ${formatXOF(reste)}\n• Retard : ${i.joursRetard} jour(s)\n\nMerci de régulariser au plus tôt.\nNous acceptons : Espèces, Orange Money, Wave, MTN Money.\n\n— Service comptable AIDEDUC`
}

function waUrl(i: Impaye): string {
  return `https://wa.me/${i.parentTel.replace(/[\s-]/g,'')}?text=${encodeURIComponent(buildMsg(i))}`
}

const URGENCE_CFG: Record<NiveauUrgence, { label:string; bg:string; color:string; border:string }> = {
  critique: { label:'🔴 Critique', bg:'#FCEBEB', color:'#A32D2D', border:'#F7A3A3' },
  urgent:   { label:'🟠 Urgent',   bg:'#FAEEDA', color:'#633806', border:'#F0C87A' },
  normal:   { label:'🟡 À suivre', bg:'#FEFCE8', color:'#713F12', border:'#FDE68A' },
}

interface SuiviRelancesProps { onBack: () => void }

export default function SuiviRelances({ onBack }: SuiviRelancesProps) {
  const [impayes,   setImpayes]   = useState<Impaye[]>(INIT_IMPAYES)
  const [filtre,    setFiltre]    = useState<FiltreStatut>('tous')
  const [recherche, setRecherche] = useState('')
  const [relancees, setRelancees] = useState<Set<string>>(new Set())
  const [expanded,  setExpanded]  = useState<string | null>(null)

  const stats = useMemo(() => ({
    totalReste: impayes.reduce((s,i) => s + i.totalDu - i.totalPaye, 0),
    critiques:  impayes.filter(i => urgence(i) === 'critique').length,
    urgents:    impayes.filter(i => urgence(i) === 'urgent').length,
    nb:         impayes.length,
  }), [impayes])

  const liste = useMemo(() =>
    impayes
      .filter(i => {
        const mF = filtre === 'tous' || urgence(i) === filtre
        const mR = recherche.trim() === '' ||
          `${i.elevePrenom} ${i.eleveNom} ${i.classe} ${i.numero}`.toLowerCase()
            .includes(recherche.toLowerCase())
        return mF && mR
      })
      .sort((a,b) => b.joursRetard - a.joursRetard),
    [impayes, filtre, recherche]
  )

  function relancer(i: Impaye) {
    window.open(waUrl(i), '_blank')
    setRelancees(prev => new Set(prev).add(i.id))
    setImpayes(prev => prev.map(imp =>
      imp.id === i.id
        ? { ...imp, derniereRelance: new Date().toISOString().slice(0,10), relanceCount: imp.relanceCount+1 }
        : imp
    ))
  }

  function relancerTous() {
    liste.filter(i => !relancees.has(i.id)).forEach((i, idx) => {
      setTimeout(() => relancer(i), idx * 800)
    })
  }

  return (
    <div style={{ fontFamily:"'Inter',system-ui,sans-serif", background:C.bg, minHeight:'100vh', maxWidth:480, margin:'0 auto', display:'flex', flexDirection:'column' }}>

      {/* HEADER */}
      <header style={{ background:C.primary, padding:'12px 16px 14px', position:'sticky', top:0, zIndex:50 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
          <button onClick={onBack} style={{ background:'rgba(255,255,255,0.15)', border:'none', borderRadius:8, width:34, height:34, cursor:'pointer', color:'#fff', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }} aria-label="Retour">←</button>
          <div style={{ display:'flex', alignItems:'center', gap:8, flex:1 }}>
            <div style={{ width:30, height:30, borderRadius:8, background:C.accent, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15 }}>🎓</div>
            <div>
              <div style={{ fontSize:15, fontWeight:700, color:'#fff' }}>AIDEDUC</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.45)' }}>Suivi des relances</div>
            </div>
          </div>
          <button onClick={relancerTous} style={{ padding:'7px 12px', borderRadius:10, border:'none', background:C.whatsapp, color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:5, whiteSpace:'nowrap' }}>
            📲 Relancer tous
          </button>
        </div>
        <div style={{ position:'relative' }}>
          <input type="search" value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Rechercher un élève ou une classe…" style={{ width:'100%', padding:'9px 36px 9px 12px', borderRadius:10, border:'1px solid rgba(255,255,255,0.2)', background:'rgba(255,255,255,0.1)', color:'#fff', fontSize:13, outline:'none' }} />
          <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,0.5)', pointerEvents:'none' }}>🔍</span>
        </div>
      </header>

      <main style={{ flex:1, padding:'14px 16px 28px', display:'flex', flexDirection:'column', gap:12 }}>

        {/* KPIs */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
          {[
            { label:'Total impayé', value:formatXOF(stats.totalReste), color:C.red   },
            { label:'Critiques',    value:`${stats.critiques} élèves`, color:C.red   },
            { label:'Urgents',      value:`${stats.urgents} élèves`,   color:C.amber },
          ].map(k => (
            <div key={k.label} style={{ background:C.surface, borderRadius:10, padding:'10px 8px', border:`1px solid ${C.border}`, textAlign:'center' }}>
              <div style={{ fontSize:12, fontWeight:700, color:k.color, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{k.value}</div>
              <div style={{ fontSize:10, color:C.textMuted, marginTop:2 }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* Filtres */}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {([
            { id:'tous',     label:`Tous (${impayes.length})`                                            },
            { id:'critique', label:`🔴 Critiques (${stats.critiques})`                                   },
            { id:'urgent',   label:`🟠 Urgents (${stats.urgents})`                                       },
            { id:'normal',   label:`🟡 À suivre (${impayes.filter(i=>urgence(i)==='normal').length})`    },
          ] as {id:FiltreStatut;label:string}[]).map(f => (
            <button key={f.id} onClick={() => setFiltre(f.id)} style={{
              padding:'5px 11px', borderRadius:20, fontSize:11, fontWeight:500, cursor:'pointer',
              border:`1px solid ${filtre===f.id ? C.primary : C.border}`,
              background: filtre===f.id ? C.primary : C.surface,
              color: filtre===f.id ? '#fff' : C.textMuted,
            }}>{f.label}</button>
          ))}
        </div>

        {/* Badge relances envoyées */}
        {relancees.size > 0 && (
          <div style={{ background:'#EAF3DE', border:'1px solid #97C459', borderRadius:10, padding:'10px 14px', fontSize:12, color:'#27500A', fontWeight:500 }}>
            ✅ {relancees.size} relance{relancees.size>1?'s':''} WhatsApp envoyée{relancees.size>1?'s':''} cette session
          </div>
        )}

        {/* Liste */}
        {liste.length === 0 ? (
          <div style={{ textAlign:'center', padding:'40px 20px', color:C.textMuted, fontSize:13 }}>
            <div style={{ fontSize:40, marginBottom:10 }}>✅</div>
            <div style={{ fontWeight:600 }}>Aucun impayé trouvé</div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {liste.map(i => {
              const urg      = urgence(i)
              const cfg      = URGENCE_CFG[urg]
              const isOpen   = expanded === i.id
              const dejaRel  = relancees.has(i.id)
              const solde    = i.totalDu - i.totalPaye
              const progress = Math.min(100, Math.round((i.totalPaye / i.totalDu) * 100))

              return (
                <div key={i.id} style={{ background:C.surface, border:`1px solid ${dejaRel?'#97C459':cfg.border}`, borderLeft:`4px solid ${dejaRel?C.green:cfg.color}`, borderRadius:12, overflow:'hidden', transition:'border-color 0.2s' }}>

                  {/* Ligne principale — cliquable */}
                  <div onClick={() => setExpanded(isOpen ? null : i.id)} style={{ padding:'12px 14px', cursor:'pointer', display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:38, height:38, borderRadius:'50%', background:dejaRel?'#EAF3DE':cfg.bg, color:dejaRel?'#27500A':cfg.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, flexShrink:0 }}>
                      {i.elevePrenom[0]}{i.eleveNom[0]}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:C.textMain, display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                        {i.elevePrenom} {i.eleveNom}
                        {dejaRel && <span style={{ fontSize:9, padding:'1px 5px', borderRadius:20, background:'#EAF3DE', color:'#27500A', fontWeight:600 }}>✓ Relancé</span>}
                      </div>
                      <div style={{ fontSize:11, color:C.textMuted, marginTop:1 }}>{i.classe} · {i.numero} · {i.joursRetard}j de retard</div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:cfg.color }}>{formatXOF(solde)}</div>
                      <span style={{ fontSize:9, padding:'1px 6px', borderRadius:20, background:cfg.bg, color:cfg.color, fontWeight:600 }}>{cfg.label}</span>
                    </div>
                    <span style={{ fontSize:14, color:'#C0C8D0', flexShrink:0, transition:'transform 0.2s', display:'inline-block', transform:isOpen?'rotate(90deg)':'none' }}>›</span>
                  </div>

                  {/* Détail déroulant */}
                  {isOpen && (
                    <div style={{ borderTop:`1px solid ${C.border}`, padding:'12px 14px', display:'flex', flexDirection:'column', gap:10 }}>

                      {/* Barre progression */}
                      <div>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                          <span style={{ fontSize:11, color:C.textMuted }}>Versé : {formatXOF(i.totalPaye)} / {formatXOF(i.totalDu)}</span>
                          <span style={{ fontSize:11, fontWeight:700, color:progress>0?C.amber:C.red }}>{progress}%</span>
                        </div>
                        <div style={{ height:6, background:'#F0F0F0', borderRadius:3, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${progress}%`, background:progress>=100?C.green:C.amber, borderRadius:3 }} />
                        </div>
                      </div>

                      {/* Infos parent */}
                      <div style={{ background:'#F8FAFC', borderRadius:8, padding:'10px 12px', display:'flex', flexDirection:'column', gap:5 }}>
                        {[
                          { label:'Parent / Tuteur',   value: i.parentNom },
                          { label:'Téléphone',          value: i.parentTel },
                          { label:'Nb de relances',     value: `${i.relanceCount} envoyée${i.relanceCount>1?'s':''}` },
                          ...(i.derniereRelance ? [{ label:'Dernière relance', value: formatDate(i.derniereRelance) }] : []),
                        ].map(r => (
                          <div key={r.label} style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                            <span style={{ color:C.textMuted }}>{r.label}</span>
                            <span style={{ fontWeight:600, color:C.textMain }}>{r.value}</span>
                          </div>
                        ))}
                      </div>

                      {/* Aperçu message */}
                      <div style={{ background:'#F0FBF6', border:'1px solid #97C459', borderRadius:8, padding:'10px 12px' }}>
                        <div style={{ fontSize:10, fontWeight:700, color:'#27500A', marginBottom:5 }}>
                          📲 Message WhatsApp pré-rempli
                        </div>
                        <div style={{ fontSize:11, color:'#3B6D11', lineHeight:1.6, whiteSpace:'pre-line', maxHeight:90, overflow:'hidden' }}>
                          {buildMsg(i).slice(0, 180)}…
                        </div>
                      </div>

                      {/* Bouton WhatsApp */}
                      <button onClick={() => relancer(i)} style={{
                        width:'100%', padding:'13px 0', borderRadius:10, border:'none',
                        background: dejaRel ? '#1DA851' : C.whatsapp,
                        color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer',
                        display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                      }}>
                        📲 {dejaRel ? 'Relancer à nouveau via WhatsApp' : 'Envoyer la relance via WhatsApp'}
                      </button>

                      <p style={{ fontSize:11, color:C.textMuted, textAlign:'center', margin:0 }}>
                        Aucune API requise — 100% click-to-chat WhatsApp.
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
