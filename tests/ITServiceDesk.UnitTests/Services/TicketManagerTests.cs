using AutoMapper;
using ITServiceDesk.Core.Entities;
using ITServiceDesk.Core.Interfaces.Repositories;
using ITServiceDesk.Service.DTOs;
using ITServiceDesk.Service.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using Moq;
using ITServiceDesk.Service.Hubs;
using ITServiceDesk.Service.Interfaces;
using ITServiceDesk.Core.Wrappers;
using ITServiceDesk.Core.Exceptions;
using System;
using System.Threading.Tasks;
using Xunit;
using System.Collections.Generic;
using System.Linq;
using System.Threading;

namespace ITServiceDesk.UnitTests.Services
{
    public class TicketManagerTests
    {
        private readonly Mock<ITicketRepository> _ticketRepoMock;
        private readonly Mock<IMapper> _mapperMock;
        private readonly Mock<ILogger<TicketManager>> _loggerMock;
        private readonly Mock<IHubContext<TicketHub>> _hubContextMock;
        private readonly Mock<INotificationService> _notificationServiceMock;
        private readonly Mock<IRepository<Device>> _deviceRepoMock;
        private readonly Mock<IRepository<SystemSetting>> _systemSettingRepoMock;
        private readonly Mock<IRepository<Comment>> _commentRepoMock;
        private readonly Mock<UserManager<AppUser>> _userManagerMock;
        
        private readonly TicketManager _sut;

        public TicketManagerTests()
        {
            _ticketRepoMock = new Mock<ITicketRepository>();
            _mapperMock = new Mock<IMapper>();
            _loggerMock = new Mock<ILogger<TicketManager>>();
            _hubContextMock = new Mock<IHubContext<TicketHub>>();
            _notificationServiceMock = new Mock<INotificationService>();
            _deviceRepoMock = new Mock<IRepository<Device>>();
            _systemSettingRepoMock = new Mock<IRepository<SystemSetting>>();
            _commentRepoMock = new Mock<IRepository<Comment>>();

            var store = new Mock<IUserStore<AppUser>>();
            _userManagerMock = new Mock<UserManager<AppUser>>(store.Object, null!, null!, null!, null!, null!, null!, null!, null!);

            _sut = new TicketManager(
                _ticketRepoMock.Object,
                _mapperMock.Object,
                _loggerMock.Object,
                _hubContextMock.Object,
                _notificationServiceMock.Object,
                _deviceRepoMock.Object,
                _systemSettingRepoMock.Object,
                _commentRepoMock.Object,
                _userManagerMock.Object
            );
            
            // Default setup for Notification Hub to avoid null refs
            var mockClients = new Mock<IHubClients>();
            var mockClientProxy = new Mock<IClientProxy>();
            mockClients.Setup(c => c.Users(It.IsAny<IReadOnlyList<string>>())).Returns(mockClientProxy.Object);
            _hubContextMock.Setup(h => h.Clients).Returns(mockClients.Object);
            
            _userManagerMock.Setup(u => u.GetUsersInRoleAsync(It.IsAny<string>())).ReturnsAsync(new List<AppUser>());
        }

        #region Reopen Tests

        [Fact]
        public async Task ReopenAsync_WhenTicketIsNotResolved_ShouldThrowAppException()
        {
            // Arrange
            var ticketId = Guid.NewGuid();
            var userId = Guid.NewGuid();
            var existingTicket = new Ticket 
            { 
                Id = ticketId, 
                Status = ITServiceDesk.Core.Enums.TicketStatus.Open 
            };

            _ticketRepoMock.Setup(repo => repo.GetByIdAsync(ticketId))
                .ReturnsAsync(existingTicket);

            var dto = new TicketReopenDto { Reason = "Issue still persists" };

            // Act & Assert
            var exception = await Assert.ThrowsAsync<AppException>(() => _sut.ReopenAsync(ticketId, dto, userId));
            Assert.Contains("Sadece çözülmüş (Resolved) durumdaki biletler", exception.Message);
        }

