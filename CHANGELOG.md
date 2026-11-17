# Change Log

All notable changes to the "django-static-navigator" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

- Ya no redefine los lenguajes de `.html` y `.py`, que podían interferir con otras extensiones.
- También funciona en archivos `.html` con el lenguaje HTML común.
- Nueva opción `staticDirs` para varias carpetas de estáticos; `staticDir` queda obsoleta.
- Nueva opción `searchAppStatic`: busca en las carpetas `static/` de cada app.
- Rutas compatibles con Windows, Linux y WSL.
- Solo navega si el archivo existe.
- Acepta `{%static 'x'%}`, `{% static 'x' as var %}` y rutas con query string.
- Se quitan dependencias sin uso (`webpack`, `webpack-cli`, `@types/jest`).

## [0.1.0]

- Initial release