# Upload-Spelregels.ps1
# Uploadt alle spelregels markdown bestanden naar Azure Blob Storage
# Container: kennisbronnen, map: spelregels/
#
# Gebruik: .\Upload-Spelregels.ps1
# Vereisten: Azure CLI ingelogd (az login)

$ErrorActionPreference = "Stop"

$STORAGE_ACCOUNT = "mokumbotrg904a"
$CONTAINER = "kennisbronnen"

# Map waar de spelregels staan (pas aan als je de bestanden ergens anders hebt)
$SPELREGELS_MAP = "$PSScriptRoot\spelregels"

Write-Host "🎱 Mokum Bot — Spelregels uploaden naar Azure Storage" -ForegroundColor Cyan
Write-Host "Storage account : $STORAGE_ACCOUNT" -ForegroundColor Gray
Write-Host "Container       : $CONTAINER" -ForegroundColor Gray
Write-Host "Lokale map      : $SPELREGELS_MAP" -ForegroundColor Gray
Write-Host ""

# Controleer of de spelregels map bestaat
if (-not (Test-Path $SPELREGELS_MAP)) {
    Write-Host "❌ Map '$SPELREGELS_MAP' niet gevonden." -ForegroundColor Red
    Write-Host "   Maak de map aan en zet de markdown bestanden erin." -ForegroundColor Red
    exit 1
}

# Verzamel alle markdown bestanden
$bestanden = Get-ChildItem -Path $SPELREGELS_MAP -Recurse -Filter "*.md"

if ($bestanden.Count -eq 0) {
    Write-Host "❌ Geen .md bestanden gevonden in '$SPELREGELS_MAP'." -ForegroundColor Red
    exit 1
}

Write-Host "📄 Gevonden bestanden: $($bestanden.Count)" -ForegroundColor White
Write-Host ""

$succes = 0
$mislukt = 0

foreach ($bestand in $bestanden) {
    # Relatief pad t.o.v. de spelregels map → Azure blob naam
    # Voorbeeld: spelregels\pool\8-ball.md → spelregels/pool/8-ball.md
    $relatief = $bestand.FullName.Substring($SPELREGELS_MAP.Length + 1)
    $blobNaam = "spelregels/" + $relatief.Replace("\", "/")

    Write-Host "  ⬆️  $blobNaam" -NoNewline

    try {
        az storage blob upload `
            --account-name $STORAGE_ACCOUNT `
            --container-name $CONTAINER `
            --name $blobNaam `
            --file $bestand.FullName `
            --content-type "text/markdown; charset=utf-8" `
            --auth-mode key `
            --overwrite true `
            --output none 2>&1 | Out-Null

        Write-Host " ✅" -ForegroundColor Green
        $succes++
    }
    catch {
        Write-Host " ❌ MISLUKT: $_" -ForegroundColor Red
        $mislukt++
    }
}

Write-Host ""
Write-Host "─────────────────────────────────────────" -ForegroundColor Gray
Write-Host "✅ Succesvol geüpload : $succes bestanden" -ForegroundColor Green
if ($mislukt -gt 0) {
    Write-Host "❌ Mislukt           : $mislukt bestanden" -ForegroundColor Red
}
Write-Host ""
Write-Host "🔍 Verifiëren via Azure CLI:" -ForegroundColor Cyan
Write-Host "   az storage blob list --account-name $STORAGE_ACCOUNT --container-name $CONTAINER --auth-mode key --prefix 'spelregels/' --query `"[].name`" -o table" -ForegroundColor Gray
