// ─────────────────────────────────────────────
// EduConnect West Africa — Absences.tsx
// src/components/Absences.tsx
// Pointage des absences par l'enseignant
// ─────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from 'react';
import type { Eleve, StatutAbsence } from '../types';

// ─── Types locaux ─────────────────────────────

type StatutPointage = 'present' | 'absent' | 'retard' | null;

interface EleveAvecStatut {
  eleve: Eleve;
  statut: StatutPointage;
  justificatifUrl?: string;
}

interface Creneau {
  id: string;
  matiereNom: string;
  classeNom: string;
  salle: string;
  heureDebut: string;
  heureFin: string;
}

interface AbsencesProps {
  enseignantId: string;
  onBack: () => void;
  isOnline: boolean;
}

// ─── Mock data (remplacée par appels API) ──────

const MOCK_CRENEAU: Creneau = {
  id: 'cr-001',
  matiereNom: 'Mathématiques',
  classeNom: 'Terminale C',
  salle: 'Salle B12',
  heureDebut: '08:00',
  heureFin: '10:00',
};

const MOCK_ELEVES: Eleve[] = [
  { id: 'e1',  nom: 'Konaté',   prenom: 'Amina',    dateNaissance: '2007-03-12', lieuNaissance: 'Cotonou', classeId: 'cl-1', ecoleId: 'ec-1', numeroEleve: 'TCL-001', parentIds: ['p1'], redoublant: false, createdAt: '2024-09-01' },
  { id: 'e2',  nom: 'Mensah',   prenom: 'Basile',   dateNaissance: '2006-07-22', lieuNaissance: 'Porto-Novo', classeId: 'cl-1', ecoleId: 'ec-1', numeroEleve: 'TCL-002', parentIds: ['p2'], redoublant: false, createdAt: '2024-09-01' },
  { id: 'e3',  nom: 'Adjovi',   prenom: 'Chloé',    dateNaissance: '2007-01-05', lieuNaissance: 'Cotonou', classeId: 'cl-1', ecoleId: 'ec-1', numeroEleve: 'TCL-003', parentIds: ['p3'], redoublant: false, createdAt: '2024-09-01' },
  { id: 'e4',  nom: 'Sow',      prenom: 'David',    dateNaissance: '2006-11-30', lieuNaissance: 'Dakar', classeId: 'cl-1', ecoleId: 'ec-1', numeroEleve: 'TCL-004', parentIds: ['p4'], redoublant: true,  createdAt: '2024-09-01' },
  { id: 'e5',  nom: 'Diallo',   prenom: 'Estelle',  dateNaissance: '2007-04-18', lieuNaissance: 'Abidjan', classeId: 'cl-1', ecoleId: 'ec-1', numeroEleve: 'TCL-005', parentIds: ['p5'], redoublant: false, createdAt: '2024-09-01' },
  { id: 'e6',  nom: 'Togbé',    prenom: 'Franck',   dateNaissance: '2006-09-14', lieuNaissance: 'Lomé', classeId: 'cl-1', ecoleId: 'ec-1', numeroEleve: 'TCL-006', parentIds: ['p6'], redoublant: false, createdAt: '2024-09-01' },
  { id: 'e7',  nom: 'Aholou',   prenom: 'Grace',    dateNaissance: '2007-02-28', lieuNaissance: 'Cotonou', classeId: 'cl-1', ecoleId: 'ec-1', numeroEleve: 'TCL-007', parentIds: ['p7'], redoublant: false, createdAt: '2024-09-01' },
  { id: 'e8',  nom: 'Bello',    prenom: 'Hugo',     dateNaissance: '2006-12-03', lieuNaissance: 'Lagos', classeId: 'cl-1', ecoleId: 'ec-1', numeroEleve: 'TCL-008', parentIds: ['p8'], redoublant: false, createdAt: '2024-09-01' },
  { id: 'e9',  nom: 'Zannou',   prenom: 'Isabelle', dateNaissance: '2007-06-17', lieuNaissance: 'Parakou', classeId: 'cl-1', ecoleId: 'ec-1', numeroEleve: 'TCL-009', parentIds: ['p9'], redoublant: false, createdAt: '2024-09-01' },
  { id: 'e10', nom: 'Coulibaly',prenom: 'Jules',    dateNaissance: '2006-08-09', lieuNaissance: 'Bamako', classeId: 'cl-1', ecoleId: 'ec-1', numeroEleve: 'TCL-010', parentIds: ['p10'], redoublant: false, createdAt: '2024-09-01' },
];

