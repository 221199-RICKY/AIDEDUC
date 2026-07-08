// ─────────────────────────────────────────────
// EduConnect West Africa — Scolarite.tsx
// src/components/Scolarite.tsx
// Gestion des frais de scolarité et relances
// ─────────────────────────────────────────────

import React, { useState, useMemo, useCallback } from 'react';
import type {
  Creance,
  Paiement,
  StatutPaiement,
  ProviderMobileMoney,
  Eleve,
  FraisScolarite,
} from '../types';

// ─── Types locaux ─────────────────────────────

type FiltreStatut = 'tous' | StatutPaiement;
type FiltreClasse = 'toutes' | string;

interface ScolariteProps {
  ecoleId: string;
  onBack: () => void;
  isOnline: boolean;
}

// ─── Mock data ────────────────────────────────

const MOCK_FRAIS: FraisScolarite[] = [
  { id: 'f1', ecoleId: 'ec-1', anneeScolaire: '2025-2026', typeFrais: 'scolarite_t3', montant: 75_000, devise: 'XOF', description: 'Scolarité Trimestre 3' },
  { id: 'f2', ecoleId: 'ec-1', anneeScolaire: '2025-2026', typeFrais: 'inscription',  montant: 25_000, devise: 'XOF', description: 'Frais d\'inscription' },
];

const MOCK_CREANCES: Creance[] = [
  {
    eleveId: 'e1', totalDu: 75_000, totalPaye: 75_000, solde: 0, joursRetard: 0,
    eleve: { id: 'e1', nom: 'Adjovi',    prenom: 'Chloé',    dateNaissance: '', lieuNaissance: '', classeId: 'cl-1', ecoleId: 'ec-1', numeroEleve: 'TCL-003', parentIds: [], redoublant: false, createdAt: '' },
    paiements: [{ id: 'p1', eleveId: 'e1', fraisId: 'f1', frais: MOCK_FRAIS[0], montantPaye: 75_000, montantDu: 75_000, statut: 'paye',      provider: 'orange_money', reference: 'EC-2026-001', dateEcheance: '2026-06-30', datePaiement: '2026-06-10', notifEnvoyee: true, createdAt: '2026-06-10' }],
  },
  {
    eleveId: 'e2', totalDu: 75_000, totalPaye: 37_500, solde: -37_500, joursRetard: 8,
    eleve: { id: 'e2', nom: 'Mensah',    prenom: 'Basile',   dateNaissance: '', lieuNaissance: '', classeId: 'cl-1', ecoleId: 'ec-1', numeroEleve: 'TCL-002', parentIds: [], redoublant: false, createdAt: '' },
    paiements: [{ id: 'p2', eleveId: 'e2', fraisId: 'f1', frais: MOCK_FRAIS[0], montantPaye: 37_500, montantDu: 75_000, statut: 'partiel',    provider: 'wave',         reference: 'EC-2026-002', dateEcheance: '2026-06-30', notifEnvoyee: false, createdAt: '2026-06-01' }],
  },
  {
    eleveId: 'e3', totalDu: 75_000, totalPaye: 0, solde: -75_000, joursRetard: 21,
    eleve: { id: 'e3', nom: 'Dossou-M.', prenom: 'Daniel',   dateNaissance: '', lieuNaissance: '', classeId: 'cl-2', ecoleId: 'ec-1', numeroEleve: 'TCL-010', parentIds: [], redoublant: false, createdAt: '' },
    paiements: [{ id: 'p3', eleveId: 'e3', fraisId: 'f1', frais: MOCK_FRAIS[0], montantPaye: 0,      montantDu: 75_000, statut: 'en_attente', provider: 'especes',      reference: 'EC-2026-003', dateEcheance: '2026-06-30', notifEnvoyee: false, createdAt: '2026-06-01' }],
  },
  {
    eleveId: 'e4', totalDu: 75_000, totalPaye: 0, solde: -75_000, joursRetard: 34,
    eleve: { id: 'e4', nom: 'Sénou A.',  prenom: 'Serge',    dateNaissance: '', lieuNaissance: '', classeId: 'cl-2', ecoleId: 'ec-1', numeroEleve: 'TCL-011', parentIds: [], redoublant: true,  createdAt: '' },
    paiements: [{ id: 'p4', eleveId: 'e4', fraisId: 'f1', frais: MOCK_FRAIS[0], montantPaye: 0,      montantDu: 75_000, statut: 'retard',     provider: 'especes',      reference: 'EC-2026-004', dateEcheance: '2026-05-31', notifEnvoyee: true,  createdAt: '2026-05-01' }],
  },
  {
    eleveId: 'e5', totalDu: 75_000, totalPaye: 75_000, solde: 0, joursRetard: 0,
    eleve: { id: 'e5', nom: 'Konaté',    prenom: 'Ibrahim',  dateNaissance: '', lieuNaissance: '', classeId: 'cl-1', ecoleId: 'ec-1', numeroEleve: 'TCL-001', parentIds: [], redoublant: false, createdAt: '' },
    paiements: [{ id: 'p5', eleveId: 'e5', fraisId: 'f1', frais: MOCK_FRAIS[0], montantPaye: 75_000, montantDu: 75_000, statut: 'paye',      provider: 'mtn_money',    reference: 'EC-2026-005', dateEcheance: '2026-06-30', datePaiement: '2026-06-28', notifEnvoyee: true, createdAt: '2026-06-28' }],
  },
];

