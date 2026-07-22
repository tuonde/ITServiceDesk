using ITServiceDesk.Core.Enums;
using System.Text.Json.Serialization;

namespace ITServiceDesk.Service.DTOs;

public class TicketCreateDto
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public Priority Priority { get; set; }
    public Guid? DepartmentId { get; set; }
    
    [JsonIgnore]
    public Guid RequesterId { get; set; }
}
