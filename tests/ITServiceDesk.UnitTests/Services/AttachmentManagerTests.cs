using AutoMapper;
using ITServiceDesk.Core.Entities;
using ITServiceDesk.Core.Exceptions;
using ITServiceDesk.Core.Interfaces.Repositories;
using ITServiceDesk.Service.DTOs.Attachments;
using ITServiceDesk.Service.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Moq;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Xunit;
using Microsoft.EntityFrameworkCore.Query;
using System.Linq.Expressions;

namespace ITServiceDesk.UnitTests.Services
{
    public class AttachmentManagerTests : IDisposable
    {
        private readonly Mock<IRepository<Attachment>> _repositoryMock;
        private readonly Mock<IMapper> _mapperMock;
        private readonly Mock<IWebHostEnvironment> _envMock;
        private readonly AttachmentManager _sut;
        
        private readonly List<string> _createdDirectories = new List<string>();
        private readonly List<string> _createdFiles = new List<string>();

        public AttachmentManagerTests()
        {
            _repositoryMock = new Mock<IRepository<Attachment>>();
            _mapperMock = new Mock<IMapper>();
            _envMock = new Mock<IWebHostEnvironment>();

            _sut = new AttachmentManager(_repositoryMock.Object, _mapperMock.Object, _envMock.Object);
            
            // Setup async queryable
            var data = new List<Attachment>().AsQueryable();
            var mockSet = new Mock<IQueryable<Attachment>>();
            mockSet.As<IAsyncEnumerable<Attachment>>()
                .Setup(m => m.GetAsyncEnumerator(It.IsAny<CancellationToken>()))
                .Returns(new TestAsyncEnumerator<Attachment>(data.GetEnumerator()));

            mockSet.As<IQueryable<Attachment>>()
                .Setup(m => m.Provider)
                .Returns(new TestAsyncQueryProvider<Attachment>(data.Provider));

            mockSet.As<IQueryable<Attachment>>().Setup(m => m.Expression).Returns(data.Expression);
            mockSet.As<IQueryable<Attachment>>().Setup(m => m.ElementType).Returns(data.ElementType);
            mockSet.As<IQueryable<Attachment>>().Setup(m => m.GetEnumerator()).Returns(data.GetEnumerator());

            _repositoryMock.Setup(r => r.Query()).Returns(mockSet.Object);
        }

        public void Dispose()
        {
            // Cleanup any files or directories created by tests in the CurrentDirectory
            var appDataFolder = Path.Combine(Directory.GetCurrentDirectory(), "App_Data");
            if (Directory.Exists(appDataFolder))
            {
                try
                {
                    Directory.Delete(appDataFolder, true);
                }
                catch
                {
                    // Ignore cleanup errors during test teardown
                }
            }
        }

        private IFormFile CreateMockFormFile(string fileName, long length, byte[] content, string contentType = "application/octet-stream")
        {
            var fileMock = new Mock<IFormFile>();
            fileMock.Setup(f => f.OpenReadStream()).Returns(() => new MemoryStream(content));
            fileMock.Setup(f => f.FileName).Returns(fileName);
            fileMock.Setup(f => f.Length).Returns(length);
            fileMock.Setup(f => f.ContentType).Returns(contentType);
            
            fileMock.Setup(f => f.CopyToAsync(It.IsAny<Stream>(), It.IsAny<CancellationToken>()))
                .Returns((Stream target, CancellationToken token) => 
                {
                    var newStream = new MemoryStream(content);
                    return newStream.CopyToAsync(target, token);
                });
                
            return fileMock.Object;
        }

        [Fact]
        public async Task UploadAsync_WhenExtensionIsNotAllowed_ShouldRejectFile()
        {
            // Arrange
            var content = Encoding.UTF8.GetBytes("malware");
            var file = CreateMockFormFile("malicious.exe", content.Length, content);
            var dto = new AttachmentCreateDto { File = file };

            // Act & Assert
            var ex = await Assert.ThrowsAsync<AppException>(() => _sut.UploadAsync(dto));
            Assert.Contains("Desteklenmeyen dosya formatı", ex.Message);
            
            _repositoryMock.Verify(r => r.AddAsync(It.IsAny<Attachment>()), Times.Never);
        }

