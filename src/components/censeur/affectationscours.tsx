import { useState, useEffect } from 'react'
import { supabase } from '../../utils/supabaseClient'

interface Enseignant {
  id: string
  first_name: string
  last_name: string
}

interface Classe {
  id: string
  nom: string
}

interface Matiere {
  id: string
  nom: string
}

interface Affectation {
  id: string
  teacher_id: string
  class_id: string
  subject_id: string
  teacher_name?: string
  class_name?: string
  subject_name?: string
}

interface Props {
  onBack?: () => void
}

export default function AffectationsCours({ onBack }: Props) {
  const [enseignants, setEnseignants] = useState<Enseignant[]>([])
  const [classes, setClasses] = useState<Classe[]>([])
  const [matieres, setMatieres] = useState<Matiere[]>([])
  const [affectations, setAffectations] = useState<Affectation[]>([])

  const [selectedEnseignant, setSelectedEnseignant] = useState('')
  const [selectedClasse, setSelectedClasse] = useState('')
  const [selectedMatiere, setSelectedMatiere] = useState('')

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // ── 1. CHARGEMENT DES CLASSES, MATIÈRES ET ENSEIGNANTS ──
  useEffect(() => {
    chargerDonnees()
  }, [])

  async function chargerDonnees() {
    try {
      setLoading(true)
      setErrorMessage(null)

      // Récupération des Enseignants (Profiles ayant le rôle enseignant)
      const { data: dataEnseignants, error: errEns } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('role', 'enseignant')

      if (errEns) console.error('Erreur enseignants:', errEns)

      // Récupération des Classes
      const { data: dataClasses, error: errClass } = await supabase
        .from('classes')
        .select('id, nom')

      if (errClass) console.error('Erreur classes:', errClass)

      // Récupération des Matières
      const { data: dataMatieres, error: errMat } = await supabase
        .from('matieres')
        .select('id, nom')

      if (errMat) console.error('Erreur matieres:', errMat)

      // Récupération des Affectations existantes
      const { data: dataAffectations, error: errAff } = await supabase
        .from('affectations')
        .select('*')

      if (errAff) console.error('Erreur affectations:', errAff)

      setEnseignants(dataEnseignants || [])
      setClasses(dataClasses || [])
      setMatieres(dataMatieres || [])
      setAffectations(dataAffectations || [])

    } catch (err: any) {
      setErrorMessage("Impossible de charger les listes de sélection.")
    } finally {
      setLoading(false)
    }
  }

  // ── 2. SOUMISSION D'UNE NOUVELLE AFFECTATION ──
  async function handleAssign(e: React.FormEvent) {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    if (!selectedEnseignant || !selectedClasse || !selectedMatiere) {
      setErrorMessage("Veuillez sélectionner un enseignant, une classe et une matière.")
      return
    }

    try {
      setSubmitting(true)

      const { data, error } = await supabase
        .from('affectations')
        .insert([
          {
            teacher_id: selectedEnseignant,
            class_id: selectedClasse,
            subject_id: selectedMatiere
          }
        ])
        .select()

      if (error) throw error

      setSuccessMessage("Affectation enregistrée avec succès !")
      setSelectedEnseignant('')
      setSelectedClasse('')
      setSelectedMatiere('')

      // Recharger la liste
      chargerDonnees()

    } catch (err: any) {
      setErrorMessage(err.message || "Erreur lors de l'enregistrement de l'affectation.")
    } finally {
      setSubmitting(false)
    }
  }

  // Helper pour trouver les noms
  const getEnseignantName = (id: string) => {
    const ens = enseignants.find(e => e.id === id)
    return ens ? `${ens.first_name} ${ens.last_name}` : id
  }

  const getClasseName = (id: string) => {
    const cl = classes.find(c => c.id === id)
    return cl ? cl.nom : id
  }

  const getMatiereName = (id: string) => {
    const m = matieres.find(mat => mat.id === id)
    return m ? m.nom : id
  }

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#0f172a' }}>🤝 Affectation des Cours</h2>
          <p style={{ color: '#64748b', fontSize: '14px', margin: '4px 0 0 0' }}>
            Attribuer des matières et des classes aux enseignants
          </p>
        </div>
        {onBack && (
          <button 
            onClick={onBack}
            style={{ padding: '8px 14px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}
          >
            ← Retour
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
          ⏳ Chargement des classes, matières et enseignants...
        </div>
      ) : (
        <>
          {/* FORMULAIRE D'AFFECTATION */}
          <form onSubmit={handleAssign} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
            
            {/* Sélection Enseignant */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Enseignant
              </label>
              <select
                value={selectedEnseignant}
                onChange={(e) => setSelectedEnseignant(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff' }}
              >
                <option value="">-- Sélectionner un enseignant --</option>
                {enseignants.map(ens => (
                  <option key={ens.id} value={ens.id}>
                    {ens.first_name} {ens.last_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sélection Classe */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Classe ({classes.length} disponibles)
              </label>
              <select
                value={selectedClasse}
                onChange={(e) => setSelectedClasse(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff' }}
              >
                <option value="">-- Sélectionner une classe --</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nom}
                  </option>
                ))}
              </select>
            </div>

            {/* Sélection Matière */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Matière ({matieres.length} disponibles)
              </label>
              <select
                value={selectedMatiere}
                onChange={(e) => setSelectedMatiere(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff' }}
              >
                <option value="">-- Sélectionner une matière --</option>
                {matieres.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.nom}
                  </option>
                ))}
              </select>
            </div>

            {/* Bouton de validation */}
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                type="submit"
                disabled={submitting}
                style={{ width: '100%', padding: '10px 16px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', opacity: submitting ? 0.7 : 1 }}
              >
                {submitting ? 'Enregistrement...' : '➕ Valider l\'affectation'}
              </button>
            </div>
          </form>

          {/* MESSAGES D'ALERTE */}
          {errorMessage && (
            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', padding: '12px', borderRadius: '6px', marginBottom: '20px', fontSize: '14px' }}>
              ❌ {errorMessage}
            </div>
          )}

          {successMessage && (
            <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac', color: '#166534', padding: '12px', borderRadius: '6px', marginBottom: '20px', fontSize: '14px' }}>
              ✓ {successMessage}
            </div>
          )}

          {/* TABLEAU DES AFFECTATIONS EXISTANTES */}
          <h3 style={{ fontSize: '16px', color: '#1e293b', marginBottom: '12px' }}>Liste des affectations actuelles</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '10px' }}>Enseignant</th>
                <th style={{ padding: '10px' }}>Classe</th>
                <th style={{ padding: '10px' }}>Matière</th>
              </tr>
            </thead>
            <tbody>
              {affectations.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                    Aucune affectation enregistrée pour le moment.
                  </td>
                </tr>
              ) : (
                affectations.map(aff => (
                  <tr key={aff.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px', fontWeight: '500' }}>{getEnseignantName(aff.teacher_id)}</td>
                    <td style={{ padding: '10px' }}>{getClasseName(aff.class_id)}</td>
                    <td style={{ padding: '10px' }}>{getMatiereName(aff.subject_id)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}