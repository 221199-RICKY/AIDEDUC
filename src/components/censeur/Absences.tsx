// ─────────────────────────────────────────────
// EduConnect West Africa — Absences.tsx
// Correctif Erreurs 400 / 404 & Gestion par Créneaux / Cours
// ─────────────────────────────────────────────

import  { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../utils/supabaseClient';

interface AbsencesProps {
  ecoleId: string;
  onBack: () => void;
  isOnline: boolean;
}

type StatutPresence = 'present' | 'absent' | 'retard';

interface EleveAbsence {
  id: string;
  nom: string;
  prenom: string;
  parentTel?: string;
  statut: StatutPresence;
  motif?: string;
}

interface ClasseSummary {
  id: string;
  nom: string;
  totalEleves: number;
  presents: number;
  absents: number;
  retards: number;
  appelFait: boolean;
}

// ─────────────────────────────────────────────
// ÉTAPE 2 : FONCTION DE DÉTECTION DU CRÉNEAU (Harmonisée)
// ─────────────────────────────────────────────
const getCreneauActuel = (): string => {
  const heure = new Date().getHours();
  if (heure >= 7 && heure < 9) return '08:00-09:00';
  if (heure >= 9 && heure < 11) return '09:00-11:00';
  if (heure >= 11 && heure < 13) return '11:00-13:00';
  if (heure >= 13 && heure < 15) return '13:00-15:00';
  if (heure >= 15 && heure < 17) return '15:00-17:00';
  
  const hDeb = String(heure).padStart(2, '0');
  const hFin = String((heure + 1) % 24).padStart(2, '0');
  return `${hDeb}:00-${hFin}:00`;
};

export default function Absences({ ecoleId, onBack, }: AbsencesProps) {
  const [dateSelectionnee, setDateSelectionnee] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [classes, setClasses] = useState<{ id: string; nom: string }[]>([]);
  const [selectedClasseId, setSelectedClasseId] = useState<string>('');
  const [eleves, setEleves] = useState<EleveAbsence[]>([]);
  
  const [resumeClasses, setResumeClasses] = useState<ClasseSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 1. CHARGEMENT DE LA TABLE `classes`
  useEffect(() => {
    async function chargerClasses() {
      try {
        setLoading(true);
        const { data, error } = await supabase.from('classes').select('*');

        if (error) {
          console.warn('Vérifiez que la table classes existe :', error.message);
          return;
        }

        const list = (data || []).map((c: any) => ({
          id: String(c.id).trim(),
          nom: c.nom || c.name || c.libelle || `Classe ${c.id}`,
        }));

        setClasses(list);
        if (list.length > 0 && !selectedClasseId) {
          setSelectedClasseId(list[0].id);
        }
      } catch (err: any) {
        console.error('Erreur Classes :', err);
      } finally {
        setLoading(false);
      }
    }

    chargerClasses();
  }, [ecoleId]);

  // 2. CHARGEMENT DE LA TABLE `students` ET SÉCURISATION DE `absences`
  const chargerDonnees = useCallback(async () => {
    if (classes.length === 0) return;

    try {
      setLoading(true);
      setMessage(null);

      // A. Récupération des élèves (table `students`)
      const { data: dbStudents, error: errStudents } = await supabase
        .from('students')
        .select('*');

      if (errStudents) {
        console.error('Erreur chargement table students :', errStudents);
        throw errStudents;
      }

      const tousLesEleves = dbStudents || [];

      // B. Récupération de TOUTES les absences de la journée sélectionnée
      let dbAbsences: any[] = [];
      try {
        const { data: dataAbs, error: errAbs } = await supabase
          .from('absences')
          .select('*')
          .eq('date', dateSelectionnee);

        if (errAbs) {
          console.warn('Avertissement lecture table absences :', errAbs.message);
        } else {
          dbAbsences = dataAbs || [];
        }
      } catch (e) {
        console.warn('Impossible de lire la table absences.', e);
      }

      // Indexation des absences par ID élève
      const absencesMap = new Map<string, { statut: StatutPresence; motif?: string }>();
      dbAbsences.forEach((a: any) => {
        const idKey = String(a.student_id || a.eleve_id || a.eleveid || '').trim();
        if (idKey) {
          absencesMap.set(idKey, {
            statut: (a.statut as StatutPresence) || 'absent',
            motif: a.motif || '',
          });
        }
      });

      // C. Calcul de la synthèse globale
      const summaries: ClasseSummary[] = classes.map((cls) => {
        const elevesClasse = tousLesEleves.filter((s: any) => {
          const classIdEleve = String(s.class_id || s.classe_id || s.classeid || '').trim();
          return classIdEleve === cls.id;
        });

        let presents = 0;
        let absents = 0;
        let retards = 0;
        let appelFait = false;

        elevesClasse.forEach((s: any) => {
          const idEleve = String(s.id).trim();
          const record = absencesMap.get(idEleve);
          if (record) {
            appelFait = true;
            if (record.statut === 'present') presents++;
            if (record.statut === 'absent') absents++;
            if (record.statut === 'retard') retards++;
          }
        });

        return {
          id: cls.id,
          nom: cls.nom,
          totalEleves: elevesClasse.length,
          presents,
          absents,
          retards,
          appelFait,
        };
      });

      setResumeClasses(summaries);

      // D. Élèves de la classe active
      const activeClasseId = selectedClasseId || classes[0]?.id;

      const elevesClasseActive = tousLesEleves
        .filter((s: any) => {
          const classIdEleve = String(s.class_id || s.classe_id || s.classeid || '').trim();
          return classIdEleve === String(activeClasseId).trim();
        })
        .map((s: any) => {
          const idEleve = String(s.id).trim();
          const record = absencesMap.get(idEleve);
          return {
            id: idEleve,
            nom: s.nom || s.last_name || '',
            prenom: s.prenom || s.first_name || '',
            parentTel: s.parentTel || s.parenttel || s.phone || s.telephone || '',
            statut: record ? record.statut : 'present',
            motif: record ? record.motif : '',
          };
        });

      setEleves(elevesClasseActive);
    } catch (err: any) {
      console.error('Erreur Globale Supabase :', err);
      setMessage({ type: 'error', text: 'Vérifiez la connexion ou les tables de votre base Supabase.' });
    } finally {
      setLoading(false);
    }
  }, [classes, dateSelectionnee, selectedClasseId]);

  useEffect(() => {
    chargerDonnees();
  }, [chargerDonnees]);

  const handleStatutChange = (eleveId: string, nouveauStatut: StatutPresence) => {
    setEleves((prev) =>
      prev.map((e) => (e.id === eleveId ? { ...e, statut: nouveauStatut } : e))
    );
  };

  // ─────────────────────────────────────────────
  // ÉTAPE 3 : SAUVEGARDE DE L'APPEL PAR CRÉNEAU
  // ─────────────────────────────────────────────
  const handleEnregistrerAppel = async () => {
    if (!selectedClasseId || eleves.length === 0) return;

    try {
      setSaving(true);
      setMessage(null);

      const creneauCourant = getCreneauActuel();

      const records = eleves.map((e) => ({
        student_id: String(e.id).trim(),
        class_id: String(selectedClasseId).trim(),
        school_id: ecoleId && String(ecoleId).trim() !== '' ? String(ecoleId).trim() : null,
        date: dateSelectionnee,
        time_slot: creneauCourant,
        subject_id: 'Général',
        statut: e.statut,
        motif: e.motif && e.motif.trim() !== '' ? e.motif.trim() : null,
      }));

      const { error } = await supabase.from('absences').upsert(records, {
        onConflict: 'student_id,date,time_slot',
      });

      if (error) throw error;

      setMessage({
        type: 'success',
        text: `Appel du créneau (${creneauCourant}) enregistré dans Supabase !`,
      });
      await chargerDonnees();
    } catch (err: any) {
      console.error('Erreur sauvegarde :', err);
      setMessage({
        type: 'error',
        text: err.message || 'Erreur d\'enregistrement dans la table absences.',
      });
    } finally {
      setSaving(false);
    }
  };

  const statsGlobales = useMemo(() => {
    let totEleves = 0;
    let totPresents = 0;
    let totAbsents = 0;
    let totRetards = 0;

    resumeClasses.forEach((c) => {
      totEleves += c.totalEleves;
      totPresents += c.presents;
      totAbsents += c.absents;
      totRetards += c.retards;
    });

    const tauxPresence = totEleves > 0 ? Math.round((totPresents / totEleves) * 100) : 0;
    return { totEleves, totPresents, totAbsents, totRetards, tauxPresence };
  }, [resumeClasses]);

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#F5F7FA', minHeight: '100vh' }}>
      
      {/* HEADER */}
      <header style={{ background: '#1B3A5C', color: '#fff', padding: '14px 20px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={onBack}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: 8,
              width: 32,
              height: 32,
              cursor: 'pointer',
              color: '#fff',
              fontSize: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ←
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Appels & Suivi des Absences</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>
              Créneau détecté : <strong>{getCreneauActuel()}</strong>
            </div>
          </div>
          <input
            type="date"
            value={dateSelectionnee}
            onChange={(e) => setDateSelectionnee(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: 8,
              border: 'none',
              fontSize: 13,
              fontWeight: 600,
              background: '#fff',
              color: '#1B3A5C'
            }}
          />
        </div>
      </header>

      <main style={{ padding: '16px 20px', maxWidth: 1000, margin: '0 auto' }}>
        
        {/* KPI GLOBAUX */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 16 }}>
          <div style={{ background: '#fff', padding: '12px 14px', borderRadius: 10, border: '0.5px solid #DEE2E6' }}>
            <div style={{ fontSize: 11, color: '#6C757D' }}>Taux de Présence</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: statsGlobales.tauxPresence >= 80 ? '#1D9E75' : '#BA7517' }}>
              {statsGlobales.tauxPresence} %
            </div>
          </div>
          <div style={{ background: '#fff', padding: '12px 14px', borderRadius: 10, border: '0.5px solid #DEE2E6' }}>
            <div style={{ fontSize: 11, color: '#6C757D' }}>Total Absents</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#A32D2D' }}>{statsGlobales.totAbsents}</div>
          </div>
          <div style={{ background: '#fff', padding: '12px 14px', borderRadius: 10, border: '0.5px solid #DEE2E6' }}>
            <div style={{ fontSize: 11, color: '#6C757D' }}>Total Retards</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#BA7517' }}>{statsGlobales.totRetards}</div>
          </div>
        </div>

        {/* VUE SYNTHÉTIQUE PAR CLASSE */}
        <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #DEE2E6', padding: 14, marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, margin: '0 0 12px 0', color: '#1B3A5C' }}>
            📊 Aperçu des appels ({getCreneauActuel()})
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
            {resumeClasses.map((c) => {
              const isSelected = c.id === selectedClasseId;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedClasseId(c.id)}
                  style={{
                    padding: 10,
                    borderRadius: 8,
                    cursor: 'pointer',
                    border: isSelected ? '2px solid #185FA5' : '1px solid #E9ECEF',
                    background: isSelected ? '#F0F7FF' : '#F8F9FA',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: '#1A1A2E' }}>{c.nom}</span>
                    <span style={{
                      fontSize: 10, padding: '2px 6px', borderRadius: 4,
                      background: c.appelFait ? '#EAF3DE' : '#FAEEDA',
                      color: c.appelFait ? '#27500A' : '#633806',
                      fontWeight: 600
                    }}>
                      {c.appelFait ? '✓ Fait' : '⏳ Attente'}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: '#6C757D', display: 'flex', gap: 8 }}>
                    <span>🟢 {c.presents}</span>
                    <span>🔴 {c.absents}</span>
                    <span>🟠 {c.retards}</span>
                    <span style={{ marginLeft: 'auto', fontWeight: 600 }}>({c.totalEleves} él.)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SELECTION CLASSE & FORMULAIRE */}
        <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #DEE2E6', padding: 16 }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E' }}>Classe :</label>
              <select
                value={selectedClasseId}
                onChange={(e) => setSelectedClasseId(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #DEE2E6',
                  fontSize: 13,
                  fontWeight: 600,
                  background: '#F8F9FA',
                  color: '#1B3A5C',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.nom}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleEnregistrerAppel}
              disabled={saving || loading || eleves.length === 0}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: 'none',
                background: eleves.length === 0 ? '#ADB5BD' : '#1D9E75',
                color: '#fff',
                fontWeight: 600,
                fontSize: 13,
                cursor: saving || eleves.length === 0 ? 'default' : 'pointer',
              }}
            >
              {saving ? 'Enregistrement...' : '💾 Valider l\'appel'}
            </button>
          </div>

          {message && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                marginBottom: 12,
                fontSize: 12,
                background: message.type === 'success' ? '#EAF3DE' : '#FCEBEB',
                color: message.type === 'success' ? '#27500A' : '#A32D2D',
              }}
            >
              {message.text}
            </div>
          )}

          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#6C757D' }}>⚡ Chargement des données...</div>
          ) : eleves.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#6C757D', background: '#F8F9FA', borderRadius: 8 }}>
              Aucun élève répertorié dans la table `students` pour cette classe.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {eleves.map((eleve) => (
                <div
                  key={eleve.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: '#F8F9FA',
                    border: '0.5px solid #E9ECEF',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E', minWidth: 160 }}>
                    {eleve.nom} {eleve.prenom}
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['present', 'absent', 'retard'] as const).map((st) => {
                      const isActive = eleve.statut === st;
                      const colors: Record<StatutPresence, { bg: string; text: string }> = {
                        present: { bg: '#EAF3DE', text: '#27500A' },
                        absent: { bg: '#FCEBEB', text: '#A32D2D' },
                        retard: { bg: '#FAEEDA', text: '#633806' },
                      };
                      const labels: Record<StatutPresence, string> = {
                        present: 'Présent',
                        absent: 'Absent',
                        retard: 'Retard',
                      };

                      return (
                        <button
                          key={st}
                          onClick={() => handleStatutChange(eleve.id, st)}
                          style={{
                            padding: '5px 10px',
                            borderRadius: 6,
                            border: isActive ? '1.5px solid currentColor' : '1px solid #DEE2E6',
                            background: isActive ? colors[st].bg : '#fff',
                            color: isActive ? colors[st].text : '#6C757D',
                            fontSize: 11,
                            fontWeight: isActive ? 700 : 500,
                            cursor: 'pointer',
                          }}
                        >
                          {labels[st]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}