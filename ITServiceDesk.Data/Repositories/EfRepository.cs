using System.Linq.Expressions;
using ITServiceDesk.Core.Entities;
using ITServiceDesk.Core.Interfaces.Repositories;
using ITServiceDesk.Data.Contexts;
using Microsoft.EntityFrameworkCore;

namespace ITServiceDesk.Data.Repositories;

public class EfRepository<T> : IRepository<T> where T : BaseEntity
{
    protected readonly ITServiceDeskDbContext _context;
    protected readonly DbSet<T> _dbSet;

    public EfRepository(ITServiceDeskDbContext context)
    {
        _context = context;
        _dbSet = _context.Set<T>();
    }

    public async Task<T?> GetByIdAsync(Guid id)
    {
        return await _dbSet.FindAsync(id);
    }

    public async Task<T?> GetAsync(Expression<Func<T, bool>> expression)
    {
        return await _dbSet.FirstOrDefaultAsync(expression);
    }

    public async Task<IEnumerable<T>> GetAllAsync(Expression<Func<T, bool>>? expression = null)
    {
        if (expression == null)
            return await _dbSet.ToListAsync();
            
        return await _dbSet.Where(expression).ToListAsync();
    }

    public IQueryable<T> Query()
    {
        return _dbSet.AsQueryable();
    }

    public async Task AddAsync(T entity)
    {
        await _dbSet.AddAsync(entity);
    }

    public void Update(T entity)
    {
        _dbSet.Update(entity);
    }

    public void Remove(T entity)
    {
        _dbSet.Remove(entity);
    }

    public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return await _context.SaveChangesAsync(cancellationToken);
    }
}
