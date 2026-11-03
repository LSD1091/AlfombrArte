# Trufing · web

Web estática de alfombras hechas a mano por encargo. HTML, CSS y JavaScript sin frameworks ni build step, alojada en GitHub Pages. Las solicitudes de encargo se guardan en Supabase.

## Estructura

```
index.html               Inicio
catalogo.html            Catálogo filtrable (lee data/catalogo.json)
alfombra.html?id=<id>    Ficha de alfombra (lee data/catalogo.json)
tu-diseno.html           Diseño propio + formulario
encargar.html            Formulario de encargo (?tipo=…&modelo=<id>)
gracias.html             Confirmación tras enviar
como-trabajamos.html     Proceso, plazos, materiales, cuidados, envío, FAQ
sobre-nosotros.html
contacto.html
legal/                   Aviso legal, privacidad, cookies, condiciones de venta (BORRADORES)
404.html                 Página de error de GitHub Pages
css/styles.css           Estilos de todo el sitio
js/main.js               Script de todo el sitio (menú, catálogo, ficha, formulario)
js/config.js             URL de Supabase, clave publicable, plazo de respuesta, flags de fases 2-3
data/catalogo.json       Las alfombras del catálogo
fonts/                   Fraunces y Figtree (autoalojadas)
img/catalogo/<id>/       Fotos de cada alfombra
supabase/migrations/     SQL aplicado en Supabase (copia de referencia)
tools/servidor.ps1       Servidor local para pruebas
sitemap.xml, robots.txt, .nojekyll
```

## Probar en local

`fetch` no funciona abriendo los archivos con doble clic, así que hace falta un servidor. En Windows, sin instalar nada:

```bash
powershell -ExecutionPolicy Bypass -File tools/servidor.ps1
```

Y abre http://localhost:8080. (Si tienes Python: `python -m http.server 8080`.)

## Añadir una alfombra al catálogo

1. **Fotos.** Crea la carpeta `img/catalogo/<id>/` (el `id` en minúsculas, sin espacios ni tildes, p. ej. `bosque-azul`). Por cada foto, guarda dos versiones WebP con proporción **4:5** (vertical):
   - `1-800.webp` (800 × 1000 px) y `1-1600.webp` (1600 × 2000 px)
   - `2-800.webp`, `2-1600.webp` para la segunda foto, etc.

   Para convertir y redimensionar puedes usar https://squoosh.app (formato WebP, calidad 75-80).

2. **Datos.** Abre `data/catalogo.json`, copia un bloque de `alfombras` y edítalo:

   ```json
   {
     "id": "bosque-azul",
     "nombre": "Bosque azul",
     "categoria": "hechas",
     "descripcion": "Texto que aparece en la ficha.",
     "fotos": [
       { "archivo": "1", "alt": "Alfombra Bosque azul en un dormitorio" },
       { "archivo": "2", "alt": "Detalle del relieve" }
     ],
     "medidas": [{ "ancho": 120, "largo": 170 }],
     "formas": ["rectangular"],
     "colores": [{ "nombre": "Azul noche", "hex": "#1f2a44" }],
     "precio_desde": 420,
     "destacada": false
   }
   ```

   - `categoria`: `idea`, `hechas` o `inspiracion`.
   - `formas`: cualquiera de `rectangular`, `redonda`, `irregular`. En redondas, pon `ancho` = `largo` (es el diámetro).
   - `precio_desde`: número o `null` si no quieres mostrar precio.
   - `destacada: true` la muestra en Inicio (salen las 3 primeras destacadas).
   - Mientras `fotos` esté vacío (`[]`) se muestra un placeholder; el bloque `placeholder` solo sirve para eso y puedes borrarlo cuando tengas fotos.
   - Cuidado con las comas: cada bloque va separado por una coma, y el último no lleva coma detrás. Si el catálogo deja de cargar, pega el archivo en https://jsonlint.com para ver el error.

3. **Sitemap.** Añade una línea en `sitemap.xml`:
   `<url><loc>https://lsd1091.github.io/AlfombrArte/alfombra.html?id=bosque-azul</loc></url>`

4. Sube los cambios a GitHub (ver abajo). En un par de minutos estará publicada.

## Sustituir las fotos generales (placeholders)

Cada hueco lleva encima un comentario `<!-- FOTO: … -->` que describe qué foto va ahí. Sustituye el `<div class="foto foto--placeholder …">` por:

```html
<div class="foto" style="--ar: 4/5">
  <img src="img/portada-800.webp"
       srcset="img/portada-800.webp 800w, img/portada-1600.webp 1600w"
       sizes="(min-width: 52rem) 50vw, 100vw"
       alt="Descripción de la foto" width="800" height="1000" loading="lazy" decoding="async">
</div>
```

