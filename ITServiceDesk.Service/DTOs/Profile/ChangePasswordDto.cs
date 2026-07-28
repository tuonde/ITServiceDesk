using System.ComponentModel.DataAnnotations;

namespace ITServiceDesk.Service.DTOs.Profile;

public class ChangePasswordDto
{
    [Required(ErrorMessage = "Mevcut şifre alanı zorunludur.")]
    public string CurrentPassword { get; set; } = null!;

    [Required(ErrorMessage = "Yeni şifre alanı zorunludur.")]
    [StringLength(100, MinimumLength = 6, ErrorMessage = "Yeni şifre en az 6 karakter olmalıdır.")]
    public string NewPassword { get; set; } = null!;
}
