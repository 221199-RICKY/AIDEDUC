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
    onClose()
  }

  return (
    <>
      {/* OVERLAY SOMBRE MOBILE */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-[99998] md:hidden"
          onClick={onClose}
        />
      )}

      {/* SIDEBAR RESPONSIVE */}
      <aside
        className={`
          bg-slate-800 text-white p-5 flex flex-col justify-between
          md:w-64 md:flex-shrink-0 md:min-h-screen md:static md:z-auto
          ${
            isOpen
              ? 'fixed inset-0 w-full bg-slate-900 flex flex-col z-[99999] overflow-y-auto'
              : 'hidden md:flex'
          }
        `}
      >
        <div>
          {/* HEADER SIDEBAR (LOGO UNIQUE + FERMETURE MOBILE) */}
          <div className="pb-4 border-b border-slate-700 mb-5 relative flex flex-col items-center">
            {isOpen && (
              <button
                onClick={onClose}
                className="md:hidden absolute top-0 right-0 text-slate-400 hover:text-white text-2xl font-bold p-1"
                aria-label="Fermer"
              >
                ✕
              </button>
            )}

            {/* LOGO UNIQUE AVEC TAILLE CALIBRÉE */}
            <div className="flex items-center justify-center w-full py-2">
              <img
                src={logoAideduc}
                alt="AIDEDUC"
                className="h-10 w-auto object-contain"
              />
            </div>

            <div className="mt-2 text-center">
              <span className="text-xs text-slate-400 uppercase tracking-wider font-bold block">
                Mode {profil}
              </span>
              {currentUser && (
                <span className="text-xs text-slate-300 mt-1 font-medium block">
                  👤 {currentUser.prenom} {currentUser.nom}
                </span>
              )}
            </div>
          </div>

          {/* LISTE D'ONGLETS DE NAVIGATION */}
          <nav className="flex flex-col gap-1">
            {profil === 'directeur' &&
              ongletsDirecteur.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleSelectTab(tab.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-md border-none cursor-pointer text-white font-medium text-sm transition-colors ${
                    currentTab === tab.id
                      ? 'bg-slate-950 font-bold'
                      : 'bg-transparent hover:bg-slate-700/50'
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
                  className={`w-full text-left px-3 py-2.5 rounded-md border-none cursor-pointer text-white font-medium text-sm transition-colors ${
                    currentTab === tab.id
                      ? 'bg-slate-950 font-bold'
                      : 'bg-transparent hover:bg-slate-700/50'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span> {tab.label}
                </button>
              ))}

            {profil === 'comptable' && (
              <>
                <button
                  onClick={() => handleSelectTab('comptable/dashboard')}
                  className={`w-full text-left px-3 py-2.5 rounded-md border-none cursor-pointer text-white font-medium text-sm transition-colors ${
                    currentTab === 'comptable/dashboard'
                      ? 'bg-slate-950 font-bold'
                      : 'bg-transparent hover:bg-slate-700/50'
                  }`}
                >
                  📊 Tableau de Bord
                </button>
                <button
                  onClick={() => handleSelectTab('comptable/encaissement')}
                  className={`w-full text-left px-3 py-2.5 rounded-md border-none cursor-pointer text-white font-medium text-sm transition-colors ${
                    currentTab === 'comptable/encaissement'
                      ? 'bg-slate-950 font-bold'
                      : 'bg-transparent hover:bg-slate-700/50'
                  }`}
                >
                  💵 Saisie Encaissement
                </button>
                <button
                  onClick={() => handleSelectTab('comptable/import')}
                  className={`w-full text-left px-3 py-2.5 rounded-md border-none cursor-pointer text-white font-medium text-sm transition-colors ${
                    currentTab === 'comptable/import'
                      ? 'bg-slate-950 font-bold'
                      : 'bg-transparent hover:bg-slate-700/50'
                  }`}
                >
                  📥 Import Données Excel
                </button>
                <button
                  onClick={() => handleSelectTab('comptable/relances')}
                  className={`w-full text-left px-3 py-2.5 rounded-md border-none cursor-pointer text-white font-medium text-sm transition-colors ${
                    currentTab === 'comptable/relances'
                      ? 'bg-slate-950 font-bold'
                      : 'bg-transparent hover:bg-slate-700/50'
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
                  className={`w-full text-left px-3 py-2.5 rounded-md border-none cursor-pointer text-white font-medium text-sm transition-colors ${
                    currentTab === 'enseignant/appel'
                      ? 'bg-slate-950 font-bold'
                      : 'bg-transparent hover:bg-slate-700/50'
                  }`}
                >
                  📝 Faire l'Appel
                </button>
                <button
                  onClick={() => handleSelectTab('enseignant/cahier')}
                  className={`w-full text-left px-3 py-2.5 rounded-md border-none cursor-pointer text-white font-medium text-sm transition-colors ${
                    currentTab === 'enseignant/cahier'
                      ? 'bg-slate-950 font-bold'
                      : 'bg-transparent hover:bg-slate-700/50'
                  }`}
                >
                  📚 Cahier de Textes
                </button>
                <button
                  onClick={() => handleSelectTab('enseignant/notes')}
                  className={`w-full text-left px-3 py-2.5 rounded-md border-none cursor-pointer text-white font-medium text-sm transition-colors ${
                    currentTab === 'enseignant/notes'
                      ? 'bg-slate-950 font-bold'
                      : 'bg-transparent hover:bg-slate-700/50'
                  }`}
                >
                  📊 Saisie des Notes
                </button>
              </>
            )}
          </nav>
        </div>

        {/* PIED DE SIDEBAR */}
        <div className="flex flex-col gap-2 pt-4 mt-6 border-t border-slate-700">
          <button
            onClick={() => {
              onOpenPasswordModal()
              onClose()
            }}
            className="w-full py-2 px-3 bg-slate-700 text-slate-200 border-none rounded-md text-xs cursor-pointer hover:bg-slate-600 transition-colors"
          >
            🔑 Changer mot de passe
          </button>

          <button
            onClick={() => {
              onLogout()
              onClose()
            }}
            className="w-full py-2 px-3 bg-red-600 text-white border-none rounded-md text-xs font-semibold cursor-pointer hover:bg-red-700 transition-colors"
          >
            🚪 Déconnexion
          </button>
        </div>
      </aside>
    </>
  )
}