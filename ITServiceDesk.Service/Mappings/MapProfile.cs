using AutoMapper;
using ITServiceDesk.Core.Entities;
using ITServiceDesk.Service.DTOs;
using ITServiceDesk.Service.DTOs.Comments;
using ITServiceDesk.Service.DTOs.Attachments;
using ITServiceDesk.Service.DTOs.Notifications;
using ITServiceDesk.Service.DTOs.Auth;
using ITServiceDesk.Service.DTOs.KnowledgeBase;

namespace ITServiceDesk.Service.Mappings;

public class MapProfile : Profile
{
    public MapProfile()
    {
        // Tickets
        CreateMap<Ticket, TicketResponseDto>()
            .ForMember(dest => dest.RequesterName, opt => opt.MapFrom(src => src.Requester != null ? src.Requester.FirstName + " " + src.Requester.LastName : "Bilinmiyor"))
            .ForMember(dest => dest.AssigneeName, opt => opt.MapFrom(src => src.Assignee != null ? src.Assignee.FirstName + " " + src.Assignee.LastName : null))
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
        CreateMap<Comment, CommentResponseDto>()
            .ForMember(dest => dest.UserName, opt => opt.MapFrom(src => src.User != null ? src.User.FirstName + " " + src.User.LastName : "Bilinmeyen Kullanıcı"));

        // Attachments
        CreateMap<AttachmentCreateDto, Attachment>();
        CreateMap<Attachment, AttachmentResponseDto>()
            .ForMember(dest => dest.UploaderName, opt => opt.MapFrom(src => src.Uploader != null ? src.Uploader.FirstName + " " + src.Uploader.LastName : "Bilinmiyor"));

        // Notifications
        CreateMap<NotificationUpdateDto, Notification>();
        CreateMap<Notification, NotificationResponseDto>();

        // Auth / Users
        CreateMap<RegisterDto, AppUser>();
        CreateMap<AppUser, UserResponseDto>();

        // AuditLogs
        CreateMap<AuditLog, AuditLogDto>();
        
        // Ticket Category Mapping
        CreateMap<TicketCategory, TicketCategoryDto>().ReverseMap();
        CreateMap<TicketCategoryCreateDto, TicketCategory>();
        CreateMap<TicketCategoryUpdateDto, TicketCategory>();
        
        // Knowledge Base
        CreateMap<KbCategory, KbCategoryResponseDto>();
        CreateMap<KbCategoryCreateDto, KbCategory>();
        CreateMap<KbCategoryUpdateDto, KbCategory>();
        
        CreateMap<KbArticle, KbArticleResponseDto>()
            .ForMember(dest => dest.CategoryName, opt => opt.MapFrom(src => src.Category != null ? src.Category.Name : "Bilinmiyor"))
            .ForMember(dest => dest.AuthorName, opt => opt.MapFrom(src => src.Author != null ? src.Author.FirstName + " " + src.Author.LastName : "Bilinmiyor"));
        CreateMap<KbArticleCreateDto, KbArticle>();
        CreateMap<KbArticleUpdateDto, KbArticle>();
    }
}
