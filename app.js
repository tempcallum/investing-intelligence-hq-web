
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';

const PROJECT_URL='https://ziuvbhwurlplpgjvnwwu.supabase.co';
const PUBLISHABLE_KEY='sb_publishable_DwjlTvNC2g6302A5T_8Z5Q_yGqANv_-';
const API=PROJECT_URL+'/functions/v1/iihq-mobile?action=dashboard';
const ALPACA_API=PROJECT_URL+'/functions/v1/iihq-alpaca-read?action=';
const client=createClient(PROJECT_URL,PUBLISHABLE_KEY,{auth:{persistSession:true,storage:window.sessionStorage,autoRefreshToken:true,detectSessionInUrl:true}});
const $=id=>document.getElementById(id);

const DEFAULT=['AAPL','MSFT','NVDA','AMZN','META','GOOGL','TSLA','JPM','SPY','QQQ'];
const NAMES={AAPL:'Apple Inc.',MSFT:'Microsoft Corporation',NVDA:'NVIDIA Corporation',AMZN:'Amazon.com Inc.',META:'Meta Platforms Inc.',GOOGL:'Alphabet Inc.',TSLA:'Tesla Inc.',JPM:'JPMorgan Chase & Co.',SPY:'SPDR S&P 500 ETF',QQQ:'Invesco QQQ Trust',AMD:'Advanced Micro Devices',PLTR:'Palantir Technologies','BRK.B':'Berkshire Hathaway'};
const TABS={markets:'Market overview',research:'Company intelligence',strategies:'Strategy laboratory',paper:'Paper trading desk',risk:'Risk & audit',ops:'Market opening checks'};
let selected='AAPL',signedIn=false,ownerApproved=false;
const autoScannerMap=new Map();
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
 $('strategyTicker').textContent=s;
 $('backtestSymbol').textContent=s;
 $('riskTicker').textContent=s;
 $('riskVerdict').textContent='NO TRADE · NOT CHECKED';
 $('riskSummary').textContent='Run the data-quality checks for '+s+'; no trading can occur.';
 $('riskCheckList').textContent='Awaiting market-readiness data for '+s+'.';
 $('backtestStatus').textContent='Historical result not run for '+s+'. Select a lookback and run the test.';
 for(const id of ['btTrainReturn','btTestReturn','btTestTrades','btTestDD','btTestWin','btTestPF'])$(id).textContent='—';
 $('btCoverage').textContent='Awaiting historical data for '+s+'.';
 $('btTrades').replaceChildren();$('btChart').replaceChildren();
 $('btCostStress').replaceChildren();const tip=document.createElement('div');tip.className='tiny';tip.textContent='Select the ticker, then run a new backtest to compare trading-cost scenarios.';$('btCostStress').append(tip);
 $('signalStatus').textContent='NOT SCANNED';
 $('signalExplanation').textContent='Run a new 9/21 research scan for '+s+'.';
 $('scanSma9').textContent='—';$('scanSma21').textContent='—';
 $('scanSamples').textContent='—';$('scanBarTime').textContent='—';
 if(autoScannerMap.has(s))displaySavedSignal(autoScannerMap.get(s));
 $('instrumentFeedTag').textContent=ownerApproved?'IEX / LOADING':'IEX / LOCKED';
 $('secLink').href='https://www.sec.gov/edgar/search/#/q='+encodeURIComponent(s);
 renderWatch();
 if(ownerApproved) loadMarketData().catch(()=>{});
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
   if(tab==='strategies'&&ownerApproved)refreshSavedScans().catch(()=>{});
   if(tab==='risk'&&ownerApproved)refreshReadiness().catch(()=>{});
   if(tab==='ops')refreshOpeningCheck().catch(()=>{});
 });
}
function updateClocks(){
 const now=new Date();
 const london=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',hour12:false}).format(now);
 const ny=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',hour12:false}).format(now);
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',weekday:'short',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(now);
 const part=(type)=>parts.find(p=>p.type===type)?.value||'';
 const day=part('weekday'),hour=Number(part('hour')),minute=Number(part('minute'));
 const weekday=['Mon','Tue','Wed','Thu','Fri'].includes(day);
 const regular=weekday&&(hour*60+minute>=570)&&(hour*60+minute<960);
 $('marketClock').textContent='LONDON '+london+' · NEW YORK '+ny+' · US CASH SESSION '+(regular?'REGULAR HOURS*':'CLOSED / OUTSIDE REGULAR HOURS')+' · *EXCHANGE HOLIDAYS NOT CHECKED';
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
  if(!session){ownerApproved=false;$('instrumentFeedTag').textContent='IEX / LOCKED';$('paperEquity').textContent='ACCOUNT LOCKED';$('paperMessage').textContent='Sign in to inspect private trading status. Alpaca is not connected.';return}
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
   note('Private owner access verified. No trade execution is enabled.');
   await refreshAlpaca();
   await refreshSavedScans();
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


// READ-ONLY Alpaca PAPER provider bridge. Never writes orders, even from private account.
let marketRequestId=0;
const currency=v=>Number.isFinite(Number(v))?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(v)):'—';
function clearNode(el){el.replaceChildren();}
function buildRow(left,right){
  const row=document.createElement('div');row.className='line';
  const label=document.createElement('span');label.textContent=left;
  const value=document.createElement('b');value.textContent=right;
  row.append(label,value);return row;
}
async function alpacaGet(action,session,params=''){
  const response=await fetch(ALPACA_API+encodeURIComponent(action)+params,{
    method:'GET',cache:'no-store',headers:{Authorization:'Bearer '+session.access_token}});
  const payload=await response.json();
  if(!response.ok){
    const error=new Error(payload.error||'DATA_UNAVAILABLE');
    error.code=payload.error;error.status=response.status;error.details=payload;
    throw error;
  }
  return payload;
}
async function refreshAlpaca(){
  const {data:{session}}=await client.auth.getSession();if(!session||!ownerApproved)return;
  const tasks=await Promise.allSettled([
    alpacaGet('account',session),alpacaGet('positions',session),alpacaGet('orders',session)
  ]);
  const account=tasks[0],positions=tasks[1],orders=tasks[2];
  if(account.status!=='fulfilled'){
    const error=account.reason;
    $('paperEquity').textContent='PAPER LINK PENDING';
    $('paperMessage').textContent=error.code==='ALPACA_PAPER_CREDENTIALS_MISSING'
      ?'Server-side paper credentials are incomplete. Add Alpaca_key and Alpaca_secret to the investing Supabase Edge Function secrets.'
      :error.code==='ALPACA_CREDENTIALS_REJECTED'?'Alpaca rejected the paper key pair. Check that the credentials came from PAPER trading and match one another.'
      :error.code==='ALPACA_RATE_LIMITED'?'Alpaca free data limit reached. Try again later.'
      :'The Alpaca paper service has not returned verified account data.';
    $('feedBadge').textContent='PAPER FEED PENDING';
    return;
  }
  const item=account.value.account||{};
  $('paperEquity').textContent=currency(item.equity);
  $('paperMessage').textContent='ALPACA PAPER · VERIFIED '+new Date(account.value.fetched_at).toLocaleString('en-GB')+
    ' · CASH '+currency(item.cash)+' · BUYING POWER '+currency(item.buying_power);
  if(positions.status==='fulfilled'){
    const target=$('positionBlotter');clearNode(target);
    const data=positions.value.positions||[];
    if(!data.length)target.textContent='No open paper positions.';
    for(const p of data.slice(0,15))target.append(buildRow(String(p.symbol)+' · '+String(p.qty??'—')+' shares',
      currency(p.market_value)+' / P&L '+currency(p.unrealized_pl)));
  }
  if(orders.status==='fulfilled'){
    const target=$('orderBlotter');clearNode(target);
    const data=orders.value.orders||[];
    if(!data.length)target.textContent='No paper orders recorded yet.';
    for(const o of data.slice(0,12))target.append(buildRow(
      String(o.symbol)+' · '+String(o.side).toUpperCase()+' '+String(o.qty??''),
      String(o.status).toUpperCase()));
  }
  await loadMarketData();
}
async function loadMarketData(){
  if(!ownerApproved)return;
  const request=++marketRequestId;
  const {data:{session}}=await client.auth.getSession();if(!session)return;
  const syms=[selected,...watchlist.filter(s=>s!==selected)].slice(0,10);
  try{
    const [snapshot,bars]=await Promise.all([
      alpacaGet('market',session,'&symbols='+encodeURIComponent(syms.join(','))),
      alpacaGet('bars',session,'&symbol='+encodeURIComponent(selected))
    ]);
    if(request!==marketRequestId)return;
    $('feedBadge').textContent='IEX SOURCE CONNECTED';
    $('feedRefreshAt').textContent='LAST API CHECK '+new Date(snapshot.fetched_at).toLocaleString('en-GB')+' · AUTO UPDATE APPROX. 20 SEC · IEX ONLY';
    $('watchFooter').textContent='Watchlist stored on this device · prices sourced from Alpaca IEX, not the full US market';
    const items=snapshot.snapshots||{};
    const stocks=$('watchStocks').querySelectorAll('.price');
    const ribbon=$('tickerbar').querySelectorAll('.ticker');
    for(let i=0;i<watchlist.length;i++){
      const q=items[watchlist[i]];
      const val=q?.trade??q?.day_close;
      if(i<stocks.length)stocks[i].textContent=val==null?'—':currency(val);
      if(i<ribbon.length){const piece=ribbon[i].querySelector('span');
        const tag=ribbon[i].querySelector('em');
        if(piece)piece.textContent=val==null?'—':currency(val);
        if(tag)tag.textContent=val==null?'NO IEX TRADE':'IEX';
      }
    }
    const quote=items[selected];
    const price=quote?.trade??quote?.day_close;
    if(price==null)$('feedBadge').textContent='IEX NO RECENT PRINT';
    document.querySelector('.instrument .pricebig').textContent=price==null?'— USD':currency(price);
    const stamp=quote?.trade_time||quote?.quote_time||null;
    const tradeAgeMin=stamp?(Date.now()-new Date(stamp).getTime())/60000:NaN;
    const fresh=Number.isFinite(tradeAgeMin)&&tradeAgeMin>=-5&&tradeAgeMin<=15;
    $('instrumentFeedTag').textContent=price==null?'IEX / NO PRINT':!stamp?'IEX / TIME UNKNOWN':fresh?'IEX / RECENT':'IEX / STALE';
    if(price!=null&&!fresh)$('feedBadge').textContent='IEX LAST AVAILABLE';
    $('quoteSource').textContent='IEX (one US venue) · last observed '+(stamp?new Date(stamp).toLocaleString('en-GB'):'no timestamp provided')+
      ' · May be stale outside trading hours · Not full consolidated US tape.';
    const dayChange=quote?.day_close!=null&&quote?.prev_close>0?(quote.day_close/quote.prev_close-1)*100:null;
    const metrics=document.querySelectorAll('.instrument .metric .v');
    if(metrics[0])metrics[0].textContent=dayChange==null?'—':dayChange.toFixed(2)+'% (IEX)';
    if(metrics[1])metrics[1].textContent=quote?.day_volume==null?'—':Number(quote.day_volume).toLocaleString('en-GB');
    if(metrics[2])metrics[2].textContent='—';
    drawBars(bars.bars||[],bars.symbol);
  }catch(_){
    if(request!==marketRequestId)return;
    $('feedBadge').textContent='IEX FEED UNAVAILABLE';
    $('feedRefreshAt').textContent='MARKET FEED CHECK FAILED · TRY REFRESH IEX';
    $('instrumentFeedTag').textContent='IEX / UNAVAILABLE';
    $('watchFooter').textContent='Watchlist stored on this device · market-data service unavailable';
    $('quoteSource').textContent='IEX market quotes are currently unavailable. No prices are simulated.';
    document.querySelector('.instrument .pricebig').textContent='— USD';
    drawBars([],selected);
  }
}

