// Static page shell for the adventure. The runtime (src/adventure/runtime) finds these ids and fills
// them in; React renders this once and never re-renders it.
export function Shell() {
  return (
    <>
      <div id="app" className="app">
        <header className="hud">
          {/* Ambient sky for the bar: two drifting cloud layers, clipped to the bar and
              behind everything in it. Decorative only — see styles/chrome-blend.css. */}
          <div className="hud-sky" aria-hidden="true"><i className="hs-far" /><i className="hs-near" /></div>
          <a className="mq-brand" href="/" aria-label="MathQuest home"><span className="brand-mark" aria-hidden="true">✦</span>mathquest<span className="brand-dot">.</span></a>
          <button type="button" id="homeBtn" className="hud-pill hud-icon" aria-label="Back to the map" hidden>
            <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <p id="hudTitle" className="hud-pill hud-title">
            Addition Forest
          </p>
          <div className="hud-right">
            <button type="button" id="badgeBtn" className="hud-pill badge-pill" aria-label="Open the Badge Book">
              <span aria-hidden="true">🏅</span>
              <b id="badgeCount">0/21</b>
            </button>
            <button type="button" id="shopBtn" className="hud-pill hud-icon" aria-label="Open Hoot's Shop">
              🛍️
            </button>
            <button type="button" id="muteBtn" className="hud-pill hud-icon hud-mute" aria-label="Sound on" aria-pressed="true">
              🔊
            </button>
            <p id="coinPill" className="hud-pill hud-coins">
              <span aria-hidden="true">🪙</span>
              <b id="coinCount">0</b>
              <span className="visually-hidden"> coins</span>
            </p>
          </div>
        </header>

        <main id="mapScreen" className="screen map-screen">
          <section className="map-intro">
            <p className="eyebrow">YOUR VERY OWN LITTLE ADVENTURE</p>
            <h1 id="worldTitle">Addition Forest</h1>
            <p id="worldIntro">Hop the river, light the lantern, and wake the Forest Guardian!</p>
          </section>
          <div id="mapBoard" className="map-board" />
          <p className="map-foot">
            <button type="button" id="storyBtn" className="story-skip">
              📖 Replay the story intro
            </button>
            <span>Little steps. Bright discoveries.</span>
            <button type="button" id="unlockBtn" className="story-skip" hidden>Playtest: unlock all chapters</button>
          </p>
        </main>

        <main id="levelScreen" className="screen level-screen" hidden>
          <div id="stage" className="stage" />
          <div className="hoot">
            <p id="hootBubble" className="hoot-bubble" role="status" hidden />
          </div>
          {/* Hoot, the companion: the same bar in every level (runtime/companion.js). */}
          <section id="companion" className="companion" aria-label="Hoot, your companion" data-moment="start" data-source="built-in">
            <button type="button" id="hootBtn" className="hoot-btn" aria-label="Ask Hoot for help">
              <svg className="owl" viewBox="0 0 80 80" aria-hidden="true">
                <path className="owl-wing owl-wing-l" d="M17 42 Q4 56 18 72 Z" />
                <path className="owl-wing owl-wing-r" d="M63 42 Q76 56 62 72 Z" />
                <path className="owl-body" d="M40 12 C58 12 66 28 66 46 C66 66 54 76 40 76 C26 76 14 66 14 46 C14 28 22 12 40 12 Z" />
                <path className="owl-ear" d="M20 24 L27 10 L33 20 Z M60 24 L53 10 L47 20 Z" />
                <ellipse className="owl-belly" cx="40" cy="57" rx="15" ry="15" />
                <g className="owl-eyes">
                  <circle className="owl-eye-ring" cx="29" cy="38" r="10" />
                  <circle className="owl-eye-ring" cx="51" cy="38" r="10" />
                  <circle className="owl-pupil" cx="30" cy="39" r="4.5" />
                  <circle className="owl-pupil" cx="52" cy="39" r="4.5" />
                </g>
                <path className="owl-beak" d="M36 47 L40 54 L44 47 Z" />
              </svg>
            </button>
            <div className="companion-words">
              <p id="companionTitle" className="companion-title">HOOT</p>
              <p id="companionText" className="companion-text" aria-live="polite" />
              <p id="companionSees" className="companion-sees" />
            </div>
            <button type="button" id="companionHelp" className="companion-help">Help me think</button>
          </section>
        </main>

        <div id="result" className="result" hidden />
      </div>
      <div id="fx" className="fx" aria-hidden="true" />
    </>
  );
}
