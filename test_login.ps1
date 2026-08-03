[System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}
$body = @{
    email = 'a.can@sirket.com'
    password = '1ad1b231aA1!'
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri 'http://localhost:5014/api/auth/login' -Method Post -Body $body -ContentType 'application/json'
    Write-Host "Success: $response"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    if ($_.ErrorDetails) { Write-Host "Details: $($_.ErrorDetails.Message)" }
}
