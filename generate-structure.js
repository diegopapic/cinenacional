const fs = require('fs');
const path = require('path');

function scanDirectory(dir, base = '') {
  const items = fs.readdirSync(dir);
  const result = {};
  
  items.forEach(item => {
    if (item.startsWith('.') || 
        item === 'node_modules' || 
        item === '.next' ||
        item === 'project-structure.json') return;
    
    const fullPath = path.join(dir, item);
    const relativePath = path.join(base, item).replace(/\\/g, '/');
    
    try {
      const stats = fs.statSync(fullPath);
      
      if (stats.isDirectory()) {
        const subResult = scanDirectory(fullPath, relativePath);
        if (Object.keys(subResult).length > 0) {
          result[item] = subResult;
        }
      } else if (item.match(/\.(ts|tsx|js|jsx|json|css|scss|md)$/)) {
        result[item] = `https://raw.githubusercontent.com/diegopapic/cinenacional/main/${relativePath}`;
      }
    } catch (error) {
      console.error(`Error: ${error.message}`);
    }
  });
  
  return result;
}

const structure = {
  timestamp: new Date().toISOString(),
  repository: "diegopapic/cinenacional",
  branch: "main",
  structure: scanDirectory('.')
};

fs.writeFileSync('project-structure.json', JSON.stringify(structure, null, 2));
