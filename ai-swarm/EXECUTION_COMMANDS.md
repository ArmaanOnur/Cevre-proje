# 🚀 ÇEVRE AI SWARM - EXECUTION COMMANDS

## Quick Start

```bash
# 1. Start Swarm Evolution
./ai-swarm/scripts/start-swarm.sh

# 2. Or use npm commands
npm run swarm:evolve
```

---

## PHASE T0: SYSTEM UNDERSTANDING (MANDATORY FIRST STEP)

```bash
# Execute System Understanding Phase
npm run swarm:phase-t0

# Or manually:
cd ai-swarm
node orchestrator/phase-t0-executor.js
```

**What happens:**
1. System Analyst Agent analyzes all 15 migrations
2. Parses 17 hooks
3. Maps 65+ tables
4. Identifies RLS policies
5. Detects PostGIS usage
6. Produces SYSTEM_UNDERSTANDING_REPORT.md

**Expected Output:**
```
✅ Database Schema Analyzed: 65 tables
✅ RLS Coverage: 62/65 tables (95%)
✅ PostGIS Tables: 3 (activity_cards, neighborhoods, users)
✅ React Hooks: 17
✅ Supabase Queries: 100+
✅ Feature Phases: 7 phases mapped
✅ Structural Debt Score: 65 (MEDIUM)

📄 Report saved: ./swarm-memory/T0-system-understanding.md
```

---

## PHASE T1: USER DOMAIN EXTRACTION

```bash
# Execute User Domain Extraction
npm run swarm:phase-t1

# Or step by step:
npm run swarm:architect T1  # Architect proposal
npm run swarm:implement T1  # Implementation
npm run swarm:test T1       # All tests
npm run swarm:approve T1    # Final approval
```

**What happens:**
1. Architect Agent designs User domain boundaries
2. Implementation Agent creates domain module
3. QA Agent runs chaos tests
4. Security Agent audits RLS
5. Performance Agent benchmarks
6. DevOps Agent prepares deployment
7. Meta-Analysis Agent reviews
8. Orchestrator makes final decision

**Expected Duration:** 2-4 hours

---

## PHASE T2-T7: INCREMENTAL EVOLUTION

```bash
# Run specific phase
npm run swarm:phase-t2  # Social Domain
npm run swarm:phase-t3  # Messaging Domain
npm run swarm:phase-t4  # Media Domain
npm run swarm:phase-t5  # AI Domain
npm run swarm:phase-t6  # Event System
npm run swarm:phase-t7  # CQRS Separation

# Run all phases sequentially (FULL EVOLUTION)
npm run swarm:evolve-all
# ⚠️ This will take 20-30 hours
```

---

## AGENT-SPECIFIC COMMANDS

### System Analyst Agent
```bash
# Analyze current system state
npm run agent:analyze

# Output: ./swarm-memory/analysis-[timestamp].json
```

### Architect Agent
```bash
# Propose architecture for phase
npm run agent:architect T1

# Output: ./swarm-memory/T1-architecture-proposal.md
```

### Implementation Agent
```bash
# Implement approved architecture
npm run agent:implement T1

# Creates feature branch
# Modifies code
# Runs tests
# Output: ./swarm-memory/T1-implementation-summary.md
```

### QA & Chaos Agent
```bash
# Run chaos experiments
npm run agent:chaos

# Scenarios:
# - Database connection drop
# - Concurrent writes
# - RLS bypass attempts
# - Feed spike
# - PostGIS large query

# Output: ./swarm-memory/chaos-report-[timestamp].md
```

### Security Auditor Agent
```bash
# Full security audit
npm run agent:security

# Checks:
# - RLS coverage
# - SQL injection
# - XSS vulnerabilities
# - Token leakage
# - Rate limits

# Output: ./swarm-memory/security-audit-[timestamp].md
```

### Performance Agent
```bash
# Performance benchmark
npm run agent:performance

# Tests:
# - Feed load time
# - Story feed
# - Search query
# - Real-time messaging
# - PostGIS spatial query

# Output: ./swarm-memory/performance-[timestamp].md
```

### DevOps Agent
```bash
# Deployment preparation
npm run agent:devops T1

# Checks:
# - Build success
# - Test pass
# - Migration scripts
# - Rollback plan
# - Health checks

# Output: ./swarm-memory/T1-devops-report.md
```

### Meta-Analysis Agent
```bash
# Analyze all agent outputs
npm run agent:meta

# Detects:
# - Design biases
# - Structural fragility
# - Over-engineering
# - Coupling trends

# Output: ./swarm-memory/meta-analysis-[timestamp].md
```

### Orchestrator Agent
```bash
# Final decision for phase
npm run agent:orchestrate T1

# Collects all agent outputs
# Runs decision engine
# Approves or rejects phase
# Stores metrics

# Output: ./swarm-memory/T1-orchestration-report.md
```

---

## VERIFICATION COMMANDS

```bash
# Verify build
npm run build

# Verify tests
npm run test

# Verify type check
npm run type-check

# Verify security
npm audit

# Verify performance
npm run benchmark

# Full verification suite
npm run swarm:verify
```

---

## ROLLBACK COMMANDS

