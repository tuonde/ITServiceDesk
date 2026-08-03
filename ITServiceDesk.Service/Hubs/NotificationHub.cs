using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace ITServiceDesk.Service.Hubs;

[Authorize]
public class NotificationHub : Hub
{
}
