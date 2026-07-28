export interface UserListDto {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    departmentId?: string | null;
    departmentName: string;
    isActive: boolean;
    roles: string[];
    phoneNumber?: string;
    generatedPassword?: string;
}

export interface UserCreateDto {
    firstName: string;
    lastName: string;
    email: string;
    departmentId?: string | null;
    role: string;
    phoneNumber?: string;
}

export interface UserUpdateDto {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    departmentId?: string | null;
    role: string;
    isActive: boolean;
    phoneNumber?: string;
}
