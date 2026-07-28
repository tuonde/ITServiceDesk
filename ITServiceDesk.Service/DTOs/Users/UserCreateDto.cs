using System.ComponentModel.DataAnnotations;

namespace ITServiceDesk.Service.DTOs.Users;

public class UserCreateDto
{
    [Required]
    public string FirstName { get; set; } = string.Empty;
    
    [Required]
    public string LastName { get; set; } = string.Empty;
    
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
    
    public Guid? DepartmentId { get; set; }
    
    [Required]
    public string Role { get; set; } = "User";

    [RegularExpression(@"^\+\d{12}$", ErrorMessage = "Telefon numarası +905551234567 formatında olmalıdır.")]
    public string? PhoneNumber { get; set; }
}
