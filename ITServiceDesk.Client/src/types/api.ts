export interface ApiResponse<T> {
    data: T | null;
    isSuccess: boolean;
    message: string | null;
}

export interface PagedResponse<T> extends ApiResponse<T> {
    pageNumber: number;
    pageSize: number;
    totalRecords: number;
    totalPages: number;
}
