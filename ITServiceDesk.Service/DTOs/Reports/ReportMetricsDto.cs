using System;
using System.Collections.Generic;

namespace ITServiceDesk.Service.DTOs.Reports;

public class ReportMetricsDto
{
    public string AvgResString { get; set; } = string.Empty;
    public string TopDept { get; set; } = string.Empty;
    public int MaxDeptTickets { get; set; }
    public string SlaBreachPercent { get; set; } = "0";
    public string ResolutionRate { get; set; } = "0";
    
    public IEnumerable<DepartmentPerformanceDto> DepartmentPerformance { get; set; } = new List<DepartmentPerformanceDto>();
    public IEnumerable<TrendDataDto> TrendData { get; set; } = new List<TrendDataDto>();
    public IEnumerable<SlaPieDataDto> SlaPieData { get; set; } = new List<SlaPieDataDto>();
    public IEnumerable<DeptBarDataDto> DeptBarData { get; set; } = new List<DeptBarDataDto>();
    public IEnumerable<TechnicianPerformanceDto> TechnicianPerformance { get; set; } = new List<TechnicianPerformanceDto>();
    public IEnumerable<CategoryDistributionDto> CategoryDistribution { get; set; } = new List<CategoryDistributionDto>();
    public IEnumerable<CostByDepartmentDto> CostByDepartment { get; set; } = new List<CostByDepartmentDto>();
    public IEnumerable<WorkloadDataDto> WorkloadData { get; set; } = new List<WorkloadDataDto>();
}

public class DepartmentPerformanceDto
{
    public string Name { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public double OrtalamaSaat { get; set; }
}

public class TrendDataDto
{
    public string Date { get; set; } = string.Empty;
    public int TalepSayisi { get; set; }
}

public class SlaPieDataDto
{
    public string Name { get; set; } = string.Empty;
    public int Value { get; set; }
    public string Color { get; set; } = string.Empty;
}

public class DeptBarDataDto
{
    public string Name { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class TechnicianPerformanceDto
{
    public string Name { get; set; } = string.Empty;
    public double OrtalamaSaat { get; set; }
    public int CozulenTalep { get; set; }
}

public class CategoryDistributionDto
{
    public string Name { get; set; } = string.Empty;
    public int Value { get; set; }
    public string Color { get; set; } = string.Empty;
}

public class CostByDepartmentDto
{
    public string Name { get; set; } = string.Empty;
    public decimal Maliyet { get; set; }
}

public class WorkloadDataDto
{
    public string Name { get; set; } = string.Empty;
    public int Count { get; set; }
}
