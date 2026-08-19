using FluentValidation;
using ITServiceDesk.Service.DTOs.KnowledgeBase;

namespace ITServiceDesk.Service.Validations;

public class KbArticleCreateDtoValidator : AbstractValidator<KbArticleCreateDto>
{
    public KbArticleCreateDtoValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Başlık boş geçilemez.")
            .MaximumLength(200).WithMessage("Başlık en fazla 200 karakter olabilir.");

        RuleFor(x => x.Content)
            .NotEmpty().WithMessage("İçerik boş geçilemez.");

        RuleFor(x => x.CategoryId)
            .NotEmpty().WithMessage("Kategori seçimi zorunludur.");
    }
}
