// scripts/measure-performance.js
const https = require('https');
const http = require('http');
const { performance } = require('perf_hooks');
const fs = require('fs').promises;
const path = require('path');

// Configuración
const CONFIG = {
  baseUrl: process.env.BASE_URL || 'http://5.161.58.106:3000',
  isProduction: process.env.NODE_ENV === 'production',
  iterations: 5, // Número de pruebas por endpoint
  concurrentUsers: [1, 10, 50, 100], // Simulación de usuarios concurrentes
};

// Ignorar certificados SSL autofirmados en producción
if (CONFIG.isProduction) {
  process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
}

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Endpoints a testear
const ENDPOINTS = [
  {
    name: 'HomePage - HTML',
    path: '/',
    type: 'page',
    critical: true,
  },
  {
    name: 'API - Movies List (Current)',
    path: '/api/movies?limit=50',
    type: 'api',
    critical: true,
  },
  {
    name: 'API - Home Feed (OPTIMIZED)',
    path: '/api/movies/home-feed',
    type: 'api',
    critical: true,
  },
/*  {
    name: 'API - Home Sections - Últimos (Optimized)',
    path: '/api/movies/home-sections?section=ultimos&limit=6',
    type: 'api',
    critical: true,
  },
  {
    name: 'API - Home Sections - Próximos (Optimized)',
    path: '/api/movies/home-sections?section=proximos&limit=6',
    type: 'api',
    critical: true,
  },*/
  {
    name: 'API - Single Movie',
    path: '/api/movies/30', // Ajustar ID según tu BD
    type: 'api',
    critical: false,
  },
  {
    name: 'Película Page',
    path: '/peliculas/el-secreto-de-sus-ojos', // Ajustar slug
    type: 'page',
    critical: false,
  },
];

// Función para hacer una request y medir tiempo
async function measureRequest(url) {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    const protocol = url.startsWith('https') ? https : http;
    
    let responseData = '';
    let ttfb = null;
    
    const req = protocol.get(url, (res) => {
      // Time to First Byte
      if (!ttfb) {
        ttfb = performance.now() - startTime;
      }
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        const endTime = performance.now();
        const totalTime = endTime - startTime;
        
        resolve({
          success: true,
          statusCode: res.statusCode,
          totalTime,
          ttfb,
          dataSize: Buffer.byteLength(responseData),
          headers: res.headers,
        });
      });
    });
    
    req.on('error', (error) => {
      const endTime = performance.now();
      resolve({
        success: false,
        error: error.message,
        totalTime: endTime - startTime,
      });
    });
    
    req.setTimeout(30000, () => {
      req.destroy();
      resolve({
        success: false,
        error: 'Timeout after 30s',
        totalTime: 30000,
      });
    });
  });
}

// Función para medir un endpoint múltiples veces
async function measureEndpoint(endpoint, iterations = 5) {
  const url = `${CONFIG.baseUrl}${endpoint.path}`;
  console.log(`\n${colors.cyan}Testing: ${endpoint.name}${colors.reset}`);
  console.log(`URL: ${url}`);
  
  const results = [];
  
  for (let i = 0; i < iterations; i++) {
    process.stdout.write(`  Iteration ${i + 1}/${iterations}... `);
    const result = await measureRequest(url);
    results.push(result);
    
    if (result.success) {
      const color = result.totalTime < 200 ? colors.green : 
                    result.totalTime < 500 ? colors.yellow : 
                    colors.red;
      console.log(`${color}${result.totalTime.toFixed(2)}ms${colors.reset} (TTFB: ${result.ttfb.toFixed(2)}ms, Size: ${(result.dataSize / 1024).toFixed(2)}KB)`);
    } else {
      console.log(`${colors.red}FAILED: ${result.error}${colors.reset}`);
    }
    
    // Pequeña pausa entre requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return {
    endpoint,
    results,
    stats: calculateStats(results),
  };
}

