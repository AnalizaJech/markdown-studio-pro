import './style.css'
import 'katex/dist/katex.min.css'
import MarkdownIt from 'markdown-it'
import mermaid from 'mermaid'
import katex from 'katex'
import mathjaxUrl from 'mathjax-full/es5/tex-svg.js?url'
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from 'docx'

const starter = `# The quiet art of making things

Welcome to **Markdown Studio Pro** — a thoughtful space for writing, planning and publishing.

## Make it yours

Write on the left. See your work come alive on the right. Everything stays on your device and saves as you type.

> The best ideas deserve room to breathe.

### Today's plan

- [x] Start a new document
- [x] Explore the live preview
- [ ] Create something worth sharing

| Tool | What it does | Ready |
| :--- | :--- | :---: |
| Markdown | Write beautifully | ✓ |
| Diagrams | Explain visually | ✓ |
| Equations | Think precisely | ✓ |

### From idea to impact

\`\`\`mermaid
flowchart LR
    A[Idea] --> B[Draft]
    B --> C[Refine]
    C --> D[Publish]
\`\`\`

And of course, mathematics: $E = mc^2$.

$$
\\int_0^1 x^2 \\, dx = \\frac{1}{3}
$$
`
type View = 'editor'|'split'|'preview'
let view:View = (localStorage.getItem('msp-view') as View) || 'split'
let dark = localStorage.getItem('msp-dark') === 'true'
let focus = false, zen = false, spell = true
let mathEngine = 'katex'
let title = localStorage.getItem('msp-title') || 'Untitled document'
let renderId = 0
const esc = (s:string) => s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))
const slug = (s:string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
const I:Record<string,string> = {file:'▤',upload:'↥',download:'↧',moon:'◐',sun:'☼',chevron:'⌄',editor:'✎',split:'◫',preview:'◎',focus:'◉',zen:'⛶',check:'✓',link:'↗',list:'☷',table:'▦',code:'‹/›',math:'∑',menu:'☰'}
const btn=(id:string,label:string,ico:string,extra='')=>`<button id="${id}" title="${label}" ${extra}><span class="ico">${I[ico]}</span><span class="button-label">${label}</span></button>`
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<div class="app">
 <header class="topbar">
  <div class="brand"><div class="brand-mark">M<span>.</span></div><div class="brand-type">Markdown <b>Studio</b><sup>PRO</sup></div></div>
  <div class="file-name"><span class="file-icon">▤</span><input id="title" aria-label="Document title" value="${esc(title)}"><span id="saved">✓ Saved locally</span></div>
  <div class="header-actions">${btn('open','Open','upload')}${btn('theme','Dark mode','moon')}<span class="divider"></span><button id="export-button" class="primary">↧ &nbsp; Export <span class="down">⌄</span></button></div>
  <input type="file" id="file-input" accept=".md,.markdown,.txt" hidden>
  <div id="export-menu" class="export-menu hidden"><small>EXPORT DOCUMENT</small><button data-export="pdf">PDF <span>Print ready</span></button><button data-export="docx">Word document <span>.docx</span></button><button data-export="html">HTML <span>.html</span></button><button data-export="md">Markdown <span>.md</span></button></div>
 </header>
 <div class="workspace">
  <aside id="sidebar"><div class="side-heading">WORKSPACE <button id="side-toggle" aria-label="Collapse sidebar">☰</button></div><div class="side-active">▤ &nbsp; Document <span>•</span></div><div class="outline-heading">OUTLINE <button id="outline-toggle" aria-label="Toggle outline">⌄</button></div><nav id="toc" aria-label="Table of contents"></nav><div class="sidebar-foot"><div><i></i> Available offline</div><small>STUDIO PRO <span>v1.0</span></small></div></aside>
  <main>
   <div class="workbar"><div class="segmented"><button data-view="editor">✎ &nbsp; Editor</button><button data-view="split">◫ &nbsp; Split view</button><button data-view="preview">◎ &nbsp; Preview</button></div><div class="work-actions">${btn('spell','Spell check','check')}${btn('focus','Focus','focus')}${btn('zen','Zen','zen')}</div></div>
   <div class="toolbar"><div class="tool-set"><button data-format="heading" title="Heading">H₁</button><button data-format="bold" title="Bold (Ctrl+B)"><b>B</b></button><button data-format="italic" title="Italic (Ctrl+I)"><i>I</i></button><button data-format="strike" title="Strikethrough"><s>S</s></button></div><span class="divider"></span><div class="tool-set"><button data-format="link" title="Link (Ctrl+K)">↗</button><button data-format="list" title="List">☷</button><button data-format="table" title="Table">▦</button><button data-format="code" title="Code block">‹/›</button></div><span class="divider"></span><div class="tool-set"><button data-format="mermaid">Mermaid</button><button data-format="plantuml">PlantUML</button><button data-format="math">∑</button></div><select id="math-engine" aria-label="Math engine"><option value="katex">KaTeX</option><option value="mathjax">MathJax</option></select></div>
   <div id="panes" class="panes"><section class="editor-pane"><div class="pane-head"><span><i></i> EDITOR</span><span>MARKDOWN</span></div><div class="edit-surface"><div id="lines"></div><textarea id="editor" aria-label="Markdown editor" spellcheck="true"></textarea></div></section><section class="preview-pane"><div class="pane-head"><span><i></i> PREVIEW</span><span>LIVE RENDER</span></div><div class="preview-scroll"><article id="preview" class="markdown-body"></article></div></section></div>
   <footer><div><span class="ready"><i></i> Ready</span><span id="words">0 words</span><span id="chars">0 characters</span><span id="reading">1 min read</span></div><div><span id="cursor">Ln 1, Col 1</span><span>Markdown</span><span>UTF-8</span></div></footer>
  </main>
 </div>
</div>`
const $ = <T extends Element=HTMLElement>(s:string) => document.querySelector<T>(s)!
const editor=$<HTMLTextAreaElement>('#editor'), preview=$('#preview'), panes=$('#panes'), toc=$('#toc')
editor.value=localStorage.getItem('msp-text')??starter
const md=new MarkdownIt({html:false,linkify:true,typographer:true,breaks:true})
const baseFence=md.renderer.rules.fence!
md.renderer.rules.fence=(tokens,i,options,env,self)=>{
 const lang=tokens[i].info.trim().toLowerCase()
 if(lang==='mermaid'||lang==='plantuml') return `<div class="diagram" data-lang="${lang}" data-src="${encodeURIComponent(tokens[i].content)}"><div class="diagram-title">${lang.toUpperCase()}</div><div class="diagram-out"></div></div>`
 return baseFence(tokens,i,options,env,self)
}
md.renderer.rules.heading_open=(tokens,i,options,_env,self)=>{tokens[i].attrSet('id',slug(tokens[i+1]?.content||''));return self.renderToken(tokens,i,options)}
function plantToMermaid(src:string){
 const lines=src.split('\n').map(x=>x.trim()).filter(x=>x&&!/^@(?:start|end)uml/i.test(x))
 if(lines.some(x=>/^(participant|actor)\s/i.test(x))||lines.some(x=>/\w\s*->\s*\w\s*:/.test(x))){
  return 'sequenceDiagram\n'+lines.map(x=>x.replace(/^actor\s+/i,'participant ').replace(/\s*->\s*/,'->>')).join('\n')
 }
 const flow=lines.filter(x=>/-->|->/.test(x))
 if(flow.length)return 'flowchart LR\n'+flow.join('\n')
 throw Error('Offline PlantUML supports sequence and simple flow diagrams.')
}
function preprocessMath(src:string){
 const items:string[]=[]
 src=src.replace(/\$\$([\s\S]+?)\$\$/g,(_,tex)=>{const i=items.push(`<div class="math-slot display" data-tex="${encodeURIComponent(tex.trim())}" data-display="1"></div>`)-1;return `MSPBLOCK${i}END`})
 src=src.replace(/(?<!\\)\$([^\n$]+)\$/g,(_,tex)=>{const i=items.push(`<span class="math-slot" data-tex="${encodeURIComponent(tex)}"></span>`)-1;return `MSPINLINE${i}END`})
 return {src,items}
}
async function mathRender(){
 const slots=[...preview.querySelectorAll<HTMLElement>('.math-slot')]
 if(mathEngine==='katex'){slots.forEach(el=>{try{el.innerHTML=katex.renderToString(decodeURIComponent(el.dataset.tex||''),{displayMode:el.dataset.display==='1',throwOnError:false,trust:false})}catch{el.textContent='Invalid equation'}});return}
 const mj=await loadMathJax()
 for(const el of slots){try{const svg=await mj.tex2svgPromise(decodeURIComponent(el.dataset.tex||''),{display:el.dataset.display==='1'});el.replaceChildren(svg)}catch{el.textContent='Invalid equation'}}
}
type MathJaxAPI={tex2svgPromise:(tex:string,options:{display:boolean})=>Promise<HTMLElement>}
let mathJaxPromise:Promise<MathJaxAPI>|undefined
function loadMathJax():Promise<MathJaxAPI>{
 if(!mathJaxPromise)mathJaxPromise=new Promise((resolve,reject)=>{
  const host=window as typeof window & {MathJax?:MathJaxAPI & {startup?:{promise:Promise<void>}}}
  host.MathJax={startup:{typeset:false},svg:{fontCache:'none'}} as unknown as MathJaxAPI & {startup:{promise:Promise<void>}}
  const script=document.createElement('script');script.src=mathjaxUrl;script.onload=()=>host.MathJax?.startup?.promise.then(()=>resolve(host.MathJax!)).catch(reject);script.onerror=reject;document.head.append(script)
 })
 return mathJaxPromise
}
async function render(){
 const id=++renderId
 const p=preprocessMath(editor.value)
 let html=md.render(p.src).replace(/<p>MSPBLOCK(\d+)END<\/p>/g,(_,i)=>p.items[+i]).replace(/MSPINLINE(\d+)END/g,(_,i)=>p.items[+i])
 preview.innerHTML=html
 await mathRender()
 if(id!==renderId)return
 mermaid.initialize({startOnLoad:false,theme:dark?'dark':'neutral',securityLevel:'strict'})
 for(const [i,el] of [...preview.querySelectorAll<HTMLElement>('.diagram')].entries()){
  if(id!==renderId)return
  try{const src=decodeURIComponent(el.dataset.src||'');const {svg}=await mermaid.render(`msp-${id}-${i}`,el.dataset.lang==='plantuml'?plantToMermaid(src):src);el.querySelector('.diagram-out')!.innerHTML=svg}
  catch(e){el.querySelector('.diagram-out')!.textContent=e instanceof Error?e.message:'Diagram error'}
 }
 toc.innerHTML=[...preview.querySelectorAll('h1,h2,h3,h4')].map(h=>`<a class="level-${h.tagName.toLowerCase()}" href="#${h.id}">${esc(h.textContent||'')}</a>`).join('')||'<span class="empty">No headings yet</span>'
 toc.querySelectorAll('a').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();if(view==='editor')setView('split');preview.querySelector(a.getAttribute('href')!)?.scrollIntoView({behavior:'smooth'})}))
}
function stats(){
 const s=editor.value,w=s.trim().match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu)?.length||0
 $('#words').textContent=`${w} words`;$('#chars').textContent=`${s.length} characters`;$('#reading').textContent=`${Math.max(1,Math.ceil(w/220))} min read`
 $('#lines').innerHTML=Array.from({length:s.split('\n').length},(_,i)=>`<div>${i+1}</div>`).join('')
 const before=s.slice(0,editor.selectionStart).split('\n');$('#cursor').textContent=`Ln ${before.length}, Col ${before.at(-1)!.length+1}`
}
let timer:number
editor.addEventListener('input',()=>{localStorage.setItem('msp-text',editor.value);stats();clearTimeout(timer);timer=window.setTimeout(render,200)})
editor.addEventListener('scroll',()=>{$('#lines').scrollTop=editor.scrollTop})
editor.addEventListener('click',stats);editor.addEventListener('keyup',stats)
function replace(s:string,a?:number,b?:number){const start=editor.selectionStart;editor.setRangeText(s,start,editor.selectionEnd,'end');editor.focus();if(a!==undefined)editor.setSelectionRange(start+a,start+(b??a));editor.dispatchEvent(new Event('input'))}
function wrap(l:string,r=l,f='text'){const s=editor.value.slice(editor.selectionStart,editor.selectionEnd)||f;replace(l+s+r,l.length,l.length+s.length)}
function format(f:string){
 const snippets:Record<string,string>={heading:'# Heading',list:'\n- List item\n- Another item',table:'\n| Column 1 | Column 2 |\n| --- | --- |\n| Value | Value |\n',code:'\n\`\`\`javascript\nconst idea = true;\n\`\`\`\n',mermaid:'\n\`\`\`mermaid\nflowchart LR\n  A[Start] --> B[Finish]\n\`\`\`\n',plantuml:'\n\`\`\`plantuml\n@startuml\nparticipant User\nparticipant Studio\nUser -> Studio: Write\nStudio -> User: Preview\n@enduml\n\`\`\`\n',math:'\n$$\n\\frac{a}{b}\n$$\n'}
 if(f==='bold')wrap('**','**','bold text');else if(f==='italic')wrap('*','*','italic text');else if(f==='strike')wrap('~~','~~','struck text');else if(f==='link'){const s=editor.value.slice(editor.selectionStart,editor.selectionEnd)||'link text';replace(`[${s}](https://example.com)`,1,s.length+1)}else replace(snippets[f]||'')
}
document.querySelectorAll<HTMLButtonElement>('[data-format]').forEach(b=>b.onclick=()=>format(b.dataset.format!))
function setView(v:View){view=v;panes.dataset.view=v;localStorage.setItem('msp-view',v);document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>{b.classList.toggle('selected',b.dataset.view===v);b.setAttribute('aria-pressed',String(b.dataset.view===v))})}
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view as View))
function theme(){document.documentElement.dataset.theme=dark?'dark':'light';$('#theme .ico').textContent=I[dark?'sun':'moon'];localStorage.setItem('msp-dark',String(dark));render()}
$('#theme').addEventListener('click',()=>{dark=!dark;theme()})
$('#focus').addEventListener('click',()=>{focus=!focus;document.body.classList.toggle('focus',focus);$('#focus').classList.toggle('active',focus)})
$('#zen').addEventListener('click',()=>{zen=!zen;document.body.classList.toggle('zen',zen);$('#zen').classList.toggle('active',zen);if(zen)editor.focus()})
$('#spell').addEventListener('click',()=>{spell=!spell;editor.spellcheck=spell;$('#spell').classList.toggle('active',spell)})
$('#math-engine').addEventListener('change',e=>{mathEngine=(e.target as HTMLSelectElement).value;render()})
$('#outline-toggle').addEventListener('click',()=>toc.classList.toggle('hidden'))
$('#side-toggle').addEventListener('click',()=>document.body.classList.toggle('side-closed'))
$<HTMLInputElement>('#title').addEventListener('input',e=>{title=(e.target as HTMLInputElement).value||'Untitled document';localStorage.setItem('msp-title',title)})
$('#open').addEventListener('click',()=>$<HTMLInputElement>('#file-input').click())
$<HTMLInputElement>('#file-input').addEventListener('change',async e=>{const f=(e.target as HTMLInputElement).files?.[0];if(!f)return;editor.value=await f.text();title=f.name.replace(/\.(md|markdown|txt)$/i,'');$<HTMLInputElement>('#title').value=title;localStorage.setItem('msp-title',title);editor.dispatchEvent(new Event('input'))})
$('#export-button').addEventListener('click',()=>$('#export-menu').classList.toggle('hidden'))
document.addEventListener('click',e=>{if(!(e.target as HTMLElement).closest('#export-button,#export-menu'))$('#export-menu').classList.add('hidden')})
function download(blob:Blob,ext:string){const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=`${title.replace(/[^\w -]/g,'').trim()||'document'}.${ext}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
async function exportAs(type:string){
 $('#export-menu').classList.add('hidden')
 if(type==='md')return download(new Blob([editor.value],{type:'text/markdown;charset=utf-8'}),'md')
 const previousEngine=mathEngine
 if(type==='html'||type==='pdf')mathEngine='mathjax'
 await render()
 const css='body{font:16px/1.7 Georgia,serif;color:#252923;max-width:820px;margin:50px auto;padding:0 24px}h1,h2,h3{line-height:1.25}h2{border-bottom:1px solid #ddd;padding-bottom:8px}pre{white-space:pre-wrap;background:#f3f4f1;padding:16px}code{background:#f3f4f1}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px}blockquote{border-left:3px solid #b98b66;padding-left:20px}.diagram-out{text-align:center}.diagram-title{font:11px sans-serif;color:#777}@page{margin:20mm}'
 const html=`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${css}</style></head><body>${preview.innerHTML}</body></html>`
 mathEngine=previousEngine
 if((type==='html'||type==='pdf')&&mathEngine!== 'mathjax')render()
 if(type==='html')return download(new Blob([html],{type:'text/html;charset=utf-8'}),'html')
 if(type==='pdf'){const w=window.open('','_blank');if(!w)return alert('Allow popups to export PDF.');w.document.write(html);w.document.close();setTimeout(()=>w.print(),400);return}
 if(type==='docx'){
  const children:Paragraph[]=[]
  for(const n of [...preview.children]){const tag=n.tagName.toLowerCase(),text=n.textContent?.trim()||'';if(!text)continue
   if(/^h[1-6]$/.test(tag))children.push(new Paragraph({text,heading:({h1:HeadingLevel.HEADING_1,h2:HeadingLevel.HEADING_2,h3:HeadingLevel.HEADING_3,h4:HeadingLevel.HEADING_4,h5:HeadingLevel.HEADING_5,h6:HeadingLevel.HEADING_6} as Record<string,(typeof HeadingLevel)[keyof typeof HeadingLevel]>)[tag]}))
   else if(tag==='ul'||tag==='ol'){for(const li of n.querySelectorAll(':scope > li'))children.push(new Paragraph({text:li.textContent?.trim()||'',bullet:tag==='ul'?{level:0}:undefined,numbering:tag==='ol'?{reference:'num',level:0}:undefined}))}
   else if(tag==='table'){for(const row of n.querySelectorAll('tr'))children.push(new Paragraph({children:[new TextRun({text:[...row.querySelectorAll('th,td')].map(c=>c.textContent?.trim()).join('  |  '),bold:row.parentElement?.tagName==='THEAD'})]}))}
   else children.push(new Paragraph({text,spacing:{after:160}}))
  }
  const doc=new Document({numbering:{config:[{reference:'num',levels:[{level:0,format:'decimal',text:'%1.',alignment:'left'}]}]},sections:[{children}]})
  return download(await Packer.toBlob(doc),'docx')
 }
}
document.querySelectorAll<HTMLButtonElement>('[data-export]').forEach(b=>b.onclick=()=>exportAs(b.dataset.export!))
document.addEventListener('keydown',e=>{const mod=e.ctrlKey||e.metaKey;if(e.key==='Escape'){document.body.classList.remove('zen');zen=false;$('#export-menu').classList.add('hidden')}if(!mod)return;const k=e.key.toLowerCase();if(k==='s'){e.preventDefault();exportAs('md')}else if(k==='o'){e.preventDefault();$<HTMLInputElement>('#file-input').click()}else if(k==='b'){e.preventDefault();format('bold')}else if(k==='i'){e.preventDefault();format('italic')}else if(k==='k'){e.preventDefault();format('link')}else if(k==='1'&&e.altKey){e.preventDefault();format('heading')}else if(k==='\\'){e.preventDefault();setView(view==='split'?'editor':'split')}else if(k==='j'&&e.shiftKey){e.preventDefault();$('#focus').click()}})
editor.addEventListener('keydown',e=>{if(e.key==='Tab'){e.preventDefault();replace('  ')}else if(e.key==='Enter'){const line=editor.value.slice(0,editor.selectionStart).split('\n').at(-1)||'',m=line.match(/^(\s*(?:[-*+] |\d+\. |> ))/);if(m&&line.trim()!==m[0].trim()){e.preventDefault();replace('\n'+m[1])}}})
setView(view);document.documentElement.dataset.theme=dark?'dark':'light';stats();render()
if('serviceWorker'in navigator&&import.meta.env.PROD)navigator.serviceWorker.register(import.meta.env.BASE_URL+'sw.js').catch(()=>{})
