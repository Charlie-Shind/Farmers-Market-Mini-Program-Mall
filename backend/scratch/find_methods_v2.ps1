# find_methods_v2.ps1
# Search all past transcripts for any reference to the missing methods to locate their source code

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
    
    $file = [System.IO.File]::OpenText($transcriptPath)
    $lineNum = 0
    try {
        while (($line = $file.ReadLine()) -ne $null) {
            $lineNum++
            foreach ($m in $methods) {
                # Look for the method name as a word
                # In JSON transcripts, the method might be in a file write or edit block.
                if ($line -match "\b$m\b") {
                    # Print and let's count how many times it was found
                    Write-Host "Found method [$m] in Conv: $c, Line: $lineNum"
                }
            }
        }
    }
    finally {
        $file.Close()
    }
}
