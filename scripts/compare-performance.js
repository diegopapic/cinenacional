// scripts/compare-performance.js
const fs = require('fs').promises;
const path = require('path');

async function compareReports(beforePath, afterPath) {
  const before = JSON.parse(await fs.readFile(beforePath, 'utf8'));
  const after = JSON.parse(await fs.readFile(afterPath, 'utf8'));
  
  console.log('\n📊 PERFORMANCE COMPARISON\n');
  console.log('══════════════════════════════════════════');
  
  // Comparar cada endpoint
  before.results.forEach(beforeResult => {
    const afterResult = after.results.find(r => 
      r.endpoint.name === beforeResult.endpoint.name
    );
    
    if (afterResult) {
      const improvement = ((beforeResult.stats.avgTime - afterResult.stats.avgTime) / 
                          beforeResult.stats.avgTime * 100);
      
      console.log(`\n${beforeResult.endpoint.name}`);
      console.log(`  Before: ${beforeResult.stats.avgTime.toFixed(2)}ms`);
      console.log(`  After:  ${afterResult.stats.avgTime.toFixed(2)}ms`);
      
      if (improvement > 0) {
        console.log(`  ✅ ${improvement.toFixed(1)}% faster`);
      } else {
        console.log(`  ⚠️  ${Math.abs(improvement).toFixed(1)}% slower`);
      }
    }
  });
  
  // Resumen general
  const avgBefore = before.summary.overallAvgResponseTime;
  const avgAfter = after.summary.overallAvgResponseTime;
  const overallImprovement = ((avgBefore - avgAfter) / avgBefore * 100);
  
  console.log('\n══════════════════════════════════════════');
  console.log('OVERALL IMPROVEMENT');
  console.log(`Before: ${avgBefore.toFixed(2)}ms average`);
  console.log(`After:  ${avgAfter.toFixed(2)}ms average`);
  console.log(`${overallImprovement > 0 ? '✅' : '⚠️'} ${Math.abs(overallImprovement).toFixed(1)}% ${overallImprovement > 0 ? 'faster' : 'slower'}`);
}

// Uso
const args = process.argv.slice(2);
if (args.length !== 2) {
  console.log('Usage: node compare-performance.js <before-report.json> <after-report.json>');
  process.exit(1);
}

compareReports(args[0], args[1]).catch(console.error);