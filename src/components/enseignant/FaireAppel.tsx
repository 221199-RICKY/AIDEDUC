// ─────────────────────────────────────────────
// AIDEDUC — FaireAppel.tsx
// src/components/enseignant/FaireAppel.tsx
// Interface mobile : sélection classe + appel
// ─────────────────────────────────────────────

import { useState, useMemo } from 'react'

// ── Palette AIDEDUC ───────────────────────────
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

// ── Types ─────────────────────────────────────
type Statut = 'present' | 'absent' | null

interface Eleve {
  id: string
  prenom: string
  nom: string
  numero: string
  redoublant?: boolean
}

interface Classe {
  id: string
  nom: string
  matiere: string
  salle: string
  eleves: Eleve[]
}

// ── Données de démo ───────────────────────────
const CLASSES: Classe[] = [
  {
    id: 'cl-1',
    nom: 'Terminale C',
    matiere: 'Mathématiques',
    salle: 'Salle B12',
    eleves: [
      { id: 'e1', prenom: 'Amina',   nom: 'Konaté',    numero: 'TCL-001' },
      { id: 'e2', prenom: 'Basile',  nom: 'Mensah',    numero: 'TCL-002' },
      { id: 'e3', prenom: 'Chloé',   nom: 'Adjovi',    numero: 'TCL-003' },
      { id: 'e4', prenom: 'David',   nom: 'Sow',       numero: 'TCL-004', redoublant: true },
      { id: 'e5', prenom: 'Estelle', nom: 'Diallo',    numero: 'TCL-005' },
      { id: 'e6', prenom: 'Franck',  nom: 'Togbé',     numero: 'TCL-006' },
      { id: 'e7', prenom: 'Grace',   nom: 'Aholou',    numero: 'TCL-007' },
      { id: 'e8', prenom: 'Hugo',    nom: 'Bello',     numero: 'TCL-008' },
    ],
  },
  {
    id: 'cl-2',
    nom: 'Première D',
    matiere: 'Physique-Chimie',
    salle: 'Labo Sciences',
    eleves: [
      { id: 'e9',  prenom: 'Isabelle', nom: 'Zannou',    numero: 'PD-001' },
      { id: 'e10', prenom: 'Jules',    nom: 'Coulibaly', numero: 'PD-002' },
      { id: 'e11', prenom: 'Karine',   nom: 'Dossou',    numero: 'PD-003' },
      { id: 'e12', prenom: 'Lionel',   nom: 'Akplogan',  numero: 'PD-004', redoublant: true },
      { id: 'e13', prenom: 'Mariama',  nom: 'Sénou',     numero: 'PD-005' },
    ],
  },
  {
    id: 'cl-3',
    nom: '2nde B',
    matiere: 'Mathématiques',
    salle: 'Salle A04',
    eleves: [
      { id: 'e14', prenom: 'Nathan',   nom: 'Toviho',    numero: '2B-001' },
      { id: 'e15', prenom: 'Olivia',   nom: 'Fandohan',  numero: '2B-002' },
      { id: 'e16', prenom: 'Pascal',   nom: 'Goudou',    numero: '2B-003' },
      { id: 'e17', prenom: 'Quintina', nom: 'Houinsou',  numero: '2B-004' },
    ],
  },
]

// ── Couleurs avatar par index ──────────────────
const AVATARS = [
  { bg: '#E6F1FB', fg: '#0C447C' },
  { bg: '#EAF3DE', fg: '#27500A' },
  { bg: '#FAEEDA', fg: '#633806' },
  { bg: '#EEEDFE', fg: '#3C3489' },
  { bg: '#FAECE7', fg: '#712B13' },
  { bg: '#E1F5EE', fg: '#085041' },
]

function initiales(e: Eleve) {
  return `${e.prenom[0]}${e.nom[0]}`.toUpperCase()
}

// ── COMPOSANT ─────────────────────────────────
interface FaireAppelProps {
  onBack: () => void
}

