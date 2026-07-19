[CmdletBinding()]
param(
  [Parameter(Mandatory)]
  [ValidateSet("10-ui-canvas", "20-workflows", "30-entry-splits", "40-templates-nodes", "90-full-snapshots")]
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
$repoRoot = Split-Path -Parent $PSScriptRoot
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

$excludedDirectories = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
foreach ($name in @(".git", ".codex-backups", "__pycache__", "node_modules")) {
  [void]$excludedDirectories.Add($name)
}

$files = Get-ChildItem -LiteralPath $repoRoot -Force -Recurse -File | Where-Object {
  $relative = [System.IO.Path]::GetRelativePath($repoRoot, $_.FullName)
  -not (($relative -split "[\\/]") | Where-Object { $excludedDirectories.Contains($_) })
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::Open($archivePath, [System.IO.Compression.ZipArchiveMode]::Create)
try {
  foreach ($file in $files) {
    $entryName = [System.IO.Path]::GetRelativePath($repoRoot, $file.FullName).Replace("\", "/")
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
      $archive,
      $file.FullName,
      $entryName,
      [System.IO.Compression.CompressionLevel]::Optimal
    ) | Out-Null
  }
} finally {
  $archive.Dispose()
}

$inspection = [System.IO.Compression.ZipFile]::OpenRead($archivePath)
try {
  $forbidden = @($inspection.Entries | Where-Object {
    $_.FullName -match "(^|/)(\\.git|\\.codex-backups|__pycache__|node_modules)(/|$)"
  })
  if ($forbidden.Count) {
    throw "Backup contains excluded paths; retain this file for inspection and do not use it as a rollback point: $archivePath"
  }
  Write-Output ("Created source-only backup: {0} ({1} files)" -f $archivePath, $inspection.Entries.Count)
} finally {
  $inspection.Dispose()
}
