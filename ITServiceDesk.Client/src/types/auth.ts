export interface LoginDto {
    email: string;
    password: string;
}

export interface RegisterDto {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
}

export interface UserResponseDto {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    departmentName: string;
}
