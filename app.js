
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';

const PROJECT_URL='https://ziuvbhwurlplpgjvnwwu.supabase.co';
const PUBLISHABLE_KEY='sb_publishable_DwjlTvNC2g6302A5T_8Z5Q_yGqANv_-';
const API=PROJECT_URL+'/functions/v1/iihq-mobile?action=dashboard';
const client=createClient(PROJECT_URL,PUBLISHABLE_KEY,{auth:{persistSession:true,storage:window.sessionStorage,autoRefreshToken:true,detectSessionInUrl:true}});
const $=id=>document.getElementById(id);

const DEFAULT=['AAPL','MSFT','NVDA','AMZN','META','GOOGL','TSLA','JPM','SPY','QQQ'];
const NAMES={AAPL:'Apple Inc.',MSFT:'Microsoft Corporation',NVDA:'NVIDIA Corporation',AMZN:'Amazon.com Inc.',META:'Meta Platforms Inc.',GOOGL:'Alphabet Inc.',TSLA:'Tesla Inc.',JPM:'JPMorgan Chase & Co.',SPY:'SPDR S&P 500 ETF',QQQ:'Invesco QQQ Trust',AMD:'Advanced Micro Devices',PLTR:'Palantir Technologies',BRK.B:'Berkshire Hathaway'};
const TABS={markets:'Market overview',research:'Company intelligence',strategies:'Strategy laboratory',paper:'Paper trading desk',risk:'Risk & audit'};
let selected='AAPL',signedIn=false,ownerApproved=false;
function symbols(){
 try{
   const s=JSON.parse(localStorage.getItem('iihq.watchlist.v1')||'null');
   if(Array.isArray(s)&&s.length>0)return s.filter(x=>typeof x==='string'&&/^[A-Z][A-Z0-9.]{0,7}$/.test(x)).slice(0,30);
 }catch(_){}
 return DEFAULT.slice();
}
let watchlist=symbols();if(!watchlist.includes(selected))selected=watchlist[0];
function saveSymbols(){try{localStorage.setItem('iihq.watchlist.v1',JSON.stringify(watchlist));}catch(_){}}
function setSymbol(s){
 if(!watchlist.includes(s))return;selected=s;
 $('chosenSymbol').textContent=s;$('chosenName').textContent=NAMES[s]||'Watchlist instrument — details not connected';
 $('researchSymbol').textContent=s;
 $('secLink').href='https://www.sec.gov/edgar/search/#/q='+encodeURIComponent(s);
 renderWatch();
}
function renderWatch(){
 $('watchCount').textContent=String(watchlist.length).padStart(2,'0')+' SYMBOLS';
 const area=$('watchStocks');area.replaceChildren();
 const bar=$('tickerbar');bar.replaceChildren();
 for(const s of watchlist){
   const row=document.createElement('button');row.className='stock'+(s===selected?' active':'');row.type='button';row.setAttribute('aria-pressed',String(s===selected));
   const symbol=document.createElement('span');symbol.className='sym';symbol.textContent=s;
   const name=document.createElement('span');name.className='name';name.textContent=NAMES[s]||'Custom ticker';
   const price=document.createElement('span');price.className='price';price.textContent='—';row.append(symbol,name,price);row.addEventListener('click',()=>setSymbol(s));area.append(row);
   const ticker=document.createElement('span');ticker.className='ticker';
   const title=document.createElement('b');title.textContent=s;const value=document.createElement('span');value.textContent='—';const tag=document.createElement('em');tag.textContent='NO FEED';ticker.append(title,value,tag);bar.append(ticker);
 }
}
$('watchForm').addEventListener('submit',e=>{
 e.preventDefault();const input=$('addSymbol');const sym=input.value.trim().toUpperCase();
 if(!/^[A-Z][A-Z0-9.]{0,7}$/.test(sym)){input.setCustomValidity('Use a US ticker, up to 8 letters/numbers.');input.reportValidity();return}
 input.setCustomValidity('');
 if(!watchlist.includes(sym)){if(watchlist.length>=30){alert('Watchlist maximum is 30 symbols for this starter version.');return}watchlist.push(sym);saveSymbols()}
 input.value='';setSymbol(sym);
});
$('addSymbol').addEventListener('input',e=>e.target.setCustomValidity(''));
$('researchNext').addEventListener('click',()=>{const i=watchlist.indexOf(selected);setSymbol(watchlist[(i+1)%watchlist.length]);});
for(const button of $('nav').querySelectorAll('button')){
 button.addEventListener('click',()=>{
   const tab=button.dataset.tab;
   for(const b of $('nav').querySelectorAll('button'))b.classList.toggle('active',b===button);
   for(const key of Object.keys(TABS))$('view-'+key).classList.toggle('hidden',key!==tab);
   $('viewTitle').textContent=TABS[tab];
 });
}
function updateClocks(){
 const now=new Date();
 const london=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',hour12:false}).format(now);
 const ny=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',hour12:false}).format(now);
 $('marketClock').textContent='LONDON '+london+' · NEW YORK '+ny+' · EXCHANGE HOLIDAYS NOT CHECKED';
}
updateClocks();setInterval(updateClocks,60000);
renderWatch();setSymbol(selected);

