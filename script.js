function goto(id){
  document.querySelectorAll('.navbtn').forEach(x=>x.classList.toggle('active', x.dataset.t===id));
  document.querySelectorAll('.tool').forEach(x=>x.classList.toggle('active', x.id===id));
  window.scrollTo({top:0});
}
document.querySelectorAll('.navbtn').forEach(b=>b.addEventListener('click',()=>goto(b.dataset.t)));

// ---- API key (stored locally, used for every AI call) ----
const MODEL = 'claude-sonnet-4-5-20250929'; // change here if Anthropic renames/rotates models
document.getElementById('apiKey').value = localStorage.getItem('sl_key') || '';
function saveKey(){ localStorage.setItem('sl_key', document.getElementById('apiKey').value.trim()); alert('Key saved locally.'); }
function getKey(){ return document.getElementById('apiKey').value.trim() || localStorage.getItem('sl_key') || ''; }

// ---- Direct calls to the Anthropic Messages API ----
async function callClaude(messages, maxTokens){
  const key = getKey();
  if(!key) throw new Error('Add your Anthropic API key in the sidebar first.');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      'x-api-key': key,
      'anthropic-version':'2023-06-01',
      'anthropic-dangerous-direct-browser-access':'true'
    },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens||1200, messages })
  });
  if(!res.ok){ const t=await res.text(); throw new Error('API error '+res.status+': '+t.slice(0,200)); }
  const data = await res.json();
  return (data.content||[]).map(b=>b.text||'').join('\n');
}
async function askText(prompt, outEl){
  outEl.textContent='Thinking…';
  try{ outEl.textContent = await callClaude([{role:'user', content:prompt}]); }
  catch(e){ outEl.textContent = 'Error: '+e.message; }
}
async function askJSON(prompt){
  try{
    let raw = await callClaude([{role:'user', content: prompt + '\n\nRespond with ONLY valid JSON, no markdown fences, no commentary.'}]);
    raw = raw.trim().replace(/^```json/i,'').replace(/^```/,'').replace(/```$/,'').trim();
    return JSON.parse(raw);
  }catch(e){ console.error(e); return null; }
}

// ---- File downloads (plain browser download, no special capability needed) ----
function saveText(filename, text){
  const blob = new Blob([text], {type:'text/plain'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
}
function saveResumePdf(){
  const text = document.getElementById('r_out').textContent;
  if(!text || text.startsWith('Your resume')) return;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({unit:'pt'});
  const lines = doc.splitTextToSize(text, 500);
  doc.setFont('helvetica'); doc.setFontSize(11);
  doc.text(lines, 40, 50);
  doc.save((val('r_name')||'resume').replace(/\s+/g,'_')+'.pdf');
}
function savePptx(){
  if(!slideData.length) return;
  const pptx = new window.PptxGenJS();
  slideData.forEach(s=>{
    const slide = pptx.addSlide();
    slide.addText(s.title||'', {x:0.5,y:0.4,fontSize:26,bold:true});
    slide.addText((s.bullets||[]).map(b=>({text:b, options:{bullet:true, breakLine:true}})), {x:0.6,y:1.3,fontSize:16});
  });
  pptx.writeFile({fileName:(val('s_topic')||'slides').replace(/\s+/g,'_')+'.pptx'});
}

// Resume
async function genResume(){
  const out=document.getElementById('r_out');
  const p=`Write a professional, well-formatted plain-text resume from this data. Use clear section headers and concise bullet points.
Name: ${val('r_name')}
Contact: ${val('r_contact')}
Objective: ${val('r_obj')}
Education: ${val('r_edu')}
Skills: ${val('r_skills')}
Experience: ${val('r_exp')}`;
  askText(p, out);
}
function val(id){ return document.getElementById(id).value; }

// Notes
async function genNotes(){
  const out=document.getElementById('n_out'); out.textContent='Thinking…';
  try{
    const md = await callClaude([{role:'user', content:`Convert this text into short, well-organized bullet-point study notes with clear Markdown headings:\n\n${val('n_in')}`}]);
    out.innerHTML = window.marked ? marked.parse(md) : md;
  }catch(e){ out.textContent = 'Error: '+e.message; }
}

// Slides
let slideData=[], slideIdx=0;
async function genSlides(){
  const topic=val('s_topic'); if(!topic) return;
  document.getElementById('s_view').style.display='none';
  const data = await askJSON(`Create a 6-slide presentation outline on "${topic}". Return ONLY JSON: an array of 6 objects, each {"title": string, "bullets": [3-4 short strings]}. No markdown, no commentary.`);
  slideData = Array.isArray(data) ? data : [{title:'Could not generate slides', bullets:['Try again or rephrase the topic.']}];
  slideIdx=0; document.getElementById('s_view').style.display='block'; renderSlide();
}
function renderSlide(){
  const s=slideData[slideIdx];
  document.getElementById('s_title').textContent = s.title||'';
  document.getElementById('s_body').innerHTML = '<ul>'+(s.bullets||[]).map(b=>'<li>'+escapeHtml(b)+'</li>').join('')+'</ul>';
  document.getElementById('s_count').textContent = (slideIdx+1)+' / '+slideData.length;
}
function slideNav(d){ slideIdx=(slideIdx+d+slideData.length)%slideData.length; renderSlide(); }
function escapeHtml(t){ return String(t).replace(/[&<>]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }

// Mind map
async function genMap(){
  const out=document.getElementById('m_out'); out.textContent='Thinking…';
  const data = await askJSON(`Break this syllabus into a nested outline: main topics -> sub-topics -> key points. Return ONLY JSON: {"topic": string, "children": [ {"topic": string, "children": [ {"topic": string, "children": []} ] } ]}.\n\n${val('m_in')}`);
  out.innerHTML = data ? renderTree(data) : 'Could not generate an outline. Try again.';
}
function renderTree(node){
  let html = '<div>'+escapeHtml(node.topic||'')+'</div>';
  if(node.children && node.children.length) html += '<ul>'+node.children.map(c=>'<li>'+renderTree(c)+'</li>').join('')+'</ul>';
  return html;
}

// Sheets
const DEMO_ROWS=[{Name:'Aarav',Subject:'Maths',Score:82},{Name:'Diya',Subject:'Science',Score:91},{Name:'Kabir',Subject:'English',Score:76}];
let sheetRows=DEMO_ROWS.slice();
function renderTable(){
  const wrap=document.getElementById('sh_tablewrap');
  if(!sheetRows.length){ wrap.innerHTML='<p class="sub">No rows yet.</p>'; return; }
  const cols=Object.keys(sheetRows[0]);
  wrap.innerHTML='<table><tr>'+cols.map(c=>'<th>'+c+'</th>').join('')+'</tr>'+
    sheetRows.map(r=>'<tr>'+cols.map(c=>'<td>'+escapeHtml(r[c])+'</td>').join('')+'</tr>').join('')+'</table>';
}
renderTable();
async function loadSheet(){
  const url=val('sh_url'); const wrap=document.getElementById('sh_tablewrap');
  if(!url){ renderTable(); return; }
  wrap.innerHTML='<p class="sub">Loading…</p>';
  try{
    const res=await fetch(url); const data=await res.json();
    sheetRows = Array.isArray(data) ? data : (data.rows||DEMO_ROWS);
  }catch(e){
    sheetRows = DEMO_ROWS.slice();
    wrap.innerHTML='<p class="sub">Live connection wasn\'t reachable from this preview, so demo data is shown. Your deployed Apps Script URL will work once this page is used outside the sandbox.</p>';
    renderTable(); return;
  }
  renderTable();
}
function addRow(){
  const raw=val('sh_new'); if(!raw) return;
  const parts=raw.split(',').map(s=>s.trim());
  const cols=sheetRows.length?Object.keys(sheetRows[0]):['col1','col2','col3'];
  const row={}; cols.forEach((c,i)=>row[c]=parts[i]||'');
  sheetRows.push(row); document.getElementById('sh_new').value=''; renderTable();
}
async function summarizeSheet(){
  const out=document.getElementById('sh_summary'); out.style.display='block';
  askText(`Give a 2-3 sentence summary and one trend/insight about this data:\n${JSON.stringify(sheetRows)}`, out);
}

// Quiz
let quizData=[], quizIdx=0, quizScore=0;
async function genQuiz(){
  const view=document.getElementById('q_view'); view.innerHTML='<p class="sub">Generating quiz…</p>';
  const data = await askJSON(`Create 5 multiple-choice questions on: ${val('q_in')}. Return ONLY JSON: an array of {"q": string, "options": [4 strings], "answer": index of correct option 0-3}.`);
  quizData = Array.isArray(data)&&data.length ? data : null;
  if(!quizData){ view.innerHTML='<p class="sub">Could not generate a quiz. Try again.</p>'; return; }
  quizIdx=0; quizScore=0; renderQuiz();
}
function renderQuiz(){
  const view=document.getElementById('q_view');
  if(quizIdx>=quizData.length){ view.innerHTML='<h3>Score: '+quizScore+' / '+quizData.length+'</h3>'; return; }
  const q=quizData[quizIdx];
  view.innerHTML='<p><strong>Q'+(quizIdx+1)+'.</strong> '+escapeHtml(q.q)+'</p>'+
    q.options.map((o,i)=>'<button class="opt" onclick="answerQuiz('+i+')">'+escapeHtml(o)+'</button>').join('');
}
function answerQuiz(i){
  const q=quizData[quizIdx]; const btns=document.querySelectorAll('#q_view .opt');
  btns.forEach((b,idx)=>{ if(idx===q.answer) b.classList.add('correct'); else if(idx===i) b.classList.add('wrong'); b.onclick=null; });
  if(i===q.answer) quizScore++;
  setTimeout(()=>{ quizIdx++; renderQuiz(); }, 900);
}

// Chat
let chatHistory=[];
function clearChat(){ chatHistory=[]; document.getElementById('c_log').innerHTML=''; }
async function sendChat(){
  const inp=document.getElementById('c_msg'); const msg=inp.value.trim(); if(!msg) return;
  inp.value=''; addBubble('u', msg);
  chatHistory.push({role:'user', content: chatHistory.length===0 ? `You are a helpful, patient tutor for ${val('c_subject')}. Explain simply with small examples.\n\nStudent question: ${msg}` : msg});
  const el = addBubble('a', 'Thinking…');
  try{
    const reply = await callClaude(chatHistory);
    el.textContent = reply;
    chatHistory.push({role:'assistant', content:reply});
  }catch(e){ el.textContent = 'Error: '+e.message; }
}
function addBubble(cls, text){
  const log=document.getElementById('c_log'); const d=document.createElement('div');
  d.className='bubble '+cls; d.textContent=text; log.appendChild(d); log.scrollTop=log.scrollHeight; return d;
}

// Flashcards
let flashData=[], flashIdx=0;
async function genFlash(){
  const topic=val('f_topic'); if(!topic) return;
  document.getElementById('f_view').style.display='none';
  const data = await askJSON(`Create 8 flashcards (question, short answer) for revising: ${topic}. Return ONLY JSON: array of {"q":string,"a":string}.`);
  flashData = Array.isArray(data)&&data.length ? data : [{q:'Could not generate cards',a:'Try again'}];
  flashIdx=0; document.getElementById('f_view').style.display='block'; renderFlash();
}
function renderFlash(){
  const c=document.getElementById('f_card'); c.classList.remove('on');
  document.getElementById('f_front').textContent=flashData[flashIdx].q;
  document.getElementById('f_back').textContent=flashData[flashIdx].a;
}
function flipCard(){ document.getElementById('f_card').classList.toggle('on'); }
function flashNav(){ flashIdx=(flashIdx+1)%flashData.length; renderFlash(); }
function flashShuffle(){ flashData.sort(()=>Math.random()-0.5); flashIdx=0; renderFlash(); }

// Planner
const SUBCOLORS=['#4EA1FF','#7C8CFF','#6EE7FF','#5FD9A4','#A78BFA','#38BDF8'];
async function genPlan(){
  const subs=val('p_subs'); const hours=val('p_hours'); const date=val('p_date');
  const out=document.getElementById('p_out'); out.innerHTML='<p class="sub">Building your plan…</p>';
  const data = await askJSON(`Build a 7-day study timetable for subjects [${subs}], with ${hours} study hours available per day, working toward a target date of ${date||'soon'}. Return ONLY JSON: array of 7 {"day": string, "slots": [ {"time": string, "subject": string} ] }.`);
  if(!Array.isArray(data)){ out.innerHTML='<p class="sub">Could not generate a plan. Try again.</p>'; return; }
  const subList = subs.split(',').map(s=>s.trim());
  out.innerHTML = '<table><tr><th>Day</th><th>Schedule</th></tr>'+data.map(d=>
    '<tr><td>'+escapeHtml(d.day)+'</td><td>'+(d.slots||[]).map(s=>{
      const ci=subList.indexOf(s.subject); const col=SUBCOLORS[ci>=0?ci%SUBCOLORS.length:0];
      return '<span class="pill" style="background:'+col+';color:#06101F">'+escapeHtml(s.time)+' '+escapeHtml(s.subject)+'</span>';
    }).join(' ')+'</td></tr>').join('')+'</table>';
}

// OCR — real in-browser OCR via Tesseract.js, then AI summary
async function ocrPreview(e){
  const f=e.target.files[0]; if(!f) return;
  const img=document.getElementById('o_img'); img.src=URL.createObjectURL(f); img.style.display='block';
  const status=document.getElementById('o_status'); status.textContent='Reading text from the image…';
  try{
    const { data:{ text } } = await Tesseract.recognize(f, 'eng');
    document.getElementById('o_text').value = text.trim();
    status.textContent='Done — check the text below before summarizing.';
  }catch(err){ status.textContent='OCR failed; type the text manually below.'; }
}
async function genOcrSummary(){
  const out=document.getElementById('o_out');
  const text=val('o_text');
  if(!text){ out.textContent='Paste or type the note text above first.'; return; }
  askText(`Summarize these notes into 5-8 crisp key points:\n\n${text}`, out);
}
