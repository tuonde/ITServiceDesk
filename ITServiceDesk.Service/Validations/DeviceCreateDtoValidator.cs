using FluentValidation;
using ITServiceDesk.Service.DTOs.Devices;

namespace ITServiceDesk.Service.Validations;

public class DeviceCreateDtoValidator : AbstractValidator<DeviceCreateDto>
{
    public DeviceCreateDtoValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Cihaz adı boş geçilemez.")
            .MaximumLength(100).WithMessage("Cihaz adı en fazla 100 karakter olabilir.");

        RuleFor(x => x.Code)
            .NotEmpty().WithMessage("Cihaz kodu boş geçilemez.")
            .MaximumLength(50).WithMessage("Cihaz kodu en fazla 50 karakter olabilir.");
    }
}
