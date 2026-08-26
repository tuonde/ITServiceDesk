using ITServiceDesk.Core.Entities;
using ITServiceDesk.Data.Contexts;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ITServiceDesk.E2ESetup
{
    class Program
    {
        static async Task Main(string[] args)
        {
            var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection");
            if (string.IsNullOrEmpty(connectionString))
            {
                Console.WriteLine("ConnectionStrings__DefaultConnection env variable is missing!");
                Environment.Exit(1);
            }

            var services = new ServiceCollection();
            services.AddHttpContextAccessor();
            services.AddDbContext<ITServiceDeskDbContext>(options =>
            {
                options.UseSqlServer(connectionString);
            });

            services.AddIdentityCore<AppUser>(options =>
            {
                options.Password.RequireDigit = true;
                options.Password.RequiredLength = 8;
                options.Password.RequireNonAlphanumeric = true;
                options.Password.RequireUppercase = true;
                options.Password.RequireLowercase = true;
            })
            .AddRoles<IdentityRole<Guid>>()
            .AddEntityFrameworkStores<ITServiceDeskDbContext>();

            services.AddLogging();

            var serviceProvider = services.BuildServiceProvider();

            using var scope = serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ITServiceDeskDbContext>();

            // Retry for DB readiness
            int maxRetries = 60;
            bool dbReady = false;
            var masterConnectionString = connectionString.Replace("Database=ITServiceDesk_E2E;", "");
            
            for (int i = 0; i < maxRetries; i++)
            {
                try
                {
                    using var connection = new Microsoft.Data.SqlClient.SqlConnection(masterConnectionString);
                    await connection.OpenAsync();
                    dbReady = true;
                    Console.WriteLine("SQL Server is ready.");
                    break;
                }
                catch
                {
                    // Ignore exception, retry
                }
                Console.WriteLine($"Waiting for SQL Server... ({i + 1}/{maxRetries})");
                await Task.Delay(1000);
            }

            if (!dbReady)
            {
                Console.WriteLine("SQL Server failed to start within bounded timeout.");
                Environment.Exit(1);
            }

            Console.WriteLine("Applying migrations...");
            await context.Database.MigrateAsync();

            Console.WriteLine("Seeding E2E users...");
            var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
            var userManager = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();

            var roles = new[] { "Admin", "Technician", "User" };
            foreach (var role in roles)
            {
                if (!await roleManager.RoleExistsAsync(role))
                {
                    await roleManager.CreateAsync(new IdentityRole<Guid>(role));
                }
            }

            var e2ePassword = "Test!E2E!Password123";
            await CreateUserIfNotExists(userManager, "admin-e2e@integration.local", "E2E", "Admin", "Admin", e2ePassword);
            await CreateUserIfNotExists(userManager, "tech-e2e@integration.local", "E2E", "Technician", "Technician", e2ePassword);
            await CreateUserIfNotExists(userManager, "user-e2e@integration.local", "E2E", "User", "User", e2ePassword);

            Console.WriteLine("E2E Setup complete.");
        }

        static async Task CreateUserIfNotExists(UserManager<AppUser> userManager, string email, string firstName, string lastName, string role, string password)
        {
            var user = await userManager.FindByEmailAsync(email);
            if (user == null)
            {
                user = new AppUser
                {
                    UserName = email,
                    Email = email,
                    FirstName = firstName,
                    LastName = lastName,
                    EmailConfirmed = true
                };
                var result = await userManager.CreateAsync(user, password);
                if (result.Succeeded)
                {
                    await userManager.AddToRoleAsync(user, role);
                    Console.WriteLine($"User {email} created.");
                }
                else
                {
                    Console.WriteLine($"Failed to create user {email}: {string.Join(", ", result.Errors.Select(e => e.Description))}");
                }
            }
            else
            {
                Console.WriteLine($"User {email} already exists.");
            }
        }
    }
}