// Free Alpaca Basic offers single-exchange IEX data. REST snapshots, not tick streaming.
const MARKET_REFRESH_MS=20000;
const marketTabVisible=()=>$('view-markets')&&!$('view-markets').classList.contains('hidden');
setInterval(()=>{
 if(ownerApproved&&!document.hidden&&marketTabVisible())loadMarketData().catch(()=>{});
},MARKET_REFRESH_MS);
document.addEventListener('visibilitychange',()=>{
 if(ownerApproved&&!document.hidden&&marketTabVisible())loadMarketData().catch(()=>{});
});
$('refreshQuotes').addEventListener('click',()=>{
 if(!ownerApproved)return overlay(true);
 loadMarketData().catch(()=>{});
});

function drawBars(bars,symbol){
  const chart=$('priceChart');clearNode(chart);
  const good=bars.filter(b=>Number.isFinite(Number(b.c))&&b.c>0&&b.t).slice(-100);
  if(good.length<2){const t=document.createElement('div');t.textContent='No verified five-minute IEX bars available for this period.';t.className='muted m12';chart.append(t);return}
  const values=good.map(b=>Number(b.c)),lo=Math.min(...values),hi=Math.max(...values);
  const range=Math.max(hi-lo,hi*0.002,0.001);
  const width=620,height=220,points=values.map((v,i)=>{
    const x=20+i/(values.length-1)*(width-40),y=height-18-((v-lo)/range)*(height-36);
    return x.toFixed(1)+','+y.toFixed(1);
  }).join(' ');
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
  svg.setAttribute('viewBox','0 0 '+width+' '+height);svg.setAttribute('role','img');
  svg.setAttribute('aria-label',symbol+' recent five minute IEX price bars');
  svg.style.width='100%';svg.style.height='100%';
  const line=document.createElementNS(ns,'polyline');
  line.setAttribute('fill','none');line.setAttribute('stroke','#87e4b5');
  line.setAttribute('stroke-width','2.6');line.setAttribute('stroke-linecap','round');line.setAttribute('stroke-linejoin','round');
  line.setAttribute('points',points);svg.append(line);chart.append(svg);
  const info=document.createElement('small');info.textContent='IEX 5-minute bars · Last sample '+new Date(good.at(-1).t).toLocaleString('en-GB');
  info.style.position='absolute';info.style.left='12px';info.style.bottom='5px';info.style.background='#10191bcc';chart.append(info);
}


