# Search transcripts for missing method definitions
$methods = @(
    "getUserSummary", "updateAdminUserProfile", "deleteAdminUser", "getMerchantSummary",
    "getQuickFlashSaleActive", "claimFlashSale", "getQuickGroupBuyNearby", "joinGroupBuy",
    "getQuickGiftZoneItems", "getQuickOriginZoneItems"
)

$convs = @("12efe66e-1aef-4988-845c-603c8fb4b616", "f1cf7966-10dd-4e1b-a2c8-70fcf687e529")

foreach ($c in $convs) {
    $transcriptPath = "C:\Users\Textline\.gemini\antigravity\brain\$c\.system_generated\logs\transcript_full.jsonl"
    if (-not (Test-Path $transcriptPath)) {
        $transcriptPath = "C:\Users\Textline\.gemini\antigravity\brain\$c\.system_generated\logs\transcript.jsonl"
    }
    if (-not (Test-Path $transcriptPath)) { continue }
    
    $lines = Get-Content -Path $transcriptPath
    Write-Host "Searching $c..."
    
    foreach ($m in $methods) {
        for ($i = 0; $i -lt $lines.Count; $i++) {
            $line = $lines[$i]
            if ($line -like "*async $m*") {
                Write-Host "Found definition for $m in Step $i"
                # Save the JSON line for extraction
                $line | Out-File -FilePath "scratch/def_${m}_$c.json" -Encoding utf8
                break
            }
        }
    }
}
