import type { PlankState, WorldState } from "@/engine/world";
import styles from "./ForestScene.module.css";

interface ForestSceneProps {
  world: WorldState;
  hero: string;
  /** The hero waits on the near bank until the forest is complete. */
  heroAt?: "bank" | "across";
  className?: string;
}

const WIDTH = 1200;
const HEIGHT = 520;
const BRIDGE_LEFT = 408;
const BRIDGE_RIGHT = 792;
const DECK_Y = 326;

function Tree({ x, y, scale }: { x: number; y: number; scale: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <rect className={styles.trunk} x={-8} y={-14} width={16} height={52} rx={5} />
      <circle className={styles.canopy} cx={0} cy={-58} r={46} />
      <circle className={styles.canopyLight} cx={-24} cy={-34} r={30} />
      <circle className={styles.canopyLight} cx={26} cy={-38} r={28} />
    </g>
  );
}

// Static scenery, hoisted so it isn't rebuilt on every render.
const BACKDROP = (
  <>
    <ellipse className={styles.hillFar} cx={200} cy={430} rx={540} ry={190} />
    <ellipse className={styles.hillFar} cx={1020} cy={440} rx={560} ry={200} />
    <Tree x={560} y={288} scale={0.62} />
    <Tree x={648} y={298} scale={0.5} />
    <Tree x={732} y={284} scale={0.66} />
    <rect className={styles.river} x={0} y={372} width={WIDTH} height={HEIGHT - 372} />
    <path className={styles.wave} d="M60 420q40-14 80 0t80 0M520 462q40-14 80 0t80 0M930 430q40-14 80 0t80 0" />
    <path className={styles.bank} d="M0 316H416q22 0 16 30L404 520H0z" />
    <path className={styles.bank} d="M1200 316H784q-22 0-16 30L796 520H1200z" />
    <Tree x={92} y={314} scale={1.2} />
    <Tree x={232} y={328} scale={0.9} />
  </>
);

// Fog gathers around the Guardian's gate; one bank lifts for each mastered skill.
const FOG_BANKS = [
  { cx: 1050, cy: 236, rx: 190, ry: 104 },
  { cx: 1150, cy: 120, rx: 150, ry: 80 },
  { cx: 930, cy: 300, rx: 130, ry: 50 },
  { cx: 1170, cy: 330, rx: 150, ry: 70 },
];

function Plank({ state, index, count }: { state: PlankState; index: number; count: number }) {
  const slot = (BRIDGE_RIGHT - BRIDGE_LEFT) / count;
  const x = BRIDGE_LEFT + index * slot + 3;
  const width = slot - 6;
  if (state === "missing") {
    return <rect className={styles.plankMissing} x={x} y={DECK_Y} width={width} height={20} rx={4} />;
  }
  return (
    <g className={`${styles.plank} ${styles[state]}`}>
      <rect className={styles.plankBody} x={x} y={DECK_Y} width={width} height={20} rx={4} />
      <rect className={styles.plankEdge} x={x} y={DECK_Y + 14} width={width} height={6} rx={3} />
      {state === "wobbly" ? (
        <>
          <line className={styles.tie} x1={x + 8} y1={DECK_Y - 22} x2={x + 8} y2={DECK_Y + 8} />
          <line className={styles.tie} x1={x + width - 8} y1={DECK_Y - 22} x2={x + width - 8} y2={DECK_Y + 8} />
        </>
      ) : null}
    </g>
  );
}

function Gate({ open }: { open: boolean }) {
  return (
    <g>
      <rect className={styles.stone} x={966} y={176} width={34} height={142} rx={8} />
      <rect className={styles.stone} x={1086} y={176} width={34} height={142} rx={8} />
      <path className={styles.arch} d="M966 192Q1043 112 1120 192" />
      {open ? (
        <ellipse className={styles.portal} cx={1043} cy={258} rx={44} ry={60} />
      ) : (
        <path className={styles.vines} d="M1000 190q20 40 0 80t0 42M1043 172q-16 50 0 96t0 48M1086 190q-20 40 0 80t0 42" />
      )}
    </g>
  );
}

export function ForestScene({ world, hero, heroAt = "bank", className }: ForestSceneProps) {
  const sunny = world.weather === "sunny";
  const described = world.regionComplete
    ? "The forest is glowing and every plank of the bridge is gold."
    : `The river bridge has ${world.planks.filter((p) => p !== "missing").length} of ${world.planks.length} planks.`;

  return (
    <div className={[styles.scene, className].filter(Boolean).join(" ")} role="img" aria-label={described}>
      <svg className={styles.svg} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <filter id="mq-fog-blur" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="18" />
          </filter>
        </defs>
        <circle className={styles.sunGlow} cx={840} cy={86} r={sunny ? 120 : 84} />
        <circle className={styles.sun} cx={840} cy={86} r={52} />
        {sunny ? null : (
          <g className={styles.cloud}>
            <ellipse cx={790} cy={112} rx={90} ry={34} />
            <ellipse cx={870} cy={98} rx={70} ry={40} />
          </g>
        )}
        {BACKDROP}
        <Gate open={world.gateOpen} />
        <rect className={styles.post} x={396} y={292} width={14} height={50} rx={4} />
        <rect className={styles.post} x={790} y={292} width={14} height={50} rx={4} />
        <path className={styles.rope} d={`M${BRIDGE_LEFT - 10} ${DECK_Y - 26}Q600 ${DECK_Y - 4} ${BRIDGE_RIGHT + 10} ${DECK_Y - 26}`} />
        {world.planks.map((state, index) => (
          <Plank key={`${index}-${state}`} state={state} index={index} count={world.planks.length} />
        ))}
        {world.regionComplete ? (
          <g className={styles.flowers}>
            {[70, 160, 300, 850, 930, 1150].map((x, i) => (
              <g key={x}>
                <circle className={styles.petal} cx={x} cy={338 + (i % 2) * 18} r={9} />
                <circle className={styles.flowerCenter} cx={x} cy={338 + (i % 2) * 18} r={4} />
              </g>
            ))}
          </g>
        ) : null}
        <text className={styles.hero} x={heroAt === "across" ? 900 : 362} y={DECK_Y - 4} textAnchor="middle">
          {hero}
        </text>
        {FOG_BANKS.map((bank, i) => (
          <ellipse key={i} className={styles.fog} data-visible={i < world.fogLayers} filter="url(#mq-fog-blur)" {...bank} />
        ))}
      </svg>
    </div>
  );
}
