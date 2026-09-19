// Maths cards: the rules a child can look up while they practise.
//
// Deliberately static. There is no model behind these — a reference a child checks an answer against has
// to be right every single time, and the honest way to guarantee that is to write them down and test them.
// `reference.test.ts` re-solves every worked example in exact arithmetic and checks each card's domain
// against the standards this grade's own chapters cite, so a card cannot drift away from what the island
// actually teaches.
//
// One card is one idea: what it is, and one worked example. Nothing here introduces anything a child has
// not met in their own class.
import type { GradeId } from "./progress";

export interface Card {
  id: string;
  /** The idea, in the child's words. */
  title: string;
  /** One sentence: the rule itself. */
  rule: string;
  /** A worked example. Every equation in here is re-solved by the test. */
  example: string;
  /** The syllabus domain this belongs to, e.g. "3.NF". Checked against the class's own chapters. */
  standard: string;
  icon: string;
}

const K: Card[] = [
  { id: "k-count", icon: "🐞", standard: "K.CC", title: "Count one at a time", rule: "Touch each thing once and say one number. The last number you say is how many there are.", example: "Touching five apples: one, two, three, four, five. There are 5." },
  { id: "k-teen", icon: "🧱", standard: "K.NBT", title: "Teen numbers are ten and some more", rule: "Every teen number is one full ten with some extra ones beside it.", example: "16 = 10 + 6, so sixteen is one ten and six ones." },
  { id: "k-maketen", icon: "🤝", standard: "K.OA", title: "Partners that make ten", rule: "Two numbers that fill a ten-frame together are called partners.", example: "7 + 3 = 10 and 6 + 4 = 10 and 8 + 2 = 10." },
  { id: "k-compare", icon: "⚖️", standard: "K.CC", title: "More, fewer, the same", rule: "Match them one to one. Whoever has some left over has more.", example: "Five ladybugs and three bees: two ladybugs have nobody to match, so 5 is more than 3." },
  { id: "k-takeaway", icon: "🥕", standard: "K.OA", title: "Taking away", rule: "When some go away, count the ones that stay.", example: "8 carrots, 3 are eaten: 8 - 3 = 5 left." },
  { id: "k-shapes", icon: "🔺", standard: "K.G", title: "A shape keeps its name", rule: "Turning a shape does not change it. Count the sides to be sure.", example: "A triangle has 3 sides, a square has 4, a hexagon has 6 — even tipped on a corner." },
];

const G1: Card[] = [
  { id: "g1-counton", icon: "🐸", standard: "1.OA", title: "Count on from the bigger number", rule: "Start at the bigger number and count up. It is fewer hops.", example: "For 3 + 9, start at 9: ten, eleven, twelve. So 9 + 3 = 12." },
  { id: "g1-maketen", icon: "🔟", standard: "1.OA", title: "Cross a ten by making ten first", rule: "Split the smaller number so one part fills the ten exactly.", example: "8 + 5 = 13, because 8 + 2 = 10 and 10 + 3 = 13." },
  { id: "g1-tensones", icon: "🪵", standard: "1.NBT", title: "Tens and ones", rule: "A two-digit number is some whole tens and some loose ones.", example: "40 + 7 = 47, so 47 is 4 tens and 7 ones." },
  { id: "g1-equals", icon: "⚖️", standard: "1.OA", title: "The equal sign means “the same as”", rule: "Both sides must be worth the same. It does not mean “the answer is”.", example: "3 + 4 = 5 + 2, because both sides are worth 7." },
  { id: "g1-tenmore", icon: "↗️", standard: "1.NBT", title: "Ten more, ten less", rule: "Adding or taking ten changes only the tens digit.", example: "34 + 10 = 44 and 34 - 10 = 24. The 4 ones never move." },
  { id: "g1-halves", icon: "🍪", standard: "1.G", title: "Halves and fourths", rule: "The parts have to be equal, or they do not count as halves or fourths.", example: "A circle cut into 4 equal parts: each one is a fourth. Cut unevenly, none of them is." },
];

