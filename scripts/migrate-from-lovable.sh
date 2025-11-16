#!/bin/bash

# ========================================
# AMBOS Migration Script from Lovable.dev
# ========================================

set -e  # Exit on error

echo "🚀 Starting AMBOS migration from Lovable.dev..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check prerequisites
echo "📋 Checking prerequisites..."
command -v node >/dev/null 2>&1 || { echo -e "${RED}❌ Node.js is required but not installed.${NC}" >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo -e "${RED}❌ npm is required but not installed.${NC}" >&2; exit 1; }
command -v git >/dev/null 2>&1 || { echo -e "${RED}❌ git is required but not installed.${NC}" >&2; exit 1; }
echo -e "${GREEN}✅ Prerequisites OK${NC}"
echo ""

# Step 2: Backup current configuration
echo "💾 Backing up current configuration..."
mkdir -p backups
if [ -f ".env.local" ]; then
  cp .env.local "backups/.env.local.$(date +%Y%m%d_%H%M%S)"
  echo -e "${GREEN}✅ Backup created${NC}"
else
  echo -e "${YELLOW}⚠️  No .env.local file found, skipping backup${NC}"
fi
echo ""

# Step 3: Create .env.local from template
echo "🔧 Setting up environment variables..."
if [ ! -f ".env.local" ]; then
  if [ -f ".env.example" ]; then
    cp .env.example .env.local
    echo -e "${YELLOW}⚠️  .env.local created from template${NC}"
    echo -e "${YELLOW}⚠️  Please edit .env.local with your actual values!${NC}"
  else
    echo -e "${RED}❌ .env.example not found!${NC}"
    exit 1
  fi
else
  echo -e "${GREEN}✅ .env.local already exists${NC}"
fi
echo ""

# Step 4: Update AI provider in analyze-news function
echo "🤖 Updating AI provider..."

ANALYZE_NEWS_FILE="supabase/functions/analyze-news/index.ts"

if [ -f "$ANALYZE_NEWS_FILE" ]; then
  # Create backup
  cp "$ANALYZE_NEWS_FILE" "$ANALYZE_NEWS_FILE.backup"
  
  # Replace Lovable AI gateway with OpenAI
  sed -i.bak "s|https://ai.gateway.lovable.dev/v1/chat/completions|https://api.openai.com/v1/chat/completions|g" "$ANALYZE_NEWS_FILE"
  sed -i.bak "s|LOVABLE_API_KEY|OPENAI_API_KEY|g" "$ANALYZE_NEWS_FILE"
  sed -i.bak "s|google/gemini-2.5-flash|gpt-4-turbo-preview|g" "$ANALYZE_NEWS_FILE"
  
  echo -e "${GREEN}✅ AI provider updated to OpenAI${NC}"
  echo -e "${YELLOW}⚠️  Backup saved to: $ANALYZE_NEWS_FILE.backup${NC}"
else
  echo -e "${RED}❌ $ANALYZE_NEWS_FILE not found!${NC}"
  exit 1
fi
echo ""

# Step 5: Install dependencies
echo "📦 Installing dependencies..."
npm install
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Step 6: Remove Lovable-specific files
echo "🧹 Cleaning up Lovable-specific files..."
if [ -d ".lovable" ]; then
  rm -rf .lovable
  echo -e "${GREEN}✅ Removed .lovable directory${NC}"
fi

# Update package.json name and description
node << 'EOF'
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.name = 'ambos';
pkg.description = 'Advanced Multi-source Biosecurity OSINT System';
pkg.author = 'Your Organization';
pkg.license = 'PROPRIETARY'; // or your preferred license
delete pkg.lovable; // Remove any lovable-specific config
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
console.log('✅ package.json updated');
EOF
echo ""

# Step 7: Initialize git (if not already)
echo "📝 Setting up git repository..."
if [ ! -d ".git" ]; then
  git init
  git add .
  git commit -m "Initial commit: Migrated from Lovable.dev"
  echo -e "${GREEN}✅ Git repository initialized${NC}"
else
  echo -e "${YELLOW}⚠️  Git repository already exists${NC}"
fi
echo ""

# Step 8: Test build
echo "🔨 Testing build..."
npm run build
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Build successful${NC}"
else
  echo -e "${RED}❌ Build failed! Please check errors above.${NC}"
  exit 1
fi
echo ""

# Step 9: Display next steps
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Migration complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Edit .env.local with your actual values:"
echo "   - Supabase URL and keys"
echo "   - OpenAI API key (or other AI provider)"
echo "   - News API keys"
echo "   - Other configuration"
echo ""
echo "2. Set up your Supabase project:"
echo "   cd supabase"
echo "   npx supabase login"
echo "   npx supabase link --project-ref YOUR_PROJECT_REF"
echo "   npx supabase db push"
echo "   npx supabase functions deploy"
echo ""
echo "3. Test locally:"
echo "   npm run dev"
echo ""
echo "4. Deploy to production (choose one):"
echo "   - Vercel: vercel"
echo "   - Netlify: netlify deploy --prod"
echo "   - Docker: docker build -t ambos ."
echo ""
echo "5. Set up your domain:"
echo "   - Configure DNS for ambos.dev"
echo "   - Set up SSL certificate"
echo ""
echo "📚 See DEPLOYMENT.md for detailed instructions"
echo ""
echo -e "${YELLOW}⚠️  Important: Review all changes before deploying to production!${NC}"
echo ""
