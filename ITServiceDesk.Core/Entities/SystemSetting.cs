namespace ITServiceDesk.Core.Entities;

public class SystemSetting : BaseEntity
{
    public string AppName { get; set; } = "IT Service Desk";
    public int SessionTimeoutMinutes { get; set; } = 30;
    public int PasswordMinLength { get; set; } = 6;
    public bool PasswordRequireUppercase { get; set; } = false;
}