// Server-side strategy uses the same private tested signal engine.
// This frontend never requests or submits an order.
let strategyScanRequest=0;
const STRATEGY_EXPLANATIONS={
  BUY:'A bullish 9/21 SMA crossover was detected on completed, contiguous, sufficiently recent IEX candles. This is an unvalidated research signal, not a trade instruction.',
  HOLD:'No new bullish crossover on the latest completed candles. HOLD is a scanner state, not a recommendation to hold an actual position.',
  NO_DATA:'Not enough complete five-minute IEX candles were returned. No assessment is possible.',
  GAPPED_DATA:'One or more five-minute candles are missing or irregular. The scanner has deliberately rejected the sample.',
  STALE_DATA:'The latest completed candle is too old for an intraday decision. This is normal outside regular market hours.',
  INVALID_DATA:'A candle contains a non-finite or invalid close. No assessment is possible.'
};
async function scanStrategy(){
  if(!ownerApproved){
    $('signalStatus').textContent='PRIVATE ACCESS REQUIRED';
    $('signalExplanation').textContent='Sign in and complete the sole-owner check before requesting private Alpaca data.';
    overlay(true);return;
  }
  const {data:{session}}=await client.auth.getSession();
  if(!session)return overlay(true);
  const ticker=selected,scanId=++strategyScanRequest;
  $('signalStatus').textContent='SCANNING '+ticker+'…';
  $('signalExplanation').textContent='Checking most recent completed 5-minute IEX candles; no orders will be placed.';
  $('scanStrategy').disabled=true;
  try{
    const data=await alpacaGet('signal',session,'&symbol='+encodeURIComponent(ticker));
    if(scanId!==strategyScanRequest||selected!==ticker)return;
    const status=data.signal||'UNAVAILABLE';
    $('signalStatus').textContent=status==='BUY'?'CANDIDATE CROSSOVER':status==='HOLD'?'NO NEW CROSSOVER':status.replaceAll('_',' ');
    $('signalExplanation').textContent=STRATEGY_EXPLANATIONS[status]||'A signal evaluation could not be completed.';
    const fmt=n=>Number.isFinite(n)?new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:4}).format(n):'—';
    $('scanSma9').textContent=fmt(data.sma9);$('scanSma21').textContent=fmt(data.sma21);
    $('scanSamples').textContent=String(data.sample_bars??'—');
    $('scanBarTime').textContent=data.bar_time?new Date(data.bar_time).toLocaleString('en-GB'):'—';
  }catch(_){
    if(scanId!==strategyScanRequest)return;
    $('signalStatus').textContent='FEED UNAVAILABLE';
    $('signalExplanation').textContent='The private IEX scanner could not retrieve a valid result. No order was placed.';
    $('scanSma9').textContent='—';$('scanSma21').textContent='—';$('scanSamples').textContent='—';$('scanBarTime').textContent='—';
  }finally{if(scanId===strategyScanRequest)$('scanStrategy').disabled=false}
}
$('scanStrategy').addEventListener('click',()=>scanStrategy().catch(()=>{}));


