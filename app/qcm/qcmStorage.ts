export type SavedQcm = {
  selectedModule: string;
  questionCount: number;
  questions: unknown[];
  answers: Record<number, number>;
  currentIndex: number;
  seconds: number;
  savedAt: number;
};

const STORAGE_KEY = "part66-qcm-en-cours";

export function saveQcm(state: SavedQcm) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(state),
    );
  } catch {
    // Le stockage local peut être indisponible.
  }
}

export function loadQcm(): SavedQcm | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as SavedQcm;
  } catch {
    return null;
  }
}

export function clearQcm() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Rien à faire si le stockage est indisponible.
  }
}