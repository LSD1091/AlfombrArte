# Cambia la web a un dominio propio en un solo paso.
# Uso:  powershell -ExecutionPolicy Bypass -File tools\cambiar-dominio.ps1 -Dominio trufing.es
# Después: git add -A, commit y push; y en GitHub → Settings → Pages → Custom domain escribe el mismo dominio.
param([Parameter(Mandatory = $true)][string]$Dominio)
$ErrorActionPreference = "Stop"
$raiz = Split-Path -Parent $PSScriptRoot
$utf8 = New-Object System.Text.UTF8Encoding($false)
$Dominio = $Dominio.Trim().ToLower() -replace '^https?://', '' -replace '/.*$', ''
$antes = ([IO.File]::ReadAllText((Join-Path $raiz "tools\dominio.txt"), $utf8)).Trim().TrimEnd("/")
$nueva = "https://$Dominio"
if ($antes -eq $nueva) { Write-Host "La web ya usa $nueva"; exit }

# 1. Sustituir la URL absoluta en páginas, robots, README y datos estructurados
$archivos = Get-ChildItem $raiz -Recurse -File -Include *.html, *.xml, *.txt, *.md, *.js |
  Where-Object { $_.FullName -notmatch '[\\/](\.git|capturas|node_modules)[\\/]' }
$n = 0
foreach ($f in $archivos) {
  $t = [IO.File]::ReadAllText($f.FullName, $utf8)
  if ($t.Contains($antes)) { [IO.File]::WriteAllText($f.FullName, $t.Replace($antes, $nueva), $utf8); $n++ }
}

# 2. La página 404 deja de estar bajo /AlfombrArte/
$p404 = Join-Path $raiz "404.html"
$t = [IO.File]::ReadAllText($p404, $utf8)
[IO.File]::WriteAllText($p404, ($t -replace '<base href="[^"]*">', '<base href="/">'), $utf8)

# 3. CNAME para GitHub Pages y nuevo dominio de referencia
[IO.File]::WriteAllText((Join-Path $raiz "CNAME"), "$Dominio`n", $utf8)
[IO.File]::WriteAllText((Join-Path $raiz "tools\dominio.txt"), "$nueva`n", $utf8)

# 4. Regenerar fichas y sitemap con el nuevo dominio
& (Join-Path $PSScriptRoot "generar.ps1")
Write-Host "Hecho: $antes -> $nueva ($n archivos actualizados, CNAME creado)."
