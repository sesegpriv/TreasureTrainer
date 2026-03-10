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

const caseBox=document.getElementById("case")
const setup=document.getElementById("setup")
const card=document.getElementById("card")

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

function getSelectedRampartMode(any,left,mid,right){

if(any.checked) return "any"
if(left.checked) return "left"
if(mid.checked) return "middle"
if(right.checked) return "right"

return "any"

}

function rampartValid(set,mode,withoutSelected){

if(mode==="any"){
return set.size>0
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

return withoutSelected?set.size>0:hasTarget

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

LWITHOUT.disabled=LANY.checked||forceLeftAny
RWITHOUT.disabled=RANY.checked||forceRightAny

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
endBtn.style.display=sessionMode==="flashcard"||sessionMode==="infinite"?"inline-block":"none"
nextBtn.disabled=sessionMode!=="flashcard"
checkBtn.disabled=false
answer.innerText=""
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

let pos=playerCoords(current.x,current.z,current.f)
let sessionLabel=sessionSize===Infinity?"Infinite":sessionSize

if(sessionMode==="timed"){
sessionLabel=timedModeSeconds+" Seconds"
}

if(sessionMode==="flashcard"){
sessionLabel="Flashcards"
}

caseBox.innerHTML=
"Bastion "+sessionIndex+" / "+sessionLabel+
"<br>Facing: "+getDirectionText(current.f)+
" | Standing in: "+pos.x+", "+pos.z

answer.innerText=""

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

if(mode==="flashcard"||mode==="infinite"||mode==="timed"){
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