const G2: Card[] = [
  { id: "g2-place", icon: "🏛️", standard: "2.NBT", title: "Hundreds, tens and ones", rule: "Each digit tells you how many of its own size you have.", example: "200 + 70 = 270 and 270 + 3 = 273, so 273 is 2 hundreds, 7 tens and 3 ones." },
  { id: "g2-regroup", icon: "📦", standard: "2.NBT", title: "Regroup when the ones fill a ten", rule: "Ten loose ones become one ten and move across.", example: "28 + 15 = 43, because 8 + 5 = 13: write the 3 and carry one ten." },
  { id: "g2-skip", icon: "🦶", standard: "2.NBT", title: "Skip counting", rule: "Counting in equal jumps gets you there faster than counting by ones.", example: "By fives: 5, 10, 15, 20, 25. By hundreds: 100, 200, 300." },
  { id: "g2-evenodd", icon: "👯", standard: "2.OA", title: "Even and odd", rule: "An even number splits into two equal groups. An odd number always has one left over.", example: "14 is even: 7 + 7 = 14. 15 is odd, because one is always left over." },
  { id: "g2-arrays", icon: "🟦", standard: "2.OA", title: "Arrays are equal rows", rule: "Rows that all hold the same amount can be added row by row.", example: "Three rows of four: 4 + 4 + 4 = 12." },
  { id: "g2-money", icon: "🪙", standard: "2.MD", title: "Coins and a dollar", rule: "One hundred cents make one dollar.", example: "Two quarters: 25 + 25 = 50 cents. Four quarters make 100 cents, which is $1." },
  { id: "g2-time", icon: "🕐", standard: "2.MD", title: "Five minutes for every number", rule: "Each number on the clock face is five minutes past the hour.", example: "The long hand on 7: 5 + 5 + 5 + 5 + 5 + 5 + 5 = 35 minutes past." },
];

const G3: Card[] = [
  { id: "g3-multiply", icon: "🟨", standard: "3.OA", title: "Multiplication is equal groups", rule: "4 × 6 means four groups with six in each.", example: "4 × 6 = 24, and 6 + 6 + 6 + 6 = 24 as well." },
  { id: "g3-divide", icon: "🥧", standard: "3.OA", title: "Division shares fairly", rule: "24 ÷ 4 asks how many go into each of four equal groups.", example: "24 ÷ 4 = 6, so each group gets 6." },
  { id: "g3-family", icon: "🔁", standard: "3.OA", title: "Fact families undo each other", rule: "Every multiplication fact gives you two division facts for free.", example: "7 × 8 = 56, so 56 ÷ 8 = 7 and 56 ÷ 7 = 8." },
  { id: "g3-unit", icon: "🍕", standard: "3.NF", title: "A unit fraction is one equal part", rule: "The bottom number says how many equal parts the whole was cut into.", example: "A quarter is one of four equal parts: 4 × 1/4 = 1 whole." },
  { id: "g3-compare", icon: "📏", standard: "3.NF", title: "More pieces means smaller pieces", rule: "With the same number on top, a bigger bottom number makes each piece smaller.", example: "1/3 is bigger than 1/6, because cutting a whole into six makes each piece smaller." },
  { id: "g3-round", icon: "🎯", standard: "3.NBT", title: "Rounding to the nearest ten", rule: "Look at the ones digit: 5 or more rounds up, less than 5 rounds down.", example: "47 rounds to 50. 43 rounds to 40. 45 rounds up to 50." },
  { id: "g3-area", icon: "🧱", standard: "3.MD", title: "Area is the squares inside", rule: "Cover the shape with unit squares and count them, or multiply the two sides.", example: "A rectangle 5 by 3 has area 15, because 5 × 3 = 15." },
  { id: "g3-perimeter", icon: "🚧", standard: "3.MD", title: "Perimeter is the way around", rule: "Add the length of every side, all the way round the outside.", example: "A rectangle 5 by 3 has perimeter 16, because 5 + 3 + 5 + 3 = 16." },
];

