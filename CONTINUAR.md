# CONTINUAR

Estado al **6 de octubre de 2026**. Leer esto antes de tocar nada.

## Qué es

Panel de trabajo de redes de LaTiNa y Centenaria: **Redes Latina | Centenaria**.

- En vivo: https://gestion-nahuel.vercel.app/
- Repo privado `lautaromendezar-cmd/gestion-nahuel`. El push a `main` publica solo (~20 s).
- No confundir con `dist-nahuel` (el panel de puntos de venta, otro repo).

## Usuarios

| Usuario | Variable en Vercel | Ve |
|---|---|---|
| Lautaro | `PANEL_PASSWORD` (8 dígitos) | Todo |
| Franco | `FRANCO_PASSWORD` (6 dígitos) | Semana, Calendario, Ideas (sólo las suyas) |

En Vercel están **sólo los hashes**. Para cambiar un PIN:

```bash
node -e "import('./lib/sesion.mjs').then(m=>console.log(m.hashear('NUEVO_PIN')))"
vercel env rm PANEL_PASSWORD production --yes
vercel env add PANEL_PASSWORD production   # pegar el hash
git commit --allow-empty -m "Redeploy" && git push   # el cambio entra con el próximo deploy
```

Para cerrar **todas** las sesiones abiertas: cambiar `PANEL_SECRET`.

## Cómo está armado

- `public/index.html` + `public/app.js`: el panel. `public/reporte.html` + `reporte.js`:
  hoja A4 para Nahuel. Librerías en `public/vendor/` (sin CDN, por la CSP).
- `api/`: `datos` (todo el CRUD, filtra por rol), `entrar` (PIN), `historial`
  (papelera, sólo Lautaro), `ia` (Claude, sólo Lautaro), `reporte`, `telegram` (bot,
  sólo el chat de Lautaro), `cron` (lunes, martes, diario mar-vie, viernes).
- `lib/db.mjs`: Neon. Tabla `registros` (tipo + jsonb), `cambios` (historial con
  quién), `ingresos` (intentos de PIN). Nada se borra: `borrado` = papelera.
- Tipos: `posteo` (un día del calendario; desde el 6-oct tiene `copy` + `copyPor`, el
  texto sugerido que arma Franco, editable en un detalle con botón «Copiar texto»), `evento`, `paso` (tarea compartida con
  responsable), `idea` (con `autor`), y lo privado de Lautaro (`tarea`, `campana`,
  `metrica`, `nota`, `contacto`, `saber`, `obs`, `ugc`, `diario`).

## Decisiones tomadas con Lautaro (no deshacer sin preguntar)

- El calendario **no** muestra quién carga cada día.
- Franco **no** recibe nada por Telegram: todo lo suyo está en el panel.
- Paleta negra/gris; el color sólo en las etiquetas de marca y en los estados.
- Ejes: Tienda, Distribución, UGC y **Otros** (sorteos, acciones puntuales).
- Avisos abajo a la derecha; usuario y «Salir» en la barra de arriba.

## Seguridad

- PIN: 5 fallidos por IP o 20 en total en 15 min bloquean ingresos nuevos 15 min.
- CSP `script-src 'self'` en `vercel.json`: **no** volver a poner JS dentro del HTML
  ni librerías desde CDN, o la página deja de andar.
- Edición simultánea: los posteos se guardan comparando con lo que veía cada uno
  (409 si el otro cambió el mismo campo).

## Pendiente

- Confirmar en Neon cuántos días de restauración (PITR) tiene el plan.
- Si Neon empieza a gastar horas de cómputo, subir la relectura de 30 s en `app.js`.

## Probar en local

Hace falta `vercel env pull .env.local` (trae `DATABASE_URL`). Las pruebas del 6-oct
se hicieron con un servidor mínimo que monta `api/*.js` y aplica las cabeceras de
`vercel.json`, más Playwright con dos navegadores (uno por usuario), contra la base
real usando datos con prefijo `PRUEBA` y fechas de 2099, borrados al terminar.
