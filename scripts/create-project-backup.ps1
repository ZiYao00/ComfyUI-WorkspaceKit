[CmdletBinding()]
param(
  [Parameter(Mandatory)]
  [ValidateSet(
    "00-legacy-workspace2",
    "10-ui-canvas",
    "20-workflows",
    "30-entry-splits",
    "40-templates-nodes",
    "50-integrations",
    "90-full-snapshots"
  )]
  [string]$Category,

  [Parameter(Mandatory)]
  [ValidatePattern("^[a-z0-9][a-z0-9-]*$")]
  [string]$Label
)

# Creates one source-only rollback ZIP inside the project backup directory.
# Do not replace this with Compress-Archive over a recursive file list: that
# previously flattened and included .git objects plus earlier ZIPs, creating
# nested 100+ MB backups. ZipArchive keeps repository-relative paths and the
# explicit directory filter below excludes metadata and prior backups.

# Windows PowerShell 5.1 does not eagerly resolve types declared later in the
# script, so we load the assembly at the top and reference the enum via a
# string constant that is resolved at runtime. Both PS 5.1 and pwsh 7+ then
# run this script identically.
Add-Type -AssemblyName System.IO.Compression -ErrorAction Stop | Out-Null
Add-Type -AssemblyName System.IO.Compression.FileSystem -ErrorAction Stop | Out-Null

$repoRoot = (Resolve-Path -LiteralPath (Split-Path -Parent $PSScriptRoot)).Path
$backupRoot = Join-Path $repoRoot ".codex-backups"
$categoryRoot = Join-Path $backupRoot $Category
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$archivePath = Join-Path $categoryRoot "ComfyUI-WorkspaceKit-before-$Label-$timestamp.zip"

if (!(Test-Path -LiteralPath $categoryRoot)) {
  New-Item -ItemType Directory -Path $categoryRoot | Out-Null
}
if (Test-Path -LiteralPath $archivePath) {
  throw "Backup destination already exists: $archivePath"
}

# Compute a repository-relative path without relying on [System.IO.Path]::GetRelativePath,
# which does not exist on Windows PowerShell 5.1 (.NET Framework 4.x). Both PS 5.1 and
# pwsh 7+ must be able to run this script identically. The manual normalization keeps
# repository-relative POSIX-style entry names for the ZIP.
function Get-RepoRelativePath {
  param(
    [Parameter(Mandatory)][string]$Root,
    [Parameter(Mandatory)][string]$FullPath
  )
  $rootNorm = $Root.TrimEnd('\', '/')
  if (-not $FullPath.StartsWith($rootNorm, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Path is not under the repository root: $FullPath (root=$rootNorm)"
  }
  $rel = $FullPath.Substring($rootNorm.Length)
  return $rel.TrimStart('\', '/')
}

$excludedDirectories = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
foreach ($name in @(".git", ".codex-backups", ".dev-docs", "__pycache__", "node_modules", ".venv", "venv", "env")) {
  [void]$excludedDirectories.Add($name)
}

$files = Get-ChildItem -LiteralPath $repoRoot -Force -Recurse -File | Where-Object {
  $relative = Get-RepoRelativePath -Root $repoRoot -FullPath $_.FullName
  -not (($relative -split "[\\/]") | Where-Object { $excludedDirectories.Contains($_) }) -and
  $_.Extension -notin @(".zip", ".7z", ".rar", ".tar", ".gz")
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
# Resolve the enum values via string form so PS 5.1 does not need to parse
# `[System.IO.Compression.ZipArchiveMode]::Create` at script-load time. Both
# runtimes reach the same underlying members regardless of which assembly
# defines them.
$zipCreateMode = [System.Enum]::Parse([Type]"System.IO.Compression.ZipArchiveMode", "Create")
$zipCompressionLevel = [System.Enum]::Parse([Type]"System.IO.Compression.CompressionLevel", "Optimal")
$archive = [System.IO.Compression.ZipFile]::Open($archivePath, $zipCreateMode)
try {
  foreach ($file in $files) {
    $entryName = (Get-RepoRelativePath -Root $repoRoot -FullPath $file.FullName).Replace("\", "/")
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
      $archive,
      $file.FullName,
      $entryName,
      $zipCompressionLevel
    ) | Out-Null
  }
} finally {
  $archive.Dispose()
}

$inspection = [System.IO.Compression.ZipFile]::OpenRead($archivePath)
try {
  $forbidden = @($inspection.Entries | Where-Object {
    $_.FullName -match "(^|/)(\.git|\.codex-backups|\.dev-docs|__pycache__|node_modules|\.venv|venv|env)(/|$)" -or
    $_.FullName -match "\.(zip|7z|rar|tar|gz)$"
  })
  if ($forbidden.Count) {
    throw "Backup contains excluded paths; retain this file for inspection and do not use it as a rollback point: $archivePath"
  }
  Write-Output ("Created source-only backup: {0} ({1} files)" -f $archivePath, $inspection.Entries.Count)
} finally {
  $inspection.Dispose()
}
