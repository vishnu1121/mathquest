// Loads the adventure runtime in dependency order. Each module attaches one namespace to window
// (MQS store and events, MQAI, MQBadges, MQStory, MQTeach, MQShop, MQ core, MQMap, MQUX, MQMini, MQHero)
// and levels register themselves with MQ. AdventureRoot calls MQ.start() once the page shell is in the DOM.
import "./store.js";
import "./learning.js";
import "./core-ai.js";
import "./achievements.js";
import "./story.js";
import "./teach.js";
import "./shop.js";
import "./companion.js";
import "./core.js";
import "./map.js";
import "./art.js";
import "./ux.js";
import "./arcade.js";
import "./minigames.js";
import "./mini-mist.js";
import "./mini-flight.js";
import "./mini-dance.js";
import "./modern.js";
import "./frog.js";
import "./fireflies.js";
import "./guardian-extras.js";
import "./guardian.js";
import "./pathway.js";
import "./voyage-art.js";
import "./voyage-story.js";
import "./voyage-games.js";
import "./voyage-minis.js";
import "./frontier-games.js";
import "./frontier-minis.js";
import "./voyage-world.js";
import "./tactile.js";
// Before every level that offers it: class-games, voyage-games, pathway and arena all use MQExplain.
import "./explain-ui.js";
import "./mini-chute.js";
import "./adult-dashboard.js";
import "./arena.js";
import "./class-visuals.js";
import "./math-workbench.js";
import "./class-play.js";
// Fresh AI questions, before the levels that draw them.
import "./question-source.js";
import "./class-games.js";
import "./classes.js";
// After classes.js: Apex reads the current class, and after class-games.js: it mounts through MQClassGames.
import "./apex.js";
// The Practice view's maths cards: static reference, no provider, after classes.js for the current grade.
import "./reference-cards.js";
import "./grade-bonuses.js";
import "./roaming-hoot.js";
import "./accessibility.js";
