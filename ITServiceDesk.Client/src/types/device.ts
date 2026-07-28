export enum DeviceStatus {
    Active = 1,
    Faulty = 2,
    Maintenance = 3,
    Storage = 4
}

export interface DeviceCategoryDto {
    id: string;
    name: string;
    description: string | null;
}

export interface DeviceDto {
    id: string;
    code: string;
    name: string;
    status: DeviceStatus;
    categoryId: string;
    categoryName: string;
    departmentId: string | null;
    departmentName: string | null;
}

export interface DeviceCreateDto {
    code: string;
    name: string;
    status: DeviceStatus;
    categoryId: string;
    departmentId: string | null;
}

export interface DeviceUpdateDto {
    id: string;
    code: string;
    name: string;
    status: DeviceStatus;
    categoryId: string;
    departmentId: string | null;
}
