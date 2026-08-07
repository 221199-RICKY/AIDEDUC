// ─────────────────────────────────────────────
// AIDEDUC — Encaissement.tsx (Supabase Connected)
// src/components/comptable/Encaissement.tsx
// Tables : students, scolarite, classes, paiements
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
  classeId: string
  classeNom: string
  numero: string
  parentNom: string
  parentTel: string
  estNouveau: boolean
  anneeScolaire: string
  versements: Versement[]
  totalDu: number
}

// ── Helpers ───────────────────────────────────
function formatXOF(n: number): string {
  return (n || 0).toLocaleString('fr-FR') + ' XOF'
}

function totalPaye(e: Eleve): number {
  return e.versements.reduce((s, v) => s + (v.montant || 0), 0)
}

function statut(e: Eleve): StatutCompte {
  const p = totalPaye(e)
  if (p >= e.totalDu && e.totalDu > 0) return 'solde'
  if (p > 0) return 'partiel'
  return 'en_attente'
}

function genRef(): string {
  return `EC-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`
}

function genNumero(classe: string): string {
  const prefix = (classe || 'ELE').replace(/\s/g, '').slice(0, 3).toUpperCase()
  return `${prefix}-${String(Math.floor(Math.random() * 900) + 100)}`
}

// Helper pour extraire une valeur d'un objet Supabase sans se soucier de la casse de la clé
function getProp(obj: any, keys: string[]): any {
  if (!obj) return undefined
  const objKeys = Object.keys(obj)
  for (const k of keys) {
    const foundKey = objKeys.find(key => key.toLowerCase() === k.toLowerCase())
    if (foundKey && obj[foundKey] !== undefined && obj[foundKey] !== null) {
      return obj[foundKey]
    }
  }
  return undefined
}

// Convertit n'importe quelle valeur en nombre valide
function parseMontant(val: any): number {
  if (typeof val === 'number') return val
  if (!val) return 0
  const cleanStr = String(val).replace(/[^0-9.-]/g, '')
  const parsed = parseFloat(cleanStr)
  return isNaN(parsed) ? 0 : parsed
}

const STATUT_CFG: Record<StatutCompte, { label: string; bg: string; color: string }> = {
  solde:      { label:'✓ Soldé',      bg:'#EAF3DE', color:'#27500A' },
  partiel:    { label:'½ Partiel',    bg:'#EEEDFE', color:'#3C3489' },
  en_attente: { label:'⚠ En attente', bg:'#FCEBEB', color:'#A32D2D' },
}

const PROVIDERS: { id: Provider; label: string; icon: string }[] = [
  { id: 'Espèces',      label: 'Espèces',      icon: '💵' },
  { id: 'Wave',         label: 'Wave',         icon: '🌊' },
  { id: 'MTN Money',    label: 'MTN',          icon: '🟡' },
  { id: 'Moov Money',   label: 'Moov',         icon: '🔵' },
  { id: 'Orange Money', label: 'Orange',       icon: '🟠' },
]

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
          boxSizing: 'border-box'
        }}
      />
    </div>
  )
}

// ── COMPOSANT PRINCIPAL ───────────────────────
interface EncaissementProps { onBack: () => void }

