// src/components/solid/providers/AppContext.tsx
import { getDirectory, getListings } from "../../../services/api";
import { getCurrentDirectoryId } from "../../../utils/common";
import type { Directory, Listing, Category } from "../../../types";
import { createContext, useContext, type JSX } from "solid-js";
import { createStore } from "solid-js/store";

// Create context for directory data
export interface DirectoryState {
  directoryId: string;
  directory: Directory | null;
  listings: Listing[];
  loading: boolean;
  error: string | null;
  currentLayout: string;
  initialized: boolean;
}

export interface DirectoryActions {
  initialize: () => Promise<void>;
  setLayout: (layout: string) => void;
  getCategory: (id: string) => Category | undefined;
  changeDirectory: (directoryId: string) => Promise<void>;
}

export type DirectoryContextType = DirectoryState & DirectoryActions;

const defaultContext: DirectoryContextType = {
  directoryId: "",
  directory: null,
  listings: [],
  loading: false,
  error: null,
  currentLayout: "Card",
  initialized: false,

  initialize: async () => {},
  setLayout: () => {},
  getCategory: () => undefined,
  changeDirectory: async () => {},
};

const DirectoryContext = createContext<DirectoryContextType>(defaultContext);

// Create provider component
interface AppProviderProps {
  children: JSX.Element;
  initialDirectoryId?: string;
}

export function AppProvider(props: AppProviderProps) {
  // Initialize with the current directory ID
  const initialId = props.initialDirectoryId || getCurrentDirectoryId();
  
  // Create a reactive store for the directory state
  const [state, setState] = createStore<DirectoryState>({
    directoryId: initialId,
    directory: null,
    listings: [],
    loading: false,
    error: null,
    currentLayout: "Card",
    initialized: false,
  });

  // Initialize directory data
  const initialize = async () => {
    if (state.initialized) return;

    setState("loading", true);
    setState("error", null);

    try {
      // Fetch directory data
      const directoryData = await getDirectory(state.directoryId);

      if (!directoryData) {
        throw new Error(`Directory not found: ${state.directoryId}`);
      }

      // Set directory data
      setState("directory", directoryData);

      // Set initial layout
      const defaultLayout = directoryData.defaultLayout || "Card";
      setState("currentLayout", defaultLayout);

      // Check URL for layout parameter
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const layoutParam = urlParams.get("layout");

        if (
          layoutParam &&
          directoryData.availableLayouts.includes(layoutParam)
        ) {
          setState("currentLayout", layoutParam);
        }
      }

      // Fetch listings
      const listings = await getListings(state.directoryId);
      setState("listings", listings);

      // Mark as initialized
      setState("initialized", true);
    } catch (error) {
      console.error("Error initializing directory context:", error);
      setState("error", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setState("loading", false);
    }
  };

  // Set layout
  const setLayout = (layout: string) => {
    if (state.directory && state.directory.availableLayouts.includes(layout)) {
      setState("currentLayout", layout);

      // Update URL if in browser
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("layout", layout);
        window.history.pushState({}, "", url);
      }
    }
  };

  // Get category by ID
  const getCategory = (id: string): Category | undefined => {
    if (!state.directory) return undefined;
    return state.directory.categories.find((cat) => cat.id === id);
  };
  
  // Change the current directory
  const changeDirectory = async (directoryId: string) => {
    if (directoryId === state.directoryId) return;
    
    setState({
      directoryId,
      initialized: false,
      directory: null,
      listings: [],
    });
    
    // Reinitialize with new directory
    await initialize();
  };

  // Create the context value
  const contextValue: DirectoryContextType = {
    ...state,
    initialize,
    setLayout,
    getCategory,
    changeDirectory,
  };

  // Initialize on mount
  if (typeof window !== "undefined") {
    // Only run in browser environment
    initialize();
  }

  return (
    <DirectoryContext.Provider value={contextValue}>
      {props.children}
    </DirectoryContext.Provider>
  );
}

// Custom hook to use directory context
export function useDirectory() {
  const context = useContext(DirectoryContext);

  if (!context) {
    throw new Error("useDirectory must be used within an AppProvider");
  }

  return context;
}