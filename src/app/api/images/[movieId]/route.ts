import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ movieId: string }> }
) {
  const { movieId } = await params;
  
  try {
    // Ruta al directorio de imágenes
    const imageDir = path.join(process.cwd(), 'public', 'images', movieId);
    
    // Verificar si el directorio existe
    if (!fs.existsSync(imageDir)) {
      return NextResponse.json({ 
        error: 'Directorio de imágenes no encontrado',
        images: []
      }, { status: 404 });
    }
    
    // Leer archivos del directorio
    const files = fs.readdirSync(imageDir);
    
    // Filtrar solo archivos de imagen
    const imageFiles = files
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
      })
      .map((file, index) => ({
        filename: file,
        url: `/images/${movieId}/${file}`,
        name: file.replace(/\.[^/.]+$/, ''), // nombre sin extensión
        index: index
      }))
      .sort(); // Ordenar alfabéticamente
    
    return NextResponse.json({
      movieId,
      count: imageFiles.length,
      images: imageFiles
    });
    
  } catch (error) {
    console.error('Error leyendo directorio de imágenes:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      images: []
    }, { status: 500 });
  }
}