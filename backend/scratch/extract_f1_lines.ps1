# extract_f1_lines.ps1
$c = "f1cf7966-10dd-4e1b-a2c8-70fcf687e529"
$linesToExtract = @(25, 27, 51, 86)
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
            $json = ConvertFrom-Json $line
            $outputFile = "scratch/content_${c}_${lineNum}.txt"
            
            $output = ""
            if ($json.content) {
                $output += "=== CONTENT ===\n" + $json.content + "\n"
            }
            if ($json.tool_calls) {
                $output += "=== TOOL CALLS ===\n" + ($json.tool_calls | ConvertTo-Json -Depth 10) + "\n"
            }
            $output | Out-File -FilePath $outputFile -Encoding utf8
        }
    }
}
finally {
    $file.Close()
}
