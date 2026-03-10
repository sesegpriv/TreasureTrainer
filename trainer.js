let bastions=[]
let filtered=[]

let current=null

let guessL=new Set()
let guessR=new Set()

let correct=0
let total=0
let streak=0

let sessionSize=10
let sessionIndex=0
let sessionMode="count"
let timedModeSeconds=60

let revealActive=false
let revealedThisRound=false
let answerChecked=false

let debugVisible=false
let sessionCompleteTimeout=null
let timerInterval=null
let timedModeDeadline=0
let currentDisplay=null

const caseBox=document.getElementById("case")
const setup=document.getElementById("setup")
const card=document.getElementById("card")
const chunkmapWrap=document.getElementById("chunkmapWrap")
const chunkmapXAxis=document.getElementById("chunkmapXAxis")
const chunkmapZAxis=document.getElementById("chunkmapZAxis")
const chunkmap=document.getElementById("chunkmap")
const chunkmapMeta=document.getElementById("chunkmapMeta")

const answer=document.getElementById("answer")
const stats=document.getElementById("stats")
const debug=document.getElementById("debug")

const startButtons=[...document.querySelectorAll(".start-btn")]
const checkBtn=document.getElementById("checkBtn")
const nextBtn=document.getElementById("nextBtn")
const revealBtn=document.getElementById("revealBtn")
const endBtn=document.getElementById("endBtn")

const filterWarning=document.getElementById("filterWarning")

const LL=document.getElementById("LL")
const LM=document.getElementById("LM")
const LR=document.getElementById("LR")
const LANY=document.getElementById("LANY")
const LWITHOUT=document.getElementById("LWITHOUT")

const RL=document.getElementById("RL")
const RM=document.getElementById("RM")
const RR=document.getElementById("RR")
const RANY=document.getElementById("RANY")
const RWITHOUT=document.getElementById("RWITHOUT")

const north=document.getElementById("north")
const south=document.getElementById("south")
const east=document.getElementById("east")
const west=document.getElementById("west")

const all=document.getElementById("all")
const ranked=document.getElementById("ranked")
const scoreBoth=document.getElementById("scoreBoth")
const scoreLeft=document.getElementById("scoreLeft")
const scoreRight=document.getElementById("scoreRight")

function isRampartScored(side){

if(scoreLeft.checked) return side==="L"
if(scoreRight.checked) return side==="R"

return true

}

function rampartMatches(side){

let guess=side==="L"?guessL:guessR
let actual=side==="L"?current.l:current.r

return [...guess].sort().join()==[...actual].sort().join()

}

function getDirectionText(dir){

switch(dir){

case "NORTH": return 'NORTH (<span class="axisZ">-Z</span>)'
case "SOUTH": return 'SOUTH (<span class="axisZ">+Z</span>)'
case "WEST": return 'WEST (<span class="axisX">-X</span>)'
case "EAST": return 'EAST (<span class="axisX">+X</span>)'

}

}

function playerCoords(x,z,f){

switch(f){

case "EAST": return {x:x,z:z+1}
case "SOUTH": return {x:x-2,z:z}
case "WEST": return {x:x-1,z:z-2}
case "NORTH": return {x:x+1,z:z-1}

}

}

function getRampartSection(block){

let n=parseInt(block.slice(1),10)

if(n<=2) return "left"
if(n<=5) return "middle"

return "right"

}

function getChunkRange(){

if(ranked.checked){
return {min:-14,max:14}
}

return {min:-27,max:22}

}

function randomInt(min,max){

return Math.floor(Math.random()*(max-min+1))+min

}

function hashChunk(x,z){

let n=(x*374761393+z*668265263)>>>0
n=(n^(n>>13))>>>0
n=Math.imul(n,1274126177)>>>0
n=(n^(n>>16))>>>0

return n/4294967295

}

