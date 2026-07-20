import { useEffect } from "react";

function ServiceUnitTabs() {
  useEffect(() => {
    const section = document.querySelector(".service-units");
    const tabContainer = section?.querySelector(".service-unit-tabs");
    const tabs = Array.from(
      section?.querySelectorAll(".service-unit-tab[data-service-group]") || [],
    );
    const groups = Array.from(
      section?.querySelectorAll(".service-unit-group[data-service-group]") || [],
    );

    if (!section || !tabContainer || tabs.length === 0 || groups.length === 0) {
      return undefined;
    }

    const setActiveGroup = (groupKey) => {
      groups.forEach((group) => {
        const isActive = group.dataset.serviceGroup === groupKey;
        group.classList.toggle("is-active", isActive);
        group.hidden = !isActive;
      });

      tabs.forEach((tab) => {
        const isActive = tab.dataset.serviceGroup === groupKey;
        tab.classList.toggle("service-unit-tab--active", isActive);
        tab.setAttribute("aria-selected", isActive ? "true" : "false");
        tab.setAttribute("aria-pressed", isActive ? "true" : "false");
        tab.setAttribute("tabIndex", isActive ? "0" : "-1");
      });
    };

    const handleClick = (event) => {
      const tab = event.target.closest(".service-unit-tab[data-service-group]");

      if (!tab || !tabContainer.contains(tab)) {
        return;
      }

      setActiveGroup(tab.dataset.serviceGroup);
      tab.focus();
    };

    const handleKeyDown = (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
        return;
      }

      const currentIndex = tabs.indexOf(document.activeElement);

      if (currentIndex === -1) {
        return;
      }

      event.preventDefault();

      let nextIndex = currentIndex;

      if (event.key === "ArrowRight") {
        nextIndex = (currentIndex + 1) % tabs.length;
      } else if (event.key === "ArrowLeft") {
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      } else if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = tabs.length - 1;
      }

      const nextTab = tabs[nextIndex];
      setActiveGroup(nextTab.dataset.serviceGroup);
      nextTab.focus();
    };

    tabContainer.addEventListener("click", handleClick);
    tabContainer.addEventListener("keydown", handleKeyDown);

    const activeTab =
      tabs.find((tab) => tab.classList.contains("service-unit-tab--active")) ||
      tabs[0];

    setActiveGroup(activeTab.dataset.serviceGroup);

    return () => {
      tabContainer.removeEventListener("click", handleClick);
      tabContainer.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return null;
}

export default ServiceUnitTabs;
