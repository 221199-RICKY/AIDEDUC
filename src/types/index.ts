// ─────────────────────────────────────────────
// EduConnect West Africa — Types TypeScript
// src/types/index.ts
// ─────────────────────────────────────────────

// ── RÔLES ────────────────────────────────────
export type UserRole =
  | 'directeur'
  | 'enseignant'
  | 'comptable'
  | 'censeur';

// ── UTILISATEUR AUTHENTIFIÉ ───────────────────
export interface User {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  role: UserRole;
  ecoleId: string;
  avatarUrl?: string;
  langue: 'fr' | 'en';
  createdAt: string;
}

// ── ÉCOLE ─────────────────────────────────────
export interface Ecole {
  id: string;
  nom: string;
  ville: string;
  pays: string;
  telephone: string;
  email: string;
  logoUrl?: string;
  directeurId: string;
  anneeScolaire: string; // ex: "2025-2026"
  trimestres: 2 | 3;
  createdAt: string;
}

// ── CLASSE ────────────────────────────────────
export interface Classe {
  id: string;
  nom: string;                 // ex: "Terminale C"
  niveau: string;              // ex: "Terminale"
  ecoleId: string;
  enseignantPrincipalId: string;
  effectif: number;
  anneeScolaire: string;
}

// ── ÉLÈVE ─────────────────────────────────────
export interface Eleve {
  id: string;
  nom: string;
  prenom: string;
  dateNaissance: string;
  lieuNaissance: string;
  classeId: string;
  ecoleId: string;
  numeroEleve: string;         // ex: "TCL-2024-001"
  parentIds: string[];
  photoUrl?: string;
  redoublant: boolean;
  createdAt: string;
}

// ── PARENT ────────────────────────────────────
export interface Parent {
  id: string;
  nom: string;
  prenom: string;
  telephone: string;
  email?: string;
  enfantIds: string[];
  appInstalle: boolean;        // a installé l'app mobile
  createdAt: string;
}

// ── ENSEIGNANT ────────────────────────────────
export interface Enseignant {
  id: string;
  userId: string;
  nom: string;
  prenom: string;
  matieres: string[];
  classeIds: string[];
  ecoleId: string;
}

// ── MATIÈRE ───────────────────────────────────
export interface Matiere {
  id: string;
  nom: string;
  coefficient: number;
  categorie: 'sciences' | 'lettres' | 'langues' | 'arts' | 'eps' | 'autre';
  enseignantId: string;
  classeId: string;
}

// ── NOTES ─────────────────────────────────────
export type TypeEpreuve = 'devoir1' | 'devoir2' | 'devoir3' | 'examen';

export interface Note {
  id: string;
  eleveId: string;
  matiereId: string;
  classeId: string;
  trimestre: 1 | 2 | 3;
  typeEpreuve: TypeEpreuve;
  valeur: number;              // 0–20
  dateCreation: string;
  enseignantId: string;
}

export interface MoyenneMatiere {
  matiereId: string;
  matiere: Matiere;
  notes: Note[];
  moyenne: number;
  rang: number;
  appreciation: string;
}

export interface Bulletin {
  id: string;
  eleveId: string;
  eleve: Eleve;
  classeId: string;
  trimestre: 1 | 2 | 3;
  moyennes: MoyenneMatiere[];
  moyenneGenerale: number;
  rangGeneral: number;
  appreciationGenerale: string;
  decisionConseil: 'passage' | 'redoublement' | 'exclusion' | 'en_attente';
  dateGeneration: string;
  pdfUrl?: string;
  envoye: boolean;
}

// ── ABSENCES ─────────────────────────────────
export type StatutAbsence = 'non_justifiee' | 'justifiee' | 'en_attente' | 'retard';

export interface Absence {
  id: string;
  eleveId: string;
  matiereId: string;
  classeId: string;
  date: string;
  heureDebut: string;
  heureFin: string;
  statut: StatutAbsence;
  justificatifUrl?: string;    // photo du certificat
  notifParentEnvoyee: boolean;
  enseignantId: string;
  createdAt: string;
}

