// ─────────────────────────────────────────────
// AIDEDUC — Encaissement.tsx (v2)
// src/components/comptable/Encaissement.tsx
// Recherche élève + Nouvel élève + Versement
// ─────────────────────────────────────────────

import { useState, useMemo } from 'react'

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

// ── Types ─────────────────────────────────────
type TypeFrais     = 'Inscription' | 'Réinscription' | 'Scolarité T1' | 'Scolarité T2' | 'Scolarité T3' | 'Cantine' | 'Transport'
type Provider      = 'Espèces' | 'Orange Money' | 'Wave' | 'MTN Money' | 'Moov Money'
type StatutCompte  = 'solde' | 'partiel' | 'en_attente'
type ModeEcran     = 'accueil' | 'recherche' | 'nouvel_eleve' | 'fiche'

interface Versement {
  id: string
  typeFrais: TypeFrais
  montant: number
  provider: Provider
  date: string
  reference: string
}

interface Eleve {
  id: string
  prenom: string
  nom: string
  classe: string
  numero: string
  parentNom: string
  parentTel: string
  estNouveau: boolean
  anneeScolaire: string
  versements: Versement[]
  totalDu: number
}

// ── Config classes ────────────────────────────
const CLASSES = [
  '6ème A', '6ème B', '5ème A', '5ème B',
  '4ème A', '4ème B', '3ème A', '3ème B',
  '2nde A', '2nde B', '1ère C', '1ère D',
  'Terminale C', 'Terminale D',
]

const FRAIS_PAR_CLASSE: Record<string, number> = {
  '6ème A': 150000, '6ème B': 150000,
  '5ème A': 155000, '5ème B': 155000,
  '4ème A': 160000, '4ème B': 160000,
  '3ème A': 165000, '3ème B': 165000,
  '2nde A': 175000, '2nde B': 175000,
  '1ère C': 200000, '1ère D': 200000,
  'Terminale C': 225000, 'Terminale D': 225000,
}

const TYPES_FRAIS: TypeFrais[]   = ['Inscription', 'Réinscription', 'Scolarité T1', 'Scolarité T2', 'Scolarité T3', 'Cantine', 'Transport']
const PROVIDERS:   Provider[]    = ['Espèces', 'Orange Money', 'Wave', 'MTN Money', 'Moov Money']

const PROVIDER_EMOJI: Record<Provider, string> = {
  'Espèces': '💵', 'Orange Money': '🟠', 'Wave': '🔵', 'MTN Money': '🟡', 'Moov Money': '🟢',
}

// ── Données de démo ───────────────────────────
let COMPTEUR_NUMERO = 100

const INIT_ELEVES: Eleve[] = [
  {
    id:'e1', prenom:'Amina',    nom:'Konaté',    classe:'Terminale C', numero:'TCL-001',
    parentNom:'Mme Fatou Konaté',    parentTel:'+22996000001',
    estNouveau:false, anneeScolaire:'2025-2026', totalDu:225000,
    versements:[
      { id:'v1', typeFrais:'Inscription',  montant:25000, provider:'Espèces',     date:'2025-09-02', reference:'EC-2025-001' },
      { id:'v2', typeFrais:'Scolarité T1', montant:75000, provider:'Orange Money', date:'2025-10-05', reference:'EC-2025-002' },
      { id:'v3', typeFrais:'Scolarité T2', montant:75000, provider:'Wave',         date:'2026-01-08', reference:'EC-2026-001' },
    ],
  },
  {
    id:'e2', prenom:'Basile',   nom:'Mensah',    classe:'Terminale C', numero:'TCL-002',
    parentNom:'M. Kofi Mensah',        parentTel:'+22996000002',
    estNouveau:false, anneeScolaire:'2025-2026', totalDu:225000,
    versements:[
      { id:'v4', typeFrais:'Inscription',  montant:25000, provider:'Espèces',   date:'2025-09-03', reference:'EC-2025-003' },
      { id:'v5', typeFrais:'Scolarité T1', montant:75000, provider:'MTN Money', date:'2025-10-10', reference:'EC-2025-004' },
    ],
  },
  {
    id:'e3', prenom:'David',    nom:'Sow',       classe:'Terminale C', numero:'TCL-004',
    parentNom:'M. Ibrahima Sow',       parentTel:'+22996000004',
    estNouveau:false, anneeScolaire:'2025-2026', totalDu:225000,
    versements:[],
  },
  {
    id:'e4', prenom:'Isabelle', nom:'Zannou',    classe:'Première D',  numero:'PD-001',
    parentNom:'Mme Adjoua Zannou',     parentTel:'+22996000005',
    estNouveau:false, anneeScolaire:'2025-2026', totalDu:200000,
    versements:[
      { id:'v6', typeFrais:'Inscription',  montant:25000, provider:'Espèces',     date:'2025-09-02', reference:'EC-2025-005' },
      { id:'v7', typeFrais:'Scolarité T1', montant:75000, provider:'Orange Money', date:'2025-10-06', reference:'EC-2025-006' },
    ],
  },
]

