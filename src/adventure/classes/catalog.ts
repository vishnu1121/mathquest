// The six classes: each is an island with eight story chapters, six practice trails and a mystery expedition,
// mapped to that grade's syllabus. Existing chapters keep their original slot (and so their bonus game);
// every other slot is a new chapter built from the task families. Bonus games are shared by slot.
import { createRng, type Rng } from "../../engine/rng";
import * as F from "./familiesFractions";
import * as M from "./familiesMeasure";
import * as N from "./familiesNumber";
import * as Scenes from "./scenes";
import * as Worlds from "./worlds";
import type { GradeId } from "./progress";
import type { Task } from "./tasks";

export type Domain = "CC" | "OA" | "NBT" | "NF" | "MD" | "G";
export type Speaker = "Hoot" | "Pip" | "Nimbus" | "Tinker";
export interface StoryPage { speaker: Speaker; title: string; text: string }
export type Maker = (rng: Rng) => Task;

interface ChapterBase {
  id: string;
  slot: number;
  title: string;
  place: string;
  emoji: string;
  domains: Domain[];
  /** What the child practices, in kid words. */
  skills: string;
  /** Syllabus codes and wording, for grown-ups. */
  standards: string;
  quest: string;
}
export interface EngineChapter extends ChapterBase { kind: "engine"; reward: string; intro: StoryPage[]; outro: StoryPage[]; rounds: Maker[] }
export interface ClassicChapter extends ChapterBase { kind: "classic" }
export type Chapter = EngineChapter | ClassicChapter;

export type Practice =
  | { id: string; kind: "engine"; title: string; emoji: string; description: string; sources: string[] }
  | { id: string; kind: "trail"; title: string; emoji: string; description: string; trail: "subtraction" | "multiplication" | "division" | "fractions" | "patterns" | "measurement" | "geometry"; band: 1 | 2 | 3 };

export interface ClassInfo {
  id: GradeId;
  label: string;
  short: string;
  island: string;
  emoji: string;
  tagline: string;
  chapters: Chapter[];
  practice: Practice[];
  expedition: { id: string; title: string; sources: string[] };
}

/** The bonus game that follows each chapter slot, shared by every class. */
export const BONUS_BY_SLOT = ["mist", "flight", "dance", "courier", "bowls", "starmatch", "prismpop", "orchestra"] as const;
export const ROUNDS = 5;

const page = (speaker: Speaker, title: string, text: string): StoryPage => ({ speaker, title, text });
const engine = (c: Omit<EngineChapter, "kind">): EngineChapter => ({ kind: "engine", ...c });
const classic = (c: Omit<ClassicChapter, "kind">): ClassicChapter => ({ kind: "classic", ...c });

const ALL_SHAPES = ["circle", "triangle", "square", "rectangle", "hexagon"] as const;

const KINDERGARTEN: ClassInfo = {
  id: "K", label: "Kindergarten", short: "K", island: "Firefly Meadow", emoji: "🌾", tagline: "Count, make ten, and meet the shapes.",
  chapters: [
    engine({
      id: "k-count", slot: 1, title: "The Counting Meadow", place: "Clover Hill", emoji: "🐞", domains: ["CC"], skills: "Counting to 100 · counting on",
      standards: "K.CC.1–5: count to 100 by ones and tens, count forward from any number, write numbers 0–20, count objects one to one.",
      quest: "Help Pip count the meadow’s ladybugs and hop along the number path.", reward: "A ladybug lantern",
      intro: [page("Hoot", "Wake up, little meadow!", "The Muddle Mist blew the ladybugs out of their rows. Pip wants to learn to count them. Count with Pip: one number for every bug.")],
      outro: [page("Pip", "I can count!", "Every ladybug is back in its row. Pip points to each ladybug once, then joins you on the counting path.")],
      rounds: [(r) => Scenes.picnic(r, 5), (r) => N.countOnLine(r, "k.cc.counton", 10), (r) => N.nextInSequence(r, "k.cc.sequence", 1, 100, true), (r) => N.tensInOrder(r, "k.cc.tens"), (r) => N.countObjects(r, "k.cc.write", 11, 20)],
    }),
    engine({ id: "fireflies", slot: 2, title: "Firefly Homes", place: "Firefly Glade", emoji: "✨", domains: ["OA"], skills: "Fill five · make ten", standards: "K.OA.4–5: make ten with objects; compose numbers within five.", quest: "Give every little firefly a glowing home.", reward: "A firefly friend", intro: [page("Pip", "Little lights need homes", "Tap an empty home. A firefly moves in! Let’s fill the little lantern.")], outro: [page("Hoot", "Everyone is home", "Every home glows. Pip carries a little lantern to the berry picnic.")], rounds: [(r) => Scenes.fireflyHomes(r, false), (r) => Scenes.fireflyHomes(r, false), (r) => Scenes.fireflyHomes(r), (r) => Scenes.fireflyHomes(r), (r) => Scenes.fireflyHomes(r)] }),
    engine({
      id: "k-compare", slot: 3, title: "Berry Basket Swap", place: "Bramble Lane", emoji: "🫐", domains: ["CC"], skills: "More, fewer, the same",
      standards: "K.CC.6–7: compare groups of objects and written numbers from 1 to 10.",
      quest: "Help the squirrels swap berry baskets fairly.", reward: "A basket of blueberries",
      intro: [page("Pip", "Is it fair?", "The squirrels are swapping berry baskets, but Pip can’t tell which basket has more. Match the berries up to find out!")],
      outro: [page("Hoot", "Fair and square", "You matched every berry. Now everyone knows which basket has more, fewer, or the same.")],
      rounds: [(r) => N.compareGroups(r, "k.cc.compare", 6, "more"), (r) => N.compareGroups(r, "k.cc.compare", 10, "fewer"), (r) => N.greaterNumber(r, "k.cc.comparenum", 10), (r) => N.compareGroups(r, "k.cc.compare", 10, "more"), (r) => N.countObjects(r, "k.cc.count", 5, 15)],
    }),
    engine({
      id: "k-teens", slot: 4, title: "Teen Number Towers", place: "Tower Rocks", emoji: "🧱", domains: ["NBT"], skills: "Teen numbers are ten and some ones",
      standards: "K.NBT.1: compose and decompose numbers from 11 to 19 into ten ones and some further ones.",
      quest: "Rebuild the towers with one ten stick and some loose stones.", reward: "A ten-stick flag",
      intro: [page("Hoot", "Ten sticks and loose stones", "The towers on Tower Rocks fell down. Each tower is one ten stick and some loose stones. Let’s build them back up.")],
      outro: [page("Pip", "Ten and more!", "Every tower stands tall. Pip whispers, “Sixteen is a ten and six more. I get it!”")],
      rounds: [(r) => N.teenSentence(r, "k.nbt.teens"), (r) => N.teenBuild(r, "k.nbt.teens"), (r) => N.teenChoice(r, "k.nbt.teens"), (r) => N.teenBuild(r, "k.nbt.teens"), (r) => N.teenChoice(r, "k.nbt.teens")],
    }),
    engine({
      id: "k-bunny", slot: 5, title: "Bunny Hop Rescue", place: "Carrot Patch", emoji: "🐰", domains: ["OA"], skills: "Adding and taking away within 10",
      standards: "K.OA.1–3, K.OA.5: add and subtract within 10, decompose numbers up to 10, fluency within 5, story problems.",
      quest: "Keep track of the bunnies hopping in and out of the carrot patch.", reward: "A golden carrot",
      intro: [page("Pip", "Hop, hop, add!", "Bunnies keep hopping in and out of the carrot patch. Help Pip keep track of how many are there.")],
      outro: [page("Hoot", "Every bunny counted", "The bunnies line up for a carrot party. You added and took away just right.")],
      rounds: [(r) => Worlds.patch(r, "K", false, "k.oa.add"), (r) => Worlds.patch(r, "K", true, "k.oa.sub"), (r) => Worlds.patch(r, "K", true, "k.oa.decompose"), (r) => Worlds.patch(r, "K", r.next() < 0.5, "k.oa.fluency", 5), (r) => Worlds.patch(r, "K", true, "k.oa.word")],
    }),
    engine({
      id: "k-measure", slot: 6, title: "The Tiny Measurers", place: "Pebble Pond", emoji: "📏", domains: ["MD"], skills: "Longer, heavier, and sorting",
      standards: "K.MD.1–3: describe and compare measurable attributes like length and weight; sort objects into categories.",
      quest: "Help the pond friends compare and sort everything for a picnic.", reward: "A picnic blanket",
      intro: [page("Hoot", "Which is bigger?", "The pond friends are packing for a picnic. Help them compare and sort everything so it all fits.")],
      outro: [page("Pip", "Picnic ready!", "Long things, short things, heavy and light: everything is sorted. The picnic can begin.")],
      rounds: [(r) => M.compareAttribute(r, "k.md.compare", "length"), (r) => M.compareAttribute(r, "k.md.compare", "weight"), (r) => M.sortCategories(r, "k.md.sort"), (r) => M.compareAttribute(r, "k.md.compare", "length"), (r) => M.sortCategories(r, "k.md.sort")],
    }),
    engine({
      id: "k-shapes", slot: 7, title: "The Shape Parade", place: "Pinwheel Park", emoji: "🔺", domains: ["G"], skills: "Naming shapes and where things are",
      standards: "K.G.1–3: position words (above, below, beside), name shapes in any orientation, flat (2D) and solid (3D) shapes.",
      quest: "The parade floats got turned around. Help Pip name every shape.", reward: "A pinwheel",
      intro: [page("Pip", "Shapes in a spin", "The parade floats got turned around. A square turned sideways is still a square! Help Pip name them.")],
      outro: [page("Hoot", "What a parade!", "Every float found its place. Pip waves a triangle flag, tipped on its side.")],
      rounds: [(r) => M.nameShape(r, "k.g.name", [...ALL_SHAPES]), (r) => M.positionWord(r, "k.g.position"), (r) => M.flatOrSolid(r, "k.g.flatsolid"), (r) => M.nameShape(r, "k.g.name", [...ALL_SHAPES]), (r) => M.positionWord(r, "k.g.position")],
    }),
    engine({
      id: "k-castle", slot: 8, title: "The Block Castle", place: "Sunflower Hill", emoji: "🏰", domains: ["G", "OA"], skills: "Building shapes and solids · making ten",
      standards: "K.G.4–6: compare 2D and 3D shapes and build shapes from parts; review K.OA.4 making ten.",
      quest: "Build a castle for all the meadow friends.", reward: "A castle for everyone",
      intro: [page("Hoot", "A castle for everyone", "Pip wants to build a castle for all the meadow friends. We need the right blocks and shapes.")],
      outro: [page("Pip", "Our castle!", "The castle glows on Sunflower Hill. Counting, making ten, and all the shapes: look how much you learned!")],
      rounds: [(r) => M.solidName(r, "k.g.solids"), (r) => M.sticksForShape(r, "k.g.build"), (r) => M.flatOrSolid(r, "k.g.flatsolid"), (r) => N.makeTenBuild(r, "k.oa.maketen"), (r) => M.sticksForShape(r, "k.g.build")],
    }),
  ],
  practice: [
    { id: "k-trail-patterns", kind: "trail", trail: "patterns", band: 1, title: "Pattern Express", emoji: "🚂", description: "Fix the musical train by finding its rule." },
    { id: "k-trail-geometry", kind: "trail", trail: "geometry", band: 1, title: "Shape Observatory", emoji: "🔭", description: "Stretch starlight between pegs to build shapes." },
    { id: "k-trail-subtraction", kind: "trail", trail: "subtraction", band: 1, title: "Starfall Station", emoji: "🚀", description: "Send stars home and count the ones that stay." },
    { id: "k-p-count", kind: "engine", title: "Counting Clover", emoji: "🍀", description: "Count, count on and compare groups.", sources: ["k-count", "k-compare"] },
    { id: "k-p-teens", kind: "engine", title: "Ten-Stick Stream", emoji: "🪵", description: "Teen numbers, adding and taking away.", sources: ["k-teens", "k-bunny"] },
    { id: "k-p-measure", kind: "engine", title: "Sort & Measure", emoji: "🧺", description: "Compare, sort and name shapes.", sources: ["k-measure", "k-shapes", "k-castle"] },
  ],
  expedition: { id: "k-p-expedition", title: "Mystery expedition", sources: ["k-count", "k-compare", "k-teens", "k-bunny", "k-measure", "k-shapes", "k-castle"] },
};

