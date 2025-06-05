import requests
import json

def get_all_files(owner, repo, branch='main', path=''):
    """
    Obtiene recursivamente todas las URLs raw de archivos en un repositorio GitHub
    """
    raw_urls = []
    
    # URL de la API de GitHub
    api_url = f"https://api.github.com/repos/{owner}/{repo}/contents/{path}"
    if branch:
        api_url += f"?ref={branch}"
    
    try:
        # Hacer petición a la API
        response = requests.get(api_url)
        response.raise_for_status()
        
        items = response.json()
        
        # Procesar cada item
        for item in items:
            if item['type'] == 'file':
                # Es un archivo, agregar su URL raw
                raw_url = f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{item['path']}"
                raw_urls.append({
                    'path': item['path'],
                    'raw_url': raw_url,
                    'size': item['size']
                })
            elif item['type'] == 'dir':
                # Es un directorio, explorar recursivamente
                sub_urls = get_all_files(owner, repo, branch, item['path'])
                raw_urls.extend(sub_urls)
    
    except requests.exceptions.RequestException as e:
        print(f"Error al acceder a {path}: {e}")
    
    return raw_urls

def export_to_file(raw_urls, output_file='raw_urls.txt'):
    """
    Exporta las URLs a un archivo de texto
    """
    with open(output_file, 'w', encoding='utf-8') as f:
        # Escribir solo las URLs
        for item in raw_urls:
            f.write(f"{item['raw_url']}\n")
    
    # También crear un archivo JSON con más información
    with open('raw_urls_detailed.json', 'w', encoding='utf-8') as f:
        json.dump(raw_urls, f, indent=2, ensure_ascii=False)

def export_as_markdown(raw_urls, output_file='raw_urls.md'):
    """
    Exporta las URLs en formato Markdown organizado por carpetas
    """
    # Organizar por carpetas
    organized = {}
    for item in raw_urls:
        parts = item['path'].split('/')
        if len(parts) > 1:
            folder = parts[0]
        else:
            folder = 'root'
        
        if folder not in organized:
            organized[folder] = []
        organized[folder].append(item)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("# URLs Raw del Repositorio\n\n")
        
        for folder, files in sorted(organized.items()):
            f.write(f"## {folder}/\n\n")
            for file in sorted(files, key=lambda x: x['path']):
                f.write(f"- [{file['path']}]({file['raw_url']})\n")
            f.write("\n")

# Usar el script
if __name__ == "__main__":
    owner = "diegopapic"
    repo = "cinenacional"
    branch = "main"
    
    print(f"Obteniendo archivos de {owner}/{repo}...")
    all_files = get_all_files(owner, repo, branch)
    
    print(f"Encontrados {len(all_files)} archivos")
    
    # Exportar en diferentes formatos
    export_to_file(all_files)
    export_to_file(all_files, 'raw_urls_prompt.txt')
    export_as_markdown(all_files)
    
    print("Archivos exportados:")
    print("- raw_urls.txt: Lista simple de URLs")
    print("- raw_urls_detailed.json: Información detallada en JSON")
    print("- raw_urls.md: Formato Markdown organizado")
    
    # Mostrar estadísticas
    total_size = sum(item['size'] for item in all_files)
    print(f"\nEstadísticas:")
    print(f"- Total de archivos: {len(all_files)}")
    print(f"- Tamaño total: {total_size:,} bytes ({total_size/1024/1024:.2f} MB)")
    
    # Mostrar archivos más importantes
    print("\nArchivos principales:")
    important_files = [
        'package.json',
        'app/page.tsx',
        'app/layout.tsx',
        'next.config.js'
    ]
    
    for file in all_files:
        if any(file['path'].endswith(f) for f in important_files):
            print(f"- {file['path']}: {file['raw_url']}")