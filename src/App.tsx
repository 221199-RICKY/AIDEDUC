// ─────────────────────────────────────────────
// AIDEDUC — App.tsx (avec export Excel xlsx)
// Navigation : Directeur · Enseignant · Comptable
// ─────────────────────────────────────────────

import { useState } from 'react'
import * as XLSX from 'xlsx'

// ── Directeur ─────────────────────────────────
import Dashboard  from './components/Dashboard'
import Absences   from './components/Absences'
import Scolarite  from './components/Scolarite'

// ── Enseignant ────────────────────────────────
import FaireAppel  from './components/enseignant/FaireAppel'
import CahierTexte from './components/enseignant/CahierTexte'
import SaisieNotes from './components/enseignant/SaisieNotes'

// ── Comptable ─────────────────────────────────
import Encaissement  from './components/comptable/Encaissement'
import SuiviRelances from './components/comptable/SuiviRelances'

import type { User } from './types'

// ── Utilisateur de démo ───────────────────────
const USER_DIRECTEUR: User = {
  id: 'u1', nom: 'Koffi', prenom: 'Directeur',
  email: 'directeur@lycee-behanzin.bj',
  telephone: '+229 96 00 00 00',
  role: 'directeur', ecoleId: 'ec-1',
  langue: 'fr', createdAt: '2024-09-01',
}

// ── Types ─────────────────────────────────────
type Vue =
  | 'directeur'
  | 'directeur/absences'
  | 'directeur/scolarite'
  | 'enseignant'
  | 'enseignant/appel'
  | 'enseignant/cahier'
  | 'enseignant/notes'
  | 'comptable'
  | 'comptable/encaissement'
  | 'comptable/relances'
  | 'comptable/export'

type Profil = 'directeur' | 'enseignant' | 'comptable'

// ── Palette AIDEDUC ───────────────────────────
const C = {
  primary:   '#1B3A5C',
  accent:    '#F5A623',
  green:     '#1D9E75',
  amber:     '#BA7517',
  red:       '#E24B4A',
  purple:    '#534AB7',
  surface:   '#FFFFFF',
  border:    '#E2E8F0',
  textMuted: '#6C757D',
  bg:        '#F4F6F9',
}

// ── Données de démo pour export ───────────────
const DEMO_PAIEMENTS = [
  { Prénom:'Amina',    Nom:'Konaté',    Classe:'Terminale C', Numéro:'TCL-001', 'Total dû':225000, 'Total versé':225000, Solde:0,       Statut:'Soldé',   'Dernière op.':'2026-06-20' },
  { Prénom:'Basile',   Nom:'Mensah',    Classe:'Terminale C', Numéro:'TCL-002', 'Total dû':225000, 'Total versé':100000, Solde:-125000, Statut:'Partiel', 'Dernière op.':'2026-06-18' },
  { Prénom:'Chloé',    Nom:'Adjovi',    Classe:'Terminale C', Numéro:'TCL-003', 'Total dû':225000, 'Total versé':225000, Solde:0,       Statut:'Soldé',   'Dernière op.':'2026-06-20' },
  { Prénom:'David',    Nom:'Sow',       Classe:'Terminale C', Numéro:'TCL-004', 'Total dû':225000, 'Total versé':0,      Solde:-225000, Statut:'Impayé',  'Dernière op.':'—'          },
  { Prénom:'Isabelle', Nom:'Zannou',    Classe:'Première D',  Numéro:'PD-001',  'Total dû':200000, 'Total versé':100000, Solde:-100000, Statut:'Partiel', 'Dernière op.':'2026-06-06' },
  { Prénom:'Jules',    Nom:'Coulibaly', Classe:'Première D',  Numéro:'PD-002',  'Total dû':200000, 'Total versé':200000, Solde:0,       Statut:'Soldé',   'Dernière op.':'2026-06-25' },
  { Prénom:'Nathan',   Nom:'Toviho',    Classe:'2nde B',      Numéro:'2B-001',  'Total dû':175000, 'Total versé':25000,  Solde:-150000, Statut:'Impayé',  'Dernière op.':'2026-09-05' },
]

const DEMO_ABSENCES = [
  { Prénom:'Amina',   Nom:'Konaté',   Classe:'Terminale C', Matière:'Mathématiques',  Date:'2026-06-24', Statut:'Non justifiée' },
  { Prénom:'Basile',  Nom:'Mensah',   Classe:'Terminale C', Matière:'Français',        Date:'2026-06-23', Statut:'Justifiée'     },
  { Prénom:'David',   Nom:'Sow',      Classe:'Terminale C', Matière:'Histoire-Géo',    Date:'2026-06-22', Statut:'Non justifiée' },
  { Prénom:'Nathan',  Nom:'Toviho',   Classe:'2nde B',      Matière:'Physique-Chimie', Date:'2026-06-25', Statut:'En attente'    },
  { Prénom:'Karine',  Nom:'Dossou',   Classe:'Première D',  Matière:'Anglais',         Date:'2026-06-20', Statut:'Justifiée'     },
]

