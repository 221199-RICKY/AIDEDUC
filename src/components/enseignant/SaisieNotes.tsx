// ─────────────────────────────────────────────
// AIDEDUC — SaisieNotes.tsx
// src/components/enseignant/SaisieNotes.tsx
// ─────────────────────────────────────────────

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../../utils/supabaseClient'

// ── Configuration & Palette AIDEDUC ───────────
const PALETTE = {
  primary: '#1B3A5C',
  accent: '#F5A623',
  green: '#1D9E75',
  amber: '#BA7517',
  red: '#E24B4A',
  purple: '#534AB7',
  bg: '#F4F6F9',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  textMain: '#1A1A2E',
  textMuted: '#6C757D',
} as const

const EPREUVES = ['Interro 1', 'Interro 2', 'Devoir 1', 'Devoir 2', 'Examen'] as const
type TypeEpreuve = (typeof EPREUVES)[number]
type Trimestre = 'Trimestre 1' | 'Trimestre 2' | 'Trimestre 3'
type Onglet = 'saisie' | 'moyennes'

export interface Matiere {
  id: string
  nom: string
  coefficient: number
}

export interface Eleve {
  id: string
  prenom: string
  nom: string
}

export interface Classe {
  id: string
  nom: string
}

export interface NoteRecord {
  id?: string
  eleve_id: string
  classe_id: string
  matiere_id: string
  epreuve: TypeEpreuve
  trimestre: Trimestre
  date: string
  valeur: number
}

type NotesLocalStore = Record<string, Partial<Record<TypeEpreuve, string>>>

const AVATARS = [
  { bg: '#E6F1FB', fg: '#0C447C' },
  { bg: '#EAF3DE', fg: '#27500A' },
  { bg: '#FAEEDA', fg: '#633806' },
  { bg: '#EEEDFE', fg: '#3C3489' },
  { bg: '#FAECE7', fg: '#712B13' },
  { bg: '#E1F5EE', fg: '#085041' },
]

function getInitiales(e: Eleve): string {
  const p = e.prenom?.[0] ?? ''
  const n = e.nom?.[0] ?? ''
  return `${p}${n}`.toUpperCase()
}

function parseNote(val: string): number | null {
  if (!val || val.trim() === '') return null
  const n = parseFloat(val.replace(',', '.'))
  if (Number.isNaN(n) || n < 0 || n > 20) return null
  return n
}

// Formatage à 2 décimales exactes sans arrondi supérieur (tronquage)
function formatMoyenne(val: number): string {
  return (Math.floor(val * 100) / 100).toFixed(2)
}

function getNoteColor(n: number): string {
  if (n >= 14) return PALETTE.green
  if (n >= 10) return PALETTE.amber
  return PALETTE.red
}

function getNoteBg(n: number): string {
  if (n >= 14) return '#EAF3DE'
  if (n >= 10) return '#FAEEDA'
  return '#FCEBEB'
}

function getAppreciation(n: number): string {
  if (n >= 16) return 'Excellent'
  if (n >= 14) return 'Très bien'
  if (n >= 12) return 'Bien'
  if (n >= 10) return 'Assez bien'
  if (n >= 8) return 'Passable'
  return 'Insuffisant'
}

function calcMoyInterros(bloc?: Partial<Record<TypeEpreuve, string>>): number | null {
  const vals = (['Interro 1', 'Interro 2'] as const)
    .map((ep) => parseNote(bloc?.[ep] ?? ''))
    .filter((v): v is number => v !== null)
  return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : null
}



// Moyenne = (Moyenne Interros + Devoir 1 + Devoir 2) / 3
function calcMoyMatiere(bloc?: Partial<Record<TypeEpreuve, string>>): number | null {
  const mi = calcMoyInterros(bloc)
  const d1 = parseNote(bloc?.['Devoir 1'] ?? '')
  const d2 = parseNote(bloc?.['Devoir 2'] ?? '')

  if (mi === null && d1 === null && d2 === null) return null

  const somme = (mi ?? 0) + (d1 ?? 0) + (d2 ?? 0)
  return somme / 3
}

