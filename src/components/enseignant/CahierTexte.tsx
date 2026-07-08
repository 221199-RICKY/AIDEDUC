// ─────────────────────────────────────────────
// AIDEDUC — CahierTexte.tsx
// src/components/enseignant/CahierTexte.tsx
// Saisie du résumé de cours + devoirs donnés
// ─────────────────────────────────────────────

import { useState, useMemo } from 'react'

// ── Palette AIDEDUC ───────────────────────────
const C = {
  primary:   '#1B3A5C',
  accent:    '#F5A623',
  green:     '#1D9E75',
  amber:     '#BA7517',
  bg:        '#F4F6F9',
  surface:   '#FFFFFF',
  border:    '#E2E8F0',
  textMain:  '#1A1A2E',
  textMuted: '#6C757D',
}

// ── Types ─────────────────────────────────────
interface Classe {
  id: string
  nom: string
  matiere: string
}

interface EntreeCahier {
  id: string
  classeId: string
  date: string        // ISO "2026-06-30"
  contenu: string
  devoir?: string
  auteur: string
}

// ── Données de démo ───────────────────────────
const CLASSES: Classe[] = [
  { id: 'cl-1', nom: 'Terminale C', matiere: 'Mathématiques'   },
  { id: 'cl-2', nom: 'Première D',  matiere: 'Physique-Chimie' },
  { id: 'cl-3', nom: '2nde B',      matiere: 'Mathématiques'   },
]

const INIT_ENTREES: EntreeCahier[] = [
  {
    id: 'c1', classeId: 'cl-1',
    date: '2026-06-25',
    contenu: 'Suites arithmétiques : raison, terme général et somme des n premiers termes. Démonstration de la formule Sn = n(u₁+uₙ)/2.',
    devoir: 'Exercices 12, 13 et 14 page 58 — à rendre lundi.',
    auteur: 'M. Ouédraogo',
  },
  {
    id: 'c2', classeId: 'cl-1',
    date: '2026-06-23',
    contenu: 'Introduction aux suites numériques. Définition, notation et premiers termes. Suites définies par récurrence.',
    auteur: 'M. Ouédraogo',
  },
  {
    id: 'c3', classeId: 'cl-2',
    date: '2026-06-24',
    contenu: 'Lois de Newton — révisions. Applications : plan incliné et dynamique du point matériel.',
    devoir: 'Fiche d\'exercices distribuée en classe — correction vendredi.',
    auteur: 'M. Ouédraogo',
  },
]

// ── Helpers ───────────────────────────────────
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

// ── COMPOSANT ─────────────────────────────────
interface CahierTexteProps {
  onBack: () => void
}

