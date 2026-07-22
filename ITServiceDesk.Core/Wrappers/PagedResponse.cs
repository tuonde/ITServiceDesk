namespace ITServiceDesk.Core.Wrappers;

public class PagedResponse<T> : ApiResponse<T>
{
    public int PageNumber { get; set; }
    public int PageSize { get; set; }
    public int TotalRecords { get; set; }
    public int TotalPages => PageSize > 0 ? (int)Math.Ceiling(TotalRecords / (double)PageSize) : 0;

    public static PagedResponse<T> Success(T data, int pageNumber, int pageSize, int totalRecords, string? message = null)
    {
        return new PagedResponse<T>
        {
            Data = data,
            PageNumber = pageNumber,
            PageSize = pageSize,
            TotalRecords = totalRecords,
            IsSuccess = true,
            Message = message
        };
    }
}
