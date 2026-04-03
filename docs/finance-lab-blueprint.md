# Finance Lab Blueprint

## Goal

`Finance Lab` must become a suite of contextual finance tools, not one engine with renamed presets.

Each tool must answer:

- what question it solves
- for whom it is useful
- what it measures
- what the user can change
- what the result means
- what visual explanation makes the result understandable

## Current Audit

### What is good now

- live sliders exist
- charts now update in real time
- the feature already has 4 reusable visual zones
- the interaction model is usable as a base

### What is weak now

- categories are still too close to the same engine
- inputs are not yet tool-specific
- outputs are not yet domain-specific
- charts are generic, not yet finance-native per category
- scenarios are still broad and shared

### Core conclusion

The next step is not more presets.

The next step is:

1. define each tool as a distinct product unit
2. define tool-specific metrics and inputs
3. define tool-specific visuals
4. reuse the shared interaction shell only after the tool logic is clear

## Shared Product Rules

All Finance Lab tools should follow the same product contract:

- `Objective`
- `Primary user`
- `Inputs`
- `Core outputs`
- `Scenarios`
- `Visuals`
- `Interpretation`
- `Real-world context`

Every tool should include:

- one default scenario
- one adverse scenario
- one crisis or stress scenario
- one real-world example block
- one plain-language interpretation block

## Tool Suite

## 1. Investments

### Objective

Evaluate whether a project, asset, portfolio, or acquisition creates value.

### Primary user

- finance student
- corporate finance student
- investment analysis student

### Must measure

- NPV / VPN
- IRR
- payback
- discounted payback
- terminal value
- expected return
- downside probability
- scenario delta

### User inputs

- initial investment
- cash flows
- growth rate
- discount rate
- horizon
- terminal growth
- volatility
- exposure size

### Required visuals

- DCF line chart
- waterfall from initial outlay to final value
- sensitivity heatmap
- return distribution curve
- scenario comparison panel

### Real-world contexts

- greenfield project
- acquisition
- portfolio allocation
- loan-backed investment

### MVP

- VPN
- payback
- DCF chart
- sensitivity on discount and growth
- return distribution

### V2

- IRR
- terminal value block
- waterfall
- scenario matrix

## 2. Financial Modeling

### Objective

Show how assumptions drive forecast outcomes.

### Primary user

- financial modeling student
- analyst
- banking student

### Must measure

- revenue growth
- cost growth
- margin path
- free cash flow path
- working capital effect
- leverage effect
- value sensitivity to drivers

### User inputs

- revenue growth
- margin
- capex
- working capital intensity
- debt / leverage
- tax rate
- cost of capital
- forecast horizon

### Required visuals

- driver tree
- forecast trend chart
- scenario comparison cards
- tornado chart
- assumption bridge

### Real-world contexts

- company model
- bank business line model
- budget vs forecast
- base/upside/downside planning

### MVP

- forecast lines
- margin sensitivity
- scenario comparison

### V2

- tornado chart
- driver dependency map
- bridge from assumptions to value

## 3. Financial Analysis

### Objective

Diagnose where performance is improving or weakening.

### Primary user

- finance student
- accounting/analysis student
- analyst

### Must measure

- profitability ratios
- liquidity ratios
- solvency ratios
- efficiency ratios
- growth rates
- benchmark variance

### User inputs

- revenue
- operating cost
- debt
- equity
- current assets/liabilities
- benchmark values
- period selection

### Required visuals

- ratio dashboard
- multi-period trend chart
- benchmark comparison bars
- variance decomposition

### Real-world contexts

- company financial statement review
- peer comparison
- quarter-over-quarter review

### MVP

- ratio groups
- trend chart
- benchmark delta

### V2

- peer banding
- decomposition tree
- alerting for weak ratios

## 4. Macroprudential

### Objective

Assess systemic financial vulnerabilities and resilience.

### Primary user

- macroprudential student
- banking regulation student
- financial stability student

### Must measure

- capital adequacy
- leverage
- liquidity coverage
- funding stability
- credit growth
- sector concentration
- household debt exposure
- corporate debt exposure
- NPL pressure
- capital buffer depletion

### User inputs

- capital buffer
- leverage
- LCR / NSFR-style liquidity inputs
- credit growth
- sector concentration
- refinancing gap
- shock size

### Required visuals

