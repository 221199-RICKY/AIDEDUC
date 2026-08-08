import { useState, useEffect } from 'react'
import { supabase } from './utils/supabaseClient'

// ── IMPORTATION DU LOGO & SIDEBAR ──
import logoAideduc from './assets/Logo AIDEDUC.png'
import Sidebar from './components/Sidebar'

// Importations des vues Directeur / Administration
import Dashboard from './components/Dashboard'
import Scolarite from './components/Scolarite'

// ── IMPORTATION DES COMPOSANTS CENSEUR ──
import Absences from './components/censeur/Absences'
import SuiviCours from './components/censeur/SuiviCours'
import AffectationsCours from './components/censeur/affectationscours'

// Importations des vues Enseignant
import FaireAppel from './components/enseignant/FaireAppel'
import SaisieNotes from './components/enseignant/SaisieNotes'
import CahierTexte from './components/enseignant/CahierTexte'

// Importations des vues Comptable
import Encaissement from './components/comptable/Encaissement'
import SuiviRelances from './components/comptable/SuiviRelances'
import TableauBordComptable from './components/comptable/TableauBordComptable'
import ImportExcel from './components/comptable/ImportExcel'
  
import type { User } from './types'

// Restriction stricte aux 4 rôles de l'établissement
type Profil = 'directeur' | 'censeur' | 'enseignant' | 'comptable'

interface OngletNavigation {
  id: string
  label: string
  icon: string
}

