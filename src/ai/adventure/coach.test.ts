import { describe, expect, it } from "vitest";
import { acceptCoach, coachRequest, trustedCoachContext, type CoachRequest } from "./coach";
const request: CoachRequest = {task:"coach",grade:"K",activity:"Firefly Homes",goal:"Fill the homes",board:"An empty home",response:"",moves:[],step:1,previous:[],protect:["square"],ref:{chapter:"fireflies",seed:42,round:0}};
describe("live game coach",()=>{
  it("grounds chapter requests in the server's actual problem and rejects cross-grade references",()=>{
    expect(trustedCoachContext(request)?.goal).toBe("Help the fireflies fill all 5 homes.");
    expect(trustedCoachContext({...request,grade:"5"})).toBeNull();
    expect(trustedCoachContext({...request,ref:{chapter:"missing",seed:1,round:0}})).toBeNull();
  });
  it("accepts a short actionable question but rejects answers, repeats and unsafe output",()=>{
    const reply={notice:"Some homes are still dark.",hint:"Can you touch an empty home?"};
    expect(acceptCoach(reply,request)).toEqual(reply);
    for(const hint of ["Can you add 3?","Can you add three?","Can you choose the square?","The answer is ready?","Can you visit https://example.com?","Can you touch an empty home? Then count?"]) expect(acceptCoach({...reply,hint},request)).toBeNull();
    expect(acceptCoach(reply,{...request,step:2,previous:[reply.hint]})).toBeNull();
    expect(acceptCoach({...reply,hint:"Could you carefully examine all the available homes and then decide what to do next?"},request)).toBeNull();
  });
  it("lets the last of three hints work an example, but never on the child's own numbers",()=>{
    const third: CoachRequest = {...request,grade:"4",activity:"The Algorithm Express",goal:"Add with the standard algorithm: 7,774 + 8,180",board:"columns: thousands 7 and 8, hundreds 7 and 1, tens 7 and 8, ones 4 and 0",response:"",step:3,previous:["Which column do you add first?","What happens when a column makes more than nine?"],protect:["15954"],ref:null};
    const example={notice:"The columns are lined up and ready.",hint:"With 26 + 35, the ones make eleven, so one ten moves across. Can you try that in your ones column?"};
    expect(acceptCoach(example,third)).toEqual(example);
    // Their own numbers, their answer, and a second question all stay out.
    for(const hint of [
      "With 7,774 + 35 the ones make four. Can you try that?",
      "Try 12 + 8 first. Does that make 15954, like yours?",
      "With 26 + 35 the ones make eleven. Can you try it? Ready?",
    ]) expect(acceptCoach({...example,hint},third)).toBeNull();
    // Earlier steps still allow no quantities at all.
    expect(acceptCoach(example,{...third,step:2})).toBeNull();
    // Kindergarten and Grade 1 problems are too small for a different example, so their last step shows the
    // method on the objects instead, still without numbers.
    const shown={notice:"Some homes are still dark.",hint:"Touch each dark home as you go along the row. Can you try that here?"};
    expect(acceptCoach(shown,{...request,step:3})).toEqual(shown);
    expect(acceptCoach({...shown,hint:"With 2 homes and 1 more, you light 3. Can you try that?"},{...request,step:3})).toBeNull();
    expect(acceptCoach({...shown,hint:"With 2 homes and 1 more, you light up a row. Can you try that?"},{...third,grade:"1",step:3})).toBeNull();
  });
  it("bounds screen data and step history",()=>{
    expect(coachRequest.safeParse({...request,board:"x".repeat(2401)}).success).toBe(false);
    expect(coachRequest.safeParse({...request,step:4}).success).toBe(false);
    expect(coachRequest.safeParse({...request,previous:Array(3).fill("hint")}).success).toBe(false);
  });
});
