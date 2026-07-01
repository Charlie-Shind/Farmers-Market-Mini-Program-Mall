# Inspect line 824 in transcript_full.jsonl to see its content
$transcriptPath = "C:\Users\Textline\.gemini\antigravity\brain\12efe66e-1aef-4988-845c-603c8fb4b616\.system_generated\logs\transcript_full.jsonl"
$line = Get-Content -Path $transcriptPath | Select-Object -Index 824

$json = ConvertFrom-Json $line
Write-Host "Root Type: $($json.type), Status: $($json.status)"
Write-Host "Content length: $($json.content.Length)"
if ($json.content.Length -gt 0) {
    Write-Host "Content Preview:"
    $json.content.Substring(0, [Math]::Min(1000, $json.content.Length))
    # Save the entire content to a temp file
    $json.content | Out-File -FilePath "scratch/step_824_content.txt" -Encoding utf8
}
