# Django Static Navigator

Abre con **Ctrl+clic** (o F12) los archivos estáticos referenciados en un proyecto Django.

- En plantillas: `{% static 'css/app.css' %}`, `{%static "js/app.js"%}`, `{% static 'img/logo.png' as logo %}`.
- En archivos Python: strings que terminan en las extensiones configuradas, por ejemplo `'js/main.js'`.

Si el archivo no existe, no se abre nada.

## Dónde busca

1. En cada carpeta de `staticDirs`, dentro de cada carpeta abierta en el workspace.
2. Si no lo encuentra y `searchAppStatic` está activo, en cualquier carpeta `static/` del proyecto (estáticos de cada app). Se ignoran `node_modules`, entornos virtuales y `staticfiles`.

Funciona igual en Windows, Linux y WSL: las rutas aceptan `/` o `\`.

## Configuración (settings.json)

| Opción | Por defecto | Descripción |
|---|---|---|
| `django-static-navigator.staticDirs` | `["static", "public/static"]` | Carpetas de estáticos relativas a la raíz, en orden de prioridad. |
| `django-static-navigator.searchAppStatic` | `true` | Buscar en las carpetas `static/` de las apps si no está en `staticDirs`. |
| `django-static-navigator.filesExtensions` | `["js", "css"]` | Extensiones que se reconocen en archivos Python. |
| `django-static-navigator.staticDir` | `""` | Obsoleto. Si se completa, se agrega a `staticDirs`. |

## Desarrollo

```bash
npm install
npm test   # compila y corre los tests
```
