$ErrorActionPreference = "Stop"
$python = Join-Path $PSScriptRoot "..\.venv\Scripts\python.exe"

if (-not (Test-Path -LiteralPath $python)) {
    throw "Python environment not found. Create .venv and install backend/requirements-dev.txt first."
}

& $python -m pytest backend\tests -q

