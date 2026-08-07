import { useState } from 'react'

interface RelancesProps {
  onBack: () => void
}

// Données fictives pour la démo de relances
const impayesInitiaux = [
  { id: '1', nom: 'Kouassi Jean', classe: '6ème A', reste: 45000, parent: 'M. Kouassi', tel: '22997000000' },
  { id: '2', nom: 'Mensa Ablavi', classe: '3ème B', reste: 75000, parent: 'Mme Mensah', tel: '22996000000' },
  { id: '3', nom: 'Diallo Ousmane', classe: 'CM2', reste: 20000, parent: 'M. Diallo', tel: '22995000000' },
]

export default function Relances({ onBack }: RelancesProps) {
  const [liste] = useState(impayesInitiaux)

  const envoyerRelanceWhatsApp = (eleve: typeof impayesInitiaux[0]) => {
    // Message personnalisé automatique
    const message = `Bonjour ${eleve.parent}, sauf erreur de notre part, il reste un solde de ${eleve.reste.toLocaleString('fr-FR')} F pour la scolarité de ${eleve.nom} (${eleve.classe}). Merci de régulariser dès que possible. Cordialement, la comptabilité AIDEDUC.`
    
    // Encodage du texte pour l'URL WhatsApp
    const urlUrl = `https://wa.me/${eleve.tel}?text=${encodeURIComponent(message)}`
    
    // Ouverture du lien WhatsApp click-to-chat dans un nouvel onglet
    window.open(urlUrl, '_blank')
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: '#F8FAFC', minHeight: '100vh', maxWidth: 480, margin: '0 auto', padding: '16px', boxShadow: '0 0 20px rgba(0,0,0,0.05)' }}>
      {/* Barre de retour */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', padding: '4px 8px', color: '#1A1A2E' }}>←</button>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1A1A2E', margin: 0 }}>Suivi & Relances</h2>
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 12 }}>
        Élèves en retard de paiement ({liste.length})
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {liste.map((eleve) => (
          <div key={eleve.id} style={{ background: '#FFF', borderRadius: 14, padding: 16, border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E' }}>{eleve.nom}</div>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Classe : {eleve.classe}</div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#EF4444', textAlign: 'right' }}>
                {eleve.reste.toLocaleString('fr-FR')} F
                <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 400, marginTop: 2 }}>Dû</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #F1F5F9', paddingTop: 10, marginTop: 4 }}>
              <div style={{ fontSize: 12, color: '#475569' }}>
                👤 {eleve.parent}
              </div>
              
              <button
                onClick={() => envoyerRelanceWhatsApp(eleve)}
                style={{
                  background: '#25D366', // Couleur officielle WhatsApp
                  color: '#FFF',
                  border: 'none',
                  borderRadius: 8,
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 2px 4px rgba(37,211,102,0.2)'
                }}
              >
                💬 Relancer
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}