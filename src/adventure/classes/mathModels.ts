/** Operand-only visual models. These never compute or reveal the requested answer. */
export interface ArithmeticModel { type: "arithmetic"; a: string; b: string; op: "+" | "−" | "×" | "÷" }
export function arithmeticModel(text: string): ArithmeticModel | null {
  const m = /^([\d,]+(?:\.\d+)?)\s*([+−×÷])\s*([\d,]+(?:\.\d+)?)\s*=\s*\?$/.exec(text.trim());
  return m ? { type:"arithmetic", a:m[1]!.replace(/,/g,""), b:m[3]!.replace(/,/g,""), op:m[2] as ArithmeticModel["op"] } : null;
}
export function placeColumns(a: string, b: string, reserveCarry = false) {
  const whole = Math.max(a.split(".")[0]!.length,b.split(".")[0]!.length) + Number(reserveCarry);
  const decimals = Math.max(a.split(".")[1]?.length || 0,b.split(".")[1]?.length || 0);
  return Array.from({length:whole+decimals},(_,i)=>{
    const exponent=whole-i-1, unit=10**exponent;
    const digit=(text:string)=>{const [w,f=""]=text.split(".");return exponent>=0?(w![w!.length-exponent-1] || ""): (f[-exponent-1] || "0");};
    const labels:Record<number,string>={6:"Millions",5:"Hundred thousands",4:"Ten thousands",3:"Thousands",2:"Hundreds",1:"Tens",0:"Ones",[-1]:"Tenths",[-2]:"Hundredths",[-3]:"Thousandths"};
    return {exponent,unit,label:labels[exponent]||String(unit),a:digit(a),b:digit(b)};
  });
}
export function factorRows(total:number,size:number) {
  if(!Number.isInteger(total)||!Number.isInteger(size)||total<1||total>100||size<1||size>100)return null;
  return {rows:Math.floor(total/size),remainder:total%size,size};
}
