
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';
const url='https://ziuvbhwurlplpgjvnwwu.supabase.co', key='sb_publishable_DwjlTvNC2g6302A5T_8Z5Q_yGqANv_-';
const client=createClient(url,key,{auth:{persistSession:true,storage:window.sessionStorage,autoRefreshToken:true,detectSessionInUrl:true}});
const el=id=>document.getElementById(id);
function note(v,bad=false){el('authMessage').textContent=v;el('authMessage').className='note'+(bad?' danger':'')}
async function renderAuth(){
 const {data:{session}}=await client.auth.getSession();
 el('loginForm').classList.toggle('hidden',!!session);el('signedIn').classList.toggle('hidden',!session);
 if(session){el('userEmail').textContent=session.user.email||'Verified account';await refreshDesk(session.access_token)}
}
async function refreshDesk(token){
 try{const r=await fetch('https://ziuvbhwurlplpgjvnwwu.supabase.co/functions/v1/iihq-mobile?action=dashboard',{headers:{Authorization:'Bearer '+token},cache:'no-store'});
 const json=await r.json();if(!r.ok){if(json.error==='OWNER_NOT_ENROLLED')note('Your login works. Owner approval is still required before financial data can be displayed. Please tell ChatGPT you have signed in.',false);else note('Access is restricted. '+(json.error||'Please check your account.'),true);return}
 el('botState').textContent=json.settings.paper_enabled?'PAPER ARMED':'OFF / SAFE';
 el('journal').textContent=String(json.events.length)+' verified journal entries';
 el('statusPanel').textContent='Owner verified. Database connected. Alpaca paper API connection has not been configured yet.';
 el('portfolio').textContent='Awaiting Alpaca paper link';
 note('Private project access verified. Trading remains disabled.');
 }catch(_){note('Unable to reach the private data service.',true)}
}
el('passwordLogin').addEventListener('click',async()=>{
 const email=el('email').value.trim(),password=el('password').value;
 if(!email||!password){note('Please enter your email and password.',true);return}
 const {error}=await client.auth.signInWithPassword({email,password});
 if(error)note(error.message,true);else await renderAuth();
});
el('magicLogin').addEventListener('click',async()=>{
 const email=el('email').value.trim();if(!email){note('Enter your email first.',true);return}
 const {error}=await client.auth.signInWithOtp({email,options:{shouldCreateUser:false,emailRedirectTo:location.origin+location.pathname}});
 note(error?error.message:'If the account exists, an access link has been emailed. Your project must allow this redirect URL.',!!error)
});
el('signout').addEventListener('click',async()=>{await client.auth.signOut();location.reload()});
el('refresh').addEventListener('click',renderAuth);
client.auth.onAuthStateChange(()=>{setTimeout(renderAuth,0)});
renderAuth().catch(()=>note('Login service unavailable. Please try later.',true));