```bash
# Rollback last phase
npm run swarm:rollback

# Rollback specific phase
npm run swarm:rollback T1

# Check rollback status
npm run swarm:rollback-status

# Execute:
# 1. Revert git branch
# 2. Restore database
# 3. Clear cache
# 4. Verify health
```

---

## MONITORING COMMANDS

```bash
# View swarm progress
npm run swarm:status

# View metrics history
npm run swarm:metrics

# View iteration history
npm run swarm:history

# View current fragility score
npm run swarm:fragility
```

---

## EXAMPLE: FULL T0 → T1 EXECUTION

```bash
# Step 1: System Understanding
npm run swarm:phase-t0
# ✅ Takes 30 minutes
# ✅ Produces system-understanding.md

# Step 2: Review T0 output
cat ./swarm-memory/T0-system-understanding.md

# Step 3: If approved, proceed to T1
npm run swarm:phase-t1

# Step 4: Monitor progress
npm run swarm:status
# Output:
# Phase: T1 (User Domain Extraction)
# Status: In Progress
# Current Agent: Implementation Agent
# Progress: 45%
# ETA: 60 minutes

# Step 5: Wait for completion
# ✅ Phase T1 Complete
# ✅ Metrics stored
# ✅ Ready for T2

# Step 6: Verify metrics
npm run swarm:metrics T1
# Output:
# Coupling: 45% → 38% (-7%)
# Performance: +15% improvement
# Test Coverage: 77% → 82% (+5%)
# Fragility Score: 65 → 50 (-15)
# Decision: APPROVED ✅
```

---

## ADVANCED COMMANDS

### Dry Run (No Changes)
```bash
# Simulate phase without changes
npm run swarm:dry-run T1

# Output: What would happen, but no actual changes
```

### Force Mode (Skip Some Checks)
```bash
# ⚠️ Use with caution
npm run swarm:phase-t1 --force

# Skips:
# - Performance benchmarks (uses estimate)
# - Long chaos tests (uses quick tests)
```

### Verbose Mode (Debug)
```bash
# See all agent communications
npm run swarm:phase-t1 --verbose

# Shows:
# - Agent inputs
# - Agent outputs
# - Decision logic
# - Metric calculations
```

### Parallel Execution (Fast)
```bash
# Run multiple independent agents in parallel
npm run swarm:phase-t1 --parallel

# ⚠️ Only for independent agents
# ⚠️ Does not work for sequential dependencies
```

---

## CONFIGURATION

### swarm.config.json
```json
{
  "execution_mode": "local",
  "agents": {
    "system_analyst": { "enabled": true, "timeout": 600 },
    "architect": { "enabled": true, "timeout": 900 },
    "implementation": { "enabled": true, "timeout": 3600 },
    "qa": { "enabled": true, "timeout": 1200 },
    "security": { "enabled": true, "timeout": 600 },
    "performance": { "enabled": true, "timeout": 900 },
    "devops": { "enabled": true, "timeout": 600 },
    "meta_analysis": { "enabled": true, "timeout": 300 },
    "orchestrator": { "enabled": true, "timeout": 300 }
  },
  "thresholds": {
    "test_coverage_min": 75,
    "coupling_max": 30,
    "fragility_max": 50,
    "performance_regression_max": 20
  },
  "chaos": {
    "enabled": true,
    "scenarios": ["db_drop", "concurrent_writes", "rls_bypass", "feed_spike"]
  },
  "security": {
    "fail_on_critical": true,
    "fail_on_high": true,
    "fail_on_medium": false
  }
}
```

---

## TROUBLESHOOTING

### Issue: Agent Timeout
```bash
# Increase timeout in swarm.config.json
# Or use --timeout flag
npm run swarm:phase-t1 --timeout 7200  # 2 hours
```

### Issue: Build Fails
```bash
# Check build logs
cat ./swarm-memory/T1-build.log

# Fix and retry
npm run swarm:retry T1
```

### Issue: Tests Fail
```bash
# Run tests manually
npm run test

# Check specific test
npm run test -- useAuth.test.ts

# Fix and retry phase
npm run swarm:retry T1
```

### Issue: Security Scan Fails
```bash
# View security report
cat ./swarm-memory/security-audit.md

# Fix vulnerabilities
npm audit fix

# Retry security scan
npm run agent:security
```

---

## CI/CD INTEGRATION

### GitHub Actions
```yaml
# .github/workflows/swarm-evolution.yml
name: Swarm Evolution
on:
  schedule:
    - cron: '0 2 * * 0'  # Weekly on Sunday 2 AM
  workflow_dispatch:

jobs:
  evolve:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install --workspaces
      - run: npm run swarm:phase-t0
      - run: npm run swarm:phase-t1
      # ... continue based on success
```

---

## METRICS DASHBOARD

```bash
# Start metrics server
npm run swarm:metrics-server

# Open browser
# → http://localhost:4000/swarm-dashboard

# Shows:
# - Phase progress
# - Agent status
# - Metrics trends
# - Decision history
# - Rollback timeline
```

---

**Ready to evolve Çevre!** 🚀

Start with: `npm run swarm:phase-t0`