// Read-only server-side automatic scanner status. No orders are submitted.

let lastAutoFetch=0;
const timeUK=t=>{if(!t)return '—';const d=new Date(t);return Number.isFinite(d.getTime())?d.toLocaleString('en-GB')+' UK/browser time':'—'};
function displaySavedSignal(r){
 if(!r)return;
 const explanations={
   BUY:'Latest saved automatic research scan detected a candidate bullish crossover; NOT an order.',
   HOLD:'Latest saved automatic scan found no new upward crossover. No action taken.',
   STALE_DATA:'Latest saved automatic scan rejected stale data. No action taken.',
   GAPPED_DATA:'Latest saved automatic scan rejected missing or irregular five-minute candles.',
   NO_DATA:'Latest saved automatic scan did not have enough completed candles.',
   INVALID_DATA:'Latest saved automatic scan rejected invalid market data.'
 };
 $('signalStatus').textContent=r.status==='BUY'?'AUTO / CANDIDATE CROSSOVER':'AUTO / '+String(r.status||'UNKNOWN').replaceAll('_',' ');
 $('signalExplanation').textContent=(explanations[r.status]||'Saved scanner result')+' · Checked '+timeUK(r.checked_at);
 const fmt=x=>x==null||!Number.isFinite(Number(x))?'—':Number(x).toFixed(3);
 $('scanSma9').textContent=fmt(r.sma9);
 $('scanSma21').textContent=fmt(r.sma21);
 $('scanSamples').textContent='AUTO';
 $('scanBarTime').textContent=timeUK(r.bar_time);
}
async function refreshSavedScans(){
 if(!ownerApproved){$('autoScannerStatus').textContent='Sign in to read saved automatic results.';return}
 const {data:{session}}=await client.auth.getSession();
 if(!session)return;
 try{
   const data=await alpacaGet('scans',session);
   autoScannerMap.clear();
   const rows=Array.isArray(data.results)?data.results:[];
   const zone=$('autoScannerList');zone.replaceChildren();
   if(!rows.length){
     $('autoScannerStatus').textContent='Schedule active · awaiting first completed US market-hours scan';
     const line=document.createElement('div');line.className='tiny';
     line.textContent='No saved evaluations yet. Opening Safari is not required for the scheduled service.';
     zone.append(line);
   }else{
     const newest=rows.reduce((best,x)=>!best||Date.parse(x.checked_at)>Date.parse(best.checked_at)?x:best,null);
     $('autoScannerStatus').textContent='Saved scans: '+rows.length+' shares · most recent '+timeUK(newest.checked_at);
     for(const row of rows){
       autoScannerMap.set(row.symbol,row);
       const line=document.createElement('div');line.className='line';
       line.style.padding='8px 0';const sym=document.createElement('span');sym.textContent=row.symbol;
       const status=document.createElement('b');status.textContent=String(row.status||'NO DATA').replaceAll('_',' ');
       line.append(sym,status);zone.append(line);
     }
     const focus=autoScannerMap.get(selected);if(focus)displaySavedSignal(focus);
   }
   lastAutoFetch=Date.now();
 }catch(_){
   $('autoScannerStatus').textContent='Saved scanner status temporarily unavailable; manual check remains optional.';
 }
}
setInterval(()=>{if(ownerApproved&&!document.hidden&&!$('view-strategies').classList.contains('hidden'))refreshSavedScans().catch(()=>{})},60000);


