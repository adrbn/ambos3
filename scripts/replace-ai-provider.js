#!/usr/bin/env node

/**
 * Script to replace Lovable AI Gateway with OpenAI (or other providers)
 * in Supabase Edge Functions
 */

const fs = require('fs');
const path = require('path');

const FUNCTIONS_DIR = path.join(__dirname, '..', 'supabase', 'functions');

// AI Provider configurations
const AI_PROVIDERS = {
  openai: {
    endpoint: 'https://api.openai.com/v1/chat/completions',
    keyEnvVar: 'OPENAI_API_KEY',
    defaultModel: 'gpt-4-turbo-preview',
    requestFormat: (messages, model) => ({
      model: model || 'gpt-4-turbo-preview',
      messages: messages,
      temperature: 0.7,
      max_tokens: 4000,
    })
  },
  anthropic: {
    endpoint: 'https://api.anthropic.com/v1/messages',
    keyEnvVar: 'ANTHROPIC_API_KEY',
    defaultModel: 'claude-3-opus-20240229',
    requestFormat: (messages, model) => ({
      model: model || 'claude-3-opus-20240229',
      messages: messages.filter(m => m.role !== 'system'),
      system: messages.find(m => m.role === 'system')?.content || '',
      max_tokens: 4000,
    })
  },
  google: {
    endpoint: 'https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent',
    keyEnvVar: 'GOOGLE_AI_API_KEY',
    defaultModel: 'gemini-pro',
    requestFormat: (messages, model) => ({
      contents: messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }))
    })
  },
  azure: {
    endpoint: process.env.AZURE_OPENAI_ENDPOINT || 'https://YOUR_RESOURCE.openai.azure.com/openai/deployments/YOUR_DEPLOYMENT/chat/completions?api-version=2024-02-15-preview',
    keyEnvVar: 'AZURE_OPENAI_API_KEY',
    defaultModel: 'gpt-4',
    requestFormat: (messages, model) => ({
      messages: messages,
      temperature: 0.7,
      max_tokens: 4000,
    })
  }
};

function replaceAIProvider(filePath, provider = 'openai') {
  console.log(`Processing: ${filePath}`);
  
  const config = AI_PROVIDERS[provider];
  if (!config) {
    console.error(`Unknown provider: ${provider}`);
    process.exit(1);
  }

  let content = fs.readFileSync(filePath, 'utf8');
  
  // Create backup
  fs.writeFileSync(`${filePath}.backup`, content);
  
  // Replace endpoint
  content = content.replace(
    /https:\/\/ai\.gateway\.lovable\.dev\/v1\/chat\/completions/g,
    config.endpoint
  );
  
  // Replace API key environment variable
  content = content.replace(
    /LOVABLE_API_KEY/g,
    config.keyEnvVar
  );
  
  // Replace model
  content = content.replace(
    /google\/gemini-2\.5-flash/g,
    config.defaultModel
  );
  
  // Add provider-specific code if needed
  if (provider === 'openai') {
    // OpenAI uses standard format, no changes needed
  } else if (provider === 'anthropic') {
    // Add Anthropic-specific headers
    const headerRegex = /(headers: {[^}]*)'Content-Type': 'application\/json'/;
    content = content.replace(
      headerRegex,
      "$1'Content-Type': 'application/json',\n    'anthropic-version': '2023-06-01'"
    );
  } else if (provider === 'google') {
    // Google AI uses different request format
    console.warn('⚠️  Google AI requires manual adjustment of request format');
  } else if (provider === 'azure') {
    // Azure uses api-key header instead of Authorization
    content = content.replace(
      /'Authorization': `Bearer \${.*?}`/g,
      `'api-key': \`\${${config.keyEnvVar}}\``
    );
  }
  
  // Write updated content
  fs.writeFileSync(filePath, content);
  console.log(`✅ Updated: ${filePath}`);
}

function main() {
  const args = process.argv.slice(2);
  const provider = args[0] || 'openai';
  
  console.log('🤖 Replacing AI Provider in Supabase Functions');
  console.log(`Provider: ${provider}`);
  console.log('');
  
  // Find analyze-news function
  const analyzeNewsPath = path.join(FUNCTIONS_DIR, 'analyze-news', 'index.ts');
  
  if (fs.existsSync(analyzeNewsPath)) {
    replaceAIProvider(analyzeNewsPath, provider);
  } else {
    console.error(`❌ File not found: ${analyzeNewsPath}`);
    process.exit(1);
  }
  
  // Find enrich-query function (if it exists)
  const enrichQueryPath = path.join(FUNCTIONS_DIR, 'enrich-query', 'index.ts');
  if (fs.existsSync(enrichQueryPath)) {
    replaceAIProvider(enrichQueryPath, provider);
  }
  
  console.log('');
  console.log('✅ AI Provider replacement complete!');
  console.log('');
  console.log('Next steps:');
  console.log(`1. Set ${AI_PROVIDERS[provider].keyEnvVar} in your environment`);
  console.log('2. Deploy functions: npx supabase functions deploy');
  console.log(`3. Set secret: npx supabase secrets set ${AI_PROVIDERS[provider].keyEnvVar}=your-key`);
  console.log('');
}

if (require.main === module) {
  main();
}

module.exports = { replaceAIProvider };
