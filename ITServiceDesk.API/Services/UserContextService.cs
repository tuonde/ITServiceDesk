using System.Security.Claims;
using ITServiceDesk.Core.Constants;
using ITServiceDesk.Service.Interfaces;
using Microsoft.AspNetCore.Http;

namespace ITServiceDesk.API.Services;

public class UserContextService : IUserContextService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public UserContextService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public Guid? UserId
    {
        get
        {
            var userIdClaim = _httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.NameIdentifier);
            if (Guid.TryParse(userIdClaim, out var userId))
                return userId;
            return null;
        }
    }

    public IList<string> UserRoles
    {
        get
        {
            return _httpContextAccessor.HttpContext?.User?.Claims
                .Where(c => c.Type == ClaimTypes.Role)
                .Select(c => c.Value)
                .ToList() ?? new List<string>();
        }
    }

    public bool IsAdmin => UserRoles.Contains(RoleConstants.Admin);
    public bool IsTechnician => UserRoles.Contains(RoleConstants.Technician);
}