En la foto principal de Inicio usa `loading="eager"` (es lo primero que se ve). Añade también `img/og-portada.jpg` (1200 × 630) para cuando se comparta la web en redes.

## Antes de publicar: placeholders pendientes

Busca en todo el proyecto `[` y `TU-USUARIO`:

- `lsd1091.github.io/AlfombrArte` → tu URL real (en todas las páginas, `sitemap.xml` y `robots.txt`).
- `[EMAIL DE CONTACTO]`, `[TITULAR]`, `[NIF]`, teléfono, Instagram, dirección, horario.
- Técnica y materiales reales (Cómo trabajamos), envío y métodos de pago.
- Textos de Sobre nosotros y cifras.
- **Testimonios**: los de Inicio son de ejemplo (etiqueta «Ejemplo»). Sustitúyelos por opiniones reales con permiso o elimina la sección. No publiques testimonios inventados.
- **Páginas legales**: son borradores. Revisión profesional obligatoria, en especial desistimiento, señal, garantía y transferencias internacionales de datos.
- Borra en Supabase la solicitud de prueba («Prueba Desarrollo»).

## Desplegar en GitHub Pages

1. Crea un repositorio en GitHub llamado `alfombrarte` (público; Pages gratis requiere repo público en cuentas gratuitas).
2. Sube el contenido de esta carpeta a la rama `main`:

   ```bash
   git init
   git add .
   git commit -m "Primera versión de la web"
   git branch -M main
   git remote add origin https://github.com/LSD1091/AlfombrArte.git
   git push -u origin main
   ```
3. En GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, rama `main`, carpeta `/ (root)`. Guarda.
4. En 1-2 minutos la web estará en `https://lsd1091.github.io/AlfombrArte/`.
5. Cada vez que hagas `git push`, se vuelve a publicar sola.

**Dominio propio** (opcional): en Settings → Pages → Custom domain escribe tu dominio y configura el DNS como indica GitHub. Después cambia `<base href="/alfombrarte/">` por `<base href="/">` en `404.html` y actualiza las URL absolutas (canonical, Open Graph, sitemap, robots).

La carpeta `capturas/` y `.claude/` están en `.gitignore` y no se publican.

## Ver las solicitudes

En https://supabase.com/dashboard → proyecto **AlfombrArte**:

- **Table Editor → solicitudes**: todas las solicitudes. La columna `estado` empieza en `nueva`; puedes cambiarla a mano (`en_revision`, `presupuestada`, `aceptada`…). Las columnas `presupuesto_cents`, `senal_cents`, `notas_internas`, etc. son para tu uso interno.
- **Storage → imagenes-clientes**: las imágenes, en una carpeta con el mismo `id` de la solicitud (`imagen_path`).

Supabase no avisa de las solicitudes nuevas. Mientras no se añada un aviso por email (Edge Function + Resend), revisa el panel a diario.

### Seguridad

- En la web solo está la **clave publicable** (`js/config.js`). Nunca pongas ahí la `service_role`.
- El rol anónimo solo puede **insertar** solicitudes (y solo las columnas del cliente) y **subir** imágenes JPG/PNG/WebP de hasta 10 MB. No puede leer, modificar, borrar ni sobrescribir nada. Comprobado el 2026-11-01.
- El campo oculto `web` del formulario es un honeypot: si viene relleno, se muestra la confirmación pero no se envía nada.

## Fases 2 y 3 (preparado, no implementado)

**Fase 2 — señal con Stripe Payment Links.** Al aceptar un presupuesto, crea en Stripe un Payment Link con el importe de la señal y pégalo en la columna `stripe_payment_link` de la solicitud; guarda los importes en `presupuesto_cents` / `senal_cents` y cambia `estado` a `presupuestada`. No requiere cambios en la web.

**Fase 3 — Checkout desde la web.**
- `supabase/functions/` (vacío): aquí irán una Edge Function `crear-checkout` (recibe el id de la solicitud, calcula el importe en el servidor y crea la sesión de Stripe Checkout) y un `webhook-stripe` que marque `senal_pagada_at` / `pago_final_at` y actualice `estado`. Ambas usan la `service_role` en el servidor, nunca en el navegador.
- `js/config.js → pagos` tiene los flags (`activo`, `edgeFunctionCheckout`) para activar el botón de pago.
- La tabla ya tiene `estado`, importes y `stripe_checkout_session_id` (único). El panel interno necesitará usuarios autenticados de Supabase y políticas RLS de lectura/edición para el rol `authenticated` restringidas a los administradores.