export default function FaireAppel({ onBack }: FaireAppelProps) {
  const [classeId,  setClasseId]  = useState<string>(CLASSES[0].id)
  const [pointages, setPointages] = useState<Record<string, Statut>>({})
  const [valide,    setValide]    = useState(false)
  const [enCours,   setEnCours]   = useState(false)

  const classe = useMemo(
    () => CLASSES.find(c => c.id === classeId)!,
    [classeId]
  )

  // Changer de classe remet le pointage à zéro
  function handleClasseChange(id: string) {
    setClasseId(id)
    setPointages({})
    setValide(false)
  }

  // Basculer présent / absent (ou effacer si on reclique)
  function toggleStatut(eleveId: string, statut: 'present' | 'absent') {
    setPointages(prev => ({
      ...prev,
      [eleveId]: prev[eleveId] === statut ? null : statut,
    }))
  }

  // Tout marquer présent en un clic
  function tousPresents() {
    const tous: Record<string, Statut> = {}
    classe.eleves.forEach(e => { tous[e.id] = 'present' })
    setPointages(tous)
  }

  // Valider l'appel (simulé — branchable sur API)
  async function valider() {
    // Les non-pointés sont automatiquement marqués présents
    const final: Record<string, Statut> = { ...pointages }
    classe.eleves.forEach(e => {
      if (!final[e.id]) final[e.id] = 'present'
    })
    setPointages(final)
    setEnCours(true)
    await new Promise(r => setTimeout(r, 1000))
    setEnCours(false)
    setValide(true)
  }

  // Stats en temps réel
  const nbPresents  = classe.eleves.filter(e => pointages[e.id] === 'present').length
  const nbAbsents   = classe.eleves.filter(e => pointages[e.id] === 'absent').length
  const nbRestants  = classe.eleves.filter(e => !pointages[e.id]).length
  const pctComplet  = Math.round(
    (classe.eleves.filter(e => pointages[e.id] != null).length / classe.eleves.length) * 100
  )

  // ── Écran de confirmation ──────────────────
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
            Appel validé !
          </div>
          <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 20 }}>
            {classe.nom} · {classe.matiere}
          </div>

          {/* Résumé */}
          <div style={{
            display: 'flex', justifyContent: 'center', gap: 28, marginBottom: 20,
          }}>
            <div>
              <div style={{ fontSize: 32, fontWeight: 700, color: C.green }}>{nbPresents}</div>
              <div style={{ fontSize: 12, color: C.textMuted }}>Présents</div>
            </div>
            <div>
              <div style={{ fontSize: 32, fontWeight: 700, color: C.red }}>{nbAbsents}</div>
              <div style={{ fontSize: 12, color: C.textMuted }}>Absents</div>
            </div>
          </div>

          {/* SMS parents */}
          {nbAbsents > 0 && (
            <div style={{
              background: '#EAF3DE', borderRadius: 10,
              padding: '10px 14px', marginBottom: 20,
              fontSize: 13, color: '#27500A', fontWeight: 500,
            }}>
              📱 {nbAbsents} parent{nbAbsents > 1 ? 's' : ''} notifié{nbAbsents > 1 ? 's' : ''} par SMS
            </div>
          )}

          {/* Bouton nouvel appel */}
          <button
            onClick={() => { setValide(false); setPointages({}) }}
            style={{
              width: '100%', padding: '13px 0', borderRadius: 12,
              background: C.primary, color: '#fff', border: 'none',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Faire un nouvel appel
          </button>
        </div>
      </div>
    )
  }

  // ── Écran principal ────────────────────────
  return (
    <div style={{
      fontFamily: "'Inter', system-ui, sans-serif",
      background: C.bg, minHeight: '100vh',
      maxWidth: 480, margin: '0 auto',
      display: 'flex', flexDirection: 'column',
    }}>

      {/* ── HEADER ── */}
      <header style={{
        background: C.primary, padding: '12px 16px 14px',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        {/* Ligne marque + retour */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <button
            onClick={onBack}
            aria-label="Retour"
            style={{
              background: 'rgba(255,255,255,0.15)', border: 'none',
              borderRadius: 8, width: 34, height: 34, cursor: 'pointer',
              color: '#fff', fontSize: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >←</button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: C.accent, display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: 15,
            }}>🎓</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>AIDEDUC</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>Faire l'appel</div>
            </div>
          </div>

          <div style={{ fontSize: 13, fontWeight: 600, color: C.accent }}>
            {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        {/* Sélecteur de classe */}
        <label htmlFor="select-classe" style={{
          display: 'block', fontSize: 10, color: 'rgba(255,255,255,0.5)',
          fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase',
          marginBottom: 5,
        }}>
          Classe
        </label>
        <div style={{ position: 'relative' }}>
          <select
            id="select-classe"
            value={classeId}
            onChange={e => handleClasseChange(e.target.value)}
            style={{
              width: '100%', padding: '10px 36px 10px 14px',
              borderRadius: 10, border: `1.5px solid ${C.accent}`,
              background: 'rgba(255,255,255,0.1)', color: '#fff',
              fontSize: 14, fontWeight: 600,
              appearance: 'none', cursor: 'pointer', outline: 'none',
            }}
          >
            {CLASSES.map(c => (
              <option key={c.id} value={c.id} style={{ background: '#1B3A5C' }}>
                {c.nom} — {c.matiere}
              </option>
            ))}
          </select>
          <span style={{
            position: 'absolute', right: 12, top: '50%',
            transform: 'translateY(-50%)',
            color: C.accent, pointerEvents: 'none', fontSize: 12,
          }}>▾</span>
        </div>

        {/* Infos salle */}
        <div style={{
          marginTop: 7, fontSize: 11,
          color: 'rgba(255,255,255,0.45)',
          display: 'flex', gap: 10,
        }}>
          <span>📍 {classe.salle}</span>
          <span>·</span>
          <span>{classe.eleves.length} élèves inscrits</span>
        </div>
      </header>

      {/* ── CORPS ── */}
      <main style={{ flex: 1, padding: '14px 0' }}>

        {/* Compteurs + barre + bouton rapide */}
        <section
          aria-label="Progression de l'appel"
          style={{
            margin: '0 16px 14px',
            background: C.surface, borderRadius: 14,
            padding: '14px', border: `1px solid ${C.border}`,
          }}
        >
          {/* Chiffres */}
          <div style={{ display: 'flex', marginBottom: 12 }}>
            {[
              { label: 'Présents',  value: nbPresents, color: C.green   },
              { label: 'Absents',   value: nbAbsents,  color: C.red     },
              { label: 'Non pointés',value: nbRestants, color: C.textMuted},
            ].map((s, i) => (
              <div key={i} style={{
                flex: 1, textAlign: 'center',
                borderRight: i < 2 ? `1px solid ${C.border}` : 'none',
                padding: '0 6px',
              }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: s.color, lineHeight: 1 }}>
                  {s.value}
                </div>
                <div style={{ fontSize: 10, color: C.textMuted, marginTop: 3 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Barre de progression */}
          <div style={{
            height: 6, background: '#F0F0F0',
            borderRadius: 3, overflow: 'hidden', marginBottom: 12,
          }}>
            <div style={{
              height: '100%',
              width: `${pctComplet}%`,
              background: pctComplet === 100 ? C.green : C.accent,
              borderRadius: 3,
              transition: 'width 0.25s ease',
            }} />
          </div>

          {/* Bouton tous présents */}
          <button
            onClick={tousPresents}
            style={{
              width: '100%', padding: '9px 0', borderRadius: 9,
              border: `1.5px solid ${C.green}`, background: '#EAF3DE',
              color: C.green, fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}
          >
            ✓ Marquer tous présents
          </button>
        </section>

        {/* Liste des élèves */}
        <section
          aria-label="Liste des élèves"
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 14, margin: '0 16px',
            overflow: 'hidden',
          }}
        >
          {/* En-tête colonne */}
          <div style={{
            display: 'flex', padding: '8px 16px',
            background: '#F8FAFC', borderBottom: `1px solid ${C.border}`,
          }}>
            <div style={{ flex: 1, fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '.5px' }}>
              Élève
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '.5px' }}>
              Présent / Absent
            </div>
          </div>

          {/* Lignes élèves */}
          {classe.eleves.map((eleve, idx) => {
            const av  = AVATARS[idx % AVATARS.length]
            const st  = pointages[eleve.id] ?? null

            return (
              <div
                key={eleve.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 16px',
                  borderBottom: idx < classe.eleves.length - 1
                    ? `1px solid ${C.border}` : 'none',
                  background: st === 'absent' ? '#FFF5F5' : C.surface,
                  transition: 'background 0.12s',
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: av.bg, color: av.fg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, flexShrink: 0,
                }}>
                  {initiales(eleve)}
                </div>

                {/* Nom */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 14, fontWeight: 600, color: C.textMain,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {eleve.prenom} {eleve.nom}
                    {eleve.redoublant && (
                      <span style={{
                        marginLeft: 6, fontSize: 9, padding: '1px 5px',
                        borderRadius: 20, background: '#EEEDFE', color: '#3C3489',
                        fontWeight: 500, verticalAlign: 'middle',
                      }}>Redoublant</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>{eleve.numero}</div>
                </div>

                {/* Boutons P / A */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {(['present', 'absent'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => toggleStatut(eleve.id, s)}
                      aria-pressed={st === s}
                      aria-label={`${s === 'present' ? 'Présent' : 'Absent'} — ${eleve.prenom} ${eleve.nom}`}
                      style={{
                        width: 44, height: 44, borderRadius: 10,
                        border: `1.5px solid ${
                          st === s
                            ? s === 'present' ? C.green : C.red
                            : C.border
                        }`,
                        background:
                          st === s
                            ? s === 'present' ? '#EAF3DE' : '#FCEBEB'
                            : '#F8F9FA',
                        color:
                          st === s
                            ? s === 'present' ? C.green : C.red
                            : C.textMuted,
                        fontWeight: 700, fontSize: 14,
                        cursor: 'pointer', transition: 'all 0.12s',
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

        {/* Bouton valider */}
        <div style={{ padding: '14px 16px 28px' }}>
          <button
            onClick={valider}
            disabled={enCours}
            style={{
              width: '100%', padding: '15px 0', borderRadius: 12,
              border: 'none',
              background: enCours ? '#85B7EB' : C.primary,
              color: '#fff', fontSize: 15, fontWeight: 700,
              cursor: enCours ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 8,
              transition: 'background 0.15s',
            }}
          >
            {enCours ? (
              '⏳ Enregistrement…'
            ) : (
              <>
                ✓ Valider l'appel
                {nbAbsents > 0 && (
                  <span style={{
                    fontSize: 12, padding: '2px 10px', borderRadius: 20,
                    background: 'rgba(255,255,255,0.2)',
                  }}>
                    {nbAbsents} SMS parent{nbAbsents > 1 ? 's' : ''}
                  </span>
                )}
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  )
}
