using AutoMapper;
using ITServiceDesk.Core.Entities;
using ITServiceDesk.Service.DTOs;
using ITServiceDesk.Service.DTOs.Comments;
using ITServiceDesk.Service.DTOs.Attachments;
using ITServiceDesk.Service.DTOs.Notifications;
using ITServiceDesk.Service.DTOs.Auth;

namespace ITServiceDesk.Service.Mappings;

public class MapProfile : Profile
{
    public MapProfile()
    {
        // Tickets
        CreateMap<Ticket, TicketResponseDto>()
            .ForMember(dest => dest.RequesterName, opt => opt.MapFrom(src => src.Requester != null ? src.Requester.FirstName + " " + src.Requester.LastName : "Bilinmiyor"))
            .ForMember(dest => dest.DepartmentName, opt => opt.MapFrom(src => src.Department != null ? src.Department.Name : "Bilinmiyor"))
            .ForMember(dest => dest.DeviceName, opt => opt.MapFrom(src => src.Device != null ? src.Device.Name : null));
        CreateMap<TicketCreateDto, Ticket>();
        CreateMap<TicketUpdateDto, Ticket>()
            .ForMember(dest => dest.Id, opt => opt.Ignore());

        // Departments
        CreateMap<Department, DepartmentResponseDto>();
        CreateMap<DepartmentCreateDto, Department>();

        // Comments
        CreateMap<CommentCreateDto, Comment>();
        CreateMap<CommentUpdateDto, Comment>();
        CreateMap<Comment, CommentResponseDto>();

        // Attachments
        CreateMap<AttachmentCreateDto, Attachment>();
        CreateMap<Attachment, AttachmentResponseDto>();

        // Notifications
        CreateMap<NotificationUpdateDto, Notification>();
        CreateMap<Notification, NotificationResponseDto>();

        // Auth / Users
        CreateMap<RegisterDto, AppUser>();
        CreateMap<AppUser, UserResponseDto>();

        // AuditLogs
        CreateMap<AuditLog, AuditLogDto>();
    }
}
