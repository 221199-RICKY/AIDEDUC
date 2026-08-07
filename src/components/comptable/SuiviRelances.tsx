import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../utils/supabaseClient'

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
  nomEcole: string
  totalDu: number
  totalPaye: number
  joursRetard: number
  derniereRelance?: string
  relanceCount: number
}

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
  const ecole = i.nomEcole && i.nomEcole.trim() !== '' ? i.nomEcole : 'notre établissement'

  return `Bonjour ${i.parentNom},\n\nNous vous contactons de la part de ${ecole} concernant les frais de scolarité de ${i.elevePrenom} ${i.eleveNom} (${i.classe}).\n\n📋 Situation :\n• Total dû : ${formatXOF(i.totalDu)}\n• Versé : ${formatXOF(i.totalPaye)}\n• Reste : ${formatXOF(reste)}\n• Retard : ${i.joursRetard} jour(s)\n\nMerci de régulariser au plus tôt.\nNous acceptons : Espèces, Orange Money, Wave, MTN Money.\n\n— Service comptable ${ecole}`
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
  const [impayes,   setImpayes]   = useState<Impaye[]>([])
  const [loading,   setLoading]   = useState(true)
  const [erreur,    setErreur]    = useState<string | null>(null)
  const [filtre,    setFiltre]    = useState<FiltreStatut>('tous')
  const [recherche, setRecherche] = useState('')
  const [relancees, setRelancees] = useState<Set<string>>(new Set())
  const [expanded,  setExpanded]  = useState<string | null>(null)

  useEffect(() => {
    async function chargerImpayes() {
      try {
        setLoading(true)

        const [
          { data: schoolData, error: errSchool },
          { data: classesData, error: errC },
          { data: studentsData, error: errE },
          { data: scolariteData, error: errS },
          { data: paiementsData, error: errP },
        ] = await Promise.all([
          supabase.from('schools').select('*'),
          supabase.from('classes').select('id, nom'),
          supabase.from('students').select('*'),
          supabase.from('scolarite').select('*'),
          supabase.from('paiements').select('*'),
        ])

        if (errSchool) console.error('Erreur table school:', errSchool)
        if (errC) throw errC
        if (errE) throw errE
        if (errS) throw errS
        if (errP) throw errP

        const schoolMap = new Map<string, string>()
        schoolData?.forEach(s => {
          const nom = s.nom ?? s.name ?? s.nom_ecole ?? ''
          if (s.id) schoolMap.set(String(s.id), nom)
        })

        const nomEcoleGlobal = schoolData && schoolData.length > 0
          ? (schoolData[0].nom ?? schoolData[0].name ?? schoolData[0].nom_ecole ?? '')
          : ''

        const classesMap = new Map<string, string>()
        classesData?.forEach(c => classesMap.set(String(c.id), c.nom))

        const scolariteMap = new Map<string, number>()
        scolariteData?.forEach(s => scolariteMap.set(String(s.classeid), Number(s.scolarite ?? 0)))

        const listeImpayes: Impaye[] = []

        studentsData?.forEach(eleve => {
          const classIdStr = eleve.class_id ? String(eleve.class_id) : ''
          const classeNom = classesMap.get(classIdStr) ?? 'Non assignée'
          const totalDu = scolariteMap.get(classIdStr) ?? 0

          const totalPaye = (paiementsData ?? [])
            .filter(p => String(p.eleveid) === String(eleve.id))
            .reduce((sum, p) => sum + Number(p.montant ?? 0), 0)

          const reste = totalDu - totalPaye

          const eleveSchoolId = eleve.school_id ? String(eleve.school_id) : null
          const nomEcoleEleve = (eleveSchoolId && schoolMap.has(eleveSchoolId))
            ? schoolMap.get(eleveSchoolId)!
            : nomEcoleGlobal

          if (reste > 0) {
            listeImpayes.push({
              id: String(eleve.id),
              elevePrenom: eleve.prenom ?? eleve.Prenom ?? '',
              eleveNom: eleve.nom ?? eleve.Nom ?? '',
              classe: classeNom,
              numero: eleve.matricule ?? eleve.numero ?? eleve.telephone ?? '',
              parentNom: eleve.parent_nom ?? eleve.parentNom ?? 'M./Mme Parent',
              parentTel: eleve.parent_tel ?? eleve.parentTel ?? eleve.telephone ?? '',
              nomEcole: nomEcoleEleve,
              totalDu,
              totalPaye,
              joursRetard: Number(eleve.jours_retard ?? eleve.joursRetard ?? 15),
              derniereRelance: eleve.derniere_relance ?? eleve.derniereRelance ?? undefined,
              relanceCount: Number(eleve.relance_count ?? eleve.relanceCount ?? 0),
            })
          }
        })

        setImpayes(listeImpayes)
      } catch (err: unknown) {
        console.error('Erreur chargement impayés:', err)
        setErreur('Impossible de charger les données des relances.')
      } finally {
        setLoading(false)
      }
    }

    chargerImpayes()
  }, [])

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

  if (loading) return (
    <div style={{ display:'flex', height:'100vh', alignItems:'center', justifyContent:'center', background:C.bg, fontFamily:"'Inter',system-ui,sans-serif" }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:40, marginBottom:12 }}>📲</div>
        <div style={{ fontSize:14, color:C.textMuted, fontWeight:600 }}>Chargement des relances…</div>
      </div>
    </div>
  )

  return (
    <div style={{ fontFamily:"'Inter',system-ui,sans-serif", background:C.bg, minHeight:'100vh', maxWidth:480, margin:'0 auto', display:'flex', flexDirection:'column' }}>

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

      {erreur && (
        <div style={{ margin:'14px 16px 0', background:'#FCEBEB', border:'1px solid #F7A3A3', borderRadius:10, padding:'11px 14px', fontSize:13, color:'#A32D2D' }}>
          ⚠️ {erreur}
        </div>
      )}

      <main style={{ flex:1, padding:'14px 16px 28px', display:'flex', flexDirection:'column', gap:12 }}>

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

        {relancees.size > 0 && (
          <div style={{ background:'#EAF3DE', border:'1px solid #97C459', borderRadius:10, padding:'10px 14px', fontSize:12, color:'#27500A', fontWeight:500 }}>
            ✅ {relancees.size} relance{relancees.size>1?'s':''} WhatsApp envoyée{relancees.size>1?'s':''} cette session
          </div>
        )}

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

                  {isOpen && (
                    <div style={{ borderTop:`1px solid ${C.border}`, padding:'12px 14px', display:'flex', flexDirection:'column', gap:10 }}>

                      <div>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                          <span style={{ fontSize:11, color:C.textMuted }}>Versé : {formatXOF(i.totalPaye)} / {formatXOF(i.totalDu)}</span>
                          <span style={{ fontSize:11, fontWeight:700, color:progress>0?C.amber:C.red }}>{progress}%</span>
                        </div>
                        <div style={{ height:6, background:'#F0F0F0', borderRadius:3, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${progress}%`, background:progress>=100?C.green:C.amber, borderRadius:3 }} />
                        </div>
                      </div>

                      <div style={{ background:'#F8FAFC', borderRadius:8, padding:'10px 12px', display:'flex', flexDirection:'column', gap:5 }}>
                        {[
                          { label:'Parent / Tuteur',   value: i.parentNom },
                          { label:'Téléphone',          value: i.parentTel },
                          { label:'Établissement',      value: i.nomEcole || 'Non renseigné' },
                          { label:'Nb de relances',     value: `${i.relanceCount} envoyée${i.relanceCount>1?'s':''}` },
                          ...(i.derniereRelance ? [{ label:'Dernière relance', value: formatDate(i.derniereRelance) }] : []),
                        ].map(r => (
                          <div key={r.label} style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                            <span style={{ color:C.textMuted }}>{r.label}</span>
                            <span style={{ fontWeight:600, color:C.textMain }}>{r.value}</span>
                          </div>
                        ))}
                      </div>

                      <div style={{ background:'#F0FBF6', border:'1px solid #97C459', borderRadius:8, padding:'10px 12px' }}>
                        <div style={{ fontSize:10, fontWeight:700, color:'#27500A', marginBottom:5 }}>
                          📲 Message WhatsApp pré-rempli
                        </div>
                        <div style={{ fontSize:11, color:'#3B6D11', lineHeight:1.6, whiteSpace:'pre-line', maxHeight:90, overflow:'hidden' }}>
                          {buildMsg(i).slice(0, 180)}…
                        </div>
                      </div>

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