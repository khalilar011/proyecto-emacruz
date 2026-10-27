# Git y GitHub para el equipo

## Usar el repositorio oficial

El repositorio oficial es `https://github.com/khalilar011/proyecto-emacruz`. En un equipo nuevo, crea la copia de trabajo mediante un clon para conservar todo el historial:

```bash
git clone https://github.com/khalilar011/proyecto-emacruz.git alerta-ruta
cd alerta-ruta
git switch main
git pull --ff-only
```

En la copia oficial ya preparada, verifica antes de trabajar que la raíz, la rama y el remoto sean los esperados:

```bash
git rev-parse --show-toplevel
git branch --show-current
git remote -v
git status
```

No ejecutes `git init` dentro de esta copia ni reemplaces `origin` por un repositorio nuevo. Si Git solicita identidad al confirmar cambios, configura el nombre y correo de la persona que realiza el commit. Nunca guardes claves o tokens en el repositorio.

## Una historia, una rama, cambios revisables

```bash
git switch -c feature/SCRUM-XX-descripcion
git status
git diff
git add .
git commit -m "feat: describir cambio SCRUM-XX"
git push -u origin feature/SCRUM-XX-descripcion
```

Abre una solicitud de cambios hacia `main` en GitHub. Revisa, integra y relaciona el commit/PR con la historia de Jira. Una historia se cierra cuando sus criterios de validación se cumplen y el trabajo está integrado. Usa nombres de ramas diferentes para cada historia, y sincroniza `main` con `git pull` antes de iniciar la siguiente.

## Convención de datos

Git versiona documentación, notebooks y código propio; no versiona datos originales, archivos procesados, resultados grandes ni secretos. Comparte datos institucionales únicamente por los medios autorizados. Si más adelante se decide publicar un conjunto de datos, documenta su procedencia y permiso antes de cambiar `.gitignore`.