const GRADE1: ClassInfo = {
  id: "1", label: "Grade 1", short: "G1", island: "Riverbend", emoji: "🐸", tagline: "Tens and ones, telling time and story problems.",
  chapters: [
    classic({ id: "frog", slot: 1, title: "The Scattered River", place: "Lilypond Landing", emoji: "🐸", domains: ["NBT", "OA"], skills: "Counting on · ten more", standards: "1.NBT.5, 1.OA.5–6: count on, find ten more, add by crossing a ten.", quest: "The mist scattered our lights. Help a little frog hop the number path." }),
    engine({
      id: "g1-scales", slot: 2, title: "The Equal-Sign Scales", place: "Balance Bridge", emoji: "⚖️", domains: ["OA"], skills: "What the equal sign means",
      standards: "1.OA.3, 1.OA.7–8: properties of addition, the meaning of the equal sign, find the unknown number in an equation.",
      quest: "Balance the bridge scales so the river friends can cross.", reward: "A balanced bridge",
      intro: [page("Hoot", "A wobbly bridge", "Balance Bridge only stays level when both sides are equal. That is what the equal sign means: the same on both sides.")],
      outro: [page("Pip", "Steady as a rock", "The bridge sits perfectly level. Pip tiptoes across: “Both sides the same. Balanced!”")],
      rounds: [(r) => N.equalSignSort(r, "g1.oa.equal", 20), (r) => Scenes.balanceBridge(r, 10), (r) => N.unknownNumber(r, "g1.oa.unknown", "−", 20), (r) => N.propertyBlank(r, "g1.oa.properties", 20), (r) => N.equalSignSort(r, "g1.oa.equal", 20)],
    }),
    engine({
      id: "g1-story", slot: 3, title: "Story Pond Problems", place: "Reed Harbor", emoji: "🦆", domains: ["OA"], skills: "Story problems within 20",
      standards: "1.OA.1–2, 1.OA.6: add and subtract within 20 to solve word problems, including three addends.",
      quest: "The ducks have stories to tell, and every story has a number puzzle.", reward: "A paper boat",
      intro: [page("Pip", "Tell me a story", "The ducks at Reed Harbor love number stories. Listen carefully: is the group getting bigger or smaller?")],
      outro: [page("Hoot", "Story solvers", "Every duck story has its answer. The ducks paddle a thank-you parade around the harbor.")],
      rounds: [(r) => Worlds.patch(r, "1", false, "g1.oa.word"), (r) => Worlds.patch(r, "1", true, "g1.oa.word"), (r) => N.wordProblem(r, "g1.oa.word", "compare", 20), (r) => N.wordProblem(r, "g1.oa.word", "partWhole", 20), (r) => N.wordProblem(r, "g1.oa.word", "threeAddends", 20)],
    }),
    engine({
      id: "g1-tens", slot: 4, title: "The Tens & Ones Tower", place: "Otter Mill", emoji: "🦦", domains: ["NBT"], skills: "Tens and ones · comparing numbers",
      standards: "1.NBT.1–3: count to 120, understand tens and ones, compare two-digit numbers with <, > and =.",
      quest: "Stack the otters’ log towers by tens and ones.", reward: "An otter’s log stack",
      intro: [page("Hoot", "Logs by the ten", "The otters bundle their logs in tens. Help them build and compare towers before the river rises.")],
      outro: [page("Pip", "Tens and ones!", "Pip stacks the last log. “Forty-seven is four tens and seven ones!” The otters cheer.")],
      rounds: [(r) => N.buildNumber(r, "g1.nbt.build", 99), (r) => N.nextInSequence(r, "g1.nbt.count120", 1, 120, true), (r) => N.compareSymbols(r, "g1.nbt.compare", 10, 99), (r) => N.digitValue(r, "g1.nbt.value", 2), (r) => N.nextInSequence(r, "g1.nbt.count120", 1, 120, true)],
    }),
    engine({
      id: "g1-market", slot: 5, title: "The Hundred Market", place: "Waterwheel Square", emoji: "🧺", domains: ["NBT"], skills: "Adding to 100 · ten more and ten less",
      standards: "1.NBT.4–6: add within 100, mentally find 10 more or 10 less, subtract multiples of 10.",
      quest: "Help the market stalls count their goods by tens.", reward: "A market basket",
      intro: [page("Pip", "Market morning", "The Hundred Market is busy! Stall keepers need help adding their goods and counting by tens.")],
      outro: [page("Hoot", "Busy and bright", "Every stall is ready. Ten more, ten less: you made the market run smoothly.")],
      rounds: [(r) => Worlds.tensCargo(r, false, "g1.nbt.tenmore", true), (r) => Worlds.tensCargo(r, false, "g1.nbt.add"), (r) => N.addTwoDigit(r, "g1.nbt.add", "plusOnes"), (r) => Worlds.tensCargo(r, true, "g1.nbt.subtens"), (r) => Worlds.tensCargo(r, true, "g1.nbt.tenmore", true)],
    }),
    engine({
      id: "g1-clock", slot: 6, title: "The Clock Tower", place: "Bell Tower", emoji: "🕰️", domains: ["MD"], skills: "Time to the hour and half hour",
      standards: "1.MD.3: tell and write time in hours and half hours on analog and digital clocks.",
      quest: "The bell tower clock is stuck. Set it right so the bells ring on time.", reward: "A tiny bronze bell",
      intro: [page("Hoot", "Bong… bong?", "The Bell Tower clock hands are spinning. The short hand shows the hour; the long hand shows the minutes. Let’s fix it.")],
      outro: [page("Pip", "Right on time", "BONG! The bells ring at exactly the right time. Pip checks the clock: half past, just like you said.")],
      rounds: [(r) => M.clockSet(r, "g1.md.time", 60), (r) => M.clockRead(r, "g1.md.time", 60), (r) => M.clockSet(r, "g1.md.time", 30), (r) => M.clockRead(r, "g1.md.time", 30), (r) => M.clockSet(r, "g1.md.time", 30)],
    }),
    engine({
      id: "g1-ribbons", slot: 7, title: "Ribbon Race & Tally", place: "Meadow Fair", emoji: "🎀", domains: ["MD"], skills: "Ordering lengths · reading data",
      standards: "1.MD.1–2, 1.MD.4: order objects by length, compare lengths indirectly, organize and read data with up to three categories.",
      quest: "Judge the ribbon race and count the fair votes.", reward: "A blue ribbon",
      intro: [page("Pip", "Fair day!", "The Meadow Fair has a ribbon race and a big vote. Help Pip line up the ribbons and read the vote charts.")],
      outro: [page("Hoot", "Every ribbon in place", "The judges hand out ribbons in order, and the vote chart is read just right. What a fair!")],
      rounds: [(r) => M.orderLengths(r, "g1.md.length"), (r) => M.indirectCompare(r, "g1.md.indirect"), (r) => M.readGraph(r, "g1.md.data", "bar", 1, 3), (r) => M.readGraph(r, "g1.md.data", "picture", 1, 3), (r) => M.orderLengths(r, "g1.md.length")],
    }),
    engine({
      id: "g1-quilt", slot: 8, title: "The Shape Quilt", place: "Heron’s Porch", emoji: "🧵", domains: ["G"], skills: "Shape attributes · halves and fourths",
      standards: "1.G.1–3: defining and non-defining attributes, compose shapes, partition circles and rectangles into halves and fourths.",
      quest: "Sew a friendship quilt from shapes cut into equal parts.", reward: "A friendship quilt",
      intro: [page("Hoot", "A quilt for Riverbend", "Old Heron is sewing a quilt with a patch from everyone. Each patch needs the right shape, cut into equal parts.")],
      outro: [page("Pip", "Cozy and colorful", "The quilt is finished! Halves, fourths, triangles and squares. Riverbend wraps up together to watch the stars.")],
      rounds: [(r) => M.triangleSort(r, "g1.g.attributes"), (r) => M.composeShapes(r, "g1.g.compose"), (r) => F.partitionChoice(r, "g1.g.partition", [2, 4]), (r) => Worlds.fractionBridge(r, "1", "g1.g.partition"), (r) => M.attributeShape(r, "g1.g.attributes")],
    }),
  ],
  practice: [
    { id: "g1-trail-subtraction", kind: "trail", trail: "subtraction", band: 2, title: "Starfall Station", emoji: "🚀", description: "Subtract within 20 by sending stars home." },
    { id: "g1-trail-fractions", kind: "trail", trail: "fractions", band: 1, title: "Slice of the Sky", emoji: "🍕", description: "Serve halves and fourths at the cloud café." },
    { id: "g1-trail-measurement", kind: "trail", trail: "measurement", band: 1, title: "Tiny Town Builders", emoji: "📏", description: "Line up a ruler and measure little bridges." },
    { id: "g1-p-tens", kind: "engine", title: "Tens Tunnel", emoji: "🦦", description: "Tens and ones, ten more and adding to 100.", sources: ["g1-tens", "g1-market"] },
    { id: "g1-p-time", kind: "engine", title: "Tick-Tock Trail", emoji: "🕰️", description: "Clocks, lengths and vote charts.", sources: ["g1-clock", "g1-ribbons"] },
    { id: "g1-p-equal", kind: "engine", title: "Balance Beam", emoji: "⚖️", description: "Equal signs, story problems and shapes.", sources: ["g1-scales", "g1-story", "g1-quilt"] },
  ],
  expedition: { id: "g1-p-expedition", title: "Mystery expedition", sources: ["g1-scales", "g1-story", "g1-tens", "g1-market", "g1-clock", "g1-ribbons", "g1-quilt"] },
};

