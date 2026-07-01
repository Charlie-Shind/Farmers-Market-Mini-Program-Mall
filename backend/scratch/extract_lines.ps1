# extract_lines.ps1
$c = "4b4a5709-3393-4907-804a-d6ff8704880d"
$linesToExtract = @(310, 313, 315, 318)
$transcriptPath = "C:\Users\Textline\.gemini\antigravity\brain\$c\.system_generated\logs\transcript_full.jsonl"
if (-not (Test-Path $transcriptPath)) {
    $transcriptPath = "C:\Users\Textline\.gemini\antigravity\brain\$c\.system_generated\logs\transcript.jsonl"
}

$file = [System.IO.File]::OpenText($transcriptPath)
$lineNum = 0
try {
    while (($line = $file.ReadLine()) -ne $null) {
        $lineNum++
        if ($linesToExtract -contains $lineNum) {
            Write-Host "Extracting Line $lineNum..."
            $line | Out-File -FilePath "scratch/extracted_line_${lineNum}.json" -Encoding utf8
        }
    }
}
finally {
    $file.Close()
}
