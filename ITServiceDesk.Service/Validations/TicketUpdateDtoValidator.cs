using FluentValidation;
using ITServiceDesk.Service.DTOs;

namespace ITServiceDesk.Service.Validations;

public class TicketUpdateDtoValidator : AbstractValidator<TicketUpdateDto>
{
    public TicketUpdateDtoValidator()
    {
        RuleFor(x => x.Id).NotEmpty().WithMessage("Ticket ID boş olamaz.");
        RuleFor(x => x.Title).NotEmpty().WithMessage("Başlık boş olamaz.");
        RuleFor(x => x.Description).NotEmpty().WithMessage("Açıklama boş olamaz.");
    }
}
