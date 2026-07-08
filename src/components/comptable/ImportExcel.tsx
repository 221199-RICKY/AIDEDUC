// ─────────────────────────────────────────────
// AIDEDUC — ImportExcel.tsx
// src/components/comptable/ImportExcel.tsx
// Import en masse des élèves via fichier Excel
// ─────────────────────────────────────────────

import { useState, useRef, useCallback } from 'react'
import * as XLSX from 'xlsx'

// ── Palette AIDEDUC ───────────────────────────
const C = {
  primary:   '#1B3A5C',
  accent:    '#F5A623',
  green:     '#1D9E75',
  amber:     '#BA7517',
  red:       '#E24B4A',
  purple:    '#534AB7',
  bg:        '#F4F6F9',
  surface:   '#FFFFFF',
  border:    '#E2E8F0',
  textMain:  '#1A1A2E',
  textMuted: '#6C757D',
}

// ── Types ─────────────────────────────────────
type StatutLigne = 'ok' | 'erreur' | 'avertissement'

interface LigneEleve {
  index:     number
  nom:       string
  prenom:    string
  classe:    string
  genre:     string
  telParent: string
  statut:    StatutLigne
  erreurs:   string[]
}

type EtapeImport = 'accueil' | 'apercu' | 'succes'

// ── Colonnes obligatoires du modèle ──────────
const COLONNES = ['Nom', 'Prénom', 'Classe', 'Genre', 'Téléphone Parent']

const CLASSES_VALIDES = [
  '6ème A','6ème B','5ème A','5ème B',
  '4ème A','4ème B','3ème A','3ème B',
  '2nde A','2nde B','1ère C','1ère D',
  'Terminale C','Terminale D',
]

const GENRES_VALIDES = ['M','F','Masculin','Féminin']

// ── Helpers ───────────────────────────────────
function normaliserClasse(val: string): string {
  // Tolère "TerminaleC", "terminale c", "TC" etc.
  const map: Record<string, string> = {
    'TC':'Terminale C','TD':'Terminale D',
    '1C':'1ère C','1D':'1ère D',
    '2A':'2nde A','2B':'2nde B',
  }
  const clean = val.trim()
  return map[clean.toUpperCase()] ?? clean
}

function normaliserGenre(val: string): string {
  const v = val.trim().toLowerCase()
  if (v === 'm' || v === 'masculin' || v === 'garçon') return 'M'
  if (v === 'f' || v === 'féminin' || v === 'fille')   return 'F'
  return val.trim()
}

function validerLigne(raw: Record<string, string>, index: number): LigneEleve {
  const erreurs: string[] = []

  const nom       = (raw['Nom']              ?? '').trim()
  const prenom    = (raw['Prénom']           ?? '').trim()
  const classeRaw = (raw['Classe']           ?? '').trim()
  const genreRaw  = (raw['Genre']            ?? '').trim()
  const tel       = (raw['Téléphone Parent'] ?? '').trim()

  const classe = normaliserClasse(classeRaw)
  const genre  = normaliserGenre(genreRaw)

  if (!nom)    erreurs.push('Nom manquant')
  if (!prenom) erreurs.push('Prénom manquant')
  if (!CLASSES_VALIDES.includes(classe))
    erreurs.push(`Classe invalide : "${classeRaw}"`)
  if (!['M','F'].includes(genre))
    erreurs.push(`Genre invalide : "${genreRaw}" (attendu M ou F)`)
  if (!tel)
    erreurs.push('Téléphone parent manquant')
  else if (!/^\+?[0-9\s\-]{8,15}$/.test(tel))
    erreurs.push('Format téléphone invalide')

  const statut: StatutLigne =
    erreurs.length === 0 ? 'ok' :
    erreurs.some(e => e.includes('manquant') || e.includes('invalide')) ? 'erreur' :
    'avertissement'

  return { index, nom, prenom, classe, genre, telParent: tel, statut, erreurs }
}

