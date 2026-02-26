/**
 * Example 3: Budget Persistence - Save and Restore State
 * 
 * This example shows how to:
 * - Save budget state to disk
 * - Restore budget state on restart
 * - Maintain budget tracking across application restarts
 */

const fs = require('fs');
const path = require('path');
const {
  createBudgetGuard,
  exportBudgetState,
  importBudgetState,
  getBudgetStatus,
  patchGlobalFetch
} = require("../dist/index.js");

const BUDGET_FILE = path.join(__dirname, 'budget-state.json');

// Load saved budget state
function loadBudgetState() {
  try {
    if (fs.existsSync(BUDGET_FILE)) {
      const data = fs.readFileSync(BUDGET_FILE, 'utf8');
      const state = JSON.parse(data);
      console.log(`✅ Loaded saved budget: $${state.totalSpent.toFixed(4)} spent`);
      return state;
    }
  } catch (error) {
    console.warn('⚠️  Could not load budget state:', error.message);
  }
  return null;
}

// Save current budget state
function saveBudgetState() {
  try {
    const state = exportBudgetState();
    if (state) {
      fs.writeFileSync(BUDGET_FILE, JSON.stringify(state, null, 2));
      console.log(`💾 Saved budget state: $${state.totalSpent.toFixed(4)} spent`);
    }
  } catch (error) {
    console.error('❌ Could not save budget state:', error.message);
  }
}

async function main() {
  console.log("🔥 TokenFirewall - Budget Persistence Example\n");
  console.log("=".repeat(60) + "\n");

  // Step 1: Create budget guard
  createBudgetGuard({
    monthlyLimit: 100,
    mode: "warn"
  });

  // Step 2: Load previous state if exists
  const savedState = loadBudgetState();
  if (savedState) {
    importBudgetState(savedState);
    console.log("✅ Restored previous budget state\n");
  } else {
    console.log("ℹ️  No previous budget state found - starting fresh\n");
  }

  patchGlobalFetch();

  // Step 3: Show current status
  let status = getBudgetStatus();
  console.log("📊 Current Budget Status:");
  console.log(`   Spent: $${status.totalSpent.toFixed(4)}`);
  console.log(`   Remaining: $${status.remaining.toFixed(2)}`);
  console.log(`   Usage: ${status.percentageUsed.toFixed(2)}%\n`);

  console.log("=".repeat(60) + "\n");

  // Step 4: Make some API calls (example)
  if (process.env.OPENAI_API_KEY) {
    console.log("Making API call...\n");
    
    try {
      await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: "Hi" }]
        })
      });

      // Show updated status
      status = getBudgetStatus();
      console.log("📊 Updated Budget Status:");
      console.log(`   Spent: $${status.totalSpent.toFixed(4)}`);
      console.log(`   Remaining: $${status.remaining.toFixed(2)}`);
      console.log(`   Usage: ${status.percentageUsed.toFixed(2)}%\n`);

    } catch (error) {
      console.log("(API call failed - that's okay for this demo)\n");
    }
  }

  // Step 5: Save state before exit
  saveBudgetState();

  console.log("\n" + "=".repeat(60));
  console.log("\n💡 Budget state saved to: budget-state.json");
  console.log("   Run this example again to see state restored!\n");
}

// Auto-save on exit
process.on('beforeExit', () => {
  saveBudgetState();
});

process.on('SIGINT', () => {
  saveBudgetState();
  process.exit(0);
});

main();

// 💡 Key Points:
// - exportBudgetState() returns { totalSpent, limit, mode }
// - importBudgetState() validates and restores state
// - Save state periodically or on exit
// - Perfect for long-running applications or serverless functions