// ── Helpers ───────────────────────────────────
function formatXOF(n: number): string {
  return n.toLocaleString('fr-FR') + ' XOF'
}

function totalPaye(e: Eleve): number {
  return e.versements.reduce((s, v) => s + v.montant, 0)
}

function statut(e: Eleve): StatutCompte {
  const p = totalPaye(e)
  if (p >= e.totalDu) return 'solde'
  if (p > 0)          return 'partiel'
  return 'en_attente'
}

function genRef(): string {
  return `EC-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`
}

function genNumero(classe: string): string {
  const prefix = classe.replace(/\s/g, '').slice(0, 3).toUpperCase()
  return `${prefix}-${String(++COMPTEUR_NUMERO).padStart(3, '0')}`
}

const STATUT_CFG: Record<StatutCompte, { label: string; bg: string; color: string }> = {
  solde:      { label:'✓ Soldé',      bg:'#EAF3DE', color:'#27500A' },
  partiel:    { label:'½ Partiel',    bg:'#EEEDFE', color:'#3C3489' },
  en_attente: { label:'⚠ En attente', bg:'#FCEBEB', color:'#A32D2D' },
}

// ── Champ de formulaire réutilisable ──────────
function Field({
  label, value, onChange, placeholder, type = 'text', required = false,
}: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: string; required?: boolean
}) {
  return (
    <div style={{ marginBottom:12 }}>
      <label style={{ display:'block', fontSize:10, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'.4px', marginBottom:5 }}>
        {label}{required && <span style={{ color:C.red }}> *</span>}
      </label>
      <input
        type={type} value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width:'100%', padding:'11px 12px', borderRadius:9,
          border:`1.5px solid ${value ? C.primary : C.border}`,
          background: value ? '#F0F5FB' : C.surface,
          fontSize:14, outline:'none', color:C.textMain, transition:'border-color 0.15s',
        }}
      />
    </div>
  )
}

// ── COMPOSANT PRINCIPAL ───────────────────────
interface EncaissementProps { onBack: () => void }

