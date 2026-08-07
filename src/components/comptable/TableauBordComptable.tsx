// ─────────────────────────────────────────────
// AIDEDUC — TableauBordComptable.tsx
// src/components/comptable/TableauBordComptable.tsx
// Vue d'ensemble financière de l'école (Supabase)
// ─────────────────────────────────────────────

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../utils/supabaseClient'

// ── Palette AIDEDUC ───────────────────────────
const C = {
  primary:   '#1B3A5C',
  accent:    '#F5A623',
  green:     '#1D9E75',
  amber:     '#BA7517',
  red:       '#E24B4A',
  purple:    '#534AB7',
  bg:        '#F4F6F9',
  surface:   '#FFFFFF',
  border:    '#E2E8F0',
  textMain:  '#1A1A2E',
  textMuted: '#6C757D',
}

// ── Types DB ──────────────────────────────────
interface ClasseDB {
  id: string
  nom: string
}

interface EleveDB {
  id: string
  prenom?: string; Prenom?: string
  nom?: string;    Nom?: string
  class_id?: string
}

interface ScolariteDB {
  id?: string
  classeid: string
  scolarite: number
}

interface PaiementDB {
  id: string
  eleveid: string
  montant: number
  typefrais?: string
  date?: string
  provider?: string
}

// Types calculés
interface StatClasse {
  nom: string
  nbEleves: number
  totalDu: number
  totalPaye: number
  nbSoldes: number
  nbPartiels: number
  nbImpayes: number
}

interface StatMois {
  mois: string
  montant: number
}

interface DernierPaiement {
  eleve: string
  classe: string
  montant: number
  provider: string
  date: string
}

// ── Helpers ───────────────────────────────────
// Affichage précis du montant (ex: 1 250 000 XOF au lieu de 1.3M XOF)
function formatXOF(n: number): string {
  return n.toLocaleString('fr-FR') + ' XOF'
}

function nomMois(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
}

const PROVIDER_EMOJI: Record<string, string> = {
  'Espèces':      '💵',
  'Orange Money': '🟠',
  'Wave':         '🔵',
  'MTN Money':    '🟡',
  'Moov Money':   '🟢',
}

// ── COMPOSANT ─────────────────────────────────
interface TableauBordComptableProps {
  onBack: () => void
}

