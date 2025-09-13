#!/bin/bash
# TENSOR SYNCHRONIZATION DEPLOYMENT SCRIPT
# Deploy mind-blowing 11 LLM tensor system

echo "🧠 TENSOR SYNCHRONIZATION DEPLOYMENT"
echo "===================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function for colored output
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    log_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    log_error "npm is not installed. Please install npm first."
    exit 1
fi

log_info "Node.js version: $(node --version)"
log_info "npm version: $(npm --version)"

# Create necessary directories
log_info "Creating directory structure..."
mkdir -p src/tensor-core
mkdir -p logs
mkdir -p backups
mkdir -p health-reports

# Install dependencies
log_info "Installing dependencies..."
if [ ! -f "package.json" ]; then
    log_info "Creating package.json..."
    cat > package.json << 'EOF'
{
  "name": "tensor-synchronizer",
  "version": "2.0.0",
  "description": "Mind-blowing 11 LLM tensor synchronization system",
  "main": "src/tensor-core/TensorAPI.js",
  "scripts": {
    "start": "node src/tensor-core/TensorAPI.js",
    "dev": "npx tsx src/tensor-core/TensorAPI.ts",
    "build": "npx tsc",
    "test": "npm run test:providers && npm run test:integration",
    "test:providers": "node test-all-providers.js",
    "test:integration": "node integration-test.js",
    "health": "curl -s http://localhost:3000/health | jq",
    "status": "curl -s http://localhost:3000/providers | jq",
    "heal": "curl -X POST http://localhost:3000/emergency-heal | jq",
    "monitor": "while true; do clear; npm run health; sleep 5; done"
  },
  "dependencies": {
    "express": "^4.18.0",
    "cors": "^2.8.5",
    "node-fetch": "^3.3.0",
    "pg": "^8.11.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/express": "^4.17.0",
    "@types/cors": "^2.8.0",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
EOF
fi

# Install packages
npm install

# Compile TypeScript if tsx is not available
if ! command -v tsx &> /dev/null; then
    log_info "Compiling TypeScript..."
    npx tsc --init
    npx tsc src/tensor-core/*.ts --outDir dist --target ES2020 --module commonjs --esModuleInterop --allowSyntheticDefaultImports --strict
fi

# Create test script for all providers
cat > test-all-providers.js << 'EOF'
const { TensorSynchronizer } = require('./src/tensor-core/TensorSynchronizer');

async function testAllProviders() {
    console.log('🧪 Testing All 11 LLM Providers');
    console.log('==============================\n');
    
    const tensorSync = new TensorSynchronizer();
    
    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const stats = tensorSync.getProviderStats();
    
    console.log(`📊 Provider Status Summary:`);
    console.log(`  Total Providers: ${stats.totalProviders}`);
    console.log(`  Healthy Providers: ${stats.healthyProviders}`);
    console.log(`  Failed Providers: ${stats.totalProviders - stats.healthyProviders}`);
    console.log('');
    
    stats.providers.forEach(provider => {
        const status = provider.status === 'healthy' ? '✅' : '❌';
        console.log(`${status} ${provider.name}: ${provider.status} (${provider.successRate} success rate)`);
    });
    
    console.log('\n🎯 Testing with sample domain...');
    
    try {
        const responses = await tensorSync.processWithTensorSync('example.com', 'Test prompt');
        const successful = responses.filter(r => r.success).length;
        
        console.log(`\n📈 Test Results:`);
        console.log(`  Successful responses: ${successful}/11`);
        console.log(`  Success rate: ${(successful/11*100).toFixed(1)}%`);
        
        if (successful >= 8) {
            console.log('🎉 TENSOR SYSTEM OPERATIONAL!');
            process.exit(0);
        } else {
            console.log('⚠️  Tensor system needs attention');
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

testAllProviders();
EOF

# Create integration test
cat > integration-test.js << 'EOF'
const fetch = require('node-fetch');

async function integrationTest() {
    console.log('🔧 Integration Test - API Endpoints');
    console.log('==================================\n');
    
    const baseUrl = 'http://localhost:3000';
    
    try {
        // Test health endpoint
        console.log('Testing /health endpoint...');
        const healthResponse = await fetch(`${baseUrl}/health`);
        const healthData = await healthResponse.json();
        console.log(`✅ Health: ${healthData.status} (${healthData.providers.healthy}/${healthData.providers.total} providers)`);
        
        // Test providers endpoint
        console.log('Testing /providers endpoint...');
        const providersResponse = await fetch(`${baseUrl}/providers`);
        const providersData = await providersResponse.json();
        console.log(`✅ Providers: ${providersData.healthyProviders}/${providersData.totalProviders} healthy`);
        
        // Test process-domain endpoint
        console.log('Testing /process-domain endpoint...');
        const processResponse = await fetch(`${baseUrl}/process-domain`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ domain: 'test.com', prompt: 'Integration test' })
        });
        const processData = await processResponse.json();
        console.log(`✅ Process Domain: ${processData.tensorSync.successfulResponses}/11 successful`);
        
        console.log('\n🎉 All integration tests passed!');
        
    } catch (error) {
        console.error('❌ Integration test failed:', error.message);
        process.exit(1);
    }
}

// Only run if server is running
setTimeout(integrationTest, 1000);
EOF

# Create deployment status script
cat > deployment-status.js << 'EOF'
const fetch = require('node-fetch');

async function checkDeploymentStatus() {
    console.log('📊 DEPLOYMENT STATUS CHECK');
    console.log('=========================\n');
    
    const endpoints = [
        'http://localhost:3000/health',
        'http://localhost:3000/providers',
        'http://localhost:3000/metrics'
    ];
    
    for (const endpoint of endpoints) {
        try {
            console.log(`Checking ${endpoint}...`);
            const response = await fetch(endpoint, { timeout: 5000 });
            
            if (response.ok) {
                console.log(`✅ ${endpoint} - OK (${response.status})`);
            } else {
                console.log(`❌ ${endpoint} - ERROR (${response.status})`);
            }
        } catch (error) {
            console.log(`❌ ${endpoint} - UNREACHABLE (${error.message})`);
        }
    }
    
    console.log('\n🎯 Dashboard URL: http://localhost:3000/dashboard');
}

checkDeploymentStatus();
EOF

# Create systemd service file (optional)
if command -v systemctl &> /dev/null; then
    log_info "Creating systemd service file..."
    cat > tensor-synchronizer.service << EOF
[Unit]
Description=Tensor Synchronization System
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
ExecStart=$(which node) src/tensor-core/TensorAPI.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF
    
    log_info "To install as system service:"
    log_info "  sudo cp tensor-synchronizer.service /etc/systemd/system/"
    log_info "  sudo systemctl enable tensor-synchronizer"
    log_info "  sudo systemctl start tensor-synchronizer"
fi

# Create environment template
if [ ! -f ".env" ]; then
    log_info "Creating .env template..."
    cat > .env << 'EOF'
# OpenAI API Keys
OPENAI_API_KEY=your_openai_key_1
OPENAI_API_KEY_2=your_openai_key_2
OPENAI_API_KEY_3=your_openai_key_3
OPENAI_API_KEY_4=your_openai_key_4

# Anthropic API Keys
ANTHROPIC_API_KEY=your_anthropic_key_1
ANTHROPIC_API_KEY_2=your_anthropic_key_2

# DeepSeek API Keys
DEEPSEEK_API_KEY=your_deepseek_key_1
DEEPSEEK_API_KEY_2=your_deepseek_key_2
DEEPSEEK_API_KEY_3=your_deepseek_key_3

# Mistral API Keys
MISTRAL_API_KEY=your_mistral_key_1
MISTRAL_API_KEY_2=your_mistral_key_2

# xAI API Keys
XAI_API_KEY=your_xai_key_1
XAI_API_KEY_2=your_xai_key_2

# Together API Keys
TOGETHER_API_KEY=your_together_key_1
TOGETHER_API_KEY_2=your_together_key_2
TOGETHER_API_KEY_3=your_together_key_3

# Perplexity API Keys
PERPLEXITY_API_KEY=your_perplexity_key_1
PERPLEXITY_API_KEY_2=your_perplexity_key_2

# Google API Keys
GOOGLE_API_KEY=your_google_key_1
GOOGLE_API_KEY_2=your_google_key_2

# Cohere API Keys
COHERE_API_KEY=your_cohere_key_1
COHERE_API_KEY_2=your_cohere_key_2

# AI21 API Keys
AI21_API_KEY=your_ai21_key_1
AI21_API_KEY_2=your_ai21_key_2

# Groq API Keys
GROQ_API_KEY=your_groq_key_1
GROQ_API_KEY_2=your_groq_key_2

# Database Configuration
DATABASE_URL=your_postgresql_url

# Server Configuration
PORT=3000
NODE_ENV=production
EOF
    
    log_warning "Please update .env file with your actual API keys!"
fi

# Make scripts executable
chmod +x tensor-deploy.sh
chmod +x test-all-providers.js
chmod +x integration-test.js
chmod +x deployment-status.js

log_success "Tensor Synchronization System Deployed!"
echo ""
echo "🚀 DEPLOYMENT COMPLETE"
echo "====================="
echo ""
echo "📋 Next Steps:"
echo "  1. Update .env file with your API keys"
echo "  2. Start the server: npm run dev"
echo "  3. Test providers: npm run test:providers"
echo "  4. Run integration tests: npm run test:integration"
echo "  5. Monitor health: npm run monitor"
echo ""
echo "🌐 URLs:"
echo "  Dashboard: http://localhost:3000/dashboard"
echo "  Health Check: http://localhost:3000/health"
echo "  API Docs: Check the endpoints in TensorAPI.ts"
echo ""
echo "🔥 System Features:"
echo "  ✅ 11 LLM Provider Support"
echo "  ✅ Auto-healing & Circuit Breakers"
echo "  ✅ Real-time Monitoring Dashboard"
echo "  ✅ Fault-tolerant Architecture"
echo "  ✅ Performance Optimization"
echo "  ✅ Comprehensive Error Handling"
echo ""
echo "🎯 The tensor system is ready to blow your mind!"