        [Fact]
        public async Task ReopenAsync_WhenUserIsNotRequester_ShouldThrowUnauthorizedAccessException()
        {
            // Arrange
            var ticketId = Guid.NewGuid();
            var requesterId = Guid.NewGuid();
            var differentUserId = Guid.NewGuid();
            var existingTicket = new Ticket 
            { 
                Id = ticketId, 
                Status = ITServiceDesk.Core.Enums.TicketStatus.Resolved,
                RequesterId = requesterId
            };

            _ticketRepoMock.Setup(repo => repo.GetByIdAsync(ticketId))
                .ReturnsAsync(existingTicket);

            var dto = new TicketReopenDto { Reason = "Issue still persists" };

            // Act & Assert
            var exception = await Assert.ThrowsAsync<UnauthorizedAccessException>(() => _sut.ReopenAsync(ticketId, dto, differentUserId));
            Assert.Contains("Sadece bileti açan kişi yeniden açabilir", exception.Message);
        }

        [Fact]
        public async Task ReopenAsync_WhenValid_ShouldSetStatusOpenAndClearResolvedAt()
        {
            // Arrange
            var ticketId = Guid.NewGuid();
            var requesterId = Guid.NewGuid();
            var originalAssigneeId = Guid.NewGuid();
            var existingTicket = new Ticket 
            { 
                Id = ticketId, 
                Status = ITServiceDesk.Core.Enums.TicketStatus.Resolved,
                RequesterId = requesterId,
                ResolvedAt = DateTime.UtcNow,
                AssigneeId = originalAssigneeId
            };

            _ticketRepoMock.Setup(repo => repo.GetByIdAsync(ticketId)).ReturnsAsync(existingTicket);
            _mapperMock.Setup(m => m.Map<TicketResponseDto>(existingTicket)).Returns(new TicketResponseDto { Id = ticketId });

            var dto = new TicketReopenDto { Reason = "Testing reopen" };

            // Act
            await _sut.ReopenAsync(ticketId, dto, requesterId);

            // Assert Status & Dates
            Assert.Equal(ITServiceDesk.Core.Enums.TicketStatus.Open, existingTicket.Status);
            Assert.Null(existingTicket.ResolvedAt);
            
            // Assert Assignee is preserved
            Assert.Equal(originalAssigneeId, existingTicket.AssigneeId);

            _ticketRepoMock.Verify(repo => repo.Update(existingTicket), Times.Once);
            _ticketRepoMock.Verify(repo => repo.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task ReopenAsync_WhenValid_ShouldPreserveSlaDeadlines()
        {
            // Arrange
            var ticketId = Guid.NewGuid();
            var requesterId = Guid.NewGuid();
            var responseDue = DateTime.UtcNow.AddDays(1);
            var resolutionDue = DateTime.UtcNow.AddDays(2);
            
            var existingTicket = new Ticket 
            { 
                Id = ticketId, 
                Status = ITServiceDesk.Core.Enums.TicketStatus.Resolved,
                RequesterId = requesterId,
                ResponseDueDate = responseDue,
                ResolutionDueDate = resolutionDue
            };

            _ticketRepoMock.Setup(repo => repo.GetByIdAsync(ticketId)).ReturnsAsync(existingTicket);
            _mapperMock.Setup(m => m.Map<TicketResponseDto>(existingTicket)).Returns(new TicketResponseDto());

            // Act
            await _sut.ReopenAsync(ticketId, new TicketReopenDto { Reason = "Reason" }, requesterId);

            // Assert SLA dates are unchanged
            Assert.Equal(responseDue, existingTicket.ResponseDueDate);
            Assert.Equal(resolutionDue, existingTicket.ResolutionDueDate);
        }

        [Fact]
        public async Task ReopenAsync_WhenValid_ShouldCreateReasonComment()
        {
            // Arrange
            var ticketId = Guid.NewGuid();
            var requesterId = Guid.NewGuid();
            var existingTicket = new Ticket 
            { 
                Id = ticketId, 
                Status = ITServiceDesk.Core.Enums.TicketStatus.Resolved,
                RequesterId = requesterId
            };

            _ticketRepoMock.Setup(repo => repo.GetByIdAsync(ticketId)).ReturnsAsync(existingTicket);
            _mapperMock.Setup(m => m.Map<TicketResponseDto>(existingTicket)).Returns(new TicketResponseDto());

            var dto = new TicketReopenDto { Reason = "My specific reopen reason" };

            // Act
            await _sut.ReopenAsync(ticketId, dto, requesterId);

            // Assert
            _commentRepoMock.Verify(repo => repo.AddAsync(It.Is<Comment>(c => 
                c.TicketId == ticketId && 
                c.UserId == requesterId && 
                c.Content.Contains("My specific reopen reason") && 
                c.IsInternal == false
            )), Times.Once);
            
            _commentRepoMock.Verify(repo => repo.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        }

        #endregion

        #region SLA Tests

        [Theory]
        [InlineData(ITServiceDesk.Core.Enums.Priority.Critical, 2, 5)]
        [InlineData(ITServiceDesk.Core.Enums.Priority.High, 4, 10)]
        [InlineData(ITServiceDesk.Core.Enums.Priority.Medium, 8, 24)]
        [InlineData(ITServiceDesk.Core.Enums.Priority.Low, 24, 48)]
        public async Task CreateAsync_WhenPriorityProvided_ShouldSetCorrectSlaDeadlines(
            ITServiceDesk.Core.Enums.Priority priority, int expectedResponseHours, int expectedResolutionHours)
        {
            // Arrange
            var dto = new TicketCreateDto { Title = "Test", Priority = priority };
            var ticket = new Ticket { Priority = priority };
            _mapperMock.Setup(m => m.Map<Ticket>(dto)).Returns(ticket);
            _mapperMock.Setup(m => m.Map<TicketResponseDto>(ticket)).Returns(new TicketResponseDto());

            var settings = new List<SystemSetting>
            {
                new SystemSetting
                {
                    SlaCriticalResponseHours = 2, SlaCriticalResolutionHours = 5,
                    SlaHighResponseHours = 4, SlaHighResolutionHours = 10,
                    SlaMediumResponseHours = 8, SlaMediumResolutionHours = 24,
                    SlaLowResponseHours = 24, SlaLowResolutionHours = 48
                }
            };
            _systemSettingRepoMock.Setup(r => r.GetAllAsync(It.IsAny<System.Linq.Expressions.Expression<Func<SystemSetting, bool>>>())).ReturnsAsync(settings);

            var before = DateTime.UtcNow;

            // Act
            await _sut.CreateAsync(dto);
            
            var after = DateTime.UtcNow;

            // Assert
            Assert.NotNull(ticket.ResponseDueDate);
            Assert.NotNull(ticket.ResolutionDueDate);
            
            // Check if dates fall into the expected window
            Assert.True(ticket.ResponseDueDate.Value >= before.AddHours(expectedResponseHours));
            Assert.True(ticket.ResponseDueDate.Value <= after.AddHours(expectedResponseHours));
            
            Assert.True(ticket.ResolutionDueDate.Value >= before.AddHours(expectedResolutionHours));
            Assert.True(ticket.ResolutionDueDate.Value <= after.AddHours(expectedResolutionHours));
        }

        [Fact]
        public async Task CreateAsync_WhenSlaSettingsAreMissing_ShouldUseDefaultSlaValues()
        {
            // Arrange
            var dto = new TicketCreateDto { Title = "Test", Priority = ITServiceDesk.Core.Enums.Priority.Critical };
            var ticket = new Ticket { Priority = ITServiceDesk.Core.Enums.Priority.Critical };
            _mapperMock.Setup(m => m.Map<Ticket>(dto)).Returns(ticket);
            _mapperMock.Setup(m => m.Map<TicketResponseDto>(ticket)).Returns(new TicketResponseDto());

            // Empty settings to trigger fallback (e.g. Critical defaults to 1 and 4 in code)
            _systemSettingRepoMock.Setup(r => r.GetAllAsync(null)).ReturnsAsync(new List<SystemSetting>());

            var before = DateTime.UtcNow;

            // Act
            await _sut.CreateAsync(dto);

            // Assert - Default fallback for Critical is 1 response, 4 resolution
            Assert.True(ticket.ResponseDueDate >= before.AddHours(1));
            Assert.True(ticket.ResolutionDueDate >= before.AddHours(4));
        }

        [Fact]
        public async Task UpdateAsync_WhenPriorityChanges_ShouldRecalculateSlaFromCreatedAt()
        {
            // Arrange
            var ticketId = Guid.NewGuid();
            var createdAt = DateTime.UtcNow.AddDays(-1); // Created yesterday
            var existingTicket = new Ticket 
            { 
                Id = ticketId, 
                Priority = ITServiceDesk.Core.Enums.Priority.Low,
                CreatedAt = createdAt,
                Status = ITServiceDesk.Core.Enums.TicketStatus.Open,
                RequesterId = Guid.NewGuid()
            };

            _ticketRepoMock.Setup(repo => repo.GetByIdAsync(ticketId)).ReturnsAsync(existingTicket);
            
            var settings = new List<SystemSetting>
            {
                new SystemSetting { SlaCriticalResponseHours = 2, SlaCriticalResolutionHours = 5 }
            };
            _systemSettingRepoMock.Setup(r => r.GetAllAsync(It.IsAny<System.Linq.Expressions.Expression<Func<SystemSetting, bool>>>())).ReturnsAsync(settings);

            var dto = new TicketUpdateDto { Id = ticketId, Priority = ITServiceDesk.Core.Enums.Priority.Critical };
            
            // Map updates priority to Critical
            _mapperMock.Setup(m => m.Map(It.IsAny<TicketUpdateDto>(), It.IsAny<Ticket>()))
                       .Callback<TicketUpdateDto, Ticket>((s, d) => d.Priority = s.Priority)
                       .Returns((TicketUpdateDto s, Ticket d) => d);
            _mapperMock.Setup(m => m.Map<TicketResponseDto>(existingTicket)).Returns(new TicketResponseDto());

            // Act
            await _sut.UpdateAsync(dto, existingTicket.RequesterId, new List<string> { ITServiceDesk.Core.Constants.RoleConstants.Admin });

            // Assert
            // Expected SLA should be calculated from CreatedAt, NOT from Update time
            Assert.Equal(createdAt.AddHours(2), existingTicket.ResponseDueDate);
            Assert.Equal(createdAt.AddHours(5), existingTicket.ResolutionDueDate);
        }

        #endregion

        #region Device Status Tests

        [Fact]
        public async Task CreateAsync_WhenTicketHasDevice_ShouldSetDeviceStatusToFaulty()
        {
            // Arrange
            var deviceId = Guid.NewGuid();
            var dto = new TicketCreateDto { Title = "Device issue" };
            var ticket = new Ticket { DeviceId = deviceId };
            
            _mapperMock.Setup(m => m.Map<Ticket>(dto)).Returns(ticket);
            _mapperMock.Setup(m => m.Map<TicketResponseDto>(ticket)).Returns(new TicketResponseDto());

            var device = new Device { Id = deviceId, Status = ITServiceDesk.Core.Enums.DeviceStatus.Active };
            _deviceRepoMock.Setup(r => r.GetByIdAsync(deviceId)).ReturnsAsync(device);

            // Act
            await _sut.CreateAsync(dto);

            // Assert
            Assert.Equal(ITServiceDesk.Core.Enums.DeviceStatus.Faulty, device.Status);
            _deviceRepoMock.Verify(r => r.Update(device), Times.Once);
            _deviceRepoMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task UpdateAsync_WhenStatusChangesToInProgress_ShouldSetDeviceToMaintenance()
        {
            // Arrange
            var deviceId = Guid.NewGuid();
            var existingTicket = new Ticket 
            { 
                Id = Guid.NewGuid(), 
                DeviceId = deviceId,
                Status = ITServiceDesk.Core.Enums.TicketStatus.Open,
                RequesterId = Guid.NewGuid()
            };

            var device = new Device { Id = deviceId, Status = ITServiceDesk.Core.Enums.DeviceStatus.Faulty };

            _ticketRepoMock.Setup(r => r.GetByIdAsync(existingTicket.Id)).ReturnsAsync(existingTicket);
            _deviceRepoMock.Setup(r => r.GetByIdAsync(deviceId)).ReturnsAsync(device);
            
            var dto = new TicketUpdateDto { Id = existingTicket.Id, Status = ITServiceDesk.Core.Enums.TicketStatus.InProgress };
            _mapperMock.Setup(m => m.Map(It.IsAny<TicketUpdateDto>(), It.IsAny<Ticket>()))
                       .Callback<TicketUpdateDto, Ticket>((s, d) => d.Status = s.Status)
                       .Returns((TicketUpdateDto s, Ticket d) => d);
            _mapperMock.Setup(m => m.Map<TicketResponseDto>(existingTicket)).Returns(new TicketResponseDto());

            // Act
            await _sut.UpdateAsync(dto, existingTicket.RequesterId, new List<string> { ITServiceDesk.Core.Constants.RoleConstants.Admin });

            // Assert
            Assert.Equal(ITServiceDesk.Core.Enums.DeviceStatus.Maintenance, device.Status);
            _deviceRepoMock.Verify(r => r.Update(device), Times.Once);
        }

        [Fact]
        public async Task UpdateAsync_WhenResolvedAndNoOtherActiveTickets_ShouldSetDeviceActive()
        {
            // Arrange
            var ticketId = Guid.NewGuid();
            var deviceId = Guid.NewGuid();
            var existingTicket = new Ticket 
            { 
                Id = ticketId, 
                DeviceId = deviceId,
                Status = ITServiceDesk.Core.Enums.TicketStatus.InProgress,
                RequesterId = Guid.NewGuid()
            };

            var device = new Device { Id = deviceId, Status = ITServiceDesk.Core.Enums.DeviceStatus.Maintenance };

            _ticketRepoMock.Setup(r => r.GetByIdAsync(ticketId)).ReturnsAsync(existingTicket);
            _deviceRepoMock.Setup(r => r.GetByIdAsync(deviceId)).ReturnsAsync(device);
            
            // System has only this ticket
            _ticketRepoMock.Setup(r => r.GetAllAsync(It.IsAny<System.Linq.Expressions.Expression<Func<Ticket, bool>>>())).ReturnsAsync(new List<Ticket> { existingTicket });

            var dto = new TicketUpdateDto { Id = ticketId, Status = ITServiceDesk.Core.Enums.TicketStatus.Resolved };
            _mapperMock.Setup(m => m.Map(It.IsAny<TicketUpdateDto>(), It.IsAny<Ticket>()))
                       .Callback<TicketUpdateDto, Ticket>((s, d) => d.Status = s.Status)
                       .Returns((TicketUpdateDto s, Ticket d) => d);
            _mapperMock.Setup(m => m.Map<TicketResponseDto>(existingTicket)).Returns(new TicketResponseDto());

            // Act
            await _sut.UpdateAsync(dto, existingTicket.RequesterId, new List<string> { ITServiceDesk.Core.Constants.RoleConstants.Admin });

            // Assert
            Assert.Equal(ITServiceDesk.Core.Enums.DeviceStatus.Active, device.Status);
        }

        [Fact]
        public async Task UpdateAsync_WhenResolvedButDeviceHasAnotherActiveTicket_ShouldNotSetDeviceActive()
        {
            // Arrange
            var ticketId = Guid.NewGuid();
            var deviceId = Guid.NewGuid();
            var existingTicket = new Ticket 
            { 
                Id = ticketId, 
                DeviceId = deviceId,
                Status = ITServiceDesk.Core.Enums.TicketStatus.InProgress,
                RequesterId = Guid.NewGuid()
            };

            var device = new Device { Id = deviceId, Status = ITServiceDesk.Core.Enums.DeviceStatus.Maintenance };

            var otherActiveTicket = new Ticket 
            {
                Id = Guid.NewGuid(),
                DeviceId = deviceId,
                Status = ITServiceDesk.Core.Enums.TicketStatus.Open // Keeps device busy
            };

            _ticketRepoMock.Setup(r => r.GetByIdAsync(ticketId)).ReturnsAsync(existingTicket);
            _deviceRepoMock.Setup(r => r.GetByIdAsync(deviceId)).ReturnsAsync(device);
            
            // System has another active ticket for this device
            _ticketRepoMock.Setup(r => r.GetAllAsync(It.IsAny<System.Linq.Expressions.Expression<Func<Ticket, bool>>>())).ReturnsAsync(new List<Ticket> { existingTicket, otherActiveTicket });

            var dto = new TicketUpdateDto { Id = ticketId, Status = ITServiceDesk.Core.Enums.TicketStatus.Resolved };
            _mapperMock.Setup(m => m.Map(It.IsAny<TicketUpdateDto>(), It.IsAny<Ticket>()))
                       .Callback<TicketUpdateDto, Ticket>((s, d) => d.Status = s.Status)
                       .Returns((TicketUpdateDto s, Ticket d) => d);
            _mapperMock.Setup(m => m.Map<TicketResponseDto>(existingTicket)).Returns(new TicketResponseDto());

            // Act
            await _sut.UpdateAsync(dto, existingTicket.RequesterId, new List<string> { ITServiceDesk.Core.Constants.RoleConstants.Admin });

            // Assert
            Assert.Equal(ITServiceDesk.Core.Enums.DeviceStatus.Maintenance, device.Status); // Should remain unchanged
            _deviceRepoMock.Verify(r => r.Update(It.IsAny<Device>()), Times.Never); // Not updated to Active
        }

        #endregion

        #region Protected Field Tests

        [Fact]
        public async Task UpdateAsync_WhenNormalUserChangesAssignee_ShouldPreserveOriginalAssignee()
        {
            // Arrange
            var ticketId = Guid.NewGuid();
            var originalAssigneeId = Guid.NewGuid();
            var requesterId = Guid.NewGuid();
            
            var existingTicket = new Ticket 
            { 
                Id = ticketId, 
                Status = ITServiceDesk.Core.Enums.TicketStatus.Open,
                RequesterId = requesterId,
                AssigneeId = originalAssigneeId
            };

            _ticketRepoMock.Setup(repo => repo.GetByIdAsync(ticketId)).ReturnsAsync(existingTicket);
            _mapperMock.Setup(m => m.Map<TicketResponseDto>(existingTicket)).Returns(new TicketResponseDto());

            // User tries to change Assignee
            var dto = new TicketUpdateDto { Id = ticketId, AssigneeId = Guid.NewGuid() };
            
            _mapperMock.Setup(m => m.Map(It.IsAny<TicketUpdateDto>(), It.IsAny<Ticket>()))
                       .Callback<TicketUpdateDto, Ticket>((s, d) => d.AssigneeId = s.AssigneeId)
                       .Returns((TicketUpdateDto s, Ticket d) => d);

            // Act
            await _sut.UpdateAsync(dto, requesterId, new List<string>()); // Empty roles = Normal User

            // Assert
            Assert.Equal(originalAssigneeId, existingTicket.AssigneeId); // Mass assignment protected
        }

        #endregion
    }
}
