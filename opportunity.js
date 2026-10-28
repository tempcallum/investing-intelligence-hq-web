// IIHQ Opportunity Radar v1: separate browser research module, strictly read-only.
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.95.0';
const BASE='https://ziuvbhwurlplpgjvnwwu.supabase.co';
const KEY='sb_publishable_DwjlTvNC2g6302A5T_8Z5Q_yGqANv_-';
const URL=BASE+'/functions/v1/iihq-opportunity-radar?action=overview';
const auth=createClient(BASE,KEY,{auth:{persistSession:true,storage:window.sessionStorage,
 autoRefreshToken:false,detectSessionInUrl:false}});
const el=id=>document.getElementById(id);
let working=false,lastUpdated=0;
const num=x=>x===null||x===undefined||!Number.isFinite(Number(x))?'—':Number(x).toFixed(2);
function uk(t){const d=new Date(t||'');return Number.isFinite(d.getTime())?
 d.toLocaleString('en-GB',{timeZone:'Europe/London',dateStyle:'medium',timeStyle:'short'})+' UK':'—';}
function card(r){
 const root=document.createElement('div');root.className='panel';root.style.padding='13px';
 const heading=document.createElement('div');heading.style.display='flex';heading.style.flexWrap='wrap';
 heading.style.gap='8px';heading.style.justifyContent='space-between';
 const name=document.createElement('b');name.textContent=String(r.symbol||'—')+
  ' · '+(r.source==='SOCIAL_CROSSOVER'?'social discovery':'liquid universe');
 const label=document.createElement('b');label.className=r.status==='STUDY_SETUP'?'green':'warning';
 label.textContent=String(r.status||'DATA_GAP').replaceAll('_',' ')+' · RESEARCH';
 heading.append(name,label);root.append(heading);
 const p=document.createElement('div');p.className='tiny';p.style.marginTop='8px';
 p.textContent='Research score '+String(r.score??'—')+'/100 (not profit probability) · IEX $'+num(r.price_usd)+
  ' · day '+num(r.day_change_pct)+'% · 30m '+num(r.momentum_30m_pct)+'%'+
  ' · spread '+num(r.spread_bps)+' bps · last trade '+uk(r.trade_at);
 root.append(p);
 if(r.status==='STUDY_SETUP'){
  const plan=document.createElement('div');plan.className='info';plan.style.marginTop='9px';
  plan.textContent='HYPOTHETICAL, NOT A FILL · entry $'+num(r.entry_idea_usd)+
   ' · suggested invalidation $'+num(r.stop_idea_usd)+
   ' · 2R target $'+num(r.target_idea_usd)+
   ' · £35 position · about £0.88 initial price risk before fees, slippage, gaps and FX.';
  root.append(plan);
 }
 const note=document.createElement('div');note.className='tiny';note.style.marginTop='8px';
 const reasons=Array.isArray(r.reasons)?r.reasons.slice(0,5).map(x=>String(x).replaceAll('_',' ').toLowerCase()):[];
 note.textContent='Data/risks: '+(reasons.length?reasons.join('; '):'baseline checks passed')+
  ' · events: '+String(r.company_event_state||'UNVERIFIED').replaceAll('_',' ')+
  ' · follow-up: '+(r.followup_state==='MEASURED'&&r.followup_pct!=null?
   num(r.followup_pct)+'% raw IEX move':String(r.followup_state||'NOT_ELIGIBLE').replaceAll('_',' ').toLowerCase())+
  ' · NO TRADE';
 root.append(note);
 const btn=document.createElement('button');btn.type='button';btn.className='secondary';
 btn.style.marginTop='9px';btn.textContent='OPEN COMPANY RESEARCH';
 btn.addEventListener('click',()=>{
  const symbol=String(r.symbol||'').toUpperCase();
  if(!/^[A-Z][A-Z0-9.]{0,7}$/.test(symbol))return;
  const input=el('addSymbol'),form=el('watchForm');
  if(input&&form){input.value=symbol;form.requestSubmit();}
  const research=el('nav')?.querySelector('button[data-tab="research"]');
  if(research)research.click();
 });
 root.append(btn);
 return root;
}
async function refresh(){
 if(working||!el('oppCandidates'))return;
 working=true;el('oppRefresh').disabled=true;
 try{
  const {data:{session}}=await auth.auth.getSession();
  if(!session)throw Error('OWNER_LOGIN_REQUIRED');
  const r=await fetch(URL,{method:'GET',cache:'no-store',
   headers:{Authorization:'Bearer '+session.access_token}});
  if(!r.ok)throw Error('RESEARCH_SOURCE_UNAVAILABLE');
  const data=await r.json(),run=data.session||{},items=Array.isArray(data.candidates)?data.candidates:[];
  el('oppState').textContent=String(run.last_state||'NOT RUN').replaceAll('_',' ');
  el('oppMeta').textContent='Last cloud check '+uk(run.last_attempt_at)+
   ' · Alpaca IEX partial US feed'+(run.last_reason?' · '+String(run.last_reason):'');
  el('oppChecked').textContent=String(run.checked??0);
  el('oppSetups').textContent=String(run.study_setups??0);
  el('oppWatching').textContent=String(run.watching??0);
  const root=el('oppCandidates');root.replaceChildren();
  for(const item of items.slice(0,12))root.append(card(item));
  if(!items.length)root.textContent='No market-hours candidates yet. No prices or scores are inferred.';
  lastUpdated=Date.now();
 }catch(e){
  const login=e instanceof Error&&e.message==='OWNER_LOGIN_REQUIRED';
  el('oppState').textContent=login?'OWNER LOGIN REQUIRED':'SOURCE UNAVAILABLE';
  el('oppMeta').textContent=login?'Sign in with your authorised owner account.':
    'Independent evidence cannot be verified currently.';
  for(const id of ['oppChecked','oppSetups','oppWatching'])el(id).textContent='—';
  el('oppCandidates').textContent='No validated shortlist available; nothing is automatically approved to trade.';
 }finally{working=false;el('oppRefresh').disabled=false;}
}
el('oppRefresh')?.addEventListener('click',()=>refresh().catch(()=>{}));
setInterval(()=>{
 if(!document.hidden&&!el('view-discover')?.classList.contains('hidden')&&Date.now()-lastUpdated>75000)
  refresh().catch(()=>{});
},30000);
