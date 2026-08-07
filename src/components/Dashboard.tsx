// ─────────────────────────────────────────────
// AIDEDUC West Africa — Dashboard.tsx
// src/components/Dashboard.tsx
// Interface d'accueil pour Directeur / Enseignant
// ─────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import type {
  User,
  Eleve,
  Paiement,
  Notification,
  UserRole,
} from '../types';

// ─── Types locaux ────────────────────────────

interface KPI {
  label: string;
  value: string | number;
  trend?: string;
  trendPositive?: boolean;
  color: 'blue' | 'green' | 'amber' | 'red' | 'purple';
  icon: string;
}

interface DashboardProps {
  user: User;
  onNavigate: (route: string) => void;
}

interface Notif {
  id: string;
  type: string;
  titre: string;
  corps: string;
  createdAt: string;
  lu: boolean;
}

// ─── Helpers ─────────────────────────────────

const COLOR_MAP: Record<string, { bg: string; text: string; accent: string }> = {
  blue:   { bg: '#E6F1FB', text: '#0C447C', accent: '#185FA5' },
  green:  { bg: '#EAF3DE', text: '#27500A', accent: '#1D9E75' },
  amber:  { bg: '#FAEEDA', text: '#633806', accent: '#BA7517' },
  red:    { bg: '#FCEBEB', text: '#A32D2D', accent: '#E24B4A' },
  purple: { bg: '#EEEDFE', text: '#3C3489', accent: '#534AB7' },
};

function formatXOF(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M XOF`;
  if (amount >= 1_000)     return `${(amount / 1_000).toFixed(0)}k XOF`;
  return `${amount.toLocaleString('fr-FR')} XOF`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60)  return `Il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24)    return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
}

// ─── ACCÈS RAPIDES (UNIQUEMENT POUR LE DIRECTEUR) ───
const QUICK_ACTIONS: Record<UserRole, Array<{ label: string; route: string; icon: string; color: string }>> = {
  directeur: [
    { label: 'Gérer les absences', route: '/absences',  icon: '📅', color: '#1D9E75' },
    { label: 'Suivi paiements',    route: '/scolarite', icon: '💳', color: '#BA7517' },
  ],
  enseignant:  [],
  comptable:   [],
  parent:      [],
  eleve:       [],
  super_admin: [],
};

// ─── Sous-composants ─────────────────────────

interface KPICardProps { kpi: KPI; }
function KPICard({ kpi }: KPICardProps) {
  const c = COLOR_MAP[kpi.color];
  return (
    <div style={{
      background: '#fff',
      border: '0.5px solid #DEE2E6',
      borderLeft: `4px solid ${c.accent}`,
      borderRadius: 12,
      padding: '14px 16px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ fontSize: 24, marginBottom: 8 }}>{kpi.icon}</div>
      <div style={{ fontSize: 24, fontWeight: 600, color: '#1A1A2E', lineHeight: 1 }}>
        {kpi.value}
      </div>
      <div style={{ fontSize: 12, color: '#6C757D', marginTop: 4 }}>{kpi.label}</div>
      {kpi.trend && (
        <div style={{
          fontSize: 11,
          marginTop: 6,
          color: kpi.trendPositive ? c.accent : '#BA7517',
          display: 'flex',
          alignItems: 'center',
          gap: 3,
        }}>
          {kpi.trendPositive ? '↑' : '↓'} {kpi.trend}
        </div>
      )}
    </div>
  );
}

interface NotifItemProps {
  notif: Notif;
  onRead: (id: string) => void;
}
function NotifItem({ notif, onRead }: NotifItemProps) {
  const icons: Record<string, string> = {
    absence: '📅', paiement: '💳', message: '💬', note: '📝',
  };
  return (
    <div
      onClick={() => onRead(notif.id)}
      style={{
        display: 'flex', gap: 10, padding: '10px 0',
        borderBottom: '0.5px solid #F0F0F0',
        cursor: 'pointer',
        opacity: notif.lu ? 0.65 : 1,
      }}
    >
      <div style={{ fontSize: 20, flexShrink: 0 }}>{icons[notif.type] ?? '🔔'}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: notif.lu ? 400 : 600 }}>{notif.titre}</div>
        <div style={{ fontSize: 11, color: '#6C757D', marginTop: 2 }}>{notif.corps}</div>
        <div style={{ fontSize: 10, color: '#ADB5BD', marginTop: 3 }}>{timeAgo(notif.createdAt)}</div>
      </div>
      {!notif.lu && (
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: '#185FA5', flexShrink: 0, marginTop: 4,
        }} />
      )}
    </div>
  );
}

