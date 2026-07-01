# find_exact_definitions.ps1
$methods = @(
    "getUserSummary", "updateAdminUserProfile", "deleteAdminUser", "getMerchantSummary",
    "reorderBanners", "getQuickFlashSaleActive", "claimFlashSale", "getQuickGroupBuyNearby",
    "joinGroupBuy", "getQuickGiftZoneItems", "getQuickOriginZoneItems"
)

$brainPath = "C:\Users\Textline\.gemini\antigravity\brain"
$folders = Get-ChildItem -Path $brainPath -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -ne "3ae7f58a-9f14-425a-9381-c3a0c451dbb0" }

$outPath = "scratch/definitions_found.txt"
if (Test-Path $outPath) { Remove-Item $outPath }

foreach ($f in $folders) {
    $c = $f.Name
    $transcriptPath = Join-Path $f.FullName ".system_generated\logs\transcript.jsonl"
    if (-not (Test-Path $transcriptPath)) { continue }
    
    $file = [System.IO.File]::OpenText($transcriptPath)
    $lineNum = 0
    try {
        while (($line = $file.ReadLine()) -ne $null) {
            $lineNum++
            foreach ($m in $methods) {
                # Look for implementation code, usually containing:
                # "async <methodName>" or "async\n<methodName>" or "replace_file_content" arguments
                if ($line -match "async\\s+$m\b" -or $line -match "async\\n\s*$m\b") {
                    $json = ConvertFrom-Json $line -ErrorAction SilentlyContinue
                    if ($null -ne $json) {
                        # We want to extract the replacement or content where the actual code is.
                        # Check tool calls
                        if ($json.tool_calls) {
                            foreach ($tc in $json.tool_calls) {
                                if ($tc.args.ReplacementContent -and $tc.args.ReplacementContent -like "*$m*") {
                                    "=== METHOD $m in Conv $c line $lineNum ===" | Out-File -FilePath $outPath -Append -Encoding utf8
                                    $tc.args.ReplacementContent | Out-File -FilePath $outPath -Append -Encoding utf8
                                    "==========================================" | Out-File -FilePath $outPath -Append -Encoding utf8
                                }
                                if ($tc.args.CodeContent -and $tc.args.CodeContent -like "*$m*") {
                                    "=== METHOD $m in Conv $c line $lineNum (CodeContent) ===" | Out-File -FilePath $outPath -Append -Encoding utf8
                                    $tc.args.CodeContent | Out-File -FilePath $outPath -Append -Encoding utf8
                                    "==========================================" | Out-File -FilePath $outPath -Append -Encoding utf8
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    finally {
        $file.Close()
    }
}
Write-Host "Search finished. Check scratch/definitions_found.txt"
