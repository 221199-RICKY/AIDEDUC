// ─────────────────────────────────────────────
// AIDEDUC — SaisieNotes.tsx (MVP sans PDF)
// src/components/enseignant/SaisieNotes.tsx
// Saisie notes + calcul moyennes uniquement
// ─────────────────────────────────────────────

import { useState, useMemo, useCallback } from 'react'

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
type TypeEpreuve = 'Interro 1' | 'Interro 2' | 'Devoir 1' | 'Devoir 2' | 'Examen'
type Onglet = 'saisie' | 'moyennes'

interface Matiere {
  id: string
  nom: string
  coefficient: number
}

interface Eleve {
  id: string
  prenom: string
  nom: string
  numero: string
  redoublant?: boolean
}

interface Classe {
  id: string
  nom: string
  eleves: Eleve[]
  matieres: Matiere[]
}

// ── Données de démo ───────────────────────────
const CLASSES: Classe[] = [
  {
    id: 'cl-1',
    nom: 'Terminale C',
    eleves: [
      { id:'e1', prenom:'Amina',   nom:'Konaté',    numero:'TCL-001' },
      { id:'e2', prenom:'Basile',  nom:'Mensah',    numero:'TCL-002' },
      { id:'e3', prenom:'Chloé',   nom:'Adjovi',    numero:'TCL-003' },
      { id:'e4', prenom:'David',   nom:'Sow',       numero:'TCL-004', redoublant:true },
      { id:'e5', prenom:'Estelle', nom:'Diallo',    numero:'TCL-005' },
      { id:'e6', prenom:'Franck',  nom:'Togbé',     numero:'TCL-006' },
    ],
    matieres: [
      { id:'m1', nom:'Mathématiques',   coefficient:5 },
      { id:'m2', nom:'Physique-Chimie', coefficient:4 },
      { id:'m3', nom:'Français',        coefficient:4 },
      { id:'m4', nom:'Histoire-Géo',    coefficient:3 },
      { id:'m5', nom:'Anglais',         coefficient:2 },
      { id:'m6', nom:'EPS',             coefficient:1 },
    ],
  },
  {
    id: 'cl-2',
    nom: 'Première D',
    eleves: [
      { id:'e9',  prenom:'Isabelle', nom:'Zannou',    numero:'PD-001' },
      { id:'e10', prenom:'Jules',    nom:'Coulibaly', numero:'PD-002' },
      { id:'e11', prenom:'Karine',   nom:'Dossou',    numero:'PD-003' },
      { id:'e12', prenom:'Lionel',   nom:'Akplogan',  numero:'PD-004', redoublant:true },
    ],
    matieres: [
      { id:'m7', nom:'Mathématiques',   coefficient:4 },
      { id:'m8', nom:'Physique-Chimie', coefficient:4 },
      { id:'m9', nom:'Français',        coefficient:3 },
      { id:'m10',nom:'Anglais',         coefficient:2 },
    ],
  },
  {
    id: 'cl-3',
    nom: '2nde B',
    eleves: [
      { id:'e14', prenom:'Nathan',   nom:'Toviho',   numero:'2B-001' },
      { id:'e15', prenom:'Olivia',   nom:'Fandohan', numero:'2B-002' },
      { id:'e16', prenom:'Pascal',   nom:'Goudou',   numero:'2B-003' },
      { id:'e17', prenom:'Quintina', nom:'Houinsou', numero:'2B-004' },
    ],
    matieres: [
      { id:'m11', nom:'Mathématiques', coefficient:4 },
      { id:'m12', nom:'Français',      coefficient:3 },
      { id:'m13', nom:'Anglais',       coefficient:2 },
    ],
  },
]

const EPEUVES: TypeEpreuve[] = ['Interro 1', 'Interro 2', 'Devoir 1', 'Devoir 2', 'Examen']