const GRADE2: ClassInfo = {
  id: "2", label: "Grade 2", short: "G2", island: "Whistlewood", emoji: "🚂", tagline: "Place value to 1,000, money, time and graphs.",
  chapters: [
    engine({
      id: "g2-evenodd", slot: 1, title: "Odd & Even Stepping Stones", place: "Stepping Stone Creek", emoji: "🪨", domains: ["OA"], skills: "Odd and even · arrays · facts to 20",
      standards: "2.OA.2–4: fluently add and subtract within 20, odd and even numbers, rectangular arrays as repeated addition.",
      quest: "Cross the creek by stepping only on the right stones.", reward: "A lucky creek stone",
      intro: [page("Pip", "Hop carefully!", "The stepping stones of Whistlewood Creek sort themselves into odd and even. Pip wants to cross without a splash.")],
      outro: [page("Hoot", "Dry feet!", "You crossed the whole creek. Pip counts the stones in pairs: “Even, even, even. No splash!”")],
      rounds: [(r) => N.fact(r, "g2.oa.fluency", 20, ["+", "−"]), (r) => N.oddEvenSort(r, "g2.oa.oddeven", 20), (r) => Scenes.seedRows(r, "2"), (r) => N.arrayEquation(r, "g2.oa.arrays", 5, 5), (r) => N.oddEvenSort(r, "g2.oa.oddeven", 20)],
    }),
    engine({
      id: "g2-castle", slot: 2, title: "The Place Value Castle", place: "Hundred Hall", emoji: "🏯", domains: ["NBT"], skills: "Place value to 1,000 · skip counting",
      standards: "2.NBT.1–4: hundreds, tens and ones; count within 1,000; skip count by 5s, 10s and 100s; compare three-digit numbers.",
      quest: "Rebuild Hundred Hall with flats, sticks and cubes.", reward: "A castle key",
      intro: [page("Hoot", "Hundreds, tens and ones", "Hundred Hall is built from hundred flats, ten sticks and little cubes. The mist mixed them all up. Let’s sort it out.")],
      outro: [page("Pip", "The hall stands tall", "Every wall has the right number of blocks. Pip counts by hundreds to the very top: “One thousand!”")],
      rounds: [(r) => N.buildNumber(r, "g2.nbt.build", 999), (r) => N.nextInSequence(r, "g2.nbt.skip", 5, 100), (r) => N.digitValue(r, "g2.nbt.value", 3), (r) => N.nextInSequence(r, "g2.nbt.skip", 100, 1000), (r) => N.compareSymbols(r, "g2.nbt.compare", 100, 999)],
    }),
    classic({ id: "guardian", slot: 3, title: "The Muddled Guardian", place: "The Old Guardian", emoji: "🌳", domains: ["NBT", "OA"], skills: "Adding two-digit numbers · word riddles", standards: "2.NBT.5, 2.OA.1: add within 100 with regrouping; solve word problems.", quest: "A gentle giant is tangled in number spells. Help him remember who he is." }),
    classic({ id: "skyrail", slot: 4, title: "The Runaway Skyrail", place: "Whistlewood Station", emoji: "🚂", domains: ["OA"], skills: "Two-step adding and subtracting", standards: "2.OA.1: two-step problems with addition and subtraction within 100.", quest: "Deliver the lost parcels. Find out who sent the mist." }),
    engine({
      id: "g2-bridge", slot: 5, title: "The Thousand Bridge", place: "Lantern Gorge", emoji: "🌉", domains: ["NBT", "OA"], skills: "Adding and subtracting within 1,000",
      standards: "2.NBT.5–8, 2.OA.1: add and subtract within 1,000; find 10 or 100 more or less; two-step word problems within 100.",
      quest: "Count the bridge planks so the parcels can cross Lantern Gorge.", reward: "A bridge lantern",
      intro: [page("Nimbus", "“That was my wind…”", "Nimbus peeks over the edge of Lantern Gorge. “When I was lost, my wind blew the bridge planks away. I’m sorry.” Let’s count them back together.")],
      outro: [page("Pip", "Across the gorge", "Plank by plank, the Thousand Bridge is whole again. Nimbus rains a tiny rainbow over it: a thank-you.")],
      rounds: [(r) => Worlds.patch(r, "2", false, "g2.nbt.add1000"), (r) => Worlds.patch(r, "2", true, "g2.nbt.sub1000"), (r) => N.moreOrLess(r, "g2.nbt.hundredmore", 100, 999), (r) => N.wordProblem(r, "g2.oa.word", "twoStep", 100), (r) => N.addTwoDigit(r, "g2.nbt.add100", "regroup")],
    }),
    engine({
      id: "g2-ruler", slot: 6, title: "The Ruler Workshop", place: "Sawdust Shed", emoji: "🪚", domains: ["MD"], skills: "Measuring and estimating length",
      standards: "2.MD.1–6: measure with rulers, estimate lengths, inches, feet, centimeters and meters, compare lengths, number line diagrams.",
      quest: "Measure every board so the workshop can build new train cars.", reward: "A golden ruler",
      intro: [page("Hoot", "Measure twice", "The Sawdust Shed is building new train cars. Every board must be measured just right: start at zero!")],
      outro: [page("Pip", "All aboard!", "The new train cars roll out, straight and strong. Pip taps a ruler: “Count the spaces, not the lines!”")],
      rounds: [(r) => M.rulerMeasure(r, "g2.md.measure", "cm"), (r) => M.rulerMeasure(r, "g2.md.measure", "in"), (r) => M.estimateLength(r, "g2.md.estimate"), (r) => M.lengthDifference(r, "g2.md.compare", "cm"), (r) => M.numberLineJump(r, "g2.md.numberline")],
    }),
    engine({
      id: "g2-market", slot: 7, title: "Market Day", place: "Whistlewood Market", emoji: "🪙", domains: ["MD"], skills: "Money · time to 5 minutes",
      standards: "2.MD.7–8: tell time to the nearest 5 minutes with AM and PM; solve word problems with dollars and cents.",
      quest: "Pay the exact coins and catch the market trains on time.", reward: "A shiny quarter",
      intro: [page("Pip", "Coins and clocks", "It’s Market Day! Every stall wants exact change, and the market train leaves right on time.")],
      outro: [page("Hoot", "A perfect market day", "Every coin counted, every train caught. Nimbus buys a scarf with exactly the right change.")],
      rounds: [(r) => N.moneyCount(r, "g2.md.money"), (r) => N.moneyPay(r, "g2.md.money"), (r) => M.clockSet(r, "g2.md.time", 5), (r) => M.amPm(r, "g2.md.ampm"), (r) => N.moneyWord(r, "g2.md.money")],
    }),
    engine({
      id: "g2-graphs", slot: 8, title: "The Graph Garden", place: "Seedling Rows", emoji: "📊", domains: ["MD", "G"], skills: "Graphs and line plots · equal shares",
      standards: "2.MD.9–10, 2.G.1–3: picture and bar graphs, line plots, shapes with given attributes, rows and columns, halves, thirds and fourths.",
      quest: "Plan the garden with graphs and share the beds equally.", reward: "A seed packet for Nimbus",
      intro: [page("Nimbus", "“Where should it rain?”", "Nimbus wants to water the garden, but just the right beds. Let’s read the garden graphs and share the beds fairly.")],
      outro: [page("Pip", "Blooming rows", "Nimbus sprinkles each bed exactly right. The Graph Garden bursts into flowers in neat rows and columns.")],
      rounds: [(r) => M.readGraph(r, "g2.md.graphs", "picture", 1, 4), (r) => M.readGraph(r, "g2.md.graphs", "bar", 1, 4), (r) => M.linePlotWhole(r, "g2.md.lineplot"), (r) => M.rowsColumnsBuild(r, "g2.g.rowscols"), (r) => Worlds.fractionBridge(r, "2", "g2.g.partition")],
    }),
  ],
  practice: [
    { id: "g2-trail-multiplication", kind: "trail", trail: "multiplication", band: 1, title: "Moonflower Garden", emoji: "🌻", description: "Grow equal rows into arrays." },
    { id: "g2-trail-patterns", kind: "trail", trail: "patterns", band: 2, title: "Pattern Express", emoji: "🚂", description: "Skip-counting trains and rhythm rules." },
    { id: "g2-trail-measurement", kind: "trail", trail: "measurement", band: 2, title: "Tiny Town Builders", emoji: "📏", description: "Rulers, bridges and fences." },
    { id: "g2-p-place", kind: "engine", title: "Hundreds Hike", emoji: "🏯", description: "Place value, skip counting and adding within 1,000.", sources: ["g2-castle", "g2-bridge"] },
    { id: "g2-p-money", kind: "engine", title: "Coin & Clock Corner", emoji: "🪙", description: "Money, time and measuring.", sources: ["g2-market", "g2-ruler"] },
    { id: "g2-p-graphs", kind: "engine", title: "Graph & Share", emoji: "📊", description: "Graphs, equal shares, odd and even.", sources: ["g2-graphs", "g2-evenodd"] },
  ],
  expedition: { id: "g2-p-expedition", title: "Mystery expedition", sources: ["g2-evenodd", "g2-castle", "g2-bridge", "g2-ruler", "g2-market", "g2-graphs"] },
};

