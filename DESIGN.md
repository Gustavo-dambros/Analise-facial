# FaceMax Design System — Apple UI Adapted

> Apple UI Design System – Verified: 8pt Grid, SF Pro Typography, Material-Depth, Natural Spring Motion

## Brand
- **Primary:** `#D4AF37` Gold, `#000000` Black, `#0a0a0a` card-bg
- **Typography:** Urbanist (SF Pro fallback), Playfair Display, Alpino — headlines `-0.022em` tracking, body `-0.011em`
- **Mode:** Dark-first (Light available via skill fallback)

## 8pt Grid
- Gaps: 8/16/24/32 (gap-2/4/6/8), paddings p-4 (16) / p-6 (24), heights h-11 (44)
- Radii: button 12, card/modal 20, badge 8
- Targets: min 44px

## Material
- Dark: `rgba(28,28,30,0.7) blur 20 saturate 180 border 0.5px rgba(255,255,255,0.15)`
- Gold: `rgba(10,10,10,0.72) blur 20 saturate 180 border 0.5px rgba(212,175,55,0.12)`

## Motion
- Standard: `300ms cubic-bezier(0.25,0.1,0.25,1)`
- Spring: `cubic-bezier(0.4,0,0.2,1.4)` for modals
- Hover scale 1.02, active 0.96

## Components
- Button: h-11 px-6 radius 12 shadow, focus 3px gold
- Sidebar: apple-material-gold, sticky, 16px gaps
- Cards: staggered entrance 50ms

## Dashboard Scope
- Applied to: DashboardLayout, AppSidebar, FaceAnalyzer, Progress, EvaluationDetail, PhotoGuide
- Skill: apple-ui-design (Tamoza4) — Light default adapted to Dark
