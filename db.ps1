$conn = New-Object System.Data.SqlClient.SqlConnection('Server=.\SQLEXPRESS;Database=ITServiceDeskDb;Trusted_Connection=True;TrustServerCertificate=True;')
$conn.Open()
$cmd = $conn.CreateCommand()
$cmd.CommandText = 'SELECT Email, NormalizedEmail, UserName, NormalizedUserName FROM AspNetUsers'
$reader = $cmd.ExecuteReader()
while ($reader.Read()) { 
    Write-Host "Email: $($reader['Email']) | NormalizedEmail: $($reader['NormalizedEmail']) | UserName: $($reader['UserName'])"
}
$conn.Close()
