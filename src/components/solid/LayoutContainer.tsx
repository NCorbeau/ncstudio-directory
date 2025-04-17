// src/components/solid/LayoutContainer.tsx
import { createSignal, onMount, onCleanup, Show, lazy, Suspense } from "solid-js";
import LayoutSwitcher from "./LayoutSwitcher";
import type { LayoutProps } from "../../types";
// Lazy load layout components for better performance
const CardLayout = lazy(() => import("./layouts/CardLayout"));
const TableLayout = lazy(() => import("./layouts/TableLayout"));
const ListLayout = lazy(() => import("./layouts/ListLayout"));
const MagazineLayout = lazy(() => import("./layouts/MagazineLayout"));
const MapLayout = lazy(() => import("./layouts/MapLayout"));

interface LayoutContainerProps extends LayoutProps {
  currentLayout?: string;
  searchParams?: string;
}

export default function LayoutContainer(props: LayoutContainerProps) {
  const {
    listings,
    directory,
    categories,
    directoryId,
    currentLayout: initialLayout,
    searchParams = "",
  } = props;

  // Get available layouts from directory config
  const availableLayouts = directory.availableLayouts || ["Card"];
  const defaultLayout = directory.defaultLayout || "Card";

  // Initialize with the provided layout or default
  const [activeLayout, setActiveLayout] = createSignal(
    initialLayout && availableLayouts.includes(initialLayout)
      ? initialLayout
      : defaultLayout
  );

  // Handle layout change events
  const handleLayoutChange = (event: CustomEvent) => {
    const layout = event.detail.layout;
    if (availableLayouts.includes(layout)) {
      setActiveLayout(layout);
    }
  };

  // Listen for layout change events
  onMount(() => {
    // Check URL for layout parameter
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const layoutParam = urlParams.get("layout");

      if (layoutParam && availableLayouts.includes(layoutParam)) {
        setActiveLayout(layoutParam);
      }
    }

    // Add event listener for layout changes
    if (typeof document !== "undefined") {
      document.addEventListener(
        "layoutchange",
        handleLayoutChange as EventListener
      );
    }
  });

  // Remove event listener on cleanup
  onCleanup(() => {
    if (typeof document !== "undefined") {
      document.removeEventListener(
        "layoutchange",
        handleLayoutChange as EventListener
      );
    }
  });

  // Loading fallback component
  const LoadingFallback = () => (
    <div class="layout-loading">
      <div class="spinner"></div>
      <p>Loading layout...</p>
    </div>
  );

  return (
    <div class="layout-container">
      {availableLayouts.length > 1 && (
        <LayoutSwitcher
          availableLayouts={availableLayouts}
          currentLayout={activeLayout()}
          directoryId={directoryId}
          searchParams={searchParams}
        />
      )}

      <div class="layout-content-wrapper">
        <Suspense fallback={<LoadingFallback />}>
          <Show when={activeLayout() === "Card"}>
            <CardLayout
              listings={listings}
              directory={directory}
              categories={categories}
              directoryId={directoryId}
            />
          </Show>

          <Show when={activeLayout() === "Table"}>
            <TableLayout
              listings={listings}
              directory={directory}
              categories={categories}
              directoryId={directoryId}
            />
          </Show>

          <Show when={activeLayout() === "List"}>
            <ListLayout
              listings={listings}
              directory={directory}
              categories={categories}
              directoryId={directoryId}
            />
          </Show>

          <Show when={activeLayout() === "Magazine"}>
            <MagazineLayout
              listings={listings}
              directory={directory}
              categories={categories}
              directoryId={directoryId}
            />
          </Show>

          <Show when={activeLayout() === "Map"}>
            <MapLayout
              listings={listings}
              directory={directory}
              categories={categories}
              directoryId={directoryId}
            />
          </Show>
        </Suspense>
      </div>
    </div>
  );
}