// ── Génération du modèle Excel à télécharger ─
function telechargerModele() {
  const ws = XLSX.utils.aoa_to_sheet([
    // En-têtes en gras (styling limité sans pro)
    COLONNES,
    // Exemples de lignes
    ['Konaté',    'Ibrahim',   'Terminale C', 'M', '+22996000001'],
    ['Mensah',    'Chloé',     '2nde B',      'F', '+22997000002'],
    ['Diallo',    'Sékou',     '3ème A',      'M', '+22998000003'],
    ['Adjovi',    'Marie',     '1ère C',      'F', '+22999000004'],
  ])

  // Largeurs de colonnes
  ws['!cols'] = [
    { wch: 18 }, { wch: 18 }, { wch: 14 },
    { wch: 10 }, { wch: 20 },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Élèves')
  XLSX.writeFile(wb, 'AIDEDUC_Modele_Import_Eleves.xlsx')
}

// ── COMPOSANT ─────────────────────────────────
interface ImportExcelProps {
  onBack: () => void
  onImport?: (lignes: LigneEleve[]) => void
}

export default function ImportExcel({ onBack, onImport }: ImportExcelProps) {
  const [etape,       setEtape]       = useState<EtapeImport>('accueil')
  const [lignes,      setLignes]      = useState<LigneEleve[]>([])
  const [nomFichier,  setNomFichier]  = useState('')
  const [isDragging,  setIsDragging]  = useState(false)
  const [erreurFich,  setErreurFich]  = useState('')
  const [saving,      setSaving]      = useState(false)
  const [filtreStatut,setFiltreStatut]= useState<'tous'|StatutLigne>('tous')
  const inputRef = useRef<HTMLInputElement>(null)

  // Stats
  const nbOk    = lignes.filter(l => l.statut === 'ok').length
  const nbErr   = lignes.filter(l => l.statut === 'erreur').length
  const nbWarn  = lignes.filter(l => l.statut === 'avertissement').length

  // Lecture du fichier Excel
  const lireFichier = useCallback((file: File) => {
    setErreurFich('')

    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setErreurFich('Format non supporté. Utilisez un fichier .xlsx, .xls ou .csv')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setErreurFich('Fichier trop volumineux (max 5 Mo)')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data     = new Uint8Array(e.target!.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheet    = workbook.Sheets[workbook.SheetNames[0]]
        const rows     = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
          defval: '',
          raw:    false,
        })

        if (rows.length === 0) {
          setErreurFich('Le fichier est vide ou ne contient pas de données.')
          return
        }

        // Vérifier que les colonnes obligatoires sont présentes
        const premiereColonne = Object.keys(rows[0])
        const manquantes = COLONNES.filter(c => !premiereColonne.includes(c))
        if (manquantes.length > 0) {
          setErreurFich(`Colonnes manquantes dans le fichier : ${manquantes.join(', ')}.\nUtilisez le modèle fourni.`)
          return
        }

        const parsed = rows.map((row, i) => validerLigne(row, i + 1))
        setLignes(parsed)
        setNomFichier(file.name)
        setEtape('apercu')
      } catch {
        setErreurFich('Impossible de lire le fichier. Vérifiez qu\'il n\'est pas corrompu.')
      }
    }
    reader.readAsArrayBuffer(file)
  }, [])

  // Drag & Drop
  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) lireFichier(file)
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  // Validation finale et import
  async function validerEtInscrire() {
    const valides = lignes.filter(l => l.statut === 'ok')
    if (valides.length === 0) return

    setSaving(true)
    // → ici : POST /api/eleves/import avec { eleves: valides }
    await new Promise(r => setTimeout(r, 1800))
    setSaving(false)

    onImport?.(valides)
    setEtape('succes')
  }

  const lignesFiltrees = filtreStatut === 'tous'
    ? lignes
    : lignes.filter(l => l.statut === filtreStatut)

  // ── RENDU ─────────────────────────────────
  return (
    <div style={{
      fontFamily: "'Inter', system-ui, sans-serif",
      background: C.bg, minHeight: '100vh',
      maxWidth: 480, margin: '0 auto',
      display: 'flex', flexDirection: 'column',
    }}>

      {/* HEADER */}
      <header style={{ background: C.primary, padding: '12px 16px 14px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button
            onClick={() => etape === 'accueil' ? onBack() : setEtape('accueil')}
            aria-label="Retour"
            style={{ background:'rgba(255,255,255,0.15)', border:'none', borderRadius:8, width:34, height:34, cursor:'pointer', color:'#fff', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}
          >←</button>
          <div style={{ display:'flex', alignItems:'center', gap:8, flex:1 }}>
            <div style={{ width:30, height:30, borderRadius:8, background:C.accent, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15 }}>🎓</div>
            <div>
              <div style={{ fontSize:15, fontWeight:700, color:'#fff' }}>AIDEDUC</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.45)' }}>
                {etape === 'accueil' && 'Import Excel — Inscription en masse'}
                {etape === 'apercu'  && `Aperçu — ${lignes.length} lignes détectées`}
                {etape === 'succes'  && 'Import terminé'}
              </div>
            </div>
          </div>
          {etape === 'apercu' && (
            <div style={{ display:'flex', gap:8 }}>
              <span style={{ fontSize:10, padding:'3px 8px', borderRadius:20, background:'#EAF3DE', color:'#27500A', fontWeight:600 }}>✓ {nbOk}</span>
              {nbErr > 0 && <span style={{ fontSize:10, padding:'3px 8px', borderRadius:20, background:'#FCEBEB', color:'#A32D2D', fontWeight:600 }}>✗ {nbErr}</span>}
            </div>
          )}
        </div>
      </header>

      <main style={{ flex:1, padding:'16px 16px 32px', display:'flex', flexDirection:'column', gap:14 }}>

        {/* ══════════════════════════════════
            ÉTAPE 1 — ACCUEIL
        ══════════════════════════════════ */}
        {etape === 'accueil' && (
          <>
            {/* Étapes visuelles */}
            <div style={{ background:C.surface, borderRadius:14, padding:16, border:`1px solid ${C.border}` }}>
              <div style={{ fontSize:13, fontWeight:700, color:C.textMain, marginBottom:14 }}>
                📋 Comment ça marche ?
              </div>
              {[
                { n:'1', icon:'📥', label:'Téléchargez le modèle',   desc:'Récupérez le fichier Excel type avec les bonnes colonnes'   },
                { n:'2', icon:'✏️',  label:'Remplissez le fichier',   desc:'Ajoutez vos élèves ligne par ligne en respectant le format' },
                { n:'3', icon:'📤', label:'Importez le fichier',     desc:'Glissez-déposez ou sélectionnez votre fichier complété'     },
                { n:'4', icon:'✅', label:'Validez l\'inscription',  desc:'Vérifiez l\'aperçu et confirmez l\'inscription en masse'    },
              ].map(s => (
                <div key={s.n} style={{ display:'flex', gap:12, marginBottom:12, alignItems:'flex-start' }}>
                  <div style={{ width:28, height:28, borderRadius:'50%', background:C.primary, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, flexShrink:0, marginTop:2 }}>
                    {s.n}
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:C.textMain }}>{s.icon} {s.label}</div>
                    <div style={{ fontSize:11, color:C.textMuted, marginTop:2, lineHeight:1.5 }}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bouton télécharger modèle */}
            <button
              onClick={telechargerModele}
              style={{
                width:'100%', padding:'14px 0', borderRadius:12,
                border:`2px solid ${C.primary}`, background:'rgba(27,58,92,0.06)',
                color:C.primary, fontSize:14, fontWeight:700, cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                transition:'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background='rgba(27,58,92,0.12)')}
              onMouseLeave={e => (e.currentTarget.style.background='rgba(27,58,92,0.06)')}
            >
              <span style={{ fontSize:20 }}>📥</span>
              Télécharger le modèle Excel type
            </button>

            {/* Info colonnes du modèle */}
            <div style={{ background:'#FAEEDA', border:'1px solid #F0C87A', borderRadius:10, padding:'10px 14px' }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.amber, marginBottom:6 }}>
                📌 Colonnes obligatoires dans le fichier :
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                {COLONNES.map(c => (
                  <span key={c} style={{ fontSize:11, padding:'3px 8px', borderRadius:20, background:'#fff', color:C.primary, fontWeight:600, border:`1px solid ${C.border}` }}>
                    {c}
                  </span>
                ))}
              </div>
            </div>

            {/* Zone drag & drop */}
            <div
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => inputRef.current?.click()}
              style={{
                border: `2px dashed ${isDragging ? C.green : C.border}`,
                borderRadius:14, padding:'32px 20px',
                textAlign:'center', cursor:'pointer',
                background: isDragging ? '#F0FBF6' : C.surface,
                transition:'all 0.2s',
              }}
            >
              <div style={{ fontSize:44, marginBottom:10 }}>
                {isDragging ? '📂' : '📤'}
              </div>
              <div style={{ fontSize:14, fontWeight:700, color:isDragging ? C.green : C.textMain, marginBottom:6 }}>
                {isDragging ? 'Relâchez pour importer' : 'Glisser-déposer votre fichier ici'}
              </div>
              <div style={{ fontSize:12, color:C.textMuted, marginBottom:12 }}>
                ou cliquez pour parcourir vos fichiers
              </div>
              <div style={{ display:'inline-block', padding:'8px 20px', borderRadius:10, background:C.primary, color:'#fff', fontSize:13, fontWeight:600 }}>
                📁 Choisir un fichier
              </div>
              <div style={{ fontSize:11, color:C.textMuted, marginTop:10 }}>
                Formats acceptés : .xlsx · .xls · .csv · Max 5 Mo
              </div>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display:'none' }}
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) lireFichier(file)
                e.target.value = ''
              }}
            />

            {/* Erreur fichier */}
            {erreurFich && (
              <div style={{ background:'#FCEBEB', border:'1px solid #F7A3A3', borderRadius:10, padding:'12px 14px', fontSize:13, color:'#A32D2D', fontWeight:500, display:'flex', gap:8 }}>
                <span style={{ flexShrink:0 }}>⚠️</span>
                <span style={{ whiteSpace:'pre-line' }}>{erreurFich}</span>
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════
            ÉTAPE 2 — APERÇU
        ══════════════════════════════════ */}
        {etape === 'apercu' && (
          <>
            {/* Résumé fichier */}
            <div style={{ background:C.surface, borderRadius:12, padding:'12px 14px', border:`1px solid ${C.border}` }}>
              <div style={{ fontSize:11, color:C.textMuted, marginBottom:8 }}>
                📄 <strong>{nomFichier}</strong>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:0 }}>
                {[
                  { label:'Total',         value: lignes.length, color:C.primary  },
                  { label:'✓ Valides',     value: nbOk,          color:C.green    },
                  { label:'✗ Erreurs',     value: nbErr,         color: nbErr>0 ? C.red : C.textMuted },
                ].map((s, i) => (
                  <div key={i} style={{ textAlign:'center', borderRight:i<2?`1px solid ${C.border}`:'none', padding:'0 6px' }}>
                    <div style={{ fontSize:22, fontWeight:700, color:s.color }}>{s.value}</div>
                    <div style={{ fontSize:10, color:C.textMuted, marginTop:2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Alerte si erreurs */}
            {nbErr > 0 && (
              <div style={{ background:'#FAEEDA', border:'1px solid #F0C87A', borderRadius:10, padding:'10px 14px', fontSize:12, color:'#633806' }}>
                ⚠️ <strong>{nbErr} ligne{nbErr>1?'s':''} en erreur</strong> ne seront pas importées. Les {nbOk} lignes valides seront inscrites normalement.
              </div>
            )}

            {/* Filtres */}
            <div style={{ display:'flex', gap:6 }}>
              {([
                { id:'tous',          label:`Tous (${lignes.length})`  },
                { id:'ok',            label:`✓ Valides (${nbOk})`     },
                { id:'erreur',        label:`✗ Erreurs (${nbErr})`    },
              ] as { id:'tous'|StatutLigne; label:string }[]).filter(f => f.id==='tous'||lignes.filter(l=>l.statut===f.id).length>0).map(f => (
                <button key={f.id} onClick={() => setFiltreStatut(f.id)} style={{
                  padding:'5px 12px', borderRadius:20, fontSize:11, fontWeight:500,
                  border:`1px solid ${filtreStatut===f.id ? C.primary : C.border}`,
                  background: filtreStatut===f.id ? C.primary : C.surface,
                  color: filtreStatut===f.id ? '#fff' : C.textMuted, cursor:'pointer',
                }}>
                  {f.label}
                </button>
              ))}
            </div>

            {/* Liste des lignes */}
            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden' }}>
              {/* En-tête */}
              <div style={{ display:'grid', gridTemplateColumns:'28px 1fr 80px 36px', padding:'7px 12px', background:'#F8FAFC', borderBottom:`1px solid ${C.border}`, gap:8 }}>
                {['#','Élève','Classe',''].map((h,i) => (
                  <div key={i} style={{ fontSize:10, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'.4px' }}>{h}</div>
                ))}
              </div>

              {lignesFiltrees.slice(0, 50).map((l, idx) => (
                <div key={l.index} style={{
                  display:'grid', gridTemplateColumns:'28px 1fr 80px 36px',
                  alignItems:'center', gap:8, padding:'9px 12px',
                  borderBottom: idx < lignesFiltrees.length-1 ? `1px solid ${C.border}` : 'none',
                  background: l.statut==='erreur' ? '#FFF8F8' : l.statut==='avertissement' ? '#FFFBF0' : C.surface,
                }}>
                  <div style={{ fontSize:10, color:C.textMuted }}>{l.index}</div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:C.textMain }}>
                      {l.prenom || <span style={{ color:C.red, fontStyle:'italic' }}>?</span>}{' '}
                      {l.nom    || <span style={{ color:C.red, fontStyle:'italic' }}>?</span>}
                    </div>
                    {l.erreurs.length > 0 && (
                      <div style={{ fontSize:10, color:C.red, marginTop:2, lineHeight:1.4 }}>
                        {l.erreurs.join(' · ')}
                      </div>
                    )}
                    {l.erreurs.length === 0 && (
                      <div style={{ fontSize:10, color:C.textMuted }}>
                        {l.genre==='M'?'♂':'♀'} · {l.telParent}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize:11, color:C.textMuted }}>{l.classe || '—'}</div>
                  <div style={{ fontSize:16, textAlign:'center' }}>
                    {l.statut==='ok'     ? '✅' : l.statut==='erreur' ? '❌' : '⚠️'}
                  </div>
                </div>
              ))}

              {lignesFiltrees.length > 50 && (
                <div style={{ padding:'10px', textAlign:'center', fontSize:11, color:C.textMuted, borderTop:`1px solid ${C.border}` }}>
                  … et {lignesFiltrees.length - 50} autres lignes
                </div>
              )}
            </div>

            {/* Boutons */}
            <button
              onClick={validerEtInscrire}
              disabled={nbOk === 0 || saving}
              style={{
                width:'100%', padding:'15px 0', borderRadius:12, border:'none',
                background: nbOk===0 ? '#D0D5DD' : saving ? '#85B7EB' : C.green,
                color:'#fff', fontSize:15, fontWeight:700,
                cursor: nbOk===0 ? 'not-allowed' : saving ? 'wait' : 'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              }}
            >
              {saving ? (
                <span>⏳ Import en cours…</span>
              ) : (
                <>
                  ✅ Valider et inscrire
                  <span style={{ fontSize:12, padding:'2px 10px', borderRadius:20, background:'rgba(255,255,255,0.2)' }}>
                    {nbOk} élève{nbOk>1?'s':''}
                  </span>
                </>
              )}
            </button>

            <button
              onClick={() => { setEtape('accueil'); setLignes([]); setNomFichier('') }}
              style={{ width:'100%', padding:'11px 0', borderRadius:12, border:`1px solid ${C.border}`, background:C.surface, color:C.textMuted, fontSize:13, fontWeight:500, cursor:'pointer' }}
            >
              ← Changer de fichier
            </button>
          </>
        )}

        {/* ══════════════════════════════════
            ÉTAPE 3 — SUCCÈS
        ══════════════════════════════════ */}
        {etape === 'succes' && (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, paddingTop:40 }}>
            <div style={{ background:C.surface, borderRadius:20, padding:32, textAlign:'center', border:`1px solid ${C.border}`, width:'100%' }}>
              <div style={{ fontSize:64, marginBottom:16 }}>🎉</div>
              <div style={{ fontSize:20, fontWeight:700, color:C.textMain, marginBottom:8 }}>
                Import réussi !
              </div>
              <div style={{ fontSize:14, color:C.textMuted, marginBottom:20, lineHeight:1.6 }}>
                <span style={{ fontSize:28, fontWeight:700, color:C.green, display:'block', marginBottom:4 }}>
                  {nbOk} élève{nbOk>1?'s':''}
                </span>
                ont été inscrits avec succès dans la base de données.
              </div>

              {/* Résumé par statut */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:24 }}>
                <div style={{ background:'#EAF3DE', borderRadius:10, padding:'10px 12px' }}>
                  <div style={{ fontSize:20, fontWeight:700, color:C.green }}>{nbOk}</div>
                  <div style={{ fontSize:11, color:'#3B6D11' }}>Inscrits avec succès</div>
                </div>
                <div style={{ background: nbErr>0?'#FCEBEB':'#F8FAFC', borderRadius:10, padding:'10px 12px' }}>
                  <div style={{ fontSize:20, fontWeight:700, color:nbErr>0?C.red:C.textMuted }}>{nbErr}</div>
                  <div style={{ fontSize:11, color:nbErr>0?'#A32D2D':C.textMuted }}>Lignes ignorées</div>
                </div>
              </div>

              {nbErr > 0 && (
                <div style={{ background:'#FAEEDA', borderRadius:10, padding:'10px 14px', marginBottom:20, fontSize:12, color:'#633806', textAlign:'left' }}>
                  💡 {nbErr} ligne{nbErr>1?'s ont':'a'} été ignorée{nbErr>1?'s':''} à cause d'erreurs de format. Corrigez le fichier et réimportez uniquement les lignes manquantes.
                </div>
              )}

              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                <button
                  onClick={() => { setEtape('accueil'); setLignes([]); setNomFichier('') }}
                  style={{ width:'100%', padding:'13px 0', borderRadius:12, background:C.primary, color:'#fff', border:'none', fontSize:14, fontWeight:700, cursor:'pointer' }}
                >
                  Importer un autre fichier
                </button>
                <button
                  onClick={onBack}
                  style={{ width:'100%', padding:'11px 0', borderRadius:12, border:`1px solid ${C.border}`, background:C.surface, color:C.textMuted, fontSize:13, fontWeight:500, cursor:'pointer' }}
                >
                  Retour au menu comptable
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
