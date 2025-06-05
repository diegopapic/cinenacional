import json
import urllib.request
from datetime import datetime

class GitHubPromptGenerator:
    def __init__(self, owner, repo, branch='main'):
        self.owner = owner
        self.repo = repo
        self.branch = branch
        self.base_raw_url = f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}"
        
    def get_tree(self):
        """Obtiene el árbol completo del repositorio"""
        url = f"https://api.github.com/repos/{self.owner}/{self.repo}/git/trees/{self.branch}?recursive=1"
        
        try:
            with urllib.request.urlopen(url) as response:
                data = json.loads(response.read())
                return data['tree']
        except Exception as e:
            print(f"Error obteniendo árbol: {e}")
            return []
    
    def filter_important_files(self, tree):
        """Filtra solo los archivos importantes"""
        important_extensions = {'.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.css', '.scss', '.env.example'}
        ignore_dirs = {'node_modules', '.next', 'dist', 'build', '.git', 'coverage'}
        
        filtered = []
        for item in tree:
            if item['type'] != 'blob':
                continue
                
            path = item['path']
            
            # Ignorar directorios no deseados
            if any(ignored in path for ignored in ignore_dirs):
                continue
            
            # Verificar extensión
            if any(path.endswith(ext) for ext in important_extensions):
                filtered.append({
                    'path': path,
                    'url': f"{self.base_raw_url}/{path}",
                    'size': item.get('size', 0)
                })
        
        return filtered
    
    def categorize_files(self, files):
        """Categoriza archivos por tipo"""
        categories = {
            'config': [],
            'app': [],
            'components': [],
            'lib': [],
            'styles': [],
            'types': [],
            'api': [],
            'other': []
        }
        
        for file in files:
            path = file['path']
            
            if path in ['package.json', 'next.config.js', 'tsconfig.json', '.env.example']:
                categories['config'].append(file)
            elif path.startswith('app/'):
                categories['app'].append(file)
            elif path.startswith('components/'):
                categories['components'].append(file)
            elif path.startswith('lib/') or path.startswith('utils/'):
                categories['lib'].append(file)
            elif path.startswith('styles/'):
                categories['styles'].append(file)
            elif path.startswith('types/'):
                categories['types'].append(file)
            elif path.startswith('api/') or 'api' in path:
                categories['api'].append(file)
            else:
                categories['other'].append(file)
        
        return categories
    
    def generate_prompt(self):
        """Genera el prompt completo"""
        tree = self.get_tree()
        files = self.filter_important_files(tree)
        categorized = self.categorize_files(files)
        
        prompt = f"""# Análisis automático del repositorio {self.owner}/{self.repo}

Fecha de generación: {datetime.now().strftime('%Y-%m-%d %H:%M')}
Total de archivos relevantes: {len(files)}

## Instrucciones para explorar el código

Por favor, lee los siguientes archivos del repositorio en el orden indicado para entender completamente la estructura y funcionamiento del proyecto.

"""
        
        # Archivos de configuración (siempre primero)
        if categorized['config']:
            prompt += "### 1. Archivos de configuración (leer primero)\n"
            for file in categorized['config']:
                prompt += f"- {file['url']}\n"
            prompt += "\n"
        
        # Estructura de la aplicación
        if categorized['app']:
            prompt += "### 2. Estructura de páginas y rutas\n"
            for file in sorted(categorized['app'], key=lambda x: x['path']):
                prompt += f"- {file['url']}\n"
            prompt += "\n"
        
        # Componentes
        if categorized['components']:
            prompt += "### 3. Componentes de UI\n"
            for file in sorted(categorized['components'], key=lambda x: x['path']):
                prompt += f"- {file['url']}\n"
            prompt += "\n"
        
        # Lógica y utilidades
        if categorized['lib']:
            prompt += "### 4. Lógica de negocio y utilidades\n"
            for file in sorted(categorized['lib'], key=lambda x: x['path']):
                prompt += f"- {file['url']}\n"
            prompt += "\n"
        
        # API
        if categorized['api']:
            prompt += "### 5. Endpoints de API\n"
            for file in sorted(categorized['api'], key=lambda x: x['path']):
                prompt += f"- {file['url']}\n"
            prompt += "\n"
        
        # Tipos
        if categorized['types']:
            prompt += "### 6. Definiciones de tipos\n"
            for file in sorted(categorized['types'], key=lambda x: x['path']):
                prompt += f"- {file['url']}\n"
            prompt += "\n"
        
        # Estilos
        if categorized['styles']:
            prompt += "### 7. Estilos\n"
            for file in sorted(categorized['styles'], key=lambda x: x['path']):
                prompt += f"- {file['url']}\n"
            prompt += "\n"
        
        # Otros archivos relevantes
        if categorized['other']:
            prompt += "### 8. Otros archivos\n"
            for file in sorted(categorized['other'], key=lambda x: x['path']):
                prompt += f"- {file['url']}\n"
            prompt += "\n"
        
        prompt += """
## Objetivo del análisis

Necesito que:
1. Entiendas la estructura actual del proyecto
2. Identifiques los modelos de datos utilizados
3. Comprendas el flujo de navegación
4. Analices los componentes y su reutilización
5. Prepares recomendaciones para la migración a:
   - PostgreSQL para la base de datos
   - Elasticsearch/Algolia para búsquedas
   - Cloudinary para imágenes
   - Mejoras en performance y diseño

## Contexto adicional

Este es un sitio tipo IMDB pero especializado en cine argentino. Actualmente está en WordPress y queremos migrarlo manteniendo todos los datos pero mejorando la arquitectura y performance.
"""
        
        return prompt
    
    def save_prompt(self, filename='github_prompt.txt'):
        """Guarda el prompt en un archivo"""
        prompt = self.generate_prompt()
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(prompt)
        print(f"✅ Prompt guardado en: {filename}")
        return prompt

# Usar el generador
if __name__ == "__main__":
    generator = GitHubPromptGenerator('diegopapic', 'cinenacional')
    generator.save_prompt()
    
    # También generar una versión corta con solo URLs
    tree = generator.get_tree()
    files = generator.filter_important_files(tree)
    
    with open('urls_only.txt', 'w') as f:
        for file in files:
            f.write(file['url'] + '\n')
    
    print(f"📄 Lista simple de URLs guardada en: urls_only.txt")
    print(f"📊 Total de archivos relevantes: {len(files)}")