export default function CahierTexte({ onBack }: CahierTexteProps) {
  const [classeId, setClasseId]   = useState(CLASSES[0].id)
  const [entrees,  setEntrees]    = useState<EntreeCahier[]>(INIT_ENTREES)
  const [showForm, setShowForm]   = useState(false)

  // Champs du formulaire
  const [contenu,  setContenu]    = useState('')
  const [devoir,   setDevoir]     = useState('')
  const [saving,   setSaving]     = useState(false)
  const [flash,    setFlash]      = useState(false)

  const classe = useMemo(
    () => CLASSES.find(c => c.id === classeId)!,
    [classeId]
  )

  // Entrées filtrées par classe, ordre anti-chronologique
  const mesEntrees = useMemo(
    () => entrees
      .filter(e => e.classeId === classeId)
      .sort((a, b) => b.date.localeCompare(a.date)),
    [entrees, classeId]
  )

  // Réinitialiser le formulaire
  function resetForm() {
    setContenu('')
    setDevoir('')
    setShowForm(false)
  }

  // Enregistrer une nouvelle entrée
  async function enregistrer() {
    if (!contenu.trim()) return
    setSaving(true)
    await new Promise(r => setTimeout(r, 800))

    const nouvelle: EntreeCahier = {
      id:       `c${Date.now()}`,
      classeId,
      date:     todayISO(),
      contenu:  contenu.trim(),
      devoir:   devoir.trim() || undefined,
      auteur:   'M. Ouédraogo',
    }

    setEntrees(prev => [nouvelle, ...prev])
    setSaving(false)
    setFlash(true)
    resetForm()
    setTimeout(() => setFlash(false), 3000)
  }

  // Supprimer une entrée
  function supprimer(id: string) {
    if (window.confirm('Supprimer cette entrée ?')) {
      setEntrees(prev => prev.filter(e => e.id !== id))
    }
  }

  const formValid = contenu.trim().length > 0

  // ── RENDU ─────────────────────────────────
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
        {/* Marque + retour */}
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
              width: 30, height: 30, borderRadius: 8, background: C.accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15,
            }}>🎓</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>AIDEDUC</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>Cahier de texte</div>
            </div>
          </div>

          {/* Compteur entrées */}
          <div style={{
            fontSize: 11, padding: '3px 10px', borderRadius: 20,
            background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)',
          }}>
            {mesEntrees.length} entrée{mesEntrees.length > 1 ? 's' : ''}
          </div>
        </div>

        {/* Sélecteur de classe */}
        <label htmlFor="sel-classe-cahier" style={{
          display: 'block', fontSize: 10, color: 'rgba(255,255,255,0.5)',
          fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 5,
        }}>
          Classe
        </label>
        <div style={{ position: 'relative' }}>
          <select
            id="sel-classe-cahier"
            value={classeId}
            onChange={e => { setClasseId(e.target.value); resetForm() }}
            style={{
              width: '100%', padding: '10px 36px 10px 14px', borderRadius: 10,
              border: `1.5px solid ${C.accent}`, background: 'rgba(255,255,255,0.1)',
              color: '#fff', fontSize: 14, fontWeight: 600,
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
            transform: 'translateY(-50%)', color: C.accent,
            pointerEvents: 'none', fontSize: 12,
          }}>▾</span>
        </div>
      </header>

      {/* ── CORPS ── */}
      <main style={{ flex: 1, padding: '14px 16px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Flash succès */}
        {flash && (
          <div style={{
            background: '#EAF3DE', border: '1px solid #97C459',
            borderRadius: 10, padding: '11px 14px',
            fontSize: 13, color: '#27500A', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            ✅ Entrée ajoutée au cahier
          </div>
        )}

        {/* Bouton ouvrir formulaire */}
        <button
          onClick={() => setShowForm(s => !s)}
          style={{
            width: '100%', padding: '13px 0', borderRadius: 12,
            border: `1.5px dashed ${showForm ? 'transparent' : C.primary}`,
            background: showForm ? C.primary : 'rgba(27,58,92,0.06)',
            color: showForm ? '#fff' : C.primary,
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          {showForm ? '✕ Annuler la saisie' : '+ Saisir le cours d\'aujourd\'hui'}
        </button>

        {/* ── FORMULAIRE ── */}
        {showForm && (
          <div style={{
            background: C.surface, borderRadius: 14,
            padding: 16, border: `1px solid ${C.border}`,
          }}>
            {/* Date auto */}
            <div style={{
              fontSize: 12, fontWeight: 700, color: C.primary,
              marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6,
            }}>
              📅 {formatDate(todayISO())}
            </div>

            {/* Contenu du cours */}
            <label htmlFor="contenu-cours" style={{
              display: 'block', fontSize: 11, fontWeight: 700,
              color: C.textMuted, textTransform: 'uppercase',
              letterSpacing: '.4px', marginBottom: 6,
            }}>
              Résumé du cours *
            </label>
            <textarea
              id="contenu-cours"
              value={contenu}
              onChange={e => setContenu(e.target.value)}
              placeholder={`Notions abordées en ${classe.matiere}, exercices traités en classe, points importants…`}
              rows={5}
              style={{
                width: '100%', padding: '10px 12px',
                borderRadius: 9, fontSize: 13, lineHeight: 1.6,
                border: `1.5px solid ${contenu ? C.primary : C.border}`,
                outline: 'none', resize: 'vertical',
                fontFamily: 'inherit', color: C.textMain,
                transition: 'border-color 0.15s',
                marginBottom: 12,
              }}
            />

            {/* Compteur caractères */}
            <div style={{
              fontSize: 10, color: C.textMuted,
              textAlign: 'right', marginTop: -10, marginBottom: 12,
            }}>
              {contenu.length} caractère{contenu.length > 1 ? 's' : ''}
            </div>

            {/* Devoir */}
            <label htmlFor="devoir-donne" style={{
              display: 'block', fontSize: 11, fontWeight: 700,
              color: C.textMuted, textTransform: 'uppercase',
              letterSpacing: '.4px', marginBottom: 6,
            }}>
              Devoir donné <span style={{ fontWeight: 400, textTransform: 'none' }}>(optionnel)</span>
            </label>
            <input
              id="devoir-donne"
              type="text"
              value={devoir}
              onChange={e => setDevoir(e.target.value)}
              placeholder="Ex : Exercices 12–14 page 58 — à rendre lundi"
              style={{
                width: '100%', padding: '10px 12px',
                borderRadius: 9, fontSize: 13,
                border: `1.5px solid ${devoir ? C.amber : C.border}`,
                outline: 'none', fontFamily: 'inherit', color: C.textMain,
                transition: 'border-color 0.15s',
                marginBottom: 16,
              }}
            />

            {/* Bouton enregistrer */}
            <button
              onClick={enregistrer}
              disabled={!formValid || saving}
              style={{
                width: '100%', padding: '13px 0', borderRadius: 11,
                border: 'none',
                background: !formValid ? '#D0D5DD' : saving ? '#85B7EB' : C.green,
                color: '#fff', fontSize: 14, fontWeight: 700,
                cursor: !formValid ? 'not-allowed' : saving ? 'wait' : 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {saving ? '⏳ Enregistrement…' : '📓 Ajouter au cahier'}
            </button>
          </div>
        )}

        {/* ── LISTE DES ENTRÉES ── */}
        {mesEntrees.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '48px 24px',
            color: C.textMuted, fontSize: 13,
          }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>📓</div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Cahier vide pour cette classe</div>
            <div>Ajoutez votre premier cours avec le bouton ci-dessus.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {mesEntrees.map(entry => (
              <article
                key={entry.id}
                style={{
                  background: C.surface,
                  borderRadius: 14, padding: '13px 15px',
                  border: `1px solid ${C.border}`,
                  borderLeft: `4px solid ${C.primary}`,
                }}
              >
                {/* Date + bouton supprimer */}
                <div style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', marginBottom: 8,
                }}>
                  <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600 }}>
                    📅 {formatDate(entry.date)}
                  </div>
                  <button
                    onClick={() => supprimer(entry.id)}
                    aria-label="Supprimer cette entrée"
                    style={{
                      background: 'none', border: 'none',
                      color: '#CCC', fontSize: 16, cursor: 'pointer',
                      padding: '2px 4px', borderRadius: 4,
                      lineHeight: 1,
                    }}
                    title="Supprimer"
                  >
                    ✕
                  </button>
                </div>

                {/* Contenu */}
                <p style={{
                  fontSize: 13, color: C.textMain, lineHeight: 1.65,
                  margin: 0,
                  marginBottom: entry.devoir ? 10 : 0,
                }}>
                  {entry.contenu}
                </p>

                {/* Devoir */}
                {entry.devoir && (
                  <div style={{
                    background: '#FAEEDA', borderRadius: 8,
                    padding: '8px 11px', marginTop: 8,
                    display: 'flex', alignItems: 'flex-start', gap: 7,
                  }}>
                    <span style={{ flexShrink: 0, fontSize: 14 }}>📚</span>
                    <span style={{ fontSize: 12, color: '#633806', fontWeight: 500, lineHeight: 1.5 }}>
                      {entry.devoir}
                    </span>
                  </div>
                )}

                {/* Auteur */}
                <div style={{ fontSize: 10, color: '#C0C8D0', marginTop: 10 }}>
                  Saisi par {entry.auteur}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
