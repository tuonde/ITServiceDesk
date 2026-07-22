using FluentValidation;
using ITServiceDesk.Service.DTOs.Comments;

namespace ITServiceDesk.Service.Validations;

public class CommentCreateDtoValidator : AbstractValidator<CommentCreateDto>
{
    public CommentCreateDtoValidator()
    {
        RuleFor(x => x.Content).NotEmpty().WithMessage("Yorum içeriği boş olamaz.");
        RuleFor(x => x.TicketId).NotEmpty().WithMessage("Bilet ID (TicketId) boş olamaz.");
        RuleFor(x => x.UserId).NotEmpty().WithMessage("Kullanıcı ID (UserId) boş olamaz.");
    }
}
