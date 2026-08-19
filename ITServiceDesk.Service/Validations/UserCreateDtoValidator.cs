using FluentValidation;
using ITServiceDesk.Service.DTOs.Users;

namespace ITServiceDesk.Service.Validations;

public class UserCreateDtoValidator : AbstractValidator<UserCreateDto>
{
    public UserCreateDtoValidator()
    {
        RuleFor(x => x.FirstName)
            .NotEmpty().WithMessage("Ad alanı boş geçilemez.")
            .MaximumLength(50).WithMessage("Ad alanı en fazla 50 karakter olabilir.");

        RuleFor(x => x.LastName)
            .NotEmpty().WithMessage("Soyad alanı boş geçilemez.")
            .MaximumLength(50).WithMessage("Soyad alanı en fazla 50 karakter olabilir.");

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("E-posta alanı boş geçilemez.")
            .EmailAddress().WithMessage("Geçerli bir e-posta adresi giriniz.");

        RuleFor(x => x.Role)
            .NotEmpty().WithMessage("Rol seçimi zorunludur.");
    }
}
