using ITServiceDesk.Core.Entities;
using ITServiceDesk.Core.Enums;
using ITServiceDesk.Data.Contexts;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ITServiceDesk.Service.Seeders
{
    public class DemoDataSeeder
    {
        private readonly ITServiceDeskDbContext _context;
        private readonly UserManager<AppUser> _userManager;
        private readonly RoleManager<IdentityRole<Guid>> _roleManager;

        public DemoDataSeeder(ITServiceDeskDbContext context, UserManager<AppUser> userManager, RoleManager<IdentityRole<Guid>> roleManager)
        {
            _context = context;
            _userManager = userManager;
            _roleManager = roleManager;
        }

        public async Task SeedAsync()
        {
            // 1. Roles
            string[] roles = { "Admin", "Technician", "User" };
            foreach (var role in roles)
            {
                if (!await _roleManager.RoleExistsAsync(role))
                {
                    await _roleManager.CreateAsync(new IdentityRole<Guid>(role));
                }
            }

            // 2. Departments
            var deps = new Dictionary<string, Department>
            {
                { "IT", new Department { Id = Guid.NewGuid(), Name = "Bilgi İşlem" } },
                { "HR", new Department { Id = Guid.NewGuid(), Name = "İnsan Kaynakları" } },
                { "Finance", new Department { Id = Guid.NewGuid(), Name = "Finans" } }
            };

            foreach (var kvp in deps)
            {
                var existing = await _context.Departments.FirstOrDefaultAsync(d => d.Name == kvp.Value.Name);
                if (existing == null)
                {
                    _context.Departments.Add(kvp.Value);
                }
                else
                {
                    deps[kvp.Key] = existing;
                }
            }
            await _context.SaveChangesAsync();

            // 3. Demo Users
            var demoUsers = new List<(string Email, string FirstName, string LastName, string Role, Department Dep)>
            {
                ("admin@itservicedesk.local", "Demo", "Admin", "Admin", deps["IT"]),
                ("tech@itservicedesk.local", "Demo", "Technician", "Technician", deps["IT"]),
                ("user@itservicedesk.local", "Demo", "User", "User", deps["HR"])
            };

            var createdUsers = new Dictionary<string, AppUser>();
            foreach (var u in demoUsers)
            {
                var user = await _userManager.FindByEmailAsync(u.Email);
                if (user == null)
                {
                    user = new AppUser
                    {
                        UserName = u.Email,
                        Email = u.Email,
                        FirstName = u.FirstName,
                        LastName = u.LastName,
                        DepartmentId = u.Dep.Id,
                        EmailConfirmed = true
                    };
                    var result = await _userManager.CreateAsync(user, "Demo12345!"); // Development-only password
                    if (result.Succeeded)
                    {
                        await _userManager.AddToRoleAsync(user, u.Role);
                    }
                }
                createdUsers[u.Email] = user;
            }

            // 4. Device Categories
            var devCats = new Dictionary<string, DeviceCategory>
            {
                { "Laptop", new DeviceCategory { Id = Guid.NewGuid(), Name = "Dizüstü Bilgisayar" } },
                { "Desktop", new DeviceCategory { Id = Guid.NewGuid(), Name = "Masaüstü Bilgisayar" } },
                { "Monitor", new DeviceCategory { Id = Guid.NewGuid(), Name = "Monitör" } },
                { "Phone", new DeviceCategory { Id = Guid.NewGuid(), Name = "Cep Telefonu" } },
                { "Printer", new DeviceCategory { Id = Guid.NewGuid(), Name = "Yazıcı" } }
            };
            foreach (var kvp in devCats)
            {
                var existing = await _context.DeviceCategories.FirstOrDefaultAsync(c => c.Name == kvp.Value.Name);
                if (existing == null)
                {
                    _context.DeviceCategories.Add(kvp.Value);
                }
                else
                {
                    devCats[kvp.Key] = existing;
                }
            }
            await _context.SaveChangesAsync();

            // 5. Devices
            if (!await _context.Devices.AnyAsync(d => d.Code.StartsWith("DEMO-")))
            {
                var devices = new List<Device>
                {
                    new Device { Id = Guid.NewGuid(), Code = "DEMO-LT-01", Name = "Dell XPS 15", CategoryId = devCats["Laptop"].Id, DepartmentId = deps["IT"].Id, AssignedUserId = createdUsers["tech@itservicedesk.local"].Id, Status = DeviceStatus.Active, WarrantyExpirationDate = DateTime.UtcNow.AddDays(300) },
                    new Device { Id = Guid.NewGuid(), Code = "DEMO-LT-02", Name = "MacBook Pro", CategoryId = devCats["Laptop"].Id, DepartmentId = deps["HR"].Id, AssignedUserId = createdUsers["user@itservicedesk.local"].Id, Status = DeviceStatus.Active, WarrantyExpirationDate = DateTime.UtcNow.AddDays(400) },
                    new Device { Id = Guid.NewGuid(), Code = "DEMO-MN-01", Name = "LG 27 inch 4K", CategoryId = devCats["Monitor"].Id, DepartmentId = deps["HR"].Id, AssignedUserId = createdUsers["user@itservicedesk.local"].Id, Status = DeviceStatus.Active },
                    new Device { Id = Guid.NewGuid(), Code = "DEMO-MB-01", Name = "iPhone 14", CategoryId = devCats["Phone"].Id, DepartmentId = deps["IT"].Id, AssignedUserId = createdUsers["admin@itservicedesk.local"].Id, Status = DeviceStatus.Active },
                    new Device { Id = Guid.NewGuid(), Code = "DEMO-PR-01", Name = "HP LaserJet", CategoryId = devCats["Printer"].Id, DepartmentId = deps["Finance"].Id, Status = DeviceStatus.Storage }
                };
                _context.Devices.AddRange(devices);
                await _context.SaveChangesAsync();
            }

            // 5.5 KB Categories and Articles
            var kbCat1 = await _context.KbCategories.FirstOrDefaultAsync(c => c.Name == "Sıkça Sorulan Sorular");
            if (kbCat1 == null)
            {
                kbCat1 = new KbCategory { Id = Guid.NewGuid(), Name = "Sıkça Sorulan Sorular", Description = "Genel sorular", Icon = "HelpCircle" };
                var kbCat2 = new KbCategory { Id = Guid.NewGuid(), Name = "Donanım", Description = "Donanım rehberleri", Icon = "Monitor" };
                _context.KbCategories.AddRange(kbCat1, kbCat2);
                await _context.SaveChangesAsync();
                
                var adminUser = createdUsers["admin@itservicedesk.local"];
                _context.KbArticles.AddRange(
                    new KbArticle { Id = Guid.NewGuid(), Title = "Şifremi Nasıl Sıfırlarım?", Content = "Şifrenizi sıfırlamak için IT departmanına bilet açın.", CategoryId = kbCat1.Id, AuthorId = adminUser.Id, Status = KbArticleStatus.Published, Visibility = KbArticleVisibility.Both, ArticleType = KbArticleType.FAQ, ViewCount = 150 },
                    new KbArticle { Id = Guid.NewGuid(), Title = "Yazıcı Kurulum Rehberi", Content = "Yazıcıyı ağa bağlamak için 192.168.1.50 adresine gidin.", CategoryId = kbCat2.Id, AuthorId = adminUser.Id, Status = KbArticleStatus.Published, Visibility = KbArticleVisibility.Technician, ArticleType = KbArticleType.Guide, ViewCount = 75 }
                );
                await _context.SaveChangesAsync();
            }

            // 6. Tickets
            var systemSettings = await _context.SystemSettings.FirstOrDefaultAsync();
            if (systemSettings == null)
            {
                systemSettings = new SystemSetting
                {
                    Id = Guid.NewGuid(), AppName = "IT Service Desk", SessionTimeoutMinutes = 30, PasswordMinLength = 6, PasswordRequireUppercase = false,
                    SlaCriticalResponseHours = 1, SlaCriticalResolutionHours = 4, SlaHighResponseHours = 2, SlaHighResolutionHours = 8,
                    SlaMediumResponseHours = 4, SlaMediumResolutionHours = 24, SlaLowResponseHours = 8, SlaLowResolutionHours = 48
                };
                _context.SystemSettings.Add(systemSettings);
                await _context.SaveChangesAsync();
            }

            var ticketCategories = await _context.TicketCategories.ToListAsync();
            if (!ticketCategories.Any()) return;

            var userAcc = createdUsers["user@itservicedesk.local"];
            var techAcc = createdUsers["tech@itservicedesk.local"];

            // Determine if tickets exist
            if (!await _context.Tickets.AnyAsync(t => t.Title.StartsWith("[DEMO]")))
            {
                var rng = new Random(12345); // deterministic
                var tickets = new List<Ticket>();
                
                // 15 tickets total
                for (int i = 1; i <= 15; i++)
                {
                    var cat = ticketCategories[i % ticketCategories.Count];
                    var priority = (Priority)(i % 4);
                    var isResolved = i <= 6; // First 6 are resolved
                    var isInProgress = i > 6 && i <= 10; // Next 4 in progress
                    // Rest are Open

                    var createTime = DateTime.UtcNow.AddDays(-rng.Next(1, 45)).AddHours(-rng.Next(1, 24));
                    
                    int slaResponse = priority switch { Priority.Critical => systemSettings.SlaCriticalResponseHours, Priority.High => systemSettings.SlaHighResponseHours, Priority.Medium => systemSettings.SlaMediumResponseHours, _ => systemSettings.SlaLowResponseHours };
                    int slaResolve = priority switch { Priority.Critical => systemSettings.SlaCriticalResolutionHours, Priority.High => systemSettings.SlaHighResolutionHours, Priority.Medium => systemSettings.SlaMediumResolutionHours, _ => systemSettings.SlaLowResolutionHours };

                    var t = new Ticket
                    {
                        Id = Guid.NewGuid(),
                        Title = $"[DEMO] Örnek Bilet #{i} - {cat.Name} Talebi",
                        Description = $"Bu bilet demo amaçlı otomatik oluşturulmuştur. Sorun detayı: {cat.Name} kategorisinde destek talep ediliyor.",
                        CategoryId = cat.Id,
                        Priority = priority,
                        Status = isResolved ? TicketStatus.Resolved : (isInProgress ? TicketStatus.InProgress : TicketStatus.Open),
                        RequesterId = userAcc.Id,
                        DepartmentId = deps["HR"].Id,
                        CreatedAt = createTime,
                        UpdatedAt = createTime.AddHours(1),
                        ResponseDueDate = createTime.AddHours(slaResponse),
                        ResolutionDueDate = createTime.AddHours(slaResolve),
                        AssigneeId = (isResolved || isInProgress) ? techAcc.Id : null
                    };

                    if (isResolved)
                    {
                        t.ResolvedAt = createTime.AddDays(rng.Next(1, 3));
                        t.ResolutionReport = "Sorun giderildi, test edildi ve teslim edildi.";
                    }

                    tickets.Add(t);
                }

                _context.Tickets.AddRange(tickets);
                await _context.SaveChangesAsync();

                // Add comments and notifications to the first few tickets
                var t1 = tickets[0]; // Resolved
                var t2 = tickets[7]; // InProgress
                
                var c1 = new Comment { Id = Guid.NewGuid(), TicketId = t1.Id, UserId = techAcc.Id, Content = "İlgili donanım kontrolleri başlatıldı.", CreatedAt = t1.CreatedAt.AddHours(1) };
                var c2 = new Comment { Id = Guid.NewGuid(), TicketId = t1.Id, UserId = userAcc.Id, Content = "Teşekkürler, beklemedeyim.", CreatedAt = t1.CreatedAt.AddHours(2) };
                var c3 = new Comment { Id = Guid.NewGuid(), TicketId = t2.Id, UserId = techAcc.Id, Content = "Yazılım güncellemesi yapılıyor.", CreatedAt = t2.CreatedAt.AddHours(1) };

                _context.Comments.AddRange(c1, c2, c3);

                var n1 = new Notification { Id = Guid.NewGuid(), UserId = userAcc.Id, Message = $"Biletiniz çözüldü: {t1.Title}", IsRead = false, CreatedAt = t1.ResolvedAt ?? DateTime.UtcNow, RelatedTicketId = t1.Id };
                var n2 = new Notification { Id = Guid.NewGuid(), UserId = userAcc.Id, Message = $"Biletinize yorum yapıldı: {t2.Title}", IsRead = false, CreatedAt = c3.CreatedAt, RelatedTicketId = t2.Id };
                var n3 = new Notification { Id = Guid.NewGuid(), UserId = techAcc.Id, Message = $"Yeni bilet atandı: {t2.Title}", IsRead = true, CreatedAt = t2.CreatedAt.AddMinutes(10), RelatedTicketId = t2.Id };

                _context.Notifications.AddRange(n1, n2, n3);
                await _context.SaveChangesAsync();
            }
        }
    }
}
