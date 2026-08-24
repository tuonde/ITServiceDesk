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
using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        var frontendOrigins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>() 
                              ?? new[] { "http://localhost:5173" }; // Default Vite port
        
        policy.WithOrigins(frontendOrigins)
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

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 100,
                Window = TimeSpan.FromSeconds(10),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 2
            }));

    options.AddPolicy("AuthPolicy", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromSeconds(10),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0
            }));

    options.AddPolicy("UploadPolicy", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromSeconds(10),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0
            }));
});

builder.Services.AddDbContext<ITServiceDeskDbContext>(options =>
{
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"));
});

builder.Services.AddIdentity<AppUser, IdentityRole<Guid>>(options =>
{
    options.Password.RequireDigit = true;
    options.Password.RequiredLength = 8;
    options.Password.RequireNonAlphanumeric = true;
    options.Password.RequireUppercase = true;
    options.Password.RequireLowercase = true;

    // Account Lockout Policy
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
    options.Lockout.MaxFailedAccessAttempts = 5;
    options.Lockout.AllowedForNewUsers = true;
})
.AddRoles<IdentityRole<Guid>>()
.AddEntityFrameworkStores<ITServiceDeskDbContext>()
.AddDefaultTokenProviders();

var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = Environment.GetEnvironmentVariable("JWT_SECRET") ?? jwtSettings["SecretKey"];

if (builder.Environment.IsProduction() && (string.IsNullOrEmpty(secretKey) || secretKey == "[SECRET_KEY_PLACEHOLDER]"))
{
    throw new Exception("FATAL ERROR: JWT_SECRET environment variable is missing in Production environment.");
}
else if (string.IsNullOrEmpty(secretKey) || secretKey == "[SECRET_KEY_PLACEHOLDER]")
{
    secretKey = "DevelopmentSuperSecretKeyForLocalHost123456789!";
}

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
builder.Services.AddScoped<IKbArticleRepository, KbArticleRepository>();

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
builder.Services.AddScoped<IKbArticleService, KbArticleManager>();
builder.Services.AddScoped<IKbCategoryService, KbCategoryManager>();
builder.Services.AddScoped<IReportService, ReportManager>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<IUserContextService, ITServiceDesk.API.Services.UserContextService>();

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

    if (app.Environment.IsDevelopment() && builder.Configuration.GetValue<bool>("DemoData:Enabled"))
    {
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
        var seeder = new ITServiceDesk.Service.Seeders.DemoDataSeeder(context, userManager, roleManager);
        seeder.SeedAsync().GetAwaiter().GetResult();
    }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseMiddleware<ITServiceDesk.API.Middlewares.GlobalExceptionMiddleware>();

app.UseHttpsRedirection();

// Dosya yükleme (Uploads) klasörü için dışarıya statik dosya erişimini açıyoruz
app.UseStaticFiles();

app.UseCors("AllowAll");

app.Use(async (context, next) =>
{
    context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Append("X-Frame-Options", "DENY");
    context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
    await next();
});
app.UseRouting();
app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<TicketHub>("/ticketHub");
app.MapHub<NotificationHub>("/notificationHub");

app.Run();

public partial class Program { }