const GRADE3: ClassInfo = {
  id: "3", label: "Grade 3", short: "G3", island: "Tinker Hollow", emoji: "🤖", tagline: "Multiplication, fractions, time, area and shapes.",
  chapters: [
    engine({
      id: "g3-facts", slot: 1, title: "The Fact Forge", place: "Anvil Row", emoji: "⚒️", domains: ["OA"], skills: "Multiplication and division facts",
      standards: "3.OA.1–4, 3.OA.7, 3.OA.9: multiply and divide within 100, unknown factors, know products of one-digit numbers, arithmetic patterns.",
      quest: "Forge the gear parts Tinker needs by mastering the facts.", reward: "A forged gear",
      intro: [page("Tinker", "Sparks and gears", "“Welcome to Tinker Hollow! My robots need gears in equal groups. Help me forge them with multiplication.”")],
      outro: [page("Nimbus", "Warm and bright", "The forge glows. Nimbus, the little storm who travels with you, warms up beside it. “Equal groups are like raindrops in rows,” Nimbus giggles.")],
      rounds: [(r) => Scenes.seedRows(r, "3"), (r) => Worlds.sharing(r, "3", "g3.oa.divide"), (r) => N.unknownNumber(r, "g3.oa.unknown", "×", 100), (r) => N.multiplyFact(r, "g3.oa.multiply", 10), (r) => N.patternNext(r, "g3.oa.patterns", 9)],
    }),
    engine({
      id: "g3-twostep", slot: 2, title: "The Two-Step Trail", place: "Switchback Path", emoji: "🥾", domains: ["OA", "NBT"], skills: "Two-step problems · rounding",
      standards: "3.OA.8, 3.NBT.1–3: two-step word problems, round to the nearest 10 or 100, add and subtract within 1,000, multiply by multiples of 10.",
      quest: "Climb the switchback path one careful step at a time.", reward: "A trail map",
      intro: [page("Hoot", "One step, then the next", "The Switchback Path zigzags up the hill. Every puzzle has two steps. Take the first, then the second.")],
      outro: [page("Pip", "We made it up!", "At the top, the whole hollow spreads out below. Pip rounds the view: “About a hundred houses!”")],
      rounds: [(r) => Worlds.gateRun(r, "3", "g3.oa.twostep"), (r) => N.roundOnLine(r, "g3.nbt.round", 10), (r) => N.roundOnLine(r, "g3.nbt.round", 100), (r) => N.threeDigit(r, "g3.nbt.addsub", "−"), (r) => N.multiplyByTens(r, "g3.nbt.tens")],
    }),
    engine({
      id: "g3-fractions", slot: 3, title: "The Fraction Lighthouse", place: "Beacon Point", emoji: "💡", domains: ["NF"], skills: "Unit fractions · number lines · comparing",
      standards: "3.NF.1–3: unit fractions, fractions on a number line, equivalent fractions, compare fractions with the same numerator or denominator.",
      quest: "Relight the lighthouse by fitting its glass pieces together.", reward: "A beacon crystal",
      intro: [page("Nimbus", "“The light went out”", "“I bumped the lighthouse in the dark,” says Nimbus. “Its glass broke into equal pieces.” Fractions will put it back.")],
      outro: [page("Hoot", "Shining over the sea", "Every piece fits. The beam sweeps across the water, and Nimbus finds the way home through the fog.")],
      rounds: [(r) => Scenes.fractionWindow(r, "3"), (r) => F.fractionOnLine(r, "g3.nf.line", [2, 3, 4, 6, 8], 1), (r) => r.next() < 0.5 ? Worlds.fractionBridge(r, "3", "g3.nf.equivalent") : F.equivalentNumerator(r, "g3.nf.equivalent", [2, 3, 4], 3, [2, 3, 4, 6, 8]), (r) => F.compareFractions(r, "g3.nf.compare", "sameDen"), (r) => F.compareFractions(r, "g3.nf.compare", "sameNum")],
    }),
    engine({
      id: "g3-clock", slot: 4, title: "Clockwork Station", place: "Gearspring Depot", emoji: "⏱️", domains: ["MD"], skills: "Time to the minute · elapsed time · mass and volume",
      standards: "3.MD.1–2: time to the nearest minute, elapsed time, measure and solve problems with mass and liquid volume.",
      quest: "Keep the robot trains on schedule and load the right cargo.", reward: "A pocket watch",
      intro: [page("Tinker", "Every minute counts", "“The robot trains leave on the dot! Help me read the clocks, work out how long each trip takes, and load the cargo.”")],
      outro: [page("Pip", "All trains on time", "The last train whistles away exactly on schedule. Tinker winds the pocket watch and hands it to you.")],
      rounds: [(r) => M.clockRead(r, "g3.md.time", 1), (r) => M.clockSet(r, "g3.md.time", 1), (r) => M.elapsedMinutes(r, "g3.md.elapsed"), (r) => M.endTime(r, "g3.md.elapsed"), (r) => M.massVolumeWord(r, "g3.md.massvolume")],
    }),
    classic({ id: "robotworks", slot: 5, title: "The Moonbeam Workshop", place: "Tinker Hollow", emoji: "🤖", domains: ["OA"], skills: "Multiply · divide · plan", standards: "3.OA.3: use multiplication and division within 100 to solve problems with equal groups.", quest: "Build a rescue crew to lift Nimbus above the clouds." }),
    engine({
      id: "g3-quarry", slot: 6, title: "The Quadrilateral Quarry", place: "Crystal Quarry", emoji: "🔷", domains: ["G", "MD"], skills: "Quadrilaterals · equal areas · scaled graphs",
      standards: "3.G.1–2, 3.MD.3, 3.MD.5–6: quadrilateral categories, partition shapes into equal areas, scaled picture and bar graphs, area by tiling.",
      quest: "Sort the quarry crystals and chart what the robots dig up.", reward: "A four-sided crystal",
      intro: [page("Tinker", "Crystals everywhere", "“My robots dug up so many crystals! Some have four sides, some don’t. Can you help sort them and chart our haul?”")],
      outro: [page("Nimbus", "Sparkly!", "Nimbus rains gently on the crystals and they sparkle in neat, sorted rows. The chart shows it all.")],
      rounds: [(r) => M.quadrilateralSort(r, "g3.g.quads"), (r) => M.readGraph(r, "g3.md.graphs", "bar", 2, 4), (r) => M.equalAreaFraction(r, "g3.g.equalarea"), (r) => M.readGraph(r, "g3.md.graphs", "picture", 5, 4), (r) => M.areaTiles(r, "g3.md.area")],
    }),
    classic({ id: "garden", slot: 7, title: "The Garden That Belongs to Everyone", place: "Moonseed Meadow", emoji: "🌻", domains: ["MD"], skills: "Area · perimeter", standards: "3.MD.7–8: area by multiplying side lengths, perimeter of polygons.", quest: "Design a garden where even a little storm can put down roots." }),
    classic({ id: "water", slot: 8, title: "The Last Little Tidepool", place: "Tideglass Cove", emoji: "🐢", domains: ["MD"], skills: "Liquid volume · planning", standards: "3.MD.2: measure and solve problems with liquid volume in liters.", quest: "Measure the water, rescue the tidepools, and help Nimbus discover a new gift." }),
  ],
  practice: [
    { id: "g3-trail-multiplication", kind: "trail", trail: "multiplication", band: 3, title: "Moonflower Garden", emoji: "🌻", description: "Bigger arrays and missing factors." },
    { id: "g3-trail-division", kind: "trail", trail: "division", band: 2, title: "Panda Picnic", emoji: "🐼", description: "Share the feast fairly." },
    { id: "g3-trail-fractions", kind: "trail", trail: "fractions", band: 3, title: "Slice of the Sky", emoji: "🍕", description: "Equivalent slices at the cloud café." },
    { id: "g3-p-round", kind: "engine", title: "Round-Up Ridge", emoji: "🥾", description: "Facts, rounding and two-step problems.", sources: ["g3-twostep", "g3-facts"] },
    { id: "g3-p-time", kind: "engine", title: "Minute Mill", emoji: "⏱️", description: "Clocks, elapsed time, mass and volume.", sources: ["g3-clock"] },
    { id: "g3-p-shapes", kind: "engine", title: "Shape Quarry", emoji: "🔷", description: "Quadrilaterals, graphs, area and fractions.", sources: ["g3-quarry", "g3-fractions"] },
  ],
  expedition: { id: "g3-p-expedition", title: "Mystery expedition", sources: ["g3-facts", "g3-twostep", "g3-fractions", "g3-clock", "g3-quarry"] },
};

