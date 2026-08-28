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
using Serilog;
using Serilog.Events;
using Microsoft.AspNetCore.Identity;
using ITServiceDesk.Core.Entities;
using Microsoft.OpenApi.Models;
using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;
using System.Net;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((context, services, configuration) => configuration
    .ReadFrom.Configuration(context.Configuration)
    .ReadFrom.Services(services)
    .Enrich.FromLogContext());

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

if (builder.Configuration.GetValue<bool>("Proxy:ForwardedHeadersEnabled"))
{
    var trustedNetwork = builder.Configuration.GetValue<string>("Proxy:TrustedNetwork");
    var prefixLength = builder.Configuration.GetValue<int?>("Proxy:PrefixLength");

    if (string.IsNullOrWhiteSpace(trustedNetwork) || prefixLength == null)
    {
        throw new Exception("FATAL ERROR: Proxy:TrustedNetwork and Proxy:PrefixLength must be provided when Proxy:ForwardedHeadersEnabled is true.");
    }

    if (!IPAddress.TryParse(trustedNetwork, out var parsedNetwork))
    {
        throw new Exception($"FATAL ERROR: Invalid Proxy:TrustedNetwork '{trustedNetwork}'.");
    }

    builder.Services.Configure<ForwardedHeadersOptions>(options =>
    {
        options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
        options.KnownNetworks.Add(new Microsoft.AspNetCore.HttpOverrides.IPNetwork(parsedNetwork, prefixLength.Value));
    });
}

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
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"), sqlOptions =>
    {
        sqlOptions.EnableRetryOnFailure(
            maxRetryCount: 5,
            maxRetryDelay: TimeSpan.FromSeconds(15),
            errorNumbersToAdd: null);
});
});

builder.Services.AddHealthChecks()
    .AddDbContextCheck<ITServiceDeskDbContext>("database", tags: new[] { "ready" });

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
if (!builder.Environment.IsEnvironment("E2E"))
{
    builder.Services.AddHostedService<SlaEscalationWorker>();
}

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

    // FAZ 14.1 Config-controlled Migration
    if (builder.Configuration.GetValue<bool>("Database:AutoMigrate"))
    {
        Console.WriteLine("AutoMigrate is enabled. Applying migrations...");
        try
        {
            context.Database.Migrate();
            Console.WriteLine("Migrations applied successfully.");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"FATAL ERROR: Failed to apply database migrations. {ex.Message}");
            throw; // Fail the startup
        }
    }

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

    var userManager = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();

    // FAZ 14.3.1 - Explicit Config-Controlled Admin Bootstrap
    if (builder.Configuration.GetValue<bool>("BootstrapAdmin:Enabled"))
    {
        var email = builder.Configuration.GetValue<string>("BootstrapAdmin:Email");
        var password = builder.Configuration.GetValue<string>("BootstrapAdmin:Password");

        if (!string.IsNullOrWhiteSpace(email) && !string.IsNullOrWhiteSpace(password))
        {
            var existingAdmin = userManager.FindByEmailAsync(email).GetAwaiter().GetResult();
            if (existingAdmin == null)
            {
                var adminUser = new AppUser
                {
                    UserName = email,
                    Email = email,
                    FirstName = "System",
                    LastName = "Administrator"
                };

                var result = userManager.CreateAsync(adminUser, password).GetAwaiter().GetResult();
                if (result.Succeeded)
                {
                    userManager.AddToRoleAsync(adminUser, "Admin").GetAwaiter().GetResult();
                    Console.WriteLine($"Bootstrap Admin created successfully: {email}");
                }
                else
                {
                    Console.WriteLine($"Bootstrap Admin creation failed: {string.Join(", ", result.Errors.Select(e => e.Description))}");
                }
            }
            else
            {
                var rolesList = userManager.GetRolesAsync(existingAdmin).GetAwaiter().GetResult();
                if (!rolesList.Contains("Admin"))
                {
                    var errorMsg = $"FATAL ERROR: Bootstrap admin email '{email}' already belongs to a non-admin user. Automatic role elevation is disabled for security reasons.";
                    Console.WriteLine(errorMsg);
                    throw new Exception(errorMsg);
                }
                else
                {
                    Console.WriteLine($"Bootstrap Admin already exists: {email}");
                }
            }
        }
        else
        {
            Console.WriteLine("BootstrapAdmin is enabled but Email or Password is missing in configuration.");
        }
    }

    if (builder.Configuration.GetValue<bool>("DemoData:Enabled"))
    {
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

if (builder.Configuration.GetValue<bool>("Proxy:ForwardedHeadersEnabled"))
{
    app.UseForwardedHeaders();
}

app.Use(async (context, next) =>
{
    context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Append("X-Frame-Options", "DENY");
    context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
    await next();
});
app.UseRouting();

app.UseSerilogRequestLogging(options =>
{
    options.MessageTemplate = "HTTP {RequestMethod} {RequestPath} responded {StatusCode} in {Elapsed:0.0000} ms";
    
    options.GetLevel = (httpContext, elapsed, ex) =>
    {
        var path = httpContext.Request.Path.Value;
        if (path != null && (path.StartsWith("/health/ready") || path.StartsWith("/health/live")))
        {
            return LogEventLevel.Debug;
        }

        if (ex != null || httpContext.Response.StatusCode > 499)
        {
            return LogEventLevel.Error;
        }

        return LogEventLevel.Information;
    };
});
app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<TicketHub>("/ticketHub");
app.MapHub<NotificationHub>("/notificationHub");

app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = _ => false
}).AllowAnonymous().DisableRateLimiting();

app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready")
}).AllowAnonymous().DisableRateLimiting();

app.Run();

public partial class Program { }

