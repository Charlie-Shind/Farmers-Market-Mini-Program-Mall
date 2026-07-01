# Scan all conversations for all missing methods
$methods = @(
    "getUserSummary", "updateAdminUserProfile", "deleteAdminUser", "getMerchantSummary",
    "getQuickFlashSaleActive", "claimFlashSale", "getQuickGroupBuyNearby", "joinGroupBuy",
    "getQuickGiftZoneItems", "getQuickOriginZoneItems"
)

$brainPath = "C:\Users\Textline\.gemini\antigravity\brain"
$folders = Get-ChildItem -Path $brainPath -Directory -ErrorAction SilentlyContinue

foreach ($f in $folders) {
    $c = $f.Name
    $transcriptPath = Join-Path $f.FullName ".system_generated\logs\transcript_full.jsonl"
    if (-not (Test-Path $transcriptPath)) {
        $transcriptPath = Join-Path $f.FullName ".system_generated\logs\transcript.jsonl"
    }
    if (-not (Test-Path $transcriptPath)) { continue }
    
    $lines = Get-Content -Path $transcriptPath -ErrorAction SilentlyContinue
    if ($null -eq $lines) { continue }
    
    foreach ($m in $methods) {
        for ($i = 0; $i -lt $lines.Count; $i++) {
            $line = $lines[$i]
            if ($line -like "*async $m*") {
                Write-Host "Found definition for $m in Conversation $c, Step $i"
                $line | Out-File -FilePath "scratch/def_${m}_${c}.json" -Encoding utf8
                break
            }
        }
    }
}