const GRADE4: ClassInfo = {
  id: "4", label: "Grade 4", short: "G4", island: "Crystal Canyon", emoji: "💎", tagline: "Big numbers, fractions, decimals and angles.",
  chapters: [
    engine({
      id: "g4-mine", slot: 1, title: "The Million Mine", place: "Glitter Shaft", emoji: "⛏️", domains: ["NBT"], skills: "Place value to a million · rounding",
      standards: "4.NBT.1–3: read, write and compare multi-digit numbers to 1,000,000; round multi-digit numbers to any place.",
      quest: "Count the crystal haul in the deepest mine in the canyon.", reward: "A million-carat gem",
      intro: [page("Hoot", "Deep in the canyon", "The Million Mine sparkles with more gems than anyone can count one by one. Big numbers need place value.")],
      outro: [page("Pip", "A mountain of gems", "Every crate is labeled and rounded for the ledger. Pip reads the total out loud, very slowly, and laughs.")],
      rounds: [(r) => N.digitValue(r, "g4.nbt.value", 6), (r) => N.expandedForm(r, "g4.nbt.expanded", 5), (r) => N.compareSymbols(r, "g4.nbt.compare", 100_000, 999_999), (r) => N.roundBig(r, "g4.nbt.round", 1000), (r) => N.roundBig(r, "g4.nbt.round", 10_000)],
    }),
    engine({
      id: "g4-express", slot: 2, title: "The Algorithm Express", place: "Canyon Rail Yard", emoji: "🚃", domains: ["NBT"], skills: "Standard algorithms · multiplying · dividing",
      standards: "4.NBT.4–6: add and subtract with the standard algorithm, multiply a four-digit number by a one-digit number and two two-digit numbers, divide with remainders.",
      quest: "Load the mine carts and keep the Express rolling.", reward: "A conductor’s whistle",
      intro: [page("Nimbus", "“All aboard!”", "Nimbus has become the Express’s cloud whistle. “Toot! The carts need loading, and the numbers are huge!”")],
      outro: [page("Hoot", "Full steam ahead", "The Algorithm Express thunders out of the rail yard, perfectly loaded. Nimbus whistles the loudest toot ever.")],
      rounds: [(r) => N.bigAddSub(r, "g4.nbt.algorithm", "+", 4), (r) => N.bigAddSub(r, "g4.nbt.algorithm", "−", 4), (r) => N.multiplyMulti(r, "g4.nbt.multiply", 4, 1), (r) => N.multiplyMulti(r, "g4.nbt.multiply", 2, 2), (r) => r.next() < 0.5 ? Worlds.sharing(r, "4", "g4.nbt.divide") : N.divideRemainder(r, "g4.nbt.divide", 3, 1)],
    }),
    engine({
      id: "g4-factors", slot: 3, title: "The Factor Forest", place: "Whisperpine Grove", emoji: "🌲", domains: ["OA"], skills: "Factors, primes and times as many",
      standards: "4.OA.1–5: multiplicative comparison, multi-step word problems, factors and multiples, prime and composite numbers, number patterns.",
      quest: "Find the path through the forest where every tree hides a factor.", reward: "A pinecone compass",
      intro: [page("Pip", "Which way now?", "In the Factor Forest, the right path follows factors and prime numbers. Pip is a little lost. Let’s find the way together.")],
      outro: [page("Hoot", "Out of the woods", "The path opens onto a sunny meadow. Pip holds up a pinecone: “Thirteen scales. Prime!”")],
      rounds: [(r) => r.next() < 0.5 ? Scenes.seedRows(r, "4") : N.factorChoice(r, "g4.oa.factors"), (r) => N.primeSort(r, "g4.oa.primes"), (r) => N.wordProblem(r, "g4.oa.compare", "timesAsMany", 100), (r) => N.wordProblem(r, "g4.oa.multistep", "roundUpGroups", 100), (r) => N.patternNext(r, "g4.oa.patterns", 25)],
    }),
    engine({
      id: "g4-falls", slot: 4, title: "Fraction Falls", place: "Rainbow Spray", emoji: "🌊", domains: ["NF"], skills: "Equivalent, comparing and adding fractions",
      standards: "4.NF.1–4: equivalent fractions, compare unlike denominators, add and subtract like denominators, mixed numbers, multiply a fraction by a whole number.",
      quest: "Split the waterfall into equal streams for the canyon villages.", reward: "A rainbow droplet",
      intro: [page("Nimbus", "Too much water!", "“My rain made the falls too strong,” says Nimbus. “Can we split the water fairly between the villages?”")],
      outro: [page("Pip", "Just the right share", "Every village gets its fair fraction of the falls. A rainbow arches over the whole canyon.")],
      rounds: [(r) => r.next() < 0.5 ? Scenes.fractionWindow(r, "4") : F.equivalentNumerator(r, "g4.nf.equivalent", [2, 3, 4, 5, 6], 5), (r) => F.compareFractions(r, "g4.nf.compare", "unlike"), (r) => Worlds.fractionBridge(r, "4", "g4.nf.add"), (r) => r.next() < 0.5 ? F.mixedNumberChoice(r, "g4.nf.mixed") : F.addMixed(r, "g4.nf.mixed"), (r) => F.fractionTimesWhole(r, "g4.nf.times")],
    }),
    engine({
      id: "g4-docks", slot: 5, title: "The Decimal Docks", place: "Harbor Stilts", emoji: "⚓", domains: ["NF"], skills: "Decimals to hundredths",
      standards: "4.NF.3, 4.NF.5–7: decimal notation for tenths and hundredths, compare decimals, add and subtract fractions with like denominators.",
      quest: "Weigh and label every crate on the stilted docks.", reward: "A brass anchor",
      intro: [page("Tinker", "Tiny numbers, big cargo", "“The dock scales measure in tenths and hundredths,” says Tinker. “Help me read them before the boats sail.”")],
      outro: [page("Hoot", "Ready to sail", "Every crate is labeled to the hundredth. The boats bob away across the canyon lake.")],
      rounds: [(r) => N.decimalOnLine(r, "g4.nf.decimals"), (r) => N.fractionToDecimal(r, "g4.nf.decimals"), (r) => N.compareDecimals(r, "g4.nf.compare", 2), (r) => N.decimalDigitValue(r, "g4.nf.decimals", 2), (r) => Worlds.fractionBridge(r, "4", "g4.nf.add", true)],
    }),
    classic({ id: "cloudbridge", slot: 6, title: "A Bridge Back Home", place: "The Sleeping Sky", emoji: "🌈", domains: ["NF"], skills: "Fractions · equivalence", standards: "4.NF.1–3: equivalent fractions and building a whole from fractional parts.", quest: "Patch the sky bridge. Bring a lost friend home." }),
    engine({
      id: "g4-angles", slot: 7, title: "The Angle Observatory", place: "Starlight Ridge", emoji: "📐", domains: ["MD", "G"], skills: "Angles, lines and symmetry",
      standards: "4.MD.5–7, 4.G.1–3: measure and draw angles with a protractor, add angles, points, lines, rays, parallel and perpendicular lines, classify triangles, symmetry.",
      quest: "Aim the telescopes at just the right angles to find the stars.", reward: "A star map",
      intro: [page("Hoot", "Look up!", "Tonight the stars are hiding. The observatory telescopes must point at exact angles to find them.")],
      outro: [page("Nimbus", "The sky is clear", "Nimbus floats aside, and the stars shine through every telescope. Pip traces a perfectly symmetrical constellation.")],
      rounds: [(r) => M.angleRead(r, "g4.md.angles"), (r) => M.angleBuild(r, "g4.md.angles", 15), (r) => M.lineKind(r, "g4.g.lines"), (r) => M.triangleClassSort(r, "g4.g.triangles"), (r) => M.symmetryChoice(r, "g4.g.symmetry")],
    }),
    engine({
      id: "g4-caravan", slot: 8, title: "The Converter Caravan", place: "Dune Market", emoji: "🐪", domains: ["MD"], skills: "Units · area and perimeter formulas · line plots",
      standards: "4.MD.1–4: convert units, apply area and perimeter formulas, make and use line plots with fractions.",
      quest: "Help the caravan trade fairly with feet, inches, meters and grams.", reward: "A traveler’s scale",
      intro: [page("Pip", "So many units!", "The Converter Caravan trades in feet and inches, liters and milliliters. Pip wants to make every trade fair.")],
      outro: [page("Hoot", "Fair trades", "The caravan sets off into the sunset with every load measured just right. Crystal Canyon glows behind them.")],
      rounds: [(r) => M.convertUnits(r, "g4.md.convert", false), (r) => M.areaFormula(r, "g4.md.area"), (r) => M.missingSide(r, "g4.md.perimeter"), (r) => F.linePlotFractions(r, "g4.md.lineplot", 4), (r) => M.angleJoin(r, "g4.md.angles")],
    }),
  ],
  practice: [
    { id: "g4-trail-division", kind: "trail", trail: "division", band: 3, title: "Panda Picnic", emoji: "🐼", description: "Share the feast, with some left over." },
    { id: "g4-p-place", kind: "engine", title: "Place Value Peaks", emoji: "⛏️", description: "Big numbers and rounding.", sources: ["g4-mine"] },
    { id: "g4-p-algorithms", kind: "engine", title: "Algorithm Alley", emoji: "🚃", description: "Standard algorithms, multiplying and dividing.", sources: ["g4-express"] },
    { id: "g4-p-factors", kind: "engine", title: "Factor Thicket", emoji: "🌲", description: "Factors, primes and comparisons.", sources: ["g4-factors"] },
    { id: "g4-p-fractions", kind: "engine", title: "Fraction & Decimal Falls", emoji: "🌊", description: "Equivalent fractions, adding and decimals.", sources: ["g4-falls", "g4-docks"] },
    { id: "g4-p-angles", kind: "engine", title: "Angle Lookout", emoji: "📐", description: "Angles, lines, units and formulas.", sources: ["g4-angles", "g4-caravan"] },
  ],
  expedition: { id: "g4-p-expedition", title: "Mystery expedition", sources: ["g4-mine", "g4-express", "g4-factors", "g4-falls", "g4-docks", "g4-angles", "g4-caravan"] },
};

