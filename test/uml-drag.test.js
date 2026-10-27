import test from "node:test";
import assert from "node:assert/strict";
import { UML_KEYS, UML_TOTAL, corregirUml } from "../lib/uml-drag.js";
import fs from "node:fs";
import vm from "node:vm";

function solucion(numero) { const key=UML_KEYS[numero-1], porClase=new Map(key.clases.map((c,i)=>[c,i])); return {casoId:key.casoId,ubicaciones:Object.entries(key.elementos).filter(([,x])=>!x.distractor).map(([elementoId,x])=>({elementoId,destino:`${porClase.get(x.clase)}:${x.seccion}`}))}; }
test("las siete claves suman 118 elementos válidos",()=>assert.equal(UML_TOTAL,118));
test("los IDs y textos públicos coinciden exactamente con la clave privada",()=>{const source=fs.readFileSync("../../actividades-pm/pm-actividades-hub/2026/pi/poo/modelado-02/quiz-data.js","utf8");const context={window:{}};vm.runInNewContext(source,context);const publicos=context.window.QUIZ_DATA.casos;assert.equal(publicos.length,UML_KEYS.length);publicos.forEach((caso,i)=>{const privado=UML_KEYS[i];assert.equal(caso.id,privado.casoId);assert.equal(caso.diagramas,privado.clases.length);const ids=caso.elementos.map(x=>x.id).sort();assert.equal(ids.join("|"),Object.keys(privado.elementos).sort().join("|"));caso.elementos.forEach(x=>assert.equal(x.texto,privado.elementos[x.id].texto));});});
for(let n=1;n<=7;n++)test(`caso ${n}: solución completa`,()=>{const r=corregirUml(solucion(n),n);assert.equal(r.aciertos,r.total);assert.equal(r.puntaje,r.total);assert.equal(r.incorrectos,0);});
test("diagramas intercambiados conservan el puntaje",()=>{const s=solucion(1);s.ubicaciones.forEach(x=>x.destino=x.destino.replace(/^0:/,"x:").replace(/^1:/,"0:").replace(/^x:/,"1:"));assert.equal(corregirUml(s,1).puntaje,10);});
test("nombre erróneo conserva puntos estructurales y baja coherencia",()=>{const s=solucion(1);const a=s.ubicaciones.find(x=>x.elementoId==="caso-01-e1"),b=s.ubicaciones.find(x=>x.elementoId==="caso-01-e8");[a.elementoId,b.elementoId]=[b.elementoId,a.elementoId];const r=corregirUml(s,1);assert.equal(r.aciertos,8);assert.equal(r.incorrectos,2);assert.equal(r.coherencia.nombresCoherentes,0);});
test("términos repetidos son intercambiables",()=>{const s=solucion(6);const a=s.ubicaciones.find(x=>x.elementoId==="caso-06-e2"),b=s.ubicaciones.find(x=>x.elementoId==="caso-06-e9");[a.elementoId,b.elementoId]=[b.elementoId,a.elementoId];assert.equal(corregirUml(s,6).puntaje,20);});
test("omisiones y distractores se registran y penalizan",()=>{const s=solucion(1);s.ubicaciones=s.ubicaciones.filter(x=>x.elementoId!=="caso-01-e2");s.ubicaciones.push({elementoId:"caso-01-e11",destino:"0:atributos"});const r=corregirUml(s,1);assert.equal(r.omitidos,1);assert.equal(r.distractores,1);assert.equal(r.puntaje,8);});
test("rechaza elementos duplicados y dos nombres",()=>{const s=solucion(1);s.ubicaciones.push({...s.ubicaciones[0]});assert.throws(()=>corregirUml(s,1));});