// Historical research is on demand to respect free Alpaca API limits.
// No broker trade endpoint exists. This only reads historical data.
let pendingBacktest=0;
function btChartRender(points){
  const target=$('btChart');target.replaceChildren();
  const valid=points.filter(p=>Number.isFinite(Number(p.equity))&&p.day);
  if(valid.length<2){const msg=document.createElement('div');msg.className='tiny';msg.textContent='Too few complete sessions for a meaningful equity curve.';target.append(msg);return}
  const values=valid.map(p=>Number(p.equity)),low=Math.min(...values,10000),high=Math.max(...values,10000);
  const span=Math.max(high-low,10),W=640,H=175;
  const coords=values.map((n,i)=>[
    20+i/(values.length-1)*(W-40),
    H-20-(n-low)/span*(H-40)
  ]);
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
  svg.setAttribute('viewBox','0 0 '+W+' '+H);svg.style.width='100%';svg.style.height='100%';
  svg.setAttribute('role','img');svg.setAttribute('aria-label','Out-of-sample simulated equity curve');
  const rule=document.createElementNS(ns,'line');
  const baselineY=H-20-(10000-low)/span*(H-40);
  for(const [k,v] of [['x1',20],['x2',W-20],['y1',baselineY],['y2',baselineY]])rule.setAttribute(k,String(v));
  rule.setAttribute('stroke','#708e89');rule.setAttribute('stroke-dasharray','5 5');svg.append(rule);
  const line=document.createElementNS(ns,'polyline');
  line.setAttribute('fill','none');line.setAttribute('stroke','#87e4b5');line.setAttribute('stroke-width','2.5');
  line.setAttribute('points',coords.map(p=>p.map(x=>x.toFixed(1)).join(',')).join(' '));
  svg.append(line);target.append(svg);
}
function btFmtPct(x){
 return x===null||!Number.isFinite(Number(x))?'—':(Number(x)>=0?'+':'')+Number(x).toFixed(2)+'%';
}
function btMoney(x){
 return x===null||!Number.isFinite(Number(x))?'—':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(x));
}
function btPF(x){
 return x===null||!Number.isFinite(Number(x))?'N/A':Number(x).toFixed(2)+'×';
}
async function runBacktest(){
 const id=++pendingBacktest,symbol=selected,days=Number($('backtestDays').value);
 if(!ownerApproved){
   $('backtestStatus').textContent='Sign in as the authorised account owner to access historical Alpaca IEX data.';
   overlay(true);return;
 }
 const {data:{session}}=await client.auth.getSession();
 if(!session)return overlay(true);
 $('backtestStatus').textContent='Fetching and checking historical IEX candles for '+symbol+' · '+days+' calendar days. This can take several requests.';
 $('runBacktest').disabled=true;
 try{
   const data=await alpacaGet('backtest',session,'&symbol='+encodeURIComponent(symbol)+'&days='+days);
   if(pendingBacktest!==id||selected!==symbol)return;
   const research=data.backtest,train=research.train,oos=research.out_of_sample;
   $('btTrainReturn').textContent=btFmtPct(train.net_return_pct);
   $('btTestReturn').textContent=btFmtPct(oos.net_return_pct);
   $('btTestTrades').textContent=String(oos.trade_count);
   $('btTestDD').textContent=Number.isFinite(oos.max_drawdown_pct)?Number(oos.max_drawdown_pct).toFixed(2)+'%':'—';
   $('btTestWin').textContent=btFmtPct(oos.win_rate_pct);
   $('btTestPF').textContent=btPF(oos.profit_factor);
   const stress=$('btCostStress');stress.replaceChildren();
   for(const scenario of research.cost_sensitivity_bps_per_side||[]){
      const line=document.createElement('div');line.className='line';
      const left=document.createElement('span');left.textContent=String(scenario.bps_per_side)+' bps / side'+(scenario.bps_per_side===6?' · BASELINE':'');
      const right=document.createElement('b');right.textContent=btFmtPct(scenario.out_of_sample_return_pct)+' · '+scenario.out_of_sample_trades+' trades';
      line.append(left,right);stress.append(line);
   }

   const sufficient=oos.sample_sufficient===true;
   $('backtestStatus').textContent=sufficient?'RESEARCH SAMPLE AVAILABLE — NOT VALIDATED FOR TRADING':
     'INSUFFICIENT EVIDENCE — LATER PERIOD HAS ONLY '+oos.trade_count+' COMPLETED TRADES ACROSS '+oos.sessions+' SESSIONS. NO STRATEGY EDGE ESTABLISHED.';
   $('btCoverage').textContent=research.observed_bars+' IEX bars · '+research.eligible_sessions+' eligible sessions · '+
     research.excluded_incomplete_days+' excluded incomplete sessions · '+data.pages+' API page(s) · '+
     'train '+(train.start_day||'—')+' to '+(train.end_day||'—')+' · later '+(oos.start_day||'—')+' to '+(oos.end_day||'—');
   btChartRender(oos.equity_curve||[]);
   const container=$('btTrades');container.replaceChildren();
   const trades=oos.trade_preview||[];
   if(!trades.length){const d=document.createElement('div');d.textContent='No completed hypothetical trades in the later period.';container.append(d);}
   for(const trade of trades.slice(0,8)){
      const line=document.createElement('div');line.className='line';
      const lhs=document.createElement('span');lhs.textContent=trade.day+' · '+trade.reason+' · '+trade.qty+' sh';
      const rhs=document.createElement('b');rhs.textContent=btMoney(trade.net_pnl);
      line.append(lhs,rhs);container.append(line);
   }
   $('btDisclosure').textContent='Research-only simulation. Costs assumed 6 bps per side; $10,000 independent starting capital per segment, 10% position cap. '+
      'Historical IEX 5-minute bars, next-candle open, split adjusted, intraday flattening. '+
      'OHLC-low drawdown estimate may miss adverse ticks. Trades shown are NOT actual Alpaca fills. No future performance implied.';
 }catch(e){
   if(pendingBacktest!==id)return;
   $('backtestStatus').textContent=e.code==='INSUFFICIENT_IEX_HISTORY'?
     'Not enough historical IEX bars returned for a reliable test. Try another ticker or longer period.':
     e.code==='HISTORICAL_DATA_TRUNCATED'?'Historical dataset exceeded the bounded page limit; no incomplete backtest was returned.':
     e.code==='ALPACA_RATE_LIMITED'?'Free Alpaca API request allowance reached. Retry later.':
     'Historical market-data service did not complete the test. No trades have been submitted.';
 }finally{if(pendingBacktest===id)$('runBacktest').disabled=false}
}
$('runBacktest').addEventListener('click',()=>runBacktest().catch(()=>{}));