// ─── Helpers ─────────────────────────────────

function formatXOF(n: number): string {
  return n.toLocaleString('fr-FR') + ' XOF';
}

const STATUT_CONFIG: Record<StatutPaiement, { label: string; bg: string; text: string }> = {
  paye:       { label: '✓ Payé',       bg: '#EAF3DE', text: '#27500A' },
  partiel:    { label: '½ Partiel',    bg: '#EEEDFE', text: '#3C3489' },
  en_attente: { label: '⏳ En attente', bg: '#FAEEDA', text: '#633806' },
  retard:     { label: '⚠ Retard',     bg: '#FCEBEB', text: '#A32D2D' },
};

const PROVIDER_LABELS: Record<ProviderMobileMoney, string> = {
  orange_money:   '🟠 Orange Money',
  wave:           '🔵 Wave',
  mtn_money:      '🟡 MTN Money',
  moov_money:     '🟢 Moov Money',
  carte_bancaire: '💳 Carte bancaire',
  especes:        '💵 Espèces',
};

// ─── Sous-composants ─────────────────────────

interface CreanceRowProps {
  creance: Creance;
  onRelance: (eleveId: string) => void;
  relanceEnCours: boolean;
  relanceEnvoyee: boolean;
}

function CreanceRow({ creance, onRelance, relanceEnCours, relanceEnvoyee }: CreanceRowProps) {
  const paiement  = creance.paiements[0];
  const cfg       = STATUT_CONFIG[paiement.statut];
  const urgent    = creance.joursRetard >= 20;
  const initiales = `${creance.eleve.prenom[0]}${creance.eleve.nom[0]}`.toUpperCase();

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 14px',
      borderBottom: '0.5px solid #F0F0F0',
      background: urgent ? '#FFF9F9' : '#fff',
    }}>
      {/* Avatar */}
      <div style={{
        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
        background: urgent ? '#FCEBEB' : '#F0F4F8',
        color: urgent ? '#A32D2D' : '#495057',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700,
      }}>
        {initiales}
      </div>

      {/* Nom + classe */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>
          {creance.eleve.prenom} {creance.eleve.nom}
        </div>
        <div style={{ fontSize: 11, color: '#6C757D' }}>
          {creance.eleve.numeroEleve}
          {creance.joursRetard > 0 && (
            <span style={{ color: urgent ? '#A32D2D' : '#BA7517', marginLeft: 6 }}>
              • {creance.joursRetard}j de retard
            </span>
          )}
        </div>
      </div>

      {/* Montant */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 600,
          color: creance.solde < 0 ? '#A32D2D' : '#1D9E75',
        }}>
          {creance.solde < 0 ? `− ${formatXOF(Math.abs(creance.solde))}` : '✓ Soldé'}
        </div>
        <div style={{ fontSize: 10, color: '#ADB5BD' }}>
          sur {formatXOF(creance.totalDu)}
        </div>
      </div>

      {/* Statut */}
      <span style={{
        fontSize: 10, padding: '3px 8px', borderRadius: 20, fontWeight: 500,
        background: cfg.bg, color: cfg.text, flexShrink: 0,
      }}>
        {cfg.label}
      </span>

      {/* Bouton relance */}
      {paiement.statut !== 'paye' && (
        <button
          onClick={() => onRelance(creance.eleveId)}
          disabled={relanceEnCours || relanceEnvoyee}
          style={{
            fontSize: 11, padding: '5px 10px', borderRadius: 6, flexShrink: 0,
            border: `0.5px solid ${relanceEnvoyee ? '#97C459' : '#DEE2E6'}`,
            background: relanceEnvoyee ? '#EAF3DE' : '#fff',
            color: relanceEnvoyee ? '#27500A' : '#185FA5',
            cursor: relanceEnCours || relanceEnvoyee ? 'default' : 'pointer',
            fontWeight: 500,
          }}
        >
          {relanceEnvoyee ? '✓ SMS envoyé' : relanceEnCours ? '…' : '📨 SMS'}
        </button>
      )}
    </div>
  );
}

