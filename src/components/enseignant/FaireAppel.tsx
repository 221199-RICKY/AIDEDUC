// ─────────────────────────────────────────────
// AIDEDUC — FaireAppel.tsx (Structure propre & compatible)
// ─────────────────────────────────────────────

import { useState, useEffect, useMemo } from 'react'
import { supabase } from "../../utils/supabaseClient";

const C = {
  primary:   '#1B3A5C',
  accent:    '#F5A623',
  green:     '#1D9E75',
  red:       '#E24B4A',
  bg:        '#F4F6F9',
  surface:   '#FFFFFF',
  border:    '#E2E8F0',
  textMain:  '#1A1A2E',
  textMuted: '#6C757D',
}

type Statut = 'present' | 'absent' | null

interface Eleve {
  id: string
  prenom: string
  nom: string
}

interface Classe {
  id: string
  nom: string
  matiere: string
  salle: string
  students: Eleve[] 
}

interface AffectationRaw {
  matiere: string
  classes: {
    id: string
    nom: string
    salle: string
    students: Eleve[]
  } | null
}

const AVATARS = [
  { bg: '#E6F1FB', fg: '#0C447C' },
  { bg: '#EAF3DE', fg: '#27500A' },
  { bg: '#FAEEDA', fg: '#633806' },
  { bg: '#EEEDFE', fg: '#3C3489' },
  { bg: '#FAECE7', fg: '#712B13' },
  { bg: '#E1F5EE', fg: '#085041' },
]

function initiales(e: Eleve) {
  const p = e.prenom ? e.prenom[0] : '?'
  const n = e.nom ? e.nom[0] : '?'
  return `${p}${n}`.toUpperCase()
}

/**
 * Calcule dynamiquement le créneau horaire de l'appel (Harmonisé)
 */
export function getCreneauActuel(): string {
  const heure = new Date().getHours()
  if (heure >= 7 && heure < 9) return '08:00-09:00'
  if (heure >= 9 && heure < 11) return '09:00-11:00'
  if (heure >= 11 && heure < 13) return '11:00-13:00'
  if (heure >= 13 && heure < 15) return '13:00-15:00'
  if (heure >= 15 && heure < 17) return '15:00-17:00'
  
  const hDeb = String(heure).padStart(2, '0')
  const hFin = String((heure + 1) % 24).padStart(2, '0')
  return `${hDeb}:00-${hFin}:00`
}

/**
 * Calcule automatiquement le trimestre
 */
function getTrimestreActuel(): string {
  const mois = new Date().getMonth() + 1
  if (mois >= 9 && mois <= 12) return '1er Trimestre'
  if (mois >= 1 && mois <= 3) return '2ème Trimestre'
  return '3ème Trimestre'
}

interface FaireAppelProps {
  onBack: () => void
}

