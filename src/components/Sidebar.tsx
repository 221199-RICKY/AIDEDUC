import type { User } from '../types'
import logoAideduc from '../assets/Logo AIDEDUC.png'

type Profil = 'directeur' | 'censeur' | 'enseignant' | 'comptable'

interface OngletNavigation {
  id: string
  label: string
  icon: string
}

interface SidebarProps {
  profil: Profil
  currentUser: User | null
  currentTab: string
  setCurrentTab: (tab: string) => void
  ongletsDirecteur: OngletNavigation[]
  ongletsCenseur: OngletNavigation[]
  onOpenPasswordModal: () => void
  onLogout: () => void
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({
  profil,
  currentUser,
  currentTab,
  setCurrentTab,
  ongletsDirecteur,
  ongletsCenseur,
  onOpenPasswordModal,
  onLogout,
  isOpen,
  onClose,
}: SidebarProps) {
  const handleSelectTab = (tabId: string) => {
    setCurrentTab(tabId)
    onClose() // Ferme le menu sur mobile lors de la sélection d'un onglet
  }

  return (
    <>
      {/* ── OVERLAY SOMBRE SUR MOBILE QUAND LE MENU EST OUVERT ── */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* ── BARRE LATÉRALE / DRAWER ── */}
      <aside
        className={`
          fixed top-0 bottom-0 left-0 z-50 w-72 bg-slate-800 text-white p-6 flex flex-col justify-between
          transition-transform duration-300 ease-in-out
          md:static md:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div>
          {/* Header de la Sidebar + Bouton Fermer sur Mobile */}
          <div className="pb-5 border-b border-slate-700 mb-6 relative">
            <button
              onClick={onClose}
              className="md:hidden absolute top-0 right-0 text-slate-400 hover:text-white p-1 text-xl"
              aria-label="Fermer le menu"
            >
              ✕
            </button>

            <div className="flex items-center justify-center py-2">
              <img
                src={logoAideduc}
                alt="AIDEDUC Logo"
                className="h-auto max-h-24 w-[85%] object-contain"
              />
            </div>

            <div className="flex flex-col mt-3 text-center">
              <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">
                Mode {profil}
              </span>
              {currentUser && (
                <span className="text-xs text-slate-300 mt-1 font-medium">
                  👤 {currentUser.prenom} {currentUser.nom}
                </span>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex flex-col gap-1.5">
            {profil === 'directeur' &&
              ongletsDirecteur.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleSelectTab(tab.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-md border-none cursor-pointer text-white font-medium transition-colors ${
                    currentTab === tab.id ? 'bg-slate-900' : 'bg-transparent hover:bg-slate-700/50'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span> {tab.label}
                </button>
              ))}

            {profil === 'censeur' &&
              ongletsCenseur.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleSelectTab(tab.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-md border-none cursor-pointer text-white font-medium transition-colors ${
                    currentTab === tab.id ? 'bg-slate-900' : 'bg-transparent hover:bg-slate-700/50'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span> {tab.label}
                </button>
              ))}

            {profil === 'comptable' && (
              <>
                <button
                  onClick={() => handleSelectTab('comptable/dashboard')}
                  className={`w-full text-left px-3 py-2.5 rounded-md border-none cursor-pointer text-white font-medium transition-colors ${
                    currentTab === 'comptable/dashboard' ? 'bg-slate-900' : 'bg-transparent hover:bg-slate-700/50'
                  }`}
                >
                  📊 Tableau de Bord
                </button>
                <button
                  onClick={() => handleSelectTab('comptable/encaissement')}
                  className={`w-full text-left px-3 py-2.5 rounded-md border-none cursor-pointer text-white font-medium transition-colors ${
                    currentTab === 'comptable/encaissement' ? 'bg-slate-900' : 'bg-transparent hover:bg-slate-700/50'
                  }`}
                >
                  💵 Saisie Encaissement
                </button>
                <button
                  onClick={() => handleSelectTab('comptable/import')}
                  className={`w-full text-left px-3 py-2.5 rounded-md border-none cursor-pointer text-white font-medium transition-colors ${
                    currentTab === 'comptable/import' ? 'bg-slate-900' : 'bg-transparent hover:bg-slate-700/50'
                  }`}
                >
                  📥 Import Données Excel
                </button>
                <button
                  onClick={() => handleSelectTab('comptable/relances')}
                  className={`w-full text-left px-3 py-2.5 rounded-md border-none cursor-pointer text-white font-medium transition-colors ${
                    currentTab === 'comptable/relances' ? 'bg-slate-900' : 'bg-transparent hover:bg-slate-700/50'
                  }`}
                >
                  📨 Suivi des Relances
                </button>
              </>
            )}

            {profil === 'enseignant' && (
              <>
                <button
                  onClick={() => handleSelectTab('enseignant/appel')}
                  className={`w-full text-left px-3 py-2.5 rounded-md border-none cursor-pointer text-white font-medium transition-colors ${
                    currentTab === 'enseignant/appel' ? 'bg-slate-900' : 'bg-transparent hover:bg-slate-700/50'
                  }`}
                >
                  📝 Faire l'Appel
                </button>
                <button
                  onClick={() => handleSelectTab('enseignant/cahier')}
                  className={`w-full text-left px-3 py-2.5 rounded-md border-none cursor-pointer text-white font-medium transition-colors ${
                    currentTab === 'enseignant/cahier' ? 'bg-slate-900' : 'bg-transparent hover:bg-slate-700/50'
                  }`}
                >
                  📚 Cahier de Textes
                </button>
                <button
                  onClick={() => handleSelectTab('enseignant/notes')}
                  className={`w-full text-left px-3 py-2.5 rounded-md border-none cursor-pointer text-white font-medium transition-colors ${
                    currentTab === 'enseignant/notes' ? 'bg-slate-900' : 'bg-transparent hover:bg-slate-700/50'
                  }`}
                >
                  📊 Saisie des Notes
                </button>
              </>
            )}
          </nav>
        </div>

        {/* Pied de la Sidebar */}
        <div className="flex flex-col gap-2 pt-4">
          <button
            onClick={() => {
              onOpenPasswordModal()
              onClose()
            }}
            className="w-full p-2.5 bg-slate-700 text-slate-200 border-none rounded-md text-xs cursor-pointer hover:bg-slate-600 transition-colors"
          >
            🔑 Changer mot de passe
          </button>

          <button
            onClick={() => {
              onLogout()
              onClose()
            }}
            className="w-full p-2.5 bg-red-600 text-white border-none rounded-md font-semibold cursor-pointer hover:bg-red-700 transition-colors"
          >
            🚪 Déconnexion
          </button>
        </div>
      </aside>
    </>
  )
}