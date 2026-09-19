# MathQuest curriculum map

**2026-09-16 gameplay review:** read [GRADE_GAMEPLAY_REVIEW.md](GRADE_GAMEPLAY_REVIEW.md) for the corrections and verification. Kindergarten's Dark Glade is now stationary **Firefly Homes**, and Bunny Hop Adding is **Bunny Hop Rescue** with move-based addition/subtraction. Class practice, Story Lab, Arena pools and bonus complexity now follow the selected class. Seven original visual chapters remain; 41 use the expanded task engine. Standards mapping describes the intended coverage, not proof of standards mastery from five missions.

How the six classes cover the owner's Kindergarten–Grade 5 syllabus (CC, OA, NBT, NF, MD, G). The source of truth is `src/adventure/classes/catalog.ts`; this page summarizes it.

## Structure shared by every class

- **One island** with **eight story chapters**, played in order. A finished chapter can always be replayed.
- **The same eight bonus games**, unlocked by chapter slot:

  | Slot | Bonus game |
  | --- | --- |
  | 1 | Mist Painter |
  | 2 | Lantern Flight |
  | 3 | Dance Party |
  | 4 | Cloud Courier |
  | 5 | Bumper Bowls |
  | 6 | Constellation Club |
  | 7 | Prism Pop |
  | 8 | Glow Orchestra |

- **Six practice trails** and a **Mystery expedition** that mixes the class's new chapters.
- **Two kinds of chapter:**
  - Existing chapters stay in their original slot, in the grade they fit.
  - New chapters have five questions each, with increasing difficulty. Questions are generated from seeded task families, validated in code, and checked in code. Every chapter round is tested across many seeds, and each question has exactly one right answer.
- **Progress:**
  - Each class keeps its own chapters, stars, learning records and checkpoints.
  - Coins, badges, cosmetics, the camp and keepsakes are shared across classes.
  - A class is picked before the story starts. Grown-ups can change it later under **Adults**.

Existing chapters:

| Class | Slot | Chapter |
| --- | --- | --- |
| Kindergarten | 2 | The Dark Glade |
| Grade 1 | 1 | The Scattered River |
| Grade 2 | 3 | The Muddled Guardian |
| Grade 2 | 4 | The Runaway Skyrail |
| Grade 3 | 5 | The Moonbeam Workshop |
| Grade 3 | 7 | The Garden That Belongs to Everyone |
| Grade 3 | 8 | The Last Little Tidepool |
| Grade 4 | 6 | A Bridge Back Home |

## Kindergarten · Firefly Meadow

| Slot | Chapter | Covers |
| --- | --- | --- |
| 1 | The Counting Meadow | CC: count objects, count on, count to 100 by ones and tens, write numbers to 20 |
| 2 | The Dark Glade *(existing)* | OA: make 10 |
| 3 | Berry Basket Swap | CC: compare groups (one-to-one) and numbers to 10 |
| 4 | Teen Number Towers | NBT: 11–19 as ten ones and some more |
| 5 | Bunny Hop Adding | OA: add and subtract within 10, decompose, fluency within 5, story problems |
| 6 | The Tiny Measurers | MD: longer and shorter, heavier and lighter, sort into categories |
| 7 | The Shape Parade | G: name shapes in any orientation, above, below and beside, flat and solid |
| 8 | The Block Castle | G: name solids, build shapes from sides; OA: make 10 |

Practice: Pattern Express, Shape Observatory, Starfall Station (band 1), Counting Clover, Ten-Stick Stream, Sort & Measure.

## Grade 1 · Riverbend

| Slot | Chapter | Covers |
| --- | --- | --- |
| 1 | The Scattered River *(existing)* | NBT and OA: count on, ten more, cross a ten |
| 2 | The Equal-Sign Scales | OA: meaning of the equal sign, unknown numbers, commutative and associative properties |
| 3 | Story Pond Problems | OA: join, separate, compare, part-whole and three-addend word problems within 20 |
| 4 | The Tens & Ones Tower | NBT: tens and ones, count to 120, compare with <, > and =, digit value |
| 5 | The Hundred Market | NBT: 10 more and 10 less, add within 100, subtract multiples of 10 |
| 6 | The Clock Tower | MD: time to the hour and half hour, on analog clocks (set and read) |
| 7 | Ribbon Race & Tally | MD: order by length, indirect comparison, data with three categories |
| 8 | The Shape Quilt | G: defining attributes, compose shapes, halves and fourths |

Practice: Starfall Station (band 2), Slice of the Sky and Tiny Town Builders (band 1), Tens Tunnel, Tick-Tock Trail, Balance Beam.

## Grade 2 · Whistlewood

