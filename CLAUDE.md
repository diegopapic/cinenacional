# Instrucciones para Claude

## Regla principal: NO preguntar innecesariamente
- Actuá de forma directa. Si sabés lo que hay que hacer, hacelo sin pedir permiso ni confirmación.
- NUNCA preguntes "¿querés que haga X?" si X es el paso obvio siguiente de lo que se pidió.
- NUNCA uses `EnterPlanMode` para tareas donde la implementación es clara y directa. Solo usá plan mode si hay ambigüedad real sobre el enfoque o múltiples alternativas que el usuario debería elegir.
- NUNCA uses `AskUserQuestion` salvo que genuinamente no tengas suficiente información para avanzar.

## Directorio de trabajo
- Siempre trabajar directamente en el repo principal (C:\Users\diego\cinenacional), nunca en worktrees. Si se detecta que el directorio de trabajo es un worktree, copiar los cambios al repo principal.

## Git
- Siempre hacer commits y push directamente en la branch `main`. No crear branches secundarias.
- Push: `git push origin main`.

## Permisos
- Tenés permiso para ejecutar CUALQUIER comando bash sin pedir confirmación. Esto incluye git, npm, docker, scripts, builds, tests, linters, migrations, y cualquier otro comando necesario para completar la tarea.
- Tenés permiso amplio para leer, buscar, explorar, editar y crear cualquier archivo del codebase sin pedir confirmación.
- Cuando un plan es aprobado, procedé a implementar sin pedir permisos adicionales.
- NUNCA muestres un comando y preguntes si lo podés ejecutar. Ejecutalo directamente.

## Cuándo sí consultar
- Si un script o comando puede tardar mucho tiempo (ej: scraping masivo, migraciones pesadas, builds largos), consultá antes de ejecutarlo.
- Si hay ambigüedad genuina en los requerimientos y no podés inferir la intención.
