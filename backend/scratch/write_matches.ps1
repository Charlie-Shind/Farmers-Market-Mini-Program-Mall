# write_matches.ps1
$methods = @(
    "getUserSummary", "updateAdminUserProfile", "deleteAdminUser", "getMerchantSummary",
    "reorderBanners", "getQuickFlashSaleActive", "claimFlashSale", "getQuickGroupBuyNearby",
    "joinGroupBuy", "getQuickGiftZoneItems", "getQuickOriginZoneItems"
)

$brainPath = "C:\Users\Textline\.gemini\antigravity\brain"
$folders = Get-ChildItem -Path $brainPath -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -ne "3ae7f58a-9f14-425a-9381-c3a0c451dbb0" }

$results = [System.Collections.Generic.List[string]]::new()

foreach ($f in $folders) {
    $c = $f.Name
    $transcriptPath = Join-Path $f.FullName ".system_generated\logs\transcript_full.jsonl"
    if (-not (Test-Path $transcriptPath)) {
        $transcriptPath = Join-Path $f.FullName ".system_generated\logs\transcript.jsonl"
    }
    if (-not (Test-Path $transcriptPath)) { continue }
    
    $file = [System.IO.File]::OpenText($transcriptPath)
    $lineNum = 0
    try {
        while (($line = $file.ReadLine()) -ne $null) {
            $lineNum++
            foreach ($m in $methods) {
                if ($line -match "\b$m\b") {
                    $results.Add("Method: $m | Conv: $c | Line: $lineNum | Length: $($line.Length)")
                }
            }
        }
    }
    finally {
        $file.Close()
    }
}

$results | Out-File -FilePath "scratch/all_matches.txt" -Encoding utf8
Write-Host "Done. Written $($results.Count) matches to scratch/all_matches.txt."
