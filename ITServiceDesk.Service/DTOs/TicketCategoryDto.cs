namespace ITServiceDesk.Service.DTOs;

public class TicketCategoryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class TicketCategoryCreateDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class TicketCategoryUpdateDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}
