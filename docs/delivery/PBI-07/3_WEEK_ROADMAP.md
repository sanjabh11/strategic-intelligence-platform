# 3-Week Implementation Roadmap
**80/20 Rule Applied**: Build 20% → Get 80% Value

---

## 🚀 WEEK 1: Geopolitical Simulator Dashboard

### Why First?
- 9.0x ROI (highest return)
- 80% already built (backend complete)
- Unique market differentiator
- Competition-winning feature

### Day 1: Event Feed
**Goal**: Display live GDELT events

```typescript
// Create: src/components/GeopoliticalDashboard.tsx
- SSE connection to gdelt-stream
- Event cards (actors, game type, strategy)
- Auto-refresh every 15 minutes
```

**Files to create**:
- `src/components/GeopoliticalDashboard.tsx`
- `src/types/geopolitical.ts`

**Testing**: Verify events stream correctly

---

### Day 2: Timeline & Filters
**Goal**: 7-day trend visualization

```typescript
// Add to GeopoliticalDashboard.tsx
- Line chart: cooperation vs conflict trends
- Filters: region, game type, actors
- Date range selector
```

**Dependencies**: `recharts`, `date-fns`

**Testing**: Verify filters update chart

---

### Day 3: What-If Simulator
**Goal**: Interactive parameter adjustment

```typescript
// Create: WhatIfSimulator component
- Sliders: cooperation, military strength, economic ties
- Re-run Nash equilibrium with adjusted params
- Show outcome comparison (original vs simulated)
```

**Algorithm**: Adjust payoff matrix → recompute equilibrium

**Testing**: Verify simulation produces valid results

---

### Day 4: Historical Comparison
**Goal**: Show similar past scenarios

```typescript
// Create: HistoricalComparison component
- Query strategy_outcomes table
- Display World Bank data overlay
- Success rates from past 50 years
```

**Data sources**: 
- `strategy_outcomes` table
- `worldbank-sync` function

**Testing**: Verify historical data loads

---

### Day 5: Integration & Polish
**Goal**: Production-ready dashboard

- Add to App.tsx navigation
- Route: `/geopolitical-dashboard`
- Educational tooltips
- Mobile responsive
- Documentation

**Testing checklist**:
- [ ] SSE reconnects after disconnect
- [ ] All filters work
- [ ] Simulator accurate
- [ ] Mobile layout OK

**Deliverable**: ✅ Live Geopolitical Dashboard

---

## 🎯 WEEK 2: Bias Intervention Simulator

### Why Second?
- 8.75x ROI
- 80% backend complete
- Broad user appeal
- Gamified learning

### Day 6: Dilemma Scenarios
**Goal**: 10 interactive scenarios

```typescript
// Create: src/components/BiasSimulator.tsx
- 10 scenarios: career, investment, negotiation, etc.
- Multiple choice options
- Bias triggers: anchoring, sunk cost, overconfidence
- Immediate feedback
```

**Scenario structure**:
```typescript
{
  id: 'salary-negotiation-1',
  situation: '...',
  options: [
    { text: '...', biases: ['anchoring'], optimal: false },
    { text: '...', biases: [], optimal: true }
  ]
}
```

**Testing**: All 10 scenarios work correctly

---

### Day 7: Personalized Feedback
**Goal**: Analyze user patterns

```typescript
// Create: PersonalizedFeedback component
- Track decision history
- Identify bias frequency
- Show trends (improving/worsening)
- Compare to community averages
```

**Database**:
- `user_decision_history` table (or use existing `life_decisions`)

**Testing**: Feedback updates after each scenario

---

### Day 8: Progress & Gamification
**Goal**: Engagement features

```typescript
// Create: ProgressDashboard component
- Weekly bias score chart
- Milestone achievements
- Streak counter
- Badge collection
```

**Achievements**:
- Novice Debiaser (10 scenarios)
- Perfect Week (7 days @ 90%+)
- Bias Hunter (find all 6 major biases)

**Testing**: Achievements unlock correctly

---

### Day 9: Integration & Polish
**Goal**: Production-ready simulator

- Add to App.tsx: `/bias-simulator`
- Onboarding tutorial
- Mobile optimization
- Documentation

**SKIP**: AR overlays (Phase 4)

**Deliverable**: ✅ Interactive Bias Training

---

## 🎮 WEEK 3: Web Multiplayer Games

### Why Third?
- 6.0x ROI
- 90% backend complete
- Excellent teaching tool
- Social engagement

### Day 10: Multiplayer Lobby
**Goal**: Game selection UI

```typescript
// Create: src/components/MultiplayerLobby.tsx
- List available games
- Create new game
- Join existing game
- Game types: Prisoner's Dilemma, Public Goods, Stag Hunt
```

**Database query**:
```sql
SELECT * FROM multiplayer_sessions 
WHERE status = 'waiting'
ORDER BY created_at DESC;
```

**Testing**: Can create and join games

---

### Day 11: Game Interfaces
**Goal**: 3 playable games

```typescript
// Create game components
- PrisonersDilemma.tsx: 2-player cooperate/defect
- PublicGoodsGame.tsx: N-player contribution
- StagHunt.tsx: Coordination with risk
```

**UI elements**:
- Payoff matrix display
- Action buttons
- Waiting indicator
- Results display

**Testing**: All 3 games playable

---

### Day 12: Real-Time Sync
**Goal**: WebSocket synchronization

