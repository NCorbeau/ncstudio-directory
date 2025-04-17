import LayoutSwitcher from "./LayoutSwitcher";
import type { LayoutProps } from "../../types";
import { createSignal, onMount, onCleanup } from "solid-js";

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

      <div id="layout-wrapper">
        {/* Instead of directly importing and using Astro components inside SolidJS,
            we'll use a different approach with data attributes to indicate the active layout */}
        <div
          id="card-layout"
          class="layout-content"
          style={{ display: activeLayout() === "Card" ? "block" : "none" }}
          data-active={activeLayout() === "Card" ? "true" : "false"}
        >
          {/* CardLayout will be rendered by Astro separately */}
        </div>

        <div
          id="table-layout"
          class="layout-content"
          style={{ display: activeLayout() === "Table" ? "block" : "none" }}
          data-active={activeLayout() === "Table" ? "true" : "false"}
        >
          {/* TableLayout will be rendered by Astro separately */}
        </div>

        <div
          id="list-layout"
          class="layout-content"
          style={{ display: activeLayout() === "List" ? "block" : "none" }}
          data-active={activeLayout() === "List" ? "true" : "false"}
        >
          {/* ListLayout will be rendered by Astro separately */}
        </div>

        <div
          id="magazine-layout"
          class="layout-content"
          style={{ display: activeLayout() === "Magazine" ? "block" : "none" }}
          data-active={activeLayout() === "Magazine" ? "true" : "false"}
        >
          {/* MagazineLayout will be rendered by Astro separately */}
        </div>

        <div
          id="map-layout"
          class="layout-content"
          style={{ display: activeLayout() === "Map" ? "block" : "none" }}
          data-active={activeLayout() === "Map" ? "true" : "false"}
        >
          {/* MapLayout will be rendered by Astro separately */}
        </div>
      </div>
    </div>
  );
}
