// Press feel. A game button is a physical object: it sinks where you push it and tips towards your
// finger, then springs back. CSS alone cannot know where inside the button the pointer landed, so this
// records that one number per press and hands it to the stylesheet as --tilt-x / --tilt-y.
// Motion only — nothing here changes what a control does, so reduced motion and calm mode simply skip it.
(function () {
  const still = () => matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.hasAttribute("data-calm");
  // Keyboard and assistive activation have no pointer position; those presses stay square, which is correct.
  const clear = (el) => { el.style.removeProperty("--tilt-x"); el.style.removeProperty("--tilt-y"); };

  function press(event) {
    if (still()) return;
    const button = event.target.closest(".btn");
    if (!button || button.disabled) return;
    const box = button.getBoundingClientRect();
    if (!box.width || !box.height) return;
    // -1 at one edge, +1 at the other, 0 dead centre.
    const x = ((event.clientX - box.left) / box.width) * 2 - 1;
    const y = ((event.clientY - box.top) / box.height) * 2 - 1;
    // Pushing the top edge tips the top away, so the X rotation is inverted.
    button.style.setProperty("--tilt-x", (-y).toFixed(2));
    button.style.setProperty("--tilt-y", x.toFixed(2));
  }
  function release(event) {
    const button = event.target.closest?.(".btn");
    if (button) clear(button);
  }

  document.addEventListener("pointerdown", press, true);
  document.addEventListener("pointerup", release, true);
  document.addEventListener("pointercancel", release, true);
  // A drag that leaves the button ends the press too, so it never stays tilted.
  document.addEventListener("pointerleave", release, true);
})();
