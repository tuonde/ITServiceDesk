using FluentValidation;
using ITServiceDesk.Service.DTOs;

namespace ITServiceDesk.Service.Validations;

public class TicketCreateDtoValidator : AbstractValidator<TicketCreateDto>
{
    public TicketCreateDtoValidator()
    {
        RuleFor(x => x.Title).NotEmpty().WithMessage("Başlık boş olamaz.")
                             .MaximumLength(200).WithMessage("Başlık 200 karakterden uzun olamaz.");
                             
        RuleFor(x => x.Description).NotEmpty().WithMessage("Açıklama boş olamaz.");
        
        RuleFor(x => x.DepartmentId).NotEmpty().WithMessage("Departman seçilmelidir.");
        
        RuleFor(x => x.RequesterId).NotEmpty().WithMessage("Talep eden kullanıcı seçilmelidir.");
    }
}