// Calcular estadísticas
function calculateStats(results) {
  const successResults = results.filter(r => r.success);
  
  if (successResults.length === 0) {
    return { error: 'All requests failed' };
  }
  
  const times = successResults.map(r => r.totalTime);
  const ttfbs = successResults.map(r => r.ttfb);
  const sizes = successResults.map(r => r.dataSize);
  
  return {
    successRate: (successResults.length / results.length) * 100,
    avgTime: average(times),
    minTime: Math.min(...times),
    maxTime: Math.max(...times),
    p50: percentile(times, 50),
    p95: percentile(times, 95),
    p99: percentile(times, 99),
    avgTTFB: average(ttfbs),
    avgSize: average(sizes),
    totalRequests: results.length,
    successfulRequests: successResults.length,
  };
}

// Helpers estadísticos
function average(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function percentile(arr, p) {
  const sorted = arr.slice().sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[index];
}

// Test de carga concurrente
async function loadTest(endpoint, concurrentUsers) {
  console.log(`\n${colors.magenta}Load Test: ${endpoint.name} with ${concurrentUsers} concurrent users${colors.reset}`);
  
  const url = `${CONFIG.baseUrl}${endpoint.path}`;
  const startTime = performance.now();
  
  const promises = Array(concurrentUsers).fill(null).map(() => measureRequest(url));
  const results = await Promise.all(promises);
  
  const totalTime = performance.now() - startTime;
  const successCount = results.filter(r => r.success).length;
  const avgResponseTime = average(results.filter(r => r.success).map(r => r.totalTime));
  
  console.log(`  Completed in ${totalTime.toFixed(2)}ms`);
  console.log(`  Success rate: ${(successCount / concurrentUsers * 100).toFixed(1)}%`);
  console.log(`  Avg response time: ${avgResponseTime.toFixed(2)}ms`);
  
  return {
    concurrentUsers,
    totalTime,
    successRate: (successCount / concurrentUsers) * 100,
    avgResponseTime,
  };
}

// Generar reporte
async function generateReport(results) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportDir = path.join(process.cwd(), 'performance-reports');
  
  // Crear directorio si no existe
  await fs.mkdir(reportDir, { recursive: true });
  
  // Generar reporte JSON
  const jsonReport = {
    timestamp: new Date().toISOString(),
    config: CONFIG,
    results: results,
    summary: generateSummary(results),
  };
  
  const jsonPath = path.join(reportDir, `report-${timestamp}.json`);
  await fs.writeFile(jsonPath, JSON.stringify(jsonReport, null, 2));
  
  // Generar reporte HTML
  const htmlReport = generateHTMLReport(jsonReport);
  const htmlPath = path.join(reportDir, `report-${timestamp}.html`);
  await fs.writeFile(htmlPath, htmlReport);
  
  console.log(`\n${colors.green}Reports saved:${colors.reset}`);
  console.log(`  JSON: ${jsonPath}`);
  console.log(`  HTML: ${htmlPath}`);
  
  return { jsonPath, htmlPath };
}

// Generar resumen
function generateSummary(results) {
  const criticalEndpoints = results.filter(r => r.endpoint.critical);
  const avgResponseTimes = criticalEndpoints.map(r => r.stats.avgTime);
  
  return {
    totalEndpointsTested: results.length,
    overallAvgResponseTime: average(avgResponseTimes),
    slowestEndpoint: results.reduce((prev, curr) => 
      curr.stats.avgTime > prev.stats.avgTime ? curr : prev
    ).endpoint.name,
    fastestEndpoint: results.reduce((prev, curr) => 
      curr.stats.avgTime < prev.stats.avgTime ? curr : prev
    ).endpoint.name,
    recommendations: generateRecommendations(results),
  };
}

