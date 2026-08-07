// ─────────────────────────────────────────────
// EduConnect West Africa — Scolarite.tsx
// src/components/Scolarite.tsx
// Liaison : Students (class_id, parentTel) ➔ Classes (nom) ➔ Scolarite (scolarite) ➔ Paiements
// Canal de Relance : WhatsApp (déclenché via parentTel)
// ─────────────────────────────────────────────

import  { useState, useMemo, useCallback, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import type {
  Creance,
  Paiement,
  StatutPaiement,
  ProviderMobileMoney,
  Eleve,
  TypeFrais,
} from '../types';

type FiltreStatut = 'tous' | StatutPaiement;

interface ScolariteProps {
  ecoleId: string;
  onBack: () => void;
  isOnline: boolean;
}

// Formatage devises
function formatXOF(n: number): string {
  return n.toLocaleString('fr-FR') + ' XOF';
}

const STATUT_CONFIG: Record<StatutPaiement, { label: string; bg: string; text: string }> = {
  paye:       { label: '✓ Payé',       bg: '#EAF3DE', text: '#27500A' },
  partiel:    { label: '½ Partiel',    bg: '#EEEDFE', text: '#3C3489' },
  en_attente: { label: '⏳ En attente', bg: '#FAEEDA', text: '#633806' },
  retard:     { label: '⚠ Retard',     bg: '#FCEBEB', text: '#A32D2D' },
};

const PROVIDER_LABELS: Record<string, string> = {
  orange_money:   '🟠 Orange Money',
  wave:           '🔵 Wave',
  mtn_money:      '🟡 MTN Money',
  moov_money:     '🟢 Moov Money',
  carte_bancaire: '💳 Carte bancaire',
  especes:        '💵 Espèces',
};

// ─── Sous-composant Ligne Créance ─────────────

interface CreanceRowProps {
  creance: Creance & { telephoneParent?: string };
  nomClasse: string;
  onRelance: (creance: Creance & { telephoneParent?: string }) => void;
  relanceEnCours: boolean;
  relanceEnvoyee: boolean;
}

function CreanceRow({ creance, nomClasse, onRelance, relanceEnCours, relanceEnvoyee }: CreanceRowProps) {
  const paiement  = creance.paiements[0];
  const cfg       = STATUT_CONFIG[paiement ? paiement.statut : 'en_attente'];
  const urgent    = creance.joursRetard >= 20;
  const prenomInit = creance.eleve.prenom ? creance.eleve.prenom[0] : '';
  const nomInit = creance.eleve.nom ? creance.eleve.nom[0] : '';
  const initiales = `${prenomInit}${nomInit}`.toUpperCase() || 'E';

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

      {/* Nom + Nom de la Classe */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E' }}>
          {creance.eleve.prenom} {creance.eleve.nom}
        </div>
        <div style={{ fontSize: 11, color: '#6C757D', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
          {/* Badge Classe */}
          <span style={{
            background: '#E9ECEF', color: '#495057',
            padding: '1px 6px', borderRadius: 4, fontWeight: 600, fontSize: 10
          }}>
            {nomClasse}
          </span>

          {creance.joursRetard > 0 && (
            <span style={{ color: urgent ? '#A32D2D' : '#BA7517' }}>
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

      {/* Bouton relance WhatsApp */}
      {paiement && paiement.statut !== 'paye' && (
        <button
          onClick={() => onRelance(creance)}
          disabled={relanceEnCours}
          style={{
            fontSize: 11, padding: '5px 10px', borderRadius: 6, flexShrink: 0,
            border: 'none',
            background: relanceEnvoyee ? '#DCFCE7' : '#25D366',
            color: relanceEnvoyee ? '#15803D' : '#ffffff',
            cursor: relanceEnCours ? 'default' : 'pointer',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          {relanceEnvoyee ? '✓ Relancé' : relanceEnCours ? '…' : '💬 WhatsApp'}
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

  // Données dynamiques
  const [creances, setCreances] = useState<(Creance & { telephoneParent?: string })[]>([]);
  const [mapClasses, setMapClasses] = useState<Record<string, string>>({}); // Stocke ID classe -> Nom classe
  const [nomEcole, setNomEcole] = useState<string>('');
  const [anneeEncours, setAnneeEncours] = useState<string>('');
  const [periodeEncours, setPeriodeEncours] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── CHARGEMENT ET DÉROULÉ SUPABASE ──
  useEffect(() => {
    async function chargerDonneesEtLiaisons() {
      try {
        setLoading(true);
        setErrorMsg(null);

        // 1. École (`schools`)
        let schoolData = null;
        if (ecoleId) {
          const { data } = await supabase
            .from('schools')
            .select('nom, periode_courante, annee_scolaire_courante')
            .eq('id', ecoleId)
            .maybeSingle();
          schoolData = data;

          if (schoolData) {
            setNomEcole(schoolData.nom || '');
            setAnneeEncours(schoolData.annee_scolaire_courante || '');
            setPeriodeEncours(schoolData.periode_courante || '');
          }
        }

        // 2. Table `classes` (pour afficher les vrais noms de classes au lieu des IDs)
        const { data: dbClasses } = await supabase
          .from('classes')
          .select('*');

        const classesMapping: Record<string, string> = {};
        (dbClasses || []).forEach((c: any) => {
          classesMapping[String(c.id).trim()] = c.nom || c.name || c.libelle || `Classe ${c.id}`;
        });
        setMapClasses(classesMapping);

        // 3. Élèves (`students`) - Récupération incluant la colonne parentTel
        const { data: dbStudents, error: errStudents } = await supabase
          .from('students')
          .select('*');

        if (errStudents) throw errStudents;

        let elevesFiltres = (dbStudents || []).filter((s: any) => {
          if (!ecoleId) return true;
          return String(s.school_id).trim() === String(ecoleId).trim();
        });

        if (elevesFiltres.length === 0 && dbStudents && dbStudents.length > 0) {
          elevesFiltres = dbStudents;
        }

        // 4. Tarifs de scolarité (`scolarite`)
        const { data: dbScolarite, error: errScolarite } = await supabase
          .from('scolarite')
          .select('*');

        if (errScolarite) throw errScolarite;

        // 5. Paiements (`paiements`)
        const { data: dbPaiements, error: errPaiements } = await supabase
          .from('paiements')
          .select('*');

        if (errPaiements) throw errPaiements;

        // 6. CONSTRUCTION DES CRÉANCES
        const creancesConstruites = elevesFiltres.map((student: any) => {
          const studentClassId = String(student.class_id || '').trim();

          // Tarif lié à la classe de l'élève
          const scolaritesClasse = (dbScolarite || []).filter(
            (sc: any) => String(sc.classeid).trim() === studentClassId
          );

          const totalDu = scolaritesClasse.reduce(
            (sum: number, item: any) => sum + (Number(item.scolarite) || 0),
            0
          );

          // Versements de l'élève
          const paiementsEleve = (dbPaiements || []).filter(
            (p: any) => String(p.eleveid).trim() === String(student.id).trim()
          );

          const totalPaye = paiementsEleve.reduce(
            (sum: number, p: any) => sum + (Number(p.montant) || 0),
            0
          );

          const solde = totalPaye - totalDu;

          let statutCalcul: StatutPaiement = 'en_attente';
          if (totalPaye >= totalDu && totalDu > 0) {
            statutCalcul = 'paye';
          } else if (totalPaye > 0) {
            statutCalcul = 'partiel';
          }

          const paiementsFormates: Paiement[] = paiementsEleve.map((p: any) => ({
            id: String(p.id),
            eleveId: String(student.id),
            fraisId: '',
            frais: {
              id: '',
              ecoleId: String(student.school_id || ecoleId),
              anneeScolaire: schoolData?.annee_scolaire_courante || '',
              typeFrais: p.typefrais || 'scolarite',
              montant: totalDu,
              devise: 'XOF',
              description: 'Frais de Scolarité'
            },
            montantPaye: Number(p.montant) || 0,
            montantDu: totalDu,
            statut: statutCalcul,
            provider: (p.provider as ProviderMobileMoney) || 'especes',
            reference: p.reference || `REF-${p.id}`,
            dateEcheance: '',
            datePaiement: p.date || p.created_at,
            notifEnvoyee: false,
            createdAt: p.created_at || ''
          }));

          if (paiementsFormates.length === 0) {
            paiementsFormates.push({
              id: `p-init-${student.id}`,
              eleveId: String(student.id),
              fraisId: '',
              frais: {
                id: '',
                ecoleId: String(student.school_id || ecoleId),
                anneeScolaire: schoolData?.annee_scolaire_courante || '',
                typeFrais: 'Scolarité' as TypeFrais,
                montant: totalDu,
                devise: 'XOF',
                description: 'Frais de Scolarité'
              },
              montantPaye: 0,
              montantDu: totalDu,
              statut: statutCalcul,
              provider: 'especes',
              reference: `EC-${student.id}`,
              dateEcheance: '',
              notifEnvoyee: false,
              createdAt: ''
            });
          }

          const eleveFormate: Eleve = {
            id: String(student.id),
            nom: student.nom || '',
            prenom: student.prenom || '',
            dateNaissance: '',
            lieuNaissance: '',
            classeId: studentClassId,
            ecoleId: String(student.school_id || ecoleId),
            numeroEleve: student.matricule || `ELEVE-${student.id}`,
            parentIds: [],
            redoublant: false,
            createdAt: ''
          };

          // Extraction directe depuis la colonne parentTel
          const telephoneParentVal = student.parentTel || student.parenttel || '';

          return {
            eleveId: String(student.id),
            totalDu,
            totalPaye,
            solde,
            joursRetard: (statutCalcul !== 'paye' && totalPaye < totalDu) ? 15 : 0,
            eleve: eleveFormate,
            paiements: paiementsFormates,
            telephoneParent: String(telephoneParentVal).trim()
          };
        });

        setCreances(creancesConstruites);
      } catch (err: any) {
        console.error('Erreur Supabase :', err);
        setErrorMsg(err.message || 'Erreur lors du chargement.');
      } finally {
        setLoading(false);
      }
    }

    chargerDonneesEtLiaisons();
  }, [ecoleId]);

  // Statistiques
  const stats = useMemo(() => {
    const total    = creances.reduce((s, c) => s + c.totalDu,   0);
    const encaisse = creances.reduce((s, c) => s + c.totalPaye, 0);
    const reste    = total - encaisse;
    const taux     = total > 0 ? Math.round((encaisse / total) * 100) : 0;
    const nbRetard = creances.filter(c => c.paiements[0]?.statut === 'retard').length;
    return { total, encaisse, reste, taux, nbRetard };
  }, [creances]);

  // Filtrage
  const creancesFiltrees = useMemo(() => {
    return creances.filter(c => {
      const nomComplet = `${c.eleve.prenom} ${c.eleve.nom}`.toLowerCase();
      const classeNom  = (mapClasses[c.eleve.classeId] || '').toLowerCase();
      const matchRecherche = recherche === '' || 
        nomComplet.includes(recherche.toLowerCase()) || 
        classeNom.includes(recherche.toLowerCase());

      const statutCourant  = c.paiements[0]?.statut || 'en_attente';
      const matchStatut    = filtreStatut === 'tous' || statutCourant === filtreStatut;
      return matchRecherche && matchStatut;
    });
  }, [creances, filtreStatut, recherche, mapClasses]);

  // ── LOGIQUE DE RELANCE PAR WHATSAPP VIA PARENTTEL ──
  const handleRelance = useCallback((creance: Creance & { telephoneParent?: string }) => {
    const telephone = creance.telephoneParent;
    const eleveNom = `${creance.eleve.prenom} ${creance.eleve.nom}`;
    const resteAPayer = Math.abs(creance.solde);

    if (!telephone) {
      alert(`Aucun numéro de téléphone parent (parentTel) n'est renseigné pour l'élève ${eleveNom}.`);
      return;
    }

    setRelancesEnCours(prev => new Set(prev).add(creance.eleveId));

    // Formatage international du numéro (Par défaut Bénin +229)
    let phoneClean = telephone.replace(/[\s\-\(\)]/g, '');
    if (!phoneClean.startsWith('+') && !phoneClean.startsWith('229')) {
      phoneClean = `229${phoneClean}`;
    } else if (phoneClean.startsWith('+')) {
      phoneClean = phoneClean.substring(1);
    }

    // Message pré-rempli
    const message = `Bonjour,\n\nNous vous contactons concernant la scolarité de l'élève *${eleveNom}* dans notre établissement ${nomEcole ? `(${nomEcole})` : ''}.\n\nLe montant restant à régler s'élève à *${formatXOF(resteAPayer)}*.\nMerci de bien vouloir régulariser ce paiement dès que possible.\n\nCordialement,\nLa Direction - AIDEDUC.`;

    const url = `https://wa.me/${phoneClean}?text=${encodeURIComponent(message)}`;

    // Ouverture du lien WhatsApp
    window.open(url, '_blank');

    setRelancesEnCours(prev => { const s = new Set(prev); s.delete(creance.eleveId); return s; });
    setRelancesEnvoyees(prev => new Set(prev).add(creance.eleveId));
  }, [nomEcole]);

  const handleRelancerTous = useCallback(async () => {
    const creancesArelancer = creances.filter(c => 
      ['retard', 'en_attente', 'partiel'].includes(c.paiements[0]?.statut) && c.solde < 0
    );

    if (creancesArelancer.length === 0) {
      alert("Aucune créance en retard ou non soldée à relancer.");
      return;
    }

    if (window.confirm(`Vous allez ouvrir les relances WhatsApp (parentTel) pour ${creancesArelancer.length} élève(s). Voulez-vous continuer ?`)) {
      for (const c of creancesArelancer) {
        handleRelance(c);
      }
    }
  }, [creances, handleRelance]);

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', backgroundColor: '#F5F7FA' }}>
        <div style={{ textAlign: 'center', color: '#1B3A5C', fontWeight: '500' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚡</div>
          Chargement des classes et des frais...
        </div>
      </div>
    );
  }

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
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 1 }}>
              {periodeEncours || 'Suivi Financier'} {nomEcole ? `— ${nomEcole}` : ''} {anneeEncours ? `• ${anneeEncours}` : ''}
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
              background: '#25D366', color: '#fff', fontWeight: 600,
              fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            💬 Relancer par WhatsApp
          </button>
        </div>
      </header>

      <main style={{ padding: '16px 20px', maxWidth: 900, margin: '0 auto' }}>

        {errorMsg && (
          <div style={{ backgroundColor: '#FCEBEB', color: '#A32D2D', padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            ⚠️ {errorMsg}
          </div>
        )}

        {/* ── KPIs DYNAMIQUES ── */}
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

        {/* Barre de progression */}
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
            {/* Recherche par élève ou classe */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <input
                type="search"
                placeholder="Rechercher par élève ou classe…"
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
                  Aucun élève trouvé.
                </div>
              ) : (
                creancesFiltrees.map(creance => (
                  <CreanceRow
                    key={creance.eleveId}
                    creance={creance}
                    nomClasse={mapClasses[creance.eleve.classeId] || 'Classe N/A'}
                    onRelance={handleRelance}
                    relanceEnCours={relancesEnCours.has(creance.eleveId)}
                    relanceEnvoyee={relancesEnvoyees.has(creance.eleveId)}
                  />
                ))
              )}
            </div>

            {relancesEnvoyees.size > 0 && (
              <p style={{
                fontSize: 12, color: '#15803D', textAlign: 'center', marginTop: 12,
                background: '#DCFCE7', borderRadius: 8, padding: '8px 14px',
              }}>
                💬 {relancesEnvoyees.size} relance{relancesEnvoyees.size > 1 ? 's' : ''} WhatsApp initiée{relancesEnvoyees.size > 1 ? 's' : ''} avec succès.
              </p>
            )}
          </>
        )}

        {onglet === 'transactions' && (
          <div style={{
            background: '#fff', border: '0.5px solid #DEE2E6',
            borderRadius: 12, overflow: 'hidden',
          }}>
            {creances.filter(c => c.totalPaye > 0).length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#6C757D', fontSize: 13 }}>
                Aucune transaction enregistrée.
              </div>
            ) : (
              creances.filter(c => c.totalPaye > 0).map((creance, idx, arr) => {
                const p = creance.paiements[0] || { provider: 'especes', reference: 'N/A' };
                const providerKey = p.provider in PROVIDER_LABELS ? p.provider : 'especes';
                const nomClasse = mapClasses[creance.eleve.classeId] || 'Classe N/A';
                
                return (
                  <div key={creance.eleveId} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px',
                    borderBottom: idx < arr.length - 1 ? '0.5px solid #F0F0F0' : 'none',
                  }}>
                    <span style={{ fontSize: 18 }}>
                      {{ orange_money: '🟠', wave: '🔵', mtn_money: '🟡', moov_money: '🟢', carte_bancaire: '💳', especes: '💵' }[providerKey] || '💵'}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>
                        {creance.eleve.nom} {creance.eleve.prenom}
                      </div>
                      <div style={{ fontSize: 11, color: '#6C757D' }}>
                        {nomClasse} • {PROVIDER_LABELS[providerKey] || p.provider} • Réf. {p.reference}
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
              })
            )}
          </div>
        )}
      </main>
    </div>
  );
}