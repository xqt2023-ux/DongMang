$ErrorActionPreference = 'Stop'

Set-Location "$PSScriptRoot\.."

git config core.hooksPath .githooks
Write-Host "Configured git hooks path to .githooks"
