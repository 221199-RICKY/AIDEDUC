// ─────────────────────────────────────────────
// AIDEDUC West Africa — Dashboard.tsx
// src/components/Dashboard.tsx
// Interface d'accueil pour Directeur / Enseignant
// ─────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import type {
  User,
  Eleve,
  Absence,
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

// ─── Helpers ─────────────────────────────────

const COLOR_MAP: Record<string, { bg: string; text: string; accent: string }> = {
  blue:   { bg: '#E6F1FB', text: '#0C447C', accent: '#185FA5' },
  green:  { bg: '#EAF3DE', text: '#27500A', accent: '#1D9E75' },
  amber:  { bg: '#FAEEDA', text: '#633806', accent: '#BA7517' },
  red:    { bg: '#FCEBEB', text: '#A32D2D', accent: '#E24B4A' },
  purple: { bg: '#EEEDFE', text: '#3C3489', accent: '#534AB7' },
};

function formatXOF(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000)     return `${(amount / 1_000).toFixed(0)}k`;
  return amount.toLocaleString('fr-FR');
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

// ─── Données fictives (remplacées par API calls) ─

const MOCK_KPIS_DIRECTEUR: KPI[] = [
  { label: 'Élèves inscrits',       value: '1 248',  trend: '+34 vs an dernier', trendPositive: true,  color: 'blue',   icon: '👥' },
  { label: 'Présence aujourd\'hui', value: '96,2 %', trend: '+1,1 % vs hier',   trendPositive: true,  color: 'green',  icon: '✅' },
  { label: 'Encaissé ce mois',      value: '12,4M',  trend: '3,1M en attente',  trendPositive: false, color: 'amber',  icon: '💰' },
  { label: 'Moyenne générale',      value: '13,4/20',trend: '+0,4 vs T2',       trendPositive: true,  color: 'purple', icon: '📊' },
];

const MOCK_KPIS_ENSEIGNANT: KPI[] = [
  { label: 'Mes classes',          value: 3,       trend: '94 élèves au total',trendPositive: true,  color: 'blue',   icon: '🏫' },
  { label: 'Notes à saisir',       value: 12,      trend: 'Clôture le 30 juin',trendPositive: false, color: 'amber',  icon: '📝' },
  { label: 'Présence aujourd\'hui',value: '97 %',  trend: 'Terme. C — 1 absent',trendPositive: true,  color: 'green',  icon: '✅' },
  { label: 'Messages non lus',     value: 3,       trend: 'Dont 1 urgent',     trendPositive: false, color: 'red',    icon: '💬' },
];

const MOCK_ABSENCES_RECENTES: Array<{
  id: string; eleveNom: string; classe: string; date: string; matiere: string; joursRetard: number;
}> = [
  { id: '1', eleveNom: 'Amina Konaté',   classe: 'Terminale C', date: '2026-06-24', matiere: 'Maths',       joursRetard: 3 },
  { id: '2', eleveNom: 'Mohamed Bello',  classe: '3ème A',      date: '2026-06-23', matiere: 'Français',    joursRetard: 2 },
  { id: '3', eleveNom: 'Salimata Fall',  classe: '2nde B',      date: '2026-06-23', matiere: 'Histoire',    joursRetard: 2 },
  { id: '4', eleveNom: 'Komi Togbé',     classe: '1ère D',      date: '2026-06-25', matiere: 'Anglais',     joursRetard: 1 },
];

const MOCK_NOTIFICATIONS: Array<{
  id: string; type: string; titre: string; corps: string; createdAt: string; lu: boolean;
}> = [
  { id: '1', type: 'absence',      titre: 'Absence signalée',       corps: 'Ibrahim Konaté — Maths, 24 juin',         createdAt: new Date(Date.now() - 7_200_000).toISOString(),  lu: false },
  { id: '2', type: 'paiement',     titre: 'Paiement reçu',          corps: 'Famille Adjovi — 45 000 XOF via Orange',  createdAt: new Date(Date.now() - 14_400_000).toISOString(), lu: false },
  { id: '3', type: 'message',      titre: 'Message de Mme Konaté',  corps: 'Ibrahim pourra-t-il rattraper le cours ?', createdAt: new Date(Date.now() - 86_400_000).toISOString(), lu: true  },
  { id: '4', type: 'note',         titre: 'Notes clôturées',        corps: 'Terminale C — Physique-Chimie',            createdAt: new Date(Date.now() - 172_800_000).toISOString(),lu: true  },
];

