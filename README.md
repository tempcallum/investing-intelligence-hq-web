# Investing Intelligence HQ — Mobile Markets Terminal

The public GitHub Pages website is a **market-research interface**. It opens immediately, with no sign-in required.

Website: https://tempcallum.github.io/investing-intelligence-hq-web/

## Current modules (prototype)
- Market terminal shell: interactive ticker watchlist, instrument workspace, London/New York clocks
- Research area: links to official SEC EDGAR filings for selected instruments
- Strategy laboratory: status of offline-tested strategy code in private project
- Paper trading: **Alpaca not yet connected**, private account view locked
- Risk/audit: protected user-only project status, trading remains disabled

**No market quotes are available yet:** prices, intraday charts, volume and P&L remain blank by design. Never treat the interface as a live or profitable trading system.

## Security
- This repository is PUBLIC. It contains only HTML/CSS and browser JavaScript plus a browser-safe Supabase publishable key.
- The private source and order engine must stay in `tempcallum/Investing-intelligence-hq`.
- The private Supabase Investing Intelligence HQ project handles authentication and authorisation. Create one Auth user to access private account data; avoid entering login details in chat.
- No Robinhood integration, no Alpaca credentials and no live or paper order submission endpoints.
- The website shares a GitHub Pages origin with Afon Valley Hub. Use a distinct hostname before any live brokerage execution is introduced.

Not affiliated with JPMorgan Chase or Bloomberg. No return guarantees.