// ─── COMPOSANT PRINCIPAL ─────────────────────

export default function Scolarite({ ecoleId, onBack, isOnline }: ScolariteProps) {
  const [filtreStatut, setFiltreStatut] = useState<FiltreStatut>('tous');
  const [recherche, setRecherche]       = useState('');
  const [relancesEnCours, setRelancesEnCours] = useState<Set<string>>(new Set());
  const [relancesEnvoyees, setRelancesEnvoyees] = useState<Set<string>>(new Set());
  const [onglet, setOnglet] = useState<'creances' | 'transactions'>('creances');

  // Statistiques globales
  const stats = useMemo(() => {
    const total    = MOCK_CREANCES.reduce((s, c) => s + c.totalDu,   0);
    const encaisse = MOCK_CREANCES.reduce((s, c) => s + c.totalPaye, 0);
    const reste    = total - encaisse;
    const taux     = total > 0 ? Math.round((encaisse / total) * 100) : 0;
    const nbRetard = MOCK_CREANCES.filter(c => c.paiements[0].statut === 'retard').length;
    return { total, encaisse, reste, taux, nbRetard };
  }, []);

  // Filtrage
  const creancesFiltrees = useMemo(() => {
    return MOCK_CREANCES.filter(c => {
      const nom = `${c.eleve.prenom} ${c.eleve.nom}`.toLowerCase();
      const matchRecherche = recherche === '' || nom.includes(recherche.toLowerCase());
      const matchStatut    = filtreStatut === 'tous' || c.paiements[0].statut === filtreStatut;
      return matchRecherche && matchStatut;
    });
  }, [filtreStatut, recherche]);

  // Relance SMS individuelle
  const handleRelance = useCallback(async (eleveId: string) => {
    setRelancesEnCours(prev => new Set(prev).add(eleveId));
    await new Promise(r => setTimeout(r, 900));
    setRelancesEnCours(prev => { const s = new Set(prev); s.delete(eleveId); return s; });
    setRelancesEnvoyees(prev => new Set(prev).add(eleveId));
  }, []);

  // Relancer tous les retards
  const handleRelancerTous = useCallback(async () => {
    const ids = MOCK_CREANCES
      .filter(c => ['retard', 'en_attente'].includes(c.paiements[0].statut))
      .map(c => c.eleveId);
    ids.forEach(id => setRelancesEnCours(prev => new Set(prev).add(id)));
    await new Promise(r => setTimeout(r, 1400));
    ids.forEach(id => {
      setRelancesEnCours(prev => { const s = new Set(prev); s.delete(id); return s; });
      setRelancesEnvoyees(prev => new Set(prev).add(id));
    });
  }, []);

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#F5F7FA', minHeight: '100vh' }}>

      {/* ── HEADER ── */}
      <header style={{
        background: '#1B3A5C', color: '#fff',
        padding: '14px 20px',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={onBack}
            style={{
              background: 'rgba(255,255,255,0.15)', border: 'none',
              borderRadius: 8, width: 32, height: 32, cursor: 'pointer',
              color: '#fff', fontSize: 18, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}
            aria-label="Retour"
          >
            ←
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Frais de scolarité</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 1 }}>
              Trimestre 3 — Lycée Béhanzin • Année 2025–2026
            </div>
          </div>
          {!isOnline && (
            <span style={{
              fontSize: 11, padding: '3px 10px', borderRadius: 20,
              background: '#FAEEDA', color: '#633806', fontWeight: 500,
            }}>
              ⚡ Hors ligne
            </span>
          )}
          <button
            onClick={handleRelancerTous}
            style={{
              padding: '7px 14px', borderRadius: 8, border: 'none',
              background: '#E24B4A', color: '#fff', fontWeight: 500,
              fontSize: 12, cursor: 'pointer',
            }}
          >
            📨 Relancer tout
          </button>
        </div>
      </header>

      <main style={{ padding: '16px 20px', maxWidth: 900, margin: '0 auto' }}>

        {/* ── KPIs ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 10, marginBottom: 20,
        }}>
          {[
            { label: 'Total attendu',      value: formatXOF(stats.total),    color: '#1A1A2E', icon: '🏫' },
            { label: 'Encaissé',           value: formatXOF(stats.encaisse), color: '#1D9E75', icon: '✅' },
            { label: 'Reste à collecter',  value: formatXOF(stats.reste),    color: '#E24B4A', icon: '⚠️' },
            { label: 'Taux recouvrement',  value: `${stats.taux} %`,         color: stats.taux >= 80 ? '#1D9E75' : '#BA7517', icon: '📊' },
          ].map(k => (
            <div key={k.label} style={{
              background: '#fff', border: '0.5px solid #DEE2E6',
              borderRadius: 12, padding: '12px 14px',
            }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>{k.icon}</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: k.color }}>{k.value}</div>
              <div style={{ fontSize: 11, color: '#6C757D', marginTop: 3 }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* Barre de progression globale */}
        <div style={{
          background: '#fff', border: '0.5px solid #DEE2E6',
          borderRadius: 10, padding: '12px 14px', marginBottom: 16,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: '#6C757D' }}>Recouvrement global</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: stats.taux >= 80 ? '#1D9E75' : '#BA7517' }}>
              {stats.taux} %
            </span>
          </div>
          <div style={{
            height: 8, background: '#F0F0F0', borderRadius: 4, overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', borderRadius: 4,
              width: `${stats.taux}%`,
              background: stats.taux >= 80 ? '#1D9E75' : stats.taux >= 60 ? '#BA7517' : '#E24B4A',
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>

        {/* ── ONGLETS ── */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 14, borderBottom: '0.5px solid #DEE2E6' }}>
          {(['creances', 'transactions'] as const).map(o => (
            <button
              key={o}
              onClick={() => setOnglet(o)}
              style={{
                padding: '8px 16px', border: 'none', background: 'none',
                fontSize: 13, cursor: 'pointer', fontWeight: 500,
                color: onglet === o ? '#185FA5' : '#6C757D',
                borderBottom: onglet === o ? '2px solid #185FA5' : '2px solid transparent',
              }}
            >
              {o === 'creances' ? '⚠️ Créances' : '✅ Transactions'}
            </button>
          ))}
        </div>

        {onglet === 'creances' && (
          <>
            {/* Recherche + filtres */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
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
              {(['tous', 'retard', 'en_attente', 'partiel', 'paye'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFiltreStatut(f)}
                  style={{
                    padding: '6px 12px', borderRadius: 20, border: '0.5px solid #DEE2E6',
                    fontSize: 11, cursor: 'pointer',
                    background: filtreStatut === f ? '#1B3A5C' : '#fff',
                    color: filtreStatut === f ? '#fff' : '#6C757D',
                    fontWeight: 500,
                  }}
                >
                  {{ tous: 'Tous', retard: 'En retard', en_attente: 'En attente', partiel: 'Partiel', paye: 'Payés' }[f]}
                </button>
              ))}
            </div>

            {/* Liste des créances */}
            <div style={{
              background: '#fff', border: '0.5px solid #DEE2E6',
              borderRadius: 12, overflow: 'hidden',
            }}>
              {creancesFiltrees.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: '#6C757D', fontSize: 13 }}>
                  Aucun élève correspondant.
                </div>
              ) : (
                creancesFiltrees.map(creance => (
                  <CreanceRow
                    key={creance.eleveId}
                    creance={creance}
                    onRelance={handleRelance}
                    relanceEnCours={relancesEnCours.has(creance.eleveId)}
                    relanceEnvoyee={relancesEnvoyees.has(creance.eleveId)}
                  />
                ))
              )}
            </div>

            {relancesEnvoyees.size > 0 && (
              <p style={{
                fontSize: 12, color: '#1D9E75', textAlign: 'center', marginTop: 12,
                background: '#EAF3DE', borderRadius: 8, padding: '8px 14px',
              }}>
                ✅ {relancesEnvoyees.size} SMS de relance envoyé{relancesEnvoyees.size > 1 ? 's' : ''}
                {!isOnline && ' (en attente de connexion)'}
              </p>
            )}
          </>
        )}

        {onglet === 'transactions' && (
          <div style={{
            background: '#fff', border: '0.5px solid #DEE2E6',
            borderRadius: 12, overflow: 'hidden',
          }}>
            {MOCK_CREANCES.filter(c => c.totalPaye > 0).map((creance, idx, arr) => {
              const p = creance.paiements[0];
              return (
                <div key={creance.eleveId} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px',
                  borderBottom: idx < arr.length - 1 ? '0.5px solid #F0F0F0' : 'none',
                }}>
                  <span style={{ fontSize: 18 }}>
                    {{ orange_money: '🟠', wave: '🔵', mtn_money: '🟡', moov_money: '🟢', carte_bancaire: '💳', especes: '💵' }[p.provider]}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>
                      Famille {creance.eleve.nom}
                    </div>
                    <div style={{ fontSize: 11, color: '#6C757D' }}>
                      {PROVIDER_LABELS[p.provider]} • Réf. {p.reference}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1D9E75' }}>
                      +{formatXOF(creance.totalPaye)}
                    </div>
                    {p.datePaiement && (
                      <div style={{ fontSize: 10, color: '#ADB5BD' }}>
                        {new Date(p.datePaiement).toLocaleDateString('fr-FR')}
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: '#EAF3DE', color: '#27500A', fontWeight: 500 }}>
                    ✓ Payé
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
