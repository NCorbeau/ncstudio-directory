import { getDirectory, getListings } from "../../../services/api";
import { getCurrentDirectoryId } from "../../../utils/common";
import type { Directory, Listing, Category } from "../../../types";
import { type JSX, createSignal, onMount, useContext } from "solid-js";
import { createContext } from "vm";

// Create context for directory data
interface DirectoryContextType {
  directoryId: string;
  directory: Directory | null;
  listings: Listing[];
  loading: boolean;
  error: string | null;
  currentLayout: string;
  initialized: boolean;

  // Methods
  initialize: () => Promise<void>;
  setLayout: (layout: string) => void;
  getCategory: (id: string) => Category | undefined;
}

const DirectoryContext = createContext<DirectoryContextType>({
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
});

// Create provider component
interface AppProviderProps {
  children: JSX.Element;
  initialDirectoryId?: string;
}

export function AppProvider(props: AppProviderProps) {
  const { children, initialDirectoryId } = props;

  // State
  const [directoryId, setDirectoryId] = createSignal(
    initialDirectoryId || getCurrentDirectoryId()
  );
  const [directory, setDirectory] = createSignal<Directory | null>(null);
  const [listings, setListings] = createSignal<Listing[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [currentLayout, setCurrentLayout] = createSignal("Card");
  const [initialized, setInitialized] = createSignal(false);

  // Initialize data
  const initialize = async () => {
    if (initialized()) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch directory data
      const directoryData = await getDirectory(directoryId());

      if (!directoryData) {
        throw new Error(`Directory not found: ${directoryId()}`);
      }

      // Set directory data
      setDirectory(directoryData);

      // Set initial layout
      const defaultLayout = directoryData.defaultLayout || "Card";
      setCurrentLayout(defaultLayout);

      // Check URL for layout parameter
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const layoutParam = urlParams.get("layout");

        if (
          layoutParam &&
          directoryData.availableLayouts.includes(layoutParam)
        ) {
          setCurrentLayout(layoutParam);
        }
      }

      // Fetch listings
      const listingsData = await getListings(directoryId());
      setListings(listingsData);

      // Mark as initialized
      setInitialized(true);
    } catch (err) {
      console.error("Error initializing directory context:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  // Set layout
  const setLayout = (layout: string) => {
    if (directory() && directory()!.availableLayouts.includes(layout)) {
      setCurrentLayout(layout);

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
    if (!directory()) return undefined;
    return directory()!.categories.find((cat) => cat.id === id);
  };

  // Initialize on mount
  onMount(() => {
    if (!initialized()) {
      initialize();
    }
  });

  // Context value
  const contextValue = {
    directoryId: directoryId(),
    directory: directory(),
    listings: listings(),
    loading: loading(),
    error: error(),
    currentLayout: currentLayout(),
    initialized: initialized(),

    initialize,
    setLayout,
    getCategory,
  };

  return (
    <DirectoryContext.Provider value={contextValue}>
      {children}
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