const GRADE5: ClassInfo = {
  id: "5", label: "Grade 5", short: "G5", island: "Star Harbor", emoji: "⭐", tagline: "Expressions, decimals, fractions, volume and the coordinate plane.",
  chapters: [
    engine({
      id: "g5-engine", slot: 1, title: "The Expression Engine", place: "Engine Room", emoji: "⚙️", domains: ["OA"], skills: "Order of operations · expressions",
      standards: "5.OA.1–3: grouping symbols and order of operations, write and interpret expressions, patterns with ordered pairs.",
      quest: "Restart the harbor’s great engine by running its expressions in the right order.", reward: "A brass engine key",
      intro: [page("Tinker", "The engine sputters", "“Star Harbor’s great engine runs on expressions,” says Tinker. “Do the steps out of order and it coughs smoke!”")],
      outro: [page("Nimbus", "Humming along", "The engine hums. Lights flicker on across the harbor, and Nimbus puffs happy little clouds from the chimney.")],
      rounds: [(r) => N.evaluateExpression(r, "g5.oa.order", 1), (r) => N.evaluateExpression(r, "g5.oa.order", 3), (r) => N.matchExpression(r, "g5.oa.write"), (r) => N.interpretExpression(r, "g5.oa.interpret"), (r) => N.twoRules(r, "g5.oa.patterns")],
    }),
    engine({
      id: "g5-tower", slot: 2, title: "The Powers of Ten Tower", place: "Signal Tower", emoji: "📡", domains: ["NBT"], skills: "Powers of 10 · decimals to thousandths",
      standards: "5.NBT.1–4: place value and powers of 10, read, write and compare decimals to thousandths, round decimals.",
      quest: "Tune the signal tower by shifting its dials by powers of ten.", reward: "A signal crystal",
      intro: [page("Hoot", "Static on the line", "The Signal Tower talks to ships far away, but its dials slipped. Each dial moves digits by powers of ten.")],
      outro: [page("Pip", "Loud and clear", "The ships answer from over the horizon: every signal received, down to the thousandth.")],
      rounds: [(r) => N.powersOfTen(r, "g5.nbt.powers"), (r) => N.decimalDigitValue(r, "g5.nbt.decimals", 3), (r) => N.compareDecimals(r, "g5.nbt.compare", 3), (r) => N.roundDecimal(r, "g5.nbt.round"), (r) => N.powersOfTen(r, "g5.nbt.powers")],
    }),
    engine({
      id: "g5-cargo", slot: 3, title: "The Cargo Crunch", place: "Dock Seven", emoji: "📦", domains: ["NBT"], skills: "Multi-digit multiplication and division",
      standards: "5.NBT.5–6: multiply multi-digit whole numbers with the standard algorithm, divide four-digit dividends by two-digit divisors.",
      quest: "Pack and unpack the biggest cargo ship ever to dock.", reward: "A captain’s ledger",
      intro: [page("Pip", "So many boxes!", "A giant cargo ship has docked at Dock Seven. Thousands of crates need packing into containers. Let’s crunch the numbers.")],
      outro: [page("Hoot", "Shipshape", "Every crate is packed and every container counted. The ship sounds its horn for you.")],
      rounds: [(r) => N.multiplyMulti(r, "g5.nbt.multiply", 3, 2), (r) => N.divideRemainder(r, "g5.nbt.divide", 3, 2), (r) => N.multiplyMulti(r, "g5.nbt.multiply", 4, 2), (r) => N.divideRemainder(r, "g5.nbt.divide", 4, 2), (r) => N.multiplyMulti(r, "g5.nbt.multiply", 3, 3)],
    }),
    engine({
      id: "g5-diner", slot: 4, title: "The Decimal Diner", place: "Harbor Galley", emoji: "🍽️", domains: ["NBT"], skills: "Operations with decimals",
      standards: "5.NBT.7: add, subtract, multiply and divide decimals to hundredths.",
      quest: "Run the busiest diner in the harbor, down to the last cent.", reward: "A golden spatula",
      intro: [page("Nimbus", "“Order up!”", "Nimbus is the new chef, but the recipes and the bills all use decimals. “Help! Is it 2.5 cups or 25?”")],
      outro: [page("Pip", "Best diner in the harbor", "Every bill adds up and every recipe is just right. The sailors cheer for Chef Nimbus’s famous cloud pancakes.")],
      rounds: [(r) => N.decimalOps(r, "g5.nbt.decimalops", "+"), (r) => N.decimalOps(r, "g5.nbt.decimalops", "−"), (r) => N.decimalOps(r, "g5.nbt.decimalops", "×"), (r) => N.decimalOps(r, "g5.nbt.decimalops", "÷"), (r) => N.roundDecimal(r, "g5.nbt.round")],
    }),
    engine({
      id: "g5-foundry", slot: 5, title: "The Fraction Foundry", place: "Copper Forge", emoji: "🔥", domains: ["NF"], skills: "Adding unlike fractions · fractions as division",
      standards: "5.NF.1–3: add and subtract fractions with unlike denominators, interpret a fraction as division.",
      quest: "Mix metal for the harbor bells in exact fractions.", reward: "A copper bell",
      intro: [page("Tinker", "The perfect mix", "“A harbor bell needs exact parts of copper and tin,” says Tinker. “But my scoops are different sizes!”")],
      outro: [page("Hoot", "A clear ring", "The new bell rings out over Star Harbor, pure and clear. Every fraction was mixed just right.")],
      rounds: [(r) => Worlds.fractionBridge(r, "5", "g5.nf.add"), (r) => Worlds.fractionBridge(r, "5", "g5.nf.sub", true), (r) => F.shareAsFraction(r, "g5.nf.division"), (r) => F.addUnlikeFractions(r, "g5.nf.add", "+"), (r) => F.addUnlikeFractions(r, "g5.nf.sub", "−")],
    }),
    engine({
      id: "g5-scaling", slot: 6, title: "The Scaling Studio", place: "Mapmaker’s Loft", emoji: "🗺️", domains: ["NF"], skills: "Multiplying and dividing fractions",
      standards: "5.NF.4–7: multiply fractions, multiplication as scaling, divide unit fractions by whole numbers and whole numbers by unit fractions.",
      quest: "Scale the harbor maps up and down without losing a single island.", reward: "A mapmaker’s compass",
      intro: [page("Pip", "Maps too big, maps too small", "The Mapmaker’s Loft is full of maps at the wrong size. Scaling with fractions will fix them.")],
      outro: [page("Nimbus", "The whole world fits", "Every map is the right size. Nimbus finds the Lantern Isles on the biggest one: “That’s where we met!”")],
      rounds: [(r) => F.multiplyFractions(r, "g5.nf.multiply", true), (r) => F.multiplyFractions(r, "g5.nf.multiply", false), (r) => F.scalingChoice(r, "g5.nf.scaling"), (r) => F.divideUnitFraction(r, "g5.nf.divide"), (r) => F.divideUnitFraction(r, "g5.nf.divide")],
    }),
    engine({
      id: "g5-cubes", slot: 7, title: "Cube City", place: "Crate Quarter", emoji: "🧊", domains: ["MD"], skills: "Volume · unit conversion",
      standards: "5.MD.1–5: convert units within a measurement system, line plots with fractional data, volume with unit cubes and formulas.",
      quest: "Build new warehouses for the harbor from unit cubes.", reward: "A cube of stardust",
      intro: [page("Tinker", "Room for everything", "“The harbor needs warehouses,” says Tinker. “Volume tells us how many cube crates fit inside.”")],
      outro: [page("Hoot", "A city of cubes", "New warehouses rise in neat stacks. Every cubic unit is counted, and the harbor finally has room for everyone’s things.")],
      rounds: [(r) => M.volumeCount(r, "g5.md.volume"), (r) => M.volumeBuild(r, "g5.md.volume"), (r) => M.volumeFormula(r, "g5.md.volume"), (r) => M.convertUnits(r, "g5.md.convert", true), (r) => F.linePlotFractions(r, "g5.md.lineplot", 5)],
    }),
    engine({
      id: "g5-grid", slot: 8, title: "The Treasure Grid", place: "Compass Isle", emoji: "🧭", domains: ["G"], skills: "The coordinate plane · shape families",
      standards: "5.G.1–4: graph points in the first quadrant, solve problems on the coordinate plane, classify two-dimensional figures in a hierarchy.",
      quest: "Follow the coordinates to the treasure hidden on Compass Isle.", reward: "The star treasure",
      intro: [page("Nimbus", "A secret map", "Nimbus floats in with an old map. “It’s a grid with numbers on the edges! I think the treasure is at a point.”")],
      outro: [page("Pip", "X marks the spot", "At exactly the right point, you dig up a chest of glowing stars. Hoot, Pip and Nimbus share them with the whole harbor.")],
      rounds: [(r) => M.coordinateRead(r, "g5.g.read", 8), (r) => Scenes.coordinateRescue(r), (r) => M.axisDistance(r, "g5.g.distance", 10), (r) => M.hierarchyChoice(r, "g5.g.hierarchy"), (r) => M.parallelogramSort(r, "g5.g.hierarchy")],
    }),
  ],
  practice: [
    { id: "g5-p-expressions", kind: "engine", title: "Expression Workshop", emoji: "⚙️", description: "Order of operations and expressions.", sources: ["g5-engine"] },
    { id: "g5-p-decimals", kind: "engine", title: "Decimal Deck", emoji: "📡", description: "Powers of ten and decimal operations.", sources: ["g5-tower", "g5-diner"] },
    { id: "g5-p-multi", kind: "engine", title: "Cargo Counting", emoji: "📦", description: "Multi-digit multiplication and division.", sources: ["g5-cargo"] },
    { id: "g5-p-fractions", kind: "engine", title: "Fraction Forge", emoji: "🔥", description: "Adding, multiplying and dividing fractions.", sources: ["g5-foundry", "g5-scaling"] },
    { id: "g5-p-volume", kind: "engine", title: "Volume Vault", emoji: "🧊", description: "Volume, conversions and line plots.", sources: ["g5-cubes"] },
    { id: "g5-p-grid", kind: "engine", title: "Grid Lagoon", emoji: "🧭", description: "The coordinate plane and shape families.", sources: ["g5-grid"] },
  ],
  expedition: { id: "g5-p-expedition", title: "Mystery expedition", sources: ["g5-engine", "g5-tower", "g5-cargo", "g5-diner", "g5-foundry", "g5-scaling", "g5-cubes", "g5-grid"] },
};

