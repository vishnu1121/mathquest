// Local learner evidence and chapter-aware access to the shared tutor engine.
import { restoreAdventureModel, observeAdventure, adventurePlan, describeLearning } from "../learning";
(function () {
  const S = window.MQS;
  const model = () => restoreAdventureModel(S.get().learning);
  window.MQLearning = {
    observe(evidence) {
      S.update((s) => { s.learning = observeAdventure(model(), evidence, Date.now()); });
    },
    plan(skill) {
      const next = adventurePlan(model(), skill);
      S.update((s) => { s.learning = next.model; });
      return next;
    },
    summary: () => describeLearning(model()),
  };
})();