// Multi-source readiness checklist. GET only; cannot return permission to place an order.
let riskRequestId=0;
async function refreshReadiness(){
 if(!ownerApproved){
   $('riskVerdict').textContent='NO TRADE · OWNER ACCESS REQUIRED';
   $('riskSummary').textContent='Sign in to inspect private Alpaca paper-data quality checks.';
   overlay(true);return;
 }
 const {data:{session}}=await client.auth.getSession();
 if(!session)return;
 const symbol=selected,id=++riskRequestId;
 $('riskVerdict').textContent='NO TRADE · CHECKING';
 $('riskSummary').textContent='Reading Alpaca PAPER account, clock, position, asset and IEX snapshot sources. No orders are sent.';
 $('refreshRisk').disabled=true;
 try{
   const r=await alpacaGet('readiness',session,'&symbol='+encodeURIComponent(symbol));
   if(riskRequestId!==id||selected!==symbol)return;
   $('riskVerdict').textContent='NO TRADE · RESEARCH ONLY';
   $('riskPasses').textContent=String(r.summary?.passed??'—');
   $('riskBlocks').textContent=String(r.summary?.blocked??'—');
   $('riskUnknown').textContent=String(r.summary?.unknown??'—');
   $('riskSummary').textContent='Checked '+new Date(r.assessed_at).toLocaleString('en-GB')+
     ' · '+r.source_fetched_count+'/'+r.source_requested_count+' independent API requests answered · trade execution disabled.';
   const zone=$('riskCheckList');zone.replaceChildren();
   for(const item of r.checks||[]){
     const block=document.createElement('div');block.className='panel';
     block.style.padding='12px';block.style.borderRadius='7px';
     const top=document.createElement('div');top.className='row';
     const label=document.createElement('b');label.style.fontSize='12px';label.textContent=item.label;
     const status=document.createElement('b');status.className=item.status==='PASS'?'green':item.status==='BLOCK'?'red':'warning';
     status.textContent=item.status;
     top.append(label,status);
     const details=document.createElement('div');details.className='tiny';
     details.style.marginTop='6px';details.textContent=item.observation;
     const provenance=document.createElement('div');provenance.className='muted mono';
     provenance.style.fontSize='10px';provenance.style.marginTop='7px';provenance.textContent='SOURCE · '+item.source;
     block.append(top,details,provenance);zone.append(block);
   }
   $('riskCaveats').textContent=(r.caveats||[]).join(' ')+' No automatic or manual order functionality is available through this interface.';
 }catch(_){
   if(riskRequestId!==id)return;
   $('riskVerdict').textContent='NO TRADE · DATA UNAVAILABLE';
   $('riskSummary').textContent='The private assessment could not be completed. Unknown information is a block, not an approval.';
   $('riskPasses').textContent='—';$('riskBlocks').textContent='—';$('riskUnknown').textContent='—';
   $('riskCheckList').textContent='No verified market-readiness data has been returned.';
 }finally{if(riskRequestId===id)$('refreshRisk').disabled=false}
}
$('refreshRisk').addEventListener('click',()=>refreshReadiness().catch(()=>{}));
setInterval(()=>{if(ownerApproved&&!document.hidden&&!$('view-risk').classList.contains('hidden'))refreshReadiness().catch(()=>{})},60000);