| Slot | Chapter | Covers |
| --- | --- | --- |
| 1 | Odd & Even Stepping Stones | OA: fluency within 20, odd and even, arrays as repeated addition |
| 2 | The Place Value Castle | NBT: hundreds, tens and ones; skip counting by 5s and 100s; compare three-digit numbers |
| 3 | The Muddled Guardian *(existing)* | NBT: add within 100 with regrouping, word riddles |
| 4 | The Runaway Skyrail *(existing)* | OA: two-step adding and subtracting |
| 5 | The Thousand Bridge | NBT: add and subtract within 1,000, 100 more and less; OA: two-step word problems |
| 6 | The Ruler Workshop | MD: centimeter and inch rulers, estimate, compare lengths, number line |
| 7 | Market Day | MD: count and pay with coins, dollars and cents, time to 5 minutes, AM and PM |
| 8 | The Graph Garden | MD: picture and bar graphs, line plots; G: rows and columns, halves, thirds and fourths |

Practice: Moonflower Garden (band 1), Pattern Express and Tiny Town Builders (band 2), Hundreds Hike, Coin & Clock Corner, Graph & Share.

## Grade 3 · Tinker Hollow

| Slot | Chapter | Covers |
| --- | --- | --- |
| 1 | The Fact Forge | OA: multiplication and division facts, unknown factors, arithmetic patterns |
| 2 | The Two-Step Trail | OA: two-step problems; NBT: round to 10 and 100, add and subtract within 1,000, multiply by multiples of 10 |
| 3 | The Fraction Lighthouse | NF: unit fractions, number lines, equivalence, compare with the same numerator or denominator |
| 4 | Clockwork Station | MD: time to the minute, elapsed time, mass and liquid volume |
| 5 | The Moonbeam Workshop *(existing)* | OA: multiply and divide with equal groups |
| 6 | The Quadrilateral Quarry | G: quadrilaterals, equal areas; MD: scaled graphs, area by tiling |
| 7 | The Garden That Belongs to Everyone *(existing)* | MD: area and perimeter |
| 8 | The Last Little Tidepool *(existing)* | MD: liquid volume |

Practice: Moonflower Garden (band 3), Panda Picnic (band 2), Slice of the Sky (band 3), Round-Up Ridge, Minute Mill, Shape Quarry.

## Grade 4 · Crystal Canyon

| Slot | Chapter | Covers |
| --- | --- | --- |
| 1 | The Million Mine | NBT: place value to a million, expanded form, compare, round |
| 2 | The Algorithm Express | NBT: standard algorithm, 4-digit × 1-digit, 2-digit × 2-digit, divide with remainders |
| 3 | The Factor Forest | OA: factors and multiples, prime and composite, times as many, multi-step problems, patterns |
| 4 | Fraction Falls | NF: equivalent fractions, compare unlike denominators, add like fractions, mixed numbers, fraction × whole |
| 5 | The Decimal Docks | NF: tenths and hundredths, fractions as decimals, compare decimals |
| 6 | A Bridge Back Home *(existing)* | NF: equivalence and building wholes |
| 7 | The Angle Observatory | MD: read and build angles, add angles; G: points, lines, rays, parallel and perpendicular, classify triangles, symmetry |
| 8 | The Converter Caravan | MD: unit conversion, area and perimeter formulas, line plots with fractions |

Practice: Panda Picnic (band 3), Place Value Peaks, Algorithm Alley, Factor Thicket, Fraction & Decimal Falls, Angle Lookout.

## Grade 5 · Star Harbor

| Slot | Chapter | Covers |
| --- | --- | --- |
| 1 | The Expression Engine | OA: order of operations with grouping symbols, write and interpret expressions, patterns with two rules |
| 2 | The Powers of Ten Tower | NBT: powers of 10, decimals to thousandths, compare and round decimals |
| 3 | The Cargo Crunch | NBT: multi-digit multiplication, 4-digit ÷ 2-digit |
| 4 | The Decimal Diner | NBT: add, subtract, multiply and divide decimals to hundredths |
| 5 | The Fraction Foundry | NF: add and subtract unlike denominators, fractions as division |
| 6 | The Scaling Studio | NF: multiply fractions, scaling, divide unit fractions by whole numbers and the reverse |
| 7 | Cube City | MD: volume with unit cubes and formulas, unit conversion with decimals, line plots with fractions |
| 8 | The Treasure Grid | G: first-quadrant coordinate plane, distance on the grid, hierarchy of shapes |

Practice: Expression Workshop, Decimal Deck, Cargo Counting, Fraction Forge, Volume Vault, Grid Lagoon.

## Known gaps

- Answers are chosen, typed, placed or built. The syllabus items that involve drawing (draw shapes, draw angles, write numerals by hand) are practiced through building, choosing or typing.
- Grade 5 has no existing chapter, so all eight of its chapters use the new engine.
- The new chapter art uses emoji landmarks on the shared island. Final art polish was left for last, as the owner chose.
