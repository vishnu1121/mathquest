import { describe, expect, it } from "vitest";
import { arithmeticModel, factorRows, placeColumns } from "./mathModels";

describe("math models",()=>{
  it("models operands without manufacturing an answer for the learner",()=>{
    expect(arithmeticModel("7,856 + 6,440 = ?")).toEqual({type:"arithmetic",a:"7856",b:"6440",op:"+"});
    expect(arithmeticModel("2.46 ÷ 0.6 = ?")).toMatchObject({a:"2.46",b:"0.6",op:"÷"});
    expect(arithmeticModel("5 + 3 = 8")).toBeNull();
    expect(arithmeticModel("2 + 3 × 4 = ?")).toBeNull();
    const columns=placeColumns("7856","6440");
    expect(columns.map(c=>c.label)).toEqual(["Thousands","Hundreds","Tens","Ones"]);
    expect(columns.reduce((n,c)=>n+Number(c.a)*c.unit,0)).toBe(7856);
    expect(columns.reduce((n,c)=>n+Number(c.b)*c.unit,0)).toBe(6440);
    const addition=placeColumns("7856","6440",true);
    expect(addition[0]).toMatchObject({label:"Ten thousands",a:"",b:""});
    expect(addition.reduce((n,c)=>n+Number(c.a)*c.unit,0)).toBe(7856);
  });
  it("aligns unequal decimal lengths and preserves empty leading places",()=>{
    const c=placeColumns("3.25","12.4");
    expect(c.map(c=>c.a)).toEqual(["","3","2","5"]);
    expect(c.map(c=>c.b)).toEqual(["1","2","4","0"]);
    expect(c.map(c=>c.exponent)).toEqual([1,0,-1,-2]);
    expect(c.reduce((n,c)=>n+Number(c.a)*c.unit,0)).toBeCloseTo(3.25);
  });
  it("conserves the seeds when the student tries a factor, including leftover seeds",()=>{
    for(let total=1;total<=100;total++) for(let size=1;size<=25;size++) {
      const m=factorRows(total,size)!;
      expect(m.rows*m.size+m.remainder).toBe(total);
      expect(m.remainder===0).toBe(total%size===0);
    }
    expect(factorRows(16,8)).toEqual({rows:2,remainder:0,size:8});
    expect(factorRows(16,7)).toEqual({rows:2,remainder:2,size:7});
    expect(factorRows(16,0)).toBeNull();expect(factorRows(16,2.5)).toBeNull();
  });
});