```typescript
// Add Supabase real-time
const subscription = supabase
  .channel(`session:${sessionId}`)
  .on('postgres_changes', { event: 'UPDATE', ... })
  .subscribe()
```

**Features**:
- Live action updates
- Player presence
- Disconnect handling

**Testing**: Multi-device sync works

---

### Day 13: Tournament System
**Goal**: Leaderboards & competition

```typescript
// Create: TournamentDashboard component
- Leaderboards: most cooperative, most strategic
- Match history
- Win/loss records
- ELO ratings (optional)
```

**Database**:
- Use `multiplayer_participants.num_successful_matches`
- Add computed fields for stats

**Testing**: Leaderboards update correctly

---

### Day 14: Classroom Mode
**Goal**: Teacher-led sessions

```typescript
// Add ClassroomMode features
- Teacher creates game
- Students join via code
- Teacher controls rounds
- Export results to CSV
```

**Teacher controls**:
- Start/pause game
- View all player actions
- Reset for new round
- Download results

**SKIP**: VR/AR (Phase 4)

**Deliverable**: ✅ Web Multiplayer Platform

---

## 📊 Success Metrics

### After Week 1
- [ ] Live GDELT dashboard accessible
- [ ] 20+ events displayed with strategies
- [ ] Interactive simulator working
- [ ] Historical data integrated

### After Week 2
- [ ] 10 bias scenarios playable
- [ ] Personalized feedback generated
- [ ] Progress tracking functional
- [ ] Gamification engaging

### After Week 3
- [ ] 3 games fully playable
- [ ] Real-time sync operational
- [ ] Tournament system active
- [ ] Classroom mode ready

### Final Platform Score
**Target**: 4.7 → 4.9/5.0 ✅

---

## ⛔ What We're NOT Building

### Legal/Regulatory Issues
- ❌ Prediction markets (gambling)
- ❌ DAO voting (unnecessary complexity)
- ❌ Payment integration (liability)

### Technology Constraints
- ❌ AR overlays (requires native app)
- ❌ VR tournaments (60+ days)
- ❌ Blockchain (over-engineering)

### Mission Alignment
- ✅ Focus: Learning platform
- ✅ Target: Students, researchers, teachers
- ✅ Delivery: Web-based (universal access)

---

## Resource Requirements

### Development
- **Team**: 1-2 developers
- **Time**: 14 working days (3 weeks)
- **Budget**: Minimal (use existing infrastructure)

### Dependencies
- Supabase (already configured)
- React + TypeScript (already setup)
- `recharts` for charts (install)
- `date-fns` for dates (install)

### No New Services Required
- ✅ GDELT: Already integrated
- ✅ World Bank: Already integrated
- ✅ Database: Already provisioned
- ✅ Edge functions: Already deployed

---

## Risk Mitigation

### Technical Risks
- **SSE Disconnect**: Auto-reconnect logic
- **WebSocket Scale**: Use Supabase real-time (handles scale)
- **Data Volume**: Limit to last 7 days (performance)

### Scope Risks
- **Feature Creep**: Stick to 3-week plan, no additions
- **AR/VR Pressure**: Defer to Phase 4, show web version first
- **Perfect vs Done**: Ship weekly, iterate based on feedback

### Timeline Risks
- **Week 1 Delay**: Cut historical comparison to Day 4 only
- **Week 2 Delay**: Reduce scenarios from 10 to 5
- **Week 3 Delay**: Launch with 2 games instead of 3

---

## Go/No-Go Decision Points

### After Week 1
**Go if**: Dashboard displays events, simulator works  
**No-Go if**: SSE connection unstable, major bugs

**Mitigation**: Fallback to polling instead of SSE

---

### After Week 2
**Go if**: Scenarios playable, feedback generates  
**No-Go if**: Bias detection inaccurate, UX confusing

**Mitigation**: Simplify to 5 scenarios, improve tooltips

---

### After Week 3
**Go if**: 2+ games playable, real-time sync works  
**No-Go if**: WebSocket unreliable, game logic broken

**Mitigation**: Launch with 1 game, add others iteratively

---

## Success Criteria

### Must Have (Week 1)
- ✅ Live event feed
- ✅ Basic simulation
- ✅ Working frontend

### Should Have (Week 2)
- ✅ Interactive dilemmas
- ✅ Personalized feedback
- ✅ Progress tracking

### Nice to Have (Week 3)
- ✅ Multiplayer working
- ✅ Real-time sync
- ✅ Tournament features

### Won't Have (Phase 4+)
- ⛔ AR overlays
- ⛔ VR interfaces
- ⛔ DAO voting
- ⛔ Prediction markets

---

## Approval & Next Steps

### Required Approvals
1. [ ] Stakeholder review of feature priorities
2. [ ] Budget approval (minimal, mostly time)
3. [ ] Timeline acceptance (3 weeks)

### Immediate Actions
1. **Week 1 Day 1**: Start GeopoliticalDashboard.tsx
2. **Daily Standups**: 15-min progress check
3. **Weekly Demos**: Show progress to stakeholders

### Launch Plan
- **Soft Launch**: Week 1 (dashboard only)
- **Beta Launch**: Week 2 (dashboard + bias sim)
- **Full Launch**: Week 3 (all 3 features)

---

**READY TO BEGIN?** Approve and start Week 1, Day 1 immediately.
