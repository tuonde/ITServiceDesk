using FluentValidation;
using ITServiceDesk.Service.DTOs;

namespace ITServiceDesk.Service.Validations;

public class DepartmentCreateDtoValidator : AbstractValidator<DepartmentCreateDto>
{
    public DepartmentCreateDtoValidator()
    {
        RuleFor(x => x.Name).NotEmpty().WithMessage("Departman adı boş olamaz.")
                            .MaximumLength(100).WithMessage("Departman adı 100 karakterden uzun olamaz.");
                            
        RuleFor(x => x.Description).MaximumLength(500).WithMessage("Açıklama 500 karakterden uzun olamaz.");
    }
}