export interface PointageSession {
  id: string;
  classeId: string;
  matiereId: string;
  enseignantId: string;
  date: string;
  heureDebut: string;
  presences: Record<string, 'present' | 'absent' | 'retard'>; // eleveId → statut
  valide: boolean;
  createdAt: string;
}

// ── SCOLARITÉ / PAIEMENTS ─────────────────────
export type TypeFrais =
  | 'inscription'
  | 'scolarite_t1'
  | 'scolarite_t2'
  | 'scolarite_t3'
  | 'cantine'
  | 'transport'
  | 'autre';

export type StatutPaiement = 'paye' | 'en_attente' | 'partiel' | 'retard';

export type ProviderMobileMoney =
  | 'orange_money'
  | 'wave'
  | 'mtn_money'
  | 'moov_money'
  | 'carte_bancaire'
  | 'especes';

export interface FraisScolarite {
  id: string;
  ecoleId: string;
  anneeScolaire: string;
  typeFrais: TypeFrais;
  montant: number;             // en XOF
  devise: 'XOF' | 'GHS' | 'NGN';
  classeId?: string;           // null = tous niveaux
  description: string;
}

export interface Paiement {
  id: string;
  eleveId: string;
  fraisId: string;
  frais: FraisScolarite;
  montantPaye: number;
  montantDu: number;
  statut: StatutPaiement;
  provider: ProviderMobileMoney;
  reference: string;           // ex: "EC-2026-004872"
  dateEcheance: string;
  datePaiement?: string;
  reçuPdfUrl?: string;
  notifEnvoyee: boolean;
  createdAt: string;
}

export interface Creance {
  eleveId: string;
  eleve: Eleve;
  paiements: Paiement[];
  totalDu: number;
  totalPaye: number;
  solde: number;               // totalDu - totalPaye (négatif = en retard)
  joursRetard: number;
}

// ── MESSAGERIE ────────────────────────────────
export type TypeMessage = 'prive' | 'broadcast_classe' | 'broadcast_ecole';

export interface Message {
  id: string;
  expediteurId: string;
  destinataireIds: string[];
  classeId?: string;
  ecoleId: string;
  typeMessage: TypeMessage;
  contenu: string;
  pieceJointeUrl?: string;
  lu: boolean;
  smsFallbackEnvoye: boolean;
  createdAt: string;
}

// ── NOTIFICATIONS ────────────────────────────
export type TypeNotification =
  | 'absence'
  | 'nouvelle_note'
  | 'paiement_recu'
  | 'paiement_rappel'
  | 'message'
  | 'bulletin_disponible';

export interface Notification {
  id: string;
  userId: string;
  type: TypeNotification;
  titre: string;
  corps: string;
  lu: boolean;
  canal: 'push' | 'sms' | 'les_deux';
  createdAt: string;
  lienAction?: string;
}

// ── EMPLOI DU TEMPS ───────────────────────────
export type JourSemaine = 'lundi' | 'mardi' | 'mercredi' | 'jeudi' | 'vendredi' | 'samedi';

export interface Creneau {
  id: string;
  classeId: string;
  matiereId: string;
  enseignantId: string;
  salle: string;
  jour: JourSemaine;
  heureDebut: string;          // "08:00"
  heureFin: string;            // "10:00"
  recurrent: boolean;
}

// ── API ──────────────────────────────────────
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  code: string;
  statusCode: number;
}

// ── STORE GLOBAL ─────────────────────────────
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface OfflineQueueItem {
  id: string;
  type: 'note' | 'pointage' | 'message';
  payload: unknown;
  createdAt: string;
  retries: number;
}

export interface AppState {
  auth: AuthState;
  isOnline: boolean;
  offlineQueue: OfflineQueueItem[];
  locale: 'fr' | 'en';
}
