export enum TicketStatus {
    Open = 1,
    InProgress = 2,
    WaitingForUser = 3,
    Resolved = 4,
    Closed = 5
}

export enum Priority {
    Low = 1,
    Medium = 2,
    High = 3,
    Critical = 4
}

export interface TicketResponseDto {
    id: string;
    title: string;
    description: string;
    status: TicketStatus;
    priority: Priority;
    createdAt: string;
    resolvedAt: string | null;
    responseDueDate: string | null;
    resolutionDueDate: string | null;
    isEscalated: boolean;
    requesterId: string;
    requesterName?: string;
    assigneeId: string | null;
    departmentId: string | null;
    departmentName?: string;
    deviceId: string | null;
    deviceName?: string;
    resolutionReport: string | null;
}

export interface TicketCreateDto {
    title: string;
    description: string;
    priority: Priority;
    departmentId?: string | null;
    deviceId?: string | null;
}

export interface TicketUpdateDto {
    id: string;
    title: string;
    description: string;
    status: TicketStatus;
    priority: Priority;
    assigneeId?: string | null;
    departmentId?: string | null;
    deviceId?: string | null;
    resolutionReport: string | null;
}

export interface TicketFilterDto {
    pageNumber: number;
    pageSize: number;
    status?: TicketStatus;
    priority?: Priority;
    deviceId?: string;
}
