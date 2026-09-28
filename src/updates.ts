export function registerUpdates(base:string, save:()=>void) {
  if (!('serviceWorker' in navigator)) return
  let registration:ServiceWorkerRegistration
  let requested=false, reloading=false, composing=false
  let controlled=Boolean(navigator.serviceWorker.controller)
  let checking:Promise<void>|undefined
  const notice=document.createElement('div')
  notice.className='update-notice hidden'
  notice.setAttribute('role','status')
  const text=document.createElement('span')
  text.textContent='Nueva versión disponible'
  const button=document.createElement('button')
  button.type='button';button.textContent='Actualizar'
  notice.append(text,button);document.body.append(notice)
  document.addEventListener('compositionstart',()=>{composing=true})
  document.addEventListener('compositionend',()=>{composing=false})
  const show=()=>{notice.classList.remove('hidden')}
  const reload=()=>{
    if(reloading)return
    try {save()} catch {
      requested=false;button.disabled=false
      text.textContent='No se pudo guardar. Exporta tu documento antes de actualizar.'
      show();return
    }
    reloading=true;location.reload()
  }
  button.addEventListener('click',()=>{
    if(composing){text.textContent='Termina de escribir para actualizar.';return}
    try {save()} catch {
      text.textContent='No se pudo guardar. Exporta tu documento antes de actualizar.'
      return
    }
    if(registration.waiting) {
      requested=true;button.disabled=true
      text.textContent='Actualizando…'
      registration.waiting.postMessage({type:'SKIP_WAITING'})
    } else reload()
  })
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    // First installation and updates activated in another tab must not reload.
    if(requested)reload()
    else if(controlled)show()
    controlled=true
  })
  const check=()=>{
    if(!registration||checking||!navigator.onLine)return
    checking=registration.update().then(()=>{if(registration.waiting)show()})
      .catch(()=>{}).finally(()=>{checking=undefined})
  }
  navigator.serviceWorker.register(base+'sw.js',{updateViaCache:'none'}).then(reg=>{
    registration=reg
    if(reg.waiting)show()
    reg.addEventListener('updatefound',()=>{
      const worker=reg.installing
      worker?.addEventListener('statechange',()=>{
        if(worker.state==='installed'&&navigator.serviceWorker.controller)show()
      })
    })
    check()
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')check()})
    window.addEventListener('pageshow',check)
    window.addEventListener('online',check)
  }).catch(()=>{})
}
