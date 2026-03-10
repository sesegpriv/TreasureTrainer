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

let revealActive=false
let revealedThisRound=false
let answerChecked=false

let debugVisible=false

const caseBox=document.getElementById("case")
const setup=document.getElementById("setup")
const card=document.getElementById("card")

const answer=document.getElementById("answer")
const stats=document.getElementById("stats")
const debug=document.getElementById("debug")

const startBtn=document.getElementById("startBtn")
const revealBtn=document.getElementById("revealBtn")

const filterWarning=document.getElementById("filterWarning")

const LL=document.getElementById("LL")
const LM=document.getElementById("LM")
const LR=document.getElementById("LR")
const LANY=document.getElementById("LANY")

const RL=document.getElementById("RL")
const RM=document.getElementById("RM")
const RR=document.getElementById("RR")
const RANY=document.getElementById("RANY")

const north=document.getElementById("north")
const south=document.getElementById("south")
const east=document.getElementById("east")
const west=document.getElementById("west")

const ranked=document.getElementById("ranked")

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

function rampartValid(set,left,mid,right,any){

if(any) return set.size>0

if(!left&&!mid&&!right) return set.size===0

let needL=left
let needM=mid
let needR=right

for(let block of set){

let n=parseInt(block.slice(1))

if(n<=2){

if(!left) return false
needL=false

}
else if(n<=5){

if(!mid) return false
needM=false

}
else{

if(!right) return false
needR=false

}

}

return !(needL||needM||needR)

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

if(!rampartValid(b.l,LL.checked,LM.checked,LR.checked,LANY.checked)) return false
if(!rampartValid(b.r,RL.checked,RM.checked,RR.checked,RANY.checked)) return false

return true

})

}

function updateFilterStatus(){

computeFiltered()

if(filtered.length===0){

filterWarning.innerText="No cases match filter"
filterWarning.style.color="#ff5555"
startBtn.disabled=true

}else{

filterWarning.innerText=filtered.length+" cases available"
filterWarning.style.color="#38d26b"
startBtn.disabled=false

}

}

function handleAnyToggle(){

if(LANY.checked){

LL.checked=false
LM.checked=false
LR.checked=false

LL.disabled=true
LM.disabled=true
LR.disabled=true

}else{

LL.disabled=false
LM.disabled=false
LR.disabled=false

}

if(RANY.checked){

RL.checked=false
RM.checked=false
RR.checked=false

RL.disabled=true
RM.disabled=true
RR.disabled=true

}else{

RL.disabled=false
RM.disabled=false
RR.disabled=false

}

updateFilterStatus()

}

function startTraining(){

sessionIndex=0
correct=0
total=0
streak=0

setup.style.display="none"
card.style.display="block"

nextCase()

}

function resetBlocks(){

document.querySelectorAll(".block").forEach(b=>{
b.className="block"
})

guessL.clear()
guessR.clear()

}

function nextCase(){

if(sessionIndex>=sessionSize){

caseBox.innerHTML="Session Complete"
return

}

sessionIndex++

revealedThisRound=false
revealActive=false
answerChecked=false

revealBtn.innerText="Reveal"

resetBlocks()

current=filtered[Math.floor(Math.random()*filtered.length)]

let pos=playerCoords(current.x,current.z,current.f)

caseBox.innerHTML=
"Bastion "+sessionIndex+" / "+sessionSize+
"<br>Facing: "+getDirectionText(current.f)+
" | Standing in: "+pos.x+" "+pos.z

answer.innerText=""

updateDebug()

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

answerChecked=true

document.querySelectorAll(".block").forEach(b=>{

let val=b.dataset.block
let actual=val.startsWith("L")?current.l:current.r
let guess=val.startsWith("L")?guessL:guessR

let isActual=actual.has(val)
let isGuess=guess.has(val)

if(isActual&&isGuess) b.classList.add("correct")
else if(isActual||isGuess) b.classList.add("wrong")

})

let okL=[...guessL].sort().join()==[...current.l].sort().join()
let okR=[...guessR].sort().join()==[...current.r].sort().join()

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

stats.innerText=
"Score: "+correct+"/"+total+
" | "+(total?Math.round(correct/total*100):0)+"%" +
" | Streak: "+streak

}

function reveal(){

revealedThisRound=true

revealActive=!revealActive
revealBtn.innerText=revealActive?"Hide":"Reveal"

document.querySelectorAll(".block").forEach(block=>{

let val=block.dataset.block
let actual=val.startsWith("L")?current.l:current.r
let guess=val.startsWith("L")?guessL:guessR

block.classList.remove("selected","correct","wrong","reveal")

if(revealActive){

if(actual.has(val)){
block.classList.add("reveal")
}

}else{

if(answerChecked){

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
if(k==="n") nextCase()

if(k==="d"){

debugVisible=!debugVisible
debug.style.display=debugVisible?"block":"none"
updateDebug()

}

})

startBtn.onclick=startTraining
document.getElementById("checkBtn").onclick=checkAnswer
document.getElementById("nextBtn").onclick=nextCase
revealBtn.onclick=reveal

document.querySelectorAll("#setup input").forEach(el=>{
el.addEventListener("change",updateFilterStatus)
})

LANY.addEventListener("change",handleAnyToggle)
RANY.addEventListener("change",handleAnyToggle)

handleAnyToggle()

loadCSV()