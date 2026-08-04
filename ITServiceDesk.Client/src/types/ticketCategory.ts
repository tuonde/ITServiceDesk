export interface TicketCategoryDto {
    id: string;
    name: string;
    description?: string;
}

export interface TicketCategoryCreateDto {
    name: string;
    description?: string;
}

export interface TicketCategoryUpdateDto {
    id: string;
    name: string;
    description?: string;
}