export default function Encaissement({ onBack }: EncaissementProps) {
  const [eleves,      setEleves]      = useState<Eleve[]>(INIT_ELEVES)
  const [mode,        setMode]        = useState<ModeEcran>('accueil')
  const [recherche,   setRecherche]   = useState('')
  const [eleveSelId,  setEleveSelId]  = useState<string | null>(null)

  // Form versement
  const [typeFrais,   setTypeFrais]   = useState<TypeFrais>('Scolarité T3')
  const [montant,     setMontant]     = useState('')
  const [provider,    setProvider]    = useState<Provider>('Espèces')
  const [saving,      setSaving]      = useState(false)
  const [recu,        setRecu]        = useState<Versement | null>(null)

  // Form nouvel élève
  const [nPrenom,     setNPrenom]     = useState('')
  const [nNom,        setNNom]        = useState('')
  const [nClasse,     setNClasse]     = useState(CLASSES[0])
  const [nParentNom,  setNParentNom]  = useState('')
  const [nParentTel,  setNParentTel]  = useState('')
  const [nType,       setNType]       = useState<'nouveau' | 'reinscription'>('nouveau')
  const [savingNew,   setSavingNew]   = useState(false)
  const [flashNew,    setFlashNew]    = useState('')

  const eleveSel = useMemo(() => eleves.find(e => e.id === eleveSelId) ?? null, [eleves, eleveSelId])

  const resultats = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    if (q.length < 2) return []
    return eleves.filter(e =>
      `${e.prenom} ${e.nom} ${e.numero} ${e.classe}`.toLowerCase().includes(q)
    )
  }, [recherche, eleves])

  const paye  = eleveSel ? totalPaye(eleveSel) : 0
  const reste = eleveSel ? Math.max(0, eleveSel.totalDu - paye) : 0
  const pct   = eleveSel ? Math.min(100, Math.round((paye / eleveSel.totalDu) * 100)) : 0
  const montantNum = parseFloat(montant)
  const montantOk  = !isNaN(montantNum) && montantNum > 0

  // ── Sélectionner un élève depuis la recherche
  function selectionner(e: Eleve) {
    setEleveSelId(e.id)
    setRecherche(`${e.prenom} ${e.nom}`)
    setMode('fiche')
    setRecu(null)
  }

  // ── Réinitialiser tout
  function reset() {
    setEleveSelId(null)
    setRecherche('')
    setMontant('')
    setTypeFrais('Scolarité T3')
    setProvider('Espèces')
    setRecu(null)
    setMode('accueil')
  }

  // ── Enregistrer un versement
  async function enregistrer() {
    if (!eleveSel || !montantOk) return
    setSaving(true)
    await new Promise(r => setTimeout(r, 900))
    const nouveau: Versement = {
      id: `v${Date.now()}`, typeFrais, montant: montantNum,
      provider, date: new Date().toISOString().slice(0, 10), reference: genRef(),
    }
    setEleves(prev => prev.map(e =>
      e.id === eleveSel.id ? { ...e, versements: [...e.versements, nouveau] } : e
    ))
    setSaving(false)
    setRecu(nouveau)
    setMontant('')
  }

  // ── Créer un nouvel élève + premier versement
  async function creerEleve() {
    if (!nPrenom.trim() || !nNom.trim() || !nParentNom.trim() || !nParentTel.trim()) return
    setSavingNew(true)
    await new Promise(r => setTimeout(r, 800))

    const numero  = genNumero(nClasse)
    const totalDu = FRAIS_PAR_CLASSE[nClasse] ?? 200000

    // Premier versement automatique : inscription ou réinscription
    const premierVersement: Versement = {
      id: `v${Date.now()}`,
      typeFrais: nType === 'nouveau' ? 'Inscription' : 'Réinscription',
      montant:   25000,
      provider:  'Espèces',
      date:      new Date().toISOString().slice(0, 10),
      reference: genRef(),
    }

    const nouvelEleve: Eleve = {
      id:            `e${Date.now()}`,
      prenom:        nPrenom.trim(),
      nom:           nNom.trim().toUpperCase(),
      classe:        nClasse,
      numero,
      parentNom:     nParentNom.trim(),
      parentTel:     nParentTel.trim(),
      estNouveau:    nType === 'nouveau',
      anneeScolaire: '2025-2026',
      totalDu,
      versements:    [premierVersement],
    }

    setEleves(prev => [...prev, nouvelEleve])

    setSavingNew(false)
    setFlashNew(`${nPrenom} ${nNom.toUpperCase()} inscrit(e) en ${nClasse} — N° ${numero}`)

    // Aller directement à la fiche de l'élève créé
    setTimeout(() => {
      setEleveSelId(nouvelEleve.id)
      setMode('fiche')
      setFlashNew('')
      setTypeFrais('Scolarité T1')
      // Reset form
      setNPrenom(''); setNNom(''); setNParentNom(''); setNParentTel('')
    }, 1800)
  }

  const formNouvelEleveValide = nPrenom.trim() && nNom.trim() && nParentNom.trim() && nParentTel.trim()

  // ─────────────────────────────────────────────
  // RENDU
  // ─────────────────────────────────────────────
  return (
    <div style={{ fontFamily:"'Inter',system-ui,sans-serif", background:C.bg, minHeight:'100vh', maxWidth:480, margin:'0 auto', display:'flex', flexDirection:'column' }}>

      {/* ── HEADER ── */}
      <header style={{ background:C.primary, padding:'12px 16px 14px', position:'sticky', top:0, zIndex:50 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button
            onClick={() => mode === 'accueil' ? onBack() : reset()}
            aria-label="Retour"
            style={{ background:'rgba(255,255,255,0.15)', border:'none', borderRadius:8, width:34, height:34, cursor:'pointer', color:'#fff', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}
          >←</button>
          <div style={{ display:'flex', alignItems:'center', gap:8, flex:1 }}>
            <div style={{ width:30, height:30, borderRadius:8, background:C.accent, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15 }}>🎓</div>
            <div>
              <div style={{ fontSize:15, fontWeight:700, color:'#fff' }}>AIDEDUC</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.45)' }}>
                { mode === 'accueil'      && 'Encaissement' }
                { mode === 'recherche'    && 'Rechercher un élève' }
                { mode === 'nouvel_eleve' && 'Nouvel élève / Réinscription' }
                { mode === 'fiche'        && 'Fiche élève' }
              </div>
            </div>
          </div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)' }}>
            {new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'})}
          </div>
        </div>
      </header>

      <main style={{ flex:1, padding:'16px 16px 32px', display:'flex', flexDirection:'column', gap:12 }}>

        {/* ══════════════════════════════════════
            MODE ACCUEIL — 2 gros boutons
        ══════════════════════════════════════ */}
        {mode === 'accueil' && (
          <>
            <div style={{ fontSize:13, color:C.textMuted, textAlign:'center', marginBottom:4 }}>
              Que souhaitez-vous faire ?
            </div>

            {/* Bouton Rechercher */}
            <button onClick={() => setMode('recherche')} style={{
              display:'flex', alignItems:'center', gap:14, padding:'20px 16px',
              borderRadius:14, border:`1.5px solid ${C.border}`, background:C.surface,
              cursor:'pointer', textAlign:'left', width:'100%',
              boxShadow:'0 2px 8px rgba(0,0,0,0.06)',
            }}>
              <div style={{ width:52, height:52, borderRadius:14, background:'#E6F1FB', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, flexShrink:0 }}>🔍</div>
              <div>
                <div style={{ fontSize:16, fontWeight:700, color:C.textMain }}>Encaisser un paiement</div>
                <div style={{ fontSize:12, color:C.textMuted, marginTop:3 }}>Rechercher un élève existant et enregistrer un versement</div>
              </div>
              <div style={{ marginLeft:'auto', fontSize:20, color:'#C0C8D0' }}>›</div>
            </button>

            {/* Bouton Nouvel élève */}
            <button onClick={() => setMode('nouvel_eleve')} style={{
              display:'flex', alignItems:'center', gap:14, padding:'20px 16px',
              borderRadius:14, border:`1.5px solid ${C.green}`, background:'#F0FBF6',
              cursor:'pointer', textAlign:'left', width:'100%',
              boxShadow:'0 2px 8px rgba(0,0,0,0.06)',
            }}>
              <div style={{ width:52, height:52, borderRadius:14, background:'#D4F1E4', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, flexShrink:0 }}>➕</div>
              <div>
                <div style={{ fontSize:16, fontWeight:700, color:C.textMain }}>Nouvel élève / Réinscription</div>
                <div style={{ fontSize:12, color:C.textMuted, marginTop:3 }}>Inscrire un nouvel élève ou réinscrire un ancien pour la rentrée</div>
              </div>
              <div style={{ marginLeft:'auto', fontSize:20, color:'#C0C8D0' }}>›</div>
            </button>

            {/* Résumé rapide */}
            <div style={{ background:C.surface, borderRadius:12, padding:'12px 14px', border:`1px solid ${C.border}`, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:0, marginTop:4 }}>
              {[
                { label:'Élèves',   value: String(eleves.length),                                       color:C.primary },
                { label:'Soldés',   value: String(eleves.filter(e => statut(e)==='solde').length),       color:C.green   },
                { label:'Impayés',  value: String(eleves.filter(e => statut(e)!=='solde').length),       color:C.red     },
              ].map((s, i) => (
                <div key={i} style={{ textAlign:'center', borderRight:i<2?`1px solid ${C.border}`:'none', padding:'0 6px' }}>
                  <div style={{ fontSize:20, fontWeight:700, color:s.color }}>{s.value}</div>
                  <div style={{ fontSize:10, color:C.textMuted, marginTop:2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ══════════════════════════════════════
            MODE RECHERCHE
        ══════════════════════════════════════ */}
        {mode === 'recherche' && (
          <>
            <div style={{ position:'relative' }}>
              <input
                autoFocus
                type="search"
                value={recherche}
                onChange={e => { setRecherche(e.target.value); setEleveSelId(null) }}
                placeholder="Nom, prénom ou numéro d'élève…"
                style={{ width:'100%', padding:'12px 40px 12px 14px', borderRadius:10, border:`1.5px solid ${C.primary}`, background:C.surface, fontSize:14, outline:'none', color:C.textMain }}
              />
              <span style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', fontSize:18, color:C.textMuted, pointerEvents:'none' }}>🔍</span>
            </div>

            {/* Résultats */}
            {resultats.length > 0 && (
              <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden' }}>
                {resultats.map((e, idx) => {
                  const sc = STATUT_CFG[statut(e)]
                  return (
                    <div key={e.id} onClick={() => selectionner(e)} style={{
                      display:'flex', alignItems:'center', gap:10, padding:'11px 14px',
                      borderBottom: idx < resultats.length-1 ? `1px solid ${C.border}` : 'none',
                      cursor:'pointer',
                    }}
                    onMouseEnter={el => (el.currentTarget.style.background='#F4F6F9')}
                    onMouseLeave={el => (el.currentTarget.style.background=C.surface)}
                    >
                      <div style={{ width:38, height:38, borderRadius:'50%', background:'#E6F1FB', color:'#0C447C', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, flexShrink:0 }}>
                        {e.prenom[0]}{e.nom[0]}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:C.textMain }}>{e.prenom} {e.nom}</div>
                        <div style={{ fontSize:11, color:C.textMuted }}>{e.classe} · {e.numero}</div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, fontWeight:500, background:sc.bg, color:sc.color }}>{sc.label}</span>
                        <div style={{ fontSize:10, color:C.textMuted, marginTop:3 }}>{formatXOF(totalPaye(e))} / {formatXOF(e.totalDu)}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {recherche.length >= 2 && resultats.length === 0 && (
              <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:'20px', textAlign:'center' }}>
                <div style={{ fontSize:28, marginBottom:8 }}>🔍</div>
                <div style={{ fontSize:13, color:C.textMuted }}>Aucun élève pour « {recherche} »</div>
                <button onClick={() => setMode('nouvel_eleve')} style={{
                  marginTop:12, padding:'9px 20px', borderRadius:10,
                  background:C.green, color:'#fff', border:'none',
                  fontSize:13, fontWeight:600, cursor:'pointer',
                }}>
                  ➕ Inscrire cet élève
                </button>
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════
            MODE NOUVEL ÉLÈVE / RÉINSCRIPTION
        ══════════════════════════════════════ */}
        {mode === 'nouvel_eleve' && (
          <>
            {flashNew ? (
              <div style={{ background:'#EAF3DE', border:'1.5px solid #97C459', borderRadius:14, padding:24, textAlign:'center' }}>
                <div style={{ fontSize:40, marginBottom:10 }}>✅</div>
                <div style={{ fontSize:15, fontWeight:700, color:'#27500A' }}>{flashNew}</div>
                <div style={{ fontSize:12, color:'#3B6D11', marginTop:6 }}>Redirection vers la fiche élève…</div>
              </div>
            ) : (
              <div style={{ background:C.surface, borderRadius:14, padding:16, border:`1px solid ${C.border}` }}>

                {/* Type inscription */}
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'.4px', marginBottom:8 }}>
                    Type d'inscription
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    {([
                      { id:'nouveau',        label:'🎒 Nouvel élève',    desc:'Première inscription' },
                      { id:'reinscription',  label:'🔄 Réinscription',   desc:'Élève de l\'année dernière' },
                    ] as { id: 'nouveau'|'reinscription'; label:string; desc:string }[]).map(t => (
                      <button key={t.id} onClick={() => setNType(t.id)} style={{
                        padding:'12px 10px', borderRadius:10, cursor:'pointer', textAlign:'left',
                        border:`1.5px solid ${nType===t.id ? C.primary : C.border}`,
                        background: nType===t.id ? 'rgba(27,58,92,0.07)' : C.surface,
                      }}>
                        <div style={{ fontSize:14, marginBottom:3 }}>{t.label.split(' ')[0]}</div>
                        <div style={{ fontSize:12, fontWeight:600, color:nType===t.id?C.primary:C.textMain }}>{t.label.split(' ').slice(1).join(' ')}</div>
                        <div style={{ fontSize:10, color:C.textMuted, marginTop:2 }}>{t.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ height:1, background:C.border, marginBottom:14 }} />

                {/* Infos élève */}
                <div style={{ fontSize:11, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'.4px', marginBottom:10 }}>
                  Informations de l'élève
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:0 }}>
                  <div style={{ paddingRight:8 }}>
                    <Field label="Prénom" value={nPrenom} onChange={setNPrenom} placeholder="Ibrahim" required />
                  </div>
                  <div style={{ paddingLeft:8 }}>
                    <Field label="Nom" value={nNom} onChange={setNNom} placeholder="Konaté" required />
                  </div>
                </div>

                {/* Classe */}
                <div style={{ marginBottom:12 }}>
                  <label style={{ display:'block', fontSize:10, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'.4px', marginBottom:5 }}>
                    Classe <span style={{ color:C.red }}>*</span>
                  </label>
                  <div style={{ position:'relative' }}>
                    <select
                      value={nClasse}
                      onChange={e => setNClasse(e.target.value)}
                      style={{ width:'100%', padding:'11px 32px 11px 12px', borderRadius:9, border:`1.5px solid ${C.primary}`, background:'#F0F5FB', fontSize:14, fontWeight:600, appearance:'none', outline:'none', cursor:'pointer', color:C.textMain }}
                    >
                      {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:C.primary, pointerEvents:'none' }}>▾</span>
                  </div>
                  {/* Frais correspondant */}
                  <div style={{ fontSize:11, color:C.textMuted, marginTop:5, display:'flex', justifyContent:'space-between' }}>
                    <span>Frais annuels pour cette classe :</span>
                    <span style={{ fontWeight:700, color:C.primary }}>{formatXOF(FRAIS_PAR_CLASSE[nClasse] ?? 0)}</span>
                  </div>
                </div>

                <div style={{ height:1, background:C.border, marginBottom:14 }} />

                {/* Infos parent */}
                <div style={{ fontSize:11, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'.4px', marginBottom:10 }}>
                  Parent / Tuteur
                </div>
                <Field label="Nom complet du parent" value={nParentNom} onChange={setNParentNom} placeholder="Mme Fatou Konaté" required />
                <Field label="Téléphone WhatsApp" value={nParentTel} onChange={setNParentTel} placeholder="+229 96 xx xx xx" type="tel" required />

                <div style={{ height:1, background:C.border, marginBottom:14 }} />

                {/* Info frais d'inscription */}
                <div style={{ background:'#FAEEDA', borderRadius:10, padding:'10px 12px', marginBottom:14, fontSize:12, color:'#633806' }}>
                  💡 Un premier versement de <strong>25 000 XOF</strong> ({nType==='nouveau'?'frais d\'inscription':'frais de réinscription'}) sera automatiquement enregistré en espèces. Vous pourrez ajouter d'autres versements depuis la fiche élève.
                </div>

                {/* Bouton créer */}
                <button
                  onClick={creerEleve}
                  disabled={!formNouvelEleveValide || savingNew}
                  style={{
                    width:'100%', padding:'14px 0', borderRadius:12, border:'none',
                    background: !formNouvelEleveValide ? '#D0D5DD' : savingNew ? '#85B7EB' : C.green,
                    color:'#fff', fontSize:15, fontWeight:700,
                    cursor: !formNouvelEleveValide ? 'not-allowed' : savingNew ? 'wait' : 'pointer',
                  }}
                >
                  {savingNew ? '⏳ Inscription en cours…' : `✅ Inscrire ${nPrenom || 'l\'élève'} en ${nClasse}`}
                </button>
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════
            MODE FICHE + VERSEMENT
        ══════════════════════════════════════ */}
        {mode === 'fiche' && eleveSel && (() => {
          const sc = STATUT_CFG[statut(eleveSel)]
          return (
            <>
              {/* Reçu de confirmation */}
              {recu && (
                <div style={{ background:'#EAF3DE', border:'1.5px solid #97C459', borderRadius:14, padding:16 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:'#27500A', marginBottom:10 }}>✅ Versement enregistré</div>
                  {[
                    { label:'Élève',     value:`${eleveSel.prenom} ${eleveSel.nom} — ${eleveSel.classe}` },
                    { label:'Type',      value: recu.typeFrais },
                    { label:'Montant',   value: formatXOF(recu.montant) },
                    { label:'Mode',      value:`${PROVIDER_EMOJI[recu.provider]} ${recu.provider}` },
                    { label:'Référence', value: recu.reference },
                    { label:'Date',      value: new Date(recu.date).toLocaleDateString('fr-FR') },
                  ].map(r => (
                    <div key={r.label} style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                      <span style={{ color:'#3B6D11' }}>{r.label}</span>
                      <span style={{ fontWeight:600, color:'#27500A' }}>{r.value}</span>
                    </div>
                  ))}
                  <div style={{ display:'flex', gap:8, marginTop:12 }}>
                    <button onClick={() => setRecu(null)} style={{ flex:1, padding:'10px 0', borderRadius:10, border:`1px solid ${C.border}`, background:C.surface, color:C.primary, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                      + Autre versement
                    </button>
                    <button
                      onClick={() => {
                        const msg = `Reçu AIDEDUC\n${recu.typeFrais} — ${formatXOF(recu.montant)}\nÉlève : ${eleveSel.prenom} ${eleveSel.nom}\nRéf : ${recu.reference}\nDate : ${new Date(recu.date).toLocaleDateString('fr-FR')}`
                        window.open(`https://wa.me/${eleveSel.parentTel.replace(/\s/g,'')}?text=${encodeURIComponent(msg)}`, '_blank')
                      }}
                      style={{ flex:1, padding:'10px 0', borderRadius:10, border:'none', background:'#25D366', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' }}
                    >
                      📲 WhatsApp
                    </button>
                  </div>
                </div>
              )}

              {/* Fiche élève */}
              <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden' }}>
                {/* En-tête */}
                <div style={{ background:C.primary, padding:'12px 14px', display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:44, height:44, borderRadius:'50%', background:C.accent, color:C.primary, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:700, flexShrink:0 }}>
                    {eleveSel.prenom[0]}{eleveSel.nom[0]}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{ fontSize:15, fontWeight:700, color:'#fff' }}>{eleveSel.prenom} {eleveSel.nom}</span>
                      {eleveSel.estNouveau && <span style={{ fontSize:9, padding:'2px 6px', borderRadius:20, background:'#F5A623', color:C.primary, fontWeight:700 }}>NOUVEAU</span>}
                    </div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,0.55)' }}>{eleveSel.classe} · {eleveSel.numero}</div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,0.45)' }}>👤 {eleveSel.parentNom} · {eleveSel.parentTel}</div>
                  </div>
                  <span style={{ fontSize:10, padding:'3px 9px', borderRadius:20, fontWeight:600, background:sc.bg, color:sc.color }}>{sc.label}</span>
                </div>

                {/* Chiffres */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', borderBottom:`1px solid ${C.border}` }}>
                  {[
                    { label:'Total dû',  value: formatXOF(eleveSel.totalDu), color:C.textMain },
                    { label:'Versé',      value: formatXOF(paye),             color:C.green     },
                    { label:'Reste',      value: formatXOF(reste),            color: reste>0?C.red:C.green },
                  ].map((s, i) => (
                    <div key={i} style={{ padding:'10px 8px', textAlign:'center', borderRight:i<2?`1px solid ${C.border}`:'none' }}>
                      <div style={{ fontSize:13, fontWeight:700, color:s.color }}>{s.value}</div>
                      <div style={{ fontSize:10, color:C.textMuted, marginTop:2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Barre */}
                <div style={{ padding:'10px 14px', borderBottom:`1px solid ${C.border}` }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                    <span style={{ fontSize:11, color:C.textMuted }}>Recouvrement</span>
                    <span style={{ fontSize:11, fontWeight:700, color:pct>=100?C.green:pct>0?C.amber:C.red }}>{pct}%</span>
                  </div>
                  <div style={{ height:7, background:'#F0F0F0', borderRadius:4, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${pct}%`, background:pct>=100?C.green:pct>0?C.amber:C.red, borderRadius:4, transition:'width 0.4s' }} />
                  </div>
                </div>

                {/* Historique */}
                {eleveSel.versements.length > 0 && (
                  <div>
                    <div style={{ fontSize:10, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'.4px', padding:'8px 14px 4px' }}>Historique</div>
                    {eleveSel.versements.map((v, i) => (
                      <div key={v.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', borderTop:i>0?`1px solid ${C.border}`:'none' }}>
                        <span style={{ fontSize:16 }}>{PROVIDER_EMOJI[v.provider]}</span>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:12, fontWeight:500, color:C.textMain }}>{v.typeFrais}</div>
                          <div style={{ fontSize:10, color:C.textMuted }}>{new Date(v.date).toLocaleDateString('fr-FR')} · {v.reference}</div>
                        </div>
                        <div style={{ fontSize:13, fontWeight:700, color:C.green }}>+{formatXOF(v.montant)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Formulaire versement */}
              {reste > 0 && !recu ? (
                <div style={{ background:C.surface, borderRadius:14, padding:16, border:`1px solid ${C.border}` }}>
                  <div style={{ fontSize:13, fontWeight:700, color:C.primary, marginBottom:14 }}>✏️ Nouveau versement</div>

                  {/* Type frais */}
                  <div style={{ marginBottom:12 }}>
                    <label style={{ display:'block', fontSize:10, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'.4px', marginBottom:5 }}>Type de frais</label>
                    <div style={{ position:'relative' }}>
                      <select value={typeFrais} onChange={e => setTypeFrais(e.target.value as TypeFrais)} style={{ width:'100%', padding:'10px 32px 10px 12px', borderRadius:9, border:`1px solid ${C.border}`, background:C.surface, fontSize:13, appearance:'none', outline:'none', cursor:'pointer', color:C.textMain }}>
                        {TYPES_FRAIS.map(t => <option key={t}>{t}</option>)}
                      </select>
                      <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:C.textMuted, pointerEvents:'none' }}>▾</span>
                    </div>
                  </div>

                  {/* Montant */}
                  <label style={{ display:'block', fontSize:10, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'.4px', marginBottom:5 }}>Montant (XOF)</label>
                  <input
                    type="number" inputMode="numeric" value={montant} min={1}
                    onChange={e => setMontant(e.target.value)}
                    placeholder={`Reste : ${formatXOF(reste)}`}
                    style={{ width:'100%', padding:'11px 12px', borderRadius:9, marginBottom:8, border:`1.5px solid ${montantOk?C.green:C.border}`, background:montantOk?'#F0FBF6':C.surface, fontSize:15, fontWeight:600, outline:'none', color:C.textMain }}
                  />

                  {/* Raccourcis */}
                  <div style={{ display:'flex', gap:6, marginBottom:14 }}>
                    {[25000, 75000, reste].filter((v,i,a)=>v>0&&a.indexOf(v)===i).map(v=>(
                      <button key={v} onClick={()=>setMontant(String(v))} style={{ flex:1, padding:'6px 4px', borderRadius:8, border:`1px solid ${C.border}`, background:'#F4F6F9', fontSize:11, fontWeight:600, color:C.primary, cursor:'pointer' }}>
                        {v>=1000?`${v/1000}k`:v}
                      </button>
                    ))}
                  </div>

                  {/* Provider */}
                  <label style={{ display:'block', fontSize:10, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'.4px', marginBottom:8 }}>Mode de paiement</label>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:16 }}>
                    {PROVIDERS.map(p=>(
                      <button key={p} onClick={()=>setProvider(p)} style={{ padding:'9px 8px', borderRadius:10, border:`1.5px solid ${provider===p?C.primary:C.border}`, background:provider===p?'rgba(27,58,92,0.07)':C.surface, color:provider===p?C.primary:C.textMuted, fontSize:12, fontWeight:provider===p?700:400, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ fontSize:16 }}>{PROVIDER_EMOJI[p]}</span>{p}
                      </button>
                    ))}
                  </div>

                  <button onClick={enregistrer} disabled={!montantOk||saving} style={{ width:'100%', padding:'14px 0', borderRadius:12, border:'none', background:!montantOk?'#D0D5DD':saving?'#85B7EB':C.green, color:'#fff', fontSize:15, fontWeight:700, cursor:!montantOk?'not-allowed':saving?'wait':'pointer' }}>
                    {saving?'⏳ Enregistrement…':`💾 Enregistrer ${montantOk?`— ${parseInt(montant).toLocaleString('fr-FR')} XOF`:''}`}
                  </button>
                </div>
              ) : reste === 0 && !recu ? (
                <div style={{ background:'#EAF3DE', border:'1px solid #97C459', borderRadius:12, padding:16, textAlign:'center' }}>
                  <div style={{ fontSize:28, marginBottom:6 }}>🎉</div>
                  <div style={{ fontSize:14, fontWeight:700, color:'#27500A' }}>Compte soldé</div>
                  <div style={{ fontSize:12, color:'#3B6D11', marginTop:4 }}>{eleveSel.prenom} a réglé la totalité des frais.</div>
                  <button onClick={reset} style={{ marginTop:12, padding:'9px 20px', borderRadius:10, background:C.primary, color:'#fff', border:'none', fontSize:13, fontWeight:600, cursor:'pointer' }}>
                    Retour à l'accueil
                  </button>
                </div>
              ) : null}
            </>
          )
        })()}
      </main>
    </div>
  )
}
