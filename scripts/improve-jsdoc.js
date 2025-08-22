// scripts/improve-jsdoc.js

const fs = require('fs');

const improvements = {
  'src/lib/people/peopleConstants.ts': {
    'GENDER_OPTIONS': {
      old: '/**\n * GENDER_OPTIONS\n * @TODO Add documentation\n */',
      new: '/**\n * Opciones de género disponibles para personas\n * @constant\n * @type {Array<{value: string, label: string}>}\n */'
    },
    'PERSON_LINK_TYPES': {
      old: '/**\n * PERSON_LINK_TYPES\n * @TODO Add documentation\n */',
      new: '/**\n * Tipos de enlaces externos para personas (IMDB, Wikipedia, etc.)\n * @constant\n * @type {Array<{value: string, label: string}>}\n */'
    }
  },
  'src/lib/movies/movieConstants.ts': {
    'MOVIE_STAGES': {
      old: '/**\n * MOVIE_STAGES\n * @TODO Add documentation\n */',
      new: '/**\n * Estados posibles de producción de una película\n * @constant\n * @type {Array<{value: string, label: string}>}\n */'
    },
    'DATA_COMPLETENESS_OPTIONS': {
      old: '/**\n * DATA_COMPLETENESS_OPTIONS\n * @TODO Add documentation\n */',
      new: '/**\n * Niveles de completitud de datos de una película\n * @constant\n * @type {Array<{value: string, label: string}>}\n */'
    }
  },
  'src/lib/utils.ts': {
    'cn': {
      old: '/**\n * cn\n * @TODO Add documentation\n */',
      new: '/**\n * Combina clases de Tailwind CSS de forma segura\n * @param {...ClassValue} inputs - Clases CSS a combinar\n * @returns {string} Clases combinadas y optimizadas\n */'
    }
  }
};

console.log('📝 Mejorando documentación JSDoc...\n');

Object.entries(improvements).forEach(([file, replacements]) => {
  if (!fs.existsSync(file)) {
    console.log(`❌ No encontrado: ${file}`);
    return;
  }
  
  let content = fs.readFileSync(file, 'utf8');
  let modified = false;
  
  Object.entries(replacements).forEach(([funcName, { old, new: newDoc }]) => {
    if (content.includes(old)) {
      content = content.replace(old, newDoc);
      modified = true;
      console.log(`   ✅ ${file} - ${funcName}`);
    }
  });
  
  if (modified) {
    fs.writeFileSync(file, content);
  }
});

console.log('\n✅ JSDoc mejorados donde fue posible');