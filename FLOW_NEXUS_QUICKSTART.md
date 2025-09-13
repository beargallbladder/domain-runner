# Flow Nexus Quick Start Guide

## ✅ Setup Complete!

Flow Nexus has been successfully initialized with:
- ✅ CLAUDE.md updated with Flow Nexus documentation
- ✅ Flow Nexus MCP server added to .mcp.json
- ✅ Command documentation in .claude/commands/flow-nexus/
- ✅ Specialized agents in .claude/agents/flow-nexus/

## 🚀 Next Steps

### 1. Restart Claude Code
**Important**: You need to restart Claude Code for the MCP server changes to take effect.

### 2. Register & Login
Once restarted, use these MCP tools in Claude Code:

```javascript
// Register new account
mcp__flow-nexus__user_register({
  email: "your@email.com",
  password: "SecurePassword123!"
})

// Login to existing account
mcp__flow-nexus__user_login({
  email: "your@email.com",
  password: "SecurePassword123!"
})

// Check your credit balance
mcp__flow-nexus__check_balance()
```

### 3. Deploy Your First Cloud Swarm

```javascript
// Initialize a cloud swarm
mcp__flow-nexus__swarm_init({
  topology: "mesh",     // Options: mesh, hierarchical, ring, star
  maxAgents: 5,         // Number of agents
  strategy: "balanced"  // Distribution strategy
})

// Create a sandbox environment
mcp__flow-nexus__sandbox_create({
  template: "node",     // Options: node, python, react, nextjs
  name: "api-dev"       // Your sandbox name
})

// Orchestrate a task
mcp__flow-nexus__task_orchestrate({
  task: "Build a REST API with authentication",
  strategy: "parallel"  // Parallel execution
})
```

## 📚 Available Flow Nexus MCP Tools

### Authentication & User Management
- `mcp__flow-nexus__user_register` - Create new account
- `mcp__flow-nexus__user_login` - Login to account
- `mcp__flow-nexus__user_logout` - Logout from account
- `mcp__flow-nexus__check_balance` - Check rUv credits

### Cloud Sandboxes
- `mcp__flow-nexus__sandbox_create` - Create isolated environment
- `mcp__flow-nexus__sandbox_list` - List your sandboxes
- `mcp__flow-nexus__sandbox_execute` - Run code in sandbox
- `mcp__flow-nexus__sandbox_delete` - Remove sandbox

### AI Swarm Management
- `mcp__flow-nexus__swarm_init` - Initialize cloud swarm
- `mcp__flow-nexus__agent_spawn` - Create cloud agents
- `mcp__flow-nexus__task_orchestrate` - Execute tasks
- `mcp__flow-nexus__swarm_status` - Monitor swarm

### Workflows & Automation
- `mcp__flow-nexus__workflow_create` - Create automation
- `mcp__flow-nexus__workflow_execute` - Run workflow
- `mcp__flow-nexus__workflow_list` - List workflows

### Neural Networks
- `mcp__flow-nexus__neural_train` - Train models
- `mcp__flow-nexus__neural_predict` - Make predictions
- `mcp__flow-nexus__model_save` - Save trained models

### Challenges & Learning
- `mcp__flow-nexus__challenges_list` - View challenges
- `mcp__flow-nexus__challenge_submit` - Submit solution
- `mcp__flow-nexus__leaderboard` - View rankings

## 🎯 Example: Complete Workflow

```javascript
// Step 1: Login
mcp__flow-nexus__user_login({
  email: "demo@example.com",
  password: "Demo123!"
})

// Step 2: Check credits
mcp__flow-nexus__check_balance()

// Step 3: Create development sandbox
mcp__flow-nexus__sandbox_create({
  template: "node",
  name: "my-api",
  env: {
    NODE_ENV: "development",
    PORT: "3000"
  }
})

// Step 4: Initialize swarm for development
mcp__flow-nexus__swarm_init({
  topology: "hierarchical",
  maxAgents: 8
})

// Step 5: Deploy agents
mcp__flow-nexus__agent_spawn({ type: "architect" })
mcp__flow-nexus__agent_spawn({ type: "coder" })
mcp__flow-nexus__agent_spawn({ type: "tester" })

// Step 6: Orchestrate development
mcp__flow-nexus__task_orchestrate({
  task: "Create RESTful API with JWT auth, user CRUD, and tests",
  strategy: "parallel",
  priority: "high"
})

// Step 7: Monitor progress
mcp__flow-nexus__swarm_status()
```

## 💡 Tips

1. **Free Credits**: New users get free credits to start
2. **Auto-refill**: Configure automatic credit refills
3. **Templates**: Use pre-built templates for faster development
4. **Challenges**: Earn credits by completing coding challenges
5. **Collaboration**: Share sandboxes with team members

## 📖 Documentation

- Full docs: https://github.com/ruvnet/claude-flow#flow-nexus
- Command reference: `.claude/commands/flow-nexus/`
- Agent documentation: `.claude/agents/flow-nexus/`

## ⚠️ Remember

**You must restart Claude Code** for the MCP server changes to take effect!

After restarting, all `mcp__flow-nexus__*` tools will be available.