// Generar recomendaciones
function generateRecommendations(results) {
  const recommendations = [];
  
  results.forEach(r => {
    if (r.stats.avgTime > 1000) {
      recommendations.push({
        severity: 'HIGH',
        endpoint: r.endpoint.name,
        issue: `Response time too high (${r.stats.avgTime.toFixed(0)}ms)`,
        suggestion: 'Consider implementing caching or query optimization',
      });
    } else if (r.stats.avgTime > 500) {
      recommendations.push({
        severity: 'MEDIUM',
        endpoint: r.endpoint.name,
        issue: `Response time could be improved (${r.stats.avgTime.toFixed(0)}ms)`,
        suggestion: 'Review database queries and consider adding indexes',
      });
    }
    
    if (r.stats.avgSize > 500 * 1024) { // 500KB
      recommendations.push({
        severity: 'MEDIUM',
        endpoint: r.endpoint.name,
        issue: `Response size too large (${(r.stats.avgSize / 1024).toFixed(0)}KB)`,
        suggestion: 'Implement pagination or reduce data sent',
      });
    }
  });
  
  return recommendations;
}

// Generar reporte HTML
function generateHTMLReport(data) {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>Performance Report - ${new Date(data.timestamp).toLocaleString()}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px; }
        h2 { color: #666; margin-top: 30px; }
        .metric { display: inline-block; margin: 10px 20px 10px 0; }
        .metric-label { font-size: 12px; color: #888; text-transform: uppercase; }
        .metric-value { font-size: 24px; font-weight: bold; color: #333; }
        .good { color: #4CAF50; }
        .warning { color: #FF9800; }
        .bad { color: #F44336; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f8f8; font-weight: 600; }
        .recommendation { padding: 10px; margin: 10px 0; border-left: 4px solid; background: #f9f9f9; }
        .recommendation.HIGH { border-color: #F44336; background: #ffebee; }
        .recommendation.MEDIUM { border-color: #FF9800; background: #fff3e0; }
        .recommendation.LOW { border-color: #4CAF50; background: #e8f5e9; }
        .chart { margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Performance Report</h1>
        <p>Generated: ${new Date(data.timestamp).toLocaleString()}</p>
        <p>Environment: ${data.config.baseUrl}</p>
        
        <h2>📊 Summary</h2>
        <div>
            <div class="metric">
                <div class="metric-label">Endpoints Tested</div>
                <div class="metric-value">${data.summary.totalEndpointsTested}</div>
            </div>
            <div class="metric">
                <div class="metric-label">Avg Response Time</div>
                <div class="metric-value ${data.summary.overallAvgResponseTime < 200 ? 'good' : data.summary.overallAvgResponseTime < 500 ? 'warning' : 'bad'}">
                    ${data.summary.overallAvgResponseTime.toFixed(0)}ms
                </div>
            </div>
            <div class="metric">
                <div class="metric-label">Fastest Endpoint</div>
                <div class="metric-value good" style="font-size: 14px;">${data.summary.fastestEndpoint}</div>
            </div>
            <div class="metric">
                <div class="metric-label">Slowest Endpoint</div>
                <div class="metric-value bad" style="font-size: 14px;">${data.summary.slowestEndpoint}</div>
            </div>
        </div>
        
        <h2>📈 Endpoint Performance</h2>
        <table>
            <thead>
                <tr>
                    <th>Endpoint</th>
                    <th>Avg Time</th>
                    <th>Min</th>
                    <th>Max</th>
                    <th>P95</th>
                    <th>TTFB</th>
                    <th>Size</th>
                    <th>Success Rate</th>
                </tr>
            </thead>
            <tbody>
                ${data.results.map(r => `
                    <tr>
                        <td><strong>${r.endpoint.name}</strong><br><small>${r.endpoint.path}</small></td>
                        <td class="${r.stats.avgTime < 200 ? 'good' : r.stats.avgTime < 500 ? 'warning' : 'bad'}">
                            ${r.stats.avgTime.toFixed(0)}ms
                        </td>
                        <td>${r.stats.minTime.toFixed(0)}ms</td>
                        <td>${r.stats.maxTime.toFixed(0)}ms</td>
                        <td>${r.stats.p95.toFixed(0)}ms</td>
                        <td>${r.stats.avgTTFB.toFixed(0)}ms</td>
                        <td>${(r.stats.avgSize / 1024).toFixed(1)}KB</td>
                        <td class="${r.stats.successRate === 100 ? 'good' : r.stats.successRate > 95 ? 'warning' : 'bad'}">
                            ${r.stats.successRate.toFixed(0)}%
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        <h2>⚠️ Recommendations</h2>
        ${data.summary.recommendations.length === 0 ? 
            '<p class="good">✅ All endpoints are performing well!</p>' :
            data.summary.recommendations.map(rec => `
                <div class="recommendation ${rec.severity}">
                    <strong>${rec.severity}:</strong> ${rec.endpoint}<br>
                    <strong>Issue:</strong> ${rec.issue}<br>
                    <strong>Suggestion:</strong> ${rec.suggestion}
                </div>
            `).join('')
        }
    </div>
</body>
</html>
  `;
}

// Función principal
async function main() {
  console.log(`${colors.blue}╔════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║     Performance Testing Tool v1.0      ║${colors.reset}`);
  console.log(`${colors.blue}╚════════════════════════════════════════╝${colors.reset}`);
  console.log(`\nTesting: ${CONFIG.baseUrl}`);
  console.log(`Iterations per endpoint: ${CONFIG.iterations}`);
  
  const allResults = [];
  
  // Test individual de endpoints
  console.log(`\n${colors.yellow}── Individual Endpoint Tests ──${colors.reset}`);
  for (const endpoint of ENDPOINTS) {
    const result = await measureEndpoint(endpoint, CONFIG.iterations);
    allResults.push(result);
    
    // Mostrar resumen
    if (result.stats.avgTime) {
      console.log(`  Average: ${colors.cyan}${result.stats.avgTime.toFixed(2)}ms${colors.reset} | P95: ${result.stats.p95.toFixed(2)}ms | Success: ${result.stats.successRate.toFixed(0)}%`);
    }
  }
  
  // Load tests para endpoints críticos
  console.log(`\n${colors.yellow}── Load Tests (Critical Endpoints) ──${colors.reset}`);
  const criticalEndpoints = ENDPOINTS.filter(e => e.critical);
  
  for (const endpoint of criticalEndpoints) {
    const loadResults = [];
    for (const users of CONFIG.concurrentUsers) {
      const result = await loadTest(endpoint, users);
      loadResults.push(result);
    }
    
    // Agregar load test results al resultado del endpoint
    const endpointResult = allResults.find(r => r.endpoint.name === endpoint.name);
    if (endpointResult) {
      endpointResult.loadTests = loadResults;
    }
  }
  
  // Generar reportes
  console.log(`\n${colors.yellow}── Generating Reports ──${colors.reset}`);
  const { htmlPath } = await generateReport(allResults);
  
  // Mostrar resumen final
  console.log(`\n${colors.green}═══════════════════════════════════════${colors.reset}`);
  console.log(`${colors.green}           TEST COMPLETED              ${colors.reset}`);
  console.log(`${colors.green}═══════════════════════════════════════${colors.reset}`);
  
  // Comparación si existe endpoint optimizado
  const currentAPI = allResults.find(r => r.endpoint.name.includes('Current'));
  const optimizedAPI = allResults.find(r => r.endpoint.name.includes('Optimized'));
  
  if (currentAPI && optimizedAPI) {
    const improvement = ((currentAPI.stats.avgTime - optimizedAPI.stats.avgTime) / currentAPI.stats.avgTime * 100);
    console.log(`\n${colors.cyan}📊 Optimization Results:${colors.reset}`);
    console.log(`  Current API: ${currentAPI.stats.avgTime.toFixed(2)}ms`);
    console.log(`  Optimized API: ${optimizedAPI.stats.avgTime.toFixed(2)}ms`);
    console.log(`  ${colors.green}Improvement: ${improvement.toFixed(1)}% faster!${colors.reset}`);
  }
  
  console.log(`\n${colors.blue}View detailed report: file://${htmlPath}${colors.reset}`);
}

// Ejecutar
main().catch(console.error);