const AVATARS = [
  {bg:'#E6F1FB',fg:'#0C447C'},{bg:'#EAF3DE',fg:'#27500A'},
  {bg:'#FAEEDA',fg:'#633806'},{bg:'#EEEDFE',fg:'#3C3489'},
  {bg:'#FAECE7',fg:'#712B13'},{bg:'#E1F5EE',fg:'#085041'},
]

// ── Helpers ───────────────────────────────────
function initiales(e: Eleve) {
  return `${e.prenom[0]}${e.nom[0]}`.toUpperCase()
}

function parseNote(val: string): number | null {
  const n = parseFloat(val.replace(',', '.'))
  if (isNaN(n) || n < 0 || n > 20) return null
  return n
}

function noteColor(n: number): string {
  return n >= 14 ? C.green : n >= 10 ? C.amber : C.red
}

function noteBg(n: number): string {
  return n >= 14 ? '#EAF3DE' : n >= 10 ? '#FAEEDA' : '#FCEBEB'
}

function appreciation(n: number): string {
  if (n >= 16) return 'Excellent'
  if (n >= 14) return 'Très bien'
  if (n >= 12) return 'Bien'
  if (n >= 10) return 'Assez bien'
  if (n >=  8) return 'Passable'
  return 'Insuffisant'
}

// ── Store : notes[classeId][eleveId][matiereId][epreuve] ──
type NotesStore = Record<
  string,
  Record<string, Record<string, Partial<Record<TypeEpreuve, string>>>>
>

// ── Formule officielle ────────────────────────
// 1. Moy. interros  = (Interro1 + Interro2) / 2       (si au moins 1 interro)
// 2. Moy. devoirs   = (Devoir1  + Devoir2)  / 2       (si au moins 1 devoir)
// 3. Moy. matière   = (moy_interros + moy_devoirs + Examen) / 3  (termes présents seulement)
// 4. Moy. coeff.    = moy_matière × coefficient
// 5. Moy. générale  = Σ(moy_coeff) / Σ(coefficients des matières ayant une moyenne)

function moyInterros(bloc: Partial<Record<TypeEpreuve, string>> | undefined): number | null {
  const vals = (['Interro 1', 'Interro 2'] as TypeEpreuve[])
    .map(ep => parseNote(bloc?.[ep] ?? ''))
    .filter((v): v is number => v !== null)
  return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : null
}

function moyDevoirs(bloc: Partial<Record<TypeEpreuve, string>> | undefined): number | null {
  const vals = (['Devoir 1', 'Devoir 2'] as TypeEpreuve[])
    .map(ep => parseNote(bloc?.[ep] ?? ''))
    .filter((v): v is number => v !== null)
  return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : null
}

function moyMatiere(bloc: Partial<Record<TypeEpreuve, string>> | undefined): number | null {
  const mi  = moyInterros(bloc)
  const md  = moyDevoirs(bloc)
  const ex  = parseNote(bloc?.['Examen'] ?? '')
  const composantes = [mi, md, ex].filter((v): v is number => v !== null)
  if (composantes.length === 0) return null
  return composantes.reduce((s, v) => s + v, 0) / composantes.length
}

function calcEleveStats(
  store: NotesStore,
  classeId: string,
  eleve: Eleve,
  matieres: Matiere[]
) {
  const matiereStats = matieres.map(mat => {
    const bloc = store[classeId]?.[eleve.id]?.[mat.id]
    const moy  = moyMatiere(bloc)
    const moyCoeff = moy !== null ? moy * mat.coefficient : null
    return { matiere: mat, moy, moyCoeff }
  })

  // Moy. générale = Σ(moy × coeff) / Σ(coeff) pour les matières ayant une moyenne
  const withMoy  = matiereStats.filter(m => m.moy !== null)
  let moyGen: number | null = null
  if (withMoy.length > 0) {
    const sumCoeff     = withMoy.reduce((s, m) => s + m.matiere.coefficient, 0)
    const sumMoyCoeff  = withMoy.reduce((s, m) => s + m.moyCoeff!, 0)
    moyGen = sumMoyCoeff / sumCoeff
  }

  return { matiereStats, moyGen }
}

