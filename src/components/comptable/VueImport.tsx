import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../../App' // Ajuste le chemin selon l'emplacement exact de ton App.tsx

interface VueImportProps {
  onBack: () => void
}

// ── Palette de Couleurs AIDEDUC ───────────────────────────
const C = {
  primary:   '#1B3A5C',
  accent:    '#F5A623',
  green:     '#1D9E75',
  purple:    '#534AB7',
  surface:   '#FFFFFF',
  border:    '#E2E8F0',
  textMuted: '#6C757D',
  bg:        '#F4F6F9',
  red:       '#E24B4A',
}

export default function VueImport({ onBack }: VueImportProps) {
  const [loading, setLoading] = useState(false)
  const [statut, setStatut] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [preview, setPreview] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Lecture et conversion du fichier Excel localement
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result
        const wb = XLSX.read(bstr, { type: 'binary' })
        const wsname = wb.SheetNames[0] // Récupère la première feuille
        const ws = wb.Sheets[wsname]
        const data = XLSX.utils.sheet_to_json(ws)
        
        if (data.length === 0) {
          setStatut({ type: 'error', msg: 'Le fichier Excel semble vide.' })
          return
        }
        
        setPreview(data) // Stocke l'ensemble des données
        setStatut(null)
      } catch (err) {
        setStatut({ type: 'error', msg: 'Erreur lors de la lecture du fichier Excel.' })
      }
    }
    reader.readAsBinaryString(file)
  }

  // Envoi des lignes converties dans la table Supabase
  async function enregistrerDansSupabase() {
    if (preview.length === 0) return
    setLoading(true)
    setStatut(null)

    try {
      // 💡 Remplace 'votre_table_supabase' par le nom réel de ta table (ex: 'paiements')
      // Assure-toi que les colonnes de ton Excel correspondent exactement aux champs Supabase
      const { error } = await supabase.from('votre_table_supabase').insert(preview)

      if (error) throw error

      setStatut({ 
        type: 'success', 
        msg: `Félicitations ! ${preview.length} lignes ont été importées avec succès dans la base de données.` 
      })
      setPreview([])
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err: any) {
      setStatut({ 
        type: 'error', 
        msg: err.message || "Échec de la synchronisation avec Supabase. Vérifiez la structure des colonnes." 
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: C.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Barre d'en-tête */}
      <header style={{ background: C.primary, padding: '12px 16px 14px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, width: 34, height: 34, cursor: 'pointer', color: '#fff', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            ←
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>🎓</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>AIDEDUC</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>Comptabilité — Importation</div>
            </div>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        
        {/* Zone de téléversement (Drag & Drop / Sélection) */}
        <div style={{ background: C.surface, padding: '24px 20px', borderRadius: 14, border: `2px dashed ${C.purple}`, textAlign: 'center' }}>
          <span style={{ fontSize: 42 }}>📥</span>
          <div style={{ fontSize: 14, fontWeight: 700, marginTop: 10, color: '#1A1A2E' }}>
            Importer la liste des paiements
          </div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4, marginBottom: 20 }}>
            Fichiers pris en charge : Excel (.xlsx, .xls) ou CSV
          </div>
          
          <input 
            type="file" 
            ref={fileInputRef}
            accept=".xlsx, .xls, .csv" 
            onChange={handleFileChange}
            style={{ display: 'none' }} 
            id="excel-file-upload-isolated"
          />
          <label 
            htmlFor="excel-file-upload-isolated" 
            style={{ padding: '12px 24px', background: C.purple, color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'inline-block', boxShadow: '0 2px 8px rgba(83, 74, 183, 0.25)' }}
          >
            Choisir un fichier
          </label>
        </div>

        {/* Notifications d'état */}
        {statut && (
          <div style={{ 
            background: statut.type === 'success' ? '#EAF3DE' : '#FEE2E2', 
            border: `1px solid ${statut.type === 'success' ? C.green : C.red}`, 
            padding: 14, borderRadius: 10, fontSize: 12, fontWeight: 600, 
            color: statut.type === 'success' ? '#27500A' : C.red 
          }}>
            {statut.msg}
          </div>
        )}

        {/* Panneau de validation et d'aperçu des données */}
        {preview.length > 0 && (
          <div style={{ background: C.surface, padding: 16, borderRadius: 14, border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '.5px' }}>
                Extrait des données ({preview.length} lignes détectées)
              </div>
            </div>

            {/* Tableau dynamique basé sur les colonnes du fichier Excel */}
            <div style={{ overflowX: 'auto', borderRadius: 8, border: `1px solid ${C.border}` }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ background: C.bg }}>
                    {Object.keys(preview[0]).map((cle) => (
                      <th key={cle} style={{ padding: '8px 10px', borderBottom: `1px solid ${C.border}`, textAlign: 'left', fontWeight: 600, color: '#333' }}>
                        {cle}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 4).map((ligne, idx) => (
                    <tr key={idx} style={{ background: idx % 2 === 0 ? '#FFF' : '#F8FAFC' }}>
                      {Object.values(ligne).map((valeur: any, cIdx) => (
                        <td key={cIdx} style={{ padding: '8px 10px', borderBottom: `1px solid ${C.border}`, color: '#555' }}>
                          {valeur?.toString()}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length > 4 && (
                <div style={{ padding: 8, textAlign: 'center', color: C.textMuted, fontSize: 10, background: '#FFF', borderTop: `1px solid ${C.border}` }}>
                  ... et {preview.length - 4} autres lignes.
                </div>
              )}
            </div>

            {/* Bouton de confirmation finale */}
            <button 
              onClick={enregistrerDansSupabase}
              disabled={loading}
              style={{ 
                width: '100%', background: C.green, color: '#fff', border: 'none', 
                borderRadius: 10, padding: '14px', fontWeight: 700, cursor: loading ? 'wait' : 'pointer', 
                fontSize: 13, boxShadow: '0 2px 8px rgba(29, 158, 117, 0.25)', transition: 'opacity 0.2s'
              }}
            >
              {loading ? '⏳ Écriture en cours dans Supabase...' : '💾 Valider et importer dans la base'}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}