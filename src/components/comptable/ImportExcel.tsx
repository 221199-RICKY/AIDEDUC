import React, { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../../supabaseClient'

interface ImportExcelProps {
  onBack: () => void
}

export default function ImportExcel({ onBack }: ImportExcelProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  const [previewData, setPreviewData] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Gestionnaires du Drag & Drop sur la zone cible
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      processFile(files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      processFile(files[0])
    }
  }

  // Lecture du fichier Excel avec SheetJS (xlsx)
  const processFile = (file: File) => {
    // Vérification rapide de l'extension
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv')) {
      setStatus({ type: 'error', message: 'Veuillez déposer un fichier Excel (.xlsx, .xls) ou .csv' })
      return
    }

    setStatus({ type: 'info', message: `Lecture du fichier : ${file.name}...` })
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true })
        
        // On récupère la première feuille du classeur Excel
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        
        // Conversion des lignes en tableau d'objets JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet)

        if (jsonData.length === 0) {
          setStatus({ type: 'error', message: 'Le fichier Excel semble vide.' })
          return
        }

        setPreviewData(jsonData)
        setStatus({ type: 'info', message: `${jsonData.length} transactions trouvées. Prêtes à être envoyées.` })
      } catch (err) {
        console.error(err)
        setStatus({ type: 'error', message: "Erreur lors de la lecture du fichier Excel." })
      }
    }

    reader.readAsBinaryString(file)
  }

  // Envoi massif des lignes vers Supabase
  const handleSaveToSupabase = async () => {
    if (previewData.length === 0) return

    setLoading(true)
    setStatus({ type: 'info', message: 'Synchronisation avec Supabase en cours...' })

    try {
      // Nettoyage et formatage à la volée si nécessaire
      const rowsToInsert = previewData.map((row: any) => ({
        // Adaptez ces clés selon les en-têtes exacts de votre fichier Excel
        date: row.date || new Date().toISOString().split('T')[0],
        description: row.description || 'Transaction Excel',
        montant: parseFloat(row.montant) || 0,
        reference_bancaire: row.reference_bancaire || row.reference || null,
        eleve_id: row.eleve_id || null, // Optionnel si vous faites le rapprochement plus tard
        statut: 'En attente'
      }))

      // Requête d'insertion groupée vers votre table Supabase
      const { error } = await supabase
        .from('paiements') // Nom exact de votre table dans Supabase
        .insert(rowsToInsert)

      if (error) throw error

      setStatus({ 
        type: 'success', 
        message: `Parfait ! ${rowsToInsert.length} écritures importées avec succès dans Supabase.` 
      })
      setPreviewData([]) // Vider la prévisualisation après succès
    } catch (err: any) {
      console.error(err)
      setStatus({ 
        type: 'error', 
        message: `Erreur Supabase : ${err.message || 'Impossible d\'enregistrer les données.'}` 
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: '#F8FAFC', minHeight: '100vh', maxWidth: 480, margin: '0 auto', padding: '16px', boxShadow: '0 0 20px rgba(0,0,0,0.05)' }}>
      {/* Barre de retour */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', padding: '4px 8px', color: '#1A1A2E' }}>←</button>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1A1A2E', margin: 0 }}>Import relevé Excel</h2>
      </div>

      {/* Zone de Drag and Drop */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragging ? '#3B82F6' : '#CBD5E1'}`,
          backgroundColor: isDragging ? '#EFF6FF' : '#FFFFFF',
          borderRadius: 16,
          padding: '40px 20px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept=".xlsx, .xls, .csv" 
          style={{ display: 'none' }} 
        />
        <div style={{ fontSize: 40, marginBottom: 12 }}>📥</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#1A1A2E', marginBottom: 4 }}>
          Glissez-déposez votre relevé ici
        </div>
        <div style={{ fontSize: 12, color: '#64748B' }}>
          ou cliquez pour parcourir vos fichiers (.xlsx, .csv)
        </div>
      </div>

      {/* Alertes d'état / Messages système */}
      {status && (
        <div style={{
          marginTop: 16,
          padding: '12px 14px',
          borderRadius: 10,
          fontSize: 13,
          lineHeight: 1.5,
          backgroundColor: status.type === 'success' ? '#ECFDF5' : status.type === 'error' ? '#FEF2F2' : '#F0F9FF',
          color: status.type === 'success' ? '#065F46' : status.type === 'error' ? '#991B1B' : '#075985',
          border: `1px solid ${status.type === 'success' ? '#A7F3D0' : status.type === 'error' ? '#FCA5A5' : '#BAE6FD'}`
        }}>
          {status.message}
        </div>
      )}

      {/* Aperçu des données lues avant envoi */}
      {previewData.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Aperçu des lignes ({previewData.length})</span>
          </div>

          <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: 10, background: '#fff' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #E2E8F0', position: 'sticky', top: 0 }}>
                  <th style={{ padding: '8px 10px', color: '#475569' }}>Date</th>
                  <th style={{ padding: '8px 10px', color: '#475569' }}>Libellé</th>
                  <th style={{ padding: '8px 10px', color: '#475569', textAlign: 'right' }}>Montant</th>
                </tr>
              </thead>
              <tbody>
                {previewData.slice(0, 5).map((row, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '8px 10px', color: '#334155' }}>
                      {row.date instanceof Date ? row.date.toLocaleDateString('fr-FR') : String(row.date || '')}
                    </td>
                    <td style={{ padding: '8px 10px', color: '#334155', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.description || row.libelle || '—'}
                    </td>
                    <td style={{ padding: '8px 10px', color: '#10B981', fontWeight: 600, textAlign: 'right' }}>
                      {parseFloat(row.montant || 0).toLocaleString('fr-FR')} F
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {previewData.length > 5 && (
              <div style={{ textAlign: 'center', padding: '8px', fontSize: 11, color: '#94A3B8', borderTop: '1px solid #F1F5F9', background: '#FAFAFA' }}>
                + {previewData.length - 5} autres lignes masquées dans l'aperçu
              </div>
            )}
          </div>

          {/* Bouton d'action pour injecter dans Supabase */}
          <button
            onClick={handleSaveToSupabase}
            disabled={loading}
            style={{
              marginTop: 16,
              width: '100%',
              padding: '14px',
              borderRadius: 12,
              background: '#1A1A2E',
              color: '#FFF',
              border: 'none',
              fontWeight: 700,
              fontSize: 14,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              boxShadow: '0 4px 12px rgba(26,26,46,0.15)'
            }}
          >
            {loading ? 'Téléversement en cours...' : 'Valider et envoyer vers Supabase'}
          </button>
        </div>
      )}
    </div>
  )
}