export const CLASSES: Record<GradeId, ClassInfo> = { K: KINDERGARTEN, 1: GRADE1, 2: GRADE2, 3: GRADE3, 4: GRADE4, 5: GRADE5 };
export const CLASS_LIST: ClassInfo[] = [KINDERGARTEN, GRADE1, GRADE2, GRADE3, GRADE4, GRADE5];

// Practice must use the same grade-audited generators as the story. Old "band 1" trails
// included perimeter, symbolic fractions and subtraction above Kindergarten limits.
const TRAIL_SOURCES: Record<string, string[]> = {
  "k-trail-patterns": ["k-count"], "k-trail-geometry": ["k-shapes", "k-castle"], "k-trail-subtraction": ["k-bunny", "fireflies"],
  "g1-trail-subtraction": ["g1-story", "g1-scales"], "g1-trail-fractions": ["g1-quilt"], "g1-trail-measurement": ["g1-ribbons"],
  "g2-trail-multiplication": ["g2-evenodd"], "g2-trail-patterns": ["g2-castle"], "g2-trail-measurement": ["g2-ruler"],
  "g3-trail-multiplication": ["g3-facts"], "g3-trail-division": ["g3-facts"], "g3-trail-fractions": ["g3-fractions"],
  "g4-trail-division": ["g4-express"],
};
for (const info of CLASS_LIST) {
  info.practice = info.practice.map((p) => p.kind === "trail" ? {
    id: p.id, kind: "engine" as const, title: p.title, emoji: p.emoji,
    description: info.id === "K" ? "Touch, count and build with pictures." : `Practice ${info.label.toLowerCase()} ideas with objects and models.`,
    sources: TRAIL_SOURCES[p.id] || info.expedition.sources,
  } : p);
}
KINDERGARTEN.expedition.sources.push("fireflies");