// ── COMPOSANT PRINCIPAL ───────────────────────
interface SaisieNotesProps {
  onBack: () => void
}

export default function SaisieNotes({ onBack }: SaisieNotesProps) {
  const [classeId,  setClasseId]  = useState(CLASSES[0].id)
  const [matiereId, setMatiereId] = useState(CLASSES[0].matieres[0].id)
  const [epreuve,   setEpreuve]   = useState<TypeEpreuve>('Devoir 1')
  const [onglet,    setOnglet]    = useState<Onglet>('saisie')
  const [store,     setStore]     = useState<NotesStore>({})
  const [saving,    setSaving]    = useState(false)
  const [flash,     setFlash]     = useState(false)

  const classe  = useMemo(() => CLASSES.find(c => c.id === classeId)!, [classeId])
  const matiere = useMemo(() => classe.matieres.find(m => m.id === matiereId) ?? classe.matieres[0], [classe, matiereId])

  function handleClasseChange(id: string) {
    setClasseId(id)
    const c = CLASSES.find(cl => cl.id === id)!
    setMatiereId(c.matieres[0].id)
  }

  function getVal(eleveId: string): string {
    return store[classeId]?.[eleveId]?.[matiereId]?.[epreuve] ?? ''
  }

  const setVal = useCallback((eleveId: string, val: string) => {
    if (val !== '' && !/^[0-9.,]*$/.test(val)) return
    setStore(prev => ({
      ...prev,
      [classeId]: {
        ...prev[classeId],
        [eleveId]: {
          ...prev[classeId]?.[eleveId],
          [matiereId]: {
            ...prev[classeId]?.[eleveId]?.[matiereId],
            [epreuve]: val,
          },
        },
      },
    }))
  }, [classeId, matiereId, epreuve])

  const notesValides = useMemo(() =>
    classe.eleves
      .map(e => ({ eleve: e, note: parseNote(getVal(e.id)) }))
      .filter((x): x is { eleve: Eleve; note: number } => x.note !== null),
    [store, classeId, matiereId, epreuve, classe]
  )

  const moyClasse = notesValides.length
    ? notesValides.reduce((s, x) => s + x.note, 0) / notesValides.length
    : null

  const rangSaisie = useMemo(() => {
    const sorted = [...notesValides].sort((a, b) => b.note - a.note)
    const r: Record<string, number> = {}
    sorted.forEach((x, i) => { r[x.eleve.id] = i + 1 })
    return r
  }, [notesValides])

  const eleveStats = useMemo(() =>
    classe.eleves.map(eleve => ({
      eleve,
      ...calcEleveStats(store, classe.id, eleve, classe.matieres),
    })),
    [store, classeId, classe]
  )

  const classement = useMemo(() => {
    const sorted = [...eleveStats]
      .filter(s => s.moyGen !== null)
      .sort((a, b) => b.moyGen! - a.moyGen!)
    const r: Record<string, number> = {}
    sorted.forEach((s, i) => { r[s.eleve.id] = i + 1 })
    return r
  }, [eleveStats])

  async function sauvegarder() {
    if (notesValides.length === 0) return
    setSaving(true)
    await new Promise(r => setTimeout(r, 700))
    setSaving(false)
    setFlash(true)
    setTimeout(() => setFlash(false), 3000)
  }

  // ── VUE SAISIE ──────────────────────────────
  const VueSaisie = () => (
    <div style={{ padding:'14px 16px 28px', display:'flex', flexDirection:'column', gap:12 }}>

      {flash && (
        <div style={{ background:'#EAF3DE', border:'1px solid #97C459', borderRadius:10, padding:'11px 14px', fontSize:13, color:'#27500A', fontWeight:600 }}>
          ✅ Notes enregistrées — {matiere.nom} · {epreuve}
        </div>
      )}

      {/* Sélecteur matière */}
      <div>
        <label style={{ display:'block', fontSize:10, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'.4px', marginBottom:6 }}>
          Matière
        </label>
        <div style={{ position:'relative' }}>
          <select
            value={matiereId}
            onChange={e => setMatiereId(e.target.value)}
            style={{
              width:'100%', padding:'10px 32px 10px 12px', borderRadius:10,
              border:`1.5px solid ${C.primary}`, background:C.surface,
              color:C.textMain, fontSize:13, fontWeight:600,
              appearance:'none', outline:'none', cursor:'pointer',
            }}
          >
            {classe.matieres.map(m => (
              <option key={m.id} value={m.id}>{m.nom} (coef. {m.coefficient})</option>
            ))}
          </select>
          <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:C.primary, pointerEvents:'none' }}>▾</span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ background:C.surface, borderRadius:12, padding:'12px 14px', border:`1px solid ${C.border}`, display:'flex' }}>
        {[
          { label:'Saisies',     value:`${notesValides.length}/${classe.eleves.length}`, color:C.primary },
          { label:'Moy. classe', value: moyClasse !== null ? `${moyClasse.toFixed(1)}/20` : '—', color: moyClasse !== null ? noteColor(moyClasse) : C.textMuted },
          { label:'Coef.',       value:`${matiere.coefficient}`, color:C.purple },
        ].map((s, i) => (
          <div key={i} style={{ flex:1, textAlign:'center', borderRight:i<2?`1px solid ${C.border}`:'none', padding:'0 6px' }}>
            <div style={{ fontSize:16, fontWeight:700, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:10, color:C.textMuted, marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Grille élèves */}
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 56px', padding:'8px 14px', background:'#F8FAFC', borderBottom:`1px solid ${C.border}`, gap:8 }}>
          <div style={{ fontSize:10, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'.5px' }}>Élève</div>
          <div style={{ fontSize:10, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'.5px', textAlign:'center' }}>Note /20</div>
          <div style={{ fontSize:10, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'.5px', textAlign:'center' }}>Rang</div>
        </div>

        {classe.eleves.map((eleve, idx) => {
          const av   = AVATARS[idx % AVATARS.length]
          const raw  = getVal(eleve.id)
          const note = parseNote(raw)
          const rang = note !== null ? rangSaisie[eleve.id] : null

          return (
            <div key={eleve.id} style={{
              display:'grid', gridTemplateColumns:'1fr 80px 56px',
              alignItems:'center', gap:8, padding:'8px 14px',
              borderBottom: idx < classe.eleves.length-1 ? `1px solid ${C.border}` : 'none',
              background: note !== null && note < 10 ? '#FFF8F8' : C.surface,
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
                <div style={{ width:34, height:34, borderRadius:'50%', background:av.bg, color:av.fg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, flexShrink:0 }}>
                  {initiales(eleve)}
                </div>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:C.textMain, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {eleve.prenom} {eleve.nom}
                    {eleve.redoublant && (
                      <span style={{ marginLeft:5, fontSize:9, padding:'1px 5px', borderRadius:20, background:'#EEEDFE', color:'#3C3489', fontWeight:500 }}>R</span>
                    )}
                  </div>
                  {note !== null && (
                    <div style={{ fontSize:10, color:noteColor(note), fontWeight:500, marginTop:1 }}>
                      {appreciation(note)}
                    </div>
                  )}
                </div>
              </div>

              <input
                type="number"
                inputMode="decimal"
                min={0} max={20} step={0.5}
                value={raw}
                onChange={e => setVal(eleve.id, e.target.value)}
                onBlur={e => {
                  const n = parseNote(e.target.value)
                  if (n !== null) setVal(eleve.id, String(Math.round(n * 2) / 2))
                }}
                placeholder="—"
                aria-label={`Note de ${eleve.prenom} ${eleve.nom}`}
                style={{
                  width:'100%', height:42, borderRadius:9, textAlign:'center',
                  fontSize:16, fontWeight:700,
                  border:`1.5px solid ${raw==='' ? C.border : note!==null ? noteColor(note) : '#F7A3A3'}`,
                  background: raw==='' ? '#F8F9FA' : note!==null ? noteBg(note) : '#FCEBEB',
                  color: note!==null ? noteColor(note) : C.textMuted,
                  outline:'none', transition:'all 0.12s',
                }}
              />

              <div style={{ textAlign:'center' }}>
                {rang !== null ? (
                  <span style={{ fontSize:12, fontWeight:700, color:rang===1?C.accent:rang<=3?C.green:C.textMuted }}>
                    {rang===1 ? '🥇' : `${rang}e`}
                  </span>
                ) : (
                  <span style={{ color:'#D0D5DD' }}>—</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Distribution */}
      {notesValides.length >= 3 && (
        <div style={{ background:C.surface, borderRadius:12, padding:'12px 14px', border:`1px solid ${C.border}` }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'.4px', marginBottom:10 }}>
            Distribution
          </div>
          <div style={{ display:'flex', gap:6 }}>
            {[
              { label:'≥ 14', count:notesValides.filter(x=>x.note>=14).length,              color:C.green },
              { label:'10–13',count:notesValides.filter(x=>x.note>=10&&x.note<14).length,   color:C.amber },
              { label:'< 10', count:notesValides.filter(x=>x.note<10).length,               color:C.red   },
            ].map(d => (
              <div key={d.label} style={{ flex:1, textAlign:'center', padding:'8px 4px', borderRadius:8, background:`${d.color}18`, border:`1px solid ${d.color}30` }}>
                <div style={{ fontSize:20, fontWeight:700, color:d.color }}>{d.count}</div>
                <div style={{ fontSize:10, color:C.textMuted, marginTop:2 }}>{d.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={sauvegarder}
        disabled={saving || notesValides.length===0}
        style={{
          width:'100%', padding:'14px 0', borderRadius:12, border:'none',
          background: notesValides.length===0 ? '#D0D5DD' : saving ? '#85B7EB' : C.primary,
          color:'#fff', fontSize:15, fontWeight:700,
          cursor: notesValides.length===0 ? 'not-allowed' : saving ? 'wait' : 'pointer',
          display:'flex', alignItems:'center', justifyContent:'center', gap:8,
        }}
      >
        {saving ? '⏳ Enregistrement…' : `💾 Enregistrer (${notesValides.length}/${classe.eleves.length})`}
      </button>
    </div>
  )

  // ── VUE MOYENNES ────────────────────────────
  const VueMoyennes = () => {
    const avecMoy     = eleveStats.filter(s => s.moyGen !== null)
    const moyGlobale  = avecMoy.length
      ? avecMoy.reduce((s, x) => s + x.moyGen!, 0) / avecMoy.length
      : null

    return (
      <div style={{ padding:'14px 16px 28px', display:'flex', flexDirection:'column', gap:12 }}>

        {/* Résumé classe */}
        <div style={{ background:C.primary, borderRadius:14, padding:'14px 16px', color:'#fff' }}>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)', marginBottom:4 }}>Moyenne générale de la classe</div>
          <div style={{ fontSize:28, fontWeight:700, color:C.accent }}>
            {moyGlobale !== null ? `${moyGlobale.toFixed(2)} / 20` : '—'}
          </div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginTop:4 }}>
            {avecMoy.length}/{classe.eleves.length} élèves avec une moyenne calculée
          </div>
        </div>

        {/* Tableau élèves */}
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 68px 48px 72px', padding:'8px 14px', background:'#F8FAFC', borderBottom:`1px solid ${C.border}`, gap:6 }}>
            {['Élève','Moy. gén.','Rang','Décision'].map((h, i) => (
              <div key={i} style={{ fontSize:10, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'.4px', textAlign:i===0?'left':'center' }}>{h}</div>
            ))}
          </div>

          {[...eleveStats]
            .sort((a, b) => (b.moyGen ?? -1) - (a.moyGen ?? -1))
            .map((s, idx) => {
              const av   = AVATARS[idx % AVATARS.length]
              const rang = s.moyGen !== null ? classement[s.eleve.id] : null
              return (
                <div key={s.eleve.id} style={{
                  display:'grid', gridTemplateColumns:'1fr 68px 48px 72px',
                  alignItems:'center', gap:6, padding:'10px 14px',
                  borderBottom: idx < eleveStats.length-1 ? `1px solid ${C.border}` : 'none',
                  background: s.moyGen !== null && s.moyGen < 10 ? '#FFF8F8' : C.surface,
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
                    <div style={{ width:32, height:32, borderRadius:'50%', background:av.bg, color:av.fg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 }}>
                      {initiales(s.eleve)}
                    </div>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:C.textMain, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {s.eleve.prenom} {s.eleve.nom}
                      </div>
                      <div style={{ fontSize:10, color:C.textMuted }}>{s.eleve.numero}</div>
                    </div>
                  </div>

                  <div style={{ textAlign:'center' }}>
                    {s.moyGen !== null ? (
                      <span style={{ fontSize:15, fontWeight:700, color:noteColor(s.moyGen) }}>
                        {s.moyGen.toFixed(1)}
                      </span>
                    ) : <span style={{ color:'#D0D5DD' }}>—</span>}
                  </div>

                  <div style={{ textAlign:'center', fontSize:13, fontWeight:700, color:rang===1?C.accent:rang&&rang<=3?C.green:C.textMuted }}>
                    {rang ? (rang===1 ? '🥇' : `${rang}e`) : '—'}
                  </div>

                  <div style={{ textAlign:'center' }}>
                    {s.moyGen !== null ? (
                      <span style={{
                        fontSize:9, padding:'2px 6px', borderRadius:20, fontWeight:600,
                        background: s.moyGen>=10 ? '#EAF3DE' : '#FCEBEB',
                        color:      s.moyGen>=10 ? '#27500A' : '#A32D2D',
                      }}>
                        {s.moyGen >= 10 ? 'Passage' : 'À revoir'}
                      </span>
                    ) : <span style={{ color:'#D0D5DD', fontSize:11 }}>—</span>}
                  </div>
                </div>
              )
            })}
        </div>

        {/* Moyennes par matière */}
        <div style={{ fontSize:11, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'.4px' }}>
          Par matière
        </div>
        {classe.matieres.map(mat => {
          const statsMatiere = eleveStats
            .map(s => s.matiereStats.find(ms => ms.matiere.id === mat.id))
            .filter(Boolean) as { matiere: Matiere; moy: number | null; moyCoeff: number | null }[]
          const avecMoy = statsMatiere.filter(m => m.moy !== null)
          // Moy. classe pour cette matière = moyenne des moy_matière
          const moyClMat = avecMoy.length
            ? avecMoy.reduce((s, m) => s + m.moy!, 0) / avecMoy.length
            : null
          // Moy. coefficientée classe = moy_classe × coeff
          const moyCoeffCl = moyClMat !== null ? moyClMat * mat.coefficient : null

          return (
            <div key={mat.id} style={{ background:C.surface, borderRadius:10, padding:'10px 14px', border:`1px solid ${C.border}` }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: moyClMat !== null ? 6 : 0 }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:C.textMain }}>{mat.nom}</div>
                  <div style={{ fontSize:11, color:C.textMuted }}>Coef. {mat.coefficient} · {avecMoy.length}/{classe.eleves.length} élèves</div>
                </div>
                {moyClMat !== null ? (
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:18, fontWeight:700, color:noteColor(moyClMat) }}>{moyClMat.toFixed(2)}/20</div>
                    <div style={{ fontSize:10, color:C.textMuted }}>Moy. coeff : {moyCoeffCl!.toFixed(2)}</div>
                  </div>
                ) : <span style={{ color:'#D0D5DD', fontSize:16 }}>—</span>}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // ── RENDU PRINCIPAL ──────────────────────────
  return (
    <div style={{ fontFamily:"'Inter', system-ui, sans-serif", background:C.bg, minHeight:'100vh', maxWidth:480, margin:'0 auto', display:'flex', flexDirection:'column' }}>

      {/* HEADER */}
      <header style={{ background:C.primary, padding:'12px 16px 14px', position:'sticky', top:0, zIndex:50 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
          <button onClick={onBack} aria-label="Retour" style={{
            background:'rgba(255,255,255,0.15)', border:'none', borderRadius:8,
            width:34, height:34, cursor:'pointer', color:'#fff', fontSize:18,
            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
          }}>←</button>
          <div style={{ display:'flex', alignItems:'center', gap:8, flex:1 }}>
            <div style={{ width:30, height:30, borderRadius:8, background:C.accent, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15 }}>🎓</div>
            <div>
              <div style={{ fontSize:15, fontWeight:700, color:'#fff' }}>AIDEDUC</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.45)' }}>Notes & Moyennes</div>
            </div>
          </div>
        </div>

        {/* Sélecteur classe */}
        <div style={{ position:'relative', marginBottom:10 }}>
          <select value={classeId} onChange={e => handleClasseChange(e.target.value)} style={{
            width:'100%', padding:'9px 32px 9px 14px', borderRadius:10,
            border:`1.5px solid ${C.accent}`, background:'rgba(255,255,255,0.1)',
            color:'#fff', fontSize:13, fontWeight:600, appearance:'none', cursor:'pointer', outline:'none',
          }}>
            {CLASSES.map(c => <option key={c.id} value={c.id} style={{ background:'#1B3A5C' }}>{c.nom}</option>)}
          </select>
          <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:C.accent, pointerEvents:'none' }}>▾</span>
        </div>

        {/* Sélecteur épreuve (saisie seulement) */}
        {onglet === 'saisie' && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:6 }}>
            {EPEUVES.map(ep => (
              <button key={ep} onClick={() => setEpreuve(ep)} style={{
                padding:'7px 4px', borderRadius:8, border:'none',
                background: epreuve===ep ? C.accent : 'rgba(255,255,255,0.1)',
                color: epreuve===ep ? C.primary : 'rgba(255,255,255,0.7)',
                fontWeight: epreuve===ep ? 700 : 400,
                fontSize:10, cursor:'pointer',
              }}>{ep}</button>
            ))}
          </div>
        )}
      </header>

      {/* ONGLETS */}
      <nav style={{ display:'flex', background:C.surface, borderBottom:`1px solid ${C.border}`, position:'sticky', top: onglet==='saisie' ? 142 : 102, zIndex:40 }}>
        {([
          { id:'saisie',   icon:'📝', label:'Saisie'   },
          { id:'moyennes', icon:'📊', label:'Moyennes' },
        ] as { id: Onglet; icon: string; label: string }[]).map(t => (
          <button key={t.id} onClick={() => setOnglet(t.id)} style={{
            flex:1, padding:'10px 0', border:'none', background:'none',
            borderBottom:`3px solid ${onglet===t.id ? C.accent : 'transparent'}`,
            color: onglet===t.id ? C.primary : C.textMuted,
            fontWeight: onglet===t.id ? 700 : 400,
            fontSize:13, cursor:'pointer',
            display:'flex', flexDirection:'column', alignItems:'center', gap:2,
          }}>
            <span style={{ fontSize:18 }}>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      <main style={{ flex:1 }}>
        {onglet === 'saisie'   && <VueSaisie   />}
        {onglet === 'moyennes' && <VueMoyennes />}
      </main>
    </div>
  )
}