export default function Encaissement({ onBack }: EncaissementProps) {
  const [eleves,            setEleves]            = useState<Eleve[]>([])
  const [classesList,       setClassesList]       = useState<{ id: string; nom: string }[]>([])
  const [scolariteMap,      setScolariteMap]      = useState<Record<string, number>>({})
  const [loading,           setLoading]           = useState(true)
  const [mode,              setMode]              = useState<ModeEcran>('accueil')
  const [recherche,         setRecherche]         = useState('')
  const [eleveSelId,        setEleveSelId]        = useState<string | null>(null)
  const [errorMsg,          setErrorMsg]          = useState<string | null>(null)

  // Form versement
  const [typeFrais,   setTypeFrais]   = useState<TypeFrais>('Scolarité T3')
  const [montant,     setMontant]     = useState('')
  const [provider,    setProvider]    = useState<Provider>('Espèces')
  const [saving,      setSaving]      = useState(false)

  // Form nouvel élève
  const [nPrenom,     setNPrenom]     = useState('')
  const [nNom,        setNNom]        = useState('')
  const [nClasseId,   setNClasseId]   = useState('')
  const [nParentNom,  setNParentNom]  = useState('')
  const [nParentTel,  setNParentTel]  = useState('')
  const [nType]                       = useState<'nouveau' | 'reinscription'>('nouveau')
  const [savingNew,   setSavingNew]   = useState(false)
  const [,    setFlashNew]    = useState('')

  useEffect(() => {
    chargerDonnees()
  }, [])

  async function chargerDonnees() {
    try {
      setLoading(true)
      setErrorMsg(null)

      const [
        { data: dbStudents, error: errE },
        { data: dbPaiements, error: errP },
        { data: dbClasses, error: errC },
        { data: dbScolarite, error: errS }
      ] = await Promise.all([
        supabase.from('students').select('*'),
        supabase.from('paiements').select('*'),
        supabase.from('classes').select('*'),
        supabase.from('scolarite').select('*')
      ])

      if (errE) throw errE
      if (errP) throw errP
      if (errC) throw errC
      if (errS) throw errS

      // 1. Dictionnaire Scolarite
      const mapScolarite: Record<string, number> = {}
      if (dbScolarite) {
        dbScolarite.forEach((s: any) => {
          const rawClasseId = getProp(s, ['classeid', 'classe_id', 'id_classe', 'id'])
          const rawMontant  = getProp(s, ['scolarite', 'montant', 'tarif', 'price'])

          const cId = rawClasseId !== undefined && rawClasseId !== null ? String(rawClasseId).trim() : ''
          const valScolarite = parseMontant(rawMontant)

          if (cId) {
            mapScolarite[cId] = valScolarite
          }
        })
      }
      setScolariteMap(mapScolarite)

      // 2. Liste des classes
      const listC: { id: string; nom: string }[] = (dbClasses || []).map((c: any) => {
        const rawId = getProp(c, ['id', 'classeid', 'classe_id'])
        const rawNom = getProp(c, ['nom', 'libelle', 'name', 'titre'])
        const cId = String(rawId ?? '').trim()
        return {
          id: cId,
          nom: rawNom ?? `Classe ${cId}`
        }
      })

      setClassesList(listC)
      if (listC.length > 0) {
        setNClasseId(listC[0].id)
      }

      // 3. Mapping élèves
      const elevesFormates: Eleve[] = (dbStudents || []).map((e: any) => {
        const rawStudentId = getProp(e, ['id', 'student_id', 'eleveid'])
        const studentId = String(rawStudentId ?? '').trim()

        const versementsEleve: Versement[] = (dbPaiements || [])
          .filter((p: any) => {
            const pEleveId = String(getProp(p, ['eleveid', 'student_id', 'eleve_id', 'id_eleve']) ?? '').trim()
            return pEleveId === studentId
          })
          .map((p: any) => ({
            id: String(getProp(p, ['id'])),
            typeFrais: getProp(p, ['typefrais', 'type_frais']) ?? 'Scolarité',
            montant: parseMontant(getProp(p, ['montant'])),
            provider: getProp(p, ['provider', 'mode', 'mode_paiement']) ?? 'Espèces',
            date: getProp(p, ['date', 'created_at']) ?? new Date().toISOString(),
            reference: getProp(p, ['reference', 'ref']) ?? 'EC-00000'
          }))

        const rawClassId = getProp(e, ['class_id', 'classeid', 'classe_id', 'id_classe'])
        const studentClassId = rawClassId !== undefined && rawClassId !== null ? String(rawClassId).trim() : ''

        const classeObj = listC.find(c => c.id === studentClassId)
        const classeNom = classeObj ? classeObj.nom : `Classe ${studentClassId}`

        const scolariteMontant = mapScolarite[studentClassId] ?? mapScolarite[classeNom] ?? 0

        return {
          id: studentId,
          prenom: getProp(e, ['prenomé', 'prenome', 'prenom', 'first_name']) ?? '',
          nom: getProp(e, ['nom', 'last_name']) ?? '',
          classeId: studentClassId,
          classeNom: classeNom,
          numero: getProp(e, ['numero', 'num']) ?? `N°${studentId}`,
          parentNom: getProp(e, ['parentnom', 'parent_nom', 'tuteur']) ?? '',
          parentTel: getProp(e, ['parenttel', 'parent_tel', 'telephone']) ?? '',
          estNouveau: Boolean(getProp(e, ['estnouveau', 'est_nouveau', 'is_new'])),
          anneeScolaire: getProp(e, ['anneescolaire', 'annee_scolaire']) ?? '2025-2026',
          totalDu: scolariteMontant,
          versements: versementsEleve
        }
      })

      setEleves(elevesFormates)
    } catch (err: any) {
      console.error("Erreur chargement Supabase:", err)
      setErrorMsg("Impossible de charger les données. Vérifiez la connexion Supabase.")
    } finally {
      setLoading(false)
    }
  }

  const eleveSel = useMemo(() => eleves.find(e => e.id === eleveSelId) ?? null, [eleves, eleveSelId])

  const resultats = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    if (q.length < 2) return []
    return eleves.filter(e =>
      `${e.prenom} ${e.nom} ${e.numero} ${e.classeNom}`.toLowerCase().includes(q)
    )
  }, [recherche, eleves])

  const paye  = eleveSel ? totalPaye(eleveSel) : 0
  const reste = eleveSel ? Math.max(0, eleveSel.totalDu - paye) : 0
  const montantNum = parseFloat(montant)
  const montantOk  = !isNaN(montantNum) && montantNum > 0

  function selectionner(e: Eleve) {
    setEleveSelId(e.id)
    setRecherche(`${e.prenom} ${e.nom}`)
    setMode('fiche')
  }

  function reset() {
    setEleveSelId(null)
    setRecherche('')
    setMontant('')
    setTypeFrais('Scolarité T3')
    setProvider('Espèces')
    setMode('accueil')
  }

  // ── ENREGISTRER UN VERSEMENT ──
  async function enregistrer() {
    if (!eleveSel || !montantOk) return
    setSaving(true)
    setErrorMsg(null)

    const reference = genRef()
    const dateJour = new Date().toISOString().slice(0, 10)

    try {
      const { data, error } = await supabase
        .from('paiements')
        .insert([
          {
            eleveid: eleveSel.id,
            typefrais: typeFrais,
            montant: montantNum,
            provider: provider,
            reference: reference,
            date: dateJour
          }
        ])
        .select()
        .single()

      if (error) throw error

      const nouveau: Versement = {
        id: data ? String(data.id) : `v${Date.now()}`,
        typeFrais,
        montant: montantNum,
        provider,
        date: dateJour,
        reference
      }

      setEleves(prev => prev.map(e =>
        e.id === eleveSel.id ? { ...e, versements: [...e.versements, nouveau] } : e
      ))

      setMontant('')
    } catch (err: any) {
  // Remplacez le console.error existant par ceci :
  console.error("Erreur versement Supabase :", {
    message: err.message,
    details: err.details,
    hint: err.hint,
    code: err.code,
    full: err
  });
  setErrorMsg("Impossible d'enregistrer le versement.")
    }
  }

  // ── CRÉER UN ÉLÈVE ──
  async function creerEleve() {
    if (!nPrenom.trim() || !nNom.trim() || !nParentNom.trim() || !nParentTel.trim() || !nClasseId) return
    setSavingNew(true)
    setErrorMsg(null)

    const classeObj = classesList.find(c => c.id === nClasseId)
    const classeNom = classeObj ? classeObj.nom : nClasseId
    const numero = genNumero(classeNom)
    const scolariteTotal = scolariteMap[nClasseId] ?? 0

    try {
      // 1. Insertion uniquement de l'élève dans la table 'students'
      const { data: eleveData, error: eleveError } = await supabase
        .from('students')
        .insert([
          {
            prenom: nPrenom.trim(),
            nom: nNom.trim().toUpperCase(),
            class_id: nClasseId,
            numero: numero,
            parentnom: nParentNom.trim(),
            parenttel: nParentTel.trim(),
            estnouveau: nType === 'nouveau',
            anneescolaire: '2025-2026'
          }
        ])
        .select()
        .single()

      if (eleveError) throw eleveError

      // 2. Construction de l'objet élève local (sans versement initial)
      const nouvelEleve: Eleve = {
        id: String(eleveData.id),
        prenom: nPrenom.trim(),
        nom: nNom.trim().toUpperCase(),
        classeId: nClasseId,
        classeNom: classeNom,
        numero,
        parentNom: nParentNom.trim(),
        parentTel: nParentTel.trim(),
        estNouveau: nType === 'nouveau',
        anneeScolaire: '2025-2026',
        totalDu: scolariteTotal,
        versements: [] // Aucun versement généré automatiquement
      }

      // 3. Mise à jour de l'état local et réinitialisation du formulaire
      setEleves(prev => [...prev, nouvelEleve])
      setFlashNew(`${nPrenom} ${nNom.toUpperCase()} inscrit(e) en ${classeNom} — N° ${numero}`)

      setTimeout(() => {
        setEleveSelId(nouvelEleve.id)
        setMode('fiche')
        setFlashNew('')
        setTypeFrais('Scolarité T1')
        setNPrenom(''); setNNom(''); setNParentNom(''); setNParentTel('')
      }, 1800)

    } catch (err: any) {
      console.error("Erreur création élève Supabase:", err)
      setErrorMsg("Échec de la création de l'élève.")
    } finally {
      setSavingNew(false)
    }
  }

  const formNouvelEleveValide = nPrenom.trim() && nNom.trim() && nParentNom.trim() && nParentTel.trim() && nClasseId

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', backgroundColor: C.bg }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>💵</div>
          <div style={{ color: C.textMuted, fontWeight: '500' }}>Chargement des données...</div>
        </div>
      </div>
    )
  }

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
        </div>
      </header>

      <main style={{ flex:1, padding:'16px 16px 32px', display:'flex', flexDirection:'column', gap:12 }}>

        {errorMsg && (
          <div style={{ background: '#FCEBEB', border: `1px solid ${C.red}`, color: C.red, padding: '10px 12px', borderRadius: 8, fontSize: 12 }}>
            ⚠️ {errorMsg}
          </div>
        )}

        {/* ACCUEIL */}
        {mode === 'accueil' && (
          <>
            <div style={{ fontSize:13, color:C.textMuted, textAlign:'center', marginBottom:4 }}>
              Que souhaitez-vous faire ?
            </div>

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
            </button>

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
            </button>
          </>
        )}

        {/* RECHERCHE */}
        {mode === 'recherche' && (
          <>
            <div style={{ position:'relative' }}>
              <input
                autoFocus
                type="search"
                value={recherche}
                onChange={e => { setRecherche(e.target.value); setEleveSelId(null) }}
                placeholder="Nom, prénom ou numéro d'élève…"
                style={{ width:'100%', padding:'12px 40px 12px 14px', borderRadius:10, border:`1.5px solid ${C.primary}`, background:C.surface, fontSize:14, outline:'none', color:C.textMain, boxSizing: 'border-box' }}
              />
            </div>

            {resultats.length > 0 && (
              <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden' }}>
                {resultats.map((e, idx) => {
                  const sc = STATUT_CFG[statut(e)]
                  return (
                    <div key={e.id} onClick={() => selectionner(e)} style={{
                      display:'flex', alignItems:'center', gap:10, padding:'11px 14px',
                      borderBottom: idx < resultats.length-1 ? `1px solid ${C.border}` : 'none',
                      cursor:'pointer',
                    }}>
                      <div style={{ width:38, height:38, borderRadius:'50%', background:'#E6F1FB', color:'#0C447C', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, flexShrink:0 }}>
                        {e.prenom[0] ?? ''}{e.nom[0] ?? ''}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:C.textMain }}>{e.prenom} {e.nom}</div>
                        <div style={{ fontSize:11, color:C.textMuted }}>{e.classeNom} · {e.numero}</div>
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
          </>
        )}

        {/* NOUVEL ÉLÈVE */}
        {mode === 'nouvel_eleve' && (
          <div style={{ background:C.surface, borderRadius:14, padding:16, border:`1px solid ${C.border}` }}>
            <Field label="Prénom" value={nPrenom} onChange={setNPrenom} placeholder="Ex: Ibrahim" required />
            <Field label="Nom" value={nNom} onChange={setNNom} placeholder="Ex: Konaté" required />

            <div style={{ marginBottom:12 }}>
              <label style={{ display:'block', fontSize:10, fontWeight:700, color:C.textMuted, textTransform:'uppercase', marginBottom:5 }}>
                Classe *
              </label>
              <select
                value={nClasseId}
                onChange={e => setNClasseId(e.target.value)}
                style={{ width:'100%', padding:'11px', borderRadius:9, border:`1.5px solid ${C.primary}`, background:'#F0F5FB', fontSize:14, outline:'none' }}
              >
                {classesList.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
              <div style={{ fontSize:11, color:C.textMuted, marginTop:5, display:'flex', justifyContent:'space-between' }}>
                <span>Tarif scolarité :</span>
                <span style={{ fontWeight:700, color:C.primary }}>{formatXOF(scolariteMap[nClasseId] ?? 0)}</span>
              </div>
            </div>

            <Field label="Parent" value={nParentNom} onChange={setNParentNom} placeholder="Mme Fatou Konaté" required />
            <Field label="Téléphone" value={nParentTel} onChange={setNParentTel} placeholder="+229..." type="tel" required />

            <button
              onClick={creerEleve}
              disabled={!formNouvelEleveValide || savingNew}
              style={{
                width:'100%', padding:'14px 0', borderRadius:12, border:'none',
                background: !formNouvelEleveValide ? '#D0D5DD' : C.green,
                color:'#fff', fontSize:15, fontWeight:700, marginTop:10, cursor:'pointer'
              }}
            >
              {savingNew ? 'Enregistrement...' : 'Inscrire l\'élève'}
            </button>
          </div>
        )}

        {/* FICHE ÉLÈVE */}
        {mode === 'fiche' && eleveSel && (() => {
          const sc = STATUT_CFG[statut(eleveSel)]
          return (
            <>
              {/* En-tête profil élève */}
              <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden' }}>
                <div style={{ background:C.primary, padding:'12px 14px', display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:44, height:44, borderRadius:'50%', background:C.accent, color:C.primary, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:700, flexShrink:0 }}>
                    {eleveSel.prenom[0] ?? ''}{eleveSel.nom[0] ?? ''}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:15, fontWeight:700, color:'#fff' }}>{eleveSel.prenom} {eleveSel.nom}</div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,0.55)' }}>{eleveSel.classeNom} · {eleveSel.numero}</div>
                  </div>
                  <span style={{ fontSize:10, padding:'3px 9px', borderRadius:20, fontWeight:600, background:sc.bg, color:sc.color }}>{sc.label}</span>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', borderBottom:`1px solid ${C.border}` }}>
                  {[
                    { label:'Total Scolarité',  value: formatXOF(eleveSel.totalDu), color:C.textMain },
                    { label:'Versé',            value: formatXOF(paye),             color:C.green     },
                    { label:'Reste',            value: formatXOF(reste),            color: reste>0?C.red:C.green },
                  ].map((s, i) => (
                    <div key={i} style={{ padding:'10px 8px', textAlign:'center', borderRight:i<2?`1px solid ${C.border}`:'none' }}>
                      <div style={{ fontSize:12, fontWeight:700, color:s.color }}>{s.value}</div>
                      <div style={{ fontSize:10, color:C.textMuted, marginTop:2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* FORMULAIRE DE VERSEMENT */}
              {reste > 0 && (
                <div style={{ background:C.surface, borderRadius:14, padding:16, border:`1px solid ${C.border}` }}>
                  <div style={{ fontSize:13, fontWeight:700, color:C.primary, marginBottom:12 }}>✏️ Enregistrer un versement</div>
                  
                  {/* Type de Frais */}
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display:'block', fontSize:10, fontWeight:700, color:C.textMuted, textTransform:'uppercase', marginBottom:5 }}>
                      Type de Frais
                    </label>
                    <select
                      value={typeFrais}
                      onChange={e => setTypeFrais(e.target.value as TypeFrais)}
                      style={{ width:'100%', padding:'10px', borderRadius:8, border:`1px solid ${C.border}`, fontSize:13, background:C.surface, outline:'none' }}
                    >
                      <option value="Scolarité T1">Scolarité T1</option>
                      <option value="Scolarité T2">Scolarité T2</option>
                      <option value="Scolarité T3">Scolarité T3</option>
                      <option value="Inscription">Inscription</option>
                      <option value="Réinscription">Réinscription</option>
                      <option value="Cantine">Cantine</option>
                      <option value="Transport">Transport</option>
                    </select>
                  </div>

                  {/* Mode de Paiement */}
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display:'block', fontSize:10, fontWeight:700, color:C.textMuted, textTransform:'uppercase', marginBottom:6 }}>
                      Mode de paiement
                    </label>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:6 }}>
                      {PROVIDERS.map(p => {
                        const active = provider === p.id
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setProvider(p.id)}
                            style={{
                              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                              padding:'8px 4px', borderRadius:8,
                              border: `1.5px solid ${active ? C.primary : C.border}`,
                              background: active ? '#F0F5FB' : C.surface,
                              color: active ? C.primary : C.textMuted,
                              cursor:'pointer', transition:'all 0.15s'
                            }}
                          >
                            <span style={{ fontSize:16, marginBottom:2 }}>{p.icon}</span>
                            <span style={{ fontSize:9, fontWeight: active ? 700 : 500 }}>{p.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Saisie du Montant */}
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display:'block', fontSize:10, fontWeight:700, color:C.textMuted, textTransform:'uppercase', marginBottom:5 }}>
                      Montant du versement (XOF)
                    </label>
                    <input
                      type="number" value={montant}
                      onChange={e => setMontant(e.target.value)}
                      placeholder={`Reste à payer : ${formatXOF(reste)}`}
                      style={{ width:'100%', padding:'11px', borderRadius:9, border:`1.5px solid ${C.border}`, fontSize:15, outline:'none', boxSizing:'border-box' }}
                    />
                  </div>

                  <button 
                    onClick={enregistrer} 
                    disabled={!montantOk || saving} 
                    style={{ 
                      width:'100%', padding:'12px 0', borderRadius:10, border:'none', 
                      background: !montantOk ? '#D0D5DD' : C.green, 
                      color:'#fff', fontWeight:700, cursor:'pointer' 
                    }}
                  >
                    {saving ? 'Sauvegarde...' : 'Valider le versement'}
                  </button>
                </div>
              )}

              {/* HISTORIQUE DES VERSEMENTS */}
              {eleveSel.versements.length > 0 && (
                <div style={{ background:C.surface, borderRadius:14, padding:16, border:`1px solid ${C.border}` }}>
                  <div style={{ fontSize:13, fontWeight:700, color:C.primary, marginBottom:10 }}>📋 Historique des versements</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {eleveSel.versements.map(v => (
                      <div key={v.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 10px', background:C.bg, borderRadius:8, fontSize:12 }}>
                        <div>
                          <div style={{ fontWeight:600, color:C.textMain }}>{v.typeFrais}</div>
                          <div style={{ fontSize:10, color:C.textMuted }}>{v.date} · {v.provider}</div>
                        </div>
                        <div style={{ fontWeight:700, color:C.green }}>
                          +{formatXOF(v.montant)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )
        })()}
      </main>
    </div>
  )
}