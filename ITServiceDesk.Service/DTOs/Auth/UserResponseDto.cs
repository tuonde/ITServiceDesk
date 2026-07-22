namespace ITServiceDesk.Service.DTOs.Auth;

public class UserResponseDto
{
    public Guid Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
}
