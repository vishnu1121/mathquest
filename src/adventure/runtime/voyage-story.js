import { restoreVoyage } from "../voyage";

(function () {
  const S = window.MQS;
  const savePromise = (promise) => S.update((s) => { const v = restoreVoyage(s.voyage); v.promise = promise; s.voyage = v; });
  function play(pages, label = "Let’s go!", { optional = true, kicker = "" } = {}) {
    return new Promise((resolve) => {
      const before = document.activeElement;
      const dialog = document.createElement("dialog");
      dialog.className = "voyage-dialog voyage-story";
      dialog.setAttribute("aria-labelledby", "voyageStoryTitle");
      document.body.appendChild(dialog);
      let index = 0, settled = false;
      const close = (proceed) => { if (settled) return; settled = true; dialog.close(); dialog.remove(); if (before?.isConnected) before.focus(); resolve(proceed); };
      function draw() {
        const p = pages[index];
        dialog.innerHTML = `<div class="vs-scene" data-scene="${p.art || "cloudbridge"}">${window.MQVoyageArt.island(S.get().chapters)}<div class="vs-friends"><span>${S.hero()}</span>${p.speaker === "Nimbus" ? window.MQVoyageArt.nimbus : `<span>${p.speaker === "Pip" ? "🧚" : p.speaker === "Tinker" ? "🦝" : "🦉"}</span>`}</div><span class="vs-chapter">${kicker || (["garden", "water"].includes(p.art) ? "A PLACE TO GROW" : "SKYBOUND · THE LITTLE STORM")}</span></div><div class="vs-copy"><p class="voyage-kicker">${p.speaker}</p><h2 id="voyageStoryTitle">${p.title}</h2><p>${p.text}</p>${p.choice ? '<div class="vs-choices"><button type="button" data-choice="listen">“I’ll listen to your story.”</button><button type="button" data-choice="together">“We’ll find a way together.”</button></div>' : ""}<div class="vs-footer"><span>${index + 1} / ${pages.length}</span>${optional ? '<button type="button" data-story="skip">Skip story</button>' : ""}<button type="button" class="btn" data-story="next" ${p.choice ? "hidden" : ""}>${index === pages.length - 1 ? label : "Next →"}</button></div></div>`;
        const advance = () => { if (index + 1 === pages.length) close(true); else { index++; draw(); } };
        dialog.querySelector('[data-story="next"]').onclick = advance;
        dialog.querySelector('[data-story="skip"]')?.addEventListener("click", () => close(true));
        dialog.querySelectorAll("[data-choice]").forEach((b) => b.onclick = () => { savePromise(b.dataset.choice); advance(); });
        dialog.querySelector(p.choice ? "[data-choice]" : '[data-story="next"]').focus();
      }
      dialog.addEventListener("cancel", (event) => { event.preventDefault(); close(false); });
      dialog.showModal(); draw();
    });
  }
  const intros = {
    skyrail: () => [
      { speaker: "Pip", art: "skyrail", title: "A letter from the mist", text: "The lantern is glowing… but someone is crying inside a cloud. A tiny parcel drops at your feet. On it: ‘Please don’t be scared of me.’" },
      { speaker: "Nimbus", art: "skyrail", title: "“I didn’t mean to muddle it.”", text: "“I’m Nimbus. I was looking for home. Every time I tried to call for help, more mist came out.” A little cloud holds out an empty compass case.", choice: !restoreVoyage(S.get().voyage).promise },
      { speaker: "Hoot", art: "skyrail", title: "All aboard the number rail!", text: "Nimbus’s compass is on the last train. Set the number switches, then send each parcel to its matching platform. We’ll follow the tracks together." },
    ],
    robotworks: () => [
      { speaker: "Nimbus", art: "robotworks", title: "The compass points up", text: restoreVoyage(S.get().voyage).promise === "listen" ? "“You listened when everyone else ran away. Can I tell you one more thing? My family lives above the clouds… and I’ve forgotten how to float.”" : "“You said we’d find a way together. I kept thinking about that. My family lives above the clouds… but I’ve forgotten how to float.”" },
      { speaker: "Tinker", art: "robotworks", title: "A small but mighty crew", text: "“My robots can carry us! Every robot needs the same recipe. Load enough batteries and gears for the whole crew. Then press Build and watch them wake up.”" },
    ],
    cloudbridge: () => [
      { speaker: "Pip", title: "So close to home", text: "The robots lift you above the valley. There it is: Nimbus’s cloud village! But pieces of the rainbow bridge have drifted away." },
      { speaker: "Nimbus", title: "“What if I break it again?”", text: "Pip takes Nimbus’s little cloudy hand. “I get things wrong too. We can fix them together.” Lay fraction planks across each gap. Leave room for every friend." },
    ],
    garden: () => [
      { speaker: "Nimbus", art: "garden", title: "Can a cloud put down roots?", text: "Nimbus visits your camp every afternoon. Today, everyone is planting something. Pip has a sunflower. Hoot has a fern. Nimbus looks at those little cloudy feet. “What can I grow?”" },
      { speaker: "Pip", art: "garden", title: "A garden with room for you", text: "“You don’t have to be like us to belong,” says Pip. “Let’s make a garden together.” Design the flower patches, then fence the seedlings. There is more than one way to make a lovely home." },
    ],
    water: () => [
      { speaker: "Hoot", art: "water", title: "A small voice from the shore", text: "The new garden is blooming when a tiny shell rolls into camp. “The tide has gone out. Our pools are getting dry.” Nimbus offers a big raincloud, but the shell squeaks: “Just a little water, please!”" },
      { speaker: "Nimbus", art: "water", title: "Just enough can be wonderful", text: "“Before, I made too much mist. What if I make too much rain?” You bring two measuring jars. Fill, pour, and compare their water. Together, you can give every tidepool just what it needs." },
    ],
  };
  const endings = {
    skyrail: [
      { speaker: "Nimbus", art: "skyrail", title: "A compass, and a promise", text: "“You found it!” Nimbus’s compass wiggles toward the sky. A little patch of mist turns into sparkling rain. Pip opens the depot: “There are more parcels for our friends. Want to join the secret delivery club?”" },
    ],
    robotworks: [
      { speaker: "Tinker", art: "robotworks", title: "Beep. Boop. Best friends.", text: "The rescue crew marches out. One robot offers Nimbus a tiny umbrella. Another rolls a shiny gear toward Pip. “A quick game of Bumper Bowls before takeoff?”" },
    ],
    cloudbridge: [
      { speaker: "Nimbus", title: "There you are!", text: "A great soft cloud swoops down. “We were looking everywhere!” Nimbus runs into the biggest, fluffiest hug you have ever seen." },
      { speaker: "Nimbus", title: "A place for everyone", text: "“I thought being a storm meant I couldn’t be anyone’s friend.” Nimbus puts a rainbow above your camp. “Now I know where my other home is.”" },
      { speaker: "Pip", title: "The sky is having a party", text: "You brought a family together. The robots hang lanterns. Hoot brings berry cake. Nimbus scatters matching stars for one last friendly game. Tomorrow, we can explore again." },
    ],
    garden: [
      { speaker: "Nimbus", art: "garden", title: "The best kind of roots", text: "Nimbus waters the seedlings with the tiniest drizzle. Flowers open all over your design. “Maybe my roots are the friends I come back to.” A drop of rain becomes a prism. Then another. Pip laughs: “Let’s make them sparkle!”" },
    ],
    water: [
      { speaker: "Nimbus", art: "water", title: "“I helped. I really helped!”", text: "The turtles paddle. The crabs dance. The shell sings a very wobbly thank-you song. Nimbus’s scarf flutters with pride. A little storm didn’t need to stop being a storm. It just needed a friend and a way to help." },
      { speaker: "Pip", art: "water", title: "Every friend has a sound", text: "“That song needs a turtle drum,” says Pip. “And shell chimes. And cloud drops!” Arrange the beats for your new friends. This time, the celebration sounds exactly like you." },
    ],
  };
  window.MQVoyageStory = {
    play,
    intro: (id) => play(intros[id](), "Start the mission →"),
    async outro(id) { await play(endings[id], "Play the bonus game →"); await window.MQMini.playForChapter(id); },
  };
})();