function getChunkBiomeClass(x,z){

let coarse=hashChunk(Math.floor(x/2),Math.floor(z/2))
let medium=hashChunk(x,z)
let detail=hashChunk(x*3+11,z*3-7)
let noise=coarse*0.55+medium*0.3+detail*0.15

if(noise<0.12) return "biome-lava"
if(noise<0.2) return "biome-basalt"
if(noise<0.5) return "biome-netherrack"
if(noise<0.7) return "biome-wastes"
if(noise<0.82) return "biome-soul"
if(noise<0.92) return "biome-crimson"

return "biome-warped"

}

function getChunkmapFootprint(pos,facing){

switch(facing){

case "NORTH":
return new Set([
(pos.x)+":"+(pos.z-1),
(pos.x-1)+":"+(pos.z-1),
(pos.x)+":"+(pos.z+1)
])

case "SOUTH":
return new Set([
(pos.x)+":"+(pos.z+1),
(pos.x+1)+":"+(pos.z+1),
(pos.x)+":"+(pos.z-1)
])

case "EAST":
return new Set([
(pos.x+1)+":"+(pos.z),
(pos.x+1)+":"+(pos.z-1),
(pos.x-1)+":"+(pos.z)
])

case "WEST":
return new Set([
(pos.x-1)+":"+(pos.z),
(pos.x-1)+":"+(pos.z+1),
(pos.x+1)+":"+(pos.z)
])

default:
return new Set()

}

}

function addPathChunks(footprint,pos,originX,originZ){

let x=pos.x
let z=pos.z

while(x!==originX){
x+=originX>x?1:-1
footprint.add(x+":"+z)
}

while(z!==originZ){
z+=originZ>z?1:-1
footprint.add(x+":"+z)
}

}

function fillFootprintRectangle(footprint){

if(footprint.size===0){
return
}

let points=[...footprint].map(key=>{
let parts=key.split(":").map(Number)
return {x:parts[0],z:parts[1]}
})

let minX=Math.min(...points.map(point=>point.x))
let maxX=Math.max(...points.map(point=>point.x))
let minZ=Math.min(...points.map(point=>point.z))
let maxZ=Math.max(...points.map(point=>point.z))

for(let z=minZ;z<=maxZ;z++){
for(let x=minX;x<=maxX;x++){
footprint.add(x+":"+z)
}
}

}

function getFootprintBounds(footprint){

let points=[...footprint].map(key=>{
let parts=key.split(":").map(Number)
return {x:parts[0],z:parts[1]}
})

return {
minX:Math.min(...points.map(point=>point.x)),
maxX:Math.max(...points.map(point=>point.x)),
minZ:Math.min(...points.map(point=>point.z)),
maxZ:Math.max(...points.map(point=>point.z))
}

}

function buildFilledFootprint(pos,originX,originZ,facing){

let footprint=getChunkmapFootprint(pos,facing)
addPathChunks(footprint,pos,originX,originZ)
fillFootprintRectangle(footprint)

return footprint

}

function buildDisplayCase(bastion){

let pos=playerCoords(bastion.x,bastion.z,bastion.f)

if(sessionMode!=="chunkmap"){
return {
originX:bastion.x,
originZ:bastion.z,
pos:pos
}
}

let range=getChunkRange()

let shiftXMin=range.min-Math.min(bastion.x,pos.x)
let shiftXMax=range.max-Math.max(bastion.x,pos.x)
let shiftZMin=range.min-Math.min(bastion.z,pos.z)
let shiftZMax=range.max-Math.max(bastion.z,pos.z)

let shiftX=randomInt(shiftXMin,shiftXMax)
let shiftZ=randomInt(shiftZMin,shiftZMax)

let originX=bastion.x+shiftX
let originZ=bastion.z+shiftZ
let playerX=pos.x+shiftX
let playerZ=pos.z+shiftZ

let windowSize=9
let maxOffset=windowSize-1
let footprint=buildFilledFootprint({x:playerX,z:playerZ},originX,originZ,bastion.f)
let bounds=getFootprintBounds(footprint)

let minViewportX=Math.max(range.min,bounds.maxX-maxOffset)
let maxViewportX=Math.min(bounds.minX,range.max-windowSize+1)
let minViewportZ=Math.max(range.min,bounds.maxZ-maxOffset)
let maxViewportZ=Math.min(bounds.minZ,range.max-windowSize+1)

let viewportMinX=randomInt(minViewportX,maxViewportX)
let viewportMinZ=randomInt(minViewportZ,maxViewportZ)

return {
originX:originX,
originZ:originZ,
pos:{
x:playerX,
z:playerZ
},
footprint:footprint,
view:{
minX:viewportMinX,
maxX:viewportMinX+windowSize-1,
minZ:viewportMinZ,
maxZ:viewportMinZ+windowSize-1
}
}

}