        [Fact]
        public async Task UploadAsync_WhenFileExceedsMaximumSize_ShouldRejectFile()
        {
            // Arrange
            // 10 MB = 10 * 1024 * 1024 = 10485760 bytes. We bypass huge memory allocation by just mocking the Length property.
            var content = new byte[] { 0xFF, 0xD8, 0xFF }; // Valid JPEG signature just in case
            var file = CreateMockFormFile("large.jpg", 10485761, content, "image/jpeg");
            var dto = new AttachmentCreateDto { File = file };

            // Act & Assert
            var ex = await Assert.ThrowsAsync<AppException>(() => _sut.UploadAsync(dto));
            Assert.Contains("Dosya boyutu 10 MB'ı geçemez", ex.Message);
            
            _repositoryMock.Verify(r => r.AddAsync(It.IsAny<Attachment>()), Times.Never);
        }
        
        [Fact]
        public async Task UploadAsync_WhenFileIsExactly10Mb_ShouldNotFailSizeValidation()
        {
            // Arrange
            long exact10Mb = 10 * 1024 * 1024;
            var content = new byte[] { 0xFF, 0xD8, 0xFF }; // Valid JPEG signature
            var file = CreateMockFormFile("boundary.jpg", exact10Mb, content, "image/jpeg");
            var dto = new AttachmentCreateDto { File = file };

            // Act 
            // It should pass size validation and complete upload, assuming no other validation fails.
            await _sut.UploadAsync(dto);

            // Assert
            _repositoryMock.Verify(r => r.AddAsync(It.IsAny<Attachment>()), Times.Once);
        }

        [Fact]
        public async Task UploadAsync_WhenExtensionIsAllowedButSignatureIsInvalid_ShouldRejectFile()
        {
            // Arrange
            var invalidContent = Encoding.UTF8.GetBytes("This is not a real JPEG file"); // Invalid magic bytes
            var file = CreateMockFormFile("fake.jpg", invalidContent.Length, invalidContent, "image/jpeg");
            var dto = new AttachmentCreateDto { File = file };

            // Act & Assert
            var ex = await Assert.ThrowsAsync<AppException>(() => _sut.UploadAsync(dto));
            Assert.Contains("Dosya içeriği ile uzantısı uyuşmuyor", ex.Message);
            
            _repositoryMock.Verify(r => r.AddAsync(It.IsAny<Attachment>()), Times.Never);
        }

        [Fact]
        public async Task UploadAsync_WhenJpegSignatureIsValid_ShouldPassSignatureValidation()
        {
            // Arrange
            var validContent = new byte[] { 0xFF, 0xD8, 0xFF, 0x00, 0x00, 0x00 }; // Valid JPEG magic bytes
            var file = CreateMockFormFile("real.jpg", validContent.Length, validContent, "image/jpeg");
            var dto = new AttachmentCreateDto { File = file };

            // Act
            await _sut.UploadAsync(dto);

            // Assert
            _repositoryMock.Verify(r => r.AddAsync(It.IsAny<Attachment>()), Times.Once);
        }
        
        [Fact]
        public async Task UploadAsync_WhenPngSignatureIsValid_ShouldPassSignatureValidation()
        {
            // Arrange
            var validContent = new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00 }; // Valid PNG magic bytes
            var file = CreateMockFormFile("real.png", validContent.Length, validContent, "image/png");
            var dto = new AttachmentCreateDto { File = file };

            // Act
            await _sut.UploadAsync(dto);

            // Assert
            _repositoryMock.Verify(r => r.AddAsync(It.IsAny<Attachment>()), Times.Once);
        }

        [Fact]
        public async Task UploadAsync_WhenFilenameHasDangerousDoubleExtension_ShouldRejectFile()
        {
            // Arrange
            var content = Encoding.UTF8.GetBytes("fake content");
            var file = CreateMockFormFile("malware.jpg.exe", content.Length, content);
            var dto = new AttachmentCreateDto { File = file };

            // Act & Assert
            var ex = await Assert.ThrowsAsync<AppException>(() => _sut.UploadAsync(dto));
            
            // Path.GetExtension returns ".exe" for "malware.jpg.exe", which is rejected
            Assert.Contains("Desteklenmeyen dosya formatı", ex.Message);
            
            _repositoryMock.Verify(r => r.AddAsync(It.IsAny<Attachment>()), Times.Never);
        }

