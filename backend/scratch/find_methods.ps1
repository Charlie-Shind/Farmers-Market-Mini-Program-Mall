# find_methods.ps1
# Search all past transcripts for the definitions of the missing methods

$methods = @(
    "getUserSummary", "updateAdminUserProfile", "deleteAdminUser", "getMerchantSummary",
    "reorderBanners", "getQuickFlashSaleActive", "claimFlashSale", "getQuickGroupBuyNearby",
    "joinGroupBuy", "getQuickGiftZoneItems", "getQuickOriginZoneItems"
)

$brainPath = "C:\Users\Textline\.gemini\antigravity\brain"
$folders = Get-ChildItem -Path $brainPath -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -ne "3ae7f58a-9f14-425a-9381-c3a0c451dbb0" }

foreach ($f in $folders) {
    $c = $f.Name
    $transcriptPath = Join-Path $f.FullName ".system_generated\logs\transcript_full.jsonl"
    if (-not (Test-Path $transcriptPath)) {
        $transcriptPath = Join-Path $f.FullName ".system_generated\logs\transcript.jsonl"
    }
    if (-not (Test-Path $transcriptPath)) { continue }
    
    # Read the file line by line to avoid out of memory issues
    $file = [System.IO.File]::OpenText($transcriptPath)
    $lineNum = 0
    try {
        while (($line = $file.ReadLine()) -ne $null) {
            $lineNum++
            foreach ($m in $methods) {
                # We want to find where the method is actually implemented.
                # Usually it starts with "async getUserSummary" or "async updateAdminUserProfile" etc.
                # In JSON transcripts, newlines inside strings are escaped as \n.
                if ($line -match "async\s+$m\b" -or $line -match "async\\n\s*$m\b" -or $line -match "async\\s+$m\b") {
                    Write-Host "Found method [$m] in Conv: $c, Line: $lineNum"
                    # Save the JSON line to a scratch file
                    $line | Out-File -FilePath "scratch/found_${m}_${c}_${lineNum}.json" -Encoding utf8
                }
            }
        }
    }
    finally {
        $file.Close()
    }
}