export default function TableauBordComptable({ onBack }: TableauBordComptableProps) {
  const [classes,    setClasses]    = useState<ClasseDB[]>([])
  const [eleves,     setEleves]     = useState<EleveDB[]>([])
  const [scolarites, setScolarites] = useState<ScolariteDB[]>([])
  const [paiements,  setPaiements]  = useState<PaiementDB[]>([])
  const [loading,    setLoading]    = useState(true)
  const [erreur,     setErreur]     = useState<string | null>(null)
  const [onglet,     setOnglet]     = useState<'vue' | 'classes' | 'recents'>('vue')

  // ── Chargement Supabase ───────────────────
  useEffect(() => {
    async function charger() {
      try {
        setLoading(true)
        const [
          { data: c, error: errC },
          { data: e, error: errE },
          { data: s, error: errS },
          { data: p, error: errP }
        ] = await Promise.all([
          supabase.from('classes').select('id, nom'),
          supabase.from('students').select('*'),
          supabase.from('scolarite').select('*'),
          supabase.from('paiements').select('*'),
        ])

        if (errC) throw errC
        if (errE) throw errE
        if (errS) throw errS
        if (errP) throw errP

        setClasses(c ?? [])
        setEleves(e ?? [])
        setScolarites(s ?? [])
        setPaiements(p ?? [])
      } catch (err: unknown) {
        setErreur('Impossible de charger les données financières.')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    charger()
  }, [])

  // Maps rapides
  const classesMapById = useMemo(() => {
    const map = new Map<string, string>()
    classes.forEach(c => {
      map.set(String(c.id), c.nom)
    })
    return map
  }, [classes])

  const scolariteByClasse = useMemo(() => {
    const map = new Map<string, number>()
    scolarites.forEach(s => {
      map.set(String(s.classeid), Number(s.scolarite ?? 0))
    })
    return map
  }, [scolarites])

  // ── Calculs globaux ───────────────────────
  const stats = useMemo(() => {
    const getDuEleve = (e: EleveDB) => {
      if (!e.class_id) return 0
      return scolariteByClasse.get(String(e.class_id)) ?? 0
    }

    const totalDu    = eleves.reduce((s, e) => s + getDuEleve(e), 0)
    const totalPaye  = paiements.reduce((s, p) => s + Number(p.montant ?? 0), 0)
    const totalReste = Math.max(0, totalDu - totalPaye)
    const taux       = totalDu > 0 ? Math.round((totalPaye / totalDu) * 100) : 0

    // Statut par élève
    let soldes = 0, partiels = 0, impayes = 0
    eleves.forEach(e => {
      const du   = getDuEleve(e)
      const paye = paiements
        .filter(p => String(p.eleveid) === String(e.id))
        .reduce((s, p) => s + Number(p.montant ?? 0), 0)

      if (paye >= du && du > 0) soldes++
      else if (paye > 0)        partiels++
      else                       impayes++
    })

    // Répartition par mode de paiement
    const byProvider: Record<string, number> = {}
    paiements.forEach(p => {
      const prov = p.provider || 'Espèces'
      byProvider[prov] = (byProvider[prov] ?? 0) + Number(p.montant ?? 0)
    })

    // Derniers 8 paiements
    const derniers: DernierPaiement[] = [...paiements]
      .sort((a, b) => {
        const da = new Date(a.date ?? '').getTime()
        const db = new Date(b.date ?? '').getTime()
        return db - da
      })
      .slice(0, 8)
      .map(p => {
        const eleve = eleves.find(e => String(e.id) === String(p.eleveid))
        const nomClasse = eleve?.class_id ? (classesMapById.get(String(eleve.class_id)) ?? 'Inconnue') : '—'

        return {
          eleve:   `${eleve?.prenom ?? eleve?.Prenom ?? '?'} ${eleve?.nom ?? eleve?.Nom ?? ''}`.trim(),
          classe:  nomClasse,
          montant: Number(p.montant ?? 0),
          provider: p.provider || 'Espèces',
          date:    p.date ?? '',
        }
      })

    // Évolution par mois
    const parMois: Record<string, number> = {}
    paiements.forEach(p => {
      if (!p.date) return
      const mois = nomMois(p.date)
      parMois[mois] = (parMois[mois] ?? 0) + Number(p.montant ?? 0)
    })
    const evolutionMois: StatMois[] = Object.entries(parMois)
      .map(([mois, montant]) => ({ mois, montant }))
      .slice(-6)

    // Stats par classe (utilisant le Nom de la classe)
    const classesStatsMap: Record<string, { nom: string; eleves: EleveDB[]; paiementsTotal: number; totalDu: number }> = {}

    eleves.forEach(e => {
      const classIdStr = e.class_id ? String(e.class_id) : 'sans_classe'
      const nomClasse  = classesMapById.get(classIdStr) ?? (e.class_id ? `Classe (${e.class_id})` : 'Non assignée')

      if (!classesStatsMap[classIdStr]) {
        classesStatsMap[classIdStr] = { nom: nomClasse, eleves: [], paiementsTotal: 0, totalDu: 0 }
      }
      classesStatsMap[classIdStr].eleves.push(e)
      classesStatsMap[classIdStr].totalDu += getDuEleve(e)
    })

    paiements.forEach(p => {
      const eleve = eleves.find(e => String(e.id) === String(p.eleveid))
      const classIdStr = eleve?.class_id ? String(eleve.class_id) : 'sans_classe'
      
      if (classesStatsMap[classIdStr]) {
        classesStatsMap[classIdStr].paiementsTotal += Number(p.montant ?? 0)
      }
    })

    const parClasse: StatClasse[] = Object.values(classesStatsMap)
      .map(data => {
        let nbSoldes = 0, nbPartiels = 0, nbImpayes = 0
        data.eleves.forEach(e => {
          const paye = paiements
            .filter(p => String(p.eleveid) === String(e.id))
            .reduce((s, p) => s + Number(p.montant ?? 0), 0)
          const du = getDuEleve(e)

          if (paye >= du && du > 0) nbSoldes++
          else if (paye > 0)        nbPartiels++
          else                       nbImpayes++
        })

        return {
          nom:       data.nom,
          nbEleves:  data.eleves.length,
          totalDu:   data.totalDu,
          totalPaye: data.paiementsTotal,
          nbSoldes,  nbPartiels, nbImpayes,
        }
      })
      .sort((a, b) => b.totalDu - a.totalDu)

    return { totalDu, totalPaye, totalReste, taux, soldes, partiels, impayes, byProvider, derniers, evolutionMois, parClasse }
  }, [eleves, paiements, scolariteByClasse, classesMapById])

  // ── Barre de progression colorée ─────────
  function BarreRecouvrement({ pct }: { pct: number }) {
    const couleur = pct >= 80 ? C.green : pct >= 50 ? C.amber : C.red
    return (
      <div style={{ height: 6, background: '#F0F0F0', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: couleur, borderRadius: 3, transition: 'width 0.5s' }} />
      </div>
    )
  }

  // ── Barre graphique mois ─────────────────
  function BarreMois({ montant, max }: { montant: number; max: number }) {
    const h = max > 0 ? Math.max(4, Math.round((montant / max) * 80)) : 4
    return (
      <div style={{ height: 80, display: 'flex', alignItems: 'flex-end' }}>
        <div style={{ width: '100%', height: h, background: C.primary, borderRadius: '3px 3px 0 0', transition: 'height 0.4s' }} />
      </div>
    )
  }

  // ─── RENDU ────────────────────────────────
  if (loading) return (
    <div style={{ display:'flex', height:'100vh', alignItems:'center', justifyContent:'center', background:C.bg, fontFamily:"'Inter',system-ui,sans-serif" }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:40, marginBottom:12 }}>📊</div>
        <div style={{ fontSize:14, color:C.textMuted, fontWeight:600 }}>Chargement du tableau de bord…</div>
      </div>
    </div>
  )

  return (
    <div style={{ fontFamily:"'Inter',system-ui,sans-serif", background:C.bg, minHeight:'100vh', display:'flex', flexDirection:'column' }}>

      {/* ── HEADER ── */}
      <header style={{ background:C.primary, padding:'16px 20px 18px', position:'sticky', top:0, zIndex:50 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
          <button onClick={onBack} style={{ background:'rgba(255,255,255,0.15)', border:'none', borderRadius:8, width:36, height:36, cursor:'pointer', color:'#fff', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>←</button>
          <div style={{ display:'flex', alignItems:'center', gap:10, flex:1 }}>
            <div style={{ width:32, height:32, borderRadius:9, background:C.accent, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>🎓</div>
            <div>
              <div style={{ fontSize:16, fontWeight:700, color:'#fff' }}>AIDEDUC</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.45)' }}>Tableau de bord comptable</div>
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)' }}>
              {new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})}
            </div>
          </div>
        </div>

        {/* Bannière taux de recouvrement */}
        <div style={{ background:'rgba(255,255,255,0.1)', borderRadius:12, padding:'12px 16px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)', marginBottom:2 }}>Total encaissé</div>
              <div style={{ fontSize:20, fontWeight:700, color:C.accent }}>{formatXOF(stats.totalPaye)}</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)', marginBottom:2 }}>Taux de recouvrement</div>
              <div style={{ fontSize:22, fontWeight:700, color: stats.taux >= 80 ? '#6EE7B7' : stats.taux >= 50 ? C.accent : '#FCA5A5' }}>
                {stats.taux}%
              </div>
            </div>
          </div>
          <div style={{ height:8, background:'rgba(255,255,255,0.15)', borderRadius:4, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${stats.taux}%`, borderRadius:4, transition:'width 0.6s',
              background: stats.taux>=80 ? C.green : stats.taux>=50 ? C.accent : C.red,
            }} />
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:6, fontSize:11, color:'rgba(255,255,255,0.45)' }}>
            <span>Attendu : {formatXOF(stats.totalDu)}</span>
            <span>Reste : {formatXOF(stats.totalReste)}</span>
          </div>
        </div>
      </header>

      {/* ── ONGLETS ── */}
      <nav style={{ display:'flex', background:C.surface, borderBottom:`1px solid ${C.border}`, position:'sticky', top:170, zIndex:40 }}>
        {([
          { id:'vue',     icon:'📈', label:'Vue globale'   },
          { id:'classes', icon:'🏫', label:'Par classe'    },
          { id:'recents', icon:'🕐', label:'Mouvements'    },
        ] as {id:'vue'|'classes'|'recents';icon:string;label:string}[]).map(t => (
          <button key={t.id} onClick={() => setOnglet(t.id)} style={{
            flex:1, padding:'10px 0', border:'none', background:'none', cursor:'pointer',
            borderBottom:`3px solid ${onglet===t.id?C.accent:'transparent'}`,
            color: onglet===t.id ? C.primary : C.textMuted,
            fontWeight: onglet===t.id ? 700 : 400,
            fontSize:12, display:'flex', flexDirection:'column', alignItems:'center', gap:2,
          }}>
            <span style={{ fontSize:16 }}>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      {erreur && (
        <div style={{ margin:'14px 20px 0', background:'#FCEBEB', border:'1px solid #F7A3A3', borderRadius:10, padding:'11px 14px', fontSize:13, color:'#A32D2D' }}>
          ⚠️ {erreur}
        </div>
      )}

      <main style={{ flex:1, padding:'16px 20px 32px', display:'flex', flexDirection:'column', gap:14 }}>

        {/* ─── ONGLET VUE GLOBALE ─── */}
        {onglet === 'vue' && (
          <>
            {/* KPIs élèves */}
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'.5px', marginBottom:10 }}>
                Situation des élèves
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                {[
                  { label:'Soldés',   value:stats.soldes,   color:C.green,  bg:'#EAF3DE', icon:'✅' },
                  { label:'Partiels', value:stats.partiels, color:C.amber,  bg:'#FAEEDA', icon:'⏳' },
                  { label:'Impayés',  value:stats.impayes,  color:C.red,    bg:'#FCEBEB', icon:'⚠️' },
                ].map(k => (
                  <div key={k.label} style={{ background:k.bg, borderRadius:12, padding:'14px 10px', textAlign:'center', border:`1px solid ${k.color}30` }}>
                    <div style={{ fontSize:20, marginBottom:4 }}>{k.icon}</div>
                    <div style={{ fontSize:24, fontWeight:700, color:k.color }}>{k.value}</div>
                    <div style={{ fontSize:11, color:C.textMuted, marginTop:2 }}>{k.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* KPIs financiers */}
            <div style={{ background:C.surface, borderRadius:14, border:`1px solid ${C.border}`, overflow:'hidden' }}>
              <div style={{ padding:'12px 16px', borderBottom:`1px solid ${C.border}`, background:'#F8FAFC' }}>
                <div style={{ fontSize:11, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'.5px' }}>
                  Détail financier
                </div>
              </div>
              {[
                { label:'Total attendu',   value: formatXOF(stats.totalDu),    color:C.textMain, icon:'📋' },
                { label:'Total encaissé',  value: formatXOF(stats.totalPaye),  color:C.green,    icon:'💰' },
                { label:'Reste à collecter',value:formatXOF(stats.totalReste), color:C.red,      icon:'⏱' },
                { label:'Nb. élèves',      value: String(eleves.length),        color:C.primary,  icon:'👥' },
              ].map((r, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderBottom: i < 3 ? `1px solid ${C.border}` : 'none' }}>
                  <span style={{ fontSize:20, flexShrink:0 }}>{r.icon}</span>
                  <span style={{ flex:1, fontSize:13, color:C.textMuted }}>{r.label}</span>
                  <span style={{ fontSize:14, fontWeight:700, color:r.color }}>{r.value}</span>
                </div>
              ))}
            </div>

            {/* Modes de paiement */}
            {Object.keys(stats.byProvider).length > 0 && (
              <div style={{ background:C.surface, borderRadius:14, border:`1px solid ${C.border}`, overflow:'hidden' }}>
                <div style={{ padding:'12px 16px', borderBottom:`1px solid ${C.border}`, background:'#F8FAFC' }}>
                  <div style={{ fontSize:11, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'.5px' }}>
                    Répartition par mode de paiement
                  </div>
                </div>
                {Object.entries(stats.byProvider)
                  .sort((a, b) => b[1] - a[1])
                  .map(([prov, montant], i, arr) => {
                    const pct = stats.totalPaye > 0 ? Math.round((montant / stats.totalPaye) * 100) : 0
                    return (
                      <div key={prov} style={{ padding:'10px 16px', borderBottom: i < arr.length-1 ? `1px solid ${C.border}` : 'none' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                          <span style={{ fontSize:18 }}>{PROVIDER_EMOJI[prov] ?? '💳'}</span>
                          <span style={{ flex:1, fontSize:13, fontWeight:500, color:C.textMain }}>{prov}</span>
                          <span style={{ fontSize:12, fontWeight:700, color:C.primary }}>{formatXOF(montant)}</span>
                          <span style={{ fontSize:11, color:C.textMuted, width:32, textAlign:'right' }}>{pct}%</span>
                        </div>
                        <div style={{ height:5, background:'#F0F0F0', borderRadius:3, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${pct}%`, background:C.primary, borderRadius:3 }} />
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}

            {/* Évolution mensuelle */}
            {stats.evolutionMois.length > 0 && (
              <div style={{ background:C.surface, borderRadius:14, border:`1px solid ${C.border}`, overflow:'hidden' }}>
                <div style={{ padding:'12px 16px', borderBottom:`1px solid ${C.border}`, background:'#F8FAFC' }}>
                  <div style={{ fontSize:11, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'.5px' }}>
                    Encaissements par mois
                  </div>
                </div>
                <div style={{ padding:'16px', display:'flex', gap:8, alignItems:'flex-end' }}>
                  {(() => {
                    const max = Math.max(...stats.evolutionMois.map(m => m.montant))
                    return stats.evolutionMois.map(m => (
                      <div key={m.mois} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                        <div style={{ fontSize:9, color:C.textMuted, fontWeight:600 }}>{formatXOF(m.montant)}</div>
                        <BarreMois montant={m.montant} max={max} />
                        <div style={{ fontSize:9, color:C.textMuted, textAlign:'center', marginTop:4 }}>{m.mois}</div>
                      </div>
                    ))
                  })()}
                </div>
              </div>
            )}
          </>
        )}

        {/* ─── ONGLET PAR CLASSE ─── */}
        {onglet === 'classes' && (
          <>
            <div style={{ fontSize:11, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'.5px' }}>
              {stats.parClasse.length} classe{stats.parClasse.length > 1 ? 's' : ''} · {eleves.length} élèves
            </div>

            {stats.parClasse.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px', color:C.textMuted, fontSize:13 }}>
                <div style={{ fontSize:36, marginBottom:10 }}>🏫</div>
                Aucune classe trouvée
              </div>
            ) : (
              stats.parClasse.map(cl => {
                const pct = cl.totalDu > 0 ? Math.round((cl.totalPaye / cl.totalDu) * 100) : 0
                return (
                  <div key={cl.nom} style={{ background:C.surface, borderRadius:14, border:`1px solid ${C.border}`, overflow:'hidden' }}>
                    {/* En-tête classe */}
                    <div style={{ background:C.primary, padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <div>
                        <div style={{ fontSize:14, fontWeight:700, color:'#fff' }}>{cl.nom}</div>
                        <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)' }}>{cl.nbEleves} élève{cl.nbEleves>1?'s':''}</div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontSize:16, fontWeight:700, color:pct>=80?'#6EE7B7':pct>=50?C.accent:'#FCA5A5' }}>{pct}%</div>
                        <div style={{ fontSize:10, color:'rgba(255,255,255,0.45)' }}>recouvrement</div>
                      </div>
                    </div>

                    {/* Barre */}
                    <div style={{ padding:'8px 14px 0' }}>
                      <BarreRecouvrement pct={pct} />
                    </div>

                    {/* Chiffres */}
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', padding:'10px 14px 12px', gap:8 }}>
                      {[
                        { label:'Attendu',  value:formatXOF(cl.totalDu),   color:C.textMain },
                        { label:'Encaissé', value:formatXOF(cl.totalPaye), color:C.green    },
                        { label:'Reste',    value:formatXOF(cl.totalDu-cl.totalPaye), color:cl.totalDu-cl.totalPaye>0?C.red:C.green },
                      ].map(s => (
                        <div key={s.label} style={{ textAlign:'center' }}>
                          <div style={{ fontSize:12, fontWeight:700, color:s.color }}>{s.value}</div>
                          <div style={{ fontSize:10, color:C.textMuted, marginTop:2 }}>{s.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Statuts élèves */}
                    <div style={{ display:'flex', borderTop:`1px solid ${C.border}` }}>
                      {[
                        { label:'Soldés',   value:cl.nbSoldes,   color:C.green, bg:'#EAF3DE' },
                        { label:'Partiels', value:cl.nbPartiels, color:C.amber, bg:'#FAEEDA' },
                        { label:'Impayés',  value:cl.nbImpayes,  color:C.red,   bg:'#FCEBEB' },
                      ].map((s, i) => (
                        <div key={s.label} style={{ flex:1, textAlign:'center', padding:'8px 4px', background:s.bg, borderRight:i<2?`1px solid ${C.border}`:'none' }}>
                          <div style={{ fontSize:16, fontWeight:700, color:s.color }}>{s.value}</div>
                          <div style={{ fontSize:10, color:C.textMuted }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })
            )}
          </>
        )}

        {/* ─── ONGLET MOUVEMENTS RÉCENTS ─── */}
        {onglet === 'recents' && (
          <>
            <div style={{ fontSize:11, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'.5px' }}>
              {paiements.length} paiement{paiements.length>1?'s':''} enregistré{paiements.length>1?'s':''}
            </div>

            {stats.derniers.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px', color:C.textMuted, fontSize:13 }}>
                <div style={{ fontSize:36, marginBottom:10 }}>💳</div>
                Aucun paiement enregistré
              </div>
            ) : (
              <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden' }}>
                <div style={{ padding:'10px 16px', background:'#F8FAFC', borderBottom:`1px solid ${C.border}` }}>
                  <div style={{ fontSize:11, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'.5px' }}>
                    Derniers mouvements
                  </div>
                </div>
                {stats.derniers.map((d, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 16px', borderBottom:i<stats.derniers.length-1?`1px solid ${C.border}`:'none' }}>
                    <div style={{ width:38, height:38, borderRadius:'50%', background:'#E6F1FB', color:'#0C447C', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, flexShrink:0 }}>
                      {d.eleve.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:C.textMain, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {d.eleve}
                      </div>
                      <div style={{ fontSize:11, color:C.textMuted }}>
                        {d.classe} · {PROVIDER_EMOJI[d.provider] ?? '💳'} {d.provider}
                      </div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:C.green }}>+{formatXOF(d.montant)}</div>
                      <div style={{ fontSize:10, color:C.textMuted, marginTop:2 }}>
                        {d.date ? new Date(d.date).toLocaleDateString('fr-FR', { day:'numeric', month:'short' }) : '—'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Résumé total */}
            <div style={{ background:C.primary, borderRadius:14, padding:'16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)', marginBottom:4 }}>Total encaissé (toutes périodes)</div>
                <div style={{ fontSize:20, fontWeight:700, color:C.accent }}>{formatXOF(stats.totalPaye)}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)', marginBottom:4 }}>Taux global</div>
                <div style={{ fontSize:22, fontWeight:700, color:'#fff' }}>{stats.taux}%</div>
              </div>
            </div>
          </>
        )}

      </main>
    </div>
  )
}