export default function App() {
  // Navigation globale et Profils utilisateur réel Supabase
  const [vue, setVue] = useState<string>('connexion')
  const [currentTab, setCurrentTab] = useState<string>('')
  const [profil, setProfil] = useState<Profil>('directeur')
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // État pour le menu mobile responsive
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // États pour le changement de mot de passe
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
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
    role: 'enseignant' as Profil,
    codeEcole: '',
  })
  const [registerSuccess, setRegisterSuccess] = useState<string | null>(null)

  // Onglets Directeur
  const ongletsDirecteur: OngletNavigation[] = [
    { id: 'vue_globale', label: 'Vue Globale', icon: '📈' },
    { id: 'suivi_finances', label: 'Suivi des Finances', icon: '💰' },
    { id: 'suivi_absences', label: 'Suivi des Absences', icon: '🛑' },
    { id: 'affectations_cours', label: 'Affectation des Cours', icon: '🤝' },
  ]

  // Onglets Censeur
  const ongletsCenseur: OngletNavigation[] = [
    { id: 'tableau_pedagogique', label: 'Tableau Pédagogique', icon: '🏫' },
    { id: 'affectations_cours', label: 'Affectation des Cours', icon: '🤝' },
    { id: 'gestion_absences', label: 'Gestion des Absences', icon: '📝' },
    { id: 'suivi_cours', label: 'Suivi des Cours', icon: '📖' },
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

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
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

      const { data: authUser } = await supabase.auth.getUser()

      const userRole = (profileData.role || 'enseignant') as Profil

      const utilisateurFormate: User = {
        id: profileData.id,
        nom: profileData.last_name || '',
        prenom: profileData.first_name || '',
        role: userRole,
        email: authUser.user?.email || '',
        telephone: '',
        ecoleId: profileData.school_id || '',
        langue: 'fr',
        createdAt: new Date().toISOString(),
      }

      setCurrentUser(utilisateurFormate)
      setProfil(userRole)
      setVue('app')

      if (userRole === 'directeur') setCurrentTab('vue_globale')
      else if (userRole === 'censeur') setCurrentTab('tableau_pedagogique')
      else if (userRole === 'comptable') setCurrentTab('comptable/dashboard')
      else if (userRole === 'enseignant') setCurrentTab('enseignant/appel')
    } catch (err) {
      console.error('Erreur lors de la récupération du profil:', err)
      supabase.auth.signOut()
    } finally {
      setLoading(false)
    }
  }

  // ── 3. SOUMISSION DU FORMULAIRE DE CONNEXION ──
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

  // ── 4. S'INSCRIRE AVEC CODE INVITATION ÉCOLE DYNAMIQUE ──
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

      const { error } = await supabase.auth.signUp({
        email: registerForm.email,
        password: registerForm.password,
        options: {
          data: {
            first_name: registerForm.prenom,
            last_name: registerForm.nom,
            role: registerForm.role,
            school_id: schoolData.id,
            code_invitation: registerForm.codeEcole.trim().toUpperCase(),
          },
        },
      })

      if (error) throw error

      setRegisterSuccess(
        `Compte créé avec succès pour ${schoolData.name} ! Redirection vers la connexion...`
      )

      setTimeout(() => {
        setVue('connexion')
        setRegisterSuccess(null)
        setRegisterForm({
          nom: '',
          prenom: '',
          email: '',
          password: '',
          role: 'enseignant',
          codeEcole: '',
        })
      }, 3000)
    } catch (err: any) {
      setLoginError(err.message || "Une erreur est survenue lors de l'inscription")
    } finally {
      setSubmitting(false)
    }
  }

  // ── 5. CHANGEMENT DE MOT DE PASSE ──
  async function handlePasswordUpdate(e: React.FormEvent) {
    e.preventDefault()
    setPasswordMsg(null)

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Les mots de passe ne correspondent pas.' })
      return
    }

    if (newPassword.length < 6) {
      setPasswordMsg({
        type: 'error',
        text: 'Le mot de passe doit contenir au moins 6 caractères.',
      })
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
      setPasswordMsg({ type: 'error', text: err.message || 'Erreur de mise à jour' })
    } finally {
      setPasswordLoading(false)
    }
  }

  // ── 6. PROCESSUS DE DÉCONNEXION ──
  async function handleLogout() {
    setLoading(true)
    await supabase.auth.signOut()
    setVue('connexion')
  }

  function handleNavigate(route: string) {
    if (route === '/absences') setCurrentTab('suivi_absences')
    else if (route === '/scolarite') setCurrentTab('suivi_finances')
    else if (route === '/') setCurrentTab('vue_globale')
    else if (route === '/logout') handleLogout()
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100 font-sans">
        <div className="text-center">
          <img
            src={logoAideduc}
            alt="AIDEDUC"
            className="h-36 w-auto mb-5 object-contain mx-auto"
          />
          <div className="text-gray-600 font-semibold text-base">
            Chargement des données...
          </div>
        </div>
      </div>
    )
  }

  // ÉCRAN DE CONNEXION (LOGIN)
  if (vue === 'connexion') {
    return (
      <div className="flex min-h-screen bg-gray-100 items-center justify-center p-5 font-sans">
        <div className="bg-white p-10 rounded-2xl shadow-xl max-w-md w-full text-center">
          <div className="flex justify-center mb-6">
            <img
              src={logoAideduc}
              alt="AIDEDUC Logo"
              className="h-auto max-h-44 w-[85%] object-contain"
            />
          </div>

          <p className="text-gray-500 text-sm mb-8 font-medium">
            Gestion Scolaire Intégrée — Bénin
          </p>

          <form onSubmit={handleLogin} className="flex flex-col gap-4 text-left">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Adresse Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ex: directeur@ecole.com"
                required
                className="w-full px-3.5 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-800 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3.5 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-800 outline-none"
              />
            </div>

            {loginError && (
              <div className="text-red-500 text-xs text-center font-medium">
                ❌ {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-blue-900 text-white rounded-lg font-semibold text-sm cursor-pointer mt-2 hover:bg-blue-950 transition-colors disabled:opacity-70"
            >
              {submitting ? 'Connexion en cours...' : '🔐 Se connecter'}
            </button>
          </form>

          <div className="mt-6 text-sm text-gray-600">
            Pas encore de compte ?{' '}
            <button
              onClick={() => {
                setVue('inscription')
                setLoginError(null)
              }}
              className="bg-transparent border-none text-blue-600 font-semibold cursor-pointer underline"
            >
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
      <div className="flex min-h-screen bg-gray-100 items-center justify-center px-5 py-8 font-sans">
        <div className="bg-white p-9 rounded-2xl shadow-xl max-w-lg w-full text-center">
          <div className="flex justify-center mb-5">
            <img
              src={logoAideduc}
              alt="AIDEDUC Logo"
              className="h-auto max-h-40 w-[80%] object-contain"
            />
          </div>

          <p className="text-gray-500 text-xs mb-6">
            Inscription de l'équipe administrative & pédagogique
          </p>

          <form onSubmit={handleRegister} className="flex flex-col gap-3.5 text-left">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Prénom
                </label>
                <input
                  type="text"
                  value={registerForm.prenom}
                  onChange={(e) => setRegisterForm({ ...registerForm, prenom: e.target.value })}
                  placeholder="Jean"
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nom
                </label>
                <input
                  type="text"
                  value={registerForm.nom}
                  onChange={(e) => setRegisterForm({ ...registerForm, nom: e.target.value })}
                  placeholder="Koffi"
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Code d'invitation de l'école
              </label>
              <input
                type="text"
                value={registerForm.codeEcole}
                onChange={(e) => setRegisterForm({ ...registerForm, codeEcole: e.target.value })}
                placeholder="Ex: EXCEL-2026"
                required
                className="w-full px-3 py-2.5 border border-blue-600 rounded-lg bg-blue-50 font-semibold text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Rôle au sein de l'établissement
              </label>
              <select
                value={registerForm.role}
                onChange={(e) => setRegisterForm({ ...registerForm, role: e.target.value as Profil })}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-sm"
              >
                <option value="enseignant">Enseignant</option>
                <option value="censeur">Censeur</option>
                <option value="comptable">Comptable</option>
                <option value="directeur">Directeur</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Adresse Email
              </label>
              <input
                type="email"
                value={registerForm.email}
                onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                placeholder="jean.koffi@ecole.com"
                required
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Mot de passe
              </label>
              <input
                type="password"
                value={registerForm.password}
                onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                placeholder="•••••••• (6 caractères min)"
                minLength={6}
                required
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            {loginError && (
              <div className="text-red-500 text-xs font-medium text-center">
                ❌ {loginError}
              </div>
            )}
            {registerSuccess && (
              <div className="text-green-600 text-xs font-medium text-center">
                ✓ {registerSuccess}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-blue-900 text-white rounded-lg font-semibold text-sm cursor-pointer mt-1 hover:bg-blue-950 transition-colors disabled:opacity-70"
            >
              {submitting ? 'Création du compte...' : '🚀 Créer mon compte'}
            </button>
          </form>

          <div className="mt-5 text-sm text-gray-600">
            Déjà inscrit ?{' '}
            <button
              onClick={() => {
                setVue('connexion')
                setLoginError(null)
              }}
              className="bg-transparent border-none text-blue-600 font-semibold cursor-pointer underline"
            >
              Se connecter
            </button>
          </div>
        </div>
      </div>
    )
  }

  // INTERFACE PRINCIPALE DE L'APPLICATION
  return (
    <div className="flex min-h-screen font-sans bg-gray-50 flex-col md:flex-row">
      {/* ── EN-TÊTE MOBILE (HEADER HAMBURGER) ── */}
      <header className="md:hidden bg-slate-800 text-white px-4 py-3 flex justify-between items-center sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="text-2xl text-white p-1 hover:bg-slate-700 rounded transition-colors"
            aria-label="Ouvrir le menu"
          >
            ☰
          </button>
          <img src={logoAideduc} alt="AIDEDUC" className="h-8 w-auto object-contain" />
        </div>
        <span className="text-xs uppercase bg-slate-700 px-2 py-1 rounded font-bold text-slate-300">
          {profil}
        </span>
      </header>

      {/* ── SIDEBAR COMPONENT ── */}
      <Sidebar
        profil={profil}
        currentUser={currentUser}
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        ongletsDirecteur={ongletsDirecteur}
        ongletsCenseur={ongletsCenseur}
        onOpenPasswordModal={() => setShowPasswordModal(true)}
        onLogout={handleLogout}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* ── ZONE DE RENDU DYNAMIQUE PRINCIPALE ── */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto relative">
        {/* BANNIÈRE D'INVITATION SÉCURITÉ POUR LE DIRECTEUR */}
        {profil === 'directeur' && (
          <div className="bg-amber-100 border border-amber-500 rounded-lg p-3 md:p-4 mb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-lg">🛡️</span>
              <span className="text-amber-900 text-xs md:text-sm font-medium">
                Premier accès ? Pour des raisons de sécurité, nous vous recommandons de modifier
                votre mot de passe temporaire.
              </span>
            </div>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="bg-amber-600 text-white border-none px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer hover:bg-amber-700 whitespace-nowrap self-end sm:self-auto"
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
              <Scolarite
                ecoleId={currentUser?.ecoleId || ''}
                onBack={() => setCurrentTab('vue_globale')}
                isOnline={navigator.onLine}
              />
            )}

            {currentTab === 'suivi_absences' && (
              <Absences
                ecoleId={currentUser?.ecoleId || ''}
                onBack={() => setCurrentTab('vue_globale')}
                isOnline={navigator.onLine}
              />
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
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h2 className="mt-0 text-slate-900 text-xl font-bold">🏫 Tableau de Bord Pédagogique</h2>
                <p className="text-gray-600 text-sm">
                  Bienvenue dans l'espace opérationnel du Censeur.
                </p>
                <div className="mt-5 flex gap-3 flex-wrap">
                  <button
                    onClick={() => setCurrentTab('affectations_cours')}
                    className="px-4 py-2.5 bg-emerald-600 text-white border-none rounded-md font-semibold cursor-pointer text-sm hover:bg-emerald-700"
                  >
                    🤝 Affectation des Cours
                  </button>
                  <button
                    onClick={() => setCurrentTab('gestion_absences')}
                    className="px-4 py-2.5 bg-blue-600 text-white border-none rounded-md font-semibold cursor-pointer text-sm hover:bg-blue-700"
                  >
                    📝 Gestion des Absences
                  </button>
                  <button
                    onClick={() => setCurrentTab('suivi_cours')}
                    className="px-4 py-2.5 bg-slate-900 text-white border-none rounded-md font-semibold cursor-pointer text-sm hover:bg-slate-800"
                  >
                    📖 Suivi des Cours
                  </button>
                </div>
              </div>
            )}
            {currentTab === 'affectations_cours' && (
              <AffectationsCours onBack={() => setCurrentTab('tableau_pedagogique')} />
            )}
            {currentTab === 'gestion_absences' && (
              <Absences 
                ecoleId={currentUser?.ecoleId || ''} 
                onBack={() => setCurrentTab('tableau_pedagogique')} 
                isOnline={navigator.onLine} 
              />
            )}
            {currentTab === 'suivi_cours' && (
              <SuiviCours onBack={() => setCurrentTab('tableau_pedagogique')} />
            )}
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
            {currentTab === 'comptable/dashboard' && (
              <TableauBordComptable onBack={() => setCurrentTab('comptable/dashboard')} />
            )}
            {currentTab === 'comptable/encaissement' && (
              <Encaissement onBack={() => setCurrentTab('comptable/dashboard')} />
            )}
            {currentTab === 'comptable/relances' && <SuiviRelances onBack={handleLogout} />}
            {currentTab === 'comptable/import' && (
              <ImportExcel onBack={() => setCurrentTab('comptable/dashboard')} />
            )}
          </>
        )}
      </main>

      {/* ── MODALE CHANGER LE MOT DE PASSE ── */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-7 rounded-xl max-w-md w-full shadow-2xl">
            <h3 className="m-0 mb-4 text-blue-900 text-lg font-bold">
              🔑 Modifier votre mot de passe
            </h3>

            <form onSubmit={handlePasswordUpdate} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nouveau mot de passe
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Confirmer le nouveau mot de passe
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              {passwordMsg && (
                <div
                  className={`text-xs font-medium text-center ${
                    passwordMsg.type === 'error' ? 'text-red-500' : 'text-green-600'
                  }`}
                >
                  {passwordMsg.type === 'error' ? '❌ ' : '✓ '}
                  {passwordMsg.text}
                </div>
              )}

              <div className="flex gap-2.5 mt-3">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="flex-1 py-2.5 bg-blue-900 text-white border-none rounded-lg font-semibold cursor-pointer hover:bg-blue-950 transition-colors"
                >
                  {passwordLoading ? 'Mise à jour...' : 'Enregistrer'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false)
                    setPasswordMsg(null)
                  }}
                  className="px-3.5 py-2.5 bg-gray-100 text-gray-700 border-none rounded-lg font-medium cursor-pointer hover:bg-gray-200"
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