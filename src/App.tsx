import { useState, useEffect } from 'react'
// Client Supabase configuré
import { supabase } from './utils/supabaseClient'

// ── IMPORTATION DU LOGO ──
import logoAideduc from './assets/Logo AIDEDUC.png'

// Définition de la fonction de calcul financier
function calculerRapportsFinanciers(eleves: any[], paiements: any[]) {
  const totalEncaisse = paiements.reduce((sum, p) => sum + (Number(p.Montant) || 0), 0)
  const totalAttendu = eleves.reduce((sum, e) => sum + (Number(e.Scolarite) || 0), 0)
  const tauxRecouvrement = totalAttendu > 0 ? Math.round((totalEncaisse / totalAttendu) * 100) : 0

  let soldes = 0, partiels = 0, impayes = 0

  eleves.forEach(eleve => {
    const paiementsEleve = paiements.filter(p => p.EleveId === eleve.id)
    const totalPaye = paiementsEleve.reduce((sum, p) => sum + (Number(p.Montant) || 0), 0)
    const scolariteTotale = Number(eleve.Scolarite) || 0

    if (totalPaye >= scolariteTotale && scolariteTotale > 0) {
      soldes++
    } else if (totalPaye > 0) {
      partiels++
    } else {
      impayes++
    }
  })

  return {
    totalEncaisse,
    totalAttendu,
    tauxRecouvrement,
    repartitionStatuts: { soldes, partiels, impayes }
  }
}

// Importations des vues Directeur / Administration
import Dashboard from './components/Dashboard'
import Scolarite from './components/Scolarite'

// ── IMPORTATION DES COMPOSANTS CENSEUR ──
import GestionAbsences from './components/censeur/Absences'
import SuiviCours from './components/censeur/suivicours'
import AffectationsCours from './components/censeur/affectationscours'

// Importations des vues Enseignant
import FaireAppel from './components/enseignant/FaireAppel'
import SaisieNotes from './components/enseignant/SaisieNotes'
import CahierTexte from './components/enseignant/CahierTexte'

// Importations des vues Comptable
import Encaissement          from './components/comptable/Encaissement'
import SuiviRelances         from './components/comptable/SuiviRelances'
import TableauBordComptable  from './components/comptable/TableauBordComptable'
import ImportExcel           from './components/comptable/ImportExcel'

import type { User } from './types'

type Profil = 'directeur' | 'censeur' | 'enseignant' | 'comptable' | 'eleve' | 'parent'

interface OngletNavigation {
  id: string
  label: string
  icon: string
}

