// ─────────────────────────────────────────────
// EduConnect West Africa — Scolarite.tsx
// src/components/Scolarite.tsx
// Liaison : Students (class_id, parentTel) ➔ Classes (nom) ➔ Scolarite (scolarite) ➔ Paiements
// Canal de Relance : WhatsApp (déclenché via parentTel)
// ─────────────────────────────────────────────

import { useState, useMemo, useCallback, useEffect } from 'react';
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
  paye:       { label: '✓ Payé',       bg: 'bg-emerald-100', text: 'text-emerald-800' },
  partiel:    { label: '½ Partiel',    bg: 'bg-indigo-100',  text: 'text-indigo-800' },
  en_attente: { label: '⏳ En attente', bg: 'bg-amber-100',   text: 'text-amber-800' },
  retard:     { label: '⚠ Retard',     bg: 'bg-rose-100',    text: 'text-rose-800' },
};

const PROVIDER_LABELS: Record<string, string> = {
  orange_money:   '🟠 Orange Money',
  wave:           '🔵 Wave',
  mtn_money:      '🟡 MTN Money',
  moov_money:     '🟢 Moov Money',
  carte_bancaire: '💳 Carte bancaire',
  especes:        '💵 Espèces',
};

// ─── Sous-composant Ligne Créance (100% RESPONSIVE TAILWIND) ─────────────

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
    <div className={`flex items-center gap-3 p-3.5 border-b border-slate-100 transition-colors ${urgent ? 'bg-red-50/50' : 'bg-white'}`}>
      
      {/* 1. À GAUCHE : AVATAR (INITIALES) */}
      <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${urgent ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
        {initiales}
      </div>

      {/* 2. AU MILIEU : BLOC D'INFORMATIONS ÉLÈVE (FLEX-1) */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        {/* Nom & Prénom */}
        <span className="text-sm font-semibold text-slate-900 truncate">
          {creance.eleve.prenom} {creance.eleve.nom}
        </span>

        {/* Badge Classe */}
        <div>
          <span className="inline-block bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded border border-slate-200">
            {nomClasse}
          </span>
        </div>

        {/* Montant Dû / Solde */}
        <div className="text-xs font-medium">
          {creance.solde < 0 ? (
            <span className="text-red-600 font-semibold">
              − {formatXOF(Math.abs(creance.solde))}
            </span>
          ) : (
            <span className="text-emerald-600 font-semibold">✓ Soldé</span>
          )}
          <span className="text-[11px] text-slate-400 font-normal ml-1">
            sur {formatXOF(creance.totalDu)}
          </span>
        </div>

        {/* Retard */}
        {creance.joursRetard > 0 && (
          <span className={`text-[11px] font-medium ${urgent ? 'text-red-600' : 'text-amber-600'}`}>
            • {creance.joursRetard}j de retard
          </span>
        )}
      </div>

      {/* 3. À DROITE : BADGE DE STATUT + BOUTON D'ACTION */}
      <div className="shrink-0 flex flex-col items-end gap-2">
        {/* Badge Statut */}
        <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
          {cfg.label}
        </span>

        {/* Bouton relance WhatsApp */}
        {paiement && paiement.statut !== 'paye' && (
          <button
            onClick={() => onRelance(creance)}
            disabled={relanceEnCours}
            className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-colors ${
              relanceEnvoyee 
                ? 'bg-emerald-100 text-emerald-800' 
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {relanceEnvoyee ? '✓ Relancé' : relanceEnCours ? '…' : '💬 WhatsApp'}
          </button>
        )}
      </div>

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
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center text-slate-800 font-medium">
          <div className="text-3xl mb-3">⚡</div>
          Chargement des classes et des frais...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen">

      {/* ── HEADER ── */}
      <header className="bg-slate-900 text-white p-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <button
            onClick={onBack}
            className="bg-white/15 hover:bg-white/25 border-none rounded-lg w-8 h-8 cursor-pointer text-white text-lg flex items-center justify-center transition-colors"
            aria-label="Retour"
          >
            ←
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-base font-semibold truncate">Frais de scolarité</div>
            <div className="text-xs text-white/75 truncate">
              {periodeEncours || 'Suivi Financier'} {nomEcole ? `— ${nomEcole}` : ''} {anneeEncours ? `• ${anneeEncours}` : ''}
            </div>
          </div>
          {!isOnline && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-medium shrink-0">
              ⚡ Hors ligne
            </span>
          )}
          <button
            onClick={handleRelancerTous}
            className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs cursor-pointer flex items-center gap-1.5 shrink-0 transition-colors"
          >
            💬 Relancer par WhatsApp
          </button>
        </div>
      </header>

      <main className="p-4 max-w-4xl mx-auto space-y-4">

        {errorMsg && (
          <div className="bg-rose-50 text-rose-700 p-3 rounded-lg text-sm border border-rose-200">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* ── KPIs DYNAMIQUES ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total attendu',      value: formatXOF(stats.total),    color: 'text-slate-900', icon: '🏫' },
            { label: 'Encaissé',           value: formatXOF(stats.encaisse), color: 'text-emerald-600', icon: '✅' },
            { label: 'Reste à collecter',  value: formatXOF(stats.reste),    color: 'text-rose-600', icon: '⚠️' },
            { label: 'Taux recouvrement',  value: `${stats.taux} %`,         color: stats.taux >= 80 ? 'text-emerald-600' : 'text-amber-600', icon: '📊' },
          ].map(k => (
            <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
              <div className="text-xl mb-1">{k.icon}</div>
              <div className={`text-base sm:text-lg font-bold truncate ${k.color}`}>{k.value}</div>
              <div className="text-xs text-slate-500 mt-1">{k.label}</div>
            </div>
          ))}
        </div>

        {/* Barre de progression */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
          <div className="flex justify-between mb-1.5 text-xs">
            <span className="text-slate-500">Recouvrement global</span>
            <span className={`font-semibold ${stats.taux >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {stats.taux} %
            </span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                stats.taux >= 80 ? 'bg-emerald-500' : stats.taux >= 60 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${stats.taux}%` }}
            />
          </div>
        </div>

        {/* ── ONGLETS ── */}
        <div className="flex border-b border-slate-200 gap-4">
          {(['creances', 'transactions'] as const).map(o => (
            <button
              key={o}
              onClick={() => setOnglet(o)}
              className={`pb-2 text-sm font-medium border-b-2 cursor-pointer transition-colors ${
                onglet === o ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {o === 'creances' ? '⚠️ Créances' : '✅ Transactions'}
            </button>
          ))}
        </div>

        {onglet === 'creances' && (
          <div className="space-y-3">
            {/* Recherche par élève ou classe */}
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="search"
                placeholder="Rechercher par élève ou classe…"
                value={recherche}
                onChange={e => setRecherche(e.target.value)}
                className="flex-1 p-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-blue-500"
              />
              <div className="flex flex-wrap gap-1">
                {(['tous', 'retard', 'en_attente', 'partiel', 'paye'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFiltreStatut(f)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                      filtreStatut === f ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {{ tous: 'Tous', retard: 'En retard', en_attente: 'En attente', partiel: 'Partiel', paye: 'Payés' }[f]}
                  </button>
                ))}
              </div>
            </div>

            {/* Liste des créances */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs divide-y divide-slate-100">
              {creancesFiltrees.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
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
              <p className="text-xs text-emerald-800 text-center bg-emerald-100 rounded-lg p-2.5">
                💬 {relancesEnvoyees.size} relance{relancesEnvoyees.size > 1 ? 's' : ''} WhatsApp initiée{relancesEnvoyees.size > 1 ? 's' : ''} avec succès.
              </p>
            )}
          </div>
        )}

        {onglet === 'transactions' && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs divide-y divide-slate-100">
            {creances.filter(c => c.totalPaye > 0).length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                Aucune transaction enregistrée.
              </div>
            ) : (
              creances.filter(c => c.totalPaye > 0).map((creance) => {
                const p = creance.paiements[0] || { provider: 'especes', reference: 'N/A' };
                const providerKey = p.provider in PROVIDER_LABELS ? p.provider : 'especes';
                const nomClasse = mapClasses[creance.eleve.classeId] || 'Classe N/A';
                
                return (
                  <div key={creance.eleveId} className="flex items-center gap-3 p-3.5">
                    <span className="text-xl">
                      {{ orange_money: '🟠', wave: '🔵', mtn_money: '🟡', moov_money: '🟢', carte_bancaire: '💳', especes: '💵' }[providerKey] || '💵'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">
                        {creance.eleve.nom} {creance.eleve.prenom}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {nomClasse} • {PROVIDER_LABELS[providerKey] || p.provider} • Réf. {p.reference}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold text-emerald-600">
                        +{formatXOF(creance.totalPaye)}
                      </div>
                      {p.datePaiement && (
                        <div className="text-[10px] text-slate-400">
                          {new Date(p.datePaiement).toLocaleDateString('fr-FR')}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium shrink-0">
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