export default function FaireAppel({ onBack }: FaireAppelProps) {
  const [classes, setClasses] = useState<Classe[]>([])
  const [classeId, setClasseId] = useState<string>('')
  const [pointages, setPointages] = useState<Record<string, Statut>>({})
  const [valide, setValide] = useState(false)
  const [enCours, setEnCours] = useState(false)
  const [chargement, setChargement] = useState(true)

  // Chargement des données prof -> affectations -> classes -> élèves
  useEffect(() => {
    async function chargerDonneesAppel() {
      try {
        setChargement(true)

        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          console.error("Erreur de récupération utilisateur :", userError)
          setChargement(false)
          return
        }

        const profConnecteId = user.id

        const { data, error } = await supabase
          .from('affectations_cours')
          .select(`
            matiere,
            classes (
              id,
              nom,
              salle,
              students (
                id,
                prenom,
                nom
              )
            )
          `)
          .eq('prof_id', profConnecteId)

        if (error) {
          console.error("Erreur Supabase affectations :", error.message)
          throw error
        }

        if (data && data.length > 0) {
          const rawData = data as unknown as AffectationRaw[]
          
          const listeClassesDuProf: Classe[] = rawData
            .filter(item => item.classes !== null)
            .map(item => ({
              id: String(item.classes!.id).trim(),
              nom: item.classes!.nom,
              salle: item.classes!.salle,
              matiere: item.matiere,
              students: item.classes!.students || []
            }))

          setClasses(listeClassesDuProf)
          
          if (listeClassesDuProf.length > 0) {
            setClasseId(listeClassesDuProf[0].id) 
          }
        } else {
          setClasses([])
        }
      } catch (error) {
        console.error("Erreur lors du chargement :", error)
      } finally {
        setChargement(false)
      }
    }

    chargerDonneesAppel()
  }, [])

  const classe = useMemo(
    () => classes.find(c => c.id === classeId),
    [classes, classeId]
  )

  function handleClasseChange(id: string) {
    setClasseId(id)
    setPointages({})
    setValide(false)
  }

  function toggleStatut(eleveId: string, statut: 'present' | 'absent') {
    setPointages(prev => ({
      ...prev,
      [eleveId]: prev[eleveId] === statut ? null : statut,
    }))
  }

  function tousPresents() {
    if (!classe) return
    const tous: Record<string, Statut> = {}
    classe.students?.forEach(e => { tous[e.id] = 'present' })
    setPointages(tous)
  }

  async function valider() {
    if (!classe) return
    setEnCours(true)

    const dateDuJour = new Date().toISOString().split('T')[0]
    const trimestreActuel = getTrimestreActuel()
    const creneauCourant = getCreneauActuel()

    const final: Record<string, Statut> = { ...pointages }
    classe.students?.forEach(e => {
      if (!final[e.id]) final[e.id] = 'present'
    })
    
    try {
      // Structure exacte correspondant aux colonnes PostgreSQL réelles
      const enregistrements = Object.entries(final).map(([idEleve, statutEleve]) => ({
        student_id: String(idEleve).trim(),
        class_id: String(classe.id).trim(),
        date: dateDuJour,
        time_slot: creneauCourant,
        trimestre: trimestreActuel,
        statut: statutEleve || 'present',
      }))

      // Tentative d'Upsert (ou simple Insert en fallback si contrainte non définie)
      const { error } = await supabase
        .from('absences')
        .upsert(enregistrements, { onConflict: 'student_id,date,time_slot' })

      if (error) {
        console.warn("Échec upsert, tentative d'insert simple :", error.message)
        const { error: insertError } = await supabase
          .from('absences')
          .insert(enregistrements)
        
        if (insertError) throw insertError
      }

      setPointages(final)
      setValide(true)
    } catch (error: any) {
      console.error("Erreur d'enregistrement :", error.message || error)
      alert(`Impossible d'enregistrer l'appel : ${error.message || 'Erreur réseau/base de données'}`)
    } finally {
      setEnCours(false)
    }
  }

  if (chargement) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: C.bg, color: C.textMuted }}>
        <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>Chargement de la liste...</p>
      </div>
    )
  }

  if (classes.length === 0 || !classe) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: C.bg, padding: 20, textAlign: 'center' }}>
        <p style={{ fontFamily: "'Inter', sans-serif", color: C.textMuted, fontSize: 15, marginBottom: 16 }}>
          Aucune classe assignée trouvée pour cet enseignant.
        </p>
        <button onClick={onBack} style={{ padding: '10px 20px', borderRadius: 8, background: C.primary, color: '#fff', border: 'none', cursor: 'pointer' }}>
          Retour
        </button>
      </div>
    )
  }

  const listeEleves = classe.students || []
  const nbPresents  = listeEleves.filter(e => pointages[e.id] === 'present').length
  const nbAbsents   = listeEleves.filter(e => pointages[e.id] === 'absent').length
  const nbRestants  = listeEleves.filter(e => !pointages[e.id]).length
  const pctComplet  = listeEleves.length > 0
    ? Math.round((listeEleves.filter(e => pointages[e.id] != null).length / listeEleves.length) * 100)
    : 0

  if (valide) {
    return (
      <div style={{
        fontFamily: "'Inter', system-ui, sans-serif",
        background: C.bg, minHeight: '100vh',
        maxWidth: 480, margin: '0 auto',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}>
        <div style={{
          background: C.surface, borderRadius: 20, padding: 32,
          textAlign: 'center', border: `1px solid ${C.border}`,
          width: '100%',
        }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.textMain, marginBottom: 4 }}>
            Appel enregistré avec succès !
          </div>
          <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 6 }}>
            {classe.nom} {classe.matiere ? `· ${classe.matiere}` : ''}
          </div>
          <div style={{ fontSize: 11, color: C.primary, fontWeight: 600, marginBottom: 20 }}>
            Créneau : {getCreneauActuel()}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 28, marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 32, fontWeight: 700, color: C.green }}>{nbPresents}</div>
              <div style={{ fontSize: 12, color: C.textMuted }}>Présents</div>
            </div>
            <div>
              <div style={{ fontSize: 32, fontWeight: 700, color: C.red }}>{nbAbsents}</div>
              <div style={{ fontSize: 12, color: C.textMuted }}>Absents</div>
            </div>
          </div>

          <button
            onClick={() => { setValide(false); setPointages({}) }}
            style={{ width: '100%', padding: '13px 0', borderRadius: 12, background: C.primary, color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
          >
            Faire un nouvel appel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      fontFamily: "'Inter', system-ui, sans-serif",
      background: C.bg, minHeight: '100vh',
      maxWidth: 480, margin: '0 auto',
      display: 'flex', flexDirection: 'column',
    }}>

      {/* HEADER */}
      <header style={{ background: C.primary, padding: '12px 16px 14px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <button onClick={onBack} aria-label="Retour" style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, width: 34, height: 34, cursor: 'pointer', color: '#fff', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>←</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>🎓</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>AIDEDUC</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>Faire l'appel</div>
            </div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.accent }}>
            {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        <label htmlFor="select-classe" style={{ display: 'block', fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 5 }}>
          Classe
        </label>
        <div style={{ position: 'relative' }}>
          <select
            id="select-classe"
            value={classeId}
            onChange={e => handleClasseChange(e.target.value)}
            style={{ width: '100%', padding: '10px 36px 10px 14px', borderRadius: 10, border: `1.5px solid ${C.accent}`, background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 14, fontWeight: 600, appearance: 'none', cursor: 'pointer', outline: 'none' }}
          >
            {classes.map(c => (
              <option key={c.id} value={c.id} style={{ background: '#1B3A5C' }}>
                {c.nom} {c.matiere ? `— ${c.matiere}` : ''}
              </option>
            ))}
          </select>
          <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: C.accent, pointerEvents: 'none', fontSize: 12 }}>▾</span>
        </div>

        {/* METADATA (CRÉNEAU, DATE & TRIMESTRE) */}
        <div style={{ marginTop: 8, fontSize: 11, color: 'rgba(255,255,255,0.7)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span>📅 {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          <span>·</span>
          <span>⏰ {getCreneauActuel()}</span>
          <span>·</span>
          <span>📘 {getTrimestreActuel()}</span>
        </div>
      </header>

      {/* CORPS DE PAGE */}
      <main style={{ flex: 1, padding: '14px 0' }}>
        <section aria-label="Progression de l'appel" style={{ margin: '0 16px 14px', background: C.surface, borderRadius: 14, padding: '14px', border: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', marginBottom: 12 }}>
            {[
              { label: 'Présents',   value: nbPresents, color: C.green   },
              { label: 'Absents',    value: nbAbsents,  color: C.red     },
              { label: 'Non pointés',value: nbRestants, color: C.textMuted},
            ].map((s, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center', borderRight: i < 2 ? `1px solid ${C.border}` : 'none', padding: '0 6px' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 10, color: C.textMuted, marginTop: 3 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ height: 6, background: '#F0F0F0', borderRadius: 3, overflow: 'hidden', marginBottom: 12 }}>
            <div style={{ height: '100%', width: `${pctComplet}%`, background: pctComplet === 100 ? C.green : C.accent, borderRadius: 3, transition: 'width 0.25s ease' }} />
          </div>

          <button onClick={tousPresents} style={{ width: '100%', padding: '9px 0', borderRadius: 9, border: `1.5px solid ${C.green}`, background: '#EAF3DE', color: C.green, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            ✓ Marquer tous présents
          </button>
        </section>

        <section aria-label="Liste des élèves" style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, margin: '0 16px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', padding: '8px 16px', background: '#F8FAFC', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ flex: 1, fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '.5px' }}>Élève</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '.5px' }}>Présent / Absent</div>
          </div>

          {listeEleves.map((eleve, idx) => {
            const av  = AVATARS[idx % AVATARS.length]
            const st  = pointages[eleve.id] ?? null

            return (
              <div key={eleve.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: idx < listeEleves.length - 1 ? `1px solid ${C.border}` : 'none', background: st === 'absent' ? '#FFF5F5' : C.surface, transition: 'background 0.12s' }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: av.bg, color: av.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                  {initiales(eleve)}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.textMain, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {eleve.prenom} {eleve.nom}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {(['present', 'absent'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => toggleStatut(eleve.id, s)}
                      aria-pressed={st === s}
                      aria-label={`${s === 'present' ? 'Présent' : 'Absent'} — ${eleve.prenom} ${eleve.nom}`}
                      style={{
                        width: 44, height: 44, borderRadius: 10,
                        border: `1.5px solid ${st === s ? s === 'present' ? C.green : C.red : C.border}`,
                        background: st === s ? s === 'present' ? '#EAF3DE' : '#FCEBEB' : '#F8F9FA',
                        color: st === s ? s === 'present' ? C.green : C.red : C.textMuted,
                        fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'all 0.12s',
                      }}
                    >
                      {s === 'present' ? 'P' : 'A'}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </section>

        <div style={{ padding: '14px 16px 28px' }}>
          <button
            onClick={valider}
            disabled={enCours}
            style={{ width: '100%', padding: '15px 0', borderRadius: 12, border: 'none', background: enCours ? '#85B7EB' : C.primary, color: '#fff', fontSize: 15, fontWeight: 700, cursor: enCours ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.15s' }}
          >
            {enCours ? '⏳ Enregistrement…' : '✓ Valider l\'appel'}
          </button>
        </div>
      </main>
    </div>
  )
}