const ENGINE_CHAPTERS = new Map(CLASS_LIST.flatMap((c) => c.chapters.filter((ch): ch is EngineChapter => ch.kind === "engine").map((ch) => [ch.id, ch] as const)));
export const engineChapter = (id: string): EngineChapter | undefined => ENGINE_CHAPTERS.get(id);

/** The class and chapter a level belongs to, for levels that are chapters. */
export function chapterHome(levelId: string): { grade: GradeId; chapter: Chapter } | null {
  for (const info of CLASS_LIST) {
    const chapter = info.chapters.find((c) => c.id === levelId);
    if (chapter) return { grade: info.id, chapter };
  }
  return null;
}

/** One chapter round, the same every time for the same seed. */
export function chapterTask(chapter: EngineChapter, seed: number, round: number): Task {
  const maker = chapter.rounds[Math.max(0, Math.min(chapter.rounds.length - 1, round))]!;
  return maker(createRng((seed + round * 7919) >>> 0));
}

/** A practice discovery drawn from the listed chapters, at any of their rounds. */
export function practiceTask(sources: string[], seed: number, index: number): Task {
  const rng = createRng((seed + index * 104_729) >>> 0);
  const chapter = engineChapter(rng.pick(sources))!;
  return chapterTask(chapter, rng.int(0, 0xffffff), rng.int(0, ROUNDS - 1));
}

/** Kid-friendly names for skill ids, used by the grown-ups dashboard. */
export const SKILL_NAMES: Record<string, string> = {
  "k.cc.count": "Counting objects", "k.cc.counton": "Counting on", "k.cc.sequence": "Counting forward", "k.cc.tens": "Counting by tens", "k.cc.write": "Writing numbers to 20",
  "k.cc.compare": "Comparing groups", "k.cc.comparenum": "Comparing numbers", "k.nbt.teens": "Teen numbers", "k.oa.add": "Adding within 10", "k.oa.sub": "Taking away within 10",
  "k.oa.decompose": "Breaking numbers apart", "k.oa.fluency": "Facts within 5", "k.oa.word": "Story problems within 10", "k.oa.maketen": "Making ten",
  "k.md.compare": "Comparing length and weight", "k.md.sort": "Sorting into groups", "k.g.name": "Naming shapes", "k.g.position": "Position words", "k.g.flatsolid": "Flat and solid shapes",
  "k.g.solids": "Solid shapes", "k.g.build": "Building shapes",
  "g1.oa.equal": "Meaning of the equal sign", "g1.oa.unknown": "Finding unknown numbers", "g1.oa.properties": "Properties of addition", "g1.oa.word": "Story problems within 20",
  "g1.nbt.build": "Tens and ones", "g1.nbt.count120": "Counting to 120", "g1.nbt.compare": "Comparing with <, > and =", "g1.nbt.value": "Digit values", "g1.nbt.tenmore": "Ten more and ten less",
  "g1.nbt.add": "Adding within 100", "g1.nbt.subtens": "Subtracting tens", "g1.md.time": "Time to the half hour", "g1.md.length": "Ordering lengths", "g1.md.indirect": "Comparing lengths indirectly",
  "g1.md.data": "Reading data", "g1.g.attributes": "Shape attributes", "g1.g.compose": "Putting shapes together", "g1.g.partition": "Halves and fourths",
  "g2.oa.fluency": "Facts within 20", "g2.oa.oddeven": "Odd and even", "g2.oa.arrays": "Arrays", "g2.nbt.build": "Place value to 1,000", "g2.nbt.skip": "Skip counting", "g2.nbt.value": "Digit values to 1,000",
  "g2.nbt.compare": "Comparing three-digit numbers", "g2.nbt.add1000": "Adding within 1,000", "g2.nbt.sub1000": "Subtracting within 1,000", "g2.nbt.hundredmore": "100 more and 100 less", "g2.oa.word": "Two-step story problems",
  "g2.nbt.add100": "Adding with regrouping", "g2.md.measure": "Measuring with rulers", "g2.md.estimate": "Estimating length", "g2.md.compare": "Comparing lengths", "g2.md.numberline": "Number line jumps",
  "g2.md.money": "Money", "g2.md.time": "Time to 5 minutes", "g2.md.ampm": "AM and PM", "g2.md.graphs": "Picture and bar graphs", "g2.md.lineplot": "Line plots", "g2.g.rowscols": "Rows and columns", "g2.g.partition": "Halves, thirds and fourths",
  "g3.oa.multiply": "Multiplication facts", "g3.oa.divide": "Division facts", "g3.oa.unknown": "Unknown factors", "g3.oa.patterns": "Arithmetic patterns", "g3.oa.twostep": "Two-step problems",
  "g3.nbt.round": "Rounding to 10 and 100", "g3.nbt.addsub": "Adding and subtracting within 1,000", "g3.nbt.tens": "Multiplying by tens", "g3.nf.unit": "Unit fractions", "g3.nf.line": "Fractions on a number line",
  "g3.nf.equivalent": "Equivalent fractions", "g3.nf.compare": "Comparing fractions", "g3.md.time": "Time to the minute", "g3.md.elapsed": "Elapsed time", "g3.md.massvolume": "Mass and liquid volume",
  "g3.g.quads": "Quadrilaterals", "g3.md.graphs": "Scaled graphs", "g3.g.equalarea": "Equal areas", "g3.md.area": "Area by tiling",
  "g4.nbt.value": "Place value to a million", "g4.nbt.expanded": "Expanded form", "g4.nbt.compare": "Comparing big numbers", "g4.nbt.round": "Rounding big numbers", "g4.nbt.algorithm": "Standard algorithm",
  "g4.nbt.multiply": "Multi-digit multiplication", "g4.nbt.divide": "Dividing with remainders", "g4.oa.factors": "Factors and multiples", "g4.oa.primes": "Prime and composite", "g4.oa.compare": "Times as many",
  "g4.oa.multistep": "Multi-step problems", "g4.oa.patterns": "Number patterns", "g4.nf.equivalent": "Equivalent fractions", "g4.nf.compare": "Comparing fractions and decimals", "g4.nf.add": "Adding fractions",
  "g4.nf.mixed": "Mixed numbers", "g4.nf.times": "Fraction times a whole number", "g4.nf.decimals": "Decimals to hundredths", "g4.md.angles": "Angles", "g4.g.lines": "Lines and rays", "g4.g.triangles": "Classifying triangles",
  "g4.g.symmetry": "Symmetry", "g4.md.convert": "Converting units", "g4.md.area": "Area formula", "g4.md.perimeter": "Perimeter", "g4.md.lineplot": "Line plots with fractions",
  "g5.oa.order": "Order of operations", "g5.oa.write": "Writing expressions", "g5.oa.interpret": "Interpreting expressions", "g5.oa.patterns": "Patterns and ordered pairs", "g5.nbt.powers": "Powers of ten",
  "g5.nbt.decimals": "Decimals to thousandths", "g5.nbt.compare": "Comparing decimals", "g5.nbt.round": "Rounding decimals", "g5.nbt.multiply": "Multi-digit multiplication", "g5.nbt.divide": "Dividing by two-digit numbers",
  "g5.nbt.decimalops": "Operations with decimals", "g5.nf.add": "Adding unlike fractions", "g5.nf.sub": "Subtracting unlike fractions", "g5.nf.division": "Fractions as division", "g5.nf.multiply": "Multiplying fractions",
  "g5.nf.scaling": "Multiplying as scaling", "g5.nf.divide": "Dividing unit fractions", "g5.md.volume": "Volume", "g5.md.convert": "Converting units", "g5.md.lineplot": "Line plots with fractions",
  "g5.g.read": "Reading coordinates", "g5.g.plot": "Plotting points", "g5.g.distance": "Distance on the grid", "g5.g.hierarchy": "Shape families",
};
