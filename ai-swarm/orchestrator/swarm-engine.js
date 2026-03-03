#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════
 * ÇEVRE AI SWARM - ORCHESTRATOR ENGINE
 * ═══════════════════════════════════════════════════════════
 * 
 * Coordinates all 8 AI agents to develop features from
 * spec to deployment with self-healing capabilities.
 */

const Anthropic = require('@anthropic-ai/sdk')
const fs = require('fs')
const path = require('path')
const { v4: uuidv4 } = require('uuid')

// ═══════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════

const CONFIG = {
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-sonnet-4-20250514',
  maxTokens: 4000,
  temperature: 0.3,
  
  agents: [
    { id: 'team-lead', dir: '01-team-lead', phase: 'SPEC' },
    { id: 'architect', dir: '02-architect', phase: 'ARCHITECTURE' },
    { id: 'backend', dir: '03-backend', phase: 'IMPLEMENTATION' },
    { id: 'frontend', dir: '04-frontend', phase: 'IMPLEMENTATION' },
    { id: 'designer', dir: '05-designer', phase: 'DESIGN' },
    { id: 'devops', dir: '06-devops', phase: 'DEPLOYMENT' },
    { id: 'security', dir: '07-security', phase: 'SECURITY' },
    { id: 'qa', dir: '08-qa', phase: 'QA' }
  ],
  
  retryLimit: 3,
  tokenBudget: 1000000,
  selfHealing: true
}

// ═══════════════════════════════════════════════════════════
// SWARM STATE
// ═══════════════════════════════════════════════════════════

class SwarmState {
  constructor(featureRequest) {
    this.correlationId = uuidv4()
    this.featureRequest = featureRequest
    this.phase = 'SPEC'
    this.currentAgent = null
    this.history = []
    this.tokenUsage = 0
    this.approved = false
    this.errors = []
    this.startTime = Date.now()
  }
  
  addMessage(agent, input, output, tokens) {
    this.history.push({
      timestamp: new Date().toISOString(),
      agent,
      input,
      output,
      tokens,
      phase: this.phase
    })
    this.tokenUsage += tokens
  }
  
  toJSON() {
    return {
      correlationId: this.correlationId,
      featureRequest: this.featureRequest,
      phase: this.phase,
      tokenUsage: this.tokenUsage,
      duration: Date.now() - this.startTime,
      history: this.history,
      errors: this.errors
    }
  }
}

// ═══════════════════════════════════════════════════════════
// ORCHESTRATOR
// ═══════════════════════════════════════════════════════════

class SwarmOrchestrator {
  constructor(config) {
    this.config = config
    this.anthropic = new Anthropic({ apiKey: config.apiKey })
    this.state = null
  }
  
  async run(featureRequest) {
    console.log('═══════════════════════════════════════')
    console.log('  ÇEVRE AI SWARM - STARTING')
    console.log('═══════════════════════════════════════')
    console.log(`Feature: ${featureRequest}`)
    console.log(`Correlation ID: ${this.state?.correlationId || 'generating...'}`)
    console.log('')
    
    this.state = new SwarmState(featureRequest)
    
    try {
      // Phase 1: Team Lead (Scope)
      await this.runAgent('team-lead', featureRequest)
      
      if (!this.state.approved) {
        console.log('❌ Feature REJECTED by Team Lead')
        return this.state
      }
      
      // Phase 2: Architect
      const architectInput = this.state.history[0].output
      await this.runAgent('architect', architectInput)
      
      // Phase 3: Designer (parallel with architect)
      await this.runAgent('designer', architectInput)
      
      // Phase 4: Backend
      const architectureOutput = this.state.history.find(h => h.agent === 'architect').output
      await this.runAgent('backend', architectureOutput)
      
      // Phase 5: Frontend
      const backendOutput = this.state.history.find(h => h.agent === 'backend').output
      await this.runAgent('frontend', backendOutput)
      
      // Phase 6: DevOps
      await this.runAgent('devops', 'Setup CI/CD for this feature')
      
      // Phase 7: Security Audit
      const allOutputs = this.state.history.map(h => h.output).join('\n\n')
      await this.runAgent('security', allOutputs)
      
      // Phase 8: QA
      await this.runAgent('qa', allOutputs)
      
      // Final: Team Lead Approval
      await this.runAgent('team-lead', `Final review:\n${allOutputs}`)
      
      console.log('')
      console.log('═══════════════════════════════════════')
      console.log('  SWARM COMPLETED')
      console.log('═══════════════════════════════════════')
      console.log(`Total Tokens: ${this.state.tokenUsage}`)
      console.log(`Duration: ${((Date.now() - this.state.startTime) / 1000).toFixed(1)}s`)
      
      return this.state
      
    } catch (error) {
      console.error('❌ Swarm Error:', error.message)
      this.state.errors.push(error.message)
      
      if (this.config.selfHealing) {
        return await this.selfHeal(error)
      }
      
      throw error
    }
  }
  
