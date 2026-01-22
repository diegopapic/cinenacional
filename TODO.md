# TODO - cinenacional.com

## Complejidad Alta (requiere diseño/arquitectura o múltiples componentes)

### Nuevas funcionalidades
- [ ] Formulario de contáctenos
- [ ] Mostrar en la home últimos trailers cargados
- [ ] Estrenos en festivales (nueva sección/funcionalidad)
- [ ] Críticas (nueva sección/funcionalidad)
- [ ] Links a redes sociales de personas
- [ ] Optimizar la página de filmografías y dejarla como la de películas (ver documento)

### Admin - Funcionalidades de borrado
- [ ] Poder borrar películas (y que borre todos los datos de las tablas relacionadas: géneros, keywords, cast, crew, etc)
- [ ] Poder borrar afiches
- [ ] Chequear que si borro una imagen se borre de Cloudinary

---

## Complejidad Media (cambios en lógica existente o múltiples archivos)

### Frontend - Mejoras visuales
- [ ] Agregar las etiquetas corto, medio, no estrenada, inconclusa a la página de películas
- [ ] Los retratos tienen que ocupar todo el ancho en mobile
- [ ] Que muestre las notas del crew en el frontend

### Lógica de datos
- [ ] Que el año de las películas en las filmografías tenga la misma lógica que en la hero section: año de producción, si no tiene año de estreno, si tampoco tiene nada
- [ ] Si no tiene fecha de nacimiento, mostrar igual el lugar: "Nació en Ciudad de Buenos Aires, Argentina"

### Admin - Mejoras
- [ ] Ahora cuando pongo "Actualizar película", cierra la ventana. Que no la cierre (y chequear que si cambio de pestaña no se borren los datos)

---

## Complejidad Baja (cambios puntuales o bugs simples)

### Bugs
- [ ] Cuando grabo una línea de cast o crew repetida (misma persona, mismo rol) tira error - mejorar mensaje o prevenir
- [ ] No me permite subir solo mes y año en las fechas de nacimiento y muerte (sí solo año)

### Mejoras rápidas
- [ ] Incluir en las estadísticas del header la cantidad de imágenes

---

## Optimizaciones técnicas (baja prioridad)

### Dependencias
- [ ] Actualizar a ESLint 9 cuando Next.js lo soporte oficialmente
- [ ] Considerar actualizar a Prisma 7 (es un major update, requiere seguir guía de migración)
