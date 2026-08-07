import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../../utils/supabaseClient'

interface ExportExcelProps {
  onBack: () => void
}

interface PaymentRow {
  id: string
  date: string
  description: string
  montant: number
  reference_bancaire: string | null
  statut: string
  created_at?: string
}

export default function ExportExcel({ onBack }: ExportExcelProps) {
  const [data, setData] = useState<PaymentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPayments()
  }, [])

  const fetchPayments = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: payments, error: sbError } = await supabase
        .from('paiements')
        .select('*')
        .order('date', { ascending: false })

      if (sbError) throw sbError

      setData(payments || [])
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Impossible de récupérer les écritures comptables.')
    } finally {
      setLoading(false)
    }
  }

  const triggerExcelExport = () => {
    if (data.length === 0) return
    
    setExporting(true)

    try {
      const formattedData = data.map((item, index) => ({
        'N° Séquence': index + 1,
        'Date Opération': item.date,
        'Libellé / Description': item.description,
        'Montant (FCFA)': item.montant,
        'Référence Bancaire': item.reference_bancaire || '—',
        'Statut Rapprochement': item.statut,
        'Identifiant Unique': item.id
      }))

      const worksheet = XLSX.utils.json_to_sheet(formattedData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Journal des Paiements')

      const maxProps = [{ wch: 12 }, { wch: 15 }, { wch: 35 }, { wch: 15 }, { wch: 20 }, { wch: 22 }, { wch: 20 }]
      worksheet['!cols'] = maxProps

      const fileName = `AIDEDUC_Journal_Comptable_${new Date().toISOString().split('T')[0]}.xlsx`
      XLSX.writeFile(workbook, fileName)

    } catch (err) {
      console.error(err)
      alert("Une erreur est survenue lors de la génération du fichier Excel.")
    } finally {
      setExporting(false)
    }
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: '#F8FAFC', minHeight: '100vh', maxWidth: 480, margin: '0 auto', padding: '16px', boxShadow: '0 0 20px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', padding: '4px 8px', color: '#1A1A2E' }}>←</button>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1A1A2E', margin: 0 }}>Export des journaux</h2>
      </div>

      <div style={{ background: '#FFF', borderRadius: 16, padding: 20, border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', marginBottom: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1A1A2E', margin: '0 0 6px 0' }}>Extraction Excel</h3>
        <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.5, margin: '0 0 20px 0' }}>
          Générez instantanément un fichier comptable complet au format .xlsx contenant l'intégralité des écritures de l'école.
        </p>

        <button
          onClick={triggerExcelExport}
          disabled={loading || data.length === 0 || exporting}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 12,
            background: data.length === 0 ? '#CBD5E1' : '#1A1A2E',
            color: '#FFF',
            border: 'none',
            fontWeight: 700,
            fontSize: 14,
            cursor: data.length === 0 || loading ? 'not-allowed' : 'pointer',
            boxShadow: data.length === 0 ? 'none' : '0 4px 12px rgba(26,26,46,0.15)',
            transition: 'opacity 0.2s'
          }}
        >
          {exporting ? 'Génération...' : loading ? 'Chargement de la base...' : `Télécharger le journal (${data.length} lignes)`}
        </button>
      </div>

      {error && (
        <div style={{ padding: 12, borderRadius: 10, backgroundColor: '#FEF2F2', color: '#991B1B', border: '1px solid #FCA5A5', fontSize: 13, marginBottom: 20 }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>
        Derniers flux synchronisés
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748B', fontSize: 14 }}>
          Connexion à Supabase...
        </div>
      ) : data.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94A3B8', fontSize: 13, background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0' }}>
          Aucune donnée trouvée dans Supabase.<br/>Utilisez d'abord le module d'import Drag & Drop.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.slice(0, 4).map((item) => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#FFF', borderRadius: 12, border: '1px solid #E2E8F0' }}>
              <div style={{ maxWidth: '70%' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.description}
                </div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                  {new Date(item.date).toLocaleDateString('fr-FR')} • {item.statut}
                </div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#10B981' }}>
                +{item.montant.toLocaleString('fr-FR')} F
              </div>
            </div>
          ))}
          {data.length > 4 && (
            <div style={{ textAlign: 'center', fontSize: 12, color: '#94A3B8', marginTop: 4 }}>
              ... et {data.length - 4} autres lignes prêtes dans le tableur.
            </div>
          )}
        </div>
      )}
    </div>
  )
}