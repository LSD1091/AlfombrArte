# Genera las páginas estáticas a partir de data/catalogo.json:
#   - alfombras/<id>/index.html  (una ficha por alfombra, indexable sin JavaScript)
#   - tarjetas estáticas en catalogo.html e index.html (entre marcadores GEN)
#   - sitemap.xml completo
# Ejecuta este script cada vez que cambies data/catalogo.json:
#   powershell -ExecutionPolicy Bypass -File tools\generar.ps1
$ErrorActionPreference = "Stop"
$raiz = Split-Path -Parent $PSScriptRoot
$utf8 = New-Object System.Text.UTF8Encoding($false)
$es = [Globalization.CultureInfo]::GetCultureInfo("es-ES")
function Leer($rel) { [IO.File]::ReadAllText((Join-Path $raiz $rel), $utf8) }
function Escribir($rel, $texto) {
  $ruta = Join-Path $raiz $rel
  New-Item -ItemType Directory -Force (Split-Path -Parent $ruta) | Out-Null
  [IO.File]::WriteAllText($ruta, $texto, $utf8)
}
function E($s) { ([string]$s).Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;").Replace([string][char]34, "&quot;") }
function Euros($n) { [string]::Format($es, "{0:N0} €", [double]$n) }

$URL = (Leer "tools/dominio.txt").Trim().TrimEnd("/")
$datos = (Leer "data/catalogo.json") | ConvertFrom-Json
$lista = @($datos.alfombras)
$CAT = @{ idea = "Idea"; hechas = "Ya realizada"; inspiracion = "Inspiración" }
$FORMAS = @{ rectangular = "rectangular"; redonda = "redonda"; irregular = "forma libre" }
$hoy = (Get-Date).ToString("yyyy-MM-dd")

# Cabecera y pie, tomados de catalogo.html y con rutas relativas a /alfombras/<id>/
$htmlCatalogo = Leer "catalogo.html"
function Recortar($html, $ini, $fin) { $a = $html.IndexOf($ini); $b = $html.IndexOf($fin, $a); $html.Substring($a, $b - $a + $fin.Length) }
function Prefijar($html, $pre) {
  [regex]::Replace($html, '(href|src)="(?!https?:|mailto:|#|/)([^"]*)"', { param($m) $m.Groups[1].Value + '="' + $pre + $m.Groups[2].Value + '"' })
}
$cabecera = Prefijar (Recortar $htmlCatalogo '<header class="cabecera">' '</header>') "../../"
$pie = Prefijar (Recortar $htmlCatalogo '<footer class="pie">' '</footer>') "../../"

function Foto($a, $i, $pre, $sizes, $eager, $extra) {
  $f = @($a.fotos)[$i]
  $clase = "foto"
  if ($extra) { $clase += " $extra" }
  if ($f) {
    if ($f.recreacion) { $clase += " foto--recreacion" }
    $base = "${pre}img/catalogo/$($a.id)/$($f.archivo)"
    $carga = if ($eager) { 'fetchpriority="high"' } else { 'loading="lazy"' }
    return "<div class=`"$clase`"><img src=`"$base-800.webp`" srcset=`"$base-800.webp 800w, $base-1600.webp 1600w`" sizes=`"$sizes`" alt=`"$(E $f.alt)`" $carga decoding=`"async`" width=`"800`" height=`"1000`"></div>"
  }
  if ($a.boceto) {
    return "<div class=`"$clase foto--boceto`"><img src=`"$pre$($a.boceto)`" alt=`"Boceto de la alfombra $(E $a.nombre)`" loading=`"lazy`" decoding=`"async`" width=`"400`" height=`"500`"></div>"
  }
  return "<div class=`"$clase foto--placeholder tono-lino`" role=`"img`" aria-label=`"Foto pendiente: $(E $a.nombre)`" data-etiqueta=`"FOTO: $(E $a.nombre)`"></div>"
}

function Tarjeta($a, $pre) {
  $med = if (@($a.medidas).Count) { "Desde $($a.medidas[0].ancho) × $($a.medidas[0].largo) cm" } else { "A medida" }
  $precio = if ($a.precio_desde) { "<span class=`"tarjeta__precio`">desde $(Euros $a.precio_desde)</span>" } else { "" }
  $foto = Foto $a 0 $pre "(min-width: 64rem) 33vw, (min-width: 36rem) 50vw, 100vw" $false $null
  return "<article class=`"tarjeta revelar`" data-categoria=`"$($a.categoria)`">$foto<p class=`"tarjeta__cat`">$($CAT[[string]$a.categoria])</p><h3><a href=`"${pre}alfombras/$($a.id)/`">$(E $a.nombre)</a></h3><p class=`"tarjeta__meta`"><span>$med</span>$precio</p></article>"
}

function TextoMedidas($a) {
  $m = @($a.medidas | ForEach-Object {
    if ($_.ancho -eq $_.largo -and @($a.formas) -contains "redonda") { "Ø $($_.ancho) cm" } else { "$($_.ancho) × $($_.largo) cm" }
  })
  if ($m.Count) { ($m + "o a tu medida") -join " · " } else { "A tu medida" }
}

# ---------- Fichas ----------
foreach ($a in $lista) {
  $id = $a.id; $pre = "../../"
  $urlFicha = "$URL/alfombras/$id/"
  $catNom = $CAT[[string]$a.categoria]
  $nFotos = @($a.fotos).Count
  $imgOg = if ($nFotos) { "$URL/img/catalogo/$id/$($a.fotos[0].archivo)-1600.webp" } else { "$URL/img/og-portada.jpg" }
  $desc = "$($a.nombre): $($a.descripcion) Alfombra tufting hecha a mano en Zaragoza, a tu medida y con envío a toda España."

  $minis = ""
  if ($nFotos -gt 1) {
    $items = for ($i = 0; $i -lt $nFotos; $i++) {
      $b = "${pre}img/catalogo/$id/$($a.fotos[$i].archivo)"
      "<li><button type=`"button`" aria-label=`"Ver foto $($i + 1) de $nFotos`" aria-current=`"$(([string]($i -eq 0)).ToLower())`" data-src=`"$b-800.webp`" data-srcset=`"$b-800.webp 800w, $b-1600.webp 1600w`" data-alt=`"$(E $a.fotos[$i].alt)`">$(Foto $a $i $pre '72px' $false $null)</button></li>"
    }
    $minis = "<ul class=`"galeria__miniaturas`" data-galeria-miniaturas aria-label=`"Más fotos`">$($items -join '')</ul>"
  }

  if ($a.precio_desde) { $precio = "desde $(Euros $a.precio_desde)<small>Precio orientativo. El final depende de la medida y los colores.</small>" } else { $precio = "Precio según presupuesto" }
  $textoFormas = (@($a.formas) | ForEach-Object { $FORMAS[[string]$_] }) -join ", "
  if ($textoFormas) { $textoFormas = $textoFormas.Substring(0, 1).ToUpper() + $textoFormas.Substring(1) } else { $textoFormas = "A consultar" }
  if (@($a.colores).Count) {
    $colores = "<ul class=`"muestras`">" + ((@($a.colores) | ForEach-Object { "<li><span class=`"muestra`" aria-hidden=`"true`" style=`"--c:$($_.hex)`"></span>$(E $_.nombre)</li>" }) -join "") + "</ul>"
  } else { $colores = "Los que elijas" }

  $otras = @($lista | Where-Object { $_.id -ne $id -and $_.categoria -eq $a.categoria } | Select-Object -First 3)
  $seccionOtras = ""
  if ($otras.Count) {
    $seccionOtras = @"
    <section class="seccion seccion--lino" aria-labelledby="otras-titulo">
      <div class="contenedor">
        <div class="cabecera-seccion cabecera-seccion--fila">
          <div>
            <p class="antetitulo">Más del catálogo</p>
            <h2 id="otras-titulo">Otras alfombras parecidas</h2>
          </div>
          <a class="enlace-flecha" href="${pre}catalogo.html">Ver todo el catálogo</a>
        </div>
        <div class="rejilla">$((@($otras) | ForEach-Object { Tarjeta $_ $pre }) -join "`n")</div>
      </div>
    </section>
"@
  }

  $producto = [ordered]@{
    "@context" = "https://schema.org"; "@type" = "Product"; name = $a.nombre; description = $a.descripcion
    category = "Alfombras hechas a mano"; brand = [ordered]@{ "@type" = "Brand"; name = "Trufing" }; url = $urlFicha
    image = @(@($a.fotos) | ForEach-Object { "$URL/img/catalogo/$id/$($_.archivo)-1600.webp" })
  }
  if ($a.precio_desde) {
    $producto.offers = [ordered]@{ "@type" = "AggregateOffer"; priceCurrency = "EUR"; lowPrice = $a.precio_desde; availability = "https://schema.org/MadeToOrder"; areaServed = "ES" }
  }
  $migas = [ordered]@{
    "@context" = "https://schema.org"; "@type" = "BreadcrumbList"
    itemListElement = @(
      [ordered]@{ "@type" = "ListItem"; position = 1; name = "Catálogo"; item = "$URL/catalogo.html" },
      [ordered]@{ "@type" = "ListItem"; position = 2; name = $catNom; item = "$URL/catalogo.html?categoria=$($a.categoria)" },
      [ordered]@{ "@type" = "ListItem"; position = 3; name = $a.nombre; item = $urlFicha }
    )
  }
  $jsonProducto = $producto | ConvertTo-Json -Depth 6 -Compress
  $jsonMigas = $migas | ConvertTo-Json -Depth 6 -Compress

  $html = @"
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>$(E $a.nombre) · Alfombra hecha a mano por encargo · Trufing</title>
  <meta name="description" content="$(E $desc)">
  <link rel="canonical" href="$urlFicha">
  <meta name="theme-color" content="#f7f2ea">

  <meta property="og:type" content="product">
  <meta property="og:locale" content="es_ES">
  <meta property="og:site_name" content="Trufing">
  <meta property="og:url" content="$urlFicha">
  <meta property="og:title" content="$(E $a.nombre) · Trufing">
  <meta property="og:description" content="$(E $a.descripcion)">
  <meta property="og:image" content="$imgOg">
  <meta name="twitter:card" content="summary_large_image">

  <link rel="icon" href="${pre}favicon.svg" type="image/svg+xml">
  <link rel="preload" href="${pre}fonts/fraunces-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="${pre}fonts/figtree-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="${pre}css/styles.css">
  <script src="${pre}js/config.js" defer></script>
  <script src="${pre}js/main.js" defer></script>
  <script type="application/ld+json">$jsonProducto</script>
  <script type="application/ld+json">$jsonMigas</script>
</head>
<body>
  <!-- Página generada por tools/generar.ps1 a partir de data/catalogo.json. No la edites a mano. -->
  <a class="saltar" href="#contenido">Saltar al contenido</a>

  $cabecera

  <main id="contenido">
    <div class="contenedor">
      <nav class="migas cabecera-pagina" style="padding-bottom:0" aria-label="Migas de pan">
        <ol>
          <li><a href="${pre}catalogo.html">Catálogo</a></li>
          <li><a href="${pre}catalogo.html?categoria=$($a.categoria)">$catNom</a></li>
          <li><span aria-current="page">$(E $a.nombre)</span></li>
        </ol>
      </nav>

      <article class="ficha" data-ficha-estatica>
        <div class="galeria">
          $(Foto $a 0 $pre "(min-width: 56rem) 55vw, 100vw" $true "galeria__principal")
          $minis
        </div>

        <div class="ficha__info">
          <p class="antetitulo">$catNom</p>
          <h1>$(E $a.nombre)</h1>
          <p class="ficha__precio">$precio</p>
          <p class="ficha__desc">$(E $a.descripcion)</p>
          <dl class="datos-ficha">
            <div><dt>Medidas</dt><dd>$(TextoMedidas $a)</dd></div>
            <div><dt>Formas</dt><dd>$(E $textoFormas)</dd></div>
            <div><dt>Colores</dt><dd>$colores</dd></div>
            <div><dt>Plazo</dt><dd>2–4 semanas de fabricación</dd></div>
          </dl>
          <div class="ficha__acciones">
            <a class="boton" href="${pre}encargar.html?tipo=catalogo&amp;modelo=$id">
              Solicitar esta alfombra
              <svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 10h12M11 5l5 5-5 5"/></svg>
            </a>
            <a class="boton boton--borde" href="${pre}tu-diseno.html">Prefiero mi propio diseño</a>
          </div>
          <p class="ficha__nota">Sin compromiso: primero te enviamos el presupuesto. Solo se paga una señal del 30 % si decides seguir adelante.</p>
        </div>
      </article>
    </div>
$seccionOtras  </main>

  $pie
</body>
</html>
"@
  Escribir "alfombras/$id/index.html" $html
}

# Borra fichas de alfombras que ya no están en el catálogo
Get-ChildItem (Join-Path $raiz "alfombras") -Directory | Where-Object { @($lista.id) -notcontains $_.Name } | ForEach-Object { Remove-Item -Recurse -Force $_.FullName }

# ---------- Tarjetas estáticas en catálogo e inicio ----------
function Inyectar($rel, $contenido) {
  $html = Leer $rel
  $nuevo = [regex]::Replace($html, '(<!-- GEN:inicio -->)[\s\S]*?(<!-- GEN:fin -->)', { param($m) $m.Groups[1].Value + "`n" + $contenido + "`n" + $m.Groups[2].Value })
  Escribir $rel $nuevo
}
Inyectar "catalogo.html" ((@($lista) | ForEach-Object { Tarjeta $_ "" }) -join "`n")
Inyectar "index.html" ((@($lista | Where-Object { $_.destacada } | Select-Object -First 3) | ForEach-Object { Tarjeta $_ "" }) -join "`n")

# ---------- Sitemap ----------
$excluir = @("404.html", "gracias.html", "alfombra.html")
$paginas = @(Get-ChildItem $raiz -Filter *.html | Where-Object { $excluir -notcontains $_.Name } | ForEach-Object { if ($_.Name -eq "index.html") { "" } else { $_.Name } })
$paginas += @(Get-ChildItem (Join-Path $raiz "legal") -Filter *.html | ForEach-Object { "legal/" + $_.Name })
$paginas += @($lista | ForEach-Object { "alfombras/$($_.id)/" })
$urls = $paginas | Sort-Object { if ($_ -eq "") { 0 } elseif ($_ -like "legal/*") { 3 } elseif ($_ -like "alfombras/*") { 2 } else { 1 } }, { $_ } | ForEach-Object { "  <url><loc>$URL/$_</loc><lastmod>$hoy</lastmod></url>" }
Escribir "sitemap.xml" ("<?xml version=`"1.0`" encoding=`"UTF-8`"?>`n<!-- Generado por tools/generar.ps1. No lo edites a mano. -->`n<urlset xmlns=`"http://www.sitemaps.org/schemas/sitemap/0.9`">`n" + ($urls -join "`n") + "`n</urlset>`n")

Write-Host "Generadas $($lista.Count) fichas, tarjetas y sitemap ($($paginas.Count) URL) para $URL"
