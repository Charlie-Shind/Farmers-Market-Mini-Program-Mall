# Recover platform-data.service.ts from dangling blobs
$blobs = git fsck --lost-found | Select-String "dangling blob"
foreach ($line in $blobs) {
    $parts = $line.ToString() -split '\s+'
    if ($parts.Count -ge 3) {
        $sha = $parts[2]
        $content = git cat-file -p $sha
        # Check if it contains unique strings that indicate it is the platform-data.service.ts with flash sale code
        if ($content -like "*FlashSaleWindow*") {
            Write-Host "Found matching blob: $sha"
            git cat-file -p $sha > src/common/services/platform-data.service.ts.recovered
            break
        }
    }
}