const G4: Card[] = [
  { id: "g4-place", icon: "🔢", standard: "4.NBT", title: "Each place is ten times the next", rule: "Moving one place to the left makes a digit worth ten times as much.", example: "70 × 10 = 700, and 700 × 10 = 7000." },
  { id: "g4-round", icon: "🎯", standard: "4.NBT", title: "Round by looking one place right", rule: "Find the place you are rounding to, then look at the digit just after it.", example: "8,472 to the nearest thousand is 8,000, because the hundreds digit 4 is less than 5." },
  { id: "g4-partial", icon: "🧮", standard: "4.NBT", title: "Multiply in parts", rule: "Break a number into its places, multiply each part, then add the parts back.", example: "23 × 4 = 92, because 20 × 4 = 80 and 3 × 4 = 12 and 80 + 12 = 92." },
  { id: "g4-remainder", icon: "🚐", standard: "4.NBT", title: "Remainders are what is left over", rule: "Make as many full groups as you can; whatever will not fill a group is the remainder.", example: "70 shared into groups of 8 gives 8 groups with 6 left, because 8 × 8 = 64 and 64 + 6 = 70." },
  { id: "g4-equiv", icon: "🍰", standard: "4.NF", title: "Equivalent fractions", rule: "Multiply the top and the bottom by the same number and the value does not change.", example: "3/4 = 6/8, because 3 × 2 = 6 and 4 × 2 = 8." },
  { id: "g4-prime", icon: "🔑", standard: "4.OA", title: "Prime and composite", rule: "A prime number has exactly two factors: 1 and itself. Everything else is composite.", example: "12 has factors 1, 2, 3, 4, 6 and 12, so it is composite. 13 has only 1 and 13, so it is prime." },
  { id: "g4-angles", icon: "📐", standard: "4.MD", title: "Angles add up", rule: "Two angles side by side make one bigger angle, and their degrees add.", example: "30 + 60 = 90 degrees, which is a right angle." },
  { id: "g4-decimal", icon: "💠", standard: "4.NF", title: "Decimals are tenths and hundredths", rule: "The first place after the point is tenths, the second is hundredths.", example: "0.7 = 7/10 and 0.25 = 25/100." },
];

const G5: Card[] = [
  { id: "g5-order", icon: "⚙️", standard: "5.OA", title: "Order of operations", rule: "Brackets first, then multiply and divide, then add and subtract.", example: "For 5 × (6 + 8): 6 + 8 = 14 first, then 5 × 14 = 70." },
  { id: "g5-powers", icon: "📡", standard: "5.NBT", title: "Powers of ten move the digits", rule: "Multiplying by 10 moves every digit one place left; dividing moves it right.", example: "6.5 × 100 = 650, and 650 ÷ 100 = 6.5." },
  { id: "g5-decimals", icon: "🍽️", standard: "5.NBT", title: "Multiplying decimals", rule: "Multiply as if they were whole numbers, then count the decimal places and put the point back.", example: "0.3 × 0.4 = 0.12, because 3 × 4 = 12 and there are two decimal places in all." },
  { id: "g5-unlike", icon: "🔥", standard: "5.NF", title: "Adding unlike fractions", rule: "Rename both fractions so the pieces are the same size, then add the tops.", example: "1/2 + 1/3 = 5/6, because 1/2 = 3/6 and 1/3 = 2/6." },
  { id: "g5-division", icon: "➗", standard: "5.NF", title: "A fraction is a division", rule: "The line in a fraction means divide: the top shared between the bottom.", example: "3/4 = 0.75, and 3 ÷ 4 = 0.75 as well." },
  { id: "g5-scaling", icon: "🗺️", standard: "5.NF", title: "Multiplying can make things smaller", rule: "Multiplying by a fraction less than one scales the number down.", example: "8 × 1/2 = 4, which is smaller than 8." },
  { id: "g5-volume", icon: "🧊", standard: "5.MD", title: "Volume fills a box", rule: "Volume is length times width times height, counted in unit cubes.", example: "A box 4 by 3 by 2 holds 24 cubes, because 4 × 3 × 2 = 24." },
  { id: "g5-grid", icon: "🧭", standard: "5.G", title: "Coordinates are across, then up", rule: "The first number counts along the bottom, the second counts up.", example: "(3, 5) means 3 across and 5 up. (5, 3) is somewhere else entirely." },
];

export const REFERENCE_CARDS: Record<GradeId, Card[]> = { K, 1: G1, 2: G2, 3: G3, 4: G4, 5: G5 };

/** The cards for one class. Every class has some; nothing here depends on progress or on a provider. */
export const cardsFor = (grade: GradeId): Card[] => REFERENCE_CARDS[grade] ?? [];
