# Markdown Studio Pro

Editor Markdown local con vista previa, vista dividida, Mermaid, ecuaciones KaTeX y MathJax, tablas, índice, modos oscuro, concentración y zen, corrección ortográfica del navegador, estadísticas y exportación.

Los controles de exportación, motor matemático y tipografía usan menús propios. «Tipografías» permite elegir la fuente de lectura y la del editor; las preferencias se guardan en el navegador. En móvil, el modo Zen muestra siempre el botón «Salir de Zen».

## Ejecutar

```powershell
npm install
npm run dev
```

Para generar y servir la versión que funciona sin conexión:

```powershell
npm run build
npm run preview
```

Abra la aplicación una vez mientras el servidor está disponible. El service worker guarda todos los archivos del paquete para visitas posteriores sin red. El texto se guarda automáticamente en `localStorage` del navegador. También puede abrir un archivo `.md` local.

## Atajos

| Acción | Atajo |
| --- | --- |
| Negrita | Ctrl/Cmd+B |
| Cursiva | Ctrl/Cmd+I |
| Enlace | Ctrl/Cmd+K |
| Encabezado | Ctrl/Cmd+Alt+1 |
| Abrir Markdown | Ctrl/Cmd+O |
| Guardar Markdown | Ctrl/Cmd+S |
| Cambiar vista dividida | Ctrl/Cmd+\\ |
| Concentración | Ctrl/Cmd+Shift+J |

## Alcance actual

- PlantUML se interpreta localmente para diagramas de secuencia y flujos simples. No incluye el motor Java completo de PlantUML.
- PDF se genera mediante el diálogo de impresión del navegador. Seleccione «Guardar como PDF».
- DOCX conserva títulos, párrafos, listas y contenido tabular en texto. Los diagramas y las fórmulas se exportan como texto en DOCX; para conservarlos visualmente, use PDF o HTML.
- La corrección ortográfica usa el diccionario integrado del navegador y depende de los idiomas instalados en él.
