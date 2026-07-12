[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = [IO.Path]::GetFullPath($PSScriptRoot)

function Invoke-Git([string[]]$Arguments) {
    $output = & git -C $repoRoot @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "git $($Arguments -join ' ') failed: $output"
    }
    return $output
}

$remote = (Invoke-Git @("remote", "get-url", "origin") | Out-String).Trim()
$branch = (Invoke-Git @("branch", "--show-current") | Out-String).Trim()
$head = (Invoke-Git @("rev-parse", "HEAD") | Out-String).Trim()
$status = @(@(Invoke-Git @("status", "--short")) | Where-Object { $_ -ne "" })
$tags = @(@(Invoke-Git @("tag", "--points-at", "HEAD")) | Where-Object { $_ -ne "" })

$expectedRemote = "https://github.com/laoshan-song/vast.git"
$remoteOk = $remote.TrimEnd('/') -ieq $expectedRemote
$clean = $status.Count -eq 0
$tagged = $tags.Count -gt 0

Write-Host "GitHub release readiness"
Write-Host "Repository: $repoRoot"
Write-Host "Remote:     $remote"
Write-Host "Branch:     $branch"
Write-Host "HEAD:       $head"
Write-Host "Clean:      $clean"
Write-Host "HEAD tags:  $(if ($tagged) { $tags -join ', ' } else { '(none)' })"

$issues = @()
if (-not $remoteOk) { $issues += "origin does not match $expectedRemote" }
if (-not $clean) { $issues += "working tree has uncommitted changes" }
if (-not $tagged) { $issues += "HEAD has no release tag" }

if ($issues.Count -gt 0) {
    Write-Host "`nNOT READY:"
    $issues | ForEach-Object { Write-Host "  - $_" }
    exit 1
}

Write-Host "`nREADY: remote, clean working tree, and frozen tag checks passed."
