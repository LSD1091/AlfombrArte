# Servidor estático mínimo para probar la web en local (Windows, sin instalar nada).
# Uso:  powershell -ExecutionPolicy Bypass -File tools\servidor.ps1  [-Puerto 8080]
param([int]$Puerto = 8080)

$raiz = Split-Path -Parent $PSScriptRoot
$tipos = @{
  ".html" = "text/html; charset=utf-8"; ".css" = "text/css; charset=utf-8"; ".js" = "text/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"; ".svg" = "image/svg+xml"; ".webp" = "image/webp"; ".jpg" = "image/jpeg"
  ".png" = "image/png"; ".woff2" = "font/woff2"; ".xml" = "application/xml"; ".txt" = "text/plain; charset=utf-8"; ".ico" = "image/x-icon"
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Puerto/")
$listener.Start()
Write-Host "Sirviendo $raiz en http://localhost:$Puerto/  (Ctrl+C para parar)"

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $res = $ctx.Response
    try {
      $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart("/"))
      if ($rel -eq "" -or $rel.EndsWith("/")) { $rel += "index.html" }
      $archivo = [IO.Path]::GetFullPath((Join-Path $raiz $rel))
      [byte[]]$bytes = $null
      if ($archivo.StartsWith($raiz) -and (Test-Path -LiteralPath $archivo -PathType Leaf)) {
        $ext = [IO.Path]::GetExtension($archivo).ToLower()
        $tipo = "application/octet-stream"
        if ($tipos.ContainsKey($ext)) { $tipo = $tipos[$ext] }
        $res.ContentType = $tipo
        $bytes = [IO.File]::ReadAllBytes($archivo)
      } else {
        $res.StatusCode = 404
        $res.ContentType = "text/html; charset=utf-8"
        $p404 = Join-Path $raiz "404.html"
        if (Test-Path $p404) { $bytes = [IO.File]::ReadAllBytes($p404) } else { $bytes = [Text.Encoding]::UTF8.GetBytes("404") }
      }
      $res.Headers.Add("Cache-Control", "no-store")
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
    } catch {
      Write-Host "Error sirviendo $($ctx.Request.Url): $_"
    } finally {
      $res.Close()
    }
  }
} finally { $listener.Stop() }