let opsRequestId=0;
function opsTime(t){
 if(!t)return '—';
 const d=new Date(t);
 return Number.isFinite(d.getTime())?d.toLocaleString('en-GB',{timeZone:'Europe/London',dateStyle:'medium',timeStyle:'short'})+' UK':'—';
}
async function refreshOpeningCheck(){
 if(!ownerApproved){$('opsMarket').textContent='OWNER LOGIN REQUIRED';$('opsMessage').textContent='Sign in to access the private infrastructure checks.';overlay(true);return;}
 const {data:{session}}=await client.auth.getSession();if(!session)return;
 const id=++opsRequestId;$('opsRefresh').disabled=true;$('opsMarket').textContent='CHECKING…';
 try{
  const data=await alpacaGet('preflight',session);
  if(id!==opsRequestId)return;
  const clock=data.broker_market_clock,heartbeat=data.scheduler||{};
  $('opsMarket').textContent=clock?(clock.is_open?'US MARKET OPEN':'US MARKET CLOSED'):'CLOCK UNAVAILABLE';
  $('opsNextOpen').textContent=clock?'NEXT OPEN '+opsTime(clock.next_open)+' · CLOSE '+opsTime(clock.next_close):'Broker session timing unavailable';
  $('opsHeartbeat').textContent=heartbeat.recent_successful_contact?'RECENT / CONFIRMED':'STALE OR NOT OBSERVED';
  $('opsLastRun').textContent=opsTime(heartbeat.last_invocation_at);
  $('opsOutcome').textContent=String(heartbeat.last_state||'NOT OBSERVED')+' · '+String(heartbeat.last_reason||'—');
  $('opsSymbols').textContent=String(heartbeat.last_scanned_count??'—')+' passed, '+String(heartbeat.last_error_count??'—')+' failed';
  $('opsBroker').textContent=data.broker_paper_account_connected?'PAPER CONNECTED':'UNVERIFIED';
  $('opsStored').textContent=data.stored_results==null?'UNKNOWN':String(data.stored_results);
  $('opsOrders').textContent=data.paper_orders_enabled?'UNEXPECTED FLAG — STOP':'OFF / NO ORDER ROUTE';
  $('opsMessage').textContent=heartbeat.recent_successful_contact&&data.broker_paper_account_connected&&!data.paper_orders_enabled?
   'Infrastructure is responding. Await actual market-hours price data; no execution approval is given.':
   'One or more operational checks needs attention. Do not infer that market data or scanning is ready.';
 }catch(_){if(id!==opsRequestId)return;$('opsMarket').textContent='CHECK FAILED';$('opsHeartbeat').textContent='UNVERIFIED';$('opsMessage').textContent='Could not verify the backend. No readiness claim is possible.';}
 finally{if(id===opsRequestId)$('opsRefresh').disabled=false;}
}
$('opsRefresh').addEventListener('click',()=>refreshOpeningCheck().catch(()=>{}));
setInterval(()=>{if(ownerApproved&&!document.hidden&&!$('view-ops').classList.contains('hidden'))refreshOpeningCheck().catch(()=>{});},60000);
