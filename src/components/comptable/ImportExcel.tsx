import React, { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
// 1. Correction du chemin vers Supabase
import { supabase } from '../../utils/supabaseClient'

interface ImportExcelProps {
  onBack: () => void
}

export default function ImportExcel({ onBack }: ImportExcelProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  const [previewData, setPreviewData] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const processFile = (file: File) => {
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
        
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        
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

  const handleSaveToSupabase = async () => {
    if (previewData.length === 0) return

    setLoading(true)
    setStatus({ type: 'info', message: 'Synchronisation avec Supabase en cours...' })

    try {
      // 2. Correction du mapping pour correspondre aux majuscules d'AIDEDUC (EleveId, Montant)
      const rowsToInsert = previewData.map((row: any) => ({
        EleveId: row.EleveId || row.eleve_id || row['ID Eleve'] || null,
        Montant: parseFloat(row.Montant || row.montant || row.MontantPaye || 0),
        DatePaiement: row.DatePaiement || row.date || new Date().toISOString().split('T')[0],
        ModePaiement: row.ModePaiement || row.mode || 'Espèces',
        Motif: row.Motif || row.description || 'Scolarité'
      }))

      const { error } = await supabase
        .from('paiements')
        .insert(rowsToInsert)

      if (error) throw error

      setStatus({ 
        type: 'success', 
        message: `Parfait ! ${rowsToInsert.length} écriture(s) importée(s) avec succès dans Supabase.` 
      })
      setPreviewData([])
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
    // 3. Suppression du maxWidth 480 pour s'adapter au layout Web
    <div style={{ fontFamily: "sans-serif", background: '#FFFFFF', padding: '24px', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={onBack} style={{ background: '#F1F5F9', border: 'none', fontSize: 16, cursor: 'pointer', padding: '6px 12px', borderRadius: 6, color: '#1E293B', fontWeight: 600 }}>← Retour</button>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', margin: 0 }}>Importation des relevés Excel</h2>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragging ? '#2563EB' : '#CBD5E1'}`,
          backgroundColor: isDragging ? '#EFF6FF' : '#F8FAFC',
          borderRadius: 12,
          padding: '40px 20px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
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
        <div style={{ fontSize: 15, fontWeight: 600, color: '#1E293B', marginBottom: 4 }}>
          Glissez-déposez votre relevé Excel ici
        </div>
        <div style={{ fontSize: 13, color: '#64748B' }}>
          ou cliquez pour parcourir vos fichiers (.xlsx, .xls, .csv)
        </div>
      </div>

      {status && (
        <div style={{
          marginTop: 16,
          padding: '12px 14px',
          borderRadius: 8,
          fontSize: 14,
          backgroundColor: status.type === 'success' ? '#DCFCE7' : status.type === 'error' ? '#FEE2E2' : '#E0F2FE',
          color: status.type === 'success' ? '#166534' : status.type === 'error' ? '#991B1B' : '#0369A1',
          fontWeight: 500
        }}>
          {status.message}
        </div>
      )}

      {previewData.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#334155', marginBottom: 12 }}>Aperçu des données ({previewData.length} lignes)</h3>

          <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #E2E8F0', position: 'sticky', top: 0 }}>
                  <th style={{ padding: '10px' }}>EleveId</th>
                  <th style={{ padding: '10px' }}>Montant</th>
                  <th style={{ padding: '10px' }}>Motif / Description</th>
                </tr>
              </thead>
              <tbody>
                {previewData.slice(0, 5).map((row, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '8px 10px' }}>{row.EleveId || row.eleve_id || '—'}</td>
                    <td style={{ padding: '8px 10px', color: '#16A34A', fontWeight: 600 }}>
                      {parseFloat(row.Montant || row.montant || 0).toLocaleString('fr-FR')} FCFA
                    </td>
                    <td style={{ padding: '8px 10px' }}>{row.Motif || row.description || row.libelle || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleSaveToSupabase}
            disabled={loading}
            style={{
              marginTop: 16,
              width: '100%',
              padding: '12px',
              borderRadius: 8,
              background: '#1E3A8A',
              color: '#FFF',
              border: 'none',
              fontWeight: 600,
              fontSize: 15,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Validation en cours...' : '🚀 Valider et envoyer vers Supabase'}
          </button>
        </div>
      )}
    </div>
  )
}