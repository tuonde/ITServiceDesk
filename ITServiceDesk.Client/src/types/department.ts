export interface DepartmentResponseDto {
    id: string;
    name: string;
    description: string;
    createdAt: string;
    updatedAt: string | null;
}

export interface DepartmentCreateDto {
    name: string;
    description: string;
}
