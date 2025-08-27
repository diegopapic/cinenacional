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
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
};

// Endpoints a testear
const ENDPOINTS = [
  // ========== PÁGINAS PRINCIPALES ==========
  {
    name: 'HomePage - HTML',
    path: '/',
    type: 'page',
    category: 'pages',
    critical: true,
  },
  
  // ========== APIs DE PELÍCULAS ==========
  {
    name: 'API - Movies List (Current)',
    path: '/api/movies?limit=50',
    type: 'api',
    category: 'movies',
    critical: true,
  },
  {
    name: 'API - Home Feed (OPTIMIZED)',
    path: '/api/movies/home-feed',
    type: 'api',
    category: 'movies',
    critical: true,
  },
  {
    name: 'API - Single Movie',
    path: '/api/movies/30',
    type: 'api',
    category: 'movies',
    critical: false,
  },
  {
    name: 'API - Movie by Slug',
    path: '/api/movies/el-secreto-de-sus-ojos',
    type: 'api',
    category: 'movies',
    critical: false,
  },
  
  // ========== PÁGINAS DE PELÍCULAS ==========
  {
    name: 'Película Page - Popular',
    path: '/pelicula/el-secreto-de-sus-ojos',
    type: 'page',
    category: 'movies',
    critical: true,
  },
  {
    name: 'Listado de Películas',
    path: '/listados/peliculas',
    type: 'page',
    category: 'movies',
    critical: false,
  },
  
  // ========== APIs DE PERSONAS ==========
  {
    name: 'API - People List',
    path: '/api/people?limit=20',
    type: 'api',
    category: 'people',
    critical: true,
  },
  {
    name: 'API - Single Person by ID',
    path: '/api/people/136714', // Ricardo Darín o ajustar según tu BD
    type: 'api',
    category: 'people',
    critical: true,
  },
  {
    name: 'API - Person Filmography',
    path: '/api/people/136714/filmography',
    type: 'api',
    category: 'people',
    critical: true,
  },
  {
    name: 'API - People Search',
    path: '/api/people/search?query=ricardo',
    type: 'api',
    category: 'people',
    critical: false,
  },
  
  // ========== PÁGINAS DE PERSONAS ==========
  {
    name: 'Persona Page - Popular Actor',
    path: '/personas/ricardo-darin', // Ajustar slug según tu BD
    type: 'page',
    category: 'people',
    critical: true,
  },
  {
    name: 'Persona Page - Director',
    path: '/personas/juan-jose-campanella', // Ajustar slug según tu BD
    type: 'page',
    category: 'people',
    critical: false,
  },
  {
    name: 'Listado de Personas',
    path: '/listados/personas',
    type: 'page',
    category: 'people',
    critical: false,
  },
  
  // ========== APIs AUXILIARES ==========
  {
    name: 'API - Genres',
    path: '/api/genres',
    type: 'api',
    category: 'metadata',
    critical: false,
  },
  {
    name: 'API - Locations Search',
    path: '/api/locations/search?query=buenos',
    type: 'api',
    category: 'metadata',
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
        
        // Detectar si la respuesta tiene caché headers
        const cacheStatus = res.headers['x-cache'] || 'NONE';
        const cacheSource = res.headers['x-cache-source'] || 'unknown';
        
        resolve({
          success: true,
          statusCode: res.statusCode,
          totalTime,
          ttfb,
          dataSize: Buffer.byteLength(responseData),
          headers: res.headers,
          cacheStatus,
          cacheSource,
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
  console.log(`Category: ${endpoint.category.toUpperCase()} | Type: ${endpoint.type.toUpperCase()}`);
  
  const results = [];
  let cacheHits = 0;
  
  for (let i = 0; i < iterations; i++) {
    process.stdout.write(`  Iteration ${i + 1}/${iterations}... `);
    const result = await measureRequest(url);
    results.push(result);
    
    if (result.success) {
      const color = result.totalTime < 200 ? colors.green : 
                    result.totalTime < 500 ? colors.yellow : 
                    colors.red;
      
      // Contar cache hits
      if (result.cacheStatus === 'HIT') {
        cacheHits++;
      }
      
      const cacheIndicator = result.cacheStatus === 'HIT' ? 
        `${colors.bgGreen}${colors.white} CACHE ${colors.reset}` : 
        result.cacheStatus === 'MISS' ? 
        `${colors.bgYellow} MISS ${colors.reset}` : '';
      
      console.log(`${color}${result.totalTime.toFixed(2)}ms${colors.reset} (TTFB: ${result.ttfb.toFixed(2)}ms, Size: ${(result.dataSize / 1024).toFixed(2)}KB) ${cacheIndicator}`);
    } else {
      console.log(`${colors.red}FAILED: ${result.error}${colors.reset}`);
    }
    
    // Pequeña pausa entre requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return {
    endpoint,
    results,
    stats: calculateStats(results, cacheHits),
  };
}

// Calcular estadísticas
function calculateStats(results, cacheHits = 0) {
  const successResults = results.filter(r => r.success);
  
  if (successResults.length === 0) {
    return { error: 'All requests failed' };
  }
  
  const times = successResults.map(r => r.totalTime);
  const ttfbs = successResults.map(r => r.ttfb);
  const sizes = successResults.map(r => r.dataSize);
  
  // Separar tiempos con y sin caché
  const cachedTimes = successResults.filter(r => r.cacheStatus === 'HIT').map(r => r.totalTime);
  const uncachedTimes = successResults.filter(r => r.cacheStatus !== 'HIT').map(r => r.totalTime);
  
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
    cacheHitRate: (cacheHits / successResults.length) * 100,
    avgCachedTime: cachedTimes.length > 0 ? average(cachedTimes) : null,
    avgUncachedTime: uncachedTimes.length > 0 ? average(uncachedTimes) : null,
  };
}

// Helpers estadísticos
function average(arr) {
  if (arr.length === 0) return 0;
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
    categoryBreakdown: generateCategoryBreakdown(results),
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

// Generar breakdown por categoría
function generateCategoryBreakdown(results) {
  const categories = {};
  
  results.forEach(r => {
    const category = r.endpoint.category;
    if (!categories[category]) {
      categories[category] = {
        endpoints: [],
        avgTime: 0,
        avgCacheHitRate: 0,
      };
    }
    categories[category].endpoints.push(r);
  });
  
  // Calcular promedios por categoría
  Object.keys(categories).forEach(cat => {
    const catResults = categories[cat].endpoints;
    categories[cat].avgTime = average(catResults.map(r => r.stats.avgTime || 0));
    categories[cat].avgCacheHitRate = average(catResults.map(r => r.stats.cacheHitRate || 0));
    categories[cat].count = catResults.length;
  });
  
  return categories;
}

// Generar resumen
function generateSummary(results) {
  const criticalEndpoints = results.filter(r => r.endpoint.critical);
  const avgResponseTimes = criticalEndpoints.map(r => r.stats.avgTime || 0);
  
  // Separar por categorías
  const movieEndpoints = results.filter(r => r.endpoint.category === 'movies');
  const peopleEndpoints = results.filter(r => r.endpoint.category === 'people');
  
  return {
    totalEndpointsTested: results.length,
    overallAvgResponseTime: average(avgResponseTimes),
    moviesAvgResponseTime: average(movieEndpoints.map(r => r.stats.avgTime || 0)),
    peopleAvgResponseTime: average(peopleEndpoints.map(r => r.stats.avgTime || 0)),
    overallCacheHitRate: average(results.map(r => r.stats.cacheHitRate || 0)),
    slowestEndpoint: results.reduce((prev, curr) => 
      (curr.stats.avgTime || 0) > (prev.stats.avgTime || 0) ? curr : prev
    ).endpoint.name,
    fastestEndpoint: results.reduce((prev, curr) => 
      (curr.stats.avgTime || Infinity) < (prev.stats.avgTime || Infinity) ? curr : prev
    ).endpoint.name,
    recommendations: generateRecommendations(results),
  };
}

// Generar recomendaciones
function generateRecommendations(results) {
  const recommendations = [];
  
  results.forEach(r => {
    if (!r.stats.avgTime) return;
    
    // Recomendaciones de tiempo de respuesta
    if (r.stats.avgTime > 1000) {
      recommendations.push({
        severity: 'HIGH',
        endpoint: r.endpoint.name,
        category: r.endpoint.category,
        issue: `Response time too high (${r.stats.avgTime.toFixed(0)}ms)`,
        suggestion: 'Consider implementing caching or query optimization',
      });
    } else if (r.stats.avgTime > 500) {
      recommendations.push({
        severity: 'MEDIUM',
        endpoint: r.endpoint.name,
        category: r.endpoint.category,
        issue: `Response time could be improved (${r.stats.avgTime.toFixed(0)}ms)`,
        suggestion: 'Review database queries and consider adding indexes',
      });
    }
    
    // Recomendaciones de tamaño
    if (r.stats.avgSize > 500 * 1024) { // 500KB
      recommendations.push({
        severity: 'MEDIUM',
        endpoint: r.endpoint.name,
        category: r.endpoint.category,
        issue: `Response size too large (${(r.stats.avgSize / 1024).toFixed(0)}KB)`,
        suggestion: 'Implement pagination or reduce data sent',
      });
    }
    
    // Recomendaciones de caché
    if (r.stats.cacheHitRate < 20 && r.endpoint.type === 'api') {
      recommendations.push({
        severity: 'LOW',
        endpoint: r.endpoint.name,
        category: r.endpoint.category,
        issue: `Low cache hit rate (${r.stats.cacheHitRate.toFixed(0)}%)`,
        suggestion: 'Verify Redis cache is working properly',
      });
    }
  });
  
  return recommendations;
}

// Generar reporte HTML mejorado
function generateHTMLReport(data) {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>Performance Report - ${new Date(data.timestamp).toLocaleString()}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1400px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px; }
        h2 { color: #666; margin-top: 30px; }
        h3 { color: #888; margin-top: 20px; }
        .metric { display: inline-block; margin: 10px 20px 10px 0; }
        .metric-label { font-size: 12px; color: #888; text-transform: uppercase; }
        .metric-value { font-size: 24px; font-weight: bold; color: #333; }
        .good { color: #4CAF50; }
        .warning { color: #FF9800; }
        .bad { color: #F44336; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f8f8; font-weight: 600; position: sticky; top: 0; }
        tr:hover { background: #f5f5f5; }
        .recommendation { padding: 10px; margin: 10px 0; border-left: 4px solid; background: #f9f9f9; }
        .recommendation.HIGH { border-color: #F44336; background: #ffebee; }
        .recommendation.MEDIUM { border-color: #FF9800; background: #fff3e0; }
        .recommendation.LOW { border-color: #4CAF50; background: #e8f5e9; }
        .category-section { margin: 20px 0; padding: 15px; background: #f9f9f9; border-radius: 5px; }
        .category-title { font-weight: bold; color: #555; margin-bottom: 10px; }
        .cache-badge { padding: 2px 6px; border-radius: 3px; font-size: 11px; font-weight: bold; }
        .cache-hit { background: #4CAF50; color: white; }
        .cache-miss { background: #FF9800; color: white; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .stat-card { background: #f8f8f8; padding: 15px; border-radius: 5px; }
        .stat-card h4 { margin: 0 0 10px 0; color: #666; font-size: 14px; }
        .stat-card .value { font-size: 28px; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Performance Report - CineNacional</h1>
        <p>Generated: ${new Date(data.timestamp).toLocaleString()}</p>
        <p>Environment: ${data.config.baseUrl}</p>
        
        <h2>📊 Overall Summary</h2>
        <div class="stats-grid">
            <div class="stat-card">
                <h4>Endpoints Tested</h4>
                <div class="value">${data.summary.totalEndpointsTested}</div>
            </div>
            <div class="stat-card">
                <h4>Avg Response Time</h4>
                <div class="value ${data.summary.overallAvgResponseTime < 200 ? 'good' : data.summary.overallAvgResponseTime < 500 ? 'warning' : 'bad'}">
                    ${data.summary.overallAvgResponseTime.toFixed(0)}ms
                </div>
            </div>
            <div class="stat-card">
                <h4>Movies Avg Time</h4>
                <div class="value ${data.summary.moviesAvgResponseTime < 200 ? 'good' : data.summary.moviesAvgResponseTime < 500 ? 'warning' : 'bad'}">
                    ${data.summary.moviesAvgResponseTime.toFixed(0)}ms
                </div>
            </div>
            <div class="stat-card">
                <h4>People Avg Time</h4>
                <div class="value ${data.summary.peopleAvgResponseTime < 200 ? 'good' : data.summary.peopleAvgResponseTime < 500 ? 'warning' : 'bad'}">
                    ${data.summary.peopleAvgResponseTime.toFixed(0)}ms
                </div>
            </div>
            <div class="stat-card">
                <h4>Cache Hit Rate</h4>
                <div class="value ${data.summary.overallCacheHitRate > 60 ? 'good' : data.summary.overallCacheHitRate > 30 ? 'warning' : 'bad'}">
                    ${data.summary.overallCacheHitRate.toFixed(0)}%
                </div>
            </div>
            <div class="stat-card">
                <h4>Fastest Endpoint</h4>
                <div class="value good" style="font-size: 14px;">${data.summary.fastestEndpoint}</div>
            </div>
        </div>
        
        <h2>📈 Endpoint Performance by Category</h2>
        
        ${Object.entries(data.categoryBreakdown).map(([category, catData]) => `
            <div class="category-section">
                <div class="category-title">
                    ${category.toUpperCase()} 
                    (${catData.count} endpoints, avg: ${catData.avgTime.toFixed(0)}ms, cache hit: ${catData.avgCacheHitRate.toFixed(0)}%)
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Endpoint</th>
                            <th>Type</th>
                            <th>Avg Time</th>
                            <th>Min</th>
                            <th>Max</th>
                            <th>P95</th>
                            <th>TTFB</th>
                            <th>Size</th>
                            <th>Cache Hit</th>
                            <th>Success</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${catData.endpoints.map(r => `
                            <tr>
                                <td>
                                    <strong>${r.endpoint.name}</strong>
                                    ${r.endpoint.critical ? '<span class="bad">★</span>' : ''}
                                    <br><small>${r.endpoint.path}</small>
                                </td>
                                <td>${r.endpoint.type.toUpperCase()}</td>
                                <td class="${r.stats.avgTime < 200 ? 'good' : r.stats.avgTime < 500 ? 'warning' : 'bad'}">
                                    <strong>${r.stats.avgTime ? r.stats.avgTime.toFixed(0) : 'N/A'}ms</strong>
                                    ${r.stats.avgCachedTime && r.stats.avgUncachedTime ? `
                                        <br>
                                        <small>Cached: ${r.stats.avgCachedTime.toFixed(0)}ms</small>
                                        <br>
                                        <small>Uncached: ${r.stats.avgUncachedTime.toFixed(0)}ms</small>
                                    ` : ''}
                                </td>
                                <td>${r.stats.minTime ? r.stats.minTime.toFixed(0) : 'N/A'}ms</td>
                                <td>${r.stats.maxTime ? r.stats.maxTime.toFixed(0) : 'N/A'}ms</td>
                                <td>${r.stats.p95 ? r.stats.p95.toFixed(0) : 'N/A'}ms</td>
                                <td>${r.stats.avgTTFB ? r.stats.avgTTFB.toFixed(0) : 'N/A'}ms</td>
                                <td>${r.stats.avgSize ? (r.stats.avgSize / 1024).toFixed(1) : 'N/A'}KB</td>
                                <td>
                                    <span class="cache-badge ${r.stats.cacheHitRate > 50 ? 'cache-hit' : 'cache-miss'}">
                                        ${r.stats.cacheHitRate ? r.stats.cacheHitRate.toFixed(0) : 0}%
                                    </span>
                                </td>
                                <td class="${r.stats.successRate === 100 ? 'good' : r.stats.successRate > 95 ? 'warning' : 'bad'}">
                                    ${r.stats.successRate ? r.stats.successRate.toFixed(0) : 0}%
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `).join('')}
        
        <h2>⚠️ Recommendations</h2>
        ${data.summary.recommendations.length === 0 ? 
            '<p class="good">✅ All endpoints are performing well!</p>' :
            `
            <p>Found ${data.summary.recommendations.length} issues to address:</p>
            ${data.summary.recommendations.map(rec => `
                <div class="recommendation ${rec.severity}">
                    <strong>${rec.severity}:</strong> ${rec.endpoint} (${rec.category})<br>
                    <strong>Issue:</strong> ${rec.issue}<br>
                    <strong>Suggestion:</strong> ${rec.suggestion}
                </div>
            `).join('')}
            `
        }
        
        <h2>📊 Cache Performance Analysis</h2>
        <div class="category-section">
            <p>Cache implementation is ${data.summary.overallCacheHitRate > 50 ? 
                '<span class="good">working effectively</span>' : 
                '<span class="warning">needs improvement</span>'} 
                with an overall hit rate of <strong>${data.summary.overallCacheHitRate.toFixed(1)}%</strong>
            </p>
            <ul>
                <li>APIs with best cache performance benefit from Redis caching</li>
                <li>Pages without cache headers may need CDN configuration</li>
                <li>Consider implementing stale-while-revalidate for better UX</li>
            </ul>
        </div>
    </div>
</body>
</html>
  `;
}

// Función principal
async function main() {
  console.log(`${colors.blue}╔═════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║     Performance Testing Tool v2.0      ║${colors.reset}`);
  console.log(`${colors.blue}║         Now with People Testing        ║${colors.reset}`);
  console.log(`${colors.blue}╚═════════════════════════════════════════╝${colors.reset}`);
  console.log(`\nTesting: ${CONFIG.baseUrl}`);
  console.log(`Iterations per endpoint: ${CONFIG.iterations}`);
  console.log(`Total endpoints: ${ENDPOINTS.length}`);
  
  const allResults = [];
  
  // Agrupar endpoints por categoría para mejor organización
  const categories = [...new Set(ENDPOINTS.map(e => e.category))];
  
  for (const category of categories) {
    const categoryEndpoints = ENDPOINTS.filter(e => e.category === category);
    console.log(`\n${colors.yellow}══════════ ${category.toUpperCase()} ENDPOINTS ══════════${colors.reset}`);
    
    for (const endpoint of categoryEndpoints) {
      const result = await measureEndpoint(endpoint, CONFIG.iterations);
      allResults.push(result);
      
      // Mostrar resumen
      if (result.stats.avgTime) {
        const cacheInfo = result.stats.cacheHitRate > 0 ? 
          ` | Cache: ${result.stats.cacheHitRate.toFixed(0)}%` : '';
        console.log(`  Average: ${colors.cyan}${result.stats.avgTime.toFixed(2)}ms${colors.reset} | P95: ${result.stats.p95.toFixed(2)}ms | Success: ${result.stats.successRate.toFixed(0)}%${cacheInfo}`);
      }
    }
  }
  
  // Load tests para endpoints críticos
  console.log(`\n${colors.yellow}══════════ LOAD TESTS (Critical Endpoints) ══════════${colors.reset}`);
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
  console.log(`\n${colors.yellow}══════════ GENERATING REPORTS ══════════${colors.reset}`);
  const { htmlPath } = await generateReport(allResults);
  
  // Mostrar resumen final
  console.log(`\n${colors.green}╔══════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.green}║          TEST COMPLETED              ║${colors.reset}`);
  console.log(`${colors.green}╚══════════════════════════════════════╝${colors.reset}`);
  
  // Comparación entre categorías
  console.log(`\n${colors.cyan}📊 Category Comparison:${colors.reset}`);
  const movieResults = allResults.filter(r => r.endpoint.category === 'movies');
  const peopleResults = allResults.filter(r => r.endpoint.category === 'people');
  
  if (movieResults.length > 0 && peopleResults.length > 0) {
    const moviesAvg = average(movieResults.map(r => r.stats.avgTime || 0));
    const peopleAvg = average(peopleResults.map(r => r.stats.avgTime || 0));
    const moviesCacheHit = average(movieResults.map(r => r.stats.cacheHitRate || 0));
    const peopleCacheHit = average(peopleResults.map(r => r.stats.cacheHitRate || 0));
    
    console.log(`  Movies: ${moviesAvg.toFixed(2)}ms avg, ${moviesCacheHit.toFixed(0)}% cache hit`);
    console.log(`  People: ${peopleAvg.toFixed(2)}ms avg, ${peopleCacheHit.toFixed(0)}% cache hit`);
    
    if (peopleAvg < moviesAvg) {
      const improvement = ((moviesAvg - peopleAvg) / moviesAvg * 100);
      console.log(`  ${colors.green}People endpoints are ${improvement.toFixed(1)}% faster!${colors.reset}`);
    } else {
      const slower = ((peopleAvg - moviesAvg) / moviesAvg * 100);
      console.log(`  ${colors.yellow}People endpoints are ${slower.toFixed(1)}% slower${colors.reset}`);
    }
  }
  
  console.log(`\n${colors.blue}View detailed report: file://${htmlPath}${colors.reset}`);
}

// Ejecutar
main().catch(console.error);