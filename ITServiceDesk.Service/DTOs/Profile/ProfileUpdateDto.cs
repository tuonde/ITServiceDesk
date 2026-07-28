using System.ComponentModel.DataAnnotations;

namespace ITServiceDesk.Service.DTOs.Profile;

public class ProfileUpdateDto
{
    [Required(ErrorMessage = "Ad alanı zorunludur.")]
    [StringLength(50, MinimumLength = 2, ErrorMessage = "Ad 2 ile 50 karakter arasında olmalıdır.")]
    public string FirstName { get; set; } = null!;

    [Required(ErrorMessage = "Soyad alanı zorunludur.")]
    [StringLength(50, MinimumLength = 2, ErrorMessage = "Soyad 2 ile 50 karakter arasında olmalıdır.")]
    public string LastName { get; set; } = null!;

    [RegularExpression(@"^\+\d{12}$", ErrorMessage = "Telefon numarası +905551234567 formatında olmalıdır.")]
    public string? PhoneNumber { get; set; }
}