function renderChunkmap(displayCase){

if(sessionMode!=="chunkmap"){
chunkmapWrap.style.display="none"
chunkmapXAxis.innerHTML=""
chunkmapZAxis.innerHTML=""
chunkmap.innerHTML=""
chunkmapMeta.innerText=""
return
}

chunkmapWrap.style.display="block"

if(!displayCase){
chunkmapXAxis.innerHTML=""
chunkmapZAxis.innerHTML=""
chunkmap.innerHTML=""
chunkmapMeta.innerText=""
return
}

let minX=displayCase.view.minX
let maxX=displayCase.view.maxX
let minZ=displayCase.view.minZ
let maxZ=displayCase.view.maxZ
let width=maxX-minX+1
let height=maxZ-minZ+1
let footprint=displayCase.footprint
chunkmapXAxis.style.gridTemplateColumns="repeat("+width+", minmax(var(--chunk-cell-size), 1fr))"
chunkmapZAxis.style.gridTemplateRows="repeat("+height+", var(--chunk-cell-size))"
chunkmap.style.gridTemplateColumns="repeat("+width+", minmax(var(--chunk-cell-size), 1fr))"

let cells=[]
let xAxis=[]
let zAxis=[]

for(let x=minX;x<=maxX;x++){
xAxis.push('<div class="axis-cell axis-x-cell">'+x+'</div>')
}

for(let z=minZ;z<=maxZ;z++){
zAxis.push('<div class="axis-cell axis-z-cell">'+z+'</div>')
}

for(let z=minZ;z<=maxZ;z++){
for(let x=minX;x<=maxX;x++){

let isPlayerChunk=x===displayCase.pos.x&&z===displayCase.pos.z
let isOriginChunk=x===displayCase.originX&&z===displayCase.originZ
let chunkClass="chunk-cell "+getChunkBiomeClass(x,z)
let isFootprintChunk=footprint.has(x+":"+z)

if(isFootprintChunk){
chunkClass+=" bastion-footprint"
}

if(isPlayerChunk&&isOriginChunk){
chunkClass+=" player-chunk origin-chunk dual-chunk"
}
else if(isPlayerChunk){
chunkClass+=" player-chunk"
}
else if(isOriginChunk){
chunkClass+=" origin-chunk"
}

cells.push(
'<div class="'+chunkClass+'">'+
'<div class="chunk-label">'+x+', '+z+'</div>'+
'<div class="chunk-content">'+
(isPlayerChunk?'<div class="chunk-badge">P</div><div class="chunk-coords">PLAYER</div>':'')+
(isOriginChunk?'<div class="chunk-badge origin-badge">B</div><div class="chunk-facing">ORIGIN</div>':'')+
'</div>'+
'</div>'
)

}
}

chunkmapXAxis.innerHTML=xAxis.join("")
chunkmapZAxis.innerHTML=zAxis.join("")
chunkmap.innerHTML=cells.join("")
chunkmapMeta.innerText=
"Player chunk: "+displayCase.pos.x+", "+displayCase.pos.z+
" | Bastion origin: "+displayCase.originX+", "+displayCase.originZ

}