// ─── COMPOSANT PRINCIPAL ─────────────────────

export default function Dashboard({ user, onNavigate }: DashboardProps) {
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const [nomEcole, setNomEcole] = useState<string>('AIDEDUC');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [loading, setLoading] = useState<boolean>(true);

  // Suivi de la connectivité réseau
  useEffect(() => {
    const handleOnline  = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Chargement des données Supabase
  useEffect(() => {
    async function chargerDonnees() {
      try {
        setLoading(true);

        const todayStr = new Date().toISOString().slice(0, 10);

        const [
          { data: schoolData },
          { data: studentsData },
          { data: classesData },
          { data: paiementsData },
          { data: absencesTodayData },
          { data: notifsData },
        ] = await Promise.all([
          supabase.from('schools').select('*'),
          supabase.from('students').select('*'),
          supabase.from('classes').select('*'),
          supabase.from('paiements').select('*'),
          supabase.from('absences').select('*').eq('date', todayStr),
          supabase.from('notifications').select('*').limit(10),
        ]);

        // Nom de l'école
        if (schoolData && schoolData.length > 0) {
          const s = schoolData[0];
          setNomEcole(s.nom ?? s.name ?? s.nom_ecole ?? 'AIDEDUC');
        }

        const totalEleves = studentsData?.length ?? 0;

        // CALCUL DU TAUX DE PRÉSENCE RÉEL DU JOUR
        const totalAbsentsAujourdhui = absencesTodayData?.length ?? 0;
        let tauxPresenceStr = '100 %';
        let trendPresence = 'Aucun absent aujourd\'hui';
        let isTrendPositive = true;

        if (totalEleves > 0) {
          const elevesPresents = Math.max(0, totalEleves - totalAbsentsAujourdhui);
          const pct = ((elevesPresents / totalEleves) * 100).toFixed(1);
          tauxPresenceStr = `${pct} %`;
          
          if (totalAbsentsAujourdhui > 0) {
            trendPresence = `${totalAbsentsAujourdhui} absent${totalAbsentsAujourdhui > 1 ? 's' : ''} enregistré${totalAbsentsAujourdhui > 1 ? 's' : ''}`;
            isTrendPositive = false;
          }
        }

        // Calcul total encaissé
        const totalEncaisse = (paiementsData ?? []).reduce(
          (sum, p) => sum + Number(p.montant ?? 0), 0
        );

        // Construction des KPIs réels
        if (user.role === 'enseignant') {
          const mesClassesCount = classesData?.length ?? 0;
          setKpis([
            { label: 'Mes classes',          value: mesClassesCount, trend: `${totalEleves} élèves au total`, trendPositive: true, color: 'blue',   icon: '🏫' },
            { label: 'Notes à saisir',       value: 0,               trend: 'Toutes à jour',                 trendPositive: true, color: 'amber',  icon: '📝' },
            { label: 'Présence aujourd\'hui',value: tauxPresenceStr, trend: trendPresence,                    trendPositive: isTrendPositive, color: 'green',  icon: '✅' },
            { label: 'Messages non lus',     value: 0,               trend: 'À jour',                         trendPositive: true, color: 'red',    icon: '💬' },
          ]);
        } else {
          setKpis([
            { label: 'Élèves inscrits',       value: totalEleves.toLocaleString('fr-FR'), trend: 'Inscrits en BDD', trendPositive: true, color: 'blue',   icon: '👥' },
            { label: 'Présence aujourd\'hui', value: tauxPresenceStr,                   trend: trendPresence,     trendPositive: isTrendPositive, color: 'green',  icon: '✅' },
            { label: 'Encaissé total',        value: formatXOF(totalEncaisse),            trend: 'Base Supabase',   trendPositive: true, color: 'amber',  icon: '💰' },
            { label: 'Classes actives',       value: classesData?.length ?? 0,           trend: 'Enregistrées',    trendPositive: true, color: 'purple', icon: '📊' },
          ]);
        }

        // Mappage des notifications
        if (notifsData && notifsData.length > 0) {
          const mappedNotifs: Notif[] = notifsData.map((n, idx) => ({
            id: String(n.id ?? idx),
            type: n.type ?? 'message',
            titre: n.titre ?? 'Notification',
            corps: n.corps ?? n.message ?? '',
            createdAt: n.created_at ?? n.createdAt ?? new Date().toISOString(),
            lu: Boolean(n.lu),
          }));
          setNotifications(mappedNotifs);
        } else {
          setNotifications([]);
        }

      } catch (err) {
        console.error('Erreur chargement Dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    chargerDonnees();
  }, [user.role]);

  const quickActions = QUICK_ACTIONS[user.role] ?? [];
  const nonLus = notifications.filter(n => !n.lu).length;

  function handleReadNotif(id: string) {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, lu: true } : n)
    );
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#F5F7FA', minHeight: '100vh' }}>

      {/* ── TOPBAR ── */}
      <header style={{
        background: '#1B3A5C', color: '#fff',
        padding: '14px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>AIDEDUC</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 1 }}>
            {nomEcole}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Badge offline */}
          {!isOnline && (
            <span style={{
              fontSize: 11, padding: '3px 10px', borderRadius: 20,
              background: '#FAEEDA', color: '#633806', fontWeight: 500,
            }}>
              ⚡ Hors ligne
            </span>
          )}
          {/* Notifications */}
          <button
            onClick={() => onNavigate('/notifications')}
            style={{
              position: 'relative', background: 'rgba(255,255,255,0.12)',
              border: 'none', borderRadius: 8, width: 36, height: 36,
              cursor: 'pointer', color: '#fff', fontSize: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            aria-label={`${nonLus} notification${nonLus > 1 ? 's' : ''} non lue${nonLus > 1 ? 's' : ''}`}
          >
            🔔
            {nonLus > 0 && (
              <span style={{
                position: 'absolute', top: 4, right: 4,
                width: 16, height: 16, borderRadius: '50%',
                background: '#E24B4A', color: '#fff',
                fontSize: 9, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid #1B3A5C',
              }}>
                {nonLus}
              </span>
            )}
          </button>
          {/* Avatar */}
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: '#F5A623', color: '#1B3A5C',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}
            title={`${user.prenom} ${user.nom} — ${user.role}`}
          >
            {user.prenom[0]}{user.nom[0]}
          </div>
        </div>
      </header>

      <main style={{ padding: '20px 24px', maxWidth: 1100, margin: '0 auto' }}>

        {/* ── SALUTATION ── */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: '#1A1A2E' }}>
            Bonjour, {user.prenom} 👋
          </h1>
          <p style={{ fontSize: 13, color: '#6C757D', marginTop: 3 }}>
            {new Date().toLocaleDateString('fr-FR', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            })}
          </p>
        </div>

        {/* ── KPIs ── */}
        <section aria-label="Indicateurs clés" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12,
          marginBottom: 24,
        }}>
          {kpis.map((kpi, i) => <KPICard key={i} kpi={kpi} />)}
        </section>

        {/* ── ACCÈS RAPIDE ── */}
        {quickActions.length > 0 && (
          <section aria-label="Accès rapide" style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 13, fontWeight: 500, color: '#6C757D', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Accès rapide
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: 10,
            }}>
              {quickActions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => onNavigate(action.route)}
                  style={{
                    background: '#fff',
                    border: '0.5px solid #DEE2E6',
                    borderRadius: 10,
                    padding: '12px 14px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    transition: 'box-shadow 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                >
                  <span style={{ fontSize: 22 }}>{action.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#1A1A2E' }}>
                    {action.label}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── ACTIVITÉ RÉCENTE ── */}
        <section aria-label="Notifications récentes" style={{
          background: '#fff', border: '0.5px solid #DEE2E6',
          borderRadius: 12, padding: 16,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
              🔔 Activité récente
              {nonLus > 0 && (
                <span style={{
                  fontSize: 10, padding: '1px 7px', borderRadius: 20,
                  background: '#E6F1FB', color: '#0C447C', fontWeight: 600,
                }}>{nonLus}</span>
              )}
            </h2>
            <button
              onClick={() => onNavigate('/notifications')}
              style={{ fontSize: 12, color: '#185FA5', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Tout marquer lu
            </button>
          </div>
          {notifications.length === 0 ? (
            <div style={{ fontSize: 12, color: '#6C757D', padding: '12px 0', textAlign: 'center' }}>
              Aucune notification récente
            </div>
          ) : (
            notifications.map(n => (
              <NotifItem key={n.id} notif={n} onRead={handleReadNotif} />
            ))
          )}
        </section>

      </main>
    </div>
  );
}