// ── Export Excel avec SheetJS ─────────────────
function exporterExcel(type: 'paiements' | 'absences') {
  const data    = type === 'paiements' ? DEMO_PAIEMENTS : DEMO_ABSENCES
  const date    = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')
  const nom     = `AIDEDUC_${type === 'paiements' ? 'Paiements' : 'Absences'}_${date}.xlsx`
  const ws      = XLSX.utils.json_to_sheet(data)
  // Largeurs auto
  ws['!cols']   = Object.keys(data[0]).map(k => ({ wch: Math.max(k.length + 2, 14) }))
  const wb      = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, type === 'paiements' ? 'Paiements' : 'Absences')
  XLSX.writeFile(wb, nom)
}

// ── Vue Export ────────────────────────────────
function VueExport({ onBack }: { onBack: () => void }) {
  const [exporting, setExporting] = useState<string | null>(null)
  const [done,      setDone]      = useState<string[]>([])

  async function lancer(type: 'paiements' | 'absences') {
    setExporting(type)
    await new Promise(r => setTimeout(r, 500))
    exporterExcel(type)
    setExporting(null)
    setDone(d => [...d, type])
    setTimeout(() => setDone(d => d.filter(x => x !== type)), 4000)
  }

  const totalDu    = DEMO_PAIEMENTS.reduce((s, p) => s + p['Total dû'],    0)
  const totalVerse = DEMO_PAIEMENTS.reduce((s, p) => s + p['Total versé'], 0)
  const taux       = Math.round((totalVerse / totalDu) * 100)

  const rapports = [
    { id:'paiements', icon:'💰', label:'Rapport des paiements', desc:'Solde, statut et dernière opération par élève', color:'#EAF3DE' },
    { id:'absences',  icon:'📅', label:'Rapport des absences',  desc:'Liste par élève, matière et statut',            color:'#E6F1FB' },
  ]

  return (
    <div style={{ fontFamily:"'Inter',system-ui,sans-serif", background:C.bg, minHeight:'100vh', maxWidth:480, margin:'0 auto', display:'flex', flexDirection:'column' }}>
      <header style={{ background:C.primary, padding:'12px 16px 14px', position:'sticky', top:0, zIndex:50 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={onBack} style={{ background:'rgba(255,255,255,0.15)', border:'none', borderRadius:8, width:34, height:34, cursor:'pointer', color:'#fff', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>←</button>
          <div style={{ display:'flex', alignItems:'center', gap:8, flex:1 }}>
            <div style={{ width:30, height:30, borderRadius:8, background:C.accent, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15 }}>🎓</div>
            <div>
              <div style={{ fontSize:15, fontWeight:700, color:'#fff' }}>AIDEDUC</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.45)' }}>Export Excel</div>
            </div>
          </div>
        </div>
      </header>

      <main style={{ flex:1, padding:'16px 16px 28px', display:'flex', flexDirection:'column', gap:12 }}>

        {/* Récap */}
        <div style={{ background:C.primary, borderRadius:14, padding:'14px 16px', color:'#fff' }}>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)', marginBottom:4 }}>Récapitulatif — Trimestre 3</div>
          <div style={{ fontSize:26, fontWeight:700, color:C.accent }}>{totalVerse.toLocaleString('fr-FR')} XOF</div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.55)', marginTop:2 }}>
            encaissés sur {totalDu.toLocaleString('fr-FR')} XOF — {taux}% de recouvrement
          </div>
          <div style={{ height:6, background:'rgba(255,255,255,0.15)', borderRadius:3, overflow:'hidden', marginTop:10 }}>
            <div style={{ height:'100%', width:`${taux}%`, background:C.accent, borderRadius:3 }} />
          </div>
        </div>

        <div style={{ fontSize:11, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'.5px' }}>
          Choisir un rapport
        </div>

        {rapports.map(r => (
          <button key={r.id} onClick={() => lancer(r.id as 'paiements' | 'absences')} disabled={exporting !== null} style={{
            display:'flex', alignItems:'center', gap:14, padding:'16px', borderRadius:14,
            cursor: exporting ? 'wait' : 'pointer',
            border:`1px solid ${done.includes(r.id) ? '#97C459' : C.border}`,
            background: done.includes(r.id) ? '#EAF3DE' : C.surface,
            width:'100%', textAlign:'left', transition:'all 0.15s',
          }}>
            <div style={{ width:48, height:48, borderRadius:12, background:r.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, flexShrink:0 }}>
              {exporting === r.id ? '⏳' : done.includes(r.id) ? '✅' : r.icon}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:700, color:done.includes(r.id)?'#27500A':'#1A1A2E' }}>
                {done.includes(r.id) ? '✓ ' : ''}{r.label}
              </div>
              <div style={{ fontSize:12, color:C.textMuted, marginTop:2 }}>{r.desc}</div>
            </div>
            <div style={{ fontSize:20, color:done.includes(r.id)?C.green:'#C0C8D0', flexShrink:0 }}>
              {done.includes(r.id) ? '✓' : '↓'}
            </div>
          </button>
        ))}

        <p style={{ fontSize:11, color:C.textMuted, textAlign:'center', lineHeight:1.6, margin:0 }}>
          Fichiers .xlsx — s'ouvrent directement dans Excel, LibreOffice et Google Sheets.
        </p>
      </main>
    </div>
  )
}