export default function App() {
  // ── ÉTATS POUR LES DONNÉES SUPABASE ──
  const [eleves, setEleves] = useState<any[]>([])
  const [paiements, setPaiements] = useState<any[]>([])
  const [absences, setAbsences] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Navigation globale et Profils utilisateur réel Supabase
  const [vue, setVue] = useState<string>('connexion') 
  const [currentTab, setCurrentTab] = useState<string>('')
  const [profil, setProfil] = useState<Profil>('directeur') 
  const [currentUser, setCurrentUser] = useState<User | null>(null)

  // États pour le changement de mot de passe
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [passwordLoading, setPasswordLoading] = useState(false)

  // États pour le formulaire de connexion
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // États pour le formulaire d'inscription
  const [registerForm, setRegisterForm] = useState({
    nom: '',
    prenom: '',
    email: '',
    password: '',
    role: 'enseignant',
    codeEcole: ''
  })
  const [registerSuccess, setRegisterSuccess] = useState<string | null>(null)

  // Onglets Directeur
  const ongletsDirecteur: OngletNavigation[] = [
    { id: 'vue_globale', label: 'Vue Globale', icon: '📈' },
    { id: 'suivi_finances', label: 'Suivi des Finances', icon: '💰' },
    { id: 'suivi_absences', label: 'Suivi des Absences', icon: '🛑' },
    { id: 'affectations_cours', label: 'Affectation des Cours', icon: '🤝' }
  ]

  // Onglets Censeur
  const ongletsCenseur: OngletNavigation[] = [
    { id: 'tableau_pedagogique', label: 'Tableau Pédagogique', icon: '🏫' },
    { id: 'affectations_cours', label: 'Affectation des Cours', icon: '🤝' },
    { id: 'gestion_absences', label: 'Gestion des Absences', icon: '📝' },
    { id: 'suivi_cours', label: 'Suivi des Cours', icon: '📖' }
  ]

  // ── 1. ÉCOUTE DE LA SESSION AUTHENTIFIÉE ──
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        recupererProfilEtDonnees(session.user.id)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        recupererProfilEtDonnees(session.user.id)
      } else {
        setCurrentUser(null)
        if (vue !== 'inscription') setVue('connexion')
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // ── 2. RÉCUPÉRATION DU PROFIL ET REDIRECTION DYNAMIQUE ──
  async function recupererProfilEtDonnees(userId: string) {
    try {
      setLoading(true)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role, school_id')
        .eq('id', userId)
        .single()

      if (profileError || !profileData) throw new Error('Profil introuvable')

      const utilisateurFormate: User = {
        id: profileData.id,
        nom: profileData.last_name,
        prenom: profileData.first_name,
        role: profileData.role
      }

      setCurrentUser(utilisateurFormate)
      const userRole = profileData.role as Profil
      setProfil(userRole)
      setVue('app')

      if (userRole === 'directeur') setCurrentTab('vue_globale')
      else if (userRole === 'censeur') setCurrentTab('tableau_pedagogique')
      else if (userRole === 'comptable') setCurrentTab('comptable/dashboard')
      else if (userRole === 'enseignant') setCurrentTab('enseignant/appel')
      else setCurrentTab('')

      await chargerDonneesScolaires()
    } catch (err) {
      console.error('Erreur lors de la récupération du profil:', err)
      supabase.auth.signOut()
    } finally {
      setLoading(false)
    }
  }

  // ── 3. CHARGEMENT DEPUIS SUPABASE AU DÉMARRAGE ──
  async function chargerDonneesScolaires() {
    try {
      const { data: listEleves, error: err1 } = await supabase.from('eleves').select('*')
      const { data: listPaiements, error: err2 } = await supabase.from('paiements').select('*')
      const { data: listAbsences, error: err3 } = await supabase.from('absences').select('*')

      if (err1 || err2 || err3) throw new Error('Erreur de récupération Supabase')

      setEleves(listEleves || [])
      setPaiements(listPaiements || [])
      setAbsences(listAbsences || [])
    } catch (error) {
      console.error('Impossible de charger les données Supabase:', error)
    }
  }

  // ── 4. SOUMISSION DU FORMULAIRE DE CONNEXION ──
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return

    try {
      setLoginError(null)
      setSubmitting(true)
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw new Error('Identifiants invalides ou erreur système')
    } catch (err: any) {
      setLoginError(err.message)
      setSubmitting(false)
    }
  }

  // ── 5. S'INSCRIRE AVEC CODE INVITATION ÉCOLE DYNAMIQUE ──
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoginError(null)
    setSubmitting(true)

    try {
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .select('id, name')
        .eq('code_invitation', registerForm.codeEcole.trim().toUpperCase())
        .single()

      if (schoolError || !schoolData) {
        throw new Error("Code d'invitation invalide. Veuillez vérifier auprès de votre établissement.")
      }

      const { data, error } = await supabase.auth.signUp({
        email: registerForm.email,
        password: registerForm.password,
        options: {
          data: {
            first_name: registerForm.prenom,
            last_name: registerForm.nom,
            role: registerForm.role,
            school_id: schoolData.id,
            code_invitation: registerForm.codeEcole.trim().toUpperCase()
          }
        }
      })

      if (error) throw error

      setRegisterSuccess(`Compte créé avec succès pour ${schoolData.name} ! Redirection vers la connexion...`)

      setTimeout(() => {
        setVue('connexion')
        setRegisterSuccess(null)
        setRegisterForm({ nom: '', prenom: '', email: '', password: '', role: 'enseignant', codeEcole: '' })
      }, 3000)

    } catch (err: any) {
      setLoginError(err.message || "Une erreur est survenue lors de l'inscription")
    } finally {
      setSubmitting(false)
    }
  }

  // ── 6. CHANGEMENT DE MOT DE PASSE ──
  async function handlePasswordUpdate(e: React.FormEvent) {
    e.preventDefault()
    setPasswordMsg(null)

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Les mots de passe ne correspondent pas.' })
      return
    }

    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'Le mot de passe doit contenir au moins 6 caractères.' })
      return
    }

    try {
      setPasswordLoading(true)
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error

      setPasswordMsg({ type: 'success', text: 'Mot de passe modifié avec succès !' })
      setTimeout(() => {
        setShowPasswordModal(false)
        setNewPassword('')
        setConfirmPassword('')
        setPasswordMsg(null)
      }, 2000)
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.message || "Erreur de mise à jour" })
    } finally {
      setPasswordLoading(false)
    }
  }

  // ── 7. PROCESSUS DE DÉCONNEXION ──
  async function handleLogout() {
    setLoading(true)
    await supabase.auth.signOut()
    setVue('connexion')
  }

  const rapportsPaiementsCalcules = calculerRapportsFinanciers(eleves, paiements)

  function handleNavigate(route: string) {
    if (route === '/absences') setCurrentTab('suivi_absences')
    else if (route === '/scolarite') setCurrentTab('suivi_finances')
    else if (route === '/') setCurrentTab('vue_globale')
    else if (route === '/logout') handleLogout()
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', backgroundColor: '#f3f4f6' }}>
        <div style={{ textAlign: 'center' }}>
          {/* LOGO GRAND ÉCRAN DE CHARGEMENT */}
          <img src={logoAideduc} alt="AIDEDUC" style={{ height: '140px', width: 'auto', marginBottom: '20px', objectFit: 'contain' }} />
          <div style={{ color: '#4b5563', fontWeight: '600', fontSize: '16px' }}>Chargement des données...</div>
        </div>
      </div>
    )
  }

  // ÉCRAN DE CONNEXION (LOGIN)
  if (vue === 'connexion') {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'sans-serif' }}>
        <div style={{ backgroundColor: '#ffffff', padding: '40px', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', maxWidth: '460px', width: '100%', textAlign: 'center' }}>
          
          {/* LOGO TRÈS GRAND ÉCRAN DE CONNEXION */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <img src={logoAideduc} alt="AIDEDUC Logo" style={{ height: 'auto', maxHeight: '180px', width: '85%', objectFit: 'contain' }} />
          </div>

          <p style={{ color: '#6b7280', fontSize: '15px', marginBottom: '32px', fontWeight: '500' }}>Gestion Scolaire Intégrée — Bénin</p>
          
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px', textAlign: 'left' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Adresse Email</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ex: directeur@ecole.com"
                required
                style={{ width: '100%', padding: '12px 14px', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box', fontSize: '14px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Mot de passe</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{ width: '100%', padding: '12px 14px', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box', fontSize: '14px' }}
              />
            </div>

            {loginError && (
              <div style={{ color: '#ef4444', fontSize: '13px', textAlign: 'center', fontWeight: '500' }}>
                ❌ {loginError}
              </div>
            )}
            
            <button 
              type="submit"
              disabled={submitting}
              style={{ width: '100%', padding: '14px', backgroundColor: '#1e3a8a', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '15px', cursor: 'pointer', marginTop: '8px', opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? 'Connexion en cours...' : '🔐 Se connecter'}
            </button>
          </form>

          <div style={{ marginTop: '24px', fontSize: '14px', color: '#4b5563' }}>
            Pas encore de compte ?{' '}
            <button onClick={() => { setVue('inscription'); setLoginError(null); }} style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline' }}>
              Créer un compte
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ÉCRAN D'INSCRIPTION (SIGN UP)
  if (vue === 'inscription') {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', padding: '30px 20px', fontFamily: 'sans-serif' }}>
        <div style={{ backgroundColor: '#ffffff', padding: '36px', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', maxWidth: '500px', width: '100%', textAlign: 'center' }}>
          
          {/* LOGO GRAND ÉCRAN D'INSCRIPTION */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <img src={logoAideduc} alt="AIDEDUC Logo" style={{ height: 'auto', maxHeight: '160px', width: '80%', objectFit: 'contain' }} />
          </div>

          <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px' }}>Inscription de l'équipe administrative & pédagogique</p>

          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Prénom</label>
                <input 
                  type="text" 
                  value={registerForm.prenom}
                  onChange={(e) => setRegisterForm({...registerForm, prenom: e.target.value})}
                  placeholder="Jean"
                  required
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Nom</label>
                <input 
                  type="text" 
                  value={registerForm.nom}
                  onChange={(e) => setRegisterForm({...registerForm, nom: e.target.value})}
                  placeholder="Koffi"
                  required
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Code d'invitation de l'école</label>
              <input 
                type="text" 
                value={registerForm.codeEcole}
                onChange={(e) => setRegisterForm({...registerForm, codeEcole: e.target.value})}
                placeholder="Ex: EXCEL-2026"
                required
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #2563eb', borderRadius: '8px', backgroundColor: '#eff6ff', fontWeight: '600', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Rôle au sein de l'établissement</label>
              <select 
                value={registerForm.role}
                onChange={(e) => setRegisterForm({...registerForm, role: e.target.value})}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', backgroundColor: '#fff', boxSizing: 'border-box' }}
              >
                <option value="enseignant">Enseignant</option>
                <option value="censeur">Censeur</option>
                <option value="comptable">Comptable</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Adresse Email</label>
              <input 
                type="email" 
                value={registerForm.email}
                onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                placeholder="jean.koffi@ecole.com"
                required
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Mot de passe</label>
              <input 
                type="password" 
                value={registerForm.password}
                onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                placeholder="•••••••• (6 caractères min)"
                minLength={6}
                required
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box' }}
              />
            </div>

            {loginError && <div style={{ color: '#ef4444', fontSize: '13px', fontWeight: '500', textAlign: 'center' }}>❌ {loginError}</div>}
            {registerSuccess && <div style={{ color: '#16a34a', fontSize: '13px', fontWeight: '500', textAlign: 'center' }}>✓ {registerSuccess}</div>}

            <button 
              type="submit"
              disabled={submitting}
              style={{ width: '100%', padding: '12px', backgroundColor: '#1e3a8a', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '14px', cursor: 'pointer', marginTop: '4px', opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? 'Création du compte...' : '🚀 Créer mon compte'}
            </button>
          </form>

          <div style={{ marginTop: '20px', fontSize: '14px', color: '#4b5563' }}>
            Déjà inscrit ?{' '}
            <button onClick={() => { setVue('connexion'); setLoginError(null); }} style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline' }}>
              Se connecter
            </button>
          </div>
        </div>
      </div>
    )
  }

  // INTERFACE PRINCIPALE DE L'APPLICATION
  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'sans-serif', backgroundColor: '#f9fafb' }}>
      
      {/* ── BARRE LATÉRALE DE NAVIGATION (SIDEBAR) ── */}
      <div style={{ width: '280px', backgroundColor: '#1e293b', color: '#ffffff', padding: '24px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ paddingBottom: '20px', borderBottom: '1px solid #334155', marginBottom: '24px' }}>
            
            {/* LOGO AGRANDI ET ADAPTÉ DANS LA SIDEBAR */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 0' }}>
              <img src={logoAideduc} alt="AIDEDUC Logo" style={{ height: 'auto', maxHeight: '100px', width: '85%', objectFit: 'contain' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', marginTop: '14px', textAlign: 'center' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>
                Mode {profil}
              </span>
              {currentUser && (
                <span style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '4px', fontWeight: '500' }}>
                  👤 {currentUser.prenom} {currentUser.nom}
                </span>
              )}
            </div>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {profil === 'directeur' && ongletsDirecteur.map(tab => (
              <button 
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)} 
                style={{ width: '100%', textAlign: 'left', padding: '11px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: currentTab === tab.id ? '#0f172a' : 'transparent', color: '#ffffff', fontWeight: '500' }}
              >
                <span style={{ marginRight: '8px' }}>{tab.icon}</span> {tab.label}
              </button>
            ))}

            {profil === 'censeur' && ongletsCenseur.map(tab => (
              <button 
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)} 
                style={{ width: '100%', textAlign: 'left', padding: '11px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: currentTab === tab.id ? '#0f172a' : 'transparent', color: '#ffffff', fontWeight: '500' }}
              >
                <span style={{ marginRight: '8px' }}>{tab.icon}</span> {tab.label}
              </button>
            ))}

            {profil === 'comptable' && (
              <>
                <button onClick={() => setCurrentTab('comptable/dashboard')} style={{ width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: currentTab === 'comptable/dashboard' ? '#0f172a' : 'transparent', color: '#ffffff', fontWeight: '500' }}>
                  📊 Tableau de Bord
                </button>
                <button onClick={() => setCurrentTab('comptable/encaissement')} style={{ width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: currentTab === 'comptable/encaissement' ? '#0f172a' : 'transparent', color: '#ffffff', fontWeight: '500' }}>
                  💵 Saisie Encaissement
                </button>
                <button onClick={() => setCurrentTab('comptable/import')} style={{ width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: currentTab === 'comptable/import' ? '#0f172a' : 'transparent', color: '#ffffff', fontWeight: '500' }}>
                  📥 Import Données Excel
                </button>
                <button onClick={() => setCurrentTab('comptable/relances')} style={{ width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: currentTab === 'comptable/relances' ? '#0f172a' : 'transparent', color: '#ffffff', fontWeight: '500' }}>
                  📨 Suivi des Relances
                </button>
              </>
            )}

            {profil === 'enseignant' && (
              <>
                <button onClick={() => setCurrentTab('enseignant/appel')} style={{ width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: currentTab === 'enseignant/appel' ? '#0f172a' : 'transparent', color: '#ffffff', fontWeight: '500' }}>
                  📝 Faire l'Appel
                </button>
                <button onClick={() => setCurrentTab('enseignant/cahier')} style={{ width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: currentTab === 'enseignant/cahier' ? '#0f172a' : 'transparent', color: '#ffffff', fontWeight: '500' }}>
                  📚 Cahier de Textes
                </button>
                <button onClick={() => setCurrentTab('enseignant/notes')} style={{ width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: currentTab === 'enseignant/notes' ? '#0f172a' : 'transparent', color: '#ffffff', fontWeight: '500' }}>
                  📊 Saisie des Notes
                </button>
              </>
            )}
          </nav>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button 
            onClick={() => setShowPasswordModal(true)}
            style={{ width: '100%', padding: '9px', backgroundColor: '#334155', color: '#cbd5e1', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
          >
            🔑 Changer mot de passe
          </button>

          <button 
            onClick={handleLogout}
            style={{ width: '100%', padding: '10px', backgroundColor: '#ef4444', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
          >
            🚪 Déconnexion
          </button>
        </div>
      </div>

      {/* ── ZONE DE RENDU DYNAMIQUE PRINCIPALE ── */}
      <div style={{ flex: 1, padding: '30px', overflowY: 'auto', position: 'relative' }}>

        {/* 🟡 BANNIÈRE D'INVITATION SÉCURITÉ POUR LE DIRECTEUR */}
        {profil === 'directeur' && (
          <div style={{ backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '18px' }}>🛡️</span>
              <span style={{ color: '#92400e', fontSize: '14px', fontWeight: '500' }}>
                Premier accès ? Pour des raisons de sécurité, nous vous recommandons de modifier votre mot de passe temporaire.
              </span>
            </div>
            <button 
              onClick={() => setShowPasswordModal(true)}
              style={{ backgroundColor: '#d97706', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
            >
              Changer mon mot de passe
            </button>
          </div>
        )}

        {/* === ESPACE DIRECTEUR === */}
        {profil === 'directeur' && (
          <>
            {currentTab === 'vue_globale' && currentUser && (
              <Dashboard user={currentUser} onNavigate={handleNavigate} />
            )}
            
            {currentTab === 'suivi_finances' && (
              <Scolarite ecoleId="11111111-1111-1111-1111-111111111111" onBack={() => setCurrentTab('vue_globale')} isOnline={navigator.onLine} />
            )}
            
            {currentTab === 'suivi_absences' && (
              <GestionAbsences onBack={() => setCurrentTab('vue_globale')} />
            )}

            {currentTab === 'affectations_cours' && (
              <AffectationsCours onBack={() => setCurrentTab('vue_globale')} />
            )}
          </>
        )}

        {/* === ESPACE CENSEUR === */}
        {profil === 'censeur' && (
          <>
            {currentTab === 'tableau_pedagogique' && (
              <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <h2 style={{ marginTop: 0, color: '#0f172a' }}>🏫 Tableau de Bord Pédagogique</h2>
                <p style={{ color: '#4b5563' }}>Bienvenue dans l'espace opérationnel du Censeur.</p>
                <div style={{ marginTop: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button onClick={() => setCurrentTab('affectations_cours')} style={{ padding: '10px 16px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
                    🤝 Affectation des Cours
                  </button>
                  <button onClick={() => setCurrentTab('gestion_absences')} style={{ padding: '10px 16px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
                    📝 Gestion des Absences
                  </button>
                  <button onClick={() => setCurrentTab('suivi_cours')} style={{ padding: '10px 16px', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
                    📖 Suivi des Cours
                  </button>
                </div>
              </div>
            )}
            {currentTab === 'affectations_cours' && <AffectationsCours onBack={() => setCurrentTab('tableau_pedagogique')} />}
            {currentTab === 'gestion_absences' && <GestionAbsences onBack={() => setCurrentTab('tableau_pedagogique')} />}
            {currentTab === 'suivi_cours' && <SuiviCours onBack={() => setCurrentTab('tableau_pedagogique')} />}
          </>
        )}

        {/* === ESPACE ENSEIGNANTS === */}
        {profil === 'enseignant' && (
          <>
            {currentTab === 'enseignant/appel' && <FaireAppel onBack={handleLogout} />}
            {currentTab === 'enseignant/cahier' && <CahierTexte onBack={handleLogout} />}
            {currentTab === 'enseignant/notes' && <SaisieNotes onBack={handleLogout} />}
          </>
        )}

        {/* === ESPACE COMPTABLES === */}
        {profil === 'comptable' && (
          <>
            {currentTab === 'comptable/dashboard' && <TableauBordComptable onBack={() => setCurrentTab('comptable/dashboard')} />}
            {currentTab === 'comptable/encaissement' && <Encaissement onBack={() => setCurrentTab('comptable/dashboard')} />}
            {currentTab === 'comptable/relances' && <SuiviRelances onBack={handleLogout} />}
            {currentTab === 'comptable/import' && (
              <ImportExcel onBack={() => setCurrentTab('comptable/dashboard')} />
            )}
          </>
        )}

      </div>

      {/* ── MODALE CHANGER LE MOT DE PASSE ── */}
      {showPasswordModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#ffffff', padding: '28px', borderRadius: '12px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#1e3a8a', fontSize: '18px' }}>🔑 Modifier votre mot de passe</h3>
            
            <form onSubmit={handlePasswordUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Nouveau mot de passe</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Confirmer le nouveau mot de passe</label>
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box' }}
                />
              </div>

              {passwordMsg && (
                <div style={{ color: passwordMsg.type === 'error' ? '#ef4444' : '#16a34a', fontSize: '13px', fontWeight: '500', textAlign: 'center' }}>
                  {passwordMsg.type === 'error' ? '❌ ' : '✓ '}{passwordMsg.text}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button 
                  type="submit"
                  disabled={passwordLoading}
                  style={{ flex: 1, padding: '10px', backgroundColor: '#1e3a8a', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                >
                  {passwordLoading ? 'Mise à jour...' : 'Enregistrer'}
                </button>
                <button 
                  type="button"
                  onClick={() => { setShowPasswordModal(false); setPasswordMsg(null); }}
                  style={{ padding: '10px 14px', backgroundColor: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '8px', fontWeight: '500', cursor: 'pointer' }}
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}