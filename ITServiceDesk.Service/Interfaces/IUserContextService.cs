namespace ITServiceDesk.Service.Interfaces;

public interface IUserContextService
{
    Guid? UserId { get; }
    IList<string> UserRoles { get; }
    bool IsAdmin { get; }
    bool IsTechnician { get; }
}