function note(t,error=false){$('authMessage').textContent=t;$('authMessage').className='msg'+(error?' error':'')}
function overlay(open){$('authOverlay').classList.toggle('hidden',!open)}
$('accountOpen').addEventListener('click',()=>overlay(true));$('authClose').addEventListener('click',()=>overlay(false));
$('authOverlay').addEventListener('click',e=>{if(e.target===$('authOverlay'))overlay(false)});
document.addEventListener('keydown',e=>{if(e.key==='Escape')overlay(false)});
$('paperLogin').addEventListener('click',()=>overlay(true));
async function syncAuth(){
  const {data:{session}}=await client.auth.getSession();
  signedIn=!!session;
  $('loginForm').classList.toggle('hidden',signedIn);
  $('signedIn').classList.toggle('hidden',!signedIn);
  $('accountOpen').textContent=signedIn?'ACCOUNT / SIGNED IN':'ACCOUNT / LOCKED';
  if(!session){ownerApproved=false;$('paperEquity').textContent='ACCOUNT LOCKED';$('paperMessage').textContent='Sign in to inspect private trading status. Alpaca is not connected.';return}
  $('userEmail').textContent=session.user.email||'Authenticated user';
  await refreshDesk(session.access_token);
}
async function refreshDesk(token){
 try{
   const r=await fetch(API,{headers:{Authorization:'Bearer '+token},cache:'no-store'});
   const data=await r.json();
   if(!r.ok){
     ownerApproved=false;
     if(data.error==='OWNER_NOT_ENROLLED'){
       note('Your login succeeded, but this account is not yet enrolled as the authorised owner. Ask ChatGPT to complete the owner check.');
       $('paperEquity').textContent='OWNER APPROVAL PENDING';
       $('paperMessage').textContent='Account is authenticated but cannot read private portfolio records yet.';
     }else if(data.error==='OWNER_ONLY'){
       note('This account is not authorised to access the private investing database.',true);
       $('paperEquity').textContent='ACCESS RESTRICTED';
     }else note('Private-data connection is unavailable: '+(data.error||'request rejected'),true);
     return;
   }
   ownerApproved=true;
   const enabled=data.settings?.paper_enabled===true;
   $('riskEnabled').textContent=enabled?'YES — PAPER FLAG':'NO';
   $('auditEntries').textContent=String(data.events?.length??0)+' RECENT';
   $('paperEquity').textContent='AWAITING ALPACA PAPER LINK';
   $('paperMessage').textContent='Owner verified. The Alpaca paper account has not yet been linked and virtual balance has not been retrieved.';
   $('orderBlotter').textContent=(data.events?.length??0)+' recent internal event(s) available in database. No verified brokerage orders have been connected.';
   $('riskDetails').textContent='Private database connection verified. The order executor is not deployed and live-money trading is unsupported.';
   note('Private owner access verified. Trading remains unavailable in this version.');
 }catch(_){
   note('Could not load private data service. Check the connection and try again.',true);
 }
}
$('passwordLogin').addEventListener('click',async()=>{
 const email=$('email').value.trim(),password=$('password').value;
 if(!email||!password){note('Enter your investing dashboard email and password.',true);return}
 const {error}=await client.auth.signInWithPassword({email,password});
 if(error){note(error.message,true);return}
 $('password').value='';await syncAuth();
});
$('magicLogin').addEventListener('click',async()=>{
 const email=$('email').value.trim();if(!email){note('Enter your email address first.',true);return}
 const {error}=await client.auth.signInWithOtp({email,options:{shouldCreateUser:false,emailRedirectTo:location.origin+location.pathname}});
 note(error?error.message:'If an authorised user exists, a sign-in email has been sent. This website URL must be added to Supabase Auth redirect settings.',!!error);
});
$('signout').addEventListener('click',async()=>{
 await client.auth.signOut();ownerApproved=false;note('Signed out.');await syncAuth();
});
$('paperRefresh').addEventListener('click',syncAuth);
$('refresh').addEventListener('click',syncAuth);
client.auth.onAuthStateChange(()=>{setTimeout(()=>syncAuth().catch(()=>note('Authentication status could not be refreshed.',true)),0)});
syncAuth().catch(()=>note('Sign-in service not available.',true));