function getSelectedRampartMode(any,left,mid,right){

if(any.checked) return "all"
if(left.checked) return "left"
if(mid.checked) return "middle"
if(right.checked) return "right"

return "all"

}

function rampartValid(set,mode,withoutSelected){

if(mode==="all"){
return withoutSelected?set.size===0:true
}

let hasTarget=false

for(let block of set){

let section=getRampartSection(block)

if(withoutSelected){
if(section===mode) return false
continue
}

if(section!==mode) return false
hasTarget=true

}

return withoutSelected?true:hasTarget

}

function computeFiltered(){

filtered=bastions.filter(b=>{

if(ranked.checked){
if(b.x<-14||b.x>14||b.z<-14||b.z>14) return false
}

if(b.f==="NORTH"&&!north.checked) return false
if(b.f==="SOUTH"&&!south.checked) return false
if(b.f==="EAST"&&!east.checked) return false
if(b.f==="WEST"&&!west.checked) return false

let leftMode=getSelectedRampartMode(LANY,LL,LM,LR)
let rightMode=getSelectedRampartMode(RANY,RL,RM,RR)

if(!rampartValid(b.l,leftMode,LWITHOUT.checked)) return false
if(!rampartValid(b.r,rightMode,RWITHOUT.checked)) return false

return true

})

}

function updateFilterStatus(){

computeFiltered()

if(filtered.length===0){

filterWarning.innerText="No cases match filter"
filterWarning.style.color="#ff5555"
startButtons.forEach(btn=>btn.disabled=true)

}else{

filterWarning.innerText=filtered.length+" cases available"
filterWarning.style.color="#38d26b"
startButtons.forEach(btn=>btn.disabled=false)

}

}

function clearSessionTimers(){

if(sessionCompleteTimeout){
clearTimeout(sessionCompleteTimeout)
sessionCompleteTimeout=null
}

if(timerInterval){
clearInterval(timerInterval)
timerInterval=null
}

}

function updateStats(){

let parts=[]

if(sessionMode!=="flashcard"){
parts.push(
"Score: "+correct+"/"+total+
" | "+(total?Math.round(correct/total*100):0)+"%"+
" | Streak: "+streak
)
}

if(sessionMode==="timed"){

let secondsLeft=Math.max(0,Math.ceil((timedModeDeadline-Date.now())/1000))
parts.push("Time Left: "+secondsLeft+"s")

}

stats.innerText=parts.join(" | ")

}

function beginTimedMode(){

timedModeDeadline=Date.now()+timedModeSeconds*1000
updateStats()

timerInterval=setInterval(()=>{

updateStats()

if(Date.now()>=timedModeDeadline){
completeSession()
}

},250)

}

function handleAnyToggle(){

let forceLeftAny=scoreRight.checked
let forceRightAny=scoreLeft.checked

if(forceLeftAny){
LANY.checked=true
LWITHOUT.checked=false
}

if(forceRightAny){
RANY.checked=true
RWITHOUT.checked=false
}

LWITHOUT.disabled=forceLeftAny
RWITHOUT.disabled=forceRightAny

if(LWITHOUT.disabled){
LWITHOUT.checked=false
}

if(RWITHOUT.disabled){
RWITHOUT.checked=false
}

updateFilterStatus()

}

function startTraining(mode,size){

clearSessionTimers()

sessionMode=mode
sessionSize=size
sessionIndex=0
correct=0
total=0
streak=0

setup.style.display="none"
card.style.display="block"
checkBtn.style.display=sessionMode==="flashcard"?"none":"inline-block"
endBtn.style.display="inline-block"
nextBtn.disabled=sessionMode!=="flashcard"
checkBtn.disabled=false
answer.innerText=""
renderChunkmap(null)
updateStats()

if(sessionMode==="timed"){
beginTimedMode()
}

nextCase()

}

