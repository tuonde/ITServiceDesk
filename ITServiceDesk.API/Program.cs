using FluentValidation;
using ITServiceDesk.Core.Interfaces.Repositories;
using ITServiceDesk.Data.Contexts;
using ITServiceDesk.Data.Repositories;
using ITServiceDesk.Service.Interfaces;
using ITServiceDesk.Service.Mappings;
using ITServiceDesk.Service.Services;
using Microsoft.EntityFrameworkCore;

using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using ITServiceDesk.Service.Hubs;
using ITServiceDesk.Service.Workers;
using Microsoft.AspNetCore.Identity;
using ITServiceDesk.Core.Entities;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.SetIsOriginAllowed(origin => new Uri(origin).Host == "localhost")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "ITServiceDesk API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddMemoryCache();
builder.Services.AddSignalR();

builder.Services.AddDbContext<ITServiceDeskDbContext>(options =>
{
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"));
});

builder.Services.AddIdentity<AppUser, IdentityRole<Guid>>(options =>
{
    options.Password.RequireDigit = false;
    options.Password.RequiredLength = 6;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequireUppercase = false;
    options.Password.RequireLowercase = false;
})
.AddRoles<IdentityRole<Guid>>()
.AddEntityFrameworkStores<ITServiceDeskDbContext>()
.AddDefaultTokenProviders();

var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = jwtSettings["SecretKey"] ?? "ThisIsAVerySecretAndSecureKeyForITServiceDeskApplication";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey))
    };
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && (path.StartsWithSegments("/ticketHub") || path.StartsWithSegments("/notificationHub")))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
});

// Repositories
builder.Services.AddScoped(typeof(IRepository<>), typeof(EfRepository<>));
builder.Services.AddScoped<ITicketRepository, EfTicketRepository>();
builder.Services.AddScoped<ITicketCategoryRepository, EfTicketCategoryRepository>();

// Services
builder.Services.AddScoped<ITicketService, TicketManager>();
builder.Services.AddScoped<IDepartmentService, DepartmentManager>();
builder.Services.AddScoped<IAuditLogService, AuditLogManager>();
builder.Services.AddScoped<ICommentService, CommentManager>();
builder.Services.AddScoped<IAttachmentService, AttachmentManager>();
builder.Services.AddScoped<INotificationService, NotificationManager>();
builder.Services.AddScoped<IAuthService, AuthManager>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<ISystemSettingsService, SystemSettingsService>();
builder.Services.AddScoped<IDeviceService, DeviceManager>();
builder.Services.AddScoped<ITicketCategoryService, TicketCategoryManager>();
builder.Services.AddHttpContextAccessor();

// Background Workers
builder.Services.AddHostedService<SlaEscalationWorker>();

// Mappings & Validations
builder.Services.AddAutoMapper(config =>
{
    config.AddProfile<ITServiceDesk.Service.Mappings.MapProfile>();
});
builder.Services.AddValidatorsFromAssembly(typeof(MapProfile).Assembly);

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<ITServiceDeskDbContext>();
    if (!context.TicketCategories.Any())
    {
        context.TicketCategories.AddRange(
            new TicketCategory { Id = Guid.NewGuid(), Name = "Donanım Arızası", Description = "Bilgisayar, yazıcı vb. fiziksel cihaz sorunları." },
            new TicketCategory { Id = Guid.NewGuid(), Name = "Yazılım / Uygulama Hatası", Description = "Kullanılan programların çalışmaması." },
            new TicketCategory { Id = Guid.NewGuid(), Name = "Ağ ve İnternet", Description = "İnternet bağlantı sorunları veya ağa erişememe." },
            new TicketCategory { Id = Guid.NewGuid(), Name = "Hesap ve Erişim", Description = "Şifre sıfırlama, yetki talepleri." }
        );
        context.SaveChanges();
    }

    var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
    var roles = new[] { "Admin", "Technician", "User" };
    foreach (var role in roles)
    {
        if (!roleManager.RoleExistsAsync(role).GetAwaiter().GetResult())
        {
            roleManager.CreateAsync(new IdentityRole<Guid>(role)).GetAwaiter().GetResult();
        }
    }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// Dosya yükleme (Uploads) klasörü için dışarıya statik dosya erişimini açıyoruz
app.UseStaticFiles();

app.UseCors("AllowAll");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<TicketHub>("/ticketHub");
app.MapHub<NotificationHub>("/notificationHub");

app.Run();