// ── Switcher de profil flottant ───────────────
function ProfileSwitcher({ profil, onChange }: { profil: Profil; onChange: (p: Profil) => void }) {
  const options: { id: Profil; label: string; color: string; textColor: string }[] = [
    { id:'directeur',  label:'🏫 Directeur',  color:C.accent, textColor:C.primary },
    { id:'enseignant', label:'👨‍🏫 Enseignant', color:C.green,  textColor:'#fff'    },
    { id:'comptable',  label:'💳 Comptable',   color:C.purple, textColor:'#fff'    },
  ]
  return (
    <div style={{ position:'fixed', bottom:20, right:20, zIndex:9999, background:C.primary, borderRadius:16, padding:'8px 10px', display:'flex', alignItems:'center', gap:6, boxShadow:'0 4px 24px rgba(0,0,0,0.28)' }}>
      <span style={{ fontSize:10, color:'rgba(255,255,255,0.4)', paddingRight:8, borderRight:'1px solid rgba(255,255,255,0.15)', marginRight:2, whiteSpace:'nowrap' }}>Vue démo</span>
      {options.map(o => (
        <button key={o.id} onClick={() => onChange(o.id)} style={{
          padding:'6px 10px', borderRadius:10, border:'none',
          background: profil===o.id ? o.color : 'rgba(255,255,255,0.1)',
          color: profil===o.id ? o.textColor : 'rgba(255,255,255,0.6)',
          fontSize:11, fontWeight:700, cursor:'pointer', transition:'all 0.15s', whiteSpace:'nowrap',
        }}>{o.label}</button>
      ))}
    </div>
  )
}

// ── Menu hub Enseignant ───────────────────────
function MenuEnseignant({ onNavigate }: { onNavigate: (v: Vue) => void }) {
  const actions: { vue: Vue; icon: string; label: string; desc: string }[] = [
    { vue:'enseignant/appel',  icon:'📋', label:"Faire l'appel",   desc:'Pointer les présences et absences'     },
    { vue:'enseignant/notes',  icon:'📝', label:'Saisir les notes', desc:'Notes et moyennes pondérées par épreuve' },
    { vue:'enseignant/cahier', icon:'📓', label:'Cahier de texte',  desc:'Résumé du cours et devoirs donnés'     },
  ]
  return (
    <div style={{ fontFamily:"'Inter',system-ui,sans-serif", background:C.bg, minHeight:'100vh', maxWidth:480, margin:'0 auto' }}>
      <header style={{ background:C.primary, padding:'20px 16px 24px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:C.accent, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🎓</div>
          <div>
            <div style={{ fontSize:18, fontWeight:700, color:'#fff' }}>AIDEDUC</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.45)' }}>Espace Enseignant</div>
          </div>
        </div>
        <div style={{ fontSize:13, color:'rgba(255,255,255,0.65)', lineHeight:1.6 }}>
          Bonjour, M. Ouédraogo 👋<br/>
          <span style={{ fontSize:11, color:'rgba(255,255,255,0.4)' }}>
            {new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}
          </span>
        </div>
      </header>
      <main style={{ padding:'20px 16px', display:'flex', flexDirection:'column', gap:12 }}>
        <div style={{ fontSize:11, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'.5px', marginBottom:4 }}>
          Que voulez-vous faire ?
        </div>
        {actions.map(a => (
          <button key={a.vue} onClick={() => onNavigate(a.vue)} style={{
            display:'flex', alignItems:'center', gap:14, padding:'16px', borderRadius:14,
            border:`1px solid ${C.border}`, background:C.surface, cursor:'pointer',
            textAlign:'left', width:'100%', boxShadow:'0 1px 4px rgba(0,0,0,0.04)',
          }}>
            <div style={{ width:48, height:48, borderRadius:12, background:C.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, flexShrink:0 }}>{a.icon}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:15, fontWeight:700, color:'#1A1A2E' }}>{a.label}</div>
              <div style={{ fontSize:12, color:C.textMuted, marginTop:2 }}>{a.desc}</div>
            </div>
            <div style={{ fontSize:20, color:'#C0C8D0' }}>›</div>
          </button>
        ))}
      </main>
    </div>
  )
}

