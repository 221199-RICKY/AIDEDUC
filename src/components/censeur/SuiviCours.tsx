// ─────────────────────────────────────────────
// AIDEDUC — SuiviCahierTexte.tsx (Version Censeur)
// src/components/censeur/SuiviCahierTexte.tsx
// ─────────────────────────────────────────────

import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../utils/supabaseClient'

const PALETTE = {
  primary: '#1B3A5C',
  accent: '#F5A623',
  purple: '#534AB7',
  green: '#1D9E75',
  bg: '#F4F6F9',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  textMain: '#1A1A2E',
  textMuted: '#6C757D',
} as const

export interface CahierTexteEntry {
  id: string
  date: string
  trimestre?: string
  titre_chapitre: string
  contenu: string
  devoir?: string
  statut: 'en_cours' | 'termine' | 'valide'
  matiere_nom: string
  enseignant_nom: string
  enseignant_prenom: string
  heure_debut?: string
  heure_fin?: string
}

interface Props {
  onBack: () => void
}

export default function SuiviCahierTexte({ onBack }: Props) {
  const [classes, setClasses] = useState<{ id: string; nom: string }[]>([])
  const [matieres, setMatieres] = useState<{ id: string; nom: string }[]>([])
  
  const [selectedClasseId, setSelectedClasseId] = useState<string>('')
  const [selectedMatiere, setSelectedMatiere] = useState<string>('toutes')
  const [searchTerm, setSearchTerm] = useState<string>('')
  
  const [fiches, setFiches] = useState<CahierTexteEntry[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [selectedFicheModal, setSelectedFicheModal] = useState<CahierTexteEntry | null>(null)

  // 1. Charger la liste des classes et des matières
  useEffect(() => {
    async function fetchMetaData() {
      try {
        // Chargement des classes depuis la table 'classes'
        const { data: dataClasses, error: errCl } = await supabase
          .from('classes')
          .select('id, nom')
          .order('nom')
          
        if (errCl) console.error('Erreur classes:', errCl)
        if (dataClasses && dataClasses.length > 0) {
          setClasses(dataClasses)
          setSelectedClasseId(dataClasses[0].id)
        }

        // Chargement des matières depuis la table 'matieres'
        const { data: dataMatieres, error: errMat } = await supabase
          .from('matieres')
          .select('id, nom')
          .order('nom')

        if (errMat) console.error('Erreur matières:', errMat)
        if (dataMatieres) setMatieres(dataMatieres)

      } catch (err) {
        console.error('Erreur chargement métadonnées:', err)
      }
    }
    fetchMetaData()
  }, [])

  // 2. Charger les séances saisies depuis 'cahier_de_texte'
  useEffect(() => {
    if (!selectedClasseId) return

    async function fetchCahiers() {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('cahier_de_texte') // Même table que l'enseignant
          .select(`
            id,
            date,
            trimestre,
            heure_debut,
            heure_fin,
            titre_chapitre,
            contenu,
            devoir,
            statut,
            matiere,
            auteur,
            profiles (last_name, first_name)
          `)
          .eq('classe_id', selectedClasseId)
          .order('date', { ascending: false })

        if (error) throw error

        const formatted: CahierTexteEntry[] = (data || []).map((item: any) => ({
          id: item.id,
          date: item.date,
          trimestre: item.trimestre,
          heure_debut: item.heure_debut || '08:00',
          heure_fin: item.heure_fin || '10:00',
          titre_chapitre: item.titre_chapitre || `Cours de ${item.matiere || ''}`,
          contenu: item.contenu || '',
          devoir: item.devoir,
          statut: item.statut || 'termine',
          matiere_nom: item.matiere || 'Matière',
          enseignant_nom: item.profiles?.last_name || item.auteur || '',
          enseignant_prenom: item.profiles?.first_name || '',
        }))

        setFiches(formatted)
      } catch (err) {
        console.error('Erreur chargement cahier de texte:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchCahiers()
  }, [selectedClasseId])

  // 3. Filtrage combiné (Matière & Mot-clé)
  const fichesFiltrees = useMemo(() => {
    return fiches.filter((fiche) => {
      const matchMatiere = selectedMatiere === 'toutes' || fiche.matiere_nom === selectedMatiere
      const matchSearch = 
        fiche.titre_chapitre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        fiche.contenu.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${fiche.enseignant_prenom} ${fiche.enseignant_nom}`.toLowerCase().includes(searchTerm.toLowerCase())
      
      return matchMatiere && matchSearch
    })
  }, [fiches, selectedMatiere, searchTerm])

  // 4. Action de viser/valider une séance
  const validerSeance = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    try {
      const { error } = await supabase
        .from('cahier_de_texte')
        .update({ statut: 'valide' })
        .eq('id', id)

      if (error) throw error

      setFiches((prev) =>
        prev.map((f) => (f.id === id ? { ...f, statut: 'valide' } : f))
      )
      if (selectedFicheModal?.id === id) {
        setSelectedFicheModal((prev) => prev ? { ...prev, statut: 'valide' } : null)
      }
    } catch (err) {
      console.error('Erreur validation séance:', err)
    }
  }

  // Statistiques
  const totalSeances = fiches.length
  const totalValides = fiches.filter(f => f.statut === 'valide').length
  const totalDevoirs = fiches.filter(f => Boolean(f.devoir)).length

  return (
    <div
      style={{
        fontFamily: "'Inter', system-ui, sans-serif",
        background: PALETTE.bg,
        minHeight: '100vh',
        maxWidth: 720,
        margin: '0 auto',
        paddingBottom: 40
      }}
    >
      {/* HEADER DE NAVIGATION ET FILTRES */}
      <header style={{ background: PALETTE.primary, padding: '16px', color: '#fff', borderRadius: '0 0 16px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button
            onClick={onBack}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: 8,
              width: 36,
              height: 36,
              color: '#fff',
              fontSize: 18,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ←
          </button>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Contrôle Pédagogique</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Suivi & Visa des Cahiers de Texte</div>
          </div>
        </div>

        {/* Sélection de Classe */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4, opacity: 0.9 }}>
            Sélectionner la Classe
          </label>
          <select
            value={selectedClasseId}
            onChange={(e) => setSelectedClasseId(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: `1.5px solid ${PALETTE.accent}`,
              background: '#ffffff',
              color: PALETTE.textMain,
              fontSize: 14,
              fontWeight: 600,
              outline: 'none',
            }}
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
        </div>

        {/* Sélection de Matière & Recherche */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <select
            value={selectedMatiere}
            onChange={(e) => setSelectedMatiere(e.target.value)}
            style={{
              padding: '8px 10px',
              borderRadius: 6,
              border: 'none',
              background: 'rgba(255,255,255,0.15)',
              color: '#fff',
              fontSize: 12,
              outline: 'none',
            }}
          >
            <option value="toutes" style={{ color: '#000' }}>Toutes les matières</option>
            {matieres.map((m) => (
              <option key={m.id} value={m.nom} style={{ color: '#000' }}>
                {m.nom}
              </option>
            ))}
          </select>

          <input 
            type="text"
            placeholder="🔍 Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '8px 10px',
              borderRadius: 6,
              border: 'none',
              background: 'rgba(255,255,255,0.15)',
              color: '#fff',
              fontSize: 12,
              outline: 'none'
            }}
          />
        </div>
      </header>

      {/* RAPPORTS RAPIDES */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, padding: '16px 16px 0 16px' }}>
        <div style={{ background: '#fff', padding: '10px', borderRadius: 8, border: `1px solid ${PALETTE.border}`, textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: PALETTE.primary }}>{totalSeances}</div>
          <div style={{ fontSize: 10, color: PALETTE.textMuted }}>Séances Renseignées</div>
        </div>
        <div style={{ background: '#fff', padding: '10px', borderRadius: 8, border: `1px solid ${PALETTE.border}`, textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: PALETTE.green }}>{totalValides}</div>
          <div style={{ fontSize: 10, color: PALETTE.textMuted }}>Visées / Validées</div>
        </div>
        <div style={{ background: '#fff', padding: '10px', borderRadius: 8, border: `1px solid ${PALETTE.border}`, textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: PALETTE.purple }}>{totalDevoirs}</div>
          <div style={{ fontSize: 10, color: PALETTE.textMuted }}>Devoirs Donnés</div>
        </div>
      </div>

      {/* LISTE DES SEANCES */}
      <main style={{ padding: 16 }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: PALETTE.textMuted, padding: 30 }}>
            ⏳ Chargement du cahier de texte...
          </div>
        ) : fichesFiltrees.length === 0 ? (
          <div style={{ textAlign: 'center', color: PALETTE.textMuted, padding: 30, background: '#fff', borderRadius: 12, border: `1px solid ${PALETTE.border}` }}>
            Aucun cours trouvé pour cette recherche.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {fichesFiltrees.map((fiche) => (
              <div
                key={fiche.id}
                onClick={() => setSelectedFicheModal(fiche)}
                style={{
                  background: PALETTE.surface,
                  border: `1px solid ${PALETTE.border}`,
                  borderRadius: 12,
                  padding: 16,
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: PALETTE.purple, background: '#EEEDFE', padding: '3px 8px', borderRadius: 6 }}>
                    {fiche.matiere_nom}
                  </span>
                  <span style={{ fontSize: 11, color: PALETTE.textMuted, fontWeight: 500 }}>
                    📅 {fiche.date} {fiche.trimestre ? `(${fiche.trimestre})` : ''}
                  </span>
                </div>

                <div style={{ fontSize: 15, fontWeight: 700, color: PALETTE.textMain, marginBottom: 6 }}>
                  {fiche.titre_chapitre}
                </div>

                <div style={{
                  fontSize: 13, color: PALETTE.textMuted, lineHeight: 1.4, marginBottom: 10,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                }}>
                  {fiche.contenu}
                </div>

                {fiche.devoir && (
                  <div style={{ fontSize: 11, background: '#FFFBEB', borderLeft: `3px solid ${PALETTE.accent}`, padding: '6px 10px', borderRadius: '0 6px 6px 0', marginBottom: 10, color: '#92400E' }}>
                    <strong>📝 Devoir :</strong> {fiche.devoir}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px solid ${PALETTE.border}`, paddingTop: 10, marginTop: 4 }}>
                  <div style={{ fontSize: 12, color: PALETTE.textMain }}>
                    Prof: <strong>{fiche.enseignant_prenom} {fiche.enseignant_nom}</strong>
                  </div>

                  {fiche.statut === 'valide' ? (
                    <span style={{ fontSize: 11, color: PALETTE.green, fontWeight: 700, backgroundColor: '#E6F4EA', padding: '2px 8px', borderRadius: 6 }}>
                      ✓ Visé
                    </span>
                  ) : (
                    <button
                      onClick={(e) => validerSeance(fiche.id, e)}
                      style={{ background: PALETTE.primary, color: '#fff', border: 'none', padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                    >
                      Viser la séance
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* DÉTAIL EN POP-UP */}
      {selectedFicheModal && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16
          }}
          onClick={() => setSelectedFicheModal(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#ffffff', borderRadius: 12, maxWidth: 500, width: '100%', maxHeight: '85vh', overflowY: 'auto', padding: 24 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: PALETTE.purple, background: '#EEEDFE', padding: '4px 10px', borderRadius: 6 }}>
                {selectedFicheModal.matiere_nom}
              </span>
              <button onClick={() => setSelectedFicheModal(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: PALETTE.textMuted }}>
                ✕
              </button>
            </div>

            <h2 style={{ fontSize: 18, fontWeight: 700, color: PALETTE.textMain, margin: '0 0 8px 0' }}>
              {selectedFicheModal.titre_chapitre}
            </h2>

            <div style={{ fontSize: 12, color: PALETTE.textMuted, marginBottom: 16 }}>
              📅 Saisi pour le <strong>{selectedFicheModal.date}</strong> {selectedFicheModal.trimestre ? `(${selectedFicheModal.trimestre})` : ''}
              <br />
              👤 Enseignant : <strong>{selectedFicheModal.enseignant_prenom} {selectedFicheModal.enseignant_nom}</strong>
            </div>

            <div style={{ borderTop: `1px solid ${PALETTE.border}`, paddingTop: 16, marginBottom: 16 }}>
              <h4 style={{ fontSize: 13, textTransform: 'uppercase', color: PALETTE.primary, margin: '0 0 8px 0' }}>
                📖 Contenu du cours :
              </h4>
              <p style={{ fontSize: 14, color: PALETTE.textMain, lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0, background: '#F8FAFC', padding: 12, borderRadius: 8 }}>
                {selectedFicheModal.contenu}
              </p>
            </div>

            {selectedFicheModal.devoir && (
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ fontSize: 13, textTransform: 'uppercase', color: PALETTE.accent, margin: '0 0 8px 0' }}>
                  📝 Devoir donné :
                </h4>
                <div style={{ fontSize: 13, color: '#92400E', background: '#FFFBEB', padding: 12, borderRadius: 8, borderLeft: `4px solid ${PALETTE.accent}` }}>
                  {selectedFicheModal.devoir}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              {selectedFicheModal.statut !== 'valide' && (
                <button
                  onClick={() => validerSeance(selectedFicheModal.id)}
                  style={{ flex: 1, background: PALETTE.green, color: '#fff', border: 'none', padding: '12px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
                >
                  ✓ Apposer le Visa Administration
                </button>
              )}
              <button
                onClick={() => setSelectedFicheModal(null)}
                style={{ padding: '12px 16px', background: '#F1F5F9', color: PALETTE.textMain, border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}