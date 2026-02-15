/**
 * Undo/Redo Middleware for Zustand
 *
 * Middleware que mantém pilhas de past/future para desfazer/refazer
 * alteracoes no estado do Studio. Apenas rastreia campos de conteudo,
 * ignorando flags transitorias (isSaving, isDirty, etc).
 */

// Tipagem simplificada — StateCreator/StoreMutatorIdentifier nao usados
// diretamente pois o middleware usa `any` para compatibilidade com a cadeia
// devtools(persist(undoRedo(...))).  O tipo final e garantido por create<StudioStore>().

// ============================================================================
// TYPES
// ============================================================================

/** Estado exposto pelo middleware de undo/redo */
export interface UndoRedoState {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  clearHistory: () => void;
}

/** Campos do estado que sao rastreados para undo/redo (conteudo significativo) */
interface ContentSnapshot {
  slides: unknown[];
  caption: string;
  hashtags: string[];
  profile: Record<string, unknown>;
  header: Record<string, unknown>;
  projectTitle: string;
  contentType: string;
  aspectRatio: string;
}

/** Chaves do snapshot que rastreamos */
const TRACKED_KEYS: (keyof ContentSnapshot)[] = [
  "slides",
  "caption",
  "hashtags",
  "profile",
  "header",
  "projectTitle",
  "contentType",
  "aspectRatio",
];

/** Maximo de snapshots na pilha de undo */
const MAX_HISTORY = 50;

// ============================================================================
// HELPERS
// ============================================================================

/** Extrai apenas os campos rastreados do estado */
function takeSnapshot(state: Record<string, unknown>): ContentSnapshot {
  const snapshot: Record<string, unknown> = {};
  for (const key of TRACKED_KEYS) {
    snapshot[key] = structuredClone(state[key]);
  }
  return snapshot as unknown as ContentSnapshot;
}

/** Verifica se dois snapshots sao iguais (deep comparison via JSON) */
function snapshotsEqual(a: ContentSnapshot, b: ContentSnapshot): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Middleware de undo/redo para Zustand.
 *
 * Envolve o store e intercepta chamadas a `set()`. Antes de cada
 * mutacao que altera campos rastreados, salva um snapshot na pilha past.
 * Novas acoes limpam a pilha future.
 *
 * Tipagem simplificada — o tipo final e garantido pelo `create<Store>()`
 * no consumer que integra `UndoRedoState`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const undoRedo = (creator: any) => (set: any, get: any, api: any) => {
    let past: ContentSnapshot[] = [];
    let future: ContentSnapshot[] = [];
    /** Flag para evitar gravar snapshots durante undo/redo */
    let isUndoRedoing = false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const setAny = set as any;

    // Wrapper do set que intercepta mutacoes para snapshot
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wrappedSet = (partial: any, replace?: boolean) => {
      if (!isUndoRedoing) {
        const currentState = get() as Record<string, unknown>;
        const currentSnapshot = takeSnapshot(currentState);

        // Aplicar a mutacao primeiro para comparar
        setAny(partial, replace);

        const newState = get() as Record<string, unknown>;
        const newSnapshot = takeSnapshot(newState);

        // So grava snapshot se os campos rastreados mudaram
        if (!snapshotsEqual(currentSnapshot, newSnapshot)) {
          past = [...past.slice(-(MAX_HISTORY - 1)), currentSnapshot];
          future = []; // Novas acoes invalidam o redo

          // Atualizar flags
          setAny({ canUndo: past.length > 0, canRedo: false }, false);
        }
        return;
      }

      setAny(partial, replace);
    };

    // Criar o estado base usando o wrapped set
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseState = creator(wrappedSet as any, get as any, {
      ...api,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setState: wrappedSet as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getState: get as any,
    });

    return {
      ...baseState,

      // Estado inicial
      canUndo: false,
      canRedo: false,

      undo: () => {
        if (past.length === 0) return;

        isUndoRedoing = true;
        try {
          const currentState = get() as Record<string, unknown>;
          const currentSnapshot = takeSnapshot(currentState);
          const previousSnapshot = past[past.length - 1];

          // Mover do past para future
          past = past.slice(0, -1);
          future = [...future, currentSnapshot];

          // Restaurar o estado anterior + atualizar flags
          setAny(
            {
              ...previousSnapshot,
              canUndo: past.length > 0,
              canRedo: true,
              isDirty: true,
            },
            false
          );
        } finally {
          isUndoRedoing = false;
        }
      },

      redo: () => {
        if (future.length === 0) return;

        isUndoRedoing = true;
        try {
          const currentState = get() as Record<string, unknown>;
          const currentSnapshot = takeSnapshot(currentState);
          const nextSnapshot = future[future.length - 1];

          // Mover do future para past
          future = future.slice(0, -1);
          past = [...past, currentSnapshot];

          // Restaurar o proximo estado + atualizar flags
          setAny(
            {
              ...nextSnapshot,
              canUndo: true,
              canRedo: future.length > 0,
              isDirty: true,
            },
            false
          );
        } finally {
          isUndoRedoing = false;
        }
      },

      clearHistory: () => {
        past = [];
        future = [];
        setAny({ canUndo: false, canRedo: false }, false);
      },
    };
  };
