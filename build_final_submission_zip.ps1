[CmdletBinding()]
param(
    [switch]$AllowDraft,
    [string]$OutputPath
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = [IO.Path]::GetFullPath($PSScriptRoot)
$sourceRoot = Join-Path $repoRoot "VAST_Challenge_2026_MC2"
$stagingRoot = Join-Path $repoRoot "final_submission"
if ([string]::IsNullOrWhiteSpace($OutputPath)) {
    $OutputPath = Join-Path $repoRoot "final_submission.zip"
}
$outputFullPath = [IO.Path]::GetFullPath($OutputPath)

function Assert-RepoChild([string]$Path, [string]$Label) {
    $full = [IO.Path]::GetFullPath($Path)
    $prefix = $repoRoot.TrimEnd('\') + '\'
    if (-not $full.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) {
        throw "$Label must stay inside the repository: $full"
    }
    return $full
}

$stagingRoot = Assert-RepoChild $stagingRoot "Staging directory"
$outputFullPath = Assert-RepoChild $outputFullPath "Output zip"

if (-not (Test-Path -LiteralPath $sourceRoot -PathType Container)) {
    throw "Artifact source directory not found: $sourceRoot"
}

Write-Host "Running source-repository pre-submission validation..."
& node (Join-Path $sourceRoot "pre_submission_validator.js")
$validatorExit = $LASTEXITCODE
if ($validatorExit -ne 0 -and -not $AllowDraft) {
    throw "Pre-submission validation failed. Fix blocking items or use -AllowDraft for internal review only."
}
if ($validatorExit -ne 0) {
    Write-Warning "Building a DRAFT package despite validation failures. Do not submit this archive."
}

if (Test-Path -LiteralPath $stagingRoot) {
    Remove-Item -LiteralPath $stagingRoot -Recurse -Force
}
if (Test-Path -LiteralPath $outputFullPath) {
    Remove-Item -LiteralPath $outputFullPath -Force
}

New-Item -ItemType Directory -Path $stagingRoot | Out-Null
Copy-Item -LiteralPath (Join-Path $sourceRoot "final_report_0709.html") -Destination (Join-Path $stagingRoot "index.htm")
Copy-Item -LiteralPath (Join-Path $sourceRoot "SUBMISSION_README.md") -Destination (Join-Path $stagingRoot "README.md")

$rebuildSource = Join-Path $sourceRoot "rebuild"
$rebuildDestination = Join-Path $stagingRoot "rebuild"
New-Item -ItemType Directory -Path $rebuildDestination | Out-Null

$rebuildFiles = @(
    "index.html",
    "overview.html",
    "q1.html",
    "q2.html",
    "q3.html",
    "mc2_viz_data.js",
    "mc2_viz_data.json",
    "shot-overview.png",
    "shot-q1.png",
    "shot-q2.png",
    "shot-q3.png"
)
foreach ($file in $rebuildFiles) {
    Copy-Item -LiteralPath (Join-Path $rebuildSource $file) -Destination $rebuildDestination
}
Copy-Item -LiteralPath (Join-Path $rebuildSource "assets") -Destination $rebuildDestination -Recurse

$video = Get-ChildItem -LiteralPath $sourceRoot -File | Where-Object { $_.Extension -match '^\.(mp4|wmv)$' }
foreach ($file in $video) {
    Copy-Item -LiteralPath $file.FullName -Destination $stagingRoot
}

$forbidden = Get-ChildItem -LiteralPath $stagingRoot -Recurse -File | Where-Object {
    $_.Name -ieq "MC2 data.json" -or $_.Extension -in @(".ipynb", ".py", ".ps1")
}
if ($forbidden) {
    throw "Forbidden development files entered the package: $($forbidden.FullName -join ', ')"
}

$index = Join-Path $stagingRoot "index.htm"
if (-not (Test-Path -LiteralPath $index)) {
    throw "Package root is missing index.htm"
}

$packageValidator = Join-Path $sourceRoot "validate_submission_package.js"
$packageValidatorArgs = @($packageValidator, $stagingRoot)
if ($AllowDraft) { $packageValidatorArgs += "--allow-draft" }
& node @packageValidatorArgs
if ($LASTEXITCODE -ne 0) {
    throw "Assembled package validation failed."
}

Compress-Archive -Path (Join-Path $stagingRoot "*") -DestinationPath $outputFullPath -CompressionLevel Optimal
$zipSize = (Get-Item -LiteralPath $outputFullPath).Length
$packageFiles = (Get-ChildItem -LiteralPath $stagingRoot -Recurse -File).Count

Write-Host "Package created: $outputFullPath"
Write-Host "Files: $packageFiles"
Write-Host ("Size: {0:N2} MB" -f ($zipSize / 1MB))
if ($AllowDraft) {
    Write-Warning "DRAFT package: unresolved team/video fields remain blocking."
}
