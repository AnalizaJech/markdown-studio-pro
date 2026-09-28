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
let previewFont = localStorage.getItem('msp-preview-font') || 'serif'
let editorFont = localStorage.getItem('msp-editor-font') || 'mono'
let title = localStorage.getItem('msp-title') || 'Untitled document'
let renderId = 0
const esc = (s:string) => s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))
const slug = (s:string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
const paths:Record<string,string> = {
 file:'<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h4M9 12h6M9 16h6"/>',
 upload:'<path d="M12 16V3m-4 4 4-4 4 4M4 17v4h16v-4"/>',
 download:'<path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4"/>',
 moon:'<path d="M20 15a8.5 8.5 0 0 1-11-11A8.5 8.5 0 1 0 20 15Z"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
 chevron:'<path d="m6 9 6 6 6-6"/>',
 editor:'<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L9 17l-4 1 1-4Z"/>',
 split:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16"/>',
 preview:'<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
 focus:'<path d="M4 4h5M4 4v5m16-5h-5m5 0v5M4 20h5m-5 0v-5m16 5h-5m5 0v-5M9 9h6v6H9z"/>',
 offline:'<path d="M8 3h8v6H8zM9 3V1m6 2V1M12 9v12m-5-4h10"/>',
 zen:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
 shrink:'<path d="M8 8 3 3m5 5V3M8 8H3m13 0 5-5m-5 5V3m0 5h5M8 16l-5 5m5-5v5m0-5H3m13 0 5 5m-5-5v5m0-5h5"/>',
 check:'<path d="m4 12 5 5L20 6"/>',
 link:'<path d="M10 13a5 5 0 0 0 7 .4l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7-.4l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
 list:'<path d="M9 6h12M9 12h12M9 18h12M3 6h.01M3 12h.01M3 18h.01"/>',
 table:'<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 10h18M3 15h18M9 4v16m6-16v16"/>',
 code:'<path d="m8 8-4 4 4 4m8-8 4 4-4 4M14 4l-4 16"/>',
 menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
 type:'<path d="M4 7V4h16v3M12 4v16m-4 0h8"/>',
 close:'<path d="M5 5l14 14M19 5 5 19"/>',
 print:'<path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v7H6z"/>'
}
const ico=(name:string,size=18)=>`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`
const btn=(id:string,label:string,iconName:string,extra='')=>`<button id="${id}" type="button" title="${label}" aria-label="${label}" ${extra}><span class="ico">${ico(iconName)}</span><span class="button-label">${label}</span></button>`
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<div class="app">
 <header class="topbar">
  <div class="brand"><div class="brand-mark">M<span>.</span></div><div class="brand-type">Markdown <b>Studio</b><sup>PRO</sup></div></div>
  <div class="file-name"><span class="file-icon">${ico('file')}</span><input id="title" aria-label="Document title" value="${esc(title)}"><span id="saved">✓ Saved locally</span></div>
  <div class="header-actions">${btn('open','Importar Markdown','upload')}${btn('theme','Modo oscuro','moon')}<span class="divider"></span><button id="export-button" class="primary" type="button" aria-haspopup="menu" aria-expanded="false">${ico('download',17)} <span>Exportar</span> ${ico('chevron',14)}</button></div>
  <input type="file" id="file-input" accept=".md,.markdown,.txt" hidden>
  <div id="export-menu" class="export-menu hidden" role="menu" aria-label="Exportar documento"><small>EXPORTAR DOCUMENTO</small><button type="button" role="menuitem" data-export="pdf">${ico('print')}<span><strong>PDF</strong><em>Imprimir o guardar</em></span></button><button type="button" role="menuitem" data-export="docx">${ico('file')}<span><strong>Documento Word</strong><em>Archivo .docx</em></span></button><button type="button" role="menuitem" data-export="html">${ico('code')}<span><strong>HTML</strong><em>Página independiente</em></span></button><button type="button" role="menuitem" data-export="md">${ico('download')}<span><strong>Markdown</strong><em>Archivo .md</em></span></button></div>
 </header>
 <div class="workspace">
  <aside id="sidebar"><div class="side-heading">WORKSPACE</div><div class="side-active">${ico('file',16)} &nbsp; Document <span>${ico('check',14)}</span></div><div class="outline-heading">OUTLINE <button id="outline-toggle" aria-label="Toggle outline">${ico('chevron',15)}</button></div><nav id="toc" aria-label="Table of contents"></nav><div class="sidebar-foot"><div>${ico('offline',15)} Available offline</div><small>STUDIO PRO <span>v1.0</span></small></div></aside>
  <main>
   <button id="side-toggle" type="button" aria-label="Ocultar panel lateral" title="Ocultar panel lateral" aria-controls="sidebar" aria-expanded="true">${ico('menu',18)}</button>
   <div class="workbar"><div class="segmented"><button data-view="editor">${ico('editor',15)} <span>Editor</span></button><button data-view="split">${ico('split',15)} <span>Dividida</span></button><button data-view="preview">${ico('preview',15)} <span>Vista previa</span></button></div><div class="work-actions">${btn('spell','Ortografía','check')}${btn('focus','Concentración','focus')}<button id="math-mobile" type="button" title="Motor matemático" aria-label="Motor matemático" aria-haspopup="menu" aria-expanded="false">∑</button>${btn('font-button','Tipografías','type','aria-haspopup="menu" aria-expanded="false"')}${btn('zen','Modo Zen','zen')}</div></div>
   <div class="toolbar"><div class="tool-set"><button data-format="heading" title="Encabezado">H₁</button><button data-format="bold" title="Negrita (Ctrl+B)"><b>B</b></button><button data-format="italic" title="Cursiva (Ctrl+I)"><i>I</i></button><button data-format="strike" title="Tachado"><s>S</s></button></div><span class="divider"></span><div class="tool-set"><button data-format="link" title="Enlace (Ctrl+K)">${ico('link')}</button><button data-format="list" title="Lista">${ico('list')}</button><button data-format="table" title="Tabla">${ico('table')}</button><button data-format="code" title="Código">${ico('code')}</button></div><span class="divider"></span><div class="tool-set"><button data-format="mermaid">Mermaid</button><button data-format="plantuml">PlantUML</button><button data-format="math">∑</button></div><button id="math-button" type="button" class="setting-button" aria-haspopup="menu" aria-expanded="false" title="Motor matemático"><span id="math-label">KaTeX</span>${ico('chevron',14)}</button></div>
   <div id="panes" class="panes"><section class="editor-pane"><div class="pane-head"><span><i></i> EDITOR</span><span>MARKDOWN</span></div><div class="edit-surface"><div id="lines"></div><textarea id="editor" aria-label="Markdown editor" spellcheck="true"></textarea></div></section><section class="preview-pane"><div class="pane-head"><span><i></i> PREVIEW</span><span>LIVE RENDER</span></div><div class="preview-scroll"><article id="preview" class="markdown-body"></article></div></section></div>
   <footer><div><span class="ready"><i></i> Ready</span><span id="words">0 words</span><span id="chars">0 characters</span><span id="reading">1 min read</span></div><div><span id="cursor">Ln 1, Col 1</span><span>Markdown</span><span>UTF-8</span></div></footer>
  </main>
 </div>
</div>
<button id="zen-exit" type="button" aria-label="Salir del modo Zen">${ico('shrink',18)}<span>Salir de Zen</span></button>
<div id="setting-popover" class="setting-popover hidden" role="menu"></div>`
const $ = <T extends Element=HTMLElement>(s:string) => document.querySelector<T>(s)!
const editor=$<HTMLTextAreaElement>('#editor'), preview=$('#preview'), panes=$('#panes'), toc=$('#toc')
$('.editor-pane .pane-head span').innerHTML=ico('editor',15)+' EDITOR'
$('.preview-pane .pane-head span').innerHTML=ico('preview',15)+' PREVIEW'
$('.ready').innerHTML=ico('check',13)+' Ready'
editor.value=localStorage.getItem('msp-text')??starter
const md=new MarkdownIt({html:false,linkify:true,typographer:true,breaks:true})
const baseFence=md.renderer.rules.fence!
md.renderer.rules.fence=(tokens,i,options,env,self)=>{
 const lang=tokens[i].info.trim().toLowerCase()
 if(lang==='mermaid'||lang==='plantuml') return `<div class="diagram" data-lang="${lang}" data-src="${encodeURIComponent(tokens[i].content)}"><div class="diagram-title">${lang.toUpperCase()}</div><div class="diagram-out"></div></div>`
 return baseFence(tokens,i,options,env,self)
}
md.renderer.rules.heading_open=(tokens,i,options,_env,self)=>{const line=tokens[i].map?.[0]??0;tokens[i].attrSet('id',slug(tokens[i+1]?.content||'')+'-'+line);tokens[i].attrSet('data-source-line',String(line));return self.renderToken(tokens,i,options)}
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
 src=src.replace(/\$\$([\s\S]+?)\$\$/g,(all:string,tex:string)=>{const i=items.push(`<div class="math-slot display" data-tex="${encodeURIComponent(tex.trim())}" data-display="1"></div>`)-1;return `MSPBLOCK${i}END`+'\n'.repeat(all.split('\n').length-1)})
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
 toc.innerHTML=[...preview.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6')].map(h=>`<a class="level-${h.tagName.toLowerCase()}" href="#${h.id}" data-source-line="${h.dataset.sourceLine}">${esc(h.textContent||'')}</a>`).join('')||'<span class="empty">No headings yet</span>'
 toc.querySelectorAll<HTMLAnchorElement>('a').forEach(a=>a.addEventListener('click',e=>{
  e.preventDefault()
  const line=Number(a.dataset.sourceLine),lines=editor.value.split('\n')
  const start=lines.slice(0,line).reduce((sum,text)=>sum+text.length+1,0)
  editor.setSelectionRange(start,start+(lines[line]?.length??0))
  const lineHeight=parseFloat(getComputedStyle(editor).lineHeight)
  editor.scrollTop=Math.max(0,line*lineHeight-editor.clientHeight/3)
  editor.scrollLeft=0;$('#lines').scrollTop=editor.scrollTop
  const heading=document.getElementById(a.hash.slice(1))
  const scroll=$('.preview-scroll')
  if(heading)scroll.scrollTop+=heading.getBoundingClientRect().top-scroll.getBoundingClientRect().top-24
  stats()
  toc.querySelectorAll('a').forEach(link=>link.classList.toggle('current',link===a))
  if(window.matchMedia('(max-width:800px)').matches)setSidebar(false)
 }))
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
function theme(){document.documentElement.dataset.theme=dark?'dark':'light';$('#theme .ico').innerHTML=ico(dark?'sun':'moon');localStorage.setItem('msp-dark',String(dark));render()}
$('#theme').addEventListener('click',()=>{dark=!dark;theme()})
$('#focus').addEventListener('click',()=>{focus=!focus;document.body.classList.toggle('focus',focus);$('#focus').classList.toggle('active',focus)})
function setZen(enabled:boolean){zen=enabled;document.body.classList.toggle('zen',zen);$('#zen').classList.toggle('active',zen);$('#zen').setAttribute('aria-pressed',String(zen));if(zen)editor.focus()}
$('#zen').addEventListener('click',()=>setZen(!zen))
$('#zen-exit').addEventListener('click',()=>setZen(false))
$('#spell').addEventListener('click',()=>{spell=!spell;editor.spellcheck=spell;$('#spell').classList.toggle('active',spell)})
type Popover = 'math'|'font'|null
let currentPopover:Popover=null
function closePopover(){currentPopover=null;$('#setting-popover').classList.add('hidden');$('#math-button').setAttribute('aria-expanded','false');$('#math-mobile').setAttribute('aria-expanded','false');$('#font-button').setAttribute('aria-expanded','false')}
function option(group:string,value:string,label:string,detail:string,chosen:boolean){return `<button type="button" class="setting-option ${chosen?'chosen':''}" role="menuitemradio" aria-checked="${chosen}" data-group="${group}" data-value="${value}"><span><strong>${label}</strong><em>${detail}</em></span>${chosen?ico('check',16):''}</button>`}
function openPopover(which:Exclude<Popover,null>,anchor:HTMLElement){
 if(currentPopover===which){closePopover();return}
 closeExport()
 currentPopover=which
 const pop=$('#setting-popover')
 pop.innerHTML=which==='math'
  ?`<div class="setting-heading">MOTOR MATEMÁTICO</div>${option('math','katex','KaTeX','Rápido y ligero',mathEngine==='katex')}${option('math','mathjax','MathJax','Mayor compatibilidad',mathEngine==='mathjax')}`
  :`<div class="setting-heading">TIPOGRAFÍA DE LECTURA</div>${option('preview','serif','Editorial','Serif clásica',previewFont==='serif')}${option('preview','sans','Moderna','Sans serif',previewFont==='sans')}${option('preview','mono','Monoespaciada','Estilo técnico',previewFont==='mono')}<div class="setting-heading secondary">TIPOGRAFÍA DEL EDITOR</div>${option('editor','mono','Código','Monoespaciada',editorFont==='mono')}${option('editor','sans','Clara','Sans serif',editorFont==='sans')}`
 pop.classList.remove('hidden')
 const rect=anchor.getBoundingClientRect()
 const width=238
 pop.style.left=`${Math.max(10,Math.min(rect.right-width,window.innerWidth-width-10))}px`
 pop.style.top=`${Math.min(rect.bottom+8,window.innerHeight-pop.offsetHeight-10)}px`
 $('#math-button').setAttribute('aria-expanded',String(which==='math'))
 $('#math-mobile').setAttribute('aria-expanded',String(which==='math'))
 $('#font-button').setAttribute('aria-expanded',String(which==='font'))
 pop.querySelectorAll<HTMLButtonElement>('[data-group]').forEach(b=>b.addEventListener('click',()=>{
  const group=b.dataset.group!,value=b.dataset.value!
  if(group==='math'){mathEngine=value;$('#math-label').textContent=value==='katex'?'KaTeX':'MathJax';render()}
  else if(group==='preview'){previewFont=value;localStorage.setItem('msp-preview-font',value);applyFonts()}
  else {editorFont=value;localStorage.setItem('msp-editor-font',value);applyFonts()}
  closePopover()
 }))
}
function applyFonts(){document.documentElement.dataset.previewFont=previewFont;document.documentElement.dataset.editorFont=editorFont}
$('#math-button').addEventListener('click',e=>openPopover('math',e.currentTarget as HTMLElement))
$('#math-mobile').addEventListener('click',e=>openPopover('math',e.currentTarget as HTMLElement))
$('#font-button').addEventListener('click',e=>openPopover('font',e.currentTarget as HTMLElement))
document.addEventListener('click',e=>{if(!(e.target as HTMLElement).closest('#setting-popover,#math-button,#math-mobile,#font-button'))closePopover()})
window.addEventListener('resize',closePopover)
$('#outline-toggle').addEventListener('click',()=>toc.classList.toggle('hidden'))
let sidebarOpen=!window.matchMedia('(max-width:800px)').matches
function setSidebar(open:boolean){sidebarOpen=open;if(open&&focus){focus=false;document.body.classList.remove('focus');$('#focus').classList.remove('active')}document.body.classList.toggle('side-closed',!open);document.body.classList.toggle('side-open',open);$('#side-toggle').setAttribute('aria-expanded',String(open));const label=open?'Ocultar panel lateral':'Mostrar panel lateral';$('#side-toggle').setAttribute('aria-label',label);$('#side-toggle').title=label}
$('#side-toggle').addEventListener('click',()=>setSidebar(!sidebarOpen))
setSidebar(sidebarOpen)
$<HTMLInputElement>('#title').addEventListener('input',e=>{title=(e.target as HTMLInputElement).value||'Untitled document';localStorage.setItem('msp-title',title)})
$('#open').addEventListener('click',()=>$<HTMLInputElement>('#file-input').click())
$<HTMLInputElement>('#file-input').addEventListener('change',async e=>{const f=(e.target as HTMLInputElement).files?.[0];if(!f)return;editor.value=await f.text();title=f.name.replace(/\.(md|markdown|txt)$/i,'');$<HTMLInputElement>('#title').value=title;localStorage.setItem('msp-title',title);editor.dispatchEvent(new Event('input'))})
function closeExport(){ $('#export-menu').classList.add('hidden');$('#export-button').setAttribute('aria-expanded','false') }
$('#export-button').addEventListener('click',()=>{const open=$('#export-menu').classList.toggle('hidden')===false;$('#export-button').setAttribute('aria-expanded',String(open));closePopover()})
document.addEventListener('click',e=>{if(!(e.target as HTMLElement).closest('#export-button,#export-menu'))closeExport()})
function download(blob:Blob,ext:string){const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=`${title.replace(/[^\w -]/g,'').trim()||'document'}.${ext}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
async function exportAs(type:string){
 closeExport()
 if(type==='md')return download(new Blob([editor.value],{type:'text/markdown;charset=utf-8'}),'md')
 const previousEngine=mathEngine
 if(type==='html'||type==='pdf')mathEngine='mathjax'
 await render()
 const exportFont=previewFont==='sans'?'Arial,sans-serif':previewFont==='mono'?'Consolas,monospace':'Georgia,serif'
 const css=`body{font:16px/1.7 ${exportFont};color:#252923;max-width:820px;margin:50px auto;padding:0 24px}h1,h2,h3{line-height:1.25}h2{border-bottom:1px solid #ddd;padding-bottom:8px}pre{white-space:pre-wrap;background:#f3f4f1;padding:16px}code{background:#f3f4f1}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px}blockquote{border-left:3px solid #b98b66;padding-left:20px}.diagram-out{text-align:center}.diagram-title{font:11px sans-serif;color:#777}@page{margin:20mm}`
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
document.addEventListener('keydown',e=>{const mod=e.ctrlKey||e.metaKey;if(e.key==='Escape'){setZen(false);closeExport();closePopover()}if(!mod)return;const k=e.key.toLowerCase();if(k==='s'){e.preventDefault();exportAs('md')}else if(k==='o'){e.preventDefault();$<HTMLInputElement>('#file-input').click()}else if(k==='b'){e.preventDefault();format('bold')}else if(k==='i'){e.preventDefault();format('italic')}else if(k==='k'){e.preventDefault();format('link')}else if(k==='1'&&e.altKey){e.preventDefault();format('heading')}else if(k==='\\'){e.preventDefault();setView(view==='split'?'editor':'split')}else if(k==='j'&&e.shiftKey){e.preventDefault();$('#focus').click()}})
editor.addEventListener('keydown',e=>{if(e.key==='Tab'){e.preventDefault();replace('  ')}else if(e.key==='Enter'){const line=editor.value.slice(0,editor.selectionStart).split('\n').at(-1)||'',m=line.match(/^(\s*(?:[-*+] |\d+\. |> ))/);if(m&&line.trim()!==m[0].trim()){e.preventDefault();replace('\n'+m[1])}}})
setView(view);applyFonts();document.documentElement.dataset.theme=dark?'dark':'light';stats();render()
if('serviceWorker'in navigator&&import.meta.env.PROD)navigator.serviceWorker.register(import.meta.env.BASE_URL+'sw.js').catch(()=>{})
