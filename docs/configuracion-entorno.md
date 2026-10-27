# Configurar el entorno en Ubuntu

Ejecuta los comandos en una terminal ubicada en la raíz `alerta-ruta/`. Si usas WSL con Ubuntu, sigue los mismos pasos dentro de WSL.

## 1. Verificar herramientas

```bash
python3 --version
git --version
codex --version
```

Codex ya puede estar instalado globalmente; **no se instala dentro de `.venv`**. Si faltan Python, Git o el módulo de entornos virtuales:

```bash
sudo apt update
sudo apt install python3 python3-venv python3-pip git
```

Si Git y Python ya funcionan, basta instalar el paquete que falte. Nunca ejecutes `sudo pip install` para las dependencias del proyecto.

## 2. Crear un entorno para este proyecto

```bash
cd /ruta/donde/extraiste/alerta-ruta
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

Tu terminal normalmente mostrará `(.venv)`. Comprueba:

```bash
which python
python -c "import pandas, sklearn, openpyxl; print('Entorno listo')"
git status
```

`which python` debe apuntar a `alerta-ruta/.venv/bin/python`. `git status` debe mostrar la rama de la copia oficial descrita en la guía Git; no inicialices otro repositorio dentro de esta carpeta.

En otra terminal, vuelve a `alerta-ruta/` y ejecuta `source .venv/bin/activate`. Para cerrar: `deactivate`. Después de clonar el proyecto en otra máquina, vuelve a crear `.venv` e instala `requirements.txt`.

## 3. Cuadernos y Codex

```bash
jupyter lab
```

En una segunda terminal, desde la misma raíz, puedes abrir `codex`. Pídele una tarea concreta vinculada con una historia de Jira; por ejemplo: «Lee README.md y AGENTS.md. Propón los campos para registrar contingencias por distrito en la fase de comprensión de datos. No inventes mediciones ni modifiques data/raw/». Revisa los cambios con `git diff` antes de confirmarlos.

## 4. Alternativa Conda

Si el equipo ya usa Conda y prefiere reproducir la modalidad del ZIP original:

```bash
conda env create --file environment.yml
conda activate alerta_ruta
```

No actives Conda y `.venv` al mismo tiempo. La opción principal de esta guía es `.venv` en Ubuntu; `environment-mac-intel.yml` pertenecía al ejemplo y no es necesario aquí.