function completeSession(){

clearSessionTimers()

let percent=total?Math.round(correct/total*100):0
let summaryText=
sessionMode==="flashcard"
?"Flashcard session complete"
:"Final Score: "+correct+"/"+total+" ("+percent+"%)"

caseBox.innerHTML=
"Session Complete"+
"<br>"+summaryText

answer.innerText="Returning to setup..."

sessionCompleteTimeout=setTimeout(()=>{

card.style.display="none"
setup.style.display="block"

filterWarning.innerText=sessionMode==="flashcard"
?"Last session: Flashcard mode"
:"Last session: "+correct+"/"+total+
" ("+percent+"%)"
filterWarning.style.color="#38d26b"

sessionCompleteTimeout=null

},2000)

}

function resetBlocks(){

document.querySelectorAll(".block").forEach(b=>{
b.className="block"
})

guessL.clear()
guessR.clear()

}

function nextCase(){

if(!answerChecked&&sessionIndex>0){
if(sessionMode==="flashcard"){
answerChecked=true
}else{
return
}
}

if(sessionIndex>=sessionSize){

completeSession()
return

}

sessionIndex++

revealedThisRound=false
revealActive=false
answerChecked=false
checkBtn.disabled=false
nextBtn.disabled=sessionMode!=="flashcard"

revealBtn.innerText="Reveal"

resetBlocks()

current=filtered[Math.floor(Math.random()*filtered.length)]
currentDisplay=buildDisplayCase(current)

let sessionLabel="in "+sessionSize

if(sessionMode==="timed"){
sessionLabel="in "+timedModeSeconds+"s"
}

if(sessionMode==="flashcard"){
sessionLabel="(Flashcards mode)"
}

if(sessionMode==="chunkmap"){
sessionLabel="(Chunkmap mode)"
}

if(sessionMode==="infinite"){
sessionLabel="(Infinite mode)"
}

let caseText="Bastion "+sessionIndex+" "+sessionLabel

if(sessionMode!=="chunkmap"){
caseText+=
"<br>Facing: "+getDirectionText(current.f)+
" | Standing in: "+currentDisplay.pos.x+", "+currentDisplay.pos.z
}

caseBox.innerHTML=caseText

answer.innerText=""

renderChunkmap(currentDisplay)
updateDebug()
updateStats()

}

function toggleBlock(val){

if(revealActive||answerChecked)return

let block=document.querySelector(`[data-block="${val}"]`)
let set=val.startsWith("L")?guessL:guessR

if(set.has(val)){

set.delete(val)
block.classList.remove("selected")

}else{

set.add(val)
block.classList.add("selected")

}

}

function checkAnswer(){

if(answerChecked){
return
}

if(sessionMode==="flashcard"){
return
}

answerChecked=true
checkBtn.disabled=true
nextBtn.disabled=false

document.querySelectorAll(".block").forEach(b=>{

let val=b.dataset.block
let side=val.startsWith("L")?"L":"R"
let actual=side==="L"?current.l:current.r
let guess=side==="L"?guessL:guessR

let isActual=actual.has(val)
let isGuess=guess.has(val)

if(!isRampartScored(side)) return

if(isActual&&isGuess) b.classList.add("correct")
else if(isActual||isGuess) b.classList.add("wrong")

})

let okL=!isRampartScored("L")||rampartMatches("L")
let okR=!isRampartScored("R")||rampartMatches("R")

if(!revealedThisRound){

total++

if(okL&&okR){

correct++
streak++
answer.innerHTML='<span class="correct-text">Correct</span>'

}else{

streak=0
answer.innerHTML='<span class="wrong-text">Wrong</span>'

}

}

updateStats()

}

