namespace ITServiceDesk.Service.DTOs.Settings;

public class SystemSettingsDto
{
    public string AppName { get; set; } = "IT Service Desk";
    public int SessionTimeoutMinutes { get; set; } = 30;
    public int PasswordMinLength { get; set; } = 6;
    public bool PasswordRequireUppercase { get; set; } = false;

    public int SlaCriticalResponseHours { get; set; } = 1;
    public int SlaCriticalResolutionHours { get; set; } = 4;
    
    public int SlaHighResponseHours { get; set; } = 4;
    public int SlaHighResolutionHours { get; set; } = 8;
    
    public int SlaMediumResponseHours { get; set; } = 8;
    public int SlaMediumResolutionHours { get; set; } = 24;
    
    public int SlaLowResponseHours { get; set; } = 24;
    public int SlaLowResolutionHours { get; set; } = 48;
}
