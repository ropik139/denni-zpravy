$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$logDir = Join-Path $projectRoot "logs"
$logFile = Join-Path $logDir "update-news.log"
$nodeCandidates = @(
  (Join-Path $env:LOCALAPPDATA "OpenAI\Codex\bin\node.exe"),
  (Join-Path $env:ProgramFiles "nodejs\node.exe"),
  (Join-Path ${env:ProgramFiles(x86)} "nodejs\node.exe")
)

New-Item -ItemType Directory -Path $logDir -Force | Out-Null
Set-Location $projectRoot

try {
  "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Starting news update" | Add-Content -Path $logFile -Encoding UTF8
  $nodePath = $nodeCandidates | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1
  if (-not $nodePath) {
    $nodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
  }
  if (-not $nodePath) {
    throw "Node.js was not found. Install Node.js or update scripts/run-update.ps1 with the node.exe path."
  }

  "Using Node: $nodePath" | Add-Content -Path $logFile -Encoding UTF8
  $output = & $nodePath scripts/update-news.mjs 2>&1
  foreach ($line in $output) {
    $line.ToString() | Add-Content -Path $logFile -Encoding UTF8
    Write-Output $line
  }
  "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Finished news update" | Add-Content -Path $logFile -Encoding UTF8
} catch {
  "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Update failed: $($_.Exception.Message)" | Add-Content -Path $logFile -Encoding UTF8
  exit 1
}
