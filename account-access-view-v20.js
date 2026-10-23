/* Account access UI; credentials exist only in the submitted form/SDK operation. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.BTCAccountAccessViewV20=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function render(s){
 const button=(action,text)=>'<button type="'+(action==='sign-out'?'button':'submit')+'" class="secondary" data-access-action="'+action+'" '+(s.busy?'disabled':'')+'>'+text+'</button>';
 let html='<section class="surface" aria-label="Acesso à conta"><h3>Acesso à conta</h3>';
 if(!s.enabled)return html+'<p>A conta online está em preparação. Podes continuar a usar a Demo neste navegador.</p></section>';
 if(s.error)html+='<p class="error" role="alert">Não foi possível concluir a operação. Verifica os dados e a ligação e volta a tentar.</p>';
 if(s.busy)html+='<p role="status">A comunicar com o serviço de conta…</p>';
 if(s.phase==='signed-in')return html+'<p>Sessão iniciada. Os dados da conta são consultados no servidor.</p>'+button('sign-out','Terminar sessão em todos os dispositivos')+'</section>';
 if(s.phase==='recovery')return html+'<p>Define uma nova password. Depois, volta a entrar na tua conta.</p><form class="form-grid" data-access-form="password"><div class="field wide"><label>Nova password<input name="password" type="password" autocomplete="new-password" required minlength="10" maxlength="128"></label></div><div class="field wide"><label>Confirmar password<input name="confirmation" type="password" autocomplete="new-password" required minlength="10" maxlength="128"></label></div>'+button('password','Guardar nova password')+'</form>'+button('sign-out','Cancelar e terminar sessão')+'</section>';
 return html+'<form class="form-grid" data-access-form="sign-in"><div class="field wide"><label>Email<input name="email" type="email" autocomplete="username" required maxlength="254"></label></div><div class="field wide"><label>Password<input name="password" type="password" autocomplete="current-password" required maxlength="128"></label></div>'+button('sign-in','Entrar')+'</form><p>Usa uma conta com email confirmado. O registo e o envio de emails de recuperação ainda aguardam a validação do serviço.</p></section>';
}
function mount({element,controller,mountAccount}){
 let panel=null,unsubscribed=false,lastPhase=null;
 function paint(state){
  if(unsubscribed)return;
  // Updating busy/status must not destroy a live financial review or focused form.
  if(lastPhase===state.phase&&element.querySelector('[data-access-shell]')){
   const shell=element.querySelector('[data-access-shell]');shell.innerHTML=render(state);
   return;
  }
  panel?.destroy();panel=null;lastPhase=state.phase;
  element.innerHTML='<div data-access-shell>'+render(state)+'</div><div data-access-account></div>';
  if(state.phase==='signed-in')panel=mountAccount(element.querySelector('[data-access-account]'));
 }
 const unsubscribe=controller.subscribe(paint);
 async function submit(event){const form=event.target;if(!form.matches('[data-access-form]'))return;event.preventDefault();if(controller.state().busy)return;const password=form.elements.password?.value,confirmation=form.elements.confirmation?.value,email=form.elements.email?.value;form.reset();try{if(form.dataset.accessForm==='password')await controller.updatePassword({password,confirmation});else await controller.signIn({email,password});}catch{/* Controller publishes a sanitized status. */}}
 async function click(event){const button=event.target.closest('[data-access-action="sign-out"]');if(!button||!element.contains(button)||controller.state().busy)return;try{await controller.signOut();}catch{/* Private financial state has already been cleared. */}}
 element.addEventListener('submit',submit);element.addEventListener('click',click);
 return Object.freeze({destroy(){unsubscribed=true;unsubscribe();panel?.destroy();element.removeEventListener('submit',submit);element.removeEventListener('click',click);element.innerHTML='';}});
}
return Object.freeze({render,mount});
});