// ── Menu hub Comptable ────────────────────────
function MenuComptable({ onNavigate }: { onNavigate: (v: Vue) => void }) {
  const actions: { vue: Vue; icon: string; label: string; desc: string; color: string }[] = [
    { vue:'comptable/encaissement', icon:'💰', label:'Encaissement',    desc:'Rechercher un élève et saisir un versement',    color:'#EAF3DE' },
    { vue:'comptable/relances',     icon:'📨', label:'Suivi & Relances', desc:'Impayés avec relance WhatsApp click-to-chat',   color:'#FAEEDA' },
    { vue:'comptable/export',       icon:'📊', label:'Export Excel',     desc:'Rapports paiements et absences en fichier .xlsx',color:'#E6F1FB' },
  ]
  return (
    <div style={{ fontFamily:"'Inter',system-ui,sans-serif", background:C.bg, minHeight:'100vh', maxWidth:480, margin:'0 auto' }}>
      <header style={{ background:C.primary, padding:'20px 16px 24px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:C.accent, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🎓</div>
          <div>
            <div style={{ fontSize:18, fontWeight:700, color:'#fff' }}>AIDEDUC</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.45)' }}>Espace Comptable</div>
          </div>
        </div>
        <div style={{ fontSize:13, color:'rgba(255,255,255,0.65)', lineHeight:1.6 }}>
          Bonjour, Mme Noudéhou 👋<br/>
          <span style={{ fontSize:11, color:'rgba(255,255,255,0.4)' }}>
            {new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}
          </span>
        </div>
      </header>
      <main style={{ padding:'20px 16px', display:'flex', flexDirection:'column', gap:12 }}>
        <div style={{ fontSize:11, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'.5px', marginBottom:4 }}>
          Fonctionnalités disponibles
        </div>
        {actions.map(a => (
          <button key={a.vue} onClick={() => onNavigate(a.vue)} style={{
            display:'flex', alignItems:'center', gap:14, padding:'16px', borderRadius:14,
            border:`1px solid ${C.border}`, background:C.surface, cursor:'pointer',
            textAlign:'left', width:'100%', boxShadow:'0 1px 4px rgba(0,0,0,0.04)',
          }}>
            <div style={{ width:48, height:48, borderRadius:12, background:a.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, flexShrink:0 }}>{a.icon}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:15, fontWeight:700, color:'#1A1A2E' }}>{a.label}</div>
              <div style={{ fontSize:12, color:C.textMuted, marginTop:2 }}>{a.desc}</div>
            </div>
            <div style={{ fontSize:20, color:'#C0C8D0' }}>›</div>
          </button>
        ))}
      </main>
    </div>
  )
}

// ── COMPOSANT RACINE ──────────────────────────
export default function App() {
  const [vue,    setVue]    = useState<Vue>('directeur')
  const [profil, setProfil] = useState<Profil>('directeur')

  function handleProfilChange(p: Profil) {
    setProfil(p)
    setVue(p)
  }

  function handleNavigate(route: string) {
    if (route === '/absences')  setVue('directeur/absences')
    if (route === '/scolarite') setVue('directeur/scolarite')
  }

  function renderVue() {
    switch (vue) {
      // ── ENSEIGNANT ────────────────────────
      case 'enseignant':        return <MenuEnseignant onNavigate={setVue} />
      case 'enseignant/appel':  return <FaireAppel  onBack={() => setVue('enseignant')} />
      case 'enseignant/notes':  return <SaisieNotes onBack={() => setVue('enseignant')} />
      case 'enseignant/cahier': return <CahierTexte onBack={() => setVue('enseignant')} />

      // ── COMPTABLE ─────────────────────────
      case 'comptable':                return <MenuComptable  onNavigate={setVue} />
      case 'comptable/encaissement':   return <Encaissement  onBack={() => setVue('comptable')} />
      case 'comptable/relances':       return <SuiviRelances onBack={() => setVue('comptable')} />
      case 'comptable/export':         return <VueExport     onBack={() => setVue('comptable')} />

      // ── DIRECTEUR ─────────────────────────
      case 'directeur/absences':  return <Absences  enseignantId="u1" onBack={() => setVue('directeur')} isOnline={navigator.onLine} />
      case 'directeur/scolarite': return <Scolarite ecoleId="ec-1"    onBack={() => setVue('directeur')} isOnline={navigator.onLine} />
      case 'directeur':
      default:                    return <Dashboard user={USER_DIRECTEUR} onNavigate={handleNavigate} />
    }
  }

  return (
    <>
      {renderVue()}
      <ProfileSwitcher profil={profil} onChange={handleProfilChange} />
    </>
  )
}
