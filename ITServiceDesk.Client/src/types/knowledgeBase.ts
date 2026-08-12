export enum KbArticleVisibility {
    User = 1,
    Technician = 2,
    Both = 3
}

export enum KbArticleStatus {
    Draft = 1,
    Published = 2,
    Archived = 3
}

export enum KbArticleType {
    FAQ = 1,
    Guide = 2,
    Troubleshooting = 3,
    Procedure = 4,
    Reference = 5
}

export interface KbCategory {
    id: string;
    name: string;
    description: string;
    icon: string;
    order: number;
}

export interface KbCategoryCreateDto {
    name: string;
    description: string;
    icon: string;
    order: number;
}

export interface KbCategoryUpdateDto extends KbCategoryCreateDto {
    id: string;
}

export interface KbArticle {
    id: string;
    title: string;
    content: string;
    viewCount: number;
    visibility: KbArticleVisibility;
    status: KbArticleStatus;
    articleType: KbArticleType;
    createdAt: string;
    updatedAt: string | null;
    categoryId: string;
    categoryName: string;
    authorId: string;
    authorName: string;
    helpfulCount: number;
    notHelpfulCount: number;
}

export interface KbArticleCreateDto {
    title: string;
    content: string;
    visibility: KbArticleVisibility;
    status: KbArticleStatus;
    articleType: KbArticleType;
    categoryId: string;
}

export interface KbArticleUpdateDto extends KbArticleCreateDto {
    id: string;
}

export interface KbArticleFilterDto {
    pageNumber: number;
    pageSize: number;
    categoryId?: string;
    searchTerm?: string;
    visibility?: KbArticleVisibility;
    status?: KbArticleStatus;
    articleType?: KbArticleType;
}

export interface KbDashboardStatsDto {
    totalArticles: number;
    publishedCount: number;
    draftCount: number;
    archivedCount: number;
    totalViews: number;
    mostViewedArticles: KbArticle[];
    recentlyAddedArticles: KbArticle[];
}

export interface KbArticleFeedbackDto {
    isHelpful: boolean;
}