        [Fact]
        public async Task UploadAsync_WhenFileIsValid_ShouldPersistAttachment()
        {
            // Arrange
            var validContent = new byte[] { 0x25, 0x50, 0x44, 0x46, 0x00 }; // Valid PDF signature
            var originalFileName = "report.pdf";
            var file = CreateMockFormFile(originalFileName, validContent.Length, validContent, "application/pdf");
            
            var ticketId = Guid.NewGuid();
            var uploaderId = Guid.NewGuid();
            var dto = new AttachmentCreateDto 
            { 
                File = file,
                TicketId = ticketId,
                UploaderId = uploaderId
            };
            
            Attachment? capturedAttachment = null;
            _repositoryMock.Setup(r => r.AddAsync(It.IsAny<Attachment>()))
                           .Callback<Attachment>(a => capturedAttachment = a);
                           
            _mapperMock.Setup(m => m.Map<AttachmentResponseDto>(It.IsAny<Attachment>()))
                       .Returns(new AttachmentResponseDto());

            // Act
            await _sut.UploadAsync(dto);

            // Assert
            _repositoryMock.Verify(r => r.AddAsync(It.IsAny<Attachment>()), Times.Once);
            _repositoryMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
            
            Assert.NotNull(capturedAttachment);
            Assert.Equal(originalFileName, capturedAttachment.FileName);
            Assert.Equal(file.Length, capturedAttachment.FileSize);
            Assert.Equal(file.ContentType, capturedAttachment.ContentType);
            Assert.Equal(ticketId, capturedAttachment.TicketId);
            Assert.Equal(uploaderId, capturedAttachment.UploaderId);
            
            // FilePath should be GUID + .pdf, NOT the original filename
            Assert.NotEqual(originalFileName, capturedAttachment.FilePath);
            Assert.EndsWith(".pdf", capturedAttachment.FilePath);
            Assert.True(Guid.TryParse(Path.GetFileNameWithoutExtension(capturedAttachment.FilePath), out _));
            
            // Verify file actually physically exists in App_Data/uploads
            var appDataFolder = Path.Combine(Directory.GetCurrentDirectory(), "App_Data", "uploads");
            var physicalPath = Path.Combine(appDataFolder, capturedAttachment.FilePath);
            Assert.True(File.Exists(physicalPath));
        }
    }

    internal class TestAsyncQueryProvider<TEntity> : IAsyncQueryProvider
    {
        private readonly IQueryProvider _inner;

        internal TestAsyncQueryProvider(IQueryProvider inner)
        {
            _inner = inner;
        }

        public IQueryable CreateQuery(Expression expression)
        {
            return new TestAsyncEnumerable<TEntity>(expression);
        }

        public IQueryable<TElement> CreateQuery<TElement>(Expression expression)
        {
            return new TestAsyncEnumerable<TElement>(expression);
        }

        public object? Execute(Expression expression)
        {
            return _inner.Execute(expression);
        }

        public TResult Execute<TResult>(Expression expression)
        {
            return _inner.Execute<TResult>(expression)!;
        }

        public TResult ExecuteAsync<TResult>(Expression expression, CancellationToken cancellationToken)
        {
            var expectedResultType = typeof(TResult).GetGenericArguments()[0];
            var executeMethod = typeof(IQueryProvider)
                .GetMethod(
                    name: nameof(IQueryProvider.Execute),
                    genericParameterCount: 1,
                    types: new[] { typeof(Expression) });
            
            if (executeMethod == null) throw new InvalidOperationException("Execute method not found");

            var executionResult = executeMethod
                .MakeGenericMethod(expectedResultType)
                .Invoke(this, new[] { expression });

            var fromResultMethod = typeof(Task).GetMethod(nameof(Task.FromResult));
            if (fromResultMethod == null) throw new InvalidOperationException("FromResult method not found");

            var taskResult = fromResultMethod
                .MakeGenericMethod(expectedResultType)
                .Invoke(null, new[] { executionResult });

            return (TResult)taskResult!;
        }
    }

    internal class TestAsyncEnumerable<T> : EnumerableQuery<T>, IAsyncEnumerable<T>, IQueryable<T>
    {
        public TestAsyncEnumerable(IEnumerable<T> enumerable)
            : base(enumerable)
        { }

        public TestAsyncEnumerable(Expression expression)
            : base(expression)
        { }

        public IAsyncEnumerator<T> GetAsyncEnumerator(CancellationToken cancellationToken = default)
        {
            return new TestAsyncEnumerator<T>(this.AsEnumerable().GetEnumerator());
        }

        IQueryProvider IQueryable.Provider
        {
            get { return new TestAsyncQueryProvider<T>(this); }
        }
    }

    internal class TestAsyncEnumerator<T> : IAsyncEnumerator<T>
    {
        private readonly IEnumerator<T> _inner;

        public TestAsyncEnumerator(IEnumerator<T> inner)
        {
            _inner = inner;
        }

        public ValueTask DisposeAsync()
        {
            _inner.Dispose();
            return ValueTask.CompletedTask;
        }

        public ValueTask<bool> MoveNextAsync()
        {
            return ValueTask.FromResult(_inner.MoveNext());
        }

        public T Current
        {
            get { return _inner.Current; }
        }
    }
}
