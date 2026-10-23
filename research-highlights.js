document.querySelectorAll(".research-highlight-toggle").forEach((button) => {
  const panel = document.getElementById(button.getAttribute("aria-controls"));
  const heading = button.closest(".research-highlight, .research-theme")?.querySelector("h2, h3");
  if (!panel || !heading) return;
  const direction = heading.textContent.trim();
  const openLabel = button.textContent.trim();
  const closeLabel = button.dataset.closeLabel || "See Less";
  button.setAttribute("aria-label", `${openLabel}: ${direction}`);

  button.addEventListener("click", () => {
    const expanded = button.getAttribute("aria-expanded") === "true";
    const nextExpanded = !expanded;

    button.setAttribute("aria-expanded", String(nextExpanded));
    button.textContent = nextExpanded ? closeLabel : openLabel;
    button.setAttribute("aria-label", `${nextExpanded ? closeLabel : openLabel}: ${direction}`);
    panel.classList.toggle("is-open", nextExpanded);
    panel.setAttribute("aria-hidden", String(!nextExpanded));
    panel.toggleAttribute("inert", !nextExpanded);
  });
});