// ─── Helpers ─────────────────────────────────

function initiales(eleve: Eleve): string {
  return `${eleve.prenom[0]}${eleve.nom[0]}`.toUpperCase();
}

const STATUT_CONFIG: Record<NonNullable<StatutPointage>, { label: string; bg: string; text: string; border: string }> = {
  present: { label: 'P',      bg: '#EAF3DE', text: '#27500A', border: '#97C459' },
  absent:  { label: 'A',      bg: '#FCEBEB', text: '#A32D2D', border: '#F7A3A3' },
  retard:  { label: 'R',      bg: '#FAEEDA', text: '#633806', border: '#F0C87A' },
};

const AVATAR_COLORS = [
  { bg: '#E6F1FB', text: '#0C447C' },
  { bg: '#EAF3DE', text: '#27500A' },
  { bg: '#FAEEDA', text: '#633806' },
  { bg: '#EEEDFE', text: '#3C3489' },
  { bg: '#FAECE7', text: '#712B13' },
];

// ─── COMPOSANT PRINCIPAL ─────────────────────

export default function Absences({ enseignantId, onBack, isOnline }: AbsencesProps) {
  const [eleves, setEleves] = useState<EleveAvecStatut[]>(
    MOCK_ELEVES.map(e => ({ eleve: e, statut: null }))
  );
  const [filtre, setFiltre] = useState<'tous' | StatutPointage>('tous');
  const [valide, setValide] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [recherche, setRecherche] = useState('');
  const date = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  // Statistiques
  const nbPresents = eleves.filter(e => e.statut === 'present').length;
  const nbAbsents  = eleves.filter(e => e.statut === 'absent').length;
  const nbRetards  = eleves.filter(e => e.statut === 'retard').length;
  const nbPointes  = eleves.filter(e => e.statut !== null).length;
  const total      = eleves.length;
  const pctComplete = Math.round((nbPointes / total) * 100);

  // Marquer tous présents en un clic
  const tousPresents = useCallback(() => {
    setEleves(prev => prev.map(e =>
      e.statut === null ? { ...e, statut: 'present' } : e
    ));
  }, []);

  // Changer le statut d'un élève
  const setStatut = useCallback((eleveId: string, statut: StatutPointage) => {
    setEleves(prev => prev.map(e =>
      e.eleve.id === eleveId ? { ...e, statut } : e
    ));
  }, []);

  // Valider et envoyer (simulé)
  const handleValider = useCallback(async () => {
    // Tous les élèves non pointés sont marqués présents
    setEleves(prev => prev.map(e =>
      e.statut === null ? { ...e, statut: 'present' } : e
    ));
    setEnCours(true);
    // Simulation appel API (+ file d'attente offline si !isOnline)
    await new Promise(resolve => setTimeout(resolve, 1200));
    setEnCours(false);
    setValide(true);
  }, [isOnline]);

  // Filtrage + recherche
  const elevesFiltres = eleves.filter(({ eleve, statut }) => {
    const matchRecherche =
      recherche === '' ||
      `${eleve.prenom} ${eleve.nom}`.toLowerCase().includes(recherche.toLowerCase());
    const matchFiltre = filtre === 'tous' || statut === filtre;
    return matchRecherche && matchFiltre;
  });

  // ── RENDU ───────────────────────────────────
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#F5F7FA', minHeight: '100vh' }}>

      {/* ── HEADER ── */}
      <header style={{
        background: '#1B3A5C', color: '#fff',
        padding: '14px 20px',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <button
            onClick={onBack}
            style={{
              background: 'rgba(255,255,255,0.15)', border: 'none',
              borderRadius: 8, width: 32, height: 32, cursor: 'pointer',
              color: '#fff', fontSize: 18, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}
            aria-label="Retour au tableau de bord"
          >
            ←
          </button>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>
              {MOCK_CRENEAU.matiereNom} — {MOCK_CRENEAU.classeNom}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 1 }}>
              {date} • {MOCK_CRENEAU.heureDebut}–{MOCK_CRENEAU.heureFin} • {MOCK_CRENEAU.salle}
            </div>
          </div>
          {/* Badge offline */}
          {!isOnline && (
            <span style={{
              marginLeft: 'auto', fontSize: 11, padding: '3px 10px',
              borderRadius: 20, background: '#FAEEDA', color: '#633806', fontWeight: 500,
            }}>
              ⚡ Hors ligne
            </span>
          )}
        </div>

        {/* Compteurs */}
        <div style={{ display: 'flex', gap: 20, paddingLeft: 44 }}>
          {[
            { label: 'Présents', value: nbPresents, color: '#1D9E75' },
            { label: 'Absents',  value: nbAbsents,  color: '#E24B4A' },
            { label: 'Retards',  value: nbRetards,  color: '#F5A623' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </header>

      <main style={{ padding: '16px 20px', maxWidth: 720, margin: '0 auto' }}>

        {/* ── BARRE DE PROGRESSION ── */}
        <div style={{
          background: pctComplete === 100 ? '#EAF3DE' : '#FAEEDA',
          borderRadius: 10, padding: '10px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 14,
          border: `0.5px solid ${pctComplete === 100 ? '#97C459' : '#F0C87A'}`,
        }}>
          <div>
            <div style={{
              fontSize: 13, fontWeight: 500,
              color: pctComplete === 100 ? '#27500A' : '#633806',
            }}>
              {nbPointes} / {total} élèves pointés — {pctComplete} %
            </div>
            <div style={{ fontSize: 11, color: pctComplete === 100 ? '#3B6D11' : '#854F0B', marginTop: 2 }}>
              {pctComplete === 100
                ? 'Appel complet — vous pouvez valider'
                : 'Pointez les élèves ou cliquez sur "Tous présents"'}
            </div>
          </div>
          {pctComplete < 100 && (
            <button
              onClick={tousPresents}
              style={{
                fontSize: 12, padding: '6px 12px', borderRadius: 8,
                border: '0.5px solid #97C459', background: '#EAF3DE',
                color: '#27500A', cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap',
              }}
            >
              ✓ Tous présents
            </button>
          )}
        </div>

        {/* ── RECHERCHE + FILTRES ── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          <input
            type="search"
            placeholder="Rechercher un élève…"
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
            style={{
              flex: 1, minWidth: 180, padding: '7px 12px',
              border: '0.5px solid #DEE2E6', borderRadius: 8,
              fontSize: 13, background: '#fff', outline: 'none',
            }}
          />
          {(['tous', 'absent', 'retard', 'present'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFiltre(f)}
              style={{
                padding: '6px 12px', borderRadius: 20, border: '0.5px solid #DEE2E6',
                fontSize: 12, cursor: 'pointer', fontWeight: 500,
                background: filtre === f ? '#1B3A5C' : '#fff',
                color: filtre === f ? '#fff' : '#6C757D',
              }}
            >
              {{tous: 'Tous', absent: 'Absents', retard: 'Retards', present: 'Présents'}[f]}
            </button>
          ))}
        </div>

        {/* ── LISTE DES ÉLÈVES ── */}
        {valide ? (
          <div style={{
            background: '#EAF3DE', border: '0.5px solid #97C459',
            borderRadius: 12, padding: 24, textAlign: 'center',
          }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#27500A' }}>
              Appel validé !
            </div>
            <div style={{ fontSize: 13, color: '#3B6D11', marginTop: 6 }}>
              {nbAbsents > 0
                ? `${nbAbsents} parent${nbAbsents > 1 ? 's' : ''} notifié${nbAbsents > 1 ? 's' : ''} par SMS`
                : 'Tous les élèves sont présents.'}
              {!isOnline && ' (en attente de connexion)'}
            </div>
            <button
              onClick={onBack}
              style={{
                marginTop: 16, padding: '8px 20px', borderRadius: 8,
                background: '#1B3A5C', color: '#fff', border: 'none',
                fontSize: 13, cursor: 'pointer',
              }}
            >
              Retour au tableau de bord
            </button>
          </div>
        ) : (
          <>
            <div style={{
              background: '#fff', border: '0.5px solid #DEE2E6',
              borderRadius: 12, overflow: 'hidden',
            }}>
              {elevesFiltres.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: '#6C757D', fontSize: 13 }}>
                  Aucun élève trouvé.
                </div>
              ) : (
                elevesFiltres.map(({ eleve, statut }, idx) => {
                  const av = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                  return (
                    <div
                      key={eleve.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 14px',
                        borderBottom: idx < elevesFiltres.length - 1 ? '0.5px solid #F0F0F0' : 'none',
                        background: statut === 'absent' ? '#FFF9F9' : '#fff',
                      }}
                    >
                      {/* Avatar */}
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: av.bg, color: av.text,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 600, flexShrink: 0,
                      }}>
                        {initiales(eleve)}
                      </div>

                      {/* Nom + numéro */}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>
                          {eleve.prenom} {eleve.nom}
                          {eleve.redoublant && (
                            <span style={{
                              marginLeft: 6, fontSize: 10, padding: '1px 6px',
                              borderRadius: 20, background: '#EEEDFE', color: '#3C3489',
                            }}>
                              Redoublant
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: '#ADB5BD' }}>{eleve.numeroEleve}</div>
                      </div>

                      {/* Boutons P / A / R */}
                      <div style={{ display: 'flex', gap: 5 }}>
                        {(['present', 'absent', 'retard'] as const).map(s => {
                          const cfg = STATUT_CONFIG[s];
                          const isActive = statut === s;
                          return (
                            <button
                              key={s}
                              onClick={() => setStatut(eleve.id, isActive ? null : s)}
                              aria-pressed={isActive}
                              aria-label={`Marquer ${eleve.prenom} ${eleve.nom} ${s}`}
                              style={{
                                width: 36, height: 36, borderRadius: 8,
                                border: `0.5px solid ${isActive ? cfg.border : '#DEE2E6'}`,
                                background: isActive ? cfg.bg : '#F8F9FA',
                                color: isActive ? cfg.text : '#ADB5BD',
                                fontWeight: 700, fontSize: 13, cursor: 'pointer',
                                transition: 'all 0.1s',
                              }}
                            >
                              {cfg.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* ── BOUTON VALIDER ── */}
            <div style={{ marginTop: 16 }}>
              <button
                onClick={handleValider}
                disabled={enCours}
                style={{
                  width: '100%', padding: 14, borderRadius: 10,
                  background: enCours ? '#85B7EB' : '#1B6CA8',
                  color: '#fff', border: 'none', fontSize: 14,
                  fontWeight: 600, cursor: enCours ? 'wait' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'background 0.15s',
                }}
              >
                {enCours ? (
                  <span>⏳ Envoi en cours…</span>
                ) : (
                  <span>
                    ✓ Valider l'appel
                    {nbAbsents > 0 && ` — notifier ${nbAbsents} parent${nbAbsents > 1 ? 's' : ''} par SMS`}
                    {!isOnline && ' (offline)'}
                  </span>
                )}
              </button>
              {!isOnline && (
                <p style={{ fontSize: 11, color: '#BA7517', textAlign: 'center', marginTop: 6 }}>
                  ⚡ Les notifications seront envoyées dès le retour de la connexion.
                </p>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