  async runAgent(agentId, input) {
    const agent = this.config.agents.find(a => a.id === agentId)
    if (!agent) throw new Error(`Agent ${agentId} not found`)
    
    console.log(`\n🤖 Running: ${agentId.toUpperCase()}`)
    console.log(`Phase: ${agent.phase}`)
    
    this.state.currentAgent = agentId
    this.state.phase = agent.phase
    
    // Load system prompt
    const promptPath = path.join(__dirname, '../agents', agent.dir, 'system-prompt.md')
    const systemPrompt = fs.readFileSync(promptPath, 'utf-8')
    
    // Call Claude API
    const response = await this.anthropic.messages.create({
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: input
      }]
    })
    
    const output = response.content[0].text
    const tokens = response.usage.input_tokens + response.usage.output_tokens
    
    console.log(`✓ Completed (${tokens} tokens)`)
    
    // Save to history
    this.state.addMessage(agentId, input, output, tokens)
    
    // Check approval for team-lead
    if (agentId === 'team-lead') {
      this.state.approved = output.includes('APPROVAL DECISION: APPROVED')
    }
    
    // Check token budget
    if (this.state.tokenUsage > this.config.tokenBudget) {
      throw new Error(`Token budget exceeded: ${this.state.tokenUsage}`)
    }
    
    return output
  }
  
  async selfHeal(error) {
    console.log('\n🔧 SELF-HEALING ACTIVATED')
    console.log(`Error: ${error.message}`)
    
    // Classify error
    const errorType = this.classifyError(error)
    console.log(`Error Type: ${errorType}`)
    
    if (errorType === 'NON_RETRYABLE') {
      console.log('❌ Error is non-retryable, escalating to user')
      return this.state
    }
    
    // Attempt fix
    console.log('🔄 Attempting auto-fix...')
    
    // Re-run last agent with fix prompt
    const lastAgent = this.state.currentAgent
    const fixPrompt = `Previous attempt failed with error: ${error.message}\n\nPlease fix and retry.`
    
    try {
      await this.runAgent(lastAgent, fixPrompt)
      console.log('✅ Self-healing successful')
      return this.state
    } catch (retryError) {
      console.log('❌ Self-healing failed')
      this.state.errors.push(retryError.message)
      return this.state
    }
  }
  
  classifyError(error) {
    const message = error.message.toLowerCase()
    
    if (message.includes('security') || message.includes('vulnerability')) {
      return 'NON_RETRYABLE'
    }
    if (message.includes('budget') || message.includes('token')) {
      return 'NON_RETRYABLE'
    }
    if (message.includes('validation')) {
      return 'RETRYABLE'
    }
    
    return 'RETRYABLE'
  }
}

// ═══════════════════════════════════════════════════════════
// CLI INTERFACE
// ═══════════════════════════════════════════════════════════

async function main() {
  const featureRequest = process.argv[2]
  
  if (!featureRequest) {
    console.error('Usage: node swarm-engine.js "Feature request"')
    console.error('Example: node swarm-engine.js "Add Stories feature"')
    process.exit(1)
  }
  
  if (!CONFIG.apiKey) {
    console.error('Error: ANTHROPIC_API_KEY environment variable not set')
    process.exit(1)
  }
  
  const orchestrator = new SwarmOrchestrator(CONFIG)
  const result = await orchestrator.run(featureRequest)
  
  // Save result
  const outputPath = path.join(__dirname, '../logs', `swarm-${result.correlationId}.json`)
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2))
  
  console.log(`\n📄 Full log saved: ${outputPath}`)
}

if (require.main === module) {
  main().catch(console.error)
}

module.exports = { SwarmOrchestrator, SwarmState }
