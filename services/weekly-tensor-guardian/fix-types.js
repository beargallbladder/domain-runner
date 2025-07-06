#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Fix TypeScript error handling in all source files
const srcDir = path.join(__dirname, 'src');
const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.ts'));

for (const file of files) {
  const filePath = path.join(srcDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix error.message issues
  content = content.replace(
    /} catch \(error\) {[\s\S]*?error\.message/g,
    (match) => {
      return match.replace(/error\.message/g, '(error instanceof Error ? error.message : String(error))');
    }
  );
  
  // Fix logger.error with error.message
  content = content.replace(
    /logger\.error\([^,]+,\s*{\s*error:\s*error\.message\s*}\)/g,
    (match) => {
      return match.replace(/error\.message/g, '(error instanceof Error ? error.message : String(error))');
    }
  );
  
  // Fix throw new Error with error.message
  content = content.replace(
    /throw new Error\([^)]*error\.message[^)]*\)/g,
    (match) => {
      return match.replace(/error\.message/g, '(error instanceof Error ? error.message : String(error))');
    }
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed ${file}`);
}

console.log('All TypeScript error handling fixed!'); 