interface InputNoteProps {
  value: string
  onChange: (val: string) => void
  eleveNom: string
}

const InputNote: React.FC<InputNoteProps> = React.memo(({ value, onChange, eleveNom }) => {
  const note = parseNote(value)
  const isValid = value === '' || note !== null

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const n = parseNote(e.target.value)
    if (n !== null) {
      onChange(String(Number(n.toFixed(2))))
    }
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={handleBlur}
      placeholder="—"
      aria-label={`Note de ${eleveNom}`}
      style={{
        width: '100%',
        height: 42,
        borderRadius: 9,
        textAlign: 'center',
        fontSize: 16,
        fontWeight: 700,
        border: `1.5px solid ${
          value === '' ? PALETTE.border : isValid ? getNoteColor(note!) : PALETTE.red
        }`,
        background: value === '' ? '#F8F9FA' : isValid ? getNoteBg(note!) : '#FCEBEB',
        color: isValid && note !== null ? getNoteColor(note) : PALETTE.textMuted,
        outline: 'none',
        transition: 'all 0.12s ease-in-out',
      }}
    />
  )
})

InputNote.displayName = 'InputNote'

interface SaisieNotesProps {
  onBack: () => void
}

export default function SaisieNotes({ onBack }: SaisieNotesProps) {
  const aujourdhui = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState<string>(aujourdhui)
  const [trimestre, setTrimestre] = useState<Trimestre>('Trimestre 1')

  const [profId, setProfId] = useState<string | null>(null)
  const [classes, setClasses] = useState<Classe[]>([])
  const [selectedClasseId, setSelectedClasseId] = useState<string>('')
  const [matieres, setMatieres] = useState<Matiere[]>([])
  const [selectedMatiereId, setSelectedMatiereId] = useState<string>('')
  const [eleves, setEleves] = useState<Eleve[]>([])

  const [epreuve, setEpreuve] = useState<TypeEpreuve>('Devoir 1')
  const [onglet, setOnglet] = useState<Onglet>('saisie')
  const [store, setStore] = useState<NotesLocalStore>({})

  const [loading, setLoading] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)
  const [flash, setFlash] = useState<boolean>(false)

  // 1. Authentification Enseignant
  useEffect(() => {
    async function getAuthUser() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error) throw error
        if (user) {
          console.log('🔍 [DEBUG] Enseignant connecté ID:', user.id)
          setProfId(user.id)
        } else {
          console.warn('⚠️ [DEBUG] Aucun utilisateur connecté trouvé dans Supabase Auth.')
        }
      } catch (err) {
        console.error('❌ [DEBUG] Erreur authentification:', err)
      }
    }
    getAuthUser()
  }, [])

  // 2. Chargement des Classes
  useEffect(() => {
    if (!profId) return

    async function fetchClasses() {
      setLoading(true)
      try {
        console.log('🔍 [DEBUG] Recherche des classes pour prof_id:', profId)
        const { data, error } = await supabase
          .from('affectations_cours')
          .select('classe_id, classes:classe_id (id, nom)')
          .eq('prof_id', profId)

        if (error) throw error
        console.log('🔍 [DEBUG] Données brutes des classes reçues:', data)

        const formattedClasses: Classe[] = []
        if (data && Array.isArray(data)) {
          data.forEach((item: any) => {
            const c = Array.isArray(item.classes) ? item.classes[0] : item.classes
            if (c && c.id && !formattedClasses.some((existing) => existing.id === String(c.id))) {
              formattedClasses.push({ id: String(c.id), nom: c.nom })
            }
          })
        }

        console.log('🔍 [DEBUG] Classes formatées final:', formattedClasses)
        setClasses(formattedClasses)
        if (formattedClasses.length > 0) {
          setSelectedClasseId(formattedClasses[0].id)
        } else {
          setSelectedClasseId('')
        }
      } catch (err) {
        console.error('❌ [DEBUG] Erreur chargement classes:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchClasses()
  }, [profId])

  // 3. Chargement Élèves & Matières de la Classe
  useEffect(() => {
    if (!selectedClasseId || !profId) {
      console.warn('⚠️ [DEBUG] selectedClasseId ou profId manquant pour le chargement des matières/élèves.', { selectedClasseId, profId })
      setEleves([])
      setMatieres([])
      setSelectedMatiereId('')
      return
    }

    async function fetchClasseData() {
      setLoading(true)
      try {
        console.log(`🔍 [DEBUG] --- DÉBUT CHARGEMENT POUR CLASSE ${selectedClasseId} & PROF ${profId} ---`)

        // --- A. ÉLÈVES ---
        const { data: studentsData, error: errStudents } = await supabase
          .from('students')
          .select('id, prenom, nom')
          .eq('class_id', selectedClasseId)
          .order('nom', { ascending: true })

        if (errStudents) {
          console.error('❌ [DEBUG] Erreur récupération élèves:', errStudents)
        } else {
          console.log('🔍 [DEBUG] Élèves trouvés:', studentsData)
          setEleves((studentsData || []).map(s => ({ ...s, id: String(s.id) })))
        }

        // --- B. MATIÈRES ASSIGNÉES ---
        console.log('🔍 [DEBUG] Requête affectations_cours avec prof_id =', profId, 'et classe_id =', selectedClasseId)
        const { data: affectations, error: errAffect } = await supabase
          .from('affectations_cours')
          .select('matiere_id')
          .eq('prof_id', profId)
          .eq('classe_id', selectedClasseId)

        if (errAffect) {
          console.error('❌ [DEBUG] Erreur affectations_cours:', errAffect)
          throw errAffect
        }

        console.log('🔍 [DEBUG] Affectations trouvées:', affectations)

        const matiereIds = Array.from(
          new Set((affectations || []).map((a: any) => String(a.matiere_id)).filter(Boolean))
        )
        console.log('🔍 [DEBUG] IDs des matières isolés:', matiereIds)

        if (matiereIds.length > 0) {
          console.log('🔍 [DEBUG] Requête table matieres avec IDs:', matiereIds)
          const { data: matieresData, error: errMat } = await supabase
            .from('matieres')
            .select('id, nom, coefficient')
            .in('id', matiereIds)

          if (errMat) {
            console.error('❌ [DEBUG] Erreur table matieres:', errMat)
            throw errMat
          }

          console.log('🔍 [DEBUG] Données reçues de la table matieres:', matieresData)

          const formattedMatieres: Matiere[] = (matieresData || []).map((m: any) => ({
            id: String(m.id),
            nom: m.nom,
            coefficient: m.coefficient ?? 1,
          }))

          setMatieres(formattedMatieres)
          if (formattedMatieres.length > 0) {
            setSelectedMatiereId(formattedMatieres[0].id)
          } else {
            setSelectedMatiereId('')
          }
        } else {
          console.warn('⚠️ [DEBUG] Aucun matiere_id trouvé dans affectations_cours pour ce prof et cette classe !')
          setMatieres([])
          setSelectedMatiereId('')
        }
      } catch (err) {
        console.error('❌ [DEBUG] Erreur lors du fetchClasseData:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchClasseData()
  }, [selectedClasseId, profId])

  // 4. Chargement des Notes
  useEffect(() => {
    if (!selectedClasseId || !selectedMatiereId) {
      setStore({})
      return
    }

    async function fetchNotes() {
      try {
        console.log(`🔍 [DEBUG] Chargement des notes (Classe: ${selectedClasseId}, Matière: ${selectedMatiereId}, Trimestre: ${trimestre})`)
        const { data: notesData, error } = await supabase
          .from('notes')
          .select('eleve_id, epreuve, valeur')
          .eq('classe_id', selectedClasseId)
          .eq('matiere_id', selectedMatiereId)
          .eq('trimestre', trimestre)

        if (error) throw error

        console.log('🔍 [DEBUG] Notes existantes chargées:', notesData)

        const newStore: NotesLocalStore = {}
        if (notesData) {
          notesData.forEach((n) => {
            const eId = String(n.eleve_id)
            if (!newStore[eId]) {
              newStore[eId] = {}
            }
            newStore[eId][n.epreuve as TypeEpreuve] = String(n.valeur)
          })
        }
        setStore(newStore)
      } catch (err) {
        console.error('❌ [DEBUG] Erreur chargement des notes:', err)
      }
    }

    fetchNotes()
  }, [selectedClasseId, selectedMatiereId, trimestre])

  const handleValChange = useCallback((eleveId: string, val: string) => {
    if (val !== '' && !/^[0-9.,]*$/.test(val)) return

    setStore((prev) => ({
      ...prev,
      [eleveId]: {
        ...prev[eleveId],
        [epreuve]: val,
      },
    }))
  }, [epreuve])

  const matiereActuelle = useMemo(
    () => matieres.find((m) => m.id === selectedMatiereId) ?? matieres[0],
    [matieres, selectedMatiereId]
  )

  const notesValides = useMemo(() => {
    return eleves
      .map((e) => ({ eleve: e, note: parseNote(store[e.id]?.[epreuve] ?? '') }))
      .filter((x): x is { eleve: Eleve; note: number } => x.note !== null)
  }, [eleves, store, epreuve])

  const moyClasse = useMemo(() => {
    if (notesValides.length === 0) return null
    return notesValides.reduce((s, x) => s + x.note, 0) / notesValides.length
  }, [notesValides])

  const rangSaisie = useMemo(() => {
    const sorted = [...notesValides].sort((a, b) => b.note - a.note)
    const rangs: Record<string, number> = {}
    sorted.forEach((x, i) => {
      rangs[x.eleve.id] = i + 1
    })
    return rangs
  }, [notesValides])

  const eleveStats = useMemo(() => {
    return eleves.map((eleve) => {
      const bloc = store[eleve.id]
      const moy = calcMoyMatiere(bloc)
      return { eleve, moy }
    })
  }, [eleves, store])

  const sauvegarder = async () => {
    if (!selectedClasseId || !selectedMatiereId) return
    setSaving(true)

    try {
      const recordsToUpsert: NoteRecord[] = []

      eleves.forEach((e) => {
        const valStr = store[e.id]?.[epreuve]
        const val = parseNote(valStr ?? '')
        if (val !== null) {
          recordsToUpsert.push({
            eleve_id: e.id,
            classe_id: selectedClasseId,
            matiere_id: selectedMatiereId,
            epreuve,
            trimestre,
            date,
            valeur: val,
          })
        }
      })

      console.log('💾 [DEBUG] Données à enregistrer dans notes:', recordsToUpsert)

      if (recordsToUpsert.length > 0) {
        const { error } = await supabase
          .from('notes')
          .upsert(recordsToUpsert, { onConflict: 'eleve_id,classe_id,matiere_id,epreuve,trimestre' })

        if (error) throw error
      }

      setFlash(true)
      setTimeout(() => setFlash(false), 3000)
    } catch (err) {
      console.error('❌ [DEBUG] Erreur lors de la sauvegarde:', err)
      alert("Erreur lors de l'enregistrement dans la base de données.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        background: PALETTE.bg,
        minHeight: '100vh',
        maxWidth: 480,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* HEADER */}
      <header
        style={{
          background: PALETTE.primary,
          padding: '12px 16px 14px',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <button
            onClick={onBack}
            aria-label="Retour"
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: 8,
              width: 34,
              height: 34,
              cursor: 'pointer',
              color: '#fff',
              fontSize: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            ←
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: PALETTE.accent,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 15,
              }}
            >
              🎓
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>AIDEDUC</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)' }}>
                Saisie des notes
              </div>
            </div>
          </div>
        </div>

        {/* Sélecteurs Classe et Date */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 8, marginBottom: 8 }}>
          <select
            value={selectedClasseId}
            onChange={(e) => setSelectedClasseId(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 8,
              border: `1.5px solid ${PALETTE.accent}`,
              background: 'rgba(255,255,255,0.12)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              outline: 'none',
            }}
          >
            {classes.length === 0 ? (
              <option value="" style={{ background: PALETTE.primary }}>Aucune classe</option>
            ) : (
              classes.map((c) => (
                <option key={c.id} value={c.id} style={{ background: PALETTE.primary }}>
                  {c.nom}
                </option>
              ))
            )}
          </select>

          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.12)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 500,
              outline: 'none',
            }}
          />
        </div>

        {/* Sélecteur Trimestre */}
        <div style={{ marginBottom: 10 }}>
          <select
            value={trimestre}
            onChange={(e) => setTrimestre(e.target.value as Trimestre)}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.12)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              outline: 'none',
            }}
          >
            <option value="Trimestre 1" style={{ background: PALETTE.primary }}>Trimestre 1</option>
            <option value="Trimestre 2" style={{ background: PALETTE.primary }}>Trimestre 2</option>
            <option value="Trimestre 3" style={{ background: PALETTE.primary }}>Trimestre 3</option>
          </select>
        </div>

        {/* Type Épreuve */}
        {onglet === 'saisie' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
            {EPREUVES.map((ep) => (
              <button
                key={ep}
                onClick={() => setEpreuve(ep)}
                style={{
                  padding: '7px 4px',
                  borderRadius: 8,
                  border: 'none',
                  background: epreuve === ep ? PALETTE.accent : 'rgba(255,255,255,0.1)',
                  color: epreuve === ep ? PALETTE.primary : 'rgba(255,255,255,0.85)',
                  fontWeight: epreuve === ep ? 700 : 500,
                  fontSize: 10,
                  cursor: 'pointer',
                }}
              >
                {ep}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* NAV ONGLETS */}
      <nav
        style={{
          display: 'flex',
          background: PALETTE.surface,
          borderBottom: `1px solid ${PALETTE.border}`,
          position: 'sticky',
          top: 178,
          zIndex: 40,
        }}
      >
        {(
          [
            { id: 'saisie', icon: '📝', label: 'Saisie' },
            { id: 'moyennes', icon: '📊', label: 'Moyennes' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setOnglet(tab.id)}
            style={{
              flex: 1,
              padding: '10px 0',
              border: 'none',
              background: 'none',
              borderBottom: `3px solid ${
                onglet === tab.id ? PALETTE.accent : 'transparent'
              }`,
              color: onglet === tab.id ? PALETTE.primary : PALETTE.textMuted,
              fontWeight: onglet === tab.id ? 700 : 500,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 15 }}>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* CONTENU PRINCIPAL */}
      <main style={{ flex: 1, padding: '14px 16px 28px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: PALETTE.textMuted }}>
            Chargement des données...
          </div>
        ) : onglet === 'saisie' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {flash && (
              <div
                style={{
                  background: '#EAF3DE',
                  border: '1px solid #97C459',
                  borderRadius: 10,
                  padding: '11px 14px',
                  fontSize: 13,
                  color: '#27500A',
                  fontWeight: 600,
                }}
              >
                ✅ Sync Supabase réussie — {matiereActuelle?.nom} · {epreuve}
              </div>
            )}

            {/* Sélecteur Matière */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 10,
                  fontWeight: 700,
                  color: PALETTE.textMuted,
                  textTransform: 'uppercase',
                  marginBottom: 6,
                }}
              >
                Matière
              </label>
              <select
                value={selectedMatiereId}
                onChange={(e) => setSelectedMatiereId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: `1.5px solid ${PALETTE.primary}`,
                  background: PALETTE.surface,
                  color: PALETTE.textMain,
                  fontSize: 13,
                  fontWeight: 600,
                  outline: 'none',
                }}
              >
                {matieres.length === 0 ? (
                  <option value="">Aucune matière attribuée</option>
                ) : (
                  matieres.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nom} {m.coefficient > 1 ? `(coef. ${m.coefficient})` : ''}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* KPIs */}
            <div
              style={{
                background: PALETTE.surface,
                borderRadius: 12,
                padding: '12px 14px',
                border: `1px solid ${PALETTE.border}`,
                display: 'flex',
              }}
            >
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: PALETTE.primary }}>
                  {notesValides.length}/{eleves.length}
                </div>
                <div style={{ fontSize: 10, color: PALETTE.textMuted }}>Saisies</div>
              </div>
              <div
                style={{
                  flex: 1,
                  textAlign: 'center',
                  borderLeft: `1px solid ${PALETTE.border}`,
                  borderRight: `1px solid ${PALETTE.border}`,
                }}
              >
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: moyClasse !== null ? getNoteColor(moyClasse) : PALETTE.textMuted,
                  }}
                >
                  {moyClasse !== null ? `${formatMoyenne(moyClasse)}/20` : '—'}
                </div>
                <div style={{ fontSize: 10, color: PALETTE.textMuted }}>Moy. classe</div>
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: PALETTE.purple }}>
                  {matiereActuelle?.coefficient ?? 1}
                </div>
                <div style={{ fontSize: 10, color: PALETTE.textMuted }}>Coef.</div>
              </div>
            </div>

            {/* Liste Élèves */}
            <div
              style={{
                background: PALETTE.surface,
                border: `1px solid ${PALETTE.border}`,
                borderRadius: 14,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 80px 56px',
                  padding: '8px 14px',
                  background: '#F8FAFC',
                  borderBottom: `1px solid ${PALETTE.border}`,
                  gap: 8,
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 700, color: PALETTE.textMuted }}>ÉLÈVE</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: PALETTE.textMuted, textAlign: 'center' }}>
                  NOTE /20
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: PALETTE.textMuted, textAlign: 'center' }}>
                  RANG
                </div>
              </div>

              {eleves.map((eleve, idx) => {
                const av = AVATARS[idx % AVATARS.length]
                const rawVal = store[eleve.id]?.[epreuve] ?? ''
                const noteVal = parseNote(rawVal)
                const rang = noteVal !== null ? rangSaisie[eleve.id] : null

                return (
                  <div
                    key={eleve.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 80px 56px',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 14px',
                      borderBottom:
                        idx < eleves.length - 1 ? `1px solid ${PALETTE.border}` : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: av.bg,
                          color: av.fg,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {getInitiales(eleve)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: PALETTE.textMain,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {eleve.prenom} {eleve.nom}
                        </div>
                        {noteVal !== null && (
                          <div style={{ fontSize: 10, color: getNoteColor(noteVal) }}>
                            {getAppreciation(noteVal)}
                          </div>
                        )}
                      </div>
                    </div>

                    <InputNote
                      value={rawVal}
                      onChange={(v) => handleValChange(eleve.id, v)}
                      eleveNom={`${eleve.prenom} ${eleve.nom}`}
                    />

                    <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 12 }}>
                      {rang !== null ? (rang === 1 ? '🥇' : `${rang}e`) : '—'}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Bouton Enregistrer */}
            <button
              onClick={sauvegarder}
              disabled={saving}
              style={{
                width: '100%',
                padding: '14px 0',
                borderRadius: 12,
                border: 'none',
                background: PALETTE.primary,
                color: '#fff',
                fontSize: 15,
                fontWeight: 700,
                cursor: saving ? 'wait' : 'pointer',
              }}
            >
              {saving ? '⏳ Synchronisation...' : `💾 Enregistrer (${trimestre})`}
            </button>
          </div>
        ) : (
          /* VUE MOYENNES */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div
              style={{
                background: PALETTE.surface,
                border: `1px solid ${PALETTE.border}`,
                borderRadius: 14,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 80px',
                  padding: '8px 14px',
                  background: '#F8FAFC',
                  borderBottom: `1px solid ${PALETTE.border}`,
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 700, color: PALETTE.textMuted }}>ÉLÈVE</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: PALETTE.textMuted, textAlign: 'center' }}>
                  MOYENNE
                </div>
              </div>

              {eleveStats.map(({ eleve, moy }, idx) => (
                <div
                  key={eleve.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 80px',
                    alignItems: 'center',
                    padding: '10px 14px',
                    borderBottom:
                      idx < eleveStats.length - 1 ? `1px solid ${PALETTE.border}` : 'none',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: PALETTE.textMain }}>
                    {eleve.prenom} {eleve.nom}
                  </div>
                  <div
                    style={{
                      textAlign: 'center',
                      fontSize: 15,
                      fontWeight: 700,
                      color: moy !== null ? getNoteColor(moy) : PALETTE.textMuted,
                    }}
                  >
                    {moy !== null ? `${formatMoyenne(moy)}/20` : '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}