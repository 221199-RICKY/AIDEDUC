// ─────────────────────────────────────────────
// AIDEDUC — GestionAbsencesCenseur.tsx
// src/components/censeur/GestionAbsencesCenseur.tsx
// ─────────────────────────────────────────────

import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../utils/supabaseClient'

const PALETTE = {
  primary: '#1B3A5C',
  accent: '#F5A623',
  red: '#E24B4A',
  amber: '#BA7517',
  green: '#1D9E75',
  bg: '#F4F6F9',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  textMain: '#1A1A2E',
  textMuted: '#6C757D',
} as const

export interface Classe {
  id: string
  nom: string
}

export interface AbsenceRecord {
  id: string
  date: string
  eleve_nom: string
  eleve_prenom: string
  statut: 'present' | 'absent' | 'retard'
  motif: string
  justifie: boolean
  creneau: string
}

interface Props {
  onBack: () => void
}

export default function GestionAbsencesCenseur({ onBack }: Props) {
  const [classes, setClasses] = useState<Classe[]>([])
  const [selectedClasseId, setSelectedClasseId] = useState<string>('')
  const [absences, setAbsences] = useState<AbsenceRecord[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [filtreStatut, setFiltreStatut] = useState<'tous' | 'absent' | 'retard'>('tous')

  // Chargement des classes depuis la table `classes`
  useEffect(() => {
    async function fetchClasses() {
      try {
        const { data, error } = await supabase.from('classes').select('id, nom').order('nom')
        if (error) throw error
        if (data) {
          setClasses(data)
          if (data.length > 0) setSelectedClasseId(String(data[0].id))
        }
      } catch (err) {
        console.error('Erreur chargement classes:', err)
      }
    }
    fetchClasses()
  }, [])

  // Chargement des absences de la classe sélectionnée
  useEffect(() => {
    if (!selectedClasseId) return

    async function fetchAbsences() {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('absences')
          .select('id, date, statut, motif, justifie, time_slot, students (nom, prenom, first_name, last_name)')
          .eq('class_id', selectedClasseId)
          .order('date', { ascending: false })

        if (error) throw error

        const formatted: AbsenceRecord[] = (data || []).map((item: any) => ({
          id: String(item.id),
          date: item.date,
          statut: item.statut || 'absent',
          motif: item.motif || 'Non spécifié',
          justifie: Boolean(item.justifie),
          creneau: item.time_slot || 'Journée',
          eleve_nom: item.students?.nom || item.students?.last_name || '',
          eleve_prenom: item.students?.prenom || item.students?.first_name || '',
        }))

        setAbsences(formatted)
      } catch (err) {
        console.error('Erreur chargement absences:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAbsences()
  }, [selectedClasseId])

  // Basculer l'état de justification d'une absence
  const toggleJustifie = async (id: string, etatActuel: boolean) => {
    try {
      const { error } = await supabase
        .from('absences')
        .update({ justifie: !etatActuel })
        .eq('id', id)

      if (error) throw error

      setAbsences((prev) =>
        prev.map((item) => (item.id === id ? { ...item, justifie: !etatActuel } : item))
      )
    } catch (err) {
      console.error('Erreur mise à jour justification:', err)
    }
  }

  const listFiltered = useMemo(() => {
    if (filtreStatut === 'tous') return absences.filter((a) => a.statut !== 'present')
    return absences.filter((a) => a.statut === filtreStatut)
  }, [absences, filtreStatut])

  const stats = useMemo(() => {
    const totalAbsences = absences.filter((a) => a.statut === 'absent').length
    const totalRetards = absences.filter((a) => a.statut === 'retard').length
    const nonJustifies = absences.filter((a) => a.statut !== 'present' && !a.justifie).length
    return { totalAbsences, totalRetards, nonJustifies }
  }, [absences])

  return (
    <div
      style={{
        fontFamily: "'Inter', system-ui, sans-serif",
        background: PALETTE.bg,
        minHeight: '100vh',
        maxWidth: 600,
        margin: '0 auto',
      }}
    >
      {/* HEADER */}
      <header style={{ background: PALETTE.primary, padding: '12px 16px', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <button
            onClick={onBack}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: 8,
              width: 34,
              height: 34,
              color: '#fff',
              fontSize: 18,
              cursor: 'pointer',
            }}
          >
            ←
          </button>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Espace Censeur</div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>Suivi des Absences & Retards</div>
          </div>
        </div>

        <select
          value={selectedClasseId}
          onChange={(e) => setSelectedClasseId(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: 8,
            border: `1.5px solid ${PALETTE.accent}`,
            background: 'rgba(255,255,255,0.12)',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            outline: 'none',
          }}
        >
          {classes.map((c) => (
            <option key={c.id} value={c.id} style={{ background: PALETTE.primary }}>
              {c.nom}
            </option>
          ))}
        </select>
      </header>

      <main style={{ padding: 16 }}>
        {/* KPIS / RESUME */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              background: PALETTE.surface,
              padding: 10,
              borderRadius: 10,
              textAlign: 'center',
              border: `1px solid ${PALETTE.border}`,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700, color: PALETTE.red }}>
              {stats.totalAbsences}
            </div>
            <div style={{ fontSize: 10, color: PALETTE.textMuted }}>Absences</div>
          </div>
          <div
            style={{
              background: PALETTE.surface,
              padding: 10,
              borderRadius: 10,
              textAlign: 'center',
              border: `1px solid ${PALETTE.border}`,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700, color: PALETTE.amber }}>
              {stats.totalRetards}
            </div>
            <div style={{ fontSize: 10, color: PALETTE.textMuted }}>Retards</div>
          </div>
          <div
            style={{
              background: PALETTE.surface,
              padding: 10,
              borderRadius: 10,
              textAlign: 'center',
              border: `1px solid ${PALETTE.border}`,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700, color: PALETTE.primary }}>
              {stats.nonJustifies}
            </div>
            <div style={{ fontSize: 10, color: PALETTE.textMuted }}>Non justifiés</div>
          </div>
        </div>

        {/* FILTRES */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {(['tous', 'absent', 'retard'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFiltreStatut(st)}
              style={{
                flex: 1,
                padding: '6px 0',
                borderRadius: 8,
                border: 'none',
                background: filtreStatut === st ? PALETTE.primary : PALETTE.surface,
                color: filtreStatut === st ? '#fff' : PALETTE.textMuted,
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'capitalize',
                cursor: 'pointer',
              }}
            >
              {st === 'tous' ? 'Tous' : `${st}s`}
            </button>
          ))}
        </div>

        {/* LISTE */}
        {loading ? (
          <div style={{ textAlign: 'center', color: PALETTE.textMuted, padding: 20 }}>
            Chargement des données...
          </div>
        ) : listFiltered.length === 0 ? (
          <div style={{ textAlign: 'center', color: PALETTE.textMuted, padding: 20 }}>
            Aucune absence ou retard répertorié.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {listFiltered.map((item) => (
              <div
                key={item.id}
                style={{
                  background: PALETTE.surface,
                  border: `1px solid ${PALETTE.border}`,
                  borderRadius: 12,
                  padding: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: PALETTE.textMain }}>
                    {item.eleve_prenom} {item.eleve_nom}
                  </div>
                  <div style={{ fontSize: 11, color: PALETTE.textMuted, marginTop: 2 }}>
                    📅 {item.date} • {item.creneau}
                  </div>
                  <div style={{ fontSize: 11, color: PALETTE.textMuted, marginTop: 2 }}>
                    Motif : <i>{item.motif}</i>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 12,
                      background: item.statut === 'absent' ? '#FCEBEB' : '#FAEEDA',
                      color: item.statut === 'absent' ? PALETTE.red : PALETTE.amber,
                    }}
                  >
                    {item.statut.toUpperCase()}
                  </span>

                  <button
                    onClick={() => toggleJustifie(item.id, item.justifie)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 6,
                      border: 'none',
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: item.justifie ? '#EAF3DE' : '#F4F6F9',
                      color: item.justifie ? PALETTE.green : PALETTE.textMuted,
                    }}
                  >
                    {item.justifie ? '✓ Justifié' : 'Non justifié'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}