const QUICK_ACTIONS: Record<UserRole, Array<{ label: string; route: string; icon: string; color: string }>> = {
  directeur: [
    { label: 'Saisir les notes',     route: '/notes',      icon: '📝', color: '#185FA5' },
    { label: 'Gérer les absences',   route: '/absences',   icon: '📅', color: '#1D9E75' },
    { label: 'Suivi paiements',      route: '/scolarite',  icon: '💳', color: '#BA7517' },
    { label: 'Envoyer un message',   route: '/messagerie', icon: '💬', color: '#534AB7' },
    { label: 'Générer les bulletins',route: '/bulletins',  icon: '📋', color: '#E24B4A' },
    { label: 'Emploi du temps',      route: '/edt',        icon: '🗓️', color: '#0B6B5F' },
  ],
  enseignant: [
    { label: 'Saisir les notes',     route: '/notes',      icon: '📝', color: '#185FA5' },
    { label: 'Faire l\'appel',       route: '/absences',   icon: '📅', color: '#1D9E75' },
    { label: 'Mes messages',         route: '/messagerie', icon: '💬', color: '#534AB7' },
    { label: 'Mon emploi du temps',  route: '/edt',        icon: '🗓️', color: '#0B6B5F' },
  ],
  comptable: [
    { label: 'Tableau paiements',    route: '/scolarite',  icon: '💳', color: '#BA7517' },
    { label: 'Envoyer relances',     route: '/relances',   icon: '📨', color: '#E24B4A' },
    { label: 'Export Excel',         route: '/exports',    icon: '📊', color: '#185FA5' },
  ],
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

interface AbsenceRowProps {
  item: typeof MOCK_ABSENCES_RECENTES[0];
  onNotify: (id: string) => void;
}
function AbsenceRow({ item, onNotify }: AbsenceRowProps) {
  const urgent = item.joursRetard >= 3;
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '8px 0',
      borderBottom: '0.5px solid #F0F0F0',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: urgent ? '#FCEBEB' : '#FAEEDA',
        color: urgent ? '#A32D2D' : '#633806',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 600, flexShrink: 0,
      }}>
        {item.eleveNom.split(' ').map(n => n[0]).join('').slice(0, 2)}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{item.eleveNom}</div>
        <div style={{ fontSize: 11, color: '#6C757D' }}>{item.classe} — {item.matiere}</div>
      </div>
      <span style={{
        fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 500,
        background: urgent ? '#FCEBEB' : '#FAEEDA',
        color: urgent ? '#A32D2D' : '#633806',
      }}>
        {item.joursRetard}j
      </span>
      <button
        onClick={() => onNotify(item.id)}
        style={{
          fontSize: 10, padding: '4px 8px', borderRadius: 6,
          border: '0.5px solid #DEE2E6', background: '#fff',
          color: '#185FA5', cursor: 'pointer',
        }}
      >
        SMS
      </button>
    </div>
  );
}

interface NotifItemProps {
  notif: typeof MOCK_NOTIFICATIONS[0];
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
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const [notifiedAbsences, setNotifiedAbsences] = useState<Set<string>>(new Set());
  const [isOnline, setIsOnline] = useState(navigator.onLine);

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

  const kpis = user.role === 'enseignant'
    ? MOCK_KPIS_ENSEIGNANT
    : MOCK_KPIS_DIRECTEUR;

  const quickActions = QUICK_ACTIONS[user.role] ?? [];

  const nonLus = notifications.filter(n => !n.lu).length;

  function handleNotify(id: string) {
    setNotifiedAbsences(prev => new Set(prev).add(id));
  }

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
            Lycée Béhanzin • Cotonou
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
            })} — Trimestre 3
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

        {/* ── GRILLE INFOS ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 16,
        }}>

          {/* Absences non justifiées */}
          <section aria-label="Absences non justifiées" style={{
            background: '#fff', border: '0.5px solid #DEE2E6',
            borderRadius: 12, padding: 16,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 style={{ fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                📅 Absences non justifiées
              </h2>
              <button
                onClick={() => onNavigate('/absences')}
                style={{ fontSize: 12, color: '#185FA5', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Voir tout →
              </button>
            </div>
            {MOCK_ABSENCES_RECENTES.map(item => (
              <AbsenceRow
                key={item.id}
                item={item}
                onNotify={handleNotify}
              />
            ))}
            {notifiedAbsences.size > 0 && (
              <p style={{ fontSize: 11, color: '#1D9E75', marginTop: 8, textAlign: 'center' }}>
                ✓ {notifiedAbsences.size} SMS envoyé{notifiedAbsences.size > 1 ? 's' : ''}
              </p>
            )}
          </section>

          {/* Notifications récentes */}
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
            {notifications.map(n => (
              <NotifItem key={n.id} notif={n} onRead={handleReadNotif} />
            ))}
          </section>

        </div>
      </main>
    </div>
  );
}
