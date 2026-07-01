# extract_json_content.ps1

$items = @(
    @{ conv = "12efe66e-1aef-4988-845c-603c8fb4b616"; line = 18 },
    @{ conv = "12efe66e-1aef-4988-845c-603c8fb4b616"; line = 56 },
    @{ conv = "12efe66e-1aef-4988-845c-603c8fb4b616"; line = 78 },
    @{ conv = "12efe66e-1aef-4988-845c-603c8fb4b616"; line = 79 },
    @{ conv = "12efe66e-1aef-4988-845c-603c8fb4b616"; line = 88 },
    @{ conv = "12efe66e-1aef-4988-845c-603c8fb4b616"; line = 170 },
    @{ conv = "12efe66e-1aef-4988-845c-603c8fb4b616"; line = 283 },
    
    @{ conv = "4b4a5709-3393-4907-804a-d6ff8704880d"; line = 99 },
    @{ conv = "4b4a5709-3393-4907-804a-d6ff8704880d"; line = 132 },
    @{ conv = "4b4a5709-3393-4907-804a-d6ff8704880d"; line = 163 },
    @{ conv = "4b4a5709-3393-4907-804a-d6ff8704880d"; line = 230 },
    @{ conv = "4b4a5709-3393-4907-804a-d6ff8704880d"; line = 265 },
    @{ conv = "4b4a5709-3393-4907-804a-d6ff8704880d"; line = 268 },
    @{ conv = "4b4a5709-3393-4907-804a-d6ff8704880d"; line = 310 },
    @{ conv = "4b4a5709-3393-4907-804a-d6ff8704880d"; line = 315 }
)

foreach ($item in $items) {
    $c = $item.conv
    $l = $item.line
    $transcriptPath = "C:\Users\Textline\.gemini\antigravity\brain\$c\.system_generated\logs\transcript_full.jsonl"
    if (-not (Test-Path $transcriptPath)) {
        $transcriptPath = "C:\Users\Textline\.gemini\antigravity\brain\$c\.system_generated\logs\transcript.jsonl"
    }
    if (-not (Test-Path $transcriptPath)) { continue }
    
    # Get the specific line
    $lineText = Get-Content -Path $transcriptPath | Select-Object -Index ($l - 1)
    if ($null -eq $lineText) { continue }
    
    try {
        $json = ConvertFrom-Json $lineText
        # Look for content or tool_calls
        $outputFile = "scratch/content_${c}_${l}.txt"
        
        $output = ""
        if ($json.content) {
            $output += "=== CONTENT ===\n" + $json.content + "\n"
        }
        if ($json.tool_calls) {
            $output += "=== TOOL CALLS ===\n" + ($json.tool_calls | ConvertTo-Json -Depth 10) + "\n"
        }
        
        $output | Out-File -FilePath $outputFile -Encoding utf8
        Write-Host "Extracted $c line $l to $outputFile"
    } catch {
        Write-Host "Failed to parse $c line $l as JSON"
    }
}
