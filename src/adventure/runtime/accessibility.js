// Keep keyboard focus with the cover and the full-screen dialogs mounted outside the game.
(function () {
  const selector = ".title-screen, .hero-picker, .journal-overlay, .certificate, .story, .mini";
  const focusable = 'button:not(:disabled), a[href], input:not(:disabled), summary, [tabindex="0"]';
  const active = () => [...document.querySelectorAll(selector)].filter((el) => !el.hidden && el.isConnected).at(-1);
  const observer = new MutationObserver(() => {
    const app = document.getElementById("app");
    if (app) app.inert = Boolean(active());
  });
  observer.observe(document.body, { childList: true });
  document.addEventListener("keydown", (event) => {
    if (document.querySelector(".hoot-coach[open]")) return;
    const dialog = active();
    if (!dialog || event.key !== "Tab") return;
    const items = [...dialog.querySelectorAll(focusable)].filter((el) => el.getClientRects().length);
    const first = items[0];
    const last = items.at(-1);
    if (!first) return;
    if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
      event.preventDefault();
      first.focus();
    }
  });
})();