- systemic risk map
- sector risk heatmap
- capital buffer depletion chart
- contagion or spillover map
- stress ladder

### Real-world contexts

- property boom
- rapid credit growth
- funding market tightening
- systemic shock scenario

### MVP

- capital/liquidity/leverage block
- sector heatmap
- buffer depletion
- macro stress scenarios

### V2

- contagion network
- country/sector overlay
- multi-shock timeline

## 5. Monetary Policy

### Objective

Explain how policy shocks transmit through the economy and financial system.

### Primary user

- macro student
- monetary economics student
- central banking student

### Must measure

- policy rate
- inflation gap
- output / demand response
- credit tightening
- lending conditions
- yield curve shift
- exchange-rate effect
- asset-price effect

### User inputs

- policy rate
- inflation
- demand gap
- lending sensitivity
- market volatility
- transmission lag

### Required visuals

- transmission chain diagram
- yield curve chart
- inflation vs rate path
- lending channel response chart
- policy scenario comparison

### Real-world contexts

- tightening cycle
- easing cycle
- inflation shock
- stagflation
- credit crunch

### MVP

- rate/inflation path
- lending response
- yield curve shift

### V2

- asset-price channel
- exchange-rate channel
- lag animation by quarter

## 6. Financial Stability

### Objective

Show how fragile a financial system or institution becomes under stress.

### Primary user

- banking student
- risk student
- systemic risk student

### Must measure

- liquidity drain
- refinancing pressure
- leverage stress
- capital erosion
- market volatility shock
- confidence deterioration
- shock absorption capacity

### User inputs

- liquidity buffer
- capital buffer
- market volatility
- refinancing gap
- leverage
- confidence shock

### Required visuals

- liquidity drain timeline
- capital erosion chart
- vulnerability radar
- crisis escalation path

### Real-world contexts

- bank run
- market-wide stress
- sovereign shock spillover
- crisis simulation

### MVP

- vulnerability radar
- liquidity drain block
- capital erosion block

### V2

- escalation timeline
- multi-institution comparison
- linked crisis states

## Architecture Guidance

The frontend should separate:

- `tool category selector`
- `tool state`
- `tool metrics engine`
- `tool-specific charts`
- `tool-specific narrative blocks`

Recommended structure inside the live frontend logic:

- shared shell:
  - toolbar
  - KPI row
  - scenario selector
  - chart frame
  - interpretation block
- category-specific modules:
  - `investments`
  - `modeling`
  - `analysis`
  - `macroprudential`
  - `monetary`
  - `stability`

## Implementation Order

### Phase 1

- finish `Investments`
- make it reference quality
- add waterfall + sensitivity heatmap + IRR

### Phase 2

- build `Modeling`
- separate assumptions/forecast engine from investment valuation

### Phase 3

- build `Macroprudential`
- use real capital/liquidity/buffer logic and sector overlays

### Phase 4

- build `Monetary Policy`
- implement transmission logic and yield curve visuals

### Phase 5

- build `Analysis`
- ratio dashboard + benchmarks + trend decomposition

### Phase 6

- build `Financial Stability`
- crisis simulation and vulnerability mapping

## UX Rules

- every chart must change visibly when a user drags a control
- axes should stay stable unless rescaling is explicitly useful
- each tool should explain the result in plain language
- each tool should include at least one concrete finance use case
- avoid generic dashboards; every screen must answer a finance question

## Sources To Anchor The Tools

- BIS:
  - https://www.bis.org/bcbs/ccyb/
  - https://www.bis.org/bcbs/publ/d487.htm
- IMF:
  - https://www.imf.org/en/Publications/Departmental-Papers-Policy-Papers/Issues/2020/01/31/Stress-Testing-at-the-IMF-48825
  - https://www.imf.org/en/About/Factsheets/Financial-System-Soundness
  - https://www.imf.org/en/news/articles/2022/02/02/pr2220-the-imf-upgrades-financial-soundness-indicators
- ECB:
  - https://www.ecb.europa.eu/pub/economic-research/research_agenda/monetary_policy/html/index.et.html
  - https://www.ecb.europa.eu/press/key/date/2025/html/ecb.sp251021~a757abf975.en.html

## Next Step

The next concrete build step should be:

1. lock the final `Investments` spec
2. split `Modeling` into its own logic
3. redesign `Macroprudential` with system-specific indicators
