// ─────────────────────────────────────────────
// AIDEDUC — CahierTexte.tsx (Version Enseignant)
// src/components/enseignant/CahierTexte.tsx
// ─────────────────────────────────────────────

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../utils/supabaseClient'

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

// ── Interfaces ────────────────────────────────
interface Classe {
  id: string
  nom: string
  matiere: string
  salle?: string
}

interface EntreeCahier {
  id: string
  classe_id: string
  date: string        // ISO "2026-07-20"
  trimestre: string   // "1er Trimestre", etc.
  titre_chapitre?: string
  contenu: string
  devoir?: string
  statut: 'en_cours' | 'termine' | 'valide'
  auteur?: string
  matiere?: string
}

interface AffectationRaw {
  matiere: string
  classes: {
    id: string
    nom: string
    salle?: string
  } | null
}

// ── Helpers ───────────────────────────────────
function formatDate(iso: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function getTrimestreActuel(): string {
  const mois = new Date().getMonth() + 1
  if (mois >= 9 && mois <= 12) {
    return '1er Trimestre'
  } else if (mois >= 1 && mois <= 3) {
    return '2ème Trimestre'
  } else {
    return '3ème Trimestre'
  }
}

// ── COMPOSANT ─────────────────────────────────
interface CahierTexteProps {
  onBack: () => void
}

export default function CahierTexte({ onBack }: CahierTexteProps) {
  const [classes,    setClasses]    = useState<Classe[]>([])
  const [classeId,   setClasseId]   = useState<string>('')
  const [entrees,    setEntrees]    = useState<EntreeCahier[]>([])
  const [showForm,   setShowForm]   = useState(false)
  const [chargement, setChargement] = useState(true)

  // Champs du formulaire
  const [titre,   setTitre]   = useState('')
  const [contenu, setContenu] = useState('')
  const [devoir,  setDevoir]  = useState('')
  const [saving,  setSaving]  = useState(false)
  const [flash,   setFlash]   = useState(false)

  // Charger les classes et le cahier de texte depuis Supabase
  useEffect(() => {
    async function initialiserDonnees() {
      try {
        setChargement(true)

        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          console.error("Erreur d'authentification :", userError)
          setChargement(false)
          return
        }

        const profConnecteId = user.id

        // 1. Charger les classes assignées au professeur
        const { data: affectationsData, error: affError } = await supabase
          .from('affectations_cours')
          .select(`
            matiere,
            classes (
              id,
              nom,
              salle
            )
          `)
          .eq('prof_id', profConnecteId)

        if (affError) throw affError

        let classesProf: Classe[] = []
        if (affectationsData && affectationsData.length > 0) {
          const rawData = affectationsData as unknown as AffectationRaw[]
          classesProf = rawData
            .filter(item => item.classes !== null)
            .map(item => ({
              id: item.classes!.id,
              nom: item.classes!.nom,
              salle: item.classes!.salle,
              matiere: item.matiere,
            }))

          setClasses(classesProf)
          if (classesProf.length > 0) {
            setClasseId(classesProf[0].id)
          }
        }

        // 2. Charger l'historique du cahier de texte (Table: cahier_de_texte)
        const { data: cahierData, error: cahierError } = await supabase
          .from('cahier_de_texte')
          .select('*')
          .eq('prof_id', profConnecteId)
          .order('date', { ascending: false })

        if (cahierError) {
          console.warn("Erreur de chargement des entrées :", cahierError.message)
        } else if (cahierData) {
          setEntrees(cahierData as EntreeCahier[])
        }

      } catch (error) {
        console.error("Erreur d'initialisation :", error)
      } finally {
        setChargement(false)
      }
    }

    initialiserDonnees()
  }, [])

  const classe = useMemo(
    () => classes.find(c => c.id === classeId),
    [classes, classeId]
  )

  const mesEntrees = useMemo(
    () => entrees.filter(e => e.classe_id === classeId),
    [entrees, classeId]
  )

  function resetForm() {
    setTitre('')
    setContenu('')
    setDevoir('')
    setShowForm(false)
  }

  // Enregistrer un nouveau cours
  async function enregistrer() {
    if (!contenu.trim() || !classe) return
    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Utilisateur non connecté")

      const nouvelleEntree = {
        classe_id: classe.id,
        prof_id: user.id,
        date: todayISO(),
        trimestre: getTrimestreActuel(),
        matiere: classe.matiere,
        titre_chapitre: titre.trim() || `Séance de ${classe.matiere}`,
        contenu: contenu.trim(),
        devoir: devoir.trim() || null,
        statut: 'termine', // Statut par défaut prêt pour visa du censeur
        auteur: user.user_metadata?.full_name || 'Enseignant',
      }

      const { data, error } = await supabase
        .from('cahier_de_texte')
        .insert([nouvelleEntree])
        .select()

      if (error) throw error

      if (data && data.length > 0) {
        setEntrees(prev => [data[0] as EntreeCahier, ...prev])
      } else {
        setEntrees(prev => [{ ...nouvelleEntree, id: `c_${Date.now()}` } as EntreeCahier, ...prev])
      }

      setFlash(true)
      resetForm()
      setTimeout(() => setFlash(false), 3000)
    } catch (error) {
      console.error("Erreur lors de l'enregistrement :", error)
      alert("Une erreur est survenue lors de l'enregistrement.")
    } finally {
      setSaving(false)
    }
  }

  // Supprimer une entrée
  async function supprimer(id: string) {
    if (!window.confirm('Supprimer cette entrée du cahier de texte ?')) return

    try {
      const { error } = await supabase
        .from('cahier_de_texte')
        .delete()
        .eq('id', id)

      if (error) throw error

      setEntrees(prev => prev.filter(e => e.id !== id))
    } catch (error) {
      console.error("Erreur de suppression :", error)
      alert("Impossible de supprimer cette entrée.")
    }
  }

  const formValid = contenu.trim().length > 0

  if (chargement) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: C.bg, color: C.textMuted }}>
        <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>Chargement du cahier de texte...</p>
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
            {classes.map(c => (
              <option key={c.id} value={c.id} style={{ background: '#1B3A5C' }}>
                {c.nom} {c.matiere ? `— ${c.matiere}` : ''}
              </option>
            ))}
          </select>
          <span style={{
            position: 'absolute', right: 12, top: '50%',
            transform: 'translateY(-50%)', color: C.accent,
            pointerEvents: 'none', fontSize: 12,
          }}>▾</span>
        </div>

        <div style={{ marginTop: 8, fontSize: 11, color: 'rgba(255,255,255,0.7)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span>📅 {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          <span>·</span>
          <span>📘 {getTrimestreActuel()}</span>
          {classe.salle && <span>·</span>}
          {classe.salle && <span>📍 {classe.salle}</span>}
        </div>
      </header>

      {/* ── CORPS ── */}
      <main style={{ flex: 1, padding: '14px 16px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {flash && (
          <div style={{
            background: '#EAF3DE', border: '1px solid #97C459',
            borderRadius: 10, padding: '11px 14px',
            fontSize: 13, color: '#27500A', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            ✅ Entrée ajoutée avec succès au cahier
          </div>
        )}

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
            <div style={{
              fontSize: 12, fontWeight: 700, color: C.primary,
              marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6,
            }}>
              📅 {formatDate(todayISO())} · 📘 {getTrimestreActuel()}
            </div>

            {/* Titre du chapitre */}
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', marginBottom: 6 }}>
              Titre du Chapitre / Leçon
            </label>
            <input
              type="text"
              value={titre}
              onChange={e => setTitre(e.target.value)}
              placeholder="Ex: Chapitre 2 - Équations du second degré"
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 9, fontSize: 13,
                border: `1.5px solid ${C.border}`, outline: 'none', marginBottom: 12,
                color: C.textMain
              }}
            />

            {/* Contenu du cours */}
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', marginBottom: 6 }}>
              Résumé du cours *
            </label>
            <textarea
              value={contenu}
              onChange={e => setContenu(e.target.value)}
              placeholder={`Notions abordées en ${classe.matiere || 'cours'}, exercices traités en classe, points importants…`}
              rows={5}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 9, fontSize: 13, lineHeight: 1.6,
                border: `1.5px solid ${contenu ? C.primary : C.border}`, outline: 'none', resize: 'vertical',
                fontFamily: 'inherit', color: C.textMain, marginBottom: 12,
              }}
            />

            {/* Devoir */}
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', marginBottom: 6 }}>
              Devoir donné <span style={{ fontWeight: 400, textTransform: 'none' }}>(optionnel)</span>
            </label>
            <input
              type="text"
              value={devoir}
              onChange={e => setDevoir(e.target.value)}
              placeholder="Ex : Exercices 12–14 page 58 — à rendre lundi"
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 9, fontSize: 13,
                border: `1.5px solid ${devoir ? C.amber : C.border}`, outline: 'none',
                fontFamily: 'inherit', color: C.textMain, marginBottom: 16,
              }}
            />

            <button
              onClick={enregistrer}
              disabled={!formValid || saving}
              style={{
                width: '100%', padding: '13px 0', borderRadius: 11, border: 'none',
                background: !formValid ? '#D0D5DD' : saving ? '#85B7EB' : C.green,
                color: '#fff', fontSize: 14, fontWeight: 700,
                cursor: !formValid ? 'not-allowed' : saving ? 'wait' : 'pointer',
              }}
            >
              {saving ? '⏳ Enregistrement…' : '📓 Ajouter au cahier'}
            </button>
          </div>
        )}

        {/* ── LISTE DES ENTRÉES ── */}
        {mesEntrees.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: C.textMuted, fontSize: 13 }}>
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
                  background: C.surface, borderRadius: 14, padding: '13px 15px',
                  border: `1px solid ${C.border}`,
                  borderLeft: `4px solid ${entry.statut === 'valide' ? C.green : C.primary}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span>📅 {formatDate(entry.date)}</span>
                    {entry.trimestre && <span>· 📘 {entry.trimestre}</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {entry.statut === 'valide' && (
                      <span style={{ fontSize: 10, background: '#E6F4EA', color: C.green, padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                        ✓ Visé par le censeur
                      </span>
                    )}
                    <button
                      onClick={() => supprimer(entry.id)}
                      style={{ background: 'none', border: 'none', color: '#CCC', fontSize: 16, cursor: 'pointer' }}
                      title="Supprimer"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {entry.titre_chapitre && (
                  <h4 style={{ margin: '0 0 6px 0', fontSize: 14, fontWeight: 700, color: C.textMain }}>
                    {entry.titre_chapitre}
                  </h4>
                )}

                <p style={{ fontSize: 13, color: C.textMain, lineHeight: 1.65, margin: 0, marginBottom: entry.devoir ? 10 : 0 }}>
                  {entry.contenu}
                </p>

                {entry.devoir && (
                  <div style={{ background: '#FAEEDA', borderRadius: 8, padding: '8px 11px', marginTop: 8, display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                    <span style={{ flexShrink: 0, fontSize: 14 }}>📚</span>
                    <span style={{ fontSize: 12, color: '#633806', fontWeight: 500, lineHeight: 1.5 }}>
                      {entry.devoir}
                    </span>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}