function reveal(){

revealedThisRound=true

revealActive=!revealActive
revealBtn.innerText=revealActive?"Hide":"Reveal"

document.querySelectorAll(".block").forEach(block=>{

let val=block.dataset.block
let side=val.startsWith("L")?"L":"R"
let actual=side==="L"?current.l:current.r
let guess=side==="L"?guessL:guessR

block.classList.remove("selected","correct","wrong","reveal")

if(revealActive){

if(actual.has(val)){
block.classList.add("reveal")
}

}else{

if(answerChecked){

if(!isRampartScored(side)){

if(guess.has(val)){
block.classList.add("selected")
}

return

}

let isActual=actual.has(val)
let isGuess=guess.has(val)

if(isActual&&isGuess){
block.classList.add("correct")
}
else if(isActual||isGuess){
block.classList.add("wrong")
}

}else{

if(guess.has(val)){
block.classList.add("selected")
}

}

}

})

}

function updateDebug(){

if(!debugVisible)return

debug.innerHTML=
"Filtered treasures: "+filtered.length+
"<br>Current origin: "+current.x+" "+current.z+
"<br>Session index: "+sessionIndex

}

async function loadCSV(){

const res=await fetch("GoldBlockLocationsTranslated.csv")
const txt=await res.text()

const rows=txt.trim().split("\n")

rows.slice(1).forEach(r=>{

const p=r.split(",").map(v=>v.replace(/\"/g,"").trim())

let facing=p[0]
let x=parseInt(p[1])
let z=parseInt(p[2])

let l=new Set()
let rset=new Set()

p.forEach(v=>{
if(v.startsWith("L")) l.add(v)
if(v.startsWith("R")) rset.add(v)
})

bastions.push({f:facing,x:x,z:z,l:l,r:rset})

})

updateFilterStatus()

}

document.querySelectorAll(".block").forEach(b=>{
b.onclick=()=>toggleBlock(b.dataset.block)
})

document.addEventListener("keydown",e=>{

let k=e.key.toLowerCase()

const map={
1:"L1",2:"L2",3:"L3",4:"L4",5:"L5",6:"L6",
q:"R1",w:"R2",e:"R3",r:"R4",t:"R5",y:"R6"
}

if(map[k]) toggleBlock(map[k])

if(k===" ") checkAnswer()
if(k==="n"&&(answerChecked||sessionMode==="flashcard")) nextCase()

if(k==="d"){

debugVisible=!debugVisible
debug.style.display=debugVisible?"block":"none"
updateDebug()

}

})

startButtons.forEach(btn=>{
btn.onclick=()=>{
let mode=btn.dataset.sessionMode
let size=Infinity

if(mode==="count"){
size=parseInt(btn.dataset.sessionSize,10)
}

if(mode==="timed"){
timedModeSeconds=parseInt(btn.dataset.sessionSeconds,10)
}

if(mode==="flashcard"||mode==="infinite"||mode==="timed"||mode==="chunkmap"){
size=Infinity
}

startTraining(mode,size)
}
})
checkBtn.onclick=checkAnswer
nextBtn.onclick=nextCase
revealBtn.onclick=reveal
endBtn.onclick=completeSession

document.querySelectorAll("#setup input").forEach(el=>{
el.addEventListener("change",updateFilterStatus)
})

LANY.addEventListener("change",handleAnyToggle)
LL.addEventListener("change",handleAnyToggle)
LM.addEventListener("change",handleAnyToggle)
LR.addEventListener("change",handleAnyToggle)
LWITHOUT.addEventListener("change",handleAnyToggle)
RANY.addEventListener("change",handleAnyToggle)
RL.addEventListener("change",handleAnyToggle)
RM.addEventListener("change",handleAnyToggle)
RR.addEventListener("change",handleAnyToggle)
RWITHOUT.addEventListener("change",handleAnyToggle)
scoreBoth.addEventListener("change",handleAnyToggle)
scoreLeft.addEventListener("change",handleAnyToggle)
scoreRight.addEventListener("change",handleAnyToggle)

handleAnyToggle()

loadCSV()
